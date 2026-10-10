/* Rule: chips and Add rest on quiet edges, while Clear has no visible edge in any state.
 * A pointer and the keyboard both move Add's edge to the accent; disabled chips and Add use the
 * unavailable edge.
 *
 * The row overrides the primitive edge rules, so every state must be measured.
 *
 * Subjects and their state vocabularies are discovered, not listed; each check below states what
 * it cannot see. why: docs/components.md#a-filter-row-holds-its-panels
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tokensFor, substitute, parseColour } from './lib/contrast.js';

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8');
const SHEET = read('src/styles/filter-bar.css');
const THEMES = ['light', 'dark'];

/* Limit: this reads sheets' cascade by selector and specificity, not paint. It expands no
   shorthand but `border`, and honours no `!important`, inline style, consumer sheet or `@media`
   block, so an edge overridden in one of those is unread. */
const BAR = '.ui-filter-bar';
const CHIP = '.ui-filter-bar__chip';
const STYLES = 'src/styles';
/** Every sheet the package ships, so a state the kit paints this box in from another file is
 *  found where it is written rather than where it is expected. */
const KIT_SHEETS = readdirSync(fileURLToPath(new URL(`../${STYLES}`, import.meta.url)))
  .filter((name) => name.endsWith('.css') && name !== 'filter-bar.css')
  .map((name) => read(`${STYLES}/${name}`));

/** A neighbour is a wrapper inside the bar carrying a `data-filter-*` attribute — the contract a
 *  page draws its own control from — whichever kit box this sheet puts inside it. Discovery is
 *  the attribute, so a wrapper that places a box and forgets the edge is still measured and
 *  still fails, and a second neighbour joins the gate by existing. */
const ATTR = /\[(data-filter-[\w-]+)\]/;
/** The boxes a wrapper can hold, and the kit class each one wears. `button` is the kit's own
 *  button, which is what `[data-filter-clear]` holds. */
const BOXES = [
  { box: '.ui-dropdown__trigger', kit: '.ui-dropdown__trigger' },
  { box: 'button', kit: '.ui-btn' },
];

/** Every leaf rule as { selector, body, order }, comments stripped, source order kept. */
function rules(css) {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(([, selector, body], order) => ({ selector: selector.trim().replace(/\s+/g, ' '), body: body.trim(), order }))
    .filter((rule) => !rule.selector.startsWith('@'));
}

const parts = (selector) => selector.split(',').map((one) => one.trim());

/** The edge ink a body declares: `border-color`, or the colour out of a `border`
 *  shorthand. The last one wins, as it does in a browser. */
function edgeIn(body) {
  let ink = null;
  for (const [, property, value] of body.matchAll(/(?:^|;)\s*(border|border-color)\s*:([^;]*)/g)) {
    const raw = value.trim();
    ink = property === 'border-color' ? raw : (/(var\(--[\w-]+\)|#[0-9a-fA-F]{3,8}|\btransparent\b|rgba?\([^)]*\))/.exec(raw) || [null])[0];
  }
  return ink;
}

/** a,b,c — ids, then classes/attributes/pseudo-classes, then elements. */
function specificity(part) {
  const bare = part.replace(/\[[^\]]*\]/g, '[]');
  return [
    (bare.match(/#[\w-]+/g) || []).length,
    (bare.match(/\.[\w-]+/g) || []).length + (bare.match(/\[\]/g) || []).length
      + (bare.match(/:(?!:)[\w-]+/g) || []).length,
    (bare.replace(/[.#:[][^\s>+~]*/g, ' ').match(/\b[a-z][\w-]*\b/g) || []).length,
  ];
}
const outranks = (a, b) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
};

/** `null` when this selector part does not aim at the subject's box; otherwise the state
 *  qualifiers it carries, wherever it carries them — on the box (`:disabled`) or on an
 *  ancestor (`.ui-filter-bar:disabled .ui-filter-bar__chip`), which is how a bar turned off
 *  reaches a chip that carries no attribute of its own. */
function aimedAt(part, { attr, box }) {
  if (attr && !part.includes(`[${attr}]`)) return null;
  const at = part.lastIndexOf(box);
  if (at < 0) return null;
  const after = part.slice(at + box.length);
  // A longer class name, or a class glued to a bare element name, is a different box.
  if (/^[\w-]/.test(after)) return null;
  if (box === 'button' && /[\w-]$/.test(part.slice(0, at))) return null;
  let before = part.slice(0, at);
  if (attr) before = before.replace(`[${attr}]`, '');
  return `${before.replace(BAR, '')}${after}`.replace(/\s+/g, ' ').trim();
}

/** The states this gate has an ink for. A rule is classified by the first match, so
 *  `:disabled:hover` is an unavailable edge rather than an accent one, and a busy-and-off
 *  control is off. `want: null` means the chip's own edge, read off the sheet. */
const MEASURED = [
  { what: 'unavailable', is: (s) => /:disabled|\[aria-disabled="true"\]|\[data-btn-disabled\]/.test(s), want: 'var(--disabled-border)' },
  // Busy retains the resting edge. Clear has its own transparent-edge contract.
  { what: 'busy', is: (s) => /\[aria-busy="true"\]/.test(s), want: null },
  // A pointer gets an answer, and it is the accent edge both of this row's primitives move to.
  // Clear is overridden to transparent below, because Artur's unboxed button answers with a wash.
  { what: 'hover', is: (s) => s.includes(':hover'), want: 'var(--accent)' },
  { what: 'keyboard focus', is: (s) => s.includes(':focus-visible'), want: 'var(--accent)' },
  { what: 'rest', is: (s) => s === '', want: null },
];
const classOf = (state) => MEASURED.find((one) => one.is(state));

/* What the factory writes for the clear action, read from the factory rather than assumed: the
   variant decides which of the kit's own rules can reach it at all. */
const FACTORY = read('src/components/filter-bar.js');
const VARIANTS = [/variant: '(\w+)'[^}]*\}\)\}<\/span>/.exec(FACTORY)?.[1], 'sm'].filter(Boolean).map((v) => `.ui-btn--${v}`);

/** The states the kit itself paints an edge on this box in. Those are the states the row has to
 *  answer, because its own resting rule sits deeper than every one of them. */
function kitStates(kit) {
  const found = new Map();
  for (const css of KIT_SHEETS) {
    for (const rule of rules(css)) {
      if (!edgeIn(rule.body)) continue;
      for (const part of parts(rule.selector)) {
        if (!part.startsWith(kit)) continue;
        // A rule carrying another variant's class cannot reach this control. The variants are
        // read off the whole part, before the box's own name is taken off it.
        const wears = part.match(/\.ui-btn--[\w-]+/g) || [];
        if (wears.some((one) => !VARIANTS.includes(one))) continue;
        // A variant or size class is not a state, so it comes off with the box's own name.
        const state = part.slice(kit.length).replace(/^--[\w-]+/, '').replace(/\.ui-btn--[\w-]+/g, '');
        if (/^[\w-]/.test(state)) continue; // a longer class name, not this box
        if (/[\s>+~]/.test(state)) continue; // a descendant of the box, not the box
        const seen = classOf(state);
        if (seen) found.set(seen.what, part);
      }
    }
  }
  return found;
}

/** Every subject on this row: the chip, then every neighbour the sheet names, in source order.
 *  The chip's box is the row's own, so no kit sheet paints it and the row owns all of it. */
function subjects(css) {
  const out = [{ name: 'the chip', attr: null, box: CHIP, kit: null }];
  const seen = new Set();
  for (const rule of rules(css)) {
    for (const part of parts(rule.selector)) {
      const hit = ATTR.exec(part);
      if (!hit || seen.has(hit[1])) continue;
      seen.add(hit[1]);
      out.push({ name: `[${hit[1]}]`, attr: hit[1], box: null, kit: null });
    }
  }
  // Which box each wrapper holds, asked of the sheet: the one it puts inside the wrapper.
  for (const subject of out.filter((one) => one.attr)) {
    const inside = rules(css).flatMap((rule) => parts(rule.selector))
      .filter((part) => part.includes(`[${subject.attr}]`));
    const found = BOXES.find(({ box }) => inside.some((part) => aimedAt(part, { attr: subject.attr, box }) !== null));
    if (found) Object.assign(subject, found);
  }
  return out;
}

/** Every declaration this sheet aims at one subject's box, keyed by the state the selector
 *  carries. '' is the box at rest. */
function edgesOf(css, subject) {
  const found = [];
  for (const rule of rules(css)) {
    const ink = edgeIn(rule.body);
    if (!ink) continue;
    for (const part of parts(rule.selector)) {
      const state = aimedAt(part, subject);
      if (state === null) continue;
      found.push({ state, ink, part, order: rule.order, rank: specificity(part) });
    }
  }
  return found;
}

/** The edge the chip itself draws, so every other box is held to the row and not to a
 *  value typed twice. */
function chipEdge(css) {
  const ink = rules(css)
    .filter((rule) => parts(rule.selector).includes(CHIP))
    .map((rule) => edgeIn(rule.body)).filter(Boolean).at(-1);
  assert.ok(ink, `${CHIP} declares no edge in this sheet`);
  return ink;
}

const resolved = (ink, theme) => parseColour(substitute(ink, tokensFor(theme)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** What each subject has to answer: rest and unavailable, which this row guarantees whatever
 *  the kit does, plus every state the kit paints an edge on the same box in. The chip's own box
 *  is the row's, so no kit sheet paints it and it answers those two alone — the pointer and the
 *  keyboard reach the trigger inside it, which draws `border: 0`, asserted below. */
function wanted(subject) {
  const needed = new Set(['rest', 'unavailable']);
  if (subject.kit) for (const what of kitStates(subject.kit).keys()) needed.add(what);
  return [...MEASURED].filter((one) => needed.has(one.what));
}

/* Every finding, as a list of complaints, so the mutation test below can run the same code over a
 * broken sheet and watch it refuse. */
function findings(css) {
  const out = [];
  const chip = chipEdge(css);
  const found = subjects(css);
  if (found.length < 2) out.push(`${BAR} names no data-filter-* neighbour, so nothing on this row is held to the chip's edge`);

  for (const subject of found) {
    const { name } = subject;
    if (!subject.box) {
      out.push(`${name} holds no box this gate can measure, so its edge is unread`);
      continue;
    }
    const edges = edgesOf(css, subject);

    // A state with no ink to check is not covered by being ranked. why: AGENTS.md, new gates
    for (const one of edges) {
      if (!classOf(one.state)) out.push(`${name} is given ${one.part}, a state this gate has no ink for — measure it or drop the rule`);
    }

    // Every subject answers every state it can be in, and with the ink the row's guarantee names.
    for (const { what, want: expected } of wanted(subject)) {
      const want = subject.attr === 'data-filter-clear' ? 'transparent' : expected;
      const at = edges.filter((one) => classOf(one.state)?.what === what);
      if (!at.length) {
        out.push(what === 'rest'
          ? `${name} declares no edge of its own, so it keeps whatever the kit gives its box`
          : `${name} answers ${what} with nothing, so the resting rule holds its edge through it`);
        continue;
      }
      for (const one of at) {
        if (want === null) {
          if (one.ink !== chip) out.push(`${name} draws ${one.ink} at ${what} where the chip draws ${chip}`);
          for (const theme of THEMES) {
            // In light the two tokens were one ink, which is how a live control drew the
            // unavailable edge. why: guidelines/accessibility-floor.md
            if (same(resolved(one.ink, theme), resolved('var(--disabled-border)', theme))) {
              out.push(`in ${theme} the live ${name}'s ${one.ink} is the ink --disabled-border resolves to`);
            }
          }
          continue;
        }
        for (const theme of THEMES) {
          if (!same(resolved(one.ink, theme), resolved(want, theme))) {
            out.push(`in ${theme} ${name} draws ${one.ink} at ${what}, not ${want}`);
          }
        }
      }
    }

    // A state only reaches the box if it outranks the resting rule, or ties it and follows.
    const rest = edges.filter((one) => one.state === '');
    for (const one of edges.filter((e) => e.state !== '')) {
      for (const base of rest) {
        if (!outranks(one.rank, base.rank) && !(same(one.rank, base.rank) && one.order > base.order)) {
          out.push(`${one.part} is outranked by the resting rule, so that state never paints`);
        }
      }
    }
  }

  // Limit: this cannot tell which of two carriers of one state matches a real element. A bar
  // turned off disables the controls inside a nested fieldset and not the fieldset itself, so
  // both of the chip's off selectors are required rather than measured; a browser reads which
  // one paints.
  const off = edgesOf(css, { attr: null, box: CHIP }).filter((one) => classOf(one.state)?.what === 'unavailable');
  if (!off.some((one) => one.part.startsWith(`${CHIP}:`))) out.push(`${CHIP} takes no unavailable edge from its own state`);
  if (!off.some((one) => one.part.startsWith(`${BAR}:disabled `))) out.push(`${CHIP} takes no unavailable edge from a bar turned off`);
  return out;
}

test('filter edges stay quiet and Clear stays unboxed in both themes', () => {
  assert.deepEqual(findings(SHEET), []);
});

test('the pointer and the keyboard reach no edge of the chip\'s own', () => {
  // Which is why the chip answers two states and not five. A trigger given an edge inside the
  // chip would be a box on this row that this gate holds to nothing.
  const inside = rules(SHEET).find((rule) => parts(rule.selector).includes(`${CHIP} .ui-dropdown__trigger`));
  assert.ok(inside, `${CHIP} does not place the kit's trigger`);
  assert.match(inside.body, /border:\s*0/, 'the chip\'s trigger now draws an edge of its own');
});

test('every subject, box and state the sheet aims at this row is measured', () => {
  const found = subjects(SHEET);
  assert.ok(found.length >= 3, `${BAR} names ${found.length - 1} data-filter-* neighbour(s) to measure`);
  for (const subject of found) {
    assert.ok(subject.box, `${subject.name} holds no box this gate can measure`);
    const edges = edgesOf(SHEET, subject);
    const unmeasured = edges.filter((one) => !classOf(one.state)).map((one) => one.part);
    assert.deepEqual(unmeasured, [], `this gate has no ink for ${unmeasured.join(', ')}`);
    const asked = wanted(subject);
    for (const { what } of asked) {
      assert.ok(edges.some((one) => classOf(one.state).what === what), `${subject.name} has no ${what} edge rule`);
    }
    // Coverage count: every rule reaching this box is classified, and no state is missing.
    assert.equal(edges.filter((one) => classOf(one.state)).length, edges.length);
    assert.ok(edges.length >= asked.length, `only ${edges.length} edge rules reach ${subject.name}, which can be in ${asked.length} states`);
  }
  // The vocabulary is derived, so the derivation is asserted: the kit paints the clear action's
  // box in a state the add control's box is never in, and the other way round.
  const kit = (box) => [...kitStates(box).keys()].sort();
  assert.deepEqual(kit('.ui-btn'), ['busy', 'hover', 'rest', 'unavailable']);
  assert.deepEqual(kit('.ui-dropdown__trigger'), ['hover', 'rest']);
});

test('the gate refuses a sheet that brings any of it back', () => {
  const MUTATIONS = [
    ['the add control\'s resting edge dropped', (css) => css.replace('min-height: var(--ui-filter-row-h); border-color: var(--border-strong); background: transparent;', 'min-height: var(--ui-filter-row-h); background: transparent;')],
    ['the add control\'s resting edge back to a trigger\'s --border', (css) => css.replace('border-color: var(--border-strong); background: transparent;', 'border-color: var(--border); background: transparent;')],
    ['the add control\'s unavailable edge dropped', (css) => css.replace(/\n[^\n]*\[data-filter-add\][^\n]*:disabled \{ border-color: var\(--disabled-border\); \}/, '')],
    ['the add control hover response dropped', (css) => css.replace(/\n[^\n]*\[data-filter-add\][^\n]*:hover[^{]*\{ border-color: var\(--accent\); \}/, '')],
    ['the add control answering a pointer with its resting edge', (css) => css.replace('.ui-dropdown__trigger:enabled:hover:not(:focus-visible) { border-color: var(--accent); }', '.ui-dropdown__trigger:enabled:hover:not(:focus-visible) { border-color: var(--border-strong); }')],
    ['a state the gate has no ink for', (css) => `${css}\n${BAR} [data-filter-add] .ui-dropdown__trigger:active { border-color: #000; }\n`],
    ['a second neighbour given only the unavailable edge', (css) => `${css}\n${BAR} [data-filter-export] .ui-dropdown__trigger:disabled { border-color: var(--disabled-border); }\n`],
    // The discovery is the attribute, so a wrapper holding a box and declaring no edge at all is
    // the case a narrowing could let through. It does not, whichever box it holds.
    ['a second neighbour placing a trigger with no edge at all', (css) => `${css}\n${BAR} [data-filter-export] .ui-dropdown__trigger { display: flex; }\n`],
    ['a second neighbour holding the kit\'s button with no edge at all', (css) => `${css}\n${BAR} [data-filter-export] button { padding: 0; }\n`],
    ['a wrapper the sheet names and puts no box inside', (css) => `${css}\n${BAR} [data-filter-export] { display: flex; }\n`],
    // The clear action, the subject an earlier narrowing excluded outright. #518
    ['the clear action\'s resting edge dropped', (css) => css.replace('\n.ui-filter-bar [data-filter-clear] button { border-color: transparent; }', '')],
    ['the clear action resting on the kit\'s --control-edge', (css) => css.replace('.ui-filter-bar [data-filter-clear] button { border-color: transparent; }', '.ui-filter-bar [data-filter-clear] button { border-color: var(--control-edge); }')],
    ['the clear action\'s busy edge left to the kit', (css) => css.replace(/\n\.ui-filter-bar \[data-filter-clear\] button\[aria-busy="true"\],\n[^\n]*\n[^\n]*:active \{ border-color: transparent; \}/, '')],
    ['the clear action\'s unavailable edge left to the kit, which this depth outranks', (css) => css.replace(/\n\.ui-filter-bar \[data-filter-clear\] button:disabled,\n\.ui-filter-bar \[data-filter-clear\] button\[aria-disabled="true"\],\n\.ui-filter-bar \[data-filter-clear\] button\[aria-busy="true"\]\[data-btn-disabled\] \{ border-color: transparent; \}/, '')],
    ['the clear action\'s hover response frozen by its own resting rule', (css) => css.replace(/\n\.ui-filter-bar \[data-filter-clear\] button:enabled:hover \{ border-color: transparent;[^\n]*\}/, '')],
    ['the clear action taking an edge under the pointer', (css) => css.replace('[data-filter-clear] button:enabled:hover { border-color: transparent;', '[data-filter-clear] button:enabled:hover { border-color: var(--accent);')],
    // The chip, the box every other one is measured against. #518
    ['the chip keeping its live edge when the row is off', (css) => css.replace(/\n\.ui-filter-bar__chip:disabled,\n\.ui-filter-bar:disabled \.ui-filter-bar__chip \{ border-color: var\(--disabled-border\); \}/, '')],
    ['the chip off only by its own state, which a bar turned off does not set', (css) => css.replace('.ui-filter-bar__chip:disabled,\n.ui-filter-bar:disabled .ui-filter-bar__chip {', '.ui-filter-bar__chip:disabled {')],
    ['the chip off only through the bar, which an own disabled chip does not have', (css) => css.replace('.ui-filter-bar__chip:disabled,\n.ui-filter-bar:disabled .ui-filter-bar__chip {', '.ui-filter-bar:disabled .ui-filter-bar__chip {')],
    ['the chip faded while it is live', (css) => css.replace('.ui-filter-bar__chip { display: inline-flex; align-items: center; border: 1px solid var(--border-strong);', '.ui-filter-bar__chip { display: inline-flex; align-items: center; border: 1px solid var(--disabled-border);')],
  ];
  for (const [what, mutate] of MUTATIONS) {
    const broken = mutate(SHEET);
    assert.notEqual(broken, SHEET, `the mutation "${what}" changed nothing, so it proves nothing`);
    assert.notDeepEqual(findings(broken), [], `the gate passed with ${what}`);
  }
});
