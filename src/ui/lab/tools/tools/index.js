// @ts-check

import { state } from '../state.js';
import { on } from '../dom.js';
import { setStatus } from '../status.js';
import { getTools } from './registry.js';

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

    const TOOL_DEFS = getTools();
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
        const hay = `${tool.name} ${tool.keywords || ''}`.toLowerCase();
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

        panelEl.innerHTML = '';
        tool.render(panelEl);
    };

    const renderList = () => {
        const q = searchEl.value.trim();
        const visible = TOOL_DEFS.filter((t) => matches(t, q));

        listEl.innerHTML = '';
        for (const t of visible) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `list-group-item list-group-item-action ${t.id === activeToolId ? 'active' : ''}`;
            btn.dataset.tool = t.id;
            btn.textContent = t.name;
            listEl.appendChild(btn);
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
}