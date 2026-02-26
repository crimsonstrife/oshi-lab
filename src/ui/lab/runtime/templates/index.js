// @ts-check

import { state } from '../state.js';
import { els } from '../dom.js';
import { setStatus } from '../status.js';
import { summarizeBase } from '../utils/format.js';
import { renderPreview } from '../preview/render.js';

const TEMPLATES_URL = new URL('../data/templates.json', import.meta.url).toString();

function templateFallbackIndex() {
  return [{
    id: 'fallback',
    name: 'Fallback (offline)',
    description: 'Minimal template embedded as a fallback when templates.json can’t be fetched.',
    baseCss: ":root{--vs-border:#2a3d5e;--vs-bg-white:#0f1622;--vs-text:#e7eefc} .profile-page{min-height:100vh;padding:18px;color:var(--vs-text);background:#0b0f17} .card{border:1px solid var(--vs-border);border-radius:12px;padding:12px;background:var(--vs-bg-white)}",
    baseBody: "<div class='profile-page profile-custom-css'><div class='card'><div class='profile-custom-html'></div></div></div>",
    mockDefaults: { displayName: 'Demo User', username: '@demo', tagline: '', avatar: '', background: '' },
  }];
}

function getPreloadedTemplates() {
  try {
    // provided by initLab.ts
    const preloaded = window.__MYOSHI_LAB_TEMPLATES__;
    return Array.isArray(preloaded) ? preloaded : null;
  } catch {
    return null;
  }
}

function populateTemplateSelect() {
  const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('templateSelect'));
  if (!sel) return;

  sel.innerHTML = state.templatesIndex.map((t) => {
    const label = t.name || t.id;
    const desc = t.description ? ` — ${t.description}` : '';
    return `<option value="${encodeURIComponent(t.id)}">${label}${desc}</option>`;
  }).join('');

  sel.value = encodeURIComponent(state.activeTemplateId || state.templatesIndex[0]?.id || 'fallback');
}

function updateTemplateInfo(template) {
  if (!els.templateInfo) return;
  els.templateInfo.textContent = template?.description || 'Built-in template';
}

function applyMockDefaults(template) {
  if (!template?.mockDefaults) return;
  const d = template.mockDefaults;

  if (els.mockDisplayName && !els.mockDisplayName.value) els.mockDisplayName.value = d.displayName || '';
  if (els.mockUsername && !els.mockUsername.value) els.mockUsername.value = d.username || '';
  if (els.mockTagline && !els.mockTagline.value) els.mockTagline.value = d.tagline || '';
  if (els.mockAvatar && !els.mockAvatar.value) els.mockAvatar.value = d.avatar || '';
  if (els.mockBg && !els.mockBg.value) els.mockBg.value = d.background || '';
}

/** @param {string} id */
export function loadTemplateById(id) {
  const template = state.templatesById.get(id);
  if (!template) {
    setStatus('warn', 'Template not found: ' + id);
    return;
  }

  state.activeTemplateId = id;
  localStorage.setItem('myoshi_theme_lab_template_id', id);

  state.baseCss = (template.baseCss || '').trim();
  state.baseBody = (template.baseBody || '').trim();

  applyMockDefaults(template);
  if (els.basePeek) els.basePeek.value = summarizeBase(state.baseCss, state.baseBody);
  updateTemplateInfo(template);

  setStatus('ok', `Template loaded: ${template.name || template.id}. Start editing Custom CSS/HTML. Import a real MyOshi preview via Template Input → Extract Base.`);
  if (els.autoUpdate?.checked) renderPreview();

  const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('templateSelect'));
  if (sel) sel.value = encodeURIComponent(id);
}

export async function loadTemplatesIndex() {
  const preloaded = getPreloadedTemplates();

  if (preloaded && preloaded.length) {
    state.templatesIndex = preloaded;
  } else {
    try {
      const res = await fetch(TEMPLATES_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.templatesIndex = Array.isArray(data?.templates) ? data.templates : [];
      if (!state.templatesIndex.length) state.templatesIndex = templateFallbackIndex();
    } catch {
      state.templatesIndex = templateFallbackIndex();
    }
  }

  state.templatesById = new Map(state.templatesIndex.map((t) => [t.id, t]));
  populateTemplateSelect();

  const last = localStorage.getItem('myoshi_theme_lab_template_id');
  const initial = (last && state.templatesById.has(last)) ? last : (state.templatesIndex[0]?.id || 'fallback');
  loadTemplateById(initial);
}
