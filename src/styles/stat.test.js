// What stat.css guarantees. jsdom lays nothing out and resolves no @container,
// so the layout guarantees are held by their structure and the fold widths by
// the table in the specification they were measured for; the cascade between
// the sheet's own rules is resolved in jsdom.
// why: docs/specification.md#stat-bands
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { statBand } from '../components/stat.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const RAW = readFileSync(path.join(here, 'stat.css'), 'utf8');
const CSS = decomment(RAW);
const SPEC = readFileSync(path.join(here, '../../docs/specification.md'), 'utf8');

const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter((m) => !m[1].trim().startsWith('@'))
  .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }));
const valueOf = (body, prop) => (new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body) || [])[1]?.trim() ?? null;
const ruleFor = (selector) => rules.find((r) => r.selector === selector);

test('the sheet is being read', () => {
  assert.ok(rules.length >= 20, `parsed ${rules.length} rules out of stat.css`);
});

test('a figure never breaks across lines, and its digits sit on one grid', () => {
  const value = ruleFor('.ui-stat__value');
  assert.ok(value, '.ui-stat__value has no rule of its own');
  assert.equal(valueOf(value.body, 'white-space'), 'nowrap', 'a figure can break, and `€` can land on a line of its own');
  assert.equal(valueOf(value.body, 'font-variant-numeric'), 'tabular-nums');
  assert.equal(valueOf(ruleFor('.ui-stat__change').body, 'white-space'), 'nowrap', 'a change like −61.8% can break at its sign');
});

// A rule on the figure's <dd>s outranked the value's, change's and trend's own
// margins once, and every screenshot showed a value flush under its label.
test('each part of a figure keeps the spacing its own rule gives it', () => {
  const doc = new JSDOM(`<!doctype html><html><head><style>${RAW}</style></head><body>${statBand({
    stats: [{ label: 'Income', value: '€ 1', delta: { value: '+1%' }, trend: '<svg width="1" height="1"></svg>' }],
  })}</body></html>`).window;
  const margin = (sel) => doc.getComputedStyle(doc.document.querySelector(sel)).marginTop;
  for (const [sel, prop] of [['.ui-stat__value', 'margin-top'], ['.ui-stat__delta', 'margin-top'], ['.ui-stat__trend', 'margin-top']]) {
    assert.equal(margin(sel), valueOf(ruleFor(sel).body, prop), `${sel} lost its ${prop} to another rule in the sheet`);
  }
});

// The markup order — caption, then figures — is held in src/components/stat.test.js.
// This is the other half of it: a leading caption's air belongs under it, or the
// gap it used to open between itself and the figures moves outside the band.
test('the caption carries its space below it, because it leads the row', () => {
  const margin = valueOf(ruleFor('.ui-stats__basis').body, 'margin');
  assert.ok(margin, '.ui-stats__basis sets no margin');
  const sides = margin.split(/\s+(?![^(]*\))/);
  assert.equal(sides.length, 3, `margin: ${margin} — expected three sides, top x bottom`);
  assert.match(sides[0], /^0(px)?$/, `the caption keeps ${sides[0]} above it, and it leads the row`);
  assert.match(sides[2], /^var\(--space-\d+\)$/, `the caption's space below it is ${sides[2]}, not a spacing step`);
});

test('a figure is never narrower than its value, so a band wraps rather than overlaps', () => {
  assert.equal(valueOf(ruleFor('.ui-stats__list').body, 'flex-wrap'), 'wrap', 'a band that cannot wrap has to overflow');
  assert.equal(valueOf(ruleFor('.ui-stat').body, 'min-width'), 'min-content',
    'a figure may shrink below its own value, and the nowrap value then runs into the next one');
  const zeroed = rules.filter((r) => /\.ui-stat\b(?!_)/.test(r.selector) && /^0(px)?$/.test(valueOf(r.body, 'min-width') ?? ''));
  assert.deepEqual(zeroed.map((r) => r.selector), [], 'a later rule lets a figure shrink to nothing');
});

test('the band lays out from its own width, never the window\'s', () => {
  assert.equal(valueOf(ruleFor('.ui-stats').body, 'container-type'), 'inline-size');
  assert.doesNotMatch(CSS, /@media/, 'a fold keyed to the viewport: a band beside a rail is narrower than the window');
});

// Each selector in a list on its own: `.ui-stat__delta, .ui-stat--good .ui-stat__delta`
// carries the tone class and still paints every change.
test('colour on a change comes from its tone, never from its direction', () => {
  const painted = rules.filter((r) => /chip-(success|danger)-ink/.test(r.body));
  assert.ok(painted.length >= 4, `found ${painted.length} toned rules`);
  for (const r of painted) {
    for (const one of r.selector.split(',').map((s) => s.trim())) {
      assert.match(one, /^\.ui-stat--(good|bad) /, `${one} paints a change without asking its tone`);
    }
  }
  assert.doesNotMatch(CSS, /--(up|down|increase|decrease|rise|fall)\b/, 'a class keyed to direction');
});

// The rule above holds that only a tone paints. This holds which ink each tone
// takes, so good and bad cannot be swapped and still pass, and a tone nobody
// declared has no rule to paint it at all.
test('good news takes the success ink, bad news the danger ink, and nothing else is painted', () => {
  for (const part of ['delta', 'trend']) {
    for (const [tone, ink] of [['good', 'success'], ['bad', 'danger']]) {
      const rule = ruleFor(`.ui-stat--${tone} .ui-stat__${part}`);
      assert.ok(rule, `.ui-stat--${tone} .ui-stat__${part} has no rule, so ${tone} news is not painted`);
      assert.equal(valueOf(rule.body, 'color'), `var(--chip-${ink}-ink)`,
        `${tone} news is not painted with the ${ink} ink`);
    }
  }
  const tones = new Set(rules.flatMap((r) => [...r.selector.matchAll(/\.ui-stat--([a-z]+)\b/g)].map((m) => m[1])));
  assert.deepEqual([...tones].sort(), ['bad', 'good'],
    'the sheet paints a tone the component never sets, or stopped setting one it paints');
});

// The fold widths were measured in a browser over every layout at 2, 3 and 4
// figures, and the specification carries the table. Each fold is read whole —
// its range, which figures it matches and the basis it sets — so a width, a
// basis or an overlap between two ranges moved in one place fails here.
test('the folds are the ones the specification records, and their ranges do not overlap', () => {
  const folds = [...CSS.matchAll(/@container\s*\(([^)]*)\)\s*\{\s*([^{]+)\{([^}]*)\}\s*\}/g)].map(([, cond, sel, body]) => {
    const upper = /width\s*<=\s*(\d+)rem/.exec(cond);
    const lower = /(\d+)rem\s*<\s*width/.exec(cond);
    assert.ok(upper, `a fold without an upper width: ${cond}`);
    const plain = sel.replace(':not(.ui-stats--open)', '');
    return {
      layout: plain.includes('.ui-stats--open') ? 'open' : 'band',
      kind: sel.includes(':nth-child(4):last-child') ? 'pairs' : sel.includes('nth-child(odd)') ? 'odd' : 'column',
      upper: Number(upper[1]),
      lower: lower ? Number(lower[1]) : 0,
      basis: valueOf(body, 'flex-basis'),
      excludesOpen: sel.includes(':not(.ui-stats--open)'),
    };
  });
  assert.equal(folds.length, 6, `found ${folds.length} folds`);
  const row = (name) => {
    const m = new RegExp(`^\\|\\s*${name}\\s*\\|\\s*(\\d+)rem\\s*\\|\\s*(\\d+)rem\\s*\\|\\s*(\\d+)rem\\s*\\|`, 'm').exec(SPEC);
    assert.ok(m, `the specification has no fold row for ${name}`);
    return { pairs: Number(m[1]), odd: Number(m[2]), column: Number(m[3]) };
  };
  for (const [layout, name] of [['band', 'Band and tiles'], ['open', 'Open']]) {
    const mine = Object.fromEntries(folds.filter((f) => f.layout === layout).map((f) => [f.kind, f]));
    const spec = row(name);
    for (const kind of ['pairs', 'odd', 'column']) {
      assert.equal(mine[kind]?.upper, spec[kind], `${layout} ${kind} folds at ${mine[kind]?.upper}rem, the specification says ${spec[kind]}rem`);
    }
    // Two per row: more than a third, and room for the gap beside a half.
    const pct = Number.parseFloat(mine.pairs.basis);
    assert.ok(pct > 100 / 3 && pct < 50, `the pairs fold sets flex-basis ${mine.pairs.basis}, which is not two per row`);
    assert.equal(mine.odd.basis, '100%');
    assert.equal(mine.column.basis, '100%');
    // The pairs rule outranks the one-column rule, so it must stop where that one starts.
    assert.equal(mine.pairs.lower, mine.column.upper, `${layout}: two per row still applies below the one-column fold`);
  }
  assert.ok(folds.find((f) => f.layout === 'band' && f.kind === 'pairs').excludesOpen,
    'the band\'s pairs fold reaches the open layout, whose figures are wider');
});
