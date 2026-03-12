// @ts-nocheck

import { state } from '../state.js';
import { els } from '../dom.js';
import { setStatus } from '../status.js';
import { summarizeBase } from '../utils/format.js';
import { renderPreview } from '../preview/render.js';
import { targetStorageKey, getTargetConfig } from '../targets.js';

const DATA_BASE = `${import.meta.env.BASE_URL}data/`;
const TEMPLATES_URL = `${import.meta.env.BASE_URL}data/templates.json`;
const templateCodeCache = new Map();

function templateFallbackIndex() {
  return [
    {
      id: 'fallback-profile',
      target: 'profile',
      name: 'Fallback Profile (offline)',
      description: 'Minimal profile template embedded as a fallback when templates.json can’t be fetched.',
      baseCss: ":root{--vs-border:#2a3d5e;--vs-bg-white:#0f1622;--vs-text:#e7eefc} .profile-page{min-height:100vh;padding:18px;color:var(--vs-text);background:#0b0f17} .card{border:1px solid var(--vs-border);border-radius:12px;padding:12px;background:var(--vs-bg-white)}",
      baseBody: "<div class='profile-page profile-custom-css'><div class='card'><div class='profile-custom-html'></div></div></div>",
      mockDefaults: { displayName: 'Demo User', username: '@demo', tagline: '', avatar: '', background: '' },
    },
    {
      id: 'fallback-oshi-card',
      target: 'oshi-card',
      name: 'Fallback OshiCard (offline)',
      description: 'Minimal OshiCard template embedded as a fallback when templates.json can’t be fetched.',
      baseCss: ":root{--vs-border:#d7deea;--vs-bg-white:#ffffff;--vs-text:#223} body{margin:0} .oshi-card-root{min-height:100vh;padding:24px 0;background:#eef3fb} .oshi-card-container{max-width:480px;margin:0 auto;padding:0 16px} .card{border:1px solid var(--vs-border);border-radius:16px;padding:14px;background:var(--vs-bg-white)} .oshi-card-link{display:flex;justify-content:center;padding:12px;border-radius:999px;background:#336699;color:#fff;text-decoration:none}",
      baseBody: "<div class='oshi-card-root'><div class='oshi-card-container oshi-card-custom-css'><div class='card oshi-card-section'><div class='card-body'><div class='oshi-card-identity'><h1 class='oshi-card-name'>Demo Card</h1><p class='oshi-card-username'>@demo</p><p class='oshi-card-headline'>Card headline</p></div></div></div><div class='oshi-card-custom-html'></div><div class='oshi-card-links'><a href='#' class='oshi-card-link'>Link</a></div></div></div>",
      mockDefaults: { displayName: 'Demo Card', username: '@demo', tagline: 'Card headline', avatar: '', background: '' },
    },
  ];
}

function getPreloadedTemplates() {
  try {
    const preloaded = window.__MYOSHI_LAB_TEMPLATES__;
    return Array.isArray(preloaded) ? preloaded : null;
  } catch {
    return null;
  }
}

export function getTemplatesForTarget(target = state.target) {
  const wanted = target === 'oshi-card' ? 'oshi-card' : 'profile';
  return (state.templatesIndex || []).filter((t) => (t?.target || 'profile') === wanted);
}

function populateTemplateSelect() {
  const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('templateSelect'));
  if (!sel) return;

  const visible = getTemplatesForTarget();
  sel.innerHTML = visible.map((t) => {
    const label = t.name || t.id;
    const desc = t.description ? ` — ${t.description}` : '';
    return `<option value="${encodeURIComponent(t.id)}">${label}${desc}</option>`;
  }).join('');

  sel.value = encodeURIComponent(state.activeTemplateId || visible[0]?.id || '');
}

export function refreshTemplateSelect() {
  populateTemplateSelect();
}

function updateTemplateInfo(template) {
  if (!els.templateInfo) return;
  const cfg = getTargetConfig(state.target);
  els.templateInfo.textContent = template?.description || cfg.templateInfoFallback;
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

function resolveDataUrl(path) {
  const cleaned = String(path || '').trim().replace(/^\/+/, '');
  return `${DATA_BASE}${cleaned}`;
}

async function ensureTemplateCodeLoaded(template) {
  if ((template.baseCss && template.baseBody) || (!template.baseCssFile && !template.baseBodyFile)) return;

  if (!templateCodeCache.has(template.id)) {
    const p = (async () => {
      const cssUrl = template.baseCssFile ? resolveDataUrl(template.baseCssFile) : null;
      const bodyUrl = template.baseBodyFile ? resolveDataUrl(template.baseBodyFile) : null;
      const [css, body] = await Promise.all([
        cssUrl ? fetch(cssUrl, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(`CSS HTTP ${r.status} for ${cssUrl}`); return r.text(); }) : Promise.resolve(''),
        bodyUrl ? fetch(bodyUrl, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(`HTML HTTP ${r.status} for ${bodyUrl}`); return r.text(); }) : Promise.resolve(''),
      ]);
      return { css, body };
    })();
    templateCodeCache.set(template.id, p);
  }

  const { css, body } = await templateCodeCache.get(template.id);
  template.baseCss = (template.baseCss || css || '').trim();
  template.baseBody = (template.baseBody || body || '').trim();
}

export async function loadTemplateById(id) {
  const template = state.templatesById.get(id);
  if (!template) {
    setStatus('warn', 'Template not found: ' + id);
    return;
  }

  const templateTarget = template?.target || 'profile';
  state.target = templateTarget === 'oshi-card' ? 'oshi-card' : 'profile';
  window.__OSHI_LAB_TARGET__ = state.target;
  localStorage.setItem('myoshi_theme_lab_target', state.target);

  setStatus('ok', `Loading template: ${template.name || template.id}…`);
  try {
    await ensureTemplateCodeLoaded(template);
  } catch {
    setStatus('warn', `Failed to load template files for ${template.id}. Using what’s available.`);
  }

  state.activeTemplateId = id;
  localStorage.setItem(targetStorageKey(state.target), id);
  state.baseMode = 'template';
  state.baseCss = (template.baseCss || '').trim();
  state.baseBody = (template.baseBody || '').trim();

  applyMockDefaults(template);
  if (els.basePeek) els.basePeek.value = summarizeBase(state.baseCss, state.baseBody);
  updateTemplateInfo(template);
  populateTemplateSelect();

  setStatus('ok', `Template loaded: ${template.name || template.id}. Start editing Custom CSS/HTML. Import a real preview via Template Input → Extract Base.`);
  if (els.autoUpdate?.checked) renderPreview();
}

export async function loadTemplateForCurrentTarget(preferredId = null) {
  const visible = getTemplatesForTarget();
  if (!visible.length) {
    setStatus('warn', `No templates available for ${state.target}.`);
    return;
  }

  const last = localStorage.getItem(targetStorageKey(state.target));
  const visibleIds = new Set(visible.map((t) => t.id));
  const chosen = preferredId && visibleIds.has(preferredId)
    ? preferredId
    : (last && visibleIds.has(last) ? last : visible[0].id);

  populateTemplateSelect();
  await loadTemplateById(chosen);
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
  await loadTemplateForCurrentTarget();
}
