// @ts-check

import { els } from '../../dom.js';
import { setStatus } from '../../status.js';
import { state } from '../../state.js';
import { renderPreview } from '../../preview/render.js';
import { buildSelectorReport } from '../../utils/selectorEngine.js';
import { enablePickMode } from '../../preview/picker.js';
import { upsertMarkedSnippet } from '../../utils/snippets.js';
import { TOOL_SCHEMA_VERSION } from '../schema.js';

/** @param {string} s */
function fnv1a6(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).slice(0, 6);
}

/** @param {Element} el */
function elementLabel(el) {
  const tag = (el.tagName || '').toLowerCase();
  const id = el.getAttribute('id');
  const cls = Array.from(el.classList || []).slice(0, 3).join('.');
  const bits = [tag || 'div'];
  if (id) bits.push(`#${id}`);
  if (cls) bits.push(`.${cls}`);
  return bits.join('');
}

/** @param {string} kind @param {string} selectorText */
function defaultBlockId(kind, selectorText) {
  return `pick/${kind}/${fnv1a6(selectorText || kind)}`;
}

/** @returns {any|null} */
function getToolsModal() {
  // Prefer the modal instance created by runtime/tools; fallback to Bootstrap lookup.
  // @ts-ignore
  return state.toolsModal || window.bootstrap?.Modal?.getInstance?.(document.getElementById('toolsModal')) || null;
}

/** @type {import('../schema.js').ToolDef} */
const tool = {
  schemaVersion: TOOL_SCHEMA_VERSION,
  id: 'selector-inspector',
  name: 'Selector Inspector',
  description: 'Pick elements from the preview and generate robust selectors (supports :has + sibling anchors).',
  icon: 'fa-solid fa-location-crosshairs',
  category: 'Utilities',
  supportsInsert: true,
  supportsUpdate: true,
  shortcut: 'Alt+8',
  keywords: 'selector inspector pick highlight has nth sibling section hide collapse',
  order: 35,

  /** @type {Array<ReturnType<typeof enablePickMode>>} */
  _pickHandles: [],

  /** @type {ReturnType<typeof enablePickMode> | null} */
  _highlightHandle: null,

  /** @type {HTMLElement | null} */
  _pickHudEl: null,

  destroy() {
    try {
      for (const h of tool._pickHandles || []) {
        try {
          h?.disable?.();
        } catch {}
      }
    } catch {}
    tool._pickHandles = [];

    try {
      tool._highlightHandle?.disable?.();
    } catch {}
    tool._highlightHandle = null;

    try {
      tool._pickHudEl?.remove?.();
    } catch {}
    tool._pickHudEl = null;



    // Restore any click-through overrides we may have applied during pick mode.
    try {
      const toolsEl = document.getElementById('toolsModal');
      if (toolsEl && toolsEl instanceof HTMLElement) toolsEl.style.removeProperty('pointer-events');
    } catch {}

    try {
      for (const bd of Array.from(document.querySelectorAll('.modal-backdrop'))) {
        if (bd instanceof HTMLElement) bd.style.removeProperty('pointer-events');
      }
    } catch {}
    // If we were mid-pick (tools modal temporarily hidden), allow normal cleanup again.
    state.toolsSuspendCleanup = false;
  },

  /** @param {HTMLElement} panel */
  render(panel) {
    panel.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <div class="d-flex align-items-center gap-2">
            <button id="siPick" class="btn btn-sm btn-primary" type="button">
              <i class="fa-solid fa-mouse-pointer"></i> Pick from preview
            </button>
            <button id="siStop" class="btn btn-sm btn-outline-secondary" type="button" disabled>Stop</button>
          </div>

          <div class="mt-3 border rounded p-2">
            <div class="small fw-semibold mb-1">Options</div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="siAllowHas" checked>
              <label class="form-check-label small" for="siAllowHas">Allow <code>:has()</code> anchors</label>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="siAllowNth" checked>
              <label class="form-check-label small" for="siAllowNth">Allow <code>:nth-of-type()</code> fallback</label>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="siAllowStyle">
              <label class="form-check-label small" for="siAllowStyle">Allow <code>[style*="..."]</code> (brittle)</label>
            </div>

            <div class="form-check mt-2">
              <input class="form-check-input" type="checkbox" id="siAddToGroup">
              <label class="form-check-label small" for="siAddToGroup">Add picks to selector group (comma-separated)</label>
            </div>
          </div>

          <div class="mt-3 border rounded p-2">
            <div class="small fw-semibold mb-1">Section Target</div>
            <select id="siSectionTarget" class="form-select form-select-sm"></select>
            <div class="form-text">Used for “hide/collapse section” actions.</div>
          </div>

          <div class="mt-3 border rounded p-2">
            <div class="small fw-semibold mb-1">Block ID</div>
            <input id="siBlockId" class="form-control form-control-sm font-monospace" value="${defaultBlockId('rule', 'default')}" />
            <div class="form-check mt-2">
              <input class="form-check-input" type="checkbox" id="siForceNew">
              <label class="form-check-label small" for="siForceNew">Force new copy (don’t update existing block)</label>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-7">
          <div class="border rounded p-2">
            <div class="d-flex justify-content-between align-items-center">
              <div class="small fw-semibold">Selected Element</div>
              <div id="siMatchInfo" class="small text-body-secondary"></div>
            </div>
            <div id="siSelSummary" class="small font-monospace text-body-secondary mt-1">(none)</div>
          </div>

          <div class="mt-3">
            <div class="small fw-semibold mb-1">Candidate Selectors</div>
            <div id="siCandidates" class="list-group"></div>
          </div>

          <div class="mt-3">
            <label class="form-label small">Output (selector group)</label>
            <textarea id="siOut" class="form-control form-control-sm font-monospace" rows="8" readonly></textarea>

            <div class="d-flex flex-wrap gap-2 mt-2">
              <button id="siInsertRule" class="btn btn-sm btn-outline-primary" type="button">Insert rule stub</button>
              <button id="siInsertHide" class="btn btn-sm btn-outline-danger" type="button">Hide section</button>
              <button id="siInsertCollapse" class="btn btn-sm btn-outline-warning" type="button">Collapse section</button>
              <button id="siHighlight" class="btn btn-sm btn-outline-secondary" type="button">Highlight matches</button>
              <button id="siClear" class="btn btn-sm btn-outline-secondary" type="button">Clear group</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const btnPick = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#siPick'));
    const btnStop = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#siStop'));
    const allowHas = /** @type {HTMLInputElement|null} */ (panel.querySelector('#siAllowHas'));
    const allowNth = /** @type {HTMLInputElement|null} */ (panel.querySelector('#siAllowNth'));
    const allowStyle = /** @type {HTMLInputElement|null} */ (panel.querySelector('#siAllowStyle'));
    const addToGroup = /** @type {HTMLInputElement|null} */ (panel.querySelector('#siAddToGroup'));
    const sectionSel = /** @type {HTMLSelectElement|null} */ (panel.querySelector('#siSectionTarget'));
    const blockId = /** @type {HTMLInputElement|null} */ (panel.querySelector('#siBlockId'));
    const forceNew = /** @type {HTMLInputElement|null} */ (panel.querySelector('#siForceNew'));
    const summary = /** @type {HTMLElement|null} */ (panel.querySelector('#siSelSummary'));
    const candidatesEl = /** @type {HTMLElement|null} */ (panel.querySelector('#siCandidates'));
    const out = /** @type {HTMLTextAreaElement|null} */ (panel.querySelector('#siOut'));
    const matchInfo = /** @type {HTMLElement|null} */ (panel.querySelector('#siMatchInfo'));
    const btnInsertRule = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#siInsertRule'));
    const btnInsertHide = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#siInsertHide'));
    const btnInsertCollapse = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#siInsertCollapse'));
    const btnHighlight = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#siHighlight'));
    const btnClear = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#siClear'));

    if (
      !btnPick ||
      !btnStop ||
      !allowHas ||
      !allowNth ||
      !allowStyle ||
      !addToGroup ||
      !sectionSel ||
      !blockId ||
      !forceNew ||
      !summary ||
      !candidatesEl ||
      !out ||
      !matchInfo ||
      !btnInsertRule ||
      !btnInsertHide ||
      !btnInsertCollapse ||
      !btnHighlight ||
      !btnClear
    )
      return;

    /** @type {string[]} */
    let groupSelectors = [];

    /** @type {null | { report: ReturnType<typeof buildSelectorReport>, activeSelector: string }} */
    let current = null;

    /** @type {Map<string,string>} */
    const sectionBest = new Map();

    const setOutput = () => {
      out.value = groupSelectors.join(',\n');
    };

    const ensureDefaultBlockId = (kind) => {
      const v = (blockId.value || '').trim();
      if (!v) {
        blockId.value = defaultBlockId(kind, groupSelectors.join('|') || current?.activeSelector || '');
        return;
      }
      // If it looks like an auto id, keep it auto-updating.
      if (/^pick\/(rule|hide|collapse)\/[0-9a-f]{6}$/i.test(v)) {
        blockId.value = defaultBlockId(kind, groupSelectors.join('|') || current?.activeSelector || '');
      }
    };

    const renderCandidates = () => {
      candidatesEl.innerHTML = '';
      matchInfo.textContent = '';

      const report = current?.report;
      if (!report || !report.candidates.length) {
        candidatesEl.innerHTML = `<div class="text-body-secondary small">No candidates yet. Click “Pick from preview”.</div>`;
        return;
      }

      for (const c of report.candidates) {
        const flags = [
          c.flags.usesHas ? ':has' : '',
          c.flags.usesSibling ? 'sibling' : '',
          c.flags.usesNth ? 'nth' : '',
          c.flags.usesStyleContains ? 'style*' : '',
        ].filter(Boolean);

        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML = `
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div class="min-w-0">
              <div class="font-monospace small text-break">${c.selector}</div>
              <div class="small text-body-secondary">
                matches: <span class="badge text-bg-dark">${c.matchCount}</span>
                ${flags.length ? ` <span class="badge text-bg-secondary">${flags.join(' • ')}</span>` : ''}
              </div>
            </div>
            <div class="text-body-secondary small">score ${Math.round(c.score)}</div>
          </div>
        `;

        item.onclick = () => {
          current = { report, activeSelector: c.selector };

          if (addToGroup.checked) {
            if (!groupSelectors.includes(c.selector)) groupSelectors.push(c.selector);
          } else {
            groupSelectors = [c.selector];
          }

          setOutput();
          matchInfo.textContent = `root: ${report.rootSelector}`;
          ensureDefaultBlockId('rule');
        };

        candidatesEl.appendChild(item);
      }
    };

    const renderSectionTargets = () => {
      sectionSel.innerHTML = '';

      if (!current?.report) {
        const opt = document.createElement('option');
        opt.value = 'none';
        opt.textContent = '(pick an element first)';
        sectionSel.appendChild(opt);
        return;
      }

      for (const t of current.report.sectionTargets) {
        const opt = document.createElement('option');
        opt.value = t.label;
        opt.textContent = t.label;
        sectionSel.appendChild(opt);
      }
    };

    const computeOpts = () => ({
      allowHas: !!allowHas.checked,
      allowNth: !!allowNth.checked,
      allowStyleContains: !!allowStyle.checked,
      maxCandidates: 6,
      maxDepth: 7,
    });

    /** @param {Document} doc @param {Element} el */
    const applyReport = (doc, el) => {
      summary.textContent = `${elementLabel(el)}`;
      const report = buildSelectorReport(doc, el, computeOpts());

      current = { report, activeSelector: report.candidates[0]?.selector || '' };

      // Precompute “best” selectors for section targets (for hide/collapse actions)
      sectionBest.clear();
      for (const t of report.sectionTargets) {
        const r = buildSelectorReport(doc, t.element, { ...computeOpts(), maxCandidates: 3, maxDepth: 6 });
        const best = r.candidates[0]?.selector || '';
        if (best) sectionBest.set(t.label, best);
      }

      // Default output to the best candidate (single selector)
      if (report.candidates[0]?.selector) {
        groupSelectors = [report.candidates[0].selector];
        setOutput();
      }

      matchInfo.textContent = `root: ${report.rootSelector}`;
      renderCandidates();
      renderSectionTargets();
      ensureDefaultBlockId('rule');

      setStatus('ok', `Picked: ${elementLabel(el)} • candidates: ${report.candidates.length}`);
    };

    // ------------------ pick mode infra ------------------
    // Make any leftover modal/backdrop click-through while picking. Bootstrap sometimes leaves a backdrop
    // in place for the fade transition, which can silently intercept clicks to the iframe.
    /** @type {Map<HTMLElement, string>} */
    const backdropPrev = new Map();
    let toolsModalPrevPointer = '';

    /** @param {boolean} on */
    const setModalPassthrough = (on) => {
      const toolsEl = document.getElementById('toolsModal');
      if (toolsEl && toolsEl instanceof HTMLElement) {
        if (on) {
          toolsModalPrevPointer = toolsEl.style.pointerEvents || '';
          toolsEl.style.pointerEvents = 'none';
        } else {
          toolsEl.style.pointerEvents = toolsModalPrevPointer || '';
        }
      }

      const backdrops = Array.from(document.querySelectorAll('.modal-backdrop'));
      for (const bd of backdrops) {
        if (!(bd instanceof HTMLElement)) continue;
        if (on) {
          if (!backdropPrev.has(bd)) backdropPrev.set(bd, bd.style.pointerEvents || '');
          bd.style.pointerEvents = 'none';
        } else {
          bd.style.pointerEvents = backdropPrev.get(bd) || '';
        }
      }

      if (!on) backdropPrev.clear();
    };


    let picking = false;

    /** @type {{ frame: HTMLIFrameElement, fn: (ev: Event)=>void }[]} */
    const loadBinds = [];

    /** @type {(e: KeyboardEvent)=>void | null} */
    let escHandler = null;

    const removeHud = () => {
      try {
        tool._pickHudEl?.remove?.();
      } catch {}
      tool._pickHudEl = null;
    };

    const showHud = () => {
      removeHud();

      const hud = document.createElement('div');
      hud.className =
        'position-fixed top-0 start-50 translate-middle-x mt-3 px-3 py-2 bg-dark text-white rounded shadow d-flex align-items-center gap-3';
      hud.style.zIndex = '1091'; // above backdrop (1050) and most UI
      hud.innerHTML = `
        <div class="small">
          <span class="fw-semibold">Pick mode:</span> click an element in the preview (main or pop-out). <span class="opacity-75">(Esc to cancel)</span>
        </div>
        <button type="button" class="btn btn-sm btn-outline-light" id="oshiPickCancel">Cancel</button>
      `;
      document.body.appendChild(hud);
      tool._pickHudEl = hud;

      const btn = /** @type {HTMLButtonElement|null} */ (hud.querySelector('#oshiPickCancel'));
      if (btn) btn.onclick = () => stopPicking(true, 'Cancelled.');
    };

    /** Disable all pick handles and unbind load listeners. */
    const disablePickInfra = () => {
      for (const b of loadBinds.splice(0, loadBinds.length)) {
        try {
          b.frame.removeEventListener('load', b.fn);
        } catch {}
      }

      for (const h of tool._pickHandles.splice(0, tool._pickHandles.length)) {
        try {
          h?.disable?.();
        } catch {}
      }

      if (escHandler) {
        try {
          window.removeEventListener('keydown', escHandler, true);
        } catch {}
        escHandler = null;
      }
    };

    /**
     * Stops pick mode.
     * @param {boolean} reopenModal
     * @param {string} [msg]
     */
    const stopPicking = (reopenModal, msg) => {
      disablePickInfra();
      removeHud();
      picking = false;

      btnStop.disabled = true;
      btnPick.disabled = false;

      // Restore normal tools modal cleanup behavior.
      state.toolsSuspendCleanup = false;
      setModalPassthrough(false);

      if (reopenModal) {
        const modal = getToolsModal();
        try {
          modal?.show?.();
        } catch {}
      }

      if (msg) setStatus('ok', msg);
    };

    /** @returns {HTMLIFrameElement[]} */
    const pickFrames = () => {
      /** @type {HTMLIFrameElement[]} */
      const frames = [];
      if (els.previewFrame) frames.push(els.previewFrame);

      // If a pop-out preview exists, allow picking there too.
      try {
        const w = state.previewPopoutWin;
        if (w && !w.closed) {
          const f = w.document.getElementById('fullPreviewFrame');
          if (f && f.tagName === 'IFRAME') frames.push(/** @type {HTMLIFrameElement} */ (f));
        }
      } catch {}

      return frames;
    };

    /** @param {HTMLIFrameElement} frame */
    const armFrame = (frame) => {
      const tryEnable = () => {
        const h = enablePickMode(frame, {
          onPick: (el) => {
            if (!picking) return;
            try {
              const doc = el.ownerDocument;
              applyReport(doc, el);
            } catch {}
            stopPicking(true);
          },
        });
        if (h) tool._pickHandles.push(h);
        return h;
      };

      // Try now, otherwise arm a one-shot retry on iframe load.
      try {
        if (tryEnable()) return;
      } catch {}

      const onLoad = () => {
        if (!picking) return;
        try {
          if (tryEnable()) {
            frame.removeEventListener('load', onLoad);
          }
        } catch {}
      };

      frame.addEventListener('load', onLoad);
      loadBinds.push({ frame, fn: onLoad });
    };

    const startPicking = () => {
      if (picking) return;

      // Clear any previous session
      stopPicking(false);

      // Guard: iframe must be accessible (sandbox must include allow-same-origin)
      if (!els.previewFrame?.contentDocument) {
        setStatus('warn', 'Preview not accessible. Ensure the preview iframe uses sandbox="allow-same-origin".');
        return;
      }

      picking = true;
      btnStop.disabled = false;
      btnPick.disabled = true;

      // Temporarily hide the tools modal so the user can click the preview beneath it.
      // IMPORTANT: runtime/tools/index.js must skip destroy() when toolsSuspendCleanup is true.
      state.toolsSuspendCleanup = true;
      const modal = getToolsModal();
      try {
        modal?.hide?.();
      } catch {}
      // Ensure any leftover backdrop can't block clicks to the iframe.
      setModalPassthrough(true);
      // Bootstrap fade timing can vary; re-apply on the next tick.
      setTimeout(() => setModalPassthrough(true), 0);

      showHud();

      // Esc cancels pick mode
      escHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          stopPicking(true, 'Cancelled.');
        }
      };
      window.addEventListener('keydown', escHandler, true);

      const frames = pickFrames();
      if (!frames.length) {
        stopPicking(true, 'No preview frames available.');
        return;
      }

      for (const f of frames) armFrame(f);

      setStatus('info', 'Pick mode enabled. Click an element in the preview.');
    };

    btnPick.onclick = startPicking;
    btnStop.onclick = () => stopPicking(true, 'Stopped.');

    // ------------------ actions ------------------

    btnClear.onclick = () => {
      groupSelectors = [];
      setOutput();
      matchInfo.textContent = '';
      setStatus('ok', 'Cleared selector group.');
    };

    btnHighlight.onclick = () => {
      const sel = current?.activeSelector || groupSelectors[0];
      if (!sel) {
        setStatus('warn', 'No selector to highlight.');
        return;
      }

      const doc = els.previewFrame?.contentDocument;
      if (!doc) {
        setStatus('warn', 'Preview not accessible (iframe may be sandboxed without allow-same-origin).');
        return;
      }

      // Prefer an active pick handle if present (it already has highlight helpers).
      const hLive = tool._pickHandles?.[0] || null;
      const h = hLive || tool._highlightHandle;

      if (!h && els.previewFrame) {
        const created = enablePickMode(els.previewFrame, {});
        if (!created) {
          setStatus('warn', 'Unable to highlight (preview frame not accessible).');
          return;
        }
        // Disable listeners immediately; keep highlight helpers alive.
        created.disable();
        tool._highlightHandle = created;
      }

      try {
        const handle = hLive || tool._highlightHandle;
        const res = handle?.highlight?.(sel) || { count: 0 };
        setStatus('ok', `Highlighted ${res.count} match(es).`);
      } catch {
        setStatus('warn', 'Highlight failed (selector may be unsupported).');
      }
    };

    /** @param {'css'} kind @param {string} id @param {string} body @param {number} v */
    const upsert = (kind, id, body, v) => {
      const res = upsertMarkedSnippet(els.customCss, kind, id, body, v, { forceNewCopy: !!forceNew.checked });
      setStatus('ok', `${res.action === 'updated' ? 'Updated' : 'Inserted'} "${id}".`);
      if (els.autoUpdate?.checked) renderPreview();
    };

    btnInsertRule.onclick = () => {
      const combined = groupSelectors.join(',\n');
      if (!combined) {
        setStatus('warn', 'No selector selected.');
        return;
      }

      ensureDefaultBlockId('rule');
      const id = (blockId.value || '').trim() || defaultBlockId('rule', combined);
      const body = `${combined} {\n  /* TODO: add styles */\n}\n`;
      upsert('css', id, body, 1);
    };

    /** @param {'hide'|'collapse'} mode */
    const insertSectionAction = (mode) => {
      const label = sectionSel.value || 'Element';
      const sel = sectionBest.get(label) || groupSelectors[0] || current?.activeSelector || '';
      if (!sel) {
        setStatus('warn', 'No selector available for the selected section target.');
        return;
      }

      ensureDefaultBlockId(mode);
      const id = (blockId.value || '').trim() || defaultBlockId(mode, sel);

      const body =
        mode === 'hide'
          ? `${sel} {\n  display: none !important;\n}\n`
          : `${sel} {\n  max-height: 0 !important;\n  overflow: hidden !important;\n  padding: 0 !important;\n  margin: 0 !important;\n}\n`;

      upsert('css', id, body, 1);
    };

    btnInsertHide.onclick = () => insertSectionAction('hide');
    btnInsertCollapse.onclick = () => insertSectionAction('collapse');

    // initial state
    setOutput();
    renderCandidates();
    renderSectionTargets();
  },
};

export default tool;
