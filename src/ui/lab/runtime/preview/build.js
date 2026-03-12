// @ts-check

import { state } from '../state.js';
import { els } from '../dom.js';
import { getTargetConfig } from '../targets.js';

function pickLargestMount(bodyEl, selector) {
  const nodes = [...bodyEl.querySelectorAll(selector)];
  let best = null;
  let bestLen = -1;
  for (const n of nodes) {
    const len = (n.innerHTML || '').trim().length;
    if (len > bestLen) {
      best = n;
      bestLen = len;
    }
  }
  return best;
}

function buildBodyWithInjection() {
  const cfg = getTargetConfig(state.target);
  const mountClass = cfg.customHtmlMount.replace(/^\./, '');
  let working = state.baseBody || `<div class="${mountClass}"></div>`;

  const doc = new DOMParser().parseFromString(`<body>${working}</body>`, 'text/html');
  const bodyEl = doc.body;

  const custom = els.customHtml?.value || '';
  const placeholder = pickLargestMount(bodyEl, cfg.customHtmlMount) || bodyEl.querySelector(cfg.customHtmlMount);

  if (els.appendInstead?.checked) {
    const wrapper = doc.createElement('div');
    wrapper.className = mountClass;
    wrapper.innerHTML = custom;
    bodyEl.appendChild(wrapper);
  } else if (placeholder) {
    placeholder.innerHTML = custom;
  } else {
    const wrapper = doc.createElement('div');
    wrapper.className = mountClass;
    wrapper.innerHTML = custom;
    bodyEl.appendChild(wrapper);
  }

  if (els.enableMock?.checked) {
    const displayName = els.mockDisplayName?.value.trim() || '';
    const username = els.mockUsername?.value.trim() || '';
    const tagline = els.mockTagline?.value.trim() || '';
    const avatar = els.mockAvatar?.value.trim() || '';
    const bg = els.mockBg?.value.trim() || '';

    if (displayName) {
      const el = bodyEl.querySelector(cfg.displayNameSelector);
      if (el) el.textContent = displayName;
    }
    if (username) {
      const el = bodyEl.querySelector(cfg.usernameSelector);
      if (el) el.textContent = username;
      if (state.target === 'profile') {
        const headerUser = bodyEl.querySelector('.card-header.hearted span');
        if (headerUser) headerUser.textContent = `${username.replace(/^@/, '')}'s Groups`;
      }
    }
    if (tagline) {
      const el = bodyEl.querySelector(cfg.taglineSelector);
      if (el) el.textContent = tagline;
    }
    if (avatar) {
      const img = bodyEl.querySelector(cfg.avatarSelector);
      if (img) img.setAttribute('src', avatar);
    }
    if (bg) {
      const root = bodyEl.querySelector(cfg.bgTargetSelector);
      if (root) {
        const style = root.getAttribute('style') || '';
        const cleaned = style.replace(/background-image\s*:\s*url\([^)]+\)\s*;?/ig, '').trim();
        const prefix = cleaned ? `${cleaned}${cleaned.endsWith(';') ? ' ' : '; '}` : '';
        root.setAttribute('style', `${prefix}background-image: url('${bg}'); background-size: cover; background-position: center top; background-repeat: no-repeat;`);
      }
    }
  }

  return bodyEl.innerHTML;
}

export function buildSrcdoc() {
  const base = state.baseCss || '/* Base CSS is empty. Paste a preview srcdoc → Extract Base to get started. */';
  const css = `${base}

/* ===== User Custom CSS (appended) ===== */
${els.customCss?.value || ''}`;
  const body = buildBodyWithInjection();

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>`;
}
