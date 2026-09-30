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
import { focusRules, judgeStops, failures, keyboardStops } from '../../stories/lib/focus-walk.js';

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
const localRules: Rule[] = localFiles.flatMap((file) => focusRules(
  readLocal(file), `react/src/${file.replace('./', '')}`,
));
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
