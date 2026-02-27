// @ts-check
import { els } from './dom.js';

/**
 * Updates the status display element with a specific message and styling based on the status kind.
 *
 * @param {string} kind - The type of status to set. Accepted values are 'ok', 'warn', or 'err'. Any other value results in no specific styling.
 * @param {string} msg - The message to display in the status element.
 * @return {void}
 */
export function setStatus(kind, msg) {
  if (!els.statusText) return;
  const cls = kind === 'ok' ? 'ok' : kind === 'warn' ? 'warn' : kind === 'err' ? 'err' : '';
  els.statusText.className = 'status ' + cls;
  els.statusText.textContent = msg;
}
