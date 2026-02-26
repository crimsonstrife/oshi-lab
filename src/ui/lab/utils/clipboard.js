// @ts-check

/** @param {string} text */
export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}
