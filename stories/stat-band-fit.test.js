/* Rule: a band of three figures keeps one row above 19rem. At the lower edge of each compact
 * range, three values of −€9,999,999 fit in one row with no value cut, in both themes. The
 * Transactions showcase sorts Amount by value, and each sort click keeps the bar within 1px,
 * the layout shift under 0.1 and the page without sideways scroll.
 *
 * Off unless STAT_FIT=1: Playwright and web-vitals are not dependencies of this package,
 * CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_CHROME=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js STAT_FIT=1 \
 *     node --test stories/stat-band-fit.test.js
 *
 * The fit half opens react-stat-band--three-figures in each theme and in two text renderings.
 * The hinted one is the default of the headless shell on Linux: it rounds each glyph advance
 * to a whole pixel, so −€9,999,999 at 15.5px takes about 98.3px. The fractional one keeps the
 * advances that Chrome on macOS uses, about 95.25px. It sets the band so that
 * its list is 1px above each range's lower edge, then reads the row of each figure and the
 * overflow of each value. It also reads the story at a 390px window, where the dark card
 * leaves 308px. The walk half opens apps-transactions--default at ten window sizes, on the
 * Galaxy Z Fold 7 and Flip 7 and their cover screens, and on a two-screen phone of 466×678
 * and 890×626 at scale 3 with touch. It clicks the Amount sort twice. The sort opens no part,
 * so the focus stays on the sort control and no Escape applies.
 *
 * Its limits: one engine, the default accent and the fonts of the host. The walk reads the
 * light theme only, with hinted text. The layout shift is web-vitals' onCLS, which does not
 * count a shift within 500ms of an input.
 * The source half of the ranges is in src/styles/stat.test.js, and of the sort in
 * react/src/transactions.test.tsx.
 * why: docs/components.md#stat-bands, #865
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { env } = process;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];
const BAND = 'react-stat-band--three-figures';
const PAGE = 'apps-transactions--default';
// The lower edge of each compact range in docs/components.md, and the 30px range above them.
const EDGES = [19, 22, 28, 42];
const WIDEST = '−€9,999,999';

const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));

async function open(browser, port, story, theme, context, init = '') {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC', reducedMotion: 'reduce' });
  if (init) await ctx.addInitScript({ content: init });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, story);
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  return { ctx, page };
}

/* Sets each value to the widest seven-digit amount and, with a target, the band's width so
 * that its list is that wide. Returns the list width, the value size, the row of each figure
 * and the values that overflow their box. */
const FIT = async (page, target) => {
  return page.evaluate(async ([widest, list]) => {
    const band = document.querySelector('.ui-stats');
    band.querySelectorAll('.ui-stat__value').forEach((v) => { v.textContent = widest; });
    if (list) {
      const own = band.querySelector('.ui-stats__list');
      const extra = band.getBoundingClientRect().width - own.clientWidth;
      band.style.width = `${list + extra}px`;
      band.style.maxWidth = 'none';
    }
    // A new width can start a transition of the value size, so the read waits for it to end.
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    await Promise.all(document.getAnimations().map((a) => a.finished));
    const own = band.querySelector('.ui-stats__list');
    const values = [...band.querySelectorAll('.ui-stat__value')];
    return {
      list: own.clientWidth,
      size: getComputedStyle(values[0]).fontSize,
      rows: new Set([...own.children].map((c) => Math.round(c.getBoundingClientRect().top))).size,
      cut: values.filter((v) => v.scrollWidth > v.clientWidth + 0.5 || v.getBoundingClientRect().right > own.getBoundingClientRect().right + 0.5).length,
    };
  }, [WIDEST, target]);
};

async function fit(browser, rendering, port, css = '') {
  const found = [];
  const table = [];
  for (const theme of ['dark', 'light']) {
    const cases = [...EDGES.map((rem) => [`${rem}rem + 1px`, { viewport: { width: 1280, height: 800 } }, rem * 16 + 1]),
      ['390px window', { viewport: { width: 390, height: 844 } }, 0]];
    for (const [label, context, target] of cases) {
      const { ctx, page } = await open(browser, port, BAND, theme, context);
      if (css) await page.addStyleTag({ content: css });
      const got = await FIT(page, target);
      const at = `${rendering} ${theme} ${label}`;
      table.push(`${at}: list ${got.list}px, value ${got.size}, ${got.rows} row(s), ${got.cut} cut`);
      if (target && got.list !== target) found.push(`${at}: the list is ${got.list}px, not ${target}px`);
      if (got.rows !== 1) found.push(`${at}: three figures take ${got.rows} rows`);
      if (got.cut) found.push(`${at}: ${got.cut} value(s) cut`);
      await ctx.close();
    }
  }
  return { found, table };
}

// The bar's place, the focus, the Amount column, the layout shift so far and the page's
// sideways overflow.
const READ = () => {
  const bar = document.querySelector('.ui-app__bar').getBoundingClientRect();
  const doc = document.scrollingElement;
  const table = [...document.querySelectorAll('table')].find((t) => t.caption?.textContent === 'Recent transactions');
  const head = [...table.querySelectorAll('th')].find((th) => th.textContent === 'Amount');
  const column = [...head.parentElement.children].indexOf(head);
  return {
    cls: window.__cls, over: doc.scrollWidth - doc.clientWidth, top: bar.top, left: bar.left,
    sort: head.getAttribute('aria-sort'), focused: head.contains(document.activeElement),
    amounts: [...table.querySelectorAll('tbody tr')].map((tr) => Number(tr.children[column].textContent.replace('−', '-').replace(/[€,+]/g, ''))),
  };
};

async function walk(page, label) {
  const found = [];
  await page.evaluate(frames);
  let before = await page.evaluate(READ);
  for (const dir of ['descending', 'ascending']) {
    await page.getByRole('table', { name: 'Recent transactions' }).getByRole('button', { name: 'Amount' }).click();
    await page.evaluate(frames);
    const after = await page.evaluate(READ);
    const at = `${label} click: Amount ${dir}`;
    const sorted = [...after.amounts].sort((a, b) => (dir === 'descending' ? b - a : a - b));
    if (after.sort !== dir) found.push(`${at}: aria-sort is ${after.sort}`);
    if (!after.amounts.length || JSON.stringify(after.amounts) !== JSON.stringify(sorted)) found.push(`${at}: the amounts are not in value order`);
    if (!after.focused) found.push(`${at}: the focus left the sort control`);
    const moved = Math.max(Math.abs(after.top - before.top), Math.abs(after.left - before.left));
    if (moved > 1) found.push(`${at}: the bar moved ${Math.round(moved)}px`);
    if (!(after.cls < 0.1)) found.push(`${at}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${at}: the page scrolls ${after.over}px sideways`);
    before = after;
  }
  return found;
}

test('three seven-digit figures keep one row at each compact edge, and the Transactions sort reads by value', {
  skip: env.STAT_FIT !== '1' && 'set STAT_FIT=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'STAT_FIT=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(env.UI_WEB_VITALS && existsSync(env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = `${readFileSync(env.UI_WEB_VITALS, 'utf8')}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });`;
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const entries = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  for (const story of [BAND, PAGE]) assert.ok(entries.includes(story), `the Storybook build has no ${story}`);

  const subjects = [
    ...SIZES.map(([width, height]) => [`${width}×${height}`, { viewport: { width, height } }]),
    ...DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...DUO.map(([width, height]) => [`two-screen ${width}×${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ];
  // The default launch hints the text. The second keeps fractional glyph advances.
  const browser = await pw.chromium.launch({ executablePath: env.UI_CHROME });
  const fractional = await pw.chromium.launch({ executablePath: env.UI_CHROME, args: ['--font-render-hinting=none'] });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const hinted = await fit(browser, 'hinted', server.port);
    const exact = await fit(fractional, 'fractional', server.port);
    const sized = { table: [...hinted.table, ...exact.table], found: [...hinted.found, ...exact.found] };
    process.stdout.write(`${sized.table.join('\n')}\n`);
    assert.equal(sized.table.length, 2 * 2 * (EDGES.length + 1), 'an edge, a theme or a rendering was not measured');
    assert.deepEqual(sized.found, []);

    const findings = [];
    const table = [];
    for (const [label, context] of subjects) {
      const { ctx, page } = await open(browser, server.port, PAGE, 'light', context, vitals);
      const width = await page.evaluate(() => innerWidth);
      const found = await walk(page, label);
      findings.push(...found);
      table.push(`${label} ${width}px: 2 clicks, ${found.length ? 'fail' : 'pass'}`);
      await ctx.close();
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, SIZES.length + DEVICES.length + DUO.length, 'a size or a device was not measured');
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    // The 8px gap that the 15.5px range had before the hinted fit. It fits with fractional advances
    // and wraps with hinted text, so only the hinted cases see it.
    const wide = '.ui-stats--band .ui-stats__list { column-gap: 8px !important; }';
    const { found: gaps } = await fit(browser, 'hinted', server.port, wide);
    caught.push(['rows', gaps.some((f) => f.includes('dark 19rem + 1px') && f.includes('rows')) && gaps.some((f) => f.includes('dark 390px window')), gaps]);
    const phone = { viewport: { width: 390, height: 844 } };
    const mutate = async (setup, says) => {
      const { ctx, page } = await open(browser, server.port, PAGE, 'light', phone, vitals);
      await setup(page);
      const found = await walk(page, 'mutated');
      caught.push([says, found.some((f) => f.includes(says)), found]);
      await ctx.close();
    };
    await mutate((page) => page.addStyleTag({ content: '#storybook-root { min-width: 200vw; }' }), 'sideways');
    await mutate((page) => page.evaluate(() => document.addEventListener('click', () => { document.querySelector('.ui-app__bar').style.translate = '0 40px'; }, true)), 'bar moved');
    await mutate((page) => page.evaluate(() => document.addEventListener('click', () => setTimeout(() => document.activeElement.blur()), true)), 'focus left');
    await mutate((page) => page.evaluate(() => document.addEventListener('click', (e) => {
      // The text of each amount loses its sign, so the order by value breaks.
      setTimeout(() => document.querySelectorAll('td.ui-table__num').forEach((td) => { td.textContent = td.textContent.replace('−', '+'); }));
    }, true)), 'value order');
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says, , found]) => `${says}: ${JSON.stringify(found)}`), [], 'a mutation passed or failed for another reason: this gate cannot see it');
  } finally {
    await browser.close();
    await fractional.close();
    server.proc.kill();
  }
});
