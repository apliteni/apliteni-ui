// Stylesheet manifest guard — the kit lists its stylesheets twice, and nothing
// used to make the two lists agree.
//
//   src/index.css  — an `@import` per stylesheet. This is what a bundler/browser
//                    consumer gets through the `./css` export.
//   src/inline.js  — an explicit `read('…')` per stylesheet. This is what a
//                    server-render consumer gets through `./inline`, and it is
//                    what site/build.mjs concatenates into ui.apli.tech's
//                    assets/kit.css.
//
// Two hand-maintained lists of the same thing drift, and both directions ship a
// consumer with missing CSS:
//
//   in index.css, not in inline.js  → the CDN/server-render consumer gets no
//                                     styling. empty.css sat here for two
//                                     releases; `emptyState()` reached
//                                     ui.apli.tech completely unstyled.
//   in inline.js, not in index.css  → the npm/bundler consumer gets no styling.
//
// This guard has already been needed twice: 0.4.0's changelog records the same
// omission for the aurora CSS. So the fix is not another careful edit, it is
// this test. Both lists are read from the files themselves — a hard-coded list
// here would just be a third thing to drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cssText } from '../src/inline.js';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const readSrc = (rel) => readFileSync(path.join(src, rel), 'utf8');

/** Every stylesheet `src/index.css` pulls in, in import order. */
function importsOfIndexCss() {
  const css = readSrc('index.css');
  return [...css.matchAll(/^\s*@import\s+["']\.\/([^"']+)["']/gm)].map((m) => m[1]);
}

/**
 * Every stylesheet `src/inline.js` reads, in source order. Parsed from the
 * source rather than from the module's exports because the question is what the
 * list SAYS — a file read into `styles` but forgotten in `cssText` is a
 * different defect, checked separately below.
 */
function readsOfInlineJs() {
  const js = readSrc('inline.js');
  return [...js.matchAll(/(?<![\w$])read\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
}

/**
 * Every .css file that actually exists under src/, relative to src/ — minus
 * index.css, which is the manifest rather than an entry in it.
 */
function stylesheetsOnDisk(dir = src, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return stylesheetsOnDisk(path.join(dir, entry.name), rel);
    if (rel === 'index.css') return [];
    return entry.name.endsWith('.css') ? [rel] : [];
  });
}

const indexImports = importsOfIndexCss();
const inlineReads = readsOfInlineJs();
const onDisk = stylesheetsOnDisk();

test('the guard is actually reading two non-empty lists', () => {
  // Without this, every comparison below is a comparison of two empty sets, and
  // a broken parser (or a renamed file) reads as a pass no matter what the code
  // does. The floor is on the directory scan — the one input that cannot be
  // silently emptied by a syntax change — and the other two are anchored to it
  // by the assertions that follow.
  assert.ok(
    onDisk.length >= 10,
    `only ${onDisk.length} .css files found under ${src} — the scan is looking in the ` +
      `wrong place, and every assertion in this file is vacuous.`,
  );
  assert.ok(
    indexImports.length > 0,
    'parsed no @import out of src/index.css — the parser in this test is broken, not the kit.',
  );
  assert.ok(
    inlineReads.length > 0,
    "parsed no read('…') out of src/inline.js — the parser in this test is broken, not the kit.",
  );
  for (const [list, name] of [
    [indexImports, 'src/index.css'],
    [inlineReads, 'src/inline.js'],
  ]) {
    for (const rel of list) {
      assert.ok(
        onDisk.includes(rel),
        `${name} lists ${rel}, which does not exist under src/ — either the parser is ` +
          `matching noise or the kit points at a missing file.`,
      );
    }
  }
});

test('src/index.css and src/inline.js list the same stylesheets', () => {
  const inIndex = new Set(indexImports);
  const inInline = new Set(inlineReads);

  const missingFromInline = [...inIndex].filter((rel) => !inInline.has(rel));
  const missingFromIndex = [...inInline].filter((rel) => !inIndex.has(rel));

  assert.deepEqual(
    missingFromInline,
    [],
    `src/index.css imports ${missingFromInline.join(', ')}, and src/inline.js never reads ` +
      `it. Everyone who consumes the kit through ./inline — including ui.apli.tech's ` +
      `assets/kit.css, which site/build.mjs writes straight out of cssText — gets those ` +
      `components with no CSS at all. Add read('<file>') to src/inline.js and put it in ` +
      `cssText, in the same position index.css imports it.`,
  );
  assert.deepEqual(
    missingFromIndex,
    [],
    `src/inline.js reads ${missingFromIndex.join(', ')}, and src/index.css never imports ` +
      `it. Everyone who consumes the kit through ./css — every bundler and browser build — ` +
      `gets those components with no CSS at all. Add @import to src/index.css.`,
  );
});

test('every stylesheet under src/ is in the manifest', () => {
  // The filesystem is the third list. A stylesheet that neither entry point
  // names ships to nobody, however carefully it was written.
  const listed = new Set([...indexImports, ...inlineReads]);
  const orphans = onDisk.filter((rel) => !listed.has(rel));
  assert.deepEqual(
    orphans,
    [],
    `${orphans.join(', ')} exists under src/ but neither src/index.css nor src/inline.js ` +
      `names it, so it reaches no consumer through any entry point.`,
  );
});

test("cssText carries every stylesheet, in index.css's order", () => {
  // The list in inline.js is one hop from what ships: a file can be read into
  // `styles` and still be left out of the `cssText` array. And the order is not
  // cosmetic — tokens have to land before the rules that consume them, which is
  // the cascade every component depends on.
  let previousEnd = -1;
  let previous = null;
  for (const rel of indexImports) {
    const content = readSrc(rel).trim();
    assert.ok(content.length > 0, `${rel} is empty, so finding it in cssText proves nothing.`);

    const at = cssText.indexOf(content);
    assert.notEqual(
      at,
      -1,
      `the contents of ${rel} are not in cssText, so ./inline and site/build.mjs's ` +
        `assets/kit.css ship without them.`,
    );
    assert.ok(
      at > previousEnd,
      `cssText puts ${rel} before ${previous}, but index.css imports it after — the two ` +
        `entry points would apply the same rules in a different cascade order.`,
    );
    previousEnd = at;
    previous = rel;
  }
});
