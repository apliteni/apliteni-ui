// The drawer's opening focus — the half JSDOM can see, and the half it cannot.
//
// openDrawer() moves focus to the first control in the panel and then marks
// everything outside inert, so if that focus() is a no-op the reader is left on
// <body> with the trigger already inert behind them. In Chrome it WAS a no-op:
// `visibility` sat in the panel's transition list, a transitioned visibility is
// still `hidden` in the frame the transition starts, and focus() on a hidden
// element does nothing. Measured on Components/Drawer → Playground:
//
//   [["pre-click","hidden","trigger"],["sync-after-open","hidden","trigger"],
//    ["t=50","visible","BODY"],["t=500","visible","BODY"]]
//
// JSDOM has no CSS and no transitions, so it cannot reproduce that. It can only
// prove the aim — focus is asked to move — which is why the stylesheet is read
// as text below and the rule that broke is pinned there instead.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');

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

// The assertion that pins the real-browser bug. `visibility` is discrete: a
// transition holds it at the OLD value for the whole duration, so a panel whose
// visibility is transitioned is still hidden in the frame the class lands and
// focus() has nothing to focus. Switch it outright; delay the hide on close if
// the slide-out needs the panel on screen, never the show on open.
test('the panel never transitions `visibility` — a transitioned panel is still hidden when focus() runs', () => {
  const css = readFileSync(path.join(repo, 'src/styles/drawer.css'), 'utf8');
  const rules = [...css.matchAll(/([^{}]*\.ui-drawer__panel[^{}]*)\{([^}]*)\}/g)];
  assert.ok(rules.length > 0, 'the panel rules were found — did the class name change?');

  for (const [, selector, body] of rules) {
    assert.doesNotMatch(
      body, /transition[a-z-]*\s*:[^;]*\bvisibility\b/,
      `${selector.trim()} transitions visibility, which delays the switch past the click`,
    );
  }
});
