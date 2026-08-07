// Rule: the theme toggle reports the theme you are IN, to eyes and to a screen
// reader alike, and both readings move when the theme moves.
//
// These tests resolve the **computed accessible name** with axe-core's accname
// implementation rather than matching an `aria-label=` substring. The two are
// not the same check: a name can be spelled correctly in the attribute and still
// be overridden by aria-labelledby, shadowed by inner text, or — the failure this
// file exists for — never updated after the first paint. Only the resolved name
// says what a screen reader announces.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { themeToggle, applyTheme } from './topbar.js';

const require = createRequire(import.meta.url);
const axeSrc = readFileSync(path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js'), 'utf8');

// One window for the file — axe is ~1MB and evaluating it per test is the
// expensive part. The <html> element is the theme root the kit writes to.
const dom = new JSDOM('<!doctype html><html lang="en"><head><title>kit</title></head><body></body></html>', {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
});
dom.window.eval(axeSrc);
after(() => dom.window.close());

const { document: doc, axe } = dom.window;

/** The name a screen reader announces for `el`, per the accname spec. */
const nameOf = (el) => {
  axe.setup(el.ownerDocument.documentElement);
  try {
    return axe.commons.text.accessibleText(el);
  } finally {
    axe.teardown();
  }
};

/** Which glyph is on screen. The sun carries a circle; the moon is one path. */
const glyphOf = (btn) => {
  const ic = btn.querySelector('[data-theme-icon]');
  if (!ic || !ic.querySelector('svg')) return 'none';
  return ic.querySelector('circle') ? 'sun' : 'moon';
};

/** Mount markup on the theme root and hand back the toggle button. */
const mount = (html, theme) => {
  doc.documentElement.setAttribute('data-theme', theme);
  doc.body.innerHTML = html;
  return doc.querySelector('[data-theme-toggle]');
};

const DARK_NAME = 'Theme: Dark. Switch to light.';
const LIGHT_NAME = 'Theme: Light. Switch to dark.';

test('the toggle announces the theme it is in, not the one a click would bring', () => {
  assert.equal(nameOf(mount(themeToggle('dark'), 'dark')), DARK_NAME);
  assert.equal(nameOf(mount(themeToggle('light'), 'light')), LIGHT_NAME);
});

// The convention the rest of the kit's stateful controls already use: the
// control shows the state it is in. Moon while dark, sun while light.
test('the icon shows the current theme: moon in dark, sun in light', () => {
  assert.equal(glyphOf(mount(themeToggle('dark'), 'dark')), 'moon');
  assert.equal(glyphOf(mount(themeToggle('light'), 'light')), 'sun');
});

// The defect this file was written for: a name that is correct once and never
// again. Both readings have to follow applyTheme, not just the first paint.
test('applyTheme rewrites the announced name and the glyph on every flip', () => {
  const btn = mount(themeToggle('dark'), 'dark');
  const root = doc.documentElement;

  applyTheme('light', root);
  assert.equal(nameOf(btn), LIGHT_NAME, 'name after flipping to light');
  assert.equal(glyphOf(btn), 'sun', 'glyph after flipping to light');

  applyTheme('dark', root);
  assert.equal(nameOf(btn), DARK_NAME, 'name after flipping back to dark');
  assert.equal(glyphOf(btn), 'moon', 'glyph after flipping back to dark');
});

// A name that never changes is a name that tells you nothing about the state.
test('the two names differ — the control is not announcing one static string', () => {
  const btn = mount(themeToggle('dark'), 'dark');
  const root = doc.documentElement;
  applyTheme('dark', root);
  const inDark = nameOf(btn);
  applyTheme('light', root);
  const inLight = nameOf(btn);
  assert.notEqual(inDark, inLight, `the name stayed ${JSON.stringify(inDark)} across a theme flip`);
});

// The tooltip is the sighted reading of the same fact. If it disagreed with the
// announced name, WCAG 2.5.3 would have something to say about it.
test('the tooltip says the same thing as the announced name', () => {
  const btn = mount(themeToggle('dark'), 'dark');
  applyTheme('light', doc.documentElement);
  assert.equal(btn.getAttribute('title'), nameOf(btn));
});

// Structural: applyTheme may only reach for hooks themeToggle() actually
// renders. `[data-theme-label]` was queried and set for a span the kit never
// emitted — a branch that could not run, kept alive by a stale build artifact.
test('applyTheme queries no hook that themeToggle() does not render', () => {
  const src = readFileSync(new URL('./topbar.js', import.meta.url), 'utf8');
  const start = src.indexOf('export function applyTheme');
  const end = src.indexOf('const ACCENT_KEY');
  assert.ok(start > -1 && end > start, 'could not locate applyTheme in topbar.js');

  const hooks = [...new Set([...src.slice(start, end).matchAll(/\[(data-[\w-]+)\]/g)].map((m) => m[1]))];
  assert.ok(hooks.length > 0, 'applyTheme queries no data hooks at all — did the shape change?');

  const html = themeToggle();
  for (const hook of hooks) {
    assert.ok(html.includes(hook), `applyTheme queries [${hook}], which themeToggle() never renders`);
  }
});
