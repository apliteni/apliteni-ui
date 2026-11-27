/* Rule: on a split layout, each key and click keeps the focus on a shown control of the page
 * that nothing covers and whose focus ring no box cuts, moves no shell chrome and no action row foot by more than 1px, keeps the cumulative layout shift
 * under 0.1 and causes no sideways scroll. Escape leaves the focus where it was. Above 860px
 * the content takes 60% and the preview 40%, or with a line 60% inside its limits, both reach the foot of the window, and the page
 * does not scroll down. At 860px and less the preview sits below the content and the action
 * row stays at the foot of the window.
 *
 * Off unless SPLIT_LAYOUT=1: Playwright and web-vitals are not dependencies of this
 * package, CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js SPLIT_LAYOUT=1 \
 *     node --test stories/split-layout.test.js
 *
 * It opens four stories in a new context at each of ten window sizes and on six devices: the
 * Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's list, and a two-screen
 * phone of 466×678 and 890×626 at scale 3 with touch. The Document review walks Tab from the
 * Invoices link with Zoom out at the foot of the window, Zoom in by key, Zoom out to its end, Fit by Tab and Enter, Escape, Continue to approval and Back to
 * review. Its unavailable preview walks Try again, Tab and Escape. The unavailable split layout
 * walks Enter on Try again at the foot of the scroll, so the stacked tools are stuck when the
 * focus goes to their title, and Escape. The zoomed split layout
 * walks Tab into the scrolled page, ArrowDown and End where the sheet is taller than its stage,
 * then a click on an action and Escape. The resizable split layout walks the keys, a drag,
 * Escape in a drag and a double click on its line above 860px, as stories/lib/resize-walk.js
 * says, and reads after each action that the first pane is as wide as the line says. The shell
 * chrome is every fixed or sticky element outside the split, found in the page, and the
 * action row. A focused control is covered when the element at its centre is not inside it,
 * such as the sticky action row over a zoom step. A 320×200 window then checks that Fit shows
 * the whole sheet in the stage.
 *
 * Its limits: one engine, the light theme and the default accent. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input, so a shift
 * that a press causes on purpose is not measured. No layer opens on these screens, so
 * Escape is checked to leave the focus as it was. The cover check reads one point, the centre,
 * and skips a control whose centre is outside the window. The ring check reads the outline
 * against each box that clips and the window. It does not see a ring drawn as a shadow, a cut by
 * clip-path, or a sticky element painted over the ring.
 * why: docs/components.md#split-layout
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LINE, LINES, resizeActions } from './lib/resize-walk.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];

// The state after one action: the focused control, the chrome's places, the layout shift so
// far and the page's sideways overflow.
const READ = () => {
  const el = document.activeElement;
  const page = document.querySelector('main');
  const split = document.querySelector('.ui-split');
  const shown = el && el !== document.body && page.contains(el) && el.checkVisibility();
  const box = shown && el.getBoundingClientRect();
  const hit = box && document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  // The focus ring reaches its outline width plus its offset past the box. Each box that clips
  // and the window must hold all of it.
  const css = shown && getComputedStyle(el);
  const out = css && css.outlineStyle !== 'none' ? parseFloat(css.outlineWidth) + parseFloat(css.outlineOffset) : 0;
  let cut = null;
  for (let a = shown ? el.parentElement : null; a && !cut; a = a.parentElement) {
    const own = getComputedStyle(a);
    const view = a === document.documentElement;
    if (!view && own.overflowX === 'visible' && own.overflowY === 'visible') continue;
    const r = view ? { top: 0, left: 0 } : a.getBoundingClientRect();
    const top = r.top + (view ? 0 : a.clientTop);
    const left = r.left + (view ? 0 : a.clientLeft);
    const edge = [['top', top - (box.top - out)], ['bottom', box.bottom + out - (top + a.clientHeight)],
      ['left', left - (box.left - out)], ['right', box.right + out - (left + a.clientWidth)]].find(([, past]) => past > 0.5);
    if (edge) cut = `${view ? 'the window' : `${a.tagName.toLowerCase()}.${[...a.classList].join('.')}`} cuts its ${edge[0]} by ${edge[1].toFixed(1)}px`;
  }
  const chrome = [...document.querySelectorAll('body *')]
    .filter((e) => (split ? !split.contains(e) : true) && ['fixed', 'sticky'].includes(getComputedStyle(e).position))
    .concat([...document.querySelectorAll('.ui-split__actions')])
    // The action row is held by its foot, because a narrower pane can wrap its buttons upward.
    .map((e) => { const r = e.getBoundingClientRect(); return { name: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`, x: r.left, y: e.matches('.ui-split__actions') ? r.bottom : r.top }; });
  const doc = document.scrollingElement;
  return {
    focus: shown ? (el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40) || el.getAttribute('role')) : null,
    cover: hit && !el.contains(hit) ? `${hit.tagName.toLowerCase()}.${[...hit.classList].join('.')}` : null, cut,
    chrome, cls: window.__cls, over: doc.scrollWidth - doc.clientWidth,
  };
};
const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));
// The wait for a focus move gives up quietly, so the read after the action reports where
// the focus went.
const focused = (locator) => locator.and(locator.page().locator(':focus')).waitFor({ timeout: 5000 }).catch(() => {});

// The actions, in order. Each names the state it waits for, so no step waits on time.
const button = (page, name) => page.getByRole('button', { name, exact: true });
const scale = (page) => page.locator('.ui-split__scale');
const REVIEW = [
  // The reader has scrolled until Zoom out sits at the foot of the window, under a stacked
  // action row. Chromium scrolls a control that Tab reaches only when it is outside the
  // scroll's clear area, so this is the case that the row's reserved height decides.
  ['key: Tab from Invoices', async (page) => {
    await page.evaluate(() => {
      const split = document.querySelector('.ui-split');
      const out = document.querySelector('[aria-label="Zoom out"]');
      split.scrollTop += out.getBoundingClientRect().bottom - split.getBoundingClientRect().bottom;
      [...document.querySelectorAll('main a')].filter((a) => a.textContent.trim() === 'Invoices').pop().focus({ preventScroll: true });
    });
    await page.keyboard.press('Tab');
    await focused(button(page, 'Zoom out'));
  }],
  ['key: Enter on Zoom in', async (page) => {
    await button(page, 'Zoom in').focus();
    await page.keyboard.press('Enter');
    await page.locator('.ui-split__tools [aria-pressed="false"]').waitFor();
  }],
  ['click: Zoom out to its end', async (page) => {
    while (await button(page, 'Zoom out').isEnabled()) {
      const was = await scale(page).textContent();
      await button(page, 'Zoom out').click();
      await page.waitForFunction((w) => document.querySelector('.ui-split__scale').textContent !== w, was);
    }
    await focused(button(page, 'Zoom in'));
  }],
  ['key: Tab and Enter on Fit', async (page) => {
    await page.keyboard.press('Tab');
    await focused(button(page, 'Fit'));
    await page.keyboard.press('Enter');
    await page.locator('.ui-split__tools [aria-pressed="true"]').waitFor();
  }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); }],
  ['click: Continue to approval', async (page) => {
    await button(page, 'Continue to approval').click();
    await focused(page.getByRole('heading', { level: 1, name: 'Confirm approval' }));
  }],
  ['click: Back to review', async (page) => {
    await button(page, 'Back to review').click();
    await focused(page.getByRole('heading', { level: 1, name: /^Review invoice/ }));
  }],
];
const UNAVAILABLE = [
  ['click: Try again', async (page) => {
    await button(page, 'Try again').click();
    await focused(page.getByRole('heading', { level: 2, name: 'Document preview' }));
    await page.locator('.ui-split__sheet h3').waitFor();
  }],
  ['key: Tab', async (page) => {
    await page.keyboard.press('Tab');
    await page.locator('.ui-split__tools :focus').waitFor();
  }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); }],
];
// The reader scrolls to the foot and presses Try again, so the stacked preview tools are stuck
// at the top of the scroll when the focus goes to their title.
const RETRY = [
  ['key: Enter on Try again at the foot', async (page) => {
    await page.evaluate(() => {
      for (const box of [document.scrollingElement, ...document.querySelectorAll('.ui-split, .ui-split__primary')]) box.scrollTop = box.scrollHeight;
    });
    await button(page, 'Try again').focus();
    await page.keyboard.press('Enter');
    await focused(page.getByRole('heading', { level: 2, name: 'Signed copy' }));
  }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); }],
];
// A 200% sheet fits the height of its stage in a large window, so there the three scroll
// actions do not run.
const scrolls = (page) => page.evaluate(() => {
  const stage = document.querySelector('.ui-split__stage');
  return stage.scrollHeight > stage.clientHeight + 1;
});
const ZOOMED = [
  ['key: Tab into the page', async (page) => {
    if (!await scrolls(page)) return false;
    await button(page, 'Fit').focus();
    await page.keyboard.press('Tab');
    await focused(page.getByRole('region', { name: 'Signed copy, page' }));
  }],
  ['key: ArrowDown', async (page) => {
    if (!await scrolls(page)) return false;
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.querySelector('.ui-split__stage').scrollTop > 0);
  }],
  ['key: End', async (page) => {
    if (!await scrolls(page)) return false;
    const was = await page.evaluate(() => document.querySelector('.ui-split__stage').scrollTop);
    await page.keyboard.press('End');
    await page.waitForFunction((w) => document.querySelector('.ui-split__stage').scrollTop > w, was);
  }],
  ['click: Mark as checked', async (page) => {
    await button(page, 'Mark as checked').click();
    await focused(button(page, 'Mark as checked'));
  }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); }],
];
const STORIES = [
  { id: 'apps-document-review--default', actions: REVIEW },
  { id: 'apps-document-review--default', args: 'preview:unavailable', actions: UNAVAILABLE },
  { id: 'react-split-layout--zoomed', actions: ZOOMED, optional: 3 },
  { id: 'react-split-layout--unavailable', actions: RETRY },
  // The line between the panes shows only above 860px, so its actions run only there.
  { id: 'react-split-layout--resizable', actions: resizeActions(0), wideOnly: true },
];
const label = (story) => `${story.id}${story.args ? ` ${story.args}` : ''}`;

// Opens a story in a new context, with onCLS listening from the first paint.
async function open(browser, port, vitals, context, story) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story.id}&viewMode=story&globals=theme:light${story.args ? `&args=${story.args}` : ''}`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, story.id);
  await page.locator('.ui-split').waitFor();
  return { ctx, page };
}

// The split's own checks before any action: the 60/40 panes that reach the foot above 860px,
// and the preview below the content with the action row at the foot at 860px and less.
async function inspect(page, name) {
  const found = [];
  const box = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const doc = document.scrollingElement;
    return { width: innerWidth, foot: innerHeight, down: doc.scrollHeight - doc.clientHeight,
      primary: r('.ui-split__primary'), preview: r('.ui-split__preview'), actions: r('.ui-split__actions'),
      line: document.querySelector('[role="separator"][aria-controls]') !== null };
  });
  if (box.width > 860) {
    // A layout with a line starts at 60% inside its limits: 320px, and 860px or all but 320px.
    const total = box.primary.width + box.preview.width;
    const want = box.line ? Math.min(Math.max(0.6 * total, 320), Math.min(860, total - 320)) / total : 0.6;
    const share = box.primary.width / total;
    if (Math.abs(share - want) > 0.02) found.push(`${name}: the content takes ${Math.round(share * 100)}%, not ${Math.round(want * 100)}%`);
    if (Math.abs(box.preview.bottom - box.foot) > 1) found.push(`${name}: the preview stops at ${Math.round(box.preview.bottom)}px, not at the foot`);
    if (box.down > 0) found.push(`${name}: the page scrolls ${box.down}px down`);
  } else {
    if (box.preview.top < box.primary.bottom - 1) found.push(`${name}: the preview does not sit below the content`);
    if (Math.abs(box.actions.bottom - box.foot) > 1) found.push(`${name}: the action row stops at ${Math.round(box.actions.bottom)}px, not at the foot`);
  }
  return { found, wide: box.width > 860 };
}

// Runs every action and returns the findings and the actions that ran.
async function walk(page, name, actions, { only } = {}) {
  const found = [];
  const ran = [];
  await page.evaluate(frames);
  let before = await page.evaluate(READ);
  if (before.chrome.length === 0) found.push(`${name}: no chrome found to hold still`);
  for (const [act, run] of actions.filter(([act]) => !only || only.includes(act))) {
    try {
      if (await run(page) === false) continue;
    } catch (error) {
      found.push(`${name} ${act}: ${error.message.split('\n')[0]}`);
      break;
    }
    await page.evaluate(frames);
    const after = await page.evaluate(READ);
    for (const line of await page.evaluate(LINES)) found.push(`${name} ${act}: ${line}`);
    ran.push(act);
    if (!after.focus) found.push(`${name} ${act}: the focus left the page's shown controls`);
    if (after.cover) found.push(`${name} ${act}: ${after.cover} covers the focused ${after.focus}`);
    if (after.cut) found.push(`${name} ${act}: the ring of the focused ${after.focus} is cut: ${after.cut}`);
    for (const c of after.chrome) {
      const was = before.chrome.find((b) => b.name === c.name);
      if (was && Math.max(Math.abs(c.x - was.x), Math.abs(c.y - was.y)) > 1) found.push(`${name} ${act}: ${c.name} moved ${Math.round(c.x - was.x)},${Math.round(c.y - was.y)}px`);
    }
    if (!(after.cls < 0.1)) found.push(`${name} ${act}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${name} ${act}: the page scrolls ${after.over}px sideways`);
    if (act === 'key: Escape' && after.focus !== before.focus) found.push(`${name} ${act}: Escape moved the focus from ${before.focus} to ${after.focus}`);
    before = after;
  }
  return { found, ran };
}

test('the split layout keeps focus, chrome, layout and width through each interaction', {
  skip: process.env.SPLIT_LAYOUT !== '1' && 'set SPLIT_LAYOUT=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'SPLIT_LAYOUT=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const ids = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  for (const story of STORIES) assert.ok(ids.includes(story.id), `the Storybook build has no ${story.id}`);

  const subjects = (process.env.SPLIT_LAYOUT_ONLY ? (s) => s.filter(([name]) => name === process.env.SPLIT_LAYOUT_ONLY) : (s) => s)([
    ...SIZES.map(([width, height]) => [`${width}×${height}`, { viewport: { width, height } }]),
    ...DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...DUO.map(([width, height]) => [`two-screen ${width}×${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ]);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const findings = [];
    const table = [];
    const views = { wide: 0, stacked: 0 };
    let skipped = 0;
    for (const [name, context] of subjects) {
      for (const story of STORIES) {
        const { ctx, page } = await open(browser, server.port, vitals, context, story);
        const own = await inspect(page, `${name} ${label(story)}`);
        findings.push(...own.found);
        views[own.wide ? 'wide' : 'stacked'] += 1;
        const { found, ran } = await walk(page, `${name} ${label(story)}`, story.actions);
        findings.push(...found);
        const lines = await page.locator(LINE).count();
        if (story.wideOnly && lines !== (own.wide ? 1 : 0)) findings.push(`${name} ${label(story)}: ${lines} lines at ${own.wide ? 'a split' : 'a stacked'} width`);
        if (story.wideOnly && !own.wide) { if (ran.length) findings.push(`${name} ${label(story)}: ${ran.length} line actions ran while stacked`); }
        else if (story.optional && ran.length === story.actions.length - story.optional) skipped += 1;
        else if (ran.length !== story.actions.length) findings.push(`${name} ${label(story)}: ${ran.length} of ${story.actions.length} actions ran: ${ran.join(', ')}`);
        table.push(`${name} ${own.wide ? 'split' : 'stacked'} ${label(story)}: ${ran.length} actions, ${found.length || own.found.length ? 'fail' : 'pass'}`);
        await ctx.close();
      }
    }
    process.stdout.write(`${table.join('\n')}\n`);
    // SPLIT_LAYOUT_ONLY=<label> runs one size while a fault is found; it skips the counts.
    if (!process.env.SPLIT_LAYOUT_ONLY) assert.equal(table.length, (SIZES.length + DEVICES.length + DUO.length) * STORIES.length, 'a size or a device was not measured');
    if (!process.env.SPLIT_LAYOUT_ONLY) assert.ok(views.wide >= 15 && views.stacked >= 15, `too few sizes in a band: ${JSON.stringify(views)}`);
    // The scroll actions run wherever the 200% sheet is taller than its stage: all but the
    // largest windows.
    if (!process.env.SPLIT_LAYOUT_ONLY) assert.ok(skipped <= 2, `the scroll actions ran at only ${subjects.length - skipped} subjects`);
    assert.deepEqual(findings, []);

    // Fit shows the whole sheet, also in a window that leaves the stage a few pixels.
    const fits = async (setup) => {
      const { ctx, page } = await open(browser, server.port, vitals, { viewport: { width: 320, height: 200 } }, STORIES[0]);
      await setup?.(page);
      await page.evaluate(frames);
      const fit = await page.evaluate(() => {
        const stage = document.querySelector('.ui-split__stage');
        const sheet = document.querySelector('.ui-split__sheet').getBoundingClientRect();
        const css = getComputedStyle(stage);
        return { pressed: document.querySelector('.ui-split__tools [aria-pressed="true"]') !== null, sheet: sheet.height,
          room: stage.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom),
          scrolls: stage.scrollHeight > stage.clientHeight + 1 || stage.scrollWidth > stage.clientWidth + 1 };
      });
      await ctx.close();
      return fit;
    };
    const small = await fits();
    assert.ok(small.pressed, 'Fit is not on in the 320×200 window');
    assert.ok(small.sheet <= small.room + 1 && !small.scrolls, `at 320×200 Fit draws a ${small.sheet}px sheet in ${small.room}px of stage`);

    // The mutations: each check must see its own failure.
    const caught = [];
    const [review, unavailable, zoomed, retry, resizing] = STORIES;
    const mutate = async (context, story, setup, only, says) => {
      const { ctx, page } = await open(browser, server.port, vitals, context, story);
      await setup(page);
      const { found } = await walk(page, 'mutated', story.actions, { only });
      caught.push([says, found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    const inspected = async (context, setup, says) => {
      const { ctx, page } = await open(browser, server.port, vitals, context, review);
      await setup(page);
      caught.push([says, (await inspect(page, 'mutated')).found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    const wide = { viewport: { width: 1280, height: 800 } };
    const phone = { viewport: { width: 390, height: 844 } };
    // A first pane that does not follow its line.
    await mutate(wide, resizing, (page) => page.addStyleTag({ content: '.ui-split { grid-template-columns: 600px minmax(0, 1fr); }' }), ['key: ArrowRight on a line'], 'the line says');
    await inspected(wide, (page) => page.addStyleTag({ content: '.ui-split { grid-template-columns: 1fr 1fr; }' }), 'not 60%');
    await inspected(wide, (page) => page.addStyleTag({ content: '.ui-split { height: auto; }' }), 'not at the foot');
    await inspected(wide, (page) => page.addStyleTag({ content: '.ui-split { height: 120vh; }' }), 'scrolls');
    await inspected(phone, (page) => page.addStyleTag({ content: '.ui-split__preview { order: -1; } .ui-split { display: flex; flex-direction: column; }' }), 'below the content');
    await inspected(phone, (page) => page.addStyleTag({ content: '.ui-split__actions { position: static; }' }), 'action row stops');
    // The 10% floor that Fit had before #914's review.
    const floored = await fits((page) => page.addStyleTag({ content: '.ui-split__sheet { zoom: 0.1 !important; }' }));
    caught.push(['Fit floor', floored.sheet > floored.room + 1 || floored.scrolls]);
    // A stacked scroll that does not keep the action row's height clear.
    await mutate({ viewport: { width: 466, height: 678 } }, review, (page) => page.addStyleTag({ content: '.ui-split { scroll-padding-bottom: 0 !important; }' }), ['key: Tab from Invoices'], 'covers');
    // A step change that does not move the focus to the new title.
    const noTitle = (page) => page.evaluate(() => {
      const keep = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function focus(...args) { if (!this.matches('h1, h2')) keep.apply(this, args); };
    });
    await mutate(phone, review, noTitle, ['click: Continue to approval'], 'focus');
    await mutate(wide, unavailable, noTitle, ['click: Try again'], 'focus');
    // Stuck tools that give the title's ring no room above it, as before #914's second review.
    await mutate({ viewport: { width: 466, height: 678 } }, retry, (page) => page.addStyleTag({ content: '.ui-split .ui-split__controls { padding-top: 0; } .ui-split .ui-split__controls > h2 { padding-top: var(--space-4); }' }), ['key: Enter on Try again at the foot'], 'is cut');
    // A zoom step at its end that keeps the focus the browser dropped.
    await mutate(wide, review, (page) => page.evaluate(() => {
      const keep = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function focus(...args) { if (this.getAttribute('aria-label') !== 'Zoom in') keep.apply(this, args); };
    }), ['click: Zoom out to its end'], 'Zoom out to its end');
    await mutate(wide, zoomed, (page) => page.evaluate(() => document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.activeElement.blur(); })), ['key: Tab into the page', 'key: Escape'], 'Escape moved the focus');
    await mutate(phone, review, (page) => page.evaluate(() => document.addEventListener('keydown', () => {
      document.querySelector('.ui-split__actions').style.translate = '0 4px';
    })), ['key: Enter on Zoom in'], 'moved');
    await mutate(wide, review, (page) => page.evaluate(() => { const block = document.createElement('div'); block.style.width = '3000px'; block.style.height = '1px'; document.body.append(block); }), ['key: Enter on Zoom in'], 'sideways');
    // A block that pushes the page down with no input, as a late banner would.
    await mutate(wide, review, async (page) => {
      await page.evaluate(() => { const block = document.createElement('div'); block.style.height = '400px'; document.querySelector('.ui-split').before(block); });
      await page.evaluate(frames);
    }, ['key: Enter on Zoom in'], 'layout shift');
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this walk cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
