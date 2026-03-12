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

import { loadTemplateById, loadTemplateForCurrentTarget, refreshTemplateSelect } from './templates/index.js';
import { getTargetConfig } from './targets.js';

import { copyToClipboard } from './utils/clipboard.js';
import { downloadFile } from './utils/download.js';
import { quickFormatCss } from './utils/format.js';
import { formatCss, formatHtml } from './scripts/format/prettier.js';
import { syncEditorsFromTextareas } from './scripts/editors/index.js';

import { runAudit, copyLastAuditJson } from './audit/index.js';
import { saveSnapshot, deleteSelectedSnapshot, loadSnapshotById } from './snapshots/index.js';

import {
  exportThemeBundle,
  promptThemeBundleImport,
  handleThemeBundleImport,
  updateThemeBundleSummary,
} from './themeBundle.js';

function updateTargetChrome() {
  const cfg = getTargetConfig(state.target);
  try { window.__OSHI_LAB_TARGET__ = state.target; } catch {}

  const subtitle = document.getElementById('workspaceSubtitle');
  if (subtitle) subtitle.textContent = cfg.subtitle;

  const help = document.getElementById('templateInputHelp');
  if (help) help.textContent = state.target === 'oshi-card'
    ? 'Template input can be the outer iframe HTML or the raw OshiCard srcdoc HTML.'
    : 'Template input can be the outer iframe HTML or the raw srcdoc HTML.';

  if (els.templateInput) els.templateInput.placeholder = cfg.templateInputPlaceholder;
  if (els.customHtml) els.customHtml.placeholder = `Your Custom HTML (${cfg.customHtmlHelpText})`;

  const htmlHelp = document.getElementById('customHtmlHelpText');
  if (htmlHelp) htmlHelp.innerHTML = `<b>Custom HTML</b> ${cfg.customHtmlHelpText}`;

  const mock = document.getElementById('mockDataSummary');
  if (mock) mock.textContent = cfg.mockTitle;

  const mobile = document.getElementById('btnToggleMobile');
  if (mobile) mobile.textContent = cfg.mobileButtonLabel;

  if (els.previewFrame) els.previewFrame.title = cfg.previewTitle;

  const btnProfile = document.getElementById('btnTargetProfile');
  const btnCard = document.getElementById('btnTargetOshiCard');
  btnProfile?.classList.toggle('active', state.target === 'profile');
  btnCard?.classList.toggle('active', state.target === 'oshi-card');

  refreshTemplateSelect();
}

async function switchTarget(target) {
  const normalized = target === 'oshi-card' ? 'oshi-card' : 'profile';
  if (state.target === normalized) return;

  state.target = normalized;
  try { localStorage.setItem('myoshi_theme_lab_target', state.target); } catch {}
  updateTargetChrome();
  await loadTemplateForCurrentTarget();
  updateThemeBundleSummary();
  state.toolsApi?.refresh?.();
}

export function bindUI() {
  updateTargetChrome();

  on('btnTargetProfile', 'click', () => { void switchTarget('profile'); });
  on('btnTargetOshiCard', 'click', () => { void switchTarget('oshi-card'); });

  on('btnExtract', 'click', extractBase);
  on('btnRenderNow', 'click', renderPreview);

  on('btnToggleMobile', 'click', () => {
    state.mobileMode = !state.mobileMode;
    if (els.frameShell) els.frameShell.classList.toggle('mobile', state.mobileMode);
  });

  on('btnLoadDemo', 'click', () => {
    const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('templateSelect'));
    const encoded = sel ? sel.value : '';
    if (!encoded) {
      void loadTemplateForCurrentTarget();
      return;
    }
    const id = decodeURIComponent(encoded);
    void loadTemplateById(id).then(() => updateThemeBundleSummary());
  });

  on('btnRestoreTemplate', 'click', restoreTemplateBase);
  on('btnDocs', 'click', () => {
    window.open(`${BASE_PATH}docs/getting-started/`, '_blank', 'noopener,noreferrer');
  });

  on('btnResetCustom', 'click', () => {
    if (els.customCss) els.customCss.value = '';
    if (els.customHtml) els.customHtml.value = '';
    if (els.appendInstead) els.appendInstead.checked = false;
    syncEditorsFromTextareas();
    setStatus('ok', 'Custom CSS/HTML reset.');
    updateThemeBundleSummary();
    if (els.autoUpdate?.checked) renderPreview();
  });

  if (els.zoomRange) {
    els.zoomRange.addEventListener('input', () => {
      state.previewScale = parseInt(els.zoomRange.value, 10) / 100;
      applyPreviewSizing();
    });
  }

  if (els.heightRange) {
    els.heightRange.addEventListener('input', () => {
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
    const filename = `myoshi-preview-${new Date().toISOString().slice(0, 10)}.html`;
    const bundle = state.lastBuildSrcdoc || buildSrcdoc();
    downloadFile(filename, bundle);
    setStatus('ok', `Downloaded: ${filename}`);
  });

  on('btnExportTheme', 'click', () => {
    exportThemeBundle();
    updateThemeBundleSummary();
  });

  on('btnImportTheme', 'click', promptThemeBundleImport);

  if (els.themeImportInput) {
    els.themeImportInput.addEventListener('change', () => { void handleThemeBundleImport(); });
  } else {
    const inp = document.getElementById('themeImportInput');
    inp?.addEventListener('change', () => { void handleThemeBundleImport(); });
  }

  on('btnFormatCss', 'click', async () => {
    if (!els.customCss) return;
    try {
      els.customCss.value = await formatCss(els.customCss.value || '');
      syncEditorsFromTextareas();
      if (els.autoUpdate?.checked) renderPreview();
      setStatus('ok', 'Formatted CSS.');
    } catch (e) {
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

  on('btnSaveSnapshot', 'click', saveSnapshot);
  on('btnDeleteSnapshot', 'click', deleteSelectedSnapshot);
  on('btnRunAudit', 'click', runAudit);
  on('btnCopyAuditJson', 'click', copyLastAuditJson);

  if (els.snapshotSelect) {
    els.snapshotSelect.addEventListener('change', () => {
      const encoded = els.snapshotSelect.value;
      if (!encoded) return;
      loadSnapshotById(decodeURIComponent(encoded));
      updateThemeBundleSummary();
    });
  }

  const templateSelect = document.getElementById('templateSelect');
  templateSelect?.addEventListener('change', () => {
    const encoded = /** @type {HTMLSelectElement} */ (templateSelect).value;
    if (!encoded) return;
    void loadTemplateById(decodeURIComponent(encoded));
  });

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
      const targetId = wrapMap[id];
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) target.classList.add('active');
    });
  });

  const scheduleRender = () => {
    if (!els.autoUpdate?.checked) return;
    if (state.debounceTimer) window.clearTimeout(state.debounceTimer);
    state.debounceTimer = window.setTimeout(renderPreview, 150);
  };

  let summaryTimer = /** @type {number|null} */ (null);
  const scheduleSummary = () => {
    if (summaryTimer) window.clearTimeout(summaryTimer);
    summaryTimer = window.setTimeout(updateThemeBundleSummary, 50);
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
      if (!node) return;
      node.addEventListener(evt, scheduleRender);
      node.addEventListener(evt, scheduleSummary);
    });
  });

  templateSelect?.addEventListener('change', scheduleSummary);
  if (els.includeExtractedBase) els.includeExtractedBase.addEventListener('change', scheduleSummary);

  scheduleSummary();
}
