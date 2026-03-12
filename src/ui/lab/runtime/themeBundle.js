// @ts-check

import { state } from './state.js';
import { els } from './dom.js';
import { setStatus } from './status.js';

import { downloadTextFile } from './utils/download.js';
import { syncEditorsFromTextareas } from './scripts/editors/index.js';
import { renderPreview } from './preview/render.js';
import { loadTemplateById } from './templates/index.js';
import { getTargetConfig } from './targets.js';

export const THEME_BUNDLE_SCHEMA_VERSION = 1;

/**
 * Compatibility: accept OshiForge theme exports and convert them into an oshi-lab ThemeBundle.
 * This keeps the UI generic (same Import Theme button) while letting power users reuse files.
 */

/**
 * @param {any} obj
 * @returns {boolean}
 */
function isOshiForgeTheme(obj) {
  return !!(obj
    && typeof obj === 'object'
    && (obj.app === 'oshiforge' || obj.app === 'oshi-forge' || obj.app === 'oshiforge-theme')
    && Number(obj.version) === 1
    && obj.state
    && typeof obj.state === 'object');
}

/**
 * Escape a string for safe inclusion inside a double-quoted CSS content string.
 *
 * Ensures that backslashes and double quotes are escaped so the CSS string literal
 * is not broken by user-controlled input.
 *
 * @param {unknown} text
 * @returns {string}
 */
function escapeCssContentString(text) {
  const s = String(text);
  // First escape backslashes, then double quotes.
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * @param {string} hex
 * @returns {{r:number,g:number,b:number}|null}
 */
function hexToRgb(hex) {
  const s = String(hex || '').trim();
  const m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let v = m[1].toLowerCase();
  if (v.length === 3) v = v.split('').map((ch) => ch + ch).join('');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return { r, g, b };
}

/** @param {number} n */
function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * @param {any} v
 * @param {number} fallback
 */
function safeNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {any} v
 * @param {string} fallback
 */
function safeStr(v, fallback) {
  const s = (typeof v === 'string') ? v : (v == null ? '' : String(v));
  const out = s.trim();
  return out ? out : fallback;
}

/**
 * @param {string} hex
 * @param {number} alpha
 * @param {string} fallbackHex
 */
function rgba(hex, alpha, fallbackHex) {
  const c = hexToRgb(hex) || hexToRgb(fallbackHex) || { r: 0, g: 0, b: 0 };
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${clamp01(alpha)})`;
}

/**
 * Lighten/darken a hex color by mixing toward white/black.
 * @param {string} hex
 * @param {number} t positive -> lighten (0..1), negative -> darken (-1..0)
 * @param {string} fallbackHex
 */
function shadeHex(hex, t, fallbackHex) {
  const c = hexToRgb(hex) || hexToRgb(fallbackHex);
  if (!c) return safeStr(hex, fallbackHex);
  const k = Math.max(-1, Math.min(1, Number(t) || 0));
  const target = k >= 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const mix = Math.abs(k);
  const r = Math.round(c.r + (target.r - c.r) * mix);
  const g = Math.round(c.g + (target.g - c.g) * mix);
  const b = Math.round(c.b + (target.b - c.b) * mix);
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Best-effort CSS generator for OshiForge theme state.
 * @param {any} s
 * @returns {string}
 */
function buildOshiForgeCss(s) {
  const cPrimary = safeStr(s?.cPrimary, '#369');
  const cSecondary = safeStr(s?.cSecondary, '#a8f');
  const cAccent = safeStr(s?.cAccent, '#f60');
  const cText = safeStr(s?.cText, '#333');

  const linkColor = safeStr(s?.linkColor, cPrimary);
  const linkHoverColor = safeStr(s?.linkHoverColor, cSecondary);

  const headerGradStart = safeStr(s?.headerGradStart, cPrimary);
  const headerGradMid = safeStr(s?.headerGradMid, shadeHex(headerGradStart, 0.15, cPrimary));
  const headerGradEnd = safeStr(s?.headerGradEnd, shadeHex(headerGradStart, -0.2, cPrimary));
  const headerTextColor = safeStr(s?.headerTextColor, '#fff');

  const panelBaseColor = safeStr(s?.panelBaseColor, '#ffffff');
  const panelHoverBaseColor = safeStr(s?.panelHoverBaseColor, panelBaseColor);
  const panelAlpha = clamp01(safeNum(s?.panelAlpha, 1));
  const borderAlpha = clamp01(safeNum(s?.borderAlpha, 1));
  const glassBlur = Math.max(0, Math.min(16, safeNum(s?.glassBlur, 0)));

  const cardRadius = Math.max(0, safeNum(s?.cardRadius, 8));
  const cardBorderWidth = Math.max(0, safeNum(s?.cardBorderWidth, 1));
  const cardPadding = Math.max(0, safeNum(s?.cardPadding, 10));
  const sectionSpacing = Math.max(0, safeNum(s?.sectionSpacing, 10));
  const panelGap = Math.max(0, safeNum(s?.panelGap, 8));

  const containerWidth = Math.max(0, safeNum(s?.containerWidth, 0));
  const rightColumnMax = Math.max(0, safeNum(s?.rightColumnMax, 0));

  const fontBody = safeStr(s?.fontBody, '');
  const fontHeader = safeStr(s?.fontHeader, 'inherit');
  const baseFontSize = Math.max(8, safeNum(s?.baseFontSize, 11));
  const lineHeight = Math.max(1, safeNum(s?.lineHeight, 1.5));

  const headerFontSize = Math.max(8, safeNum(s?.headerFontSize, 11));
  const headerLinkSize = Math.max(8, safeNum(s?.headerLinkSize, 10));
  const headerUppercase = !!s?.headerUppercase;

  const linkWeight = Math.max(100, Math.min(900, safeNum(s?.linkWeight, 600)));
  const linkUnderline = (typeof s?.linkUnderline === 'boolean') ? s.linkUnderline : false;
  const uniformLinks = (typeof s?.uniformLinks === 'boolean') ? s.uniformLinks : true;

  const btnBg = safeStr(s?.btnBg, '#f5f5f5');
  const btnText = safeStr(s?.btnText, cText);
  const btnBorder = safeStr(s?.btnBorder, cPrimary);
  const btnHoverBg = safeStr(s?.btnHoverBg, shadeHex(btnBg, 0.06, btnBg));
  const btnHoverText = safeStr(s?.btnHoverText, btnText);
  const buttonAlpha = clamp01(safeNum(s?.buttonAlpha, 1));
  const buttonHoverAlpha = clamp01(safeNum(s?.buttonHoverAlpha, 1));

  const starIcon = safeStr(s?.starIcon, '★');
  const heartIcon = safeStr(s?.heartIcon, '♥');

  const avatarSize = Math.max(32, safeNum(s?.avatarSize, 200));
  const avatarBorder = Math.max(0, safeNum(s?.avatarBorder, 2));
  const avatarGlow = clamp01(safeNum(s?.avatarGlow, 0));
  const avatarShape = safeStr(s?.avatarShape, 'rounded');

  const nameColor = safeStr(s?.nameColor, '#fff');
  const nameGlow = clamp01(safeNum(s?.nameGlow, 0));

  const taglineColor = safeStr(s?.taglineColor, '');
  const taglineBoxEnabled = !!s?.taglineBoxEnabled;
  const taglineBoxBgColor = safeStr(s?.taglineBoxBgColor, panelBaseColor);
  const taglineBoxBorderColor = safeStr(s?.taglineBoxBorderColor, cAccent);
  const taglineBoxAlpha = clamp01(safeNum(s?.taglineBoxAlpha, 0.6));
  const taglineBoxGlow = clamp01(safeNum(s?.taglineBoxGlow, 0));
  const taglineBoxRadius = Math.max(0, safeNum(s?.taglineBoxRadius, 10));
  const taglineBoxPadding = Math.max(0, safeNum(s?.taglineBoxPadding, 8));

  const commentsBg = safeStr(s?.commentsBg, taglineBoxBgColor);
  const commentsTextColor = safeStr(s?.commentsTextColor, cText);
  const commentsBorderColor = safeStr(s?.commentsBorderColor, taglineBoxBorderColor);
  const commentsAlpha = clamp01(safeNum(s?.commentsAlpha, 0.75));
  const replyBg = safeStr(s?.replyBg, panelBaseColor);
  const replyTextColor = safeStr(s?.replyTextColor, commentsTextColor);
  const replyBorderColor = safeStr(s?.replyBorderColor, commentsBorderColor);

  const extraCss = safeStr(s?.extraCss, '');
  const customShapeCss = safeStr(s?.customShapeCss, '');
  const customCursorCss = safeStr(s?.customCursorCss, '');

  const borderColor = safeStr(s?.decorBorderColor, cAccent);

  /** @type {string[]} */
  const lines = [];
  lines.push('/* oshilab:begin block=imported-theme v=1 */');
  lines.push('/* Generated from a compatible theme file. Safe to edit or delete. */');
  lines.push('');
  lines.push(':root {');
  lines.push(`  --vs-blue: ${headerGradStart};`);
  lines.push(`  --vs-blue-light: ${headerGradMid};`);
  lines.push(`  --vs-blue-dark: ${headerGradEnd};`);
  lines.push(`  --vs-link: ${linkColor};`);
  lines.push(`  --vs-link-hover: ${linkHoverColor};`);
  lines.push(`  --vs-link-bg: ${linkColor};`);
  lines.push(`  --vs-orange: ${cAccent};`);
  lines.push(`  --vs-orange-light: ${shadeHex(cAccent, 0.18, cAccent)};`);
  lines.push(`  --vs-bg-white: ${rgba(panelBaseColor, panelAlpha, '#ffffff')};`);
  lines.push(`  --vs-bg-muted: ${rgba(panelHoverBaseColor, panelAlpha, panelBaseColor)};`);
  lines.push(`  --vs-bg-subtle: ${rgba(panelBaseColor, Math.max(0.1, panelAlpha - 0.08), panelBaseColor)};`);
  lines.push(`  --vs-bg-light: ${rgba(panelBaseColor, Math.max(0.12, panelAlpha - 0.14), panelBaseColor)};`);
  lines.push(`  --vs-bg-dim: ${rgba(panelHoverBaseColor, Math.max(0.12, panelAlpha - 0.10), panelHoverBaseColor)};`);
  lines.push(`  --vs-text-dark: ${cText};`);
  lines.push(`  --vs-text-medium: ${rgba(cText, 0.82, cText)};`);
  lines.push(`  --vs-text-light: ${rgba(cText, 0.62, cText)};`);
  lines.push(`  --vs-border: ${rgba(borderColor, borderAlpha, '#cccccc')};`);
  lines.push(`  --vs-border-light: ${rgba(borderColor, Math.min(1, borderAlpha + 0.12), '#dddddd')};`);
  lines.push(`  --vs-border-lighter: ${rgba(borderColor, Math.min(1, borderAlpha + 0.20), '#eeeeee')};`);
  lines.push(`  --glow-cyan: ${cAccent};`);
  lines.push(`  --glow-purple: ${cSecondary};`);
  lines.push(`  --glow-pink: ${cSecondary};`);
  lines.push('}');
  lines.push('');
  lines.push('.container {');
  if (fontBody) lines.push(`  font-family: ${fontBody};`);
  lines.push(`  font-size: ${baseFontSize}px;`);
  lines.push(`  line-height: ${lineHeight};`);
  lines.push(`  color: ${cText};`);
  lines.push('}');
  lines.push('');
  if (containerWidth) {
    lines.push('.container {');
    lines.push(`  max-width: ${containerWidth}px;`);
    lines.push('}');
    lines.push('');
  }
  if (rightColumnMax) {
    lines.push('.profile-right {');
    lines.push(`  max-width: ${rightColumnMax}px;`);
    lines.push('}');
    lines.push('');
  }
  lines.push('.profile-layout {');
  lines.push(`  gap: ${panelGap}px;`);
  lines.push('}');
  lines.push('');
  lines.push('.card {');
  lines.push(`  border-width: ${cardBorderWidth}px;`);
  lines.push(`  border-radius: ${cardRadius}px;`);
  lines.push(`  margin-bottom: ${sectionSpacing}px;`);
  if (glassBlur) {
    lines.push(`  backdrop-filter: blur(${glassBlur}px);`);
    lines.push(`  -webkit-backdrop-filter: blur(${glassBlur}px);`);
  }
  lines.push('}');
  lines.push('');
  lines.push('.card-body {');
  lines.push(`  padding: ${cardPadding}px;`);
  lines.push('}');
  lines.push('');
  lines.push('.card-header {');
  lines.push(`  background: linear-gradient(135deg, ${headerGradStart} 0%, ${headerGradMid} 50%, ${headerGradEnd} 100%);`);
  lines.push(`  color: ${headerTextColor};`);
  if (fontHeader && fontHeader !== 'inherit') lines.push(`  font-family: ${fontHeader};`);
  lines.push(`  font-size: ${headerFontSize}px;`);
  if (headerUppercase) lines.push('  text-transform: uppercase;');
  lines.push('}');
  lines.push('');
  lines.push('.card-header a {');
  lines.push(`  font-size: ${headerLinkSize}px;`);
  lines.push('}');
  lines.push('');
  // Replace header icons with simple glyphs (more compatible than data: SVG overrides)
  lines.push('.card-header.starred:before {');
  lines.push(`  content: "${escapeCssContentString(starIcon)}";`);
  lines.push('  background: none !important;');
  lines.push('  width: auto; height: auto;');
  lines.push('  filter: none;');
  lines.push('}');
  lines.push('');
  lines.push('.card-header.hearted:before {');
  lines.push(`  content: "${escapeCssContentString(heartIcon)}";`);
  lines.push('  background: none !important;');
  lines.push('  width: auto; height: auto;');
  lines.push('  filter: none;');
  lines.push('}');
  lines.push('');
  // Link normalization
  if (uniformLinks) {
    lines.push('a {');
    lines.push(`  color: ${linkColor};`);
    lines.push(`  font-weight: ${linkWeight};`);
    lines.push(`  text-decoration: ${linkUnderline ? 'underline' : 'none'};`);
    lines.push('}');
    lines.push('');
    lines.push('a:hover {');
    lines.push(`  color: ${linkHoverColor};`);
    lines.push('}');
    lines.push('');
  }
  // Buttons/links
  lines.push('.action-btn, .contact-link {');
  lines.push(`  background: ${rgba(btnBg, buttonAlpha, btnBg)};`);
  lines.push(`  border-color: ${btnBorder};`);
  lines.push(`  color: ${btnText};`);
  lines.push('  box-shadow: none;');
  lines.push('}');
  lines.push('');
  lines.push('.action-btn:hover, .contact-link:hover {');
  lines.push(`  background: ${rgba(btnHoverBg, buttonHoverAlpha, btnHoverBg)};`);
  lines.push(`  color: ${btnHoverText};`);
  lines.push('}');
  lines.push('');
  // Avatar
  lines.push('.profile-avatar {');
  lines.push(`  width: ${avatarSize}px;`);
  lines.push(`  height: ${avatarSize}px;`);
  lines.push(`  border-width: ${avatarBorder}px;`);
  lines.push(`  border-color: ${rgba(borderColor, Math.max(0.2, borderAlpha), borderColor)};`);
  if (avatarGlow > 0) {
    const blur = Math.round(24 * avatarGlow);
    lines.push(`  box-shadow: 0 0 ${blur}px ${rgba(borderColor, 0.65, borderColor)};`);
  }
  if (avatarShape === 'circle') {
    lines.push('  border-radius: 999px;');
    lines.push('  clip-path: none;');
  } else if (avatarShape === 'diamond') {
    lines.push('  border-radius: 0;');
    lines.push('  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);');
  } else {
    lines.push(`  border-radius: ${Math.max(0, Math.round(cardRadius * 1.2))}px;`);
    lines.push('  clip-path: none;');
  }
  lines.push('}');
  lines.push('');
  // Name styling
  lines.push('.profile-display-name {');
  lines.push(`  color: ${nameColor};`);
  if (nameGlow > 0) {
    const blur = Math.round(18 * nameGlow);
    lines.push(`  text-shadow: 0 0 ${blur}px ${rgba(nameColor, 0.8, nameColor)};`);
  }
  lines.push('}');
  lines.push('');
  // Tagline box (optional)
  if (taglineBoxEnabled) {
    lines.push('.profile-tagline {');
    if (taglineColor) lines.push(`  color: ${taglineColor};`);
    lines.push(`  background: ${rgba(taglineBoxBgColor, taglineBoxAlpha, taglineBoxBgColor)};`);
    lines.push(`  border: 1px solid ${taglineBoxBorderColor};`);
    lines.push(`  border-radius: ${taglineBoxRadius}px;`);
    lines.push(`  padding: ${taglineBoxPadding}px;`);
    if (taglineBoxGlow > 0) {
      const blur = Math.round(18 * taglineBoxGlow);
      lines.push(`  box-shadow: 0 0 ${blur}px ${rgba(taglineBoxBorderColor, 0.55, taglineBoxBorderColor)};`);
    }
    lines.push('}');
    lines.push('');
  } else if (taglineColor) {
    lines.push('.profile-tagline {');
    lines.push(`  color: ${taglineColor};`);
    lines.push('}');
    lines.push('');
  }
  // Comments (best-effort)
  lines.push('#comments .add-comment {');
  lines.push(`  background: ${rgba(commentsBg, commentsAlpha, commentsBg)};`);
  lines.push(`  border-bottom-color: ${rgba(commentsBorderColor, 0.55, commentsBorderColor)};`);
  lines.push('}');
  lines.push('');
  lines.push('#comments .add-comment textarea {');
  lines.push(`  background: ${rgba(replyBg, 0.9, replyBg)};`);
  lines.push(`  color: ${replyTextColor};`);
  lines.push(`  border-color: ${rgba(replyBorderColor, 0.6, replyBorderColor)};`);
  lines.push('}');
  lines.push('');
  lines.push('#comments .profile-comment, #comments .profile-comment:nth-child(2n) {');
  lines.push(`  background: ${rgba(commentsBg, Math.max(0.1, commentsAlpha - 0.12), commentsBg)};`);
  lines.push(`  border-bottom-color: ${rgba(commentsBorderColor, 0.35, commentsBorderColor)};`);
  lines.push('}');
  lines.push('');
  lines.push('#comments .comment-body {');
  lines.push(`  color: ${commentsTextColor};`);
  lines.push('}');
  lines.push('');
  // Extra passthrough CSS from the source file (if any)
  if (customShapeCss) {
    lines.push('/* --- extra: customShapeCss --- */');
    lines.push(customShapeCss.trim());
    lines.push('');
  }
  if (customCursorCss) {
    lines.push('/* --- extra: customCursorCss --- */');
    lines.push(customCursorCss.trim());
    lines.push('');
  }
  if (extraCss) {
    lines.push('/* --- extra: extraCss --- */');
    lines.push(extraCss.trim());
    lines.push('');
  }

  lines.push('/* oshilab:end block=imported-theme */');
  lines.push('');

  return lines.join('\n');
}

/**
 * Convert an OshiForge export to a ThemeBundleV1 while preserving current non-theme preferences.
 * @param {any} obj
 * @returns {any}
 */
function convertOshiForgeThemeToBundle(obj) {
  const current = buildThemeBundle();
  // Preserve mock + template selection + base mode; replace only Custom CSS (and keep existing HTML).
  current.customCss = buildOshiForgeCss(obj.state || {});
  current.customHtml = els.customHtml?.value || current.customHtml || '';
  // Normalize schema fields for export/import consistency.
  current.app = 'oshi-lab';
  current.schemaVersion = THEME_BUNDLE_SCHEMA_VERSION;
  current.appVersion = getAppVersion();
  current.exportedAt = new Date().toISOString();
  return current;
}

/**
 * Best-effort app version for embedding into exported bundles.
 * @returns {string}
 */
export function getAppVersion() {
  try {
    // Prefer build-time env vars if present.
    // @ts-ignore
    const v = (import.meta && import.meta.env && (import.meta.env.PUBLIC_APP_VERSION || import.meta.env.VITE_APP_VERSION || import.meta.env.APP_VERSION))
      ? String(import.meta.env.PUBLIC_APP_VERSION || import.meta.env.VITE_APP_VERSION || import.meta.env.APP_VERSION)
      : '';
    if (v && v.trim()) return v.trim();
  } catch {
    // ignore
  }

  // Fallback to lab-root dataset.
  const root = document.getElementById('lab-root');
  const ds = root?.dataset?.version || root?.dataset?.appVersion || '';
  if (ds && String(ds).trim()) return String(ds).trim();

  // Fallback to meta tag.
  const meta = document.querySelector('meta[name="app-version"]')?.getAttribute('content') || '';
  if (meta && meta.trim()) return meta.trim();

  return 'unknown';
}

/**
 * @typedef {Object} ThemeBundleV1
 * @property {string} app
 * @property {number} schemaVersion
 * @property {string} appVersion
 * @property {string} exportedAt
 * @property {'profile'|'oshi-card'} [target]
 * @property {string|null} templateId
 * @property {'template'|'extracted'} [baseMode]
 * @property {{capturedAt:string, css:string, body:string}|null} [extractedBase]
 * @property {string} customCss
 * @property {string} customHtml
 * @property {boolean} appendInstead
 * @property {boolean} autoUpdate
 * @property {boolean} enableMock
 * @property {{displayName:string, username:string, tagline:string, avatar:string, bg:string}} mock
 */

/**
 * Build an exportable theme bundle object from current UI state.
 * @returns {ThemeBundleV1}
 */
export function buildThemeBundle() {
  const bundle = {
    app: 'oshi-lab',
    schemaVersion: THEME_BUNDLE_SCHEMA_VERSION,
    appVersion: getAppVersion(),
    exportedAt: new Date().toISOString(),
    target: state.target || 'profile',
    templateId: state.activeTemplateId || null,
    baseMode: state.baseMode || 'template',

    customCss: els.customCss?.value || '',
    customHtml: els.customHtml?.value || '',
    appendInstead: !!els.appendInstead?.checked,
    autoUpdate: !!els.autoUpdate?.checked,
    enableMock: !!els.enableMock?.checked,
    mock: {
      displayName: els.mockDisplayName?.value || '',
      username: els.mockUsername?.value || '',
      tagline: els.mockTagline?.value || '',
      avatar: els.mockAvatar?.value || '',
      bg: els.mockBg?.value || '',
    },

  };

  // include extracted base snapshot (for reproducible previews across devices).
  const canInclude = !!(els.includeExtractedBase?.checked && state.baseMode === 'extracted' && state.extractedBase);
  if (canInclude) {
    // @ts-ignore
    bundle.extractedBase = { ...state.extractedBase };
    // @ts-ignore
    bundle.baseMode = 'extracted';
  }

  return bundle;
}

/**
 * @param {ThemeBundleV1} bundle
 * @returns {string}
 */
export function serializeThemeBundle(bundle) {
  return JSON.stringify(bundle, null, 2) + '\n';
}

/**
 * @param {number} n
 * @returns {string}
 */
function formatBytes(n) {
  const v = Math.max(0, Number.isFinite(n) ? n : 0);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * @param {ThemeBundleV1} bundle
 */
function computeThemeBundleSummary(bundle) {
  const json = serializeThemeBundle(bundle);
  const bytes = new Blob([json]).size;
  const includesHtml = !!(bundle.customHtml || '').trim();
  const includesMock = !!bundle.enableMock;
  const templateId = bundle.templateId || '—';
  const target = bundle.target || 'profile';
  const baseMode = bundle.baseMode || (bundle.extractedBase ? 'extracted' : 'template');
  const includesBase = !!bundle.extractedBase && baseMode === 'extracted';
  return { json, bytes, includesHtml, includesMock, templateId, target, baseMode, includesBase };
}

/**
 * Update the on-screen summary for the theme bundle export.
 */
export function updateThemeBundleSummary() {
  const infoEl = els.bundleInfo || document.getElementById('bundleInfo');
  if (!infoEl) return;

  const includeEl = els.includeExtractedBase || /** @type {HTMLInputElement|null} */ (document.getElementById('includeExtractedBase'));

  try {
    const bundle = buildThemeBundle();
    const s = computeThemeBundleSummary(bundle);

    // Enable extracted-base inclusion only when currently using an extracted base.
    if (includeEl) {
      const canInclude = (state.baseMode === 'extracted') && !!state.extractedBase;
      includeEl.disabled = !canInclude;
      if (!canInclude) includeEl.checked = false;
    }
    const parts = [
      `Bundle: ${formatBytes(s.bytes)}`,
      `HTML ${s.includesHtml ? '✓' : '—'}`,
      `Mock ${s.includesMock ? '✓' : '—'}`,
      s.baseMode === 'extracted'
        ? `Base: extracted${s.includesBase ? ' ✓' : ''}`
        : 'Base: template',
      `Target: ${s.target}`,
      `Template: ${s.templateId}`,
    ];
    infoEl.textContent = parts.join(' • ');
    infoEl.classList.remove('text-danger');
  } catch {
    infoEl.textContent = 'Bundle: —';
    infoEl.classList.add('text-danger');
  }
}

/**
 * Export the current theme bundle as JSON.
 */
export function exportThemeBundle() {
  try {
    const bundle = buildThemeBundle();
    const s = computeThemeBundleSummary(bundle);
    const includeEl = els.includeExtractedBase || document.getElementById('includeExtractedBase');

    // Enable extracted-base inclusion only when currently using an extracted base.
    if (includeEl) {
      const canInclude = (state.baseMode === 'extracted') && !!state.extractedBase;
      includeEl.disabled = !canInclude;
      if (!canInclude) includeEl.checked = false;
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `oshi-lab-theme-bundle-${date}.json`;
    downloadTextFile(filename, s.json, 'application/json;charset=utf-8');

    setStatus(
      'ok',
      `Exported theme bundle (${formatBytes(s.bytes)} • Target ${s.target} • HTML ${s.includesHtml ? '✓' : '—'} • Mock ${s.includesMock ? '✓' : '—'} • ${s.baseMode === 'extracted' ? `Base extracted${s.includesBase ? ' ✓' : ''}` : 'Base template'} • Template ${s.templateId}).`
    );
  } catch (e) {
    console.error(e);
    setStatus('err', 'Theme bundle export failed.');
  }
}

/**
 * Trigger the hidden file input.
 */
export function promptThemeBundleImport() {
  const input = els.themeImportInput || /** @type {HTMLInputElement|null} */ (document.getElementById('themeImportInput'));
  if (!input) {
    setStatus('err', 'Import control missing from the page.');
    return;
  }
  input.value = '';
  input.click();
}

/**
 * @param {any} obj
 * @returns {ThemeBundleV1}
 */
function normalizeThemeBundle(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Bundle must be a JSON object.');

  const schemaVersion = Number(obj.schemaVersion);
  if (!Number.isFinite(schemaVersion)) throw new Error('Missing or invalid schemaVersion.');
  if (schemaVersion !== THEME_BUNDLE_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${schemaVersion}. Expected ${THEME_BUNDLE_SCHEMA_VERSION}.`);
  }

  /** @type {ThemeBundleV1} */
  const bundle = {
    app: typeof obj.app === 'string' ? obj.app : 'oshi-lab',
    schemaVersion,
    appVersion: typeof obj.appVersion === 'string' ? obj.appVersion : 'unknown',
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    target: obj.target === 'oshi-card' ? 'oshi-card' : 'profile',
    templateId: (typeof obj.templateId === 'string') ? obj.templateId : null,

    customCss: typeof obj.customCss === 'string' ? obj.customCss : '',
    customHtml: typeof obj.customHtml === 'string' ? obj.customHtml : '',
    appendInstead: !!obj.appendInstead,
    autoUpdate: (typeof obj.autoUpdate === 'boolean') ? obj.autoUpdate : !!els.autoUpdate?.checked,
    enableMock: (typeof obj.enableMock === 'boolean') ? obj.enableMock : !!els.enableMock?.checked,
    mock: {
      displayName: typeof obj.mock?.displayName === 'string' ? obj.mock.displayName : '',
      username: typeof obj.mock?.username === 'string' ? obj.mock.username : '',
      tagline: typeof obj.mock?.tagline === 'string' ? obj.mock.tagline : '',
      avatar: typeof obj.mock?.avatar === 'string' ? obj.mock.avatar : '',
      bg: typeof obj.mock?.bg === 'string' ? obj.mock.bg : '',
    },
  };

  return bundle;
}

/**
 * Apply a bundle to the UI and state.
 * @param {ThemeBundleV1} bundle
 */
export async function applyThemeBundle(bundle) {
  // Apply target early so template selection and preview behavior stay aligned.
  state.target = bundle.target === 'oshi-card' ? 'oshi-card' : 'profile';
  try { localStorage.setItem('myoshi_theme_lab_target', state.target); } catch {}
  try { window.__OSHI_LAB_TARGET__ = state.target; } catch {}
  const cfg = getTargetConfig(state.target);
  document.getElementById('btnTargetProfile')?.classList.toggle('active', state.target === 'profile');
  document.getElementById('btnTargetOshiCard')?.classList.toggle('active', state.target === 'oshi-card');
  if (els.templateInput) els.templateInput.placeholder = cfg.templateInputPlaceholder;
  if (els.customHtml) els.customHtml.placeholder = `Your Custom HTML (${cfg.customHtmlHelpText})`;
  const htmlHelp = document.getElementById('customHtmlHelpText');
  if (htmlHelp) htmlHelp.innerHTML = `<b>Custom HTML</b> ${cfg.customHtmlHelpText}`;
  const mock = document.getElementById('mockDataSummary');
  if (mock) mock.textContent = cfg.mockTitle;
  const mobile = document.getElementById('btnToggleMobile');
  if (mobile) mobile.textContent = cfg.mobileButtonLabel;
  if (els.previewFrame) els.previewFrame.title = cfg.previewTitle;

  // Apply autoUpdate preference early so template load doesn't render unexpectedly.
  if (els.autoUpdate && typeof bundle.autoUpdate === 'boolean') els.autoUpdate.checked = bundle.autoUpdate;

  // Template first so any default mock values are applied before we overwrite.
  if (bundle.templateId && state.templatesById && state.templatesById.has(bundle.templateId)) {
    await loadTemplateById(bundle.templateId);
  } else if (bundle.templateId) {
    setStatus('warn', `Template not available: ${bundle.templateId}. Keeping current template.`);
  }

  if (els.customCss) els.customCss.value = bundle.customCss || '';
  if (els.customHtml) els.customHtml.value = bundle.customHtml || '';
  if (els.appendInstead) els.appendInstead.checked = !!bundle.appendInstead;
  if (els.enableMock) els.enableMock.checked = !!bundle.enableMock;

  if (els.mockDisplayName) els.mockDisplayName.value = bundle.mock?.displayName || '';
  if (els.mockUsername) els.mockUsername.value = bundle.mock?.username || '';
  if (els.mockTagline) els.mockTagline.value = bundle.mock?.tagline || '';
  if (els.mockAvatar) els.mockAvatar.value = bundle.mock?.avatar || '';
  if (els.mockBg) els.mockBg.value = bundle.mock?.bg || '';

  // keep CodeMirror in sync if mounted
  syncEditorsFromTextareas();

  updateThemeBundleSummary();
  setStatus('ok', 'Theme bundle imported.');
  if (els.autoUpdate?.checked) renderPreview();
}

/**
 * Handle file input selection.
 */
export async function handleThemeBundleImport(evt) {
    const input =
        (evt?.target instanceof HTMLInputElement ? evt.target : null) ||
        els.themeImportInput ||
        document.getElementById('themeImportInput');

    const file = input?.files?.[0];
    if (!file) return;

  try {
    const text = await file.text();
    let obj;
    try {
      obj = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON file.');
    }

    const bundle = isOshiForgeTheme(obj)
      ? convertOshiForgeThemeToBundle(obj)
      : normalizeThemeBundle(obj);
    await applyThemeBundle(bundle);

    // Provide a richer status message including summary.
    const s = computeThemeBundleSummary(bundle);
    setStatus(
      'ok',
      `Imported theme bundle (${formatBytes(s.bytes)} • Target ${s.target} • HTML ${s.includesHtml ? '✓' : '—'} • Mock ${s.includesMock ? '✓' : '—'} • ${s.baseMode === 'extracted' ? `Base extracted${s.includesBase ? ' ✓' : ''}` : 'Base template'} • Template ${s.templateId}).`
    );
  } catch (e) {
    console.error(e);
    const msg = (e && typeof e === 'object' && 'message' in e) ? String(e.message) : 'Theme bundle import failed.';
    setStatus('err', msg);
  } finally {
    if (input) input.value = '';
  }
}
