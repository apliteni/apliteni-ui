// Walk a rendered page's keyboard stops and say what each one draws when focused.
//
// Read from the CSS SOURCE, not through getComputedStyle. JSDOM resolves neither
// `box-shadow` nor `:focus-visible`, so a computed reading reports "no indicator"
// for every control in the kit — a gate that fails on a healthy page. The defect
// has an exact source form (a stop no focus rule reaches, or one whose focus rule
// paints an outline colour instead of `var(--ring)`), so the source is what this
// reads.
//
// Presence is not enough, which #487's review proved: a ring rule can match a
// control and still paint nothing, because an always-on rule writes the same
// property at equal specificity further down the page. `focusPaint` therefore
// resolves the cascade itself — every rule declaring `box-shadow` or `outline`,
// ranked by specificity then by document order across the sheets as the page
// loads them — and names the declaration that wins.
//
// That resolution covers specificity and order, and nothing else. It does not
// model `!important`, an inline `style=`, a media or container query's condition
// (a nested rule is read as if it always applied — except forced colours, which
// `deforce` below blanks, for the reason stated there), a state the static DOM is not
// in (`:hover`, `:checked`), or `var()` expansion — a ring is recognised by the
// `var(--ring)` it is written with, not by the layers it resolves to. So this is
// not what a browser computes; it is the part of the computation that decides
// whether a written ring is the declaration that paints.
const RULE = /([^{}]+)\{([^{}]*)\}/g;
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/**
 * The focus pseudo-classes a ring can key on. `:focus-within` is one of them,
 * and the only one that marks an ANCESTOR of the stop rather than the stop: the
 * kit's file field hides its `input` and paints the ring on the wrapper, which
 * is a real indicator for that stop. So a `:focus-within` rule is matched with
 * `closest()` and every other one with `matches()`.
 */
const FOCUS = /:focus-within|:focus-visible|:focus(?![-\w])/;
const WITHIN = ':focus-within';

/** Split a selector list on its top-level commas. A naive split cuts
 *  `:is(:hover, :focus-visible)` in half and hands JSDOM two selectors it
 *  cannot parse. */
export function selectorList(selectors) {
  const out = [];
  let current = '';
  let depth = 0;
  let quote = null;
  for (const ch of selectors) {
    if (quote) { current += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(current); current = ''; continue; }
    current += ch;
  }
  out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Split a selector into compounds at top level, keeping each one's combinator.
 *  `(`, `[` and quotes hold it together, so `:is(a, b)` stays one piece. */
function compoundsOf(selector) {
  const out = [];
  let current = '';
  let combinator = '';
  let depth = 0;
  let quote = null;
  const push = () => { if (current) { out.push({ compound: current, combinator }); current = ''; combinator = ''; } };
  for (const ch of selector.trim()) {
    if (quote) { current += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (depth === 0 && /\s/.test(ch)) { push(); if (!combinator) combinator = ' '; continue; }
    if (depth === 0 && '>+~'.includes(ch)) { push(); combinator = ch; continue; }
    current += ch;
  }
  push();
  return out;
}

/** Drop a functional pseudo and its argument list wherever `test` accepts the
 *  arguments — used to take `:not(…)` out before asking about focus, and to take
 *  `:is(:hover, :focus-visible)` out when building the base selector. */
function dropFunctional(compound, names, test = () => true) {
  let out = '';
  let i = 0;
  while (i < compound.length) {
    const match = /^:(not|is|where|has)\(/.exec(compound.slice(i));
    if (!match || !names.includes(match[1])) { out += compound[i]; i += 1; continue; }
    let depth = 0;
    let j = i + match[0].length - 1;
    for (; j < compound.length; j++) {
      if (compound[j] === '(') depth += 1;
      if (compound[j] === ')' && --depth === 0) break;
    }
    const whole = compound.slice(i, j + 1);
    const args = compound.slice(i + match[0].length, j);
    if (!test(args)) out += whole;
    i = j + 1;
  }
  return out;
}

const focusesHere = (compound) => FOCUS.test(dropFunctional(compound, ['not']));

/**
 * The element a focus rule keys on, as a selector JSDOM can match.
 *
 * `.ui-switch input:focus-visible + .ui-switch__track` paints the ring on the
 * track, but the stop is the input — so the subject is everything up to and
 * including the compound that carries the pseudo, with the pseudo removed.
 * `:is(:hover, :focus-visible)` goes out whole: keeping it would demand a state
 * the DOM is not in. A rule that only mentions focus inside `:not()` is not a
 * focus rule at all, and returns null, as does one that never mentions it.
 *
 * Returns `{ subject, within, self }`. `within` is true for `:focus-within`,
 * whose subject is an ancestor of the stop. `self` is true when the declaration
 * lands on the stop itself — nothing follows the focus compound — which is what
 * the cascade resolver needs: a rule painting a child or a sibling competes in
 * THAT element's cascade, not the stop's.
 */
export function focusSubject(selector) {
  const parts = compoundsOf(selector);
  let last = -1;
  parts.forEach((part, index) => { if (focusesHere(part.compound)) last = index; });
  if (last < 0) return null;
  const within = dropFunctional(parts[last].compound, ['not']).includes(WITHIN);
  // A pseudo-element is its own box, so a ring painted on `::before` is as
  // delegated as one painted on a sibling.
  const self = !within && last === parts.length - 1
    && !/::[\w-]+/.test(parts[last].compound);
  const base = parts.slice(0, last + 1).map(({ compound, combinator }, index) => {
    const bare = index === last
      ? dropFunctional(compound, ['is', 'where'], (args) => FOCUS.test(args))
        .replace(FOCUS, '')
        .replace(/::[\w-]+/g, '')
      : compound;
    const join = index === 0 ? '' : (combinator === ' ' ? ' ' : ` ${combinator} `);
    return `${join}${bare}`;
  }).join('');
  return { subject: base.trim() || '*', within, self };
}

const declarations = (body) => body.split(';')
  .map((d) => d.trim()).filter(Boolean)
  .map((d) => [d.slice(0, d.indexOf(':')).trim().toLowerCase(), d.slice(d.indexOf(':') + 1).trim()])
  .filter(([property]) => property);

/** Nothing a reader can see: the kit's forced-colours outline, or none at all. */
const invisibleOutline = (value) => /^(?:none|0|0px)$/i.test(value) || /\btransparent\b/i.test(value);

/** What a focus rule's body paints. */
export function paintsOf(body) {
  const out = { ring: false, outline: null, shadow: null };
  for (const [property, value] of declarations(body)) {
    const bare = value.replace(/!important/gi, '').trim();
    if (property === 'box-shadow') {
      if (/var\(\s*--ring\s*[,)]/.test(bare)) out.ring = true;
      else out.shadow = /^none$/i.test(bare) ? null : bare;
    }
    if (property === 'outline' || property === 'outline-color' || property === 'outline-style') {
      // --ring-scroll is the shared ring's own gap and band, drawn inward on a scroll
      // region as an OUTLINE rather than a shadow, so that the region's own children
      // cannot paint over it. It is the ring, not a second indicator beside it — and
      // being a real outline is the whole of what forced colors needs, so the region
      // owes no transparent one on top. `outline` below means an outline that is NOT
      // the ring, which is the thing the walk refuses. #531
      if (/var\(\s*--ring-scroll\s*[,)]/.test(bare)) { out.ring = true; out.outline = null; continue; }
      out.outline = invisibleOutline(bare) ? null : bare;
    }
  }
  return out;
}

/**
 * `@media (forced-colors: active)` blanked, in place, so offsets do not move.
 *
 * The walk judges what a page paints normally, and this is the one query whose
 * condition it can decide: it is not in forced colours. Reading its rules as if
 * they always applied would report the mode's own answers as defects on the
 * normal page — and they are the opposite of a defect. The kit marks a focus
 * stop with a `box-shadow` ring and a transparent `outline`, and the mode drops
 * every shadow and repaints the outline, so inside this query an outline IS the
 * ring rather than a second indicator beside it. A control that opts out of the
 * mode's palette has to restate that outline in a system colour, which is a
 * declaration this walk would otherwise refuse. Nothing else changes: a rule
 * outside the query is read exactly as before, which is what
 * `stories/focus-ring.test.js` holds by moving one in and out of it.
 */
const deforce = (css) => css.replace(
  /@media\s*\(\s*forced-colors\s*:\s*active\s*\)\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
  (m) => m.replace(/[^\n]/g, ' '),
);

/** One stylesheet with its comments blanked, which is the text `raw` indexes. */
export const sheetText = (css) => deforce(decomment(css));

/**
 * Every focus rule in one stylesheet, with the element it keys on.
 * `origin` names the file or block, so a finding is an address, and `raw` is the
 * rule's own text in `sheetText(css)`, so a mutation test can take it out again.
 */
export function focusRules(css, origin) {
  const out = [];
  for (const match of sheetText(css).matchAll(RULE)) {
    const [whole, selector, body] = match;
    if (selector.trimStart().startsWith('@')) continue;
    const paints = paintsOf(body);
    if (!paints.ring && !paints.outline && !paints.shadow) continue;
    for (const one of selectorList(selector)) {
      const clean = one.replace(/\s+/g, ' ');
      const keyed = focusSubject(clean);
      if (!keyed) continue;
      out.push({ origin, selector: clean, ...keyed, paints, raw: whole, at: match.index });
    }
  }
  return out;
}

/**
 * Keyboard stops, in document order.
 *
 * A stop is an element the keyboard moves focus to: a Tab stop, or a member of a
 * roving group the arrow keys move within. `tabindex="-1"` on anything else is
 * programmatic focus, not a keyboard stop — a dialog panel focused on open, or a
 * `role="option"` row in a listbox that keeps DOM focus in its input and marks
 * the current row with `aria-activedescendant`. Those never draw a focus ring
 * and are left out rather than exempted.
 *
 * A stop inside a `hidden` container is walked: a closed tab panel is one
 * keypress from open, and its CSS does not change when it opens.
 *
 * `extra` adds selectors for stops the browser makes without a tabindex — the
 * scroll containers `scrollingSelectors` finds. The fixed list below is the
 * tabbable kinds; it has no entry for an overflowing box, which is how #487's
 * review found a panel outside this walk altogether.
 */
const FOCUSABLE = [
  'a[href]', 'area[href]', 'button', 'input', 'select', 'textarea', 'summary',
  'iframe', 'audio[controls]', 'video[controls]', '[contenteditable=""]',
  '[contenteditable="true"]', '[tabindex]',
].join(',');

const ROVING_ROLES = ['tab', 'radio', 'option', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'treeitem'];

/**
 * Selectors the kit makes scrollable, discovered from the sheets rather than
 * listed. Chrome gives a scroll container a keyboard stop of its own — no
 * tabindex and no author rule — so an overflowing box has the same claim on the
 * ring as a button, and a new one joins the walk by being written.
 */
export function scrollingSelectors(sheets) {
  const out = new Set();
  for (const { css } of sheets) {
    for (const [, selector, body] of sheetText(css).matchAll(RULE)) {
      if (selector.trimStart().startsWith('@')) continue;
      const scrolls = declarations(body).some(([property, value]) => /^overflow(-[xy])?$/.test(property)
        && /\b(?:auto|scroll)\b/.test(value));
      if (!scrolls) continue;
      for (const one of selectorList(selector)) {
        const clean = one.replace(/\s+/g, ' ');
        if (KEYFRAME_STEP.test(clean) || focusSubject(clean)) continue;
        out.add(clean);
      }
    }
  }
  return [...out];
}

/**
 * The selector a `:has()` focus rule keys on, when a rule paints one box's ring
 * while ANOTHER box is the focus. `.ui-snippet:has(pre:focus-visible)` → `pre`.
 * #474 introduced that shape for a scroller flush with its container, and #531
 * reuses it for four more, so the reading has to follow it.
 */
function delegatedTo(selector) {
  const match = /:has\(\s*([^()]*?)\s*:focus(?:-visible)?\s*\)/.exec(selector);
  return match ? match[1].trim() : null;
}

/**
 * Every rule that paints the shared ring while `selector` is the keyboard focus:
 * one whose own subject reaches it, and one on another box keyed on
 * `:has(<it>:focus-visible)`. The rules come back rather than a boolean, so a
 * mutation can take ALL of them out — a box answered by two rules is not proved
 * by deleting one.
 *
 * NOT CHECKED: that a `:has()` host is an ancestor of the focused box. The reading
 * is "a ring is painted while this box holds focus"; WHICH box carries it is a
 * judgement, recorded in the triage's prose and shown by the captures.
 */
export function ringRulesFor(selector, rules) {
  return rules.filter((rule) => {
    if (!rule.paints.ring) return false;
    const inner = delegatedTo(rule.selector);
    if (inner) return selector === inner || selector.endsWith(` ${inner}`);
    return selector === rule.subject || selector.startsWith(`${rule.subject}.`)
      || selector.startsWith(`${rule.subject} `);
  });
}

/** Nothing the keyboard can operate, whatever its tabindex says. */
const inoperable = (el) => el.hasAttribute('disabled')
  || el.getAttribute('aria-disabled') === 'true'
  || (el.tagName === 'INPUT' && el.getAttribute('type') === 'hidden');

export function keyboardStops(root, extra = []) {
  const reachable = [FOCUSABLE, ...extra].join(',');
  return [...root.querySelectorAll(reachable)].filter((el) => {
    if (inoperable(el)) return false;
    const index = el.getAttribute('tabindex');
    if (index !== null && Number(index) < 0) return ROVING_ROLES.includes(el.getAttribute('role'));
    return true;
  });
}

/**
 * The descendants a browser puts in the TAB order — which is the question Chrome
 * asks before it makes a scroll container a keyboard stop of its own: a scroller
 * whose own children are keyboard-focusable is given no stop, because the keyboard
 * already reaches into it. Narrower than `keyboardStops` on purpose: a roving row
 * at `tabindex="-1"` is reached by an arrow key and not by Tab, so it does not
 * spare its container — which is exactly why `.ui-dropdown__list` and
 * `.ui-cmdk__list`, both full of them, are stops. #531
 */
export function tabbableIn(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (inoperable(el)) return false;
    const index = el.getAttribute('tabindex');
    return index === null || Number(index) >= 0;
  });
}

/** A short address for one stop: its classes, then whatever names it. */
export function stopLabel(el) {
  const classes = (typeof el.className === 'string' ? el.className : '').trim();
  const where = el.tagName.toLowerCase() + (classes ? `.${classes.split(/\s+/).join('.')}` : '');
  const name = accessibleName(el);
  return name ? `${where} "${name.slice(0, 48)}"` : where;
}

/**
 * The accessible name, as far as a static DOM carries it: the rules a swatch or
 * a link can reach. Not a full accname implementation — it reads no `<label>`
 * element and applies no role-specific content rule.
 */
export function accessibleName(el) {
  const labelled = el.getAttribute('aria-labelledby');
  if (labelled) {
    const text = labelled.split(/\s+/)
      .map((id) => el.ownerDocument.getElementById(id)?.textContent?.trim() || '')
      .filter(Boolean).join(' ');
    if (text) return text;
  }
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  const own = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (own) return own;
  const alt = el.querySelector('img[alt]')?.getAttribute('alt')?.trim();
  if (alt) return alt;
  return (el.getAttribute('title') || '').trim();
}

/**
 * Judge every keyboard stop under `root` against `rules`.
 *
 * `ring` — a focus rule reaches it and paints `var(--ring)`, and no focus rule
 *          reaching it paints a visible outline.
 * `native` — no focus rule reaches it, so the browser draws its own outline.
 * `outline` — a focus rule paints a visible outline: instead of the ring, or
 *          beside it as a second indicator.
 * `shadow` — a focus rule paints some other box-shadow and never the ring.
 *
 * `unmatchable` lists rules JSDOM could not match, so a selector this parser
 * mis-reads fails the gate instead of quietly excusing a control.
 */
export function judgeStops(root, rules) {
  const unmatchable = new Set();
  const reached = new Set();
  const stops = keyboardStops(root).map((el) => {
    const matched = rules.filter((rule) => {
      try {
        const hit = rule.within ? el.closest(rule.subject) !== null : el.matches(rule.subject);
        if (hit) reached.add(rule.selector);
        return hit;
      } catch { unmatchable.add(`${rule.origin} ${rule.selector} → ${rule.subject}`); return false; }
    });
    const ring = matched.find((rule) => rule.paints.ring);
    const outlined = matched.find((rule) => rule.paints.outline);
    const shadowed = matched.find((rule) => rule.paints.shadow);
    const label = stopLabel(el);
    if (outlined) {
      return {
        el, label, status: 'outline',
        detail: `${outlined.origin} ${outlined.selector} paints outline: ${outlined.paints.outline}`
          + (ring ? ' beside the ring' : ' instead of the ring'),
      };
    }
    if (ring) return { el, label, status: 'ring', detail: `${ring.origin} ${ring.selector}` };
    if (shadowed) {
      return {
        el, label, status: 'shadow',
        detail: `${shadowed.origin} ${shadowed.selector} paints box-shadow: ${shadowed.paints.shadow}`,
      };
    }
    return { el, label, status: 'native', detail: 'no focus rule reaches it' };
  });
  return { stops, unmatchable: [...unmatchable], reached };
}

/** The stops that are not drawing the shared ring, as reportable lines. */
export const failures = (stops, exempt = () => false) => stops
  .filter((stop) => stop.status !== 'ring' && !exempt(stop))
  .map((stop) => `${stop.status}: ${stop.label} — ${stop.detail}`);

// ---- the cascade ----------------------------------------------------------

/**
 * A selector's specificity as `[ids, classes, types]`.
 *
 * `:is()`, `:not()` and `:has()` contribute their most specific argument and
 * count nothing themselves; `:where()` contributes nothing at all. A pseudo-
 * element counts as a type, a pseudo-class as a class, exactly as the cascade
 * counts them — so `.accents button:focus-visible` and `.play-accents
 * button.on` both come to (0,2,1) and only order separates them.
 */
export function specificity(selector) {
  let rest = selector;
  const total = [0, 0, 0];
  const add = (one) => one.forEach((n, i) => { total[i] += n; });
  for (;;) {
    const match = /:(not|is|has|where)\(/i.exec(rest);
    if (!match) break;
    let depth = 0;
    let j = match.index + match[0].length - 1;
    for (; j < rest.length; j++) {
      if (rest[j] === '(') depth += 1;
      if (rest[j] === ')' && --depth === 0) break;
    }
    const args = rest.slice(match.index + match[0].length, j);
    if (match[1].toLowerCase() !== 'where') {
      add(selectorList(args).map(specificity)
        .reduce((best, one) => (outranks(one, best) ? one : best), [0, 0, 0]));
    }
    rest = `${rest.slice(0, match.index)} ${rest.slice(j + 1)}`;
  }
  let bare = rest;
  const take = (pattern, slot) => {
    bare = bare.replace(pattern, () => { total[slot] += 1; return ' '; });
  };
  take(/::[\w-]+/g, 2);
  take(/#[\w-]+/g, 0);
  take(/\.[\w-]+/g, 1);
  take(/\[[^\]]*\]/g, 1);
  take(/:[\w-]+/g, 1);
  bare = bare.replace(/\*/g, ' ');
  for (const _ of bare.matchAll(/[a-zA-Z][\w-]*/g)) { void _; total[2] += 1; }
  return total;
}

/** Is `a` more specific than `b`? Compared slot by slot, ids first. */
const outranks = (a, b) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
};

/** A rule that cannot apply while the element is focused, because it negates
 *  focus itself: `.ui-nav__item.is-active:not(:focus-visible)` carries the
 *  collapsed rail's hairline at rest and steps aside for the ring. */
const negatesFocus = (selector) => compoundsOf(selector)
  .some(({ compound }) => dropFunctional(compound, ['not'], (args) => FOCUS.test(args)) !== compound);

const isRing = (value) => value !== null && /var\(\s*--ring\s*[,)]/.test(value);
/** The same indicator on a scroll region: the kit's gap and band drawn inward, as an
 *  outline rather than a shadow, so the region's own children cannot paint over it.
 *  It competes for `outline` where --ring competes for `box-shadow`. #531 */
const isScrollRing = (value) => value !== null && /var\(\s*--ring-scroll\s*[,)]/.test(value);

/** A keyframe step, not a selector. `@keyframes` is stripped of its own at-rule
 *  line by the reader, leaving `0%`, `from` and `to` behind; badge.css animates
 *  `box-shadow` that way, and a step matches no element. */
const KEYFRAME_STEP = /^(?:from|to|-?\d+(?:\.\d+)?%)$/i;

/**
 * Every rule that declares `box-shadow` or `outline`, with where it sits in the
 * cascade: `sheet` is its stylesheet's place in document order and `at` its byte
 * offset inside that sheet, so a tie on specificity is broken the way the
 * browser breaks it. `subject` is the element the declaration LANDS on, with the
 * focus pseudo removed so JSDOM can match it; `focus` says whether it was there.
 *
 * Only rules that land on the focused element itself are kept. A focus rule that
 * paints a child or a sibling — the rail's `.ui-nav__label`, the switch's track —
 * competes in that element's cascade, not the stop's, and ranking it against the
 * stop's own declarations would compare two different elements.
 */
export function paintingRules(sheets) {
  const out = [];
  sheets.forEach(({ file, css }, sheet) => {
    for (const match of sheetText(css).matchAll(RULE)) {
      const [, selector, body] = match;
      if (selector.trimStart().startsWith('@')) continue;
      const decls = declarations(body);
      const last = (names) => decls.filter(([property]) => names.includes(property)).at(-1);
      const shadow = last(['box-shadow']);
      const outline = last(['outline', 'outline-style', 'outline-color']);
      if (!shadow && !outline) continue;
      const strip = (decl) => (decl ? decl[1].replace(/!important/gi, '').trim() : null);
      for (const one of selectorList(selector)) {
        const clean = one.replace(/\s+/g, ' ');
        if (KEYFRAME_STEP.test(clean)) continue;
        const keyed = focusSubject(clean);
        if (keyed ? !keyed.self : negatesFocus(clean)) continue;
        out.push({
          origin: file,
          selector: clean,
          sheet,
          at: match.index,
          spec: specificity(clean),
          subject: keyed ? keyed.subject : clean,
          focus: Boolean(keyed),
          shadow: strip(shadow),
          outline: strip(outline),
        });
      }
    }
  });
  return out;
}

/**
 * The `box-shadow` and `outline` a focused keyboard stop actually ends up with.
 *
 * `sheets` is the ordered list the page loads — the kit's own sheets first, then
 * the page's `<style>` — so position means what it means in the document. For
 * each stop the winner of each property is the matching declaration that
 * outranks every other on specificity, or sits last among equals.
 *
 * `rings` holds the rules that ask for the ring ON THIS STOP, in either form: a
 * `box-shadow` of `var(--ring)`, or — on a scroll region — an `outline` of
 * `var(--ring-scroll)`. A ring the kit delegates to another element is not resolved
 * here; `delegated` counts those, so the gate can hold the number rather than let it
 * grow unseen.
 */
export function focusPaint(root, sheets) {
  const rules = paintingRules(sheets);
  const unmatchable = new Set();
  const hits = (rule, el) => {
    try {
      return el.matches(rule.subject);
    } catch {
      unmatchable.add(`${rule.origin} ${rule.selector} → ${rule.subject}`);
      return false;
    }
  };
  const after = (a, b) => {
    if (outranks(a.spec, b.spec)) return true;
    if (outranks(b.spec, a.spec)) return false;
    return a.sheet !== b.sheet ? a.sheet > b.sheet : a.at > b.at;
  };
  const delegating = focusRules(sheets.map(({ css }) => css).join('\n'), 'any')
    .filter((rule) => !rule.self && rule.paints.ring);
  const stops = keyboardStops(root).map((el) => {
    const matched = rules.filter((rule) => hits(rule, el));
    const win = (property) => matched.filter((rule) => rule[property] !== null)
      .reduce((best, rule) => (!best || after(rule, best) ? rule : best), null);
    const delegated = delegating.filter((rule) => {
      try {
        return rule.within ? el.closest(rule.subject) !== null : el.matches(rule.subject);
      } catch { return false; }
    });
    return {
      el,
      label: stopLabel(el),
      rings: matched.filter((rule) => rule.focus
        && (isRing(rule.shadow) || isScrollRing(rule.outline))),
      delegated: delegated.map((rule) => rule.selector),
      shadow: win('shadow'),
      outline: win('outline'),
    };
  });
  return { stops, unmatchable: [...unmatchable] };
}

/**
 * Stops whose ring is written but not painted: a focus rule matches and asks for the
 * ring, and the cascade still hands the property that carries it to something else.
 * Which property that is depends on the form — `box-shadow` for `var(--ring)`,
 * `outline` for a scroll region's `var(--ring-scroll)` — so the winner is read on the
 * property the stop's own rules asked for. A stop no ring rule reaches is not reported
 * here; `failures` already names it.
 */
export function cascadeFailures({ stops }, exempt = () => false) {
  return stops.flatMap((stop) => {
    if (!stop.rings.length || exempt(stop)) return [];
    const where = (rule) => `${rule.origin} ${rule.selector} (${rule.spec.join(',')})`;
    const asked = stop.rings.map((rule) => where(rule)).join(', ');
    const lines = [];
    const inOutline = stop.rings.every((rule) => isScrollRing(rule.outline));
    if (inOutline) {
      // The band IS the outline here, so a later outline does not sit beside the ring
      // — it replaces it, which is the one thing to catch.
      if (!stop.outline || !isScrollRing(stop.outline.outline)) {
        lines.push(`${stop.label} — ${asked} asks for var(--ring-scroll), but `
          + `${stop.outline ? where(stop.outline) : 'nothing'} wins outline with `
          + `"${stop.outline?.outline ?? 'none'}"`);
      }
      return lines;
    }
    if (!isRing(stop.shadow.shadow)) {
      lines.push(`${stop.label} — ${asked} asks for var(--ring), but `
        + `${where(stop.shadow)} wins box-shadow with "${stop.shadow.shadow}"`);
    }
    if (stop.outline && !invisibleOutline(stop.outline.outline)) {
      lines.push(`${stop.label} — ${where(stop.outline)} wins outline with `
        + `"${stop.outline.outline}", a second indicator beside the ring`);
    }
    return lines;
  });
}
