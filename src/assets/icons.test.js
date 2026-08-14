// Every glyph the kit ships is decorative. This is the rule the rest of the kit
// leans on: because icon() is hidden, an icon-only control has to name itself.
// If this file ever goes green with the attributes removed, that contract is
// broken and every icon-only button in the kit quietly loses its name.
//
// why: CONTRIBUTING.md#a-number-a-comment-argues-for-is-pinned-by-a-measured-test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icon, iconNames, iconCategories, iconOnlyAllowed, sun, moon } from './icons.js';

test('icon() hides every glyph from assistive tech', () => {
  for (const name of iconNames) {
    const svg = icon(name);
    assert.match(svg, /<svg[^>]*\saria-hidden="true"/, `${name} is not aria-hidden`);
    assert.match(svg, /<svg[^>]*\sfocusable="false"/, `${name} is focusable`);
  }
});

test('an unknown name still emits a hidden, empty glyph — never a bare graphic', () => {
  const svg = icon('no-such-glyph');
  assert.match(svg, /aria-hidden="true"/);
  assert.match(svg, /><\/svg>$/);
});

test('a class still lands on the svg alongside the a11y attributes', () => {
  const svg = icon('check', 'ui-lead');
  assert.match(svg, /class="ui-lead"/);
  assert.match(svg, /aria-hidden="true"/);
});

// Rule: a glyph is declared in exactly one group.
//
// `card`, `chart` and `doc` were once declared twice — COMMS re-declared what
// DATA and FILES already owned, with byte-identical path data. Nothing broke:
// the flat ICONS map takes the last spread, so icon() still resolved. What went
// wrong was quieter — iconCategories still listed both, so the catalogue filed
// one glyph under two headings, and the file grew three lines that no reader
// could tell from a real glyph.
//
// The groups are discovered from iconCategories rather than named here; a group
// added to that array joins this gate by existing, and one renamed or removed
// leaves it without a line to edit.
test('no glyph is declared in more than one group', () => {
  const homes = new Map();
  for (const { name, names } of iconCategories) {
    for (const glyph of names) homes.set(glyph, [...(homes.get(glyph) || []), name]);
  }
  const shared = [...homes].filter(([, groups]) => groups.length > 1);
  assert.deepEqual(
    shared.map(([glyph, groups]) => `${glyph}: ${groups.join(' + ')}`),
    [],
    'a glyph is catalogued under more than one heading',
  );
});

// The count the gate above cannot see on its own. iconNames comes from the flat
// map, which silently collapses a re-declaration; the groups still carry both.
// Holding the two totals equal is what makes a duplicate arithmetic rather than
// a judgement, and it is the same count whether the copy is byte-identical or
// a different glyph wearing a taken name.
test('the groups declare exactly as many glyphs as the kit ships', () => {
  const declared = iconCategories.reduce((n, { names }) => n + names.length, 0);
  assert.equal(declared, iconNames.length,
    `${declared} declarations for ${iconNames.length} glyphs — ${declared - iconNames.length} of them reuse a name already taken`);
});

// Rule: the numbers icon()'s own header argues for are the numbers it emits.
//
// The header at the top of icons.js promises 24×24, a 1.7 stroke, currentColor
// and no fill, and every glyph is drawn against those. They lived only in the
// template literal, so a stray edit could change all 79 glyphs at once and no
// test would notice (the measured-pin rule: a number a comment argues for is pinned by a
// measured test).
test('the emitter ships the numbers its header argues for', () => {
  for (const [attr, value] of Object.entries({
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7',
  })) {
    assert.match(icon('check'), new RegExp(`<svg[^>]*\\s${attr}="${value}"`),
      `the emitter no longer sets ${attr}="${value}"`);
  }
});

// Rule: icon-only is allowed for a closed list of actions, and every glyph on
// that list is one the kit actually ships. The list is what stories/guidelines/
// iconography.test.js reviews call sites against; if a name here stopped
// existing, that gate would pass by checking against nothing.
test('every glyph the icon-only list allows is a glyph the kit ships', () => {
  for (const glyph of Object.keys(iconOnlyAllowed)) {
    assert.ok(iconNames.includes(glyph), `iconOnlyAllowed names ${glyph}, which the kit does not ship`);
  }
});

test('the standalone theme glyphs are hidden too', () => {
  for (const [name, svg] of Object.entries({ sun, moon })) {
    assert.match(svg, /aria-hidden="true"/, `${name} is not aria-hidden`);
    assert.match(svg, /focusable="false"/, `${name} is focusable`);
  }
});
