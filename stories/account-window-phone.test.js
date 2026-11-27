/* Rule: at 560px and below the account window floats with a --space-4 gap on each side, or
 * the safe-area inset where that is wider. It takes the safe screen height, so a section change
 * does not change its height. It shows one screen: the section, with a head row of the back
 * button, the title and the close, or the screen of sections. Only the section's body scrolls.
 * Tab through the body scrolls each control in with its whole ring, at both text sizes (#795).
 * The back button and a press on a section move focus to the new screen, and its ring shows
 * whole (#885).
 *
 * The source half runs in CI. It reads the 560px block of AccountWindow.css and checks that
 * the window keeps all four clearances, a dvh height, the modal radius and one screen. It
 * proves rejection against the full-screen block #795 replaced and the content height #885
 * replaced.
 *
 * The browser half is off unless ACCOUNT_PHONE=1: Playwright and web-vitals are not
 * dependencies of this package, CI does not run it, and the result is reported by hand in the
 * pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js ACCOUNT_PHONE=1 \
 *     node --test stories/account-window-phone.test.js
 *
 * Its first test: one engine, light only, the two AccountWindow stories, at 390x844 and
 * 320x640, with the kit's text sizes and with each --text-* token doubled. Headless
 * Chromium reports no safe-area inset, so the browser half measures the --space-4 gap and
 * the env() half is the source half's. The ring check compares the outline's box with the
 * boxes of the clipping ancestors, and does not read paint. The body walk goes down with
 * Tab only, so a ring that Shift+Tab scrolls in at the upper edge is not measured. The
 * mutation removes the body's scroll padding in each long section case and needs at least
 * one clipped stop in one of them.
 *
 * Its second test walks the keys and clicks of the Playground story at ten window sizes and
 * on six devices: the Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's
 * list, and a two-screen phone of 466x678 and 890x626 at scale 3 with touch. Where the back
 * button shows, it walks the two screens. Wider, it walks the rail. After each action the
 * window keeps its box, the focus stays in it, no fixed element moves by more than 1px, the
 * layout shift from web-vitals' onCLS stays under 0.1, and the page does not scroll sideways.
 * The last action is Escape, and the window must close. onCLS does not count a shift within
 * 500ms of an input, so the window's box is read after each action as well. A mutation puts
 * back the content height and must be caught. Light theme and the default accent only.
 * why: docs/components.md#account-window
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DOUBLE_TEXT } from './lib/double-text.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = path.join(root, 'react/src/AccountWindow.css');
const SIDES = ['top', 'right', 'bottom', 'left'];

/** The window rule inside the 560px block, as one string, or null. */
const phoneRule = (css) => {
  const at = css.indexOf('@media (max-width: 560px)');
  if (at < 0) return null;
  const rule = css.slice(at).match(/\.rx-modal\.rx-account\s*\{([^}]*)\}/);
  return rule ? rule[1] : null;
};

/** What the 560px window rule is missing, in words. */
const phoneFaults = (css) => {
  const rule = phoneRule(css);
  if (rule === null) return ['no .rx-modal.rx-account rule at 560px'];
  const faults = [];
  const margin = rule.match(/margin:([^;]*);/)?.[1] ?? '';
  for (const side of SIDES) {
    if (!margin.includes(`max(var(--space-4), env(safe-area-inset-${side}))`)) faults.push(`no ${side} clearance in the margin`);
  }
  if (!/(^|[;\s])height:\s*calc\(100dvh\s*-[^;]*safe-area-inset-top[^;]*safe-area-inset-bottom/.test(rule)) faults.push('no dvh height less both clearances');
  if (!/width:\s*calc\(100vw\s*-[^;]*safe-area-inset-left[^;]*safe-area-inset-right/.test(rule)) faults.push('no width less both clearances');
  if (/(^|[;\s])height:\s*auto/.test(rule)) faults.push('the height follows the content');
  if (/border-radius/.test(rule)) faults.push('the window drops the modal radius');
  const block = css.slice(css.indexOf('@media (max-width: 560px)'));
  if (!/\[data-view="section"\] \.rx-account__rail,\s*\.rx-account\[data-view="sections"\] \.rx-account__pane \{ display: none;[^}]*\}/.test(block)) {
    faults.push('the window does not show one screen');
  }
  return faults;
};

test('the 560px window keeps its four clearances, a dvh height, the modal radius and one screen', () => {
  assert.deepEqual(phoneFaults(readFileSync(SHEET, 'utf8')), []);
});

test('the source check rejects the full-screen window #795 replaced', () => {
  const before = `@media (max-width: 560px) {
  .rx-modal.rx-account { width: 100vw; height: 100vh; height: 100dvh; border-radius: 0;
    flex-direction: column; } }`;
  const faults = phoneFaults(before);
  assert.ok(faults.length >= 6, `the old block passed: ${faults.join(', ')}`);
  assert.ok(faults.includes('the window drops the modal radius'));
});

test('the source check rejects the content height and the tabs #885 replaced', () => {
  const clear = SIDES.map((side) => `max(var(--space-4), env(safe-area-inset-${side}))`).join(' ');
  const before = `@media (max-width: 560px) {
  .rx-modal.rx-account { flex-direction: column; height: auto; margin: ${clear};
    width: calc(100vw - max(var(--space-4), env(safe-area-inset-left)) - max(var(--space-4), env(safe-area-inset-right)));
    max-height: calc(100dvh - max(var(--space-4), env(safe-area-inset-top)) - max(var(--space-4), env(safe-area-inset-bottom))); }
  .rx-account__tabs, .rx-account__who > .ui-btn { display: flex; } }`;
  assert.deepEqual(phoneFaults(before), ['no dvh height less both clearances', 'the height follows the content',
    'the window does not show one screen']);
});

const STORIES = [
  { id: 'react-accountwindow--playground', section: 'Profile' },
  { id: 'react-accountwindow--long-section', section: 'Notifications', long: true },
];
const VIEWS = [{ width: 390, height: 844 }, { width: 320, height: 640 }];
const GAP = 16;
const SLACK = 0.5;


// The window's boxes and scroll state, after two painted frames.
const MEASURE = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => {
  const q = (sel) => document.querySelector(sel);
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, height: r.height }; };
  const dialog = q('.rx-account');
  const body = q('.rx-account__body');
  const scrolled = ['.rx-account', '.rx-account__pane', '.rx-account__head']
    .filter((sel) => { const el = q(sel); return el.scrollHeight > el.clientHeight + 1 || el.scrollTop || el.scrollLeft; });
  if (document.scrollingElement.scrollLeft) scrolled.push('the page');
  ok({
    view: { width: innerWidth, height: innerHeight },
    dialog: box(dialog), head: box(q('.rx-account__head')),
    title: q('.rx-account__title').textContent,
    body: { box: box(body), scroll: body.scrollHeight, client: body.clientHeight, top: body.scrollTop },
    scrolled,
  });
})));

// The focused element's outline box, and each clipping ancestor that cuts it.
const RING = () => {
  const el = document.activeElement;
  const cs = getComputedStyle(el);
  const out = cs.outlineStyle === 'none' ? 0 : parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset);
  const r = el.getBoundingClientRect();
  const ring = { top: r.top - out, right: r.right + out, bottom: r.bottom + out, left: r.left - out };
  const cuts = [];
  for (let a = el.parentElement; a; a = a.parentElement) {
    const s = getComputedStyle(a);
    if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
    const c = a.getBoundingClientRect();
    if (ring.left < c.left - 0.5 || ring.right > c.right + 0.5 || ring.top < c.top - 0.5 || ring.bottom > c.bottom + 0.5) {
      cuts.push(a.className || a.tagName);
    }
  }
  return { tab: el.textContent, role: el.getAttribute('role'), label: el.getAttribute('aria-label'),
    current: el.getAttribute('aria-current'), style: cs.outlineStyle, out, cuts,
    sideways: ['.rx-account', '.rx-account__rail', '.rx-account__pane'].filter((sel) => document.querySelector(sel).scrollLeft)
      .concat(document.scrollingElement.scrollLeft ? ['the page'] : []) };
};

// Tab from wherever focus is into the body, then through each stop in it, and read each ring.
const walkBody = async (page) => {
  await page.evaluate(() => { document.querySelector('.rx-account__body').scrollTop = 0; });
  const inBody = () => page.evaluate(() => document.querySelector('.rx-account__body').contains(document.activeElement));
  for (let i = 0; i < 40 && !await inBody(); i += 1) await page.keyboard.press('Tab');
  const stops = [];
  while (await inBody() && stops.length < 60) {
    await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(null)))));
    stops.push(await page.evaluate(RING));
    await page.keyboard.press('Tab');
  }
  const controls = await page.evaluate(() => document.querySelector('.rx-account__body')
    .querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]').length);
  return { stops, controls };
};

test('the phone window floats with a gap, keeps its height, and only the section body scrolls', {
  skip: process.env.ACCOUNT_PHONE !== '1' && 'set ACCOUNT_PHONE=1',
}, async () => {
  const { serve, openStory, playwright, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'ACCOUNT_PHONE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const ids = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  for (const { id } of STORIES) assert.ok(ids.includes(id), `${id} is not in the Storybook build`);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  let measured = 0;
  let mutated = 0;
  try {
    for (const view of VIEWS) for (const doubled of [false, true]) for (const story of STORIES) {
      const where = `${story.id} ${view.width}x${view.height}${doubled ? ' text 200%' : ''}`;
      const page = await browser.newPage({ viewport: view });
      try {
        const done = await openStory(page, story, { port: server.port, theme: 'light' });
        assert.equal(done.phase, STORY_DONE, `${where} did not render: ${done.phase}`);
        await page.waitForSelector('.rx-scrim.is-open');
        if (doubled) assert.ok(await page.evaluate(DOUBLE_TEXT) > 0, `${where}: no --text-* token to double`);
        await page.evaluate(() => document.fonts.ready);
        const m = await page.evaluate(MEASURE);
        assert.equal(m.title, story.section, `${where} opened another section`);
        const { dialog } = m;
        assert.ok(Math.abs(dialog.left - GAP) <= SLACK && Math.abs(view.width - dialog.right - GAP) <= SLACK,
          `${where}: the window is not ${GAP}px from each side: ${dialog.left} .. ${dialog.right}`);
        assert.ok(dialog.top >= GAP - SLACK && dialog.bottom <= view.height - GAP + SLACK,
          `${where}: the window leaves the ${GAP}px clearance: ${dialog.top} .. ${dialog.bottom}`);
        assert.deepEqual(m.scrolled, [], `${where}: these scroll as well as the body`);
        assert.ok(Math.abs(view.height - GAP * 2 - dialog.height) <= SLACK, `${where}: the window is ${dialog.height}px high, not the screen less the clearance`);
        if (!doubled && view.width === 390) {
          assert.equal(m.head.height, 56, `${where}: the head row is ${m.head.height}px high`);
          assert.equal(m.body.box.height, 756, `${where}: the section gets ${m.body.box.height}px`);
        }
        const overflows = m.body.scroll > m.body.client + 1;
        if (story.long) assert.ok(overflows, `${where}: the long section does not scroll`);
        if (!doubled && view.width === 390 && !story.long) assert.ok(!overflows, `${where}: Profile does not fit at 390x844`);
        if (overflows) {
          await page.evaluate(() => { const b = document.querySelector('.rx-account__body'); b.scrollTop = b.scrollHeight; });
          const end = await page.evaluate(MEASURE);
          assert.ok(end.body.top > 0, `${where}: the body did not scroll`);
          assert.equal(end.head.top, m.head.top, `${where}: the title moved with the body`);
        }
        // Tab through the body: each control scrolls in with its whole ring.
        const walk = await walkBody(page);
        assert.equal(walk.stops.length, walk.controls, `${where}: Tab stopped ${walk.stops.length} times in a body of ${walk.controls} controls`);
        for (const stop of walk.stops) {
          assert.ok(stop.out > 0, `${where}: ${stop.tab || stop.role} shows no outline`);
          assert.deepEqual(stop.cuts, [], `${where}: the ring of ${stop.tab || stop.role} is clipped`);
        }
        // Chrome centres a stop that was wholly out of view, so only a stop that was partly
        // in view lands on the edge. Which case has one depends on the geometry.
        if (story.long) {
          await page.addStyleTag({ content: '.rx-account__body { scroll-padding-block: 0 !important; }' });
          await page.evaluate(() => document.activeElement.blur());
          const bare = await walkBody(page);
          if (bare.stops.some((stop) => stop.cuts.length)) mutated += 1;
          await page.evaluate(() => document.activeElement.blur());
        }
        // The back button with the keyboard, so :focus-visible is on, then the next section.
        await page.focus('.rx-account__back');
        await page.keyboard.press('Enter');
        await page.waitForSelector('.rx-account[data-view="sections"]');
        const list = await page.evaluate(MEASURE).then(() => page.evaluate(RING));
        assert.equal(list.current, 'true', `${where}: the back button did not move focus to the marked section`);
        // The rail's rows draw the band inward, so the outline reaches no further than the row.
        assert.notEqual(list.style, 'none', `${where}: the marked section shows no outline`);
        assert.deepEqual(list.cuts, [], `${where}: the ring of the marked section is clipped`);
        assert.deepEqual((await page.evaluate(MEASURE)).dialog, dialog, `${where}: the screen of sections moved the window`);
        await page.keyboard.press('Tab');
        const next = await page.evaluate(() => document.activeElement.textContent);
        await page.keyboard.press('Enter');
        await page.waitForSelector('.rx-account[data-view="section"]');
        const head = await page.evaluate(MEASURE).then(() => page.evaluate(RING));
        assert.equal(head.label, 'Sections', `${where}: a section press did not move focus to the back button`);
        assert.ok(head.out > 0, `${where}: the back button shows no outline`);
        assert.deepEqual(head.cuts, [], `${where}: the ring of the back button is clipped`);
        assert.deepEqual(head.sideways, [], `${where}: these scrolled sideways`);
        const after = await page.evaluate(MEASURE);
        assert.equal(after.title, next, `${where}: the press opened another section`);
        assert.deepEqual(after.dialog, dialog, `${where}: the section change moved the window`);
        measured += 1;
      } finally {
        await page.close();
      }
    }
  } finally {
    server.proc.kill();
    await browser.close();
  }
  assert.equal(measured, VIEWS.length * 2 * STORIES.length, 'every case was measured');
  assert.ok(mutated >= 1, 'the walk passed with no scroll padding in each long section');
});

const MATRIX_STORY = 'react-accountwindow--playground';
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];

// The state after one action: the window's box, the screen, the focus, the fixed elements'
// places, the layout shift so far and the page's sideways overflow.
const STATE = () => {
  const dialog = document.querySelector('.rx-account');
  const r = dialog?.getBoundingClientRect();
  const fixed = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed')
    .map((e) => { const b = e.getBoundingClientRect(); return { name: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`, x: b.left, y: b.top }; });
  const doc = document.scrollingElement;
  return {
    open: Boolean(document.querySelector('.rx-scrim.is-open')),
    box: r ? [r.left, r.top, r.width, r.height] : null,
    view: dialog?.dataset.view, title: document.querySelector('.rx-account__title')?.textContent,
    focusIn: Boolean(dialog?.contains(document.activeElement)),
    fixed, cls: window.__cls, over: doc.scrollWidth - doc.clientWidth,
  };
};
const settle = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));

// The actions, in order. Each names the state it waits for, so no step waits on time.
const titled = (page, name) => page.locator('.rx-account__title', { hasText: name }).waitFor();
const screen = (page, view) => page.locator(`.rx-account[data-view="${view}"]`).waitFor();
const closed = (page) => page.locator('.rx-scrim').waitFor({ state: 'detached' });
const PHONE = [
  ['key: Enter on Sections', async (page) => { await page.focus('.rx-account__back'); await page.keyboard.press('Enter'); await screen(page, 'sections'); }],
  ['key: Tab, Enter on Security', async (page) => { await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await titled(page, 'Security'); }],
  ['click: Sections', async (page) => { await page.getByRole('button', { name: 'Sections' }).click(); await screen(page, 'sections'); }],
  ['click: Notifications', async (page) => { await page.locator('.rx-account__side').getByRole('button', { name: 'Notifications' }).click(); await titled(page, 'Notifications'); }],
  ['click: Billing via Sections', async (page) => {
    await page.getByRole('button', { name: 'Sections' }).click(); await screen(page, 'sections');
    await page.locator('.rx-account__side').getByRole('button', { name: 'Billing' }).click(); await titled(page, 'Billing'); }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); await closed(page); }],
];
const WIDE = [
  ['click: Security', async (page) => { await page.locator('.rx-account__side').getByRole('button', { name: 'Security' }).click(); await titled(page, 'Security'); }],
  ['key: Enter on Notifications', async (page) => {
    await page.locator('.rx-account__side').getByRole('button', { name: 'Notifications' }).focus(); await page.keyboard.press('Enter'); await titled(page, 'Notifications'); }],
  ['click: Billing', async (page) => { await page.locator('.rx-account__side').getByRole('button', { name: 'Billing' }).click(); await titled(page, 'Billing'); }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); await closed(page); }],
];

// Opens the story in a new context, with onCLS listening from the first paint.
async function openWindow(browser, port, vitals, context) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${MATRIX_STORY}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, MATRIX_STORY);
  await page.waitForSelector('.rx-scrim.is-open');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return { ctx, page };
}

async function walkWindow(page, label) {
  const found = [];
  await page.evaluate(settle);
  const start = await page.evaluate(STATE);
  const phone = await page.locator('.rx-account__back').isVisible();
  const actions = phone ? PHONE : WIDE;
  let before = start;
  for (const [name, run] of actions) {
    await run(page);
    await page.evaluate(settle);
    const after = await page.evaluate(STATE);
    const last = name === 'key: Escape';
    if (last && after.open) found.push(`${label} ${name}: Escape left the window open`);
    if (!last && JSON.stringify(after.box) !== JSON.stringify(start.box)) found.push(`${label} ${name}: the window is ${after.box}, was ${start.box}`);
    if (!last && !after.focusIn) found.push(`${label} ${name}: the focus left the window`);
    for (const c of after.fixed) {
      const was = before.fixed.find((b) => b.name === c.name);
      if (was && Math.max(Math.abs(c.x - was.x), Math.abs(c.y - was.y)) > 1) found.push(`${label} ${name}: ${c.name} moved ${c.x - was.x},${c.y - was.y}px`);
    }
    if (!(after.cls < 0.1)) found.push(`${label} ${name}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${label} ${name}: the page scrolls ${after.over}px sideways`);
    before = after;
  }
  return { found, phone, ran: actions.length };
}

test('the account window keeps its box through each key and click, at 10 sizes and on 6 devices', {
  skip: process.env.ACCOUNT_PHONE !== '1' && 'set ACCOUNT_PHONE=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'ACCOUNT_PHONE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build}. Run: npm run build-storybook`);
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
      const { ctx, page } = await openWindow(browser, server.port, vitals, context);
      const { found, phone, ran } = await walkWindow(page, label);
      findings.push(...found);
      table.push(`${label}: ${phone ? 'two screens' : 'rail'}, ${ran} actions, ${found.length ? 'fail' : 'pass'}`);
      await ctx.close();
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, SIZES.length + DEVICES.length + DUO.length, 'a size or a device was not measured');
    assert.deepEqual(findings, []);

    // The content height #885 replaced: the walk has to see the window change its height.
    const { ctx, page } = await openWindow(browser, server.port, vitals, { viewport: { width: 390, height: 844 } });
    await page.addStyleTag({ content: '@media (max-width: 560px) { .rx-modal.rx-account { height: auto !important; max-height: calc(100dvh - 32px); } }' });
    const { found } = await walkWindow(page, 'mutated');
    await ctx.close();
    assert.ok(found.some((f) => f.includes('the window is')), `the walk passed with the content height: ${found.join('; ')}`);
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
