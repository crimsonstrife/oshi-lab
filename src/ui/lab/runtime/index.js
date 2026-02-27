// @ts-check

import { refreshEls } from './dom.js';
import { applyPreviewSizing } from './preview/sizing.js';
import { loadTemplatesIndex } from './templates/index.js';
import { loadSnapshots } from './snapshots/index.js';
import { initTools } from './tools/index.js';
import { bindUI } from './bindings.js';

/**
 * Initializes the lab runtime system.
 * This method sets up the necessary parts for the correct operation, including refreshing elements,
 * binding UI events, loading snapshots, applying preview sizing, loading the template index,
 * and initializing the tools required for lab functionality.
 *
 * @return {Promise<void>} A promise that resolves when all asynchronous initialization tasks are completed.
 */
export async function initLabRuntime() {
  refreshEls();

  // UI first so early user interactions are handled.
  bindUI();

  loadSnapshots();
  applyPreviewSizing();

  await loadTemplatesIndex();

  initTools();
}
