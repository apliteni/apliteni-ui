/* Rule: an undo stack keeps at most three notices, newest at the bottom, and each Undo acts on
 * its own notice. The keyboard stays in the stack when a focused notice leaves, and Escape
 * closes the focused notice. Each key and click keeps the stack's bottom right corner within
 * 1px, keeps the cumulative layout shift under 0.1 and causes no sideways scroll.
 *
 * Off unless TOAST_STACK=1: Playwright and web-vitals are not dependencies of this package,
 * CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js TOAST_STACK=1 \
 *     node --test stories/toast-stack.test.js
 *
 * It opens react-toast--undo-stack (three undo notices with an 8 second timer, and a button that
 * adds a fourth) in a new context at each of ten window sizes and on six devices: the Galaxy Z
 * Fold 7 and Flip 7 and their cover screens from Playwright's list, and a two-screen phone of
 * 466×678 and 890×626 at scale 3 with touch. The walk clicks the button, so the oldest notice
 * leaves, then presses Tab into the stack, Tab, Tab, Enter on the second Undo, Escape and
 * Escape. Then it clicks the button into the empty stack, clicks that Undo with the pointer, and
 * clicks the button again: the pointer is off the stack, so the new timer must run. A walk that
 * cannot reach the focus it waits for stops, and its error says that the focus
 * left. A walk that cannot reach another control stops with Playwright's timeout. The click starts
 * outside the stack, so the focus is read from the first Tab on. The last Escape closes the
 * last notice, so the focus after it is not read.
 *
 * Its limits: one engine, the light theme and the default accent. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input. The source half is
 * in react/src/Toast.test.tsx.
 * why: docs/components.md#toast
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
const STORY = 'react-toast--undo-stack';

// The stack's state: its corner, the focus, the notices still on screen, the layout shift so
// far and the page's sideways overflow.
const READ = () => {
  const stack = document.querySelector('.rx-toast-stack');
  const doc = document.scrollingElement;
  const box = stack.getBoundingClientRect();
  const live = [...stack.querySelectorAll('.ui-toast:not(.is-leaving)')];
  return {
    cls: window.__cls, over: doc.scrollWidth - doc.clientWidth,
    bottom: innerHeight - box.bottom, right: innerWidth - box.right,
    inside: stack.contains(document.activeElement),
    titles: live.map((el) => el.querySelector('.ui-toast__title').textContent),
    rings: live.filter((el) => el.querySelector('.ui-toast__action .ui-toast__ring')?.checkVisibility()).length,
    // The script's hold, which the ring's inline play state shows. The sheet's :hover is not read.
    held: live.filter((el) => el.querySelector('.ui-toast__ring-arc')?.style.animationPlayState === 'paused').length,
  };
};
const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));
const live = (page, count) => page.waitForFunction((n) => document.querySelectorAll('.rx-toast-stack .ui-toast').length === n, count);
// A wait for the focus that times out names the focus loss, and where the focus went, so the
// gate and its focus mutation read one message.
const FOCUS_LEFT = 'the focus left the control that the walk waits for';
const focused = async (page, name) => {
  try {
    await page.locator(':focus').and(name).waitFor();
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    const at = await page.evaluate(() => (document.activeElement === document.body ? 'the page body' : document.activeElement.outerHTML.slice(0, 80)));
    throw new Error(`${FOCUS_LEFT}, and is on ${at}`, { cause: error });
  }
};
const notice = (page, title) => page.locator('.rx-toast-stack .ui-toast').filter({ hasText: title });
const button = (page, title, name) => notice(page, title).getByRole('button', { name });

const ACTIONS = [
  ['click: Classify one more', async (page) => {
    await page.getByRole('button', { name: 'Classify one more' }).click();
    await page.waitForFunction(() => document.querySelector('.rx-toast-stack .ui-toast:first-child .ui-toast__title').textContent.startsWith('Tranvía'));
  }, ['Tranvía Norte set to Transport', 'Luz del Sur set to Utilities', 'Farmacia Sol set to Health']],
  ['key: Tab into the stack', async (page) => {
    await page.keyboard.press('Tab');
    await focused(page, page.locator('.rx-toast-stack .ui-toast').first().getByRole('button', { name: 'Undo' }));
  }],
  ['key: Tab', async (page) => { await page.keyboard.press('Tab'); await focused(page, button(page, 'Tranvía', 'Dismiss')); }],
  ['key: Tab to the second Undo', async (page) => { await page.keyboard.press('Tab'); await focused(page, button(page, 'Luz del Sur', 'Undo')); }],
  ['key: Enter on Undo', async (page) => {
    await page.keyboard.press('Enter');
    await live(page, 2);
    await focused(page, button(page, 'Farmacia', 'Undo'));
  }, ['Tranvía Norte set to Transport', 'Farmacia Sol set to Health']],
  ['key: Escape', async (page) => {
    await page.keyboard.press('Escape');
    await live(page, 1);
    await focused(page, button(page, 'Tranvía', 'Undo'));
  }, ['Tranvía Norte set to Transport']],
  ['key: Escape on the last notice', async (page) => { await page.keyboard.press('Escape'); await live(page, 0); }, []],
  ['click: Classify one more into the empty stack', async (page) => {
    await page.getByRole('button', { name: 'Classify one more' }).click();
    await live(page, 1);
  }, ['Farmacia Sol set to Health']],
  ['click: Undo with the pointer', async (page) => { await button(page, 'Farmacia', 'Undo').click(); await live(page, 0); }, []],
  ['click: Classify one more after the pointer left', async (page) => {
    await page.getByRole('button', { name: 'Classify one more' }).click();
    await live(page, 1);
  }, ['Farmacia Sol set to Health']],
];

async function open(browser, port, vitals, context) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${STORY}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, STORY);
  await live(page, 3);
  // The notices have come in: each has ended its own entrance animation.
  await page.waitForFunction(() => [...document.querySelectorAll('.rx-toast-stack .ui-toast')]
    .every((el) => el.getAnimations().every((a) => a.playState === 'finished')));
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  return { ctx, page };
}

async function walk(page, label, { only } = {}) {
  const found = [];
  const ran = [];
  await page.evaluate(frames);
  let before = await page.evaluate(READ);
  if (before.rings !== 3) found.push(`${label}: ${before.rings} of 3 notices show a ring in Undo`);
  for (const [name, run, titles] of ACTIONS.filter(([n]) => !only || only.includes(n))) {
    await run(page);
    await page.evaluate(frames);
    const after = await page.evaluate(READ);
    ran.push(name);
    const at = `${label} ${name}`;
    if (name.startsWith('key:') && name !== 'key: Escape on the last notice' && !after.inside) found.push(`${at}: the focus left the stack`);
    if (titles && JSON.stringify(after.titles) !== JSON.stringify(titles)) found.push(`${at}: the stack shows ${JSON.stringify(after.titles)}`);
    if (name === 'click: Classify one more after the pointer left' && after.held) found.push(`${at}: ${after.held} timer stays held with no pointer or focus in the stack`);
    // The stack is fixed to its corner. An empty stack keeps the corner too.
    const moved = Math.max(Math.abs(after.bottom - before.bottom), Math.abs(after.right - before.right));
    if (moved > 1) found.push(`${at}: the stack's corner moved ${Math.round(moved)}px`);
    if (!(after.cls < 0.1)) found.push(`${at}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${at}: the page scrolls ${after.over}px sideways`);
    before = after;
  }
  return { found, ran };
}

test('an undo stack keeps three notices, each Undo acts on its own notice, and the keyboard stays in the stack', {
  skip: process.env.TOAST_STACK !== '1' && 'set TOAST_STACK=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'TOAST_STACK=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
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
    for (const [label, context] of subjects) {
      const { ctx, page } = await open(browser, server.port, vitals, context);
      const width = await page.evaluate(() => innerWidth);
      const { found, ran } = await walk(page, label);
      findings.push(...found);
      assert.equal(ran.length, ACTIONS.length, `${label}: ${ran.length} of ${ACTIONS.length} actions ran`);
      table.push(`${label} ${width}px: ${ran.length} actions, ${found.length ? 'fail' : 'pass'}`);
      await ctx.close();
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, SIZES.length + DEVICES.length + DUO.length, 'a size or a device was not measured');
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    const phone = { viewport: { width: 390, height: 844 } };
    const mutate = async (setup, only, says) => {
      const { ctx, page } = await open(browser, server.port, vitals, phone);
      page.setDefaultTimeout(3000);
      await setup(page);
      // A walk that cannot reach the focus it waits for stops, and its error says that the focus left.
      const { found } = await walk(page, 'mutated', { only }).catch((error) => ({ found: [String(error)] }));
      caught.push([says, found.some((f) => f.includes(says)), found]);
      await ctx.close();
    };
    await mutate((page) => page.evaluate(() => document.addEventListener('keydown', () => setTimeout(() => document.activeElement.blur()), true)), ['click: Classify one more', 'key: Tab into the stack'], 'focus left');
    await mutate((page) => page.addStyleTag({ content: '#storybook-root { min-width: 200vw; }' }), ['click: Classify one more', 'key: Tab into the stack'], 'sideways');
    await mutate((page) => page.evaluate(() => document.addEventListener('keydown', () => { document.querySelector('.rx-toast-stack').style.bottom = '40px'; }, true)), ['click: Classify one more', 'key: Tab into the stack'], 'corner moved');
    await mutate(async (page) => {
      // A stack that rises with no input, as a late banner under it would push it. A focus by
      // script is no input, so the shift counts.
      await page.evaluate(() => {
        document.querySelector('#storybook-root button').focus();
        document.querySelector('.rx-toast-stack').style.bottom = '300px';
      });
      await page.evaluate(frames);
    }, ['key: Tab into the stack'], 'layout shift');
    await mutate((page) => page.addStyleTag({ content: '.ui-toast__ring { display: none; }' }), [], 'show a ring');
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says, , found]) => `${says}: ${JSON.stringify(found)}`), [], 'a mutation passed or failed for another reason: this walk cannot see it');
    // The focus mutation fails with the focus loss, never with a bare timeout.
    const [, , lost] = caught.find(([says]) => says === 'focus left');
    assert.ok(lost.length && lost.every((f) => f.includes('focus left') && !/^TimeoutError/.test(f)), `the focus mutation failed for another reason: ${JSON.stringify(lost)}`);
  } finally {
    await browser.close();
    server.proc.kill();
  }
});

/* Rule: a page with a bar at the bottom sets `bottomOffset`, and the stack stands 16px above the
 * bar while the bar shows and 16px above the bottom of the view when it does not. The published
 * reach follows the stack. Off unless TOAST_STACK=1, with the same commands as the walk above.
 *
 * It opens react-toast--bottom-bar (four rows, two selected, a floating bar with Clear and
 * Archive, and one undo notice) at the same ten sizes and six devices, under reduced motion,
 * because the kit's net then turns the move into a 0.01ms transition that ends after the
 * provider reads the stack. The walk clicks a third row, Archive, which closes the bar, a row,
 * which opens it again, and Clear. Between them it moves the focus to the newest Undo by script
 * and presses Escape. After each step it reads the gap to the bar or to the bottom, the reach
 * against the stack's top, the layout shift, the sideways overflow, and, after a key, the focus.
 *
 * The same test opens react-toast--tones (five notices that stay) at each size and device, and
 * checks that the stack stands inside the view and shows its newest notice whole. A taller stack
 * scrolls. It also opens react-toast--presentations-gallery with actions at each size and device,
 * with full and reduced motion. It presses Enter twice on Show toasts for ten notices, Tab to the
 * oldest notice's Undo and Escape, and checks that the focus goes to Reload, which stays whole
 * inside the stack and the view. Then it opens react-toast--undo-one with bottomOffset 10vh at
 * 1280×800 with full motion, makes the view 1000px tall, and checks that the published reach
 * follows the stack.
 *
 * Its limits: one engine, the light theme and the default accent. The focus is placed by script,
 * so it reads where the focus is, not how the ring paints. The source half is in
 * react/src/Toast.test.tsx. #907
 */
const BAR_STORY = 'react-toast--bottom-bar';
const READ_BAR = () => {
  const stack = document.querySelector('.rx-toast-stack');
  const doc = document.scrollingElement;
  const box = stack.getBoundingClientRect();
  const bar = document.querySelector('.ui-float-bar')?.getBoundingClientRect();
  return {
    cls: window.__cls, over: doc.scrollWidth - doc.clientWidth,
    bar: !!bar, gap: (bar ? bar.top : innerHeight) - box.bottom,
    reach: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rx-toast-stack')),
    top: innerHeight - box.top,
    inside: stack.contains(document.activeElement),
    count: stack.querySelectorAll('.ui-toast:not(.is-leaving)').length,
  };
};
const BAR_ACTIONS = [
  ['click: select a third row', async (page) => {
    await page.getByRole('checkbox', { name: 'Select Path sketch' }).click();
    await page.getByText('3 selected').waitFor();
  }, { bar: true, count: 1 }],
  ['click: Archive', async (page) => {
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.locator('.ui-float-bar').waitFor({ state: 'detached' });
    await live(page, 2);
  }, { bar: false, count: 2 }],
  ['click: select a row', async (page) => {
    await page.getByRole('checkbox', { name: 'Select Field notes' }).click();
    await page.getByText('1 selected').waitFor();
  }, { bar: true, count: 2 }],
  ['key: Escape on the newest notice', async (page) => {
    await notice(page, 'files archived').getByRole('button', { name: 'Undo' }).focus();
    await page.keyboard.press('Escape');
    await live(page, 1);
    await focused(page, button(page, 'Seed list', 'Undo'));
  }, { bar: true, count: 1 }],
  ['click: Clear', async (page) => {
    await page.getByRole('button', { name: 'Clear' }).click();
    await page.locator('.ui-float-bar').waitFor({ state: 'detached' });
  }, { bar: false, count: 1 }],
];

async function openBar(browser, port, vitals, context) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC', reducedMotion: 'reduce' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${BAR_STORY}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, BAR_STORY);
  await live(page, 1);
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  return { ctx, page };
}

// A stack of five notices on a short view stands inside the view and shows its newest notice whole.
const TALL_STORY = 'react-toast--tones';
const READ_TALL = () => {
  const stack = document.querySelector('.rx-toast-stack');
  const box = stack.getBoundingClientRect();
  const newest = stack.lastElementChild.getBoundingClientRect();
  const doc = document.scrollingElement;
  return {
    count: stack.querySelectorAll('.ui-toast').length, top: box.top, bottom: innerHeight - box.bottom,
    hidden: Math.max(0, box.top - newest.top, newest.bottom - box.bottom), over: doc.scrollWidth - doc.clientWidth,
  };
};
async function openAt(browser, port, context, id, args = '', reducedMotion = 'reduce', init = '') {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC', reducedMotion });
  if (init) await ctx.addInitScript({ content: init });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story&globals=theme:light${args}`);
  await page.waitForFunction((story) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === story, id);
  return { ctx, page };
}
async function checkTall(page, label) {
  await live(page, 5);
  await page.evaluate(frames);
  const state = await page.evaluate(READ_TALL);
  const found = [];
  if (state.top < 0) found.push(`${label}: the stack stands ${Math.round(-state.top)}px above the view`);
  if (Math.abs(state.bottom - 16) > 1) found.push(`${label}: the stack stands ${Math.round(state.bottom)}px above the bottom`);
  if (state.hidden > 1) found.push(`${label}: ${Math.round(state.hidden)}px of the newest notice is out of the stack`);
  if (state.over > 0) found.push(`${label}: the page scrolls ${state.over}px sideways`);
  return found;
}
// A stack that scrolls keeps the focused control in view when a notice leaves.
const KEPT_STORY = 'react-toast--presentations-gallery';
async function checkKept(page, label) {
  await page.getByRole('button', { name: 'Show toasts' }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await live(page, 10);
  await page.keyboard.press('Tab');
  await focused(page, button(page, 'Deployment live', 'Undo').first());
  await page.keyboard.press('Escape');
  await live(page, 9);
  await focused(page, button(page, 'Sync scheduled', 'Reload').first());
  await page.evaluate(frames);
  const hidden = await page.evaluate(() => {
    const box = document.querySelector('.rx-toast-stack').getBoundingClientRect();
    const control = document.activeElement.getBoundingClientRect();
    const top = Math.max(0, box.top), bottom = Math.min(innerHeight, box.bottom);
    return Math.max(0, top - control.top, control.bottom - bottom);
  });
  return hidden > 1 ? [`${label}: ${Math.round(hidden)}px of the focused Reload is out of view`] : [];
}
// An offset in view units moves the stack when the view changes size. The reach follows it. Full
// motion, because under reduced motion the net's transition on the move ends in a read of its own.
async function checkResize(page, label) {
  await live(page, 1);
  await page.evaluate(frames);
  const found = [];
  for (const height of [800, 1000]) {
    await page.setViewportSize({ width: 1280, height });
    await page.evaluate(frames);
    const state = await page.evaluate(READ_BAR);
    if (Math.abs(state.gap - height / 10) > 1) found.push(`${label} ${height}px: the stack stands ${Math.round(state.gap)}px above the bottom`);
    if (Math.abs(state.reach - state.top) > 1) found.push(`${label} ${height}px: the published reach is ${state.reach}px and the stack reaches ${Math.round(state.top)}px`);
  }
  return found;
}

async function walkBar(page, label, { only } = {}) {
  const found = [];
  const ran = [];
  const check = (at, state, want) => {
    if (want && (state.bar !== want.bar || state.count !== want.count)) found.push(`${at}: bar ${state.bar}, ${state.count} notices`);
    if (Math.abs(state.gap - 16) > 1) found.push(`${at}: the stack stands ${Math.round(state.gap)}px above the ${state.bar ? 'bar' : 'bottom'}`);
    if (Math.abs(state.reach - state.top) > 1) found.push(`${at}: the published reach is ${state.reach}px and the stack reaches ${Math.round(state.top)}px`);
    if (!(state.cls < 0.1)) found.push(`${at}: the layout shift is ${state.cls}`);
    if (state.over > 0) found.push(`${at}: the page scrolls ${state.over}px sideways`);
  };
  await page.evaluate(frames);
  check(`${label} at rest`, await page.evaluate(READ_BAR), { bar: true, count: 1 });
  for (const [name, run, want] of BAR_ACTIONS.filter(([n]) => !only || only.includes(n))) {
    await run(page);
    await page.evaluate(frames);
    const state = await page.evaluate(READ_BAR);
    ran.push(name);
    check(`${label} ${name}`, state, want);
    if (name.startsWith('key:') && !state.inside) found.push(`${label} ${name}: the focus left the stack`);
  }
  return { found, ran };
}

test('a page with a bottom bar keeps the stack 16px above the bar, and the reach follows the stack', {
  skip: process.env.TOAST_STACK !== '1' && 'set TOAST_STACK=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'TOAST_STACK=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries).includes(BAR_STORY), `the Storybook build has no ${BAR_STORY}`);

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
    for (const [label, context] of subjects) {
      const { ctx, page } = await openBar(browser, server.port, vitals, context);
      const width = await page.evaluate(() => innerWidth);
      const { found, ran } = await walkBar(page, label);
      findings.push(...found);
      assert.equal(ran.length, BAR_ACTIONS.length, `${label}: ${ran.length} of ${BAR_ACTIONS.length} actions ran`);
      table.push(`bottom bar ${label} ${width}px: ${ran.length} actions, ${found.length ? 'fail' : 'pass'}`);
      await ctx.close();
      const tall = await openAt(browser, server.port, context, TALL_STORY);
      const high = await checkTall(tall.page, `five notices ${label}`);
      findings.push(...high);
      table.push(`five notices ${label} ${width}px: ${high.length ? 'fail' : 'pass'}`);
      await tall.ctx.close();
      for (const motion of ['no-preference', 'reduce']) {
        const kept = await openAt(browser, server.port, context, KEPT_STORY, '&args=action:!true', motion);
        const lost = await checkKept(kept.page, `focus after a dismissal ${label} ${motion}`);
        findings.push(...lost);
        table.push(`focus after a dismissal ${label} ${width}px ${motion}: ${lost.length ? 'fail' : 'pass'}`);
        await kept.ctx.close();
      }
    }
    const resized = await openAt(browser, server.port, { viewport: { width: 1280, height: 800 } }, 'react-toast--undo-one', '&args=bottomOffset:10vh', 'no-preference');
    findings.push(...await checkResize(resized.page, 'bottomOffset 10vh'));
    await resized.ctx.close();
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, 4 * (SIZES.length + DEVICES.length + DUO.length), 'a size or a device was not measured');
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    const phone = { viewport: { width: 390, height: 844 } };
    const mutate = async (setup, only, says) => {
      const { ctx, page } = await openBar(browser, server.port, vitals, phone);
      page.setDefaultTimeout(3000);
      await setup(page);
      const { found } = await walkBar(page, 'mutated', { only }).catch((error) => ({ found: [String(error)] }));
      caught.push([says, found.some((f) => f.includes(says)), found]);
      await ctx.close();
    };
    // A stack that ignores bottomOffset, as on main.
    await mutate((page) => page.addStyleTag({ content: '.ui-toast-stack.rx-toast-stack { bottom: 16px !important; }' }), [], 'above the bar');
    // A reach read only before the move: the end of the move never reaches the provider.
    await mutate((page) => page.evaluate(() => document.addEventListener('transitionend', (event) => event.stopImmediatePropagation(), true)), ['click: Clear'], 'published reach');
    await mutate((page) => page.evaluate(() => document.addEventListener('keydown', () => setTimeout(() => document.activeElement.blur()), true)),
      BAR_ACTIONS.map(([name]) => name).filter((name) => name !== 'click: Clear'), 'focus left');
    await mutate((page) => page.addStyleTag({ content: '#storybook-root { min-width: 200vw; }' }), [], 'sideways');
    // A stack with no top, as on ee4b2d7c: five notices rise out of a landscape phone's view.
    const landscape = await openAt(browser, server.port, { viewport: { width: 844, height: 390 } }, TALL_STORY);
    await landscape.page.addStyleTag({ content: '.ui-toast-stack.rx-toast-stack.rx-toast-stack--scroll { top: auto; }' });
    const risen = await checkTall(landscape.page, 'mutated');
    caught.push(['above the view', risen.some((f) => f.includes('above the view')), risen]);
    await landscape.ctx.close();
    // A stack that shows its newest notice after every change, as on 0d821a3f: the focused Reload
    // scrolls out of a landscape phone's view.
    const scrolled = await openAt(browser, server.port, { viewport: { width: 844, height: 390 } }, KEPT_STORY, '&args=action:!true', 'no-preference',
      "new MutationObserver(() => { const s = document.querySelector('.rx-toast-stack'); if (s) s.scrollTop = s.scrollHeight; }).observe(document, { childList: true, subtree: true });");
    scrolled.page.setDefaultTimeout(3000);
    const away = await checkKept(scrolled.page, 'mutated').catch((error) => [String(error)]);
    caught.push(['out of view', away.some((f) => f.includes('out of view')), away]);
    await scrolled.ctx.close();
    // A reach that the view's resize does not publish again, as on ee4b2d7c.
    // The window runs its own listeners in the order they came, so this one comes before the page's.
    const unheard = await openAt(browser, server.port, { viewport: { width: 1280, height: 800 } }, 'react-toast--undo-one', '&args=bottomOffset:10vh', 'no-preference',
      "addEventListener('resize', (event) => event.stopImmediatePropagation());");
    const stale = await checkResize(unheard.page, 'mutated');
    caught.push(['1000px: the published reach', stale.some((f) => f.includes('1000px: the published reach')), stale]);
    await unheard.ctx.close();
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says, , found]) => `${says}: ${JSON.stringify(found)}`), [], 'a mutation passed or failed for another reason: this walk cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
