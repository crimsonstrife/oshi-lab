// @ts-check

import { els } from '../../dom.js';
import { setStatus } from '../../status.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { renderPreview } from '../../preview/render.js';
import { getCssBlocks } from '../cssBlocks/registry.js';
import { buildMarkedSnippet, upsertMarkedSnippet } from '../../utils/snippets.js';

/**
 * Wraps a given CSS snippet with a header and footer that includes the provided title.
 *
 * @param {string} title - The title to include in the header and footer of the wrapped CSS snippet.
 * @param {string} css - The CSS code snippet to wrap.
 * @return {string} The wrapped CSS snippet with a header and footer containing the title.
 */
/** @param {any} block */
function toSnippet(block) {
    const id = `cssblock/${block.id}`;
    const v = Number.isFinite(block.version) ? block.version : 1;
    const body = `/* CSS Block: ${block.name} */\n${String(block.css || '').trimEnd()}`;
    return buildMarkedSnippet({ kind: 'css', blockId: id, version: v, body });
}

export default {
    id: 'css-blocks',
    name: 'CSS Blocks',
    keywords: 'css snippet block insert',
    order: 30,

    /** @param {HTMLElement} panel */
    render(panel) {
        const blocks = getCssBlocks();
        if (!blocks.length) {
            panel.innerHTML = `<div class="text-body-secondary">No CSS blocks registered.</div>`;
            return;
        }

        let activeId = blocks[0].id;

        panel.innerHTML = `
      <div class="fw-semibold">CSS Blocks</div>
      <div class="small text-body-secondary">Insert pre-made CSS chunks into Custom CSS. Re-inserting the same block updates it in place.</div>
      <hr class="my-3" />

      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <input id="cssBlockSearch" class="form-control form-control-sm mb-2" placeholder="Search CSS blocks…" autocomplete="off" />
          <div id="cssBlockList" class="list-group small"></div>
        </div>

        <div class="col-12 col-lg-7">
          <div class="small text-body-secondary mb-2" id="cssBlockDesc"></div>
          <textarea id="cssBlockPreview" class="form-control form-control-sm font-monospace" rows="12" readonly></textarea>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button id="insertCssBlock" class="btn btn-sm btn-outline-primary" type="button">Insert into Custom CSS</button>
            <button id="copyCssBlock" class="btn btn-sm btn-outline-secondary" type="button">Copy</button>
          </div>
        </div>
      </div>
    `;

        const searchEl = /** @type {HTMLInputElement|null} */ (panel.querySelector('#cssBlockSearch'));
        const listEl = /** @type {HTMLElement|null} */ (panel.querySelector('#cssBlockList'));
        const descEl = /** @type {HTMLElement|null} */ (panel.querySelector('#cssBlockDesc'));
        const ta = /** @type {HTMLTextAreaElement|null} */ (panel.querySelector('#cssBlockPreview'));
        const btnInsert = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#insertCssBlock'));
        const btnCopy = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#copyCssBlock'));
        if (!searchEl || !listEl || !descEl || !ta || !btnInsert || !btnCopy) return;

        const matches = (b, q) => {
            if (!q) return true;
            const hay = `${b.name} ${b.keywords || ''} ${b.description || ''}`.toLowerCase();
            return hay.includes(q.toLowerCase());
        };

        const renderDetail = () => {
            const block = blocks.find((b) => b.id === activeId) || blocks[0];
            activeId = block.id;

            descEl.textContent = block.description || '';
            ta.value = toSnippet(block).trimEnd() + '\n';

            btnInsert.onclick = () => {
                const res = upsertMarkedSnippet(
                    els.customCss,
                    'css',
                    `cssblock/${block.id}`,
                    `/* CSS Block: ${block.name} */\n${String(block.css || '').trimEnd()}`,
                    Number.isFinite(block.version) ? block.version : 1,
                );
                setStatus('ok', `${res.action === 'updated' ? 'Updated' : 'Inserted'} "${block.name}".`);
                if (els.autoUpdate?.checked) renderPreview();
            };

            btnCopy.onclick = async () => {
                await copyToClipboard(ta.value.trimEnd() + '\n');
                setStatus('ok', 'Copied CSS block.');
            };
        };

        const renderList = () => {
            const q = searchEl.value.trim();
            const visible = blocks.filter((b) => matches(b, q));

            listEl.innerHTML = '';
            for (const b of visible) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `list-group-item list-group-item-action ${b.id === activeId ? 'active' : ''}`;
                btn.dataset.block = b.id;
                btn.textContent = b.name;
                listEl.appendChild(btn);
            }

            if (!visible.some((b) => b.id === activeId)) {
                activeId = visible[0]?.id || blocks[0]?.id;
            }

            renderDetail();
        };

        listEl.addEventListener('click', (e) => {
            const btn = /** @type {HTMLElement|null} */ (e.target)?.closest?.('[data-block]');
            if (!btn) return;
            activeId = btn.getAttribute('data-block') || activeId;
            renderList();
        });

        searchEl.addEventListener('input', renderList);

        renderList();
    },
};