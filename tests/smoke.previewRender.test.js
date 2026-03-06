import { beforeEach, describe, expect, it } from 'vitest';
import { mountLabScaffold, resetLabState } from './scaffold.js';

describe('smoke: preview render', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetLabState();
    await mountLabScaffold();

    const { state } = await import('../src/ui/lab/runtime/state.js');
    state.baseCss = '/* base */\n.profile-page{padding:10px;}';
    state.baseBody = "<div class='profile-page'><div class='profile-custom-html'></div></div>";

    const { els } = await import('../src/ui/lab/runtime/dom.js');
    els.customCss.value = '.card{border:1px solid #123;}';
    els.customHtml.value = '<div class="x">Injected</div>';
    els.appendInstead.checked = false;
    els.enableMock.checked = false;
  });

  it('builds srcdoc and sets iframe srcdoc without throwing', async () => {
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
    expect(els.statusText.textContent).toMatch(/Rendered\./i);
  });
});
