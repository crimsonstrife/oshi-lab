// @ts-check
/**
 * Retrieves the base path from the dataset of the element with the ID "lab-root".
 * If the base path is not defined, defaults to "/".
 * Adjusts the base path to ensure it begins and ends with a "/" character.
 *
 * @return {string} The normalized base path.
 */
export function getBasePath() {
  const root = document.getElementById("lab-root");
  /** @type {string} */
  let base = (root && root.dataset && root.dataset.base) ? root.dataset.base : "/";
  if (!base.startsWith("/")) base = "/" + base;
  if (!base.endsWith("/")) base += "/";
  return base;
}

// NOTE: a root must exist before this module is evaluated.
/**
 * Represents the base path of the application or API.
 * This variable is dynamically assigned the value returned by the `getBasePath` function.
 * It is commonly used for constructing URLs or referencing the root path of the system.
 */
export const BASE_PATH = getBasePath();
