// @ts-check

import { els } from '../../dom.js';
import { setStatus } from '../../status.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { renderPreview } from '../../preview/render.js';
import { buildMarkedSnippet, upsertMarkedSnippet } from '../../utils/snippets.js';
import { TOOL_SCHEMA_VERSION } from '../schema.js';

const SCHEDULE_HTML_BLOCK = 'schedule-builder/html';
const SCHEDULE_CSS_BLOCK = 'schedule-builder/css';

/**
 * An array containing objects that represent the days of the week.
 * Each object in the array includes:
 * - `id`: A short identifier for the day (e.g., 'mon' for Monday).
 * - `name`: The abbreviated name of the day (e.g., 'Mon' for Monday).
 */
const DAYS = [
    { id: 'mon', name: 'Mon' },
    { id: 'tue', name: 'Tue' },
    { id: 'wed', name: 'Wed' },
    { id: 'thu', name: 'Thu' },
    { id: 'fri', name: 'Fri' },
    { id: 'sat', name: 'Sat' },
    { id: 'sun', name: 'Sun' },
];

function pad2(n) { return String(n).padStart(2, '0'); }

function toMinutes(hhmm) {
    const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return h * 60 + min;
}

function fmt12(minutes) {
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const am = h24 < 12;
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${pad2(m)} ${am ? 'AM' : 'PM'}`;
}

function esc(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function scheduleCss() {
    return `
.labw-schedule{
  --labw-bg: rgba(255,255,255,.06);
  --labw-border: rgba(255,255,255,.14);
  --labw-text: rgba(255,255,255,.92);
  --labw-muted: rgba(255,255,255,.70);
  --labw-accent: #8aa9ff;
  --labw-radius: 14px;

  border: 1px solid var(--labw-border);
  background: var(--labw-bg);
  border-radius: var(--labw-radius);
  padding: 14px;
  color: var(--labw-text);
}

.labw-schedule__header{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
  margin-bottom: 12px;
}

.labw-schedule__title{ font-weight: 900; letter-spacing: .2px; }

.labw-schedule__meta{
  display:flex;
  gap:10px;
  align-items:center;
  flex-wrap:wrap;
  justify-content:flex-end;
}

.labw-pill{
  display:inline-flex;
  align-items:center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--labw-border);
  background: rgba(0,0,0,.18);
  font-size: 12px;
  color: var(--labw-muted);
}

.labw-link{
  font-size: 12px;
  color: var(--labw-accent);
  text-decoration: none;
  font-weight: 800;
}
.labw-link:hover{ text-decoration: underline; }

.labw-schedule__grid{
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

@media (min-width: 900px){
  .labw-schedule__grid{ grid-template-columns: repeat(7, minmax(0, 1fr)); }
}

.labw-day{
  border: 1px solid var(--labw-border);
  border-radius: 12px;
  padding: 10px;
  background: rgba(0,0,0,.14);
}

.labw-day__name{
  font-weight: 900;
  font-size: 12px;
  margin-bottom: 8px;
  opacity: .9;
}

.labw-day__slots{ display:flex; flex-direction:column; gap:6px; }

.labw-slot{ display:flex; gap:8px; align-items:baseline; line-height:1.2; }

.labw-time{ font-weight: 900; font-size: 12px; white-space:nowrap; }

.labw-what{ font-size: 12px; color: var(--labw-muted); }
`.trim();
}

/**
 * @typedef {{ dayId: string; start: string; end: string; title: string; note: string; }} Row
 */

/** @type {import('../schema.js').ToolDef} */
const tool = {
    schemaVersion: TOOL_SCHEMA_VERSION,
    id: 'schedule-builder',
    name: 'Schedule Builder',
    description: 'Generate a responsive HTML+CSS weekly schedule widget (updates in place).',
    icon: 'fa-solid fa-calendar-days',
    category: 'Widgets',
    supportsInsert: true,
    supportsUpdate: true,
    shortcut: 'Alt+6',
    keywords: 'schedule twitch vtuber stream weekly generator',
    order: 12,

    /** @param {HTMLElement} panel */
    render(panel) {
        /** @type {Row[]} */
        let rows = [
            { dayId: 'tue', start: '20:00', end: '22:00', title: 'Variety', note: '' },
            { dayId: 'thu', start: '19:30', end: '21:30', title: 'Collab Night', note: '' },
            { dayId: 'fri', start: '21:00', end: '23:30', title: 'Game Night', note: '' },
        ];

        panel.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-6">
          <div class="row g-2">
            <div class="col-12 col-md-6">
              <label class="form-label small">Title</label>
              <input id="sbTitle" class="form-control form-control-sm" value="Stream Schedule" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label small">Timezone label</label>
              <input id="sbTz" class="form-control form-control-sm" value="ET" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label small">Twitch username (optional)</label>
              <input id="sbTwitch" class="form-control form-control-sm" placeholder="crimsonstrife" />
            </div>
            <div class="col-12 col-md-6 d-flex align-items-end gap-2">
              <button id="sbAdd" class="btn btn-sm btn-outline-primary" type="button">Add slot</button>
              <button id="sbSort" class="btn btn-sm btn-outline-secondary" type="button">Sort</button>
              <button id="sbGen" class="btn btn-sm btn-outline-light" type="button">Generate</button>
            </div>
          </div>

          <div class="mt-3">
            <div class="small text-body-secondary mb-2">Slots</div>
            <div id="sbRows" class="d-flex flex-column gap-2"></div>
          </div>
        </div>

        <div class="col-12 col-lg-6">
          <label class="form-label small">HTML</label>
          <textarea id="sbHtml" class="form-control form-control-sm font-monospace" rows="9" readonly></textarea>

          <label class="form-label small mt-2">CSS</label>
          <textarea id="sbCss" class="form-control form-control-sm font-monospace" rows="9" readonly></textarea>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button id="sbInsertBoth" class="btn btn-sm btn-outline-primary" type="button">Insert both</button>
            <button id="sbInsertHtml" class="btn btn-sm btn-outline-light" type="button">Insert HTML</button>
            <button id="sbInsertCss" class="btn btn-sm btn-outline-light" type="button">Insert CSS</button>
            <button id="sbCopyHtml" class="btn btn-sm btn-outline-secondary" type="button">Copy HTML</button>
            <button id="sbCopyCss" class="btn btn-sm btn-outline-secondary" type="button">Copy CSS</button>
          </div>
        </div>
      </div>
    `;

        const elRows = /** @type {HTMLElement} */ (panel.querySelector('#sbRows'));
        const elTitle = /** @type {HTMLInputElement} */ (panel.querySelector('#sbTitle'));
        const elTz = /** @type {HTMLInputElement} */ (panel.querySelector('#sbTz'));
        const elTwitch = /** @type {HTMLInputElement} */ (panel.querySelector('#sbTwitch'));
        const elHtml = /** @type {HTMLTextAreaElement} */ (panel.querySelector('#sbHtml'));
        const elCss = /** @type {HTMLTextAreaElement} */ (panel.querySelector('#sbCss'));

        const renderRows = () => {
            elRows.innerHTML = '';

            rows.forEach((r, idx) => {
                const row = document.createElement('div');
                row.className = 'border rounded p-2';
                row.style.background = 'rgba(255,255,255,.03)';

                const top = document.createElement('div');
                top.className = 'row g-2';

                const colDay = document.createElement('div');
                colDay.className = 'col-12 col-md-3';

                const sel = document.createElement('select');
                sel.className = 'form-select form-select-sm';
                for (const d of DAYS) {
                    const o = document.createElement('option');
                    o.value = d.id;
                    o.textContent = d.name;
                    if (d.id === r.dayId) o.selected = true;
                    sel.appendChild(o);
                }
                sel.addEventListener('change', () => { rows[idx].dayId = sel.value; });

                colDay.appendChild(sel);

                const colStart = document.createElement('div');
                colStart.className = 'col-6 col-md-2';
                const start = document.createElement('input');
                start.type = 'time';
                start.className = 'form-control form-control-sm';
                start.value = r.start;
                start.addEventListener('input', () => { rows[idx].start = start.value; });
                colStart.appendChild(start);

                const colEnd = document.createElement('div');
                colEnd.className = 'col-6 col-md-2';
                const end = document.createElement('input');
                end.type = 'time';
                end.className = 'form-control form-control-sm';
                end.value = r.end;
                end.addEventListener('input', () => { rows[idx].end = end.value; });
                colEnd.appendChild(end);

                const colTitle = document.createElement('div');
                colTitle.className = 'col-12 col-md-4';
                const title = document.createElement('input');
                title.type = 'text';
                title.className = 'form-control form-control-sm';
                title.placeholder = 'Title (e.g., Variety, Collab, Horror…)';
                title.value = r.title;
                title.addEventListener('input', () => { rows[idx].title = title.value; });
                colTitle.appendChild(title);

                const colDel = document.createElement('div');
                colDel.className = 'col-12 col-md-1 d-flex';
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'btn btn-sm btn-outline-danger w-100';
                del.textContent = '✕';
                del.title = 'Remove';
                del.addEventListener('click', () => {
                    rows.splice(idx, 1);
                    renderRows();
                });
                colDel.appendChild(del);

                top.appendChild(colDay);
                top.appendChild(colStart);
                top.appendChild(colEnd);
                top.appendChild(colTitle);
                top.appendChild(colDel);

                const noteWrap = document.createElement('div');
                noteWrap.className = 'mt-2';
                const note = document.createElement('input');
                note.type = 'text';
                note.className = 'form-control form-control-sm';
                note.placeholder = 'Optional note (e.g., “Members Only”, “Collab w/ …”, “Subject to change”)';
                note.value = r.note;
                note.addEventListener('input', () => { rows[idx].note = note.value; });
                noteWrap.appendChild(note);

                row.appendChild(top);
                row.appendChild(noteWrap);
                elRows.appendChild(row);
            });
        };

        const generate = () => {
            const title = esc(elTitle.value || 'Stream Schedule');
            const tz = esc(elTz.value || 'ET');
            const twitch = (elTwitch.value || '').trim();

            /** @type {Record<string, Row[]>} */
            const byDay = Object.fromEntries(DAYS.map((d) => [d.id, []]));
            for (const r of rows) {
                if (!byDay[r.dayId]) continue;
                byDay[r.dayId].push(r);
            }

            // sort inside day by start time
            for (const d of DAYS) {
                byDay[d.id].sort((a, b) => (toMinutes(a.start) ?? 0) - (toMinutes(b.start) ?? 0));
            }

            const linkHtml = twitch
                ? `<a class="labw-link" href="https://twitch.tv/${esc(twitch)}" target="_blank" rel="noopener noreferrer">View on Twitch</a>`
                : '';

            const dayHtml = DAYS.map((d) => {
                const slots = byDay[d.id].length
                    ? byDay[d.id].map((r) => {
                        const s = toMinutes(r.start);
                        const e = toMinutes(r.end);
                        const time = (s != null && e != null) ? `${fmt12(s)}–${fmt12(e)}` : esc(`${r.start}–${r.end}`);
                        const title = esc(r.title || 'Stream');
                        const note = r.note ? ` <span class="labw-what" style="opacity:.85">(${esc(r.note)})</span>` : '';
                        return `<div class="labw-slot"><span class="labw-time">${time}</span><span class="labw-what">${title}</span>${note}</div>`;
                    }).join('')
                    : `<div class="labw-slot"><span class="labw-time">OFF</span><span class="labw-what">—</span></div>`;

                return `
  <div class="labw-day">
    <div class="labw-day__name">${d.name}</div>
    <div class="labw-day__slots">${slots}</div>
  </div>`.trim();
            }).join('\n');

            const html = `
<div class="labw-schedule">
  <div class="labw-schedule__header">
    <div class="labw-schedule__title">${title}</div>
    <div class="labw-schedule__meta">
      <span class="labw-pill">Times in ${tz}</span>
      ${linkHtml}
    </div>
  </div>

  <div class="labw-schedule__grid">
${dayHtml}
  </div>
</div>
`.trim();

            const htmlBody = `<!-- Schedule Builder -->\n${html}`;
            const cssBody = `/* Schedule Builder */\n${scheduleCss()}`;

            elHtml.value = buildMarkedSnippet({ kind: 'html', blockId: SCHEDULE_HTML_BLOCK, version: 1, body: htmlBody });
            elCss.value = buildMarkedSnippet({ kind: 'css', blockId: SCHEDULE_CSS_BLOCK, version: 1, body: cssBody });
        };

        panel.querySelector('#sbAdd')?.addEventListener('click', () => {
            rows.push({ dayId: 'mon', start: '19:00', end: '21:00', title: 'Stream', note: '' });
            renderRows();
        });

        panel.querySelector('#sbSort')?.addEventListener('click', () => {
            const dayIndex = Object.fromEntries(DAYS.map((d, i) => [d.id, i]));
            rows.sort((a, b) => {
                const da = dayIndex[a.dayId] ?? 999;
                const db = dayIndex[b.dayId] ?? 999;
                if (da !== db) return da - db;
                return (toMinutes(a.start) ?? 0) - (toMinutes(b.start) ?? 0);
            });
            renderRows();
        });

        panel.querySelector('#sbGen')?.addEventListener('click', generate);

        panel.querySelector('#sbInsertBoth')?.addEventListener('click', () => {
            if (!elHtml.value || !elCss.value) generate();
            // Recompute bodies for idempotent upsert.
            const htmlBody = elHtml.value.split('\n').slice(1, -2).join('\n');
            const cssBody = elCss.value.split('\n').slice(1, -2).join('\n');

            const cssRes = upsertMarkedSnippet(els.customCss, 'css', SCHEDULE_CSS_BLOCK, cssBody, 1);
            const htmlRes = upsertMarkedSnippet(els.customHtml, 'html', SCHEDULE_HTML_BLOCK, htmlBody, 1);

            const verb = cssRes.action === 'updated' || htmlRes.action === 'updated' ? 'Updated' : 'Inserted';
            setStatus('ok', `${verb} schedule HTML + CSS.`);
            if (els.autoUpdate?.checked) renderPreview();
        });

        panel.querySelector('#sbInsertHtml')?.addEventListener('click', () => {
            if (!elHtml.value) generate();
            const htmlBody = elHtml.value.split('\n').slice(1, -2).join('\n');
            const res = upsertMarkedSnippet(els.customHtml, 'html', SCHEDULE_HTML_BLOCK, htmlBody, 1);
            setStatus('ok', `${res.action === 'updated' ? 'Updated' : 'Inserted'} schedule HTML.`);
            if (els.autoUpdate?.checked) renderPreview();
        });

        panel.querySelector('#sbInsertCss')?.addEventListener('click', () => {
            if (!elCss.value) generate();
            const cssBody = elCss.value.split('\n').slice(1, -2).join('\n');
            const res = upsertMarkedSnippet(els.customCss, 'css', SCHEDULE_CSS_BLOCK, cssBody, 1);
            setStatus('ok', `${res.action === 'updated' ? 'Updated' : 'Inserted'} schedule CSS.`);
            if (els.autoUpdate?.checked) renderPreview();
        });

        panel.querySelector('#sbCopyHtml')?.addEventListener('click', async () => {
            if (!elHtml.value) generate();
            await copyToClipboard(elHtml.value.trimEnd() + '\n');
            setStatus('ok', 'Copied schedule HTML.');
        });

        panel.querySelector('#sbCopyCss')?.addEventListener('click', async () => {
            if (!elCss.value) generate();
            await copyToClipboard(elCss.value.trimEnd() + '\n');
            setStatus('ok', 'Copied schedule CSS.');
        });

        renderRows();
        generate();
    },
};

export default tool;