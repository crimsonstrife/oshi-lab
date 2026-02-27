// @ts-check
import { state } from '../state.js';
import { insertAtCursor as insertCM } from '../scripts/editors/insert.js';

/**
 * Insert text at the current cursor/selection position.
 * If CodeMirror editors are mounted, this will prefer inserting into the matching editor.
 *
 * @param {HTMLTextAreaElement|null} textarea
 * @param {string} text
 */
export function insertAtCursor(textarea, text) {
  if (!textarea) return;

  // Prefer CodeMirror if available.
  // @ts-ignore
  const editors = state.editors;
  if (editors) {
    if (textarea.id === 'customCss' && editors.css) {
      insertCM(editors.css, text);
      // keep textarea as data bus
      textarea.value = editors.css.getValue();
      textarea.dispatchEvent(new Event('input'));
      return;
    }
    if (textarea.id === 'customHtml' && editors.html) {
      insertCM(editors.html, text);
      textarea.value = editors.html.getValue();
      textarea.dispatchEvent(new Event('input'));
      return;
    }
  }

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.setRangeText(text, start, end, 'end');
  textarea.focus();

  try {
    textarea.dispatchEvent(new Event('input'));
  } catch {}
}
