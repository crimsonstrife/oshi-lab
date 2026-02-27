// @ts-check

/**
 * Retrieves and constructs a list of widget definitions from a specified folder.
 * Each widget definition includes required properties such as id, name, html, and css.
 * Widgets are filtered for validity, sorted based on their order attribute (or by name as a tiebreaker if order is not specified), and then returned as an array.
 *
 * @return {WidgetDef[]} An array of widget definitions, sorted by order and name.
 */
export function getWidgets() {
    const mods = import.meta.glob('./defs/*.widget.js', { eager: true });

    /** @type {WidgetDef[]} */
    const list = [];

    for (const mod of Object.values(mods)) {
        // @ts-ignore
        const widget = mod?.default ?? mod?.widget;
        if (!widget?.id || !widget?.name || typeof widget.html !== 'string' || typeof widget.css !== 'string') continue;
        list.push(widget);
    }

    list.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
    return list;
}