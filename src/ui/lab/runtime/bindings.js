// @ts-check

import { BASE_PATH } from './env.js';
import { state } from './state.js';
import { els, on } from './dom.js';
import { setStatus } from './status.js';

import { extractBase, restoreTemplateBase } from './extract/index.js';
import { renderPreview } from './preview/render.js';
import { applyPreviewSizing } from './preview/sizing.js';
import { popoutPreview } from './preview/popout.js';
import { buildSrcdoc } from './preview/build.js';

import { loadTemplateById } from './templates/index.js';

import { copyToClipboard } from './utils/clipboard.js';
import { downloadFile } from './utils/download.js';
import { quickFormatCss } from './utils/format.js';
import { formatCss, formatHtml } from './scripts/format/prettier.js';
import { syncEditorsFromTextareas } from './scripts/editors/index.js';

import { runAudit, copyLastAuditJson } from './audit/index.js';

import { saveSnapshot, deleteSelectedSnapshot, loadSnapshotById } from './snapshots/index.js';

/**
 * Binds UI elements to their respective event handlers and initializes various interactive features
 * of the application. This includes setting up button click listeners, input change handlers,
 * custom rendering logic, and other UI-specific functionality.
 *
 * @return {void} Nothing is returned by this function. It sets up event bindings and configurations.
 */
export function bindUI() {
  on('btnExtract', 'click', extractBase);
  on('btnRenderNow', 'click', renderPreview);

  on('btnToggleMobile', 'click', () => {
    state.mobileMode = !state.mobileMode;
    if (els.frameShell) els.frameShell.classList.toggle('mobile', state.mobileMode);
  });

  on('btnLoadDemo', 'click', () => {
    const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('templateSelect'));
    const encoded = sel ? sel.value : '';
    const id = encoded ? decodeURIComponent(encoded) : (state.templatesIndex[0]?.id || 'fallback');
    loadTemplateById(id);
  });

  on('btnRestoreTemplate', 'click', restoreTemplateBase);

  on('btnDocs', 'click', () => {
    window.open(`${BASE_PATH}docs/getting-started/`, '_blank', 'noopener,noreferrer');
  });

  on('btnResetCustom', 'click', () => {
    if (els.customCss) els.customCss.value = '';
    if (els.customHtml) els.customHtml.value = '';
    if (els.appendInstead) els.appendInstead.checked = false;
    // keep CodeMirror in sync if mounted
    syncEditorsFromTextareas();
    setStatus('ok', 'Custom CSS/HTML reset.');
    if (els.autoUpdate?.checked) renderPreview();
  });

  // Zoom / Height
  if (els.zoomRange) {
    els.zoomRange.addEventListener('input', () => {
      // @ts-ignore
        state.previewScale = parseInt(els.zoomRange.value, 10) / 100;
      applyPreviewSizing();
    });
  }

  if (els.heightRange) {
    els.heightRange.addEventListener('input', () => {
      // @ts-ignore
        state.previewMinHeightPx = parseInt(els.heightRange.value, 10);
      applyPreviewSizing();
    });
  }

  on('btnFitPreview', 'click', () => {
    state.previewScale = 1;
    state.previewMinHeightPx = 1080;
    if (els.zoomRange) els.zoomRange.value = '100';
    if (els.heightRange) els.heightRange.value = '1080';
    applyPreviewSizing();
  });

  on('btnPopout', 'click', popoutPreview);

  // Copy + download
  on('btnCopyCSS', 'click', async () => {
    try {
      await copyToClipboard(els.customCss?.value || '');
      setStatus('ok', 'Copied Custom CSS to clipboard.');
    } catch {
      setStatus('err', 'Clipboard copy failed (browser permissions).');
    }
  });

  on('btnCopyHTML', 'click', async () => {
    try {
      await copyToClipboard(els.customHtml?.value || '');
      setStatus('ok', 'Copied Custom HTML to clipboard.');
    } catch {
      setStatus('err', 'Clipboard copy failed (browser permissions).');
    }
  });

  on('btnDownload', 'click', () => {
    const filename = `myoshi-theme-bundle-${new Date().toISOString().slice(0, 10)}.html`;
    const bundle = state.lastBuildSrcdoc || buildSrcdoc();
    downloadFile(filename, bundle);
    setStatus('ok', `Downloaded: ${filename}`);
  });

  on('btnFormatCss', 'click', async () => {
    if (!els.customCss) return;
    try {
      els.customCss.value = await formatCss(els.customCss.value || '');
      syncEditorsFromTextareas();
      if (els.autoUpdate?.checked) renderPreview();
      setStatus('ok', 'Formatted CSS.');
    } catch (e) {
      // fallback to simple formatter
      console.error(e);
      els.customCss.value = quickFormatCss(els.customCss.value || '');
      syncEditorsFromTextareas();
      if (els.autoUpdate?.checked) renderPreview();
      setStatus('warn', 'CSS format failed; applied quick format.');
    }
  });

  on('btnFormatHtml', 'click', async () => {
    if (!els.customHtml) return;
    try {
      els.customHtml.value = await formatHtml(els.customHtml.value || '');
      syncEditorsFromTextareas();
      if (els.autoUpdate?.checked) renderPreview();
      setStatus('ok', 'Formatted HTML.');
    } catch (e) {
      console.error(e);
      setStatus('warn', 'HTML format failed.');
    }
  });

  on('btnCopyBaseCss', 'click', async () => {
    try {
      await copyToClipboard(state.baseCss || '');
      setStatus('ok', 'Copied Base CSS.');
    } catch {
      setStatus('err', 'Clipboard copy failed.');
    }
  });

  on('btnCopyBaseBody', 'click', async () => {
    try {
      await copyToClipboard(state.baseBody || '');
      setStatus('ok', 'Copied Base Body HTML.');
    } catch {
      setStatus('err', 'Clipboard copy failed.');
    }
  });

  on('btnCopySrcdoc', 'click', async () => {
    try {
      await copyToClipboard(state.lastBuildSrcdoc || buildSrcdoc());
      setStatus('ok', 'Copied built srcdoc HTML.');
    } catch {
      setStatus('err', 'Clipboard copy failed.');
    }
  });

  // Snapshots
  on('btnSaveSnapshot', 'click', saveSnapshot);
  on('btnDeleteSnapshot', 'click', deleteSelectedSnapshot);

  // Audit
  on('btnRunAudit', 'click', runAudit);
  on('btnCopyAuditJson', 'click', copyLastAuditJson);

  if (els.snapshotSelect) {
    els.snapshotSelect.addEventListener('change', () => {
      // @ts-ignore
        const encoded = els.snapshotSelect.value;
      if (!encoded) return;
      loadSnapshotById(decodeURIComponent(encoded));
    });
  }

  const templateSelect = document.getElementById('templateSelect');
  if (templateSelect) {
    templateSelect.addEventListener('change', () => {
      const encoded = /** @type {HTMLSelectElement} */ (templateSelect).value;
      if (!encoded) return;
      loadTemplateById(decodeURIComponent(encoded));
    });
  }

  // Tabs
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const id = /** @type {HTMLElement} */ (tab).dataset.tab;
      const wrapMap = {
        template: 'wrap-template',
        customCss: 'wrap-customCss',
        customHtml: 'wrap-customHtml',
        audit: 'wrap-audit',
        basePeek: 'wrap-basePeek',
      };

      document.querySelectorAll('.editor-wrap').forEach((w) => w.classList.remove('active'));
      // @ts-ignore
        const targetId = wrapMap[id];
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) target.classList.add('active');
    });
  });

  // Auto-update debounce
  const scheduleRender = () => {
    if (!els.autoUpdate?.checked) return;
    if (state.debounceTimer) window.clearTimeout(state.debounceTimer);
    state.debounceTimer = window.setTimeout(renderPreview, 150);
  };

  ['input', 'change'].forEach((evt) => {
    [
      els.customCss,
      els.customHtml,
      els.appendInstead,
      els.enableMock,
      els.mockDisplayName,
      els.mockUsername,
      els.mockTagline,
      els.mockAvatar,
      els.mockBg,
    ].forEach((node) => {
      if (node) node.addEventListener(evt, scheduleRender);
    });
  });
}
