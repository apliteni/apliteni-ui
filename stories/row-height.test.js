/* Rule: a file drop's row is a stack of one-line tiers — the name over the facts
 * over the track — and no tier takes a second line. The name gives way by
 * truncating its stem; the extension never does.
 *
 * Two halves, the shape stories/tap-zone.test.js uses: the source half reads the
 * sheet in CI with a mutation per declaration and holds the shortfall ledger,
 * and the browser half measures, off unless ROW_HEIGHTS=1 because Playwright is
 * deliberately not a dependency. That half loads IBM Plex Sans and measures in
 * both containers the kit documents a row into; #566's review found it doing
 * neither, and a name line is as wide as the font drawing it.
 *
 *   ROW_HEIGHTS=1 node --test stories/row-height.test.js
 *
 * why: docs/components.md#react-file-drop
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

/* -- The measured shortfall ------------------------------------------------- */

/* The rows that fall short of the 150px floor, with the width each one measured.
 * No second floor has been chosen, so a measurement with its cause beside it
 * stands in for one — the shape stories/contrast.test.js uses for an accepted
 * contrast failure.
 *
 * TODO(#566): Artur decides what a failed upload's name may be cut to in a
 * narrow panel, and nothing here anticipates him. The gate fails if a row loses
 * another pixel, leaves this list or joins it. Do not raise a number to re-green
 * a regression. Written by hand; there is no regenerator.
 */
const SHORTFALLS = [
  {
    id: 'A',
    count: 4,
    rows: {
      'react:failed-long panel@360': 127,
      'react:failed-long plain@320': 119,
      'react:failed-long panel@320': 87,
      'react:failed panel@320': 87,
    },
    why: 'A failed upload carries Retry and Remove on the name\'s line, and what the stem gets is '
      + 'the line less those two buttons with the space between them (165px), less the extension, '
      + 'which is 24px and will not shrink, less the name\'s own gap (12px). The 150px floor '
      + 'therefore needs a 351px line, which 1280 and 390 have and the four rows above do not: a '
      + 'panel at 360 gives 328, a plain row at 320 gives 320, and a panel at 320 gives 288. '
      + 'Reaching the floor means wrapping the actions under the name, which is the layout #541 '
      + 'rejected, or dropping Remove\'s word, which is what #566 rejected, because `x` is the '
      + 'kit\'s glyph for close and dismiss and taking a file off a row is neither. The last row '
      + 'is the one to read twice: its name is `statement-2026-08.pdf` and not a long one at all, '
      + 'so in a panel at 320 an ordinary failed upload is cut too. Limitation: those rows show '
      + 'eleven to eighteen characters of the stem, so the reader identifies the file by its '
      + 'extension and by the `title` the markup carries rather than by what is on screen. Every '
      + 'other row, container and width clears the floor, and the extension is never cut anywhere.',
  },
];

/** The cell a measured row was taken in: subject, container and width together,
 *  because the same subject gets a different line in each. */
const cellOf = (row) => `${row.id} ${row.container}@${row.width}`;

/** The ledger entry a shortfall falls in, or none. Kept apart from the measuring
 *  so the matching is testable without a browser. */
export const bucketFor = (row, ledger = SHORTFALLS) =>
  ledger.find((e) => cellOf(row) in e.rows) ?? null;

/** Every shortfall the ledger does not account for, and every way an accounted
 *  one has moved. One expression, so the gate and the test below run the same code. */
export const ledgerFaults = (shortfalls, ledger = SHORTFALLS) => {
  const out = [];
  const hits = new Map();
  for (const row of shortfalls) {
    const cell = cellOf(row);
    const entry = bucketFor(row, ledger);
    if (!entry) {
      out.push(`${cell}: a truncated name got ${row.stemWidth}px beside ${row.wordedActions} `
        + 'worded action(s) and no ledger entry accounts for it');
      continue;
    }
    hits.set(cell, (hits.get(cell) ?? 0) + 1);
    if (row.stemWidth < entry.rows[cell]) {
      out.push(`${cell} fell to ${row.stemWidth}px; shortfall ${entry.id} recorded `
        + `${entry.rows[cell]}px. Explain the cause by hand before moving the number`);
    }
  }
  for (const entry of ledger) {
    const cells = Object.keys(entry.rows);
    if (cells.length !== entry.count) {
      out.push(`shortfall ${entry.id} records ${cells.length} row(s); its count says ${entry.count}`);
    }
    for (const cell of cells) {
      const n = hits.get(cell) ?? 0;
      if (n !== 1) {
        out.push(`shortfall ${entry.id} records ${cell}, which ${n} measured row(s) matched. `
          + 'It accounts for one row per cell: a cell that stopped falling short leaves the ledger');
      }
    }
  }
  return out;
};

test('the shortfall ledger is not empty and every entry carries a hand-written why', () => {
  assert.ok(SHORTFALLS.length >= 1, 'an emptied ledger would make the gate below vacuous');
  for (const e of SHORTFALLS) {
    assert.ok(typeof e.why === 'string' && e.why.trim().length > 0,
      `shortfall ${e.id}: explain the cause and the accepted limitation in why`);
    for (const [cell, px] of Object.entries(e.rows)) {
      assert.doesNotMatch(e.why, new RegExp(`\\b${px}\\s*px`),
        `shortfall ${e.id}'s why quotes ${px}px, the width it records for ${cell}. A measured `
        + 'width lives in `rows`, which is asserted, so a prose copy of it cannot drift');
    }
  }
});

test('the shortfall ledger rejects a row it does not account for', () => {
  const entry = { id: 'T', count: 1, rows: { 'x:one panel@320': 80 }, why: 'test' };
  const held = { id: 'x:one', container: 'panel', width: 320, stemWidth: 80, wordedActions: 2 };
  assert.deepEqual(ledgerFaults([held], [entry]), [], 'the ledger rejected the row it records');
  // A row in another container, at another width, or from another subject is a
  // different case and has to be explained before it passes.
  for (const moved of [{ container: 'plain' }, { width: 390 }, { id: 'x:two' }]) {
    assert.ok(ledgerFaults([{ ...held, ...moved }], [entry]).length > 0,
      `the ledger accounted for a row moved by ${Object.keys(moved)[0]}`);
  }
  // A row that got worse, a recorded cell nothing reached, a cell two rows
  // reached, and an entry whose count no longer matches what it lists.
  assert.ok(ledgerFaults([{ ...held, stemWidth: 79 }], [entry]).length > 0,
    'the ledger passed a row below the width it recorded');
  assert.ok(ledgerFaults([], [entry]).length > 0, 'the ledger passed a cell that matched nothing');
  assert.ok(ledgerFaults([held, held], [entry]).length > 0,
    'the ledger passed two rows in a cell it accounts for once');
  assert.ok(ledgerFaults([held], [{ ...entry, count: 2 }]).length > 0,
    'the ledger passed an entry that lists fewer rows than it counts');
  // And the real ledger's own arithmetic holds: its count is what it lists.
  for (const e of SHORTFALLS) {
    assert.equal(Object.keys(e.rows).length, e.count,
      `shortfall ${e.id} lists ${Object.keys(e.rows).length} rows and counts ${e.count}`);
  }
});

/* -- The browser half ------------------------------------------------------- */

/* Limits: react/dist, not the source; one engine, one theme; heights, widths and
   line counts, not colour, not the focus ring, not whether a truncated stem
   reads. Tier counts are a recorded table, reviewed by hand when they move. */
const RUN = process.env.ROW_HEIGHTS === '1';
const WIDTHS = [1280, 390, 360, 320];
const LINE = 24; // one line of --text-sm, with slack; two lines cannot fit under it.

/* The kit ships CSS and no fonts, so a family only exists on a page because
 * something on that page asked for it — the rule scripts/font-loading.test.js
 * holds over every other page in this tree. This one asked for nothing until
 * #566's review measured it: every width below was taken in whatever the engine
 * falls back to, and a name line is exactly as wide as the font drawing it. This
 * is the URL README.md tells a consumer to load, so the browser half needs the
 * network as well as a Playwright, and says so when it has neither. */
const FONTS = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700'
  + '&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap';
const SANS = 'IBM Plex Sans';

/* The containers the kit documents a row into. Both are measured at every width,
 * because the row is the same layout in each and only the line it gets is
 * different — and the line is what the name is cut to.
 *
 * `plain` is the row given the whole block, which is what a consumer gets by
 * dropping it into a page column. `panel` is the panel the specimens draw:
 * .gf-panel in stories/guidelines/_file-drop.js, --space-4 of inset on each
 * side, the same inset .ui-app__main takes at the phone step. The narrowest
 * panel the kit names is --panel-sm, 320px, so the panel row at 320 here — 288px
 * — is also the line a 320px panel gives at any viewport. */
const CONTAINERS = [
  { id: 'plain', frame: (html) => html },
  { id: 'panel', frame: (html) => `<div class="rh-panel">${html}</div>` },
];
const PANEL_CSS = '.rh-panel { padding: var(--space-4); background: var(--surface);'
  + ' border-radius: var(--radius-md); box-shadow: inset 0 0 0 1px var(--border); }';

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

test('measured at 1280, 390, 360 and 320, in a plain row and in a panel', { skip: !RUN && 'set ROW_HEIGHTS=1' }, async (t) => {
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
  const fonts = [];
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.setContent(
        `<!doctype html><html lang="en" data-theme="light"><head>`
        + `<link rel="stylesheet" href="${FONTS}">`
        + `<style>html,body{margin:0;padding:0}${sheet}${PANEL_CSS}</style>`
        + `</head><body></body></html>`,
        { waitUntil: 'load' },
      );

      // The font, once per context, because a name line is exactly as wide as
      // the typeface drawing it and every width below is of one typeface or
      // another. The faces are discovered off a rendered row rather than listed,
      // so a tier that changes size or weight is asked about without an edit.
      fonts.push({
        width,
        ...await page.evaluate(async ({ html, sans }) => {
          document.body.innerHTML = html;
          const faces = [...new Set([...document.querySelectorAll('.ui-drop__row, .ui-drop__row *')]
            .map((el) => {
              const cs = getComputedStyle(el);
              return `${cs.fontWeight} ${cs.fontSize}`;
            }))];
          await Promise.all(faces.map((f) => document.fonts.load(`${f} "${sans}"`).catch(() => {})));
          await document.fonts.ready;
          // Not document.fonts.check: it answers true when NO face matches the
          // family at all, which is exactly the state this has to catch. What
          // arrived is what the font set holds, so that is what is read.
          const arrived = new Set([...document.fonts]
            .filter((f) => f.family === sans && f.status === 'loaded')
            .map((f) => String(parseInt(f.weight, 10))));
          const missing = faces.filter((f) => !arrived.has(String(parseInt(f, 10))));
          // And the row is being drawn in it: one string in the token's own
          // stack is not the width it is in that stack without its first family.
          const probe = document.createElement('span');
          probe.textContent = 'frankfurt-settlement-statement-2026-08';
          probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;'
            + 'font-size:13px;font-weight:500';
          probe.style.fontFamily = getComputedStyle(document.documentElement)
            .getPropertyValue('--font-sans');
          document.body.appendChild(probe);
          const drawn = probe.getBoundingClientRect().width;
          probe.style.fontFamily = 'sans-serif';
          const fallback = probe.getBoundingClientRect().width;
          probe.remove();
          return { faces, missing, drawn: Math.round(drawn), fallback: Math.round(fallback) };
        }, { html: react.find((s) => s.id === 'react:failed-long').html, sans: SANS }),
      });

      for (const container of CONTAINERS) {
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
              const acts = row.querySelector('.ui-drop__actions');
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
                extWidth: ext ? round(box(ext).width) : null,
                extClipped: ext ? ext.scrollWidth > Math.ceil(box(ext).width) : null,
                // What the name is sharing its line with. A button carrying words
                // is several times the width of a wordless one, and the floor
                // below is what is left of the line after them.
                wordedActions: acts
                  ? [...acts.children].filter((b) => /[A-Za-z]{2,}/.test(b.textContent || '')).length : 0,
                actionsWidth: acts ? round(box(acts).width) : null,
              };
            });
          }, { html: container.frame(s.html) });
          for (const row of rows) found.push({ width, container: container.id, id: s.id, ...row });
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  // The font the tokens name, at every weight the row paints it at, and actually
  // drawing the row. A width taken without it is a width of some other typeface,
  // so this comes before every claim below.
  assert.equal(fonts.length, WIDTHS.length, 'a context was never asked which fonts it had');
  const unloaded = fonts.flatMap((f) => f.missing.map((face) => `@${f.width}: no ${SANS} for ${face}`));
  assert.deepEqual(unloaded, [],
    `${SANS} did not load, so every width below would be of the fallback font. This half needs the `
    + `network for ${FONTS}`);
  const substituted = fonts.filter((f) => f.drawn === f.fallback)
    .map((f) => `@${f.width}: --font-sans and a bare sans-serif both draw the probe at ${f.drawn}px`);
  assert.deepEqual(substituted, [],
    `${SANS} loaded but is not what --font-sans resolves to, so the widths below are the fallback's`);
  t.diagnostic(`fonts: ${SANS} at ${[...new Set(fonts.flatMap((f) => f.faces))].join(', ')}; `
    + `probe ${fonts[0].drawn}px in --font-sans against ${fonts[0].fallback}px in sans-serif`);

  // Coverage: every subject reached every width in every container, or the
  // claims below are being made about a sample nobody checked. A guideline story
  // draws several rows, so the count per subject is its own, and what is
  // asserted is that none is missing.
  const cells = WIDTHS.flatMap((w) => CONTAINERS.map((c) => `${c.id}@${w}`));
  const missed = subjects
    .map((s) => ({
      id: s.id,
      cells: new Set(found.filter((r) => r.id === s.id).map((r) => `${r.container}@${r.width}`)),
    }))
    .filter((s) => s.cells.size !== cells.length)
    .map((s) => `${s.id}: measured in ${[...s.cells].join(', ') || 'no container'}`);
  assert.deepEqual(missed, [], `a subject was not measured in all ${cells.length} container/width cells`);
  assert.ok(found.length >= subjects.length * cells.length,
    `measured ${found.length} rows over ${subjects.length} subjects`);
  assert.ok(found.some((r) => r.kind === 'file'), 'not one row carried a file — this gate measured nothing');
  assert.equal(react.length, 7, 'the React state count moved; the count is what says one was not dropped');
  assert.equal(CONTAINERS.length, 2, 'a documented container was dropped; the count is what says so');
  t.diagnostic(`row-height: ${found.length} rows over ${subjects.length} subjects, `
    + `${CONTAINERS.map((c) => c.id).join('/')} at ${WIDTHS.join(', ')}, with ${SANS} loaded`);
  for (const r of found.filter((x) => x.kind === 'file')) {
    t.diagnostic(`  ${r.id} ${r.container}@${r.width}: ${r.height}px, ${r.tiers} tiers, row ${r.stackWidth}px, `
      + `name ${r.stemWidth}px${r.stemClipped ? ' (cut)' : ''}, ext ${r.extWidth}px, `
      + `${r.wordedActions} worded action(s) in ${r.actionsWidth}px`);
  }
  for (const width of WIDTHS) {
    for (const c of CONTAINERS) {
      const rest = [...new Set(found
        .filter((r) => r.kind === 'rest' && r.width === width && r.container === c.id)
        .map((r) => r.height))];
      t.diagnostic(`  resting ${c.id}@${width}: ${rest.join(', ')}px`);
    }
  }

  // No tier takes two lines. This is the whole claim: the row grows by tiers it
  // was given, never by a tier wrapping inside itself.
  const wrapped = found.flatMap((r) => [
    r.lineHeight !== null && r.lineHeight > LINE + 8 ? `${r.id} ${r.container}@${r.width}: the name line is ${r.lineHeight}px` : null,
    r.factsHeight !== null && r.factsHeight > LINE ? `${r.id} ${r.container}@${r.width}: the facts tier is ${r.factsHeight}px` : null,
  ].filter(Boolean));
  assert.deepEqual(wrapped, [], 'a tier of the file row took a second line');

  // The extension never gives way: a row cut to `frankfurt-settlement-state…`
  // has stopped saying what kind of file it is holding.
  const cutTail = found.filter((r) => r.extClipped)
    .map((r) => `${r.id} ${r.container}@${r.width}: the extension "${r.extText}" is clipped`);
  assert.deepEqual(cutTail, [], 'the file extension was truncated along with the stem');

  // The track reports on the row's own width, within the rounding a border-box
  // measurement leaves.
  const stubs = found.filter((r) => r.barWidth !== null && Math.abs(r.barWidth - r.stackWidth) > 1)
    .map((r) => `${r.id} ${r.container}@${r.width}: track ${r.barWidth}px in a ${r.stackWidth}px stack`);
  assert.deepEqual(stubs, [], 'a progress track is not the width of the row it reports on');

  // What the stack buys, measured. Two conditions narrow it to the claim: a name
  // that fits takes its own width, so the floor is asked only of a name actually
  // being cut; and it is asked only of a row at least as wide as the kit's
  // smallest panel less its padding, because a guideline specimen nests its
  // frame and panel inside Storybook's stage and is narrower than any container
  // measured here.
  //
  // One floor, and it is the one that holds: 150px for a name being cut beside
  // at most one worded action. A row carrying two does not reach it and cannot —
  // the arithmetic is in SHORTFALLS above — so those rows are held to what they
  // measure, by that ledger, until #566 decides what they are owed.
  const FLOOR = 150;
  const PANEL = 280; // --panel-sm (320px) less a panel's --space-4 on each side.
  const cut = found.filter((r) => r.stemClipped && r.stackWidth >= PANEL);
  const starved = cut
    .filter((r) => r.wordedActions < 2 && r.stemWidth < FLOOR)
    .map((r) => `${r.id} ${r.container}@${r.width}: a truncated name got ${r.stemWidth}px of a `
      + `${r.stackWidth}px row beside ${r.wordedActions} worded action(s), under the ${FLOOR}px floor`);
  assert.deepEqual(starved, [], 'a file name was cut below the floor the stack exists to hold');
  // The floor has to be asked of something, or it is dead.
  assert.ok(cut.some((r) => r.wordedActions < 2),
    `no truncated name was measured in a panel-width row with one worded action, so the ${FLOOR}px `
    + 'floor was asserted against nothing');

  // And every two-action row that falls short is one the ledger already explains,
  // at the width it recorded. A new one, a wider spread, or another pixel lost
  // fails here rather than being re-recorded.
  const shortfalls = cut.filter((r) => r.wordedActions >= 2 && r.stemWidth < FLOOR);
  assert.deepEqual(ledgerFaults(shortfalls), [],
    'the measured shortfall moved; read SHORTFALLS and explain the cause by hand');
  assert.ok(shortfalls.length > 0,
    `every two-action row now clears ${FLOOR}px — empty SHORTFALLS and close #566 with one floor`);

  // And the cut is real where it is claimed: a name too long for 320 truncates
  // rather than carrying the row out of the panel.
  const long = found.filter((r) => r.width === 320 && r.id.endsWith('-long'));
  assert.equal(long.length, 2 * CONTAINERS.length, `${long.length} long-name rows at 320, not ${2 * CONTAINERS.length}`);
  assert.deepEqual(long.filter((r) => !r.stemClipped).map((r) => `${r.id} in the ${r.container}`), [],
    'a name that cannot fit 320 was not truncated, so something else gave way');

  // A resting row is still the kit's small-control row wherever its note fits
  // beside its button, so the row does not step when a file arrives on it.
  const resting = found.filter((r) => r.kind === 'rest' && r.width === 1280);
  assert.ok(resting.length > 0, 'no resting row was measured at 1280');
  assert.deepEqual([...new Set(resting.map((r) => r.height))], [32],
    `at 1280 the resting rows measure ${[...new Set(resting.map((r) => r.height))].join(', ')} — 32 was the claim`);

  // The tiers and the height, per state, and the same in every container at
  // every width — which is what one layout at every width means. A state that
  // gains or loses a tier, or changes height, is a design change, so it fails
  // here and is reviewed by hand rather than re-recorded. The heights are the
  // ones docs/components.md publishes; they moved in #566 when this half
  // started loading the font, because a tier is as tall as its own line box.
  const STATES = {
    'react:uploading': { tiers: 3, height: 69.55 }, // name, size, track
    'react:uploading-long': { tiers: 3, height: 69.55 },
    'react:starting': { tiers: 2, height: 55.55 }, // name, then the word the absent track cannot carry
    'react:done': { tiers: 2, height: 55.55 },
    'react:failed': { tiers: 2, height: 59.05 }, // name, then the message
    'react:failed-long': { tiers: 2, height: 59.05 },
  };
  for (const [id, { tiers, height }] of Object.entries(STATES)) {
    const seen = found.filter((r) => r.id === id);
    assert.equal(seen.length, cells.length, `${id} was measured ${seen.length} times, not ${cells.length}`);
    assert.deepEqual([...new Set(seen.map((r) => r.tiers))], [tiers],
      `${id} draws ${[...new Set(seen.map((r) => r.tiers))].join(', ')} tiers, not ${tiers}`);
    assert.deepEqual([...new Set(seen.map((r) => r.height))], [height],
      `${id} measures ${[...new Set(seen.map((r) => r.height))].join(', ')}px — ${height} was the claim`);
  }
});
