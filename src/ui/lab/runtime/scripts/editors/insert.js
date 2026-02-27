// @ts-check

/**
 * Insert text at cursor/selection for the CodeMirror wrapper returned by createCodeMirror().
 * @param {{ view: import("@codemirror/view").EditorView } | null | undefined} editor
 * @param {string} text
 */
export function insertAtCursor(editor, text) {
  const view = editor?.view;
  if (!view) return;

  const sel = view.state.selection.main;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + text.length },
    scrollIntoView: true,
  });
  view.focus();
}
