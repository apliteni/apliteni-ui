// Contrast gate for the React workspace.
//
// Same rule as stories/contrast.test.js: a foreground/background pair this
// workspace renders as text must clear WCAG AA, or be named in the ledger below
// by a person who decided it is acceptable. There is no hand-maintained list of
// pairs — every `*.stories.tsx` under react/src is mounted in both themes and
// every text-owning element is measured against the background chain composited
// above it.
//
// WHY IT IS A SECOND FILE AND NOT A SECOND GLOB. stories/lib/contrast.js's
// `walkStories` cannot reach this workspace: it discovers `stories/**.stories.js`,
// calls each story's render fn as a plain function and assigns the result to
// `innerHTML`. A React story returns a ReactElement — `serialize()` returns null
// for one — and its render fn calls hooks, so it has to BE a component and has
// to actually mount. So this file borrows the resolver's PURE half (tokensFor,
// substitute, desugar, parseColour, composite, ratio, effectiveBackground,
// hasOwnText, selectorPath, groupFindings, kitCssFor) and re-expresses the walk
// through vitest + @testing-library/react. The arithmetic is shared; only the
// mounting differs. react/src/a11y.test.tsx made the same trade for axe.
//
// WHERE THE STYLESHEET COMES FROM, AND WHY NOT FROM VITE. Vitest's `css` option
// would make `import './Modal.css'` land in the test DOM, but it would land
// verbatim — and every colour in this workspace is a var() onto a vanilla-kit
// token, which JSDOM does not resolve. `color: var(--muted)` reads back as the
// literal string `var(--muted)`, parseColour returns null, and the gate would
// measure nothing while reporting green. So the CSS is read off disk and the
// token file for the theme under test is substituted into it first, exactly as
// the vanilla gate does. `css` stays off; turning it on would only add a second,
// unresolvable copy of each sheet to the same document.
//
// Discovery is still Vite's: `import.meta.glob('./**/*.css')` is evaluated for
// its KEYS only (not eager — nothing is imported), so a new component stylesheet
// is in the gate the moment it exists. Nobody has to remember to list it, and
// the count is asserted at the foot of this file.
//
// WHAT THIS GATE WILL NOT CATCH. The vanilla gate's list of blind spots
// (stories/contrast.test.js, header) applies here unchanged and is not repeated.
// Two differences are worth naming, both narrowing:
//
//  - No state pass. The vanilla walk desugars :hover/:focus-visible into
//    attribute selectors and sets them. Nothing under react/ declares a colour
//    in a state — .rx-sort:focus-visible sets an outline, which is non-text
//    contrast the gate does not judge either way — so the pass would cost two
//    more renders to measure zero new pairs. Add it when a state rule paints text.
//  - One accent. Like the vanilla gate's default cell, this measures `default`
//    only. The accent matrix there is behind CONTRAST_ACCENTS=1 and off.
//
// And one that is wider here than there: this walks a REAL React tree, so what
// is measured is what the component renders for the props the story passes —
// including Modal's portal, which lands in document.body outside the render
// container. The walk scans document.body for exactly that reason.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import {
  AA_LARGE, AA_TEXT, composite, desugar, effectiveBackground, groupFindings,
  hasOwnText, kitCssFor, parseColour, ratio, selectorPath, substitute, tokensFor,
  // stories/lib/contrast.js is plain JS outside this workspace's tsconfig. It is
  // imported for its arithmetic, which is unit-tested in stories/lib/contrast.test.js.
  // @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
} from '../../stories/lib/contrast.js';

const THEMES = ['dark', 'light'] as const;
type Theme = (typeof THEMES)[number];

/* ─────────────────────────────────────────────────────────────────────────────
 * THE LEDGER IS WRITTEN BY HAND ON PURPOSE. DO NOT BUILD A SCRIPT THAT
 * REGENERATES IT. The reasoning is stories/contrast.test.js's, in full, and it
 * governs this list too: the mandatory `why` is the anti-automation device,
 * because a regenerator would have to invent the sentence explaining why a
 * failure is acceptable debt, and it cannot.
 *
 * An entry names a CAUSE, not an element instance. `match` is tested against a
 * grouped finding's key, which carries the measured literals — so a token move
 * stops the entry matching and turns the gate red rather than absorbing the
 * change. `count` is asserted with === so a fix in one row cannot mask a
 * regression in another.
 * ────────────────────────────────────────────────────────────────────────── */
type LedgerEntry = { match: (f: Finding) => boolean; count: number; why: string };

// Empty, and that is the current truth rather than an aspiration. This gate
// found exactly one cause on its first run — the sort caret, which painted
// --muted at opacity .5 and so measured 2.39:1 dark and 2.16:1 light against a
// 4.5 floor. It was recorded here rather than accepted, and #131 then removed
// the opacity instead of ledgering it, which is why the list is empty. An entry
// belongs here only when a person has decided a failure is debt and written down
// why; until then the gate is simply green.
const LEDGER: LedgerEntry[] = [];

type Finding = {
  key: string; theme: string; accent: string; state: string | null;
  fg: string; bg: string; ratio: number; need: number;
  paths: Set<string>; stories: Set<string>;
};
type Record_ = {
  story: string; theme: string; accent: string; state: null; path: string;
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
const stats = { walked: 0, judged: 0, unjudgeable: 0, hiddenSkipped: 0, disabledSkipped: 0, unresolvedFg: 0 };

/** Measure every text-owning element now in document.body. Returns pairs judged. */
function measure(story: string, theme: Theme): number {
  let judged = 0;
  for (const el of document.body.querySelectorAll('*')) {
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
        story, theme, accent: 'default', state: null, path: selectorPath(el),
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
      story, theme, accent: 'default', state: null, path: selectorPath(el),
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
        const judged = measure(id, theme);
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
      // nothing. (The kit half is not asserted: `substitute`'s fallback pattern
      // stops at nested parens, so 49 easing fallbacks survive in both themes —
      // cubic-beziers, no colour among them.)
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
  });
});
