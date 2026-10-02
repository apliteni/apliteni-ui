/* The browser side of #467: a filter row adds nothing to the page's scrollable
 * width on a phone, and its panels open inside the row.
 *
 * A gate rather than a shoot. stories/filter-bar-fit.test.js reads the
 * declarations; this measures the boxes.
 *
 * Subjects are swept, not named: both Storybook indexes are rendered and every
 * story putting a `.ui-filter-bar` on the page joins the set, alongside
 * filter-bar-fit.html, the issue's own reproduction. Each panel is measured
 * against the `.ui-dropdown` that contains it, and each open menu again with the
 * viewport narrowed under it; four mutations below have to be refused.
 *
 * why: scripts/evidence/README.md
 *
 * argv: <checkout> [outDir]   outDir also takes a JSON ledger.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';

// Playwright is not a dependency of this package. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkoutArg, outDir] = process.argv.slice(2);
const checkout = path.resolve(checkoutArg || '.');

// Both halves of the kit ship filter bars, so both indexes are swept. A missing
// build is half the subject set missing, not a smaller run.
const BUILDS = [
  { half: 'root', dir: path.join(checkout, 'storybook-static'), make: 'npm run build-storybook' },
  { half: 'react', dir: path.join(checkout, 'react/storybook-static'), make: 'npm run build-storybook -w react' },
];
for (const build of BUILDS) {
  if (!existsSync(path.join(build.dir, 'index.json'))) {
    throw new Error(`no Storybook build at ${build.dir} — run: ${build.make}`);
  }
}

// The widths #467 names. 320 rides along as the narrowest phone still sold: the
// bound holds at any width, so the pair the issue asked about is not the only
// place it is allowed to hold.
// 1280 rides along because an end-anchored menu leaves its row at every width,
// not only on a phone: a defect that needs no narrow viewport was invisible to a
// sweep that only measured phones.
const WIDTHS = [320, 375, 390, 1280];
// The width every open menu is also measured at, whatever width it opened at.
const NARROW = WIDTHS[0];
const THEMES = ['dark', 'light'];
/* Floors, recorded from what this kit reaches rather than re-derived from the
 * sweep. A count computed from the same loop that filled it can only restate
 * itself: a sweep that silently stopped reaching half the surfaces would report
 * "36 of 36 expected" and pass. These fail instead, and raising them is the
 * deliberate act of someone who has seen the new surfaces. */
const FLOOR_SUBJECTS = 15;   // 8 root + 7 react stories rendering a filter bar
const FLOOR_PANELLED = 72;   // cases that put a panel on the page, of 128
// Putting the floor back is one mutation. It is the rule as it stood before the
// fix, written at a specificity that beats the bound so it cannot be a no-op.
const FLOOR_BACK = '.ui-filter-bar .ui-filter-bar__chip .ui-dropdown__panel'
  + ' { min-width: 240px !important; max-width: none !important; }';
/* And the resize check's own mutation, which is a listener rather than a rule:
 * with every `resize` handler dropped, both halves keep the fit they opened with,
 * and a menu opened wide and measured narrow has to leave its row or widen the
 * page. Injected before the page loads, so the kit's own registration is the one
 * that never happens. */
const RESIZE_DEAF = `(() => {
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, ...rest) {
    if (type === 'resize') return;
    return add.call(this, type, ...rest);
  };
})()`;
/* Taking the wrap hint away is the other. The floor mutation only ever widens a
 * panel, so it can never exercise the row-fit check; without this one that check
 * would have nothing proving it still measures anything. */
const WRAP_OFF = '.ui-filter-bar .ui-dropdown__panel { overflow-wrap: normal !important; }';
/* And taking the menu floor away is the third: it is the state #549 reported,
 * an open menu bounded to a trigger that now prints a value alone. It has to
 * leave at least one menu under the width its row allows. */
const FLOOR_OFF = '.ui-filter-bar .ui-dropdown.open .ui-dropdown__panel'
  + ' { min-width: 100% !important; max-width: 100% !important; margin-inline-start: 0 !important; }';

/** A static server over one root, with one page of our own at /__shot. */
const serve = (root, page) => new Promise((resolve, reject) => {
  const proc = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), root, page]);
  proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
  proc.stderr.on('data', (d) => process.stderr.write(d));
  proc.once('error', reject);
});

/** Every story in one built index, as { half, id, label }. */
const indexed = (build) => Object.values(
  JSON.parse(readFileSync(path.join(build.dir, 'index.json'), 'utf8')).entries,
)
  .filter((entry) => entry.type === 'story')
  .map((entry) => ({ half: build.half, id: entry.id, label: `${entry.title} > ${entry.name}` }));

/* Theme comes from Storybook's own `theme` global rather than an attribute
 * written over the top, because both previews paint the canvas from it in a
 * decorator: a story whose next render puts its own value back reads as dark
 * however the attribute was set, which is what made an earlier light pass lie. */
const storyUrl = (port, id, theme) => `http://127.0.0.1:${port}/iframe.html`
  + `?id=${id}&viewMode=story&globals=theme:${theme}`;

const servers = {};
for (const build of BUILDS) {
  servers[build.half] = await serve(build.dir, path.join(HERE, 'filter-bar-fit.html'));
}
const vanilla = await serve(checkout, path.join(HERE, 'filter-bar-fit.html'));
const browser = await chromium.launch({
  executablePath: process.env.UI_CHROME,
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-gpu',
    '--deterministic-mode', '--disable-partial-raster', '--disable-skia-runtime-opts'],
});

/** What the page and its bars measure, in one round trip. */
const probe = () => {
  const doc = document.documentElement;
  const bars = [...document.querySelectorAll('.ui-filter-bar')].map((bar) => {
    const box = bar.getBoundingClientRect();
    const panels = [...bar.querySelectorAll('.ui-dropdown__panel')].map((panel) => {
      const p = panel.getBoundingClientRect();
      // The containing block the percentages resolve against, measured rather
      // than assumed equal to the trigger. why: src/styles/filter-bar.css
      const dd = panel.closest('.ui-dropdown')?.getBoundingClientRect();
      /* A bound box is not the whole promise: a panel is overflow: visible, so
       * text with no break opportunity leaves it while the box stays put. Each
       * row is asked whether its own content fits it. */
      const spills = [...panel.querySelectorAll('.ui-dropdown__item')]
        .filter((row) => row.scrollWidth > row.clientWidth + 0.5)
        .map((row) => ({
          text: row.textContent.trim().slice(0, 48),
          content: row.scrollWidth, box: row.clientWidth,
        }));
      return {
        left: +p.left.toFixed(1), right: +p.right.toFixed(1), width: +p.width.toFixed(1),
        dropdown: dd ? +dd.width.toFixed(1) : null,
        open: !!panel.closest('.ui-dropdown')?.classList.contains('open'),
        // A chip's panel is anchored at its trigger; one anchored to the row is
        // bounded by the row instead and sizes itself. why: src/styles/filter-bar.css
        chip: !!panel.closest('.ui-filter-bar__chip'),
        // What a row-anchored panel's own rule asks for, so the gate can see the
        // chip rule taking it away.
        wants: Number(panel.closest('[data-row-anchored]')?.dataset.rowAnchored) || null,
        rows: panel.querySelectorAll('.ui-dropdown__item').length,
        spills,
      };
    });
    return {
      left: +box.left.toFixed(1), right: +box.right.toFixed(1),
      width: +box.width.toFixed(1), panels,
    };
  });
  return {
    page: doc.scrollWidth,
    view: doc.clientWidth,
    over: Math.max(0, doc.scrollWidth - doc.clientWidth),
    bars,
  };
};

/* settle() reports "still moving" by throwing at its ceiling. While sweeping that
 * is not a verdict on the story — a loaded host holds a transition past it — and
 * the only question being asked is whether a filter bar is on the page. A
 * navigation that throws is still reported. */
const settled = async (page) => {
  try { await settle(page); } catch { /* asked anyway; the bar is either there or not */ }
};

/* The sweep. Every story in both indexes is rendered once at the narrowest width
 * and kept if it puts a filter bar on the page, so a new surface joins the
 * subject set by existing.
 *
 * The question asked is the one that decides membership — is there a
 * `.ui-filter-bar` on a settled page — and not whether the story put a visible
 * box under `#storybook-root`: a palette renders a modal of no size and a toast
 * renders through a portal, so that signal times out on stories this gate has no
 * business failing on. A navigation that throws is still reported, because a
 * story the sweep could not load is a subject it cannot rule out. */
async function sweep() {
  const found = [];
  const unrendered = [];
  const ctx = await browser.newContext({
    viewport: { width: WIDTHS[0], height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  for (const build of BUILDS) {
    for (const story of indexed(build)) {
      try {
        await page.goto(storyUrl(servers[build.half].port, story.id, THEMES[0]), { waitUntil: 'load' });
        await settled(page);
        if (await page.evaluate(() => document.querySelectorAll('.ui-filter-bar').length > 0)) {
          found.push(story);
        }
      } catch (err) {
        unrendered.push(`${story.half} ${story.id} would not load, so it could not be ruled in or `
          + `out as a subject: ${err.message.split('\n')[0]}`);
      }
    }
  }
  await ctx.close();
  return { found, unrendered };
}

const { found: subjects, unrendered } = await sweep();

/** One case: a rendered subject at a width in a theme, optionally mutated. */
async function measure({ url, ready, width, theme, mutate, attrTheme, deaf }) {
  const ctx = await browser.newContext({
    viewport: { width, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
  });
  if (deaf) await ctx.addInitScript({ content: RESIZE_DEAF });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  /* Every subject was chosen because it renders a filter bar, so measuring
   * before one exists is measuring nothing. `load` fires before React mounts,
   * and settle() waits on fonts and transitions rather than on a render, so
   * without this a loaded host silently reports a case as carrying no panel —
   * which the mutation pass then contradicts. */
  await page.waitForSelector(ready || '.ui-filter-bar', { state: 'attached', timeout: 30000 });
  // The fixture page is not a Storybook, so it takes the attribute directly.
  if (attrTheme) await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  if (mutate) await page.addStyleTag({ content: mutate });
  // Asked of the document rather than of a clock. why: scripts/evidence/README.md
  await settle(page);
  const seen = await page.evaluate(probe);
  /* Open each chip in turn and measure again: a panel that only fits while it is
   * shut fits nothing, and the chip that overflows is not always the second one
   * — the widest option list in the kit sits on the screener's `Sector`. */
  const opens = [];
  /* Every trigger in the row, not only a chip's: a menu anchored to the row
   * rather than to a chip is still a menu this gate is about, and measuring it
   * only while shut is what let a chip rule reach it unseen. */
  const triggers = await page.$$('.ui-filter-bar [data-dropdown-trigger]');
  for (const [at, trigger] of triggers.entries()) {
    if (!await trigger.isEnabled()) continue;
    await trigger.click();
    await settle(page);
    opens.push({ chip: at + 1, ...await page.evaluate(probe) });
    /* And again with the viewport moved under the open menu, which is how a
     * phone being rotated reaches it. The fit is written at open, so a menu
     * holding those numbers stands outside a row that has since narrowed —
     * 11px off the page in vanilla, 14px in React, and no single-viewport
     * measurement can see it. Put back afterwards, so the next chip opens at
     * the case's own width. */
    if (width !== NARROW) {
      await page.setViewportSize({ width: NARROW, height: 640 });
      await settle(page);
      opens.push({ chip: at + 1, resizedTo: NARROW, ...await page.evaluate(probe) });
      await page.setViewportSize({ width, height: 640 });
      await settle(page);
    }
    await page.keyboard.press('Escape');
    await settle(page);
  }
  await ctx.close();
  return { ...seen, opens };
}

const cases = [];
for (const width of WIDTHS) {
  for (const theme of THEMES) {
    for (const subject of subjects) {
      cases.push({
        name: `${subject.half} ${subject.id}`,
        url: storyUrl(servers[subject.half].port, subject.id, theme),
        width, theme,
      });
    }
    cases.push({
      name: 'vanilla filterBar()',
      url: `http://127.0.0.1:${vanilla.port}/__shot`,
      ready: 'html[data-ready] .ui-filter-bar', width, theme, attrTheme: true,
    });
  }
}

/** How many panels a case renders. A bar with no filters has none, so there is
 *  nothing for the floor to push off the screen and nothing the mutation can
 *  break. Counted rather than assumed, so a case that loses its panels for some
 *  other reason cannot pass as one the mutation legitimately spared. */
const panelCount = (state) => state.bars.reduce((n, bar) => n + bar.panels.length, 0);

/** The worst overflow a case reached, shut or with any one chip open. */
const worstOver = (held) => Math.max(held.over, ...held.opens.map((o) => o.over), 0);

/** Every panel a case measured, across its shut state and each chip it opened. */
const allPanels = (held) => [held, ...held.opens]
  .flatMap((state) => state.bars.flatMap((bar) => bar.panels));

/* The kit's menu floor, the width `.ui-dropdown__panel` writes and the width an
 * open filter menu reaches. A row narrower than the floor decides instead — a
 * menu may never leave its row. why: src/components/dropdown.js */
const MENU_FLOOR = 240;

/** A shut chip panel's width is its containing block's: that is what keeps a
 *  hidden but laid-out box off the page's scrollable width, which is #467. An
 *  open one is floored instead, so it is measured by `tooNarrow` rather than
 *  here, and a row-anchored panel is bounded by its row rather than by a
 *  trigger — the row check below is what holds that one. */
const unbound = (held) => allPanels(held)
  .filter((p) => p.chip && !p.open)
  .filter((p) => p.dropdown === null || Math.abs(p.width - p.dropdown) > 0.5);

/** A panel that is not a chip's, rendered narrower than its own rule asks for:
 *  the chip rule reaching a row-anchored panel and overriding its width. #518's
 *  add menu is this shape — `position: static` on the dropdown hands the panel
 *  to the row — and the chip floor would cut it from 320px to 240px. */
const overridden = (held) => [held, ...held.opens]
  .flatMap((state) => state.bars.flatMap((bar) => bar.panels
    .filter((p) => !p.chip && p.wants)
    .map((p) => ({ ...p, want: Math.min(p.wants, bar.width) }))))
  .filter((p) => p.width < p.want - 0.5);

/** Open menus narrower than the floor their row allows. #536 made a chip print
 *  its value alone, and bounding the menu to that trigger left 48px of menu
 *  breaking words mid-letter — #549. */
const tooNarrow = (held) => [held, ...held.opens]
  .flatMap((state) => state.bars.flatMap((bar) => bar.panels
    .filter((p) => p.open && p.chip)
    .map((p) => ({ ...p, floor: Math.min(MENU_FLOOR, bar.width) }))))
  .filter((p) => p.width < p.floor - 0.5);

/** Panels outside the row that holds them, in one measured state. A menu may
 *  never leave its row: that is the half of the promise a width alone cannot
 *  show, and it is what a stale fit breaks after a resize. */
const escapedIn = (state) => state.bars.flatMap((bar) => bar.panels
  .filter((p) => p.right > bar.right + 0.5 || p.left < bar.left - 0.5)
  .map((p) => ({ panel: p, bar })));

/** The distinct rows whose text left them, one entry per row however many times
 *  the walk measured it. */
const spilled = (held) => {
  const seen = new Map();
  for (const panel of allPanels(held)) {
    for (const spill of panel.spills) if (!seen.has(spill.text)) seen.set(spill.text, spill);
  }
  return [...seen.values()];
};

/** Whether a case put a panel on the page at any point in its walk. */
const carriesPanel = (held) => Math.max(panelCount(held), ...held.opens.map(panelCount), 0) > 0;

const ledger = [];
const fails = [];
const panelled = new Set();
let resizedStates = 0;
for (const one of cases) {
  const held = await measure(one);
  ledger.push({ ...one, mutated: false, ...held });
  if (carriesPanel(held)) panelled.add(one);
  const worst = worstOver(held);
  if (worst > 0) {
    fails.push(`${one.name} at ${one.width}px ${one.theme}: the page is ${held.page}px wide on a `
      + `${held.view}px view, ${worst}px over`);
  }
  // A row-anchored panel sizes itself; the chip rule must not reach it.
  for (const panel of overridden(held)) {
    fails.push(`${one.name} at ${one.width}px ${one.theme}: a panel anchored to the row is `
      + `${panel.width}px where its own rule asks for ${panel.want}px, so the chip rule took it`);
  }
  // A menu too narrow to read is the defect #549 reported, and the row it sits
  // in is what decides how wide it is allowed to get.
  for (const panel of tooNarrow(held)) {
    fails.push(`${one.name} at ${one.width}px ${one.theme}: an open menu is ${panel.width}px where `
      + `its row allows ${panel.floor}px, so its options break mid-word`);
  }
  // The rule's own effect, measured directly rather than through its symptom.
  for (const panel of unbound(held)) {
    fails.push(`${one.name} at ${one.width}px ${one.theme}: a panel is ${panel.width}px inside a `
      + `${panel.dropdown}px .ui-dropdown, so the bound is not deciding its width`);
  }
  /* Every panel inside the row that holds it, open or shut, and every option's
   * text inside the panel that holds it. A row is reported once per case: the
   * same row is measured shut and again for each chip opened, and twelve
   * identical lines read as twelve defects. */
  for (const spill of spilled(held)) {
    fails.push(`${one.name} at ${one.width}px ${one.theme}: the option "${spill.text}" needs `
      + `${spill.content}px in a ${spill.box}px row, so it leaves the panel that bounds it`);
  }
  for (const state of [held, ...held.opens]) {
    for (const { panel, bar } of escapedIn(state)) {
      fails.push(`${one.name} at ${one.width}px ${one.theme}`
        + `${state.chip ? ` chip ${state.chip} open` : ''}`
        + `${state.resizedTo ? ` resized to ${state.resizedTo}px` : ''}: a panel spans `
        + `${panel.left}..${panel.right} outside its row's ${bar.left}..${bar.right}`);
    }
  }
  /* A case wide enough to be narrowed has to have been narrowed. A walk that
   * opened a chip and never moved the viewport is the single-viewport sweep this
   * check exists to replace, and it would pass in silence. */
  if (one.width !== NARROW && held.opens.length && !held.opens.some((o) => o.resizedTo)) {
    fails.push(`${one.name} at ${one.width}px ${one.theme}: ${held.opens.length} menus were opened `
      + 'and none was measured again at a narrower viewport');
  }
  resizedStates += held.opens.filter((o) => o.resizedTo).length;
}

/* The mutation. Every case carrying a panel has to come back with at least one
 * panel wider than its containing block, or that case was never measuring the
 * bound. An empty bar is measured too and is expected to survive: it has no
 * panel for the floor to widen. */
const survived = [];
for (const one of cases) {
  const broken = await measure({ ...one, mutate: FLOOR_BACK });
  ledger.push({ ...one, mutated: true, ...broken });
  const loose = unbound(broken);
  if (panelled.has(one) && !loose.length) {
    survived.push(`${one.name} at ${one.width}px ${one.theme}: every panel still matched its `
      + '.ui-dropdown with the 240px floor put back, so the floor never reached this case');
  }
  if (!panelled.has(one) && loose.length) {
    survived.push(`${one.name} at ${one.width}px ${one.theme}: counted as carrying no panel and `
      + `yet the floor widened ${loose.length}, so its panels were missed`);
  }
}

/* The second mutation. Taking the wrap hint away has to make a row spill
 * somewhere, or the row-fit check is decorative. It is run at the narrowest
 * width in one theme rather than across the grid: the question is whether the
 * check still responds to the defect, which one width answers, and the shipped
 * arm above already measures every row at every width. */
const wrapArm = cases.filter((one) => one.width === WIDTHS[0] && one.theme === THEMES[0]);
const unwrapped = [];
for (const one of wrapArm) {
  const loose = await measure({ ...one, mutate: WRAP_OFF });
  ledger.push({ ...one, mutated: 'wrap-off', ...loose });
  unwrapped.push(...spilled(loose).map((s) => `${one.name}: ${s.text}`));
}

/* The third mutation. Bounding an open menu back to its trigger has to leave a
 * menu under its row's floor, or the floor check is reading nothing. Run on the
 * same narrow arm, for the same reason. */
const squeezed = [];
for (const one of wrapArm) {
  const narrow = await measure({ ...one, mutate: FLOOR_OFF });
  ledger.push({ ...one, mutated: 'floor-off', ...narrow });
  squeezed.push(...tooNarrow(narrow).map((p) => `${one.name}: ${p.width}px under ${p.floor}px`));
}

/* The fourth mutation, and the only one that is not a stylesheet: with every
 * `resize` listener dropped, neither half re-measures, so a menu opened at the
 * widest width and narrowed has to be caught leaving its row or widening the
 * page. Run on the widest arm in one theme, where the gap between the two
 * viewports is largest. */
const deafArm = cases.filter((one) => one.width === WIDTHS[WIDTHS.length - 1] && one.theme === THEMES[0]);
const stale = [];
for (const one of deafArm) {
  const kept = await measure({ ...one, deaf: true });
  ledger.push({ ...one, mutated: 'resize-deaf', ...kept });
  const loose = kept.opens.filter((o) => o.resizedTo)
    .filter((o) => o.over > 0 || escapedIn(o).length);
  if (loose.length) stale.push(`${one.name}: ${loose.length} menus kept the fit they opened with`);
}

await browser.close();
for (const half of Object.values(servers)) half.proc.kill();
vanilla.proc.kill();

if (outDir) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'filter-bar-fit.json'), `${JSON.stringify(ledger, null, 2)}\n`);
}

const swept = BUILDS.reduce((n, b) => n + indexed(b).length, 0);
const measuredPanels = ledger.filter((row) => !row.mutated).reduce((n, row) => n + allPanels(row).length, 0);
const perHalf = BUILDS.map((b) => `${subjects.filter((s) => s.half === b.half).length} ${b.half}`);
const expected = WIDTHS.length * THEMES.length * (subjects.length + 1);
console.log(`swept: ${swept} stories across ${BUILDS.length} Storybook indexes`);
console.log(`subjects: ${perHalf.join(' + ')} stories + 1 vanilla page `
  + `(${subjects.length} stories against a floor of ${FLOOR_SUBJECTS})`);
for (const s of subjects) console.log(`  · ${s.half}: ${s.label}`);
console.log(`cases measured: ${cases.length} of ${expected} expected, at ${WIDTHS.join('px, ')}px`);
console.log(`cases carrying a panel: ${panelled.size} of ${cases.length}, floor ${FLOOR_PANELLED}`);
console.log(`panels measured against their .ui-dropdown: ${measuredPanels}`);
console.log(`mutations rejected: ${panelled.size - survived.length} of ${panelled.size}`);
console.log(`rows that spill with the wrap hint off: ${unwrapped.length}, over `
  + `${wrapArm.length} cases at ${WIDTHS[0]}px ${THEMES[0]}`);
console.log(`menus under their row floor with the menu floor off: ${squeezed.length}, over `
  + `${wrapArm.length} cases`);
console.log(`open menus measured again at ${NARROW}px: ${resizedStates}`);
console.log(`cases whose menus went stale with every resize listener dropped: ${stale.length}, `
  + `over ${deafArm.length} cases at ${WIDTHS[WIDTHS.length - 1]}px ${THEMES[0]}`);

const problems = [];
if (cases.length !== expected) problems.push(`measured ${cases.length} cases, expected ${expected}`);
// The counts that cannot come from the sweep. A surface lost to a rename, a
// moved bar or a broken story fails here rather than renumbering quietly.
if (subjects.length < FLOOR_SUBJECTS) {
  problems.push(`the sweep found ${subjects.length} stories rendering .ui-filter-bar and this kit `
    + `has at least ${FLOOR_SUBJECTS} — a surface was lost, or the sweep stopped reaching it`);
}
if (panelled.size < FLOOR_PANELLED) {
  problems.push(`${panelled.size} cases carried a panel and this kit reaches at least `
    + `${FLOOR_PANELLED} — panels went unmeasured even though the subjects were found`);
}
// A sweep that stops finding one half's bars reports every check green having
// measured only the other half. Both halves ship filter bars, so both have to
// contribute a subject; how many is free to grow.
for (const build of BUILDS) {
  if (!subjects.some((s) => s.half === build.half)) {
    problems.push(`the ${build.half} index yielded no story rendering .ui-filter-bar, so that half `
      + 'of the kit went unmeasured — either its bars moved or the sweep stopped reaching them');
  }
}
// A run where nothing rendered a panel would report every check green having
// looked at nothing at all.
if (!panelled.size) problems.push('no case rendered a filter panel, so nothing here was measured');
// And one where no row spills without the hint has a row-fit check that is not
// reading anything, whatever it reports about the shipped arm.
if (!unwrapped.length) {
  problems.push('no row spilled with overflow-wrap taken away, so the row-fit check is not '
    + "measuring anything — the subjects may have lost the fixture's unbreakable value");
}
// And one where no menu falls under its floor with the floor rule removed has a
// floor check that would not have caught #549.
if (!squeezed.length) {
  problems.push('no open menu fell under its row floor with the menu floor taken away, so the '
    + 'floor check is not measuring anything');
}
// And one where no menu goes stale without a resize listener has a resize check
// that would pass on the single-viewport fit this gate used to measure.
if (!resizedStates) {
  problems.push(`no open menu was measured again at ${NARROW}px, so nothing here says what a `
    + 'menu does when the viewport moves under it');
}
if (!stale.length) {
  problems.push('no menu left its row or widened the page with every resize listener dropped, so '
    + 'the resize check is not measuring anything');
}
problems.push(...unrendered, ...fails, ...survived);
if (problems.length) {
  for (const line of problems) console.error(`  ✗ ${line}`);
  process.exitCode = 1;
} else {
  console.log(`✓ ${cases.length} cases: every shut panel as wide as its .ui-dropdown, every open `
    + `menu at the floor its row allows, all inside their row and adding nothing to the page, `
    + `at the width they opened at and again at ${NARROW}px; `
    + `${panelled.size} panel-bearing mutations rejected`);
}
