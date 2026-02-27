// @ts-check

/**
 * Retrieves an array of tool definitions by importing modules from a specific directory.
 * Each tool is validated to ensure it has the required properties and methods before inclusion.
 * Tools are sorted by their `order` property (defaulting to 100 if not present), and then by `name` alphabetically.
 *
 * @return {ToolDef[]} An array of valid tool definitions, sorted by their defined order and name.
 */

export function getTools() {
    const mods = import.meta.glob('./defs/*.tool.js', { eager: true });

    /** @type {ToolDef[]} */
    const list = [];

    for (const mod of Object.values(mods)) {
        // support either default export or named export
        // @ts-ignore
        const tool = mod?.default ?? mod?.tool;
        if (!tool?.id || !tool?.name || typeof tool.render !== 'function') continue;
        list.push(tool);
    }

    list.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
    return list;
}