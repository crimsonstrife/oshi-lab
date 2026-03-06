// @ts-check

import { els } from '../../dom.js';
import { state } from '../../state.js';
import { setStatus } from '../../status.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { renderPreview } from '../../preview/render.js';
import { buildMarkedSnippet, upsertMarkedSnippet } from '../../utils/snippets.js';
import { parseColor, formatHex } from '../color.js';
import { TOOL_SCHEMA_VERSION } from '../schema.js';

/**
 * Theme Variables Builder
 *
 * Generates scoped CSS variable overrides for the base MyOshi template.
 * Defaults and presets are derived from the provided base.css template.
 */

/**
 * A collection of predefined color themes for various UI design elements.
 * Each theme represents a coherent set of color presets optimized for specific
 * visual and functional contexts such as "base", "dark", "pink", and "blue".
 *
 * @namespace PRESETS
 * @property {Object} base
 *     Contains the core set of colors for light-themed applications, including
 *     primary brand elements, background surfaces, text, borders, links, status
 *     indicators, decorative elements, and buttons.
 *
 * @property {Object} dark
 *     Provides a dark-themed variant of the base color palette, ideal for
 *     applications that require a nighttime-friendly or visually subdued design.
 *     Includes adjustments for background tones, text contrast, and bright colors.
 *
 * @property {Object} pink
 *     A playful and vibrant pink color theme. It highlights a soft, pastel-based
 *     palette suitable for designs where pink tones are central.
 *
 * @property {Object} blue
 *     Focused on clean and refreshing blue tones, this theme provides a set of
 *     colors for designs requiring a cool and calm appearance while maintaining
 *     light and vibrant accents.
 */
const PRESETS = {
    base: {
        // core
        'vs-blue-dark': '#036',
        'vs-blue': '#369',
        'vs-blue-light': '#47a',
        'vs-orange': '#f60',
        'vs-orange-light': '#f93',
        'vs-bg-light': '#e8e8e8',
        'vs-bg-white': '#fff',
        'vs-text-dark': '#333',
        'vs-text-medium': '#666',
        'vs-text-light': '#707070',
        'vs-border': '#ccc',
        // extended surfaces
        'vs-border-light': '#ddd',
        'vs-border-lighter': '#eee',
        'vs-bg-muted': '#f5f5f5',
        'vs-bg-subtle': '#f9f9f9',
        'vs-bg-dim': '#e0e0e0',
        'vs-input-bg': '#fff',
        // links
        'vs-link': '#369',
        'vs-link-hover': '#036',
        'vs-link-bg': '#369',
        'vs-footer-link': '#9ce',
        // status
        'vs-success': '#2d7d2d',
        'vs-success-bg': '#f0fdf4',
        'vs-success-text': '#155724',
        'vs-error': '#c33',
        'vs-error-bg': '#fef2f2',
        'vs-warning': '#a86200',
        'vs-warning-bg': '#fffbeb',
        // info/highlight
        'vs-info-bg': '#e8f4fc',
        'vs-info-accent': '#bbdefb',
        'vs-highlight-bg': '#fffef5',
        'vs-highlight-strong': '#ffc',
        'vs-highlight-border': '#cc9',
        // decorative
        'soft-pink': '#fff0f3',
        'soft-pink-mid': '#ffe0e8',
        'soft-pink-border': '#f0c0cc',
        'soft-pink-text': '#8b5c5c',
        'soft-gold': '#fff8e8',
        'soft-gold-border': '#e8d8a0',
        'glow-pink': '#f6a',
        'glow-cyan': '#6df',
        'glow-purple': '#a8f',
        // danger button
        'vs-btn-danger-bg': '#b82020',
        'vs-btn-danger-hover': '#991a1a',
    },
    dark: {
        'vs-blue-dark': '#1a1a2e',
        'vs-blue': '#16213e',
        'vs-blue-light': '#0f3460',
        'vs-orange': '#e94560',
        'vs-orange-light': '#f87171',
        'vs-bg-light': '#0f0f1a',
        'vs-bg-white': '#1a1a2e',
        'vs-text-dark': '#e8e8e8',
        'vs-text-medium': '#b0b0b0',
        'vs-text-light': '#8a8a8a',
        'vs-border': '#2a2a4a',
        'vs-success': '#4ade80',
        'vs-success-bg': '#052e16',
        'vs-error': '#f87171',
        'vs-error-bg': '#450a0a',
        'vs-warning': '#fbbf24',
        'vs-warning-bg': '#451a03',
        'soft-pink': '#2a1a2e',
        'soft-pink-mid': '#3a2a3e',
        'soft-pink-border': '#4a3a4e',
        'soft-pink-text': '#d8a8b8',
        'soft-gold': '#2a2a1a',
        'soft-gold-border': '#4a4a2a',
        'glow-pink': '#f6a',
        'glow-cyan': '#00d4ff',
        'glow-purple': '#b9f',
        'vs-border-light': '#2a2a4a',
        'vs-border-lighter': '#1f1f3a',
        'vs-bg-muted': '#1f1f35',
        'vs-bg-subtle': '#1a1a30',
        'vs-bg-dim': '#2a2a4a',
        'vs-info-bg': '#0f2a3e',
        'vs-info-accent': '#0f3460',
        'vs-highlight-bg': '#2a2a1a',
        'vs-highlight-strong': '#3a3a1a',
        'vs-highlight-border': '#4a4a2a',
        'vs-success-text': '#4ade80',
        'vs-input-bg': '#0f0f1a',
        'vs-link': '#6bf',
        'vs-link-hover': '#9df',
        'vs-link-bg': '#27b',
        'vs-btn-danger-bg': '#dc3545',
        'vs-btn-danger-hover': '#c82333',
        'vs-footer-link': '#6df',
    },
    pink: {
        'vs-blue-dark': '#825',
        'vs-blue': '#a36',
        'vs-blue-light': '#b47',
        'vs-orange': '#f69',
        'vs-orange-light': '#f9b',
        'vs-bg-light': '#fff0f5',
        'vs-bg-white': '#fff',
        'vs-text-dark': '#636',
        'vs-text-medium': '#8f5f8f',
        'vs-text-light': '#856586',
        'vs-border': '#fcd',
        'vs-success': '#2d7d4d',
        'vs-success-bg': '#f0fff5',
        'vs-error': '#c34',
        'vs-error-bg': '#fff0f0',
        'vs-warning': '#a86200',
        'vs-warning-bg': '#fffaf0',
        'soft-pink': '#fff0f5',
        'soft-pink-mid': '#ffe0eb',
        'soft-pink-border': '#ffb0cc',
        'soft-pink-text': '#946',
        'soft-gold': '#fff8f0',
        'soft-gold-border': '#fdc',
        'glow-pink': '#f6a',
        'glow-cyan': '#6de',
        'glow-purple': '#c8f',
        'vs-border-light': '#ffe0eb',
        'vs-border-lighter': '#fff0f5',
        'vs-bg-muted': '#fff5f8',
        'vs-bg-subtle': '#fff8fa',
        'vs-bg-dim': '#ffe0eb',
        'vs-info-bg': '#fff0f5',
        'vs-info-accent': '#ffe0eb',
        'vs-highlight-bg': '#fff8f0',
        'vs-highlight-strong': '#fff0e8',
        'vs-highlight-border': '#fdc',
        'vs-success-text': '#1a7a4a',
        'vs-input-bg': '#fff',
        'vs-link': '#c37',
        'vs-link-hover': '#a26',
        'vs-link-bg': '#c37',
        'vs-btn-danger-bg': '#c24',
        'vs-btn-danger-hover': '#a13',
        'vs-footer-link': '#fde',
    },
    blue: {
        'vs-blue-dark': '#036',
        'vs-blue': '#06a',
        'vs-blue-light': '#07a',
        'vs-orange': '#0ac',
        'vs-orange-light': '#3cd',
        'vs-bg-light': '#e8f4f8',
        'vs-bg-white': '#fff',
        'vs-text-dark': '#035',
        'vs-text-medium': '#368',
        'vs-text-light': '#507080',
        'vs-border': '#b0d4e8',
        'vs-success': '#2d7d4d',
        'vs-success-bg': '#f0fff8',
        'vs-error': '#c44',
        'vs-error-bg': '#fff0f0',
        'vs-warning': '#962',
        'vs-warning-bg': '#fffaf0',
        'soft-pink': '#e8f0f8',
        'soft-pink-mid': '#d8e8f0',
        'soft-pink-border': '#a0c8e0',
        'soft-pink-text': '#368',
        'soft-gold': '#f8f8e8',
        'soft-gold-border': '#d8d8a8',
        'glow-pink': '#f8a',
        'glow-cyan': '#0df',
        'glow-purple': '#88f',
        'vs-border-light': '#c0d8e8',
        'vs-border-lighter': '#d8e8f0',
        'vs-bg-muted': '#eef4f8',
        'vs-bg-subtle': '#f4f8fa',
        'vs-bg-dim': '#c0d8e8',
        'vs-info-bg': '#e0f0f8',
        'vs-info-accent': '#b0d4e8',
        'vs-highlight-bg': '#f8f8e8',
        'vs-highlight-strong': '#f0f0d0',
        'vs-highlight-border': '#d8d8a8',
        'vs-success-text': '#064',
        'vs-input-bg': '#fff',
        'vs-link': '#059',
        'vs-link-hover': '#036',
        'vs-link-bg': '#059',
        'vs-btn-danger-bg': '#b82020',
        'vs-btn-danger-hover': '#991a1a',
        'vs-footer-link': '#9de',
    },
};

/**
 * Contains grouped configuration for color variables used in styling.
 * Each group is represented as an object containing an `id` to identify the group,
 * a `title` that describes the purpose of the group, and a `vars` array that
 * lists the individual color variables with their respective descriptions.
 *
 * The variable groups include:
 * - Core palette: For primary and accent colors.
 * - Surfaces & borders: For background and border colors.
 * - Text & links: For text and link-related colors.
 * - Status & highlights: For success, error, warning, and information-related colors.
 * - Decorative surfaces: For decorative customization such as buttons and themed colors.
 *
 * Each color is defined as a sub-array in the form `[variableName, description]`.
 *
 * Structure:
 * - `id` {string}: Unique identifier for the group.
 * - `title` {string}: Descriptive title for the group.
 * - `vars` {Array<Array<string>>}: Array containing variable names (string)
 *   and their human-readable descriptions (string).
 */
const VAR_GROUPS = [
    {
        id: 'core',
        title: 'Core palette',
        vars: [
            ['vs-blue', 'Primary (links / header)'],
            ['vs-blue-dark', 'Primary dark'],
            ['vs-blue-light', 'Primary light'],
            ['vs-orange', 'Accent'],
            ['vs-orange-light', 'Accent light'],
            ['glow-cyan', 'Glow cyan'],
            ['glow-pink', 'Glow pink'],
            ['glow-purple', 'Glow purple'],
        ],
    },
    {
        id: 'surfaces',
        title: 'Surfaces & borders',
        vars: [
            ['vs-bg-light', 'Page background'],
            ['vs-bg-white', 'Card background'],
            ['vs-bg-muted', 'Muted background'],
            ['vs-bg-subtle', 'Subtle background'],
            ['vs-bg-dim', 'Dim background'],
            ['vs-input-bg', 'Input background'],
            ['vs-border', 'Border'],
            ['vs-border-light', 'Border (light)'],
            ['vs-border-lighter', 'Border (lighter)'],
        ],
    },
    {
        id: 'text',
        title: 'Text & links',
        vars: [
            ['vs-text-dark', 'Text (strong)'],
            ['vs-text-medium', 'Text (medium)'],
            ['vs-text-light', 'Text (light)'],
            ['vs-link', 'Link'],
            ['vs-link-hover', 'Link hover'],
            ['vs-link-bg', 'Link background'],
            ['vs-footer-link', 'Footer link'],
        ],
    },
    {
        id: 'status',
        title: 'Status & highlights',
        vars: [
            ['vs-success', 'Success'],
            ['vs-success-bg', 'Success bg'],
            ['vs-success-text', 'Success text'],
            ['vs-error', 'Error'],
            ['vs-error-bg', 'Error bg'],
            ['vs-warning', 'Warning'],
            ['vs-warning-bg', 'Warning bg'],
            ['vs-info-bg', 'Info bg'],
            ['vs-info-accent', 'Info accent'],
            ['vs-highlight-bg', 'Highlight bg'],
            ['vs-highlight-strong', 'Highlight strong'],
            ['vs-highlight-border', 'Highlight border'],
        ],
    },
    {
        id: 'decor',
        title: 'Decorative surfaces',
        vars: [
            ['soft-pink', 'Soft pink'],
            ['soft-pink-mid', 'Soft pink mid'],
            ['soft-pink-border', 'Soft pink border'],
            ['soft-pink-text', 'Soft pink text'],
            ['soft-gold', 'Soft gold'],
            ['soft-gold-border', 'Soft gold border'],
            ['vs-btn-danger-bg', 'Danger button bg'],
            ['vs-btn-danger-hover', 'Danger button hover'],
        ],
    },
];

/**
 * Normalizes a given input to a standard 6-digit hexadecimal color format.
 *
 * @param {string} input - The input color value to normalize. Can be a string or value that can be parsed into a color.
 * @return {string|null} Returns the normalized 6-digit hexadecimal color string in lowercase, or null if the input cannot be parsed into a valid color.
 */
function normalizeHex(input) {
    const parsed = parseColor(String(input || '').trim());
    if (!parsed) return null;
    // prefer 6-digit hex for stable diffs
    return formatHex({ ...parsed, a: 1 }).slice(0, 7).toLowerCase();
}

/**
 * Blends two hexadecimal colors based on a given weight.
 *
 * The method interpolates between two hexadecimal color codes using a linear blend,
 * based on a weighting factor `t`. The resulting color will be a mix of the two colors.
 *
 * @param {string} a - The first color in hexadecimal format (e.g., "#ff0000").
 * @param {string} b - The second color in hexadecimal format (e.g., "#0000ff").
 * @param {number} t - The interpolation weight, where 0 results in the first color and 1
 *                     results in the second color. Values between 0 and 1 produce a blended color.
 * @return {string|null} The blended hexadecimal color code. Returns null if invalid colors are provided.
 */
function mixHex(a, b, t) {
    const ca = parseColor(a);
    const cb = parseColor(b);
    if (!ca || !cb) return null;
    const clamp01 = (/** @type {number} */ n) => Math.max(0, Math.min(1, n));
    const tt = clamp01(t);
    const r = ca.r + (cb.r - ca.r) * tt;
    const g = ca.g + (cb.g - ca.g) * tt;
    const b2 = ca.b + (cb.b - ca.b) * tt;
    return formatHex({ r, g, b: b2, a: 1 }).slice(0, 7);
}

/**
 * Lightens a given hexadecimal color by mixing it with white.
 *
 * @param {string} hex - The original hexadecimal color code to be lightened.
 * @param {number} amt - The amount by which to lighten the color, typically a value between 0 and 1.
 * @return {string} The lightened hexadecimal color code.
 */
function lighten(hex, amt) {
    // @ts-ignore
    return mixHex(hex, '#ffffff', amt);
}

/**
 * Adjusts the brightness of a hex color by darkening it.
 *
 * @param {string} hex - The base hex color to be darkened.
 * @param {number} amt - The amount to darken the color. Should be a number between 0 and 1.
 * @return {string} The resulting hex color after darkening.
 */
function darken(hex, amt) {
    // @ts-ignore
    return mixHex(hex, '#000000', amt);
}

/**
 * Convert HSL to hex. h in [0,360), s/l in [0,100].
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {string}
 */
function hslToHex(h, s, l) {
    const hh = ((h % 360) + 360) % 360;
    const ss = Math.max(0, Math.min(100, s)) / 100;
    const ll = Math.max(0, Math.min(100, l)) / 100;

    const c = (1 - Math.abs(2 * ll - 1)) * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = ll - c / 2;

    let r = 0, g = 0, b = 0;
    if (hh < 60) { r = c; g = x; b = 0; }
    else if (hh < 120) { r = x; g = c; b = 0; }
    else if (hh < 180) { r = 0; g = c; b = x; }
    else if (hh < 240) { r = 0; g = x; b = c; }
    else if (hh < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const to255 = (n) => Math.max(0, Math.min(255, Math.round((n + m) * 255)));
    const rr = to255(r);
    const gg = to255(g);
    const bb = to255(b);

    return formatHex({ r: rr, g: gg, b: bb, a: 1 }).slice(0, 7).toLowerCase();
}

const _randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

/**
 * Generate a cohesive palette using a base hue and an accent offset.
 * @param {'light'|'dark'} mode
 * @returns {{baseHue:number, primary:string, accent:string, bg:string, card:string, text:string}}
 */
function generateCohesivePalette(mode) {
    const baseHue = _randInt(0, 359);
    const accentOffset = _randInt(150, 210);
    const primaryHue = baseHue;
    const accentHue = (primaryHue + accentOffset) % 360;

    if (mode === 'dark') {
        const primary = hslToHex(primaryHue, _randInt(60, 85), _randInt(56, 70));
        const accent = hslToHex(accentHue, _randInt(65, 90), _randInt(56, 72));
        const bg = hslToHex(primaryHue, _randInt(14, 26), _randInt(7, 12));
        const card = hslToHex(primaryHue, _randInt(12, 24), _randInt(12, 16));
        const text = hslToHex(primaryHue, _randInt(6, 14), _randInt(90, 96));
        return { baseHue, primary, accent, bg, card, text };
    }

    const primary = hslToHex(primaryHue, _randInt(55, 80), _randInt(40, 56));
    const accent = hslToHex(accentHue, _randInt(60, 88), _randInt(45, 62));
    const bg = hslToHex(primaryHue, _randInt(8, 18), _randInt(94, 98));
    const card = hslToHex(primaryHue, _randInt(6, 14), _randInt(98, 100));
    const text = hslToHex(primaryHue, _randInt(10, 22), _randInt(12, 18));
    return { baseHue, primary, accent, bg, card, text };
}

/**
 * Upsert the Theme Variables block into Custom CSS by replacing the first existing block,
 * or appending a new one if not found.
 * @param {string} css
 * @param {string} block
 * @returns {string}
 */
function upsertThemeVarsBlock(css, block) {
    const startToken = '/* === Theme Variables';
    const endToken = '/* === /Theme Variables === */';
    const start = css.indexOf(startToken);
    if (start !== -1) {
        const end = css.indexOf(endToken, start);
        if (end !== -1) {
            const endIdx = end + endToken.length;
            let after = endIdx;
            while (after < css.length && (css[after] === '\n' || css[after] === '\r')) after += 1;
            const before = css.slice(0, start);
            const tail = css.slice(after);
            const mid = block.trimEnd() + '\n';
            return before + mid + tail;
        }
    }

    const prefix = css && css.trim().length ? css.trimEnd() + '\n\n' : '';
    return prefix + block.trimEnd() + '\n';
}
/** @type {import('../schema.js').ToolDef} */
const tool = {
    schemaVersion: TOOL_SCHEMA_VERSION,
    id: 'theme-vars',
    name: 'Theme Variables',
    description: 'Generate scoped CSS variable overrides for the base template (updates in place).',
    icon: 'fa-solid fa-sliders',
    category: 'Theme',
    supportsInsert: true,
    supportsUpdate: true,
    shortcut: 'Alt+2',
    keywords: 'css variables custom properties palette colors theme base template',
    order: 15,

    /** @param {HTMLElement} panel */
    render(panel) {
        panel.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <label class="form-label small">Scope selector</label>
          <input id="tvScope" class="form-control form-control-sm font-monospace" value=".profile-page.profile-custom-css" />
          <div class="form-text">Matches the template root: <code>&lt;div class=\"profile-page profile-custom-css\"&gt;</code></div>

          <label class="form-label small mt-2">Wrapper (optional)</label>
          <input id="tvWrapper" class="form-control form-control-sm font-monospace" placeholder=".theme-dark" />
          <div class="form-text">Example: <code>.theme-dark</code> makes <code>.theme-dark { … }</code></div>

          <label class="form-label small mt-3">Preset</label>
          <select id="tvPreset" class="form-select form-select-sm">
            <option value="base">Base (Light)</option>
            <option value="dark">Dark</option>
            <option value="pink">Pink</option>
            <option value="blue">Blue</option>
          </select>

          <div class="form-check mt-2">
            <input class="form-check-input" type="checkbox" id="tvAllVars" />
            <label class="form-check-label small" for="tvAllVars">Output all variables (not just changes)</label>
          </div>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button id="tvReset" class="btn btn-sm btn-outline-light" type="button">Reset to preset</button>
            <button id="tvShuffle" class="btn btn-sm btn-outline-info" type="button" title="Generate a cohesive palette and apply it">Shuffle palette</button>
            <button id="tvDerive" class="btn btn-sm btn-outline-secondary" type="button">Auto-derive</button>
            <button id="tvLoad" class="btn btn-sm btn-outline-warning" type="button">Load from Custom CSS</button>
          </div>
          <div class="form-text">Shuffle updates the palette inputs and (by default) upserts the Theme Variables block into Custom CSS for instant preview.</div>

          <hr class="my-3" />

          <div class="accordion" id="tvAcc"></div>
        </div>

        <div class="col-12 col-lg-7">
          <label class="form-label small">Generated CSS</label>
          <textarea id="tvOut" class="form-control form-control-sm font-monospace" rows="18" readonly></textarea>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button id="tvInsert" class="btn btn-sm btn-outline-primary" type="button">Insert into Custom CSS</button>
            <button id="tvCopy" class="btn btn-sm btn-outline-secondary" type="button">Copy</button>
          </div>
          <div class="form-text">Tip: With Auto Update enabled, insertion re-renders the preview immediately.</div>
        </div>
      </div>
    `;

        const elScope = /** @type {HTMLInputElement|null} */ (panel.querySelector('#tvScope'));
        const elWrapper = /** @type {HTMLInputElement|null} */ (panel.querySelector('#tvWrapper'));
        const elPreset = /** @type {HTMLSelectElement|null} */ (panel.querySelector('#tvPreset'));
        const elAllVars = /** @type {HTMLInputElement|null} */ (panel.querySelector('#tvAllVars'));
        const elAcc = /** @type {HTMLElement|null} */ (panel.querySelector('#tvAcc'));
        const elOut = /** @type {HTMLTextAreaElement|null} */ (panel.querySelector('#tvOut'));
        const btnReset = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#tvReset'));
        const btnShuffle = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#tvShuffle'));
        const btnDerive = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#tvDerive'));
        const btnLoad = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#tvLoad'));
        const btnInsert = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#tvInsert'));
        const btnCopy = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#tvCopy'));
        if (!elScope || !elWrapper || !elPreset || !elAllVars || !elAcc || !elOut || !btnReset || !btnShuffle || !btnDerive || !btnLoad || !btnInsert || !btnCopy) return;

        /** @type {Record<string,string>} */
        let values = {};

        // @ts-ignore
        const getBaseline = () => PRESETS[elPreset.value] || PRESETS.base;

        const setFromPreset = () => {
            values = { ...getBaseline() };
            renderInputs();
            updateOutput();
        };

        const renderInputs = () => {
            elAcc.innerHTML = '';

            const mkRow = (/** @type {string} */ varName, /** @type {string | null} */ label) => {
                const val = values[varName] ?? '';
                const norm = normalizeHex(val);
                const colorVal = norm || '#000000';

                const row = document.createElement('div');
                row.className = 'd-flex align-items-center gap-2 mb-2';

                const meta = document.createElement('div');
                meta.className = 'flex-grow-1';

                const lab = document.createElement('div');
                lab.className = 'small fw-semibold';
                lab.textContent = label;

                const code = document.createElement('div');
                code.className = 'small text-body-secondary font-monospace';
                code.textContent = `--${varName}`;

                meta.appendChild(lab);
                meta.appendChild(code);

                const c = document.createElement('input');
                c.type = 'color';
                c.className = 'form-control form-control-color';
                c.value = colorVal;
                c.title = `--${varName}`;

                const t = document.createElement('input');
                t.type = 'text';
                t.className = 'form-control form-control-sm font-monospace';
                t.value = norm || val;
                t.style.maxWidth = '130px';

                const onText = () => {
                    const next = t.value.trim();
                    values[varName] = next;
                    const n = normalizeHex(next);
                    if (n) c.value = n;
                    updateOutput();
                };

                const onColor = () => {
                    const next = c.value;
                    values[varName] = next;
                    t.value = next;
                    updateOutput();
                };

                t.addEventListener('input', onText);
                c.addEventListener('input', onColor);

                row.appendChild(meta);
                row.appendChild(c);
                row.appendChild(t);
                return row;
            };

            for (const g of VAR_GROUPS) {
                const item = document.createElement('div');
                item.className = 'accordion-item';

                const hId = `tvAcc-${g.id}-h`;
                const cId = `tvAcc-${g.id}-c`;

                item.innerHTML = `
          <h2 class="accordion-header" id="${hId}">
            <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#${cId}" aria-expanded="false" aria-controls="${cId}">
              <span class="small fw-semibold">${g.title}</span>
            </button>
          </h2>
          <div id="${cId}" class="accordion-collapse collapse" aria-labelledby="${hId}" data-bs-parent="#tvAcc">
            <div class="accordion-body py-2"></div>
          </div>
        `;

                const body = /** @type {HTMLElement} */ (item.querySelector('.accordion-body'));
                for (const [varName, label] of g.vars) body.appendChild(mkRow(varName, label));

                elAcc.appendChild(item);
            }
        };

        const updateOutput = () => {
            const baseline = getBaseline();
            const scope = elScope.value.trim() || '.profile-page.profile-custom-css';
            const wrapper = elWrapper.value.trim();
            const selector = wrapper ? `${wrapper} ${scope}` : scope;

            /** @type {Array<[string,string]>} */
            const entries = [];

            for (const g of VAR_GROUPS) {
                for (const [name] of g.vars) {
                    const cur = (values[name] ?? '').trim();
                    if (!cur) continue;

                    if (!elAllVars.checked) {
                        const base = (baseline[name] ?? '').trim();
                        const nCur = normalizeHex(cur);
                        const nBase = normalizeHex(base);
                        const same = nCur && nBase ? nCur === nBase : cur === base;
                        if (same) continue;
                    }

                    // normalize display for valid hex
                    const n = normalizeHex(cur);
                    entries.push([name, n || cur]);
                }
            }

            if (!entries.length) {
                elOut.value = `/* Theme Variables */\n/* No changes yet — tweak values on the left, or enable “Output all variables”. */\n`;
                return;
            }

            const lines = entries.map(([k, v]) => `  --${k}: ${v};`);
            elOut.value = `/* === Theme Variables (${elPreset.options[elPreset.selectedIndex]?.textContent || elPreset.value}) === */\n${selector} {\n${lines.join('\n')}\n}\n/* === /Theme Variables === */\n`;
        };

        const derive = () => {
            // Derive a few sane defaults from primary/accent for fast theming.
            const primary = normalizeHex(values['vs-blue'] || '') || normalizeHex(getBaseline()['vs-blue'] || '') || '#336699';
            const accent = normalizeHex(values['vs-orange'] || '') || normalizeHex(getBaseline()['vs-orange'] || '') || '#ff6600';

            const pDark = darken(primary, 0.28) || values['vs-blue-dark'];
            const pLight = lighten(primary, 0.18) || values['vs-blue-light'];
            const aLight = lighten(accent, 0.20) || values['vs-orange-light'];

            if (pDark) values['vs-blue-dark'] = pDark;
            if (pLight) values['vs-blue-light'] = pLight;
            if (aLight) values['vs-orange-light'] = aLight;

            // Link defaults
            values['vs-link'] = primary;
            values['vs-link-bg'] = primary;
            if (pDark) values['vs-link-hover'] = pDark;

            // Border defaults: mix primary into card bg
            const card = normalizeHex(values['vs-bg-white'] || '') || normalizeHex(getBaseline()['vs-bg-white'] || '') || '#ffffff';
            const b = mixHex(card, primary, 0.22);
            const bLight = mixHex(card, primary, 0.12);
            const bLighter = mixHex(card, primary, 0.06);
            if (b) values['vs-border'] = b;
            if (bLight) values['vs-border-light'] = bLight;
            if (bLighter) values['vs-border-lighter'] = bLighter;

            renderInputs();
            updateOutput();
            setStatus('ok', 'Derived a few variables from Primary + Accent.');
        };

        const applyGeneratedToCustomCss = () => {
            if (!els.customCss) return false;
            const block = (elOut.value || '').trim();
            if (!block) return false;

            const current = els.customCss.value || '';
            const next = upsertThemeVarsBlock(current, block);

            // Prefer CodeMirror if present to keep UI in sync
            // @ts-ignore
            const cssEd = state.editors?.css;
            if (cssEd && typeof cssEd.setValue === 'function') cssEd.setValue(next);
            else {
                els.customCss.value = next;
                try { els.customCss.dispatchEvent(new Event('input')); } catch {}
            }
            return true;
        };

        const shufflePalette = () => {
            const mode = (String(elPreset.value) === 'dark') ? 'dark' : 'light';
            const p = generateCohesivePalette(mode);

            // Required minimum set: primary / secondary / accent / bg / text
            values['vs-blue'] = p.primary;                 // primary
            values['vs-orange'] = p.accent;               // accent
            values['vs-bg-light'] = p.bg;                 // background
            values['vs-bg-white'] = p.card;               // card background
            values['vs-text-dark'] = p.text;              // text (strong)

            // Derive related values (secondary + links + borders)
            const pLight = lighten(p.primary, mode === 'dark' ? 0.10 : 0.18) || values['vs-blue-light'];
            const pDark = darken(p.primary, mode === 'dark' ? 0.35 : 0.28) || values['vs-blue-dark'];
            const aLight = lighten(p.accent, 0.20) || values['vs-orange-light'];

            if (pLight) values['vs-blue-light'] = pLight; // secondary (primary light)
            if (pDark) values['vs-blue-dark'] = pDark;
            if (aLight) values['vs-orange-light'] = aLight;

            values['vs-link'] = p.primary;
            values['vs-link-bg'] = p.primary;
            if (pDark) values['vs-link-hover'] = pDark;

            // Text tones from bg/text (keeps contrast sane)
            const tMed = mixHex(p.text, p.bg, mode === 'dark' ? 0.55 : 0.60);
            const tLight = mixHex(p.text, p.bg, mode === 'dark' ? 0.70 : 0.78);
            if (tMed) values['vs-text-medium'] = tMed;
            if (tLight) values['vs-text-light'] = tLight;

            // Muted surfaces
            const muted = mixHex(p.card, p.bg, 0.55);
            const subtle = mixHex(p.card, p.bg, 0.75);
            const dim = mixHex(p.card, p.bg, 0.25);
            if (muted) values['vs-bg-muted'] = muted;
            if (subtle) values['vs-bg-subtle'] = subtle;
            if (dim) values['vs-bg-dim'] = dim;
            values['vs-input-bg'] = p.card;

            // Borders
            const b = mixHex(p.card, p.primary, 0.22);
            const bLight = mixHex(p.card, p.primary, 0.12);
            const bLighter = mixHex(p.card, p.primary, 0.06);
            if (b) values['vs-border'] = b;
            if (bLight) values['vs-border-light'] = bLight;
            if (bLighter) values['vs-border-lighter'] = bLighter;

            renderInputs();
            updateOutput();

            // Apply to Custom CSS so the preview reflects the change immediately.
            const applied = applyGeneratedToCustomCss();
            if (applied) renderPreview();

            const hint = mode === 'dark' ? 'dark palette' : 'light palette';
            setStatus('ok', `Shuffled ${hint} (h=${p.baseHue}°). ${applied ? 'Applied to Custom CSS.' : 'Generated output only.'}`);
        };



        // ---- Load variables back from Custom CSS (round-trip) ----
        /** @type {Set<string>} */
        const ALLOWED_VARS = new Set();
        for (const g of VAR_GROUPS) for (const [n] of g.vars) ALLOWED_VARS.add(n);

        /** @param {string} s */
        const _escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        /**
         * @param {string} css
         * @param {number} openIdx
         */
        const _findBrace = (css, openIdx) => {
            let i = openIdx + 1;
            let depth = 1;
            let inStr = null;
            let inComment = false;

            while (i < css.length) {
                const ch = css[i];
                const next = css[i + 1];

                if (inComment) {
                    if (ch === '*' && next === '/') {
                        inComment = false;
                        i += 2;
                        continue;
                    }
                    i += 1;
                    continue;
                }

                if (inStr) {
                    if (ch === '\\') {
                        i += 2;
                        continue;
                    }
                    if (ch === inStr) inStr = null;
                    i += 1;
                    continue;
                }

                if (ch === '/' && next === '*') {
                    inComment = true;
                    i += 2;
                    continue;
                }

                if (ch === '"' || ch === "'") {
                    inStr = ch;
                    i += 1;
                    continue;
                }

                if (ch === '{') depth += 1;
                else if (ch === '}') {
                    depth -= 1;
                    if (depth === 0) return i;
                }

                i += 1;
            }
            return -1;
        };

        /**
         * @param {string} header
         */
        const _atName = (header) => {
            const m = String(header || '').trimStart().match(/^@([a-zA-Z-]+)/);
            return (m?.[1] || '').toLowerCase();
        };

        /**
         * @param {string} css
         * @param {number} start
         */
        const _nextTop = (css, start) => {
            const n = css.length;
            let i = start;
            while (i < n && /\s/.test(css[i])) i += 1;
            if (i >= n) return null;

            // comment
            if (css[i] === '/' && css[i + 1] === '*') {
                const end = css.indexOf('*/', i + 2);
                const endIdx = end === -1 ? n : end + 2;
                return { kind: 'comment', startIdx: i, endIdx };
            }

            let inStr = null;
            let inComment = false;
            let paren = 0;

            let headerEnd = -1;
            let isBlock = false;

            for (let j = i; j < n; j++) {
                const ch = css[j];
                const next = css[j + 1];

                if (inComment) {
                    if (ch === '*' && next === '/') {
                        inComment = false;
                        j += 1;
                    }
                    continue;
                }

                if (inStr) {
                    if (ch === '\\') {
                        j += 1;
                        continue;
                    }
                    if (ch === inStr) inStr = null;
                    continue;
                }

                if (ch === '/' && next === '*') {
                    inComment = true;
                    j += 1;
                    continue;
                }

                if (ch === '"' || ch === "'") {
                    inStr = ch;
                    continue;
                }

                if (ch === '(') paren += 1;
                else if (ch === ')') paren = Math.max(0, paren - 1);

                if (paren === 0 && ch === '{') {
                    headerEnd = j;
                    isBlock = true;
                    break;
                }
                if (paren === 0 && ch === ';') {
                    headerEnd = j;
                    isBlock = false;
                    break;
                }
            }

            if (headerEnd === -1) return { kind: 'raw', startIdx: i, endIdx: n };

            const header = css.slice(i, headerEnd).trimEnd();
            if (!isBlock) return { kind: 'stmt', startIdx: i, endIdx: headerEnd + 1, header };

            const openIdx = headerEnd;
            const closeIdx = _findBrace(css, openIdx);
            if (closeIdx === -1) return { kind: 'raw', startIdx: i, endIdx: n };

            return {
                kind: header.trimStart().startsWith('@') ? 'at' : 'qualified',
                startIdx: i,
                header,
                openIdx,
                closeIdx,
                endIdx: closeIdx + 1,
            };
        };

        /**
         * @param {string} selectorText
         * @param {string} scope
         * @param {string} wrapper
         */
        const _selectorMatches = (selectorText, scope, wrapper) => {
            const s = String(selectorText || '');
            const scopeRx = new RegExp(`(^|[\\s>+~,(])${_escapeRe(scope)}(?=([\\s>+~),{]|$))`);
            const hasScope = scopeRx.test(s);
            if (!hasScope) return false;

            if (!wrapper) return true;

            const wrapperRx = new RegExp(`(^|[\\s>+~,(])${_escapeRe(wrapper)}(?=([\\s>+~),{]|$))`);
            return wrapperRx.test(s);
        };

        /**
         * Extract CSS variables from Custom CSS that are scoped to the current selector.
         *
         * @param {string} css
         * @param {string} scope
         * @param {string} wrapper
         */
        const _extractVarsFromCss = (css, scope, wrapper) => {
            /** @type {Record<string,string>} */
            const out = {};

            const RECURSE = new Set(['media', 'supports', 'container', 'layer', 'document', 'scope']);

            const walk = (/** @type {string} */ text) => {
                let i = 0;
                while (i < text.length) {
                    const part = _nextTop(text, i);
                    if (!part) break;

                    if (part.kind === 'comment') {
                        i = part.endIdx;
                        continue;
                    }

                    if (part.kind === 'raw' || part.kind === 'stmt') {
                        i = part.endIdx;
                        continue;
                    }

                    if (part.kind === 'qualified') {
                        if (_selectorMatches(part.header, scope, wrapper)) {
                            const body = text.slice(part.openIdx + 1, part.closeIdx);
                            const rx = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
                            let m;
                            while ((m = rx.exec(body))) {
                                const name = m[1];
                                const val = String(m[2] || '').trim();
                                if (!ALLOWED_VARS.has(name)) continue;
                                out[name] = val;
                            }
                        }
                        i = part.endIdx;
                        continue;
                    }

                    if (part.kind === 'at') {
                        const name = _atName(part.header);
                        const body = text.slice(part.openIdx + 1, part.closeIdx);
                        if (RECURSE.has(name)) walk(body);
                        i = part.endIdx;
                        continue;
                    }

                    i = part.endIdx;
                }
            };

            walk(css);
            return out;
        };

        btnLoad.addEventListener('click', () => {
            if (!els.customCss) {
                setStatus('warn', 'Custom CSS textarea unavailable.');
                return;
            }

            const scope = elScope.value.trim() || '.profile-page.profile-custom-css';
            const wrapper = elWrapper.value.trim();
            const cssText = String(els.customCss.value || '');

            const found = _extractVarsFromCss(cssText, scope, wrapper);
            const keys = Object.keys(found);

            if (!keys.length && wrapper) {
                // Fallback: if wrapper-specific match found nothing, try scope-only.
                const found2 = _extractVarsFromCss(cssText, scope, '');
                const keys2 = Object.keys(found2);
                if (!keys2.length) {
                    setStatus('warn', `No theme variables found for ${wrapper} ${scope}.`);
                    return;
                }
                values = { ...values, ...found2 };
                renderInputs();
                updateOutput();
                setStatus('ok', `Loaded ${keys2.length} variables from Custom CSS (scope-only fallback).`);
                return;
            }

            if (!keys.length) {
                setStatus('warn', `No theme variables found for ${scope}.`);
                return;
            }

            values = { ...values, ...found };
            renderInputs();
            updateOutput();
            setStatus('ok', `Loaded ${keys.length} variables from Custom CSS.`);
        });
elPreset.addEventListener('change', setFromPreset);
        elScope.addEventListener('input', updateOutput);
        elWrapper.addEventListener('input', updateOutput);
        elAllVars.addEventListener('change', updateOutput);

        btnReset.addEventListener('click', () => {
            setFromPreset();
            setStatus('ok', 'Reset to preset.');
        });
        btnShuffle.addEventListener('click', shufflePalette);
        btnDerive.addEventListener('click', derive);

        btnInsert.addEventListener('click', () => {
            const txt = elOut.value.trimEnd();
            if (!txt) return;
            const body = `/* Theme Variables */\n${txt}`;
            const res = upsertMarkedSnippet(els.customCss, 'css', 'theme-vars', body, 1);
            setStatus('ok', `${res.action === 'updated' ? 'Updated' : 'Inserted'} theme variables in Custom CSS.`);
            if (els.autoUpdate?.checked) renderPreview();
        });

        btnCopy.addEventListener('click', async () => {
            const txt = elOut.value.trimEnd();
            const body = `/* Theme Variables */\n${txt}`;
            const snippet = buildMarkedSnippet({ kind: 'css', blockId: 'theme-vars', version: 1, body });
            await copyToClipboard(snippet);
            setStatus('ok', 'Copied CSS snippet.');
        });

        // init
        setFromPreset();
    },
};

export default tool;
