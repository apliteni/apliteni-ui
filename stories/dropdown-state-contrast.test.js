// Measures source CSS and every state chip in the Dropdown stories in both themes.
// JSDOM resolves paint, not layout, browser hover, focus or anti-aliased pixels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import * as stories from './components/Dropdown.stories.js';
import { kitCssFor, effectiveBackground, parseColour, ratio } from './lib/contrast.js';

function assertEdge(style, panel, name) {
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
    assert.ok(parseFloat(style[`border${side}Width`]) >= 1, `${name}: visible ${side} edge`);
    assert.equal(style[`border${side}Style`], 'solid');
    assert.ok(ratio(parseColour(style[`border${side}Color`]), panel) >= 3, `${name}: ${side} edge >= 3:1`);
  }
}

for (const theme of ['light', 'dark']) {
  test(`dropdown state chips: ${theme} text and edge contrast`, () => {
    const { css } = kitCssFor(theme);
    const rendered = Object.entries(stories).filter(([, story]) => typeof story.render === 'function');
    assert.ok(rendered.length > 0, 'Dropdown stories must be discovered');
    let measured = 0;
    for (const [name, story] of rendered) {
      const win = new JSDOM(`<style>${css}</style>${story.render()}`).window;
      const chips = win.document.querySelectorAll('.ui-dropdown__badge.is-state');
      for (const chip of chips) {
        const style = win.getComputedStyle(chip);
        const ground = effectiveBackground(chip, win);
        const panel = effectiveBackground(chip.closest('.ui-dropdown__panel'), win);
        assert.ok(ratio(parseColour(style.color), ground) >= 4.5, `${name}: chip text >= 4.5:1`);
        assertEdge(style, panel, name);
        measured++;
      }
      win.close();
    }
    assert.ok(measured >= 1, 'Must measure state chips, including DescriptionsAndBadges');
    const specimen = new JSDOM(stories.DescriptionsAndBadges.render());
    assert.equal(specimen.window.document.querySelectorAll('.ui-dropdown__badge.is-state').length, 1);
    specimen.window.close();
  });
}

for (const theme of ['light', 'dark']) {
  test(`dropdown state chips: ${theme} rejects a missing edge`, () => {
    const { css } = kitCssFor(theme);
    const win = new JSDOM(`<style>${css}</style>${stories.DescriptionsAndBadges.render()}`).window;
    const chip = win.document.querySelector('.ui-dropdown__badge.is-state');
    assert.ok(chip, 'Mutation needs a state chip');
    chip.style.border = '0';
    assert.throws(() => assertEdge(
      win.getComputedStyle(chip),
      effectiveBackground(chip.closest('.ui-dropdown__panel'), win),
      'mutant',
    ), /visible Top edge/);
    win.close();
  });
}
