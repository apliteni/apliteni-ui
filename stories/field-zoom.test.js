// Rule: no field the kit renders is under the floor to a coarse pointer, or iOS
// Safari zooms the page into a focused field and does not zoom back out.
//
// Three claims, in the order the tests make them: the net reaches every field a
// story renders, it wins wherever it reaches, and no field is sized above the
// floor, where a flat 16px would be a shrink. Nothing is enumerated — every
// story is mounted and every text-entry control in it is a subject. Reach is
// asked of the element, with matches(); the contest is read off the declarations,
// because JSDOM's cascade does not rank !important between rules. What a green
// run does not prove is on the floor page, beside this gate's name.
//
// why: CONTRIBUTING.md#resolving-the-cascade-rather-than-reading-the-stylesheet
// why: docs/specification.md#a-field-is-16px-on-a-touch-screen

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  STYLE_FILES, substitute, tokensFor, installDomGlobals, storyFiles, selectorPath,
} from './lib/contrast.js';
import {
  FIELDS, NET, decomment, distinct, netCss, netSelector, reaches, readRepo as read,
  sizingRules, typeable,
} from './lib/field-zoom.js';
import { FIELD_MIN } from './guidelines/_accessibility-floor.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const vars = tokensFor('dark');
const kitRules = STYLE_FILES.flatMap((file) => sizingRules(substitute(read(file), vars), file));

// ---- the walk ---------------------------------------------------------------

function windowFor(css) {
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="dark"><head><style>${css}</style></head><body></body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  installDomGlobals(dom.window);
  return dom.window;
}

const serialize = (out) => {
  if (typeof out === 'string') return out;
  if (out && typeof out.outerHTML === 'string') return out.outerHTML;
  return null;
};

/**
 * Every field every story renders: whether the net reaches it, and every rule
 * that sizes it. A story's own <style> block is read as well as the kit's
 * sheets — a story sizing its demo field is a field on the page like any other.
 */
async function walk() {
  const win = windowFor(read('src/index.css').replace(/@import[^;]+;/g, ''));
  const fields = [];
  const problems = [];
  let stories = 0;

  for (const rel of storyFiles) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const where = `${rel}:${name}`;
      let out;
      try {
        out = render({ ...def.args, ...story.args }, { globals: {}, args: {} });
      } catch (err) {
        problems.push(`${where} → render threw: ${err && err.message}`);
        continue;
      }
      const html = serialize(out);
      if (html == null) {
        problems.push(`${where} → render returned ${Object.prototype.toString.call(out)}`);
        continue;
      }
      stories += 1;
      win.document.body.innerHTML = html;
      const local = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
        .flatMap((m) => sizingRules(substitute(m[1], vars), where));
      for (const el of win.document.querySelectorAll(FIELDS)) {
        if (!typeable(el)) continue;
        fields.push({
          where,
          path: selectorPath(el),
          tag: el.tagName.toLowerCase(),
          key: `${el.tagName.toLowerCase()}${[...el.classList].map((c) => `.${c}`).join('')}`,
          inNet: reaches(el, netSelector),
          sized: [...kitRules, ...local].filter((r) => reaches(el, r.selector)),
        });
      }
    }
  }
  return { fields, problems, stories };
}

const run = await walk();

// ---- the walk itself --------------------------------------------------------

test('the walk reaches the catalogue, and every story in it renders', () => {
  assert.deepEqual(run.problems, [], 'a story that will not render is a field that was never measured');
  assert.ok(run.stories > 40, `only ${run.stories} stories walked`);
});

test('the walk finds fields of all three kinds, from more than one component', () => {
  const tags = distinct(run.fields.map((f) => f.tag));
  assert.deepEqual(tags, ['input', 'select', 'textarea'], `found only ${tags.join(', ')}`);
  const keys = distinct(run.fields.map((f) => f.key));
  assert.ok(keys.length > 5, `only ${keys.length} distinct fields — the sweep has narrowed`);
});

test('every rule that sizes a field states a size this gate can read', () => {
  const unreadable = distinct(run.fields
    .flatMap((f) => f.sized)
    .filter((r) => r.px == null && !r.inherits)
    .map((r) => `${r.where} — ${r.selector} { ${r.raw} }`));
  assert.deepEqual(
    unreadable, [],
    'a field sized in something other than px. The floor is a px number, so a size in em, rem or a '
    + 'percentage cannot be compared with it here — resolve it, or state the size in px.',
  );
});

// ---- the net reaches every field --------------------------------------------

test('the net reaches every field the kit renders', () => {
  const threw = run.fields.filter((f) => f.inNet === null).map((f) => `${f.path} (${f.where})`);
  assert.deepEqual(threw, [], `the net's selector could not be matched against these fields`);
  const outside = distinct(run.fields.filter((f) => f.inNet === false)
    .map((f) => `${f.key} — ${f.path} (${f.where})`));
  assert.deepEqual(outside, [], 'a field the net does not reach zooms the page on focus');
});

test('the net takes the field to the floor, and nothing else in the kit is important', () => {
  const net = kitRules.filter((r) => r.where === NET);
  assert.equal(net.length, 1, 'the net is one declaration');
  assert.equal(net[0].px, FIELD_MIN, `the net sets ${net[0].px}px, not the ${FIELD_MIN}px floor`);
  assert.ok(net[0].important, 'without !important the net loses to every component rule that sizes a field');
  // The whole argument that the net wins: it is important, and no other rule in
  // the kit is. One more would be a contest this gate does not resolve.
  const rivals = kitRules.filter((r) => r.important && r.where !== NET)
    .map((r) => `${r.where} — ${r.selector} { ${r.raw} }`);
  assert.deepEqual(rivals, [], 'a second important font size can outrank the net, and nothing here says which wins');
});

test('no story sizes a field with an important rule of its own', () => {
  const loud = distinct(run.fields.flatMap((f) => f.sized)
    .filter((r) => r.important && r.where !== NET)
    .map((r) => `${r.where} — ${r.selector} { ${r.raw} }`));
  assert.deepEqual(loud, [], 'a story rule that can outrank the net in the preview');
});

// ---- the floor is a floor ---------------------------------------------------

// The net is flat, so a field designed ABOVE the floor would be shrunk by it —
// the one way this fix could leave a field worse than it found it.
test('no field is sized above the floor, where the net would shrink it', () => {
  const taller = distinct(run.fields.flatMap((f) => f.sized)
    .filter((r) => r.px != null && r.px > FIELD_MIN && r.where !== NET)
    .map((r) => `${r.where} — ${r.selector} { ${r.raw} }`));
  assert.deepEqual(
    taller, [],
    `a field sized above ${FIELD_MIN}px. The net is a flat size, not a floor, so it would make this `
    + 'field smaller on a touch screen than it is with a mouse. Write the net as a floor before '
    + 'shipping a field above it.',
  );
});

// The mutation that proves the case. Without the net these are the sizes a
// reader gets, and every one of them zooms the page — so a gate that stayed
// green with the net deleted would be measuring nothing but its own constant.
// why: CONTRIBUTING.md#a-rule-is-proven-by-the-mutation-that-kills-its-case
test('without the net, the kit sizes fields under the floor', () => {
  const under = distinct(run.fields.flatMap((f) => f.sized)
    .filter((r) => r.px != null && r.px < FIELD_MIN)
    .map((r) => `${r.selector} { ${r.raw} }`));
  assert.ok(
    under.length >= 4,
    `only ${under.length} rules size a field under ${FIELD_MIN}px: ${under.join(', ')}. If the kit `
    + 'really has no small field left, the net is holding nothing and this gate is measuring its '
    + 'own constant — say so here rather than leaving the claim standing.',
  );
});

// ---- the net's own file -----------------------------------------------------

test('the net is one rule, inside one (pointer: coarse) block', () => {
  const blocks = [...netCss.matchAll(/@media([^{]*)\{/g)].map((m) => m[1].trim());
  assert.deepEqual(blocks, ['(pointer: coarse)'], 'the net is one block, and it is the coarse one');
  const bodies = [...netCss.matchAll(/\{([^{}]*)\}/g)]
    .map((m) => m[1].trim().replace(/;$/, ''))
    .filter(Boolean);
  assert.deepEqual(bodies, [`font-size: ${FIELD_MIN}px !important`], 'the net does one thing, once');
});

test('the net is written over elements, and names no component', () => {
  assert.doesNotMatch(netCss, /\.ui-/, 'a net written over kit classes needs an edit per component');
  for (const tag of ['input', 'select', 'textarea']) {
    assert.match(netSelector, new RegExp(`(^|[\\s,])${tag}\\b`), `the net does not reach ${tag}`);
  }
});

// One question, one answer. #291 sized the dropdown's search field on that
// component's own sheet and #294 replaced it with the net; a second coarse block
// anywhere in the kit is that split coming back.
test('no other kit stylesheet answers (pointer: coarse)', () => {
  const elsewhere = STYLE_FILES
    .filter((f) => f !== NET)
    .filter((f) => /pointer\s*:\s*coarse/.test(decomment(read(f))));
  assert.deepEqual(elsewhere, [], 'a second touch rule outside the net');
});

// Both published stylesheets carry the net, the way both carry the
// reduced-motion one: a consumer who takes only the React sheet is not left
// zooming.
test('both published stylesheets import the net', () => {
  assert.match(read('src/index.css'), /@import\s+"\.\/styles\/field-zoom\.css"/, 'src/index.css');
  assert.match(read('react/src/index.ts'), /import '\.\.\/\.\.\/src\/styles\/field-zoom\.css'/, 'react/src/index.ts');
});

// The sizes above are resolved through one theme's tokens. This is what lets
// them be: the type scale is declared once, at :root, and no theme re-points it.
test('the type scale is the same in both themes, so one resolution answers for both', () => {
  const [dark, light] = [tokensFor('dark'), tokensFor('light')];
  const sizes = [...dark.keys()].filter((name) => name.startsWith('--text-'));
  assert.ok(sizes.length >= 5, `only ${sizes.length} type tokens found`);
  const differ = sizes.filter((name) => dark.get(name) !== light.get(name));
  assert.deepEqual(differ, [], 'a type token that changes with the theme — this gate would have to read both');
});
