/* The contrast resolver: everything mechanical, nothing judgemental.
 *
 * This module resolves the kit's real cascade the way stories/nav-cascade.test.js
 * resolves the nav rail's — substitute the token files per theme, desugar the
 * state pseudo-classes to attribute selectors of identical weight, mount real
 * story markup in JSDOM and read getComputedStyle back. It knows how to parse a
 * colour, composite an alpha chain and compute a WCAG ratio. It decides nothing:
 * which failures are acceptable lives in stories/contrast.test.js, by hand.
 *
 * Three rewrites happen before the CSS reaches JSDOM, each fixing a place where
 * a naive resolver reports a colour the browser never paints. All three are
 * specificity-preserving, so the cascade under test stays the shipped one:
 *
 *   specialiseContextual  A custom property re-declared per component variant
 *                         (--toast-accent, once per toast status) cannot be
 *                         flattened first-wins, or every toast reports the first
 *                         status's colour. One variant-scoped copy of each
 *                         consuming declaration is emitted instead.
 *   expandAnchors         JSDOM ranks its UA sheet's `a:link` above a
 *                         same-specificity author `a` rule, so an anchor with an
 *                         href reads back as the UA's rgb(0,0,238). The bare `a`
 *                         rule gains :link/:visited forms.
 *   desugar               :hover / :focus-visible never match in JSDOM. Each
 *                         becomes a (0,1,0) attribute selector the walker sets.
 *
 * Known limitation of specialiseContextual: a specialised copy carries one more
 * class of specificity than the rule it came from, so it can out-rank a rule the
 * browser would let win. Each copy is therefore emitted immediately after its
 * source rule rather than at the end of the sheet, which keeps source order
 * intact against a later override of equal weight. That is correct exactly when
 * a base rule precedes the variants that override it (.ui-btn before .ui-btn--sm,
 * .ui-toast__action before .ui-toast--solid .ui-toast__action), which is the
 * kit's convention throughout. The gate pins the toast case with a self-check so
 * a regression in that convention is visible rather than silent.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

/** WCAG 2.x AA floors. Normal text needs 4.5:1; large text needs 3:1. */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

const RULE = /([^{}]+)\{([^{}]*)\}/g;
/** Blank a comment out without moving any line, so file:line stays honest. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** The stylesheets the kit ships, in the order src/index.css imports them. */
export const STYLE_FILES = decomment(read('src/index.css'))
  .split('\n')
  .map((l) => /@import\s+"\.\/(.+?)"/.exec(l))
  .filter(Boolean)
  .map((m) => `src/${m[1]}`);

const TOKEN_FILES = ['src/tokens/brand.generated.css', 'src/tokens/tokens.css', 'src/tokens/accents.css'];

/**
 * Custom properties in effect for a theme + accent.
 *
 * Token files first and theme-selectively, so the requested theme's value wins;
 * then every custom property declared anywhere under src/styles/, but only if
 * the token files did not already define it. Component-scoped properties have to
 * be harvested or --ui-fb-pill-grad (src/styles/feedback.css) resolves to
 * nothing and the pill reports a fabricated 1.00:1.
 */
const tokenCache = new Map();
export function tokensFor(theme, accent = 'default') {
  const cached = tokenCache.get(`${theme}|${accent}`);
  if (cached) return cached;
  const wanted = [
    ':root',
    `:root[data-theme="${theme}"]`,
    ...(accent === 'default' ? [] : [`:root[data-theme="${theme}"][data-accent="${accent}"]`]),
  ];
  const vars = new Map();
  for (const file of TOKEN_FILES) {
    for (const [, selector, body] of decomment(read(file)).matchAll(RULE)) {
      if (!selector.split(',').map((s) => s.trim()).some((s) => wanted.includes(s))) continue;
      for (const decl of body.split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const name = decl.slice(0, i).trim();
        if (name.startsWith('--')) vars.set(name, decl.slice(i + 1).trim());
      }
    }
  }
  for (const file of STYLE_FILES) {
    for (const [, selector, body] of decomment(read(file)).matchAll(RULE)) {
      if (selector.trimStart().startsWith('@')) continue;
      for (const decl of body.split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const name = decl.slice(0, i).trim();
        if (name.startsWith('--') && !vars.has(name)) vars.set(name, decl.slice(i + 1).trim());
      }
    }
  }
  // Memoised: the gate resolves a token per finding per ledger entry, and
  // re-reading every stylesheet each time cost more than the walk itself.
  tokenCache.set(`${theme}|${accent}`, vars);
  return vars;
}

/** Substitute var() until a pass changes nothing (tokens reference tokens). */
export function substitute(css, vars) {
  let out = css;
  for (let pass = 0; pass < 16 && out.includes('var('); pass++) {
    const next = out.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (m, name, fallback) =>
      (vars.has(name) ? vars.get(name) : (fallback != null ? fallback.trim() : m)));
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * Emit a variant-scoped copy of every declaration that consumes a custom
 * property declared more than once outside :root. See the header.
 */
export function specialiseContextual(css) {
  const decls = new Map(); // prop -> [[declaring selector, value], …]
  for (const [, sel, body] of css.matchAll(RULE)) {
    if (sel.trimStart().startsWith('@')) continue;
    const s = sel.trim().replace(/\s+/g, ' ');
    // Root and theme blocks are excluded: tokensFor already picked the right
    // theme, and specialising them would re-inject the other theme's literal
    // and put a bare :root at the head of a selector list.
    if (/(^|,\s*):root/.test(s) || /^(from|to|\d+%)$/.test(s)) continue;
    for (const d of body.split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const n = d.slice(0, i).trim();
      if (!n.startsWith('--')) continue;
      if (!decls.has(n)) decls.set(n, []);
      decls.get(n).push([s, d.slice(i + 1).trim()]);
    }
  }
  const contextual = [...decls].filter(([, ds]) => ds.length > 1);
  if (!contextual.length) return css;

  // Each specialised copy is emitted IMMEDIATELY AFTER the rule it specialises,
  // never appended to the end of the sheet. The copy gains a class of
  // specificity, so appending would let it out-rank a later, more specific
  // override written for the same element — `.ui-toast--solid .ui-toast__action`
  // (src/styles/callout.css:145) is exactly that, and an appended
  // `.ui-toast--danger .ui-toast__action` beat it at equal weight and reported
  // the solid danger toast's action as pink on pink, a fabricated 1.00:1.
  // In place, source order is preserved and the real override still wins.
  let out = '';
  let last = 0;
  for (const m of css.matchAll(RULE)) {
    const [whole, sel, body] = m;
    const end = m.index + whole.length;
    out += css.slice(last, end);
    last = end;
    if (sel.trimStart().startsWith('@')) continue;
    for (const [prop, ds] of contextual) {
      if (!body.includes(`var(${prop})`)) continue;
      const keep = body.split(';').filter((d) => d.includes(`var(${prop})`)).join(';');
      for (const [dsel, val] of ds) {
        const scoped = dsel.split(',').flatMap((d) => sel.split(',')
          .map((x) => `${d.trim()} ${x.trim()}, ${d.trim()}${x.trim()}`)).join(', ');
        out += `\n${scoped}{${keep.split(`var(${prop})`).join(val)}}`;
      }
    }
  }
  return out + css.slice(last);
}

/** Give a bare `a` rule the :link/:visited forms JSDOM's UA sheet demands. */
export const expandAnchors = (css) =>
  css.replace(/(^|[},])(\s*)a(\s*)\{/g, (m, p, w1, w2) => `${p}${w1}a,a:link,a:visited${w2}{`);

/** The state pseudo-classes the walker exercises. */
export const STATES = ['hover', 'focus-visible', 'focus', 'active'];

/** :hover → [data-ui-state~="hover"], same (0,1,0) weight. */
export const desugar = (css) =>
  STATES.reduce((acc, s) => acc.split(`:${s}`).join(`[data-ui-state~="${s}"]`), css);

// ---- colour ---------------------------------------------------------------

/**
 * Parse the notations JSDOM and the kit produce, or return null.
 *
 * Null, never a silent black: a resolver that guesses fabricates a passing ratio
 * against a light background, which is exactly the failure mode a contrast gate
 * exists to prevent.
 */
export function parseColour(value) {
  if (!value) return null;
  const s = String(value).trim();
  let m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.%]+))?\s*\)$/.exec(s);
  if (m) {
    const a = m[4] == null ? 1 : (m[4].endsWith('%') ? Number.parseFloat(m[4]) / 100 : +m[4]);
    return [+m[1], +m[2], +m[3], a];
  }
  m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/.exec(s);
  if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] == null ? 1 : +m[4]];
  m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  if (s === 'transparent') return [0, 0, 0, 0];
  return null;
}

/** Source-over: paint fg (with its alpha) onto an opaque bg. */
export const composite = (fg, bg) =>
  [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);

/** WCAG 2.x relative luminance. */
export const luminance = (c) => {
  const f = (x) => {
    const v = x / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};

/** WCAG 2.x contrast ratio. Symmetric: the lighter colour is the numerator. */
export const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Every computed property the walk reads. Read at capture time — see the note on
 * lazily-resolved color-mix in makeStyleCache — and nothing else is kept.
 */
const CAPTURED = [
  'color', 'backgroundColor', 'backgroundImage',
  'display', 'visibility', 'opacity',
  'fontSize', 'fontWeight',
];

/** A frozen reading of CAPTURED that throws for anything it was not asked to hold. */
function capture(cs) {
  const values = { __proto__: null };
  for (const property of CAPTURED) values[property] = cs[property];
  Object.freeze(values);
  return new Proxy(values, {
    get(target, key) {
      if (typeof key === 'symbol' || key in target) return target[key];
      throw new Error(
        `the style cache does not hold "${String(key)}". Add it to CAPTURED in `
        + 'stories/lib/contrast.js — reading undefined here would skip the element in silence.',
      );
    },
  });
}

/**
 * Memoise getComputedStyle for one window, between DOM writes.
 *
 * WHY. The walk asks for a computed style far more often than there are
 * elements: every text-owning element is walked up its ancestor chain three
 * separate times — once for the background composite, once to test whether an
 * ancestor hides it, once to accumulate ancestor opacity — and siblings share
 * almost all of that chain. Measured over both themes before this existed:
 * 137,206 getComputedStyle calls, of which the background walk was only 24,840.
 * The hidden test (57,630) and the opacity accumulation (47,894) were larger,
 * and both run to the root without an early exit.
 *
 * That is expensive in JSDOM twice over. A miss resolves the whole cascade; a
 * hit still deep-copies the cached declaration property by property
 * (node_modules/jsdom/.../css/helpers/computed-style.js). Memoising the lookup
 * skips both.
 *
 * WHAT IS CACHED, AND WHAT IS NOT. This memoises the LOOKUP — getComputedStyle
 * per element — and nothing else. It deliberately does not memoise
 * effectiveBackground's composite, which is the tempting version and the one
 * that can go quietly wrong: a composite cached against an element would have to
 * argue that source-over stays associative down a chain shared by siblings with
 * different translucent backgrounds of their own. The composite is cheap once
 * the lookups are free, so it is still built from scratch for every element and
 * that argument never has to be made.
 *
 * VALUES, NOT DECLARATIONS, and this is not a detail. JSDOM resolves color-mix()
 * lazily — on the first read of the property — and what it resolves to depends
 * on what else has been looked up by then. Hold a declaration, look at anything
 * else, then read .color, and back comes the raw `color-mix(in srgb, …)` instead
 * of the `color(srgb …)` the same declaration would have given a moment earlier.
 * parseColour cannot read the raw form, so the element leaves the walk without a
 * word: not a failure, not an unjudgeable, just gone. Caching the declaration
 * object did precisely that to the twelve solid toasts' text — every reported
 * finding stayed identical while the gate quietly stopped looking at twelve
 * pairs. So the cache reads the properties it needs at the moment it stores
 * them, freezes them, and serves those. Reading one it does not hold throws
 * rather than answering undefined, because undefined here means "skipped in
 * silence" — the same failure wearing a different hat.
 *
 * WHY IT CANNOT SERVE A COLOUR FROM THE WRONG RENDER. Three things, together:
 *
 *   1. The memo is a WeakMap keyed on the element OBJECT. An entry can only be
 *      read back by the identical object, and an element belongs to exactly one
 *      document — so no entry of one document's render is reachable from
 *      another's, whatever the markup or the selector.
 *   2. There is no cache at module scope. walkStories builds one per call and
 *      drops it on return, so one theme pass cannot seed the next.
 *   3. Within a single document, every DOM write in the walk goes through
 *      `mutate`, which drops the memo whole — including when the write throws.
 *      This is the one that matters, because the walk toggles data-ui-state to
 *      exercise :hover and a surviving memo would report the at-rest colour for
 *      the hovered pass. It is also exactly as conservative as JSDOM itself:
 *      an attribute change on an attached element runs _attrModified →
 *      _modified → _clearStyleCache, which throws away JSDOM's own cache for
 *      the whole document. This memo is invalidated wherever JSDOM's is.
 *
 * Between writes, getComputedStyle is a pure function of the element, which is
 * what makes the memo sound in the first place.
 *
 * WHY THE THIRD POINT IS CHECKED RATHER THAN PROMISED. Routing every write
 * through `mutate` used to be a convention, held by three call sites and a
 * comment. A fourth site added with a bare setAttribute would leave the memo
 * describing the document as it was one render ago, and the gate would report a
 * colour nobody painted — confidently, with no test failing. So the cache no
 * longer trusts its caller. It attaches a MutationObserver to the document and,
 * on every read, drains the record queue: MutationObserver queues synchronously
 * and takeRecords() drains synchronously, so "has anything changed since I last
 * looked?" is a question that can be asked on the hot path with a standard DOM
 * API and no JSDOM internals. A non-empty queue at a read means a write reached
 * the document without the memo being dropped, and the cache throws instead of
 * answering. The failure is latched: a cache that has once seen an unrouted
 * write stays dead, so the error cannot be thrown once and then walked past.
 *
 * Stated exactly, because a guard that overstates itself is worse than none:
 * this enforces "the cache never answers a question about a document that has
 * moved since it last looked". It does not enforce "no write happens outside
 * mutate". A write with no read after it is invisible to the guard — and
 * harmless, because nothing was served from the memo it invalidated. It catches
 * any write from anywhere, including one made by a story's own render code,
 * which is the part a source scan of this file could never reach.
 */
export function makeStyleCache(win) {
  let memo = new WeakMap();
  /**
   * What the cache did, for the two assertions in stories/contrast.test.js that
   * read it.
   *
   *   queries       how often the walk asked for a style
   *   lookups       how many of those reached JSDOM — i.e. missed the memo
   *   routedWrites  mutation records the watcher took at a `mutate` boundary
   *
   * `queries` and `lookups` are what makes the cache's effect a NUMBER rather
   * than a wall-clock impression: their ratio is the miss rate, which is what
   * the cache actually controls and is independent of how many stories exist.
   * `routedWrites` is the anti-vacuity counter for the guard above — a watcher
   * receiving nothing can never fire.
   */
  const seen = { queries: 0, lookups: 0, routedWrites: 0 };
  let poisoned = null;
  // The callback stays empty on purpose. Every record is taken synchronously
  // below, so the microtask JSDOM queues finds nothing left to report.
  const watcher = new win.MutationObserver(() => {});
  watcher.observe(win.document, {
    attributes: true, characterData: true, childList: true, subtree: true,
  });

  const of = (node) => {
    if (poisoned) throw new Error(poisoned);
    const unrouted = watcher.takeRecords();
    if (unrouted.length) {
      const where = unrouted.map((r) => (r.type === 'attributes'
        ? `${r.type} ${r.attributeName} on <${r.target.tagName?.toLowerCase()}>`
        : `${r.type} on <${r.target.tagName?.toLowerCase() ?? '#document'}>`));
      poisoned = `a DOM write bypassed the style cache's \`mutate\`, so the memo now describes `
        + `the document as it was before it: ${[...new Set(where)].slice(0, 3).join('; ')}`
        + `${unrouted.length > 3 ? ` (+${unrouted.length - 3} more)` : ''}. Every write in the walk `
        + 'must go through styles.mutate(() => …) in stories/lib/contrast.js, which drops the memo. '
        + 'Reading past this point would report a colour from the previous render.';
      throw new Error(poisoned);
    }
    seen.queries += 1;
    let cs = memo.get(node);
    if (cs === undefined) {
      seen.lookups += 1;
      cs = capture(win.getComputedStyle(node));
      memo.set(node, cs);
    }
    return cs;
  };
  // Every DOM write goes through here, so a write cannot be made without the
  // memo being dropped. `finally`, so a write that throws half-done cannot
  // leave a memo describing the document as it was before it.
  const mutate = (write) => {
    try {
      return write();
    } finally {
      seen.routedWrites += watcher.takeRecords().length;
      memo = new WeakMap();
    }
  };
  return { of, mutate, seen };
}

/**
 * The colour actually behind an element, composited down its ancestor chain.
 *
 * Returns 'IMAGE' when any layer is an image or gradient — the honest answer,
 * because JSDOM cannot sample one. Never a fabricated composite, never a silent
 * pass. DOM ancestry is a proxy for visual stacking and the proxy is wrong for
 * anything positioned over a non-ancestor; the gate's header says so.
 *
 * `styleOf` is the lookup to resolve each node with — makeStyleCache(win).of in
 * the walk, an uncached call by default. The composite itself is always built
 * from scratch; only the lookup is ever memoised. See makeStyleCache.
 */
export function effectiveBackground(el, win, styleOf = (node) => win.getComputedStyle(node)) {
  const layers = [];
  let node = el;
  while (node && node.nodeType === 1) {
    const cs = styleOf(node);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return 'IMAGE';
    const c = parseColour(cs.backgroundColor);
    if (c && c[3] > 0) {
      layers.push(c);
      if (c[3] >= 0.999) break;
    }
    node = node.parentElement;
  }
  const last = layers[layers.length - 1];
  if (!last || last[3] < 0.999) {
    layers.push(parseColour(styleOf(win.document.body).backgroundColor) || [255, 255, 255, 1]);
  }
  let bg = layers.pop();
  while (layers.length) bg = composite(layers.pop(), bg);
  return bg;
}

// ---- the walk -------------------------------------------------------------

/** The kit's CSS for one theme/accent, fully resolved and rewritten. */
export function kitCssFor(theme, accent = 'default') {
  const vars = tokensFor(theme, accent);
  const raw = decomment(STYLE_FILES.map(read).join('\n'));
  return { vars, css: expandAnchors(desugar(substitute(specialiseContextual(raw), vars))) };
}

/**
 * Base selectors of every rule that only applies in a state, so the walk
 * exercises the elements those rules can reach instead of every element × every
 * state. Derived from the kit stylesheet AND the story's own <style> blocks —
 * a story-local :hover rule is invisible to the former.
 */
export function stateBases(css) {
  const out = Object.fromEntries(STATES.map((s) => [s, new Set()]));
  for (const [, selector] of css.matchAll(RULE)) {
    if (selector.trimStart().startsWith('@')) continue;
    for (const sel of selector.split(',')) {
      for (const s of STATES) {
        const tag = `[data-ui-state~="${s}"]`;
        const i = sel.indexOf(tag);
        if (i < 0) continue;
        const base = sel.slice(0, i).trim();
        if (base) out[s].add(base);
      }
    }
  }
  return out;
}

/** A CSS-selector path to an element, so a finding is an address, not a token. */
export function selectorPath(el) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node.tagName !== 'BODY') {
    let part = node.tagName.toLowerCase();
    const cls = typeof node.className === 'string' ? node.className.trim() : '';
    if (cls) part += `.${cls.split(/\s+/).filter(Boolean).join('.')}`;
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

/** A token value as the string getComputedStyle hands colours back in. */
export function rgbOf(value) {
  const c = parseColour(value);
  return c ? `rgb(${c.slice(0, 3).map(Math.round).join(', ')})` : null;
}

/**
 * Collapse raw records into distinct findings.
 *
 * The unit of a ledger entry is a distinct (theme, accent, state, element,
 * foreground, background) pair, not an element instance — the same badge on the
 * same wash rendered by four stories is one fact about the kit, not four. Each
 * finding keeps every story and every path that produced it, so a reviewer can
 * still find it.
 */
export function groupFindings(records) {
  const groups = new Map();
  for (const r of records) {
    if (r.unjudgeable != null) continue;
    const leaf = r.path.split(' > ').pop() || r.path;
    const key = `${r.theme}/${r.accent} ${r.state ? `:${r.state} ` : ''}${leaf} | ${r.fg} on ${r.bg}`;
    const g = groups.get(key) || {
      key, theme: r.theme, accent: r.accent, state: r.state,
      fg: r.fg, bg: r.bg, ratio: r.ratio, need: r.need,
      paths: new Set(), stories: new Set(),
    };
    g.ratio = Math.min(g.ratio, r.ratio);
    g.paths.add(r.path);
    g.stories.add(r.story);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => a.ratio - b.ratio);
}

/** Storybook's HTML renderer returns a string or a DOM node. Accept those two. */
function serialize(out) {
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') {
    if (typeof out.outerHTML === 'string') return out.outerHTML;
    if (out.nodeType === 11) return [...out.childNodes].map((n) => n.outerHTML ?? n.textContent).join('');
    if (out.nodeType === 3) return out.textContent;
  }
  return null;
}

/**
 * Does this element own text, rather than merely contain a descendant that does?
 *
 * The unit of a contrast measurement is the element whose `color` actually
 * paints a glyph. A wrapper whose only children are elements paints nothing, and
 * measuring it reports a pair no reader ever sees.
 *
 * Exported for react/src/contrast.test.tsx, which walks a mounted React tree
 * rather than the HTML string `walkStories` mounts, and so cannot reuse the walk
 * but must apply the identical rule about what counts as a pair.
 */
export const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

/** Install the DOM globals stories build their markup with. Idempotent. */
export function installDomGlobals(win) {
  for (const key of [
    'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
    'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'matchMedia', 'getSelection',
    'Node', 'Element', 'HTMLElement', 'SVGElement', 'DocumentFragment', 'Event', 'CustomEvent',
    'MutationObserver', 'DOMParser', 'NodeFilter',
  ]) {
    let value;
    try { value = win[key]; } catch { continue; }
    if (value === undefined) continue;
    const bound = typeof value === 'function' && /^[a-z]/.test(key) ? value.bind(win) : value;
    Object.defineProperty(globalThis, key, { value: bound, configurable: true, writable: true });
  }
}

/** Every story file the catalogue ships, discovered the way a11y.test.js does. */
export const storyFiles = readdirSync(path.join(root, 'stories'), { recursive: true })
  .map(String)
  .filter((p) => p.endsWith('.stories.js'))
  .sort();

/**
 * Walk every story's text-owning elements against their real background.
 *
 * Returns { records, stats, problems, cache }. A story that will not render is a
 * problem, never a skip — the lesson stories/a11y.test.js:144-147 already
 * encodes. One shared JSDOM per theme, body replaced per story: measured
 * identical output to a fresh window per story, and much cheaper.
 *
 * `cache` is instrumentation about the RESOLVER and is deliberately not folded
 * into `stats`, which holds facts about the kit. See makeStyleCache's `seen`.
 */
export async function walkStories({ theme, accent = 'default', states = true } = {}) {
  const { vars, css } = kitCssFor(theme, accent);
  const kitBases = stateBases(css);

  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"${accent === 'default' ? '' : ` data-accent="${accent}"`}>`
    + `<head><style>${css}</style></head><body></body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  const win = dom.window;
  // Plenty of stories build their markup with document.createElement (the
  // feedback demo, the icon grid, the motion playground). Give them a real DOM
  // to build in, exactly as stories/a11y.test.js does, or ten stories throw
  // "document is not defined" and fall out of the walk.
  installDomGlobals(win);
  // Per call, never at module scope: this cache cannot be reached by another
  // theme's pass, and it dies with this function. See makeStyleCache.
  const styles = makeStyleCache(win);

  const records = [];
  const problems = [];
  const stats = {
    stories: 0, storyIds: new Set(), walked: 0, judged: 0, unjudgeable: 0,
    disabledSkipped: 0, hiddenSkipped: 0, ancestorOpacity: 0, uaBlue: [],
    colorMixTranslucent: 0,
  };

  for (const rel of storyFiles) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      let out;
      try {
        out = render(args, { globals: { theme, accent }, args });
      } catch (err) {
        problems.push(`${rel}:${name} [${theme}] → render threw: ${err && err.message}`);
        continue;
      }
      const raw = serialize(out);
      if (raw == null) {
        problems.push(`${rel}:${name} [${theme}] → render returned ${Object.prototype.toString.call(out)}`);
        continue;
      }
      stats.stories += 1;
      stats.storyIds.add(`${rel}:${name}`);
      // Stories carry their own <style> blocks and inline style= attributes that
      // speak var(), and JSDOM does not resolve var(). Skip this and a dozen
      // story-local surfaces resolve to garbage.
      const html = desugar(substitute(raw, vars));
      styles.mutate(() => { win.document.body.innerHTML = html; });

      // A story-local :hover rule lives in the story's own <style> block and is
      // invisible to the kit stylesheet's bases. Derive from both.
      const bases = Object.fromEntries(STATES.map((s) => [s, new Set(kitBases[s])]));
      if (states) {
        for (const styleEl of win.document.body.querySelectorAll('style')) {
          const local = stateBases(styleEl.textContent || '');
          for (const s of STATES) for (const b of local[s]) bases[s].add(b);
        }
      }

      const els = [...win.document.body.querySelectorAll('*')];
      const targets = els.map((el) => [el, null]);
      if (states) {
        for (const s of STATES) {
          for (const base of bases[s]) {
            let hits;
            try { hits = win.document.body.querySelectorAll(base); } catch { continue; }
            for (const el of hits) targets.push([el, s]);
          }
        }
      }

      const atRest = new Map();
      for (const [el, state] of targets) {
        if (state) styles.mutate(() => el.setAttribute('data-ui-state', state));
        for (const t of (state ? [el, ...el.querySelectorAll('*')] : [el])) {
          if (!hasOwnText(t)) continue;
          if (t.tagName === 'STYLE' || t.tagName === 'SCRIPT') continue;

          let hidden = false;
          for (let n = t; n && n.nodeType === 1; n = n.parentElement) {
            const c = styles.of(n);
            if (c.display === 'none' || c.visibility === 'hidden' || Number.parseFloat(c.opacity || '1') === 0) {
              hidden = true;
              break;
            }
          }
          if (hidden) { stats.hiddenSkipped += 1; continue; }

          stats.walked += 1;
          const cs = styles.of(t);
          const fgRaw = parseColour(cs.color);
          if (!fgRaw) continue;
          if (cs.color.replace(/\s/g, '') === 'rgb(0,0,238)') {
            stats.uaBlue.push(`${rel}:${name} ${selectorPath(t)}`);
          }

          const bg = effectiveBackground(t, win, styles.of);
          if (bg === 'IMAGE') {
            stats.unjudgeable += 1;
            records.push({
              story: `${rel}:${name}`, theme, accent, state, path: selectorPath(t),
              fg: cs.color, bg: null, ratio: null, need: null,
              unjudgeable: 'background is an image or gradient — JSDOM cannot sample it',
            });
            continue;
          }

          // WCAG 1.4.3 exempts inactive user-interface components. The kit marks
          // them three ways; skipping only [disabled] would miss every nav and
          // dropdown case. Skipped with the reason recorded, not silently.
          if (t.closest('[disabled],[aria-disabled="true"],.is-disabled')) {
            stats.disabledSkipped += 1;
            continue;
          }

          // Opacity composites down the chain; the element's own is not the
          // whole story. A disabled nav label reads 6.11 on its own opacity and
          // 2.36 with its ancestors' — the user sees the second number.
          let op = Number.parseFloat(cs.opacity || '1');
          for (let n = t.parentElement; n && n.nodeType === 1; n = n.parentElement) {
            const o = Number.parseFloat(styles.of(n).opacity || '1');
            if (Number.isFinite(o) && o < 1) { op *= o; stats.ancestorOpacity += 1; }
          }

          const alpha = fgRaw[3] * (Number.isFinite(op) ? op : 1);
          if (alpha < 0.999 && alpha > 0) stats.colorMixTranslucent += 1;
          const fg = composite([fgRaw[0], fgRaw[1], fgRaw[2], alpha], bg);
          const r = ratio(fg, bg);
          stats.judged += 1;

          const size = Number.parseFloat(cs.fontSize || '16');
          const weight = Number.parseInt(cs.fontWeight || '400', 10) || 400;
          const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? AA_LARGE : AA_TEXT;

          const bgCss = `rgb(${bg.slice(0, 3).map(Math.round).join(',')})`;
          const pair = `${cs.color}|${bgCss}`;
          if (!state && !atRest.has(t)) atRest.set(t, pair);
          // A state record whose pair equals the element's at-rest pair is noise.
          if (state && atRest.get(t) === pair) continue;
          if (r >= need) continue;

          records.push({
            story: `${rel}:${name}`, theme, accent, state, path: selectorPath(t),
            fg: cs.color, bg: bgCss, ratio: r, need, unjudgeable: null,
          });
        }
        if (state) styles.mutate(() => el.removeAttribute('data-ui-state'));
      }
    }
  }

  dom.window.close();
  return { records, stats, problems, cache: { ...styles.seen } };
}
