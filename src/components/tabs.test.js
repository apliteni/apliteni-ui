import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tabs, initTabs } from './tabs.js';

const ITEMS = [
  { label: 'One', panel: '<p>1</p>' },
  { label: 'Two', panel: '<p>2</p>' },
  { label: 'Three', panel: '<p>3</p>' },
];

test('tabs() renders a tablist with one tab + one panel per item', () => {
  const html = tabs({ name: 'x', items: ITEMS });
  assert.match(html, /role="tablist"/);
  assert.equal((html.match(/role="tab"/g) || []).length, 3);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 3);
});

test('active tab is selected + focusable; others are not', () => {
  const html = tabs({ name: 'x', items: ITEMS, active: 1 });
  assert.match(html, /id="x-tab-1"[^>]*aria-selected="true"[^>]*tabindex="0"/);
  assert.match(html, /id="x-tab-0"[^>]*aria-selected="false"[^>]*tabindex="-1"/);
});

test('inactive panels are hidden; active panel is not', () => {
  const html = tabs({ name: 'x', items: ITEMS, active: 0 });
  assert.match(html, /id="x-panel-0" aria-labelledby="x-tab-0" tabindex="0">/); // no hidden attr
  assert.match(html, /id="x-panel-1" aria-labelledby="x-tab-1" tabindex="0" hidden>/);
});

// The APG asks for this when a panel holds nothing focusable, which is most of
// them here. Without it the tab strip is reachable and its content is not.
test('every panel is focusable', () => {
  const html = tabs({ name: 'x', items: ITEMS });
  assert.equal((html.match(/role="tabpanel"[^>]*tabindex="0"/g) || []).length, 3);
});

test('aria wiring pairs each tab with its panel', () => {
  const html = tabs({ name: 'acc', items: ITEMS });
  assert.match(html, /id="acc-tab-2" aria-controls="acc-panel-2"/);
  assert.match(html, /id="acc-panel-2" aria-labelledby="acc-tab-2"/);
});

test('empty items render an empty, valid tablist', () => {
  const html = tabs({ items: [] });
  assert.match(html, /role="tablist"/);
  assert.doesNotMatch(html, /role="tab"/);
});

test('initTabs no-ops off-DOM (SSR / node)', () => {
  assert.equal(typeof globalThis.document, 'undefined');
  assert.doesNotThrow(() => assert.equal(initTabs(), undefined));
});
