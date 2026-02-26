// @ts-check

export function getBasePath() {
  const root = document.getElementById("lab-root");
  /** @type {string} */
  let base = (root && root.dataset && root.dataset.base) ? root.dataset.base : "/";
  if (!base.startsWith("/")) base = "/" + base;
  if (!base.endsWith("/")) base += "/";
  return base;
}

// NOTE: root must exist before this module is evaluated.
export const BASE_PATH = getBasePath();
