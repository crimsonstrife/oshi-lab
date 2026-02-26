// @ts-check

export function safeUUID() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (window.crypto && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join(''),
    ].join('-');
  }

  // If a cryptographically secure random generator is not available, do do not fall back to Math.random(), which is insecure.
    // Instead, throw an error.
  throw new Error('safeUUID requires a cryptographically secure random source (window.crypto)');
}
