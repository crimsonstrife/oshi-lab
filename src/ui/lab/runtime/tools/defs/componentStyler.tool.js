// @ts-check

import { els } from '../../dom.js';
import { setStatus } from '../../status.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { insertAtCursor } from '../../utils/textarea.js';
import { renderPreview } from '../../preview/render.js';
import { buildMarkedSnippet, upsertMarkedSnippet } from '../../utils/snippets.js';
import { TOOL_SCHEMA_VERSION } from '../schema.js';

/**
 * Component Styler
 *
 * Generates small, scoped CSS snippets to style common MyOshi components (cards, navbar, tabs, links).
 * This is intentionally “selector-light”: users pick intent via controls, the tool emits safe CSS.
 */

const RADIUS_PRESETS = [
    { id: 'sm', label: 'Small', value: 'var(--radius-sm, 2px)' },
    { id: 'md', label: 'Medium', value: 'var(--radius-md, 3px)' },
    { id: 'default', label: 'Default', value: 'var(--radius-default, 4px)' },
    { id: 'lg', label: 'Large', value: 'var(--radius-lg, 8px)' },
    { id: 'xl', label: 'XL', value: 'var(--radius-xl, 12px)' },
    { id: 'full', label: 'Full', value: 'var(--radius-full, 9999px)' },
];

const SHADOW_PRESETS = [
    { id: 'none', label: 'None', value: 'none' },
    { id: 'soft', label: 'Soft', value: '0 4px 14px rgba(0,0,0,.10)' },
    { id: 'medium', label: 'Medium', value: '0 6px 18px rgba(0,0,0,.18)' },
    { id: 'strong', label: 'Strong', value: '0 10px 28px rgba(0,0,0,.28)' },
];

/** @param {string} title @param {string} css */
function wrapSnippet(title, css) {
    const header = `/* === Component Style: ${title} === */\n`;
    const footer = `\n/* === /Component Style: ${title} === */\n`;
    return header + css.trimEnd() + footer + '\n';
}

/** @param {string} s */
function sanitizeCssValue(s) {
    // prevent accidental newlines that break formatting.
    return String(s ?? '').replace(/[\r\n]+/g, ' ').trim();
}

/** @type {import('../schema.js').ToolDef} */
const tool = {
    schemaVersion: TOOL_SCHEMA_VERSION,
    id: 'component-styler',
    name: 'Component Styler',
    description: 'Generate scoped CSS for common components without hand-writing selectors.',
    icon: 'fa-solid fa-paintbrush',
    category: 'Layout',
    supportsInsert: true,
    supportsUpdate: true,
    shortcut: 'Alt+5',
    keywords: 'component style cards navbar tabs links buttons',
    order: 16,

    /** @param {HTMLElement} panel */
    render(panel) {
        const radiusOpts = RADIUS_PRESETS.map((r) => `<option value="${r.id}">${r.label}</option>`).join('');
        const shadowOpts = SHADOW_PRESETS.map((s) => `<option value="${s.id}">${s.label}</option>`).join('');

        panel.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <label class="form-label small">Scope selector</label>
          <input id="csScope" class="form-control form-control-sm font-monospace" value=".profile-page.profile-custom-css" />

          <label class="form-label small mt-3">Component</label>
          <select id="csKind" class="form-select form-select-sm">
            <option value="cards">Cards</option>
            <option value="navbar">Navbar</option>
            <option value="tabs">Tabs</option>
            <option value="links">Links</option>
          </select>

          <div id="csFields" class="mt-3"></div>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button id="csBuild" class="btn btn-sm btn-primary" type="button">Generate</button>
            <button id="csReset" class="btn btn-sm btn-outline-secondary" type="button">Reset</button>
          </div>

          <div class="form-text">
            This tool prefers variables like <code>--vs-border</code> and <code>--radius-*</code> for theme compatibility.
          </div>
        </div>

        <div class="col-12 col-lg-7">
          <label class="form-label small">Output</label>
          <textarea id="csOut" class="form-control form-control-sm font-monospace" rows="18" readonly></textarea>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button id="csInsert" class="btn btn-sm btn-outline-primary" type="button">Insert into Custom CSS</button>
            <button id="csCopy" class="btn btn-sm btn-outline-secondary" type="button">Copy</button>
          </div>
        </div>
      </div>
    `;

        const elScope = /** @type {HTMLInputElement|null} */ (panel.querySelector('#csScope'));
        const elKind = /** @type {HTMLSelectElement|null} */ (panel.querySelector('#csKind'));
        const elFields = /** @type {HTMLElement|null} */ (panel.querySelector('#csFields'));
        const elOut = /** @type {HTMLTextAreaElement|null} */ (panel.querySelector('#csOut'));
        const btnBuild = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#csBuild'));
        const btnReset = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#csReset'));
        const btnInsert = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#csInsert'));
        const btnCopy = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#csCopy'));
        if (!elScope || !elKind || !elFields || !elOut || !btnBuild || !btnReset || !btnInsert || !btnCopy) return;

        const renderFields = () => {
            const kind = elKind.value;

            if (kind === 'cards') {
                elFields.innerHTML = `
          <div class="border rounded p-2">
            <div class="small fw-semibold mb-2">Cards</div>

            <label class="form-label small">Card background</label>
            <input id="csCardBg" class="form-control form-control-sm font-monospace" value="var(--vs-card, var(--vs-bg-white))" />

            <label class="form-label small mt-2">Border color</label>
            <input id="csCardBorder" class="form-control form-control-sm font-monospace" value="var(--vs-border)" />

            <div class="row g-2 mt-1">
              <div class="col-6">
                <label class="form-label small">Border width</label>
                <input id="csCardBorderW" class="form-control form-control-sm" type="number" min="0" step="1" value="1" />
              </div>
              <div class="col-6">
                <label class="form-label small">Radius</label>
                <select id="csCardRadius" class="form-select form-select-sm">${radiusOpts}</select>
              </div>
            </div>

            <label class="form-label small mt-2">Shadow</label>
            <select id="csCardShadow" class="form-select form-select-sm">${shadowOpts}</select>

            <div class="form-check mt-2">
              <input class="form-check-input" type="checkbox" id="csCardHover" checked />
              <label class="form-check-label small" for="csCardHover">Add hover state</label>
            </div>
          </div>
        `;
                // default radius to xl
                const r = /** @type {HTMLSelectElement|null} */ (elFields.querySelector('#csCardRadius'));
                if (r) r.value = 'xl';
                return;
            }

            if (kind === 'navbar') {
                elFields.innerHTML = `
          <div class="border rounded p-2">
            <div class="small fw-semibold mb-2">Navbar</div>

            <label class="form-label small">Navbar background</label>
            <input id="csNavBg" class="form-control form-control-sm font-monospace" value="var(--vs-navbar, var(--vs-blue-dark))" />

            <label class="form-label small mt-2">Link color</label>
            <input id="csNavLink" class="form-control form-control-sm font-monospace" value="var(--vs-text-on-dark, #fff)" />

            <label class="form-label small mt-2">Border color (optional)</label>
            <input id="csNavBorder" class="form-control form-control-sm font-monospace" value="var(--vs-border)" />

            <div class="form-check mt-2">
              <input class="form-check-input" type="checkbox" id="csNavBorderOn" />
              <label class="form-check-label small" for="csNavBorderOn">Add bottom border</label>
            </div>
          </div>
        `;
                return;
            }

            if (kind === 'tabs') {
                elFields.innerHTML = `
          <div class="border rounded p-2">
            <div class="small fw-semibold mb-2">Tabs</div>

            <label class="form-label small">Active tab background</label>
            <input id="csTabActiveBg" class="form-control form-control-sm font-monospace" value="var(--vs-blue)" />

            <label class="form-label small mt-2">Active tab text</label>
            <input id="csTabActiveText" class="form-control form-control-sm font-monospace" value="#fff" />

            <label class="form-label small mt-2">Tab border</label>
            <input id="csTabBorder" class="form-control form-control-sm font-monospace" value="var(--vs-border)" />

            <div class="row g-2 mt-1">
              <div class="col-6">
                <label class="form-label small">Radius</label>
                <select id="csTabRadius" class="form-select form-select-sm">${radiusOpts}</select>
              </div>
              <div class="col-6">
                <label class="form-label small">Underline on hover</label>
                <select id="csTabUnderline" class="form-select form-select-sm">
                  <option value="hover" selected>Hover</option>
                  <option value="always">Always</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </div>
        `;
                const r = /** @type {HTMLSelectElement|null} */ (elFields.querySelector('#csTabRadius'));
                if (r) r.value = 'lg';
                return;
            }

            // links
            elFields.innerHTML = `
        <div class="border rounded p-2">
          <div class="small fw-semibold mb-2">Links</div>

          <label class="form-label small">Link color</label>
          <input id="csLinkColor" class="form-control form-control-sm font-monospace" value="var(--vs-link, var(--vs-blue))" />

          <label class="form-label small mt-2">Hover color</label>
          <input id="csLinkHover" class="form-control form-control-sm font-monospace" value="var(--vs-link-hover, var(--vs-blue-dark))" />

          <label class="form-label small mt-2">Underline</label>
          <select id="csLinkUnderline" class="form-select form-select-sm">
            <option value="hover" selected>Hover</option>
            <option value="always">Always</option>
            <option value="never">Never</option>
          </select>

          <div class="form-check mt-2">
            <input class="form-check-input" type="checkbox" id="csLinkFocus" checked />
            <label class="form-check-label small" for="csLinkFocus">Add accessible focus ring</label>
          </div>
        </div>
      `;
        };

        const build = () => {
            const scope = elScope.value.trim() || '.profile-page.profile-custom-css';
            const kind = elKind.value;

            let css = '';

            if (kind === 'cards') {
                const bg = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csCardBg')).value);
                const border = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csCardBorder')).value);
                const bw = Number(/** @type {HTMLInputElement} */ (elFields.querySelector('#csCardBorderW')).value || 0);
                const radId = /** @type {HTMLSelectElement} */ (elFields.querySelector('#csCardRadius')).value;
                const shadowId = /** @type {HTMLSelectElement} */ (elFields.querySelector('#csCardShadow')).value;
                const hover = /** @type {HTMLInputElement} */ (elFields.querySelector('#csCardHover')).checked;

                const rad = (RADIUS_PRESETS.find((r) => r.id === radId)?.value) || RADIUS_PRESETS[3].value;
                const shadow = (SHADOW_PRESETS.find((s) => s.id === shadowId)?.value) || 'none';

                css += `${scope} .card {\n`;
                css += `  background: ${bg};\n`;
                css += `  border: ${bw}px solid ${border};\n`;
                css += `  border-radius: ${rad};\n`;
                css += `  box-shadow: ${shadow};\n`;
                css += `}\n`;

                css += `${scope} .card-header {\n  border-bottom: ${bw}px solid ${border};\n}\n`;

                if (hover) {
                    css += `${scope} .card:hover {\n  transform: translateY(-1px);\n}\n`;
                }

                elOut.value = wrapSnippet('Cards', css);
                return;
            }

            if (kind === 'navbar') {
                const bg = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csNavBg')).value);
                const link = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csNavLink')).value);
                const border = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csNavBorder')).value);
                const borderOn = /** @type {HTMLInputElement} */ (elFields.querySelector('#csNavBorderOn')).checked;

                css += `${scope} .navbar {\n  background: ${bg};\n`;
                if (borderOn) css += `  border-bottom: 1px solid ${border};\n`;
                css += `}\n`;
                css += `${scope} .navbar a,\n${scope} .navbar .navbar-brand {\n  color: ${link};\n}\n`;
                css += `${scope} .navbar a:hover {\n  opacity: .9;\n}\n`;

                elOut.value = wrapSnippet('Navbar', css);
                return;
            }

            if (kind === 'tabs') {
                const activeBg = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csTabActiveBg')).value);
                const activeText = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csTabActiveText')).value);
                const border = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csTabBorder')).value);
                const radId = /** @type {HTMLSelectElement} */ (elFields.querySelector('#csTabRadius')).value;
                const underline = /** @type {HTMLSelectElement} */ (elFields.querySelector('#csTabUnderline')).value;

                const rad = (RADIUS_PRESETS.find((r) => r.id === radId)?.value) || RADIUS_PRESETS[3].value;

                css += `${scope} .nav-tabs {\n  border-bottom: 1px solid ${border};\n}\n`;
                css += `${scope} .nav-tabs .nav-link {\n  border: 1px solid transparent;\n  border-top-left-radius: ${rad};\n  border-top-right-radius: ${rad};\n}\n`;
                css += `${scope} .nav-tabs .nav-link.active {\n  background: ${activeBg};\n  color: ${activeText};\n  border-color: ${border} ${border} transparent ${border};\n}\n`;

                if (underline === 'always') {
                    css += `${scope} .nav-tabs .nav-link { text-decoration: underline; }\n`;
                } else if (underline === 'hover') {
                    css += `${scope} .nav-tabs .nav-link:hover { text-decoration: underline; }\n`;
                } else {
                    css += `${scope} .nav-tabs .nav-link { text-decoration: none; }\n`;
                }

                elOut.value = wrapSnippet('Tabs', css);
                return;
            }

            // links
            const c = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csLinkColor')).value);
            const h = sanitizeCssValue(/** @type {HTMLInputElement} */ (elFields.querySelector('#csLinkHover')).value);
            const underline = /** @type {HTMLSelectElement} */ (elFields.querySelector('#csLinkUnderline')).value;
            const focus = /** @type {HTMLInputElement} */ (elFields.querySelector('#csLinkFocus')).checked;

            css += `${scope} a {\n  color: ${c};\n`;
            if (underline === 'always') css += `  text-decoration: underline;\n`;
            if (underline === 'never') css += `  text-decoration: none;\n`;
            if (underline === 'hover') css += `  text-decoration: none;\n`;
            css += `}\n`;
            css += `${scope} a:hover {\n  color: ${h};\n`;
            if (underline === 'hover') css += `  text-decoration: underline;\n`;
            css += `}\n`;

            if (focus) {
                css += `${scope} a:focus-visible {\n  outline: 2px solid color-mix(in srgb, ${c} 60%, transparent);\n  outline-offset: 2px;\n  border-radius: var(--radius-sm, 2px);\n}\n`;
            }

            elOut.value = wrapSnippet('Links', css);
        };

        const reset = () => {
            elScope.value = '.profile-page.profile-custom-css';
            elKind.value = 'cards';
            renderFields();
            build();
            setStatus('ok', 'Reset Component Styler.');
        };

        btnBuild.addEventListener('click', () => {
            build();
            setStatus('ok', 'Generated component CSS.');
        });

        btnReset.addEventListener('click', reset);

        btnCopy.addEventListener('click', async () => {
            const txt = elOut.value.trimEnd();
            if (!txt) {
                setStatus('warn', 'Nothing to copy. Click Generate first.');
                return;
            }
            const blockId = `component-styler/${elKind.value || 'component'}`;
            const body = `/* Component Styler: ${String(elKind.value || 'component')} */\n${txt}`;
            const snippet = buildMarkedSnippet({ kind: 'css', blockId, version: 1, body });
            await copyToClipboard(snippet + '\n');
            setStatus('ok', 'Copied component CSS.');
        });

        btnInsert.addEventListener('click', () => {
            const txt = elOut.value.trimEnd();
            if (!txt) {
                setStatus('warn', 'Nothing to insert. Click Generate first.');
                return;
            }
            if (!els.customCss) return;
            const blockId = `component-styler/${elKind.value || 'component'}`;
            const body = `/* Component Styler: ${String(elKind.value || 'component')} */\n${txt}`;
            const res = upsertMarkedSnippet(els.customCss, 'css', blockId, body, 1);
            setStatus('ok', `${res.action === 'updated' ? 'Updated' : 'Inserted'} component CSS in Custom CSS.`);
            if (els.autoUpdate?.checked) renderPreview();
        });

        renderFields();
        build();
    },
};

export default tool;
