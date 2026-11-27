/* Rule: the task page holds at every size. Each open part, the query search, Group by and a
 * row or card menu, keeps the focus inside it, and Escape closes it. Each key, click, tap and
 * drag moves a fixed element by at most 1px, keeps the cumulative layout shift under 0.1 and
 * causes no sideways scroll. A card moves by a mouse drag and by a touch long press: the card
 * follows the pointer, the source slot stays, a dashed target slot shows, the live region
 * says the target, and the card lands in the target column.
 *
 * Off unless TASK_PAGE=1: Playwright and web-vitals are not dependencies of this package,
 * CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js TASK_PAGE=1 \
 *     node --test stories/task-page.test.js
 *
 * Set UI_WEBKIT to a Playwright WebKit executable to add the touch walk in WebKit on the
 * iPhone 13 and iPad Pro 11 profiles.
 *
 * Chromium opens the Board and the Table stories at ten window sizes and on six devices, in
 * light and dark: the Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's
 * list, and a two-screen phone of 466×678 and 890×626 at scale 3 with touch. On each it opens
 * each part by key, then by click or tap, and presses Escape after each. On the Board it then
 * drags the first To do card to In progress, by mouse on a size and by a long press on a
 * touch device.
 *
 * Its limits: the default accent. Chromium touch is sent through the DevTools protocol, and
 * WebKit touch through WebKit's own protocol, so neither is a finger on glass. The fixed check
 * reads every element the page fixes, except an open panel and the card that follows the
 * pointer. The layout shift is web-vitals' onCLS, which does not count a shift within 500ms of
 * an input. The source half is in react/src/showcases/Tasks.test.tsx and
 * src/styles/task-page.test.js.
 * why: docs/components.md#movable-card, docs/components.md#query-search
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
const WEBKIT_DEVICES = ['iPhone 13', 'iPad Pro 11', 'iPad Pro 11 landscape'];
const THEMES = ['light', 'dark'];
const BOARD = 'showcases-tasks--board';
const TABLE = 'showcases-tasks--table';
const RETRY = 'showcases-tasks--search-people-error';
// The census: the themes that the kit draws, read from its theme sheet and not from the walk.
// So a walk that drops a theme leaves cases unmeasured, and the gate fails. #866
const DRAWN = [...new Set([...readFileSync(path.join(root, 'src/tokens/tokens.css'), 'utf8')
  .matchAll(/\[data-theme="(\w+)"\]/g)].map((m) => m[1]))].sort();
/** What the fixed check leaves out: an open panel, and the card that follows the pointer. */
const LOOSE = '[data-dropdown-panel], [role="listbox"], [role="menu"], .ui-card--lifted';

const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));

// The page's state: the layout shift so far, the sideways overflow and the fixed boxes.
const READ = (loose) => {
  const doc = document.scrollingElement;
  const fixed = [...document.querySelectorAll('body *')]
    .filter((el) => !el.closest(loose) && getComputedStyle(el).position === 'fixed')
    .map((el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
  return { cls: window.__cls, over: doc.scrollWidth - doc.clientWidth, fixed };
};

// One part's state: is it open, and does it hold the focus.
const PART = (el) => {
  const part = el.closest('.ui-query') ?? el.closest('.ui-dropdown');
  return { open: Boolean(part.querySelector('.open') || part.matches('.open')), focus: part.contains(document.activeElement) };
};

// The board's state during and after a drag.
const DRAG = ([name, x, y]) => {
  const lifted = document.querySelector('.ui-card--lifted');
  const box = lifted?.getBoundingClientRect();
  return {
    lifted: Boolean(lifted),
    follows: Boolean(box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom),
    held: Boolean(document.querySelector(`[data-task="${name}"].is-held`)),
    slot: document.querySelectorAll('.ui-card-slot').length,
    says: document.querySelector('.ui-sr[role="status"]')?.textContent ?? '',
    column: document.querySelector(`[data-task="${name}"]`)?.closest('[data-group]')?.dataset.group ?? null,
  };
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

/** Every case that the gate must measure for one subject. It is built apart from the walk. */
const census = (label, touch) => DRAWN.flatMap((theme) => [
  ...['search', 'Group by', 'menu'].flatMap((part) => ['key', touch ? 'tap' : 'click'].map((how) => `${label} ${theme} board ${part} ${how}`)),
  ...['search', 'menu'].flatMap((part) => ['key', touch ? 'tap' : 'click'].map((how) => `${label} ${theme} table ${part} ${how}`)),
  `${label} ${theme} board view`, `${label} ${theme} table view`,
  `${label} ${theme} board drag`, `${label} ${theme} board move by keys`, `${label} ${theme} people Retry by keys`,
]);

/** Reads the three page checks after a step, against the state before it. */
async function check(page, at, before, found) {
  await page.evaluate(frames);
  const s = await page.evaluate(READ, LOOSE);
  if (s.over > 0) found.push(`${at}: the page scrolls ${s.over}px sideways`);
  if (s.cls >= 0.1) found.push(`${at}: layout shift ${s.cls.toFixed(3)}`);
  // A fixed element keeps the edge it is anchored to. A toast stack grows up from its bottom,
  // so an element moved only when both of its edges on one axis moved.
  const moved = (a, b) => (Math.abs(a[0] - b[0]) > 1 && Math.abs(a[2] - b[2]) > 1)
    || (Math.abs(a[1] - b[1]) > 1 && Math.abs(a[3] - b[3]) > 1);
  if (s.fixed.length !== before.fixed.length || s.fixed.some((box, i) => moved(box, before.fixed[i]))) {
    found.push(`${at}: a fixed element moved`);
  }
  return s;
}

/** The open parts of a story: the search, and Group by on the Board, and the first row or card menu. */
const partsOf = (page, story) => [
  ['search', page.getByRole('combobox', { name: 'Search tasks' })],
  ...story === BOARD ? [['Group by', page.getByRole('button', { name: /^Group by/ })]] : [],
  ['menu', page.getByRole('button', { name: /^Actions for / }).first()],
];

// Each part opens by key, then by click or tap. Escape closes it each time.
async function walkParts(page, label, story, touch, found, seen) {
  let before = await page.evaluate(READ, LOOSE);
  let ran = 0;
  for (const [name, trigger] of partsOf(page, story)) {
    await trigger.scrollIntoViewIfNeeded();
    // The row menu stands at the end of a row. A person scrolls the table to its end to reach
    // it, so the walk does too, and the sticky title column does not cover it.
    await trigger.evaluate((el) => {
      for (let box = el.parentElement; box; box = box.parentElement) {
        if (box.scrollWidth > box.clientWidth && getComputedStyle(box).overflowX !== 'visible') box.scrollLeft = box.scrollWidth;
      }
    });
    before = await page.evaluate(READ, LOOSE);
    const search = name === 'search';
    const opens = [
      ['key', async () => { await trigger.focus(); if (!search) await page.keyboard.press('Enter'); }],
      [touch ? 'tap' : 'click', () => (touch ? trigger.tap({ timeout: 5000 }) : trigger.click({ timeout: 5000 }))],
    ];
    for (const [how, act] of opens) {
      const at = `${label} ${story.split('--')[1]} ${name} ${how}`;
      try {
        await act();
      } catch (error) {
        found.push(`${at}: ${error.message.split('\n').find((line) => line.includes('intercepts')) ?? error.message.split('\n')[0]}`);
        continue;
      }
      before = await check(page, at, before, found);
      let s = await trigger.evaluate(PART);
      if (!s.open) found.push(`${at}: the part did not open`);
      if (!s.focus) found.push(`${at}: the focus left the open part`);
      await page.keyboard.press('Escape');
      before = await check(page, `${at} Escape`, before, found);
      s = await trigger.evaluate(PART);
      if (s.open) found.push(`${at}: Escape did not close the part`);
      if (!s.focus) found.push(`${at}: Escape moved the focus out of the part`);
      seen.add(at);
      ran += 2;
    }
  }
  return ran;
}

/** The pointer for a drag: the mouse, Chromium touch through CDP, or WebKit touch. */
async function pointer(page, kind) {
  if (kind === 'mouse') {
    return { down: async (x, y) => { await page.mouse.move(x, y); await page.mouse.down(); },
      move: (x, y) => page.mouse.move(x, y, { steps: 4 }), up: () => page.mouse.up() };
  }
  let send;
  if (kind === 'cdp') {
    const cdp = await page.context().newCDPSession(page);
    send = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  } else {
    // WebKit's own protocol, as Playwright's WebKit page speaks it.
    const session = page._connection.toImpl(page).delegate._pageProxySession;
    send = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  }
  const at = (x, y) => [{ x: Math.round(x), y: Math.round(y), id: 1 }];
  let last = [0, 0];
  return {
    down: async (x, y) => {
      last = [x, y];
      await send('touchStart', at(x, y));
      await page.waitForSelector('.ui-card--lifted', { state: 'attached', timeout: 3000 });
    },
    move: async (x, y) => {
      const [fx, fy] = last;
      for (let i = 1; i <= 4; i += 1) await send('touchMove', at(fx + ((x - fx) * i) / 4, fy + ((y - fy) * i) / 4));
      last = [x, y];
    },
    // Chromium ends a touch with no points. WebKit's protocol needs the last point.
    up: () => send('touchEnd', kind === 'cdp' ? [] : at(...last)),
  };
}

// The first To do card goes to In progress. The checks run while it is held and after the drop.
async function walkDrag(page, label, kind, found, seen) {
  const card = page.locator('[data-group="todo"] [data-task]').first();
  const name = await card.getAttribute('data-task');
  const column = page.locator('[data-group="doing"] .tasks-column__head');
  await card.scrollIntoViewIfNeeded();
  let before = await page.evaluate(READ, LOOSE);
  const from = await card.boundingBox();
  const fx = from.x + from.width / 2;
  const fy = from.y + from.height - 8;
  const drive = await pointer(page, kind);
  await drive.down(fx, fy);
  // The target column's head can lie outside the region's view on a phone. The drag scrolls
  // the region near its side, so the walk moves to the region's side until the column shows.
  const region = await page.locator('.ui-card-board').boundingBox();
  let to = await column.boundingBox();
  for (let i = 0; i < 40 && (!to || to.x + to.width / 2 > region.x + region.width - 60); i += 1) {
    await drive.move(region.x + region.width - 24 - (i % 2), fy);
    await page.evaluate(frames);
    to = await column.boundingBox();
  }
  const tx = to.x + to.width / 2;
  const ty = to.y + to.height + 24;
  // A hand never stops dead on the target. Playwright's mouse sends drag enter for the first
  // moves of a drag and drag over only after them, so the walk makes two small moves there.
  await drive.move(tx, ty);
  await drive.move(tx + 2, ty + 2);
  await drive.move(tx, ty);
  await page.evaluate(frames);
  const at = `${label} ${kind} drag`;
  const held = await page.evaluate(DRAG, [name, tx, ty]);
  if (!held.lifted) found.push(`${at}: no card follows the pointer`);
  else if (!held.follows) found.push(`${at}: the card is not under the pointer`);
  if (!held.held) found.push(`${at}: the source slot is gone`);
  if (held.slot !== 1) found.push(`${at}: ${held.slot} target slots`);
  if (!held.says.includes('will move to In progress')) found.push(`${at}: the live region says "${held.says}"`);
  before = await check(page, `${at} held`, before, found);
  await drive.up();
  before = await check(page, `${at} drop`, before, found);
  const done = await page.evaluate(DRAG, [name, 0, 0]);
  if (done.column !== 'doing') found.push(`${at}: the card landed in ${done.column}`);
  if (done.lifted || done.slot) found.push(`${at}: a slot or the moving card stayed after the drop`);
  seen.add(`${label} board drag`);
  return 2;
}

// The first To do card goes to In progress by its menu and the keys. The focus stays on that
// card's menu button, so the next key acts on the same task. #866
async function walkKeyMove(page, label, found, seen) {
  const card = page.locator('[data-group="todo"] [data-task]').first();
  const name = await card.getAttribute('data-task');
  const at = `${label} move by keys`;
  await card.scrollIntoViewIfNeeded();
  let before = await page.evaluate(READ, LOOSE);
  await card.getByRole('button', { name: /^Actions for / }).focus();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 8 && (await page.evaluate(() => document.activeElement?.textContent?.trim())) !== 'In progress'; i += 1) {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');
  before = await check(page, at, before, found);
  const after = await page.evaluate((task) => {
    const el = document.activeElement;
    return { column: document.querySelector(`[data-task="${task}"]`)?.closest('[data-group]')?.dataset.group ?? null,
      focus: Boolean(el?.closest(`[data-task="${task}"]`) && /^Actions for /.test(el.getAttribute('aria-label') ?? '')), on: el?.tagName ?? '' };
  }, name);
  if (after.column !== 'doing') found.push(`${at}: the card landed in ${after.column}`);
  if (!after.focus) found.push(`${at}: the focus went to ${after.on}, not to the moved card's menu button`);
  seen.add(`${label} board move by keys`);
  return 1;
}

// People did not load: Tab from the search reaches Retry in the open panel, and Enter retries
// and puts the focus back in the search. #866
async function walkRetry(page, label, found, seen) {
  const at = `${label} people Retry by keys`;
  const field = page.getByRole('combobox', { name: 'Search tasks' });
  await field.scrollIntoViewIfNeeded();
  let before = await page.evaluate(READ, LOOSE);
  await field.focus();
  await page.keyboard.press('Tab');
  before = await check(page, `${at} Tab`, before, found);
  const on = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), open: document.querySelector('[role="combobox"]')?.getAttribute('aria-expanded') }));
  if (on.text !== 'Retry' || on.open !== 'true') found.push(`${at}: Tab reached "${on.text}" with the panel ${on.open === 'true' ? 'open' : 'shut'}`);
  await page.keyboard.press('Enter');
  before = await check(page, `${at} Enter`, before, found);
  const back = await page.evaluate(() => ({ field: document.activeElement?.getAttribute('role') === 'combobox', alert: Boolean(document.querySelector('.ui-query [role="alert"]')) }));
  if (!back.field) found.push(`${at}: Retry did not put the focus back in the search`);
  if (back.alert) found.push(`${at}: the people error stayed after Retry`);
  seen.add(at);
  return 2;
}

// Each wordless view option is a square inside its track, as tall as the track's inside:
// 24px with a mouse and 32px on a touch screen. rev_f2d9bddb40b6/d9, #866
async function walkView(page, label, story, found, seen) {
  const at = `${label} ${story.split('--')[1]} view`;
  const sizes = await page.evaluate(() => [...document.querySelectorAll('.ui-toolbar > .ui-seg button.ui-seg--icon')].map((b) => {
    const box = b.getBoundingClientRect();
    const track = b.parentElement.getBoundingClientRect();
    return [Math.round(box.width), Math.round(track.height - 8)];
  }));
  if (sizes.length !== 2 || sizes.some(([w, h]) => w !== h)) found.push(`${at}: view options ${JSON.stringify(sizes)}, [width, track inside] expected equal`);
  seen.add(at);
}

function setup(pw) {
  assert.ok(pw, 'TASK_PAGE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const ids = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  for (const id of [BOARD, TABLE, RETRY]) assert.ok(ids.includes(id), `the Storybook build has no ${id}`);
  return { build, vitals: readFileSync(process.env.UI_WEB_VITALS, 'utf8') };
}

test('the task page keeps the focus in each open part and holds through each key, click, tap and drag', {
  skip: process.env.TASK_PAGE !== '1' && 'set TASK_PAGE=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  const { build, vitals } = setup(pw);
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
    const seen = new Set();
    const expected = [];
    for (const [label, context] of subjects) {
      const touch = Boolean(context.hasTouch);
      let actions = 0;
      const mine = [];
      expected.push(...census(label, touch));
      for (const theme of THEMES) {
        for (const story of [BOARD, TABLE]) {
          const { ctx, page } = await open(browser, server.port, vitals, context, story, theme);
          await walkView(page, `${label} ${theme}`, story, mine, seen);
          actions += await walkParts(page, `${label} ${theme}`, story, touch, mine, seen);
          if (story === BOARD) actions += await walkDrag(page, `${label} ${theme}`, touch ? 'cdp' : 'mouse', mine, seen);
          if (story === BOARD) actions += await walkKeyMove(page, `${label} ${theme}`, mine, seen);
          await ctx.close();
        }
        const { ctx, page } = await open(browser, server.port, vitals, context, RETRY, theme);
        actions += await walkRetry(page, `${label} ${theme}`, mine, seen);
        await ctx.close();
      }
      findings.push(...mine);
      table.push(`| ${label} | Chromium | ${context.viewport.width}×${context.viewport.height} | ${touch ? 'touch' : 'mouse'} | ${actions} | ${mine.length ? 'fail' : 'pass'} |`);
    }
    if (process.env.UI_WEBKIT) {
      const webkit = await pw.webkit.launch({ executablePath: process.env.UI_WEBKIT });
      try {
        for (const name of WEBKIT_DEVICES) {
          const context = pw.devices[name];
          assert.ok(context, `Playwright has no device "${name}"`);
          let actions = 0;
          const mine = [];
          expected.push(...census(name, true));
          for (const theme of THEMES) {
            for (const story of [BOARD, TABLE]) {
              const { ctx, page } = await open(webkit, server.port, vitals, context, story, theme);
              await walkView(page, `${name} ${theme}`, story, mine, seen);
              actions += await walkParts(page, `${name} ${theme}`, story, true, mine, seen);
              if (story === BOARD) actions += await walkDrag(page, `${name} ${theme}`, 'webkit', mine, seen);
              if (story === BOARD) actions += await walkKeyMove(page, `${name} ${theme}`, mine, seen);
              await ctx.close();
            }
            const { ctx, page } = await open(webkit, server.port, vitals, context, RETRY, theme);
            actions += await walkRetry(page, `${name} ${theme}`, mine, seen);
            await ctx.close();
          }
          findings.push(...mine);
          table.push(`| ${name} | WebKit | ${context.viewport.width}×${context.viewport.height} | touch | ${actions} | ${mine.length ? 'fail' : 'pass'} |`);
        }
      } finally {
        await webkit.close();
      }
    }
    process.stdout.write(`| Size or device | Engine | Viewport | Input | Actions | Result |\n| --- | --- | --- | --- | --- | --- |\n${table.join('\n')}\n`);
    assert.deepEqual(DRAWN, ['dark', 'light'], 'the theme sheet names other themes, so the census changed');
    assert.equal(expected.length, (subjects.length + (process.env.UI_WEBKIT ? WEBKIT_DEVICES.length : 0)) * DRAWN.length * 15, 'the census lost a subject');
    assert.deepEqual(expected.filter((c) => !seen.has(c)), [], 'a case of the census was not measured');
    // The census fails a walk that drops a theme: a light-only run leaves cases unmeasured.
    assert.ok(expected.some((c) => c.includes(' dark ') && !new Set([...seen].filter((k) => !k.includes(' dark '))).has(c)),
      'a light-only walk would pass the census');
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    const desk = { viewport: { width: 1280, height: 800 } };
    const mutate = async (setupPage, says, walk) => {
      const { ctx, page } = await open(browser, server.port, vitals, desk, BOARD, 'light');
      await setupPage(page);
      const found = [];
      await walk(page, found);
      caught.push([says, found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    const parts = (page, found) => walkParts(page, 'mutated', BOARD, false, found, new Set());
    const drag = (page, found) => walkDrag(page, 'mutated', 'mouse', found, new Set());
    const keyMove = (page, found) => walkKeyMove(page, 'mutated', found, new Set());
    await mutate((page) => page.evaluate(() => document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') setTimeout(() => document.activeElement.blur());
    }, true)), 'focus left', parts);
    await mutate((page) => page.evaluate(() => window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') e.stopImmediatePropagation();
    }, true)), 'Escape did not close', parts);
    await mutate((page) => page.evaluate(() => document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelector('#storybook-root').style.minWidth = '200vw';
    }, true)), 'sideways', parts);
    // A page that drops with no input, as a late banner above it would push it.
    await mutate(async (page) => {
      await page.evaluate(() => { document.querySelector('.ui-toolbar').style.marginTop = '400px'; });
      await page.evaluate(frames);
    }, 'layout shift', parts);
    // A fixed bar that jumps on a key, as a sticky header that a reflow moves.
    await mutate((page) => page.evaluate(() => {
      const bar = document.createElement('div');
      bar.style.cssText = 'position: fixed; top: 0; left: 0; width: 10px; height: 10px;';
      document.body.append(bar);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') bar.style.top = '20px'; }, true);
    }), 'fixed element moved', parts);
    // A card that no longer drags: the drop never reaches In progress.
    await mutate((page) => page.evaluate(() => document.addEventListener('dragstart', (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
    }, true)), 'no card follows', drag);
    // A target slot with no live region.
    await mutate((page) => page.evaluate(() => document.querySelector('.ui-sr[role="status"]').removeAttribute('role')),
      'the live region says', drag);
    // A move that drops the focus, as the board did before #866 kept it on the moved card.
    await mutate((page) => page.evaluate(() => document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement?.getAttribute('role') === 'menuitem') setTimeout(() => setTimeout(() => document.activeElement.blur()));
    }, true)), 'not to the moved card', keyMove);
    // View options that are narrower than the track, as the touch switch was before #866.
    await mutate(async (page) => {
      await page.addStyleTag({ content: '.ui-toolbar > .ui-seg button.ui-seg--icon { min-width: 0 !important; width: 20px; }' });
      // The width eases to its new value, so the walk waits until each option has its injected width.
      await page.waitForFunction(() => [...document.querySelectorAll('.ui-toolbar > .ui-seg button.ui-seg--icon')]
        .every((b) => b.getBoundingClientRect().width === 20), null, { timeout: 5000 });
    }, 'view options', (page, found) => walkView(page, 'mutated', BOARD, found, new Set()));
    assert.deepEqual(caught.filter(([, ok]) => !ok).map(([says]) => says), [], 'a check did not see its own failure');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
