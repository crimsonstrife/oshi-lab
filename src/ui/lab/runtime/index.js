// @ts-check

import { refreshEls } from './dom.js';
import { applyPreviewSizing } from './preview/sizing.js';
import { loadTemplatesIndex } from './templates/index.js';
import { loadSnapshots } from './snapshots/index.js';
import { initTools } from './tools/index.js';
import { bindUI } from './bindings.js';

export async function initLabRuntime() {
  refreshEls();

  // UI first so early user interactions are handled.
  bindUI();

  loadSnapshots();
  applyPreviewSizing();

  await loadTemplatesIndex();

  initTools();
}
