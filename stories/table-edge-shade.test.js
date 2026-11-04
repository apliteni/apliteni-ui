/* Rule: a table scroll frame draws no shade on its edges, and a pinned column casts none
 * on the columns that scroll under it (#770). The scroller's own border and the pinned
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
 *
 * The members story also holds the card frame (#782), at 390 and 1440 wide: focused, its
 * ring shows on all four sides, at rest its side bands show no line, and the table
 * reaches its bottom. Limits: only the first frame in a card on that one story. */
const PHONE = { width: 390, height: 844 };
const PAYOUTS_STORY = 'react-datatable-ledgers--finance-data';
const MEMBERS_STORY = 'react-datatable-members--default';
const DESKTOP = { width: 1440, height: 900 };

test('measured in a browser: a phone table scrolls inside its frame', { skip: !RUN_BROWSER && 'set EDGE_SHADE=1' }, async (t) => {
  const { existsSync } = await import('node:fs');
  const { playwright, serve, indexed, openStory, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const {
    PHONE_FIT, phoneFitFindings, FRAME_UNCLIPPED, FRAME_FLOORLESS, LABEL_ESCAPES, CLOSED_TIP_BOX,
    decodePNG, CARD_FRAME, cardFrameFindings, FRAME_BANDLESS, FRAME_EDGE_LINE, FRAME_GAP_BELOW,
  } = await import('./lib/table-edge-shade.js');
  const shot = async (page) => decodePNG(await page.screenshot({ fullPage: true, animations: 'disabled' }));
  const checkCardFrame = async (page, label) => {
    for (const focus of [true, false]) {
      const frame = await page.evaluate(CARD_FRAME, focus);
      assert.ok(frame, `${label}: no table frame in a card`);
      if (focus) assert.ok(frame.focused, `${label}: the frame did not take a keyboard focus`);
      assert.deepEqual(cardFrameFindings(await shot(page), frame), [], `${label} ${focus ? 'focused' : 'at rest'}`);
    }
    for (const [what, mutation, focus] of [['a frame without bands', FRAME_BANDLESS, true], ['an edge line at rest', FRAME_EDGE_LINE, false], ['a band below the table', FRAME_GAP_BELOW, false]]) {
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
          for (const [what, mutation] of [['an unclipped frame', FRAME_UNCLIPPED], ['a frame without a zero floor', FRAME_FLOORLESS]]) {
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
          await checkCardFrame(page, `${theme} ${PHONE.width}`);
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
      await checkCardFrame(page2, `${theme} ${DESKTOP.width}`);
      await wide.close();
    }
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
