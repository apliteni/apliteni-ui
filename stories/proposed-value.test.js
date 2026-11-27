/* Rule: a proposed value's check sets the value and opens no menu, and its dismiss mark sets
 * the field to None. After each act the focus stays on the field, the value's first letter
 * moves at most 1px, the cumulative layout shift stays under 0.1 and the page does not scroll
 * sideways. Escape closes the menu that Enter opens. No scrolling box cuts the focused control
 * or its ring, and each row of an open menu keeps its words on one line.
 *
 * Off unless PROPOSED_VALUE=1: Playwright and web-vitals are not dependencies of this
 * package, CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js PROPOSED_VALUE=1 \
 *     node --test stories/proposed-value.test.js
 *
 * It opens react-proposed-value--form-row, react-proposed-value--table-cell and
 * react-proposed-value--ghost-check, with the form walk and then the table walk, in a new
 * context at each of ten window sizes and on six devices: the Galaxy Z Fold 7 and Flip 7 and
 * their cover screens from Playwright's list, and a two-screen phone of 466×678 and 890×626 at
 * scale 3 with touch. The form walk clicks the Category check, then Enter and Escape on the
 * trigger. The table walk tabs to the check of one row, clicks its dismiss mark, then Enter and
 * Escape, Tab to the check of a later row and Enter on it. A walk that cannot reach a control
 * stops with Playwright's timeout.
 *
 * Its limits: one engine, the light theme and the default accent. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input. The fixed elements
 * are the acted value's first letter and, in the table, the last row. A neighbour field in a
 * wrapping form row may move when the acted field changes its width. The source half is in
 * react/src/ProposedValue.test.tsx. why: docs/components.md#proposed-value
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

// The state after an act: the focus, the open menu, the fixed elements, the layout shift so
// far and the page's sideways overflow. `host` finds the acted field.
const READ = (host) => {
  const doc = document.scrollingElement;
  const field = document.evaluate(host, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  const text = field?.querySelector('.ui-proposed__text, .ui-dropdown__value');
  const el = document.activeElement;
  const rows = document.querySelectorAll('tbody tr');
  return {
    cls: window.__cls,
    over: doc.scrollWidth - doc.clientWidth,
    focus: field?.contains(el) && el.checkVisibility() ? (el.getAttribute('aria-label') || el.textContent.trim()) : null,
    menu: Boolean(document.querySelector('[data-dropdown-trigger][aria-expanded="true"]')),
    // Page and box coordinates, so a scroll that brings the focus into view is not a move.
    letter: text ? text.getBoundingClientRect().left + scrollX + (() => {
      let scrolled = 0;
      for (let up = text.parentElement; up && up !== document.scrollingElement; up = up.parentElement) scrolled += up.scrollLeft;
      return scrolled;
    })() : null,
    word: text?.textContent.trim() ?? null,
    last: rows.length ? rows[rows.length - 1].getBoundingClientRect().top + scrollY : null,
    // The focused control's part, with its ring, that a scrolling box around it cuts, in px.
    cut: (() => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const ring = style.outlineStyle === 'none' ? 0 : parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      let most = 0;
      for (let up = el.parentElement; up; up = up.parentElement) {
        if (getComputedStyle(up).overflowX === 'visible') continue;
        const frame = up.getBoundingClientRect();
        const left = frame.left + up.clientLeft;
        most = Math.max(most, left - (box.left - ring), box.right + ring - (left + up.clientWidth));
      }
      return Math.round(most);
    })(),
    // The open menu's rows whose words break onto a second line.
    broken: [...document.querySelectorAll('.ui-dropdown.open [role="option"]')].filter((row) => {
      const words = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let node = words.nextNode(); node; node = words.nextNode()) {
        range.selectNodeContents(node);
        if (new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1) return true;
      }
      return false;
    }).map((row) => row.textContent.trim()),
  };
};
const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));

const focused = (page, name) => page.locator(':focus').and(name).waitFor();
const trigger = (page, name) => page.getByRole('combobox', { name }).or(page.getByRole('button', { name }));
const FORM_FIELD = '//*[contains(concat(" ", @class, " "), " ui-field ")][.//label[normalize-space()="Category"]]';
const ROW = (payee) => `//tr[.//*[normalize-space()="${payee}"]]`;

// Each act: its name, the field it acts on, what it does, and what the field must show after it.
const FORM = [
  ['click: Apply Groceries', FORM_FIELD, async (page) => {
    await page.getByRole('button', { name: 'Apply Groceries' }).click();
    await focused(page, trigger(page, /Category/));
  }, { word: 'Groceries', menu: false, reach: 'Apply Groceries' }],
  ['key: Enter', FORM_FIELD, async (page) => {
    await page.keyboard.press('Enter');
    await page.locator('[data-dropdown-trigger][aria-expanded="true"]').waitFor();
  }, { menu: true }],
  ['key: Escape', FORM_FIELD, async (page) => {
    await page.keyboard.press('Escape');
    await page.locator('[data-dropdown-trigger][aria-expanded="true"]').waitFor({ state: 'detached' });
    await focused(page, trigger(page, /Category/));
  }, { word: 'Groceries', menu: false }],
];
const TABLE = [
  ['key: Tab to Apply Utilities', ROW('Luz del Sur'), async (page) => {
    const apply = page.getByRole('button', { name: 'Apply Utilities' });
    for (let i = 0; i < 6 && !(await apply.evaluate((b) => b === document.activeElement)); i += 1) await page.keyboard.press('Tab');
    await focused(page, apply);
  }, { word: 'Utilities', menu: false }],
  ['click: Dismiss Utilities', ROW('Luz del Sur'), async (page) => {
    await page.getByRole('button', { name: 'Dismiss Utilities' }).click();
    await focused(page, trigger(page, /Category for Luz del Sur/));
  }, { word: 'None', menu: false, reach: 'Dismiss Utilities' }],
  ['key: Enter', ROW('Luz del Sur'), async (page) => {
    await page.keyboard.press('Enter');
    await page.locator('[data-dropdown-trigger][aria-expanded="true"]').waitFor();
  }, { menu: true }],
  ['key: Escape', ROW('Luz del Sur'), async (page) => {
    await page.keyboard.press('Escape');
    await page.locator('[data-dropdown-trigger][aria-expanded="true"]').waitFor({ state: 'detached' });
    await focused(page, trigger(page, /Category for Luz del Sur/));
  }, { word: 'None', menu: false }],
  ['key: Tab to Apply Dining', ROW('Café Nilo'), async (page) => {
    const apply = page.getByRole('button', { name: 'Apply Dining' });
    for (let i = 0; i < 6 && !(await apply.evaluate((b) => b === document.activeElement)); i += 1) await page.keyboard.press('Tab');
    await focused(page, apply);
  }, { word: 'Dining', menu: false }],
  ['key: Enter on Apply', ROW('Café Nilo'), async (page) => {
    await page.keyboard.press('Enter');
    await focused(page, trigger(page, /Category for Café Nilo/));
  }, { word: 'Dining', menu: false }],
];
const STORIES = [
  { id: 'react-proposed-value--form-row', actions: FORM },
  { id: 'react-proposed-value--table-cell', actions: TABLE },
  // The check with no outline, rev_604d2230cca9/d59. One story holds a table and then a form.
  { id: 'react-proposed-value--ghost-check', actions: FORM },
  { id: 'react-proposed-value--ghost-check', actions: TABLE },
];

async function open(browser, port, vitals, context, story) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, story);
  await page.locator('.ui-proposed').first().waitFor();
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  return { ctx, page };
}

async function walk(page, label, story, { only } = {}) {
  const found = [];
  const ran = [];
  await page.evaluate(frames);
  for (const [name, host, run, expect] of story.actions.filter(([n]) => !only || only.includes(n))) {
    // A click reaches its control first: in a table that scrolls across in its card, Playwright
    // scrolls the card to the control, and that scroll is not the act's.
    if (expect.reach) await page.getByRole('button', { name: expect.reach }).scrollIntoViewIfNeeded();
    const before = await page.evaluate(READ, host);
    await run(page);
    await page.evaluate(frames);
    const after = await page.evaluate(READ, host);
    ran.push(name);
    const at = `${label} ${name}`;
    if (!after.focus) found.push(`${at}: the focus left the field`);
    if (after.menu !== expect.menu) found.push(`${at}: the menu is ${after.menu ? 'open' : 'shut'}`);
    if (expect.word && after.word !== expect.word) found.push(`${at}: the field shows “${after.word}”, not “${expect.word}”`);
    // The value's first letter holds still through each act, and in a table so does the last row.
    if (!after.menu && before.letter !== null && Math.abs(after.letter - before.letter) > 1) found.push(`${at}: the value moved ${Math.round(after.letter - before.letter)}px`);
    if (after.last !== null && Math.abs(after.last - before.last) > 1) found.push(`${at}: the last row moved ${Math.round(after.last - before.last)}px`);
    if (!(after.cls < 0.1)) found.push(`${at}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${at}: the page scrolls ${after.over}px sideways`);
    if (after.cut > 1) found.push(`${at}: a scrolling box cuts ${after.cut}px of the focused control`);
    if (after.broken.length) found.push(`${at}: the menu row breaks: ${after.broken.join(', ')}`);
  }
  return { found, ran };
}

test('a proposed value applies and dismisses with no menu, and holds the focus and the layout at every size', {
  skip: process.env.PROPOSED_VALUE !== '1' && 'set PROPOSED_VALUE=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'PROPOSED_VALUE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
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
        table.push(`${label} ${width}px ${story.id.replace('react-proposed-value--', '')}: ${ran.length} actions, ${found.length ? 'fail' : 'pass'}`);
        await ctx.close();
      }
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, (SIZES.length + DEVICES.length + DUO.length) * STORIES.length, 'a size or a device was not measured');
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    const [form, cell] = STORIES;
    const phone = { viewport: { width: 390, height: 844 } };
    const mutate = async (story, setup, only, says, context = phone) => {
      const { ctx, page } = await open(browser, server.port, vitals, context, story.id);
      page.setDefaultTimeout(3000);
      await setup(page);
      const { found } = await walk(page, 'mutated', story, { only }).catch((error) => ({ found: [String(error)] }));
      caught.push([says, found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    // A check that opens the menu after it sets the value.
    await mutate(form, (page) => page.evaluate(() => document.addEventListener('click', (e) => {
      if (!e.target.closest('[aria-label^="Apply"]')) return;
      const field = [...document.querySelectorAll('.ui-field')].find((f) => f.textContent.includes('Category'));
      setTimeout(() => field.querySelector('[data-dropdown-trigger]').click(), 0);
    }, true)), ['click: Apply Groceries'], 'menu is open');
    // A ghost trigger that does not hang to the column edge moves the value's first letter.
    await mutate(cell, (page) => page.addStyleTag({ content: '.ui-table td > .ui-dropdown:first-child { margin-inline-start: 0 !important; }' }), ['click: Dismiss Utilities'], 'value moved');
    // Focus that never reaches the trigger stops the walk's wait, whose message names :focus.
    await mutate(cell, (page) => page.evaluate(() => document.addEventListener('focusin', (e) => {
      if (e.target.matches('[data-dropdown-trigger]')) setTimeout(() => e.target.blur(), 0);
    }, true)), ['click: Dismiss Utilities'], 'focus');
    await mutate(cell, (page) => page.addStyleTag({ content: '.ui-table td > .ui-dropdown { display: block; padding-block: 40px; }' }), ['click: Dismiss Utilities'], 'last row moved');
    await mutate(form, (page) => page.addStyleTag({ content: '#storybook-root { min-width: 200vw; }' }), ['click: Apply Groceries'], 'sideways');
    await mutate(form, async (page) => {
      // A card that drops with no input, as a late banner above it would push it.
      await page.evaluate(() => { document.querySelector('.ui-card').style.marginTop = '300px'; });
      await page.evaluate(frames);
    }, ['click: Apply Groceries'], 'layout shift');
    // A form menu as narrow as its ghost trigger breaks the chosen row.
    await mutate(form, (page) => page.addStyleTag({ content: '.ui-field > .ui-dropdown > .ui-dropdown__panel { inline-size: 100% !important; min-inline-size: 0 !important; }' }),
      ['click: Apply Groceries', 'key: Enter'], 'menu row breaks');
    // A card that does not bring the focused check into view leaves it cut at 360px.
    await mutate(cell, (page) => page.evaluate(() => { Element.prototype.scrollIntoView = () => {}; }),
      ['key: Tab to Apply Utilities'], 'cuts', { viewport: { width: 360, height: 800 } });
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this walk cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
