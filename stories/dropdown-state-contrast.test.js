// Source cascade only: no layout, browser pseudo-classes or anti-aliased pixels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { badge } from '../src/components/index.js';
import * as stories from './components/Dropdown.stories.js';
import { kitCssFor, effectiveBackground, parseColour, ratio, rgbOf, substitute } from './lib/contrast.js';

function measureChip(chip, win) {
  const style = win.getComputedStyle(chip);
  const ground = effectiveBackground(chip, win);
  const panel = effectiveBackground(chip.closest('.ui-dropdown__panel'), win);
  assert.ok(ratio(parseColour(style.color), ground) >= 4.5, 'chip text >= 4.5:1');
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
    const visible = !['none', 'hidden', ''].includes(style['border' + side + 'Style']);
    assert.ok(!visible || parseFloat(style['border' + side + 'Width']) === 0, 'no chip edge');
  }
  const separation = ratio(ground, panel);
  assert.ok(separation >= 1.15 && separation <= 1.35, 'soft fill remains distinguishable without a strong boundary');
  return separation;
}

test('Dropdown soft chips match badge dimensions and theme separation', () => {
  const separation = {};
  for (const theme of ['light', 'dark']) {
    const { css, vars } = kitCssFor(theme);
    const rendered = Object.entries(stories).filter(([, story]) => typeof story.render === 'function');
    assert.ok(rendered.length > 0, 'Dropdown stories must be discovered');
    let measured = 0;
    for (const [name, story] of rendered) {
      const win = new JSDOM('<style>' + css + '</style>' + story.render() + badge('Reference')).window;
      const reference = win.getComputedStyle(win.document.querySelector('.ui-badge'));
      for (const chip of win.document.querySelectorAll('.ui-dropdown__badge:not(.is-live)')) {
        separation[theme] = measureChip(chip, win);
        measured++;
      }
      for (const chip of win.document.querySelectorAll('.ui-dropdown__badge')) {
        const style = win.getComputedStyle(chip);
        for (const prop of ['fontSize', 'fontWeight', 'borderRadius', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) {
          assert.equal(style[prop], reference[prop], name + ': standard badge ' + prop);
        }
      }
      const bodyInk = rgbOf(substitute(vars.get('--text'), vars));
      for (const label of win.document.querySelectorAll('.ui-dropdown__item.is-selected .ui-dropdown__label, .ui-dropdown__badge.is-accent, .ui-dropdown__badge.is-neutral')) {
        assert.equal(win.getComputedStyle(label).color, bodyInk, name + ': body ink outside status and tick');
      }
      win.close();
    }
    assert.ok(measured >= 6, 'Must cover the six existing non-live chips');
  }
  assert.ok(Math.abs(separation.light - separation.dark) < 0.05, 'dark fill separation roughly matches light');
});

for (const theme of ['light', 'dark']) {
  test('Dropdown soft chips reject missing fill and strong edge in ' + theme, () => {
    const { css } = kitCssFor(theme);
    const win = new JSDOM('<style>' + css + '</style>' + stories.DescriptionsAndBadges.render()).window;
    const chip = win.document.querySelector('.ui-dropdown__badge.is-state');
    assert.ok(chip);
    chip.style.background = 'transparent';
    assert.throws(() => measureChip(chip, win), /soft fill/);
    chip.style.background = '';
    chip.style.border = '1px solid currentColor';
    assert.throws(() => measureChip(chip, win), /no chip edge/);
    win.close();
  });
}
