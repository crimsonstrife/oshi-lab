// @ts-check

/**
 * Copies the provided text to the clipboard.
 *
 * @param {string} text - The text to be copied to the clipboard.
 * @return {Promise<void>} A promise that resolves when the text is successfully copied to the clipboard.
 */
export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}
