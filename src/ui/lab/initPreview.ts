/**
 * Initializes the preview by loading and displaying HTML content stored in localStorage into an iframe.
 * The key used to retrieve the HTML content is obtained from the query parameters in the URL.
 * If the required key is missing or the content does not exist in localStorage, an error message is displayed.
 *
 * @return {void} Does not return a value.
 */
export function initPreview() {
    const frame = document.getElementById('fullPreviewFrame') as HTMLIFrameElement | null;
    if (!frame) return;

    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');

    if (!key) {
        document.body.innerHTML = `
      <div style="padding:16px;color:#fff;background:#111;font-family:system-ui">
        Missing preview key.
      </div>
    `;
        return;
    }

    const html = localStorage.getItem(key);
    if (!html) {
        document.body.innerHTML = `
      <div style="padding:16px;color:#fff;background:#111;font-family:system-ui">
        Preview data not found, it may have expired or been cleared.
      </div>
    `;
        return;
    }

    frame.srcdoc = html;

    // Cleanup after loading
    // localStorage.removeItem(key);
}

initPreview();