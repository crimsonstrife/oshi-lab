// @ts-check

/**
 * Generates a summarized representation of the provided CSS and body HTML.
 *
 * @param {string} css - The full CSS content to be summarized.
 * @param {string} body - The full HTML body content to be summarized.
 * @return {string} A string containing the first 1200 characters of the CSS and body,
 *                  along with their total character lengths.
 */
export function summarizeBase(css, body) {
  const cssLen = css.length.toLocaleString();
  const bodyLen = body.length.toLocaleString();
  const cssHead = css.slice(0, 1200);
  const bodyHead = body.slice(0, 1200);
  return [
    '=== Base CSS (first 1200 chars) ===',
    cssHead,
    '',
    `... (${cssLen} chars total)`,
    '',
    '=== Base Body HTML (first 1200 chars) ===',
    bodyHead,
    '',
    `... (${bodyLen} chars total)`,
  ].join('\n');
}

/**
 * Formats a CSS string by normalizing line breaks, adding consistent spacing, and removing excessive blank lines.
 *
 * @param {string} css - The CSS string to be formatted.
 * @return {string} The formatted CSS string.
 */
export function quickFormatCss(css) {
  return (css || '')
    .replace(/\r\n/g, '\n')
    .replace(/;\s*/g, ';\n')
    .replace(/}\s*/g, '}\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
