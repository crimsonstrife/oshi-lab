// @ts-check

/**
 * Thin entrypoint for the oshi-lab application.
 * This file serves as the main entry point for initializing the lab runtime.
 * The runtime logic is modularized and located under the `./runtime/` directory.
 */
import { initLabRuntime } from './runtime/index.js';

/**
 * Initializes the lab runtime.
 * If an error occurs during initialization, it will be caught and logged to the console.
 */
initLabRuntime().catch((err) => {
  console.error(err);
});
