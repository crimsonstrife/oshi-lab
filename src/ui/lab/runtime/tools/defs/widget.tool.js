// @ts-check

import { els } from '../../dom.js';
import { setStatus } from '../../status.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { insertAtCursor } from '../../utils/textarea.js';
import { renderPreview } from '../../preview/render.js';
import { getWidgets } from '../widgets/registry.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function wrapSnippet(title, code, lang) {
    const header = `/* === ${title} (${lang}) === */\n`;
    const footer = `\n/* === /${title} === */\n`;
    return header + code.trimEnd() + footer;
}

/** @param {any} widget @param {Record<string,string>} values */
function applyTemplate(widget, values) {
    const fields = widget.fields || [];
    const getVal = (id) => values[id] ?? fields.find((f) => f.id === id)?.defaultValue ?? '';

    const replaceTokens = (tpl) =>
        String(tpl).replaceAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, id) => {
            const field = fields.find((f) => f.id === id);
            const raw = getVal(id);
            return field?.allowHtml ? String(raw) : escapeHtml(String(raw));
        });

    return {
        html: replaceTokens(widget.html),
        css: replaceTokens(widget.css),
    };
}

export default {
    id: 'widgets',
    name: 'Widget Inserter',
    keywords: 'widget html css snippet component block',
    order: 20,

    /** @param {HTMLElement} panel */
    render(panel) {
        const widgets = getWidgets();
        if (!widgets.length) {
            panel.innerHTML = `<div class="text-body-secondary">No widgets registered.</div>`;
            return;
        }

        let activeId = widgets[0].id;
        /** @type {Record<string,string>} */
        let values = {};

        panel.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <div class="fw-semibold">Widget Inserter</div>
          <div class="small text-body-secondary">Pick a widget, tweak fields, then insert HTML/CSS into your editors.</div>
        </div>
      </div>

      <hr class="my-3" />

      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <input id="widgetSearch" class="form-control form-control-sm mb-2" placeholder="Search widgets…" autocomplete="off" />
          <div id="widgetList" class="list-group small"></div>
        </div>

        <div class="col-12 col-lg-7">
          <div id="widgetDetail" class="d-flex flex-column gap-2"></div>
        </div>
      </div>
    `;

        const searchEl = /** @type {HTMLInputElement|null} */ (panel.querySelector('#widgetSearch'));
        const listEl = /** @type {HTMLElement|null} */ (panel.querySelector('#widgetList'));
        const detailEl = /** @type {HTMLElement|null} */ (panel.querySelector('#widgetDetail'));
        if (!searchEl || !listEl || !detailEl) return;

        const matches = (w, q) => {
            if (!q) return true;
            const hay = `${w.name} ${w.keywords || ''} ${w.description || ''}`.toLowerCase();
            return hay.includes(q.toLowerCase());
        };

        const renderDetail = () => {
            const widget = widgets.find((w) => w.id === activeId) || widgets[0];
            activeId = widget.id;

            // reset defaults each time widget changes
            values = {};
            for (const f of widget.fields || []) values[f.id] = f.defaultValue ?? '';

            detailEl.innerHTML = '';

            const title = document.createElement('div');
            title.className = 'fw-semibold';
            title.textContent = widget.name;

            const desc = document.createElement('div');
            desc.className = 'small text-body-secondary';
            desc.textContent = widget.description || 'Insertable HTML + CSS widget.';

            detailEl.appendChild(title);
            detailEl.appendChild(desc);

            // Fields
            const fields = widget.fields || [];
            if (fields.length) {
                const fieldsWrap = document.createElement('div');
                fieldsWrap.className = 'mt-2 d-flex flex-column gap-2';

                for (const f of fields) {
                    const label = document.createElement('label');
                    label.className = 'small d-flex flex-column gap-1';

                    const span = document.createElement('span');
                    span.className = 'text-muted';
                    span.textContent = f.label;

                    let input;
                    if (f.type === 'textarea') {
                        input = document.createElement('textarea');
                        input.rows = 3;
                    } else {
                        input = document.createElement('input');
                        input.type = 'text';
                    }

                    input.className = 'form-control form-control-sm font-monospace';
                    input.placeholder = f.placeholder || '';
                    input.value = values[f.id] || '';

                    input.addEventListener('input', () => {
                        values[f.id] = input.value;
                        updatePreviews();
                    });

                    label.appendChild(span);
                    label.appendChild(input);
                    fieldsWrap.appendChild(label);
                }

                detailEl.appendChild(fieldsWrap);
            }

            // Previews
            const htmlLabel = document.createElement('div');
            htmlLabel.className = 'form-label small mt-2 mb-1';
            htmlLabel.textContent = 'HTML';

            const htmlTa = document.createElement('textarea');
            htmlTa.id = 'widgetHtmlPreview';
            htmlTa.className = 'form-control form-control-sm font-monospace';
            htmlTa.rows = 6;
            htmlTa.readOnly = true;

            const cssLabel = document.createElement('div');
            cssLabel.className = 'form-label small mt-2 mb-1';
            cssLabel.textContent = 'CSS';

            const cssTa = document.createElement('textarea');
            cssTa.id = 'widgetCssPreview';
            cssTa.className = 'form-control form-control-sm font-monospace';
            cssTa.rows = 6;
            cssTa.readOnly = true;

            detailEl.appendChild(htmlLabel);
            detailEl.appendChild(htmlTa);
            detailEl.appendChild(cssLabel);
            detailEl.appendChild(cssTa);

            // Buttons
            const btnRow = document.createElement('div');
            btnRow.className = 'd-flex flex-wrap gap-2 mt-2';

            const mkBtn = (text, cls) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = cls;
                b.textContent = text;
                return b;
            };

            const btnInsertBoth = mkBtn('Insert both', 'btn btn-sm btn-outline-primary');
            const btnInsertHtml = mkBtn('Insert HTML', 'btn btn-sm btn-outline-light');
            const btnInsertCss = mkBtn('Insert CSS', 'btn btn-sm btn-outline-light');
            const btnCopyHtml = mkBtn('Copy HTML', 'btn btn-sm btn-outline-secondary');
            const btnCopyCss = mkBtn('Copy CSS', 'btn btn-sm btn-outline-secondary');

            btnRow.appendChild(btnInsertBoth);
            btnRow.appendChild(btnInsertHtml);
            btnRow.appendChild(btnInsertCss);
            btnRow.appendChild(btnCopyHtml);
            btnRow.appendChild(btnCopyCss);

            detailEl.appendChild(btnRow);

            const getSnippets = () => {
                const built = applyTemplate(widget, values);
                return {
                    html: wrapSnippet(widget.name, built.html, 'HTML'),
                    css: wrapSnippet(widget.name, built.css, 'CSS'),
                };
            };

            const updatePreviews = () => {
                const s = getSnippets();
                htmlTa.value = s.html.trimEnd() + '\n';
                cssTa.value = s.css.trimEnd() + '\n';
            };

            btnInsertHtml.addEventListener('click', () => {
                const s = getSnippets();
                insertAtCursor(els.customHtml, s.html.trimEnd() + '\n');
                setStatus('ok', `Inserted "${widget.name}" HTML.`);
                if (els.autoUpdate?.checked) renderPreview();
            });

            btnInsertCss.addEventListener('click', () => {
                const s = getSnippets();
                insertAtCursor(els.customCss, s.css.trimEnd() + '\n');
                setStatus('ok', `Inserted "${widget.name}" CSS.`);
                if (els.autoUpdate?.checked) renderPreview();
            });

            btnInsertBoth.addEventListener('click', () => {
                const s = getSnippets();
                insertAtCursor(els.customCss, s.css.trimEnd() + '\n');
                insertAtCursor(els.customHtml, s.html.trimEnd() + '\n');
                setStatus('ok', `Inserted "${widget.name}" HTML + CSS.`);
                if (els.autoUpdate?.checked) renderPreview();
            });

            btnCopyHtml.addEventListener('click', async () => {
                const s = getSnippets();
                await copyToClipboard(s.html.trimEnd() + '\n');
                setStatus('ok', 'Copied HTML.');
            });

            btnCopyCss.addEventListener('click', async () => {
                const s = getSnippets();
                await copyToClipboard(s.css.trimEnd() + '\n');
                setStatus('ok', 'Copied CSS.');
            });

            updatePreviews();
        };

        const renderList = () => {
            const q = searchEl.value.trim();
            const visible = widgets.filter((w) => matches(w, q));

            listEl.innerHTML = '';
            for (const w of visible) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `list-group-item list-group-item-action ${w.id === activeId ? 'active' : ''}`;
                btn.dataset.widget = w.id;
                btn.textContent = w.name;
                listEl.appendChild(btn);
            }

            if (!visible.some((w) => w.id === activeId)) {
                activeId = visible[0]?.id || widgets[0]?.id;
            }

            renderDetail();
        };

        listEl.addEventListener('click', (e) => {
            const btn = /** @type {HTMLElement|null} */ (e.target)?.closest?.('[data-widget]');
            if (!btn) return;
            activeId = btn.getAttribute('data-widget') || activeId;
            renderList();
        });

        searchEl.addEventListener('input', renderList);

        renderList();
    },
};