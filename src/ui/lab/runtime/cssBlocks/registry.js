// @ts-check

/** @typedef {{id:string,name:string,version?:number,keywords?:string,description?:string,order?:number,css:string,targets?:('profile'|'oshi-card')[]}} CssBlockDef */

/** @param {'profile'|'oshi-card'} [target] */
export function getCssBlocks(target = 'profile') {
  const mods = import.meta.glob('./defs/*.block.js', { eager: true });
  /** @type {CssBlockDef[]} */
  const list = [];

  for (const mod of Object.values(mods)) {
    // @ts-ignore
    const block = mod?.default ?? mod?.block;
    if (!block?.id || !block?.name || typeof block.css !== 'string') continue;
    const targets = Array.isArray(block.targets) && block.targets.length ? block.targets : ['profile'];
    if (!targets.includes(target)) continue;
    list.push(block);
  }

  list.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
  return list;
}
