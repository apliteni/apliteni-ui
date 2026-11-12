// What button.css gives a button's glyphs at each size, and a link button on hover, on the React Button's markup.
// The cascade is resolved in JSDOM; nothing is laid out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { markup } from '../../stories/lib/react-markup.js';
import { substitute, tokensFor } from '../../stories/lib/contrast.js';

const css = substitute(readFileSync(new URL('./button.css', import.meta.url), 'utf8'),
  tokensFor('dark', 'default'));

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

// A hovered link button keeps one underline: the label's, at its offset (#765). JSDOM has no
// pointer, so the sheet's :hover is read as a class. It reads the cascade, not the paint.
const hovered = async () => {
  const html = await markup(({ h, kit }) => h(kit.Button, { variant: 'link' }, 'Open report'));
  const dom = new JSDOM(`<style>${css.replaceAll(':hover', '.is-hover')}</style>${html}`);
  try {
    const button = dom.window.document.querySelector('.ui-btn--link');
    button.classList.add('is-hover');
    const label = button.querySelector('.ui-btn__label');
    const style = (el) => dom.window.getComputedStyle(el);
    return {
      button: style(button).textDecoration,
      color: style(button).color,
      label: style(label).textDecoration,
      offset: style(label).textUnderlineOffset,
    };
  } finally {
    dom.window.close();
  }
};

test('a hovered link button underlines its label once, at the label offset', async () => {
  const found = await hovered();
  assert.ok(!/underline/.test(found.button), `the button draws a second underline: ${found.button}`);
  assert.match(found.label, /underline/);
  // Tokens are substituted first: jsdom 31 resolves var(), and the md size's 15.5px --text-md
  // makes 0.2em read 3.1px rather than the 3.2px a 16px default would give.
  assert.equal(found.offset, '3.1px', 'the underline sits 0.2em under the label');
  assert.equal(found.color, 'rgb(255, 255, 255)');
});
