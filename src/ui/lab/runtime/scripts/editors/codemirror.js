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
 *   maxChars?: number
 *   hardCapEnabled?: boolean
 * }} CreateCodeMirrorOptions
 */

const lintCompartment = new Compartment();
const themeCompartment = new Compartment();
const limitCompartment = new Compartment();

/**
 * Create a transaction filter that enforces a hard max character count.
 * It truncates insertions to fit, while always allowing deletions.
 * @param {number} maxChars
 */
function hardCharLimit(maxChars) {
    return EditorState.transactionFilter.of((tr) => {
        if (!tr.docChanged) return tr;

        const oldLen = tr.startState.doc.length;
        const newLen = tr.newDoc.length;

        // Always allow any change that reduces total length.
        if (newLen < oldLen) return tr;

        // If we're within limit, allow.
        if (newLen <= maxChars) return tr;

        // Compute total deleted length in this transaction
        let totalDeleted = 0;
        tr.changes.iterChanges((fromA, toA) => {
            totalDeleted += (toA - fromA);
        });

        // How many inserted characters can we accept?
        // Deletions free space, so capacity increases accordingly.
        let remaining = Math.max(0, maxChars - (oldLen - totalDeleted));

        // If no room for insertion, block this transaction (deletions-only will still be allowed by user)
        if (remaining === 0) return [];

        /** @type {{from:number,to:number,insert:string}[]} */
        const changes = [];

        tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
            const ins = inserted.toString();

            if (!ins) {
                // deletion / replace with empty
                changes.push({ from: fromA, to: toA, insert: "" });
                return;
            }

            const take = Math.min(remaining, ins.length);
            const slice = ins.slice(0, take);
            changes.push({ from: fromA, to: toA, insert: slice });
            remaining -= take;
        });

        return [tr.startState.update({ changes })];
    });
}

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
        maxChars,
        hardCapEnabled = true,
    } = opts;

    const baseExtensions = [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        highlightSelectionMatches(),
        autocompletion(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            onChange?.(update.state.doc.toString());
        }),
    ];

    const lintExtension = buildDiagnostics
        ? [lintGutter(), linter((view) => buildDiagnostics(view.state.doc.toString()))]
        : [];

    const themeExtension = dark ? [oneDark] : [];

    const limitExtension =
        maxChars && hardCapEnabled ? [hardCharLimit(maxChars)] : [];

    const state = EditorState.create({
        doc: initialValue ?? "",
        extensions: [
            ...baseExtensions,
            language,
            lintCompartment.of(lintExtension),
            themeCompartment.of(themeExtension),
            limitCompartment.of(limitExtension),
        ],
    });

    const view = new EditorView({ state, parent: host });

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

        setHardCapEnabled(enabled) {
            const ext = enabled && maxChars ? [hardCharLimit(maxChars)] : [];
            view.dispatch({
                effects: limitCompartment.reconfigure(ext),
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