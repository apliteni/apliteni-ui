// Measures source-derived catalogue copy, not browser layout or API behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iconNames } from '../src/assets/icons.js';
import { catalogueCopy, buttonOptions } from './catalogue.mjs';

const template = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const buttonSource = readFileSync(new URL('../react/src/primitives/Button.tsx', import.meta.url), 'utf8');
const input = { icons: iconNames, buttonSource };

/** The template with exactly those three substitutions and nothing else.
 *
 *  Compared whole rather than by searching for a sentence. The sentences around
 *  the counts are the landing page's copy and change whenever it is rewritten
 *  (#463), which used to fail this gate on a page that was correct; and a
 *  substring match could not see a fourth thing the renderer had altered. This
 *  form says both: each count landed where its marker was, and the rest of the
 *  document came through untouched. */
const expected = (icons, variants, sizes) => template
  .replace('{{ICON_COUNT}}', String(icons))
  .replace('{{BUTTON_VARIANTS}}', variants)
  .replace('{{BUTTON_SIZES}}', sizes);

test('all three catalogue counts are populated from nonempty current sources', () => {
  assert.equal((template.match(/\{\{(?:ICON_COUNT|BUTTON_VARIANTS|BUTTON_SIZES)\}\}/g) || []).length, 3);
  assert.ok(iconNames.length > 0);
  assert.equal(buttonOptions(buttonSource, 'variant').length, 4);
  assert.equal(buttonOptions(buttonSource, 'size').length, 4);
  const copy = catalogueCopy(template, input);
  assert.equal(copy, expected(iconNames.length, 'Four', 'four'));
  assert.doesNotMatch(copy, /\{\{(?:ICON_COUNT|BUTTON_VARIANTS|BUTTON_SIZES)\}\}/);
});

test('added catalogue entries change the rendered counts', () => {
  const copy = catalogueCopy(template, {
    icons: [...iconNames, 'test-glyph'],
    buttonSource: buttonSource.replace("size?: 'xs'", "size?: 'test-size' | 'xs'"),
  });
  assert.equal(copy, expected(iconNames.length + 1, 'Four', 'five'));
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
