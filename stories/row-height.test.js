/* Rule: a file drop's row is one height in every state at any width where its
 * line fits on one, and the facts never stack into a second tier of text.
 *
 * Two halves, the shape stories/tap-zone.test.js uses and for its reason. The
 * SOURCE half runs in CI and reads the sheet. The BROWSER half is the
 * measurement: a row's height is a layout fact and JSDOM lays nothing out, so
 * every other gate here is blind to it. It is OFF unless ROW_HEIGHTS=1, because
 * Playwright is deliberately not a dependency of this package.
 *
 *   ROW_HEIGHTS=1 node --test stories/row-height.test.js
 *
 * Limits: react/dist, not the source; heights and line counts, not colour, the
 * ring or whether a truncated word reads; and nothing at all when unset.
 * why: docs/specification.md#react-file-drop
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { kitStylesheet, storySubjects, playwright } from './lib/tap-zone.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = 'src/styles/file-drop.css';
const css = readFileSync(path.join(root, SHEET), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations the browser half proves. Each one is a layout claim. */
const ruleFor = (selector) => {
  const re = new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  return re.exec(css)?.[1] ?? '';
};

test('the row declares a floor and the facts refuse to wrap', () => {
  assert.match(
    ruleFor('.ui-drop__row'), /min-height:\s*var\(--space-8\)/,
    `${SHEET}: the row carries no height floor, so a file row and a resting row are each `
    + 'whatever their own line box comes to — which is where the 3.5px step #507 found came from.',
  );
  assert.match(
    ruleFor('.ui-drop__facts'), /flex-wrap:\s*nowrap/,
    `${SHEET}: the facts group may wrap, so a long name can push the status onto a second `
    + 'line and stack two tiers of text in one block.',
  );
});

/* -- The browser half ------------------------------------------------------- */

const RUN = process.env.ROW_HEIGHTS === '1';
const WIDTHS = [1280, 390, 320];
const LINE = 24; // one line of --text-sm, with slack; two lines cannot fit under it.

/**
 * The React component's own markup, rendered from the built package.
 *
 * The bundle imports the kit by its published name, which resolves only through
 * the workspace's own alias, so a copy with those three specifiers pointed at
 * this tree is written beside it and imported from there — beside it, because a
 * copy in the temp directory cannot resolve `react` either. It is the built
 * file's own code; only the specifiers move.
 */
async function reactSubjects() {
  const { writeFileSync, rmSync } = await import('node:fs');
  const { pathToFileURL } = await import('node:url');
  const at = (rel) => JSON.stringify(pathToFileURL(path.join(root, rel)).href);
  const bundle = readFileSync(path.join(root, 'react/dist/index.js'), 'utf8')
    .replace(/(['"])@apliteni\/apliteni-ui\/motion\1/g, at('src/motion.js'))
    .replace(/(['"])@apliteni\/apliteni-ui\/inline\1/g, at('src/inline.js'))
    .replace(/(['"])@apliteni\/apliteni-ui\1/g, at('src/index.js'));
  assert.doesNotMatch(bundle, /@apliteni\/apliteni-ui/,
    'react/dist still imports the kit by a name this gate cannot resolve — a new subpath was added');
  const shim = path.join(root, 'react/dist/.row-height-subject.mjs');
  writeFileSync(shim, bundle);
  let kit;
  try {
    kit = await import(pathToFileURL(shim).href);
  } finally {
    rmSync(shim, { force: true });
  }
  const [{ createElement }, { renderToStaticMarkup }] = await Promise.all([
    import('react'), import('react-dom/server'),
  ]);
  const file = { name: 'statement-2026-08.pdf', size: '248 KB' };
  const noop = () => {};
  const states = {
    'react:at-rest': { note: 'PDF or CSV, up to 10 MB' },
    'react:uploading': { file: { ...file, status: 'uploading', progress: 40 }, onRemove: noop },
    'react:starting': { file, onRemove: noop },
    'react:done': { file: { ...file, status: 'done' }, onRemove: noop },
    'react:failed': { file: { ...file, status: 'error', error: 'Larger than 10 MB' }, onRetry: noop, onRemove: noop },
  };
  return Object.entries(states).map(([id, props]) => ({
    id, html: renderToStaticMarkup(createElement(kit.FileDrop, props)),
  }));
}

test('measured at 1280, 390 and 320', { skip: !RUN && 'set ROW_HEIGHTS=1' }, async (t) => {
  const pw = await playwright();
  assert.ok(pw, 'ROW_HEIGHTS=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');

  const { subjects: storyHtml, problems } = await storySubjects({ theme: 'light' });
  assert.deepEqual(problems, [], 'a story would not render, so its rows were never measured');
  const vanilla = storyHtml.filter((s) => s.html.includes('ui-drop__row'));
  assert.ok(vanilla.length > 0, 'no vanilla story renders a file drop row — this gate is checking nothing');

  const subjects = [...vanilla, ...(await reactSubjects())];
  const sheet = kitStylesheet() + '\n' + readFileSync(path.join(root, 'react/dist/index.css'), 'utf8');
  const browser = await pw.chromium.launch();
  const found = [];
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.setContent(
        `<!doctype html><html lang="en" data-theme="light"><head><style>html,body{margin:0;padding:0}${sheet}</style></head><body></body></html>`,
      );
      for (const s of subjects) {
        const rows = await page.evaluate(({ html }) => {
          document.body.innerHTML = html;
          return [...document.querySelectorAll('.ui-drop__row')].map((row) => {
            const facts = row.querySelector('.ui-drop__facts');
            const actions = row.querySelector('.ui-drop__actions');
            const oneLine = Boolean(facts) && Boolean(actions)
              && Math.abs(facts.getBoundingClientRect().top - actions.getBoundingClientRect().top) < 4;
            return {
              height: Math.round(row.getBoundingClientRect().height * 100) / 100,
              factsHeight: facts ? Math.round(facts.getBoundingClientRect().height * 100) / 100 : null,
              kind: facts ? 'file' : 'rest',
              oneLine: facts ? oneLine : row.getBoundingClientRect().height <= 40,
            };
          });
        }, { html: s.html });
        for (const row of rows) found.push({ width, id: s.id, ...row });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  assert.ok(found.length >= subjects.length, `measured ${found.length} rows across ${subjects.length} subjects`);
  t.diagnostic(`row-height: ${found.length} rows over ${subjects.length} subjects at ${WIDTHS.join(', ')}`);

  // The facts never stack. This is the no-second-tier rule, and it holds at
  // every width whether or not the actions are beside them.
  const stacked = found.filter((r) => r.factsHeight !== null && r.factsHeight > LINE)
    .map((r) => `${r.id} @${r.width}: facts are ${r.factsHeight}px, over one line`);
  assert.deepEqual(stacked, [], 'a file line stacked its words into a second tier');

  // One height wherever the line fits: every row that lays its content out on a
  // single line is the floor, whatever state it is in.
  const offFloor = found.filter((r) => r.oneLine && r.height !== 32)
    .map((r) => `${r.id} @${r.width}: one line but ${r.height}px, not 32`);
  assert.deepEqual(offFloor, [], 'a one-line row is not the row height every other one-line row is');

  // And at a width where everything fits, no state steps away from the others.
  const wide = found.filter((r) => r.width === 1280);
  assert.deepEqual([...new Set(wide.map((r) => r.height))], [32],
    `at 1280 the rows measure ${[...new Set(wide.map((r) => r.height))].join(', ')} — one height was the claim`);
});
