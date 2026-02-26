// @ts-check

/**
 * @typedef {{
 *  id: string;
 *  name: string;
 *  keywords?: string;
 *  order?: number;
 *  render: (panel: HTMLElement) => void;
 * }} ToolDef
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