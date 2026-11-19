// What button.css gives a button's glyphs at each size, a link button on hover and an sm button's height, on the React Button's markup.
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

// An sm button and a pill dropdown trigger stand level at 32px. #814
// The trigger's line is the button's tight line since #822. If it is `normal`, this reads
// IBM Plex Sans's normal line, 1.3 of its size (ascender 1025 and descender 275 per 1000).
// Limit: nothing here lays the line out, and a fallback face draws another line.
test('an sm button is 32px tall with or without a glyph, level with a pill trigger', async () => {
  for (const icon of [undefined, 'copy']) {
    const html = await markup(({ h, kit }) => h(kit.Button, { size: 'sm', icon }, 'Export'));
    const dom = new JSDOM(`<style>${css}</style>${html}`);
    try {
      assert.equal(dom.window.getComputedStyle(dom.window.document.querySelector('.ui-btn')).minHeight, '32px', `glyph ${icon}`);
    } finally {
      dom.window.close();
    }
  }
  const dropdown = substitute(readFileSync(new URL('./dropdown.css', import.meta.url), 'utf8'), tokensFor('dark', 'default'));
  const dom = new JSDOM(`<style>${dropdown}</style><button class="ui-dropdown__trigger">All</button>`);
  try {
    const s = dom.window.getComputedStyle(dom.window.document.querySelector('button'));
    const px = (v) => parseFloat(v);
    const drawn = px(s.paddingTop) + px(s.paddingBottom) + px(s.borderTopWidth) + px(s.borderBottomWidth)
      + (s.lineHeight === 'normal' ? Math.round(px(s.fontSize) * 1.3) : px(s.lineHeight));
    assert.equal(drawn, 32, `trigger: ${s.paddingTop} padding, ${s.fontSize} type, ${s.lineHeight} line`);
  } finally {
    dom.window.close();
  }
});
