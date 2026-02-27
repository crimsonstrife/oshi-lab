// @ts-check

import { els } from '../dom.js';
import { state } from '../state.js';
import { setStatus } from '../status.js';
import { copyToClipboard } from '../utils/clipboard.js';

/**
 * @typedef {'error'|'warn'|'info'} Severity
 * @typedef {{ line: number, column: number }} SourceLoc
 * @typedef {{
 *   id: string;
 *   severity: Severity;
 *   title: string;
 *   message: string;
 *   hint?: string;
 *   loc?: SourceLoc;
 *   selector?: string;
 *   elementPath?: string;
 *   meta?: Record<string, any>;
 * }} AuditIssue
 * @typedef {{ createdAt: string; summary: { error: number; warn: number; info: number }; issues: AuditIssue[] }} AuditReport
 */

const CSS_CHAR_LIMIT = 50_000;
const HTML_CHAR_LIMIT = 50_000;
const Z_CAP = 10_000;
const BLUR_CAP_PX = 50;

const IMPORT_HOST_ALLOWLIST = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'fonts.bunny.net',
  'use.typekit.net',
  'cdnjs.cloudflare.com',
]);

const PROTECTED_CLASSES = [
  'header',
  'header-nav-bar',
  'star-nav',
  'site-footer',
  'notification-dropdown',
  'profile-actions-dropdown',
];

/**
 * Run an audit for the current Custom CSS/HTML.
 * Bound to the Audit tab button.
 */
export async function runAudit() {
  try {
    const css = els.customCss?.value ?? '';
    const html = els.customHtml?.value ?? '';
    const doContrast = !!els.auditContrastToggle?.checked;

    setStatus('ok', 'Running audit…');

    const report = await audit({ css, html, doContrast });
    state.lastAuditReport = report;

    renderAuditReport(report);

    const { error, warn } = report.summary;
    if (error) setStatus('err', `Audit: ${error} error(s), ${warn} warning(s).`);
    else if (warn) setStatus('warn', `Audit: ${warn} warning(s).`);
    else setStatus('ok', 'Audit: no issues found.');
  } catch (e) {
    console.error(e);
    setStatus('err', 'Audit failed (see console).');
  }
}

export async function copyLastAuditJson() {
  try {
    const report = state.lastAuditReport;
    if (!report) {
      setStatus('warn', 'No audit report yet — run Audit first.');
      return;
    }
    await copyToClipboard(JSON.stringify(report, null, 2));
    setStatus('ok', 'Copied audit JSON.');
  } catch {
    setStatus('err', 'Clipboard copy failed.');
  }
}

/** @param {{ css: string; html: string; doContrast: boolean }} input */
async function audit(input) {
  /** @type {AuditIssue[]} */
  const issues = [];

  const cssRaw = input.css ?? '';
  const htmlRaw = input.html ?? '';

  // Size limits
  if (cssRaw.length > CSS_CHAR_LIMIT) {
    issues.push({
      id: 'css-size-limit',
      severity: 'error',
      title: 'Custom CSS exceeds 50,000 characters',
      message: `Your CSS is ${cssRaw.length.toLocaleString()} characters. MyOshi enforces a 50,000 character limit.`,
      hint: 'Remove unused rules, compress repetition (variables/utility classes), or split styles across fewer selectors.',
    });
  }

  if (htmlRaw.length > HTML_CHAR_LIMIT) {
    issues.push({
      id: 'html-size-limit',
      severity: 'error',
      title: 'Custom HTML exceeds 50,000 characters',
      message: `Your HTML is ${htmlRaw.length.toLocaleString()} characters. MyOshi enforces a 50,000 character limit.`,
      hint: 'Remove unused markup, reduce repetition, or rely on CSS layouts instead of duplicated nodes.',
    });
  }

  // CSS checks
  issues.push(...auditCss(cssRaw));

  // HTML checks
  issues.push(...auditHtml(htmlRaw));

  // Contrast checks (best-effort)
  if (input.doContrast) {
    issues.push(...(await auditContrastBestEffort()));
  }

  // Sort
  const rank = { error: 0, warn: 1, info: 2 };
  issues.sort((a, b) => {
    const d = rank[a.severity] - rank[b.severity];
    if (d) return d;
    const al = a.loc?.line ?? 1e9;
    const bl = b.loc?.line ?? 1e9;
    if (al !== bl) return al - bl;
    const ac = a.loc?.column ?? 1e9;
    const bc = b.loc?.column ?? 1e9;
    return ac - bc;
  });

  const summary = { error: 0, warn: 0, info: 0 };
  for (const i of issues) summary[i.severity]++;

  /** @type {AuditReport} */
  const report = {
    createdAt: new Date().toISOString(),
    summary,
    issues,
  };
  return report;
}

/** @param {string} css */
function auditCss(css) {
  /** @type {AuditIssue[]} */
  const issues = [];

  const text = stripCssComments(css);
  const loc = makeLocator(text);

  // Basic malformed CSS check (brace mismatch)
  const brace = braceBalance(text);
  if (brace !== 0) {
    issues.push({
      id: 'css-brace-mismatch',
      severity: 'warn',
      title: 'CSS may be malformed',
      message: `Your CSS has an unmatched ${brace > 0 ? 'opening' : 'closing'} brace count (balance = ${brace}).`,
      hint: 'MyOshi will ignore malformed sections. Check missing } or stray { around @media/@keyframes blocks.',
    });
  }

  // Manual scoping prefixes (new MyOshi behavior auto-scopes)
  const manualPrefixRe = /\.(profile-page|profile-custom-css|oshi-card-custom-css)\b/g;
  for (const m of text.matchAll(manualPrefixRe)) {
    issues.push({
      id: 'css-manual-scoping',
      severity: 'warn',
      title: 'Manual scoping prefix detected',
      message: `CSS includes .${m[1]}. MyOshi scopes selectors automatically now; manual prefixes can break complex selectors.`,
      hint: 'Remove .profile-page/.profile-custom-css/.oshi-card-custom-css from your selectors and target elements directly.',
      loc: loc(m.index ?? 0),
    });
    // Avoid spamming; one is enough to get the point across
    break;
  }

  // position: fixed
  for (const m of text.matchAll(/\bposition\s*:\s*fixed\b/gi)) {
    issues.push({
      id: 'css-position-fixed',
      severity: 'warn',
      title: 'position: fixed will be converted',
      message: 'MyOshi converts position: fixed to position: absolute for safety.',
      hint: 'Use position: absolute within a relatively positioned container, or position: sticky when appropriate.',
      loc: loc(m.index ?? 0),
    });
  }

  // z-index cap
  for (const m of text.matchAll(/\bz-index\s*:\s*(-?\d+)\b/gi)) {
    const n = Number.parseInt(m[1], 10);
    if (!Number.isFinite(n)) continue;
    if (n > Z_CAP || n < -Z_CAP) {
      issues.push({
        id: 'css-z-index-cap',
        severity: 'warn',
        title: 'z-index will be capped',
        message: `z-index: ${n} will be capped to ${Math.max(-Z_CAP, Math.min(Z_CAP, n))} on MyOshi.`,
        hint: `Keep z-index within [-${Z_CAP}, ${Z_CAP}] to match live behavior.`,
        loc: loc(m.index ?? 0),
      });
    }
  }

  // blur() cap (filter/backdrop-filter)
  for (const m of text.matchAll(/\b(filter|backdrop-filter)\s*:\s*[^;]*?\bblur\(\s*([^\)]+)\)/gi)) {
    const inner = String(m[2] ?? '').trim();
    const mm = inner.match(/^(-?\d+(?:\.\d+)?)\s*(px)?/i);
    if (!mm) {
      issues.push({
        id: 'css-blur-cap',
        severity: 'warn',
        title: 'blur() may be capped',
        message: `blur(${inner}) is used; MyOshi caps blur() at ${BLUR_CAP_PX}px.`,
        hint: 'Prefer blur values <= 50px. Non-px units are hard to predict; test in preview.',
        loc: loc(m.index ?? 0),
      });
      continue;
    }
    const num = Number(mm[1]);
    const unit = (mm[2] ?? '').toLowerCase();
    if (unit === 'px' && Number.isFinite(num) && num > BLUR_CAP_PX) {
      issues.push({
        id: 'css-blur-cap',
        severity: 'warn',
        title: 'blur() will be capped',
        message: `blur(${num}px) will be capped to blur(${BLUR_CAP_PX}px) on MyOshi.`,
        hint: 'Reduce blur to <= 50px to match live behavior and avoid GPU issues.',
        loc: loc(m.index ?? 0),
      });
    }
  }

  // url() protocol allowlist
  for (const m of text.matchAll(/\burl\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi)) {
    const raw = (m[2] ?? '').trim();
    if (!raw) continue;
    const decoded = safeDecode(raw);
    const lower = decoded.toLowerCase();
    const ok = lower.startsWith('https:') || lower.startsWith('data:');
    if (!ok) {
      issues.push({
        id: 'css-url-protocol',
        severity: 'error',
        title: 'Disallowed URL protocol in CSS url()',
        message: `url(${raw}) uses a protocol MyOshi will block. Allowed: https:, data:.`,
        hint: 'Use absolute https:// URLs, or embed assets as data: URIs where appropriate.',
        loc: loc(m.index ?? 0),
        meta: { url: decoded },
      });
    }
  }

  // @import restrictions (fonts allowlist)
  // The URL may contain semicolons in query strings (e.g. Google Fonts wght@500;700;800),
  // so match url(...) or quoted strings in full rather than stopping at the first ';'.
  for (const m of text.matchAll(/@import\s+(url\(\s*(?:'[^']*'|"[^"]*"|[^)]*)\s*\)|'[^']*'|"[^"]*")[^;]*;?/gi)) {
    const params = String(m[1] ?? '').trim();
    const url = extractImportUrl(params);
    if (!url) {
      issues.push({
        id: 'css-import-parse',
        severity: 'warn',
        title: '@import could not be parsed',
        message: `@import ${params}`,
        hint: 'MyOshi only allows font imports from specific hosts. Use @import url("https://...") format.',
        loc: loc(m.index ?? 0),
      });
      continue;
    }
    const decoded = safeDecode(url).trim();
    const lower = decoded.toLowerCase();

    if (lower.startsWith('data:')) {
      issues.push({
        id: 'css-import-data',
        severity: 'error',
        title: 'data: @import is blocked',
        message: '@import of data: URIs is blocked by MyOshi (bypasses sanitization).',
        hint: 'Paste CSS directly (up to 50k chars) or import from an allowed font host.',
        loc: loc(m.index ?? 0),
      });
      continue;
    }

    if (!lower.startsWith('https://')) {
      issues.push({
        id: 'css-import-https',
        severity: 'error',
        title: '@import must be https:// from allowed font hosts',
        message: `@import url is not https:// : ${decoded}`,
        hint: 'Use https:// and one of the allowed font hosts (Google/Bunny/Typekit/cdnjs).',
        loc: loc(m.index ?? 0),
      });
      continue;
    }

    const host = safeHost(decoded);
    if (!host || !IMPORT_HOST_ALLOWLIST.has(host)) {
      issues.push({
        id: 'css-import-host',
        severity: 'error',
        title: '@import host not allowed',
        message: `@import host "${host ?? 'unknown'}" is not on the allowlist.`,
        hint: `Allowed hosts: ${Array.from(IMPORT_HOST_ALLOWLIST).join(', ')}`,
        loc: loc(m.index ?? 0),
      });
    }
  }

  // Protected selectors (best-effort: scan selector headers before '{')
  const protectedRe = new RegExp(`\\.(?:${PROTECTED_CLASSES.map(escapeRe).join('|')})\\b`, 'i');
  for (const header of iterRuleHeaders(text)) {
    if (header.raw.trim().startsWith('@')) continue;
    if (protectedRe.test(header.raw)) {
      issues.push({
        id: 'css-protected-selectors',
        severity: 'error',
        title: 'Selector targets protected site elements',
        message: 'MyOshi strips selectors targeting site navigation/header/footer/profile menus.',
        hint: 'Remove selectors that target header/nav/footer/action menus. Only style inside your profile content.',
        loc: loc(header.startIndex),
        selector: header.raw.trim().slice(0, 240),
      });
    }
  }

  // expression()/javascript:
  const lowerAll = text.toLowerCase();
  if (lowerAll.includes('expression(')) {
    issues.push({
      id: 'css-expression',
      severity: 'error',
      title: 'expression() is not supported',
      message: 'CSS expression() is unsafe and not supported on MyOshi.',
      hint: 'Remove expression(). Use standard CSS properties, variables, and animations.',
    });
  }
  let hasJsUrl = lowerAll.includes('javascript:');
  if (!hasJsUrl) {
    for (const m of text.matchAll(/\burl\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi)) {
      const raw = (m[2] ?? '').trim();
      if (!raw) continue;
      if (safeDecode(decodeCssEscapes(raw)).toLowerCase().includes('javascript:')) {
        hasJsUrl = true;
        break;
      }
    }
  }
  if (hasJsUrl) {
    issues.push({
      id: 'css-javascript-protocol',
      severity: 'error',
      title: 'javascript: URLs are blocked',
      message: 'MyOshi blocks javascript: in CSS url() values (including encoded variants).',
      hint: 'Use https: or data: only.',
    });
  }

  return dedupeIssues(issues);
}

/** @param {string} html */
function auditHtml(html) {
  /** @type {AuditIssue[]} */
  const issues = [];

  let doc;
  try {
    doc = new DOMParser().parseFromString(html || '', 'text/html');
  } catch {
    doc = null;
  }
  if (!doc) {
    issues.push({
      id: 'html-parse',
      severity: 'warn',
      title: 'HTML could not be parsed',
      message: 'The browser failed to parse the provided HTML fragment.',
      hint: 'Fix malformed tags (unclosed quotes/tags). MyOshi may sanitize or drop malformed HTML.',
    });
    return issues;
  }

  // <img> alt
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    if (!img.hasAttribute('alt')) {
      issues.push({
        id: 'html-img-alt',
        severity: 'warn',
        title: 'Image missing alt attribute',
        message: '<img> is missing alt="" (needed for screen readers).',
        hint: 'Add alt text, or alt="" for purely decorative images.',
        elementPath: elementToPath(img),
      });
    }
  }

  // Accessible name for interactive elements
  const interactive = Array.from(doc.querySelectorAll('button, a[href], input, textarea, select'));
  for (const el of interactive) {
    const name = getAccessibleName(el, doc);
    if (!name) {
      issues.push({
        id: 'html-a11y-name',
        severity: 'warn',
        title: 'Interactive element has no accessible name',
        message: `${el.tagName.toLowerCase()} appears to have no visible text and no aria-label/label.`,
        hint: 'Add text content, aria-label, aria-labelledby, or a <label for> for inputs.',
        elementPath: elementToPath(el),
      });
    }
  }

  // <script> tags
  const scripts = doc.querySelectorAll('script');
  if (scripts.length) {
    issues.push({
      id: 'html-script-tags',
      severity: 'warn',
      title: 'Script tags present',
      message: `Found ${scripts.length} <script> tag(s). These are commonly stripped/sanitized on platforms.`,
      hint: 'Avoid scripts in custom HTML. Prefer pure HTML/CSS or platform-supported embeds.',
    });
  }

  // Inline event handlers + javascript: URLs
  let handlerCount = 0;
  let jsHrefCount = 0;
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name)) handlerCount++;
    }
    if (el instanceof HTMLAnchorElement) {
      const href = (el.getAttribute('href') || '').trim();
      if (/^javascript:/i.test(safeDecode(href))) jsHrefCount++;
    }
  }

  if (handlerCount) {
    issues.push({
      id: 'html-inline-handlers',
      severity: 'warn',
      title: 'Inline event handlers present',
      message: `Found ${handlerCount} inline on* handler attribute(s) (onclick, onload, etc.).`,
      hint: 'These are often stripped for security. Remove them.',
    });
  }

  if (jsHrefCount) {
    issues.push({
      id: 'html-javascript-href',
      severity: 'error',
      title: 'javascript: links are unsafe',
      message: `Found ${jsHrefCount} link(s) with href="javascript:…".`,
      hint: 'Remove javascript: URLs. Use normal links or platform-supported interactions.',
    });
  }

  // Duplicate IDs
  /** @type {Map<string, number>} */
  const idCounts = new Map();
  for (const el of Array.from(doc.querySelectorAll('[id]'))) {
    const id = (el.getAttribute('id') || '').trim();
    if (!id) continue;
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }
  for (const [id, n] of idCounts.entries()) {
    if (n > 1) {
      issues.push({
        id: 'html-duplicate-ids',
        severity: 'warn',
        title: 'Duplicate id attribute',
        message: `id="${id}" is used ${n} times. IDs must be unique.`,
        hint: 'Rename IDs or switch repeated elements to classes.',
      });
    }
  }

  return dedupeIssues(issues);
}

async function auditContrastBestEffort() {
  /** @type {AuditIssue[]} */
  const issues = [];

  const iframe = els.previewFrame;
  if (!iframe) {
    issues.push({
      id: 'a11y-contrast-missing',
      severity: 'info',
      title: 'Contrast check unavailable',
      message: 'Preview frame was not found.',
    });
    return issues;
  }

  let doc;
  try {
    doc = iframe.contentDocument;
  } catch {
    doc = null;
  }

  if (!doc) {
    issues.push({
      id: 'a11y-contrast-sandbox',
      severity: 'info',
      title: 'Contrast check blocked by iframe sandbox',
      message: 'The preview iframe is sandboxed without same-origin access, so computed-style contrast checks cannot run.',
      hint: 'If you want this feature, set iframe sandbox to include allow-same-origin (keep scripts disabled).',
    });
    return issues;
  }

  const root = doc.querySelector('.profile-page') || doc.body;
  const win = doc.defaultView;
  if (!root || !win) return issues;

  // Limit traversal for performance
  const MAX_ELEMENTS = 2500;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  /** @type {Element[]} */
  const nodes = [];
  let count = 0;
  for (let n = walker.currentNode; n; n = walker.nextNode()) {
    nodes.push(/** @type {Element} */ (n));
    if (++count >= MAX_ELEMENTS) break;
  }

  /**
   * Returns true if the element has any non-whitespace direct text child nodes.
   * This avoids re-checking descendant text on ancestor/container elements.
   * @param {Element} el
   */
  const hasDirectText = (el) => {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = (node.textContent || '').trim();
        if (content) return true;
      }
    }
    return false;
  };

  for (const el of nodes) {
    if (!hasDirectText(el)) continue;

    const cs = win.getComputedStyle(el);
    if (!cs) continue;
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;

    const fg = parseRgba(cs.color);
    const bg = findEffectiveBackground(el, win);
    if (!fg || !bg) continue;

    const fgOnBg = blend(fg, bg);
    const ratio = contrastRatio(fgOnBg, bg);

    const fontSize = parseFloat(cs.fontSize || '16');
    const weight = parseInt(cs.fontWeight || '400', 10) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    const min = isLarge ? 3.0 : 4.5;

    if (ratio < min) {
      issues.push({
        id: 'a11y-contrast',
        severity: 'warn',
        title: 'Low text contrast',
        message: `Contrast ratio ${ratio.toFixed(2)} is below ${min.toFixed(1)} for this text.`,
        hint: 'Increase contrast between text and background (adjust colors, add a solid/gradient backing, or tune overlays).',
        elementPath: elementToPath(el),
        meta: { ratio, min, fontSize, weight },
      });
    }
  }

  if (count >= MAX_ELEMENTS) {
    issues.push({
      id: 'a11y-contrast-limit',
      severity: 'info',
      title: 'Contrast check partial scan',
      message: `Scanned first ${MAX_ELEMENTS} elements for performance.`,
      hint: 'If you see missed issues, simplify the preview DOM or add a smarter text-node scan.',
    });
  }

  return issues;
}

/** @param {AuditReport} report */
function renderAuditReport(report) {
  if (!els.auditOutput || !els.auditSummary) return;

  // Summary pills
  els.auditSummary.replaceChildren();

  const mkPill = (label, cls) => {
    const span = document.createElement('span');
    span.className = `badge ${cls}`;
    span.textContent = label;
    return span;
  };

  els.auditSummary.appendChild(mkPill(`Errors: ${report.summary.error}`, 'text-bg-danger'));
  els.auditSummary.appendChild(mkPill(`Warnings: ${report.summary.warn}`, 'text-bg-warning'));
  els.auditSummary.appendChild(mkPill(`Info: ${report.summary.info}`, 'text-bg-secondary'));
  els.auditSummary.appendChild(mkPill(`Updated: ${new Date(report.createdAt).toLocaleString()}`, 'text-bg-dark'));

  // Badge on tab
  if (els.auditBadge) {
    const show = report.summary.error > 0;
    els.auditBadge.classList.toggle('d-none', !show);
    els.auditBadge.textContent = report.summary.error ? String(report.summary.error) : '!';
  }

  // Issues list
  els.auditOutput.replaceChildren();

  if (!report.issues.length) {
    const empty = document.createElement('div');
    empty.className = 'text-body-secondary p-2';
    empty.textContent = 'No issues found.';
    els.auditOutput.appendChild(empty);
    return;
  }

  for (const issue of report.issues) {
    const item = document.createElement('div');
    item.className = 'list-group-item';

    const top = document.createElement('div');
    top.className = 'd-flex flex-wrap align-items-center justify-content-between gap-2';

    const title = document.createElement('div');
    title.className = 'fw-semibold';
    title.textContent = `[${issue.severity.toUpperCase()}] ${issue.title}`;
    top.appendChild(title);

    const tag = document.createElement('span');
    tag.className = `badge ${issue.severity === 'error' ? 'text-bg-danger' : issue.severity === 'warn' ? 'text-bg-warning' : 'text-bg-secondary'}`;
    tag.textContent = issue.id;
    top.appendChild(tag);

    item.appendChild(top);

    const msg = document.createElement('div');
    msg.className = 'mt-1';
    msg.textContent = issue.message;
    item.appendChild(msg);

    if (issue.hint) {
      const hint = document.createElement('div');
      hint.className = 'text-body-secondary small mt-1';
      hint.textContent = `Fix: ${issue.hint}`;
      item.appendChild(hint);
    }

    if (issue.selector) {
      const pre = document.createElement('pre');
      pre.className = 'small mt-2 mb-0';
      pre.style.whiteSpace = 'pre-wrap';
      pre.textContent = issue.selector;
      item.appendChild(pre);
    }

    if (issue.loc) {
      const meta = document.createElement('div');
      meta.className = 'text-body-secondary small mt-1';
      meta.textContent = `Location: ${issue.loc.line}:${issue.loc.column}`;
      item.appendChild(meta);
    }

    if (issue.elementPath) {
      const meta = document.createElement('div');
      meta.className = 'text-body-secondary small mt-1';
      meta.textContent = `Element: ${issue.elementPath}`;
      item.appendChild(meta);
    }

    els.auditOutput.appendChild(item);
  }
}

// -------------------------
// Helpers
// -------------------------

/** @param {AuditIssue[]} list */
function dedupeIssues(list) {
  const key = (i) => `${i.id}|${i.severity}|${i.title}|${i.message}|${i.loc?.line ?? ''}:${i.loc?.column ?? ''}|${i.selector ?? ''}|${i.elementPath ?? ''}`;
  const seen = new Set();
  /** @type {AuditIssue[]} */
  const out = [];
  for (const i of list) {
    const k = key(i);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  return out;
}

/** @param {string} css */
function stripCssComments(css) {
  // Replace comment contents with spaces while preserving newlines and length,
  // so that character indices and line/column locations remain aligned.
  return String(css || '').replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n\r]/g, ' ')
  );
}

/** @param {string} text */
function braceBalance(text) {
  let bal = 0;
  let inS = false;
  let inD = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (!inD && ch === "'") inS = !inS;
    else if (!inS && ch === '"') inD = !inD;
    if (inS || inD) continue;
    if (ch === '{') bal++;
    if (ch === '}') bal--;
  }
  return bal;
}

/** @param {string} text */
function makeLocator(text) {
  /** @type {number[]} */
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1);
  }
  return (idx) => {
    // binary search
    let lo = 0, hi = starts.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= idx) lo = mid + 1;
      else hi = mid - 1;
    }
    const line = Math.max(1, hi + 1);
    const col = idx - starts[Math.max(0, hi)] + 1;
    return { line, column: col };
  };
}

/**
 * Iterate rule headers (text before a "{"), best-effort, ignoring strings.
 * Tracks brace depth so each yielded header is only the selector/at-rule
 * prelude immediately preceding its "{", not any prior rule body content.
 * @param {string} css
 */
function* iterRuleHeaders(css) {
  let start = 0;
  let depth = 0;
  let inS = false;
  let inD = false;
  let esc = false;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (!inD && ch === "'") { inS = !inS; continue; }
    if (!inS && ch === '"') { inD = !inD; continue; }
    if (inS || inD) continue;
    if (ch === '{') {
      const raw = css.slice(start, i);
      const trimmed = raw.trim();
      if (trimmed) {
        yield { raw: trimmed, startIndex: start };
      }
      depth++;
      start = i + 1;
    } else if (ch === '}') {
      if (depth > 0) depth--;
      start = i + 1;
    }
  }
}

/** @param {string} s */
function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

/**
 * Decode CSS hex escape sequences (e.g. \6a or \00006a) in a string value.
 * CSS allows \<1-6 hex digits> optionally followed by a single whitespace.
 * @param {string} s
 * @returns {string}
 */
function decodeCssEscapes(s) {
  return s.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
}

/** @param {string} params */
function extractImportUrl(params) {
  // url("...") or "..."
  const m1 = params.match(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/i);
  if (m1) return m1[2];
  const m2 = params.match(/^(['"])(.+)\1$/);
  if (m2) return m2[2];
  return null;
}

/** @param {string} url */
function safeHost(url) {
  try { return new URL(url).host; } catch { return null; }
}

/** @param {string} s */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {Element} el */
function elementToPath(el) {
  const parts = [];
  let cur = el;
  for (let i = 0; i < 6 && cur; i++) {
    const id = cur.getAttribute?.('id');
    const cls = cur.getAttribute?.('class');
    parts.unshift(
      cur.tagName.toLowerCase() +
        (id ? `#${id}` : '') +
        (cls ? `.${cls.split(/\s+/).filter(Boolean).slice(0, 3).join('.')}` : '')
    );
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

/** @param {Element} el @param {Document} doc */
function getAccessibleName(el, doc) {
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();

  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const ids = labelledby.split(/\s+/).filter(Boolean);
    const text = ids.map((id) => doc.getElementById(id)?.textContent?.trim() || '').join(' ').trim();
    if (text) return text;
  }

  if (el.tagName.toLowerCase() === 'input') {
    const id = el.getAttribute('id');
    if (id) {
      const label = doc.querySelector(`label[for="${cssEscape(id)}"]`);
      const t = label?.textContent?.trim();
      if (t) return t;
    }
  }

  const text = el.textContent?.trim();
  if (text) return text;

  const title = el.getAttribute('title');
  if (title && title.trim()) return title.trim();

  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) return placeholder.trim();

  return '';
}

function cssEscape(s) {
  // Use the standard CSS.escape when available for correct, comprehensive escaping.
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(String(s));
  }
  // Fallback: escape backslashes first, then double quotes.
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ---- contrast helpers ----

/** @param {string} s */
function parseRgba(s) {
  const m = String(s).match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
}

function blend(fg, bg) {
  const a = fg.a + bg.a * (1 - fg.a);
  const r = (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / (a || 1);
  const g = (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / (a || 1);
  const b = (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / (a || 1);
  return { r, g, b, a };
}

function relLum(c) {
  const srgb = [c.r, c.g, c.b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(a, b) {
  const L1 = relLum(a);
  const L2 = relLum(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function findEffectiveBackground(el, win) {
  let cur = el;
  while (cur) {
    const cs = win.getComputedStyle(cur);
    if (!cs) break;
    const bgc = parseRgba(cs.backgroundColor);
    const hasBgImage = cs.backgroundImage && cs.backgroundImage !== 'none';
    if (hasBgImage) return null;
    if (bgc && bgc.a > 0) return bgc;
    cur = cur.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}
