// @ts-check

import { els } from './dom.js';

/**
 * @param {'ok'|'warn'|'err'|string} kind
 * @param {string} msg
 */
export function setStatus(kind, msg) {
  if (!els.statusText) return;
  const cls = kind === 'ok' ? 'ok' : kind === 'warn' ? 'warn' : kind === 'err' ? 'err' : '';
  els.statusText.className = 'status ' + cls;
  els.statusText.textContent = msg;
}
