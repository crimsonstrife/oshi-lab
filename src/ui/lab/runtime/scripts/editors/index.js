// @ts-check
import { html as htmlLang } from "@codemirror/lang-html";
import { css as cssLang } from "@codemirror/lang-css";

import { state } from "../../state.js";
import { els } from "../../dom.js";

import { createCodeMirror } from "./codemirror.js";
import { lintHtmlBasic, lintCssBasic } from "../lint/basic.js";

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

  const cssEditor = createCodeMirror({
    host: cssHost,
    language: cssLang(),
    initialValue: els.customCss.value || "",
    buildDiagnostics: lintCssBasic,
    dark: true,
    onChange: (v) => {
      // @ts-ignore
      state.customCss = v;
      setTextareaAndNotify(els.customCss, v);
    },
  });

  const htmlEditor = createCodeMirror({
    host: htmlHost,
    language: htmlLang(),
    initialValue: els.customHtml.value || "",
    buildDiagnostics: lintHtmlBasic,
    dark: true,
    onChange: (v) => {
      // @ts-ignore
      state.customHtml = v;
      setTextareaAndNotify(els.customHtml, v);
    },
  });

  // @ts-ignore
  state.editors = { css: cssEditor, html: htmlEditor };

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
}
