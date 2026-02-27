// @ts-check
import createDOMPurify from 'dompurify';
import { state } from '../state.js';
import { els } from '../dom.js';
import { setStatus } from '../status.js';
import { decodeHtmlEntities, maybeExtractSrcdoc } from '../utils/html.js';
import { summarizeBase } from '../utils/format.js';
import { splitCssFromPreview, splitBodyFromPreview } from './split.js';
import { autoBackupBeforeExtract } from '../snapshots/index.js';
import { renderPreview } from '../preview/render.js';
import { loadTemplateById } from '../templates/index.js';
import { syncEditorsFromTextareas } from '../scripts/editors/index.js';

/**
 * A variable that holds the instance of DOMPurify for client-side use.
 *
 * DOMPurify is a library used to sanitize HTML, ensuring that the content
 * is safe from security vulnerabilities such as XSS (Cross-Site Scripting).
 * It strips out unwanted or dangerous elements and attributes from user-input
 * or untrusted HTML strings, providing a secure output.
 *
 * The initialization of DOMPurify occurs only if the code is executed in a
 * browser environment (when `window` is defined). If not, the variable is set
 * to null.
 *
 * Note: This variable relies on the function `createDOMPurify` to generate
 * the DOMPurify instance.
 */
const DOMPurify = typeof window !== 'undefined' ? createDOMPurify(window) : null;

/**
 * Sanitizes the provided HTML string to ensure it is safe for use.
 *
 * This method uses the DOMPurify library to sanitize the input HTML,
 * removing potentially dangerous elements and attributes while
 * preserving allowed content based on the specified configuration.
 *
 * @param {string} html - The HTML string that needs to be sanitized.
 * @return {string} - The sanitized HTML string.
 */
function sanitizeTemplateHtml(html) {
    if (!DOMPurify) return html;
    return DOMPurify.sanitize(html, {
        WHOLE_DOCUMENT: true,
        USE_PROFILES: { html: true },
        ADD_TAGS: ['style'],
        ADD_ATTR: ['style'],
        FORBID_TAGS: [
            'script', 'noscript',
            'object', 'embed',
            'base', 'meta', 'link',
        ],
    });
}

/**
 * Safely strips injected CSS noise by leveraging an existing function, if available,
 * and provides a fallback mechanism to handle the CSS input when the function is not available.
 *
 * @param {string} css - The CSS string from which injected noise should be stripped.
 * @return {object} An object containing the processed CSS string. If the processing function is unavailable, it returns the original CSS string or an empty string if the input is undefined.
 */
function safeStripInjectedCssNoise(css) {
    // @ts-ignore
    if (typeof stripInjectedCssNoise === 'function') return stripInjectedCssNoise(css);
    // No-op fallback
    return { css: css || '' };
}

/**
 * MyOshi now auto-scopes Custom CSS to `.profile-page.profile-custom-css`.
 * When importing CSS from an existing profile/template (which may already be scoped),
 * we must strip that prefix to avoid double-scoping when users paste back into MyOshi.
 *
 * Also rewrites scope-root selectors to `:root`:
 *   `.profile-page.profile-custom-css { ... }` -> `:root { ... }`
 *
 * This is intentionally conservative: it only rewrites *qualified rule* selector preludes,
 * leaving declarations/values untouched.
 *
 * @param {string} css
 * @returns {string}
 */
function stripMyOshiAutoScopeFromCss(css) {
    if (!css) return css || '';

    const SCOPE_RE = /^\.profile-page\.profile-custom-css\b/;
    const WHERE_SCOPE_RE = /^:where\(\s*\.profile-page\.profile-custom-css\s*\)\b/;

    /**
     * @param {string} selector
     * @returns {string}
     */
    function stripFromSelector(selector) {
        // Preserve original leading/trailing whitespace for minimal diff / readability.
        const m = selector.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (!m) return selector;
        const leading = m[1] || '';
        let body = m[2] || '';
        const trailing = m[3] || '';

        if (!body.trim()) return selector;

        // Strip repeated prefixes if present.
        for (let pass = 0; pass < 8; pass++) {
            let matched = false;
            let matchLen = 0;

            const whereM = body.match(WHERE_SCOPE_RE);
            if (whereM) {
                matched = true;
                matchLen = whereM[0].length;
            } else {
                const scopeM = body.match(SCOPE_RE);
                if (scopeM) {
                    matched = true;
                    matchLen = scopeM[0].length;
                }
            }

            if (!matched) break;

            let rest = body.slice(matchLen);

            // If the scope was used as the whole selector, keep intent by mapping to :root.
            if (!rest) {
                body = ':root';
                break;
            }

            // If scope was immediately followed by pseudo/attr/class/id (no whitespace),
            // it was targeting the scoped root element itself (e.g. `.profile...:hover`).
            if (/^[#.\[:]/.test(rest)) {
                body = `:root${rest}`;
                break;
            }

            // Common case: scope used as an ancestor prefix (e.g. `.profile... .card`)
            // Remove whitespace then drop any leading combinator left dangling (`> + ~`).
            rest = rest.replace(/^\s+/, '');
            rest = rest.replace(/^[>+~]\s*/, '');

            body = rest || ':root';
            // Continue loop in case the selector was double-prefixed.
        }

        return `${leading}${body}${trailing}`;
    }

    /**
     * Split a selector list on commas, respecting (), [] and strings.
     * Returns an array including comma tokens so formatting is preserved.
     *
     * @param {string} text
     * @returns {string[]}
     */
    function splitSelectorListPreserve(text) {
        /** @type {string[]} */
        const out = [];
        let buf = '';
        let paren = 0;
        let bracket = 0;
        let inComment = false;
        /** @type {string|null} */
        let quote = null;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const next = text[i + 1];

            // comment handling
            if (!quote && !inComment && ch === '/' && next === '*') {
                inComment = true;
                buf += ch;
                continue;
            }
            if (inComment) {
                buf += ch;
                if (ch === '*' && next === '/') {
                    buf += next;
                    i++;
                    inComment = false;
                }
                continue;
            }

            // string handling
            if (!quote && (ch === '"' || ch === "'")) {
                quote = ch;
                buf += ch;
                continue;
            }
            if (quote) {
                buf += ch;
                if (ch === '\\' && next) {
                    // escape next char
                    buf += next;
                    i++;
                    continue;
                }
                if (ch === quote) quote = null;
                continue;
            }

            // depth tracking
            if (ch === '(') paren++;
            else if (ch === ')' && paren > 0) paren--;
            else if (ch === '[') bracket++;
            else if (ch === ']' && bracket > 0) bracket--;

            // top-level comma split
            if (ch === ',' && paren === 0 && bracket === 0) {
                out.push(buf);
                out.push(',');
                buf = '';
                continue;
            }

            buf += ch;
        }

        out.push(buf);
        return out;
    }

    /**
     * @param {string} prelude
     * @returns {string}
     */
    function stripFromSelectorPrelude(prelude) {
        const parts = splitSelectorListPreserve(prelude);
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === ',') continue;
            parts[i] = stripFromSelector(parts[i]);
        }
        return parts.join('');
    }

    // Walk the CSS and rewrite only "qualified rule" selector preludes.
    // This is a lightweight state machine that distinguishes:
    // - prelude mode: collecting text until `{` or `;`
    // - block mode: inside `{ ... }` of a qualified rule
    //
    // For at-rules like `@media (...) { ... }`, we keep the at-rule prelude,
    // but still rewrite nested qualified rule selectors inside it.
    let out = '';
    let prelude = '';
    /** @type {Array<'at'|'rule'>} */
    const stack = [];
    let inComment = false;
    /** @type {string|null} */
    let quote = null;

    const inPreludeMode = () => stack.length === 0 || stack[stack.length - 1] === 'at';

    for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        const next = css[i + 1];

        // comment handling
        if (!quote && !inComment && ch === '/' && next === '*') {
            inComment = true;
            if (inPreludeMode()) prelude += ch;
            else out += ch;
            continue;
        }
        if (inComment) {
            if (inPreludeMode()) prelude += ch;
            else out += ch;
            if (ch === '*' && next === '/') {
                if (inPreludeMode()) prelude += next;
                else out += next;
                i++;
                inComment = false;
            }
            continue;
        }

        // string handling
        if (!quote && (ch === '"' || ch === "'")) {
            quote = ch;
            if (inPreludeMode()) prelude += ch;
            else out += ch;
            continue;
        }
        if (quote) {
            if (inPreludeMode()) prelude += ch;
            else out += ch;
            if (ch === '\\' && next) {
                if (inPreludeMode()) prelude += next;
                else out += next;
                i++;
                continue;
            }
            if (ch === quote) quote = null;
            continue;
        }

        if (inPreludeMode()) {
            prelude += ch;

            // End of statement (e.g. @import ...;)
            if (ch === ';') {
                out += prelude;
                prelude = '';
                continue;
            }

            if (ch === '{') {
                // Remove the '{' from the collected prelude, rewrite, then add '{' back.
                prelude = prelude.slice(0, -1);
                const isAtRule = /^\s*@/.test(prelude);
                const rewritten = isAtRule ? prelude : stripFromSelectorPrelude(prelude);
                out += rewritten + '{';
                stack.push(isAtRule ? 'at' : 'rule');
                prelude = '';
            }
        } else {
            out += ch;
            if (ch === '}') {
                stack.pop();
            }
        }
    }

    // flush any trailing prelude text
    out += prelude;
    return out;
}

/**
 * Extracts and processes the base CSS and HTML content from a provided template input.
 * It performs sanitization, parsing, and splitting of CSS and HTML content,
 * updating relevant state and UI components accordingly.
 * Handles errors and ensures user data is automatically backed up during the process.
 *
 * @return {void} Does not return a value. The function updates application state and UI components directly.
 */
export function extractBase() {
    try {
        const raw = (els.templateInput?.value || '').trim();
        if (!raw) {
            setStatus('err', 'Template input is empty.');
            return;
        }

        let srcdoc = maybeExtractSrcdoc(raw);
        if (srcdoc) {
            srcdoc = decodeHtmlEntities(srcdoc);
        } else {
            srcdoc = raw.includes('&lt;') ? decodeHtmlEntities(raw) : raw;
        }

        // sanitize BEFORE parsing
        const safeSrcdoc = sanitizeTemplateHtml(srcdoc);

        const doc = new DOMParser().parseFromString(safeSrcdoc, 'text/html');

        const backedUp = autoBackupBeforeExtract();

        const styles = [...doc.querySelectorAll('style')].map((s) => s.textContent || '');
        const extractedCssAll = styles.join('\n\n').trim();

        const { baseCss: cssBaseRaw, userCss: cssUserRaw, marker } = splitCssFromPreview(extractedCssAll);
        // @ts-ignore
        const { css: cssBase } = safeStripInjectedCssNoise(cssBaseRaw);

        const { baseBody: bodyBase, userHtml } = splitBodyFromPreview(doc);

        if (!cssBase && !bodyBase) {
            setStatus('err', 'Could not extract base CSS/body. Make sure you pasted the actual srcdoc HTML.');
            return;
        }

        state.baseCss = (cssBase || '').trim();
        state.baseBody = (bodyBase || '').trim();

        if (els.customCss && cssUserRaw.trim()) {
            const importedUserCss = stripMyOshiAutoScopeFromCss(cssUserRaw).trim();
            const header = '/* ===== Imported from existing MyOshi Custom CSS ===== */\n';
            els.customCss.value = importedUserCss.startsWith('/* ===== Imported')
                ? importedUserCss
                : header + importedUserCss;
        }

        if (els.customHtml && userHtml.trim()) els.customHtml.value = userHtml.trim();
        if (els.basePeek) els.basePeek.value = summarizeBase(state.baseCss, state.baseBody);

        // keep CodeMirror in sync if mounted
        syncEditorsFromTextareas();

        const parts = [
            `Extracted base. Base CSS: ${state.baseCss.length.toLocaleString()} chars • Base body: ${state.baseBody.length.toLocaleString()} chars`,
            `Imported custom CSS: ${(els.customCss?.value || '').length.toLocaleString()} chars • Imported custom HTML: ${(els.customHtml?.value || '').length.toLocaleString()} chars`,
        ];
        if (marker) parts.push(`Split CSS via marker: ${marker}`);
        if (backedUp) parts.push('Auto-backed up your current draft to Snapshots.');

        setStatus('ok', parts.join(' • '));
        if (els.autoUpdate?.checked) renderPreview();
    } catch (err) {
        console.error(err);
        // @ts-ignore
        setStatus('err', `Extract failed: ${err?.message || String(err)}`);
    }
}

/**
 * Restores the base template by loading the template associated with the active template ID.
 * If no active template ID is found, a warning status message is set.
 *
 * @return {void} Does not return a value.
 */
export function restoreTemplateBase() {
    if (!state.activeTemplateId) {
        setStatus('warn', 'No active template selected.');
        return;
    }
    loadTemplateById(state.activeTemplateId);
}