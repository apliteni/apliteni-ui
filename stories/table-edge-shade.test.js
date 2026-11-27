/* Rule: a table scroll frame draws no shade on its edges, and a pinned column casts none
 * on the columns that scroll under it (#770). On a phone no column is pinned. The scroller's own border and the pinned
 * column's divider are the only lines left. docs/components.md states it.
 *
 * Two halves:
 *  - The source half (always on) reads src/styles/table.css and refuses any paint that
 *    was the shade: the `--table-edge` colour, a pseudo-element on the scroll frame, a
 *    gradient on the frame, and a box-shadow anywhere in the sheet. It reads the source,
 *    so it cannot see a shade that another sheet paints on the frame.
 *  - The browser half is OFF unless EDGE_SHADE=1. It measures a phone table's
 *    containment at 390x844 (#736) in the built Storybook, so run
 *    `npm run build-storybook` first:
 *
 *   UI_PLAYWRIGHT=… UI_CHROME=… EDGE_SHADE=1 node --test stories/table-edge-shade.test.js
 *
 *    UI_CHROME is optional. It points at a Chrome build when Playwright has none.
 *
 * CI runs the source half only. Report the browser half's output in the pull request.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSelectorList } from '../scripts/lib/selector-list.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = readFileSync(path.join(root, 'src/styles/table.css'), 'utf8');

/** What in one table sheet is a scroll shade, as lines. */
function shadeFindings(css) {
  const out = [];
  if (/--table-edge\b/.test(css)) out.push('the sheet names --table-edge, the colour the scroll shade was drawn in');
  const leaves = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(([, selector, decl]) => ({ selectors: splitSelectorList(selector.trim()), decl }));
  for (const { selectors, decl } of leaves) {
    for (const sel of selectors) {
      if (/\.ui-table-scroll(?::[\w-]+)*::(?:before|after)\b/.test(sel)) out.push(`${sel} puts a pseudo-element on the scroll frame`);
      if (/\.ui-table-scroll(?::[\w-]+)*$/.test(sel) && /gradient\(/.test(decl)) out.push(`${sel} paints a gradient on the scroll frame`);
    }
    if (/box-shadow\s*:/.test(decl)) out.push(`${selectors.join(', ')} casts a box-shadow`);
  }
  return out;
}

test('the table sheet draws no scroll shade', () => {
  assert.deepEqual(shadeFindings(SOURCE), [], 'src/styles/table.css paints a scroll shade again; #770 removed it');
});

test('the gate refuses each part of the old shade', () => {
  // The shade as #736 shipped it, cut down to one declaration of each kind.
  const shade = `
.ui-table-scroll { --table-edge: color-mix(in srgb, var(--sheen) 12%, transparent); }
.ui-table-scroll { background: radial-gradient(farthest-side at 0 50%, red, transparent); }
@container scroll-state(scrollable: right) {
  .ui-table-scroll::after { background: linear-gradient(to left, red, transparent); }
}
.ui-table--pinned .ui-table__identity { box-shadow: 4px 0 4px red; }
`;
  assert.deepEqual(shadeFindings(`${SOURCE}\n${shade}`), [
    'the sheet names --table-edge, the colour the scroll shade was drawn in',
    '.ui-table-scroll paints a gradient on the scroll frame',
    '.ui-table-scroll::after puts a pseudo-element on the scroll frame',
    '.ui-table--pinned .ui-table__identity casts a box-shadow',
  ]);
});

test('this gate rejects a card ground read from a transparent card', () => {
  // The mutation: read the card's own background. The light card is transparent
  // (#850), so its background reads rgba(0,0,0,0) — black — while the page ground
  // shows through. The rig must walk up to the nearest ancestor that paints.
  const rig = readFileSync(path.join(root, 'stories/lib/table-edge-shade.js'), 'utf8');
  const direct = rig.replace(/\bground:\s*painted\(f\.parentElement\)/, 'ground: rgb(getComputedStyle(f.parentElement).backgroundColor)');
  assert.notEqual(direct, rig, 'The mutation did not apply, so it proves nothing.');
  assert.ok(
    !/\bground:\s*painted\(f\.parentElement\)/.test(direct),
    'The ground still resolves through the ancestor walk, so the check above would pass '
    + 'over a transparent light card measured as black.',
  );
});

test('this gate rejects a frame that keeps its focus stop when nothing scrolls', () => {
  // The mutation: #845 reversed — `tabIndex: 0` always, so at desktop width a table
  // that fits still takes keyboard focus. The gate asserts no focus stop while
  // nothing scrolls, so the tabindex must be gated on overflow.
  const rig = readFileSync(path.join(root, 'react/src/DataTable.tsx'), 'utf8');
  const always = rig.replace(/\btabIndex:\s*overflows\s*\?\s*0\s*:\s*undefined\b/, 'tabIndex: 0');
  assert.notEqual(always, rig, 'The mutation did not apply, so it proves nothing.');
  assert.ok(
    !/\btabIndex:\s*overflows\s*\?\s*0\s*:\s*undefined\b/.test(always),
    'The frame still gates its tab stop on overflow, so the no-focus-stop assertion would pass '
    + 'over a frame that keeps its stop when nothing scrolls.',
  );
});

const RUN_BROWSER = process.env.EDGE_SHADE === '1';
const THEMES = ['light', 'dark'];

/* A phone table never widens the page (#736): at 390x844, in both themes, every
 * DataTable story with a scroll frame keeps the page inside the screen and scrolls
 * the table inside its frame, with no range past the table's end. Only the payouts and
 * members stories must have a range: a narrower table may fit its frame. It reads the built Storybook, so run
 * `npm run build-storybook` first. Limits: only stories whose ids start with
 * `react-datatable`, and only those the walk finds a frame in. The payouts story
 * must be one of them. The members story must be one too. Before #770 its "Actions" label
 * widened the page under a header that does not stick, and its closed tooltips made the
 * frame scroll past the table. Each defect is put back there to prove the check sees it.
 * No cell stays in place while a frame scrolls to its end: a phone pins no column
 * (rev_1982326c19de/d88). The pin is put back on the payouts story to prove it.
 *
 * The members story also holds the card frame (#782), at 390 and 1440 wide: at 390 the
 * table overflows, so the frame is a keyboard stop and its ring shows on all four sides
 * with its rounded corners whole; at 1440 the table fits, so the frame is not a stop
 * (#845) and the gate measures the ground at rest and asserts no focus stop while
 * nothing scrolls. At rest its side bands show no line, and the table reaches its
 * bottom. Limits: only the first frame in a card on that one story. */
const PHONE = { width: 390, height: 844 };
const PAYOUTS_STORY = 'react-datatable-ledgers--finance-data';
const MEMBERS_STORY = 'react-datatable-members--default';
const DESKTOP = { width: 1440, height: 900 };

test('measured in a browser: a phone table scrolls inside its frame', { skip: !RUN_BROWSER && 'set EDGE_SHADE=1' }, async (t) => {
  const { existsSync } = await import('node:fs');
  const { playwright, serve, indexed, openStory, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const {
    PHONE_FIT, phoneFitFindings, FRAME_UNCLIPPED, FRAME_FLOORLESS, LABEL_ESCAPES, CLOSED_TIP_BOX, PIN_ON_PHONE,
    decodePNG, CARD_FRAME, cardFrameFindings, FRAME_BANDLESS, FRAME_TOPLESS, FRAME_EDGE_LINE, FRAME_GAP_BELOW,
  } = await import('./lib/table-edge-shade.js');
  const shot = async (page) => decodePNG(await page.screenshot({ fullPage: true, animations: 'disabled' }));
  // `expectStop` is true where the table overflows and the frame is a keyboard stop
  // (#845): at 390 the members table has a range, so its ring is measured; at 1440 the
  // table fits, so the frame must not take focus, and the gate measures the ground at rest.
  const checkCardFrame = async (page, label, expectStop) => {
    for (const focus of [true, false]) {
      const frame = await page.evaluate(CARD_FRAME, focus);
      assert.ok(frame, `${label}: no table frame in a card`);
      if (focus) {
        assert.equal(frame.focused, expectStop, expectStop
          ? `${label}: the frame did not take a keyboard focus`
          : `${label}: the frame kept a focus stop while nothing scrolls`);
        if (!expectStop) assert.equal(frame.range, 0, `${label}: the table still scrolls, so a focus stop was expected`);
      }
      assert.deepEqual(cardFrameFindings(await shot(page), frame), [], `${label} ${focus ? 'focused' : 'at rest'}`);
    }
    const mutations = [
      ...(expectStop ? [['a frame without bands', FRAME_BANDLESS, true], ['a frame without a top band', FRAME_TOPLESS, true]] : []),
      ['an edge line at rest', FRAME_EDGE_LINE, false],
      ['a band below the table', FRAME_GAP_BELOW, false],
    ];
    for (const [what, mutation, focus] of mutations) {
      const style = await page.addStyleTag({ content: mutation });
      const frame = await page.evaluate(CARD_FRAME, focus);
      assert.notDeepEqual(cardFrameFindings(await shot(page), frame), [], `${label}: ${what} still passed`);
      await style.evaluate((node) => node.remove());
    }
  };

  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const pw = await playwright();
  assert.ok(pw, 'EDGE_SHADE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME || undefined, args: ['--no-sandbox'] });
  const server = await serve(build, path.join(build, 'iframe.html'));

  try {
    const stories = indexed(build).filter((s) => s.id.startsWith('react-datatable'));
    for (const id of [PAYOUTS_STORY, MEMBERS_STORY]) assert.ok(stories.some((s) => s.id === id), `${id} is not in the build`);
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: PHONE });
      const page = await ctx.newPage();
      const measured = [];
      for (const story of stories) {
        const got = await openStory(page, story, { port: server.port, theme });
        assert.equal(got.phase, STORY_DONE, `${story.label} ${theme}: ${got.phase}`);
        await page.evaluate(() => document.fonts.ready);
        const fit = await page.evaluate(PHONE_FIT);
        const mustScroll = [PAYOUTS_STORY, MEMBERS_STORY].includes(story.id);
        if (!fit.frames.length && !mustScroll) continue;
        measured.push(story.id);
        t.diagnostic(`${theme} ${story.id}: ${JSON.stringify(fit)}`);
        assert.deepEqual(phoneFitFindings(fit, mustScroll), [], `${story.label} ${theme}`);
        if (story.id === PAYOUTS_STORY) {
          for (const [what, mutation] of [['an unclipped frame', FRAME_UNCLIPPED], ['a frame without a zero floor', FRAME_FLOORLESS], ['a pinned column', PIN_ON_PHONE]]) {
            const style = await page.addStyleTag({ content: mutation });
            assert.notDeepEqual(phoneFitFindings(await page.evaluate(PHONE_FIT), true), [], `${theme}: ${what} still passed`);
            await style.evaluate((node) => node.remove());
          }
        }
        if (story.id === MEMBERS_STORY) {
          for (const [what, mutation] of [['an escaped label', LABEL_ESCAPES], ['a closed tooltip box', CLOSED_TIP_BOX]]) {
            const style = await page.addStyleTag({ content: mutation });
            const broken = await page.evaluate(PHONE_FIT);
            t.diagnostic(`${theme} ${what}: ${JSON.stringify(broken)}`);
            assert.notDeepEqual(phoneFitFindings(broken, true), [], `${theme}: ${what} still passed`);
            await style.evaluate((node) => node.remove());
          }
          await checkCardFrame(page, `${theme} ${PHONE.width}`, true);
        }
      }
      // The payouts, the pinned payments, the pinned sortable table and the members.
      assert.ok(measured.length >= 4, `${theme}: only ${measured.length} stories measured: ${measured.join(', ')}`);
      await ctx.close();
      const wide = await browser.newContext({ viewport: DESKTOP });
      const page2 = await wide.newPage();
      const got = await openStory(page2, stories.find((s) => s.id === MEMBERS_STORY), { port: server.port, theme });
      assert.equal(got.phase, STORY_DONE, `members ${theme} ${DESKTOP.width}: ${got.phase}`);
      await page2.evaluate(() => document.fonts.ready);
      await checkCardFrame(page2, `${theme} ${DESKTOP.width}`, false);
      await wide.close();
    }
  } finally {
    await browser.close();
    server.proc.kill();
  }
});

/* A pinned table scrolled by the keyboard, at the ten window sizes and on six devices, in
 * light and dark: the Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's
 * list, and a two-screen phone of 466×678 and 890×626 at scale 3 with touch. Each story
 * focuses its first frame and presses ArrowRight until the frame stops moving. After each
 * key the focus stays in the frame, no fixed element moves by more than 1px, web-vitals'
 * onCLS stays below 0.1, and the page does not scroll sideways. At the end, at 560px and
 * below, the first cell of each row moved by the whole scroll: no column is pinned
 * (rev_1982326c19de/d88). Above 560px the pinned cell did not move. Nothing opens, so there
 * is nothing for Escape to close. It needs web-vitals: set UI_WEB_VITALS to
 * web-vitals/dist/web-vitals.iife.js. Limits: one engine, the default accent, and the two
 * stories that pin a column with and without a selection column. */
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];
const KEYED = [PAYOUTS_STORY, 'components-finance-composition--pinned-selection'];

const KEY_READ = () => {
  const f = document.querySelector('.ui-table-scroll');
  const doc = document.scrollingElement;
  const first = [...f.querySelectorAll('tbody tr > :first-child')].map((c) => c.getBoundingClientRect().left);
  return {
    cls: window.__cls,
    over: doc.scrollWidth - doc.clientWidth,
    focus: f.contains(document.activeElement),
    scroll: f.scrollLeft,
    range: f.scrollWidth - f.clientWidth,
    first,
    fixed: [...document.querySelectorAll('body *')].filter((el) => getComputedStyle(el).position === 'fixed')
      .map((el) => { const b = el.getBoundingClientRect(); return [b.left, b.top]; }),
  };
};

/** What is wrong after one key, as lines. */
const keyFindings = (was, now, label) => [
  ...(now.focus ? [] : [`${label}: the focus left the frame`]),
  ...(now.over > 0 ? [`${label}: the page scrolls ${now.over}px sideways`] : []),
  ...(now.cls >= 0.1 ? [`${label}: the layout shift is ${now.cls}`] : []),
  ...now.fixed.filter((b, i) => was.fixed[i] && Math.max(Math.abs(b[0] - was.fixed[i][0]), Math.abs(b[1] - was.fixed[i][1])) > 1)
    .map(() => `${label}: a fixed element moved`),
];

/** What is wrong with the first column after the frame scrolled, as lines. */
const pinFindings = (start, end, width, label) => {
  if (end.scroll === 0) return [];
  const phone = width <= 560;
  const off = start.first.filter((x, i) => (phone ? Math.abs(x - end.first[i] - end.scroll) > 1 : Math.abs(x - end.first[i]) > 1));
  return off.length ? [`${label}: ${off.length} first cells ${phone ? 'stayed in place on a phone' : 'scrolled away above the phone step'}`] : [];
};

test('measured in a browser: a pinned table scrolled by the keyboard at ten sizes and six devices', { skip: !RUN_BROWSER && 'set EDGE_SHADE=1' }, async (t) => {
  const { existsSync } = await import('node:fs');
  const { env } = process;
  const { playwright, serve, openStory, STORY_DONE } = await import('./lib/dropdown-contain.js');
  assert.ok(env.UI_WEB_VITALS && existsSync(env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  const pw = await playwright();
  assert.ok(pw, 'EDGE_SHADE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const contexts = [
    ...SIZES.map(([width, height]) => [`${width}×${height}`, { viewport: { width, height } }]),
    ...DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...DUO.map(([width, height]) => [`two-screen ${width}×${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ];
  const browser = await pw.chromium.launch({ executablePath: env.UI_CHROME || undefined, args: ['--no-sandbox'] });
  const server = await serve(build, path.join(build, 'iframe.html'));
  let walked = 0;
  let scrolled = 0;
  try {
    for (const [name, context] of contexts) for (const theme of THEMES) for (const id of KEYED) {
      const label = `${id} ${name} ${theme}`;
      const ctx = await browser.newContext({ ...context, timezoneId: 'UTC', reducedMotion: 'reduce' });
      await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
      const page = await ctx.newPage();
      const got = await openStory(page, { id }, { port: server.port, theme });
      assert.equal(got.phase, STORY_DONE, `${label}: ${got.phase}`);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => { const f = document.querySelector('.ui-table-scroll'); f.scrollIntoView({ block: 'center' }); f.scrollLeft = 0; f.tabIndex = f.tabIndex < 0 ? 0 : f.tabIndex; f.focus(); });
      const start = await page.evaluate(KEY_READ);
      let was = start;
      for (let i = 0; i < 40; i += 1) {
        await page.keyboard.press('ArrowRight');
        await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
        const now = await page.evaluate(KEY_READ);
        assert.deepEqual(keyFindings(was, now, label), []);
        if (now.scroll === was.scroll) break;
        was = now;
      }
      assert.ok(was.scroll >= was.range - 1, `${label}: the keys stopped at ${was.scroll} of ${was.range}`);
      assert.deepEqual(pinFindings(start, was, context.viewport.width, label), []);
      walked += 1;
      if (was.scroll > 0) scrolled += 1;
      t.diagnostic(`${label}: range ${was.range}, cls ${was.cls}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.proc.kill();
  }
  assert.equal(walked, contexts.length * THEMES.length * KEYED.length, 'a context was not walked');
  assert.ok(scrolled >= 12, `only ${scrolled} walks had a range to scroll, so the pin was barely measured`);
});

test('the keyboard walk rejects a stuck first column on a phone and a lost pin above it', () => {
  const start = { first: [10, 10] };
  const end = { first: [10, 10], scroll: 200 };
  assert.notDeepEqual(pinFindings(start, end, 390, 'phone'), [], 'a pinned column on a phone passed');
  assert.deepEqual(pinFindings(start, end, 820, 'tablet'), []);
  assert.notDeepEqual(pinFindings(start, { first: [-190, -190], scroll: 200 }, 820, 'tablet'), [], 'a lost pin above the phone step passed');
  assert.equal(keyFindings({ fixed: [[0, 0]] }, { focus: false, over: 4, cls: 0.2, fixed: [[0, 3]] }, 'x').length, 4);
});
