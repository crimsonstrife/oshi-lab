/** -----------------------------
 *  State
 *  ----------------------------- */
let baseCss = "";
let baseBody = "";
let lastBuildSrcdoc = "";
let mobileMode = false;

/** -----------------------------
 *  Built-in Templates
 *  ----------------------------- */
const TEMPLATES_URL = "./data/templates.json";
let templatesIndex = [];
let templatesById = new Map();
let activeTemplateId = null;

function templateFallbackIndex() {
  return [{
    id: "fallback",
    name: "Fallback (offline)",
    description: "Minimal template embedded as a fallback when templates.json can’t be fetched.",
    baseCss: ":root{--vs-border:#2a3d5e;--vs-bg-white:#0f1622;--vs-text:#e7eefc} .profile-page{min-height:100vh;padding:18px;color:var(--vs-text);background:#0b0f17} .card{border:1px solid var(--vs-border);border-radius:12px;padding:12px;background:var(--vs-bg-white)}",
    baseBody: "<div class='profile-page profile-custom-css'><div class='card'><div class='profile-custom-html'></div></div></div>",
    mockDefaults: { displayName: "Demo User", username: "@demo", tagline: "", avatar: "", background: "" }
  }];
}

function getPreloadedTemplates() {
  try {
    const preloaded = window.__MYOSHI_LAB_TEMPLATES__;
    return Array.isArray(preloaded) ? preloaded : null;
  } catch {
    return null;
  }
}

async function loadTemplatesIndex() {
  const preloaded = getPreloadedTemplates();

  if (preloaded && preloaded.length) {
    templatesIndex = preloaded;
  } else {
    try {
      const res = await fetch(TEMPLATES_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      templatesIndex = Array.isArray(data?.templates) ? data.templates : [];
      if (!templatesIndex.length) templatesIndex = templateFallbackIndex();
    } catch {
      templatesIndex = templateFallbackIndex();
    }
  }

  templatesById = new Map(templatesIndex.map(t => [t.id, t]));
  populateTemplateSelect();

  const last = localStorage.getItem("myoshi_theme_lab_template_id");
  const initial = (last && templatesById.has(last)) ? last : (templatesIndex[0]?.id || "fallback");
  loadTemplateById(initial);
}

function populateTemplateSelect() {
  const sel = document.getElementById("templateSelect");
  if (!sel) return;

  sel.innerHTML = templatesIndex.map(t => {
    const label = t.name || t.id;
    const desc = t.description ? ` — ${t.description}` : "";
    return `<option value="${encodeURIComponent(t.id)}">${label}${desc}</option>`;
  }).join("");

  sel.value = encodeURIComponent(activeTemplateId || templatesIndex[0]?.id || "fallback");
}

function updateTemplateInfo(template) {
  if (!els.templateInfo) return;
  els.templateInfo.textContent = template?.description || "Built-in template";
}

function applyMockDefaults(template) {
  if (!template?.mockDefaults) return;
  const d = template.mockDefaults;

  if (els.mockDisplayName && !els.mockDisplayName.value) els.mockDisplayName.value = d.displayName || "";
  if (els.mockUsername && !els.mockUsername.value) els.mockUsername.value = d.username || "";
  if (els.mockTagline && !els.mockTagline.value) els.mockTagline.value = d.tagline || "";
  if (els.mockAvatar && !els.mockAvatar.value) els.mockAvatar.value = d.avatar || "";
  if (els.mockBg && !els.mockBg.value) els.mockBg.value = d.background || "";
}

function loadTemplateById(id) {
  const template = templatesById.get(id);
  if (!template) {
    setStatus("warn", "Template not found: " + id);
    return;
  }

  activeTemplateId = id;
  localStorage.setItem("myoshi_theme_lab_template_id", id);

  baseCss = (template.baseCss || "").trim();
  baseBody = (template.baseBody || "").trim();

  applyMockDefaults(template);
  if (els.basePeek) els.basePeek.value = summarizeBase(baseCss, baseBody);
  updateTemplateInfo(template);

  setStatus("ok", `Template loaded: ${template.name || template.id}. Start editing Custom CSS/HTML. Import a real MyOshi preview via Template Input → Extract Base.`);
  if (els.autoUpdate?.checked) renderPreview();

  const sel = document.getElementById("templateSelect");
  if (sel) sel.value = encodeURIComponent(id);
}

const els = {
  templateInput: document.getElementById("templateInput"),
  customCss: document.getElementById("customCss"),
  customHtml: document.getElementById("customHtml"),
  basePeek: document.getElementById("basePeek"),
  statusText: document.getElementById("statusText"),
  templateInfo: document.getElementById("templateInfo"),
  previewFrame: document.getElementById("previewFrame"),
  frameShell: document.getElementById("frameShell"),

  autoUpdate: document.getElementById("autoUpdate"),
  appendInstead: document.getElementById("appendInstead"),

  enableMock: document.getElementById("enableMock"),
  mockDisplayName: document.getElementById("mockDisplayName"),
  mockUsername: document.getElementById("mockUsername"),
  mockTagline: document.getElementById("mockTagline"),
  mockAvatar: document.getElementById("mockAvatar"),
  mockBg: document.getElementById("mockBg"),

  snapshotSelect: document.getElementById("snapshotSelect"),
  zoomRange: document.getElementById("zoomRange"),
  zoomLabel: document.getElementById("zoomLabel"),
  heightRange: document.getElementById("heightRange"),
  heightLabel: document.getElementById("heightLabel"),
};

/** -----------------------------
 *  Utilities
 *  ----------------------------- */
let previewScale = 1;          // 1 = 100%
let previewMinHeightPx = 1080; // shell height in px

function applyPreviewSizing() {
  if (!els.frameShell || !els.previewFrame) return;

  els.frameShell.style.minHeight = `${previewMinHeightPx}px`;
  if (els.heightLabel) els.heightLabel.textContent = `${previewMinHeightPx}px`;
  if (els.zoomLabel) els.zoomLabel.textContent = `${Math.round(previewScale * 100)}%`;

  els.previewFrame.style.transformOrigin = "0 0";
  els.previewFrame.style.transform = previewScale === 1 ? "" : `scale(${previewScale})`;
  els.previewFrame.style.width = `${100 / previewScale}%`;
  els.previewFrame.style.height = `${100 / previewScale}%`;
}

function popoutPreview() {
  const html = lastBuildSrcdoc || buildSrcdoc();
  const key = `myoshi_preview_${Date.now()}`;

  try {
    localStorage.setItem(key, html);
  } catch {
    setStatus("err", "Could not store preview for pop-out (localStorage may be full/blocked).");
    return;
  }

  const url = `/lab/preview?key=${encodeURIComponent(key)}`;
  const win = window.open(url, "_blank");
  if (!win) setStatus("warn", "Pop-up blocked. Allow pop-ups for this site to use Pop out.");
}

function setStatus(kind, msg) {
  if (!els.statusText) return;
  const cls = kind === "ok" ? "ok" : kind === "warn" ? "warn" : kind === "err" ? "err" : "";
  els.statusText.className = "status " + cls;
  els.statusText.textContent = msg;
}

function decodeHtmlEntities(str) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

function maybeExtractSrcdoc(maybeOuterHtml) {
  try {
    if (!maybeOuterHtml.includes("<iframe") || !maybeOuterHtml.includes("srcdoc=")) return null;
    const doc = new DOMParser().parseFromString(maybeOuterHtml, "text/html");
    const iframe = doc.querySelector("iframe[srcdoc]");
    if (!iframe) return null;
    return iframe.getAttribute("srcdoc");
  } catch {
    return null;
  }
}

function summarizeBase(css, body) {
  const cssLen = css.length.toLocaleString();
  const bodyLen = body.length.toLocaleString();
  const cssHead = css.slice(0, 1200);
  const bodyHead = body.slice(0, 1200);
  return [
    "=== Base CSS (first 1200 chars) ===",
    cssHead,
    "",
    `... (${cssLen} chars total)`,
    "",
    "=== Base Body HTML (first 1200 chars) ===",
    bodyHead,
    "",
    `... (${bodyLen} chars total)`,
  ].join("\n");
}

function quickFormatCss(css) {
  return css
    .replace(/\r\n/g, "\n")
    .replace(/;\s*/g, ";\n")
    .replace(/\}\s*/g, "}\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildBodyWithInjection() {
  let working = baseBody || "<div class='profile-custom-html'></div>";

  const doc = new DOMParser().parseFromString("<body>" + working + "</body>", "text/html");
  const bodyEl = doc.body;

  const custom = els.customHtml?.value || "";
  const placeholder = bodyEl.querySelector(".profile-custom-html");

  if (els.appendInstead?.checked) {
    const wrapper = doc.createElement("div");
    wrapper.className = "profile-custom-html";
    wrapper.innerHTML = custom;
    bodyEl.appendChild(wrapper);
  } else if (placeholder) {
    placeholder.innerHTML = custom;
  } else {
    const wrapper = doc.createElement("div");
    wrapper.className = "profile-custom-html";
    wrapper.innerHTML = custom;
    bodyEl.appendChild(wrapper);
  }

  if (els.enableMock?.checked) {
    const displayName = els.mockDisplayName?.value.trim() || "";
    const username = els.mockUsername?.value.trim() || "";
    const tagline = els.mockTagline?.value.trim() || "";
    const avatar = els.mockAvatar?.value.trim() || "";
    const bg = els.mockBg?.value.trim() || "";

    if (displayName) {
      const el = bodyEl.querySelector(".profile-display-name");
      if (el) el.textContent = displayName;
    }
    if (username) {
      const el = bodyEl.querySelector(".profile-username");
      if (el) el.textContent = username;
      const headerUser = bodyEl.querySelector(".card-header.hearted span");
      if (headerUser) headerUser.textContent = `${username.replace(/^@/, "")}'s Groups`;
    }
    if (tagline) {
      const el = bodyEl.querySelector(".profile-tagline");
      if (el) el.textContent = tagline;
    }
    if (avatar) {
      const img = bodyEl.querySelector("img.profile-avatar");
      if (img) img.setAttribute("src", avatar);
    }
    if (bg) {
      const page = bodyEl.querySelector(".profile-page");
      if (page) {
        const style = page.getAttribute("style") || "";
        const cleaned = style.replace(/background-image\s*:\s*url\([^)]+\)\s*;?/i, "").trim();
        const spacer = cleaned && !cleaned.endsWith(";") ? ";" : "";
        page.setAttribute("style", `${cleaned}${spacer} background-image: url('${bg}');`);
      }
    }
  }

  return bodyEl.innerHTML;
}

function buildSrcdoc() {
  const base = baseCss || "/* Base CSS is empty. Paste a MyOshi preview srcdoc → Extract Base to get started. */";
  const css = `${base}\n\n/* ===== User Custom CSS (appended) ===== */\n${els.customCss?.value || ""}`;
  const body = buildBodyWithInjection();

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderPreview() {
  if (!baseCss && !baseBody) {
    setStatus("warn", "No base extracted yet. Paste template → Extract Base.");
    return;
  }

  const srcdoc = buildSrcdoc();
  lastBuildSrcdoc = srcdoc;

  if (els.previewFrame) els.previewFrame.srcdoc = srcdoc;
  applyPreviewSizing();

  setStatus(
    "ok",
    `Rendered. Base CSS: ${baseCss.length.toLocaleString()} chars • Base body: ${baseBody.length.toLocaleString()} chars • Custom CSS: ${(els.customCss?.value || "").length.toLocaleString()} chars • Custom HTML: ${(els.customHtml?.value || "").length.toLocaleString()} chars`
  );
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

/** -----------------------------
 *  Extract Base from Template
 *  ----------------------------- */
function extractBase() {
  const raw = (els.templateInput?.value || "").trim();
  if (!raw) {
    setStatus("err", "Template input is empty.");
    return;
  }

  let srcdoc = maybeExtractSrcdoc(raw);
  if (srcdoc) {
    srcdoc = decodeHtmlEntities(srcdoc);
  } else {
    srcdoc = raw.includes("&lt;") ? decodeHtmlEntities(raw) : raw;
  }

  let doc;
  try {
    doc = new DOMParser().parseFromString(srcdoc, "text/html");
  } catch {
    setStatus("err", "Failed to parse template HTML.");
    return;
  }

  const styles = [...doc.querySelectorAll("style")].map(s => s.textContent || "");
  const extractedCss = styles.join("\n\n").trim();
  const extractedBody = (doc.body && doc.body.innerHTML) ? doc.body.innerHTML.trim() : "";

  if (!extractedCss && !extractedBody) {
    setStatus("err", "Could not extract base CSS/body. Make sure you pasted the actual srcdoc HTML.");
    return;
  }

  baseCss = extractedCss;
  baseBody = extractedBody;

  if (els.basePeek) els.basePeek.value = summarizeBase(baseCss, baseBody);
  setStatus("ok", `Extracted base. CSS: ${baseCss.length.toLocaleString()} chars • Body: ${baseBody.length.toLocaleString()} chars`);
  if (els.autoUpdate?.checked) renderPreview();
}

function restoreTemplateBase() {
  if (!activeTemplateId) {
    setStatus("warn", "No active template selected.");
    return;
  }
  loadTemplateById(activeTemplateId);
}

/** -----------------------------
 *  Snapshots
 *  ----------------------------- */
const SNAP_KEY = "myoshi_theme_lab_snapshots_v1";

function loadSnapshots() {
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(SNAP_KEY) || "[]");
  } catch {
    list = [];
  }

  if (els.snapshotSelect) {
    els.snapshotSelect.innerHTML = `<option value="">Load snapshot…</option>` + list.map(s =>
      `<option value="${encodeURIComponent(s.id)}">${s.name}</option>`
    ).join("");
  }

  return list;
}

function safeUUID() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function saveSnapshots(list) {
  localStorage.setItem(SNAP_KEY, JSON.stringify(list));
}

function saveSnapshot() {
  const name = prompt("Snapshot name:", "My Theme Draft");
  if (!name) return;

  const list = loadSnapshots();
  const snap = {
    id: safeUUID(),
    name,
    createdAt: new Date().toISOString(),
    customCss: els.customCss?.value || "",
    customHtml: els.customHtml?.value || "",
    appendInstead: !!els.appendInstead?.checked,
    enableMock: !!els.enableMock?.checked,
    mock: {
      displayName: els.mockDisplayName?.value || "",
      username: els.mockUsername?.value || "",
      tagline: els.mockTagline?.value || "",
      avatar: els.mockAvatar?.value || "",
      bg: els.mockBg?.value || "",
    }
  };

  list.unshift(snap);
  saveSnapshots(list);
  loadSnapshots();
  setStatus("ok", `Saved snapshot: ${name}`);
}

function loadSnapshotById(id) {
  const list = loadSnapshots();
  const snap = list.find(s => s.id === id);
  if (!snap) {
    setStatus("warn", "Snapshot not found.");
    return;
  }

  if (els.customCss) els.customCss.value = snap.customCss || "";
  if (els.customHtml) els.customHtml.value = snap.customHtml || "";
  if (els.appendInstead) els.appendInstead.checked = !!snap.appendInstead;
  if (els.enableMock) els.enableMock.checked = !!snap.enableMock;
  if (els.mockDisplayName) els.mockDisplayName.value = snap.mock?.displayName || "";
  if (els.mockUsername) els.mockUsername.value = snap.mock?.username || "";
  if (els.mockTagline) els.mockTagline.value = snap.mock?.tagline || "";
  if (els.mockAvatar) els.mockAvatar.value = snap.mock?.avatar || "";
  if (els.mockBg) els.mockBg.value = snap.mock?.bg || "";

  setStatus("ok", `Loaded snapshot: ${snap.name}`);
  if (els.autoUpdate?.checked) renderPreview();
}

function deleteSelectedSnapshot() {
  const encoded = els.snapshotSelect?.value;
  if (!encoded) return;

  const id = decodeURIComponent(encoded);
  const list = loadSnapshots();
  const idx = list.findIndex(s => s.id === id);
  if (idx === -1) return;

  if (!confirm(`Delete snapshot "${list[idx].name}"?`)) return;

  list.splice(idx, 1);
  saveSnapshots(list);
  loadSnapshots();
  if (els.snapshotSelect) els.snapshotSelect.value = "";
  setStatus("ok", "Snapshot deleted.");
}

/** -----------------------------
 *  UI bindings
 *  ----------------------------- */
function on(id, event, handler) {
  const node = document.getElementById(id);
  if (node) node.addEventListener(event, handler);
}

on("btnExtract", "click", extractBase);
on("btnRenderNow", "click", renderPreview);
on("btnToggleMobile", "click", () => {
  mobileMode = !mobileMode;
  if (els.frameShell) els.frameShell.classList.toggle("mobile", mobileMode);
});
on("btnLoadDemo", "click", () => {
  const sel = document.getElementById("templateSelect");
  const encoded = sel ? sel.value : "";
  const id = encoded ? decodeURIComponent(encoded) : (templatesIndex[0]?.id || "fallback");
  loadTemplateById(id);
});
on("btnRestoreTemplate", "click", restoreTemplateBase);
on("btnDocs", "click", () => window.open("../getting-started", "_blank", "noopener,noreferrer"));

on("btnResetCustom", "click", () => {
  if (els.customCss) els.customCss.value = "";
  if (els.customHtml) els.customHtml.value = "";
  if (els.appendInstead) els.appendInstead.checked = false;
  setStatus("ok", "Custom CSS/HTML reset.");
  if (els.autoUpdate?.checked) renderPreview();
});

if (els.zoomRange) {
  els.zoomRange.addEventListener("input", () => {
    previewScale = parseInt(els.zoomRange.value, 10) / 100;
    applyPreviewSizing();
  });
}

if (els.heightRange) {
  els.heightRange.addEventListener("input", () => {
    previewMinHeightPx = parseInt(els.heightRange.value, 10);
    applyPreviewSizing();
  });
}

on("btnFitPreview", "click", () => {
  previewScale = 1;
  previewMinHeightPx = 1080;
  if (els.zoomRange) els.zoomRange.value = "100";
  if (els.heightRange) els.heightRange.value = "1080";
  applyPreviewSizing();
});

on("btnPopout", "click", popoutPreview);

on("btnCopyCSS", "click", async () => {
  try {
    await copyToClipboard(els.customCss?.value || "");
    setStatus("ok", "Copied Custom CSS to clipboard.");
  } catch {
    setStatus("err", "Clipboard copy failed (browser permissions).");
  }
});

on("btnCopyHTML", "click", async () => {
  try {
    await copyToClipboard(els.customHtml?.value || "");
    setStatus("ok", "Copied Custom HTML to clipboard.");
  } catch {
    setStatus("err", "Clipboard copy failed (browser permissions).");
  }
});

on("btnDownload", "click", () => {
  const filename = `myoshi-theme-bundle-${new Date().toISOString().slice(0, 10)}.html`;
  const bundle = lastBuildSrcdoc || buildSrcdoc();
  downloadFile(filename, bundle);
  setStatus("ok", `Downloaded: ${filename}`);
});

on("btnFormatCss", "click", () => {
  if (els.customCss) els.customCss.value = quickFormatCss(els.customCss.value || "");
  if (els.autoUpdate?.checked) renderPreview();
});

on("btnCopyBaseCss", "click", async () => {
  try {
    await copyToClipboard(baseCss || "");
    setStatus("ok", "Copied Base CSS.");
  } catch {
    setStatus("err", "Clipboard copy failed.");
  }
});

on("btnCopyBaseBody", "click", async () => {
  try {
    await copyToClipboard(baseBody || "");
    setStatus("ok", "Copied Base Body HTML.");
  } catch {
    setStatus("err", "Clipboard copy failed.");
  }
});

on("btnCopySrcdoc", "click", async () => {
  try {
    await copyToClipboard(lastBuildSrcdoc || buildSrcdoc());
    setStatus("ok", "Copied built srcdoc HTML.");
  } catch {
    setStatus("err", "Clipboard copy failed.");
  }
});

on("btnSaveSnapshot", "click", saveSnapshot);
on("btnDeleteSnapshot", "click", deleteSelectedSnapshot);

if (els.snapshotSelect) {
  els.snapshotSelect.addEventListener("change", () => {
    const encoded = els.snapshotSelect.value;
    if (!encoded) return;
    loadSnapshotById(decodeURIComponent(encoded));
  });
}

const templateSelect = document.getElementById("templateSelect");
if (templateSelect) {
  templateSelect.addEventListener("change", () => {
    const encoded = templateSelect.value;
    if (!encoded) return;
    loadTemplateById(decodeURIComponent(encoded));
  });
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const id = tab.dataset.tab;
    const wrapMap = {
      template: "wrap-template",
      customCss: "wrap-customCss",
      customHtml: "wrap-customHtml",
      basePeek: "wrap-basePeek",
    };

    document.querySelectorAll(".editor-wrap").forEach(w => w.classList.remove("active"));
    const targetId = wrapMap[id];
    const target = targetId ? document.getElementById(targetId) : null;
    if (target) target.classList.add("active");
  });
});

let debounceTimer = null;
function scheduleRender() {
  if (!els.autoUpdate?.checked) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderPreview, 150);
}

["input", "change"].forEach(evt => {
  [
    els.customCss,
    els.customHtml,
    els.appendInstead,
    els.enableMock,
    els.mockDisplayName,
    els.mockUsername,
    els.mockTagline,
    els.mockAvatar,
    els.mockBg,
  ].forEach(node => {
    if (node) node.addEventListener(evt, scheduleRender);
  });
});

loadSnapshots();
applyPreviewSizing();
loadTemplatesIndex();
