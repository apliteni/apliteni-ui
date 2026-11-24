// The flat-bar gate, read from the output it would let onto a page instead of
// from the source text.
//
// why: #863, the owner's answer rev_d5c14def2df6/d9. The owner chose one bar
// style for every chart — look A from 9829df75: one flat tone, no fade ramp,
// and a corner of --radius-xs or a quarter of the bar width, whichever is
// smaller. The old bridge style was a fully round measured end with a fade
// ramp, and rounds 2 and 4 of this PR went the wrong way and kept it. This gate
// draws the output instead, so the source text cannot hide a bar. Every subject
// — the `bars()` helper the Hover readouts page calls, the two guideline pages,
// and the Chart stories that draw bars — is rendered to markup and read back. A
// bar that is a rect, a bar with a fully round end, or a bar painted by a fade
// ramp fails.
//
// LIMITS:
//  - Markup, not paint. JSDOM lays nothing out, so the drawn bar's true colour
//    is not measured. The corner is read from the `d` path: each arc radius must
//    stay at --radius-xs (6px) or a quarter of the bar's width or the bar's
//    height, whichever is smallest, read with a 0.1px rounding tolerance. A bar
//    shorter than --radius-xs keeps its corner capped by its height, so a round
//    end on a very short step is not told apart here; `keeps short floating
//    bridge steps rectangular` in Chart.test.tsx holds that edge.
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

/* Look A's corner: --radius-xs. A bar's corner is this or a quarter of the bar's
   width, whichever is smaller, so no arc in the path ever passes this radius. */
const CORNER = 6;
/* The path writes the radius rounded to one decimal, so a quarter of a rounded
   width can land a tenth off; this is the slack the comparison allows. */
const TOL = 0.1;

/** Parse rendered markup the way a page would, and hand back its body. */
const bodyOf = (markup: string): ParentNode =>
  new JSDOM(`<!doctype html><html><body>${markup}</body></html>`).window.document.body;

/** A bar's box and corner radii, read off the path the component wrote. A bar is
 *  a path, not a rect, because SVG gives a rect one radius for all four corners
 *  and a bar standing on the zero line needs none at its foot. The bar paths use
 *  only M, V/v, H/h, a and z, so walking those commands yields the box and each
 *  arc's radius (rx, which equals ry on every bar). */
function geometryOf(d: string) {
  const xs: number[] = [];
  const ys: number[] = [];
  const radii: number[] = [];
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (cmd === 'M') { [x, y] = n; }
    else if (cmd === 'V') { [y] = n; }
    else if (cmd === 'v') { y += n[0]; }
    else if (cmd === 'H') { [x] = n; }
    else if (cmd === 'h') { x += n[0]; }
    else if (cmd === 'a') { radii.push(n[0]); x += n[5]; y += n[6]; }
    xs.push(x);
    ys.push(y);
  }
  return { x: Math.min(...xs), y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), radii };
}

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
 *  SVG rect takes one radius for all four corners, while the small corner and
 *  the square foot need two. Look A also draws no fade ramp, so a bar that names
 *  a ramp paint, or an arc radius past --radius-xs, is a round end or a ramp
 *  and fails. */
function barProblems(bar: Element): string[] {
  const tag = bar.tagName.toLowerCase();
  if (tag !== 'path') {
    return [`a bar is a <${tag} class="${bar.getAttribute('class')}">, not a path`];
  }
  const d = (bar.getAttribute('d') ?? '').trim();
  if (!d.startsWith('M')) return [`a bar path has no d (got \`${d}\`)`];
  const problems: string[] = [];
  if ((bar.getAttribute('style') ?? '').includes('--ui-chart-paint')) {
    problems.push('a bar names a ramp paint (--ui-chart-paint)');
  }
  if ((bar.getAttribute('fill') ?? '').startsWith('url(#')) {
    problems.push(`a bar is painted by a ramp (${bar.getAttribute('fill')})`);
  }
  const { width, height, radii } = geometryOf(d);
  for (const r of radii) {
    const cap = Math.min(CORNER, width / 4, height);
    if (r > cap + TOL) {
      problems.push(`a bar's corner radius ${r} exceeds min(--radius-xs ${CORNER}, width/4 ${(width / 4).toFixed(1)}, height ${height}) = ${cap.toFixed(1)}`);
    }
  }
  return problems;
}

/** The markup one React story's render body produces. */
const markupOf = (renderStory: Story['render']): string => {
  const Story = () => renderStory!({} as never, {} as never);
  return renderToStaticMarkup(<Story />);
};

type Subject = { name: string; root: ParentNode; bars: Element[] };

/* ---- the subjects ------------------------------------------------------- */

/* Every exported story of the two guideline pages and of the Chart story file,
 * kept only when it draws at least one bar, plus the `bars()` helper the Hover
 * readouts page calls. A line, area, stacked, donut or spark story draws no bar
 * and is not a subject; a story that used to draw bars and stops drops the
 * count below the floor and fails there. */
const subjectOf = (name: string, root: ParentNode): Subject => ({ name, root, bars: barsIn(root) });
const subjects: Subject[] = [
  subjectOf('stories/_chart.js → bars', bodyOf(bars({ values: REVENUE }).svg)),
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
    const root = bodyOf(markupOf(renderStory));
    const found = barsIn(root);
    if (found.length > 0) subjects.push(subjectOf(`${file} → ${name}`, root));
  }
}

/* Measured, not guessed: the floor as this gate first rendered the collection.
 * Every figure is a lower bound, so the gate fails when a subject stops drawing
 * bars, when the discovery stops reaching one, or when a reader drops bars.
 * #863 dropped two bars when the chart-table-switch Do shortened its months chart
 * to four labelled bars, so the floor fell from 349 to 347. */
const FOUND = { subjects: 14, bars: 347 };

describe('flat bar', () => {
  it('found the bar-drawing subjects and drew each bar flat, small-cornered, with no ramp', () => {
    expect(subjects.length, 'no bar-drawing subject was found').toBeGreaterThan(0);
    expect(subjects.length, 'a bar-drawing subject renders no bar or went missing')
      .toBeGreaterThanOrEqual(FOUND.subjects);

    const failures: string[] = [];
    let total = 0;
    for (const subject of subjects) {
      total += subject.bars.length;
      if (subject.bars.length === 0) failures.push(`${subject.name} draws no bar`);
      if (subject.root.querySelectorAll('linearGradient').length > 0) {
        failures.push(`${subject.name} draws a fade ramp`);
      }
      for (const bar of subject.bars) {
        for (const problem of barProblems(bar)) failures.push(`${subject.name}: ${problem}`);
      }
    }

    expect(total, 'fewer bars than when this gate was written')
      .toBeGreaterThanOrEqual(FOUND.bars);
    expect(failures).toEqual([]);
  });
});
