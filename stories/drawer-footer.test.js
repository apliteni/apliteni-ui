/* Rule: in a short drawer the footer stands directly under the last group, next to the form
 * its Save saves. In a long drawer the body scrolls and the footer stays at the panel's end,
 * outside the scroll. Each key, click and send in the drawer keeps the focus in the panel,
 * moves the footer by at most 1px when the body does not change its height, keeps the
 * cumulative layout shift under 0.1 and causes no sideways scroll. Escape closes the drawer.
 *
 * Off unless DRAWER_FOOTER=1: Playwright and web-vitals are not dependencies of this
 * package, CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js DRAWER_FOOTER=1 \
 *     node --test stories/drawer-footer.test.js
 *
 * It opens react-drawer--playground (one field and a footer) and react-drawer--long-form (20
 * fields and a footer) in a new context at each of ten window sizes and on six devices: the
 * Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's list, and a two-screen
 * phone of 466×678 and 890×626 at scale 3 with touch. Each drawer opens with the focus on its
 * first field. The short story walks a typed note, Tab to Cancel and Save, Shift+Tab, a click on
 * the field and Escape. The long story walks Tab through the fields to the last one, so the
 * body scrolls, a typed note, Tab to Save and Escape. A walk that cannot reach a control or
 * close the drawer stops with Playwright's timeout. Escape is the walk's last step, so the
 * focus after it is not read.
 *
 * Its limits: one engine, the light theme and the default accent. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input. The source half
 * is in react/src/Drawer.test.tsx and reads the cascade on every side and size; this half
 * measures the right-hand md drawer that the stories open.
 * why: docs/components.md#drawer
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

// The drawer's state: where the footer stands against the last group and the panel, the
// focus, the layout shift so far and the page's sideways overflow.
const READ = () => {
  const panel = document.querySelector('.ui-drawer.is-open .ui-drawer__panel');
  const doc = document.scrollingElement;
  const base = { cls: window.__cls, over: doc.scrollWidth - doc.clientWidth, open: Boolean(panel) };
  if (!panel) return base;
  const body = panel.querySelector('.ui-drawer__body');
  const foot = panel.querySelector('.ui-drawer__footer');
  const last = body.lastElementChild.getBoundingClientRect();
  const b = body.getBoundingClientRect();
  const f = foot.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  const el = document.activeElement;
  return {
    ...base,
    focus: panel.contains(el) && el.checkVisibility() ? (el.getAttribute('aria-label') || el.id || el.textContent.trim().slice(0, 40)) : null,
    scrolls: body.scrollHeight > body.clientHeight + 1,
    // The space from the last group to the footer when the body is scrolled to its end.
    gap: f.top - (last.bottom - (body.scrollHeight - body.clientHeight - body.scrollTop)),
    pad: parseFloat(getComputedStyle(body).paddingBottom),
    outside: f.top >= b.bottom - 1,
    footTop: f.top, footLeft: f.left, panelBottom: p.bottom, footBottom: f.bottom, bodyHeight: b.height,
  };
};
const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));

const focused = (page, name) => page.locator(':focus').and(name).waitFor();
const typed = (page, text) => page.waitForFunction((t) => document.activeElement?.value === t, text);
const closed = (page) => page.locator('.ui-drawer').waitFor({ state: 'detached' });
const save = (page) => page.getByRole('button', { name: 'Save' });
const cancel = (page) => page.getByRole('button', { name: 'Cancel' });
// The drawer opens with the focus on its first field.
const SHORT = [
  ['send: note', async (page) => { await page.keyboard.type('Refund, duplicate charge'); await typed(page, 'Refund, duplicate charge'); }],
  ['key: Tab', async (page) => { await page.keyboard.press('Tab'); await focused(page, cancel(page)); }],
  ['key: Tab to Save', async (page) => { await page.keyboard.press('Tab'); await focused(page, save(page)); }],
  ['key: Shift+Tab', async (page) => { await page.keyboard.press('Shift+Tab'); await focused(page, cancel(page)); }],
  ['click: Note', async (page) => { await page.getByLabel('Note').click(); await focused(page, page.getByLabel('Note')); }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); await closed(page); }],
];
const LONG = [
  ['key: Tab', async (page) => { await page.keyboard.press('Tab'); await focused(page, page.getByLabel('Legal name')); }],
  ['key: Tab to the last field', async (page) => {
    for (let i = 0; i < 18; i += 1) await page.keyboard.press('Tab');
    await focused(page, page.getByLabel('Note'));
  }],
  ['send: note', async (page) => { await page.keyboard.type('Team licences'); await typed(page, 'Team licences'); }],
  ['key: Tab to Save', async (page) => { await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await focused(page, save(page)); }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); await closed(page); }],
];
const STORIES = [
  { id: 'react-drawer--playground', actions: SHORT, long: false },
  { id: 'react-drawer--long-form', actions: LONG, long: true },
];

async function open(browser, port, vitals, context, story) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, story);
  await page.locator('.ui-drawer.is-open .ui-drawer__panel').waitFor();
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  return { ctx, page };
}

// Where the footer stands, before any action.
function place(s, story, label) {
  const found = [];
  if (!s.outside) found.push(`${label}: the footer is inside the scrolling body`);
  if (story.long) {
    if (!s.scrolls) found.push(`${label}: the long body does not scroll`);
    if (Math.abs(s.footBottom - s.panelBottom) > 1) found.push(`${label}: the long footer ends ${Math.round(s.panelBottom - s.footBottom)}px above the panel's end`);
  } else {
    if (s.scrolls) found.push(`${label}: the short body scrolls`);
    if (Math.abs(s.gap - s.pad) > 1) found.push(`${label}: the footer is ${Math.round(s.gap)}px under the last group, not ${s.pad}px`);
  }
  return found;
}

async function walk(page, label, story, { only } = {}) {
  const found = [];
  const ran = [];
  await page.evaluate(frames);
  let before = await page.evaluate(READ);
  found.push(...place(before, story, label));
  for (const [name, run] of story.actions.filter(([n]) => !only || only.includes(n))) {
    await run(page);
    await page.evaluate(frames);
    const after = await page.evaluate(READ);
    ran.push(name);
    if (name === 'key: Escape') {
      if (after.open) found.push(`${label} ${name}: the drawer stays open`);
    } else {
      if (!after.focus) found.push(`${label} ${name}: the focus left the drawer`);
      found.push(...place(after, story, `${label} ${name}`));
      // The footer holds still while the body keeps its height, also while the long body scrolls.
      const moved = Math.max(Math.abs(after.footTop - before.footTop), Math.abs(after.footLeft - before.footLeft));
      if (Math.abs(after.bodyHeight - before.bodyHeight) <= 1 && moved > 1) found.push(`${label} ${name}: the footer moved ${Math.round(moved)}px`);
    }
    if (!(after.cls < 0.1)) found.push(`${label} ${name}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${label} ${name}: the page scrolls ${after.over}px sideways`);
    before = after;
  }
  return { found, ran };
}

test('a drawer footer follows a short body, stays out of a long one, and holds through each interaction', {
  skip: process.env.DRAWER_FOOTER !== '1' && 'set DRAWER_FOOTER=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'DRAWER_FOOTER=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const ids = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  for (const story of STORIES) assert.ok(ids.includes(story.id), `the Storybook build has no ${story.id}`);

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
      for (const story of STORIES) {
        const { ctx, page } = await open(browser, server.port, vitals, context, story.id);
        const width = await page.evaluate(() => innerWidth);
        const { found, ran } = await walk(page, `${label} ${story.id}`, story);
        findings.push(...found);
        assert.equal(ran.length, story.actions.length, `${label} ${story.id}: ${ran.length} of ${story.actions.length} actions ran`);
        table.push(`${label} ${width}px ${story.id.replace('react-drawer--', '')}: ${ran.length} actions, ${found.length ? 'fail' : 'pass'}`);
        await ctx.close();
      }
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, (SIZES.length + DEVICES.length + DUO.length) * STORIES.length, 'a size or a device was not measured');
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    const [short, long] = STORIES;
    const phone = { viewport: { width: 390, height: 844 } };
    const mutate = async (story, setup, only, says) => {
      const { ctx, page } = await open(browser, server.port, vitals, phone, story.id);
      await setup(page);
      const { found } = await walk(page, 'mutated', story, { only });
      caught.push([says, found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    // The body before #887: it fills the panel, and Save stands at the far end.
    await mutate(short, (page) => page.addStyleTag({ content: '.ui-drawer__body { flex-grow: 1; }' }), [], 'under the last group');
    // The footer inside the scroll: the panel scrolls, not the body.
    await mutate(long, (page) => page.addStyleTag({ content: '.ui-drawer__panel { overflow-y: auto; } .ui-drawer__body { flex: none; overflow: visible; }' }), [], 'long body does not scroll');
    await mutate(long, (page) => page.addStyleTag({ content: '.ui-drawer__panel { overflow-y: auto; } .ui-drawer__body { flex: none; overflow: visible; }' }), ['key: Tab', 'key: Tab to the last field'], 'footer moved');
    await mutate(short, (page) => page.evaluate(() => document.addEventListener('keydown', () => setTimeout(() => document.activeElement.blur()), true)), ['key: Tab'], 'focus left');
    await mutate(short, (page) => page.addStyleTag({ content: '#storybook-root { min-width: 200vw; }' }), ['key: Tab'], 'sideways');
    await mutate(short, async (page) => {
      // A panel that drops with no input, as a late banner above it would push it.
      await page.evaluate(() => { document.querySelector('.ui-drawer__panel').style.top = '300px'; });
      await page.evaluate(frames);
    }, ['key: Tab'], 'layout shift');
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this walk cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
