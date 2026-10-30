// Contrast gate for the React workspace.
//
// The walk is dealt over CONTRAST_PARTS test files (contrast.test.tsx, contrast-2.test.tsx and so
// on), each calling runWalkSlice, so no one file walks the whole catalogue. The Snippet
// story file is never split, because the ledger below names its stories.
//
// Share the calculation but check each workspace separately.
// Fail if a custom property cannot be resolved.
//
// Same rule as stories/contrast.test.js: a foreground/background pair this
// workspace renders as text clears WCAG AA, or is named in the ledger below by a
// person who decided it is acceptable. The ledger is currently empty — see it for
// why, and do not read that as permission to leave it so. Every `*.stories.tsx`
// under react/src is mounted in both themes, every text-owning element measured
// against the background chain composited above it, and the count asserted at the
// foot of this file.

// WHAT THIS GATE WILL NOT CATCH. The vanilla ledger (stories/contrast.test.js,
// header) applies here too. Differences of its own:
//
//  - React uses the default accent. The other accents are measured only as tokens, by
//    stories/accent-contrast.test.js. The vanilla accent walk went with #724.
//  - State targets come from both the kit and React stylesheets. Scripts,
//    simultaneous states, and state rules inside story-local <style> blocks
//    are not covered.
//  - Wider here: this walks a real React tree, so Modal's portal is measured. It
//    lands in document.body outside the render container, which is why the walk
//    scans document.body.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { CONTRAST_PARTS } from './contrast-parts';
import {
  AA_LARGE, AA_TEXT, composite, desugar, effectiveBackground, groupFindings,
  hasOwnText, kitCssFor, parseColour, ratio, selectorPath, stateBases, stateTargets, substitute, tokensFor,
  // stories/lib/contrast.js is plain JS outside this workspace's tsconfig. It is
  // imported for its arithmetic, which is unit-tested in stories/lib/contrast.test.js.
  // @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
} from '../../stories/lib/contrast.js';

const THEMES = ['dark', 'light'] as const;
type Theme = (typeof THEMES)[number];

/* ─────────────────────────────────────────────────────────────────────────────
 * THE LEDGER IS WRITTEN BY HAND ON PURPOSE. DO NOT BUILD A SCRIPT THAT
 * REGENERATES IT. The reasoning is stories/contrast.test.js's, in full, and it
 * governs this list too.
 *
 * An entry names a CAUSE, not an element instance. `match` is tested against a
 * grouped finding's key, which carries the measured literals, so a token move
 * turns the gate red rather than absorbing the change. `count` is asserted with
 * === so a fix in one row cannot mask a regression in another.
 * ────────────────────────────────────────────────────────────────────────── */
type LedgerEntry = { match: (f: Finding) => boolean; count: number; why: string };

// An entry belongs here only when A PERSON has decided a failure is debt and
// written down why. This list was empty until #429 PR 3.8, and it stopped being
// empty on an agent's judgement — which is why the PR body names these two entries
// for Artur rather than leaving them to pass as a green suite. Before this gate had
// anything in it, it found the sort caret painting --muted at opacity .5, 2.39:1
// dark and 2.16:1 light against a 4.5 floor; #131 removed the opacity rather than
// ledgering it, and that is still the first thing to try.
//
// Both entries carry debt the vanilla side already records. stories/contrast.test.js
// holds the original rationale and #455's measurements: syntax colour repeats meaning
// present in the source, and these light pairs still miss AA. No other surface or
// colour inherits this debt.
//
// Round 24 added JSON and TypeScript to the highlighter, so the same two pairs are
// now painted in more stories. The grouping key is the colour, the state and the
// leaf selector rather than the story, so the counts below did not move: these are
// the same four and two findings, reached from more places.
//
// The stories are named rather than matched by file. A prefix match would absorb
// every Snippet story anyone adds later into the accepted debt, with no count
// change and nobody deciding — which is the opposite of what this list is for.
// Adding a story that paints these classes should turn the gate red and make
// somebody look.
const ACCESS_STORY = '../../stories/apps/Access.stories.tsx:Default';
const SNIPPET_STORIES = new Set([
  './Snippet.stories.tsx:Shell',
  './Snippet.stories.tsx:Json',
  './Snippet.stories.tsx:TypeScript',
  './Snippet.stories.tsx:Variants',
  './Snippet.stories.tsx:Comparison',
  './Snippet.stories.tsx:CopyHover',
  './Snippet.stories.tsx:Copied',
  './Snippet.stories.tsx:KeyboardFocus',
  // The Access showcase's connect command (#429, PR 4): the vanilla ledger's E and C
  // count this pair across every story, that showcase's snippet included.
  ACCESS_STORY,
]);
// At rest, and only at rest. The walk re-measures a container's descendants in a state
// when a state rule on that container can change a captured colour; `.ui-snippet:has(pre
// :focus-visible)` writes nothing but the band now, so focus reaches none of these spans.
// Until #578 the same rule also carried `--ring-gap: inherit` — a custom property, which
// the walk cannot rule out — so every entry was counted twice, once at rest and once
// under a state that painted the same literals at the same ratios. The halving below is
// that artifact going, not a debt being paid.
const snippetDebt = (f: Finding) => f.theme === 'light' && f.accent === 'default'
  && f.state === null && f.bg === 'rgb(255,255,255)'
  && [...f.stories].every(story => SNIPPET_STORIES.has(story))
  && [...f.paths].every(path => /div\.ui-snippet > pre > span\.[fsu]$/.test(path));
// #429 PR 4 brought the foundation pages over from the vanilla Storybook. Three of their
// vanilla ledger buckets come with them, unchanged in cause: B, P and S in
// stories/lib/contrast-ledger.js. Each is named by story, for the reason above.
const PALETTE_STORY = '../../stories/foundations/BrandPrimitives.stories.tsx:Palette';
const SIGNAL_STORY = '../../stories/foundations/SignalContrast.stories.tsx:Diagnosis';
const MOTION_PLAYGROUND = '../../stories/foundations/Motion.stories.tsx:Playground';
const onlyIn = (f: Finding, story: string) => [...f.stories].every(s => s === story);
/** Whole stories the ledger counts, dealt to part 0 with the snippet file. */
const LEDGER_STORIES = new Set([PALETTE_STORY, SIGNAL_STORY, MOTION_PLAYGROUND, ACCESS_STORY]);
const LEDGER: LedgerEntry[] = [
  {
    match: f => snippetDebt(f) && f.fg === 'rgb(12, 143, 168)'
      && [...f.paths].every(path => /span\.[fu]$/.test(path)),
    count: 2,
    why: 'Vanilla E: light cyan retains the existing 3.81:1 pair. '
      + 'It paints shell flags and URLs, and since round 24 also '
      + 'JSON and TypeScript scalars — numbers, true, false, null. In shell the '
      + 'colour is a second signal over text that reads without it; on a JSON '
      + 'scalar it is the only colour the value gets, so the debt is larger in kind '
      + 'than when this entry was written. It is accepted because the value itself '
      + 'is the text — a reader reads the 3 in "retries": 3, not a hint about it — '
      + 'and because no token moved; fixing it means re-picking --cyan for the light '
      + 'card, which is a palette decision and not this PR\'s. No AA claim is made.',
  },
  {
    match: f => snippetDebt(f) && f.fg === 'rgb(28, 138, 44)'
      && [...f.paths].every(path => path.endsWith('span.s')),
    count: 1,
    why: 'Vanilla C: light green retains the existing 4.45:1 pair. '
      + 'It paints quoted strings in all three languages — shell '
      + 'arguments, JSON string values, TypeScript literals. The same widening as '
      + 'the cyan entry: a JSON string value carries its own meaning rather than '
      + 'repeating one. Accepted for the same reason and with the same limit — it '
      + 'is 0.05 under the 4.5:1 floor, and closing it is a palette decision.',
  },
  {
    match: f => onlyIn(f, PALETTE_STORY),
    count: 130,
    why: 'Vanilla P: the brand primitives page prints each raw ramp swatch\'s step on top of '
      + 'the swatch itself, in a fixed low-alpha black, while the swatch runs from near-black to '
      + 'white. The label is documentation of a colour, placed on the colour it names. Making '
      + 'each one legible would mean flipping its ink partway down the ramp, which is a different page.',
  },
  {
    match: f => onlyIn(f, SIGNAL_STORY),
    count: 42,
    why: 'Vanilla S: the signal-contrast page records why the signal tokens hold their values by '
      + 'painting the values they used to hold beside the ones they hold now. Its failing pairs '
      + 'are the exhibits, kept so the comparison is visible. A gate that demanded this page pass '
      + 'would delete the evidence.',
  },
  {
    match: f => f.theme === 'dark' && onlyIn(f, MOTION_PLAYGROUND)
      && [...f.paths].every(path => path.endsWith('button.mz-replay')),
    count: 1,
    why: 'Vanilla B: the Replay control on the motion playground mixes its hover ground from the '
      + 'accent it is inked in, so in dark the ground rises with the ink and the pair stays under '
      + 'AA. The accent that closes it is past the point where it is still this violet, and #96 '
      + 'and #157 chose the hue before the ratio.',
  },
];

type Finding = {
  key: string; theme: string; accent: string; state: string | null;
  fg: string; bg: string; ratio: number; need: number;
  paths: Set<string>; stories: Set<string>;
};
type Record_ = {
  story: string; theme: string; accent: string; state: string | null; path: string;
  fg: string; bg: string | null; ratio: number | null; need: number | null;
  unjudgeable: string | null;
};

// ---- the stylesheet -------------------------------------------------------

// KEYS only. Not eager, so nothing is imported and vitest's `css` handling never
// enters into it — this is discovery, and the read below is the load.
const cssFiles = Object.keys(import.meta.glob('./**/*.css')).sort();
const readLocal = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

/** The kit's sheet and this workspace's, both resolved for one theme. */
function sheetFor(theme: Theme): { kit: string; local: string } {
  const vars = tokensFor(theme);
  const kit: string = kitCssFor(theme).css;
  // Same rewrites the kit's own CSS gets, minus the ones that cannot apply: no
  // react/ rule declares a contextual custom property, and none styles an
  // anchor. desugar still matters — .rx-sort:focus-visible would otherwise sit
  // in the sheet as a selector JSDOM can never match.
  const local = cssFiles.map((f) => desugar(substitute(readLocal(f), vars))).join('\n');
  return { kit, local };
}
const SHEETS = Object.fromEntries(THEMES.map((t) => [t, sheetFor(t)])) as Record<
  Theme, { kit: string; local: string }>;
const sheetText = (t: Theme) => `${SHEETS[t].kit}\n/* --- react/src --- */\n${SHEETS[t].local}`;

const STATE_BASES = Object.fromEntries(THEMES.map((theme) => [theme, stateBases(sheetText(theme))]));

const styleEl = document.createElement('style');
document.head.appendChild(styleEl);

// ---- discovery ------------------------------------------------------------

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: { render?: Story['render']; args?: Story['args'] } } & Record<string, unknown>;

// The same glob a11y.test.tsx and react/.storybook/main.ts use, so a new story
// file is in the gate the moment it exists.
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });
const files = Object.keys(modules).sort();

/** Every renderable story, flattened, in file order. */
const allFound = files.flatMap((file) => {
  const mod = modules[file];
  const def = mod.default || {};
  return Object.entries(mod)
    .filter(([name, s]) => name !== 'default' && s && typeof s === 'object')
    .map(([name, s]) => ({
      id: `${file}:${name}`,
      render: (s as Story).render || def.render,
      args: { ...def.args, ...(s as Story).args },
    }))
    .filter((s) => typeof s.render === 'function');
});

export { CONTRAST_PARTS };
/** The file the ledger entries below can only match in. */
const LEDGER_HOME = './Snippet.stories.tsx';

/** Deal the stories over `parts` hands in turn. The ledger home stays whole on the first hand. */
function dealStories(parts: number): string[][] {
  const hands: string[][] = Array.from({ length: parts }, () => []);
  let turn = 0;
  for (const story of allFound) {
    if (story.id.startsWith(`${LEDGER_HOME}:`) || LEDGER_STORIES.has(story.id)) hands[0].push(story.id);
    else hands[turn++ % parts].push(story.id);
  }
  return hands;
}

afterEach(cleanup);

// ---- the walk -------------------------------------------------------------

/** One entry per (story × theme) cell: how many pairs that cell actually judged. */
const cells: { id: string; judged: number; walked: number }[] = [];
const records: Record_[] = [];
const stateCounts = { targets: 0, judged: 0, elapsed: 0 };
const stats = { walked: 0, judged: 0, unjudgeable: 0, hiddenSkipped: 0, disabledSkipped: 0, unresolvedFg: 0 };

/** Measure every text-owning element now in document.body. Returns pairs judged. */
function measure(story: string, theme: Theme, state: string | null = null,
  elements: Iterable<Element> = document.body.querySelectorAll('*')): number {
  let judged = 0;
  for (const el of elements) {
    if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue;
    if (!hasOwnText(el)) continue;

    let hidden = false;
    for (let n: Element | null = el; n; n = n.parentElement) {
      const c = window.getComputedStyle(n);
      if (c.display === 'none' || c.visibility === 'hidden' || Number.parseFloat(c.opacity || '1') === 0) {
        hidden = true;
        break;
      }
    }
    if (hidden) { stats.hiddenSkipped += 1; continue; }

    stats.walked += 1;
    const cs = window.getComputedStyle(el);
    const fgRaw = parseColour(cs.color);
    // Null, never a guess. An unresolved var() lands here, and a gate that
    // guessed black would fabricate a passing ratio on a light ground.
    if (!fgRaw) { stats.unresolvedFg += 1; continue; }

    const bg = effectiveBackground(el, window);
    if (bg === 'IMAGE') {
      stats.unjudgeable += 1;
      records.push({
        story, theme, accent: 'default', state, path: selectorPath(el),
        fg: cs.color, bg: null, ratio: null, need: null,
        unjudgeable: 'background is an image or gradient — JSDOM cannot sample it',
      });
      continue;
    }

    // WCAG 1.4.3 exempts inactive user-interface components. Skipped with the
    // reason counted, not silently.
    if (el.closest('[disabled],[aria-disabled="true"],.is-disabled')) {
      stats.disabledSkipped += 1;
      continue;
    }

    // Opacity composites down the chain; the element's own is not the whole
    // story. .rx-caret sits at .5 and its ancestors may cut it further.
    let op = Number.parseFloat(cs.opacity || '1');
    for (let n = el.parentElement; n; n = n.parentElement) {
      const o = Number.parseFloat(window.getComputedStyle(n).opacity || '1');
      if (Number.isFinite(o) && o < 1) op *= o;
    }

    const alpha = fgRaw[3] * (Number.isFinite(op) ? op : 1);
    const fg = composite([fgRaw[0], fgRaw[1], fgRaw[2], alpha], bg);
    const r: number = ratio(fg, bg);
    judged += 1;
    stats.judged += 1;

    const size = Number.parseFloat(cs.fontSize || '16');
    const weight = Number.parseInt(cs.fontWeight || '400', 10) || 400;
    const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? AA_LARGE : AA_TEXT;
    if (r >= need) continue;

    records.push({
      story, theme, accent: 'default', state, path: selectorPath(el),
      fg: cs.color, bg: `rgb(${bg.slice(0, 3).map(Math.round).join(',')})`,
      ratio: r, need, unjudgeable: null,
    });
  }
  return judged;
}

// Theme-major, not story-major. Swapping <style> makes JSDOM re-parse a 157 KB
// stylesheet and drop its own cascade cache for the whole document, and that
// parse is most of this file's runtime — so the sheet is swapped once per theme
// instead of once per cell. That makes the parse cost themes, not themes ×
// stories: adding a story now costs one render, not one more parse.
export function runWalkSlice(part: number, parts: number = CONTRAST_PARTS) {
const hands = dealStories(parts);
const mine = new Set(hands[part]);
const found = allFound.filter((s) => mine.has(s.id));
// The ledger's stories are dealt to part 0 whole, so part 0 owes every ledger count whether or not
// any of them was discovered. A missing home then fails here instead of zeroing the count.
const homeHits = (entryCount: number) => (part === 0 ? entryCount : 0);

/* A cell that takes over 5 s whole is dealt into tests of its own: one for the pairs at rest and
 * one per share of its state targets. Each test renders the story again and walks only its
 * share, so the cell is still walked once, with the same measure() and the same assertion.
 * The number is the count of state shares. */
const SPLIT_STATE_SHARES: Record<string, number> = {
  './Finance.stories.tsx:Comparison': 4,
};

/* A foundation, guideline or showcase story carries its own <style> block and inline
 * style= attributes that speak var(), as the vanilla pages did, and JSDOM does not
 * resolve var(). Rewrite both the way stories/lib/contrast.js rewrites a vanilla
 * story's markup, or those story-local surfaces resolve to nothing. A story-local
 * :hover rule lives in that <style> block, so its state bases are returned too. */
function localize(theme: Theme) {
  const vars = tokensFor(theme);
  for (const el of document.body.querySelectorAll<HTMLElement>('[style*="var("]')) {
    el.setAttribute('style', substitute(el.getAttribute('style') || '', vars));
  }
  const blocks = [...document.body.querySelectorAll('style')];
  for (const block of blocks) block.textContent = desugar(substitute(block.textContent || '', vars));
  return blocks.length ? stateBases(blocks.map((b) => b.textContent).join('\n')) : null;
}

function mergeBases<T extends Record<string, Iterable<string>>>(kit: T, local: T): T {
  return Object.fromEntries(Object.keys(kit).map((k) => [k, new Set([...kit[k], ...(local[k] || [])])])) as unknown as T;
}

type Share = { atRest: boolean; of: number; index: number } | null;

function walkCell(story: (typeof allFound)[number], theme: Theme, share: Share) {
  if (document.documentElement.getAttribute('data-theme') !== theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-choice', theme);
    styleEl.textContent = sheetText(theme);
  }
  const { id, args } = story;
  // Stories use hooks, so the render fn has to BE a component.
  const Story = () => story.render!(args, { globals: { theme, accent: 'default' }, args });
  const before = stats.walked;
  const firstRecord = records.length;
  render(<Story />);
  const local = localize(theme);
  let judged = !share || share.atRest ? measure(id, theme) : 0;
  const started = performance.now();
  const bases = local ? mergeBases(STATE_BASES[theme], local) : STATE_BASES[theme];
  const all = share?.atRest ? [] : [...stateTargets(document.body, bases)];
  const mine = share
    ? all.slice(Math.floor((share.index * all.length) / share.of), Math.floor(((share.index + 1) * all.length) / share.of))
    : all;
  for (const [element, state] of mine) {
    const previous = element.getAttribute('data-ui-state');
    element.setAttribute('data-ui-state', state);
    try {
      const count = measure(id, theme, state, [element, ...element.querySelectorAll('*')]);
      judged += count;
      stateCounts.judged += count;
      stateCounts.targets += 1;
    } finally {
      if (previous === null) element.removeAttribute('data-ui-state');
      else element.setAttribute('data-ui-state', previous);
    }
  }
  stateCounts.elapsed += performance.now() - started;
  const cellId = `${id} [${theme}]`;
  const cell = cells.find((c) => c.id === cellId);
  if (cell) {
    cell.judged += judged;
    cell.walked += stats.walked - before;
  } else {
    cells.push({ id: cellId, judged, walked: stats.walked - before });
  }

  const failed = records.slice(firstRecord)
    .filter((r) => r.story === id && r.theme === theme && r.unjudgeable == null);
  const report = failed.map((r) => `${r.ratio!.toFixed(2)}:1 (needs ${r.need}) `
    + `${r.fg} on ${r.bg}\n     ${r.path}`);
  const unledgered = groupFindings(failed)
    .filter((f: Finding) => !LEDGER.some((e) => e.match(f)))
    .map((f: Finding) => `${f.ratio.toFixed(2)}:1 (needs ${f.need}) ${f.key}\n     `
      + [...f.paths].join('\n     '));
  expect(unledgered, `${cellId}\n${report.join('\n')}`).toEqual([]);
}

// The first cell of a theme pays for that theme's stylesheet parse: 395ms
// against 31ms for the second cell, on an idle 10-core laptop. Vitest's
// default 5s ceiling looks like plenty until the box is contended — the
// same first cell measured 9.5s with two other suites running, which is
// what a CI runner looks like. The ceiling is generous on purpose; it is
// there to catch a walk that stopped terminating, not a slow machine.
const CELL_TIMEOUT = 30_000;

describe('contrast: React stories', () => {
  for (const theme of THEMES) {
    for (const story of found) {
      const shares = SPLIT_STATE_SHARES[story.id];
      if (!shares) {
        it(`${story.id} [${theme}]`, () => walkCell(story, theme, null), CELL_TIMEOUT);
        continue;
      }
      it(`${story.id} [${theme}] at rest`, () => walkCell(story, theme, { atRest: true, of: shares, index: -1 }), CELL_TIMEOUT);
      for (let index = 0; index < shares; index++) {
        it(`${story.id} [${theme}] states ${index + 1} of ${shares}`,
          () => walkCell(story, theme, { atRest: false, of: shares, index }), CELL_TIMEOUT);
      }
    }
  }
});

// ---- the gate's own gate --------------------------------------------------
//
// This matters more than the pass. A contrast gate that measures nothing passes
// silently and forever, and that is strictly worse than having none — it buys a
// green tick with no coverage behind it. Every number below is a floor the gate
// cannot slip under without turning red.
describe('contrast: React coverage', () => {
  it('measured every discovered story in every theme', () => {
    // Printed, not asserted: the tally moves whenever a story changes, and an
    // exact assertion on it would be a chore rather than a guard. The guards are
    // the floors below. Printing keeps the number re-readable from a run instead
    // of remembered in a comment that will drift.
    console.log(`contrast[react]: ${files.length} files, ${found.length} stories × ${THEMES.length} themes `
      + `= ${cells.length} cells; walked ${stats.walked}, judged ${stats.judged}, `
      + `unjudgeable ${stats.unjudgeable}, hidden ${stats.hiddenSkipped}, `
      + `disabled ${stats.disabledSkipped}; per cell ${cells.map((c) => c.judged).join('/')}`);
    expect(files.length, 'story files discovered').toBeGreaterThan(0);
    expect(found.length, 'stories discovered').toBeGreaterThan(0);
    expect(cells.length, `${found.length} stories × ${THEMES.length} themes`)
      .toBe(found.length * THEMES.length);
  });

  it('the parts together walk every discovered story once', () => {
    const dealt = hands.flat();
    expect(new Set(dealt).size, 'a story dealt to two parts').toBe(dealt.length);
    expect([...dealt].sort(), 'stories left out of the parts').toEqual(allFound.map((s) => s.id).sort());
    expect(hands.length, 'parts').toBe(parts);
    expect(hands.every((h) => h.length > 0), 'a part with no story').toBe(true);
  });

  it('discovered every story the ledger names, and dealt them to part 0', () => {
    const ids = new Set(allFound.map((s) => s.id));
    expect([...SNIPPET_STORIES].filter((id) => !ids.has(id)), 'ledger stories not discovered').toEqual([]);
    expect(hands[0].filter((id) => SNIPPET_STORIES.has(id)).length, 'ledger stories in part 0')
      .toBe(SNIPPET_STORIES.size);
    expect([...LEDGER_STORIES].filter((id) => !ids.has(id)), 'foundation ledger stories not discovered').toEqual([]);
    expect([...LEDGER_STORIES].filter((id) => !hands[0].includes(id)), 'foundation ledger stories outside part 0').toEqual([]);
  });

  it('measured interaction states from the rendered catalogue', () => {
    process.stdout.write(`contrast[react] states: ${stateCounts.targets} targets, ${stateCounts.judged} pairs, ${(stateCounts.elapsed / 1000).toFixed(2)} added seconds\n`);
    expect(stateCounts.targets).toBeGreaterThan(0);
    expect(stateCounts.judged).toBeGreaterThan(0);
  });

  it('judged real pairs, not zero, in every cell', () => {
    expect(stats.judged, 'pairs judged across the whole walk').toBeGreaterThan(0);
    // Per cell, not just in total: a story that renders nothing measurable would
    // otherwise hide behind the others' pairs.
    const empty = cells.filter((c) => c.judged === 0).map((c) => c.id);
    expect(empty, 'cells that judged no pair at all').toEqual([]);
  });

  it('resolved every foreground it walked', () => {
    // The failure this catches: the stylesheet did not reach the document, or
    // reached it with var() intact. Either way `color` stops parsing and the
    // walk silently judges nothing. Non-zero here means the sheet is broken.
    expect(stats.unresolvedFg, 'elements whose colour would not parse').toBe(0);
    expect(stats.walked, 'text-owning elements walked').toBeGreaterThan(0);
  });

  it('loaded this workspace\'s own stylesheets', () => {
    // The kit's sheet alone would leave .rx-* unstyled and every rx- pair would
    // inherit — passing for the wrong reason.
    expect(cssFiles.length, 'component stylesheets discovered under react/src').toBeGreaterThan(0);
    for (const theme of THEMES) {
      expect(SHEETS[theme].local, `${theme}: react/src rules reached the sheet`)
        .toContain('.rx-modal__title');
      // Every colour under react/ is a var() onto a vanilla token; not one custom
      // property is declared here. So a leftover var() in THIS half means a token
      // the substitution could not find, and the rule it sits in resolves to
      // nothing. (The kit half is not asserted: `--skel-cols` is set inline by
      // src/components/loading.js and declared in no sheet, so its var() survives
      // substitution — a grid count, not a colour.)
      expect(SHEETS[theme].local, `${theme}: react/src var() all resolved`).not.toContain('var(--');
    }
  });

  it('every ledger entry still names a live failure', () => {
    // The vanilla gate's rule: counts asserted with ===, never as a ceiling, and
    // an entry that matches nothing is deleted rather than left to rot.
    const findings: Finding[] = groupFindings(records.filter((r) => r.unjudgeable == null));
    for (const entry of LEDGER) {
      const hit = findings.filter((f) => entry.match(f));
      expect(hit.length, `ledger entry "${entry.why}"`).toBe(homeHits(entry.count));
    }
    const ledgered = findings.filter((f) => LEDGER.some((e) => e.match(f)));
    expect(ledgered.length, 'findings covered by the ledger').toBe(
      LEDGER.reduce((n, e) => n + homeHits(e.count), 0));
    // #478 asserted the ledger was empty, and said why: the claim is stated here
    // rather than left as a silence, so adding an entry forces whoever adds it to
    // come back and say so. This is that. The ledger stopped being empty on #474,
    // and what the line claims now is narrower: React accepts the two pairs the
    // ledger names and nothing else, so an unledgered failure still fails here.
    // The two entries are named in the PR body for Artur, because the decision to
    // accept them is his and not a green suite's.
    expect(findings.filter((f) => !LEDGER.some((e) => e.match(f))),
      'React accepts only the failures its ledger names; every other pair clears AA')
      .toEqual([]);
  });
});
}
