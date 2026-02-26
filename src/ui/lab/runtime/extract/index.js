// @ts-check

import { state } from '../state.js';
import { els } from '../dom.js';
import { setStatus } from '../status.js';
import { decodeHtmlEntities, maybeExtractSrcdoc } from '../utils/html.js';
import { summarizeBase } from '../utils/format.js';
import { splitCssFromPreview, splitBodyFromPreview } from './split.js';
import { autoBackupBeforeExtract } from '../snapshots/index.js';
import { renderPreview } from '../preview/render.js';
import { loadTemplateById } from '../templates/index.js';

function safeStripInjectedCssNoise(css) {
  // If you already have a real implementation elsewhere, this will use it.
  if (typeof stripInjectedCssNoise === 'function') return stripInjectedCssNoise(css);
  // No-op fallback
  return { css: css || '' };
}

export function extractBase() {
  try {
    const raw = (els.templateInput?.value || '').trim();
    if (!raw) {
      setStatus('err', 'Template input is empty.');
      return;
    }

    let srcdoc = maybeExtractSrcdoc(raw);
    if (srcdoc) {
      srcdoc = decodeHtmlEntities(srcdoc);
    } else {
      srcdoc = raw.includes('&lt;') ? decodeHtmlEntities(raw) : raw;
    }

    const doc = new DOMParser().parseFromString(srcdoc, 'text/html');

    const backedUp = autoBackupBeforeExtract();

    const styles = [...doc.querySelectorAll('style')].map((s) => s.textContent || '');
    const extractedCssAll = styles.join('\n\n').trim();

    const { baseCss: cssBaseRaw, userCss: cssUserRaw, marker } = splitCssFromPreview(extractedCssAll);
    const { css: cssBase } = safeStripInjectedCssNoise(cssBaseRaw);

    const { baseBody: bodyBase, userHtml } = splitBodyFromPreview(doc);

    if (!cssBase && !bodyBase) {
      setStatus('err', 'Could not extract base CSS/body. Make sure you pasted the actual srcdoc HTML.');
      return;
    }

    state.baseCss = (cssBase || '').trim();
    state.baseBody = (bodyBase || '').trim();

    if (els.customCss && cssUserRaw.trim()) {
      const header = '/* ===== Imported from existing MyOshi Custom CSS ===== */\n';
      els.customCss.value = cssUserRaw.trim().startsWith('/* ===== Imported')
        ? cssUserRaw.trim()
        : header + cssUserRaw.trim();
    }

    if (els.customHtml && userHtml.trim()) els.customHtml.value = userHtml.trim();
    if (els.basePeek) els.basePeek.value = summarizeBase(state.baseCss, state.baseBody);

    const parts = [
      `Extracted base. Base CSS: ${state.baseCss.length.toLocaleString()} chars • Base body: ${state.baseBody.length.toLocaleString()} chars`,
      `Imported custom CSS: ${(els.customCss?.value || '').length.toLocaleString()} chars • Imported custom HTML: ${(els.customHtml?.value || '').length.toLocaleString()} chars`,
    ];
    if (marker) parts.push(`Split CSS via marker: ${marker}`);
    if (backedUp) parts.push('Auto-backed up your current draft to Snapshots.');

    setStatus('ok', parts.join(' • '));
    if (els.autoUpdate?.checked) renderPreview();
  } catch (err) {
    console.error(err);
    setStatus('err', `Extract failed: ${err?.message || String(err)}`);
  }
}

export function restoreTemplateBase() {
  if (!state.activeTemplateId) {
    setStatus('warn', 'No active template selected.');
    return;
  }
  loadTemplateById(state.activeTemplateId);
}
