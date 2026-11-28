/* Rule: the DatePicker Keyboard story does not scroll the page sideways at any of ten window
 * sizes or on six devices, 360×800 and 390×844 among them. Its two columns, the picker and the
 * key list, stand side by side where the story has room for two 300px columns and their gap,
 * as at 1280×800, and stack where it has not, as at 360×800 and 390×844.
 *
 * Off unless DATEPICKER_KEYBOARD=1: Playwright is not a dependency of this package, CI does
 * not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… DATEPICKER_KEYBOARD=1 node --test stories/datepicker-keyboard-fit.test.js
 *
 * It opens react-date-picker--keyboard in a new context at each size: the Galaxy Z Fold 7 and
 * Flip 7 and their cover screens from Playwright's list, and a two-screen phone of 466×678 and
 * 890×626 at scale 3 with touch. Two mutations must fail: the old grid with a fixed `300px`
 * track at 360×800, and a row in one column at 1280×800.
 *
 * Its limits: one engine, the light theme and the default accent, with the panel open as the
 * story opens it. It reads the layout at rest and walks no key. The source half is in
 * react/src/DatePicker.keyboard-story.test.tsx.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORY = 'react-date-picker--keyboard';
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];
// The story's column floor, in px.
const COLUMN = 300;

// The page's sideways overflow, the width the canvas offers the story, and the two columns'
// boxes inside the story's row. The centred canvas sizes the row to its content, so the room
// is the body less the root's padding, not the row's own width.
const ROW = '#storybook-root div:has(> ul)';
const READ = (row) => {
  const doc = document.scrollingElement;
  const grid = document.querySelector(row);
  const [picker, list] = grid.children;
  const a = picker.getBoundingClientRect();
  const b = list.getBoundingClientRect();
  const pad = getComputedStyle(document.querySelector('#storybook-root'));
  return {
    over: doc.scrollWidth - doc.clientWidth,
    room: document.body.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight),
    gap: parseFloat(getComputedStyle(grid).columnGap),
    beside: Math.abs(a.top - b.top) < 1 && b.left >= a.right,
    stacked: b.top >= a.bottom,
  };
};

async function open(browser, port, context) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${STORY}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, STORY);
  await page.locator('#storybook-root .ui-datepicker.open').waitFor();
  return { ctx, page };
}

// What is wrong with one reading.
const judge = (label, r) => {
  const found = [];
  if (r.over > 0) found.push(`${label}: the page scrolls ${r.over}px sideways`);
  const room = r.room >= 2 * COLUMN + r.gap;
  if (room && !r.beside) found.push(`${label}: the story stacks its columns in ${r.room}px`);
  if (!room && !r.stacked) found.push(`${label}: the story does not stack its columns in ${r.room}px`);
  return found;
};

test('the DatePicker Keyboard story fits each width and stands its columns side by side where they fit', {
  skip: process.env.DATEPICKER_KEYBOARD !== '1' && 'set DATEPICKER_KEYBOARD=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'DATEPICKER_KEYBOARD=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  assert.ok(Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries).includes(STORY), `the Storybook build has no ${STORY}`);

  const subjects = [
    ...SIZES.map(([width, height]) => [`${width}×${height}`, { viewport: { width, height } }]),
    ...DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...DUO.map(([width, height]) => [`two-screen ${width}×${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ];
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const findings = [];
    const table = [];
    const seen = { beside: 0, stacked: 0 };
    for (const [label, context] of subjects) {
      const { ctx, page } = await open(browser, server.port, context);
      const r = await page.evaluate(READ, ROW);
      const found = judge(label, r);
      findings.push(...found);
      seen.beside += r.beside ? 1 : 0;
      seen.stacked += r.stacked ? 1 : 0;
      table.push(`${label}: room ${r.room}px, ${r.beside ? 'side by side' : r.stacked ? 'stacked' : 'neither'}, overflow ${r.over}px, ${found.length ? 'fail' : 'pass'}`);
      await ctx.close();
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.deepEqual(findings, []);
    assert.equal(table.length, SIZES.length + DEVICES.length + DUO.length, 'a size or a device was not measured');
    assert.ok(seen.beside >= 5 && seen.stacked >= 5, `too few sizes in a layout: ${JSON.stringify(seen)}`);
    for (const named of ['360×800', '390×844']) assert.match(table.find((row) => row.startsWith(`${named}:`)) ?? `${named} was not measured`, /stacked, overflow 0px/);
    assert.match(table.find((row) => row.startsWith('1280×800:')) ?? '1280×800 was not measured', /side by side, overflow 0px/);

    // The mutations: each reading must see its own failure.
    const caught = [];
    const mutate = async (size, css, says) => {
      const { ctx, page } = await open(browser, server.port, { viewport: size });
      await page.addStyleTag({ content: `${ROW} { ${css} }` });
      caught.push([says, judge('mutated', await page.evaluate(READ, ROW)).some((f) => f.includes(says))]);
      await ctx.close();
    };
    // The story's grid before this gate: a fixed first track.
    await mutate({ width: 360, height: 800 }, `display: grid !important; grid-template-columns: ${COLUMN}px minmax(0, 1fr);`, 'sideways');
    await mutate({ width: 1280, height: 800 }, 'flex-direction: column !important;', 'stacks its columns');
    assert.deepEqual(caught.filter(([, hit]) => !hit).map(([says]) => says), [], 'a mutation passed: this gate cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
