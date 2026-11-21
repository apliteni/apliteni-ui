/* Rule: the band's actions never stand on search, the phone band's title keeps its words
 * on one line from 561px to 720px, and the band causes no sideways scroll on a phone.
 * Before the fix the bell drew over search from 721px to 783px, because the actions'
 * column shrank below them (#847).
 *
 * Off unless BAND_ACTIONS=1: Playwright is not a dependency of this package, CI does
 * not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… BAND_ACTIONS=1 node --test stories/band-actions.test.js
 *
 * It discovers every React/AppShell story whose name starts with Band Actions, and
 * counts the ones with two actions and with a bell that shows no count. The tap zone of
 * each action is measured by stories/tap-zone.test.js, which sweeps these stories at 390.
 *
 * Its limits: one engine, the dark theme, and widths from 721px to 800px in 1px steps,
 * plus 1280, 561, 640, 720, 390 and 320. An overlap is two drawn boxes that cross by
 * more than half a pixel. The title check reads one title, "Overview" or "Payouts".
 * why: docs/components.md#page-shell
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIDE = [...Array.from({ length: 80 }, (_, i) => 721 + i), 1280];
const TITLED = [561, 640, 720];
const PHONE = [390, 320];

// What one story draws at the current width: the search and action boxes, the title's
// fit and the page's sideways overflow.
const MEASURE = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
  const ends = document.querySelector('.ui-react-app__band-actions');
  const search = document.querySelector('.ui-app__bar > .ui-app__search');
  const title = document.querySelector('.ui-react-app__title');
  const shown = title && title.checkVisibility();
  ok({
    search: search && box(search),
    actions: ends ? [...ends.children].map(box) : [],
    counted: Boolean(ends && ends.querySelector('.ui-badge')),
    title: shown ? { text: title.textContent, cut: title.scrollWidth > title.clientWidth } : null,
    overflow: document.scrollingElement.scrollWidth - window.innerWidth,
  });
})));

const crosses = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5
  && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

/** Every finding for one story at the given widths. */
async function walk(page, id, widths) {
  const found = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    const m = await page.evaluate(MEASURE);
    if (m.search && m.actions.some((a) => crosses(a, m.search))) found.push(`${id} at ${width}px: an action stands on search`);
    if (m.title?.cut) found.push(`${id} at ${width}px: the title "${m.title.text}" is cut`);
    if (m.overflow > 0) found.push(`${id} at ${width}px: the page scrolls ${m.overflow}px sideways`);
  }
  return found;
}

test('the band actions stand clear of search, keep the title and cause no sideways scroll', {
  skip: process.env.BAND_ACTIONS !== '1' && 'set BAND_ACTIONS=1',
}, async () => {
  const { serve, openStory, playwright, indexed, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'BAND_ACTIONS=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const stories = indexed(build).filter((s) => s.id.startsWith('react-appshell--band-actions'));
  assert.ok(stories.length >= 11, `${stories.length} Band Actions stories found. A sweep that lost them measures nothing.`);

  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const findings = [];
    const drawn = { pair: 0, quiet: 0, measured: 0 };
    for (const story of stories) {
      const done = await openStory(page, story, { port: server.port, theme: 'dark' });
      assert.equal(done.phase, STORY_DONE, `${story.id} did not render: ${done.phase}`);
      await page.setViewportSize({ width: 390, height: 800 });
      const at = await page.evaluate(MEASURE);
      assert.ok(at.actions.length > 0, `${story.id} draws no band actions`);
      if (at.actions.length === 2) drawn.pair += 1;
      if (!at.counted) drawn.quiet += 1;
      findings.push(...await walk(page, story.id, [...WIDE, ...TITLED, ...PHONE]));
      drawn.measured += 1;
    }
    assert.equal(drawn.measured, stories.length, 'a story was not measured');
    assert.ok(drawn.pair >= 2, `${drawn.pair} stories draw two actions. The pair needs a wide and a phone case.`);
    assert.ok(drawn.quiet >= 1, `${drawn.quiet} stories draw a bell with no count.`);
    assert.deepEqual(findings, []);

    // The mutation: the actions' column as it was before the fix lets the bell stand on
    // search, and this walk must say so.
    const pair = stories.find((s) => s.id === 'react-appshell--band-actions-pair');
    assert.ok(pair, 'the mutation needs react-appshell--band-actions-pair');
    await openStory(page, pair, { port: server.port, theme: 'dark' });
    await page.addStyleTag({ content: '.ui-app__bar { grid-template-columns: minmax(0, 1fr) minmax(0, var(--panel-sm)) minmax(0, 1fr) !important; }' });
    const mutated = await walk(page, pair.id, WIDE);
    assert.ok(mutated.some((f) => f.includes('stands on search')), 'the old column passed: this walk cannot see an overlap');
  } finally {
    server.proc.kill();
    await browser.close();
  }
});
