// @ts-check

/**
 * Tool Schema (v1)
 *
 * Tools in the Lab are discovered via the registry and rendered via the Tools modal.
 * This file defines the single, canonical interface that every tool must conform to.
 *
 * A tool definition includes:
 * - Stable identity and display metadata (id, name, description, icon, category)
 * - Capability flags used by the UI (supportsInsert/supportsUpdate)
 * - An optional keyboard shortcut (shown in the UI; optionally used for quick-open)
 * - A render function that mounts tool UI into a given panel
 */

/** @typedef {'Theme'|'Layout'|'Widgets'|'Accessibility'|'Utilities'} ToolCategory */

export const TOOL_SCHEMA_VERSION = 1;

/** @type {ToolCategory[]} */
export const TOOL_CATEGORIES = ['Theme', 'Layout', 'Widgets', 'Accessibility', 'Utilities'];

/**
 * @typedef {Object} ToolShortcut
 * @property {string} combo Human readable combo, e.g. "Alt+1" or "Ctrl+Shift+S".
 * @property {string} norm Normalized combo for comparisons, e.g. "alt+1".
 */

/**
 * @typedef {Object} ToolContext
 * @property {typeof import('../dom.js').els} els DOM element bindings.
 * @property {(level:'ok'|'warn'|'err'|'info', msg:string)=>void} setStatus Status setter.
 * @property {()=>void} renderPreview Re-render preview if auto-update is enabled.
 */

/**
 * @typedef {Object} ToolDef
 * @property {number} schemaVersion Must match TOOL_SCHEMA_VERSION.
 * @property {string} id Stable unique id (kebab-case recommended).
 * @property {string} name Display name.
 * @property {string} description One-line description for the palette list.
 * @property {string} icon Emoji or icon-class string (UI renders as text).
 * @property {ToolCategory} category Tool grouping for the palette UI.
 * @property {boolean} supportsInsert Whether this tool inserts snippets into editors.
 * @property {boolean} supportsUpdate Whether this tool updates snippets in-place via markers.
 * @property {ToolShortcut | string} [shortcut] Optional keyboard shortcut.
 * @property {string} [keywords] Optional search keywords.
 * @property {number} [order] Optional ordering hint (lower first).
 * @property {(panel: HTMLElement, ctx: ToolContext) => void} render Mount UI.
 */

/** @param {string} s */
function normShortcut(s) {
  const parts = String(s || '')
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);

  if (!parts.length) return '';

  const key = parts.pop() || '';
  const mods = parts
    .map((m) => m.toLowerCase())
    .map((m) => (m === 'cmd' || m === 'command' ? 'meta' : m))
    .filter((m) => ['ctrl', 'meta', 'alt', 'shift'].includes(m))
    .sort();

  const k = String(key).toLowerCase();
  return [...mods, k].join('+');
}

/**
 * Normalize a shortcut.
 * @param {ToolDef['shortcut']} shortcut
 * @returns {ToolShortcut | undefined}
 */
export function normalizeShortcut(shortcut) {
  if (!shortcut) return undefined;
  if (typeof shortcut === 'string') {
    const norm = normShortcut(shortcut);
    return norm ? { combo: shortcut, norm } : undefined;
  }
  if (typeof shortcut === 'object' && typeof shortcut.combo === 'string') {
    const norm = shortcut.norm || normShortcut(shortcut.combo);
    return norm ? { combo: shortcut.combo, norm } : undefined;
  }
  return undefined;
}

/**
 * Quick structural type guard.
 * @param {any} tool
 * @returns {tool is ToolDef}
 */
export function isValidToolDef(tool) {
  if (!tool || typeof tool !== 'object') return false;
  if (tool.schemaVersion !== TOOL_SCHEMA_VERSION) return false;
  if (!tool.id || typeof tool.id !== 'string') return false;
  if (!tool.name || typeof tool.name !== 'string') return false;
  if (!tool.description || typeof tool.description !== 'string') return false;
  if (!tool.icon || typeof tool.icon !== 'string') return false;
  if (!tool.category || typeof tool.category !== 'string') return false;
  if (!TOOL_CATEGORIES.includes(tool.category)) return false;
  if (typeof tool.supportsInsert !== 'boolean') return false;
  if (typeof tool.supportsUpdate !== 'boolean') return false;
  if (typeof tool.render !== 'function') return false;
  return true;
}

/**
 * Human-friendly errors for dev-time failures.
 * @param {any} tool
 * @returns {string[]}
 */
export function getToolDefErrors(tool) {
  /** @type {string[]} */
  const errs = [];
  if (!tool || typeof tool !== 'object') return ['Tool is not an object'];
  if (tool.schemaVersion !== TOOL_SCHEMA_VERSION) errs.push(`schemaVersion must be ${TOOL_SCHEMA_VERSION}`);
  if (!tool.id || typeof tool.id !== 'string') errs.push('id (string) is required');
  if (!tool.name || typeof tool.name !== 'string') errs.push('name (string) is required');
  if (!tool.description || typeof tool.description !== 'string') errs.push('description (string) is required');
  if (!tool.icon || typeof tool.icon !== 'string') errs.push('icon (string) is required');
  if (!tool.category || typeof tool.category !== 'string') errs.push('category (string) is required');
  else if (!TOOL_CATEGORIES.includes(tool.category)) errs.push(`category must be one of: ${TOOL_CATEGORIES.join(', ')}`);
  if (typeof tool.supportsInsert !== 'boolean') errs.push('supportsInsert (boolean) is required');
  if (typeof tool.supportsUpdate !== 'boolean') errs.push('supportsUpdate (boolean) is required');
  if (typeof tool.render !== 'function') errs.push('render(panel, ctx) function is required');
  const sc = normalizeShortcut(tool.shortcut);
  if (tool.shortcut && !sc) errs.push('shortcut is invalid (expected "Alt+1" or {combo,norm})');
  return errs;
}
