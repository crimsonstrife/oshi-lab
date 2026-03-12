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
    state.target = 'profile';
    state.activeTemplateId = 'fallback';
    state.baseMode = 'template';
    state.baseCss = '/* base */';
    state.baseBody = "<div class='profile-custom-html'></div>";

    const { els } = await import('../src/ui/lab/runtime/dom.js');
    els.autoUpdate.checked = false;
    els.customCss.value = `/* user css */
.card{border:1px solid red;}`;
    els.customHtml.value = '<div class="hello">Hello</div>';
    els.appendInstead.checked = false;
    els.enableMock.checked = true;
    els.mockDisplayName.value = 'Demo';
    els.mockUsername.value = '@demo';
    els.mockTagline.value = 'Tag';
    els.mockAvatar.value = 'https://example.com/a.png';
    els.mockBg.value = 'https://example.com/bg.png';
  });

  it('exports a valid bundle JSON and triggers a download for profile target', async () => {
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
      target: 'profile',
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

  it('exports a valid bundle JSON and includes the oshi-card target when selected', async () => {
    const { exportThemeBundle } = await import('../src/ui/lab/runtime/themeBundle.js');
    const dl = await import('../src/ui/lab/runtime/utils/download.js');
    const { state } = await import('../src/ui/lab/runtime/state.js');

    state.target = 'oshi-card';

    exportThemeBundle();

    expect(dl.downloadTextFile).toHaveBeenCalledTimes(1);
    const [, json] = dl.downloadTextFile.mock.calls[0];
    const obj = JSON.parse(json);
    expect(obj.target).toBe('oshi-card');
  });

  it('imports a bundle JSON via file input and applies it to the UI for profile target', async () => {
    const { els } = await import('../src/ui/lab/runtime/dom.js');
    const { state } = await import('../src/ui/lab/runtime/state.js');
    const { handleThemeBundleImport } = await import('../src/ui/lab/runtime/themeBundle.js');

    const bundle = {
      app: 'oshi-lab',
      schemaVersion: 1,
      appVersion: 'test',
      exportedAt: new Date().toISOString(),
      target: 'profile',
      templateId: 'myoshi-classic',
      baseMode: 'template',
      customCss: `/* user css */
.card{border:1px solid red;}`,
      customHtml: '<div class="hello">Hello</div>',
      appendInstead: false,
      autoUpdate: false,
      enableMock: true,
      mock: { displayName: '', username: '', tagline: '', avatar: '', bg: '' },
    };

    const file = {
      name: 'bundle.json',
      type: 'application/json',
      text: async () => JSON.stringify(bundle),
    };
    setFileInput(els.themeImportInput, file);

    expect(els.themeImportInput.files?.[0]).toBe(file);

    await handleThemeBundleImport();

    expect(state.target).toBe('profile');
    expect(els.customCss.value).toContain(`/* user css */
.card{border:1px solid red;}`);
    expect(els.customHtml.value).toContain('<div class="hello">Hello</div>');
    expect(els.appendInstead.checked).toBe(false);
    expect(els.autoUpdate.checked).toBe(false);
    expect(els.enableMock.checked).toBe(true);
    expect(els.previewFrame.title).toBe('MyOshi Profile Preview');
  });

  it('imports a bundle JSON via file input and applies target-aware OshiCard UI state', async () => {
    const { els } = await import('../src/ui/lab/runtime/dom.js');
    const { state } = await import('../src/ui/lab/runtime/state.js');
    const { handleThemeBundleImport } = await import('../src/ui/lab/runtime/themeBundle.js');

    const bundle = {
      app: 'oshi-lab',
      schemaVersion: 1,
      appVersion: 'test',
      exportedAt: new Date().toISOString(),
      target: 'oshi-card',
      templateId: 'oshi-card-core',
      baseMode: 'template',
      customCss: `/* oshi-card css */
.oshi-card-link{border-radius:999px;}`,
      customHtml: '<div class="card-hello">Card Hello</div>',
      appendInstead: false,
      autoUpdate: false,
      enableMock: true,
      mock: {
        displayName: 'Card Demo',
        username: '@carddemo',
        tagline: 'Link hub mode',
        avatar: '',
        bg: '',
      },
    };

    const file = {
      name: 'oshi-card-bundle.json',
      type: 'application/json',
      text: async () => JSON.stringify(bundle),
    };
    setFileInput(els.themeImportInput, file);

    await handleThemeBundleImport();

    expect(state.target).toBe('oshi-card');
    expect(localStorage.getItem('myoshi_theme_lab_target')).toBe('oshi-card');
    expect(els.customCss.value).toContain('.oshi-card-link{border-radius:999px;}');
    expect(els.customHtml.value).toContain('Card Hello');
    expect(els.previewFrame.title).toBe('OshiCard Preview');
    expect(els.templateInput.placeholder).toContain('OshiCard preview HTML');
    expect(els.customHtml.placeholder).toContain('.oshi-card-custom-html');
    expect(document.getElementById('mockDataSummary')?.textContent).toBe('Mock OshiCard Data');
    expect(document.getElementById('btnToggleMobile')?.textContent).toBe('Card Width');
    expect(document.getElementById('btnTargetOshiCard')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('btnTargetProfile')?.classList.contains('active')).toBe(false);
  });
});
