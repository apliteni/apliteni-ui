// Every glyph the kit ships is decorative. This is the rule the rest of the kit
// leans on: because icon() is hidden, an icon-only control has to name itself.
// If this file ever goes green with the attributes removed, that contract is
// broken and every icon-only button in the kit quietly loses its name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icon, iconNames, sun, moon } from './icons.js';

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

test('the standalone theme glyphs are hidden too', () => {
  for (const [name, svg] of Object.entries({ sun, moon })) {
    assert.match(svg, /aria-hidden="true"/, `${name} is not aria-hidden`);
    assert.match(svg, /focusable="false"/, `${name} is focusable`);
  }
});
