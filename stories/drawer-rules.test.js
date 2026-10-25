// Check drawer separators without adding borders around content.

/* Coverage limits:
 * - Consumer content outside this repository is not rendered here.
 * - Border presence is checked; group spacing, line weight and colour are not.
 * - Shadows, outlines and pseudo-elements are not read as lines.
 * - Footer fills are checked against the panel, not for their contrast.
 * - Logical borders assume horizontal, left-to-right writing.
 * - React classes are checked by the React parity test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { kitCssFor, substitute, desugar, installDomGlobals, storyFiles, selectorPath } from './lib/contrast.js';
import { drawer } from '../src/components/drawer.js';
import { FAULTS, measure, physical } from './lib/drawer-rules.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES = ['dark', 'light'];

// The drawer panels the catalogue renders in each theme. A drawer story, or a drawer
// specimen on a guideline page, added or removed moves these, and so does a story
// that stops rendering one: set them to the count the failure prints once the change
// is meant.
// The shell draws the same drawer in every story that has a shell, so one of them stands
// for all and the count does not move with each page story.
const EXPECTED = { subjects: 13, donts: 3 };

const markup = (out) => (typeof out === 'string' ? out : out?.outerHTML ?? null);

/** Every drawer panel in every story, split into subjects and don'ts, and the faults. */
async function walk(theme) {
  const { vars, css } = kitCssFor(theme);
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${physical(css)}</style></head><body></body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  const win = dom.window;
  installDomGlobals(win);
  const mount = (raw) => { win.document.body.innerHTML = desugar(physical(substitute(raw, vars))); };

  const subjects = [];
  const donts = [];
  const problems = [];
  let shellSeen = false;
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
      mount(raw);
      for (const panel of win.document.querySelectorAll('.ui-drawer__panel')) {
        if (panel.closest('.ui-app__drawer')) {
          if (shellSeen) continue;
          shellSeen = true;
        }
        const m = measure(win, panel, `${rel}:${name} [${theme}]`);
        (panel.closest('[data-specimen="dont"]') ? donts : subjects).push(m);
      }
    }
  }

  const faults = FAULTS.map(({ fault, kind, css: rule = '', body = '<p>Body</p>' }) => {
    mount(`<style>${rule}</style><div class="zz-fault">${drawer({
      title: 'Fault', specimen: true, body, footer: '<button type="button">Done</button>',
    })}</div>`);
    const panels = [...win.document.querySelectorAll('.ui-drawer__panel')];
    return { fault, kind, panels: panels.length, found: panels.length ? measure(win, panels[0], fault)[kind].length : 0 };
  });
  return { subjects, donts, problems, faults };
}

const walks = Object.fromEntries(await Promise.all(THEMES.map(async (t) => [t, await walk(t)])));

for (const theme of THEMES) {
  const { subjects, donts, problems, faults } = walks[theme];

  test(`[${theme}] every story renders, and every drawer in it is found`, () => {
    assert.deepStrictEqual(problems, [], 'a story could not be rendered, so its drawers were never measured');
    for (const [kind, list] of [['subjects', subjects], ['donts', donts]]) {
      assert.equal(
        list.length, EXPECTED[kind],
        `found ${list.length} drawer panels as ${kind} in [${theme}], expected ${EXPECTED[kind]}. A drawer story or `
        + 'a guideline drawer specimen was added or removed, or a story stopped rendering its drawer. If the '
        + `change is meant, set EXPECTED.${kind} in stories/drawer-rules.test.js to ${list.length}; if not, `
        + 'a panel has fallen out of this gate',
      );
    }
  });

  test(`[${theme}] no drawer holds a card, or a box of its own`, () => {
    const offences = subjects.flatMap((s) => s.cards.map((p) => `${s.where}  ${p}`));
    assert.deepStrictEqual(
      offences, [],
      'a drawer holds a card, or a box with all four edges drawn that is not a control. The panel already '
      + 'has the edge, surface and shadow a card would add; group with drawerSection() headings instead:\n  '
      + offences.join('\n  '),
    );
  });

  test(`[${theme}] no row inside a drawer is ruled, and no drawer holds an <hr>`, () => {
    const offences = subjects.flatMap((s) => s.ruledRows.map((p) => `${s.where}  ${p}`));
    assert.deepStrictEqual(
      offences, [],
      'an element inside a drawer draws a rule on its top or bottom edge, or is an <hr>. Rows are held '
      + 'apart by space, and each value sits beside its label so nothing has to lead the eye '
      + 'across. The one line the body draws parts a group from the group above it:\n  '
      + offences.join('\n  '),
    );
  });

  test(`[${theme}] drawer footers share the panel surface`, () => {
    assert.ok(subjects.reduce((n, s) => n + s.footerCount, 0) > 0, 'measured at least one footer');
    assert.deepEqual(subjects.flatMap((s) => s.footerFills.map((p) => `${s.where} ${p}`)), []);
  });

  test(`[${theme}] every drawer is framed: a header line, no footer or body rules`, () => {
    const offences = subjects.flatMap((s) => [...s.unframed, ...s.strayEdges].map((e) => `${s.where}  ${e}`));
    assert.deepStrictEqual(
      offences, [],
      'a drawer must keep its header line and leave the body and footer edges clear:\n  ' + offences.join('\n  '),
    );
  });

  test(`[${theme}] one line parts each group from the group above it`, () => {
    const offences = subjects.flatMap((s) => s.unparted.map((p) => `${s.where}  ${p}`));
    assert.deepStrictEqual(
      offences, [],
      'a group follows another group with no line between them. A heading and space alone leave a long '
      + 'record with nothing to divide it:\n  ' + offences.join('\n  '),
    );
  });

  test(`[${theme}] the gate can see every fault: the guideline don'ts and one of each written on purpose`, () => {
    assert.ok(donts.some((d) => d.cards.length > 0), 'no don\'t specimen was measured holding a card');
    assert.ok(donts.some((d) => d.ruledRows.length > 0), 'no don\'t specimen was measured with a ruled row');
    const missed = faults.filter((f) => f.panels !== 1 || f.found === 0)
      .map((f) => `${f.fault}: ${f.panels} panel(s) rendered, ${f.found} ${f.kind} found`);
    assert.deepStrictEqual(
      missed, [],
      'a fault written into a drawer on purpose was not seen, so a pass says nothing about it:\n  '
      + missed.join('\n  '),
    );
  });
}
