// Measures source-derived catalogue copy, not browser layout or API behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iconNames } from '../src/assets/icons.js';
import { catalogueCopy, buttonOptions } from './catalogue.mjs';

const template = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const buttonSource = readFileSync(new URL('../react/src/primitives/Button.tsx', import.meta.url), 'utf8');
const input = { icons: iconNames, buttonSource };

test('all three catalogue counts are populated from nonempty current sources', () => {
  const copy = catalogueCopy(template, input);
  assert.equal((template.match(/\{\{(?:ICON_COUNT|BUTTON_VARIANTS|BUTTON_SIZES)\}\}/g) || []).length, 3);
  assert.ok(iconNames.length > 0);
  assert.equal(buttonOptions(buttonSource, 'variant').length, 4);
  assert.equal(buttonOptions(buttonSource, 'size').length, 4);
  assert.ok(copy.includes(`${iconNames.length} Feather/Lucide-style glyphs`));
  assert.ok(copy.includes('Four variants and four sizes'));
  assert.doesNotMatch(copy, /\{\{(?:ICON_COUNT|BUTTON_VARIANTS|BUTTON_SIZES)\}\}/);
});

test('added catalogue entries change the rendered counts', () => {
  const copy = catalogueCopy(template, {
    icons: [...iconNames, 'test-glyph'],
    buttonSource: buttonSource.replace("size?: 'xs'", "size?: 'test-size' | 'xs'"),
  });
  assert.ok(copy.includes(`${iconNames.length + 1} Feather/Lucide-style glyphs`));
  assert.ok(copy.includes('Four variants and five sizes'));
});

test('stale hardcoded copy, empty sources and unsupported type changes are rejected', () => {
  for (const key of ['ICON_COUNT', 'BUTTON_VARIANTS', 'BUTTON_SIZES']) {
    assert.throws(() => catalogueCopy(template.replace(`{{${key}}}`, 'stale'), input), /Expected one/);
    assert.throws(() => catalogueCopy(template + `{{${key}}}`, input), /Expected one/);
  }
  assert.throws(() => catalogueCopy(template, { ...input, icons: [] }), /Invalid icon catalogue/);
  for (const property of ['size', 'variant']) {
    assert.throws(() => buttonOptions('', property), /Cannot count/);
    assert.throws(() => buttonOptions(`${property}?: string;`, property), /Cannot count/);
    assert.throws(() => buttonOptions(`${property}?: 'x' | 'x';`, property), /Duplicate/);
  }
});
