// @ts-check

/** @param {'profile'|'oshi-card'} [target] */
export function getWidgets(target = 'profile') {
  const mods = import.meta.glob('./defs/*.widget.js', { eager: true });
  /** @type {WidgetDef[]} */
  const list = [];

  for (const mod of Object.values(mods)) {
    // @ts-ignore
    const widget = mod?.default ?? mod?.widget;
    if (!widget?.id || !widget?.name || typeof widget.html !== 'string' || typeof widget.css !== 'string') continue;
    const targets = Array.isArray(widget.targets) && widget.targets.length ? widget.targets : ['profile'];
    if (!targets.includes(target)) continue;
    list.push(widget);
  }

  list.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
  return list;
}
