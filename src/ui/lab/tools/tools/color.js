// @ts-check

function clampByte(n) {
  n = Number(n);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * @param {string} input
 * @returns {{r:number,g:number,b:number,a:number}|null}
 */
export function parseColor(input) {
  if (!input) return null;
  const s = input.trim();

  // Hex (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
  const hex = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1].toLowerCase();
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  // rgb() / rgba()
  const rgb = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+)\s*)?\)$/i);
  if (rgb) {
    const r = clampByte(rgb[1]);
    const g = clampByte(rgb[2]);
    const b = clampByte(rgb[3]);
    let a = rgb[4] == null ? 1 : Number(rgb[4]);
    if (!Number.isFinite(a)) a = 1;
    a = Math.max(0, Math.min(1, a));
    return { r, g, b, a };
  }

  return null;
}

function toHex2(n) {
  return clampByte(n).toString(16).padStart(2, '0');
}

/** @param {{r:number,g:number,b:number,a:number}} c */
export function formatHex({ r, g, b, a }) {
  const base = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  if (a == null || a >= 1) return base;
  return `${base}${toHex2(a * 255)}`;
}

/** @param {{r:number,g:number,b:number,a:number}} c */
export function formatRgba({ r, g, b, a }) {
  const alpha = a == null ? 1 : a;
  const aText = alpha >= 1 ? '1' : String(Math.round(alpha * 1000) / 1000);
  return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${aText})`;
}
