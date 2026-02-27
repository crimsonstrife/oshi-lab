// @ts-check
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion } from "@codemirror/autocomplete";
import { lintGutter, linter } from "@codemirror/lint";
import { oneDark } from "@codemirror/theme-one-dark";

/**
 * @typedef {{
 *   host: HTMLElement
 *   language: any
 *   initialValue: string
 *   onChange?: (value: string) => void
 *   buildDiagnostics?: (docText: string) => import("@codemirror/lint").Diagnostic[]
 *   dark?: boolean
 * }} CreateCodeMirrorOptions
 */

const lintCompartment = new Compartment();
const themeCompartment = new Compartment();

/**
 * Creates a CodeMirror 6 editor instance.
 * @param {CreateCodeMirrorOptions} opts
 */
export function createCodeMirror(opts) {
  const {
    host,
    language,
    initialValue,
    onChange,
    buildDiagnostics,
    dark = true,
  } = opts;

  const baseExtensions = [
    history(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
    ]),
    highlightSelectionMatches(),
    autocompletion(),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      onChange?.(update.state.doc.toString());
    }),
  ];

  const lintExtension = buildDiagnostics
    ? [
        lintGutter(),
        linter((view) => buildDiagnostics(view.state.doc.toString())),
      ]
    : [];

  const themeExtension = dark ? [oneDark] : [];

  const state = EditorState.create({
    doc: initialValue ?? "",
    extensions: [
      ...baseExtensions,
      language,
      lintCompartment.of(lintExtension),
      themeCompartment.of(themeExtension),
    ],
  });

  const view = new EditorView({
    state,
    parent: host,
  });

  return {
    view,

    /** @returns {string} */
    getValue() {
      return view.state.doc.toString();
    },

    /** Replace full doc (snapshots / reset / extract). */
    setValue(next) {
      const cur = view.state.doc.toString();
      const val = next ?? "";
      if (cur === val) return;

      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: val },
        selection: { anchor: 0 },
        scrollIntoView: true,
      });
    },

    setLintEnabled(enabled) {
      view.dispatch({
        effects: lintCompartment.reconfigure(enabled ? lintExtension : []),
      });
    },

    focus() {
      view.focus();
    },

    destroy() {
      view.destroy();
    },
  };
}
