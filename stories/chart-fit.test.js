/* Rule: a months chart, its rows look and a bridge of up to four steps fit their card with
 * no sideways scroll. Each key, click and tap on such a chart keeps the focus in the chart,
 * moves a fixed element by at most 1px, keeps the cumulative layout shift under 0.1 and
 * causes no sideways scroll. Escape closes the readout.
 *
 * Off unless CHART_FIT=1: Playwright and web-vitals are not dependencies of this package,
 * CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js CHART_FIT=1 \
 *     node --test stories/chart-fit.test.js
 *
 * The subjects are found, not listed: every React chart story in the Storybook build, and in
 * each story every `.ui-chart--bars`, `.ui-chart--bars-rows` and bridge of at most four
 * columns. Each story opens at ten window sizes and on six devices, in light and dark: the
 * Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's list, and a two-screen
 * phone of 466×678 and 890×626 at scale 3 with touch. The walk opens react-chart--fit-the-card
 * in light at each size and device. On each of its three charts it focuses the chart, presses
 * the arrows, Home and End, then clicks or taps a mark, then presses Escape. It presses Down
 * on the rows look only, because a column chart leaves Down to the page. It also walks the rows
 * look of react-chart--long-category-names, which is taller than a landscape phone's view.
 * After each key, the open readout lies inside the view. After End and Home on a rows look,
 * the last or the first row lies inside the view too. While a readout is open, at most one bar
 * is active, and it draws at full strength. On a rows look the open row's bar is that bar.
 * After Escape no bar is active.
 *
 * Its limits: one engine and the default accent. A wider bridge and the line, area, stacked
 * and donut charts may scroll, so they are not subjects. The fixed check reads every
 * element the page fixes, except the readout, which follows its mark. The Storybook canvas has
 * none of its own, so on these stories the check finds nothing to read. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input. The source half is in react/src/Chart.test.tsx.
 * why: docs/components.md#chart
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];
const THEMES = ['light', 'dark'];
const WALK = 'react-chart--fit-the-card';
/** The rows look that runs past a landscape view, walked as its story's first chart. */
const TALL = 'react-chart--long-category-names';
/** The charts that must fit: a months chart, its rows look, and a bridge of up to four steps. */
const SUBJECT = '.ui-chart--bars, .ui-chart--bars-rows, .ui-chart--bridge';

const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));

// Each subject chart's sideways overflow, and the page's.
const FIT = (selector) => {
  const doc = document.scrollingElement;
  const charts = [...document.querySelectorAll(selector)].filter((chart) => !chart.classList.contains('ui-chart--bridge')
    || Number(chart.style.getPropertyValue('--ui-chart-cols')) <= 4);
  return {
    page: doc.scrollWidth - doc.clientWidth,
    charts: charts.map((chart) => {
      const scroll = chart.querySelector('.ui-chart__scroll');
      return { name: chart.querySelector('[role="group"]')?.getAttribute('aria-label')?.split('.')[0] ?? '?',
        over: scroll ? scroll.scrollWidth - scroll.clientWidth : 0 };
    }),
  };
};

// The walked chart's state: the focus, the open readout, the boxes of the fixed elements,
// the layout shift so far and the page's sideways overflow.
const READ = (index) => {
  const chart = document.querySelectorAll('.ui-chart')[index];
  const doc = document.scrollingElement;
  const fixed = [...document.querySelectorAll('body *')]
    .filter((el) => !el.closest('.ui-tip') && getComputedStyle(el).position === 'fixed')
    .map((el) => { const b = el.getBoundingClientRect(); return [b.left, b.top]; });
  return {
    cls: window.__cls,
    over: doc.scrollWidth - doc.clientWidth,
    focus: chart.contains(document.activeElement),
    open: Boolean(chart.querySelector('.ui-tip.is-open')),
    fixed,
    // The vertical span of the open readout, of the first and the last row, and of the view.
    tip: span(chart.querySelector('.ui-tip.is-open')),
    first: span(chart.querySelector('.ui-chart__hit')),
    last: span([...chart.querySelectorAll('.ui-chart__hit')].at(-1)),
    view: window.innerHeight,
    // The strength of each active bar, and whether the chart is a rows look.
    active: [...chart.querySelectorAll('path.ui-chart__bar.is-active')].map((el) => getComputedStyle(el).opacity),
    rows: chart.matches('.ui-chart--bars-rows'),
  };
  function span(el) {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return [b.top, b.bottom];
  }
};

async function open(browser, port, vitals, context, story, theme) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC', reducedMotion: 'reduce' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, story);
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.evaluate(frames);
  return { ctx, page };
}

// One chart's walk. Each step acts, waits two frames, and reads the four checks.
async function walk(page, label, index, touch) {
  const found = [];
  const frame = page.locator('.ui-chart').nth(index).locator('.ui-chart__frame');
  const mark = page.locator('.ui-chart').nth(index).locator('.ui-chart__hit').nth(1);
  await frame.scrollIntoViewIfNeeded();
  // Only the rows look steps on Down. On a column chart the browser scrolls the page with it,
  // and a page scroll closes the readout on purpose.
  const rows = await page.locator('.ui-chart').nth(index).evaluate((el) => el.matches('.ui-chart--bars-rows'));
  const steps = [
    ['key: focus', () => frame.focus()],
    ['key: ArrowRight', () => page.keyboard.press('ArrowRight')],
    ...rows ? [['key: ArrowDown', () => page.keyboard.press('ArrowDown')]] : [],
    ['key: End', () => page.keyboard.press('End')],
    ['key: ArrowLeft', () => page.keyboard.press('ArrowLeft')],
    ['key: Home', () => page.keyboard.press('Home')],
    [touch ? 'tap: a mark' : 'click: a mark', () => (touch ? mark.tap() : mark.click())],
    ['key: Escape', () => page.keyboard.press('Escape')],
  ];
  let before = await page.evaluate(READ, index);
  for (const [name, act] of steps) {
    await act();
    await page.evaluate(frames);
    const s = await page.evaluate(READ, index);
    const at = `${label} ${name}`;
    if (!s.focus) found.push(`${at}: the focus left the chart`);
    if (s.over > 0) found.push(`${at}: the page scrolls ${s.over}px sideways`);
    if (s.cls >= 0.1) found.push(`${at}: layout shift ${s.cls.toFixed(3)}`);
    if (name === 'key: Escape' && s.open) found.push(`${at}: Escape did not close the readout`);
    if (name !== 'key: Escape' && name !== 'key: focus' && !s.open) found.push(`${at}: no readout opened`);
    const outside = (box) => box && (box[0] < -0.5 || box[1] > s.view + 0.5);
    if (name.startsWith('key: ') && name !== 'key: Escape' && outside(s.tip)) {
      found.push(`${at}: the readout is out of view, ${s.tip.map(Math.round).join(' to ')} in a ${s.view}px view`);
    }
    if (s.active.length > 1) found.push(`${at}: ${s.active.length} bars are active`);
    if (s.active.some((o) => o !== '1')) found.push(`${at}: the active bar draws at ${s.active.join(', ')}`);
    if (s.open && s.rows && s.active.length !== 1) found.push(`${at}: the open row has no active bar`);
    if (!s.open && s.active.length) found.push(`${at}: a bar stays active with no readout`);
    const row = rows && (name === 'key: End' ? s.last : name === 'key: Home' ? s.first : null);
    if (outside(row)) found.push(`${at}: the row is out of view, ${row.map(Math.round).join(' to ')} in a ${s.view}px view`);
    if (s.fixed.length !== before.fixed.length
      || s.fixed.some(([x, y], i) => Math.abs(x - before.fixed[i][0]) > 1 || Math.abs(y - before.fixed[i][1]) > 1)) {
      found.push(`${at}: a fixed element moved`);
    }
    before = s;
  }
  return { found, ran: steps.length };
}

test('a months chart, its rows look and a short bridge fit their card, and hold through each key, click and tap', {
  skip: process.env.CHART_FIT !== '1' && 'set CHART_FIT=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'CHART_FIT=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const stories = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries)
    .filter((id) => id.startsWith('react-chart--'));
  assert.ok(stories.length >= 20, `${stories.length} chart stories in the build. A discovery that collapsed measures nothing.`);
  assert.ok(stories.includes(WALK), `the Storybook build has no ${WALK}`);
  assert.ok(stories.includes(TALL), `the Storybook build has no ${TALL}`);

  const subjects = [
    ...SIZES.map(([width, height]) => [`${width}×${height}`, { viewport: { width, height } }]),
    ...DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...DUO.map(([width, height]) => [`two-screen ${width}×${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ];
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    // The stories that hold a subject chart, found once at 1280px.
    const holders = [];
    for (const story of stories) {
      const { ctx, page } = await open(browser, server.port, vitals, { viewport: { width: 1280, height: 800 } }, story, 'light');
      if ((await page.evaluate(FIT, SUBJECT)).charts.length) holders.push(story);
      await ctx.close();
    }
    assert.ok(holders.length >= 10, `${holders.length} stories hold a chart that must fit. The sweep is the coverage.`);

    const findings = [];
    let measured = 0;
    const table = [];
    for (const [label, context] of subjects) {
      let charts = 0;
      for (const theme of THEMES) {
        for (const story of holders) {
          const { ctx, page } = await open(browser, server.port, vitals, context, story, theme);
          const fit = await page.evaluate(FIT, SUBJECT);
          if (!fit.charts.length) findings.push(`${label} ${theme} ${story}: no chart measured`);
          if (fit.page > 0) findings.push(`${label} ${theme} ${story}: the page scrolls ${fit.page}px sideways`);
          for (const chart of fit.charts) {
            if (chart.over > 0.5) findings.push(`${label} ${theme} ${story} "${chart.name}": the plot scrolls ${chart.over}px sideways`);
          }
          charts += fit.charts.length;
          measured += 1;
          await ctx.close();
        }
      }
      const { ctx, page } = await open(browser, server.port, vitals, context, WALK, 'light');
      const width = await page.evaluate(() => innerWidth);
      const touch = Boolean(context.hasTouch);
      let actions = 0;
      const walked = [];
      for (let index = 0; index < 3; index += 1) {
        const { found, ran } = await walk(page, `${label} chart ${index + 1}`, index, touch);
        walked.push(...found);
        actions += ran;
      }
      await ctx.close();
      const tall = await open(browser, server.port, vitals, context, TALL, 'light');
      const { found, ran } = await walk(tall.page, `${label} long names`, 0, touch);
      walked.push(...found);
      actions += ran;
      await tall.ctx.close();
      findings.push(...walked);
      table.push(`| ${label} | ${width}px | ${charts} | ${actions} | ${walked.length ? 'fail' : 'pass'} |`);
    }
    process.stdout.write(`| Size or device | Width | Charts measured | Actions | Result |\n| --- | --- | --- | --- | --- |\n${table.join('\n')}\n`);
    assert.equal(measured, subjects.length * THEMES.length * holders.length, 'a size, a theme or a story was not measured');
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    const phone = { viewport: { width: 390, height: 844 } };
    const mutateFit = async (css, says) => {
      const { ctx, page } = await open(browser, server.port, vitals, phone, WALK, 'light');
      await page.addStyleTag({ content: css });
      await page.evaluate(frames);
      const fit = await page.evaluate(FIT, SUBJECT);
      caught.push([says, says === 'plot' ? fit.charts.some((c) => c.over > 0.5) : fit.page > 0]);
      await ctx.close();
    };
    // The months floor of 0.199.0: a column as wide as a word, so 14 months scroll.
    await mutateFit('.ui-chart--bars .ui-chart__plot { min-width: 600px !important; }', 'plot');
    await mutateFit('#storybook-root { min-width: 200vw; }', 'page');
    const mutateWalk = async (setup, says, story = WALK, context = phone) => {
      const { ctx, page } = await open(browser, server.port, vitals, context, story, 'light');
      await setup(page);
      const { found } = await walk(page, 'mutated', 0, false);
      caught.push([says, found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    await mutateWalk((page) => page.evaluate(() => document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') setTimeout(() => document.activeElement.blur());
    }, true)), 'focus left');
    await mutateWalk((page) => page.evaluate(() => window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') e.stopImmediatePropagation();
    }, true)), 'Escape did not close');
    await mutateWalk((page) => page.evaluate(() => document.addEventListener('keydown', (e) => {
      if (e.key === 'End') document.querySelector('#storybook-root').style.minWidth = '200vw';
    }, true)), 'sideways');
    // A card that drops with no input, as a late banner above it would push it.
    await mutateWalk(async (page) => {
      await page.evaluate(() => { document.querySelector('.ui-card').style.marginTop = '400px'; });
      await page.evaluate(frames);
    }, 'layout shift');
    // A fixed bar that jumps on a key, as a sticky header that a reflow moves.
    await mutateWalk((page) => page.evaluate(() => {
      const bar = document.body.appendChild(document.createElement('div'));
      bar.style.cssText = 'position: fixed; top: 0; left: 0; width: 10px; height: 10px;';
      document.addEventListener('keydown', (e) => { if (e.key === 'End') bar.style.top = '40px'; }, true);
    }), 'fixed element moved');
    // A key that leaves its row where it is, as dad8e4f9 did: End at 844×390 steps under the view.
    await mutateWalk((page) => page.evaluate(() => { Element.prototype.scrollIntoView = () => {}; }),
      'out of view', TALL, { viewport: { width: 844, height: 390 } });
    // A row bar that keeps its rest strength while its readout is open, as 2a4b3d22 drew it.
    await mutateWalk((page) => page.addStyleTag({ content: '.ui-chart__bar.is-active { opacity: 0.85 !important; }' }),
      'the active bar draws at', TALL);
    await mutateWalk((page) => page.evaluate(() => new MutationObserver((list) => list.forEach(({ target }) => {
      if (target.classList?.contains('is-active') && target.matches('path')) target.classList.remove('is-active');
    })).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] })),
      'the open row has no active bar', TALL);
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this gate cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
