// @ts-check

/**
 * Shared mutable runtime state.
 * Keeping it centralized makes cross-module behavior predictable.
 */
export const state = {
  /** @type {string} */
  baseCss: "",
  /** @type {string} */
  baseBody: "",
  /** @type {'template'|'extracted'} */
  baseMode: 'template',
  /** @type {{css:string, body:string, capturedAt:string}|null} */
  extractedBase: null,
  /** @type {string} */
  lastBuildSrcdoc: "",
  /** @type {boolean} */
  mobileMode: false,

  /** @type {number} */
  previewScale: 1,
  /** @type {number} */
  previewMinHeightPx: 1080,

  /** @type {Array<any>} */
  templatesIndex: [],
  /** @type {Map<string, any>} */
  templatesById: new Map(),
  /** @type {string|null} */
  activeTemplateId: null,

  /** @type {any} */
  toolsModal: null,

  /** @type {number|null} */
  debounceTimer: null,

  /** @type {any|null} */
  lastAuditReport: null,
};
