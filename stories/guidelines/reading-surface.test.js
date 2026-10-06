/* Rule: a guideline page's prose stands on the reading surface, never on the
 * page ground.
 *
 * Twenty-four rule pages and the Overview are reading, and the kit spends its
 * light theme's white on the surface a reader reads on rather than on the page
 * behind it. The rule pages are drawn by one layout, so the fault was one fault
 * and the check is one check: every page is mounted under the kit's stylesheets,
 * in both themes, and every element that paints a glyph of its own is asked what
 * colour is actually behind it.
 *
 * PROSE here is what the page WRITES — the title, each rule's imperative, its
 * instruction and reasoning, the caption under half a specimen pair, the
 * boundary, the gap note, and the Overview's index. It is not what a SPECIMEN
 * draws. A specimen is kit components put on a stage to be looked at, and some
 * of them paint the page ground on purpose: a dark table is flush with the page
 * by token, and a file drop frame and a stat band are grounds of their own.
 * That paint is the kit's and the kit's own gates measure it; a page showing one
 * is showing it correctly.
 *
 * The ground is resolved, never assumed. The resolver imported below composites
 * the ancestor chain, the same one the colour ledger measures its pairs with, so
 * a page that stops painting its surface, a wrapper that paints over it, and a
 * rule that escapes the column all reach this gate as one answer: the prose came
 * back standing on --bg.
 *
 * The canvas is painted --bg here because .storybook/preview.js paints it — the
 * theme decorator sets the root and the body to the page ground so a padded
 * story reads true. Without that the body is transparent, the resolver falls
 * back to white, and this gate would pass every page in both themes while
 * measuring a canvas Storybook never shows.
 *
 * LIMITS, so a pass is not read as more than it is:
 *  - JSDOM, so no layout: DOM ancestry stands in for visual stacking. Nothing on
 *    these pages is positioned over a non-ancestor at rest — the one specimen
 *    that would be, the confirm's scrim, is taken out of flow by the layout's
 *    own rule — but the proxy is the proxy.
 *  - At rest only. No state is forced: a ground a page paints on :hover belongs
 *    to the colour ledger, which forces four states, and not to this gate.
 *  - The ground is a colour, not a verdict. This says what the prose stands on;
 *    whether the two colours are legible together is the ledger's answer.
 *  - One accent, the default, because no accent re-points --bg or --surface.
 *  - A media query is not evaluated. Nothing in the layout paints inside one.
 *
 * why: guidelines/colour-and-theming.md#keep-text-off-grey-fills
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  desugar,
  effectiveBackground,
  hasOwnText,
  installDomGlobals,
  kitCssFor,
  makeStyleCache,
  rgbOf,
  selectorPath,
  serialize,
  substitute,
} from '../lib/contrast.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const THEMES = ['dark', 'light'];

/** Every guideline page the collection ships, discovered rather than listed. */
const pageFiles = readdirSync(here).filter((f) => f.endsWith('.stories.js')).sort();

/* The floors are what the collection holds today, not a round number under it: a
 * floor with slack in it is a floor a deleted page walks under.
 * 927 → 926: the state-set page's ring boundary now names the 32px control in
 * prose instead of repeating `--ring`, so it writes one code span fewer. Keep
 * this note clear of the words the minimums page's gate list is discovered by;
 * saying one of them outside an import enrols this file in that list. */
const FOUND = { pages: 25, stories: 25, prose: 926 };

/* Every prose carrier the collection writes. Each name is held against the
 * source below, so a renamed class fails here instead of quietly leaving the
 * sweep, and each has to contribute an element, so a dead selector cannot pad
 * the count. */
const PROSE = {
  h1: 'the page title',
  '.gc-imperative': "a rule's imperative",
  '.gc-why': "a rule's instruction and its reasoning",
  '.gc-cell__cap': 'the caption under half a specimen pair',
  '.gc-except': "a rule's boundary",
  '.gc-unmet': 'a gap the kit has not closed',
  '.gi-list': "the Overview's index",
};
const PROSE_SELECTOR = Object.keys(PROSE).join(',');

/**
 * Mount every guideline story in one theme and report what each prose element is
 * standing on.
 *
 * `edit` rewrites the rendered HTML before it is mounted, which is how the
 * mutation below takes the reading surface away and proves this gate reports it.
 */
async function walk(theme, edit = (html) => html) {
  const { vars, css } = kitCssFor(theme, 'default');
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}">`
    + `<head><style>${css}</style></head><body></body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  const win = dom.window;
  // Several pages build their specimens with document.createElement.
  installDomGlobals(win);
  const styles = makeStyleCache(win);
  const ground = rgbOf(vars.get('--bg'));
  assert.ok(ground, `the ${theme} theme resolves no --bg, so there is no page ground to measure`);

  const rows = [];
  const problems = [];
  const storyIds = [];
  for (const file of pageFiles) {
    const mod = await import(path.join(here, file));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const where = `stories/guidelines/${file}:${name}`;
      let out;
      try {
        out = render({ ...def.args, ...story.args }, { globals: { theme, accent: 'default' } });
      } catch (err) {
        problems.push(`${where} [${theme}] → render threw: ${err && err.message}`);
        continue;
      }
      const raw = serialize(out);
      if (raw == null) {
        problems.push(`${where} [${theme}] → render returned ${Object.prototype.toString.call(out)}`);
        continue;
      }
      storyIds.push(where);
      // Stories speak var() in their own <style> blocks and style attributes,
      // and JSDOM resolves none of it.
      const html = edit(desugar(substitute(raw, vars)));
      styles.mutate(() => {
        // What .storybook/preview.js's theme decorator paints on the canvas.
        win.document.body.setAttribute('style', `background:${vars.get('--bg')}`);
        win.document.body.innerHTML = html;
      });

      for (const el of win.document.body.querySelectorAll('*')) {
        if (!hasOwnText(el)) continue;
        if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue;
        const carrier = el.closest(PROSE_SELECTOR);
        if (!carrier) continue;
        let hidden = false;
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
          const cs = styles.of(n);
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number.parseFloat(cs.opacity || '1') === 0) {
            hidden = true;
            break;
          }
        }
        if (hidden) continue;
        const bg = effectiveBackground(el, win, styles.of);
        rows.push({
          where,
          carrier: Object.keys(PROSE).find((sel) => carrier.matches(sel)),
          path: selectorPath(el),
          onGround: bg !== 'IMAGE'
            && rgbOf(`rgb(${bg.slice(0, 3).map(Math.round).join(',')})`) === ground,
        });
      }
    }
  }
  win.close();
  return { rows, problems, storyIds, ground };
}

const walked = Object.fromEntries(await Promise.all(
  THEMES.map(async (theme) => [theme, await walk(theme)]),
));

// ---- the subjects --------------------------------------------------------

test('the gate found every guideline page, in both themes', () => {
  assert.ok(
    pageFiles.length >= FOUND.pages,
    `only ${pageFiles.length} guideline story files, against ${FOUND.pages} when this was `
    + 'written. A page left the collection, or the sweep stopped reaching it — say which in '
    + 'the same commit.',
  );
  for (const theme of THEMES) {
    const { problems, storyIds, rows } = walked[theme];
    assert.deepEqual(problems, [], 'a guideline page would not render in the '
      + `${theme} theme, and a subject this gate cannot mount is a failure rather than a `
      + `skip:\n  ${problems.join('\n  ')}`);
    assert.ok(storyIds.length >= FOUND.stories, `only ${storyIds.length} guideline stories `
      + `rendered in the ${theme} theme, against ${FOUND.stories} when this was written.`);
    assert.ok(rows.length >= FOUND.prose, `only ${rows.length} prose elements measured in the `
      + `${theme} theme, against ${FOUND.prose} when this was written. A gate measuring nothing `
      + 'passes everything.');
    // Every page contributes, so one page emptying itself cannot hide behind the
    // other twenty-four in the total above.
    const silent = storyIds.filter((id) => !rows.some((r) => r.where === id));
    assert.deepEqual(silent, [], `a guideline page wrote no prose at all in the ${theme} theme`);
  }
});

test('every prose carrier this gate sweeps is one the collection really writes', () => {
  const source = ['_layout.js', 'Overview.stories.js']
    .map((f) => readFileSync(path.join(here, f), 'utf8')).join('\n');
  const unknown = Object.keys(PROSE).filter((sel) => sel !== 'h1' && !source.includes(sel.slice(1)));
  assert.deepEqual(unknown, [], 'this gate sweeps a class the guideline pages have never '
    + 'written. A selector that matches nothing passes every page and hides the rule it was '
    + 'written for.');

  for (const theme of THEMES) {
    const found = new Set(walked[theme].rows.map((r) => r.carrier));
    const silent = Object.keys(PROSE).filter((sel) => !found.has(sel));
    assert.deepEqual(silent, [], `in the ${theme} theme nothing was measured for `
      + `${silent.map((sel) => `${sel} (${PROSE[sel]})`).join(', ')}`);
  }
});

// ---- the rule ------------------------------------------------------------

for (const theme of THEMES) {
  test(`${theme}: a guideline page's prose stands on the reading surface`, () => {
    const { rows, ground } = walked[theme];
    const stranded = rows.filter((r) => r.onGround);
    const show = [...new Set(stranded.map((r) => `${r.where}\n      ${r.path}`))];
    assert.deepEqual(
      show, [],
      `\n${stranded.length} element(s) read their text straight on the page ground (${ground}) `
      + `in the ${theme} theme:\n\n   ${show.join('\n   ')}\n\n`
      + 'A guideline page is reading, and reading does not stand on the page ground. The layout '
      + 'paints the page the reading surface; a page that steps outside it, or a wrapper that '
      + 'paints the ground back over it, lands here.',
    );
  });
}

// ---- anti-vacuity: the check rejects the page this change replaced -------

test('the check reports the prose the moment the reading surface stops painting', async () => {
  let edits = 0;
  const unpaint = (html) => html.replace(/(\.gl-page\s*\{\s*background:\s*)[^;]+;/, (m, head) => {
    edits += 1;
    return `${head}transparent;`;
  });
  const { rows } = await walk('light', unpaint);
  assert.ok(edits > 0, 'the mutation found no .gl-page background to take away, so this test '
    + 'proved nothing. The layout renamed the page ground or stopped painting it.');
  const stranded = rows.filter((r) => r.onGround);
  assert.ok(
    stranded.length > 500,
    `with the reading surface unpainted only ${stranded.length} prose element(s) came back on `
    + 'the page ground. That is the shape the collection shipped before this change, so a check '
    + 'that cannot report it is measuring something else.',
  );
});
