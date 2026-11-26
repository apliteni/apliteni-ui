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
 * Escape. A walk that cannot reach a control stops with Playwright's timeout. The click starts
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
  };
};
const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));
const live = (page, count) => page.waitForFunction((n) => document.querySelectorAll('.rx-toast-stack .ui-toast').length === n, count);
const focused = (page, name) => page.locator(':focus').and(name).waitFor();
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
      // A walk that cannot reach the focus it waits for stops, and its error names that wait.
      const { found } = await walk(page, 'mutated', { only }).catch((error) => ({ found: [String(error)] }));
      caught.push([says, found.some((f) => f.includes(says))]);
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
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this walk cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
