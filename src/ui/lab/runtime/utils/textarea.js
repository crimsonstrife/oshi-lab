// @ts-check

/**
 * Insert text at the current cursor/selection position.
 * @param {HTMLTextAreaElement|null} textarea
 * @param {string} text
 */
export function insertAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.setRangeText(text, start, end, 'end');
  textarea.focus();
}
