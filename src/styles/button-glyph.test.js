// What button.css gives a button's glyphs at each size, on the React Button's markup.
// The cascade is resolved in JSDOM; nothing is laid out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { markup } from '../../stories/lib/react-markup.js';

const css = readFileSync(new URL('./button.css', import.meta.url), 'utf8');

const glyphs = async (size, sheet = css) => {
  const html = await markup(({ h, kit }) => h(kit.Button, { size, icon: 'copy', iconRight: 'arrowRight' }, 'Copy'));
  const dom = new JSDOM(`<style>${sheet}</style>${html}`);
  try {
    return [...dom.window.document.querySelectorAll('svg')].map((svg) => {
      const style = dom.window.getComputedStyle(svg);
      return { width: style.width, height: style.height, stroke: style.strokeWidth };
    });
  } finally {
    dom.window.close();
  }
};

test('xs sizes both glyph slots while existing sizes keep their glyph dimensions', async () => {
  for (const size of ['xs', 'sm', 'md', 'lg']) {
    const found = await glyphs(size);
    assert.equal(found.length, 2, `${size}: the button draws a leading and a trailing glyph`);
    for (const g of found) {
      assert.equal(g.width, size === 'xs' ? '13px' : '16px', `${size}: glyph width`);
      assert.equal(g.height, g.width, `${size}: glyph is square`);
      assert.equal(g.stroke, size === 'xs' ? '2.8' : '2.4', `${size}: glyph stroke`);
    }
  }
});

test('the check reports an xs glyph that keeps the default size', async () => {
  const broken = css.replace(/\.ui-btn--xs[^{]*svg[^{]*\{[^}]*\}/g, '');
  assert.notEqual(broken, css, 'no xs glyph rule found to remove');
  assert.notEqual((await glyphs('xs', broken))[0].width, '13px');
});
