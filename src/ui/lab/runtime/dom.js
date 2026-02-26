// @ts-check

/**
 * Centralized DOM element cache.
 * Call refreshEls() after the lab markup is injected.
 */
export const els = {
  /** @type {HTMLTextAreaElement|null} */
  templateInput: null,
  /** @type {HTMLTextAreaElement|null} */
  customCss: null,
  /** @type {HTMLTextAreaElement|null} */
  customHtml: null,
  /** @type {HTMLTextAreaElement|null} */
  basePeek: null,

  /** @type {HTMLElement|null} */
  statusText: null,
  /** @type {HTMLElement|null} */
  templateInfo: null,

  /** @type {HTMLIFrameElement|null} */
  previewFrame: null,
  /** @type {HTMLElement|null} */
  frameShell: null,

  /** @type {HTMLInputElement|null} */
  autoUpdate: null,
  /** @type {HTMLInputElement|null} */
  appendInstead: null,

  /** @type {HTMLInputElement|null} */
  enableMock: null,
  /** @type {HTMLInputElement|null} */
  mockDisplayName: null,
  /** @type {HTMLInputElement|null} */
  mockUsername: null,
  /** @type {HTMLInputElement|null} */
  mockTagline: null,
  /** @type {HTMLInputElement|null} */
  mockAvatar: null,
  /** @type {HTMLInputElement|null} */
  mockBg: null,

  /** @type {HTMLSelectElement|null} */
  snapshotSelect: null,

  /** @type {HTMLInputElement|null} */
  zoomRange: null,
  /** @type {HTMLElement|null} */
  zoomLabel: null,
  /** @type {HTMLInputElement|null} */
  heightRange: null,
  /** @type {HTMLElement|null} */
  heightLabel: null,
};

export function refreshEls() {
  // Editors
  els.templateInput = /** @type {HTMLTextAreaElement|null} */ (document.getElementById("templateInput"));
  els.customCss = /** @type {HTMLTextAreaElement|null} */ (document.getElementById("customCss"));
  els.customHtml = /** @type {HTMLTextAreaElement|null} */ (document.getElementById("customHtml"));
  els.basePeek = /** @type {HTMLTextAreaElement|null} */ (document.getElementById("basePeek"));

  // Status & info
  els.statusText = document.getElementById("statusText");
  els.templateInfo = document.getElementById("templateInfo");

  // Preview
  els.previewFrame = /** @type {HTMLIFrameElement|null} */ (document.getElementById("previewFrame"));
  els.frameShell = document.getElementById("frameShell");

  // Options
  els.autoUpdate = /** @type {HTMLInputElement|null} */ (document.getElementById("autoUpdate"));
  els.appendInstead = /** @type {HTMLInputElement|null} */ (document.getElementById("appendInstead"));

  // Mock
  els.enableMock = /** @type {HTMLInputElement|null} */ (document.getElementById("enableMock"));
  els.mockDisplayName = /** @type {HTMLInputElement|null} */ (document.getElementById("mockDisplayName"));
  els.mockUsername = /** @type {HTMLInputElement|null} */ (document.getElementById("mockUsername"));
  els.mockTagline = /** @type {HTMLInputElement|null} */ (document.getElementById("mockTagline"));
  els.mockAvatar = /** @type {HTMLInputElement|null} */ (document.getElementById("mockAvatar"));
  els.mockBg = /** @type {HTMLInputElement|null} */ (document.getElementById("mockBg"));

  // Snapshots
  els.snapshotSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById("snapshotSelect"));

  // Preview controls
  els.zoomRange = /** @type {HTMLInputElement|null} */ (document.getElementById("zoomRange"));
  els.zoomLabel = document.getElementById("zoomLabel");
  els.heightRange = /** @type {HTMLInputElement|null} */ (document.getElementById("heightRange"));
  els.heightLabel = document.getElementById("heightLabel");

  return els;
}

/** @param {string} id @param {string} event @param {(ev:any)=>void} handler */
export function on(id, event, handler) {
  const node = document.getElementById(id);
  if (node) node.addEventListener(event, handler);
}
