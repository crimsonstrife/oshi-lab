// @ts-check

/**
 * Selector Engine
 * Generates and scores multiple candidate selectors for a clicked element.
 * Designed for “anonymous DOMs” (few IDs/classes) like MyOshi.
 */

/** @typedef {{ allowHas?: boolean, allowNth?: boolean, allowStyleContains?: boolean, maxDepth?: number, maxCandidates?: number }} SelectorEngineOptions */
/** @typedef {{ usesHas:boolean, usesNth:boolean, usesStyleContains:boolean, usesSibling:boolean }} SelectorFlags */
/** @typedef {{ selector:string, matchCount:number, score:number, flags:SelectorFlags, notes:string[] }} SelectorCandidate */
/** @typedef {{ label:string, element:Element }} SectionTarget */
/** @typedef {{ target:Element, rootSelector:string, candidates:SelectorCandidate[], sectionTargets:SectionTarget[] }} SelectorReport */

const DEFAULT_OPTS = {
  allowHas: true,
  allowNth: true,
  allowStyleContains: false,
  maxDepth: 7,
  maxCandidates: 6,
};

/** @param {string} s */
function safeCssEscape(s) {
  // Prefer native if available.
  // @ts-ignore
  if (globalThis.CSS && typeof CSS.escape === 'function') return CSS.escape(String(s));
  // Minimal escape fallback
  return String(s).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch.charCodeAt(0).toString(16)} `);
}

/** @param {string} s */
function escapeAttrValue(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Heuristic: filter obvious hashed/volatile classes. @param {string} c */
function isVolatileClass(c) {
  if (!c) return true;
  if (c.length >= 24 && /[0-9a-f]{8,}/i.test(c)) return true; // hashy
  if (/^(css|sc|jsx|astro|tw)-/i.test(c)) return true; // framework-ish
  if (/^__[A-Z0-9_]+__$/i.test(c)) return true;
  return false;
}

/** @param {Element} el */
function getStableClasses(el) {
  return Array.from(el.classList || []).filter((c) => c && !isVolatileClass(c));
}

/** @param {Element} el */
function getDataAttrs(el) {
  /** @type {{name:string,value:string}[]} */
  const out = [];
  for (const a of Array.from(el.attributes || [])) {
    if (!a?.name) continue;
    if (!a.name.startsWith('data-')) continue;
    // keep boolean-ish data attrs too
    out.push({ name: a.name, value: a.value ?? '' });
  }
  return out;
}

/** @param {Element} el */
function nthOfTypeIndex(el) {
  const p = el.parentElement;
  if (!p) return 1;
  const tag = el.tagName;
  let idx = 0;
  for (const kid of Array.from(p.children)) {
    if (kid.tagName === tag) idx++;
    if (kid === el) return idx || 1;
  }
  return 1;
}

/** @param {Element} el */
function baseTag(el) {
  return (el.tagName || '').toLowerCase() || 'div';
}

/**
 * Build “style contains” fragments from inline style (brittle).
 * @param {Element} el
 */
function buildStyleContainsFragments(el) {
  const raw = (el.getAttribute('style') || '').trim();
  if (!raw) return [];
  // Keep only a few properties that are commonly used as “chips”
  const allowProps = new Set([
    'padding',
    'margin',
    'font-size',
    'background',
    'background-color',
    'color',
    'flex-wrap',
    'gap',
    'border-radius',
    'display',
  ]);
  const parts = raw
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);

  /** @type {string[]} */
  const frags = [];
  for (const part of parts) {
    const [prop, ...rest] = part.split(':');
    if (!prop || !rest.length) continue;
    const p = prop.trim().toLowerCase();
    if (!allowProps.has(p)) continue;
    const v = rest.join(':').trim();
    if (!v) continue;
    // Use substring with original spacing to maximize match chance.
    frags.push(`${p}:${v}`);
    if (frags.length >= 3) break;
  }
  return frags;
}

/**
 * Returns true if :has() is supported by querySelector in this doc.
 * @param {Document} doc
 */
function supportsHas(doc) {
  try {
    // Some browsers support CSS.supports('selector(...)') but not qSA; this is the real test.
    doc.querySelector(':has(*)');
    return true;
  } catch {
    return false;
  }
}

/**
 * Pick scope root element and “rootSelector” label.
 * @param {Document} doc
 * @returns {{ rootEl: Element, rootSelector: string }}
 */
function pickScopeRoot(doc) {
  const a = doc.querySelector('.profile-page.profile-custom-css');
  if (a) return { rootEl: a, rootSelector: '.profile-page.profile-custom-css' };
  const b = doc.querySelector('.profile-page');
  if (b) return { rootEl: b, rootSelector: '.profile-page' };
  return { rootEl: doc.body || doc.documentElement, rootSelector: 'body' };
}

/**
 * Segment options for one element (no ancestor context).
 * @param {Element} el
 * @param {Required<SelectorEngineOptions>} opts
 * @returns {{ seg:string, flags:SelectorFlags, notes:string[], strength:number }[]}
 */
function segmentOptions(el, opts) {
  /** @type {{ seg:string, flags:SelectorFlags, notes:string[], strength:number }[]} */
  const out = [];
  const tag = baseTag(el);

  const flags0 = { usesHas: false, usesNth: false, usesStyleContains: false, usesSibling: false };

  // Tier 1: id
  const id = (el.getAttribute('id') || '').trim();
  if (id) {
    out.push({
      seg: `#${safeCssEscape(id)}`,
      flags: { ...flags0 },
      notes: ['id'],
      strength: 100,
    });
  }

  // Tier 1: stable classes
  const cls = getStableClasses(el);
  if (cls.length) {
    // Use up to 3 stable classes to avoid huge selectors
    const use = cls
      .slice(0, 3)
      .map((c) => `.${safeCssEscape(c)}`)
      .join('');
    out.push({
      seg: use,
      flags: { ...flags0 },
      notes: ['class'],
      strength: 85,
    });
    // tag + class variant
    out.push({
      seg: `${tag}${use}`,
      flags: { ...flags0 },
      notes: ['tag+class'],
      strength: 80,
    });
  }

  // Tier 1: data attrs exact
  const data = getDataAttrs(el);
  if (data.length) {
    // Prefer exact match on up to 2 data attrs
    const use = data
      .slice(0, 2)
      .map((a) => {
        if (!a.value) return `[${safeCssEscape(a.name)}]`;
        return `[${safeCssEscape(a.name)}="${escapeAttrValue(a.value)}"]`;
      })
      .join('');
    out.push({
      seg: `${tag}${use}`,
      flags: { ...flags0 },
      notes: ['data-attr'],
      strength: 75,
    });
  }

  // Tier 1-ish: role/aria-label
  const role = (el.getAttribute('role') || '').trim();
  if (role) {
    out.push({
      seg: `${tag}[role="${escapeAttrValue(role)}"]`,
      flags: { ...flags0 },
      notes: ['role'],
      strength: 70,
    });
  }
  const aria = (el.getAttribute('aria-label') || '').trim();
  if (aria) {
    out.push({
      seg: `${tag}[aria-label="${escapeAttrValue(aria)}"]`,
      flags: { ...flags0 },
      notes: ['aria-label'],
      strength: 70,
    });
  }

  // Tier 2: common “anchor” attrs (href/src/contenteditable)
  if (tag === 'a') {
    const href = (el.getAttribute('href') || '').trim();
    if (href) {
      out.push({
        seg: `a[href="${escapeAttrValue(href)}"]`,
        flags: { ...flags0 },
        notes: ['href'],
        strength: 72,
      });
    }
  }
  if (tag === 'img') {
    const src = (el.getAttribute('src') || '').trim();
    if (src) {
      // exact might be too long, so contain
      out.push({
        seg: `img[src*="${escapeAttrValue(src.slice(0, 28))}"]`,
        flags: { ...flags0 },
        notes: ['src*'],
        strength: 55,
      });
    }
  }
  const ce = el.getAttribute('contenteditable');
  if (ce !== null) {
    out.push({
      seg: `${tag}[contenteditable="${escapeAttrValue(ce)}"]`,
      flags: { ...flags0 },
      notes: ['contenteditable'],
      strength: 60,
    });
  }

  // Tier 3: tag only
  out.push({
    seg: tag,
    flags: { ...flags0 },
    notes: ['tag'],
    strength: 20,
  });

  // Tier 3: nth-of-type
  if (opts.allowNth) {
    const n = nthOfTypeIndex(el);
    out.push({
      seg: `${tag}:nth-of-type(${n})`,
      flags: { ...flags0, usesNth: true },
      notes: ['nth-of-type'],
      strength: 15,
    });
  }

  // Tier 3 (brittle): style contains
  if (opts.allowStyleContains) {
    const frags = buildStyleContainsFragments(el);
    if (frags.length) {
      const attrs = frags.map((f) => `[style*="${escapeAttrValue(f)}"]`).join('');
      out.push({
        seg: `${tag}${attrs}`,
        flags: { ...flags0, usesStyleContains: true },
        notes: ['style*'],
        strength: 10,
      });
    }
  }

  // Dedup segments, keep strongest.
  /** @type {Map<string, any>} */
  const best = new Map();
  for (const s of out) {
    const prev = best.get(s.seg);
    if (!prev || prev.strength < s.strength) best.set(s.seg, s);
  }
  return Array.from(best.values())
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4);
}

/**
 * Build a :has() segment for an ancestor by searching for a distinctive descendant anchor.
 * @param {Element} ancestor
 * @param {Element} rootEl
 * @param {Required<SelectorEngineOptions>} opts
 */
function buildHasSegment(ancestor, rootEl, opts) {
  if (!opts.allowHas) return null;

  // ancestor base segment must be something reasonable (class/id/tag+class)
  const baseOpts = segmentOptions(ancestor, { ...opts, allowNth: false, allowStyleContains: false });
  const base =
    baseOpts.find((o) => o.notes.includes('id') || o.notes.includes('class') || o.notes.includes('tag+class')) || baseOpts[0];
  if (!base) return null;

  // Search for “anchor descendants” inside ancestor
  /** @type {Element[]} */
  const anchors = [];
  anchors.push(...Array.from(ancestor.querySelectorAll('a[href]')).slice(0, 12));
  anchors.push(
    ...Array.from(
      ancestor.querySelectorAll('[data-lexical-editor], [data-lexical-text], [contenteditable], [aria-label], [role]')
    ).slice(0, 12)
  );

  for (const a of anchors) {
    const segs = segmentOptions(a, { ...opts, allowNth: false, allowStyleContains: false });
    const child =
      segs.find((s) => s.notes.includes('href') || s.notes.includes('data-attr') || s.notes.includes('aria-label') || s.notes.includes('role')) ||
      segs[0];
    if (!child) continue;

    const cand = `${base.seg}:has(${child.seg})`;
    // Validate uniqueness-ish within rootEl
    let count = 9999;
    try {
      count = rootEl.querySelectorAll(cand).length;
    } catch {
      continue;
    }
    if (count >= 1 && count <= 6) {
      return { seg: cand, flags: { ...base.flags, usesHas: true }, notes: [...base.notes, ':has()'], strength: base.strength - 5 };
    }
  }
  return null;
}

/**
 * If element is hard to address, try “sibling anchor” like `.comment-body + div` or `headerHas + .card-body`.
 * @param {Element} el
 * @param {Element} rootEl
 * @param {Required<SelectorEngineOptions>} opts
 */
function siblingAnchors(el, rootEl, opts) {
  /** @type {{ seg:string, flags:SelectorFlags, notes:string[], strength:number }[]} */
  const out = [];
  const prev = el.previousElementSibling;
  if (!prev) return out;

  // Build a stable segment for prev sibling.
  const prevSeg = segmentOptions(prev, { ...opts, allowNth: false, allowStyleContains: false }).find(
    (s) => s.notes.includes('id') || s.notes.includes('class') || s.notes.includes('tag+class') || s.notes.includes('href') || s.notes.includes('data-attr')
  );
  if (!prevSeg) return out;

  // Optionally upgrade prev sibling with :has() (great for card-header + schedules link).
  let prevExpr = prevSeg.seg;
  const has = buildHasSegment(prev, rootEl, opts);
  if (has) prevExpr = has.seg;

  // Base segment for current element (prefer class if any, else tag)
  const curBase =
    segmentOptions(el, { ...opts, allowNth: false }).find((s) => s.notes.includes('class') || s.notes.includes('tag+class')) ||
    {
      seg: baseTag(el),
      flags: { usesHas: false, usesNth: false, usesStyleContains: false, usesSibling: false },
      notes: ['tag'],
      strength: 10,
    };

  out.push({
    seg: `${prevExpr} + ${curBase.seg}`,
    flags: { ...curBase.flags, usesSibling: true, usesHas: Boolean(has) },
    notes: ['sibling +', ...(has ? [':has() sibling anchor'] : [])],
    strength: 65,
  });

  return out;
}

/**
 * Score selector candidate.
 * @param {string} selector
 * @param {number} matchCount
 * @param {SelectorFlags} flags
 */
function scoreCandidate(selector, matchCount, flags) {
  let s = 0;
  // Uniqueness is king
  if (matchCount === 1) s += 240;
  else if (matchCount > 1) s += Math.max(0, 160 - (matchCount - 1) * 18);
  else s -= 200;

  // Prefer shorter selectors
  s -= Math.min(120, Math.floor(selector.length / 6));

  // Penalize brittleness
  if (flags.usesStyleContains) s -= 90;
  if (flags.usesNth) s -= 35;
  if (flags.usesHas) s -= 12;
  if (flags.usesSibling) s -= 8;

  // Tiny bonus for IDs
  if (selector.includes('#')) s += 20;

  return s;
}

/**
 * Build candidate selectors by walking up ancestors with a small beam search.
 * @param {Element} rootEl
 * @param {Element} target
 * @param {Required<SelectorEngineOptions>} opts
 * @returns {SelectorCandidate[]}
 */
function buildCandidates(rootEl, target, opts) {
  /** @type {Element[]} */
  const chain = [];
  let cur = target;
  while (cur && cur !== rootEl && chain.length < opts.maxDepth) {
    chain.push(cur);
    cur = cur.parentElement;
  }
  // root → target
  chain.reverse();

  /** @type {{ sel:string, flags:SelectorFlags, notes:string[] }[]} */
  let beam = [];

  // seed with target options
  const seedEl = chain[chain.length - 1] || target;
  const seedOpts = [...segmentOptions(seedEl, opts), ...siblingAnchors(seedEl, rootEl, opts)];

  beam = seedOpts.map((o) => ({
    sel: o.seg,
    flags: o.flags,
    notes: o.notes,
  }));

  // walk upward (excluding the target element we already seeded)
  for (let i = chain.length - 2; i >= 0; i--) {
    const anc = chain[i];
    const ancOpts = [...segmentOptions(anc, opts), ...siblingAnchors(anc, rootEl, opts)];

    // Also try :has() for this ancestor itself (very useful for card-header).
    const hasSeg = buildHasSegment(anc, rootEl, opts);
    if (hasSeg) ancOpts.unshift(hasSeg);

    /** @type {{ sel:string, flags:SelectorFlags, notes:string[], matchCount:number, score:number }[]} */
    const next = [];

    for (const a of ancOpts) {
      for (const b of beam) {
        // If b starts with a sibling expression, use descendant join (space) not direct-child.
        const childHasCombinator = /[+~]/.test(b.sel);
        const joiners = childHasCombinator ? [' '] : [' ', ' > '];

        for (const j of joiners) {
          const combined = `${a.seg}${j}${b.sel}`.trim();
          let count = 0;
          try {
            count = rootEl.querySelectorAll(combined).length;
          } catch {
            continue;
          }

          const flags = {
            usesHas: a.flags.usesHas || b.flags.usesHas,
            usesNth: a.flags.usesNth || b.flags.usesNth,
            usesStyleContains: a.flags.usesStyleContains || b.flags.usesStyleContains,
            usesSibling: a.flags.usesSibling || b.flags.usesSibling,
          };

          const notes = [...a.notes, ...b.notes];
          const score = scoreCandidate(combined, count, flags);

          next.push({ sel: combined, flags, notes, matchCount: count, score });
        }
      }
    }

    // keep top few (beam)
    next.sort((x, y) => y.score - x.score || x.sel.length - y.sel.length);
    const seen = new Set();
    beam = [];
    for (const n of next) {
      if (seen.has(n.sel)) continue;
      seen.add(n.sel);
      beam.push({ sel: n.sel, flags: n.flags, notes: n.notes });
      if (beam.length >= 10) break;
    }

    // early stop if we have strong unique hits already (but keep a couple levels for alternates)
    if (next.some((n) => n.matchCount === 1) && i <= Math.max(0, chain.length - 4)) break;
  }

  /** @type {SelectorCandidate[]} */
  const out = [];
  for (const b of beam) {
    let count = 0;
    try {
      count = rootEl.querySelectorAll(b.sel).length;
    } catch {
      continue;
    }
    const score = scoreCandidate(b.sel, count, b.flags);
    out.push({ selector: b.sel, matchCount: count, score, flags: b.flags, notes: b.notes });
  }

  // Dedup and take top N
  out.sort((a, b) => b.score - a.score || a.selector.length - b.selector.length);
  const uniq = [];
  const seen = new Set();
  for (const c of out) {
    if (seen.has(c.selector)) continue;
    seen.add(c.selector);
    uniq.push(c);
    if (uniq.length >= opts.maxCandidates) break;
  }

  return uniq;
}

/**
 * Section targets for Section Finder mode.
 * @param {Element} target
 * @param {Document} doc
 * @returns {SectionTarget[]}
 */
function getSectionTargets(target, doc) {
  /** @type {SectionTarget[]} */
  const list = [{ label: 'Element', element: target }];

  const card = target.closest?.('.card');
  if (card) list.push({ label: 'Nearest .card', element: card });

  const cardHeader = target.closest?.('.card-header');
  if (cardHeader) list.push({ label: 'Nearest .card-header', element: cardHeader });

  const cardBody = target.closest?.('.card-body');
  if (cardBody) list.push({ label: 'Nearest .card-body', element: cardBody });

  const comment = target.closest?.('.profile-comment');
  if (comment) list.push({ label: 'Nearest .profile-comment', element: comment });

  const comments = doc.getElementById('comments');
  if (comments && comments.contains(target)) list.push({ label: '#comments container', element: comments });

  const page = target.closest?.('.profile-page');
  if (page) list.push({ label: '.profile-page', element: page });

  return list;
}

/**
 * Public API: build selector report.
 * @param {Document} doc
 * @param {Element} target
 * @param {SelectorEngineOptions} [options]
 * @returns {SelectorReport}
 */
export function buildSelectorReport(doc, target, options = {}) {
  const opts = /** @type {Required<SelectorEngineOptions>} */ ({ ...DEFAULT_OPTS, ...options });

  // Don’t claim :has when it isn’t supported
  if (opts.allowHas && !supportsHas(doc)) opts.allowHas = false;

  const { rootEl, rootSelector } = pickScopeRoot(doc);

  const sectionTargets = getSectionTargets(target, doc);

  const candidates = buildCandidates(rootEl, target, opts);

  return { target, rootSelector, candidates, sectionTargets };
}
