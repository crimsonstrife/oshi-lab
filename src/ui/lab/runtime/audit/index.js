// @ts-check

import { els } from '../dom.js';
import { state } from '../state.js';
import { setStatus } from '../status.js';
import { copyToClipboard } from '../utils/clipboard.js';

/**
 * The CSS_CHAR_LIMIT constant defines the maximum number of characters
 * allowed in a CSS stylesheet. This limit helps ensure that style rules
 * remain manageable and do not exceed browser processing capabilities or
 * constraints, such as performance and memory handling.
 *
 * It is commonly used in scenarios where CSS is dynamically generated
 * or manipulated, such as inline styles, style blocks, or when writing
 * styles to the DOM. Exceeding this limit may result in incomplete or
 * disregarded styles, depending on the implementation.
 *
 * The value is set to 50,000 characters as a practical upper boundary.
 */

const CSS_CHAR_LIMIT = 50_000;
/**
 * Defines the maximum limit for the number of characters allowed in an HTML document or content.
 *
 * This constant is used to restrict the length of HTML content,
 * ensuring that it does not exceed the specified character limit.
 * It helps in maintaining performance and adhering to design constraints.
 *
 * Value: 50,000
 */
const HTML_CHAR_LIMIT = 50_000;
/**
 * Constant representing the capacity limit or maximum threshold, commonly used
 * in scenarios that require an upper bound for processing, storage, or other
 * capacity constraints.
 *
 * @constant {number} Z_CAP
 * @default 10000
 */
const Z_CAP = 10_000;
/**
 * Represents the maximum allowed pixel value for a blur effect.
 *
 * This constant sets an upper limit on the intensity of a blur effect,
 * typically used in graphical or UI components to restrict excessive blurring.
 *
 * Value: 50 pixels.
 *
 * @constant {number}
 */
const BLUR_CAP_PX = 50;

/**
 * A Set containing a predefined list of trusted hostnames for the import of external resources.
 *
 * The `IMPORT_HOST_ALLOWLIST` variable is used to specify and manage a collection of hostnames
 * that are considered safe for importing external assets such as fonts or scripts. This is particularly
 * useful in scenarios where ensuring the security and integrity of imported resources is critical.
 *
 * The hostnames in the allowlist include:
 * - fonts.googleapis.com
 * - fonts.gstatic.com
 * - fonts.bunny.net
 * - use.typekit.net
 * - cdnjs.cloudflare.com
 */
const IMPORT_HOST_ALLOWLIST = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'fonts.bunny.net',
  'use.typekit.net',
  'cdnjs.cloudflare.com',
]);

const FONT_FILE_HOST_ALLOWLIST = new Set([
  ...IMPORT_HOST_ALLOWLIST,
  // Typekit often serves font binaries from this host:
  'p.typekit.net',
]);

/**
 * An array of CSS class names that are designated as protected and should not be altered,
 * removed, or manipulated by certain operations in the application.
 *
 * This variable is used to identify elements in the DOM that require special handling
 * or exclusion from certain actions, ensuring they retain their intended functionality
 * and appearance.
 *
 * The protected classes include:
 * - `header`: Represents the main header section of the page.
 * - `header-nav-bar`: Represents the navigation bar within the header.
 * - `star-nav`: Represents important navigation links or features.
 * - `site-footer`: Represents the footer section of the website.
 * - `notification-dropdown`: Represents the dropdown menu for notifications.
 * - `profile-actions-dropdown`: Represents the dropdown for profile-related actions.
 */
const PROTECTED_CLASSES = [
  'header',
  'header-nav-bar',
  'star-nav',
  'site-footer',
  'notification-dropdown',
  'profile-actions-dropdown',
];

/**
 * Runs an audit process based on provided CSS and HTML input, optionally including a contrast check.
 * Updates the application state with the audit report and displays the results.
 * Handles and reports any errors encountered during execution.
 *
 * @return {Promise<void>} A promise that resolves when the audit is complete, with results processed and rendered.
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

/**
 * Copies the last audit report JSON to the clipboard in a formatted string.
 * If no audit report is available, a warning status is set. If copying fails,
 * an error status is set.
 *
 * @return {Promise<void>} A promise that resolves when the operation is complete.
 */
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

/**
 * Analyzes custom CSS and HTML inputs to identify potential issues, including size constraints,
 * specific CSS or HTML violations, and optionally performs contrast checks. Returns a detailed report
 * containing issue information and a summary of severities.
 *
 * @param {Object} input - The input parameters for the audit.
 * @param {string} [input.css] - The raw CSS string to audit. Defaults to an empty string if not provided.
 * @param {string} [input.html] - The raw HTML string to audit. Defaults to an empty string if not provided.
 * @param {boolean} [input.doContrast=false] - Indicates whether contrast checks should be performed. Defaults to false.
 * @return {Promise<AuditReport>} A promise resolving to an audit report that includes issue details and a severity summary.
 */
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

/**
 * Analyzes the provided CSS code for various issues related to its validity,
 * security, and compatibility with the MyOshi platform. Identifies warnings
 * and errors such as malformed syntax, disallowed properties, restricted
 * patterns, and more. Returns a list of detected issues with detailed metadata.
 *
 * @param {string} css - The CSS code to be analyzed and audited for issues.
 * @return {AuditIssue[]} An array of issues detected in the CSS, where each
 * issue contains properties such as id, severity, title, message, hint, and
 * optional locator or metadata for context.
 */
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

  // Font file host allowlist (best-effort: only when it looks like a font binary)
  for (const m of text.matchAll(/\burl\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi)) {
    const raw = (m[2] ?? '').trim();
    if (!raw) continue;

    const decoded = safeDecode(decodeCssEscapes(raw)).trim();
    const lower = decoded.toLowerCase();

    if (!lower.startsWith('https://')) continue;

    // Heuristic: treat common font extensions as font binaries
    if (!/\.(?:woff2?|ttf|otf|eot)(?:[?#].*)?$/i.test(decoded)) continue;

    const host = safeHost(decoded);
    if (!host || !FONT_FILE_HOST_ALLOWLIST.has(host)) {
      issues.push({
        id: 'css-font-file-host',
        severity: 'warn',
        title: 'Font file host may be blocked',
        message: `Font file appears to be loaded from "${host ?? 'unknown'}", which is not on the allowlist.`,
        hint: `Prefer Google/Bunny/Typekit allowed hosts: ${Array.from(FONT_FILE_HOST_ALLOWLIST).join(', ')}`,
        loc: loc(m.index ?? 0),
        meta: { url: decoded },
      });
    }
  }

  // @import restrictions (fonts allowlist)
  // The URL may contain semicolons in query strings (e.g. Google Fonts wght@500;700;800),
  // so match url(...) or quoted strings in full rather than stopping at the first ';'.
  for (const imp of iterCssImports(text)) {
    const start = imp.startIndex;
    const url = imp.url;

    if (!url) {
      issues.push({
        id: 'css-import-parse',
        severity: 'warn',
        title: '@import could not be parsed',
        message: `@import at ${loc(start).line}:${loc(start).column}`,
        hint: 'MyOshi only allows font imports from specific hosts. Use @import url("https://...") format.',
        loc: loc(start),
      });
      continue;
    }

    const decoded = safeDecode(decodeCssEscapes(url)).trim();
    const lower = decoded.toLowerCase();

    if (lower.startsWith('data:')) {
      issues.push({
        id: 'css-import-data',
        severity: 'error',
        title: 'data: @import is blocked',
        message: '@import of data: URIs is blocked by MyOshi (bypasses sanitization).',
        hint: 'Paste CSS directly (up to 50k chars) or import from an allowed font host.',
        loc: loc(start),
      });
      continue;
    }

    if (lower.startsWith('//') || !lower.startsWith('https://')) {
      issues.push({
        id: 'css-import-https',
        severity: 'error',
        title: '@import must be https:// from allowed font hosts',
        message: `@import url is not https:// : ${decoded}`,
        hint: `Use https:// and one of the allowed font hosts: ${Array.from(IMPORT_HOST_ALLOWLIST).join(', ')}`,
        loc: loc(start),
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
        loc: loc(start),
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

/**
 * Analyzes a block of HTML for common issues related to accessibility, security, and best practices.
 *
 * @param {string} html - The HTML string to audit. Can be an empty string or malformed HTML.
 * @return {AuditIssue[]} An array of issues found in the provided HTML, with each issue containing information such as severity, title, message, and suggestions for resolution.
 */
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

  // External stylesheet/font imports via <link>
  for (const link of Array.from(doc.querySelectorAll('link[rel][href]'))) {
    const rel = (link.getAttribute('rel') || '').toLowerCase();
    const relTokens = rel.split(/\s+/).filter(Boolean);

    const isStylesheet = relTokens.includes('stylesheet');
    const isPreconnect = relTokens.includes('preconnect') || relTokens.includes('dns-prefetch');

    if (!isStylesheet && !isPreconnect) continue;

    const href = (link.getAttribute('href') || '').trim();
    if (!href) continue;

    const decoded = safeDecode(href).trim();
    const lower = decoded.toLowerCase();

    if (lower.startsWith('data:')) {
      issues.push({
        id: 'html-link-data',
        severity: 'error',
        title: 'data: stylesheet links are blocked',
        message: `<link> points to a data: URL, which MyOshi blocks.`,
        hint: 'Use https:// links from allowed font hosts.',
        elementPath: elementToPath(link),
      });
      continue;
    }

    if (lower.startsWith('//') || !lower.startsWith('https://')) {
      issues.push({
        id: 'html-link-https',
        severity: 'error',
        title: 'Stylesheet links must be https://',
        message: `<link> href is not https:// : ${decoded}`,
        hint: `Allowed hosts: ${Array.from(IMPORT_HOST_ALLOWLIST).join(', ')}`,
        elementPath: elementToPath(link),
      });
      continue;
    }

    const host = safeHost(decoded);
    if (!host || !IMPORT_HOST_ALLOWLIST.has(host)) {
      issues.push({
        id: 'html-link-host',
        severity: 'error',
        title: 'Stylesheet link host not allowed',
        message: `<link> host "${host ?? 'unknown'}" is not on the allowlist.`,
        hint: `Allowed hosts: ${Array.from(IMPORT_HOST_ALLOWLIST).join(', ')}`,
        elementPath: elementToPath(link),
      });
    }
  }

// @import inside <style> tags (common font import pattern)
  for (const style of Array.from(doc.querySelectorAll('style'))) {
    const cssText = style.textContent || '';
    const stripped = stripCssComments(cssText);
    const styleLoc = makeLocator(stripped);

    for (const imp of iterCssImports(stripped)) {
      if (!imp.url) continue;

      const decoded = safeDecode(decodeCssEscapes(imp.url)).trim();
      const lower = decoded.toLowerCase();

      if (lower.startsWith('//') || !lower.startsWith('https://')) {
        issues.push({
          id: 'html-style-import-https',
          severity: 'error',
          title: '@import in <style> must be https://',
          message: `@import url is not https:// : ${decoded}`,
          hint: `Allowed hosts: ${Array.from(IMPORT_HOST_ALLOWLIST).join(', ')}`,
          loc: styleLoc(imp.startIndex),
          elementPath: elementToPath(style),
        });
        continue;
      }

      const host = safeHost(decoded);
      if (!host || !IMPORT_HOST_ALLOWLIST.has(host)) {
        issues.push({
          id: 'html-style-import-host',
          severity: 'error',
          title: '@import host not allowed (in <style>)',
          message: `@import host "${host ?? 'unknown'}" is not on the allowlist.`,
          hint: `Allowed hosts: ${Array.from(IMPORT_HOST_ALLOWLIST).join(', ')}`,
          loc: styleLoc(imp.startIndex),
          elementPath: elementToPath(style),
        });
      }
    }
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

/**
 * Scans a document within a preview frame for text contrast issues, ensuring elements meet
 * accessible contrast ratio requirements. Performs best-effort detection, considering preview
 * frames, sandboxing, and large DOM structures.
 *
 * The function identifies elements containing directly visible text, retrieves their computed
 * styles, and verifies their contrast ratio against their background. It considers both standard
 * and large text when determining acceptable contrast thresholds.
 *
 * If the iframe is unavailable, sandboxed, or contains an excessively large DOM, a warning issue
 * is returned, describing why the full check could not be completed.
 *
 * @return {Promise<AuditIssue[]>} A promise resolving to an array of audit issues detailing any
 * contrast problems discovered, or reasons why a full scan wasn't possible. Each issue includes
 * severity, title, message, and additional metadata when applicable.
 */
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

/**
 * Renders an audit report by updating the user interface elements with
 * summary information and detailed issue listings.
 *
 * @param {Object} report - The audit report object containing summary and issue details.
 * @param {Object} report.summary - Summary of the audit including counts of errors, warnings, and information.
 * @param {number} report.summary.error - Number of errors in the audit report.
 * @param {number} report.summary.warn - Number of warnings in the audit report.
 * @param {number} report.summary.info - Number of informational messages in the audit report.
 * @param {string} report.createdAt - Timestamp of when the report was created.
 * @param {Array} report.issues - Array of issue objects containing detailed issue information.
 * @param {string} report.issues[].id - Unique identifier of the issue.
 * @param {string} report.issues[].severity - Severity level of the issue ('error', 'warn', or 'info').
 * @param {string} report.issues[].title - Title describing the issue.
 * @param {string} report.issues[].message - Detailed message explaining the issue.
 * @param {string} [report.issues[].hint] - Optional suggestion for fixing the issue.
 * @param {string} [report.issues[].selector] - Optional DOM selector associated with the issue.
 * @param {Object} [report.issues[].loc] - Optional location data for the issue in the source file.
 * @param {number} report.issues[].loc.line - Line number where the issue occurs.
 * @param {number} report.issues[].loc.column - Column number where the issue occurs.
 * @param {string} [report.issues[].elementPath] - Optional string describing the issue's hierarchical element path.
 *
 * @return {void}
 */
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
  els.auditSummary.appendChild(mkPill(`Updated: ${new Date(report.createdAt).toLocaleString()}`));

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

/**
 * Removes duplicate issues from a list based on unique combination of properties.
 *
 * @param {Array} list - An array of issue objects to be deduplicated. Each object is expected to have properties such as `id`, `severity`, `title`, `message`, `loc`, `selector`, and `elementPath`.
 * @return {Array} A new array containing only unique issue objects determined by their combination of properties.
 */
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

/**
 * Removes CSS comments from a provided CSS string while preserving the newlines
 * and the overall character positions for alignment purposes.
 *
 * @param {string} css - The CSS string from which comments need to be removed.
 * @return {string} The CSS string with all comments stripped out, maintaining line and character alignment.
 */
function stripCssComments(css) {
  // Replace comment contents with spaces while preserving newlines and length,
  // so that character indices and line/column locations remain aligned.
  return String(css || '').replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n\r]/g, ' ')
  );
}

/**
 * Determines the balance of curly braces in a given text. Accounts for text and string literals within single or double quotes,
 * and properly handles escaped characters to avoid misinterpreting braces inside string literals.
 *
 * @param {string} text - The input string to analyze for brace balance.
 * @return {number} The net balance of opening and closing curly braces. A positive number indicates more opening braces,
 * a negative number indicates more closing braces, and 0 indicates perfect balance.
 */
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

/**
 * Creates a locator function that maps an index in the given text to a line and column number.
 *
 * @param {string} text - The input text used to determine line and column positions.
 * @return {function(number): {line: number, column: number}} A function that takes an index (0-based)
 * and returns an object with `line` (1-based) and `column` (1-based) properties indicating the position.
 */
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
 * Iterates over the headers of CSS rules in a given CSS string.
 * The method identifies the raw text (header) preceding each '{' character,
 * while properly handling escape sequences, single quotes, and double quotes.
 *
 * @param {string} css - The CSS string to parse and extract rule headers from.
 * @return {Generator<{raw: string, startIndex: number}, void, unknown>} A generator yielding objects containing the raw header string and its starting index in the input CSS.
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

function readQuotedString(css, i) {
  const quote = css[i];
  let out = '';
  i++;
  let esc = false;
  for (; i < css.length; i++) {
    const ch = css[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === quote) return { value: out, end: i + 1 };
    out += ch;
  }
  return { value: out, end: i };
}

function parseImportTarget(css, i) {
  // url(...)
  if (css.slice(i, i + 4).toLowerCase() === 'url(') {
    i += 4;
    while (i < css.length && /\s/.test(css[i])) i++;

    if (css[i] === '"' || css[i] === "'") {
      const q = readQuotedString(css, i);
      i = q.end;
      while (i < css.length && /\s/.test(css[i])) i++;
      if (css[i] === ')') i++;
      return { url: q.value, endIndex: i };
    }

    // unquoted url: read until ')'
    let j = i;
    while (j < css.length && css[j] !== ')') j++;
    const url = css.slice(i, j).trim();
    const endIndex = j < css.length ? j + 1 : j;
    return url ? { url, endIndex } : null;
  }

  // "..." or '...'
  if (css[i] === '"' || css[i] === "'") {
    const q = readQuotedString(css, i);
    return { url: q.value, endIndex: q.end };
  }

  // bare token (nonstandard, but users do it)
  let j = i;
  while (j < css.length && !/[\s;{}]/.test(css[j])) j++;
  const url = css.slice(i, j).trim();
  return url ? { url, endIndex: j } : null;
}

function* iterCssImports(css) {
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

    if (ch === '@' && css.slice(i, i + 7).toLowerCase() === '@import') {
      const startIndex = i;
      i += 7;
      while (i < css.length && /\s/.test(css[i])) i++;

      const target = parseImportTarget(css, i);
      if (!target) {
        yield { startIndex, url: null };
        continue;
      }

      yield { startIndex, url: target.url };

      // Advance toward the end of the at-rule (best effort)
      i = target.endIndex;
      while (i < css.length && css[i] !== ';' && css[i] !== '{') i++;
    }
  }
}

/**
 * Safely decodes a URI component. If decoding fails due to an error, the original string is returned.
 *
 * @param {string} s - The encoded URI component to decode.
 * @return {string} - The decoded URI component if successful, otherwise the original string.
 */
function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

/**
 * Decodes CSS escape sequences in a string into their corresponding Unicode characters.
 *
 * @param {string} s - The input string containing CSS escape sequences to decode.
 * @return {string} The decoded string with escape sequences replaced by Unicode characters.
 */
function decodeCssEscapes(s) {
  return s.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
}

/**
 * Extracts the URL from a given string, typically from a CSS import or a quoted URL string.
 *
 * @param {string} params - A string containing a URL in the format `url("...")` or quoted URL `"..."`.
 * @return {string|null} The extracted URL if found, otherwise null.
 */
function extractImportUrl(params) {
  // url("...") or "..."
  const m1 = params.match(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/i);
  if (m1) return m1[2];
  const m2 = params.match(/^(['"])(.+)\1$/);
  if (m2) return m2[2];
  return null;
}

/**
 * Extracts and returns the host from a given URL string. If the URL is invalid, returns null.
 *
 * @param {string} url - The URL string to extract the host from.
 * @return {string|null} The host of the URL if valid, otherwise null.
 */
function safeHost(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

/**
 * Escapes special characters in a given string to safely use it in a regular expression.
 *
 * @param {string} s - The input string to be escaped.
 * @return {string} A new string with special characters escaped.
 */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Constructs a CSS-like path string for a given DOM element by traversing its ancestors
 * up to a maximum depth of 6 levels, including details like tag names, IDs, and class names.
 *
 * @param {Element} el - The DOM element for which to generate the path string.
 * @return {string} The constructed path string representing the element and its hierarchy.
 */
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

/**
 * Retrieves the accessible name of an HTML element based on various attributes and relationships
 * such as `aria-label`, `aria-labelledby`, associated `label` elements, `textContent`, `title`,
 * and `placeholder`.
 *
 * @param {Element} el The HTML element for which the accessible name is to be determined.
 * @param {Document} doc The document object used to query and retrieve related elements.
 * @return {string} The accessible name of the element, or an empty string if no name can be determined.
 */
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

/**
 * Escapes a string for use in CSS, ensuring that special characters are properly encoded.
 * If the `CSS.escape` method is available in the environment, it uses that for comprehensive escaping.
 * Otherwise, it falls back to a basic escaping implementation.
 *
 * @param {string} s - The input string to be escaped for CSS compatibility.
 * @return {string} The CSS-escaped string.
 */
function cssEscape(s) {
  // Use the standard CSS.escape when available for correct, comprehensive escaping.
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(String(s));
  }
  // Fallback: escape backslashes first, then double quotes.
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ---- contrast helpers ----

/**
 * Parses an RGBA or RGB color string and returns an object with red, green, blue, and alpha properties.
 *
 * @param {string} s - The RGBA or RGB color string to parse, formatted as `rgba(r, g, b, a)` or `rgb(r, g, b)`.
 * @return {Object|null} An object containing the `r`, `g`, `b`, and `a` properties if parsing is successful, or null if the input string is invalid.
 */
function parseRgba(s) {
  const m = String(s).match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
}

/**
 * Blends two colors with alpha compositing.
 *
 * @param {Object} fg - The foreground color, represented as an object with r, g, b, and a properties.
 * @param {number} fg.r - The red component of the foreground color (0-255).
 * @param {number} fg.g - The green component of the foreground color (0-255).
 * @param {number} fg.b - The blue component of the foreground color (0-255).
 * @param {number} fg.a - The alpha component (opacity) of the foreground color (0-1).
 * @param {Object} bg - The background color, represented as an object with r, g, b, and a properties.
 * @param {number} bg.r - The red component of the background color (0-255).
 * @param {number} bg.g - The green component of the background color (0-255).
 * @param {number} bg.b - The blue component of the background color (0-255).
 * @param {number} bg.a - The alpha component (opacity) of the background color (0-1).
 * @return {Object} The resulting blended color as an object with r, g, b, and a properties.
 * @return {number} return.r - The blended red component (0-255).
 * @return {number} return.g - The blended green component (0-255).
 * @return {number} return.b - The blended blue component (0-255).
 * @return {number} return.a - The blended alpha component (opacity) (0-1).
 */
function blend(fg, bg) {
  const a = fg.a + bg.a * (1 - fg.a);
  const r = (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / (a || 1);
  const g = (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / (a || 1);
  const b = (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / (a || 1);
  return { r, g, b, a };
}

/**
 * Calculates the relative luminance of a color based on its RGB components.
 * The calculation uses the formula defined in the WCAG 2.0 specifications.
 *
 * @param {Object} c An object representing the color with RGB components.
 *                   It should have the properties `r`, `g`, and `b`, each being a number between 0 and 255.
 * @param {number} c.r The red component of the color.
 * @param {number} c.g The green component of the color.
 * @param {number} c.b The blue component of the color.
 * @return {number} The calculated relative luminance as a number between 0 and 1.
 */
function relLum(c) {
  const srgb = [c.r, c.g, c.b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Calculates the contrast ratio between two colors based on their relative luminance.
 *
 * @param {string} a The first color in a valid format (e.g., HEX, RGB).
 * @param {string} b The second color in a valid format (e.g., HEX, RGB).
 * @return {number} The contrast ratio as a decimal value, where a higher value indicates greater contrast.
 */
function contrastRatio(a, b) {
  const L1 = relLum(a);
  const L2 = relLum(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Determines the effective background color of a given element by traversing
 * up its DOM hierarchy and considering its computed styles.
 *
 * @param {Element} el - The DOM element whose background color is to be determined.
 * @param {Window} win - The window object to access the computed styles of the element.
 * @return {Object|null} An object representing the RGBA color of the effective background,
 * or null if a background image is detected. The color object contains properties `r`, `g`, `b` (integers between 0-255),
 * and `a` (alpha channel as a number between 0-1).
 */
function findEffectiveBackground(el, win) {
  let cur = el;
  while (cur) {
    const cs = win.getComputedStyle(cur);
    if (!cs) break;
    const bgc = parseRgba(cs.backgroundColor);
    const hasBgImage = cs.backgroundImage && cs.backgroundImage !== 'none';
    if (hasBgImage) return null;
    if (bgc && bgc.a > 0) return bgc;
    // @ts-ignore
      cur = cur.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}
