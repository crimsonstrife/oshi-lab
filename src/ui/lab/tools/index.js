// @ts-check

import { state } from '../state.js';
import { els, on } from '../dom.js';
import { setStatus } from '../status.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { insertAtCursor } from '../utils/textarea.js';
import { renderPreview } from '../preview/render.js';
import { parseColor, formatHex, formatRgba } from './color.js';

function ensureToolsModal() {
  const el = document.getElementById('toolsModal');
  const Modal = window.bootstrap?.Modal;
  if (!el || !Modal) return null;
  if (!state.toolsModal) state.toolsModal = new Modal(el, { focus: true });
  return state.toolsModal;
}

function openTools() {
  const modal = ensureToolsModal();
  if (!modal) {
    setStatus('warn', 'Tools modal unavailable (Bootstrap not loaded).');
    return;
  }
  modal.show();

  setTimeout(() => {
    const search = document.getElementById('toolsSearch');
    if (search) search.focus();
  }, 50);
}

const TOOL_DEFS = [
  {
    id: 'color',
    name: 'Color Converter',
    keywords: 'color hex rgb rgba css',
    /** @param {HTMLElement} panel */
    render(panel) {
      panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">Color Converter</div>
            <div class="small text-body-secondary">Paste a color and get HEX / RGBA. Insert snippets into your editors.</div>
          </div>
          <div id="colorSwatch" class="border rounded" style="width:48px;height:48px;background:#000;"></div>
        </div>

        <hr class="my-3" />

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
  },
];

export function initTools() {
  on('btnTools', 'click', openTools);

  // Ctrl/Cmd+K
  document.addEventListener('keydown', (e) => {
    const key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'k') {
      e.preventDefault();
      openTools();
    }
  });

  const listEl = document.getElementById('toolsList');
  const panelEl = document.getElementById('toolsPanel');
  const searchEl = /** @type {HTMLInputElement|null} */ (document.getElementById('toolsSearch'));
  if (!listEl || !panelEl || !searchEl) return;

  let activeToolId = TOOL_DEFS[0]?.id || null;

  /** @param {any} tool @param {string} q */
  const matches = (tool, q) => {
    if (!q) return true;
    const hay = `${tool.name} ${tool.keywords}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  const renderPanel = () => {
    const tool = TOOL_DEFS.find((t) => t.id === activeToolId);
    if (!tool) {
      panelEl.innerHTML = `<div class="text-body-secondary">No tool selected.</div>`;
      return;
    }
    tool.render(panelEl);
  };

  const renderList = () => {
    const q = searchEl.value.trim();
    const visible = TOOL_DEFS.filter((t) => matches(t, q));

    listEl.innerHTML = visible
      .map((t) => {
        const active = t.id === activeToolId;
        return `
          <button type="button"
            class="list-group-item list-group-item-action ${active ? 'active' : ''}"
            data-tool="${t.id}">
            ${t.name}
          </button>
        `;
      })
      .join('');

    if (!visible.some((t) => t.id === activeToolId)) {
      activeToolId = visible[0]?.id || null;
    }

    renderPanel();
  };

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tool]');
    if (!btn) return;
    activeToolId = btn.getAttribute('data-tool');
    renderList();
  });

  searchEl.addEventListener('input', renderList);

  renderList();
}
