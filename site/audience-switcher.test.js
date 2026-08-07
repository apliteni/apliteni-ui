// The landing page's Humans / Agents switcher — the rendered relationships, not
// the attribute strings.
//
// The switcher announces itself as a tablist. A tablist is a contract: each tab
// names the panel it controls, each panel names the tab that labels it, arrows
// move between tabs, and the strip costs one Tab stop. #134 shipped the
// announcement without the contract, and axe passed it — role="tablist" with
// role="tab" children satisfies every rule axe owns, and axe has no rule for a
// tab that controls nothing.
//
// So this file loads the real page, runs its real inline script, presses real
// keys, and reads what came back off the DOM. Every test here fails if you take
// away the behaviour it names. The kit's own gate does the same next door in
// stories/keyboard.test.js; the site and the kit are held to one standard.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// The page as build.mjs hands it to a browser, minus the shared chrome — the
// switcher lives entirely in index.html and its own <script>, so the topbar,
// footer and theme script are noise here.
const PAGE = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
  .replace('{{TOPBAR}}', '')
  .replace('{{FOOTER}}', '')
  .replace('{{CHROME_CSS}}', '')
  .replace('{{CHROME_JS}}', '');

function page() {
  const dom = new JSDOM(PAGE, { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document;
  const strip = doc.querySelector('.paths-sw');
  const tabs = [...strip.querySelectorAll('[role="tab"]')];
  const panelOf = (tab) => doc.getElementById(tab.getAttribute('aria-controls'));
  const label = (el) => (el.querySelector('b') || el).textContent.trim();
  const press = (el, key) => el.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  const focused = () => doc.activeElement;
  return { dom, doc, strip, tabs, panelOf, label, press, focused };
}

// ---- the announcement has to be true -------------------------------------

test('the strip is a named tablist', () => {
  const { strip, tabs } = page();
  assert.equal(strip.getAttribute('role'), 'tablist');
  assert.ok(strip.getAttribute('aria-label'), 'a tablist with no name is an unnamed control');
  assert.equal(tabs.length, 2, 'Humans and Agents');
});

test('every tab points at a panel that exists, and every panel points back at its tab', () => {
  const { tabs, panelOf, label } = page();
  for (const tab of tabs) {
    assert.ok(tab.id, `the ${label(tab)} tab needs an id for its panel to point back at`);
    const panel = panelOf(tab);
    assert.ok(panel, `${label(tab)} aria-controls="${tab.getAttribute('aria-controls')}" must resolve to a node`);
    assert.equal(panel.getAttribute('role'), 'tabpanel', `${label(tab)}'s panel must be a tabpanel`);
    assert.equal(panel.getAttribute('aria-labelledby'), tab.id, `${label(tab)}'s panel must name it back`);
  }
  const ids = tabs.map((t) => t.getAttribute('aria-controls'));
  assert.equal(new Set(ids).size, ids.length, 'two tabs must not control the same panel');
});

test('exactly one tab is selected, and the panel it controls is the only one showing', () => {
  const { tabs, panelOf, label } = page();
  const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
  assert.deepEqual(selected.map(label), ['Humans'], 'exactly one tab may be selected');
  const shown = tabs.filter((t) => !panelOf(t).hidden);
  assert.deepEqual(shown.map(label), ['Humans'], 'exactly one panel may be visible, and it is the selected one');
});

// ---- a keyboard user can work it and reach what it reveals ---------------

test('the strip costs one Tab stop, not one per tab', () => {
  const { tabs, label } = page();
  const stops = tabs.filter((t) => t.tabIndex === 0);
  assert.deepEqual(stops.map(label), ['Humans'], 'only the selected tab holds the Tab stop');
});

test('ArrowRight moves the tab, the selection and the visible panel, and wraps', () => {
  const { tabs, panelOf, label, press, focused } = page();
  tabs[0].focus();

  press(focused(), 'ArrowRight');
  assert.equal(label(focused()), 'Agents', 'focus moves to the next tab');
  assert.equal(focused().getAttribute('aria-selected'), 'true', 'and the selection moves with it');
  assert.equal(panelOf(tabs[0]).hidden, true, 'the Humans panel goes away');
  assert.equal(panelOf(tabs[1]).hidden, false, 'and the Agents panel appears');
  assert.deepEqual(tabs.filter((t) => t.tabIndex === 0).map(label), ['Agents'],
    'the Tab stop follows the selection instead of accumulating');

  press(focused(), 'ArrowRight');
  assert.equal(label(focused()), 'Humans', 'ArrowRight wraps from the last tab to the first');
});

test('ArrowLeft moves back and wraps', () => {
  const { tabs, label, press, focused } = page();
  tabs[0].focus();
  press(focused(), 'ArrowLeft');
  assert.equal(label(focused()), 'Agents', 'ArrowLeft wraps from the first tab to the last');
  press(focused(), 'ArrowLeft');
  assert.equal(label(focused()), 'Humans');
});

test('Home and End jump to the ends', () => {
  const { tabs, label, press, focused } = page();
  tabs[0].focus();
  press(focused(), 'End');
  assert.equal(label(focused()), 'Agents');
  assert.equal(focused().getAttribute('aria-selected'), 'true');
  press(focused(), 'Home');
  assert.equal(label(focused()), 'Humans');
  assert.equal(focused().getAttribute('aria-selected'), 'true');
});

test('a key the strip does not own is left alone', () => {
  const { tabs, label, press, focused } = page();
  tabs[0].focus();
  const notCancelled = press(focused(), 'ArrowDown');
  assert.equal(notCancelled, true, 'ArrowDown is not swallowed');
  assert.equal(label(focused()), 'Humans');
});

test('the revealed panel is reachable — a keyboard user gets to the content, not just the strip', () => {
  const { tabs, panelOf, doc } = page();
  for (const tab of tabs) {
    assert.equal(panelOf(tab).getAttribute('tabindex'), '0',
      'a tabpanel must be focusable so Tab lands inside it, not past it');
  }
  const panel = panelOf(tabs[0]);
  panel.focus();
  assert.equal(doc.activeElement, panel, 'and it actually takes focus');
});

// ---- the mouse path still works -----------------------------------------

test('clicking a tab selects it and swaps the panel', () => {
  const { tabs, panelOf } = page();
  tabs[1].click();
  assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
  assert.equal(tabs[0].getAttribute('aria-selected'), 'false');
  assert.equal(panelOf(tabs[1]).hidden, false);
  assert.equal(panelOf(tabs[0]).hidden, true);
});
