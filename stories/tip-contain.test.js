/* Rule: an open readout shows whole, and opening it changes the size of nothing. An
 * ancestor too small to hold it, such as a pinned name cell that cuts its text on a
 * phone, does not cut it, and no sticky cell paints over it (#814).
 * docs/components.md#the-hover-readout states it.
 *
 * Two halves:
 *  - The source half (always on) finds the story files that render a React Tooltip,
 *    which are the subjects of the browser half.
 *  - The browser half is OFF unless TIP_CONTAIN=1. Run `npm run build-storybook` first:
 *
 *   UI_PLAYWRIGHT=… UI_CHROME=… TIP_CONTAIN=1 node --test stories/tip-contain.test.js
 *
 *    It opens every story of those files at 1280, 820 and 390px and focuses each visible
 *    readout mark. The open readout must lie inside the view and inside the padding box
 *    of each ancestor that clips it. The box of each ancestor, and the scroll size of
 *    each one that scrolls or clips, must be the same open and shut. Nothing may paint
 *    over the readout: the top element at its corners, one radius in, at the middle of
 *    each edge, 2px in, and at its centre must be it.
 *
 * Its limits: one engine, Chromium; the light theme only, because a theme changes
 * paint, not geometry; keyboard focus opens each readout, so a hover and a tap are not
 * measured here; a readout that is not visible when its story loads is not reached; the
 * cover check samples nine points, so a cover that misses all nine is not found; the
 * mark is focused when it is shut and when it is open, so a change that focus alone
 * makes, such as the room of its ring, is not measured here.
 * CI runs the source half only. Report the browser half's output in the pull request.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN = process.env.TIP_CONTAIN === '1';
const WIDTHS = [1280, 820, 390];

/** The story files that render a React Tooltip, relative to the root. */
function tipStoryFiles() {
  const dir = path.join(root, 'react/src');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.stories.tsx') && /<Tooltip\b/.test(readFileSync(path.join(dir, f), 'utf8')))
    .map((f) => `./react/src/${f}`);
}

test('the source half finds the story files that render a readout', () => {
  const files = tipStoryFiles();
  assert.ok(files.includes('./react/src/Tooltip.stories.tsx'), `the Tooltip stories are not found: ${files}`);
  // A count that falls means a subject was lost. Raise it when a story file adds a readout.
  assert.ok(files.length >= 3, `only ${files.length} story files render a Tooltip: ${files}`);
});

/* Runs in the page: the visible marks, as indexes into the hosts. */
const MARKS = () => [...document.querySelectorAll('.ui-tip-host')]
  .map((host, i) => ({ i, mark: host.firstElementChild }))
  .filter(({ mark }) => mark && mark.checkVisibility())
  .map(({ i }) => i);

/* Runs in the page: the focus target of host i, focused, after it is in view. */
const FOCUS = (i) => {
  const mark = document.querySelectorAll('.ui-tip-host')[i].firstElementChild;
  const target = mark.matches('[tabindex]') ? mark : mark.querySelector('a, button, input, [tabindex]');
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
};

/* Runs in the page: the box of each ancestor of host i, and the scroll size of each one
   that scrolls or clips, the document included. A box that does not clip reports the
   readout as its overflow, which changes the size of nothing. */
const SIZES = (i) => {
  const out = [];
  for (let el = document.querySelectorAll('.ui-tip-host')[i]; el; el = el.parentElement) {
    const s = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    const scrolls = el === document.documentElement || s.display !== 'inline' && [s.overflowX, s.overflowY].some((v) => v !== 'visible');
    out.push(`${Math.round(b.width)}x${Math.round(b.height)}${scrolls ? ` scroll ${el.scrollWidth}x${el.scrollHeight}` : ''}`);
  }
  return out;
};

/* Runs in the page: each ancestor whose padding box cuts the open readout, whether the
   readout leaves the view, and what paints over it. A readout in the top layer escapes
   every ancestor's clip. */
const CUT = () => {
  const tip = document.querySelector('.ui-tip.is-open');
  const r = tip.getBoundingClientRect();
  const view = document.documentElement;
  const layered = tip.matches(':popover-open');
  // The top element at the corners, the middle of each edge and the centre. A hit test
  // follows the rounded corner, so a corner point sits its radius in. The readout takes
  // no pointer, so the hit test lends it one.
  const d = parseFloat(getComputedStyle(tip).borderTopLeftRadius) + 1;
  tip.style.pointerEvents = 'auto';
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const covers = [...new Set([[r.left + d, r.top + d], [r.right - d, r.top + d], [r.left + d, r.bottom - d],
    [r.right - d, r.bottom - d], [x, r.top + 2], [x, r.bottom - 2], [r.left + 2, y], [r.right - 2, y], [x, y]]
    .map(([px, py]) => document.elementFromPoint(px, py))
    .filter((el) => el && !tip.contains(el))
    .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`))];
  tip.style.pointerEvents = '';
  const cuts = [];
  for (let el = layered ? null : tip.parentElement; el && el !== document.body; el = el.parentElement) {
    const s = getComputedStyle(el);
    if (s.display === 'inline' || [s.overflowX, s.overflowY].every((v) => v === 'visible')) continue;
    const b = el.getBoundingClientRect();
    const left = b.left + el.clientLeft;
    const top = b.top + el.clientTop;
    if (r.left < left - 0.5 || r.top < top - 0.5 || r.right > left + el.clientWidth + 0.5 || r.bottom > top + el.clientHeight + 0.5) {
      cuts.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`);
    }
  }
  return {
    cuts,
    outside: r.left < -0.5 || r.top < -0.5 || r.right > view.clientWidth + 0.5 || r.bottom > view.clientHeight + 0.5,
    covers,
    layered,
    box: [r.left, r.top, r.width, r.height].map(Math.round).join(' '),
  };
};

/* Runs in the page before the story: a browser with no popover, which keeps the readout
   in its host as before #814. */
const NO_TOP_LAYER = () => {
  delete HTMLElement.prototype.showPopover;
  new MutationObserver(() => document.querySelectorAll('[popover]').forEach((el) => el.removeAttribute('popover')))
    .observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['popover'] });
};

/** Every readout of one story at one width, as rows; a story that will not render is a problem. */
async function measureStory(browser, lib, port, story, width, mutation) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, timezoneId: 'UTC' });
  if (mutation) await ctx.addInitScript(mutation);
  const page = await ctx.newPage();
  const rows = [];
  const problems = [];
  try {
    const got = await lib.openStory(page, story, { port, theme: 'light' });
    if (got.phase !== lib.STORY_DONE || got.id !== story.id) {
      problems.push(`${story.label} at ${width}px did not render: ${got.phase}`);
      return { rows, problems };
    }
    await page.evaluate(() => document.fonts.ready);
    const marks = await page.evaluate(MARKS);
    const focusOpens = async (i) => {
      // A mark a story focused gets no second focus event, so blur it first.
      await page.evaluate(() => document.activeElement?.blur());
      await page.evaluate(FOCUS, i);
      return page.waitForFunction(() => document.querySelector('.ui-tip.is-open'), null, { timeout: 5000 })
        .then(() => true, () => false);
    };
    for (const i of marks) {
      // Shut and open are both measured with the mark focused, so its ring's room is in
      // both and only the readout differs. Escape shuts the readout and keeps the focus.
      if (!await focusOpens(i)) { problems.push(`${story.label} at ${width}px, mark ${i}: focus opened no readout`); continue; }
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.ui-tip.is-open'));
      const shut = await page.evaluate(SIZES, i);
      if (!await focusOpens(i)) { problems.push(`${story.label} at ${width}px, mark ${i}: focus after Escape opened no readout`); continue; }
      // The readout fades in: hit-test the box it rests in, not a frame of the fade.
      await page.evaluate(() => Promise.all(document.querySelector('.ui-tip.is-open').getAnimations().map((a) => a.finished)));
      const hit = await page.evaluate(CUT);
      const open = await page.evaluate(SIZES, i);
      rows.push({ where: `${story.label} at ${width}px, mark ${i}`, ...hit, resized: shut.join() !== open.join() ? `${shut.join()} -> ${open.join()}` : '' });
    }
  } finally {
    await ctx.close();
  }
  return { rows, problems };
}

test('measured in a browser at three widths', {
  skip: !RUN && 'set TIP_CONTAIN=1',
}, async () => {
  const lib = await import('./lib/dropdown-contain.js');
  const pw = await lib.playwright();
  assert.ok(pw, 'TIP_CONTAIN=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build}: run npm run build-storybook`);

  const files = tipStoryFiles();
  const entries = Object.values(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries)
    .filter((e) => e.type === 'story' && files.includes(e.importPath))
    .map((e) => ({ id: e.id, label: `${e.title} > ${e.name}`, file: e.importPath }));
  const built = new Set(Object.values(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries).map((e) => e.importPath));
  assert.deepEqual(files.filter((f) => !built.has(f)), [], 'a story file that renders a Tooltip is not in the build: build it again');

  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await lib.serve(build, path.join(build, 'iframe.html'));
  try {
    const rows = [];
    const problems = [];
    for (const story of entries) {
      const got = await Promise.all(WIDTHS.map((width) => measureStory(browser, lib, server.port, story, width)));
      for (const one of got) {
        rows.push(...one.rows);
        problems.push(...one.problems);
      }
    }
    assert.deepEqual(problems, [], 'a story that will not render is an unmeasured subject');
    const bad = rows.filter((r) => r.cuts.length || r.covers.length || r.outside || r.resized)
      .map((r) => `${r.where}: box ${r.box}${r.layered ? '' : ', not in the top layer'}`
        + `${r.cuts.length ? `, cut by ${r.cuts.join(' ')}` : ''}${r.covers.length ? `, covered by ${r.covers.join(' ')}` : ''}`
        + `${r.outside ? ', leaves the view' : ''}${r.resized ? `, resizes ${r.resized}` : ''}`);
    console.log(`measured ${rows.length} open readouts in ${entries.length} stories, ${rows.filter((r) => r.layered).length} in the top layer`);
    assert.deepEqual(bad, [], 'an open readout is cut, covered, outside the view, or resizes the page');
    // Coverage: each story file gives a readout, and the cut cell is measured where it cuts.
    for (const file of files) {
      const measured = entries.filter((e) => e.file === file && rows.some((r) => r.where.startsWith(`${e.label} at`)));
      assert.ok(measured.length, `no readout of ${file} was measured`);
    }
    assert.deepEqual(rows.filter((r) => !r.layered).map((r) => r.where), [], 'a React readout opened outside the top layer');
    for (const width of [1280, 390]) {
      assert.ok(rows.some((r) => r.where.startsWith(`React/Tooltip > In Table Cell at ${width}px`)),
        `the readout in the pinned cell at ${width}px was not measured`);
    }

    // Rejection: without the top layer the cell cuts the readout on a phone, and the
    // sticky name header covers it on a desktop. The gate must report both.
    const story = entries.find((e) => e.id === 'react-tooltip--in-table-cell');
    const [phone, desk] = await Promise.all([390, 1280].map((width) => measureStory(browser, lib, server.port, story, width, NO_TOP_LAYER)));
    assert.ok(phone.rows.length && phone.rows.every((r) => !r.layered && r.cuts.length), `the gate did not report a readout the cell cuts: ${JSON.stringify(phone)}`);
    assert.ok(desk.rows.some((r) => r.covers.some((c) => c.startsWith('th.'))), `the gate did not report a readout a sticky header covers: ${JSON.stringify(desk)}`);
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
