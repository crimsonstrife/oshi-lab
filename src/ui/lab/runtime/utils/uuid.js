// @ts-check

/**
 * Generates a universally unique identifier (UUID) in a safe and reliable manner.
 * This function attempts to use the most secure method available in the current environment.
 *
 * - If `crypto.randomUUID` is available, it is used to generate the UUID.
 * - If `crypto.getRandomValues` is available, it generates a UUID using random bytes.
 * - As a fallback, it generates a UUID using a less secure Math.random-based approach.
 *
 * @returns {string} A UUID string in the format `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.
 */
export function safeUUID() {
  // Use crypto.randomUUID if available for secure UUID generation
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Use crypto.getRandomValues to generate a UUID if randomUUID is unavailable
  if (window.crypto && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set the version and variant bits according to the UUID specification
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 1

    // Convert the byte array to a UUID string
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join(''),
    ].join('-');
  }

  // Fallback: Generate a UUID using Math.random (less secure)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
  });
}