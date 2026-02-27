// @ts-check

/**
 * @param {number} from
 * @param {number} to
 * @param {"error"|"warning"|"info"} severity
 * @param {string} message
 * @returns {import("@codemirror/lint").Diagnostic}
 */
function diag(from, to, severity, message) {
  return { from, to, severity, message };
}

/**
 * Minimal HTML lint:
 * - <img> missing alt
 * - role="button" missing tabindex
 * @param {string} html
 * @returns {import("@codemirror/lint").Diagnostic[]}
 */
export function lintHtmlBasic(html) {
  const out = [];
  if (!html) return out;

  const imgRe = /<img\\b(?![^>]*\\balt\\s*=)[^>]*>/gi;
  let m;
  while ((m = imgRe.exec(html))) {
    out.push(diag(m.index, m.index + m[0].length, "warning", "<img> is missing alt text."));
  }

  const roleBtnRe = /<([a-z0-9-]+)\\b[^>]*\\brole\\s*=\\s*["']button["'](?![^>]*\\btabindex\\s*=)[^>]*>/gi;
  while ((m = roleBtnRe.exec(html))) {
    out.push(diag(m.index, m.index + m[0].length, "warning", 'role="button" should usually include tabindex.'));
  }

  return out;
}

/**
 * Minimal CSS lint:
 * - !important usage
 * @param {string} css
 * @returns {import("@codemirror/lint").Diagnostic[]}
 */
export function lintCssBasic(css) {
  const out = [];
  if (!css) return out;

  const impRe = /!important\\b/g;
  let m;
  while ((m = impRe.exec(css))) {
    out.push(diag(m.index, m.index + "!important".length, "warning", "Avoid !important unless absolutely necessary."));
  }

  return out;
}
