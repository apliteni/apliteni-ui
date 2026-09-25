// A readout a story renders open is a picture of one, and has to stay open.
//
// The preview decorator wires every story it renders, so a pre-opened readout
// whose host the wiring can reach is live: a pointer crossing its chart re-fills
// and re-places it, leaving takes it down, and nothing brings it back. The page
// then shows its "do" without the readout the caption describes.
//
// Every story is rendered and wired the way the preview does it, every readout
// that came out open is walked over with a pointer, focus and Escape, and each
// has to be open at the end.
//
// why: docs/specification.md#the-hover-readout
// Discover subjects from source and check the coverage count.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', {
  pretendToBeVisual: true, virtualConsole: quiet,
});
const { window } = dom;
for (const key of [
  'window', 'document', 'navigator', 'location', 'getComputedStyle', 'matchMedia', 'requestAnimationFrame',
  'Node', 'Element', 'HTMLElement', 'SVGElement', 'DocumentFragment', 'Event', 'CustomEvent', 'MutationObserver',
]) {
  let value;
  try { value = window[key]; } catch { continue; }
  if (value === undefined) continue;
  const bound = typeof value === 'function' && /^[a-z]/.test(key) ? value.bind(window) : value;
  Object.defineProperty(globalThis, key, { value: bound, configurable: true, writable: true });
}

const { wireTooltip } = await import('../src/components/tooltip.js');

const storyFiles = readdirSync(path.join(root, 'stories'), { recursive: true })
  .map(String).filter((p) => p.endsWith('.stories.js')).sort();

const serialize = (out) => (typeof out === 'string' ? out : out?.outerHTML ?? null);

const pointer = (el, type) =>
  el.dispatchEvent(new window.MouseEvent(type, { bubbles: type !== 'pointerleave', cancelable: true }));
const focus = (el, type, relatedTarget = null) =>
  el.dispatchEvent(new window.FocusEvent(type, { bubbles: true, relatedTarget }));
const escape = () =>
  window.document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

// Every mark a readout's host holds, crossed the way a pointer and a keyboard
// would cross them, then the host left and Escape pressed.
function walk(host) {
  for (const mark of host.querySelectorAll('[data-tip-value]')) {
    pointer(mark, 'pointerover');
    focus(mark, 'focusin');
    focus(mark, 'focusout', window.document.body);
  }
  pointer(host, 'pointerleave');
  escape();
}

test('a readout a story renders open is still open after the page is used', async () => {
  const problems = [];
  let specimens = 0;
  let live = 0;

  for (const rel of storyFiles) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      let html;
      try { html = serialize(render(args, { globals: { theme: 'dark' }, args })); } catch { continue; }
      if (!html || !html.includes('data-tip')) continue;

      const wrap = window.document.createElement('div');
      wrap.innerHTML = html;
      window.document.body.replaceChildren(wrap);
      const opened = [...wrap.querySelectorAll('[data-tip].is-open')];
      wireTooltip(wrap);

      for (const tip of opened) {
        specimens += 1;
        const host = tip.closest('.ui-tip-host') || tip.parentElement;
        const before = tip.outerHTML;
        walk(host);
        if (!tip.classList.contains('is-open')) {
          problems.push(`  stories/${rel} → ${name}: the open readout "${tip.textContent}" was closed by using the page`);
        } else if (tip.outerHTML !== before) {
          problems.push(`  stories/${rel} → ${name}: the open readout "${tip.textContent}" was re-filled or moved`);
        }
      }

      // The live readouts on the same page do answer, or the walk above proved nothing.
      for (const host of wrap.querySelectorAll('[data-tip-host]')) {
        const tip = host.querySelector('[data-tip]');
        const mark = host.querySelector('[data-tip-value]');
        if (!tip || !mark || opened.includes(tip)) continue;
        pointer(mark, 'pointerover');
        if (tip.classList.contains('is-open')) live += 1;
        pointer(host, 'pointerleave');
      }
    }
  }

  assert.ok(specimens >= 8, `found ${specimens} readouts rendered open — the sweep is broken, not the stories`);
  assert.ok(live > 0, 'no wired readout opened under a pointer, so the walk over the open ones tested nothing');
  assert.equal(problems.length, 0, `\nA readout rendered open did not stay open:\n${problems.join('\n')}\n`);
});
