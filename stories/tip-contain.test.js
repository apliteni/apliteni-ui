/* Rule: an open readout shows whole, and opening it changes the size of nothing. An
 * ancestor too small to hold it, such as a pinned name cell that cuts its text on a
 * phone, does not cut it (#814). docs/components.md#the-hover-readout states it.
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
 *    each one that scrolls or clips, must be the same open and shut.
 *
 * Its limits: one engine, Chromium; the light theme only, because a theme changes
 * paint, not geometry; keyboard focus opens each readout, so a hover and a tap are not
 * measured here; a readout that is not visible when its story loads is not reached; it
 * does not ask what paints over the readout, such as a sticky cell later in the table.
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

/* Runs in the page: each ancestor whose padding box cuts the open readout, and whether
   the readout leaves the view. A fixed readout escapes an ancestor's clip, unless that
   ancestor is the frame a fixed box is placed in. */
const CUT = () => {
  const tip = document.querySelector('.ui-tip.is-open');
  const r = tip.getBoundingClientRect();
  const view = document.documentElement;
  const fixed = getComputedStyle(tip).position === 'fixed';
  const frame = (s) => ['transform', 'translate', 'rotate', 'scale', 'filter', 'backdropFilter', 'perspective']
    .some((p) => s[p] && s[p] !== 'none')
    || /paint|layout|strict|content/.test(s.contain) || s.containerType !== 'normal'
    || /transform|filter|perspective/.test(s.willChange);
  const cuts = [];
  for (let el = tip.parentElement; el && el !== document.body; el = el.parentElement) {
    const s = getComputedStyle(el);
    if (s.display === 'inline' || [s.overflowX, s.overflowY].every((v) => v === 'visible')) continue;
    if (fixed && !frame(s)) continue;
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
    lifted: tip.hasAttribute('data-tip-lifted'),
    box: [r.left, r.top, r.width, r.height].map(Math.round).join(' '),
  };
};

/** Every readout of one story at one width, as rows; a story that will not render is a problem. */
async function measureStory(browser, lib, port, story, width, mutation) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, timezoneId: 'UTC' });
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
    if (mutation) await page.addStyleTag({ content: mutation });
    const marks = await page.evaluate(MARKS);
    for (const i of marks) {
      // Shut: a mark a story focused gets no second focus event, so blur it first.
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.ui-tip.is-open'));
      const shut = await page.evaluate(SIZES, i);
      await page.evaluate(FOCUS, i);
      const opened = await page.waitForFunction(() => document.querySelector('.ui-tip.is-open'), null, { timeout: 5000 })
        .then(() => true, () => false);
      if (!opened) { problems.push(`${story.label} at ${width}px, mark ${i}: focus opened no readout`); continue; }
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
    const bad = rows.filter((r) => r.cuts.length || r.outside || r.resized)
      .map((r) => `${r.where}: box ${r.box}${r.lifted ? ', lifted' : ''}`
        + `${r.cuts.length ? `, cut by ${r.cuts.join(' ')}` : ''}`
        + `${r.outside ? ', leaves the view' : ''}${r.resized ? `, resizes ${r.resized}` : ''}`);
    console.log(`measured ${rows.length} open readouts in ${entries.length} stories, ${rows.filter((r) => r.lifted).length} lifted`);
    assert.deepEqual(bad, [], 'an open readout is cut, outside the view, or resizes the page');
    // Coverage: each story file gives a readout, and the cut cell is measured where it cuts.
    for (const file of files) {
      const measured = entries.filter((e) => e.file === file && rows.some((r) => r.where.startsWith(`${e.label} at`)));
      assert.ok(measured.length, `no readout of ${file} was measured`);
    }
    assert.ok(rows.some((r) => r.where.startsWith('React/Tooltip > In Table Cell at 390px') && r.lifted),
      'the readout in the pinned cell at 390px was not measured lifted');

    // Rejection: a readout that stays inside the cut cell is reported.
    const cut = await measureStory(browser, lib, server.port,
      entries.find((e) => e.id === 'react-tooltip--in-table-cell'), 390,
      '.ui-tip[data-tip-lifted] { position: absolute !important; }');
    assert.ok(cut.rows.length && cut.rows.every((r) => r.cuts.length), 'the gate did not report a readout the cell cuts');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
