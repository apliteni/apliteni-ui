/* Rule: the React table's column pager fits inside whatever holds it, at every
 * width, without narrowing either action.
 *
 * "Previous columns" and "More columns" are 301px of buttons against a card's
 * 238px at a 320px viewport, so the row left the card and the document grew to
 * 344px. The labels cannot go, the buttons cannot narrow, and the kit writes no
 * breakpoint that narrow, so the row wraps — and a row that can stack declares
 * the vertical clearance its tap zones then need.
 *
 * Subjects are discovered from the markup and the sheets, so a renamed row fails
 * here rather than passing an empty sweep. The check is specificity, not source
 * order: two sheets' order in a consumer's bundle is the consumer's. A condition
 * is read on both sides — a wrap inside `@media` is not the row's own fit, and a
 * `nowrap` inside one cancels the fix across that band, because `@media` adds no
 * specificity of its own.
 *
 * why: docs/specification.md#react-tables, #571
 */

/* WHAT THIS GATE DOES NOT REACH:
 *   - Geometry. It reads declarations, not boxes: that the wrapped row fits a
 *     238px card is measured in a browser and reported in the pull request.
 *   - Whether the row needs to wrap at a given width, which is the label's
 *     rendered width in the reader's font.
 *   - A rule in a consumer's own sheet, or one an inline style carries.
 *   - `flex-wrap` reached through `flex-flow` or a token: both count as unknown
 *     and are reported, never waved through.
 *   - Which declaration wins when two selectors tie on class count and differ on
 *     element or id parts. Every selector here is classes only.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
/** Blank a comment out without moving a line, so file:line stays honest. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** The two actions, as the markup writes them. A rename has to fail loudly: the
 *  row is found by its children, so a label this gate cannot see is a subject it
 *  stops sweeping. */
const ACTIONS = ['Previous columns', 'More columns'];
const TAP_SHEET = 'src/styles/tap-zone.css';

/** Every stylesheet a consumer of the kit and of the React bundle receives. */
const sheetFiles = [
  ...readdirSync(path.join(root, 'src/styles')).filter((f) => f.endsWith('.css'))
    .map((f) => `src/styles/${f}`),
  ...readdirSync(path.join(root, 'react/src')).filter((f) => f.endsWith('.css'))
    .map((f) => `react/src/${f}`),
];
const sheets = sheetFiles.map((f) => [f, decomment(read(f))]);

/**
 * Every leaf rule in a sheet as { selector, body, conditions }, where
 * `conditions` holds the at-rule preludes it sits inside. A declaration inside
 * `@media (max-width: 720px)` answers for one band of widths and not for the
 * rest, which is the whole distinction this gate turns on, so the nesting is
 * carried rather than flattened away.
 */
function rules(css) {
  const out = [];
  const open = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') { open.push(buf.trim()); buf = ''; } else if (ch === '}') {
      const head = open.pop() ?? '';
      if (buf.trim() && !head.startsWith('@')) {
        out.push({ selector: head, body: buf.trim(), conditions: open.filter((h) => h.startsWith('@')) });
      }
      buf = '';
    } else buf += ch;
  }
  return out;
}

/** The last value a rule body gives a property, or null. */
const declared = (body, prop) => {
  const hit = [...body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`, 'g'))].at(-1);
  return hit ? hit[1].trim().replace(/\s*!important$/, '') : null;
};

/** A selector list, split on the commas between its selectors. */
const selectors = (list) => list.split(',').map((one) => one.trim()).filter(Boolean);

/** Class count, which is the whole of the specificity at stake: every selector
 *  that reaches this row is classes only. */
const classes = (one) => (one.match(/\.[A-Za-z_-][\w-]*/g) || []).length;

/**
 * Whether a selector is satisfied by this row's own class list, with no help
 * from an ancestor, a sibling, a state or an attribute.
 *
 * An ancestor-scoped rule is the shape the defect wore: `.ui-app__main
 * .ui-card__row` already wraps a card row inside the shell, and the carded table
 * that overflowed was outside one. A rule a container has to supply is a rule
 * the component cannot rely on, so it does not count as the component's fit.
 */
function selfSatisfied(one, rowClasses) {
  if (/[>+~\s]/.test(one.trim())) return false;
  if (/[:[#]/.test(one)) return false;
  const parts = one.trim().match(/\.[A-Za-z_-][\w-]*/g) || [];
  if (!parts.length) return false;
  if (one.trim() !== parts.join('')) return false;
  return parts.every((p) => rowClasses.includes(p.slice(1)));
}

/** Every `<div className="…">` in react/src whose children are both actions —
 *  the column pager row, wherever the markup put it. */
function pagerRows() {
  const found = [];
  for (const file of readdirSync(path.join(root, 'react/src')).filter((f) => f.endsWith('.tsx'))) {
    const text = read(`react/src/${file}`);
    for (const m of text.matchAll(/<div\s+className="([^"]*)"([^>]*)>/g)) {
      const children = text.slice(m.index, m.index + 1400);
      if (!ACTIONS.every((label) => children.includes(`>${label}<`))) continue;
      found.push({ file: `react/src/${file}`, classes: m[1].split(/\s+/).filter(Boolean), attrs: m[2] });
    }
  }
  return found;
}

/** A wrap this reader can read off the source. An unknown value — a shorthand or
 *  a token — is not one, and is reported rather than counted either way. */
const isWrap = (r) => r.value === 'wrap' || r.value === 'wrap-reverse';

/**
 * The finding, or null when the row can wrap on its own account. Shared by the
 * sweep over the shipped sheets and by the mutations below, so the two cannot
 * disagree about what counts as able to wrap.
 */
function cannotWrap(sheetSet, rowClasses) {
  const reaching = [];
  for (const [file, css] of sheetSet) {
    for (const rule of rules(css)) {
      for (const one of selectors(rule.selector)) {
        if (!selfSatisfied(one, rowClasses)) continue;
        const flow = declared(rule.body, 'flex-flow');
        const wrap = declared(rule.body, 'flex-wrap');
        if (flow === null && wrap === null) continue;
        reaching.push({
          file,
          selector: one,
          rank: classes(one),
          conditions: rule.conditions,
          conditional: rule.conditions.length > 0,
          // A shorthand or a token leaves the value unknown to this reader, and
          // an unknown value is reported rather than counted as a wrap.
          value: wrap !== null && !wrap.includes('var(') ? wrap : null,
          written: flow !== null ? `flex-flow: ${flow}` : `flex-wrap: ${wrap}`,
        });
      }
    }
  }
  const unconditional = reaching.filter((r) => !r.conditional);
  const wrapping = unconditional.filter(isWrap);
  if (!wrapping.length) {
    const scoped = reaching.filter((r) => r.conditional);
    return reaching.length
      ? `the pager row's own classes reach ${reaching.length} flex-wrap declaration(s) and none`
        + ` of them wraps it unconditionally: ${reaching.map((r) => `${r.selector} in ${r.file}`
        + ` (${r.written}${r.conditional ? ', inside an at-rule' : ''})`).join('; ')}`
        + (scoped.length ? '. A wrap a media query or a container supplies is not the row\'s own.' : '')
      : 'no rule in the shipped sheets lets the column pager row wrap, so a row of two labelled'
        + ' actions is as wide as its labels and leaves any container narrower than they are';
  }
  /* A wrap that holds at every width has to survive the conditional rules too.
   * `@media` adds no specificity, so a `nowrap` inside one beats an
   * unconditional wrap of the same class count and cancels the fix across that
   * band — leaving every base rule this gate reads intact. Blockers are drawn
   * from everything that reaches the row, conditional or not. Only an
   * unconditional wrap answers one: a wrap inside another condition answers
   * only inside it, and the two bands need not meet. */
  const blocking = reaching.filter((r) => !isWrap(r));
  const unanswered = blocking.filter((b) => !wrapping.some((w) => w.rank > b.rank));
  if (unanswered.length) {
    const first = unanswered[0];
    const says = `${first.selector} in ${first.file} says ${first.written}`;
    return first.conditional
      ? `${says} inside ${first.conditions.join(' ')}, and no wrapping rule outranks it, so the row`
        + ' stops wrapping across that condition while the rule that wraps it reads unchanged'
      : `${says} and no wrapping rule outranks it, so which one wins is the order of two sheets`
        + ' in a consumer\'s bundle';
  }
  return null;
}

const rows = pagerRows();

test('the column pager row is still discoverable, so this gate has a subject', () => {
  const labelled = readdirSync(path.join(root, 'react/src'))
    .filter((f) => f.endsWith('.tsx'))
    .filter((f) => ACTIONS.every((label) => read(`react/src/${f}`).includes(`>${label}<`)));
  assert.deepEqual(
    labelled, ['DataTable.tsx'],
    `the column pager's actions are rendered by ${labelled.join(', ') || 'no component'}. Either `
    + 'a label was reworded or the pager moved; both leave this gate sweeping an empty set and '
    + 'reporting green, so it fails here instead. Update ACTIONS above with the new words.',
  );
  // The count is asserted, not printed: a second pager row that quietly stops
  // being swept is the failure this sweep exists to catch.
  assert.equal(rows.length, 1, `column pager rows found: ${rows.map((r) => r.classes.join('.')).join(' | ')}`);
  assert.ok(
    rows[0].attrs.includes('role="group"'),
    'the pager row is no longer a group, so the two actions are no longer announced as a pair',
  );
});

test('the pager row is laid out as a flex row, which is what makes wrap the fix', () => {
  const flex = [];
  for (const [file, css] of sheets) {
    for (const rule of rules(css)) {
      for (const one of selectors(rule.selector)) {
        if (!selfSatisfied(one, rows[0].classes)) continue;
        if (declared(rule.body, 'display') === 'flex') flex.push(`${one} in ${file}`);
      }
    }
  }
  assert.ok(
    flex.length >= 1,
    'no rule the pager row\'s own classes reach declares display: flex. `flex-wrap` decides '
    + 'nothing outside a flex container, so if the row became a grid or a block this gate is '
    + `measuring a property with no effect. Rules found: ${flex.join('; ') || 'none'}`,
  );
});

test('the pager row wraps on its own account, at every width', () => {
  assert.equal(cannotWrap(sheets, rows[0].classes), null);
});

test('a row that can stack declares the vertical clearance its zones then need', () => {
  const tap = decomment(read(TAP_SHEET));
  const opened = rules(tap)
    .filter((r) => r.conditions.some((c) => /pointer:\s*coarse/.test(c)))
    .flatMap((r) => selectors(r.selector).map((one) => ({ one, body: r.body })))
    .filter(({ one }) => selfSatisfied(one, rows[0].classes));
  assert.ok(
    opened.length >= 1,
    `${TAP_SHEET} opens no clearance on the pager row's own classes. Stacked, its two actions `
    + 'are one above the other, and a zone takes half the clear space its container declares — '
    + 'which is 0px by default, so both actions keep their drawn height and neither reaches the '
    + 'floor. The wrap and the clearance are one change; tap-zone.test.js holds the sheet, this '
    + 'holds the pairing.',
  );
  for (const { one, body } of opened) {
    assert.match(
      body, /--tap-clear-y:\s*var\(--tap-gap\)/,
      `${TAP_SHEET} names ${one} inside the coarse-pointer query without giving it `
      + '--tap-clear-y. The row stacks at that width, so the vertical axis is the one that has '
      + 'room to open and the only one that reaches the floor.',
    );
  }
});

/* The mutations. Each is the shape of a real regression, and each has to be
 * refused — a checker that accepts them measures nothing. */
const ROW = ['ui-card__row', 'rx-column-pager'];

test('the check refuses a row with no wrap at all', () => {
  assert.match(
    cannotWrap([['fixture.css', '.ui-card__row { display: flex; gap: 20px; }']], ROW),
    /no rule in the shipped sheets lets the column pager row wrap/,
  );
});

test('the check refuses a wrap a media query supplies', () => {
  // The state this issue was filed in: a card row wraps below 720px and only
  // inside the shell, and the carded table that overflowed was outside one.
  const scoped = [['fixture.css',
    '@media (max-width: 720px) { .rx-column-pager { flex-wrap: wrap; } }']];
  assert.match(cannotWrap(scoped, ROW), /inside an at-rule/);
  assert.match(cannotWrap(scoped, ROW), /not the row's own/);
});

test('the check refuses a nowrap a media query brings back at the phone widths', () => {
  // The fix is one unconditional wrap, and `@media` adds no specificity: a
  // phone-width `nowrap` of the same class count outranks nothing and still
  // wins, restoring the 344px document #571 was filed for with every rule the
  // other tests here read left exactly as it is.
  const cancelled = [
    ['fixture.css', '.rx-column-pager { flex-wrap: wrap; }'],
    ['fixture-host.css', '@media (max-width: 560px) { .rx-column-pager { flex-wrap: nowrap; } }'],
  ];
  assert.match(cannotWrap(cancelled, ROW), /flex-wrap: nowrap/);
  assert.match(cannotWrap(cancelled, ROW), /inside @media \(max-width: 560px\)/);
});

test('a conditional rule that agrees with the wrap is not a finding', () => {
  // Over-rejection costs what under-rejection costs: a media query that wraps
  // too changes nothing, and a gate that failed on it would be edited away
  // rather than consulted.
  const agrees = [
    ['fixture.css', '.rx-column-pager { flex-wrap: wrap; }'],
    ['fixture-host.css', '@media (max-width: 560px) { .rx-column-pager { flex-wrap: wrap; } }'],
  ];
  assert.equal(cannotWrap(agrees, ROW), null);
});

test('the check refuses a wrap an ancestor has to supply', () => {
  // `.ui-app__main .ui-card__row` is the rule that exists; it is not the
  // component's fit, because the component does not choose its container.
  assert.match(
    cannotWrap([['fixture.css', '.ui-app__main .ui-card__row { flex-wrap: wrap; }']], ROW),
    /no rule in the shipped sheets lets the column pager row wrap/,
  );
});

test('the check refuses a nowrap that only loses by coming first', () => {
  // Same class count on both sides: in the kit's own sheets neither outranks the
  // other, and a consumer's bundle decides order. One that ties cannot be relied on.
  const tie = [
    ['fixture.css', '.rx-column-pager { flex-wrap: wrap; }'],
    ['fixture-host.css', '.ui-card__row { flex-wrap: nowrap; }'],
  ];
  assert.match(cannotWrap(tie, ROW), /flex-wrap: nowrap/);
  assert.match(cannotWrap(tie, ROW), /order of two sheets in a consumer's bundle/);
});

test('a nowrap a wrapping rule outranks is answered, not reported', () => {
  const answered = [
    ['fixture.css', '.ui-card__row.rx-column-pager { flex-wrap: wrap; }'],
    ['fixture-host.css', '.ui-card__row { flex-wrap: nowrap; }'],
  ];
  assert.equal(cannotWrap(answered, ROW), null);
});

test('a wrap spelled as a shorthand or a token is reported, not read as a wrap', () => {
  // Either could be the wrap, and neither can be read off the source: a gate
  // that guessed would report green on a row that does not wrap.
  for (const css of ['.rx-column-pager { flex-flow: row wrap; }',
    '.rx-column-pager { flex-wrap: var(--row-wrap); }']) {
    assert.match(cannotWrap([['fixture.css', css]], ROW), /none of them wraps it unconditionally/);
  }
});

test('the check does not take a wrap from a class the row does not carry', () => {
  assert.match(
    cannotWrap([['fixture.css', '.rx-column-pager.is-narrow { flex-wrap: wrap; }']], ROW),
    /no rule in the shipped sheets lets the column pager row wrap/,
  );
});

test('the check accepts the shape the kit actually writes', () => {
  const good = [
    ['fixture-card.css', '.ui-card__row { display: flex; justify-content: space-between; }'],
    ['fixture-table.css', '.rx-column-pager { flex-wrap: wrap; }'],
  ];
  assert.equal(cannotWrap(good, ROW), null);
});
