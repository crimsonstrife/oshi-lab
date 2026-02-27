// @ts-check

/**
 * @typedef {{
 *  id: string;
 *  name: string;
 *  keywords?: string;
 *  description?: string;
 *  order?: number;
 *  html: string;
 *  css: string;
 *  fields?: Array<{
 *    id: string;
 *    label: string;
 *    type?: 'text'|'textarea';
 *    placeholder?: string;
 *    defaultValue?: string;
 *    allowHtml?: boolean;
 *  }>;
 * }} WidgetDef
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