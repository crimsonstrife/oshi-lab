// @ts-check

import { state } from '../state.js';
import { insertAtCursor } from './textarea.js';

/** @param {string} s */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @typedef {{
 *  kind: 'css'|'html';
 *  blockId: string;
 *  version?: number;
 *  body: string;
 * }} MarkedSnippetOptions
 */

/**
 * Build a snippet wrapped in stable begin/end markers.
 * Markers survive formatting and enable idempotent “update in place”.
 *
 * @param {MarkedSnippetOptions} opts
 */
export function buildMarkedSnippet(opts) {
  const kind = opts.kind;
  const id = String(opts.blockId || '').trim();
  const v = Number.isFinite(opts.version) ? String(/** @type {number} */ (opts.version)) : '1';
  const body = String(opts.body ?? '').trimEnd();

  if (!id) return body + '\n';

  if (kind === 'html') {
    return [
      `<!-- oshilab:begin block=${id} v=${v} -->`,
      body,
      `<!-- oshilab:end block=${id} -->`,
      '',
    ].join('\n');
  }

  return [
    `/* oshilab:begin block=${id} v=${v} */`,
    body,
    `/* oshilab:end block=${id} */`,
    '',
  ].join('\n');
}

/**
 * Find an existing marked block range (end is exclusive).
 * @param {string} text
 * @param {'css'|'html'} kind
 * @param {string} blockId
 */
function findMarkedRange(text, kind, blockId) {
  const id = escapeRegExp(String(blockId || '').trim());
  if (!id) return null;

  const beginRe =
    kind === 'html'
      ? new RegExp(`<!--\\s*oshilab:begin\\s+block=${id}\\b[\\s\\S]*?-->`, 'i')
      : new RegExp(`/\\*\\s*oshilab:begin\\s+block=${id}\\b[\\s\\S]*?\\*/`, 'i');

  const endRe =
    kind === 'html'
      ? new RegExp(`<!--\\s*oshilab:end\\s+block=${id}\\s*-->`, 'i')
      : new RegExp(`/\\*\\s*oshilab:end\\s+block=${id}\\s*\\*/`, 'i');

  const mBegin = beginRe.exec(text);
  if (!mBegin || typeof mBegin.index !== 'number') return null;

  const afterBegin = mBegin.index + mBegin[0].length;
  const mEnd = endRe.exec(text.slice(afterBegin));
  if (!mEnd || typeof mEnd.index !== 'number') return null;

  const end = afterBegin + mEnd.index + mEnd[0].length;
  return { start: mBegin.index, end };
}

/**
 * Replace/update a marked block if present, otherwise insert at cursor.
 *
 * @param {HTMLTextAreaElement|null} textarea
 * @param {'css'|'html'} kind
 * @param {string} blockId
 * @param {string} body
 * @param {number} [version]
 * @param {{forceNewCopy?: boolean}} [opts]
 * @returns {{ action: 'updated'|'inserted'|'skipped' }}
 */
export function upsertMarkedSnippet(textarea, kind, blockId, body, version = 1, opts = {}) {
  if (!textarea) return { action: 'skipped' };

  const snippet = buildMarkedSnippet({ kind, blockId, version, body });

  // If user explicitly wants duplicates, always insert.
  if (opts.forceNewCopy) {
    insertAtCursor(textarea, snippet);
    return { action: 'inserted' };
  }

  const cur = textarea.value || '';
  const range = findMarkedRange(cur, kind, blockId);

  if (!range) {
    insertAtCursor(textarea, snippet);
    return { action: 'inserted' };
  }

  const next = cur.slice(0, range.start) + snippet + cur.slice(range.end);

  // Prefer CodeMirror full-doc replace when available.
  // @ts-ignore
  const editors = state.editors;
  if (editors) {
    if (textarea.id === 'customCss' && editors.css) {
      editors.css.setValue(next);
      return { action: 'updated' };
    }
    if (textarea.id === 'customHtml' && editors.html) {
      editors.html.setValue(next);
      return { action: 'updated' };
    }
  }

  textarea.value = next;
  try {
    textarea.dispatchEvent(new Event('input'));
  } catch {}
  return { action: 'updated' };
}
