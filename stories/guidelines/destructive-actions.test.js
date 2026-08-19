/* Two rules the "Guidelines / Destructive actions" page cannot check by eye.
 *
 * The page's claim is that every specimen on it is a real kit component
 * rendered live, at the size the product renders it. Both halves of that claim
 * are invisible in the source and easy to break from a distance: a stage width
 * copied out of another file drifts when that file changes, and a page-layout
 * rule written against an element type reaches into a specimen and repaints the
 * component the page is supposed to be showing.
 *
 * It lives under stories/ on purpose: `npm test` walks src, stories, site and
 * scripts only, so a test outside those four trees passes by never running.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

const decl = (css, prop) => {
  const m = new RegExp(`${prop}:\\s*([^;}]+)`).exec(css);
  return m ? m[1].trim() : null;
};

// A CSS custom property does not travel from a descendant to its ancestor, so
// the page cannot write `var(--confirm-w)` on the element that lays the grid
// out — it has to state the width itself. Stating it and checking it here is
// the difference between a number that was copied and a number that is pinned:
// change the component's width and this fails, naming both files.
test('the specimen measure is the confirm component\'s own declared width', () => {
  const kit = decl(read('src/styles/confirm.css'), '--confirm-w');
  const page = decl(read('stories/guidelines/_layout.js'), '--gl-specimen');

  assert.equal(
    page, kit,
    '--gl-specimen in stories/guidelines/_layout.js must be the --confirm-w'
    + ' declared in src/styles/confirm.css, so the page shows the confirm at the width the'
    + ` product shows it (page: ${page}, kit: ${kit})`,
  );
});

// Strip comments, then read every selector the stylesheet declares.
const selectorsIn = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)]
  .flatMap((m) => m[1].split(','))
  .map((s) => s.trim())
  .filter(Boolean);

// The page's own layout lives in the `.gc` namespace; the `.gl` namespace is
// the specimen furniture, which is allowed inside a stage because containing an
// overlay is what it is for. So: nothing named `.gc` may match anything inside
// a specimen. `.gc h2` did, because the confirm's title is an <h2> and a
// descendant selector on a bare element type wins on specificity — the page was
// showing its own heading type where it claimed to show the component's.
test('no page-layout rule reaches inside a specimen', async () => {
  const { DestructiveActions } = await import('./DestructiveActions.stories.js');
  const { document: doc } = new JSDOM(`<body>${DestructiveActions.render()}</body>`).window;

  const css = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n');
  const pageRules = selectorsIn(css).filter((s) => /\.gc(?![\w-])|\.gc-[\w-]+/.test(s));
  assert.ok(pageRules.length > 0, 'no .gc rules found — has the page namespace been renamed?');

  const problems = [];
  for (const sel of pageRules) {
    for (const el of doc.querySelectorAll(sel)) {
      if (el.closest('.gl-stage')) {
        problems.push(`  ${sel} → matches <${el.localName} class="${el.className}"> inside a specimen`);
      }
    }
  }
  assert.equal(problems.length, 0, `\nPage layout styling live kit components:\n${problems.join('\n')}\n`);
});
