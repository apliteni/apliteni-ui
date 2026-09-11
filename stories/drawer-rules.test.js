/* Rule: a drawer groups its content by heading and holds its rows apart with
 * space (#272).
 *
 * The subjects are elements. Every story is rendered into a jsdom carrying the
 * kit's stylesheets in each theme, and every drawer panel that comes out is
 * measured with the cascade resolved. A specimen inside [data-specimen="dont"]
 * is a picture of the fault, so it is not a subject; it is used instead to
 * prove this gate can see the fault at all.
 *
 * A rule is a border on the top or bottom edge of a box that does not also
 * draw both sides. A box with four edges is a control or a card, and cards are
 * refused on their own.
 *
 * Ledger, what a pass does not say:
 * - Nothing about a drawer a consumer fills outside this repo. The gate holds
 *   the kit's own stories and guideline pages, which is what a consumer copies.
 * - A line drawn by an inset box-shadow, an outline or a background is not read.
 * - React renders the same classes; react/src holds that with its parity test.
 *
 * why: docs/specification.md#the-drawer
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { kitCssFor, substitute, desugar, installDomGlobals, storyFiles, selectorPath } from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES = ['dark', 'light'];

const markup = (out) => (typeof out === 'string' ? out : out?.outerHTML ?? null);

const drawn = (cs, side) => parseFloat(cs.getPropertyValue(`border-${side}-width`)) > 0
  && cs.getPropertyValue(`border-${side}-style`) !== 'none'
  && !/^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\))$/.test(cs.getPropertyValue(`border-${side}-color`).trim());

const isRule = (cs) => (drawn(cs, 'top') || drawn(cs, 'bottom')) && !(drawn(cs, 'left') && drawn(cs, 'right'));

/** What one panel draws inside its body, as plain data. */
function measure(win, panel, where) {
  const body = panel.querySelector('.ui-drawer__body');
  const inside = body ? [...body.querySelectorAll('*')] : [];
  return {
    where,
    cards: inside.filter((el) => el.classList.contains('ui-card')).length,
    ruledRows: inside
      .filter((el) => !el.classList.contains('ui-drawer__section'))
      .filter((el) => isRule(win.getComputedStyle(el)))
      .map((el) => selectorPath(el)),
  };
}

/** Every drawer panel in every story, split into subjects and don'ts. */
async function walk(theme) {
  const { vars, css } = kitCssFor(theme);
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head><body></body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  const win = dom.window;
  installDomGlobals(win);

  const subjects = [];
  const donts = [];
  const problems = [];
  for (const rel of storyFiles) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      let out;
      try {
        out = render(args, { globals: { theme }, args });
      } catch (err) {
        problems.push(`${rel}:${name} [${theme}] → render threw: ${err && err.message}`);
        continue;
      }
      const raw = markup(out);
      if (raw == null) {
        problems.push(`${rel}:${name} [${theme}] → render returned no markup`);
        continue;
      }
      win.document.body.innerHTML = desugar(substitute(raw, vars));
      for (const panel of win.document.querySelectorAll('.ui-drawer__panel')) {
        const m = measure(win, panel, `${rel}:${name} [${theme}]`);
        (panel.closest('[data-specimen="dont"]') ? donts : subjects).push(m);
      }
    }
  }
  return { subjects, donts, problems };
}

const walks = Object.fromEntries(await Promise.all(THEMES.map(async (t) => [t, await walk(t)])));

for (const theme of THEMES) {
  const { subjects, donts, problems } = walks[theme];

  test(`[${theme}] every story renders, and drawers are found in it`, () => {
    assert.deepStrictEqual(problems, [], 'a story could not be rendered, so its drawers were never measured');
    assert.ok(subjects.length >= 5, `found ${subjects.length} drawer panels to measure; the kit's stories carry more`);
  });

  test(`[${theme}] no drawer puts a card inside its body`, () => {
    const offences = subjects.filter((s) => s.cards > 0).map((s) => `${s.where}  ${s.cards} card(s)`);
    assert.deepStrictEqual(
      offences, [],
      'a drawer body holds a card. The panel already has the edge, surface and shadow a card '
      + 'would add; group with drawerSection() headings instead:\n  ' + offences.join('\n  '),
    );
  });

  test(`[${theme}] no row inside a drawer is ruled`, () => {
    const offences = subjects.flatMap((s) => s.ruledRows.map((p) => `${s.where}  ${p}`));
    assert.deepStrictEqual(
      offences, [],
      'an element inside a drawer body draws a rule on its top or bottom edge. Rows are held '
      + 'apart by space, and each value sits beside its label so nothing has to lead the eye '
      + 'across:\n  ' + offences.join('\n  '),
    );
  });

  test(`[${theme}] the gate can see both faults: the guideline don'ts are caught`, () => {
    assert.ok(donts.some((d) => d.cards > 0), 'no don\'t specimen was measured holding a card');
    assert.ok(donts.some((d) => d.ruledRows.length > 0), 'no don\'t specimen was measured with a ruled row');
  });
}
