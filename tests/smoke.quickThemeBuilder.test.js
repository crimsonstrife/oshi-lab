import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountLabScaffold, resetLabState } from './scaffold.js';

// Tool can call clipboard; keep it inert.
vi.mock('../src/ui/lab/runtime/utils/clipboard.js', () => ({
  copyToClipboard: vi.fn(async () => {}),
}));

// Tool can call preview render if autoUpdate is enabled; keep it inert.
vi.mock('../src/ui/lab/runtime/preview/render.js', () => ({
  renderPreview: vi.fn(),
}));

describe('smoke: quick theme builder insert/update', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetLabState();
    await mountLabScaffold();

    const { els } = await import('../src/ui/lab/runtime/dom.js');
    els.autoUpdate.checked = false;
    els.customCss.value = '';
  });

  it('inserts a marked snippet once and updates it in place on re-apply', async () => {
    const toolMod = await import('../src/ui/lab/runtime/tools/defs/quickThemeBuilder.tool.js');
    const tool = toolMod.default;

    const panel = document.createElement('div');
    tool.render(panel);

    const insertBtn = panel.querySelector('#qtInsert');
    expect(insertBtn).toBeTruthy();

    insertBtn.click();

    const { els } = await import('../src/ui/lab/runtime/dom.js');
    const first = els.customCss.value;
    expect(first).toMatch(/oshilab:begin\s+block=quick-theme\b/i);
    expect(first.match(/oshilab:begin\s+block=quick-theme\b/gi)?.length).toBe(1);

    // Change a palette value and re-apply.
    const primaryText = panel.querySelector('#qtPrimaryText');
    expect(primaryText).toBeTruthy();
    primaryText.value = '#ff0000';
    primaryText.dispatchEvent(new Event('change'));

    insertBtn.click();
    const updated = els.customCss.value;

    // Still one block, and it reflects the update.
    expect(updated.match(/oshilab:begin\s+block=quick-theme\b/gi)?.length).toBe(1);
    expect(updated).toContain('--vs-blue: #ff0000;');

    // Sanity: begin/end markers present.
    expect(updated).toMatch(/oshilab:end\s+block=quick-theme/i);
  });
});
