// The numbers stated on Accessibility minimums, each measured.
//
// The Accessibility minimums page (stories/guidelines/_accessibility-floor.js) states a minimum target
// size, a contrast for `--ring` and a legibility floor for a disabled control, none of
// which existed in this tree before #201. This file measures all three against what the
// kit ships, with measured results and discovered subjects.
//
// Every subject is discovered: controls from the rendered stories, interactive BY ROLE;
// the ring's landings and the disabled rules read off the stylesheet declarations rather
// than assumed (#157, #220); and a control's OVERLAYS probed onto their host, because
// WCAG 2.5.8 measures the target and not the ink (#219).
//
// Discover subjects from source and check the coverage count.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { tokensFor, parseColour, ratio } from '../lib/contrast.js';
import { decomment } from '../lib/target-geometry.js';
import { runJobs } from '../lib/job-pool.js';
import {
  root, THEMES, sheet, disabledRules, TOUCH_MIN, CELLS,
} from '../lib/accessibility-walks.js';
import {
  TARGET_MIN, RING_MIN, RING_FLOOR, DISABLED_MIN, DISABLED_FLOOR, TARGET_EXEMPT,
  RULES,
} from './_accessibility-floor.js';

const { GATES } = JSON.parse(readFileSync(new URL('./accessibility-coverage.json', import.meta.url), 'utf8'));

// The eleven walks are independent, so they run on worker threads at once and this file waits
// for all of them here, before any test, rather than inside one.
const WALKS = new URL('../lib/accessibility-walks.js', import.meta.url);
const [targetRun, ...cellRuns] = await runJobs(WALKS, [
  { fn: 'targetRun' },
  ...CELLS.map(({ theme, accent }) => ({ fn: 'ringCell', args: [theme, accent] })),
  ...THEMES.map((theme) => ({ fn: 'disabledCell', args: [theme] })),
]);
const ringRun = Object.fromEntries(cellRuns.slice(0, CELLS.length).map((c) => [`${c.theme}/${c.accent}`, c]));
const disabledRun = Object.fromEntries(THEMES.map((theme, i) => [theme, cellRuns[CELLS.length + i]]));


test('target size: every control the stories render is measured, none skipped', () => {
  assert.deepEqual(targetRun.problems, [], 'a story that will not render is a hole in the measurement');
  assert.ok(targetRun.stories > 40, `only ${targetRun.stories} stories walked`);
  assert.ok(targetRun.controls.length > 40, `only ${targetRun.controls.length} distinct controls found`);
});

test(`target size: no control is shorter than ${TARGET_MIN}px unless it is named exempt`, () => {
  const exempt = new Set(TARGET_EXEMPT.map((e) => e.control));
  const short = targetRun.controls
    .filter((c) => c.height < TARGET_MIN && !exempt.has(c.key))
    .map((c) => `${c.key} — ${c.height}px high (${c.where})`);
  assert.deepEqual(short, [], 'under the floor and unnamed');
});

test(`target size: no control is narrower than ${TARGET_MIN}px on the axis we can measure`, () => {
  const exempt = new Set(TARGET_EXEMPT.map((e) => e.control));
  const narrow = targetRun.controls
    .filter((c) => c.width != null && c.width < TARGET_MIN && !exempt.has(c.key))
    .map((c) => `${c.key} — ${c.width}px wide (${c.where})`);
  assert.deepEqual(narrow, [], 'under the floor and unnamed');
});

test('target size: every exemption names a control that is really there and really short', () => {
  const byKey = new Map(targetRun.controls.map((c) => [c.key, c]));
  for (const e of TARGET_EXEMPT) {
    const got = byKey.get(e.control);
    assert.ok(got, `exemption names ${e.control}, which no story renders any more — delete it`);
    const under = got.height < TARGET_MIN || (got.width != null && got.width < TARGET_MIN);
    assert.ok(under, `${e.control} measures ${got.height}x${got.width ?? '?'} and clears ${TARGET_MIN}px — the exemption is stale`);
    assert.ok(e.why && e.why.length > 20, `${e.control}'s exemption has no reason`);
  }
});

// 2.5.8 is about the TARGET, so a control may keep its ink and grow only what a
// pointer can land on. Two in the kit do, and this is the test that proves the
// gate can see it: delete the pseudo probe and this fails, where the floor tests
// above would go on passing on the two controls that no longer reach it.
test('target size: the overlay path is exercised, and the ink under it is still small', () => {
  const short = (b) => b.height < TARGET_MIN || (b.width != null && b.width < TARGET_MIN);
  const byOverlay = targetRun.controls.filter((c) => short(c.drawn) && !short(c));
  assert.ok(
    byOverlay.length,
    'no control reaches the floor through an overlay, so nothing here measures one — if the kit '
    + 'really has none left, take the pseudo probe out rather than leaving it untested',
  );
  for (const c of byOverlay) {
    assert.ok(
      c.drawn.height < c.height || (c.drawn.width != null && c.drawn.width < c.width),
      `${c.key}: the overlay is no larger than the box it is on — it is not doing anything`,
    );
  }
});

test('target size: no control carries an overlay this gate cannot measure', () => {
  const opaque = targetRun.controls
    .filter((c) => c.unreadable.length)
    .map((c) => `${c.key} — ${c.unreadable.join(', ')} (${c.where})`);
  assert.deepEqual(
    opaque, [],
    'an out-of-flow pseudo-element with no size this gate can read is a target reported as absent. '
    + 'Give it a width and a height, or insets against a padding box that is itself measurable.',
  );
});

// The page badges its own gaps (`unmet`), and a badge that outlives its failure
// is the same rot in the other direction. Derived from the exemptions rather
// than asserted, so retiring the last one retires the badge with it.
test('target size: the page badges a gap exactly when an exemption is still holding one open', () => {
  const rule = RULES.find((r) => r.id === 'target-size');
  assert.ok(rule, 'the target-size rule is gone from the Accessibility minimums page');
  const open = TARGET_EXEMPT.filter((e) => e.issue).map((e) => e.control);
  assert.equal(
    Boolean(rule.unmet), open.length > 0,
    open.length
      ? `the kit is still short at ${open.join(', ')} and the page claims no gap`
      : 'no exemption is a failure any more — take the gap off the page',
  );
});

test('target size: the sm size the kit ships is measured, and is on the record', () => {
  const sm = targetRun.controls.filter((c) => /ui-btn--sm/.test(c.key));
  assert.ok(sm.length >= 2, 'no sm button rendered — the size stopped being measured');
  for (const c of sm) {
    assert.ok(c.height >= TARGET_MIN, `${c.key} is ${c.height}px high, under ${TARGET_MIN}px`);
  }
});

// ---- 1b. the rail the reader folded (#277) --------------------------------
//
// Folding the rail takes every label off the screen, which is exactly when the
// floor is easiest to lose: a row is its glyph, its name is only an attribute,
// and a rule that hides a row takes it out of the keyboard's reach.

test('folded rail: a story renders one, and every control in it is measured', () => {
  const specimens = new Set(targetRun.folded.map((c) => c.where));
  assert.ok(
    specimens.size >= 1,
    'no story renders a rail the reader folded, so nothing measures the state the shell is folded into',
  );
  assert.ok(targetRun.folded.length >= 5, `only ${targetRun.folded.length} controls found in a folded rail`);
  const short = targetRun.folded
    .filter((c) => c.height < TARGET_MIN)
    .map((c) => `${c.name || '(unnamed)'} — ${c.height}px high (${c.where})`);
  assert.deepEqual(short, [], `a folded rail control under ${TARGET_MIN}px`);
});

test('folded rail: every control keeps a name with its label gone, and the name starts with the label', () => {
  const bad = targetRun.folded
    .filter((c) => !c.name || (c.label && !c.name.startsWith(c.label)))
    .map((c) => `"${c.name}" for a row labelled "${c.label}" (${c.where})`);
  assert.deepEqual(bad, [], 'a folded row has no name of its own, or one a speech user cannot say from the tag');
});

// The phone strip, measured rather than compared. shell-states.test.js holds the
// reader's fold and the 720px fold equal to each other, rule for rule and
// property for property — and that is exactly why neither could notice when the
// floor they share went down: equality is silent about a value that falls on
// both sides at once. This reads the box a finger lands on at 375px.
test(`phone strip: no rail row is shorter than ${TOUCH_MIN}px below 720px`, () => {
  assert.ok(
    targetRun.strip.length >= 5,
    `only ${targetRun.strip.length} rail rows measured below 720px — no story draws a shell rail any `
    + 'more, or the fold stopped being lifted, and this gate is measuring nothing',
  );
  const short = targetRun.strip
    .filter((c) => c.height < TOUCH_MIN)
    .map((c) => `${c.name || '(unnamed)'} — ${c.height}px high (${c.where})`);
  assert.deepEqual(
    short, [],
    `a rail row on a phone is under the ${TOUCH_MIN}px touch floor. At this width the strip is the `
    + 'whole of the rail and a finger is the only pointer it has, so the row is the target. The floor '
    + 'is the 720px block\'s own `min-height` in src/styles/layout.css.',
  );
});

test('folded rail: every control a reader can reach is drawn', () => {
  // The tripwire for the bug this test had: a truthy object in place of the
  // boolean made the filter below unfalsifiable, and the test went on passing
  // over a rail with a `display: none` row in it.
  const notBoolean = targetRun.folded
    .filter((c) => typeof c.onScreen !== 'boolean')
    .map((c) => `${c.name || '(unnamed)'} → ${Object.prototype.toString.call(c.onScreen)}`);
  assert.deepEqual(
    notBoolean, [],
    'a folded control reports something other than true or false for whether it is on screen, so the '
    + 'check below is reading a value that cannot be falsy and this gate holds nothing',
  );
  const gone = targetRun.folded
    .filter((c) => !c.onScreen && !c.inClosedGroup)
    .map((c) => `${c.name} (${c.where})`);
  assert.deepEqual(gone, [], 'a folded rail control is display:none, so Tab passes it by');
});

const CELL_KEYS = Object.keys(ringRun);

test('ring: every selector the sheet paints a ring on is landed somewhere by a story', () => {
  for (const key of CELL_KEYS) {
    const run = ringRun[key];
    assert.ok(run.selectors.length >= 15, `${key}: only ${run.selectors.length} ring selectors found in the sheet`);
    const landed = new Set(run.landings.map((l) => l.selector));
    // `.ui-focusable` is the kit's opt-in focus class
    // (src/styles/base.css:151 `.ui-focusable:focus-visible,`). No vanilla component
    // wears it and no vanilla story renders one, so it has no ground to be measured
    // against — a fact about the class, not a hole here. React's Tooltip trigger wears
    // it and is swept elsewhere. It is named rather than filtered so it cannot quietly
    // become two.
    //
    // The Finance dashboard's head link wore it until round 38 removed that link.
    // A later commit on this PR claimed coverage back by string-pasting the class
    // onto a primary Button, which measures the ring against the button's own
    // fill — already covered by `.ui-btn:focus-visible` — rather than against a
    // real surface. PR #552 code review, finding F5: the exception is restored
    // rather than that false carrier kept.
    //
    // A reader looking for the gap this leaves: the subjects are the selectors the
    // sheet ALREADY rings, so a control given no focus rule at all is invisible here
    // however many stories draw it. stories/focus-ring.test.js walks the controls
    // instead, on the landing page and the shell, footer and topbar stories; a control
    // with no ring rule drawn only on a guideline page is caught by neither.
    const orphans = run.selectors.filter((s) => !landed.has(s));
    assert.deepEqual(orphans, ['.ui-focusable:focus-visible'], `${key}: a ring selector no story renders is a ring nobody measured`);
  }
});

// Every accent is swept, not just the two themes: the ring is var(--accent) and
// each sub-theme re-points it, so `phoenix` is a different ring on the same
// surfaces. #201 measured the default accent only and reported 1.50 as the
// worst the kit had; light emerald was 1.35 the whole time.
test(`ring: ${RING_MIN}:1 against every ground it lands on, in every theme x accent cell`, () => {
  const failing = CELL_KEYS.flatMap((key) => ringRun[key].landings
    .filter((l) => l.ratio != null && l.ratio < RING_MIN)
    .map((l) => `${key}: ${l.selector} on ${l.ground} — ${l.ratio.toFixed(2)}:1`));
  assert.deepEqual(
    failing, [],
    `${failing.length} ring landings under the ${RING_MIN}:1 of WCAG 1.4.11:\n  ${failing.join('\n  ')}`,
  );
});

// The bar above is what WCAG asks; this is what the kit actually reaches. They
// are the same shape and different numbers on purpose — the ratchet catches a
// token moving the ring DOWN long before it reaches the bar, which is the only
// warning anyone gets. It is the measured worst, so it moves only by being
// re-measured (the measured-pin rule).
test(`ring: nothing has drifted below ${RING_FLOOR}:1, the worst the kit measures today`, () => {
  const worse = CELL_KEYS.flatMap((key) => ringRun[key].landings
    .filter((l) => l.ratio != null && Math.round(l.ratio * 100) / 100 < RING_FLOOR)
    .map((l) => `${key}: ${l.selector} on ${l.ground} — ${l.ratio.toFixed(2)}:1`));
  assert.deepEqual(worse, [], 'a token moved a ring landing below the worst #218 measured');
});

// #218 retired the ledger this gate used to carry. The ring clears the bar in
// all eight cells now, so there is no gap to hold open — and the Accessibility minimums page
// must not still badge one.
test('ring: the Accessibility minimums page claims no gap, because there is none', () => {
  const ring = RULES.find((r) => r.id === 'ring-contrast');
  assert.ok(ring, 'the ring-contrast rule is gone from the Accessibility minimums page');
  assert.equal(ring.unmet, undefined, 'the ring clears the bar — retire the ledger rather than leaving it');
});

// One declaration, tunable at its three inputs. Until #578 there were three, because a
// box-shadow ring PAINTED its 1px gap and could only get that colour from the surface
// the control stood on, so every painted container recomposed the token. An outline
// leaves the gap unpainted, so one declaration reaches every control — and a second one
// is now drift rather than a surface doing its job.
// The browser evidence measures the band's edges; this walk measures its ink against
// flat grounds.
test('ring: the band is declared once, from the widths and the ink that tune it', () => {
  const declared = readdirSync(path.join(root, 'src'), { recursive: true })
    .map((f) => String(f).split(path.sep).join('/'))
    .filter((f) => f.endsWith('.css'))
    .sort()
    .flatMap((f) => [...decomment(readFileSync(path.join(root, 'src', f), 'utf8'))
      // A filled selected item repaints its ring in CanvasText in forced colours;
      // stories/ring-carrier.test.js holds that shape.
      .replace(/@media \(forced-colors: active\)\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, '')
      .matchAll(/(?:^|[;{])\s*--ring\s*:([^;}]*)/g)].map((m) => `src/${f}: ${m[1].trim()}`));
  const canonical = tokensFor('dark').get('--ring');
  assert.equal(declared.length, 1, 'the band is declared at :root and nowhere else');
  for (const entry of declared) assert.equal(entry.slice(entry.indexOf(': ') + 2), canonical, entry);
  for (const token of ['--ring-width', '--ring-color']) {
    assert.ok(canonical.includes(`var(${token})`), `${token} no longer tunes the band`);
  }
  // The gap's width is not in the band; it is the offset that places it.
  const offset = tokensFor('dark').get('--ring-offset');
  assert.ok(offset?.includes('var(--ring-gap-width)'),
    '--ring-offset no longer reads --ring-gap-width, so the gap is not tunable');
});


test('disabled: every rule that dims a control is found, and a story renders it', () => {
  const subjects = disabledRun.dark.subjects;
  assert.ok(subjects.length >= 5, `only ${subjects.length} disabled rules found in the sheet`);
  for (const theme of THEMES) {
    assert.ok(disabledRun[theme].found.length > 0, `${theme}: no disabled text measured at all`);
  }
});

test(`disabled: every label a disabled control shows clears ${DISABLED_MIN}:1, in both themes`, () => {
  const under = THEMES.flatMap((theme) => disabledRun[theme].found
    .filter((f) => f.labelled && f.ratio < DISABLED_MIN)
    .map((f) => `${theme} ${f.path} at opacity ${f.opacity} — ${f.ratio.toFixed(2)}:1`));
  assert.deepEqual(under, [], `disabled labels under the ${DISABLED_MIN}:1 floor #220 settled`);
});

test(`disabled: nothing has drifted below ${DISABLED_FLOOR}:1, the worst the kit measures today`, () => {
  for (const theme of THEMES) {
    const worse = disabledRun[theme].found
      .filter((f) => f.labelled && Math.round(f.ratio * 100) / 100 < DISABLED_FLOOR)
      .map((f) => `${f.path} at opacity ${f.opacity} — ${f.ratio.toFixed(2)}:1`);
    assert.deepEqual(worse, [], `${theme}: a token moved a disabled pair below the ratchet`);
  }
});

// Keep measured ratios in the test, not in reader-facing guideline history.
test('disabled: the opaque token pair retains its measured contrast in both themes', () => {
  const expected = { dark: '6.24', light: '6.11' };
  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    const chain = (name) => {
      let value = vars.get(name);
      while (/^var\(\s*--[\w-]+\s*\)$/.test(value.trim())) {
        value = vars.get(value.trim().slice(4, -1).trim());
      }
      return parseColour(value);
    };
    assert.equal(ratio(chain('--disabled-ink'), chain('--disabled-surface')).toFixed(2), expected[theme]);
  }
});

// The second half of the rule, and the half that stops the first from being
// cleared the wrong way: a control could pass any legibility floor by simply
// looking enabled. It cannot pass this too. The comparison is the same element
// with the disabled state taken off it, so it costs no specimen and no list.
// The classification those two checks turn on, held so a rule cannot quietly change which
// of them measures it. A rule saying the state with the line around the box alone is asked
// about that box; anything painting ink, a fill or a fade is asked about its labels too. #518
test('disabled: a rule is classified by what it paints, not by what it selects', () => {
  const one = (body) => disabledRules(`.ui-x:disabled { ${body} }`)[0];
  assert.equal(one('border-color: var(--disabled-border);').edgeOnly, true);
  assert.equal(one('border: 1px solid var(--disabled-border);').edgeOnly, true);
  assert.equal(one('border-color: var(--disabled-border); color: var(--disabled-ink);').edgeOnly, false);
  assert.equal(one('background: var(--disabled-surface);').edgeOnly, false);
  assert.equal(one('opacity: 0.5;').edgeOnly, false);
  assert.equal(one('cursor: not-allowed;').edgeOnly, false);
  // And the kit's own edge-only rules, named rather than counted: the filter row's chip and
  // its add control, and the checkmark the kit draws out of two borders.
  const edges = disabledRules(sheet()).filter((r) => r.edgeOnly).map((r) => r.selector).sort();
  assert.deepEqual(edges, [
    ".ui-check input[type=\"checkbox\"]:disabled:checked::after",
    ".ui-filter-bar [data-filter-add] .ui-dropdown__trigger:disabled",
    ".ui-filter-bar [data-filter-add] .ui-dropdown__trigger[aria-disabled=\"true\"]",
    ".ui-filter-bar [data-filter-add] .ui-dropdown__trigger[aria-disabled=\"true\"]:hover:not(:focus-visible)",
    ".ui-filter-bar:disabled .ui-filter-bar__chip",
    ".ui-filter-bar__chip:disabled",
  ].sort(), 'the kit\'s edge-only disabled rules moved — each one is measured on its own box alone');
});

test('disabled: the state repaints — off never looks the same as on', () => {
  const same = THEMES.flatMap((theme) => disabledRun[theme].found
    .filter((f) => !f.repaints)
    .map((f) => `${theme} ${f.path} — ${f.selector} paints exactly what the enabled control paints`));
  assert.deepEqual(same, [], 'a disabled control that is indistinguishable from an enabled one');
});

// The mechanism, held rather than argued. `opacity` under a disabled selector
// drags a label and its box toward the ground together, and the pair a reader
// is left with is wherever the composite lands — 1.48:1, for the primary button
// #220 was opened about. The rule the kit settled on is that a control with a
// LABEL under it takes a paint, not a fade. The switch track is what is left:
// it fades, and there is nothing written inside it to fade.
test('disabled: a rule that fades with opacity has no label under it', () => {
  const faded = THEMES.flatMap((theme) => disabledRun[theme].found
    .filter((f) => f.opacity < 1 && f.labelled)
    .map((f) => `${theme} ${f.path} — ${f.selector} at opacity ${f.opacity}`));
  assert.deepEqual(faded, [], 'a disabled label faded by opacity instead of painted');
});

// ---- the collection -------------------------------------------------------
//
// The page names every gate and what it admits. This holds the two in step the
// way overview.test.js holds ENTRIES in step with the pages beside it: the list
// is discovered from disk, and a gate the page has never heard of fails the
// build (the discovery rule).

test('the Accessibility minimums page names every accessibility gate in the tree, and no gate it does not', () => {
  const files = [
    ...readdirSync(path.join(root, 'stories'), { recursive: true }).map((f) => `stories/${f}`),
    ...readdirSync(path.join(root, 'react/src'), { recursive: true }).map((f) => `react/src/${f}`),
  ].map((f) => String(f).split(path.sep).join('/'));
  // An accessibility gate is one that says so in its own text — the same
  // discovery the page's claim rests on, and not a list anybody maintains.
  // An import path is not the file saying so: stories/guidelines/letter-case.test.js
  // is a gate on letter case, even though it borrows the contrast DOM helpers.
  // Strip whole imports, including multiline braces, before reading the claims.
  // Coverage limits count too: drawer-rules names contrast as a blind spot.
  const ownText = (f) => readFileSync(path.join(root, f), 'utf8')
    .replace(/^\s*import\s[\s\S]*?(?:from\s+['"][^'"]*['"]|['"][^'"]*['"])\s*;?/gm, '');
  const gates = files.filter((f) => /\.test\.(js|tsx)$/.test(f) && !f.includes('/lib/'))
    .filter((f) => /axe|contrast|WCAG|focus|keyboard|accessib/i.test(ownText(f)))
    .sort();
  const named = GATES.map((g) => g.file).sort();
  assert.deepEqual(named, gates, 'the page and the tree disagree about which gates exist');
});

test('every gate the page names states a blind spot, and states what it checks', () => {
  for (const g of GATES) {
    assert.ok(g.does && g.does.length > 30, `${g.file} is on the page with nothing said about it`);
    assert.ok(g.blind.length, `${g.file} claims no blind spot — no gate here has none`);
    for (const b of g.blind) assert.ok(b.length > 20, `${g.file} has a blind spot stated too thinly to use`);
  }
});

export { targetRun, ringRun, disabledRun };
