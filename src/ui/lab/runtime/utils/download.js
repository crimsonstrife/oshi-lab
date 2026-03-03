// @ts-check

/**
 * Download a text file with a configurable MIME type.
 *
 * @param {string} filename
 * @param {string} content
 * @param {string} [mime]
 */
export function downloadTextFile(filename, content, mime) {
  const type = (mime && String(mime).trim()) ? String(mime).trim() : 'text/plain;charset=utf-8';
  const blob = new Blob([content ?? ''], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

/**
 * Back-compat helper: download an HTML file.
 *
 * @param {string} filename
 * @param {string} content
 */
export function downloadFile(filename, content) {
  downloadTextFile(filename, content, 'text/html;charset=utf-8');
}
