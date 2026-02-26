// @ts-check

/**
 * Decode HTML entities (e.g. when users paste escaped iframe srcdoc).
 * @param {string} str
 */
export function decodeHtmlEntities(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

/**
 * Attempt to extract srcdoc content from an iframe wrapper HTML.
 * Supports srcdoc/srcDoc, single or double quotes.
 * @param {string} input
 * @returns {string|null}
 */
export function maybeExtractSrcdoc(input) {
  try {
    if (!input) return null;

    const m = input.match(/<iframe\b[^>]*\bsrcdoc\s*=\s*(["'])([\s\S]*?)\1/i);
    if (m) return m[2];

    if (!/<iframe/i.test(input) || !/srcdoc\s*=/i.test(input)) return null;

    const doc = new DOMParser().parseFromString(input, 'text/html');
    return doc.querySelector('iframe[srcdoc]')?.getAttribute('srcdoc') ?? null;
  } catch {
    return null;
  }
}
