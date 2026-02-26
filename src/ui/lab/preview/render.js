// @ts-check

import { state } from '../state.js';
import { els } from '../dom.js';
import { setStatus } from '../status.js';
import { buildSrcdoc } from './build.js';
import { applyPreviewSizing } from './sizing.js';

export function renderPreview() {
  if (!state.baseCss && !state.baseBody) {
    setStatus('warn', 'No base extracted yet. Paste template → Extract Base.');
    return;
  }

    const srcdoc = buildSrcdoc();
    state.lastBuildSrcdoc = srcdoc;

    const f = els.previewFrame;
    if (f) {
        f.setAttribute('sandbox', 'allow-same-origin');
        f.setAttribute('referrerpolicy', 'no-referrer');
        f.srcdoc = srcdoc;
    }

    applyPreviewSizing();

  setStatus(
    'ok',
    `Rendered. Base CSS: ${state.baseCss.length.toLocaleString()} chars • Base body: ${state.baseBody.length.toLocaleString()} chars • Custom CSS: ${(els.customCss?.value || '').length.toLocaleString()} chars • Custom HTML: ${(els.customHtml?.value || '').length.toLocaleString()} chars`
  );
}
