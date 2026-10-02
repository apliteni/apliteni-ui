// Scroll arithmetic only; the browser evidence check measures real 390px layouts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealCurrentNav } from './nav.js';

test('reveals the current link at either edge without changing an already visible link', () => {
  let rect = { left: 360, right: 450 };
  const nav = {
    scrollLeft: 0, scrollWidth: 600, clientWidth: 310,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ paddingLeft: '4px', paddingRight: '4px' }) } },
    querySelector: () => ({ getBoundingClientRect: () => rect }),
    getBoundingClientRect: () => ({ left: 40, right: 350 }),
  };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 104);
  rect = { left: 30, right: 120 };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 90);
  rect = { left: 50, right: 140 };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 90);
});

test('leaves fitting rows and rows without a current link still', () => {
  const nav = { scrollLeft: 0, scrollWidth: 200, clientWidth: 310, querySelector: () => null };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 0);
});
