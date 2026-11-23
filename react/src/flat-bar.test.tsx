// The flat-bar gate, read from the output it would let onto a page instead of
// from the source text.
//
// why: #863, the owner's answer rev_81f3b7d55c9b/d7. The owner chose one bar
// style — a round measured end, a square foot on zero, and a fade ramp — and
// the old helper drew a `<rect class="ch-bar">` with 2 px corners and a flat
// fill. The source-text gate at stories/story-css.test.js read the files, so the
// original markup `class="ch-bar${i === hot ? ' is-on' : ''}"` walked past it:
// the reader treated the template expression as part of the class name. This
// gate draws the output instead. Every subject — the `bars()` helper the Hover
// readouts page calls, the two guideline pages, and the Chart stories that draw
// bars — is rendered to markup and read back. A bar that is a rect, or a bar
// with no path, fails.
//
// LIMITS:
//  - Markup, not paint. JSDOM lays nothing out, so the drawn bar's true round
//    end is not measured. A bar is checked to be a `<path>` whose `d` moves the
//    pen, never a `<rect>`; the `d` is read as text, not walked as geometry, so
//    a path that spelled a plain rectangle would pass — the old flat bar was a
//    rect, never a path.
//  - Only the render body is run. A story whose bars appear only after a
//    Storybook `play` is not measured that far; none of the bar-drawing stories
//    does, and each is read through its own `render`.
//  - The floors below are lower bounds, counted when this gate was written, so
//    a subject that stops drawing bars, or a reader that stops reaching bars,
//    fails rather than passing quietly.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import type { ReactElement } from 'react';

// @ts-expect-error -- plain JS chart helper, drawn bars, no types
import { bars, REVENUE } from '../../stories/_chart.js';
import * as ChartStories from './Chart.stories';
import * as DashboardsStories from '../../stories/guidelines/DashboardsAndReports.stories';
import * as HoverStories from '../../stories/guidelines/HoverReadouts.stories';

type Story = { render?: (args?: unknown, ctx?: unknown) => ReactElement };
type StoryModule = { default?: Story } & Record<string, unknown>;

/* The bar classes: the vanilla helper's `ch-bar` and the React Chart's
   `ui-chart__bar`. `ch-hit`, `ch-cap`, `ui-chart__hit` and `ui-chart__anchor`
   are rects but not bars, so they are not matched. */
const BAR_CLASSES = ['ch-bar', 'ui-chart__bar'];

/** Parse rendered markup the way a page would, and hand back its body. */
const bodyOf = (markup: string): ParentNode =>
  new JSDOM(`<!doctype html><html><body>${markup}</body></html>`).window.document.body;

/** Every element under `root` whose own class list names a bar. */
function barsIn(root: ParentNode): Element[] {
  const found: Element[] = [];
  for (const el of root.querySelectorAll('*')) {
    const list = (el.getAttribute('class') ?? '').split(/\s+/);
    if (BAR_CLASSES.some((name) => list.includes(name))) found.push(el);
  }
  return found;
}

/** What is wrong with one bar. The owner's bar is drawn as a path because an
 *  SVG rect takes one radius for all four corners, while the round measured end
 *  and the square foot need two. */
function barProblems(bar: Element): string[] {
  const tag = bar.tagName.toLowerCase();
  if (tag !== 'path') {
    return [`a bar is a <${tag} class="${bar.getAttribute('class')}">, not a path`];
  }
  const d = (bar.getAttribute('d') ?? '').trim();
  if (!d.startsWith('M')) return [`a bar path has no d (got \`${d}\`)`];
  return [];
}

/** The markup one React story's render body produces. */
const markupOf = (renderStory: Story['render']): string => {
  const Story = () => renderStory!({} as never, {} as never);
  return renderToStaticMarkup(<Story />);
};

type Subject = { name: string; bars: Element[] };

/* ---- the subjects ------------------------------------------------------- */

/* Every exported story of the two guideline pages and of the Chart story file,
 * kept only when it draws at least one bar, plus the `bars()` helper the Hover
 * readouts page calls. A line, area, stacked, donut or spark story draws no bar
 * and is not a subject; a story that used to draw bars and stops drops the
 * count below the floor and fails there. */
const subjects: Subject[] = [
  { name: 'stories/_chart.js → bars', bars: barsIn(bodyOf(bars({ values: REVENUE }).svg)) },
];

for (const [file, mod] of [
  ['react/src/Chart.stories.tsx', ChartStories],
  ['stories/guidelines/DashboardsAndReports.stories.tsx', DashboardsStories],
  ['stories/guidelines/HoverReadouts.stories.tsx', HoverStories],
] as [string, StoryModule][]) {
  const def = (mod.default ?? {}) as Story;
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const renderStory = (story as Story).render ?? def.render;
    if (typeof renderStory !== 'function') continue;
    const bars = barsIn(bodyOf(markupOf(renderStory)));
    if (bars.length > 0) subjects.push({ name: `${file} → ${name}`, bars });
  }
}

/* Measured, not guessed: the floor as this gate first rendered the collection.
 * Every figure is a lower bound, so the gate fails when a subject stops drawing
 * bars, when the discovery stops reaching one, or when a reader drops bars. */
const FOUND = { subjects: 14, bars: 349 };

describe('flat bar', () => {
  it('found the bar-drawing subjects and drew each bar as a path', () => {
    expect(subjects.length, 'no bar-drawing subject was found').toBeGreaterThan(0);
    expect(subjects.length, 'a bar-drawing subject renders no bar or went missing')
      .toBeGreaterThanOrEqual(FOUND.subjects);

    const failures: string[] = [];
    let total = 0;
    for (const subject of subjects) {
      total += subject.bars.length;
      if (subject.bars.length === 0) failures.push(`${subject.name} draws no bar`);
      for (const bar of subject.bars) {
        for (const problem of barProblems(bar)) failures.push(`${subject.name}: ${problem}`);
      }
    }

    expect(total, 'fewer bars than when this gate was written')
      .toBeGreaterThanOrEqual(FOUND.bars);
    expect(failures).toEqual([]);
  });
});
