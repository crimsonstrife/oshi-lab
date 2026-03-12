// @ts-check

import { els } from '../../dom.js';
import { state } from '../../state.js';
import { setStatus } from '../../status.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { renderPreview } from '../../preview/render.js';
import { buildMarkedSnippet, upsertMarkedSnippet } from '../../utils/snippets.js';
import { parseColor, formatHex, formatRgba } from '../color.js';
import { TOOL_SCHEMA_VERSION } from '../schema.js';

/**
 * Quick Theme Builder
 *
 * Beginner-friendly guided generator that produces a cohesive starter theme.
 * Output is wrapped in snippet markers so re-applying updates in place.
 */

/** @typedef {'flat'|'glass'} CardStyle */

const BLOCK_ID = 'quick-theme';
const VERSION = 1;

/** @param {number} n */
function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Relative luminance (sRGB) in [0..1].
 * @param {{r:number,g:number,b:number}} c
 */
function luminance(c) {
  const srgb = [c.r, c.g, c.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Mix two RGB colors.
 * @param {{r:number,g:number,b:number}} a
 * @param {{r:number,g:number,b:number}} b
 * @param {number} t 0..1 where 0=a, 1=b
 */
function mix(a, b, t) {
  const k = clamp01(t);
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
    a: 1,
  };
}

/**
 * Darken/lighten by mixing with black/white.
 * @param {{r:number,g:number,b:number}} c
 * @param {number} t positive -> lighten toward white, negative -> darken toward black
 */
function shade(c, t) {
  if (!Number.isFinite(t) || t === 0) return { ...c, a: 1 };
  if (t > 0) return mix(c, { r: 255, g: 255, b: 255 }, clamp01(t));
  return mix(c, { r: 0, g: 0, b: 0 }, clamp01(-t));
}

/**
 * Ensure a CSS color string, normalizing supported formats to hex.
 * @param {string} input
 * @param {string} fallback
 */
function normalizeColor(input, fallback) {
  const c = parseColor(String(input || '').trim()) || parseColor(fallback);
  if (!c) return fallback;
  return formatHex({ r: c.r, g: c.g, b: c.b, a: 1 });
}

/**
 * @typedef {{
 *  palette: { primary:string, secondary:string, accent:string, bg:string, text:string },
 *  radius: number,
 *  padding: number,
 *  spacing: number,
 *  cardStyle: CardStyle,
 *  baseSize: number,
 *  headerWeight: number,
 *  avatarSize: number,
 *  avatarRadius: number,
 * }} QuickThemeValues
 */

/** @type {Record<string, { label: string, values: QuickThemeValues }>} */
const PRESETS = {
  cleanDark: {
    label: 'Clean Dark',
    values: {
      palette: {
        primary: '#60a5fa',
        secondary: '#93c5fd',
        accent: '#f97316',
        bg: '#0b1220',
        text: '#e5e7eb',
      },
      radius: 12,
      padding: 12,
      spacing: 8,
      cardStyle: 'flat',
      baseSize: 12,
      headerWeight: 700,
      avatarSize: 96,
      avatarRadius: 999,
    },
  },
  neon: {
    label: 'Neon',
    values: {
      palette: {
        primary: '#22d3ee',
        secondary: '#a78bfa',
        accent: '#fb7185',
        bg: '#05050a',
        text: '#f8fafc',
      },
      radius: 14,
      padding: 12,
      spacing: 10,
      cardStyle: 'glass',
      baseSize: 12,
      headerWeight: 800,
      avatarSize: 104,
      avatarRadius: 999,
    },
  },
  softPastel: {
    label: 'Soft Pastel',
    values: {
      palette: {
        primary: '#7aa6ff',
        secondary: '#ff8cc6',
        accent: '#48d1b5',
        bg: '#fff7fb',
        text: '#2b2b33',
      },
      radius: 16,
      padding: 14,
      spacing: 10,
      cardStyle: 'flat',
      baseSize: 12,
      headerWeight: 700,
      avatarSize: 96,
      avatarRadius: 24,
    },
  },
  glassMinimal: {
    label: 'Glass Minimal',
    values: {
      palette: {
        primary: '#38bdf8',
        secondary: '#34d399',
        accent: '#fbbf24',
        bg: '#0a0f16',
        text: '#e2e8f0',
      },
      radius: 18,
      padding: 14,
      spacing: 10,
      cardStyle: 'glass',
      baseSize: 12,
      headerWeight: 700,
      avatarSize: 96,
      avatarRadius: 999,
    },
  },
};

/**
 * Build deterministic CSS from values.
 * @param {QuickThemeValues} v
 */
function buildCssBody(v) {
  const primary = normalizeColor(v.palette.primary, '#369');
  const secondary = normalizeColor(v.palette.secondary, '#47a');
  const accent = normalizeColor(v.palette.accent, '#f60');
  const bg = normalizeColor(v.palette.bg, '#0b1220');
  const text = normalizeColor(v.palette.text, '#e5e7eb');

  const cBg = parseColor(bg) || { r: 0, g: 0, b: 0, a: 1 };
  const cText = parseColor(text) || { r: 255, g: 255, b: 255, a: 1 };
  const cPrimary = parseColor(primary) || { r: 51, g: 102, b: 153, a: 1 };
  const cAccent = parseColor(accent) || { r: 255, g: 102, b: 0, a: 1 };

  const isDark = luminance(cBg) < 0.42;

  const cardBase = mix(cBg, cText, isDark ? 0.085 : 0.035);
  const border = mix(cBg, cText, isDark ? 0.18 : 0.14);
  const borderLight = mix(cBg, cText, isDark ? 0.24 : 0.2);
  const borderLighter = mix(cBg, cText, isDark ? 0.3 : 0.26);

  const primaryDark = shade(cPrimary, isDark ? -0.25 : -0.18);
  const accentLight = shade(cAccent, 0.25);

  const textMedium = mix(cText, cBg, isDark ? 0.22 : 0.28);
  const textLight = mix(cText, cBg, isDark ? 0.35 : 0.42);

  // Shadows tuned to be subtle and within typical sanitizer limits.
  const shadow = isDark
    ? '0 10px 28px rgba(0,0,0,0.35)'
    : '0 10px 24px rgba(0,0,0,0.14)';

  const radius = Math.max(0, Math.round(Number(v.radius) || 0));
  const padding = Math.max(0, Math.round(Number(v.padding) || 0));
  const spacing = Math.max(0, Math.round(Number(v.spacing) || 0));
  const baseSize = Math.max(8, Math.round(Number(v.baseSize) || 12));
  const headerWeight = Math.max(100, Math.min(900, Math.round(Number(v.headerWeight) || 700)));
  const avatarSize = Math.max(40, Math.round(Number(v.avatarSize) || 96));
  const avatarRadius = Math.max(0, Math.round(Number(v.avatarRadius) || 0));

  const cardBg =
    v.cardStyle === 'glass'
      ? formatRgba({ ...cardBase, a: isDark ? 0.58 : 0.78 })
      : formatHex({ ...cardBase, a: 1 });

  const lines = [];

  lines.push('/* Quick Theme Builder */');
  lines.push('/* Notes:');
  lines.push('   - Workspace scope differs by target: Profile uses `.profile-page.profile-custom-css`; OshiCard uses `.oshi-card-custom-css`.');
  lines.push('   - Variables are set on `:root` (MyOshi maps this to the profile scope).');
  lines.push('*/');
  lines.push('');

  lines.push(':root {');
  lines.push(`  /* Palette */`);
  lines.push(`  --vs-blue-dark: ${formatHex(primaryDark)};`);
  lines.push(`  --vs-blue: ${primary};`);
  lines.push(`  --vs-blue-light: ${secondary};`);
  lines.push(`  --vs-orange: ${accent};`);
  lines.push(`  --vs-orange-light: ${formatHex(accentLight)};`);
  lines.push(`  --vs-bg-light: ${bg};`);
  lines.push(`  --vs-bg-white: ${cardBg};`);
  lines.push(`  --vs-text-dark: ${text};`);
  lines.push(`  --vs-text-medium: ${formatHex(textMedium)};`);
  lines.push(`  --vs-text-light: ${formatHex(textLight)};`);
  lines.push(`  --vs-border: ${formatHex(border)};`);
  lines.push(`  --vs-border-light: ${formatHex(borderLight)};`);
  lines.push(`  --vs-border-lighter: ${formatHex(borderLighter)};`);
  lines.push(`  --vs-link: var(--vs-blue);`);
  lines.push(`  --vs-link-hover: var(--vs-blue-dark);`);
  lines.push(`  --vs-link-bg: var(--vs-blue);`);
  lines.push('');
  lines.push(`  /* Layout */`);
  lines.push(`  --radius-default: ${Math.max(0, Math.round(radius * 0.5))}px;`);
  lines.push(`  --radius-lg: ${Math.max(0, Math.round(radius * 0.85))}px;`);
  lines.push(`  --radius-xl: ${radius}px;`);
  lines.push(`  --radius-pill: ${Math.max(radius, 10)}px;`);
  lines.push(`  --space-2: ${spacing}px;`);
  lines.push(`  --space-3: ${spacing + 4}px;`);
  lines.push(`  --space-4: ${spacing + 8}px;`);
  lines.push(`  --text-base: ${baseSize}px;`);
  lines.push(`  --qt-pad: ${padding}px;`);
  lines.push(`  --qt-header-weight: ${headerWeight};`);
  lines.push(`  --qt-avatar-size: ${avatarSize}px;`);
  lines.push(`  --qt-avatar-radius: ${avatarRadius}px;`);
  lines.push('}');
  lines.push('');

  // Component rules (will be auto-scoped by MyOshi).
  lines.push('/* Components */');
  lines.push('.card {');
  lines.push('  border: 1px solid var(--vs-border);');
  lines.push('  border-radius: var(--radius-xl);');
  lines.push('  background: var(--vs-bg-white);');
  lines.push(`  box-shadow: ${v.cardStyle === 'glass' ? shadow : 'none'};`);
  if (v.cardStyle === 'glass') {
    // Blur kept conservative for sanitizer limits.
    lines.push('  -webkit-backdrop-filter: blur(12px);');
    lines.push('  backdrop-filter: blur(12px);');
  }
  lines.push('}');
  lines.push('');

  lines.push('.card-header {');
  lines.push('  border-bottom: 1px solid var(--vs-border-light);');
  lines.push('  font-weight: var(--qt-header-weight);');
  lines.push('}');
  lines.push('');

  lines.push('.card-header, .card-body {');
  lines.push('  padding: var(--qt-pad);');
  lines.push('}');
  lines.push('');

  lines.push('a {');
  lines.push('  color: var(--vs-link);');
  lines.push('}');
  lines.push('a:hover {');
  lines.push('  color: var(--vs-link-hover);');
  lines.push('}');
  lines.push('');

  lines.push('.btn, button, .button, a.btn {');
  lines.push('  border-radius: var(--radius-pill);');
  lines.push('}');
  lines.push('');

  lines.push('.profile-avatar, img.profile-avatar, .oshi-card-avatar, .oshi-card-avatar img {');
  lines.push('  width: var(--qt-avatar-size) !important;');
  lines.push('  height: var(--qt-avatar-size) !important;');
  lines.push('  border-radius: var(--qt-avatar-radius) !important;');
  lines.push('  object-fit: cover;');
  lines.push('}');
  lines.push('');

  // A tiny accent highlight for common “pill” tags.
  lines.push('.badge, .pill, .tag {');
  lines.push(`  border-color: ${formatHex(borderLight)};`);
  lines.push(`}`);

  return lines.join('\n').trimEnd();
}

/**
 * Update CodeMirror selection to the start of the doc, so new inserts land at a predictable spot.
 */
function moveCssCursorToStart() {
  if (!els.customCss) return;
  try {
    // @ts-ignore
    const cssEd = state.editors?.css;
    if (cssEd?.view) {
      cssEd.view.dispatch({ selection: { anchor: 0, head: 0 }, scrollIntoView: true });
      cssEd.view.focus();
      return;
    }
  } catch {}

  els.customCss.focus();
  els.customCss.setSelectionRange(0, 0);
}

/** @type {import('../schema.js').ToolDef} */
const tool = {
  schemaVersion: TOOL_SCHEMA_VERSION,
  id: 'quick-theme',
  name: 'Quick Theme Builder',
  description: 'Generate a cohesive starter theme (presets + guided inputs; re-apply updates in place).',
  icon: 'fa-solid fa-wand-magic-sparkles',
  category: 'Theme',
  supportsInsert: true,
  supportsUpdate: true,
  shortcut: 'Alt+1',
  keywords: 'beginner starter theme builder guided preset palette radius padding spacing typography avatar',
  order: 11,

  /** @param {HTMLElement} panel */
  render(panel) {
    panel.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <label class="form-label small">Preset</label>
          <div class="input-group input-group-sm">
            <select id="qtPreset" class="form-select form-select-sm">
              <option value="cleanDark">${PRESETS.cleanDark.label}</option>
              <option value="neon">${PRESETS.neon.label}</option>
              <option value="softPastel">${PRESETS.softPastel.label}</option>
              <option value="glassMinimal">${PRESETS.glassMinimal.label}</option>
            </select>
            <button id="qtApplyPreset" class="btn btn-outline-light" type="button">Apply</button>
          </div>
          <div class="form-text">Applying a preset updates fields, inserts/updates the CSS snippet, and refreshes preview (if auto-update is on).</div>

          <div class="form-check form-switch small mt-2">
            <input class="form-check-input" type="checkbox" id="qtAutoApply" checked>
            <label class="form-check-label" for="qtAutoApply">Auto-apply changes</label>
          </div>

          <hr class="my-3" />

          <div class="fw-semibold small mb-1">Palette</div>
          <div class="d-flex flex-column gap-2">
            ${colorRow('Primary', 'qtPrimary', PRESETS.cleanDark.values.palette.primary)}
            ${colorRow('Secondary', 'qtSecondary', PRESETS.cleanDark.values.palette.secondary)}
            ${colorRow('Accent', 'qtAccent', PRESETS.cleanDark.values.palette.accent)}
            ${colorRow('Background', 'qtBg', PRESETS.cleanDark.values.palette.bg)}
            ${colorRow('Text', 'qtText', PRESETS.cleanDark.values.palette.text)}
          </div>

          <hr class="my-3" />

          <div class="row g-2">
            <div class="col-6">
              <label class="form-label small">Radius (px)</label>
              <input id="qtRadius" class="form-control form-control-sm" type="number" min="0" step="1" value="${PRESETS.cleanDark.values.radius}" />
            </div>
            <div class="col-6">
              <label class="form-label small">Padding (px)</label>
              <input id="qtPadding" class="form-control form-control-sm" type="number" min="0" step="1" value="${PRESETS.cleanDark.values.padding}" />
            </div>
            <div class="col-6">
              <label class="form-label small">Spacing (px)</label>
              <input id="qtSpacing" class="form-control form-control-sm" type="number" min="0" step="1" value="${PRESETS.cleanDark.values.spacing}" />
            </div>
            <div class="col-6">
              <label class="form-label small">Card Style</label>
              <select id="qtCardStyle" class="form-select form-select-sm">
                <option value="flat">Flat</option>
                <option value="glass">Glass</option>
              </select>
            </div>
          </div>

          <hr class="my-3" />

          <div class="fw-semibold small mb-1">Typography</div>
          <div class="row g-2">
            <div class="col-6">
              <label class="form-label small">Base size (px)</label>
              <input id="qtBaseSize" class="form-control form-control-sm" type="number" min="8" step="1" value="${PRESETS.cleanDark.values.baseSize}" />
            </div>
            <div class="col-6">
              <label class="form-label small">Header weight</label>
              <input id="qtHeaderWeight" class="form-control form-control-sm" type="number" min="100" max="900" step="100" value="${PRESETS.cleanDark.values.headerWeight}" />
            </div>
          </div>

          <hr class="my-3" />

          <div class="fw-semibold small mb-1">Avatar</div>
          <div class="row g-2">
            <div class="col-6">
              <label class="form-label small">Size (px)</label>
              <input id="qtAvatarSize" class="form-control form-control-sm" type="number" min="40" step="1" value="${PRESETS.cleanDark.values.avatarSize}" />
            </div>
            <div class="col-6">
              <label class="form-label small">Rounding (px)</label>
              <input id="qtAvatarRadius" class="form-control form-control-sm" type="number" min="0" step="1" value="${PRESETS.cleanDark.values.avatarRadius}" />
              <div class="form-text">Use a large number (e.g. 999) for a circle.</div>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-7">
          <label class="form-label small">Generated CSS</label>
          <textarea id="qtOut" class="form-control form-control-sm font-monospace" rows="22" readonly></textarea>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button id="qtInsert" class="btn btn-sm btn-outline-primary" type="button">Insert / Update CSS</button>
            <button id="qtCopy" class="btn btn-sm btn-outline-light" type="button">Copy</button>
          </div>

          <div class="small text-body-secondary mt-2">
            Tip: If you want to further customize, run <b>Theme Variables</b> or <b>Component Styler</b> after applying the starter.
          </div>
        </div>
      </div>
    `;

    const q = (sel) => /** @type {HTMLElement|null} */ (panel.querySelector(sel));

    const presetSel = /** @type {HTMLSelectElement|null} */ (q('#qtPreset'));
    const btnApplyPreset = /** @type {HTMLButtonElement|null} */ (q('#qtApplyPreset'));
    const autoApply = /** @type {HTMLInputElement|null} */ (q('#qtAutoApply'));
    const out = /** @type {HTMLTextAreaElement|null} */ (q('#qtOut'));
    const btnInsert = /** @type {HTMLButtonElement|null} */ (q('#qtInsert'));
    const btnCopy = /** @type {HTMLButtonElement|null} */ (q('#qtCopy'));

    if (!presetSel || !btnApplyPreset || !autoApply || !out || !btnInsert || !btnCopy) return;

    // wire color rows
    const colorIds = ['qtPrimary', 'qtSecondary', 'qtAccent', 'qtBg', 'qtText'];
    for (const id of colorIds) {
      const c = /** @type {HTMLInputElement|null} */ (q('#' + id));
      const t = /** @type {HTMLInputElement|null} */ (q('#' + id + 'Text'));
      if (!c || !t) continue;

      const syncTextToPicker = () => {
        const next = normalizeColor(t.value, c.value);
        c.value = next;
        t.value = next;
        schedule();
      };
      const syncPickerToText = () => {
        t.value = normalizeColor(c.value, t.value);
        schedule();
      };

      t.addEventListener('change', syncTextToPicker);
      t.addEventListener('input', () => {
        // update output live, but only normalize on change
        schedule(false);
      });
      c.addEventListener('input', syncPickerToText);
    }

    const numIds = ['qtRadius', 'qtPadding', 'qtSpacing', 'qtBaseSize', 'qtHeaderWeight', 'qtAvatarSize', 'qtAvatarRadius'];
    for (const id of numIds) {
      const el = /** @type {HTMLInputElement|null} */ (q('#' + id));
      if (!el) continue;
      el.addEventListener('input', () => schedule());
    }

    const cardStyle = /** @type {HTMLSelectElement|null} */ (q('#qtCardStyle'));
    if (cardStyle) cardStyle.addEventListener('change', () => schedule());

    /** @type {number|null} */
    let timer = null;

    /**
     * @param {boolean} normalizeFields
     */
    const schedule = (normalizeFields = true) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        updateOutput(normalizeFields);
        if (autoApply.checked) apply(false);
      }, 200);
    };

    /**
     * @returns {QuickThemeValues}
     */
    const readValues = () => {
      const getText = (id) => /** @type {HTMLInputElement|null} */ (q('#' + id + 'Text'))?.value || '';
      const getNum = (id) => Number(/** @type {HTMLInputElement|null} */ (q('#' + id))?.value || 0);

      const v = {
        palette: {
          primary: getText('qtPrimary'),
          secondary: getText('qtSecondary'),
          accent: getText('qtAccent'),
          bg: getText('qtBg'),
          text: getText('qtText'),
        },
        radius: getNum('qtRadius'),
        padding: getNum('qtPadding'),
        spacing: getNum('qtSpacing'),
        cardStyle: /** @type {CardStyle} */ ((cardStyle?.value || 'flat') === 'glass' ? 'glass' : 'flat'),
        baseSize: getNum('qtBaseSize'),
        headerWeight: getNum('qtHeaderWeight'),
        avatarSize: getNum('qtAvatarSize'),
        avatarRadius: getNum('qtAvatarRadius'),
      };
      return /** @type {QuickThemeValues} */ (v);
    };

    /**
     * Normalize palette fields to stable hex.
     */
    const normalizePaletteFields = () => {
      const pairs = [
        ['qtPrimary', '#369'],
        ['qtSecondary', '#47a'],
        ['qtAccent', '#f60'],
        ['qtBg', '#0b1220'],
        ['qtText', '#e5e7eb'],
      ];
      for (const [id, fallback] of pairs) {
        const c = /** @type {HTMLInputElement|null} */ (q('#' + id));
        const t = /** @type {HTMLInputElement|null} */ (q('#' + id + 'Text'));
        if (!c || !t) continue;
        const next = normalizeColor(t.value || c.value, fallback);
        c.value = next;
        t.value = next;
      }
    };

    /**
     * @param {boolean} normalizeFields
     */
    const updateOutput = (normalizeFields = true) => {
      if (normalizeFields) normalizePaletteFields();
      const body = buildCssBody(readValues());
      out.value = buildMarkedSnippet({ kind: 'css', blockId: BLOCK_ID, version: VERSION, body });
    };

    /**
     * @param {boolean} showStatus
     */
    const apply = (showStatus = true) => {
      if (!els.customCss) {
        if (showStatus) setStatus('warn', 'Custom CSS editor not available.');
        return;
      }

      // Make initial insertion predictable (top of file).
      const hasBlock = /oshilab:begin\s+block=quick-theme\b/i.test(els.customCss.value || '');
      if (!hasBlock) moveCssCursorToStart();

      const body = buildCssBody(readValues());
      const res = upsertMarkedSnippet(els.customCss, 'css', BLOCK_ID, body, VERSION);

      if (showStatus) {
        setStatus('ok', `${res.action === 'updated' ? 'Updated' : 'Inserted'} Quick Theme CSS.`);
      }
      if (els.autoUpdate?.checked) renderPreview();
    };

    const applyPreset = () => {
      const key = presetSel.value;
      const p = PRESETS[key]?.values || PRESETS.cleanDark.values;

      // Palette
      const setColor = (id, value) => {
        const c = /** @type {HTMLInputElement|null} */ (q('#' + id));
        const t = /** @type {HTMLInputElement|null} */ (q('#' + id + 'Text'));
        if (!c || !t) return;
        const next = normalizeColor(value, value);
        c.value = next;
        t.value = next;
      };
      setColor('qtPrimary', p.palette.primary);
      setColor('qtSecondary', p.palette.secondary);
      setColor('qtAccent', p.palette.accent);
      setColor('qtBg', p.palette.bg);
      setColor('qtText', p.palette.text);

      // Numbers
      const setNum = (id, n) => {
        const el = /** @type {HTMLInputElement|null} */ (q('#' + id));
        if (el) el.value = String(n);
      };
      setNum('qtRadius', p.radius);
      setNum('qtPadding', p.padding);
      setNum('qtSpacing', p.spacing);
      setNum('qtBaseSize', p.baseSize);
      setNum('qtHeaderWeight', p.headerWeight);
      setNum('qtAvatarSize', p.avatarSize);
      setNum('qtAvatarRadius', p.avatarRadius);

      if (cardStyle) cardStyle.value = p.cardStyle;

      updateOutput(true);
      if (autoApply.checked) apply(true);
    };

    btnApplyPreset.addEventListener('click', applyPreset);
    presetSel.addEventListener('change', applyPreset);

    btnInsert.addEventListener('click', () => apply(true));
    btnCopy.addEventListener('click', async () => {
      const body = buildCssBody(readValues());
      const snippet = buildMarkedSnippet({ kind: 'css', blockId: BLOCK_ID, version: VERSION, body });
      await copyToClipboard(snippet);
      setStatus('ok', 'Copied Quick Theme CSS snippet.');
    });

    // Initial
    updateOutput(true);
  },
};

export default tool;

/**
 * Build a label + picker + text input row.
 * @param {string} label
 * @param {string} id
 * @param {string} value
 */
function colorRow(label, id, value) {
  const v = normalizeColor(value, value);
  return `
    <label class="small">
      <span class="text-muted">${label}</span>
      <div class="input-group input-group-sm">
        <input id="${id}" type="color" class="form-control form-control-color" value="${v}" title="${label}" />
        <input id="${id}Text" class="form-control form-control-sm font-monospace" value="${v}" placeholder="#RRGGBB" />
      </div>
    </label>
  `.trim();
}
