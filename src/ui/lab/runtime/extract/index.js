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
      const header = '/* ===== Imported from existing MyOshi Custom CSS ===== */\n';
      els.customCss.value = cssUserRaw.trim().startsWith('/* ===== Imported')
        ? cssUserRaw.trim()
        : header + cssUserRaw.trim();
    }

    if (els.customHtml && userHtml.trim()) els.customHtml.value = userHtml.trim();
    if (els.basePeek) els.basePeek.value = summarizeBase(state.baseCss, state.baseBody);

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
