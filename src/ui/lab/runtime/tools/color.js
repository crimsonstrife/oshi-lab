// @ts-check

/**
 * Clamps a given number to fit within the range of a byte (0 to 255).
 * If the number is not finite, it will default to 0.
 *
 * @param {number} n The input number to be clamped.
 * @return {number} The clamped value, which will be between 0 and 255.
 */
function clampByte(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Parses a color string into an object with r, g, b, and a properties.
 * Supports hexadecimal format (#RGB, #RGBA, #RRGGBB, #RRGGBBAA) and
 * rgb()/rgba() notations.
 *
 * @param {string} input - The string representing the color to parse.
 * @return {{r: number, g: number, b: number, a: number} | null} An object with
 * r, g, b, and a property if parsing is successful, or null if the input
 * is invalid or unsupported.
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

/**
 * Converts a given number to its hexadecimal string representation,
 * ensuring it is clamped to a byte (0-255) and always 2 characters long.
 *
 * @param {number} n - The number to be converted to a 2-character hexadecimal string.
 * @return {string} The 2-character hexadecimal string representation of the number.
 */
function toHex2(n) {
  return clampByte(n).toString(16).padStart(2, '0');
}

/**
 * Formats color values into a hexadecimal string representation.
 *
 * @param {Object} color - The color object containing RGBA components.
 * @param {number} color.r - The red component (0-255).
 * @param {number} color.g - The green component (0-255).
 * @param {number} color.b - The blue component (0-255).
 * @param {number} [color.a] - The optional alpha component (0-1).
 * @return {string} The formatted hexadecimal color string.
 */
export function formatHex({ r, g, b, a }) {
  const base = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  if (a == null || a >= 1) return base;
  return `${base}${toHex2(a * 255)}`;
}

/**
 * Formats an RGBA color object into a CSS-compatible rgba() string.
 *
 * @param {Object} color - The RGBA color object.
 * @param {number} color.r - The red component (0-255).
 * @param {number} color.g - The green component (0-255).
 * @param {number} color.b - The blue component (0-255).
 * @param {number} [color.a] - The alpha component (0-1). Defaults to 1 if not provided.
 * @return {string} The formatted rgba() string.
 */
export function formatRgba({ r, g, b, a }) {
  const alpha = a == null ? 1 : a;
  const aText = alpha >= 1 ? '1' : String(Math.round(alpha * 1000) / 1000);
  return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${aText})`;
}
