// @ts-check

import { state } from '../state.js';
import { els } from '../dom.js';

export function applyPreviewSizing() {
  if (!els.frameShell || !els.previewFrame) return;

  els.frameShell.style.minHeight = `${state.previewMinHeightPx}px`;
  if (els.heightLabel) els.heightLabel.textContent = `${state.previewMinHeightPx}px`;
  if (els.zoomLabel) els.zoomLabel.textContent = `${Math.round(state.previewScale * 100)}%`;

  els.previewFrame.style.transformOrigin = '0 0';
  els.previewFrame.style.transform = state.previewScale === 1 ? '' : `scale(${state.previewScale})`;
  els.previewFrame.style.width = `${100 / state.previewScale}%`;
  els.previewFrame.style.height = `${100 / state.previewScale}%`;
}
