// @ts-check

/**
 * @param {string} css
 * @param {string} body
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

/** @param {string} css */
export function quickFormatCss(css) {
  return (css || '')
    .replace(/\r\n/g, '\n')
    .replace(/;\s*/g, ';\n')
    .replace(/\}\s*/g, '}\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
