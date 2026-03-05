// @ts-check

/**
 * Preview Picker
 * Attaches hover/pick listeners inside the preview iframe (srcdoc, allow-same-origin).
 */

/** @typedef {{ onPick?:(el:Element, ev:Event)=>void, onHover?:(el:Element|null)=>void }} PickHandlers */

const STYLE_ID = 'oshi-picker-style';
const HOVER_CLASS = 'oshi-picker-hover';
const MATCH_CLASS = 'oshi-picker-match';
const ROOT_CLASS = 'oshi-picker-active';

/** @param {Document} doc */
function ensureStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html.${ROOT_CLASS}, html.${ROOT_CLASS} * { cursor: crosshair !important; }
    .${HOVER_CLASS} { outline: 2px solid rgba(255, 80, 160, .95) !important; outline-offset: 2px !important; }
    .${MATCH_CLASS} { outline: 2px dashed rgba(80, 180, 255, .95) !important; outline-offset: 2px !important; }
  `;
  doc.head?.appendChild(style);
}

/** @param {Element|null} el @param {string} cls @param {boolean} on */
function setClass(el, cls, on) {
  if (!el) return;
  try {
    el.classList.toggle(cls, on);
  } catch {}
}

/** @param {Event} ev */
function eventTargetElement(ev) {
  const t = /** @type {any} */ (ev.target);
  return t instanceof Element ? t : null;
}

/**
 * Enable pick mode inside an iframe.
 *
 * NOTE: Requires iframe sandbox to include `allow-same-origin`.
 *
 * Uses Pointer Events when available (more reliable than click on some elements),
 * and falls back to mouse events.
 *
 * @param {HTMLIFrameElement} frame
 * @param {PickHandlers} handlers
 * @returns {{ disable:()=>void, highlight:(selector:string)=>{count:number}, clearHighlights:()=>void } | null}
 */
export function enablePickMode(frame, handlers = {}) {
  const doc = frame?.contentDocument;
  if (!doc) return null;

  ensureStyle(doc);
  doc.documentElement?.classList.add(ROOT_CLASS);

  /** @type {Element|null} */
  let hoverEl = null;

  /** @type {Element[]} */
  let matchEls = [];

  const clearHover = () => {
    setClass(hoverEl, HOVER_CLASS, false);
    hoverEl = null;
    handlers.onHover?.(null);
  };

  /** @param {Event} ev */
  const onMove = (ev) => {
    const t = eventTargetElement(ev);
    if (!t || t === hoverEl) return;

    setClass(hoverEl, HOVER_CLASS, false);
    hoverEl = t;
    setClass(hoverEl, HOVER_CLASS, true);
    handlers.onHover?.(hoverEl);
  };

  /** @param {Event} ev */
  const onPick = (ev) => {
    // Prevent in-preview handlers (links, buttons, etc.) from triggering.
    try {
      // @ts-ignore
      ev.preventDefault?.();
      // @ts-ignore
      ev.stopPropagation?.();
      // @ts-ignore
      ev.stopImmediatePropagation?.();
    } catch {}

    const t = eventTargetElement(ev);
    if (!t) return;

    handlers.onPick?.(t, ev);
  };

  const highlight = (selector) => {
    // clear old
    for (const el of matchEls) setClass(el, MATCH_CLASS, false);
    matchEls = [];

    let count = 0;
    try {
      const els = Array.from(doc.querySelectorAll(selector));
      for (const el of els) setClass(el, MATCH_CLASS, true);
      matchEls = /** @type {Element[]} */ (els);
      count = matchEls.length;
    } catch {
      count = 0;
    }
    return { count };
  };

  const clearHighlights = () => {
    for (const el of matchEls) setClass(el, MATCH_CLASS, false);
    matchEls = [];
  };

  // capture phase so we beat any in-preview handlers
  const usePointer = typeof doc.defaultView?.PointerEvent !== 'undefined';

  if (usePointer) {
    doc.addEventListener('pointermove', onMove, true);
    // pointerdown is more reliable than click for picking
    doc.addEventListener('pointerdown', onPick, true);
  } else {
    doc.addEventListener('mousemove', onMove, true);
    doc.addEventListener('click', onPick, true);
  }

  const disable = () => {
    if (usePointer) {
      doc.removeEventListener('pointermove', onMove, true);
      doc.removeEventListener('pointerdown', onPick, true);
    } else {
      doc.removeEventListener('mousemove', onMove, true);
      doc.removeEventListener('click', onPick, true);
    }
    clearHover();
    clearHighlights();
    doc.documentElement?.classList.remove(ROOT_CLASS);
  };

  return { disable, highlight, clearHighlights };
}
