import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountLabScaffold, resetLabState, setFileInput } from './scaffold.js';

// Avoid pulling in CodeMirror during tests.
vi.mock('../src/ui/lab/runtime/scripts/editors/index.js', () => ({
  initEditors: () => {},
  syncEditorsFromTextareas: () => {},
}));

// Capture exports instead of performing real downloads.
vi.mock('../src/ui/lab/runtime/utils/download.js', () => ({
  downloadTextFile: vi.fn(),
  downloadFile: vi.fn(),
}));

// Avoid template module complexity (import.meta.env, fetch) during these smoke tests.
vi.mock('../src/ui/lab/runtime/templates/index.js', () => ({
  loadTemplateById: vi.fn(async (id) => {
    const { state } = await import('../src/ui/lab/runtime/state.js');
    state.activeTemplateId = id;
    state.baseMode = 'template';
    // Keep a minimal base so preview/build paths remain sane if called.
    state.baseCss ||= '/* base */';
    state.baseBody ||= "<div class='profile-custom-html'></div>";
  }),
}));

// Import path is used by applyThemeBundle when autoUpdate is on. Keep it inert.
vi.mock('../src/ui/lab/runtime/preview/render.js', () => ({
  renderPreview: vi.fn(),
}));

describe('smoke: export/import theme bundle', () => {
  beforeEach(async () => {
    const dl = await import('../src/ui/lab/runtime/utils/download.js');
    dl.downloadTextFile.mockReset();
    localStorage.clear();
    await resetLabState();
    await mountLabScaffold();

    const { state } = await import('../src/ui/lab/runtime/state.js');
    state.activeTemplateId = 'fallback';
    state.baseMode = 'template';
    state.baseCss = '/* base */';
    state.baseBody = "<div class='profile-custom-html'></div>";

    const { els } = await import('../src/ui/lab/runtime/dom.js');
    els.autoUpdate.checked = false;
    els.customCss.value = '/* user css */\n.card{border:1px solid red;}';
    els.customHtml.value = '<div class="hello">Hello</div>';
    els.appendInstead.checked = false;
    els.enableMock.checked = true;
    els.mockDisplayName.value = 'Demo';
    els.mockUsername.value = '@demo';
    els.mockTagline.value = 'Tag';
    els.mockAvatar.value = 'https://example.com/a.png';
    els.mockBg.value = 'https://example.com/bg.png';
  });

  it('exports a valid bundle JSON and triggers a download', async () => {
    const { exportThemeBundle } = await import('../src/ui/lab/runtime/themeBundle.js');
    const dl = await import('../src/ui/lab/runtime/utils/download.js');

    exportThemeBundle();

    expect(dl.downloadTextFile).toHaveBeenCalledTimes(1);
    const [, json, mime] = dl.downloadTextFile.mock.calls[0];
    expect(mime).toContain('application/json');

    const obj = JSON.parse(json);
    expect(obj).toMatchObject({
      app: 'oshi-lab',
      schemaVersion: 1,
      templateId: 'fallback',
      baseMode: 'template',
      appendInstead: false,
      enableMock: true,
    });
    expect(obj.customCss).toContain('.card');
    expect(obj.customHtml).toContain('Hello');
    expect(obj.mock.username).toBe('@demo');

    const { els } = await import('../src/ui/lab/runtime/dom.js');
    expect(els.statusText.textContent).toMatch(/Exported theme bundle/i);
  });

  it('imports a bundle JSON via file input and applies it to the UI', async () => {
    const { els } = await import('../src/ui/lab/runtime/dom.js');
    const { handleThemeBundleImport } = await import('../src/ui/lab/runtime/themeBundle.js');

    const bundle = {
      app: 'oshi-lab',
      schemaVersion: 1,
      appVersion: 'test',
      exportedAt: new Date().toISOString(),
      templateId: 'myoshi-classic',
      baseMode: 'template',
      customCss: '/* user css */\n.card{border:1px solid red;}',
      customHtml: '<div class="hello">Hello</div>',
      appendInstead: false,
      autoUpdate: false,
      enableMock: true,
      mock: { displayName: '', username: '', tagline: '', avatar: '', bg: '' },
    };

    const file = new File([JSON.stringify(bundle)], 'bundle.json', { type: 'application/json' });
    setFileInput(els.themeImportInput, file);

    expect(els.themeImportInput.files?.[0]).toBe(file);

    await handleThemeBundleImport();

    expect(els.customCss.value).toContain('/* user css */\n.card{border:1px solid red;}');
    expect(els.customHtml.value).toContain('<div class="hello">Hello</div>');
    expect(els.appendInstead.checked).toBe(false);
    expect(els.autoUpdate.checked).toBe(false);
    expect(els.enableMock.checked).toBe(true);
  });
});
