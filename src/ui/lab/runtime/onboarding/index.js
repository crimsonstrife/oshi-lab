// @ts-check

import { state } from '../state.js';
import { els } from '../dom.js';
import { setStatus } from '../status.js';

const LS_KEY = 'myoshi_theme_lab_onboarding_seen_v1';

/**
 * Ensure a Bootstrap modal instance exists.
 * @returns {any|null}
 */
function ensureOnboardingModal() {
  const el = document.getElementById('onboardingModal');
  const Modal = window.bootstrap?.Modal;
  if (!el || !Modal) return null;
  if (!state.onboardingModal) state.onboardingModal = new Modal(el, { focus: true, backdrop: 'static' });
  return state.onboardingModal;
}

/**
 * Show onboarding modal.
 * @param {{ force?: boolean }} [opts]
 */
export function showOnboarding(opts = {}) {
  const force = !!opts.force;
  if (!force) {
    try {
      if (localStorage.getItem(LS_KEY) === '1') return;
    } catch {}
  }

  const modal = ensureOnboardingModal();
  if (!modal) {
    setStatus('warn', 'Onboarding unavailable (Bootstrap not loaded).');
    return;
  }
  // @ts-ignore
  modal.show();
}

/**
 * Programmatically switch editor tab.
 * @param {'template'|'customCss'|'customHtml'|'audit'|'basePeek'} tab
 */
function selectTab(tab) {
  const btn = /** @type {HTMLElement|null} */ (document.querySelector(`.tab[data-tab="${tab}"]`));
  btn?.click?.();
}

function focusCss() {
  try {
    // @ts-ignore
    state.editors?.css?.focus?.();
  } catch {}
  try {
    els.customCss?.focus?.();
  } catch {}
}

/**
 * Apply selected onboarding path.
 * @param {'template'|'builder'|'paste'} path
 */
function applyPath(path) {
  // Mark as seen once the user takes an action.
  try {
    localStorage.setItem(LS_KEY, '1');
  } catch {}

  // Close modal
  try {
    // @ts-ignore
    state.onboardingModal?.hide?.();
  } catch {}

  if (path === 'template') {
    document.getElementById('btnResetCustom')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('btnLoadDemo')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    selectTab('customCss');
    focusCss();
    setStatus('ok', 'Loaded a starter template. Start by editing Custom CSS (or open Tools for helpers).');
    return;
  }

  if (path === 'builder') {
    document.getElementById('btnResetCustom')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    selectTab('customCss');
    // Open Tools with Quick Theme Builder selected.
    // @ts-ignore
    state.toolsApi?.setActive?.('quick-theme');
    // @ts-ignore
    state.toolsApi?.open?.();
    setStatus('ok', 'Quick Theme Builder opened. Pick a preset and tweak a few values to get a full starter theme.');
    return;
  }

  // paste existing
  selectTab('customCss');
  focusCss();

  // Open Tools with Scope Fixer selected.
  // @ts-ignore
  state.toolsApi?.setActive?.('scope-fixer');
  // @ts-ignore
  state.toolsApi?.open?.();

  setStatus(
    'ok',
    'Paste your existing CSS/HTML into the editors, then run Scope Fixer (Tools) and Audit (Audit tab) to catch common issues.'
  );
}

/**
 * Initialize onboarding UI.
 */
export function initOnboarding() {
  // Bind start/reset button
  const btn = document.getElementById('btnOnboarding');
  if (btn) {
    btn.addEventListener('click', () => {
      try {
        localStorage.removeItem(LS_KEY);
      } catch {}
      showOnboarding({ force: true });
    });
  }

  const root = document.getElementById('onboardingModal');
  if (!root) return;

  // Mark as seen when dismissed.
  root.addEventListener('hidden.bs.modal', () => {
    try {
      localStorage.setItem(LS_KEY, '1');
    } catch {}
  });

  root.addEventListener('click', (e) => {
    const el = /** @type {HTMLElement|null} */ (e.target)?.closest?.('[data-onboard]');
    if (!el) return;
    const key = String(el.getAttribute('data-onboard') || '').trim();
    if (key === 'template' || key === 'builder' || key === 'paste') {
      applyPath(/** @type {any} */ (key));
    }
  });

  // First visit
  showOnboarding();
}
