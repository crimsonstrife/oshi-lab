import { webcrypto } from 'node:crypto';

// jsdom may not provide crypto.randomUUID/getRandomValues consistently across versions.
// The app's snapshot UUID helper prefers `crypto.randomUUID` when available.
if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

// Some DOM download helpers use URL.createObjectURL; provide a minimal stub for tests.
if (!globalThis.URL) {
  // @ts-ignore
  globalThis.URL = {};
}
if (!globalThis.URL.createObjectURL) {
  // @ts-ignore
  globalThis.URL.createObjectURL = () => 'blob:mock';
}
if (!globalThis.URL.revokeObjectURL) {
  // @ts-ignore
  globalThis.URL.revokeObjectURL = () => {};
}
