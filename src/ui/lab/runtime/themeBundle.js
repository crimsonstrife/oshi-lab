// @ts-check

import { state } from './state.js';
import { els } from './dom.js';
import { setStatus } from './status.js';

import { downloadTextFile } from './utils/download.js';
import { syncEditorsFromTextareas } from './scripts/editors/index.js';
import { renderPreview } from './preview/render.js';
import { loadTemplateById } from './templates/index.js';

export const THEME_BUNDLE_SCHEMA_VERSION = 1;

/**
 * Best-effort app version for embedding into exported bundles.
 * @returns {string}
 */
export function getAppVersion() {
  try {
    // Prefer build-time env vars if present.
    // @ts-ignore
    const v = (import.meta && import.meta.env && (import.meta.env.PUBLIC_APP_VERSION || import.meta.env.VITE_APP_VERSION || import.meta.env.APP_VERSION))
      ? String(import.meta.env.PUBLIC_APP_VERSION || import.meta.env.VITE_APP_VERSION || import.meta.env.APP_VERSION)
      : '';
    if (v && v.trim()) return v.trim();
  } catch {
    // ignore
  }

  // Fallback to lab-root dataset.
  const root = document.getElementById('lab-root');
  const ds = root?.dataset?.version || root?.dataset?.appVersion || '';
  if (ds && String(ds).trim()) return String(ds).trim();

  // Fallback to meta tag.
  const meta = document.querySelector('meta[name="app-version"]')?.getAttribute('content') || '';
  if (meta && meta.trim()) return meta.trim();

  return 'unknown';
}

/**
 * @typedef {Object} ThemeBundleV1
 * @property {string} app
 * @property {number} schemaVersion
 * @property {string} appVersion
 * @property {string} exportedAt
 * @property {string|null} templateId
 * @property {'template'|'extracted'} [baseMode]
 * @property {{capturedAt:string, css:string, body:string}|null} [extractedBase]
 * @property {string} customCss
 * @property {string} customHtml
 * @property {boolean} appendInstead
 * @property {boolean} autoUpdate
 * @property {boolean} enableMock
 * @property {{displayName:string, username:string, tagline:string, avatar:string, bg:string}} mock
 */

/**
 * Build an exportable theme bundle object from current UI state.
 * @returns {ThemeBundleV1}
 */
export function buildThemeBundle() {
  const bundle = {
    app: 'oshi-lab',
    schemaVersion: THEME_BUNDLE_SCHEMA_VERSION,
    appVersion: getAppVersion(),
    exportedAt: new Date().toISOString(),
    templateId: state.activeTemplateId || null,
    baseMode: state.baseMode || 'template',

    customCss: els.customCss?.value || '',
    customHtml: els.customHtml?.value || '',
    appendInstead: !!els.appendInstead?.checked,
    autoUpdate: !!els.autoUpdate?.checked,
    enableMock: !!els.enableMock?.checked,
    mock: {
      displayName: els.mockDisplayName?.value || '',
      username: els.mockUsername?.value || '',
      tagline: els.mockTagline?.value || '',
      avatar: els.mockAvatar?.value || '',
      bg: els.mockBg?.value || '',
    },

  };

  // Optional: include extracted base snapshot (for reproducible previews across devices).
  const canInclude = !!(els.includeExtractedBase?.checked && state.baseMode === 'extracted' && state.extractedBase);
  if (canInclude) {
    // @ts-ignore
    bundle.extractedBase = { ...state.extractedBase };
    // @ts-ignore
    bundle.baseMode = 'extracted';
  }

  return bundle;
}

/**
 * @param {ThemeBundleV1} bundle
 * @returns {string}
 */
export function serializeThemeBundle(bundle) {
  return JSON.stringify(bundle, null, 2) + '\n';
}

/**
 * @param {number} n
 * @returns {string}
 */
function formatBytes(n) {
  const v = Math.max(0, Number.isFinite(n) ? n : 0);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * @param {ThemeBundleV1} bundle
 */
function computeThemeBundleSummary(bundle) {
  const json = serializeThemeBundle(bundle);
  const bytes = new Blob([json]).size;
  const includesHtml = !!(bundle.customHtml || '').trim();
  const includesMock = !!bundle.enableMock;
  const templateId = bundle.templateId || '—';
  const baseMode = bundle.baseMode || (bundle.extractedBase ? 'extracted' : 'template');
  const includesBase = !!bundle.extractedBase && baseMode === 'extracted';
  return { json, bytes, includesHtml, includesMock, templateId, baseMode, includesBase };
}

/**
 * Update the on-screen summary for the theme bundle export.
 */
export function updateThemeBundleSummary() {
  const infoEl = els.bundleInfo || document.getElementById('bundleInfo');
  if (!infoEl) return;

  const includeEl = els.includeExtractedBase || /** @type {HTMLInputElement|null} */ (document.getElementById('includeExtractedBase'));

  try {
    const bundle = buildThemeBundle();
    const s = computeThemeBundleSummary(bundle);

    // Enable extracted-base inclusion only when currently using an extracted base.
    if (includeEl) {
      const canInclude = (state.baseMode === 'extracted') && !!state.extractedBase;
      includeEl.disabled = !canInclude;
      if (!canInclude) includeEl.checked = false;
    }
    const parts = [
      `Bundle: ${formatBytes(s.bytes)}`,
      `HTML ${s.includesHtml ? '✓' : '—'}`,
      `Mock ${s.includesMock ? '✓' : '—'}`,
      s.baseMode === 'extracted'
        ? `Base: extracted${s.includesBase ? ' ✓' : ''}`
        : 'Base: template',
      `Template: ${s.templateId}`,
    ];
    infoEl.textContent = parts.join(' • ');
    infoEl.classList.remove('text-danger');
  } catch {
    infoEl.textContent = 'Bundle: —';
    infoEl.classList.add('text-danger');
  }
}

/**
 * Export the current theme bundle as JSON.
 */
export function exportThemeBundle() {
  try {
    const bundle = buildThemeBundle();
    const s = computeThemeBundleSummary(bundle);
    const includeEl = els.includeExtractedBase || document.getElementById('includeExtractedBase');

    // Enable extracted-base inclusion only when currently using an extracted base.
    if (includeEl) {
      const canInclude = (state.baseMode === 'extracted') && !!state.extractedBase;
      includeEl.disabled = !canInclude;
      if (!canInclude) includeEl.checked = false;
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `oshi-lab-theme-bundle-${date}.json`;
    downloadTextFile(filename, s.json, 'application/json;charset=utf-8');

    setStatus(
      'ok',
      `Exported theme bundle (${formatBytes(s.bytes)} • HTML ${s.includesHtml ? '✓' : '—'} • Mock ${s.includesMock ? '✓' : '—'} • ${s.baseMode === 'extracted' ? `Base extracted${s.includesBase ? ' ✓' : ''}` : 'Base template'} • Template ${s.templateId}).`
    );
  } catch (e) {
    console.error(e);
    setStatus('err', 'Theme bundle export failed.');
  }
}

/**
 * Trigger the hidden file input.
 */
export function promptThemeBundleImport() {
  const input = els.themeImportInput || /** @type {HTMLInputElement|null} */ (document.getElementById('themeImportInput'));
  if (!input) {
    setStatus('err', 'Import control missing from the page.');
    return;
  }
  input.value = '';
  input.click();
}

/**
 * @param {any} obj
 * @returns {ThemeBundleV1}
 */
function normalizeThemeBundle(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Bundle must be a JSON object.');

  const schemaVersion = Number(obj.schemaVersion);
  if (!Number.isFinite(schemaVersion)) throw new Error('Missing or invalid schemaVersion.');
  if (schemaVersion !== THEME_BUNDLE_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${schemaVersion}. Expected ${THEME_BUNDLE_SCHEMA_VERSION}.`);
  }

  /** @type {ThemeBundleV1} */
  const bundle = {
    app: typeof obj.app === 'string' ? obj.app : 'oshi-lab',
    schemaVersion,
    appVersion: typeof obj.appVersion === 'string' ? obj.appVersion : 'unknown',
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    templateId: (typeof obj.templateId === 'string') ? obj.templateId : null,

    customCss: typeof obj.customCss === 'string' ? obj.customCss : '',
    customHtml: typeof obj.customHtml === 'string' ? obj.customHtml : '',
    appendInstead: !!obj.appendInstead,
    autoUpdate: (typeof obj.autoUpdate === 'boolean') ? obj.autoUpdate : !!els.autoUpdate?.checked,
    enableMock: (typeof obj.enableMock === 'boolean') ? obj.enableMock : !!els.enableMock?.checked,
    mock: {
      displayName: typeof obj.mock?.displayName === 'string' ? obj.mock.displayName : '',
      username: typeof obj.mock?.username === 'string' ? obj.mock.username : '',
      tagline: typeof obj.mock?.tagline === 'string' ? obj.mock.tagline : '',
      avatar: typeof obj.mock?.avatar === 'string' ? obj.mock.avatar : '',
      bg: typeof obj.mock?.bg === 'string' ? obj.mock.bg : '',
    },
  };

  return bundle;
}

/**
 * Apply a bundle to the UI and state.
 * @param {ThemeBundleV1} bundle
 */
export async function applyThemeBundle(bundle) {
  // Apply autoUpdate preference early so template load doesn't render unexpectedly.
  if (els.autoUpdate && typeof bundle.autoUpdate === 'boolean') els.autoUpdate.checked = bundle.autoUpdate;

  // Template first so any default mock values are applied before we overwrite.
  if (bundle.templateId && state.templatesById && state.templatesById.has(bundle.templateId)) {
    await loadTemplateById(bundle.templateId);
  } else if (bundle.templateId) {
    setStatus('warn', `Template not available: ${bundle.templateId}. Keeping current template.`);
  }

  if (els.customCss) els.customCss.value = bundle.customCss || '';
  if (els.customHtml) els.customHtml.value = bundle.customHtml || '';
  if (els.appendInstead) els.appendInstead.checked = !!bundle.appendInstead;
  if (els.enableMock) els.enableMock.checked = !!bundle.enableMock;

  if (els.mockDisplayName) els.mockDisplayName.value = bundle.mock?.displayName || '';
  if (els.mockUsername) els.mockUsername.value = bundle.mock?.username || '';
  if (els.mockTagline) els.mockTagline.value = bundle.mock?.tagline || '';
  if (els.mockAvatar) els.mockAvatar.value = bundle.mock?.avatar || '';
  if (els.mockBg) els.mockBg.value = bundle.mock?.bg || '';

  // keep CodeMirror in sync if mounted
  syncEditorsFromTextareas();

  updateThemeBundleSummary();
  setStatus('ok', 'Theme bundle imported.');
  if (els.autoUpdate?.checked) renderPreview();
}

/**
 * Handle file input selection.
 */
export async function handleThemeBundleImport() {
  const input = els.themeImportInput || /** @type {HTMLInputElement|null} */ (document.getElementById('themeImportInput'));
  const file = input?.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    let obj;
    try {
      obj = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON file.');
    }

    const bundle = normalizeThemeBundle(obj);
    await applyThemeBundle(bundle);

    // Provide a richer status message including summary.
    const s = computeThemeBundleSummary(bundle);
    setStatus(
      'ok',
      `Imported theme bundle (${formatBytes(s.bytes)} • HTML ${s.includesHtml ? '✓' : '—'} • Mock ${s.includesMock ? '✓' : '—'} • ${s.baseMode === 'extracted' ? `Base extracted${s.includesBase ? ' ✓' : ''}` : 'Base template'} • Template ${s.templateId}).`
    );
  } catch (e) {
    console.error(e);
    const msg = (e && typeof e === 'object' && 'message' in e) ? String(e.message) : 'Theme bundle import failed.';
    setStatus('err', msg);
  } finally {
    if (input) input.value = '';
  }
}
