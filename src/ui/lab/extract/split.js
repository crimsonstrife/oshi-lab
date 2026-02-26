// @ts-check

/**
 * Split a full CSS payload into base vs user CSS based on known markers.
 * @param {string} cssText
 */
export function splitCssFromPreview(cssText) {
  const raw = (cssText || '').trim();
  if (!raw) return { baseCss: '', userCss: '', marker: null };

  // Prefer the MyOshi marker if present
  const myoshiMarker = raw.match(/\/\*\s*User's\s+custom\s+CSS[\s\S]*?\*\//i);
  if (myoshiMarker && typeof myoshiMarker.index === 'number') {
    const idx = myoshiMarker.index;
    const baseCss = raw.slice(0, idx).trim();
    const userCss = raw.slice(idx + myoshiMarker[0].length).trim();
    return { baseCss, userCss, marker: 'myoshi' };
  }

  // Fallback: lab's own marker (if someone pastes a built srcdoc)
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
 * Split body into base html (with injected .profile-custom-html cleared) and extracted user html.
 * @param {Document} doc
 */
export function splitBodyFromPreview(doc) {
  const body = doc?.body;
  if (!body) return { baseBody: '', userHtml: '' };

  const nodes = [...body.querySelectorAll('.profile-custom-html')];

  // Pick the “best” candidate: non-empty and largest content.
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

  if (bestNode) {
    bestNode.innerHTML = '';
  }

  return {
    baseBody: (body.innerHTML || '').trim(),
    userHtml: bestHtml,
  };
}
