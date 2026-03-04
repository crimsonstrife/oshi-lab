// @ts-check

import { els } from '../../dom.js';
import { setStatus } from '../../status.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { insertAtCursor } from '../../utils/textarea.js';
import { renderPreview } from '../../preview/render.js';
import { parseColor, formatHex, formatRgba } from '../color.js';
import { TOOL_SCHEMA_VERSION } from '../schema.js';

/** @type {import('../schema.js').ToolDef} */
const tool = {
    schemaVersion: TOOL_SCHEMA_VERSION,
    id: 'color',
    name: 'Color Converter',
    description: 'Convert HEX/RGB/RGBA and insert snippets into your Custom CSS.',
    icon: 'fa-solid fa-palette',
    category: 'Utilities',
    supportsInsert: true,
    supportsUpdate: false,
    shortcut: 'Alt+7',
    keywords: 'color hex rgb rgba css',
    order: 10,

    /** @param {HTMLElement} panel */
    render(panel) {
        panel.innerHTML = `
      <div class="d-flex justify-content-end mb-2">
        <div id="colorSwatch" class="border rounded" style="width:48px;height:48px;background:#000;"></div>
      </div>

      <label class="form-label small">Input</label>
      <input id="colorInput" class="form-control" placeholder="#ff3366, #f36, rgba(255, 51, 102, .8)" />

      <div class="row g-2 mt-2">
        <div class="col-12 col-md-6">
          <label class="form-label small">HEX</label>
          <div class="input-group">
            <input id="colorHex" class="form-control" readonly />
            <button id="copyHex" class="btn btn-outline-secondary" type="button">Copy</button>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small">RGBA</label>
          <div class="input-group">
            <input id="colorRgba" class="form-control" readonly />
            <button id="copyRgba" class="btn btn-outline-secondary" type="button">Copy</button>
          </div>
        </div>
      </div>

      <div class="mt-3">
        <label class="form-label small">Insert into Custom CSS</label>
        <div class="input-group">
          <span class="input-group-text">var</span>
          <input id="varName" class="form-control" value="--accent" />
          <button id="insertVar" class="btn btn-outline-primary" type="button">Insert</button>
        </div>
        <div class="form-text">Inserts <code>--accent: …;</code> at your cursor in Custom CSS.</div>
      </div>
    `;

        const input = /** @type {HTMLInputElement|null} */ (panel.querySelector('#colorInput'));
        const outHex = /** @type {HTMLInputElement|null} */ (panel.querySelector('#colorHex'));
        const outRgba = /** @type {HTMLInputElement|null} */ (panel.querySelector('#colorRgba'));
        const swatch = /** @type {HTMLElement|null} */ (panel.querySelector('#colorSwatch'));

        const update = () => {
            const parsed = parseColor(input?.value || '');
            if (!parsed) {
                if (outHex) outHex.value = '';
                if (outRgba) outRgba.value = '';
                if (swatch) swatch.style.background = '#000';
                return;
            }
            const hex = formatHex(parsed);
            const rgba = formatRgba(parsed);
            if (outHex) outHex.value = hex;
            if (outRgba) outRgba.value = rgba;
            if (swatch) swatch.style.background = rgba;
        };

        input?.addEventListener('input', update);
        update();

        panel.querySelector('#copyHex')?.addEventListener('click', async () => {
            if (!outHex?.value) return;
            await copyToClipboard(outHex.value);
            setStatus('ok', 'Copied HEX.');
        });

        panel.querySelector('#copyRgba')?.addEventListener('click', async () => {
            if (!outRgba?.value) return;
            await copyToClipboard(outRgba.value);
            setStatus('ok', 'Copied RGBA.');
        });

        panel.querySelector('#insertVar')?.addEventListener('click', () => {
            const parsed = parseColor(input?.value || '');
            if (!parsed) return;

            const name = (/** @type {HTMLInputElement|null} */ (panel.querySelector('#varName'))?.value || '--accent').trim();
            const value = formatHex(parsed);
            const snippet = `${name}: ${value};\n`;

            insertAtCursor(els.customCss, snippet);
            setStatus('ok', `Inserted ${name} into Custom CSS.`);
            if (els.autoUpdate?.checked) renderPreview();
        });
    },
};

export default tool;