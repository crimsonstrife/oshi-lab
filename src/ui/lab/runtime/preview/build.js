// @ts-check

import { state } from '../state.js';
import { els } from '../dom.js';

function buildBodyWithInjection() {
  let working = state.baseBody || "<div class='profile-custom-html'></div>";

  const doc = new DOMParser().parseFromString('<body>' + working + '</body>', 'text/html');
  const bodyEl = doc.body;

  const custom = els.customHtml?.value || '';
  const placeholder = bodyEl.querySelector('.profile-custom-html');

  if (els.appendInstead?.checked) {
    const wrapper = doc.createElement('div');
    wrapper.className = 'profile-custom-html';
    wrapper.innerHTML = custom;
    bodyEl.appendChild(wrapper);
  } else if (placeholder) {
    placeholder.innerHTML = custom;
  } else {
    const wrapper = doc.createElement('div');
    wrapper.className = 'profile-custom-html';
    wrapper.innerHTML = custom;
    bodyEl.appendChild(wrapper);
  }

  // Mock replacement pass
  if (els.enableMock?.checked) {
    const displayName = els.mockDisplayName?.value.trim() || '';
    const username = els.mockUsername?.value.trim() || '';
    const tagline = els.mockTagline?.value.trim() || '';
    const avatar = els.mockAvatar?.value.trim() || '';
    const bg = els.mockBg?.value.trim() || '';

    if (displayName) {
      const el = bodyEl.querySelector('.profile-display-name');
      if (el) el.textContent = displayName;
    }
    if (username) {
      const el = bodyEl.querySelector('.profile-username');
      if (el) el.textContent = username;
      const headerUser = bodyEl.querySelector('.card-header.hearted span');
      if (headerUser) headerUser.textContent = `${username.replace(/^@/, '')}'s Groups`;
    }
    if (tagline) {
      const el = bodyEl.querySelector('.profile-tagline');
      if (el) el.textContent = tagline;
    }
    if (avatar) {
      const img = bodyEl.querySelector('img.profile-avatar');
      if (img) img.setAttribute('src', avatar);
    }
    if (bg) {
      const page = bodyEl.querySelector('.profile-page');
      if (page) {
        const style = page.getAttribute('style') || '';
        const cleaned = style.replace(/background-image\s*:\s*url\([^)]+\)\s*;?/i, '').trim();
        const spacer = cleaned && !cleaned.endsWith(';') ? ';' : '';
        page.setAttribute('style', `${cleaned}${spacer} background-image: url('${bg}');`);
      }
    }
  }

  return bodyEl.innerHTML;
}

export function buildSrcdoc() {
  const base = state.baseCss || '/* Base CSS is empty. Paste a MyOshi preview srcdoc → Extract Base to get started. */';
  const css = `${base}\n\n/* ===== User Custom CSS (appended) ===== */\n${els.customCss?.value || ''}`;
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
