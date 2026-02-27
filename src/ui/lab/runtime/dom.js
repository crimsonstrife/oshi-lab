// @ts-check

/**
 * An object containing references to various DOM elements used in the application.
 * Each property represents a specific type of element or setting related to the UI or functionality.
 * Properties are initialized as `null` and can refer to corresponding DOM elements.
 *
 * Properties:
 * - `templateInput` - A textarea for inputting templates.
 * - `customCss` - A textarea for inputting custom CSS styles.
 * - `customHtml` - A textarea for inputting custom HTML content.
 * - `basePeek` - A textarea for displaying or editing base peek content.
 *
 * - `statusText` - An HTML element for displaying status messages.
 * - `templateInfo` - An HTML element for displaying template-related information.
 *
 * - `previewFrame` - An iframe for previewing content.
 * - `frameShell` - An HTML element serving as a container for the preview frame.
 *
 * - `autoUpdate` - A checkbox input controlling automatic updates.
 * - `appendInstead` - A checkbox input controlling whether content is appended instead of replaced.
 *
 * - `enableMock` - A checkbox input toggling mock data features.
 * - `mockDisplayName` - An input for specifying the mock display name.
 * - `mockUsername` - An input for specifying the mock username.
 * - `mockTagline` - An input for specifying the mock tagline.
 * - `mockAvatar` - An input for specifying the mock avatar URL.
 * - `mockBg` - An input for specifying the mock background URL.
 *
 * - `snapshotSelect` - A dropdown select element for managing snapshots.
 *
 * - `zoomRange` - A range input controlling zoom level.
 * - `zoomLabel` - An HTML element displaying the current zoom level.
 * - `heightRange` - A range input controlling height adjustments.
 * - `heightLabel` - An HTML element displaying the current height value.
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

  // Audit
  /** @type {HTMLInputElement|null} */
  auditContrastToggle: null,
  /** @type {HTMLElement|null} */
  auditSummary: null,
  /** @type {HTMLElement|null} */
  auditOutput: null,
  /** @type {HTMLElement|null} */
  auditBadge: null,
};

/**
 * Refreshes the elements by retrieving and reassigning DOM elements to the `els` object properties.
 *
 * @return {Object} The updated `els` object containing references to various DOM elements.
 */
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

  // Audit
  els.auditContrastToggle = /** @type {HTMLInputElement|null} */ (document.getElementById('auditContrastToggle'));
  els.auditSummary = document.getElementById('auditSummary');
  els.auditOutput = document.getElementById('auditOutput');
  els.auditBadge = document.getElementById('auditBadge');

  return els;
}

/**
 * Attaches an event listener to a DOM element with the specified ID.
 *
 * @param {string} id - The ID of the DOM element to which the event listener will be attached.
 * @param {string} event - The name of the event to listen for (e.g., 'click', 'change').
 * @param {Function} handler - The function to execute when the event is triggered.
 * @return {void}
 */
export function on(id, event, handler) {
  const node = document.getElementById(id);
  if (node) { // @ts-ignore
      node.addEventListener(event, handler);
  }
}
