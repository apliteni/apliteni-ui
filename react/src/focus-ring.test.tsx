// The keyboard walk for the React workspace.
//
// Share the calculation but check each workspace separately: the reading lives in
// stories/lib/focus-walk.js and is unit-tested in stories/lib/focus-walk.test.js;
// the vanilla surfaces are walked in stories/focus-ring.test.js. Same rule as
// there — Artur refused the browser's own focus outline on #457, so a stop that
// draws it, or draws an outline of its own instead of the shared ring, fails.
//
// Wider here than the vanilla gate: every *.stories.tsx under react/src is
// mounted, not three named surfaces. This workspace ships no guideline pages, so
// nothing here draws a counter-example on purpose.
//
// WHAT THIS GATE WILL NOT CATCH. The vanilla walk's limits (stories/
// focus-ring.test.js, header) apply here too. Differences of its own:
//
//  - The tree is real, so a portal lands in document.body and is walked with the
//    rest; the sheet is the kit's plus this workspace's.
//  - One theme. A focus rule is a fact about the source, and the ring's colour
//    against each ground is measured in contrast.test.tsx and in the vanilla
//    accessibility floor.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactElement } from 'react';
// stories/lib/* is plain JS outside this workspace's tsconfig, imported for its
// reading of the sheet, exactly as contrast.test.tsx imports the arithmetic.
// @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
import { STYLE_FILES } from '../../stories/lib/contrast.js';
// @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
import { focusRules, judgeStops, failures, keyboardStops, ringRulesFor, scrollingSelectors, sheetText } from '../../stories/lib/focus-walk.js';

/**
 * The repository root, found by climbing from the working directory rather than
 * from `import.meta.url`: `npm test -w react` runs from react/ and
 * `vitest --root react` from the root, and Vite rewrites a literal
 * `new URL(…, import.meta.url)` into an asset URL that `fileURLToPath` refuses.
 * It throws rather than guessing, so a moved file is a failure and not a skip.
 */
function repositoryRoot(): string {
  let dir = process.cwd();
  for (let up = 0; up < 4; up++) {
    if (existsSync(path.join(dir, 'src/index.css'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error(`cannot find the kit's stylesheets from ${process.cwd()}`);
}
const ROOT = repositoryRoot();
const readKit = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const readLocal = (rel: string) => readFileSync(path.join(ROOT, 'react/src', rel.replace('./', '')), 'utf8');

type Rule = { origin: string; selector: string; subject: string; within: boolean;
  paints: { ring: boolean; outline: string | null; shadow: string | null } };

const kitRules: Rule[] = (STYLE_FILES as string[]).flatMap((file) => focusRules(readKit(file), file));
const localFiles = Object.keys(import.meta.glob('./**/*.css')).sort();
const localSheets = localFiles.map((file) => ({
  file: `react/src/${file.replace('./', '')}`, css: readLocal(file),
}));
const localRules: Rule[] = localSheets.flatMap(({ file, css }) => focusRules(css, file));
const rules = [...kitRules, ...localRules];

/**
 * Stops that keep their own answer, each with the reason the source states, and
 * each asserted below to still exist — an exemption that outlives its control
 * fails this file rather than hiding the next hole behind it.
 */
const EXEMPT = [
  {
    selector: '.ui-cmdk__input',
    why: 'the palette\'s only tab stop holds focus for as long as the dialog is up, so a ring '
      + 'would be painted the whole time and mark nothing. Stated on the declaration in '
      + 'src/styles/command-palette.css.',
  },
  {
    selector: '.ui-cmdk__item',
    why: 'the palette never focuses a row. CommandPalette.tsx has no focus() call at all; '
      + 'focus stays in the input, and the row the reader is on is announced by '
      + 'react/src/CommandPalette.tsx:156 `aria-activedescendant`. A ring needs a stop, and '
      + 'there is none. The rows are walked at all only because #487 added `option` to '
      + 'ROVING_ROLES in the shared reader, so that the vanilla kit\'s .vopt — which IS '
      + 'focused, by the arrow keys — could be seen. The vanilla gate exempts them for the '
      + 'same reason.',
  },
];
type Stop = { el: HTMLElement; label: string; status: string; detail: string };
const exempt = (stop: Stop) => EXEMPT.some(({ selector }) => stop.el.matches(selector));

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;

// The same glob a11y.test.tsx, contrast.test.tsx and react/.storybook/main.ts
// use, so a new story file is in the gate the moment it exists.
const modules = import.meta.glob<StoryModule>('./**/*.stories.tsx', { eager: true });
const found = Object.keys(modules).sort().flatMap((file) => {
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

const styleEl = document.createElement('style');
document.head.appendChild(styleEl);
afterEach(cleanup);

const counts = { stories: 0, stops: 0, exempted: 0 };

describe('focus ring: React stories', () => {
  for (const story of found) {
    it(story.id, () => {
      // Stories use hooks, so the render fn has to BE a component.
      const Story = () => story.render!(story.args, { globals: { theme: 'dark', accent: 'default' }, args: story.args });
      render(<Story />);
      const { stops, unmatchable } = judgeStops(document.body, rules);
      expect(unmatchable, 'a selector this walk cannot match is a control it never judged').toEqual([]);
      counts.stories += 1;
      counts.stops += stops.length;
      counts.exempted += stops.filter(exempt).length;
      expect(failures(stops, exempt), `${story.id} draws something other than the shared ring`).toEqual([]);
    });
  }

  // The anti-vacuity check: a walk that finds no controls passes every assertion
  // above it. Floors rather than exact counts, because a new React story is a
  // routine change here and its stops are judged by the loop above.
  it('walked enough of this workspace to mean something', () => {
    expect(counts.stories).toBeGreaterThanOrEqual(60);
    expect(counts.stops).toBeGreaterThanOrEqual(250);
    expect(kitRules.length).toBeGreaterThanOrEqual(30);
    expect(localRules.length).toBeGreaterThanOrEqual(3);
    expect(counts.exempted, 'the command palette stories still hold their input').toBeGreaterThan(0);
  });

  it('every exemption still names a control this workspace renders', () => {
    render(<div />);
    for (const { selector, why } of EXEMPT) {
      const anywhere = found.some((story) => {
        cleanup();
        const Story = () => story.render!(story.args, { globals: { theme: 'dark', accent: 'default' }, args: story.args });
        render(<Story />);
        return keyboardStops(document.body).some((el: HTMLElement) => el.matches(selector));
      });
      expect(anywhere, `${selector} is exempt ("${why}") but nothing renders one — drop the entry`).toBe(true);
    }
  });

  // Prove the gate rejects. The mutation is the defect #482 fixed: take the ring
  // rule off a control the workspace renders and the walk has to notice.
  it('a control whose ring rule is removed fails', () => {
    const story = found.find((s) => s.id.includes('Snippet.stories'))!;
    const Story = () => story.render!(story.args, { globals: { theme: 'dark', accent: 'default' }, args: story.args });
    render(<Story />);
    const without = rules.filter((rule) => rule.subject !== '.ui-snippet__copy');
    expect(without.length, 'the snippet copy rule is the subject of this mutation').toBeLessThan(rules.length);
    const { stops } = judgeStops(document.body, without);
    const broken = failures(stops, exempt) as string[];
    expect(broken.some((line) => line.startsWith('native:') && line.includes('ui-snippet__copy'))).toBe(true);
  });
});

// ---- #531: the scroll containers this workspace declares --------------------
//
// Chrome makes a scroll container a keyboard stop of its own, with no tabindex and
// no author rule, unless its own children are keyboard-focusable. So an overflowing
// box has the same claim on the ring as a button. The kit's eight are triaged in
// stories/focus-ring.test.js; this workspace declares one of its own, and the sheet
// it is in is never read there. The subject is discovered from the CSS, so a new
// overflowing box here is triaged rather than shipping with the browser's outline.
//
// Separate coverage, shared calculation: `scrollingSelectors` and `ringRulesFor`
// are the vanilla gate's reading, over this workspace's sheets.
const RX_SCROLL_RINGED: Record<string, string> = {
  '.rx-modal__body': 'on the MODAL, the way #474 paints a snippet\'s ring on its card: the '
    + 'body is flush with the panel\'s sides, the panel clips with `overflow: hidden`, and '
    + 'the body has no radius of its own, so a ring drawn on it is cut on three sides. '
    + 'The body is a stop whenever the caller\'s children hold no control. #531',
};

describe('focus ring: scroll containers', () => {
  it('every box this workspace makes scrollable is triaged', () => {
    const scrolling = scrollingSelectors(localSheets) as string[];
    expect(scrolling, 'a scrolling box appeared or moved — triage it here with its reason')
      .toEqual(Object.keys(RX_SCROLL_RINGED));
    const bare = scrolling.filter((selector) => ringRulesFor(selector, rules).length === 0);
    expect(bare, 'a scrolling box with no ring falls back to the browser\'s outline').toEqual([]);
    for (const [selector, why] of Object.entries(RX_SCROLL_RINGED)) {
      expect(why.length, `${selector} needs the box its ring is painted on in prose`)
        .toBeGreaterThanOrEqual(80);
    }
  });

  // Prove it rejects: take every rule that answers the box's focus back out of its
  // own sheet and the box has to fall into the bare list.
  it('a scroll container losing its ring is caught', () => {
    for (const selector of Object.keys(RX_SCROLL_RINGED)) {
      const answering = ringRulesFor(selector, rules) as Array<Rule & { origin: string; raw: string }>;
      expect(answering.length, `${selector} has no ring rule to take out`).toBeGreaterThan(0);
      const mutated = localSheets.map((sheet) => {
        const mine = answering.filter((rule) => rule.origin === sheet.file);
        if (!mine.length) return sheet;
        return { ...sheet, css: mine.reduce((css: string, rule) => css.split(rule.raw).join(''), sheetText(sheet.css) as string) };
      });
      const kept = [...kitRules, ...mutated.flatMap(({ file, css }) => focusRules(css, file))];
      expect(ringRulesFor(selector, kept), `${selector} kept a ring after its rule was deleted`)
        .toEqual([]);
    }
  });
});
