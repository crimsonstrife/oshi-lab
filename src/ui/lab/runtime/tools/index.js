// @ts-check

import { state } from '../state.js';
import { on } from '../dom.js';
import { setStatus } from '../status.js';
import { getTools } from './registry.js';
import { els } from '../dom.js';
import { renderPreview } from '../preview/render.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normEventCombo(e) {
  const mods = [e.ctrlKey ? 'ctrl' : '', e.metaKey ? 'meta' : '', e.altKey ? 'alt' : '', e.shiftKey ? 'shift' : ''].filter(Boolean);
  const k = String(e.key || '').toLowerCase();
  if (!k || ['control', 'shift', 'alt', 'meta'].includes(k)) return '';
  return [...mods.sort(), k].join('+');
}

function initToolListTooltips(containerEl) {
  if (!window.bootstrap?.Tooltip) return;
  containerEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    const inst = window.bootstrap.Tooltip.getInstance(el);
    if (inst) inst.dispose();
  });
  containerEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    new window.bootstrap.Tooltip(el, { trigger: 'hover focus', boundary: 'window', html: false });
  });
}

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
  setTimeout(() => document.getElementById('toolsSearch')?.focus(), 50);
}

export function initTools() {
  on('btnTools', 'click', openTools);

  const listEl = document.getElementById('toolsList');
  const panelEl = document.getElementById('toolsPanel');
  const searchEl = /** @type {HTMLInputElement|null} */ (document.getElementById('toolsSearch'));
  if (!listEl || !panelEl || !searchEl) return;

  const defs = () => getTools(state.target);
  let activeToolId = state.activeToolId || defs()[0]?.id || null;

  const matches = (tool, q) => {
    if (!q) return true;
    const hay = `${tool.name} ${tool.description || ''} ${tool.category || ''} ${tool.keywords || ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  const renderPanel = () => {
    const toolDefs = defs();
    const tool = toolDefs.find((t) => t.id === activeToolId) || toolDefs[0];
    if (!tool) {
      panelEl.textContent = 'No tools available for this workspace.';
      return;
    }

    activeToolId = tool.id;
    state.activeToolId = activeToolId;
    panelEl.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between align-items-start gap-2 oshi-tools-panel-header';
    header.innerHTML = `
      <div class="d-flex align-items-start gap-2">
        <div class="fs-4" aria-hidden="true"><i class="${escapeHtml(tool.icon || '')}" aria-hidden="true"></i></div>
        <div class="min-w-0">
          <div class="fw-semibold">${escapeHtml(tool.name)}</div>
          <div class="small text-body-secondary oshi-tools-panel-desc">${escapeHtml(tool.description || '')}</div>
        </div>
      </div>
      <div class="d-flex flex-column align-items-end gap-1 min-w-0">
        <div class="d-flex flex-wrap gap-1 justify-content-end">
          ${tool.supportsInsert ? '<span class="badge text-bg-secondary">Insert</span>' : ''}
          ${tool.supportsUpdate ? '<span class="badge text-bg-secondary">Update</span>' : ''}
          <span class="badge text-bg-dark">${escapeHtml(tool.category || '')}</span>
        </div>
        ${tool.shortcut?.combo ? `<div class="small text-body-secondary">Shortcut: <kbd>${escapeHtml(tool.shortcut.combo)}</kbd></div>` : ''}
      </div>`;

    const body = document.createElement('div');
    body.className = 'mt-3';
    panelEl.appendChild(header);
    const hr = document.createElement('hr');
    hr.className = 'my-3';
    panelEl.appendChild(hr);
    panelEl.appendChild(body);

    const ctx = { els, setStatus, renderPreview, target: state.target };
    tool.render(body, ctx);
  };

  const renderList = () => {
    const toolDefs = defs();
    if (!toolDefs.length) {
      listEl.innerHTML = '';
      panelEl.textContent = 'No tools available for this workspace.';
      return;
    }

    const q = searchEl.value.trim();
    const visible = toolDefs.filter((t) => matches(t, q));
    listEl.innerHTML = '';

    const groups = new Map();
    for (const t of visible) {
      const cat = t.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(t);
    }

    const cats = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    for (const cat of cats) {
      const heading = document.createElement('div');
      heading.className = 'list-group-item py-1 border-0 text-uppercase text-body-secondary bg-transparent';
      heading.style.pointerEvents = 'none';
      heading.textContent = cat;
      listEl.appendChild(heading);

      for (const t of groups.get(cat) || []) {
        const btn = document.createElement('button');
        const desc = (t.description || '').trim();
        btn.type = 'button';
        btn.className = `list-group-item list-group-item-action ${t.id === activeToolId ? 'active' : ''}`;
        btn.dataset.tool = t.id;
        if (desc) {
          btn.setAttribute('data-bs-toggle', 'tooltip');
          btn.setAttribute('data-bs-placement', 'right');
          btn.setAttribute('data-bs-title', desc);
          btn.setAttribute('data-bs-custom-class', 'oshi-tooltip');
        }
        btn.innerHTML = `
          <div class="oshi-tool-row">
            <div class="fs-5 oshi-tool-icon" aria-hidden="true"><i class="${escapeHtml(t.icon || '')}" aria-hidden="true"></i></div>
            <div class="oshi-tool-main">
              <div class="oshi-tool-head">
                <div class="fw-semibold oshi-tool-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</div>
                <div class="oshi-tool-meta">
                  ${t.supportsUpdate ? '<span class="badge text-bg-secondary" title="Updates existing snippet blocks">U</span>' : ''}
                  ${t.supportsInsert ? '<span class="badge text-bg-secondary" title="Inserts snippets into editors">I</span>' : ''}
                  ${t.shortcut?.combo ? `<span class="badge text-bg-dark oshi-tool-shortcut" title="Shortcut: ${escapeHtml(t.shortcut.combo)}">${escapeHtml(t.shortcut.combo)}</span>` : ''}
                </div>
              </div>
            </div>
          </div>`;
        listEl.appendChild(btn);
      }
    }

    initToolListTooltips(listEl);

    if (!visible.some((t) => t.id === activeToolId)) {
      activeToolId = visible[0]?.id || toolDefs[0]?.id || null;
      state.activeToolId = activeToolId;
    }
    renderPanel();
  };

  listEl.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement|null} */ (e.target)?.closest?.('[data-tool]');
    if (!btn) return;
    activeToolId = btn.getAttribute('data-tool') || activeToolId;
    state.activeToolId = activeToolId;
    renderList();
  });

  searchEl.addEventListener('input', renderList);

  document.addEventListener('keydown', (e) => {
    const key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'k') {
      e.preventDefault();
      openTools();
      return;
    }
    const combo = normEventCombo(e);
    if (!combo) return;
    const match = defs().find((t) => t.shortcut?.norm === combo);
    if (!match) return;
    e.preventDefault();
    openTools();
    activeToolId = match.id;
    state.activeToolId = activeToolId;
    renderList();
  });

  renderList();
  state.toolsApi = {
    open: openTools,
    setActive: (id) => {
      if (!id) return;
      activeToolId = String(id);
      state.activeToolId = activeToolId;
      renderList();
    },
    refresh: () => renderList(),
  };
}
