// @ts-check
import { html as htmlLang } from "@codemirror/lang-html";
import { css as cssLang } from "@codemirror/lang-css";

import { state } from "../../state.js";
import { els } from "../../dom.js";

import { createCodeMirror } from "./codemirror.js";
import { lintHtmlBasic, lintCssBasic } from "../lint/basic.js";

const MYOSHI_CHAR_LIMIT = 50000;

/**
 * Update a Bootstrap badge with length status.
 * @param {HTMLElement|null} el
 * @param {number} len
 */
function updateCharBadge(el, len) {
  if (!el) return;
  el.textContent = `${len} / ${MYOSHI_CHAR_LIMIT}`;

  el.classList.remove("text-bg-dark", "text-bg-warning", "text-bg-danger");
  if (len > MYOSHI_CHAR_LIMIT) el.classList.add("text-bg-danger");
  else if (len > Math.floor(MYOSHI_CHAR_LIMIT * 0.9)) el.classList.add("text-bg-warning");
  else el.classList.add("text-bg-dark");
}

/**
 * Keep textareas as the "data bus" so existing modules (snapshots/render/copy/download)
 * keep working. We update textareas and dispatch an input event so existing listeners
 * still fire (auto-render debounce, etc).
 *
 * @param {HTMLTextAreaElement} ta
 * @param {string} value
 */
function setTextareaAndNotify(ta, value) {
  ta.value = value ?? "";
  try {
    ta.dispatchEvent(new Event("input"));
  } catch {
    // old browsers: noop
  }
}

/**
 * Initialize CodeMirror editors for Custom CSS / Custom HTML.
 * Safe to call once after initLab.ts has rendered the DOM.
 */
export function initEditors() {
  const cssHost = document.getElementById("cssEditor");
  const htmlHost = document.getElementById("htmlEditor");
  if (!cssHost || !htmlHost) return;

  if (!els.customCss || !els.customHtml) return;

  const cssCharCount = document.getElementById("cssCharCount");
  const htmlCharCount = document.getElementById("htmlCharCount");

  const cssHardCap = /** @type {HTMLInputElement|null} */ (document.getElementById("cssHardCap"));
  const htmlHardCap = /** @type {HTMLInputElement|null} */ (document.getElementById("htmlHardCap"));

  const cssEditor = createCodeMirror({
    host: cssHost,
    language: cssLang(),
    initialValue: els.customCss.value || "",
    buildDiagnostics: lintCssBasic,
    dark: true,
    maxChars: MYOSHI_CHAR_LIMIT,
    hardCapEnabled: cssHardCap ? !!cssHardCap.checked : true,
    onChange: (v) => {
      // @ts-ignore
      state.customCss = v;
      setTextareaAndNotify(els.customCss, v);
      updateCharBadge(cssCharCount, (v || "").length);
    },
  });

  const htmlEditor = createCodeMirror({
    host: htmlHost,
    language: htmlLang(),
    initialValue: els.customHtml.value || "",
    buildDiagnostics: lintHtmlBasic,
    dark: true,
    maxChars: MYOSHI_CHAR_LIMIT,
    hardCapEnabled: htmlHardCap ? !!htmlHardCap.checked : true,
    onChange: (v) => {
      // @ts-ignore
      state.customHtml = v;
      setTextareaAndNotify(els.customHtml, v);
      updateCharBadge(htmlCharCount, (v || "").length);
    },
  });

  // @ts-ignore
  state.editors = { css: cssEditor, html: htmlEditor };

  // Initial counters
  updateCharBadge(cssCharCount, (els.customCss.value || "").length);
  updateCharBadge(htmlCharCount, (els.customHtml.value || "").length);

  // Hard cap toggles
  cssHardCap?.addEventListener("change", () => cssEditor.setHardCapEnabled(!!cssHardCap.checked));
  htmlHardCap?.addEventListener("change", () => htmlEditor.setHardCapEnabled(!!htmlHardCap.checked));

  // Lint toggles (optional; present if initLab.ts added them)
  const cssLintToggle = /** @type {HTMLInputElement|null} */ (document.getElementById("cssLintToggle"));
  const htmlLintToggle = /** @type {HTMLInputElement|null} */ (document.getElementById("htmlLintToggle"));

  cssLintToggle?.addEventListener("change", () => cssEditor.setLintEnabled(!!cssLintToggle.checked));
  htmlLintToggle?.addEventListener("change", () => htmlEditor.setLintEnabled(!!htmlLintToggle.checked));
}

/**
 * Sync editor text from current textarea values (used by snapshot load, extract, reset).
 */
export function syncEditorsFromTextareas() {
  // @ts-ignore
  const cssEd = state.editors?.css;
  // @ts-ignore
  const htmlEd = state.editors?.html;

  if (cssEd && els.customCss) cssEd.setValue(els.customCss.value || "");
  if (htmlEd && els.customHtml) htmlEd.setValue(els.customHtml.value || "");

  updateCharBadge(document.getElementById("cssCharCount"), (els.customCss?.value || "").length);
  updateCharBadge(document.getElementById("htmlCharCount"), (els.customHtml?.value || "").length);
}
