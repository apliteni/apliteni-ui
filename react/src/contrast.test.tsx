// Contrast gate for the React workspace.
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
//  - React uses the default accent. The vanilla accent matrix runs with CONTRAST_ACCENTS=1.
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
const SNIPPET_STORIES = new Set([
  './Snippet.stories.tsx:Shell',
  './Snippet.stories.tsx:Json',
  './Snippet.stories.tsx:TypeScript',
  './Snippet.stories.tsx:Variants',
  './Snippet.stories.tsx:Comparison',
  './Snippet.stories.tsx:CopyHover',
  './Snippet.stories.tsx:Copied',
  './Snippet.stories.tsx:KeyboardFocus',
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
const modules = import.meta.glob<StoryModule>('./**/*.stories.tsx', { eager: true });
const files = Object.keys(modules).sort();

/** Every renderable story, flattened, in file order. */
const found = files.flatMap((file) => {
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
describe('contrast: React stories', () => {
  for (const theme of THEMES) {
    for (const story of found) {
      it(`${story.id} [${theme}]`, () => {
        if (document.documentElement.getAttribute('data-theme') !== theme) {
          document.documentElement.setAttribute('data-theme', theme);
          styleEl.textContent = sheetText(theme);
        }
        const { id, args } = story;
        // Stories use hooks, so the render fn has to BE a component.
        const Story = () => story.render!(args, { globals: { theme, accent: 'default' }, args });
        const before = stats.walked;
        render(<Story />);
        let judged = measure(id, theme);
        const started = performance.now();
        const bases = STATE_BASES[theme];
        for (const [element, state] of stateTargets(document.body, bases)) {
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
        cells.push({ id: `${id} [${theme}]`, judged, walked: stats.walked - before });

        const failed = records.filter((r) => r.story === id && r.theme === theme && r.unjudgeable == null);
        const report = failed.map((r) => `${r.ratio!.toFixed(2)}:1 (needs ${r.need}) `
          + `${r.fg} on ${r.bg}\n     ${r.path}`);
        const unledgered = groupFindings(failed)
          .filter((f: Finding) => !LEDGER.some((e) => e.match(f)))
          .map((f: Finding) => `${f.ratio.toFixed(2)}:1 (needs ${f.need}) ${f.key}\n     `
            + [...f.paths].join('\n     '));
        expect(unledgered, `${id} [${theme}]\n${report.join('\n')}`).toEqual([]);
      // The first cell of a theme pays for that theme's stylesheet parse: 395ms
      // against 31ms for the second cell, on an idle 10-core laptop. Vitest's
      // default 5s ceiling looks like plenty until the box is contended — the
      // same first cell measured 9.5s with two other suites running, which is
      // what a CI runner looks like. The ceiling is generous on purpose; it is
      // there to catch a walk that stopped terminating, not a slow machine.
      }, 30_000);
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
      expect(hit.length, `ledger entry "${entry.why}"`).toBe(entry.count);
    }
    const ledgered = findings.filter((f) => LEDGER.some((e) => e.match(f)));
    expect(ledgered.length, 'findings covered by the ledger').toBe(
      LEDGER.reduce((n, e) => n + e.count, 0));
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
