/* Rule: a live dropdown trigger never draws the line the kit paints an
 * unavailable control with, and an unavailable trigger always does.
 *
 * The kit keeps two names for a control's edge: --control-edge, which every live
 * box takes (.ui-btn says so in its own comment), and --disabled-border, which an
 * off one takes. In LIGHT the two were one value apart by accident — --border is
 * both the plain hairline and what --disabled-border resolves to — so
 * `.ui-dropdown__trigger`, which drew `border: 1px solid var(--border)`, painted
 * every live standalone trigger with an unavailable control's line. DARK failed
 * the other way: no disabled rule existed at all, so an off trigger kept a live
 * one's edge. #580, found by #518's builder.
 *
 * So this gate reads the trigger's edge out of the sheets, per state and per
 * scope, and holds both halves: live is never the off ink, off is always it. The
 * live half is read in EVERY state a reader can still use the control in, not on
 * the resting rule alone: a hover or focus rule that paints the off edge is the
 * same defect one state along, and a correct resting rule does not undo it. It
 * also RANKS each state rule against its scope's resting rule, because the fix
 * itself could have broken that — a resting declaration written three classes
 * deep outranks `.ui-dropdown__trigger:hover` and would freeze the edge.
 *
 * Limits, stated beside the gate as the repo asks: this reads one cascade by
 * selector, specificity and source order across the sheets src/index.css imports
 * plus the React workspace's own, in that order. It models no `!important`, no
 * inline style, no @media or @container condition (an at-rule body is read as
 * itself, so a rule only a narrow viewport applies is read as if it always did),
 * no consumer sheet, and no `:not()` deeper than its own arithmetic. It measures
 * token arithmetic, not paint; the browser captures on the pull request carry
 * what is drawn. Ratios here are recorded, not held to the 3:1 non-text floor:
 * WCAG 1.4.11 exempts a disabled control, and the live edge against its own fill
 * is the kit's existing treatment for every boxed control, not this gate's to
 * change.
 *
 * why: docs/foundations.md#colour-and-contrast
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseColour, ratio, substitute, tokensFor } from '../../stories/lib/contrast.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

const THEMES = ['dark', 'light'];
const TRIGGER = '.ui-dropdown__trigger';
const OFF_EDGE = '--disabled-border';

/* Blank a comment without moving a line, so a rule's index stays its real one. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/* The sheets a page gets, in the order it gets them: the kit's own as
 * src/index.css imports them, then the React workspace's, which load after it.
 * Discovered from the import list and the directory, never typed out here. */
const KIT_SHEETS = decomment(read('src/index.css'))
  .split('\n')
  .map((line) => /@import\s+"\.\/(styles\/.+?)"/.exec(line))
  .filter(Boolean)
  .map((m) => `src/${m[1]}`);
const REACT_SHEETS = readdirSync(path.join(root, 'react/src'))
  .filter((f) => f.endsWith('.css'))
  .sort()
  .map((f) => `react/src/${f}`);
const SHEETS = [...KIT_SHEETS, ...REACT_SHEETS];

/* Every way a sheet can spell one of the states this gate knows how to read.
 * Ordered, and read first-match-wins: `:disabled:hover` carries both spellings
 * and draws the unavailable edge, so it is classified as off and not as hover. */
const STATES = [
  ['off', /:disabled\b|\[disabled\]|:not\(\s*:enabled\s*\)|\[aria-disabled\s*=\s*("true"|'true'|true)\]/i],
  ['hover', /:hover\b/i],
  ['focus', /:focus(-visible|-within)?\b/i],
  ['open', /\.open\b|\[aria-expanded\s*=\s*("true"|'true'|true)\]/i],
];
/* The whole state vocabulary. A rule at a state that is not in it fails the gate
 * rather than being filed under "resting" and quietly counted as covered. */
const MEASURED = ['rest', ...STATES.map(([name]) => name)];
/* The states the kit's own trigger has to answer. `open` is allowed and not
 * required: the kit answers opening on the chevron, not on the trigger's edge. */
const REQUIRED = ['rest', 'hover', 'off'];
/* `off` is the one state whose edge is supposed to be the unavailable ink. In
 * every other state, painting it is the defect #580 reports. */
const LIVE = MEASURED.filter((state) => state !== 'off');

/* Anything in a selector that reports a state rather than naming a box. One
 * source for two jobs: stripped, it leaves the SCOPE — the control a run of
 * rules is all about; matched, it says a rule is about a state, so a state this
 * gate has no reading for comes back as `unknown` instead of being filed under
 * "resting" and counted as covered. */
const STATEFUL = '(?::(?:hover|active|focus(?:-visible|-within)?|disabled|enabled|checked|target|visited|link'
  + '|indeterminate|placeholder-shown|user-(?:in)?valid|in-range|out-of-range|read-only)\\b'
  + '|\\[disabled\\]|\\[aria-(?:disabled|expanded|pressed|current|selected|busy)\\s*=\\s*[^\\]]*\\]'
  + '|\\.open\\b|\\.is-(?:open|active|selected|busy)\\b)';
const STATE_IN_SELECTOR = new RegExp(`${STATEFUL}|:not\\([^)]*\\)`, 'gi');

const scopeOf = (selector) => selector.replace(STATE_IN_SELECTOR, '').replace(/\s+/g, ' ').trim();

const classify = (selector) => STATES.find(([, re]) => re.test(selector))?.[0]
  ?? (new RegExp(STATEFUL, 'i').test(selector) ? 'unknown' : 'rest');

/* Specificity, as far as these selectors go: ids, then classes + attributes +
 * pseudo-classes, then types + pseudo-elements. `:not()` contributes its
 * contents, which is the rule CSS states; nothing here nests one. */
function specificity(selector) {
  const flat = selector.replace(/:not\(([^)]*)\)/gi, ' $1 ');
  const a = (flat.match(/#[\w-]+/g) || []).length;
  const b = (flat.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+(?:\([^)]*\))?/g) || []).length;
  const c = (flat.match(/(^|[\s>+~(])[a-z][\w-]*/gi) || []).length
    + (flat.match(/::[\w-]+/g) || []).length;
  return [a, b, c];
}
const outranks = (one, other) => {
  for (let i = 0; i < 3; i++) {
    if (one.spec[i] !== other.spec[i]) return one.spec[i] > other.spec[i];
  }
  return one.order > other.order;
};

/* The edge a rule body paints, or null where it paints none. Every declaration
 * that can reach the border colour is read, and the LAST one is the one the
 * browser keeps: `border: 0` after a colour takes the edge away again. */
const EDGE = /(?:^|[;\s])border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?\s*:\s*([^;]+)/gi;
/* `border: 0`, `border: none`, a zero width or a see-through colour: the box
 * draws nothing, so it cannot be mistaken for an unavailable one. */
const NO_EDGE = /^(0\w*|none|transparent|hidden)$|^0(px|em|rem)?\s|(^|\s)(transparent|hidden|none)(\s|$)/i;

function edgeOf(body) {
  const found = [...body.matchAll(EDGE)].map((m) => m[1].replace(/!\s*important\s*$/i, '').trim());
  if (!found.length) return null;
  const last = found.at(-1);
  if (NO_EDGE.test(last)) return { declared: last, drawn: false };
  const colour = /var\(\s*--[\w-]+\s*\)|#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|color-mix\([^)]*\)|currentColor/i.exec(last);
  return { declared: last, drawn: true, colour: colour ? colour[0] : null };
}

/* Every rule in the cascade whose SUBJECT is a dropdown trigger — the last
 * compound of the selector names it. A rule that only has one as an ancestor
 * styles something else and is not read here. `overrides` stands a sheet's text
 * in for the file's own without touching the disk, which is how the mutations at
 * the end of this file are read. */
function subjects(overrides = {}) {
  const out = [];
  let order = 0;
  for (const file of SHEETS) {
    const css = decomment(overrides[file] ?? read(file));
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (selectors.trimStart().startsWith('@')) continue;
      for (const selector of selectors.split(',').map((s) => s.trim()).filter(Boolean)) {
        order += 1;
        const subject = selector.split(/\s+(?![^(]*\))/).at(-1);
        if (!subject.includes(TRIGGER)) continue;
        out.push({
          file,
          order,
          selector,
          scope: scopeOf(selector),
          state: classify(selector),
          spec: specificity(selector),
          edge: edgeOf(body),
        });
      }
    }
  }
  return out;
}

/* The scopes, each with its rules grouped by state. */
function scopes(rules = subjects()) {
  const byScope = new Map();
  for (const rule of rules) {
    if (!byScope.has(rule.scope)) byScope.set(rule.scope, []);
    byScope.get(rule.scope).push(rule);
  }
  return byScope;
}

/* One token's value in a theme, as a colour. */
const inkOf = (theme, value) => parseColour(substitute(value, tokensFor(theme)).trim());

const ALL = subjects();
const BY_SCOPE = scopes(ALL);

// ---- 1. the gate is reading something -------------------------------------

test('the trigger rules this gate reads are discovered from the cascade, not listed', () => {
  assert.ok(SHEETS.length >= 20, `only ${SHEETS.length} sheets found — the import list is not being read`);
  assert.ok(ALL.length >= 5, `only ${ALL.length} trigger rules found — the sweep is reading almost nothing`);
  assert.ok(BY_SCOPE.has(TRIGGER), `no rule in the kit has ${TRIGGER} as its own subject`);
  assert.ok(BY_SCOPE.size >= 2,
    'only the base scope was found — a scoped trigger (the filter bar\'s chip) should be in the set too');
  // The base scope has to carry an edge of its own; everything below measures it.
  const resting = BY_SCOPE.get(TRIGGER).filter((r) => r.state === 'rest' && r.edge);
  assert.ok(resting.length, `${TRIGGER} declares no edge this gate can read`);
});

test('every trigger rule lands in a state this gate can measure', () => {
  const unreadable = ALL.filter((r) => !MEASURED.includes(r.state))
    .map((r) => `${r.file}: ${r.selector}`);
  assert.deepEqual(unreadable, [],
    'a trigger rule answers a state with ink this gate has no measurement for — add the state to STATES'
    + ' and say what its edge has to be, rather than letting it rank as a resting rule');
  const states = [...new Set(ALL.map((r) => r.state))];
  assert.ok(states.length >= 4, `only ${states.length} states are covered: ${states.join(', ')}`);
});

test(`${TRIGGER} answers every state the kit owes a reader`, () => {
  const answered = new Set(BY_SCOPE.get(TRIGGER).filter((r) => r.edge).map((r) => r.state));
  assert.deepEqual(REQUIRED.filter((s) => !answered.has(s)), [],
    'the kit\'s own trigger leaves a state with no edge of its own');
});

// ---- 2. live is never the off ink, off is always it ------------------------

/* The winning rule of a state for a scope: the most specific, then the last. */
const winner = (rules, state) => rules
  .filter((r) => r.state === state && r.edge)
  .reduce((best, r) => (best && outranks(best, r) ? best : r), null);

/* Every scope and live state whose winning edge is the unavailable ink, read one
 * state at a time: the resting rule can be right while the rule for the state the
 * reader is actually in paints the off edge, and nothing else on the page tells
 * them apart. An edge whose colour this arithmetic cannot resolve comes back under
 * `unreadable` rather than passing as "not off". */
function liveIsOff(byScope) {
  const found = [];
  const unreadable = [];
  for (const [scope, rules] of byScope) {
    for (const state of LIVE) {
      const won = winner(rules, state);
      if (!won || !won.edge.drawn) continue; // a state that paints no edge cannot look unavailable
      if (!won.edge.colour) {
        unreadable.push(`${scope} at ${state}: ${won.edge.declared}`);
        continue;
      }
      for (const theme of THEMES) {
        const live = inkOf(theme, won.edge.colour);
        const off = inkOf(theme, `var(${OFF_EDGE})`);
        if (!live || !off) unreadable.push(`${theme} — ${scope} at ${state}: ${won.edge.colour} resolved to nothing`);
        else if (live.join() === off.join()) found.push(`${theme} — ${scope} draws ${OFF_EDGE}'s ink at ${state}`);
      }
    }
  }
  return { found: [...new Set(found)], unreadable: [...new Set(unreadable)] };
}

test('no live trigger draws the ink an unavailable one draws, in any state or theme', () => {
  const { found, unreadable } = liveIsOff(BY_SCOPE);
  assert.deepEqual(unreadable, [],
    'a trigger declares an edge this gate cannot resolve, so it cannot say whether it is the off one');
  assert.deepEqual(found, [],
    'a trigger a reader can use draws exactly the line the kit paints an unavailable control with');
});

test('an unavailable trigger draws the kit\'s own off edge, in both themes', () => {
  const off = winner(BY_SCOPE.get(TRIGGER), 'off');
  assert.ok(off, `${TRIGGER} has no disabled rule`);
  assert.ok(off.edge.drawn, 'the disabled trigger gives its box back to the ground, which this gate does not cover');
  assert.match(off.edge.colour, new RegExp(`^var\\(\\s*${OFF_EDGE}\\s*\\)$`),
    `the disabled trigger paints ${off.edge.colour} rather than the kit's ${OFF_EDGE}`);
  for (const theme of THEMES) {
    assert.ok(inkOf(theme, off.edge.colour), `${OFF_EDGE} resolves to nothing in ${theme}`);
  }
});

// ---- 3. the states still answer -------------------------------------------

/* A resting rule and a state rule contend whenever one scope's subject is also
 * the other's — `.ui-card .ui-filter-bar .ui-dropdown__trigger` is reached by
 * `.ui-dropdown__trigger:hover` as well. So the ranking is read ACROSS scopes
 * and not only within one: writing a resting edge three classes deep is how the
 * response gets frozen, and it is the fault this fix itself could have caused.
 * A resting rule that paints no edge is exempt — the filter bar's chip takes the
 * trigger's box away entirely and carries the edge itself. */
function frozenPairs(byScope) {
  const resting = [...byScope.values()].flat().filter((r) => r.state === 'rest' && r.edge?.drawn);
  const out = [];
  for (const [scope, rules] of byScope) {
    for (const state of STATES.map(([name]) => name)) {
      const won = winner(rules, state);
      if (!won) continue;
      for (const rest of resting) {
        const reaches = rest.scope.endsWith(scope) || scope.endsWith(rest.scope);
        if (reaches && outranks(rest, won)) out.push(`${scope} — ${state} loses to the resting rule ${rest.selector}`);
      }
    }
  }
  return out;
}

test('every state rule outranks the resting rules that reach it, so the edge still responds', () => {
  assert.deepEqual(frozenPairs(BY_SCOPE), [],
    'a resting declaration outranks the state beside it, so the control cannot respond');
});

test('off outranks hover and focus, so a pointer over a dead control changes nothing', () => {
  const rules = BY_SCOPE.get(TRIGGER);
  const off = winner(rules, 'off');
  for (const state of ['hover', 'focus']) {
    const won = winner(rules, state);
    if (!won) continue;
    assert.ok(outranks(off, won), `${state} beats the disabled rule — an off trigger lights up under the pointer`);
  }
});

// ---- 4. what the two edges measure ----------------------------------------

/* The grounds a trigger lands on, discovered from the token file rather than
 * listed, so a fifth surface joins this table by existing. */
const GROUNDS = [...new Set(
  [...read('src/tokens/tokens.css').matchAll(/^\s*(--(?:bg|surface(?:-\d)?))\s*:/gm)].map((m) => m[1]),
)].sort();

const edgeInk = (theme, state) => {
  const won = winner(BY_SCOPE.get(TRIGGER), state);
  return inkOf(theme, won.edge.colour);
};
const round = (n) => Number(n.toFixed(2));

test('the grounds a trigger lands on are discovered, not listed', () => {
  assert.ok(GROUNDS.length >= 4, `only ${GROUNDS.length} ground tokens found`);
  assert.ok(GROUNDS.includes('--surface'), 'the trigger paints --surface for itself, so it has to be in the set');
});

/* Pinned, so a token that moves rewrites this table rather than drifting past
 * it. The first pair is the whole point of #580: the two edges are different
 * inks in both themes, and the ratio between them says how far apart. */
test('the live edge and the off edge are measured against each other and every ground', () => {
  const apart = {};
  for (const theme of THEMES) apart[theme] = round(ratio(edgeInk(theme, 'rest'), edgeInk(theme, 'off')));
  assert.deepEqual(apart, { dark: 1.09, light: 1.23 },
    'a token moved — rewrite these with the new figures and check the pair still reads as two states');

  const onGround = {};
  for (const theme of THEMES) {
    for (const state of ['rest', 'off']) {
      for (const ground of GROUNDS) {
        onGround[`${theme} ${state} on ${ground}`] = round(ratio(edgeInk(theme, state), inkOf(theme, `var(${ground})`)));
      }
    }
  }
  assert.deepEqual(onGround, {
    'dark rest on --bg': 1.50,
    'dark rest on --surface': 1.27,
    'dark rest on --surface-2': 1.41,
    'dark rest on --surface-3': 1.09,
    'dark off on --bg': 1.38,
    'dark off on --surface': 1.16,
    'dark off on --surface-2': 1.29,
    'dark off on --surface-3': 1.00,
    'light rest on --bg': 1.37,
    'light rest on --surface': 1.52,
    'light rest on --surface-2': 1.28,
    'light rest on --surface-3': 1.33,
    'light off on --bg': 1.12,
    'light off on --surface': 1.24,
    'light off on --surface-2': 1.05,
    'light off on --surface-3': 1.09,
  }, 'a surface or an edge token moved — rewrite these with the new figures');

  // The direction the two have to keep, wherever the control is put: an off edge
  // never reads louder than the live one beside it.
  const louder = Object.keys(onGround)
    .filter((key) => key.includes(' off on '))
    .filter((key) => onGround[key] > onGround[key.replace(' off on ', ' rest on ')]);
  assert.deepEqual(louder, [], 'an unavailable trigger\'s edge stands out more than a live one\'s here');
});

// ---- 5. the gate refuses what it is written to refuse ----------------------

/* A mutation is the real sheet with one rule APPENDED — the last word in the
 * cascade, which is how a regression arrives when somebody adds a rule — or, given
 * `{ from, to }`, with one declaration REWRITTEN where it already stands, which
 * keeps its position, specificity and neighbours and is how one arrives when
 * somebody edits the rule that is already there. Every other sheet is re-read from
 * disk, so only this one differs. */
function mutate(extra) {
  const original = read('src/styles/dropdown.css');
  if (typeof extra === 'string') return `${original}\n${extra}\n`;
  assert.ok(original.includes(extra.from),
    `the sheet no longer says "${extra.from}", so this mutation changes nothing and proves nothing`);
  return original.replace(extra.from, extra.to);
}
const readingWith = (extra) => scopes(subjects({ 'src/styles/dropdown.css': mutate(extra) }));
const asText = (extra) => (typeof extra === 'string' ? extra : `${extra.from} → ${extra.to}`);

/* The five findings this gate exists to make, each asked of a mutated sheet. */
const findings = (byScope) => {
  const out = [];
  const live = liveIsOff(byScope);
  if (live.found.length) out.push('live-is-off');
  if (live.unreadable.length) out.push('unreadable-edge');
  if (frozenPairs(byScope).length) out.push('frozen');
  if ([...byScope.values()].flat().some((r) => !MEASURED.includes(r.state))) out.push('unmeasured-state');
  const off = winner(byScope.get(TRIGGER) ?? [], 'off');
  if (!off || !off.edge.drawn || !new RegExp(`^var\\(\\s*${OFF_EDGE}\\s*\\)$`).test(off.edge.colour)) out.push('off-not-off');
  return [...new Set(out)];
};

test('the reading refuses every way the two edges can come back together', () => {
  assert.deepEqual(findings(BY_SCOPE), [], 'the sheet as shipped should produce no finding');

  const cases = [
    // The exact defect #580 reports, put back.
    ['.ui-dropdown__trigger { border-color: var(--border); }', 'live-is-off'],
    // The same thing said with the token's own light value.
    [':root[data-theme="light"] .ui-dropdown__trigger { border-color: #e4e7ee; }', 'live-is-off'],
    // The keyboard stop's accent rewritten to the off ink where it stands, ring and
    // all: the trigger a reader is on reads as unavailable while the resting rule
    // beside it stays correct, so reading `rest` alone goes straight past it.
    ['.ui-dropdown__trigger:focus-visible { border-color: var(--disabled-border); }', 'live-is-off'],
    // The same defect one state along, under the pointer.
    [{ from: ':hover:not(:focus-visible) { border-color: var(--accent)', to: ':hover:not(:focus-visible) { border-color: var(--disabled-border)' },
      'live-is-off'],
    // An edge this arithmetic cannot resolve, which must be reported rather than
    // counted as "not the off ink".
    [{ from: ':hover:not(:focus-visible) { border-color: var(--accent)', to: ':hover:not(:focus-visible) { border-color: currentColor' },
      'unreadable-edge'],
    // A scoped resting edge deep enough to freeze the states beside it — the
    // fault the fix itself could have introduced.
    ['.ui-card .ui-filter-bar .ui-dropdown__trigger { border-color: var(--accent); }', 'frozen'],
    // A state nobody measured, ranked as resting and counted as covered.
    ['.ui-dropdown__trigger:active { border-color: var(--border); }', 'unmeasured-state'],
    // The off edge quietly re-pointed at a live control's ink.
    ['.ui-dropdown__trigger:disabled:hover:not(:focus-visible), .ui-dropdown__trigger[aria-disabled="true"]:hover:not(:focus-visible) { border-color: var(--control-edge); }', 'off-not-off'],
    // And taken away altogether, which is what dark shipped before #580.
    ['.ui-dropdown__trigger:disabled:hover:not(:focus-visible), .ui-dropdown__trigger[aria-disabled="true"]:hover:not(:focus-visible) { border: 0; }', 'off-not-off'],
  ];
  const missed = cases.filter(([rule, finding]) => !findings(readingWith(rule)).includes(finding))
    .map(([rule, finding]) => `${finding} not raised by: ${asText(rule)}`);
  assert.deepEqual(missed, [], 'these regressions go straight past the reading');

  // And it does not fire on a rule that is fine, or on one it is not about.
  for (const fine of [
    '.ui-dropdown__trigger:hover { border-color: var(--accent-strong); }',
    '.ui-filter-bar__chip .ui-dropdown__trigger { border: 0; }',
    '.ui-dropdown__panel { border-color: var(--disabled-border); }',
    '/* .ui-dropdown__trigger { border-color: var(--border); } */',
    { from: ':hover:not(:focus-visible) { border-color: var(--accent)', to: ':hover:not(:focus-visible) { border-color: var(--accent-strong)' },
  ]) {
    assert.deepEqual(findings(readingWith(fine)), [], `false finding on: ${asText(fine)}`);
  }
});

test('the sheet still says what the gate reads, so none of this is checking a ghost', () => {
  const css = read('src/styles/dropdown.css');
  assert.match(css, /\.ui-dropdown__trigger\s*\{[\s\S]*?border:\s*1px solid var\(--control-edge\)/,
    `${TRIGGER} no longer takes the kit's live control edge`);
  assert.match(css, /\.ui-dropdown__trigger:disabled[\s\S]{0,400}?border-color:\s*var\(--disabled-border\)/,
    `${TRIGGER}:disabled no longer takes ${OFF_EDGE}`);
  assert.match(css, /\.ui-dropdown__trigger:hover:not\(:focus-visible\)\s*\{[^}]*border-color:\s*var\(--accent\)/,
    'the trigger no longer answers the pointer');
});
