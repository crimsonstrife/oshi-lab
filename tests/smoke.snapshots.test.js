import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountLabScaffold, resetLabState } from './scaffold.js';

vi.mock('../src/ui/lab/runtime/scripts/editors/index.js', () => ({
  initEditors: () => {},
  syncEditorsFromTextareas: () => {},
}));

vi.mock('../src/ui/lab/runtime/preview/render.js', () => ({
  renderPreview: vi.fn(),
}));

describe('smoke: snapshots save/load', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetLabState();
    await mountLabScaffold();

    const { els } = await import('../src/ui/lab/runtime/dom.js');
    els.autoUpdate.checked = false;
    els.customCss.value = '/* snap css */\n.card{border:1px solid #000;}';
    els.customHtml.value = '<div>snap html</div>';
    els.appendInstead.checked = true;
    els.enableMock.checked = true;
    els.mockDisplayName.value = 'Snap User';
    els.mockUsername.value = '@snap';
  });

  it('saves a snapshot to localStorage and can load it back', async () => {
    const { saveSnapshot, loadSnapshots, loadSnapshotById } = await import('../src/ui/lab/runtime/snapshots/index.js');
    const { els } = await import('../src/ui/lab/runtime/dom.js');

    // Stub prompt to provide a deterministic snapshot name.
    vi.stubGlobal('prompt', () => 'My Smoke Snapshot');

    saveSnapshot();

    const list = loadSnapshots();
    expect(list.length).toBeGreaterThan(0);
    const snap = list[0];
    expect(snap.name).toBe('My Smoke Snapshot');
    expect(els.snapshotSelect.querySelectorAll('option').length).toBeGreaterThan(1);

    // Wipe fields, then load.
    els.customCss.value = '';
    els.customHtml.value = '';
    els.appendInstead.checked = false;
    els.enableMock.checked = false;
    els.mockDisplayName.value = '';
    els.mockUsername.value = '';

    loadSnapshotById(snap.id);
    expect(els.customCss.value).toContain('snap css');
    expect(els.customHtml.value).toContain('snap html');
    expect(els.appendInstead.checked).toBe(true);
    expect(els.enableMock.checked).toBe(true);
    expect(els.mockDisplayName.value).toBe('Snap User');
    expect(els.mockUsername.value).toBe('@snap');
    expect(els.statusText.textContent).toMatch(/Loaded snapshot/i);
  });
});
