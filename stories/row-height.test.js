/* Rule: a file drop's row is a stack of one-line tiers — the name over the facts
 * over the track — and no tier takes a second line. The name gives way by
 * truncating its stem; the extension never does.
 *
 * Two halves, the shape stories/tap-zone.test.js uses and for its reason: the
 * source half reads the sheet in CI with a mutation per declaration, and the
 * browser half measures, off unless ROW_HEIGHTS=1 because Playwright is
 * deliberately not a dependency.
 *
 *   ROW_HEIGHTS=1 node --test stories/row-height.test.js
 *
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
const CSS = readFileSync(path.join(root, SHEET), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The body of one rule, by its exact selector at the start of a line. */
const ruleFor = (css, selector) =>
  new RegExp(`(?:^|\\n)${escape(selector)}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

/* -- The source half -------------------------------------------------------- */

/**
 * Every declaration the browser half depends on. Each one is a layout claim: if
 * it leaves the sheet, a measurement below changes, so each is also a mutation.
 */
const CLAIMS = [
  {
    selector: '.ui-drop__file', prop: 'display', pattern: /display:\s*grid/,
    why: 'the file is not a stack, so its tiers are whatever a flex line makes of them',
  },
  {
    selector: '.ui-drop__line', prop: 'flex-wrap', pattern: /flex-wrap:\s*nowrap/,
    why: 'the name line may wrap, so the actions can drop below the name instead of the name truncating',
  },
  {
    selector: '.ui-drop__stem', prop: 'text-overflow', pattern: /text-overflow:\s*ellipsis/,
    why: 'the name stem does not truncate, so a long name overflows the row rather than giving way',
  },
  {
    selector: '.ui-drop__stem', prop: 'white-space', pattern: /white-space:\s*nowrap/,
    why: 'the name stem may break, so a long name takes a second line',
  },
  {
    selector: '.ui-drop__ext', prop: 'flex', pattern: /flex:\s*none/,
    why: 'the extension can shrink, so a cut name stops saying what kind of file it is',
  },
  {
    selector: '.ui-drop__facts', prop: 'flex-wrap', pattern: /flex-wrap:\s*nowrap/,
    why: 'the facts tier may wrap, so the size and the status stack into a tier of their own',
  },
  {
    selector: '.ui-drop__bar', prop: 'width', pattern: /width:\s*100%/,
    why: 'the track no longer runs the row, so 40% reads as a dash instead of as progress',
  },
  {
    selector: '.ui-drop__row', prop: 'min-height', pattern: /min-height:\s*var\(--space-8\)/,
    why: 'the resting row carries no height floor, so it is whatever its own line box comes to',
  },
];

/** The claims a sheet fails. One expression, so the check and the mutations below
 *  run the same code rather than two spellings of it. */
const faults = (css) => CLAIMS
  .filter((c) => !c.pattern.test(ruleFor(css, c.selector)))
  .map((c) => `${c.selector} { ${c.prop} } — ${c.why}`);

/** The same declaration removed from that rule, and only from that rule. */
const without = (css, { selector, prop }) => {
  const body = ruleFor(css, selector);
  const stripped = body.replace(new RegExp(`\\s*${escape(prop)}\\s*:[^;}]*;?`), '');
  return css.replace(`${selector} {${body}}`, `${selector} {${stripped}}`);
};

test('the sheet declares every layout claim the browser half measures', () => {
  assert.ok(CLAIMS.length === 8, `${CLAIMS.length} claims; the count is what says one was not dropped`);
  assert.deepEqual(faults(CSS), [], `${SHEET}: a layout claim the measurement depends on is not declared`);
});

test('the gate rejects the sheet with any one claim removed', () => {
  for (const claim of CLAIMS) {
    const mutated = without(CSS, claim);
    assert.notEqual(mutated, CSS,
      `${SHEET}: the mutation for ${claim.selector} { ${claim.prop} } edits nothing — rewrite it against the current sheet`);
    assert.ok(faults(mutated).length > 0,
      `the gate passed a sheet with ${claim.selector} { ${claim.prop} } removed`);
  }
});

test('no width removes anything from the row', () => {
  // Option A needs no reflow: the name truncates for the actions, so nothing is
  // hidden, dropped or moved at a breakpoint. A container query here would be a
  // second layout the measurement below does not cover.
  assert.doesNotMatch(CSS, /@container/,
    `${SHEET}: a container query is back, so the row has a second layout this gate does not measure`);
  assert.doesNotMatch(CSS, /display:\s*none/,
    `${SHEET}: something is hidden at some width; the row's rule is that nothing leaves it`);
});

/* -- The browser half ------------------------------------------------------- */

/* Limits: react/dist, not the source; one engine, one theme; heights, widths and
   line counts, not colour, not the focus ring, not whether a truncated stem
   reads. Tier counts are a recorded table, reviewed by hand when they move. */
const RUN = process.env.ROW_HEIGHTS === '1';
const WIDTHS = [1280, 390, 320];
const LINE = 24; // one line of --text-sm, with slack; two lines cannot fit under it.

/** The name that fits no width here, which is the case the stack exists for.
 *  Long enough to be cut at 320 in both states, including the uploading one,
 *  where only the remove button shares its line. */
const LONG = 'frankfurt-settlement-statement-2026-08-final-revision-two-signed.pdf';

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
    // The two states the stack is for, with a name no width here can hold.
    'react:uploading-long': { file: { ...file, name: LONG, status: 'uploading', progress: 40 }, onRemove: noop },
    'react:failed-long': { file: { ...file, name: LONG, status: 'error', error: 'Larger than 10 MB' }, onRetry: noop, onRemove: noop },
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

  const react = await reactSubjects();
  const subjects = [...vanilla, ...react];
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
          const box = (el) => (el ? el.getBoundingClientRect() : null);
          const round = (n) => Math.round(n * 100) / 100;
          return [...document.querySelectorAll('.ui-drop__row')].map((row) => {
            const stack = row.querySelector('.ui-drop__file');
            const line = row.querySelector('.ui-drop__line');
            const facts = row.querySelector('.ui-drop__facts');
            const bar = row.querySelector('.ui-drop__bar');
            const stem = row.querySelector('.ui-drop__stem');
            const ext = row.querySelector('.ui-drop__ext');
            return {
              kind: stack ? 'file' : 'rest',
              height: round(box(row).height),
              // Every tier the stack holds, and how tall each one came out.
              tiers: stack ? [...stack.children].length : null,
              lineHeight: line ? round(box(line).height) : null,
              factsHeight: facts ? round(box(facts).height) : null,
              // The track against the stack it reports on: full width, or not.
              barWidth: bar ? round(box(bar).width) : null,
              stackWidth: stack ? round(box(stack).width) : null,
              // What the name actually got, and whether its tail survived.
              stemWidth: stem ? round(box(stem).width) : null,
              stemClipped: stem ? stem.scrollWidth > Math.ceil(box(stem).width) : null,
              extText: ext ? ext.textContent : null,
              extClipped: ext ? ext.scrollWidth > Math.ceil(box(ext).width) : null,
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

  // Coverage: every subject reached every width, or the claims below are being
  // made about a sample nobody checked. A guideline story draws several rows, so
  // the count per subject is its own, and what is asserted is that none is missing.
  const missed = subjects
    .map((s) => ({ id: s.id, widths: new Set(found.filter((r) => r.id === s.id).map((r) => r.width)) }))
    .filter((s) => s.widths.size !== WIDTHS.length)
    .map((s) => `${s.id}: measured at ${[...s.widths].join(', ') || 'no width'}`);
  assert.deepEqual(missed, [], 'a subject was not measured at all three widths');
  assert.ok(found.length >= subjects.length * WIDTHS.length,
    `measured ${found.length} rows over ${subjects.length} subjects`);
  assert.ok(found.some((r) => r.kind === 'file'), 'not one row carried a file — this gate measured nothing');
  assert.equal(react.length, 7, 'the React state count moved; the count is what says one was not dropped');
  t.diagnostic(`row-height: ${found.length} rows over ${subjects.length} subjects at ${WIDTHS.join(', ')}`);
  for (const r of found.filter((x) => x.kind === 'file')) {
    t.diagnostic(`  ${r.id} @${r.width}: ${r.height}px, ${r.tiers} tiers, name ${r.stemWidth}px`);
  }

  // No tier takes two lines. This is the whole claim: the row grows by tiers it
  // was given, never by a tier wrapping inside itself.
  const wrapped = found.flatMap((r) => [
    r.lineHeight !== null && r.lineHeight > LINE + 8 ? `${r.id} @${r.width}: the name line is ${r.lineHeight}px` : null,
    r.factsHeight !== null && r.factsHeight > LINE ? `${r.id} @${r.width}: the facts tier is ${r.factsHeight}px` : null,
  ].filter(Boolean));
  assert.deepEqual(wrapped, [], 'a tier of the file row took a second line');

  // The extension never gives way: a row cut to `frankfurt-settlement-state…`
  // has stopped saying what kind of file it is holding.
  const cutTail = found.filter((r) => r.extClipped)
    .map((r) => `${r.id} @${r.width}: the extension "${r.extText}" is clipped`);
  assert.deepEqual(cutTail, [], 'the file extension was truncated along with the stem');

  // The track reports on the row's own width, within the rounding a border-box
  // measurement leaves.
  const stubs = found.filter((r) => r.barWidth !== null && Math.abs(r.barWidth - r.stackWidth) > 1)
    .map((r) => `${r.id} @${r.width}: track ${r.barWidth}px in a ${r.stackWidth}px stack`);
  assert.deepEqual(stubs, [], 'a progress track is not the width of the row it reports on');

  // What the stack buys, measured. Two conditions narrow it to the claim: a name
  // that fits takes its own width, so the floor is asked only of a name actually
  // being cut; and it is asked only of a row at least as wide as the kit's
  // smallest panel less its padding, because a guideline specimen nests its
  // frame and panel inside Storybook's stage and is narrower than the viewport
  // it was measured at. The head this replaced gave the name 62px in a full-width
  // panel while uploading, and cut the failure message to buy it.
  const FLOOR = 150;
  const PANEL = 280; // --panel-sm (320px) less a panel's --space-4 on each side.
  const starved = found
    .filter((r) => r.stemClipped && r.stackWidth >= PANEL && r.stemWidth < FLOOR)
    .map((r) => `${r.id} @${r.width}: a truncated name got ${r.stemWidth}px of a ${r.stackWidth}px row, under the ${FLOOR}px floor`);
  assert.deepEqual(starved, [], 'a file name was cut below the floor the stack exists to hold');
  assert.ok(found.some((r) => r.stemClipped && r.stackWidth >= PANEL),
    'no truncated name was measured in a panel-width row, so the floor was asserted against nothing');
  // And the cut is real where it is claimed: a name too long for 320 truncates
  // rather than carrying the row out of the panel.
  const long = found.filter((r) => r.width === 320 && r.id.endsWith('-long'));
  assert.equal(long.length, 2, `${long.length} long-name subjects at 320, not 2`);
  assert.deepEqual(long.filter((r) => !r.stemClipped).map((r) => r.id), [],
    'a name that cannot fit 320 was not truncated, so something else gave way');

  // A resting row is still the kit's small-control row wherever its note fits
  // beside its button, so the row does not step when a file arrives on it.
  const resting = found.filter((r) => r.kind === 'rest' && r.width === 1280);
  assert.ok(resting.length > 0, 'no resting row was measured at 1280');
  assert.deepEqual([...new Set(resting.map((r) => r.height))], [32],
    `at 1280 the resting rows measure ${[...new Set(resting.map((r) => r.height))].join(', ')} — 32 was the claim`);

  // The tier counts, per state. A state that gains or loses a tier is a design
  // change, so it fails here and is reviewed by hand rather than re-recorded.
  const TIERS = {
    'react:uploading': 3, // name, size, track
    'react:uploading-long': 3,
    'react:starting': 2, // name, then the word the absent track cannot carry
    'react:done': 2,
    'react:failed': 2, // name, then the message
    'react:failed-long': 2,
  };
  for (const [id, tiers] of Object.entries(TIERS)) {
    const seen = found.filter((r) => r.id === id);
    assert.equal(seen.length, WIDTHS.length, `${id} was measured ${seen.length} times, not ${WIDTHS.length}`);
    assert.deepEqual([...new Set(seen.map((r) => r.tiers))], [tiers],
      `${id} draws ${[...new Set(seen.map((r) => r.tiers))].join(', ')} tiers, not ${tiers}`);
  }
});
