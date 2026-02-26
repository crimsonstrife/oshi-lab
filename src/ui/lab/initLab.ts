// @ts-ignore
import templateData from './data/templates.json';

type LabTemplate = {
  id: string;
  name: string;
  description?: string;
  baseCss: string;
  baseBody: string;
  mockDefaults?: {
    displayName?: string;
    username?: string;
    tagline?: string;
    avatar?: string;
    background?: string;
  };
};

type TemplateDataShape = {
  version?: number;
  templates?: LabTemplate[];
};

const templateStore = (templateData ?? {}) as TemplateDataShape;
const templates: LabTemplate[] = Array.isArray(templateStore.templates)
  ? templateStore.templates
  : Array.isArray(templateData)
    ? (templateData as unknown as LabTemplate[])
    : [];

export async function initLab(root: HTMLElement | null): Promise<void> {
  if (!root) return;

  if (!templates.length) {
    root.innerHTML = `
      <div class="alert alert-danger m-3">
        <strong>No templates found.</strong><br>
        Check <code>templates.json</code> format.
      </div>
    `;
    return;
  }

  const options = templates
    .map((t) => `<option value="${encodeURIComponent(t.id)}">${t.name}${t.description ? ` — ${t.description}` : ''}</option>`)
    .join('');
  const firstInfo = templates[0]?.description ?? 'Built-in template';

  root.innerHTML = `
    <div id="myoshi-theme-lab" class="myoshi-lab-host" data-bs-theme="dark">
      <div class="app">
        <header class="lab-header d-flex flex-wrap align-items-start align-items-md-center justify-content-between gap-2">
          <div class="title">
            <h1>MyOshi Theme Lab</h1>
            <div class="sub">Edit Custom CSS/HTML against a built-in demo profile. Import a real MyOshi preview for more accurate representation.</div>
          </div>
          <div class="toolbar d-flex flex-wrap gap-2 justify-content-end">
            <button class="btn btn-sm btn-outline-info secondary" id="btnDocs" type="button">Docs</button>
            <button class="btn btn-sm btn-outline-primary secondary" id="btnTools" type="button">Tools</button>
            <button class="btn btn-sm btn-outline-light secondary" id="btnLoadDemo" type="button">Load Demo</button>
            <button class="btn btn-sm btn-outline-light secondary" id="btnExtract" type="button">Extract Base</button>
            <button class="btn btn-sm btn-outline-light secondary" id="btnRestoreTemplate" type="button">Restore Template</button>
            <button class="btn btn-sm btn-outline-warning secondary" id="btnResetCustom" type="button">Reset Custom</button>
            <button class="btn btn-sm btn-outline-success good" id="btnDownload" type="button">Download Bundle</button>
          </div>
        </header>

        <div class="main row g-3 gx-3 gy-3 m-0">
          <section class="col-12 col-xxl-6 px-0">
            <div class="panel card border-0 h-100">
              <div class="panel-head card-header d-flex flex-column gap-2">
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
                  <div class="left d-flex align-items-center gap-2 min-w-0">
                    <div class="name">Editors</div>
                    <div class="hint">Template input can be the outer iframe HTML or the raw srcdoc HTML.</div>
                  </div>
                  <div class="tabs nav nav-pills gap-1" role="tablist" aria-label="Editors">
                    <button type="button" class="tab nav-link active" data-tab="template">Template</button>
                    <button type="button" class="tab nav-link" data-tab="customCss">Custom CSS</button>
                    <button type="button" class="tab nav-link" data-tab="customHtml">Custom HTML</button>
                    <button type="button" class="tab nav-link" data-tab="basePeek">Base Peek</button>
                  </div>
                </div>
              </div>

              <div class="editor-wrap active" id="wrap-template">
                <textarea id="templateInput" class="form-control rounded-0 border-0" spellcheck="false" placeholder="Paste MyOshi preview HTML (outer iframe or raw srcdoc indicated by class='profile-page profile-custom-css'), then click Extract Base."></textarea>
                <div class="meta">
                  <div class="row">
                    <span class="pill"><b>Template</b> → Base CSS + Base Body</span>
                    <span class="pill">Preview: sandboxed</span>
                  </div>
                  <div class="row d-flex flex-wrap gap-3 align-items-center">
                    <div class="d-flex align-items-center gap-2">
                      <input class="form-check-input m-0" type="checkbox" id="autoUpdate" checked>
                      <label for="autoUpdate" class="m-0">Auto-update preview</label>
                    </div>
                  </div>
                </div>
              </div>

              <div class="editor-wrap" id="wrap-customCss">
                <textarea id="customCss" class="form-control rounded-0 border-0" spellcheck="false" placeholder="Your Custom CSS (paste into MyOshi Custom CSS)"></textarea>
                <div class="meta">
                  <div class="row"><span class="pill"><b>Custom CSS</b> appended after base CSS</span></div>
                  <div class="row d-flex flex-wrap gap-2">
                    <button class="btn btn-sm btn-outline-light secondary" id="btnFormatCss" type="button">Quick format</button>
                    <button class="btn btn-sm btn-outline-light secondary" id="btnCopyCSS" type="button">Copy CSS</button>
                    <span class="badge text-bg-dark border">Base available in Base Peek</span>
                  </div>
                </div>
              </div>

              <div class="editor-wrap" id="wrap-customHtml">
                <textarea id="customHtml" class="form-control rounded-0 border-0" spellcheck="false" placeholder="Your Custom HTML (injected into .profile-custom-html)"></textarea>
                <div class="meta">
                  <div class="row"><span class="pill"><b>Custom HTML</b> injected into .profile-custom-html</span></div>
                  <div class="row d-flex flex-wrap gap-3 align-items-center">
                    <div class="d-flex align-items-center gap-2">
                      <input class="form-check-input m-0" type="checkbox" id="appendInstead">
                      <label for="appendInstead" class="m-0">Append to end</label>
                    </div>
                    <button class="btn btn-sm btn-outline-light secondary" id="btnCopyHTML" type="button">Copy HTML</button>
                  </div>
                </div>
              </div>

              <div class="editor-wrap" id="wrap-basePeek">
                <textarea id="basePeek" class="form-control rounded-0 border-0" spellcheck="false" readonly placeholder="After Extract Base, preview extracted CSS/body here."></textarea>
                <div class="meta">
                  <div class="row"><span class="pill"><b>Base Peek</b> read-only</span></div>
                  <div class="row d-flex flex-wrap gap-2">
                    <button class="btn btn-sm btn-outline-light secondary" id="btnCopyBaseCss" type="button">Copy Base CSS</button>
                    <button class="btn btn-sm btn-outline-light secondary" id="btnCopyBaseBody" type="button">Copy Base Body</button>
                    <button class="btn btn-sm btn-outline-light secondary" id="btnCopySrcdoc" type="button">Copy Built srcdoc</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="col-12 col-xxl-6 px-0">
            <div class="panel card border-0 h-100">
              <div class="panel-head card-header d-flex flex-column gap-2">
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
                  <div class="left d-flex align-items-center gap-2 min-w-0">
                    <div class="name">Live Preview</div>
                    <div class="hint">srcdoc = base CSS + custom CSS + body with custom HTML injection</div>
                  </div>
                  <div class="status" id="statusText">Loading demo…</div>
                </div>
                <div class="d-flex flex-wrap align-items-center gap-2 w-100">
                  <label class="d-flex align-items-center gap-2 m-0 template-select-wrap">
                    <span class="text-muted small">Template</span>
                    <select id="templateSelect" class="form-select form-select-sm">
                      ${options}
                    </select>
                  </label>
                  <div id="templateInfo" class="small text-muted flex-grow-1">${firstInfo}</div>
                </div>
              </div>

              <div class="preview-wrap card-body d-flex flex-column gap-2 min-h-0">
                <div class="preview-controls d-flex flex-column gap-2">
                  <div class="d-flex flex-wrap align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-light secondary" id="btnRenderNow" type="button">Render</button>
                    <button class="btn btn-sm btn-outline-light secondary" id="btnToggleMobile" type="button">Mobile Width</button>
                    <button class="btn btn-sm btn-outline-light secondary" id="btnFitPreview" type="button">Fit</button>
                    <button class="btn btn-sm btn-outline-light secondary" id="btnPopout" type="button">Pop-out</button>
                    <button class="btn btn-sm btn-outline-light secondary" id="btnSaveSnapshot" type="button">Save Snapshot</button>
                    <select id="snapshotSelect" class="form-select form-select-sm snapshot-select">
                      <option value="">Load snapshot…</option>
                    </select>
                    <button class="btn btn-sm btn-outline-danger danger" id="btnDeleteSnapshot" type="button">Delete</button>
                  </div>

                  <div class="row g-2 align-items-center">
                    <div class="col-12 col-md-6">
                      <label class="d-flex align-items-center gap-2 m-0 small">
                        <span class="text-muted range-label">Zoom</span>
                        <input id="zoomRange" class="form-range flex-grow-1" type="range" min="40" max="200" step="5" value="100">
                        <span id="zoomLabel" class="badge text-bg-secondary">100%</span>
                      </label>
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="d-flex align-items-center gap-2 m-0 small">
                        <span class="text-muted range-label">Height</span>
                        <input id="heightRange" class="form-range flex-grow-1" type="range" min="480" max="2200" step="20" value="1080">
                        <span id="heightLabel" class="badge text-bg-secondary">1080px</span>
                      </label>
                    </div>
                  </div>
                </div>

                <details>
                  <summary>Mock Profile Data</summary>
                  <div class="details-body">
                    <div class="grid2">
                      <label><span>Display Name</span><input id="mockDisplayName" type="text" class="form-control form-control-sm" value="CrimsonStrife"></label>
                      <label><span>Username (@handle)</span><input id="mockUsername" type="text" class="form-control form-control-sm" value="@crimsonstrife"></label>
                    </div>
                    <label><span>Tagline</span><input id="mockTagline" type="text" class="form-control form-control-sm" value="This is a Tagline, say something!"></label>
                    <div class="grid2">
                      <label><span>Avatar URL</span><input id="mockAvatar" type="text" class="form-control form-control-sm" value="https://placehold.co/128x128/png"></label>
                      <label><span>Background URL</span><input id="mockBg" type="text" class="form-control form-control-sm" value="https://placehold.co/1600x900/png"></label>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      <input class="form-check-input m-0" type="checkbox" id="enableMock" checked>
                      <label for="enableMock" class="m-0">Enable mock replacements</label>
                    </div>
                  </div>
                </details>

                <div class="preview-frame-shell flex-grow-1" id="frameShell">
                  <div id="frameViewport" class="w-100 h-100 d-flex justify-content-center align-items-start">
                    <iframe id="previewFrame" title="MyOshi Theme Lab Preview" sandbox="" referrerpolicy="no-referrer"></iframe>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <!-- Tools / Command Palette -->
<div class="modal fade" id="toolsModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header">
        <div class="d-flex flex-column">
          <h5 class="modal-title mb-0">Tools</h5>
          <div class="small text-body-secondary">Press <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>

      <div class="modal-body">
        <input
          id="toolsSearch"
          class="form-control mb-3"
          placeholder="Search tools…"
          autocomplete="off"
        />

        <div class="row g-3">
          <div class="col-12 col-lg-3">
            <div id="toolsList" class="list-group"></div>
          </div>

          <div class="col-12 col-lg-9">
            <div id="toolsPanel" class="border rounded p-3 bg-body-tertiary">
              <div class="text-body-secondary">Select a tool on the left.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer justify-content-between">
        <div class="small text-body-secondary">
          Tip: tools can insert snippets directly into Custom CSS/HTML at your cursor.
        </div>
        <button type="button" class="btn btn-sm btn-outline-light" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>
    </div>
  `;

  // Pass templates to the JS runtime
  (window as any).__MYOSHI_LAB_TEMPLATES__ = templates;

  // @ts-ignore
  await import('./oshi-lab.js');
}
