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
        Preview data not found (it may have expired or been cleared).
      </div>
    `;
        return;
    }

    frame.srcdoc = html;

    // Optional cleanup after loading
    // localStorage.removeItem(key);
}

initPreview();