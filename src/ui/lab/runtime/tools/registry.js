// @ts-check

import { TOOL_SCHEMA_VERSION, getToolDefErrors, isValidToolDef, normalizeShortcut } from './schema.js';

/**
 * Retrieves an array of tool definitions by importing modules from a specific directory.
 * Each tool is validated to ensure it has the required properties and methods before inclusion.
 * Tools are sorted by their `order` property (defaulting to 100 if not present), and then by `name` alphabetically.
 *
 * @return {import('./schema.js').ToolDef[]} An array of valid tool definitions, sorted by their defined order and name.
 */

export function getTools() {
    const mods = import.meta.glob('./defs/*.tool.js', { eager: true });

    /** @type {import('./schema.js').ToolDef[]} */
    const list = [];

    const DEV = Boolean(import.meta?.env?.DEV);

    /** @type {Set<string>} */
    const ids = new Set();
    /** @type {Map<string,string>} */
    const shortcutToId = new Map();

    for (const mod of Object.values(mods)) {
        // support either default export or named export
        // @ts-ignore
        const tool = mod?.default ?? mod?.tool;

        if (!isValidToolDef(tool)) {
            if (DEV) {
                const errs = getToolDefErrors(tool);
                // eslint-disable-next-line no-console
                console.error('[tools] Invalid tool definition:', tool, errs);
                throw new Error(`Invalid tool definition: ${errs.join('; ')}`);
            }
            continue;
        }

        if (tool.schemaVersion !== TOOL_SCHEMA_VERSION) {
            if (DEV) throw new Error(`Tool '${tool.id}' has unsupported schemaVersion: ${tool.schemaVersion}`);
            continue;
        }

        if (ids.has(tool.id)) {
            if (DEV) throw new Error(`Duplicate tool id: '${tool.id}'`);
            continue;
        }
        ids.add(tool.id);

        // Normalize shortcut and check collisions.
        const sc = normalizeShortcut(tool.shortcut);
        if (sc?.norm) {
            const prev = shortcutToId.get(sc.norm);
            if (prev && prev !== tool.id) {
                if (DEV) throw new Error(`Shortcut collision: '${sc.combo}' used by '${prev}' and '${tool.id}'`);
            } else {
                // @ts-ignore - tools may provide shortcut as string; registry will normalize for UI.
                tool.shortcut = sc;
                shortcutToId.set(sc.norm, tool.id);
            }
        }

        list.push(tool);
    }

    list.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
    return list;
}