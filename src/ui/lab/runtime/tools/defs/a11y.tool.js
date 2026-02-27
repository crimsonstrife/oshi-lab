// @ts-check

import { els } from '../../dom.js';
import { setStatus } from '../../status.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { insertAtCursor } from '../../utils/textarea.js';
import { renderPreview } from '../../preview/render.js';

/**
 * @typedef {{ r:number; g:number; b:number; a:number }} RGBA
 * @typedef {{
 *  type: 'contrast'|'img-alt'|'aria-label';
 *  level: 'error'|'warn'|'info';
 *  scope: 'custom-html'|'page';
 *  message: string;
 *  selector?: string;
 *  sample?: string;
 *  ratio?: number;
 *  required?: number;
 *  baselineRatio?: number;
 *  delta?: number;
 *  cause?: 'introduced'|'worsened'|'preexisting'|'unknown';
 *  fixCss?: string;
 *  imgSrc?: string;
 * }} Issue
 */

function getPreviewSrcdoc() {
    const frame = /** @type {HTMLIFrameElement|null} */ (document.getElementById('previewFrame'));
    return String(frame?.srcdoc || frame?.getAttribute?.('srcdoc') || '');
}

function parseRGBA(input) {
    const s = String(input || '').trim().toLowerCase();
    if (!s || s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

    const m = s.match(
        /^rgba?\(\s*([0-9.]+)\s*[,\s]\s*([0-9.]+)\s*[,\s]\s*([0-9.]+)(?:\s*[\/,]\s*([0-9.]+))?\s*\)$/
    );
    if (!m) return null;

    const r = Math.max(0, Math.min(255, Number(m[1])));
    const g = Math.max(0, Math.min(255, Number(m[2])));
    const b = Math.max(0, Math.min(255, Number(m[3])));
    const a = m[4] == null ? 1 : Math.max(0, Math.min(1, Number(m[4])));
    if ([r, g, b, a].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
}

function blend(top, bottom) {
    const a = top.a + bottom.a * (1 - top.a);
    if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
    const r = (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a;
    const g = (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a;
    const b = (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a;
    return { r, g, b, a };
}

function srgbToLinear(u8) {
    const v = u8 / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(c) {
    const r = srgbToLinear(c.r);
    const g = srgbToLinear(c.g);
    const b = srgbToLinear(c.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
    const L1 = luminance(fg);
    const L2 = luminance(bg);
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
}

function isLargeText(fontSizePx, fontWeight) {
    const size = Number(fontSizePx) || 0;
    const weight =
        typeof fontWeight === 'string'
            ? fontWeight === 'bold'
                ? 700
                : parseInt(fontWeight, 10) || 400
            : Number(fontWeight) || 400;

    return size >= 24 || (size >= 19 && weight >= 700);
}

function safeSample(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    return t.length > 60 ? t.slice(0, 60) + '…' : t;
}

function cssEscapeIdent(s) {
    // @ts-ignore
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function simpleSelector(el) {
    if (el.id) return `#${cssEscapeIdent(el.id)}`;
    const tag = el.tagName.toLowerCase();
    const classes = Array.from(el.classList || [])
        .filter(Boolean)
        .slice(0, 2)
        .map(cssEscapeIdent);
    if (classes.length) return `${tag}.${classes.join('.')}`;

    const p = el.parentElement;
    if (!p) return tag;

    const same = Array.from(p.children).filter((c) => c.tagName === el.tagName);
    if (same.length > 1) return `${tag}:nth-of-type(${same.indexOf(el) + 1})`;
    return tag;
}

function buildSelector(el, scopeRoot) {
    const parts = [];
    let cur = el;

    while (cur && cur.nodeType === 1 && cur !== scopeRoot) {
        parts.unshift(simpleSelector(cur));
        if (cur.id) break;
        cur = cur.parentElement;
    }

    const prefix =
        scopeRoot?.id ? `#${cssEscapeIdent(scopeRoot.id)} ` : scopeRoot?.classList?.length
            ? '.' + Array.from(scopeRoot.classList).map(cssEscapeIdent).join('.') + ' '
            : '';

    return prefix + parts.join(' > ');
}

function resolveEffectiveBackground(el) {
    /** @type {RGBA[]} */
    const layers = [];
    let hasImage = false;

    let cur = el;
    while (cur && cur.nodeType === 1) {
        const cs = cur.ownerDocument.defaultView.getComputedStyle(cur);
        if (cs.backgroundImage && cs.backgroundImage !== 'none') hasImage = true;

        const bg = parseRGBA(cs.backgroundColor);
        if (bg && bg.a > 0) layers.push(bg);

        if (bg && bg.a >= 1) break;
        cur = cur.parentElement;
    }

    /** @type {RGBA} */
    let base = { r: 255, g: 255, b: 255, a: 1 };

    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);

    return { bg: base, hasImage };
}

async function ensureAuditDoc(srcdoc) {
    let frame = /** @type {HTMLIFrameElement|null} */ (document.getElementById('a11yAuditFrame'));
    if (!frame) {
        frame = document.createElement('iframe');
        frame.id = 'a11yAuditFrame';
        frame.setAttribute('aria-hidden', 'true');
        // Read-only computed styles, no scripts
        frame.setAttribute('sandbox', 'allow-same-origin');
        frame.style.position = 'fixed';
        frame.style.left = '-200vw';
        frame.style.top = '0';
        frame.style.width = '1200px';
        frame.style.height = '800px';
        frame.style.opacity = '0';
        frame.style.pointerEvents = 'none';
        document.body.appendChild(frame);
    }

    await new Promise((resolve) => {
        frame.onload = () => resolve(true);
        frame.srcdoc = srcdoc;
    });

    await new Promise((r) => requestAnimationFrame(() => r(true)));

    const doc = frame.contentDocument;
    if (!doc) throw new Error('Audit iframe failed to load document.');
    return doc;
}

/**
 * Best-effort baseline: remove custom CSS from the srcdoc so we can diff.
 * Works best if your renderPreview wraps custom css with sentinel comments.
 */
function stripCustomCssFromSrcdoc(srcdoc, customCss) {
    const raw = String(srcdoc || '');
    const css = String(customCss || '').trim();
    if (!raw.trim() || !css) return raw;

    // Preferred: sentinel markers (recommended to add in renderPreview)
    const START = '/*__LAB_CUSTOM_CSS_START__*/';
    const END = '/*__LAB_CUSTOM_CSS_END__*/';
    if (raw.includes(START) && raw.includes(END)) {
        return raw.replace(new RegExp(`${START}[\\s\\S]*?${END}`, 'g'), `${START}\n/* removed for baseline */\n${END}`);
    }

    // Next-best: exact substring match
    if (raw.includes(css)) return raw.replace(css, '/* removed custom css for baseline */');

    // DOM parse fallback: remove from any <style> containing it
    try {
        const doc = new DOMParser().parseFromString(raw, 'text/html');
        const styles = Array.from(doc.querySelectorAll('style'));
        let changed = false;

        for (const st of styles) {
            const txt = st.textContent || '';
            if (txt.includes(css)) {
                st.textContent = txt.replace(css, '/* removed custom css for baseline */');
                changed = true;
                break;
            }
        }
        return changed ? doc.documentElement.outerHTML : raw;
    } catch {
        return raw;
    }
}

/** ---------- Semantics audit: only inside custom HTML ---------- */
function auditSemanticsCustom(doc) {
    /** @type {Issue[]} */
    const issues = [];

    const root = doc.querySelector('.profile-custom-html');
    if (!root) {
        issues.push({
            type: 'img-alt',
            level: 'info',
            scope: 'custom-html',
            message: 'No .profile-custom-html container found in preview.',
        });
        return issues;
    }

    // IMG alt
    const imgs = root.querySelectorAll('img');
    let count = 0;
    for (const img of imgs) {
        count++;
        if (count > 250) {
            issues.push({ type: 'img-alt', level: 'info', scope: 'custom-html', message: 'Image audit truncated (250+ images).' });
            break;
        }
        const alt = img.getAttribute('alt');
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (alt == null) {
            issues.push({
                type: 'img-alt',
                level: 'error',
                scope: 'custom-html',
                message: 'Image missing alt attribute.',
                selector: buildSelector(img, root),
                imgSrc: src,
            });
        } else if (alt.trim() === '') {
            issues.push({
                type: 'img-alt',
                level: 'warn',
                scope: 'custom-html',
                message: 'Image alt is empty. OK if decorative; otherwise add a description.',
                selector: buildSelector(img, root),
                imgSrc: src,
            });
        }
    }

    // aria-label / accessible name for icon-only links/buttons
    /** @type {Element[]} */
    const clickables = Array.from(root.querySelectorAll('a[href], button, [role="button"]'));
    let c2 = 0;

    for (const el of clickables) {
        c2++;
        if (c2 > 300) {
            issues.push({ type: 'aria-label', level: 'info', scope: 'custom-html', message: 'ARIA audit truncated (300+ elements).' });
            break;
        }

        // Skip disabled buttons
        if (el.matches('button:disabled, [aria-disabled="true"]')) continue;

        const ariaLabel = (el.getAttribute('aria-label') || '').trim();
        if (ariaLabel) continue;

        const labelledBy = (el.getAttribute('aria-labelledby') || '').trim();
        if (labelledBy) {
            const ref = root.querySelector(`#${cssEscapeIdent(labelledBy)}`);
            if (ref && safeSample(ref.textContent || '')) continue;
        }

        const text = safeSample(el.textContent || '');
        if (text) continue;

        // If it contains an image with a meaningful alt, that counts as a name
        const img = el.querySelector('img');
        if (img) {
            const alt = (img.getAttribute('alt') || '').trim();
            if (alt) continue;
        }

        issues.push({
            type: 'aria-label',
            level: 'warn',
            scope: 'custom-html',
            message: 'Clickable element has no accessible name (add text or aria-label).',
            selector: buildSelector(el, root),
        });
    }

    return issues;
}

/** ---------- Contrast audit: page-wide ---------- */
function auditContrast(doc, level) {
    /** @type {Issue[]} */
    const issues = [];

    const root = doc.body;
    const customRoot = doc.querySelector('.profile-custom-html');

    const minNormalAA = 4.5;
    const minLargeAA = 3.0;
    const minNormalAAA = 7.0;
    const minLargeAAA = 4.5;

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    const seen = new Set();
    let textCount = 0;

    while (walker.nextNode()) {
        const node = /** @type {Text} */ (walker.currentNode);
        const sample = safeSample(node.nodeValue || '');
        if (!sample) continue;

        const el = node.parentElement;
        if (!el) continue;

        // ignore script/style
        const tag = el.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;

        const cs = doc.defaultView.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0) continue;

        const fontSize = parseFloat(cs.fontSize || '0');
        const large = isLargeText(fontSize, cs.fontWeight);
        const required =
            level === 'AAA'
                ? large
                    ? minLargeAAA
                    : minNormalAAA
                : large
                    ? minLargeAA
                    : minNormalAA;

        const fg = parseRGBA(cs.color);
        if (!fg) continue;

        const { bg, hasImage } = resolveEffectiveBackground(el);

        // backgrounds with images/gradients: can't reliably compute
        if (hasImage) {
            const sel = buildSelector(el, root);
            const key = `imgbg|${sel}|${sample}`;
            if (!seen.has(key)) {
                seen.add(key);
                issues.push({
                    type: 'contrast',
                    level: 'info',
                    scope: 'page',
                    message: `Background image/gradient detected; contrast can’t be verified reliably here.`,
                    selector: sel,
                    sample,
                });
            }
            continue;
        }

        const ratio = contrastRatio({ ...fg, a: 1 }, { ...bg, a: 1 });
        if (ratio >= required) continue;

        textCount++;
        if (textCount > 600) {
            issues.push({ type: 'contrast', level: 'info', scope: 'page', message: 'Contrast audit truncated (600+ text nodes).' });
            break;
        }

        const sel = buildSelector(el, root);
        const key = `${sel}|${sample}|${required}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Suggest a fix
        const black = { r: 0, g: 0, b: 0, a: 1 };
        const white = { r: 255, g: 255, b: 255, a: 1 };
        const rBlack = contrastRatio(black, bg);
        const rWhite = contrastRatio(white, bg);
        const preferredHex = rWhite >= rBlack ? '#fff' : '#000';
        const preferredRatio = Math.max(rBlack, rWhite);

        let fixCss = '';
        if (preferredRatio >= required) {
            fixCss = `${sel} { color: ${preferredHex}; }\n`;
        } else {
            fixCss =
                `${sel} {\n` +
                `  color: #fff;\n` +
                `  background: rgba(0,0,0,.55);\n` +
                `  padding: 0.15em 0.35em;\n` +
                `  border-radius: 6px;\n` +
                `}\n`;
        }

        const inCustom = !!(customRoot && customRoot.contains(el));
        issues.push({
            type: 'contrast',
            level: 'error',
            scope: 'page',
            message: `Low contrast: ${ratio.toFixed(2)}:1 (needs ≥ ${required}:1)`,
            selector: sel,
            sample,
            ratio,
            required,
            fixCss,
            // helpful hint in message list (still scope page-wide)
            cause: inCustom ? 'unknown' : 'unknown',
        });
    }

    return issues;
}

function addAltToMissingImgs(html) {
    return String(html || '').replace(/<img\b(?![^>]*\balt\s*=)([^>]*?)(\/?)>/gi, (m, attrs, slash) => {
        const cleaned = attrs || '';
        return `<img${cleaned} alt=""${slash ? '/' : ''}>`;
    });
}

/** Diff contrast issues (introduced/worsened/preexisting) */
function diffContrast(mainIssues, baseIssues) {
    const baseMap = new Map();
    for (const b of baseIssues) {
        const key = `${b.selector}|${b.sample}|${b.required}`;
        baseMap.set(key, b);
    }

    for (const m of mainIssues) {
        const key = `${m.selector}|${m.sample}|${m.required}`;
        const b = baseMap.get(key);
        if (!b || typeof b.ratio !== 'number') {
            m.cause = 'unknown';
            continue;
        }
        m.baselineRatio = b.ratio;
        m.delta = (m.ratio ?? 0) - (b.ratio ?? 0);

        const baseFailed = (b.ratio ?? 999) < (b.required ?? 0);
        const mainFailed = (m.ratio ?? 999) < (m.required ?? 0);

        if (!baseFailed && mainFailed) m.cause = 'introduced';
        else if (baseFailed && mainFailed) {
            // If the ratio dropped by a meaningful amount, call it worsened
            m.cause = (m.delta != null && m.delta < -0.25) ? 'worsened' : 'preexisting';
        } else m.cause = 'unknown';
    }
}

export default {
    id: 'a11y',
    name: 'Accessibility Audit',
    keywords: 'accessibility a11y contrast alt aria wcag',
    /** @param {HTMLElement} panel */
    render(panel) {
        panel.innerHTML = `
      <div class="fw-semibold">Accessibility Audit</div>
      <div class="small text-body-secondary">
        Semantics are checked only in <code>.profile-custom-html</code>. Contrast is checked page-wide, with optional diff vs baseline (no custom CSS).
      </div>

      <hr class="my-3" />

      <div class="row g-2">
        <div class="col-12 col-md-4">
          <label class="form-label small">WCAG</label>
          <select id="a11yLevel" class="form-select form-select-sm">
            <option value="AA" selected>AA</option>
            <option value="AAA">AAA</option>
          </select>
        </div>

        <div class="col-12 col-md-8">
          <label class="form-label small">Contrast reporting</label>
          <div class="d-flex flex-wrap gap-3 align-items-center">
            <label class="d-flex gap-2 align-items-center m-0 small">
              <input id="a11yDiff" class="form-check-input m-0" type="checkbox" checked>
              <span>Only issues introduced/worsened by Custom CSS (diff vs baseline)</span>
            </label>
            <label class="d-flex gap-2 align-items-center m-0 small">
              <input id="a11yIncludePre" class="form-check-input m-0" type="checkbox">
              <span>Include pre-existing base issues</span>
            </label>
          </div>
        </div>

        <div class="col-12 d-flex gap-2 mt-2">
          <button id="a11yRun" class="btn btn-sm btn-outline-primary" type="button">Run Audit</button>
          <button id="a11yFixAltAll" class="btn btn-sm btn-outline-warning" type="button">Add alt="" to missing &lt;img&gt; in Custom HTML</button>
          <button id="a11yCopyReport" class="btn btn-sm btn-outline-secondary" type="button" disabled>Copy Report</button>
          <button id="a11yInsertFixes" class="btn btn-sm btn-outline-success" type="button" disabled>Insert Suggested CSS Fixes</button>
        </div>
      </div>

      <div class="mt-3">
        <div id="a11ySummary" class="small text-body-secondary">No results yet.</div>
        <div id="a11yResults" class="list-group mt-2"></div>
      </div>
    `;

        const levelEl = /** @type {HTMLSelectElement|null} */ (panel.querySelector('#a11yLevel'));
        const diffEl = /** @type {HTMLInputElement|null} */ (panel.querySelector('#a11yDiff'));
        const includePreEl = /** @type {HTMLInputElement|null} */ (panel.querySelector('#a11yIncludePre'));
        const btnRun = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#a11yRun'));
        const btnFixAltAll = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#a11yFixAltAll'));
        const btnCopyReport = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#a11yCopyReport'));
        const btnInsertFixes = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#a11yInsertFixes'));
        const summaryEl = /** @type {HTMLElement|null} */ (panel.querySelector('#a11ySummary'));
        const resultsEl = /** @type {HTMLElement|null} */ (panel.querySelector('#a11yResults'));
        if (!levelEl || !diffEl || !includePreEl || !btnRun || !btnFixAltAll || !btnCopyReport || !btnInsertFixes || !summaryEl || !resultsEl) return;

        /** @type {Issue[]} */
        let lastIssues = [];

        const renderIssues = () => {
            resultsEl.innerHTML = '';

            const counts = {
                error: lastIssues.filter((i) => i.level === 'error').length,
                warn: lastIssues.filter((i) => i.level === 'warn').length,
                info: lastIssues.filter((i) => i.level === 'info').length,
            };

            summaryEl.textContent = `Errors: ${counts.error} • Warnings: ${counts.warn} • Info: ${counts.info}`;

            btnCopyReport.disabled = !lastIssues.length;
            btnInsertFixes.disabled = !lastIssues.some((i) => i.fixCss);

            for (const issue of lastIssues) {
                const item = document.createElement('div');
                item.className = 'list-group-item';

                const header = document.createElement('div');
                header.className = 'd-flex justify-content-between gap-2';

                const left = document.createElement('div');

                const badge = document.createElement('span');
                badge.className =
                    issue.level === 'error'
                        ? 'badge text-bg-danger'
                        : issue.level === 'warn'
                            ? 'badge text-bg-warning'
                            : 'badge text-bg-secondary';
                badge.textContent = `${issue.level.toUpperCase()} • ${issue.scope}`;

                const title = document.createElement('div');
                title.className = 'fw-semibold mt-1';
                title.textContent = issue.message;

                left.appendChild(badge);
                left.appendChild(title);

                if (issue.type === 'contrast' && issue.cause && issue.cause !== 'unknown') {
                    const meta = document.createElement('div');
                    meta.className = 'small text-body-secondary';
                    const base = typeof issue.baselineRatio === 'number' ? issue.baselineRatio.toFixed(2) : 'n/a';
                    meta.textContent = `Cause: ${issue.cause} • baseline ${base}:1`;
                    left.appendChild(meta);
                }

                if (issue.sample) {
                    const s = document.createElement('div');
                    s.className = 'small text-body-secondary';
                    s.textContent = `Text: "${issue.sample}"`;
                    left.appendChild(s);
                }

                if (issue.imgSrc) {
                    const src = document.createElement('div');
                    src.className = 'small text-body-secondary';
                    src.textContent = `img src: ${issue.imgSrc.length > 90 ? issue.imgSrc.slice(0, 90) + '…' : issue.imgSrc}`;
                    left.appendChild(src);
                }

                if (issue.selector) {
                    const sel = document.createElement('div');
                    sel.className = 'small text-body-secondary';
                    sel.textContent = `Selector: ${issue.selector}`;
                    left.appendChild(sel);
                }

                const right = document.createElement('div');
                right.className = 'd-flex flex-wrap gap-2 justify-content-end';

                if (issue.fixCss) {
                    const copyBtn = document.createElement('button');
                    copyBtn.type = 'button';
                    copyBtn.className = 'btn btn-sm btn-outline-secondary';
                    copyBtn.textContent = 'Copy CSS fix';
                    copyBtn.addEventListener('click', async () => {
                        await copyToClipboard(issue.fixCss.trimEnd() + '\n');
                        setStatus('ok', 'Copied CSS fix.');
                    });

                    const insBtn = document.createElement('button');
                    insBtn.type = 'button';
                    insBtn.className = 'btn btn-sm btn-outline-success';
                    insBtn.textContent = 'Insert CSS fix';
                    insBtn.addEventListener('click', () => {
                        insertAtCursor(els.customCss, issue.fixCss.trimEnd() + '\n');
                        setStatus('ok', 'Inserted CSS fix.');
                        if (els.autoUpdate?.checked) renderPreview();
                    });

                    right.appendChild(copyBtn);
                    right.appendChild(insBtn);
                }

                header.appendChild(left);
                header.appendChild(right);

                item.appendChild(header);
                resultsEl.appendChild(item);
            }
        };

        btnRun.addEventListener('click', async () => {
            try {
                setStatus('info', 'Running accessibility audit…');

                // Ensure preview srcdoc is current
                renderPreview();
                await new Promise((r) => setTimeout(r, 40));

                const srcdoc = getPreviewSrcdoc();
                if (!srcdoc.trim()) {
                    setStatus('warn', 'No preview srcdoc found. Click Render then try again.');
                    return;
                }

                const level = levelEl.value === 'AAA' ? 'AAA' : 'AA';

                // Main doc (with custom CSS)
                const docMain = await ensureAuditDoc(srcdoc);

                // Semantics: custom HTML only
                const semanticIssues = auditSemanticsCustom(docMain);

                // Contrast: page-wide
                let contrastIssues = auditContrast(docMain, level);

                // Optional diff vs baseline (no custom css)
                if (diffEl.checked) {
                    const baselineSrcdoc = stripCustomCssFromSrcdoc(srcdoc, els.customCss?.value || '');
                    const docBase = await ensureAuditDoc(baselineSrcdoc);
                    const baseContrast = auditContrast(docBase, level);
                    diffContrast(contrastIssues, baseContrast);

                    const includePre = includePreEl.checked;
                    contrastIssues = contrastIssues.filter((i) => {
                        if (i.type !== 'contrast' || i.level !== 'error') return true;
                        if (i.cause === 'introduced' || i.cause === 'worsened') return true;
                        return includePre; // show preexisting only if requested
                    });
                }

                lastIssues = [...semanticIssues, ...contrastIssues];

                renderIssues();
                setStatus('ok', `Audit complete. Found ${lastIssues.length} issue(s).`);
            } catch (err) {
                console.error(err);
                setStatus('err', 'Accessibility audit failed. Check console for details.');
            }
        });

        btnFixAltAll.addEventListener('click', () => {
            const before = els.customHtml?.value || '';
            if (!before.trim()) {
                setStatus('warn', 'Custom HTML is empty.');
                return;
            }
            const after = addAltToMissingImgs(before);
            if (after === before) {
                setStatus('ok', 'No <img> tags were missing alt.');
                return;
            }
            els.customHtml.value = after;
            setStatus('ok', 'Added alt="" to <img> tags missing alt in Custom HTML.');
            if (els.autoUpdate?.checked) renderPreview();
        });

        btnCopyReport.addEventListener('click', async () => {
            if (!lastIssues.length) return;
            const lines = lastIssues.map((i) => {
                const parts = [
                    `- [${i.level.toUpperCase()}] (${i.scope}/${i.type}) ${i.message}`,
                    i.selector ? `sel=${i.selector}` : '',
                    i.sample ? `"${i.sample}"` : '',
                    i.imgSrc ? `src=${i.imgSrc}` : '',
                    i.cause && i.type === 'contrast' ? `cause=${i.cause}` : '',
                ].filter(Boolean);
                return parts.join(' | ');
            });
            await copyToClipboard(lines.join('\n') + '\n');
            setStatus('ok', 'Copied report.');
        });

        btnInsertFixes.addEventListener('click', () => {
            const cssFixes = lastIssues.map((i) => i.fixCss).filter(Boolean);
            if (!cssFixes.length) return;

            const block =
                `/* === Accessibility Fixes (generated) === */\n` +
                cssFixes.join('\n') +
                `\n/* === /Accessibility Fixes === */\n`;

            insertAtCursor(els.customCss, block);
            setStatus('ok', 'Inserted suggested CSS fixes.');
            if (els.autoUpdate?.checked) renderPreview();
        });

        renderIssues();
    },
};