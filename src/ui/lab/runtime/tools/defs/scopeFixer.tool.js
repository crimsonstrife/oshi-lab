// @ts-check

import { els } from '../../dom.js';
import { setStatus } from '../../status.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { insertAtCursor } from '../../utils/textarea.js';
import { renderPreview } from '../../preview/render.js';
import { TOOL_SCHEMA_VERSION } from '../schema.js';

/**
 * CSS Scope Fixer
 *
 * NOTE (MyOshi change): MyOshi now auto-scopes user CSS by prepending
 * `.profile-page.profile-custom-css` to selectors. If users include that wrapper
 * themselves, it can become duplicated:
 * `.profile-page.profile-custom-css.profile-page.profile-custom-css ...`
 *
 * This tool therefore supports two modes:
 *
 * 1) MyOshi Auto-Scope mode (default)
 *    - STRIPS any explicit wrapper selector from the start of selectors
 *    - NORMALIZES selectors so MyOshi's prepender produces the intended result
 *      (e.g. `.card` becomes ` .card`, so MyOshi can prepend to produce
 *      `.profile-page.profile-custom-css .card`)
 *    - Converts `:root/html/body` to a wrapper-safe target `:where(*)`
 *      (so MyOshi prepends to `.profile-page.profile-custom-css:where(*)`)
 *
 * 2) Manual Prefix mode (legacy)
 *    - Prefixes qualified selectors with the scope selector.
 *
 * Intentional Limitations:
 * - It does not rewrite `@keyframes` blocks or other at-rules without selectors
 *   (`@font-face`, `@property`, etc.)
 * - It does not attempt to perfectly parse modern CSS nesting syntax
 *   (rare in user pasted snippets)
 */

/** @param {string} s */
function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the matching closing brace for a block starting at `openIdx` (the index of `{`).
 * Skips braces inside strings and comments.
 *
 * @param {string} css
 * @param {number} openIdx
 * @return {number} Index of the matching `}` or -1 if not found.
 */
function findMatchingBrace(css, openIdx) {
    let i = openIdx + 1;
    let depth = 1;

    /** @type {null | '"' | "'"} */
    let inStr = null;
    let inComment = false;

    while (i < css.length) {
        const ch = css[i];
        const next = css[i + 1];

        if (inComment) {
            if (ch === '*' && next === '/') {
                inComment = false;
                i += 2;
                continue;
            }
            i += 1;
            continue;
        }

        if (inStr) {
            if (ch === '\\') {
                i += 2;
                continue;
            }
            if (ch === inStr) {
                inStr = null;
            }
            i += 1;
            continue;
        }

        if (ch === '/' && next === '*') {
            inComment = true;
            i += 2;
            continue;
        }

        if (ch === '"' || ch === "'") {
            inStr = ch;
            i += 1;
            continue;
        }

        if (ch === '{') depth += 1;
        else if (ch === '}') {
            depth -= 1;
            if (depth === 0) return i;
        }

        i += 1;
    }

    return -1;
}

/**
 * Splits a selector list by commas, ignoring commas inside strings, parentheses, or brackets.
 *
 * @param {string} sel
 * @return {string[]}
 */
function splitSelectors(sel) {
    /** @type {string[]} */
    const out = [];
    let cur = '';

    /** @type {null | '"' | "'"} */
    let inStr = null;
    let inComment = false;
    let paren = 0;
    let bracket = 0;

    for (let i = 0; i < sel.length; i++) {
        const ch = sel[i];
        const next = sel[i + 1];

        if (inComment) {
            cur += ch;
            if (ch === '*' && next === '/') {
                cur += next;
                inComment = false;
                i += 1;
            }
            continue;
        }

        if (inStr) {
            cur += ch;
            if (ch === '\\') {
                cur += next || '';
                i += 1;
                continue;
            }
            if (ch === inStr) inStr = null;
            continue;
        }

        if (ch === '/' && next === '*') {
            cur += ch + next;
            inComment = true;
            i += 1;
            continue;
        }

        if (ch === '"' || ch === "'") {
            cur += ch;
            inStr = ch;
            continue;
        }

        if (ch === '(') paren += 1;
        else if (ch === ')') paren = Math.max(0, paren - 1);
        else if (ch === '[') bracket += 1;
        else if (ch === ']') bracket = Math.max(0, bracket - 1);

        if (ch === ',' && paren === 0 && bracket === 0) {
            out.push(cur.trim());
            cur = '';
            continue;
        }

        cur += ch;
    }

    if (cur.trim()) out.push(cur.trim());
    return out;
}

/**
 * Determines whether a selector is already scoped.
 *
 * @param {string} selector
 * @param {string} scope
 * @param {boolean} containsOk If true, treat selectors containing `scope` anywhere as already scoped.
 */
function isAlreadyScoped(selector, scope, containsOk) {
    const s = selector.trim();
    if (!s) return false;

    // common cases: scope at the beginning
    if (s.startsWith(scope)) return true;

    // avoid double-scoping when users already wrapped selectors
    if (containsOk && s.includes(scope)) return true;

    return false;
}

/**
 * Strip a leading wrapper selector from a selector string.
 *
 * @param {string} sel
 * @param {string} scope
 */
function stripLeadingScope(sel, scope) {
    if (!scope) return sel;
    let s = sel.trimStart();

    // Strip repeatedly in case user pasted it twice.
    while (s.startsWith(scope)) {
        s = s.slice(scope.length).trimStart();
    }

    return s;
}

/**
 * Normalize selector so MyOshi's "prepend wrapper" scoper won't break it.
 *
 * @param {string} sel
 * @param {string} scope
 * @param {{convertRoot: boolean}} opts
 */
function normalizeForMyOshi(sel, scope, opts) {
    let s = sel.trim();
    if (!s) return '';

    // First strip any explicit wrapper the user included.
    s = stripLeadingScope(s, scope).trim();

    // If this was JUST the scope, we want "the wrapper itself".
    if (!s) return ':where(*)';

    // Root-ish selectors should target wrapper itself (safe under prepender).
    if (opts.convertRoot) {
        s = s
            .replace(/^:root\b/, ':where(*)')
            .replace(/^html\b/, ':where(*)')
            .replace(/^body\b/, ':where(*)');
    }

    // If we mapped to wrapper target, we're done.
    if (s.startsWith(':where(*)')) return s;

    // If it already starts with a combinator/whitespace, it's prepender-safe.
    if (/^[\s>+~]/.test(s)) return s;

    // If it starts with a pseudo-class, it's a pseudo on wrapper (prepender-safe).
    if (s.startsWith(':') || s.startsWith('::')) return s;

    // Otherwise, force it to be a descendant selector after prepending.
    return ` ${s}`;
}

/**
 * Rewrites a selector list to be scoped.
 *
 * @param {string} selectorText
 * @param {string} scope
 * @param {{convertRoot: boolean, skipScoped: boolean, containsScoped: boolean, myoshiAuto: boolean}} opts
 * @return {string}
 */
function scopeSelectorText(selectorText, scope, opts) {
    const list = splitSelectors(selectorText);

    /** @type {string[]} */
    const out = [];

    for (const raw of list) {
        let sel = raw.trim();
        if (!sel) continue;

        // MyOshi auto-scope mode (default)
        if (opts.myoshiAuto) {
            const norm = normalizeForMyOshi(sel, scope, { convertRoot: opts.convertRoot });
            if (!norm) continue;
            out.push(norm);
            continue;
        }

        // Legacy/manual prefix mode
        if (opts.convertRoot) {
            // replace leading :root/html/body tokens
            sel = sel
                .replace(/^:root\b/, scope)
                .replace(/^html\b/, scope)
                .replace(/^body\b/, scope);
        }

        if (opts.skipScoped && isAlreadyScoped(sel, scope, opts.containsScoped)) {
            out.push(sel);
            continue;
        }

        out.push(`${scope} ${sel}`.trim());
    }

    return out.join(', ');
}

/**
 * Parses the next top-level rule or at-rule starting at `i`.
 * Returns { kind, header, openIdx, closeIdx, endIdx } where:
 * - kind: 'at' | 'qualified'
 * - header: text before `{` (or before `;` for at-rules without block)
 *
 * @param {string} css
 * @param {number} i
 */
function readNextTopLevel(css, i) {
    const n = css.length;
    let j = i;

    // skip whitespace
    while (j < n && /\s/.test(css[j])) j += 1;

    if (j >= n) return null;

    // comment passthrough
    if (css[j] === '/' && css[j + 1] === '*') {
        const end = css.indexOf('*/', j + 2);
        const endIdx = end === -1 ? n : end + 2;
        return { kind: 'comment', startIdx: j, endIdx };
    }

    // scan to next { or ; at top level, respecting strings/comments/paren
    /** @type {null | '"' | "'"} */
    let inStr = null;
    let inComment = false;
    let paren = 0;

    let headerEnd = -1;
    let isBlock = false;
    for (; j < n; j++) {
        const ch = css[j];
        const next = css[j + 1];

        if (inComment) {
            if (ch === '*' && next === '/') {
                inComment = false;
                j += 1;
            }
            continue;
        }

        if (inStr) {
            if (ch === '\\') {
                j += 1;
                continue;
            }
            if (ch === inStr) inStr = null;
            continue;
        }

        if (ch === '/' && next === '*') {
            inComment = true;
            j += 1;
            continue;
        }

        if (ch === '"' || ch === "'") {
            inStr = ch;
            continue;
        }

        if (ch === '(') paren += 1;
        else if (ch === ')') paren = Math.max(0, paren - 1);

        if (paren === 0 && ch === '{') {
            headerEnd = j;
            isBlock = true;
            break;
        }
        if (paren === 0 && ch === ';') {
            headerEnd = j;
            isBlock = false;
            break;
        }
    }

    if (headerEnd === -1) {
        return { kind: 'raw', startIdx: i, endIdx: n };
    }

    const header = css.slice(i, headerEnd).trimEnd();

    if (!isBlock) {
        return { kind: header.trimStart().startsWith('@') ? 'at-stmt' : 'qualified-stmt', startIdx: i, endIdx: headerEnd + 1, header };
    }

    const openIdx = headerEnd;
    const closeIdx = findMatchingBrace(css, openIdx);
    if (closeIdx === -1) {
        return { kind: 'raw', startIdx: i, endIdx: n };
    }
    return {
        kind: header.trimStart().startsWith('@') ? 'at' : 'qualified',
        startIdx: i,
        header,
        openIdx,
        closeIdx,
        endIdx: closeIdx + 1,
    };
}

/**
 * Extracts the at-rule name (e.g., "media" from "@media ...").
 *
 * @param {string} header
 */
function atRuleName(header) {
    const m = String(header || '').trimStart().match(/^@([a-zA-Z-]+)/);
    return (m?.[1] || '').toLowerCase();
}

/**
 * Scopes/normalizes CSS text with the given options.
 *
 * @param {string} css
 * @param {string} scope
 * @param {{convertRoot: boolean, skipScoped: boolean, containsScoped: boolean, keepComments: boolean, myoshiAuto: boolean}} opts
 */
function scopeCss(css, scope, opts) {
    let i = 0;
    let out = '';

    const RECURSE = new Set(['media', 'supports', 'container', 'layer', 'document', 'scope']);
    const NO_TOUCH = new Set(['keyframes', '-webkit-keyframes', 'font-face', 'property', 'page']);

    while (i < css.length) {
        const part = readNextTopLevel(css, i);
        if (!part) break;

        if (part.kind === 'comment') {
            if (opts.keepComments) out += css.slice(part.startIdx, part.endIdx);
            i = part.endIdx;
            continue;
        }

        if (part.kind === 'raw') {
            out += css.slice(part.startIdx, part.endIdx);
            i = part.endIdx;
            continue;
        }

        if (part.kind === 'at-stmt') {
            out += css.slice(part.startIdx, part.endIdx);
            i = part.endIdx;
            continue;
        }

        if (part.kind === 'qualified-stmt') {
            // Rare but legal (e.g. custom property sets). Leave as-is.
            out += css.slice(part.startIdx, part.endIdx);
            i = part.endIdx;
            continue;
        }

        if (part.kind === 'qualified') {
            const scopedHeader = scopeSelectorText(part.header, scope, opts);
            const body = css.slice(part.openIdx + 1, part.closeIdx);
            out += `${scopedHeader} {${body}}`;
            i = part.endIdx;
            continue;
        }

        if (part.kind === 'at') {
            const name = atRuleName(part.header);
            const body = css.slice(part.openIdx + 1, part.closeIdx);

            if (NO_TOUCH.has(name)) {
                out += css.slice(part.startIdx, part.endIdx);
                i = part.endIdx;
                continue;
            }

            if (RECURSE.has(name)) {
                const scopedInner = scopeCss(body, scope, opts);
                out += `${part.header} {${scopedInner}}`;
                i = part.endIdx;
                continue;
            }

            // Default: keep at-rule but still try to recurse (safe for most block at-rules)
            const scopedInner = scopeCss(body, scope, opts);
            out += `${part.header} {${scopedInner}}`;
            i = part.endIdx;
            continue;
        }

        // fallback
        out += css.slice(part.startIdx, part.endIdx);
        i = part.endIdx;
    }

    return out;
}

/**
 * Builds the tool UI.
 */
/** @type {import('../schema.js').ToolDef} */
const tool = {
    schemaVersion: TOOL_SCHEMA_VERSION,
    id: 'scope-fixer',
    name: 'CSS Scope Fixer',
    description: "Rewrite pasted CSS so it plays nicely with MyOshi's automatic selector scoping.",
    icon: '🧹',
    category: 'Utilities',
    supportsInsert: true,
    supportsUpdate: false,
    shortcut: 'Alt+8',
    keywords: 'scope prefix selector rewrite fix pasted css myoshi',
    order: 12,

    /** @param {HTMLElement} panel */
    render(panel) {
        panel.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <label class="form-label small">Scope selector</label>
          <input id="sfScope" class="form-control form-control-sm font-monospace" value=".profile-page.profile-custom-css" />

          <div class="form-check mt-2">
            <input class="form-check-input" type="checkbox" id="sfMyOshiAuto" checked />
            <label class="form-check-label small" for="sfMyOshiAuto">
              MyOshi auto-scopes: <strong>strip wrapper</strong> and make selectors prepender-safe (recommended)
            </label>
          </div>

          <div class="form-check mt-2">
            <input class="form-check-input" type="checkbox" id="sfConvertRoot" checked />
            <label class="form-check-label small" for="sfConvertRoot">Convert <code>:root</code>/<code>html</code>/<code>body</code> to wrapper target</label>
          </div>

          <div class="form-check mt-1">
            <input class="form-check-input" type="checkbox" id="sfSkipScoped" checked />
            <label class="form-check-label small" for="sfSkipScoped">Skip selectors that are already scoped</label>
          </div>

          <div class="form-check mt-1">
            <input class="form-check-input" type="checkbox" id="sfContainsScoped" checked />
            <label class="form-check-label small" for="sfContainsScoped">Treat selectors that contain the scope anywhere as already scoped</label>
          </div>

          <div class="form-check mt-1">
            <input class="form-check-input" type="checkbox" id="sfKeepComments" checked />
            <label class="form-check-label small" for="sfKeepComments">Keep comments</label>
          </div>

          <label class="form-label small mt-3">Input CSS</label>
          <textarea id="sfIn" class="form-control form-control-sm font-monospace" rows="12" placeholder="Paste CSS here…"></textarea>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button id="sfRun" class="btn btn-sm btn-primary" type="button">Fix CSS</button>
            <button id="sfUseCustomCss" class="btn btn-sm btn-outline-secondary" type="button">Load from Custom CSS</button>
            <button id="sfClear" class="btn btn-sm btn-outline-danger" type="button">Clear</button>
          </div>

          <div class="form-text">
            Tip: This tool won't touch <code>@keyframes</code> or <code>@font-face</code>. In MyOshi auto-scope mode it removes explicit wrappers to prevent <code>.scope.scope</code> duplication.
          </div>
        </div>

        <div class="col-12 col-lg-7">
          <label class="form-label small">Output</label>
          <textarea id="sfOut" class="form-control form-control-sm font-monospace" rows="18" readonly></textarea>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button id="sfInsert" class="btn btn-sm btn-outline-primary" type="button">Insert into Custom CSS</button>
            <button id="sfReplace" class="btn btn-sm btn-outline-warning" type="button">Replace Custom CSS</button>
            <button id="sfCopy" class="btn btn-sm btn-outline-secondary" type="button">Copy</button>
          </div>

          <div class="form-text">
            Insertion appends at your cursor. Replace overwrites the Custom CSS field entirely.
          </div>
        </div>
      </div>
    `;

        const elScope = /** @type {HTMLInputElement|null} */ (panel.querySelector('#sfScope'));
        const elMyOshiAuto = /** @type {HTMLInputElement|null} */ (panel.querySelector('#sfMyOshiAuto'));
        const elConvertRoot = /** @type {HTMLInputElement|null} */ (panel.querySelector('#sfConvertRoot'));
        const elSkipScoped = /** @type {HTMLInputElement|null} */ (panel.querySelector('#sfSkipScoped'));
        const elContainsScoped = /** @type {HTMLInputElement|null} */ (panel.querySelector('#sfContainsScoped'));
        const elKeepComments = /** @type {HTMLInputElement|null} */ (panel.querySelector('#sfKeepComments'));
        const elIn = /** @type {HTMLTextAreaElement|null} */ (panel.querySelector('#sfIn'));
        const elOut = /** @type {HTMLTextAreaElement|null} */ (panel.querySelector('#sfOut'));

        const btnRun = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#sfRun'));
        const btnUseCustomCss = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#sfUseCustomCss'));
        const btnClear = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#sfClear'));
        const btnInsert = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#sfInsert'));
        const btnReplace = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#sfReplace'));
        const btnCopy = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#sfCopy'));

        if (!elScope || !elMyOshiAuto || !elConvertRoot || !elSkipScoped || !elContainsScoped || !elKeepComments || !elIn || !elOut || !btnRun || !btnUseCustomCss || !btnClear || !btnInsert || !btnReplace || !btnCopy) return;

        const syncUi = () => {
            const myoshi = !!elMyOshiAuto.checked;
            // Skip/contains only make sense in manual prefix mode.
            elSkipScoped.disabled = myoshi;
            elContainsScoped.disabled = myoshi;
        };
        syncUi();
        elMyOshiAuto.addEventListener('change', syncUi);

        /** @return {string} */
        const run = () => {
            const scope = elScope.value.trim() || '.profile-page.profile-custom-css';
            const input = elIn.value || '';
            const myoshiAuto = !!elMyOshiAuto.checked;

            const scoped = scopeCss(input, scope, {
                convertRoot: !!elConvertRoot.checked,
                skipScoped: !!elSkipScoped.checked,
                containsScoped: !!elContainsScoped.checked,
                keepComments: !!elKeepComments.checked,
                myoshiAuto,
            });

            const header = myoshiAuto
                ? `/* === MyOshi-normalized CSS (platform auto-scopes) === */\n`
                : `/* === Scoped CSS (${scope}) === */\n`;
            const footer = myoshiAuto
                ? `\n/* === /MyOshi-normalized CSS === */\n`
                : `\n/* === /Scoped CSS === */\n`;

            const result = header + scoped.trimEnd() + footer + '\n';

            elOut.value = result;
            return result;
        };

        btnRun.addEventListener('click', () => {
            run();
            setStatus('ok', 'CSS fixed.');
        });

        btnUseCustomCss.addEventListener('click', () => {
            if (!els.customCss) return;
            elIn.value = String(els.customCss.value || '');
            setStatus('ok', 'Loaded current Custom CSS into Scope Fixer.');
        });

        btnClear.addEventListener('click', () => {
            elIn.value = '';
            elOut.value = '';
            setStatus('ok', 'Cleared Scope Fixer.');
        });

        btnCopy.addEventListener('click', async () => {
            const txt = elOut.value.trimEnd();
            if (!txt) {
                setStatus('warn', 'Nothing to copy. Click “Fix CSS” first.');
                return;
            }
            await copyToClipboard(txt + '\n');
            setStatus('ok', 'Copied output.');
        });

        btnInsert.addEventListener('click', () => {
            const txt = elOut.value.trimEnd();
            if (!txt) {
                setStatus('warn', 'Nothing to insert. Click “Fix CSS” first.');
                return;
            }
            if (!els.customCss) return;
            insertAtCursor(els.customCss, txt + '\n');
            setStatus('ok', 'Inserted output into Custom CSS.');
            if (els.autoUpdate?.checked) renderPreview();
        });

        btnReplace.addEventListener('click', () => {
            const txt = elOut.value.trimEnd();
            if (!txt) {
                setStatus('warn', 'Nothing to replace. Click “Fix CSS” first.');
                return;
            }
            if (!els.customCss) return;
            els.customCss.value = txt + '\n';
            setStatus('ok', 'Replaced Custom CSS with output.');
            if (els.autoUpdate?.checked) renderPreview();
        });
    },
};

export default tool;
