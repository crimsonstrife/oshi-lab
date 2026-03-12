// @ts-check

const initialTarget = (() => {
  try {
    const v = localStorage.getItem('myoshi_theme_lab_target');
    return v === 'oshi-card' ? 'oshi-card' : 'profile';
  } catch {
    return 'profile';
  }
})();

export const state = {
  /** @type {import('./targets.js').LabTarget} */
  target: initialTarget,
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
  /** @type {{ open?: Function, setActive?: (id:string)=>void, refresh?: ()=>void } | null} */
  toolsApi: null,
  /** @type {any} */
  onboardingModal: null,
  /** @type {number|null} */
  debounceTimer: null,
  /** @type {any|null} */
  lastAuditReport: null,
};

try {
  // @ts-ignore
  window.__OSHI_LAB_TARGET__ = state.target;
} catch {}
