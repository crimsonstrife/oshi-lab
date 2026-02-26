// @ts-check

// Thin entrypoint.
// The full runtime is split into modules under ./runtime/.
import { initLabRuntime } from './runtime/index.js';

initLabRuntime().catch((err) => {
  console.error(err);
});
