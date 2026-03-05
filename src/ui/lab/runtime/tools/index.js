// @ts-check

import { state } from '../state.js';
import { on } from '../dom.js';
import { setStatus } from '../status.js';
import { getTools } from './registry.js';
import { els } from '../dom.js';
import { renderPreview } from '../preview/render.js';

/** @param {string} s */
function escapeHtml(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

/**
 * Normalize a keydown event into a "mods+key" form like "alt+1".
 * @param {KeyboardEvent} e
 */
function normEventCombo(e) {
    const mods = [
        e.ctrlKey ? 'ctrl' : '',
        e.metaKey ? 'meta' : '',
        e.altKey ? 'alt' : '',
        e.shiftKey ? 'shift' : '',
    ].filter(Boolean);

    const k = String(e.key || '').toLowerCase();
    if (!k) return '';

    // Skip pure modifier presses
    if (['control', 'shift', 'alt', 'meta'].includes(k)) return '';

    return [...mods.sort(), k].join('+');
}

function initToolListTooltips(containerEl) {
    if (!window.bootstrap?.Tooltip) return;

    // Dispose old ones to avoid duplicates if the list re-renders
    containerEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        const inst = window.bootstrap.Tooltip.getInstance(el);
        if (inst) inst.dispose();
    });

    // Create new ones
    containerEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        new window.bootstrap.Tooltip(el, {
            trigger: 'hover focus',
            boundary: 'window',
            html: false,
        });
    });
}

/**
 * Ensures the tools modal instance is initialized and available.
 * If the modal is not already initialized, it instantiates a new modal using the Bootstrap Modal API.
 *
 * @return {Object|null} The initialized Bootstrap modal instance, or null if the modal element or Bootstrap Modal is not available.
 */
function ensureToolsModal() {
    const el = document.getElementById('toolsModal');
    const Modal = window.bootstrap?.Modal;
    if (!el || !Modal) return null;
    if (!state.toolsModal) state.toolsModal = new Modal(el, { focus: true });
    return state.toolsModal;
}

/**
 * Opens the tools modal if available. Ensures the tools modal is displayed
 * and sets focus on the search input within the modal after a short delay.
 * Displays a warning status if the tools modal is unavailable.
 *
 * @return {void} This function does not return a value.
 */
function openTools() {
    const modal = ensureToolsModal();
    if (!modal) {
        setStatus('warn', 'Tools modal unavailable (Bootstrap not loaded).');
        return;
    }
    // @ts-ignore
    modal.show();

    setTimeout(() => {
        const search = document.getElementById('toolsSearch');
        if (search) search.focus();
    }, 50);
}

/**
 * Initializes tools functionality by setting up event listeners, rendering the panel and tool list,
 * and managing the state of the active tool selection. Includes keyboard shortcut support and search filtering.
 *
 * @return {void} No value is returned from this function.
 */
export function initTools() {
    on('btnTools', 'click', openTools);

    const TOOL_DEFS = getTools();

    // Ctrl/Cmd+K (open palette)
    document.addEventListener('keydown', (e) => {
        const key = (e.key || '').toLowerCase();
        if ((e.ctrlKey || e.metaKey) && key === 'k') {
            e.preventDefault();
            openTools();
            return;
        }

        // per-tool shortcuts (e.g., Alt+1) to open palette and jump directly.
        const combo = normEventCombo(e);
        if (!combo) return;

        const match = TOOL_DEFS.find((t) => {
            // @ts-ignore - shortcut is normalized by registry when present.
            return t.shortcut?.norm === combo;
        });
        if (!match) return;

        e.preventDefault();
        openTools();
        // @ts-ignore
        state.toolsApi?.setActive?.(match.id);
    });

    const listEl = document.getElementById('toolsList');
    const panelEl = document.getElementById('toolsPanel');
    const searchEl = /** @type {HTMLInputElement|null} */ (document.getElementById('toolsSearch'));
    if (!listEl || !panelEl || !searchEl) return;


    /** @type {import('./schema.js').ToolContext} */
    const ctx = { els, setStatus, renderPreview };

    /** @type {any|null} */
    let lastTool = null;

    // Ensure any tool cleanup runs when the modal closes (e.g. pick-mode listeners).
    const modalEl = document.getElementById('toolsModal');
    // @ts-ignore
    if (modalEl && !state.toolsCleanupBound) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            // During pick-mode, some tools temporarily hide the modal.
            // Skip cleanup in that case so the tool can keep running.
            // @ts-ignore
            if (state.toolsSuspendCleanup) return;
            if (lastTool && typeof lastTool.destroy === 'function') {
                try { lastTool.destroy(ctx); } catch {}
            }
        });
        // @ts-ignore
        state.toolsCleanupBound = true;
    }

    if (!TOOL_DEFS.length) {
        panelEl.textContent = 'No tools registered.';
        return;
    }

    // remember last tool
    // @ts-ignore
    let activeToolId = state.activeToolId || TOOL_DEFS[0].id;

    /** @param {any} tool @param {string} q */
    const matches = (tool, q) => {
        if (!q) return true;
        const hay = `${tool.name} ${tool.description || ''} ${tool.category || ''} ${tool.keywords || ''}`.toLowerCase();
        return hay.includes(q.toLowerCase());
    };

    const renderPanel = () => {
        const tool = TOOL_DEFS.find((t) => t.id === activeToolId) || TOOL_DEFS[0];
        if (!tool) {
            panelEl.textContent = 'No tool selected.';
            return;
        }
        activeToolId = tool.id;
        // @ts-ignore
        state.activeToolId = activeToolId;

        // Cleanup previous tool if switching (optional destroy hook).
        if (lastTool && lastTool.id !== tool.id && typeof lastTool.destroy === 'function') {
            try { lastTool.destroy(ctx); } catch {}
        }
        lastTool = tool;

        panelEl.innerHTML = '';

        // Standardized header from metadata.
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
          </div>
        `;

        const body = document.createElement('div');
        body.className = 'mt-3';

        panelEl.appendChild(header);
        const hr = document.createElement('hr');
        hr.className = 'my-3';
        panelEl.appendChild(hr);
        panelEl.appendChild(body);

        // Tools may ignore ctx; extra args are safe.
        tool.render(body, ctx);
    };

    const renderList = () => {
        const q = searchEl.value.trim();
        const visible = TOOL_DEFS.filter((t) => matches(t, q));

        listEl.innerHTML = '';

        // Group by category to make scanning easier.
        /** @type {Map<string, any[]>} */
        const groups = new Map();
        for (const t of visible) {
            const cat = t.category || 'Other';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat)?.push(t);
        }

        const cats = Array.from(groups.keys());
        cats.sort((a, b) => a.localeCompare(b));

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
                    btn.setAttribute('data-bs-title', desc); // Bootstrap tooltip content
                    btn.setAttribute('data-bs-custom-class', 'oshi-tooltip'); // style hook
                }
                // rely on metadata for consistent list rows.
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
                  </div>
                `;
                listEl.appendChild(btn);
            }

            // after list is rebuilt
            initToolListTooltips(listEl);
        }

        if (!visible.some((t) => t.id === activeToolId)) {
            activeToolId = visible[0]?.id || TOOL_DEFS[0]?.id;
            // @ts-ignore
            state.activeToolId = activeToolId;
        }

        renderPanel();
    };

    listEl.addEventListener('click', (e) => {
        const btn = /** @type {HTMLElement|null} */ (e.target)?.closest?.('[data-tool]');
        if (!btn) return;
        activeToolId = btn.getAttribute('data-tool') || activeToolId;
        // @ts-ignore
        state.activeToolId = activeToolId;
        renderList();
    });

    searchEl.addEventListener('input', renderList);

    renderList();

    // Expose a tiny API for onboarding / deep-links.
    // @ts-ignore
    state.toolsApi = {
        open: openTools,
        setActive: (id) => {
            if (!id) return;
            activeToolId = String(id);
            // @ts-ignore
            state.activeToolId = activeToolId;
            renderList();
        },
    };
}