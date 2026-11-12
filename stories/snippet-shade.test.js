/* Rule: a code block keeps its #800 shape. It stands on its own ground, a line divides its
 * bar from its code, 12px of space sit under that line, and a shade shows at each edge that
 * has code past it. The reveal block keeps its earlier shape: no line, no space, no shade.
 * docs/components.md states the ground, the line and the shade.
 *
 * Two halves:
 *  - The source half (always on) reads src/styles/code.css and names each part that is
 *    gone. It reads the source, so it cannot see another sheet that paints over the block.
 *  - The browser half is OFF unless SNIPPET_SHADE=1. It measures the pixels of the built
 *    Storybook, so run `npm run build-storybook` first:
 *
 *   UI_PLAYWRIGHT=… UI_CHROME=… SNIPPET_SHADE=1 node --test stories/snippet-shade.test.js
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
const SOURCE = readFileSync(path.join(root, 'src/styles/code.css'), 'utf8');

/** The last value each selector declares for each property, as the cascade reads one sheet. */
function declarations(css) {
  const out = new Map();
  for (const [, prelude, body] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const selector of splitSelectorList(prelude.trim())) {
      const own = out.get(selector) ?? new Map();
      for (const [, prop, value] of body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) own.set(prop, value.trim().replace(/\s+/g, ' '));
      out.set(selector, own);
    }
  }
  return out;
}

/* Each part of the block, as the declaration that draws it. A part is missing when its
 * selector does not declare it in this shape. Limits: exact selectors only, so the same
 * paint written under another selector reads as missing, and a later rule elsewhere that
 * undoes it is not seen. */
const PARTS = [
  ['the block ground', '.ui-snippet', 'background', (v) => v === 'var(--code-bg)'],
  ['the divider', '.ui-snippet__bar', 'border-bottom', (v) => v === '1px solid var(--card-edge)'],
  ['the space under the divider', '.ui-snippet pre', 'padding', (v) => v.startsWith('var(--space-3) ')],
  ['the shade colour', '.ui-snippet pre', '--ui-snippet-edge', (v) => /var\(--sheen\)/.test(v)],
  ['the light shade colour', ':root[data-theme="light"] .ui-snippet pre', '--ui-snippet-edge', (v) => /var\(--shadow-ink\)/.test(v)],
  ['the shade', '.ui-snippet pre', 'background-image',
    (v) => (v.match(/linear-gradient\(to (?:right|left), var\(--code-bg\) 50%, transparent\)/g) ?? []).length === 2
      && (v.match(/radial-gradient\(farthest-side at (?:0|100%) 50%, var\(--ui-snippet-edge\), transparent\)/g) ?? []).length === 2],
  ['the covers that scroll with the code', '.ui-snippet pre', 'background-attachment', (v) => v === 'local, local, scroll, scroll'],
  ['the reveal block without a divider', '.ui-snippet--reveal .ui-snippet__bar', 'border-bottom', (v) => v === '0'],
  ['the reveal block without space', '.ui-snippet--reveal pre', 'padding-top', (v) => v === '0'],
  ['the reveal block without a shade', '.ui-snippet--reveal pre', 'background-image', (v) => v === 'none'],
];

function sourceFindings(css) {
  const own = declarations(css);
  return PARTS.filter(([, selector, prop, ok]) => {
    const value = own.get(selector)?.get(prop);
    return value === undefined || !ok(value);
  }).map(([part, selector, prop]) => `${part}: ${selector} does not declare its ${prop}`);
}

test('the code block sheet draws the ground, the divider, the space and the shade', () => {
  assert.deepEqual(sourceFindings(SOURCE), [], 'src/styles/code.css lost a part of the #800 code block');
});

test('the code block source gate names each part that is removed', () => {
  const removals = [
    ['the block ground', /background: var\(--code-bg\);/],
    ['the divider', /border-bottom: 1px solid var\(--card-edge\);/],
    ['the space under the divider', /padding: var\(--space-3\) 15px 14px;/],
    ['the shade colour', /--ui-snippet-edge: color-mix\(in srgb, var\(--sheen\)[^;]+;/],
    ['the light shade colour', /--ui-snippet-edge: color-mix\(in srgb, var\(--shadow-ink\)[^;]+;/],
    ['the shade', /background-image:\s*linear-gradient[\s\S]*?transparent\);\s*background-repeat/],
    ['the covers that scroll with the code', /background-attachment: local, local, scroll, scroll;/],
    ['the reveal block without a divider', /\.ui-snippet--reveal \.ui-snippet__bar \{ border-bottom: 0; \}/],
    ['the reveal block without space', /padding-top: 0; /],
    ['the reveal block without a shade', /\.ui-snippet--reveal pre \{ background-image: none; \}/],
  ];
  assert.equal(removals.length, PARTS.length, 'a part has no removal that proves the gate sees it');
  for (const [part, pattern] of removals) {
    assert.match(SOURCE, pattern, `the removal for ${part} no longer finds its declaration`);
    const keep = part === 'the shade' ? 'background-repeat' : '';
    const found = sourceFindings(SOURCE.replace(pattern, keep));
    assert.deepEqual(found.map((line) => line.split(':')[0]), [part], `removing ${part} was not named alone`);
  }
});

const RUN_BROWSER = process.env.SNIPPET_SHADE === '1';
const THEMES = ['light', 'dark'];

/* What one capture of a code block reads: the block, its bar and its code, the scroll range,
 * and the pixels the checks compare. The code's ink is made transparent before the capture,
 * so a glyph that scrolls under an edge cannot pass for a shade. */
const MEASURE = async (where) => {
  const block = document.querySelector('.ui-snippet');
  const bar = block?.querySelector('.ui-snippet__bar');
  const pre = block?.querySelector('pre');
  if (!pre) return null;
  const range = pre.scrollWidth - pre.clientWidth;
  pre.scrollLeft = where === 'end' ? range : where === 'middle' ? Math.round(range / 2) : 0;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
  return {
    range, scrollLeft: pre.scrollLeft,
    block: box(block), bar: box(bar), pre: box(pre),
    paddingTop: parseFloat(getComputedStyle(pre).paddingTop),
    barLine: parseFloat(getComputedStyle(bar).borderBottomWidth),
  };
};

const INKLESS = '.ui-snippet pre, .ui-snippet pre * { color: transparent !important; }';
/** How far two pixels are apart, as the largest channel difference. */
const apart = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
/** A shade or a line is this far from its ground at least; a flat ground is within FLAT. */
const SEEN = 4;
const FLAT = 1;

/** What a capture of a scrolling code block got wrong in one scroll state, as lines. The
 *  shade is sampled 2px inside each side edge at the code's middle height, against the
 *  ground at the code's middle. Limits: one pixel per edge, the first block in the story,
 *  and the default accent. */
function blockFindings(img, m, state, pixelAt) {
  const out = [];
  const midX = (m.pre.left + m.pre.right) / 2;
  const midY = (m.pre.top + m.pre.bottom) / 2;
  const ground = pixelAt(img, midX, midY);
  const outside = pixelAt(img, m.block.left - 6, (m.bar.top + m.bar.bottom) / 2);
  if (apart(pixelAt(img, midX, m.bar.top + 3), outside) < SEEN) out.push('the block has no ground of its own');
  if (apart(pixelAt(img, midX, m.bar.bottom - 1), pixelAt(img, midX, m.bar.top + 3)) < SEEN) out.push('the bar has no divider');
  if (m.paddingTop < 12) out.push(`the code starts ${m.paddingTop}px under the divider, not 12px`);
  const want = { fitting: [false, false], start: [false, true], middle: [true, true], end: [true, false] }[state];
  if (state === 'fitting' ? m.range > 0 : m.range < 48) out.push(`${state}: the code's scroll range is ${m.range}px`);
  const sides = [['left', m.pre.left + 2], ['right', m.pre.right - 3]];
  sides.forEach(([side, x], i) => {
    const gap = apart(pixelAt(img, x, midY), ground);
    if (want[i] && gap < SEEN) out.push(`${state}: no shade at the ${side} edge (${gap})`);
    if (!want[i] && gap > FLAT) out.push(`${state}: a shade at the ${side} edge with no code past it (${gap})`);
  });
  return out;
}

/* The block in a real browser (#800), in both themes. The Access app's command scrolls at
 * 360px wide and fits at 1280. The bare Shell story is not used: its centred frame grows
 * with the code, so its code never scrolls. Each part is removed once in the page to prove
 * the check sees it. Limits: the Access and reveal stories only, at those two widths. */
const SHELL_STORY = 'apps-access-agents--default';
const REVEAL_STORY = 'react-snippet--reveal';
const NARROW = { width: 360, height: 800 };
const WIDE = { width: 1280, height: 900 };
const REMOVALS = [
  ['no divider', '.ui-snippet__bar { border-bottom: 0 !important; }', 'start'],
  ['no block ground', '.ui-snippet { background: none !important; }', 'start'],
  ['no space', '.ui-snippet pre { padding-top: 0 !important; }', 'start'],
  ['no shade', '.ui-snippet pre { background-image: none !important; }', 'middle'],
  ['covers that do not scroll', '.ui-snippet pre { background-attachment: scroll !important; }', 'end'],
];

test('measured in a browser: the code block shades only an edge with code past it', { skip: !RUN_BROWSER && 'set SNIPPET_SHADE=1' }, async (t) => {
  const { existsSync } = await import('node:fs');
  const { playwright, serve, indexed, openStory, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const { decodePNG, pixelAt } = await import('./lib/table-edge-shade.js');

  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const pw = await playwright();
  assert.ok(pw, 'SNIPPET_SHADE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME || undefined, args: ['--no-sandbox'] });
  const server = await serve(build, path.join(build, 'iframe.html'));

  const capture = async (page, state) => {
    const m = await page.evaluate(MEASURE, state);
    assert.ok(m, `${state}: no code block in the story`);
    return { m, img: decodePNG(await page.screenshot({ animations: 'disabled' })) };
  };

  try {
    const stories = indexed(build);
    for (const id of [SHELL_STORY, REVEAL_STORY]) assert.ok(stories.some((s) => s.id === id), `${id} is not in the build`);
    const story = (id) => stories.find((s) => s.id === id);
    let measured = 0;
    for (const theme of THEMES) {
      for (const [viewport, states] of [[NARROW, ['start', 'middle', 'end']], [WIDE, ['fitting']]]) {
        const ctx = await browser.newContext({ viewport });
        const page = await ctx.newPage();
        const got = await openStory(page, story(SHELL_STORY), { port: server.port, theme });
        assert.equal(got.phase, STORY_DONE, `access ${theme} ${viewport.width}: ${got.phase}`);
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: INKLESS });
        for (const state of states) {
          const { m, img } = await capture(page, state);
          t.diagnostic(`${theme} ${viewport.width} ${state}: range ${m.range}, scrolled ${m.scrollLeft}`);
          assert.deepEqual(blockFindings(img, m, state, pixelAt), [], `${theme} ${viewport.width} ${state}`);
          measured += 1;
        }
        if (viewport === NARROW) {
          for (const [what, content, state] of REMOVALS) {
            const style = await page.addStyleTag({ content });
            const { m, img } = await capture(page, state);
            const found = blockFindings(img, m, state, pixelAt);
            t.diagnostic(`${theme} ${what}: ${found.join('; ')}`);
            assert.notDeepEqual(found, [], `${theme}: ${what} still passed`);
            await style.evaluate((node) => node.remove());
          }
        }
        await ctx.close();
      }
      // The reveal block wraps, so it has no range, no line and no space under its bar.
      const ctx = await browser.newContext({ viewport: NARROW });
      const page = await ctx.newPage();
      const got = await openStory(page, story(REVEAL_STORY), { port: server.port, theme });
      assert.equal(got.phase, STORY_DONE, `reveal ${theme}: ${got.phase}`);
      const { range, barLine, paddingTop } = await page.evaluate(MEASURE, 'start');
      assert.deepEqual({ range, barLine, paddingTop }, { range: 0, barLine: 0, paddingTop: 0 }, `reveal ${theme}`);
      await ctx.close();
    }
    assert.equal(measured, THEMES.length * 4, 'a scroll state was not measured');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
