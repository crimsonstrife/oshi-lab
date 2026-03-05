// @ts-check

import { state } from '../state.js';
import { setStatus } from '../status.js';
import { BASE_PATH } from '../env.js';
import { buildSrcdoc } from './build.js';

export function popoutPreview() {
  const html = state.lastBuildSrcdoc || buildSrcdoc();
  const key = `myoshi_preview_${Date.now()}`;

  try {
    localStorage.setItem(key, html);
  } catch {
    setStatus('err', 'Could not store preview for pop-out (localStorage may be full/blocked).');
    return;
  }

  const url = `${BASE_PATH}lab/preview?key=${encodeURIComponent(key)}`;
  const win = window.open(url, '_blank');
  if (!win) {
    setStatus('warn', 'Pop-up blocked. Allow pop-ups for this site to use Pop out.');
    return;
  }

  // Track the pop-out so tools (like Selector Inspector) can attach pick handlers there too.
  state.previewPopoutWin = win;
  state.previewPopoutUrl = url;

}
