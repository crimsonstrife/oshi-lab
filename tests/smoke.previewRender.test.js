import { beforeEach, describe, expect, it } from 'vitest';
import { mountLabScaffold, resetLabState } from './scaffold.js';

describe('smoke: preview render', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetLabState();
    await mountLabScaffold();

    const { state } = await import('../src/ui/lab/runtime/state.js');
    state.target = 'profile';
    state.baseCss = `/* base */
.profile-page{padding:10px;}`;
    state.baseBody = "<div class='profile-page'><div class='profile-custom-html'></div></div>";

    const { els } = await import('../src/ui/lab/runtime/dom.js');
    els.customCss.value = '.card{border:1px solid #123;}';
    els.customHtml.value = '<div class="x">Injected</div>';
    els.appendInstead.checked = false;
    els.enableMock.checked = false;
  });

  it('builds srcdoc and sets iframe srcdoc without throwing for profile target', async () => {
    const { renderPreview } = await import('../src/ui/lab/runtime/preview/render.js');
    const { state } = await import('../src/ui/lab/runtime/state.js');
    const { els } = await import('../src/ui/lab/runtime/dom.js');

    expect(() => renderPreview()).not.toThrow();

    expect(state.lastBuildSrcdoc).toContain('<!doctype html>');
    expect(state.lastBuildSrcdoc).toContain('/* base */');
    expect(state.lastBuildSrcdoc).toContain('/* ===== User Custom CSS (appended) ===== */');
    expect(state.lastBuildSrcdoc).toContain('Injected');
    expect(els.previewFrame.getAttribute('sandbox')).toContain('allow-same-origin');
    expect(els.previewFrame.srcdoc).toContain('Injected');
    expect(els.previewFrame.title).toBe('MyOshi Profile Preview');
    expect(els.statusText.textContent).toMatch(/Rendered Profile Lab/i);
  });

  it('builds srcdoc and sets iframe srcdoc without throwing for oshi-card target', async () => {
    const { renderPreview } = await import('../src/ui/lab/runtime/preview/render.js');
    const { state } = await import('../src/ui/lab/runtime/state.js');
    const { els } = await import('../src/ui/lab/runtime/dom.js');

    state.target = 'oshi-card';
    state.baseCss = `/* card base */
.oshi-card-root{padding:12px;}`;
    state.baseBody = "<div class='oshi-card-root'><div class='oshi-card-container oshi-card-custom-css'><div class='oshi-card-custom-html'></div></div></div>";
    els.customCss.value = '.oshi-card-link{letter-spacing:.04em;}';
    els.customHtml.value = '<div class="card-html">Card Injected</div>';

    expect(() => renderPreview()).not.toThrow();

    expect(state.lastBuildSrcdoc).toContain('<!doctype html>');
    expect(state.lastBuildSrcdoc).toContain('/* card base */');
    expect(state.lastBuildSrcdoc).toContain('oshi-card-root');
    expect(state.lastBuildSrcdoc).toContain('Card Injected');
    expect(els.previewFrame.getAttribute('sandbox')).toContain('allow-same-origin');
    expect(els.previewFrame.srcdoc).toContain('Card Injected');
    expect(els.previewFrame.title).toBe('OshiCard Preview');
    expect(els.statusText.textContent).toMatch(/Rendered OshiCard Lab/i);
  });
});
