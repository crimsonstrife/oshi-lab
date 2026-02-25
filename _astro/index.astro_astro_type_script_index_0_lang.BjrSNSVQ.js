const y="modulepreload",w=function(e){return"/"+e},u={},k=function(c,o,l){let b=Promise.resolve();if(o&&o.length>0){let s=function(t){return Promise.all(t.map(i=>Promise.resolve(i).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};document.getElementsByTagName("link");const n=document.querySelector("meta[property=csp-nonce]"),m=n?.nonce||n?.getAttribute("nonce");b=s(o.map(t=>{if(t=w(t),t in u)return;u[t]=!0;const i=t.endsWith(".css"),d=i?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${t}"]${d}`))return;const a=document.createElement("link");if(a.rel=i?"stylesheet":y,i||(a.as="script"),a.crossOrigin="",a.href=t,m&&a.setAttribute("nonce",m),document.head.appendChild(a),i)return new Promise((h,x)=>{a.addEventListener("load",h),a.addEventListener("error",()=>x(new Error(`Unable to preload CSS for ${t}`)))})}))}function v(s){const n=new Event("vite:preloadError",{cancelable:!0});if(n.payload=s,window.dispatchEvent(n),!n.defaultPrevented)throw s}return b.then(s=>{for(const n of s||[])n.status==="rejected"&&v(n.reason);return c().catch(v)})};const C=JSON.parse(`[{"id":"myoshi-core","name":"MyOshi Core (approx)","description":"A close-enough approximation of MyOshi profile structure (cards, groups, custom HTML mount).","baseCss":":root{\\n  --vs-border: var(--vs-border, rgba(40,60,90,.55));\\n  --vs-bg-white: var(--vs-bg-white, rgba(18,24,36,.85));\\n  --vs-bg: var(--vs-bg, rgba(10,14,22,.65));\\n  --vs-text: var(--vs-text, #e7eefc);\\n  --vs-muted: var(--vs-muted, rgba(231,238,252,.75));\\n  --vs-link: var(--vs-link, #6df);\\n}\\n\\n* { box-sizing: border-box; }\\n\\nbody { margin: 0; color: var(--vs-text); background: #0b0f17; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }\\n\\na { color: var(--vs-link); }\\n\\n.profile-page{\\n  min-height: 100vh;\\n  padding: 12px 12px 40px;\\n  background-size: cover;\\n  background-position: center top;\\n  background-attachment: fixed;\\n  background-repeat: no-repeat;\\n}\\n\\n.profile-topbar{\\n  max-width: 1020px;\\n  margin: 0 auto 12px;\\n  padding: 10px 12px;\\n  border: 1px solid var(--vs-border);\\n  background: rgba(0,0,0,.20);\\n  border-radius: 12px;\\n  display:flex;\\n  align-items:center;\\n  justify-content:space-between;\\n  gap: 10px;\\n  backdrop-filter: blur(10px);\\n}\\n\\n.profile-topbar .left{ display:flex; gap:10px; align-items:center; min-width:0; }\\n.profile-topbar .brand{ font-weight: 900; letter-spacing:.4px; white-space:nowrap; }\\n.profile-topbar .status{ color: var(--vs-muted); font-size: 12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\\n\\n.profile-container{\\n  max-width: 1020px;\\n  margin: 0 auto;\\n  display: grid;\\n  grid-template-columns: 1.15fr .85fr; /* 2-col default */\\n  gap: 12px;\\n  align-items: start;\\n}\\n\\n.col{ display:grid; gap: 12px; }\\n\\n.card{\\n  border: 1px solid var(--vs-border);\\n  background: var(--vs-bg-white);\\n  border-radius: 12px;\\n  overflow: hidden;\\n  box-shadow: 0 18px 50px rgba(0,0,0,.35);\\n}\\n\\n.card-header{\\n  padding: 10px 12px;\\n  font-weight: 800;\\n  font-size: 12px;\\n  border-bottom: 1px solid var(--vs-border);\\n  display: flex;\\n  justify-content: space-between;\\n  align-items: center;\\n  gap: 10px;\\n  background: rgba(0,0,0,.14);\\n}\\n\\n.card-header a{\\n  text-decoration: none;\\n  font-weight: 700;\\n  font-size: 12px;\\n}\\n\\n.card-body{ padding: 12px; background: rgba(0,0,0,.08); }\\n\\n.profile-head{\\n  display: flex;\\n  gap: 12px;\\n  align-items: center;\\n}\\n\\nimg.profile-avatar{\\n  width: 84px; height: 84px;\\n  border-radius: 12px;\\n  border: 1px solid var(--vs-border);\\n  background: rgba(0,0,0,.2);\\n  object-fit: cover;\\n  flex: 0 0 auto;\\n}\\n\\n.profile-meta{ min-width: 0; }\\n.profile-display-name{ font-size: 18px; font-weight: 900; line-height: 1.1; }\\n.profile-username{ font-size: 13px; color: var(--vs-muted); margin-top: 2px; }\\n.profile-tagline{\\n  margin-top: 8px;\\n  padding: 10px 10px;\\n  border: 1px solid var(--vs-border);\\n  background: rgba(10,14,22,.35);\\n  border-radius: 10px;\\n  color: var(--vs-muted);\\n  font-size: 13px;\\n}\\n\\n.section-links{\\n  display:flex;\\n  gap: 8px;\\n  flex-wrap: wrap;\\n}\\n\\n.section-links a{\\n  display:inline-flex;\\n  align-items:center;\\n  gap: 8px;\\n  padding: 8px 10px;\\n  border: 1px solid var(--vs-border);\\n  border-radius: 999px;\\n  background: rgba(10,14,22,.28);\\n  text-decoration:none;\\n  font-size: 12px;\\n  font-weight: 800;\\n}\\n\\n.blurb-section{\\n  padding: 10px 12px;\\n  border: 1px solid var(--vs-border);\\n  border-radius: 10px;\\n  background: rgba(10,14,22,.35);\\n}\\n.blurb-section + .blurb-section{ margin-top: 8px; }\\n\\n.grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 8px; }\\n.grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }\\n\\n.thumb{\\n  aspect-ratio: 1;\\n  border: 1px solid var(--vs-border);\\n  border-radius: 10px;\\n  background: rgba(0,0,0,.25);\\n  overflow:hidden;\\n  display:flex;\\n  align-items:end;\\n  justify-content:flex-start;\\n  padding: 6px 8px;\\n  font-size: 11px;\\n  color: rgba(231,238,252,.85);\\n}\\n\\n.link-btn{\\n  display:flex;\\n  justify-content:space-between;\\n  gap: 8px;\\n  padding: 10px 12px;\\n  border: 1px solid var(--vs-border);\\n  border-radius: 10px;\\n  background: rgba(10,14,22,.30);\\n  text-decoration:none;\\n  font-weight: 800;\\n}\\n\\n.small-muted{ color: var(--vs-muted); font-size: 12px; }\\n\\n@media (max-width: 980px){\\n  .profile-container{ grid-template-columns: 1fr; }\\n}","baseBody":"<div class=\\"profile-page profile-custom-css\\" style=\\"background-image:url('https://placehold.co/1600x900/png');\\">\\n  <div class=\\"profile-topbar\\">\\n    <div class=\\"left\\">\\n      <div class=\\"brand\\">MyOshi</div>\\n      <div class=\\"status\\">Demo profile — edit Custom CSS/HTML on the left (import a real preview for 1:1).</div>\\n    </div>\\n    <div class=\\"right small-muted\\">boop • message • follow</div>\\n  </div>\\n\\n  <div class=\\"profile-container\\">\\n    <!-- LEFT COLUMN -->\\n    <div class=\\"col left\\">\\n      <div class=\\"card\\">\\n        <div class=\\"card-body\\">\\n          <div class=\\"profile-head\\">\\n            <img class=\\"profile-avatar\\" src=\\"https://placehold.co/128x128/png\\" alt=\\"Avatar\\">\\n            <div class=\\"profile-meta\\">\\n              <div class=\\"profile-display-name\\">CrimsonStrife</div>\\n              <div class=\\"profile-username\\">@crimsonstrife</div>\\n              <div class=\\"profile-tagline\\">“tagline / quote box” — themes often add glow/border here.</div>\\n            </div>\\n          </div>\\n        </div>\\n      </div>\\n\\n      <div class=\\"card\\">\\n        <div class=\\"card-header\\"><span>About</span><a href=\\"#\\">Edit</a></div>\\n        <div class=\\"card-body\\">\\n          <div class=\\"blurb-section\\">\\n            This is a demo profile with a MyOshi-like panel layout so you can style immediately.\\n          </div>\\n          <div class=\\"blurb-section\\">\\n            Import a real MyOshi preview (Template Input → Extract Base) when you need perfect fidelity.\\n          </div>\\n        </div>\\n      </div>\\n\\n      <div class=\\"card\\">\\n        <div class=\\"card-header\\"><span>Custom HTML</span><a href=\\"#\\">?</a></div>\\n        <div class=\\"card-body\\">\\n          <div class=\\"profile-custom-html\\"></div>\\n        </div>\\n      </div>\\n    </div>\\n\\n    <!-- RIGHT COLUMN -->\\n    <div class=\\"col right\\">\\n      <div class=\\"card\\">\\n        <div class=\\"card-header\\"><span>Top 8</span><a href=\\"#\\">View All</a></div>\\n        <div class=\\"card-body\\">\\n          <div class=\\"grid3\\">\\n            <div class=\\"thumb\\">Friend 1</div>\\n            <div class=\\"thumb\\">Friend 2</div>\\n            <div class=\\"thumb\\">Friend 3</div>\\n            <div class=\\"thumb\\">Friend 4</div>\\n            <div class=\\"thumb\\">Friend 5</div>\\n            <div class=\\"thumb\\">Friend 6</div>\\n          </div>\\n        </div>\\n      </div>\\n\\n      <div class=\\"card\\">\\n        <div class=\\"card-header\\"><span>Sections</span><a href=\\"#\\">Customize</a></div>\\n        <div class=\\"card-body\\">\\n          <div class=\\"section-links\\">\\n            <a href=\\"#\\">Blurb</a>\\n            <a href=\\"#\\">Interests</a>\\n            <a href=\\"#\\">Links</a>\\n            <a href=\\"#\\">Comments</a>\\n            <a href=\\"#\\">Gallery</a>\\n          </div>\\n        </div>\\n      </div>\\n\\n      <div class=\\"card\\">\\n        <div class=\\"card-header\\"><span>Links</span><a href=\\"#\\">Add</a></div>\\n        <div class=\\"card-body\\" style=\\"display:grid;gap:8px;\\">\\n          <a class=\\"link-btn\\" href=\\"#\\"><span>Twitch</span><span class=\\"small-muted\\">/crimsonstrife</span></a>\\n          <a class=\\"link-btn\\" href=\\"#\\"><span>YouTube</span><span class=\\"small-muted\\">channel</span></a>\\n          <a class=\\"link-btn\\" href=\\"#\\"><span>Discord</span><span class=\\"small-muted\\">invite</span></a>\\n        </div>\\n      </div>\\n\\n      <div class=\\"card\\">\\n        <div class=\\"card-header\\"><span>Details</span><a href=\\"#\\">Edit</a></div>\\n        <div class=\\"card-body\\">\\n          <div class=\\"blurb-section\\"><b>Pronouns:</b> he/him</div>\\n          <div class=\\"blurb-section\\"><b>Location:</b> Charlotte, NC</div>\\n          <div class=\\"blurb-section\\"><b>Vibe:</b> glitchy cyberpunk assistant</div>\\n        </div>\\n      </div>\\n\\n      <div class=\\"card\\">\\n        <div class=\\"card-header\\"><span>Song</span><a href=\\"#\\">Change</a></div>\\n        <div class=\\"card-body\\">\\n          <div class=\\"blurb-section\\">\\n            <b>Now playing:</b> “Placeholder Track”<br/>\\n            <span class=\\"small-muted\\">Themes often style this like a mini player.</span>\\n          </div>\\n        </div>\\n      </div>\\n\\n      <div class=\\"card\\">\\n        <div class=\\"card-header\\"><span>Comments</span><a href=\\"#\\">Reply</a></div>\\n        <div class=\\"card-body\\" style=\\"display:grid;gap:8px;\\">\\n          <div class=\\"blurb-section\\"><b>@someone:</b> This theme is sick.</div>\\n          <div class=\\"blurb-section\\"><b>@another:</b> Please make the text readable 🙏</div>\\n        </div>\\n      </div>\\n\\n      <!-- Groups block closely based on your real snippet structure -->\\n      <div class=\\"card\\">\\n        <div class=\\"card-header hearted\\" style=\\"display:flex;justify-content:space-between\\">\\n          <span>crimsonstrife's Groups</span><a href=\\"#\\">View All</a>\\n        </div>\\n        <div class=\\"card-body\\">\\n          <div style=\\"display:grid;grid-template-columns:1fr 1fr;gap:8px\\">\\n            <a style=\\"display:block;border:1px solid var(--vs-border);background:var(--vs-bg-white);transition:all 0.2s\\" href=\\"#\\">\\n              <div style=\\"aspect-ratio:1;background:rgba(0,0,0,.25) center/cover;display:flex;align-items:center;justify-content:center\\">Group image</div>\\n              <div style=\\"padding:4px 6px\\">\\n                <div style=\\"font-size:10px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\\">Blender Whores</div>\\n              </div>\\n            </a>\\n            <a style=\\"display:block;border:1px solid var(--vs-border);background:var(--vs-bg-white);transition:all 0.2s\\" href=\\"#\\">\\n              <div style=\\"aspect-ratio:1;background:rgba(0,0,0,.25) center/cover;display:flex;align-items:center;justify-content:center\\">Group image</div>\\n              <div style=\\"padding:4px 6px\\">\\n                <div style=\\"font-size:10px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\\">Horror Dev</div>\\n              </div>\\n            </a>\\n          </div>\\n        </div>\\n      </div>\\n\\n    </div>\\n  </div>\\n</div>","mockDefaults":{"displayName":"CrimsonStrife","username":"@crimsonstrife","tagline":"","avatar":"https://placehold.co/128x128/png","background":"https://placehold.co/1600x900/png"}},{"id":"minimal","name":"Minimal Mount Only","description":"Bare minimum markup with .profile-page + .profile-custom-html mount for quick experiments.","baseCss":":root{--vs-border:#2a3d5e;--vs-bg-white:#0f1622;--vs-text:#e7eefc} .profile-page{min-height:100vh;padding:18px;color:var(--vs-text);background:#0b0f17} .card{border:1px solid var(--vs-border);border-radius:12px;padding:12px;background:var(--vs-bg-white)}","baseBody":"<div class='profile-page profile-custom-css'><div class='card'><div class='profile-custom-html'></div></div></div>","mockDefaults":{"displayName":"Demo User","username":"@demo","tagline":"","avatar":"","background":""}}]`),p={version:1,templates:C},f=p??{},r=Array.isArray(f.templates)?f.templates:Array.isArray(p)?p:[];async function S(e){if(!e)return;if(!r.length){e.innerHTML=`
      <div class="alert alert-danger m-3">
        <strong>No templates found.</strong><br>
        Check <code>templates.json</code> format.
      </div>
    `;return}const c=r.map(l=>`<option value="${encodeURIComponent(l.id)}">${l.name}${l.description?` — ${l.description}`:""}</option>`).join(""),o=r[0]?.description??"Built-in template";e.innerHTML=`
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
                      ${c}
                    </select>
                  </label>
                  <div id="templateInfo" class="small text-muted flex-grow-1">${o}</div>
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
  <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
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
          <div class="col-12 col-lg-4">
            <div id="toolsList" class="list-group"></div>
          </div>

          <div class="col-12 col-lg-8">
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
  `,window.__MYOSHI_LAB_TEMPLATES__=r,await k(()=>import("./oshi-lab._CxpMW4K.js"),[])}const g=document.getElementById("lab-root");try{S(document.getElementById("lab-root")).catch(e=>{console.error("initLab failed:",e),g&&(g.innerHTML=`
          <div class="alert alert-danger m-3" role="alert">
            <strong>Failed to load initLab.</strong><br>
            Check the browser console for details.
          </div>`)})}catch(e){console.error("initLab failed:",e)}
