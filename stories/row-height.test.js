/* Rule: a file drop's row keeps the resting row's height when a file arrives.
 * The name, the size and the status or the track stand on one line, and the
 * actions end it. The name gives way first by truncating its stem; the
 * extension never does. At a row of 352px or less the size leaves the line. A
 * refused file's reason stands on the name's line, and moves under the name
 * only when the line is full.
 *
 * Two halves, the shape stories/tap-zone.test.js uses: the source half reads the
 * sheet in CI with a mutation per declaration, and the browser half measures,
 * off unless ROW_HEIGHTS=1 because Playwright is deliberately not a dependency.
 * That half loads IBM Plex Sans and measures in both containers the kit
 * documents a row into, because a name line is as wide as the font drawing it.
 * It also measures every file drop story where Storybook draws it, in a card
 * that sizes to its content.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_CHROME=… ROW_HEIGHTS=1 node --test stories/row-height.test.js
 *
 * why: docs/components.md#react-file-drop
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { env } from 'node:process';
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
    selector: '.ui-drop__row', prop: 'min-height', pattern: /min-height:\s*var\(--space-8\)/,
    why: 'the row carries no height floor, so it is whatever its own line box comes to',
  },
  {
    selector: '.ui-drop__row', prop: 'container-type', pattern: /container-type:\s*inline-size/,
    why: 'the row is no size container, so the size query reads nothing and the size never leaves a narrow row',
  },
  {
    selector: '.ui-drop__row', prop: 'contain-intrinsic-inline-size', pattern: /contain-intrinsic-inline-size:\s*var\(--panel-md\)/,
    why: 'the size container gives the row no width of its own, so a parent that sizes to its content collapses it to 0px',
  },
  {
    selector: '.ui-drop:not(.ui-drop--area)', prop: 'grid-template-columns', pattern: /grid-template-columns:\s*minmax\(0, 1fr\)/,
    why: 'the row cannot ask for less than its stated width, so a parent with less room than that overflows',
  },
  {
    selector: '.ui-drop__file', prop: 'align-items', pattern: /align-items:\s*flex-start/,
    why: 'the actions centre on a refused row of two lines instead of closing the name\'s line',
  },
  {
    selector: '.ui-drop__line', prop: 'flex-wrap', pattern: /flex-wrap:\s*nowrap/,
    why: 'the name\'s line may wrap while the file uploads, so the size or the track drops under the name',
  },
  {
    selector: '.ui-drop__file--failed .ui-drop__line', prop: 'flex-wrap', pattern: /flex-wrap:\s*wrap/,
    why: 'a refused file\'s reason cannot move under the name, so a full line cuts the reason instead',
  },
  {
    selector: '.ui-drop__name', prop: 'flex', pattern: /flex:\s*0 999 auto/,
    why: 'the name no longer gives way first, so the status word or the track is cut before the name',
  },
  {
    selector: '.ui-drop__name', prop: 'min-height', pattern: /min-height:\s*var\(--space-8\)/,
    why: 'the name\'s line is shorter than the actions, so a reason under the name sits beside them',
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
    selector: '.ui-drop__state', prop: 'flex', pattern: /flex:\s*none/,
    why: 'the status word shrinks beside the name, so it is cut while the name still has room to give',
  },
  {
    selector: '.ui-drop__file--failed .ui-drop__state', prop: 'max-width', pattern: /max-width:\s*100cqw/,
    why: 'a reason under the name keeps the name\'s narrow column, so it is cut under empty room',
  },
  {
    selector: '.ui-drop__bar', prop: 'flex', pattern: /flex:\s*1 1 0/,
    why: 'the track no longer fills the free room on the line',
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
  const stripped = body.replace(new RegExp(`(^|;)\\s*${escape(prop)}\\s*:[^;}]*;?`), '$1');
  return css.replace(`${selector} {${body}}`, `${selector} {${stripped}}`);
};

test('the sheet declares every layout claim the browser half measures', () => {
  assert.ok(CLAIMS.length === 15, `${CLAIMS.length} claims; the count is what says one was not dropped`);
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

/** Every container query in a sheet: its condition, its selector and its body. */
const queries = (css) => [...css.matchAll(/@container\s*([^{]*)\{\s*([^{]*)\{([^}]*)\}\s*\}/g)]
  .map(([, when, selector, body]) => ({ when: when.trim(), selector: selector.trim(), body }));

/** What a sheet removes from the row at some width, as faults. */
const narrowFaults = (css) => {
  const out = [];
  const found = queries(css);
  const sizeQuery = found.filter((q) => q.when === '(width <= 352px)' && q.selector === '.ui-drop__size');
  if (sizeQuery.length !== 1) out.push('the size does not leave a row of 352px or less');
  else if (!/clip-path:\s*inset\(50%\)/.test(sizeQuery[0].body)) out.push('the size leaves the screen reader as well as the line');
  for (const q of found.filter((x) => !sizeQuery.includes(x))) out.push(`${q.when} also changes ${q.selector}`);
  if (/display:\s*none/.test(css)) out.push('something is hidden with display: none');
  return out;
};

test('only the size leaves the line, and only at a row of 352px or less', () => {
  // One query, on the row's own width, and it hides the size from sight only.
  // Any other query would be a layout the measurement below does not cover.
  assert.deepEqual(narrowFaults(CSS), [], `${SHEET}: the narrow row changed`);
  const query = CSS.slice(CSS.indexOf('@container'));
  const block = query.slice(0, query.indexOf('}\n}') + 3);
  assert.ok(narrowFaults(CSS.replace(block, '')).length > 0, 'the gate passed a sheet with the size query removed');
  assert.ok(narrowFaults(CSS.replace('(width <= 352px)', '(width <= 400px)')).length > 0,
    'the gate passed a size query at another width');
  assert.ok(narrowFaults(CSS.replace('clip-path: inset(50%);', 'display: none;')).length > 0,
    'the gate passed a size hidden from a screen reader');
  assert.ok(narrowFaults(`${CSS}\n@container (width <= 352px) {\n  .ui-drop__word { display: none; }\n}\n`).length > 0,
    'the gate passed a second thing leaving the narrow row');
});

/* -- The browser half ------------------------------------------------------- */

/* Limits: react/dist, not the source; one engine, one theme, a mouse pointer, so
   the touch tap zones are stories/tap-zone.test.js's; heights, widths and
   positions, not colour, not the focus ring, not whether a truncated stem reads.
   Heights are a recorded table, reviewed by hand when they move. */
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

/** The name that fits no width here. Long enough to be cut at 320 in both
 *  states, including the uploading one, where only Remove shares its line. */
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
    'react:disabled-file': { file: { ...file, status: 'uploading', progress: 40 }, onRemove: noop, disabled: true },
    // The two states that cut the name, with a name no width here can hold.
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
  const fileDrop = storyHtml.filter((s) => s.html.includes('ui-drop__row'));
  assert.ok(fileDrop.length > 0, 'no story renders a file drop row — this gate is checking nothing');

  const react = await reactSubjects();
  const subjects = [...fileDrop, ...react];
  const sheet = kitStylesheet() + '\n' + readFileSync(path.join(root, 'react/dist/index.css'), 'utf8');
  const browser = await pw.chromium.launch({ executablePath: env.UI_CHROME });
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
              const file = row.querySelector('.ui-drop__file');
              const name = row.querySelector('.ui-drop__name');
              const stem = row.querySelector('.ui-drop__stem');
              const ext = row.querySelector('.ui-drop__ext');
              const size = row.querySelector('.ui-drop__size');
              const state = row.querySelector('.ui-drop__state');
              const word = row.querySelector('.ui-drop__word');
              const bar = row.querySelector('.ui-drop__bar');
              const acts = row.querySelector('.ui-drop__actions');
              const r = box(row);
              return {
                kind: file ? 'file' : 'rest',
                failed: Boolean(file?.classList.contains('ui-drop__file--failed')),
                height: round(r.height),
                rowWidth: round(r.width),
                nameWidth: name ? round(box(name).width) : null,
                stemClipped: stem ? stem.scrollWidth > Math.ceil(box(stem).width) : null,
                extText: ext ? ext.textContent : null,
                extClipped: ext ? ext.scrollWidth > Math.ceil(box(ext).width) : null,
                // A size that left the line is one pixel wide, for a screen reader.
                sizeShown: size ? box(size).width > 1 : null,
                // The status or the reason: on the name's line, or under it.
                stateUnder: state && name ? box(state).top >= box(name).bottom : null,
                stateRight: state ? round(box(state).right) : null,
                wordClipped: word ? word.scrollWidth > word.clientWidth : null,
                // The track against the room the line leaves it.
                barWidth: bar ? round(box(bar).width) : null,
                barGap: bar && acts ? round(box(acts).left - box(bar).right) : null,
                actsLeft: acts ? round(box(acts).left) : null,
                actsGap: acts ? round(r.right - box(acts).right) : null,
                actsTop: acts ? round(box(acts).top - r.top) : null,
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
  assert.equal(react.length, 8, 'the React state count moved; the count is what says one was not dropped');
  assert.equal(CONTAINERS.length, 2, 'a documented container was dropped; the count is what says so');
  t.diagnostic(`row-height: ${found.length} rows over ${subjects.length} subjects, `
    + `${CONTAINERS.map((c) => c.id).join('/')} at ${WIDTHS.join(', ')}, with ${SANS} loaded`);
  const files = found.filter((x) => x.kind === 'file');
  for (const r of files.filter((x) => x.id.startsWith('react:'))) {
    t.diagnostic(`  ${r.id} ${r.container}@${r.width}: ${r.height}px, row ${r.rowWidth}px, `
      + `name ${r.nameWidth}px${r.stemClipped ? ' (cut)' : ''}, size ${r.sizeShown ?? '-'}, `
      + `reason under ${r.stateUnder ?? '-'}, track ${r.barWidth ?? '-'}px`);
  }

  // The resting row's height, in every state but a refused one, in every
  // container at every width: a file arriving, uploading and landing moves
  // nothing under the row. A resting row whose note wraps under its button is
  // taller, and the file row is not asked to match it.
  const ROW = 32;
  const moved = files.filter((r) => !r.failed && r.height !== ROW)
    .map((r) => `${r.id} ${r.container}@${r.width}: ${r.height}px`);
  assert.deepEqual(moved, [], `a file row is not the resting row's ${ROW}px`);
  const resting = found.filter((r) => r.kind === 'rest' && r.width === 1280);
  assert.ok(resting.length > 0, 'no resting row was measured at 1280');
  assert.deepEqual([...new Set(resting.map((r) => r.height))], [ROW],
    `at 1280 the resting rows measure ${[...new Set(resting.map((r) => r.height))].join(', ')} — ${ROW} was the claim`);

  // A refused row is the resting row's height while its reason stands on the
  // name's line, and one reason line taller when the reason moves under the name.
  // The taller row only ever holds a reason under the name.
  const UNDER = 61.05;
  const refused = files.filter((r) => r.failed && r.stateUnder !== null);
  assert.ok(refused.some((r) => r.stateUnder) && refused.some((r) => !r.stateUnder),
    'no refused row was measured both with the reason on the line and under it');
  const wrong = refused.filter((r) => r.height !== (r.stateUnder ? UNDER : ROW))
    .map((r) => `${r.id} ${r.container}@${r.width}: ${r.height}px with the reason ${r.stateUnder ? 'under' : 'on'} the line`);
  assert.deepEqual(wrong, [], 'a refused row is not the height its reason\'s place gives it');

  // The reason moves under the name only when the line is full: a reason under
  // the name would not have fitted between the full name and the actions.
  // The recorded cells are the React states; a change is reviewed by hand.
  const REFUSED = {
    'react:failed': { plain: [32, UNDER, UNDER, UNDER], panel: [32, UNDER, UNDER, UNDER] },
    // The long name and its reason still fit beside each other in a 1280px row.
    'react:failed-long': { plain: [32, UNDER, UNDER, UNDER], panel: [32, UNDER, UNDER, UNDER] },
  };
  for (const [id, cells] of Object.entries(REFUSED)) {
    for (const c of CONTAINERS) {
      const seen = WIDTHS.map((w) => found.find((r) => r.id === id && r.container === c.id && r.width === w)?.height);
      assert.deepEqual(seen, cells[c.id], `${id} in the ${c.id} at ${WIDTHS.join(', ')}`);
    }
  }

  // Remove ends the line: the actions close on the row's end, at the top of the
  // row, in every state.
  const loose = files.filter((r) => r.actsGap !== null && (Math.abs(r.actsGap) > 1 || Math.abs(r.actsTop) > 1))
    .map((r) => `${r.id} ${r.container}@${r.width}: ${r.actsGap}px from the end, ${r.actsTop}px from the top`);
  assert.deepEqual(loose, [], 'the actions do not end the name\'s line');

  // The size leaves the line at a row of 352px or less, and only there.
  const sized = files.filter((r) => r.sizeShown !== null);
  assert.ok(sized.some((r) => r.sizeShown) && sized.some((r) => !r.sizeShown),
    'the size was not measured both on the line and off it');
  const SIZE_OFF = 352;
  const misplaced = sized.filter((r) => r.sizeShown !== r.rowWidth > SIZE_OFF)
    .map((r) => `${r.id} ${r.container}@${r.width}: a ${r.rowWidth}px row ${r.sizeShown ? 'shows' : 'hides'} the size`);
  assert.deepEqual(misplaced, [], `the size does not leave the line at ${SIZE_OFF}px exactly`);

  // The name gives way first. It keeps its floor and its extension, and no
  // status word or reason is cut in the React states, whose words are short.
  const cutTail = files.filter((r) => r.extClipped)
    .map((r) => `${r.id} ${r.container}@${r.width}: the extension "${r.extText}" is clipped`);
  assert.deepEqual(cutTail, [], 'the file extension was truncated along with the stem');
  const NAME_FLOOR = 40; // --space-10
  const thin = files.filter((r) => r.nameWidth !== null && r.nameWidth < NAME_FLOOR)
    .map((r) => `${r.id} ${r.container}@${r.width}: the name is ${r.nameWidth}px`);
  assert.deepEqual(thin, [], `a name was cut under its ${NAME_FLOOR}px floor`);
  const cutWord = files.filter((r) => r.id.startsWith('react:') && r.wordClipped)
    .map((r) => `${r.id} ${r.container}@${r.width}`);
  assert.deepEqual(cutWord, [], 'a status word or a reason was cut while the name could still give way');
  assert.ok(files.some((r) => r.id.startsWith('react:') && r.stemClipped && r.width === 320),
    'no name was cut at 320, so the order in which the line gives way was asserted against nothing');

  // The track fills the room the line leaves, up to the gap before the actions,
  // and keeps its floor when the name is cut. It is asked only of a row at least
  // as wide as the kit's smallest panel less its padding: a guideline specimen
  // nests its frame and panel inside Storybook's stage and is narrower than that.
  const TRACK_FLOOR = 48; // --space-12
  const GAP = 12; // --space-3
  const PANEL = 280; // --panel-sm (320px) less a panel's --space-4 on each side.
  assert.ok(files.some((r) => r.barWidth !== null && r.rowWidth >= PANEL && r.rowWidth < 300),
    'no track was measured in a row near the smallest panel, so its floor was asserted against nothing');
  const stubs = files.filter((r) => r.barWidth !== null && r.rowWidth >= PANEL
    && (r.barWidth < TRACK_FLOOR - 0.5 || (r.barGap !== null && Math.abs(r.barGap - GAP) > 1)))
    .map((r) => `${r.id} ${r.container}@${r.width}: track ${r.barWidth}px, ${r.barGap}px before the actions`);
  assert.deepEqual(stubs, [], 'a progress track does not fill the free room on its line');

  // And the cut is real where it is claimed: a name too long for 320 truncates
  // rather than carrying the row out of the panel.
  const long = found.filter((r) => r.width === 320 && r.id.endsWith('-long'));
  assert.equal(long.length, 2 * CONTAINERS.length, `${long.length} long-name rows at 320, not ${2 * CONTAINERS.length}`);
  assert.deepEqual(long.filter((r) => !r.stemClipped).map((r) => `${r.id} in the ${r.container}`), [],
    'a name that cannot fit 320 was not truncated, so something else gave way');
});

/* -- The stories where Storybook draws them --------------------------------- */

/* Limits: the built Storybook, one engine, the light theme. The card in each
   story sizes to its content in the centred layout, so these rows stand at the
   row's stated width, or narrower when the window is. Rows in a parent of a
   set width are the measurement above. */
const STORY_WIDTH = 420; // --panel-md, the width a row asks of such a parent.

/**
 * Every file drop story, measured where it stands: no markup is copied out, so
 * the story's own card is the parent. #820's first review found the rows of
 * that card at 0px, with Retry and Remove outside a 50px card.
 */
async function storyRows(pw) {
  const built = path.join(root, 'storybook-static');
  const index = JSON.parse(readFileSync(path.join(built, 'index.json'), 'utf8'));
  const ids = Object.keys(index.entries)
    .filter((id) => /^(react-file-drop|guidelines-file-drop)--/.test(id) && index.entries[id].type === 'story');
  const serve = spawn(process.execPath, [path.join(root, 'scripts/evidence/serve.mjs'), built],
    { stdio: ['ignore', 'pipe', 'inherit'] });
  const port = await new Promise((resolve, reject) => {
    serve.stdout.once('data', (d) => resolve(Number(String(d).trim())));
    serve.once('error', reject);
  });
  const browser = await pw.chromium.launch({ executablePath: env.UI_CHROME });
  const rows = [];
  try {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      for (const id of ids) {
        await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story&globals=theme:light`, { waitUntil: 'load' });
        await page.waitForSelector('#storybook-root > *', { state: 'attached' });
        await page.evaluate(() => document.fonts.ready);
        const found = await page.evaluate(() => {
          const sideways = document.documentElement.scrollWidth - window.innerWidth;
          return [...document.querySelectorAll('.ui-drop__row')].map((row) => {
            const r = row.getBoundingClientRect();
            const outside = [...row.querySelectorAll('.ui-drop__name, .ui-drop__state, .ui-drop__bar, .ui-drop__actions, .ui-btn')]
              .map((el) => ({ cls: el.className.split(' ')[0], b: el.getBoundingClientRect() }))
              .filter(({ b }) => b.left < r.left - 1 || b.right > r.right + 1)
              .map(({ cls, b }) => `${cls} at ${Math.round(b.left - r.left)}..${Math.round(b.right - r.left)}`);
            const state = row.querySelector('.ui-drop__state');
            const word = row.querySelector('.ui-drop__word');
            return {
              width: Math.round(r.width * 100) / 100,
              height: Math.round(r.height * 100) / 100,
              failed: Boolean(row.querySelector('.ui-drop__file--failed')),
              file: Boolean(row.querySelector('.ui-drop__file')),
              reasonShown: state ? state.getBoundingClientRect().width > 0 && !(word && word.scrollWidth > word.clientWidth) : null,
              outside,
              sideways,
            };
          });
        });
        rows.push({ id, width, found });
      }
      await page.close();
    }
  } finally {
    await browser.close();
    serve.kill();
  }
  return { ids, rows };
}

test('every file drop story holds its rows where Storybook draws it', { skip: !RUN && 'set ROW_HEIGHTS=1' }, async (t) => {
  const pw = await playwright();
  assert.ok(pw, 'ROW_HEIGHTS=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const { ids, rows } = await storyRows(pw);
  assert.ok(ids.length >= 16, `${ids.length} file drop stories; the React gallery and the guideline page hold more`);
  assert.equal(rows.length, ids.length * WIDTHS.length, 'a story was not measured at every width');

  // The drop area and the page target draw an empty state, not a row.
  const NO_ROW = ['react-file-drop--area', 'react-file-drop--area-dragging', 'react-file-drop--page-dragging'];
  const empty = [...new Set(rows.filter((s) => !s.found.length).map((s) => s.id))];
  assert.deepEqual(empty, NO_ROW, 'the stories that draw no row moved, so a row went unmeasured or a list went stale');

  // No row collapses, no part runs outside its row, and no story scrolls the page.
  const broken = rows.flatMap((s) => s.found
    .filter((r) => r.width < 120 || r.outside.length)
    .map((r) => `${s.id}@${s.width}: a ${r.width}px row${r.outside.length ? `, ${r.outside.join(', ')} outside it` : ''}`));
  assert.deepEqual(broken, [], 'a story collapsed a file drop row, or a part runs outside its row');
  const sideways = rows.filter((s) => s.found.some((r) => r.sideways > 0)).map((s) => `${s.id}@${s.width}`);
  assert.deepEqual(sideways, [], 'a file drop story scrolls the page sideways');

  // The React gallery's lone rows take the stated width while the window has
  // room for it, and less only when it has not. Every file row keeps the
  // resting row's 32px, but a refused row with its reason under the name, which
  // is one reason line taller. The reason is whole.
  const lone = rows.filter((s) => s.id.startsWith('react-file-drop--') && s.found.length === 1);
  assert.ok(lone.some((s) => s.width === 1280), 'no lone React row was measured at 1280');
  const wide = lone.filter((s) => s.width === 1280 && s.found[0].width !== STORY_WIDTH)
    .map((s) => `${s.id}: ${s.found[0].width}px`);
  assert.deepEqual(wide, [], `a lone row at 1280 does not take the stated ${STORY_WIDTH}px`);
  const tall = rows.flatMap((s) => s.found.filter((r) => r.file
    && r.height !== (r.failed && r.height > 32 ? 61.05 : 32)).map((r) => `${s.id}@${s.width}: ${r.height}px`));
  assert.deepEqual(tall, [], 'a file row in a story is neither 32px nor, refused, 61.05px');
  const cut = rows.flatMap((s) => s.found.filter((r) => r.failed && !r.reasonShown).map(() => `${s.id}@${s.width}`));
  assert.deepEqual(cut, [], 'a refused row in a story cuts or hides its reason');
  for (const s of rows.filter((x) => x.id === 'react-file-drop--failed')) {
    t.diagnostic(`  ${s.id}@${s.width}: ${s.found.map((r) => `${r.width}x${r.height}`).join(', ')}`);
  }
});
