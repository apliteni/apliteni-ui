/* The browser side of #467: a filter row adds nothing to the page's scrollable
 * width on a phone, and its panels open inside the row.
 *
 * A gate rather than a shoot. stories/filter-bar-fit.test.js reads the
 * declarations; this measures the boxes.
 *
 * Subjects are swept, not named: both Storybook indexes are rendered and every
 * story putting a `.ui-filter-bar` on the page joins the set, alongside
 * filter-bar-fit.html, the issue's own reproduction. Each panel is measured
 * against the `.ui-dropdown` that contains it, and the mutation puts the 240px
 * floor back and has to widen one in every case carrying a panel.
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
const WIDTHS = [320, 375, 390];
const THEMES = ['dark', 'light'];
/* Floors, recorded from what this kit reaches rather than re-derived from the
 * sweep. A count computed from the same loop that filled it can only restate
 * itself: a sweep that silently stopped reaching half the surfaces would report
 * "36 of 36 expected" and pass. These fail instead, and raising them is the
 * deliberate act of someone who has seen the new surfaces. */
const FLOOR_SUBJECTS = 13;   // 8 root + 5 react stories rendering a filter bar
const FLOOR_PANELLED = 42;   // cases that put a panel on the page, of 84
// Putting the floor back is the mutation. It is the rule as it stood before the
// fix, written at a specificity that beats the bound so it cannot be a no-op.
const MUTATION = '.ui-filter-bar .ui-filter-bar__chip .ui-dropdown__panel'
  + ' { min-width: 240px !important; max-width: none !important; }';

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
        rows: panel.querySelectorAll('.ui-dropdown__item').length,
        spills,
      };
    });
    return { left: +box.left.toFixed(1), right: +box.right.toFixed(1), panels };
  });
  return {
    page: doc.scrollWidth,
    view: doc.clientWidth,
    over: Math.max(0, doc.scrollWidth - doc.clientWidth),
    bars,
  };
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
        await settle(page);
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
async function measure({ url, ready, width, theme, mutate, attrTheme }) {
  const ctx = await browser.newContext({
    viewport: { width, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  if (ready) await page.waitForSelector(ready);
  // The fixture page is not a Storybook, so it takes the attribute directly.
  if (attrTheme) await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  if (mutate) await page.addStyleTag({ content: MUTATION });
  // Asked of the document rather than of a clock. why: scripts/evidence/README.md
  await settle(page);
  const seen = await page.evaluate(probe);
  /* Open each chip in turn and measure again: a panel that only fits while it is
   * shut fits nothing, and the chip that overflows is not always the second one
   * — the widest option list in the kit sits on the screener's `Sector`. */
  const opens = [];
  const triggers = await page.$$('.ui-filter-bar__chip [data-dropdown-trigger]');
  for (const [at, trigger] of triggers.entries()) {
    if (!await trigger.isEnabled()) continue;
    await trigger.click();
    await settle(page);
    opens.push({ chip: at + 1, ...await page.evaluate(probe) });
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

/** Panels whose width left their own containing block's, which is the one thing
 *  the rule does and the one signal every subject shares. */
const unbound = (held) => allPanels(held)
  .filter((p) => p.dropdown === null || Math.abs(p.width - p.dropdown) > 0.5);

/** Whether a case put a panel on the page at any point in its walk. */
const carriesPanel = (held) => Math.max(panelCount(held), ...held.opens.map(panelCount), 0) > 0;

const ledger = [];
const fails = [];
const panelled = new Set();
for (const one of cases) {
  const held = await measure(one);
  ledger.push({ ...one, mutated: false, ...held });
  if (carriesPanel(held)) panelled.add(one);
  const worst = worstOver(held);
  if (worst > 0) {
    fails.push(`${one.name} at ${one.width}px ${one.theme}: the page is ${held.page}px wide on a `
      + `${held.view}px view, ${worst}px over`);
  }
  // The rule's own effect, measured directly rather than through its symptom.
  for (const panel of unbound(held)) {
    fails.push(`${one.name} at ${one.width}px ${one.theme}: a panel is ${panel.width}px inside a `
      + `${panel.dropdown}px .ui-dropdown, so the bound is not deciding its width`);
  }
  // Every panel inside the row that holds it, open or shut, and every option's
  // text inside the panel that holds it.
  for (const state of [held, ...held.opens]) {
    for (const bar of state.bars) {
      for (const panel of bar.panels) {
        for (const spill of panel.spills) {
          fails.push(`${one.name} at ${one.width}px ${one.theme}: the option "${spill.text}" needs `
            + `${spill.content}px in a ${spill.box}px row, so it leaves the panel that bounds it`);
        }
        if (panel.right > bar.right + 0.5 || panel.left < bar.left - 0.5) {
          fails.push(`${one.name} at ${one.width}px ${one.theme}`
            + `${state.chip ? ` chip ${state.chip} open` : ''}: a panel spans `
            + `${panel.left}..${panel.right} outside its row's ${bar.left}..${bar.right}`);
        }
      }
    }
  }
}

/* The mutation. Every case carrying a panel has to come back with at least one
 * panel wider than its containing block, or that case was never measuring the
 * bound. An empty bar is measured too and is expected to survive: it has no
 * panel for the floor to widen. */
const survived = [];
for (const one of cases) {
  const broken = await measure({ ...one, mutate: true });
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
problems.push(...unrendered, ...fails, ...survived);
if (problems.length) {
  for (const line of problems) console.error(`  ✗ ${line}`);
  process.exitCode = 1;
} else {
  console.log(`✓ ${cases.length} cases: every panel as wide as its .ui-dropdown, inside its row `
    + `and adding nothing to the page; all ${panelled.size} panel-bearing mutations were rejected`);
}
