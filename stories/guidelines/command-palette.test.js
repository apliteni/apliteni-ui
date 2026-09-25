// The command-palette page, held against the component it describes — three
// ways the prose and the code can drift apart while every other gate is green:
// the keyboard contract, the label role the grouping rule claims, and a row
// that neither goes anywhere, runs anything, asks anything nor says it is
// unavailable.
//
// Discover subjects from source and check the coverage count.
// Include the cited code beside its file and line number.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

import { installDomGlobals, storyFiles } from '../lib/contrast.js';
import { KEYS, RULES } from './_command-palette.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// ---- 1. the keyboard contract --------------------------------------------

// A single letter is the same key however the browser cases it — the hotkey
// compares against both 'k' and 'K', and they are one row on the page.
const fold = (key) => (key.length === 1 ? key.toLowerCase() : key);

/** Every key `file` compares an event against, deduplicated and folded. */
function keysHandled(file) {
  const src = read(file).replace(/\/\/[^\n]*/g, '');
  return new Set([...src.matchAll(/\.key\s*[!=]==\s*'([^']+)'/g)].map((m) => fold(m[1])));
}

const SOURCES = ['src/components/command-palette.js', 'src/components/overlay.js'];

test('the page lists every key the palette answers, and no key it does not', () => {
  const handled = new Set(SOURCES.flatMap((f) => [...keysHandled(f)]));
  const declared = new Set(KEYS.map((k) => fold(k.key)));

  assert.ok(handled.size >= 5, `only ${handled.size} keys found in the sources — the sweep is `
    + 'broken, not the palette');
  assert.deepEqual(
    [...declared].sort(), [...handled].sort(),
    'the keyboard contract on the guidelines page and the keys the code answers have drifted. '
    + 'A key the code handles that the page has never heard of is a keystroke nobody documented; '
    + 'a key the page promises that nothing handles is a promise to a reader that does nothing.',
  );
});

test('each key names the file that answers it, and that file really does', () => {
  for (const { key, owner, does } of KEYS) {
    assert.ok(SOURCES.includes(owner), `${key} names ${owner}, which is not one of the palette's sources`);
    assert.ok(keysHandled(owner).has(fold(key)), `the page says ${owner} answers ${key}, and it does not`);
    assert.ok(does && does.length > 20, `${key} is listed with nothing said about what it does`);
  }
});

// ---- 2. what the grouping rule claims about the heading ------------------

test('a group heading is the kit\'s label role: 13px, medium, sentence case', () => {
  const css = decomment(read('src/styles/command-palette.css'));
  const rule = /\.ui-cmdk__group-head\s*\{([^}]*)\}/.exec(css);
  assert.ok(rule, '.ui-cmdk__group-head is gone from the sheet — the grouping rule describes nothing');

  assert.match(rule[1], /font-size:\s*var\(--text-sm\)/, 'the label role is 13px, and --text-sm is where the kit keeps it');
  assert.match(rule[1], /font-weight:\s*var\(--weight-medium\)/);
  assert.doesNotMatch(
    decomment(read('src/styles/command-palette.css')), /text-transform\s*:\s*uppercase/,
    'a group name is a signpost, not a shout — the kit sets labels in sentence case',
  );
});

test('every rule on the page points at code a reader can copy', () => {
  for (const rule of RULES) {
    assert.ok(JSON.parse(readFileSync(new URL('./references.json', import.meta.url), 'utf8'))['_command-palette.js'][rule.id]?.length, `${rule.id} states a rule with nothing in the kit behind it`);
  }
});

// ---- 3. every row any story renders --------------------------------------

// Story modules reach for the DOM at render time — the same globals
// stories/a11y.test.js installs, installed the same way, so a story that will
// not render here is a story that will not render there either.
const dom = new JSDOM('<!doctype html><html><body><div id="holder"></div></body></html>',
  { pretendToBeVisual: true });
installDomGlobals(dom.window);
const holder = dom.window.document.getElementById('holder');
const serialize = (out) => (typeof out === 'string' ? out : (out && out.outerHTML) || null);

const rows = [];
for (const rel of storyFiles) {
  const mod = await import(path.join(root, 'stories', rel));
  const def = mod.default || {};
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const render = story.render || def.render;
    if (typeof render !== 'function') continue;
    const html = serialize(render({ ...def.args, ...story.args },
      { globals: { theme: 'dark', accent: 'default' }, args: { ...def.args, ...story.args } }));
    if (html == null || !html.includes('data-cmdk-item')) continue;
    holder.innerHTML = html;
    for (const el of holder.querySelectorAll('[data-cmdk-item]')) {
      rows.push({ where: `${rel}:${name}`, el });
    }
  }
}

test('the sweep found the palettes the stories render', () => {
  assert.ok(rows.length >= 20, `only ${rows.length} palette rows rendered — the sweep is broken, `
    + 'not the stories');
});

test('every row says what it is, and none of them is dead', () => {
  const dead = rows.filter(({ el }) => {
    const live = el.hasAttribute('data-href') || el.hasAttribute('data-confirm-open')
      || el.hasAttribute('data-id') || el.getAttribute('aria-disabled') === 'true';
    return !live;
  }).map(({ where, el }) => `${where} — ${el.textContent.trim().slice(0, 40)}`);

  assert.deepEqual(dead, [], 'a row that goes nowhere, runs nothing, asks nothing and does not '
    + 'say it is unavailable is a row that lies about what Enter will do');

  const nameless = rows.filter(({ el }) => !el.querySelector('.ui-cmdk__label')?.textContent.trim())
    .map(({ where }) => where);
  assert.deepEqual(nameless, [], 'a row with no name cannot be typed, and cannot be read out');
});

test('a destructive row either asks a question or is disabled', () => {
  const loose = rows.filter(({ el }) => el.classList.contains('is-danger')
    && !el.hasAttribute('data-confirm-open')
    && el.getAttribute('aria-disabled') !== 'true')
    .map(({ where, el }) => `${where} — ${el.textContent.trim().slice(0, 40)}`);

  assert.deepEqual(loose, [], 'the palette is the fastest surface in a product and the one where '
    + 'the reader is looking at the box rather than the list');
});
