// @ts-check

/**
 * Downloads a file with the specified filename and content.
 *
 * @param {string} filename - The name of the file to be downloaded.
 * @param {string} content - The content to be included in the file.
 * @return {void} This function does not return a value.
 */
export function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
