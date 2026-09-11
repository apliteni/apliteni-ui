// What stat.css guarantees, read off the sheet: jsdom lays nothing out and
// resolves no @container, so the layout guarantees are held by their structure
// and the fold widths by the table in the specification they were measured for.
// why: docs/specification.md#stat-bands
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const CSS = decomment(readFileSync(path.join(here, 'stat.css'), 'utf8'));
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

test('a figure is never narrower than its value, so a band wraps rather than overlaps', () => {
  const list = ruleFor('.ui-stats__list');
  assert.equal(valueOf(list.body, 'flex-wrap'), 'wrap', 'a band that cannot wrap has to overflow');
  const item = ruleFor('.ui-stat');
  assert.equal(valueOf(item.body, 'min-width'), 'min-content',
    'a figure may shrink below its own value, and the nowrap value then runs into the next one');
  const zeroed = rules.filter((r) => /\.ui-stat\b(?!_)/.test(r.selector) && /^0(px)?$/.test(valueOf(r.body, 'min-width') ?? ''));
  assert.deepEqual(zeroed.map((r) => r.selector), [], 'a later rule lets a figure shrink to nothing');
});

test('the band lays out from its own width, never the window\'s', () => {
  assert.equal(valueOf(ruleFor('.ui-stats').body, 'container-type'), 'inline-size');
  assert.doesNotMatch(CSS, /@media/, 'a fold keyed to the viewport: a band beside a rail is narrower than the window');
});

test('colour on a change comes from its tone, never from its direction', () => {
  const painted = rules.filter((r) => /chip-(success|danger)-ink/.test(r.body));
  assert.ok(painted.length >= 4, `found ${painted.length} toned rules`);
  // Each selector in a list on its own: `.ui-stat__delta, .ui-stat--good .ui-stat__delta`
  // carries the tone class and still paints every change.
  for (const r of painted) {
    for (const one of r.selector.split(',').map((s) => s.trim())) {
      assert.match(one, /^\.ui-stat--(good|bad) /, `${one} paints a change without asking its tone`);
    }
  }
  assert.doesNotMatch(CSS, /--(up|down|increase|decrease|rise|fall)\b/, 'a class keyed to direction');
});

// The fold widths were measured in a browser over every layout at 2, 3 and 4
// figures, and the specification carries the table. This pins the sheet to it,
// so a width moved in one place and not the other fails here.
test('the fold widths are the ones the specification records', () => {
  const folds = (variantSelector) => {
    const out = {};
    for (const m of CSS.matchAll(/@container\s*\(([^)]*)\)\s*\{\s*([^{]+)\{([^}]*)\}/g)) {
      const [, cond, sel] = m;
      if (variantSelector ? !sel.includes(variantSelector) : /\.ui-stats--open\b(?!\))/.test(sel.replace(':not(.ui-stats--open)', ''))) continue;
      const upper = /width\s*<=\s*(\d+)rem/.exec(cond)[1];
      const kind = sel.includes(':nth-child(4):last-child') ? 'pairs' : sel.includes('nth-child(odd)') ? 'odd' : 'column';
      out[kind] = Number(upper);
    }
    return out;
  };
  const row = (name) => {
    const m = new RegExp(`^\\|\\s*${name}\\s*\\|\\s*(\\d+)rem\\s*\\|\\s*(\\d+)rem\\s*\\|\\s*(\\d+)rem\\s*\\|`, 'm').exec(SPEC);
    assert.ok(m, `the specification has no fold row for ${name}`);
    return { pairs: Number(m[1]), odd: Number(m[2]), column: Number(m[3]) };
  };
  assert.deepEqual(folds(''), row('Band and tiles'));
  assert.deepEqual(folds('.ui-stats--open'), row('Open'));
});
