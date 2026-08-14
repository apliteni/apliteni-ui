// The drawer's opening focus — the half JSDOM can see, and the half it cannot.
//
// openDrawer() moves focus into the panel and then marks everything outside
// inert, so a focus() that no-ops leaves the reader on <body> with the trigger
// already inert behind them. In Chrome it WAS a no-op, because a transitioned
// `visibility` is still `hidden` in the frame the transition starts. Measured on
// Components/Drawer → Playground:
//
//   [["pre-click","hidden","trigger"],["sync-after-open","hidden","trigger"],
//    ["t=50","visible","BODY"],["t=500","visible","BODY"]]
//
// JSDOM has no CSS and no transitions, so it can only prove the AIM — focus is
// asked to move. The stylesheet rule that broke is pinned in
// stories/overlay-css.test.js.

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}

const { drawer, openDrawer } = await import('../src/components/drawer.js');
const { button } = await import('../src/components/index.js');

const doc = dom.window.document;

// A trigger outside the drawer and a drawer with real controls inside, mounted
// the way a page mounts them.
function mount() {
  const host = doc.createElement('div');
  host.innerHTML = button({ label: 'Open drawer', variant: 'primary' })
      .replace('<button ', '<button id="df-trigger" data-drawer-open="df-drawer" ')
    + drawer({
      id: 'df-drawer', side: 'right', title: 'Filters',
      body: '<p>Nothing here needs saying twice.</p>',
      footer: button({ label: 'Reset', variant: 'ghost' }) + button({ label: 'Apply', variant: 'primary' }),
    });
  doc.body.replaceChildren(host);
  return host;
}

test('openDrawer() lands focus on the first control inside the panel, not on <body>', () => {
  const host = mount();
  const root = doc.getElementById('df-drawer');
  const trigger = doc.getElementById('df-trigger');
  const panel = root.querySelector('[data-drawer-panel]');
  trigger.focus();

  openDrawer(root, trigger);

  const first = panel.querySelector('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  assert.ok(first, 'the panel has focusable content to land on');
  assert.equal(doc.activeElement, first, 'focus moves into the panel');
  assert.notEqual(doc.activeElement, doc.body, 'and never onto <body>, which is where the reader landed in Chrome');
  assert.ok(host.contains(doc.activeElement));
});
