const x="modulepreload",w=function(t){return"/"+t},v={},k=function(r,i,n){let m=Promise.resolve();if(i&&i.length>0){let l=function(e){return Promise.all(e.map(o=>Promise.resolve(o).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),u=s?.nonce||s?.getAttribute("nonce");m=l(i.map(e=>{if(e=w(e),e in v)return;v[e]=!0;const o=e.endsWith(".css"),d=o?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${e}"]${d}`))return;const a=document.createElement("link");if(a.rel=o?"stylesheet":x,o||(a.as="script"),a.crossOrigin="",a.href=e,u&&a.setAttribute("nonce",u),document.head.appendChild(a),o)return new Promise((g,y)=>{a.addEventListener("load",g),a.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${e}`)))})}))}function p(l){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=l,window.dispatchEvent(s),!s.defaultPrevented)throw l}return m.then(l=>{for(const s of l||[])s.status==="rejected"&&p(s.reason);return r().catch(p)})};const C=[{id:"myoshi-classic",name:"MyOshi Classic",description:"Classic MyOshi profile as accurate as possible.",baseCssFile:"templates/myoshi-classic/base.css",baseBodyFile:"templates/myoshi-classic/base.html",mockDefaults:{displayName:"Username",username:"@username",tagline:"I'm a tagline!",avatar:"https://placehold.co/128x128/png",background:"https://placehold.co/1600x900/png"}},{id:"myoshi-core",name:"MyOshi Core (approx)",description:"A close-enough approximation of MyOshi profile structure (cards, groups, custom HTML mount).",baseCssFile:"templates/myoshi-core/base.css",baseBodyFile:"templates/myoshi-core/base.html",mockDefaults:{displayName:"CrimsonStrife",username:"@crimsonstrife",tagline:"",avatar:"https://placehold.co/128x128/png",background:"https://placehold.co/1600x900/png"}},{id:"minimal",name:"Minimal Mount Only",description:"Bare minimum markup with .profile-page + .profile-custom-html mount for quick experiments.",baseCssFile:"templates/minimal/base.css",baseBodyFile:"templates/minimal/base.html",mockDefaults:{displayName:"Demo User",username:"@demo",tagline:"",avatar:"",background:""}}],b={version:3,templates:C},f=b??{},c=Array.isArray(f.templates)?f.templates:Array.isArray(b)?b:[];async function S(t){if(!t)return;if(!c.length){t.innerHTML=`
      <div class="alert alert-danger m-3">
        <strong>No templates found.</strong><br>
        Check <code>templates.json</code> format.
      </div>
    `;return}const r=c.map(n=>`<option value="${encodeURIComponent(n.id)}">${n.name}${n.description?` — ${n.description}`:""}</option>`).join(""),i=c[0]?.description??"Built-in template";t.innerHTML=`
    <div id="myoshi-theme-lab" class="myoshi-lab-host">
      <div class="container-fluid py-3">

        <!-- Top Bar -->
        <nav class="navbar navbar-expand-lg border rounded-3 px-3 py-2 mb-3">
          <div class="container-fluid p-0 gap-2 align-items-start align-items-lg-center">
            <div class="d-flex flex-column min-w-0 me-auto">
              <div class="navbar-brand mb-0 fw-semibold">MyOshi Theme Lab</div>
              <div class="small text-body-secondary">
                Edit Custom CSS/HTML against a built-in demo profile. Import a real MyOshi preview for more accurate representation.
              </div>
            </div>

            <div class="d-flex flex-wrap gap-2 justify-content-end">
              <button class="btn btn-sm btn-outline-secondary" id="btnOnboarding" type="button" title="Show the new theme onboarding chooser">Start</button>
              <button class="btn btn-sm btn-outline-info" id="btnDocs" type="button">Docs</button>
              <button class="btn btn-sm btn-outline-primary" id="btnTools" type="button">Tools</button>
              <div class="vr d-none d-lg-block opacity-50"></div>
              <button class="btn btn-sm btn-outline-light" id="btnLoadDemo" type="button">Load Demo</button>
              <button class="btn btn-sm btn-outline-light" id="btnExtract" type="button">Extract Base</button>
              <button class="btn btn-sm btn-outline-light" id="btnRestoreTemplate" type="button">Restore Template</button>
              <button class="btn btn-sm btn-outline-warning" id="btnResetCustom" type="button">Reset Custom</button>

              <div class="vr d-none d-lg-block opacity-50"></div>

              <button class="btn btn-sm btn-outline-success" id="btnExportTheme" type="button">Export Theme</button>
              <button class="btn btn-sm btn-outline-success" id="btnImportTheme" type="button">Import Theme</button>
              <button class="btn btn-sm btn-outline-light" id="btnDownload" type="button">Download Preview</button>

              <input id="themeImportInput" type="file" accept="application/json,.json" class="d-none" />
            </div>
          </div>
        </nav>

        <div class="d-flex flex-wrap align-items-center justify-content-between mb-2 gap-2">
          <div id="bundleInfo" class="small text-body-secondary"></div>
          <div class="form-check form-switch small m-0">
            <input class="form-check-input" type="checkbox" id="includeExtractedBase" disabled />
            <label class="form-check-label" for="includeExtractedBase" title="Optional: include extracted base CSS/body in the exported bundle (larger file). Only available when using an extracted base.">
              Include extracted base
            </label>
          </div>
        </div>

        <div class="row g-3 m-0">
          <!-- Editors -->
          <section class="col-12 col-xxl-6 p-0">
            <div class="card border-0 h-100">
              <div class="card-header d-flex flex-column gap-2">
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
                  <div class="d-flex align-items-center gap-2 min-w-0">
                    <div class="fw-semibold">Editors</div>
                    <div class="text-body-secondary small text-truncate">
                      Template input can be the outer iframe HTML or the raw srcdoc HTML.
                    </div>
                  </div>

                  <div class="tabs nav nav-pills flex-wrap gap-1" role="tablist" aria-label="Editors">
  <button type="button" class="tab nav-link active" data-tab="template">Template</button>
  <button type="button" class="tab nav-link" data-tab="customCss">Custom CSS</button>
  <button type="button" class="tab nav-link" data-tab="customHtml">Custom HTML</button>
  <button type="button" class="tab nav-link" data-tab="audit">
    Audit <span id="auditBadge" class="badge text-bg-danger ms-1 d-none">!</span>
  </button>
  <button type="button" class="tab nav-link" data-tab="basePeek">Base Peek</button>
</div>
                </div>
              </div>

              <!-- Template -->
              <div class="editor-wrap active" id="wrap-template">
                <textarea
                  id="templateInput"
                  class="form-control rounded-0 border-0 flex-grow-1 font-monospace"
                  spellcheck="false"
                  placeholder="Paste MyOshi preview HTML (outer iframe or raw srcdoc indicated by class='profile-page profile-custom-css'), then click Extract Base."
                ></textarea>

                <div class="border-top bg-body-tertiary p-2 small">
                  <div class="d-flex flex-wrap gap-2">
                    <span class="badge text-bg-secondary">
                      <b>Template</b> → Base CSS + Base Body
                    </span>
                    <span class="badge text-bg-secondary">Preview: sandboxed</span>
                  </div>

                  <div class="d-flex flex-wrap gap-3 align-items-center mt-2">
                    <div class="form-check m-0">
                      <input class="form-check-input" type="checkbox" id="autoUpdate" checked>
                      <label class="form-check-label" for="autoUpdate">Auto-update preview</label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Custom CSS -->
              <div class="editor-wrap" id="wrap-customCss">
                <div id="cssEditor" class="code-editor flex-grow-1 min-h-0"></div>
                <textarea
                  id="customCss"
                  class="form-control rounded-0 border-0 font-monospace"
                  spellcheck="false"
                  placeholder="Your Custom CSS (paste into MyOshi Custom CSS)"
                  hidden
                ></textarea>

                <div class="border-top bg-body-tertiary p-2 small">
                  <div class="d-flex flex-wrap gap-2">
                    <span class="badge text-bg-secondary"><b>Custom CSS</b> appended after base CSS</span>
                  </div>

                  <div class="d-flex flex-wrap gap-2 align-items-center mt-2">
                    <button class="btn btn-sm btn-outline-light" id="btnFormatCss" type="button">Format</button>

                    <div class="form-check form-switch m-0">
                      <input class="form-check-input" type="checkbox" role="switch" id="cssLintToggle" checked>
                      <label class="form-check-label" for="cssLintToggle">Lint</label>
                    </div>

                    <span class="badge border" id="cssCharCount">0 / 50000</span>

                    <div class="form-check form-switch m-0">
                      <input class="form-check-input" type="checkbox" role="switch" id="cssHardCap" checked>
                      <label class="form-check-label" for="cssHardCap">Cap</label>
                    </div>

                    <button class="btn btn-sm btn-outline-light" id="btnCopyCSS" type="button">Copy CSS</button>

                    <span class="badge border">Base available in Base Peek</span>
                  </div>
                </div>
              </div>

              <!-- Custom HTML -->
              <div class="editor-wrap" id="wrap-customHtml">
                <div id="htmlEditor" class="code-editor flex-grow-1 min-h-0"></div>
                <textarea
                  id="customHtml"
                  class="form-control rounded-0 border-0 font-monospace"
                  spellcheck="false"
                  placeholder="Your Custom HTML (injected into .profile-custom-html)"
                  hidden
                ></textarea>

                <div class="border-top bg-body-tertiary p-2 small">
                  <div class="d-flex flex-wrap gap-2">
                    <span class="badge text-bg-secondary"><b>Custom HTML</b> injected into .profile-custom-html</span>
                  </div>

                  <div class="d-flex flex-wrap gap-3 align-items-center mt-2">
                    <div class="form-check m-0">
                      <input class="form-check-input" type="checkbox" id="appendInstead">
                      <label class="form-check-label" for="appendInstead">Append to end</label>
                    </div>

                    <button class="btn btn-sm btn-outline-light" id="btnFormatHtml" type="button">Format</button>

                    <div class="form-check form-switch m-0">
                      <input class="form-check-input" type="checkbox" role="switch" id="htmlLintToggle" checked>
                      <label class="form-check-label" for="htmlLintToggle">Lint</label>
                    </div>

                    <span class="badge border" id="htmlCharCount">0 / 50000</span>

                    <div class="form-check form-switch m-0">
                      <input class="form-check-input" type="checkbox" role="switch" id="htmlHardCap" checked>
                      <label class="form-check-label" for="htmlHardCap">Cap</label>
                    </div>

                    <button class="btn btn-sm btn-outline-light" id="btnCopyHTML" type="button">Copy HTML</button>
                  </div>
                </div>
              </div>

              <!-- Audit -->
              <div class="editor-wrap" id="wrap-audit">
                <div class="p-3 d-flex flex-column gap-3 min-h-0" style="height:100%">
                  <div class="d-flex flex-wrap align-items-start justify-content-between gap-2">
                    <div class="min-w-0">
                      <div class="fw-semibold">Audit Report</div>
                      <div class="text-muted small">
                        Checks Custom CSS/HTML against common issues and the latest MyOshi sanitizer/scoping rules.
                      </div>
                    </div>

                    <div class="d-flex flex-wrap align-items-center gap-2">
                      <div class="form-check form-switch m-0">
                        <input class="form-check-input" type="checkbox" role="switch" id="auditContrastToggle">
                        <label class="form-check-label small" for="auditContrastToggle">Contrast</label>
                      </div>
                      <button class="btn btn-sm btn-outline-info" id="btnRunAudit" type="button">Run Audit</button>
                      <button class="btn btn-sm btn-outline-light" id="btnCopyAuditJson" type="button">Copy JSON</button>
                    </div>
                  </div>

                  <div id="auditSummary" class="d-flex flex-wrap gap-2"></div>

                  <div class="border rounded bg-body-tertiary p-2 flex-grow-1 min-h-0 overflow-auto" style="max-height: 800px;">
                    <div id="auditOutput" class="list-group"></div>
                  </div>

                  <div class="text-muted small">
                    Note: some checks reflect how MyOshi transforms your CSS at display time
                    (e.g. <code>position: fixed</code> → <code>absolute</code>, caps on <code>z-index</code> and <code>blur()</code>, <code>@import</code> allowlist).
                  </div>
                </div>
              </div>

              <!-- Base Peek -->
              <div class="editor-wrap" id="wrap-basePeek">
                <textarea
                  id="basePeek"
                  class="form-control rounded-0 border-0 flex-grow-1 font-monospace"
                  spellcheck="false"
                  readonly
                  placeholder="After Extract Base, preview extracted CSS/body here."
                ></textarea>

                <div class="border-top bg-body-tertiary p-2 small">
                  <div class="d-flex flex-wrap gap-2">
                    <span class="badge text-bg-secondary"><b>Base Peek</b> read-only</span>
                  </div>

                  <div class="d-flex flex-wrap gap-2 mt-2">
                    <button class="btn btn-sm btn-outline-light" id="btnCopyBaseCss" type="button">Copy Base CSS</button>
                    <button class="btn btn-sm btn-outline-light" id="btnCopyBaseBody" type="button">Copy Base Body</button>
                    <button class="btn btn-sm btn-outline-light" id="btnCopySrcdoc" type="button">Copy Built srcdoc</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Preview -->
          <section class="col-12 col-xxl-6 p-0">
            <div class="card border-0 h-100">
              <div class="card-header d-flex flex-column gap-2">
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
                  <div class="d-flex align-items-center gap-2 min-w-0">
                    <div class="fw-semibold">Live Preview</div>
                    <div class="text-body-secondary small text-truncate">
                      srcdoc = base CSS + custom CSS + body with custom HTML injection
                    </div>
                  </div>
                  <div class="small text-body-secondary" id="statusText">Loading demo…</div>
                </div>

                <div class="d-flex flex-wrap align-items-center gap-2 w-100">
                  <div class="input-group input-group-sm" style="max-width: 340px;">
                    <span class="input-group-text">Template</span>
                    <select id="templateSelect" class="form-select form-select-sm">
                      ${r}
                    </select>
                  </div>
                  <div id="templateInfo" class="small text-muted flex-grow-1">${i}</div>
                </div>
              </div>

              <div class="card-body d-flex flex-column gap-2 min-h-0">
                <div class="d-flex flex-column gap-2">
                  <div class="d-flex flex-wrap align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-light" id="btnRenderNow" type="button">Render</button>
                    <button class="btn btn-sm btn-outline-light" id="btnToggleMobile" type="button">Mobile Width</button>
                    <button class="btn btn-sm btn-outline-light" id="btnFitPreview" type="button">Fit</button>
                    <button class="btn btn-sm btn-outline-light" id="btnPopout" type="button">Pop-out</button>
                    <button class="btn btn-sm btn-outline-light" id="btnSaveSnapshot" type="button">Save Snapshot</button>
                    <select id="snapshotSelect" class="form-select form-select-sm w-auto snapshot-select">
                      <option value="">Load snapshot…</option>
                    </select>
                    <button class="btn btn-sm btn-outline-danger" id="btnDeleteSnapshot" type="button">Delete</button>
                  </div>

                  <div class="row g-2 align-items-center">
                    <div class="col-12 col-md-6">
                      <label class="d-flex align-items-center gap-2 m-0 small">
                        <span class="text-muted">Zoom</span>
                        <input id="zoomRange" class="form-range flex-grow-1" type="range" min="40" max="200" step="5" value="100">
                        <span id="zoomLabel" class="badge text-bg-secondary">100%</span>
                      </label>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="d-flex align-items-center gap-2 m-0 small">
                        <span class="text-muted">Height</span>
                        <input id="heightRange" class="form-range flex-grow-1" type="range" min="480" max="2200" step="20" value="1080">
                        <span id="heightLabel" class="badge text-bg-secondary">1080px</span>
                      </label>
                    </div>
                  </div>
                </div>

                <details class="border rounded p-2">
                  <summary class="fw-semibold">Mock Profile Data</summary>
                  <div class="pt-2 d-flex flex-column gap-2">
                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <label class="form-label small mb-1">Display Name</label>
                        <input id="mockDisplayName" type="text" class="form-control form-control-sm" value="CrimsonStrife">
                      </div>
                      <div class="col-12 col-md-6">
                        <label class="form-label small mb-1">Username (@handle)</label>
                        <input id="mockUsername" type="text" class="form-control form-control-sm" value="@crimsonstrife">
                      </div>
                    </div>

                    <div>
                      <label class="form-label small mb-1">Tagline</label>
                      <input id="mockTagline" type="text" class="form-control form-control-sm" value="This is a Tagline, say something!">
                    </div>

                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <label class="form-label small mb-1">Avatar URL</label>
                        <input id="mockAvatar" type="text" class="form-control form-control-sm" value="https://placehold.co/128x128/png">
                      </div>
                      <div class="col-12 col-md-6">
                        <label class="form-label small mb-1">Background URL</label>
                        <input id="mockBg" type="text" class="form-control form-control-sm" value="https://placehold.co/1600x900/png">
                      </div>
                    </div>

                    <div class="form-check m-0">
                      <input class="form-check-input" type="checkbox" id="enableMock" checked>
                      <label class="form-check-label" for="enableMock">Enable mock replacements</label>
                    </div>
                  </div>
                </details>

                <div class="border rounded bg-body-tertiary flex-grow-1 min-h-0" id="frameShell">
                  <div id="frameViewport" class="w-100 h-100 d-flex justify-content-center align-items-start p-2">
                    <iframe id="previewFrame" title="MyOshi Theme Lab Preview" sandbox="" referrerpolicy="no-referrer"></iframe>
                  </div>
                </div>
              </div>
            </div>
          </section>
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

        <!-- New Theme Onboarding -->
        <div class="modal fade" id="onboardingModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <div class="d-flex flex-column">
                  <h5 class="modal-title mb-0">Start a New Theme</h5>
                  <div class="small text-body-secondary">Pick a path for faster time-to-result. You can always change later.</div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>

              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-12 col-md-4">
                    <div class="border rounded p-3 h-100 d-flex flex-column">
                      <div class="fw-semibold">Start from a Template</div>
                      <div class="small text-body-secondary mt-1 flex-grow-1">
                        Load a built-in MyOshi template and start customizing from a known-good base.
                      </div>
                      <button class="btn btn-sm btn-outline-primary mt-2" type="button" data-onboard="template">Use Template</button>
                    </div>
                  </div>

                  <div class="col-12 col-md-4">
                    <div class="border rounded p-3 h-100 d-flex flex-column">
                      <div class="fw-semibold">Use Quick Theme Builder</div>
                      <div class="small text-body-secondary mt-1 flex-grow-1">
                        Pick a preset or tweak a palette + a few style knobs to generate a full starter theme.
                      </div>
                      <button class="btn btn-sm btn-outline-primary mt-2" type="button" data-onboard="builder">Open Builder</button>
                    </div>
                  </div>

                  <div class="col-12 col-md-4">
                    <div class="border rounded p-3 h-100 d-flex flex-column">
                      <div class="fw-semibold">Paste Existing CSS/HTML</div>
                      <div class="small text-body-secondary mt-1 flex-grow-1">
                        Bring your current theme in, then run Scope Fixer + Audit suggestions to align with the latest MyOshi rules.
                      </div>
                      <button class="btn btn-sm btn-outline-primary mt-2" type="button" data-onboard="paste">Paste & Fix</button>
                    </div>
                  </div>
                </div>

                <div class="alert alert-secondary mt-3 mb-0 small">
                  Tip: If you close this, it won't show again automatically — use the <b>Start</b> button in the header to reopen.
                </div>
              </div>

              <div class="modal-footer justify-content-between">
                <div class="small text-body-secondary">You can reopen this anytime.</div>
                <button type="button" class="btn btn-sm btn-outline-light" data-bs-dismiss="modal">Not now</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,window.__MYOSHI_LAB_TEMPLATES__=c,await k(()=>import("./oshi-lab.e6f-KHX1.js"),[])}const h=document.getElementById("lab-root");try{S(document.getElementById("lab-root")).catch(t=>{console.error("initLab failed:",t),h&&(h.innerHTML=`
          <div class="alert alert-danger m-3" role="alert">
            <strong>Failed to load initLab.</strong><br>
            Check the browser console for details.
          </div>`)})}catch(t){console.error("initLab failed:",t)}
