// @ts-check

function mountSelectorForTarget(target) {
  return target === 'oshi-card' ? '.oshi-card-custom-html' : '.profile-custom-html';
}

/**
 * Split a full CSS payload into base vs user CSS based on known markers.
 * @param {string} cssText
 */
export function splitCssFromPreview(cssText) {
  const raw = (cssText || '').trim();
  if (!raw) return { baseCss: '', userCss: '', marker: null };

  const myoshiMarker = raw.match(/\/\*\s*User's\s+custom\s+CSS[\s\S]*?\*\//i);
  if (myoshiMarker && typeof myoshiMarker.index === 'number') {
    const idx = myoshiMarker.index;
    const baseCss = raw.slice(0, idx).trim();
    const userCss = raw.slice(idx + myoshiMarker[0].length).trim();
    return { baseCss, userCss, marker: 'myoshi' };
  }

  const labMarker = raw.match(/\/\*\s*={2,}\s*User\s+Custom\s+CSS[\s\S]*?\*\//i);
  if (labMarker && typeof labMarker.index === 'number') {
    const idx = labMarker.index;
    const baseCss = raw.slice(0, idx).trim();
    const userCss = raw.slice(idx + labMarker[0].length).trim();
    return { baseCss, userCss, marker: 'lab' };
  }

  return { baseCss: raw, userCss: '', marker: null };
}

/**
 * Split body into base html (with injected custom mount cleared) and extracted user html.
 * @param {Document} doc
 * @param {'profile'|'oshi-card'} [target]
 */
export function splitBodyFromPreview(doc, target = 'profile') {
  const body = doc?.body;
  if (!body) return { baseBody: '', userHtml: '' };

  const mountSelector = mountSelectorForTarget(target);
  const nodes = [...body.querySelectorAll(mountSelector)];

  let bestNode = null;
  let bestHtml = '';
  for (const n of nodes) {
    const html = (n.innerHTML || '').trim();
    if (!html) continue;
    if (!bestNode || html.length > bestHtml.length) {
      bestNode = n;
      bestHtml = html;
    }
  }

  if (bestNode) bestNode.innerHTML = '';

  return {
    baseBody: (body.innerHTML || '').trim(),
    userHtml: bestHtml,
  };
}
