// Check drawer separators without adding borders around content.

/* Coverage limits:
 * - Consumer content outside this repository is not rendered here.
 * - Border presence is checked; group spacing, line weight and colour are not.
 * - Shadows, outlines, backgrounds and pseudo-elements are not read as lines.
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES = ['dark', 'light'];

// The drawer panels the catalogue renders in each theme. A drawer story, or a drawer
// specimen on a guideline page, added or removed moves these, and so does a story
// that stops rendering one: set them to the count the failure prints once the change
// is meant.
const EXPECTED = { subjects: 12, donts: 2 };

const markup = (out) => (typeof out === 'string' ? out : out?.outerHTML ?? null);

const drawn = (cs, side) => parseFloat(cs.getPropertyValue(`border-${side}-width`)) > 0
  && cs.getPropertyValue(`border-${side}-style`) !== 'none'
  && !/^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\))$/.test(cs.getPropertyValue(`border-${side}-color`).trim());

const isRule = (cs) => (drawn(cs, 'top') || drawn(cs, 'bottom')) && !(drawn(cs, 'left') && drawn(cs, 'right'));
const fourSided = (cs) => ['top', 'bottom', 'left', 'right'].every((side) => drawn(cs, side));

/* -- Logical borders, as jsdom cannot read them -------------------------------- */

const SIDE = { 'block-start': 'top', 'block-end': 'bottom', 'inline-start': 'left', 'inline-end': 'right' };
const AXIS = { block: ['top', 'bottom'], inline: ['left', 'right'] };

/** Split a value on whitespace outside brackets: `1px rgb(0 0 0)` is two words. */
const words = (value) => {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (depth === 0 && /\s/.test(ch)) { if (buf) out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
};

/**
 * Every logical border declaration, in a sheet or a style attribute, rewritten as
 * the physical ones it is in horizontal, left-to-right writing. `border-block-width:
 * 1px 2px` is start then end; the `border-block` shorthand sets both sides alike.
 */
const physical = (css) => css.replace(
  /(?<![\w-])border-(block|inline)(-start|-end)?(-width|-style|-color)?\s*:\s*([^;}"']*)/gi,
  (whole, axis, end = '', part = '', raw) => {
    const important = /!\s*important\s*$/i.test(raw) ? ' !important' : '';
    const value = raw.replace(/!\s*important\s*$/i, '').trim();
    const sides = end ? [SIDE[`${axis}${end}`.toLowerCase()]] : AXIS[axis.toLowerCase()];
    const values = !end && part ? words(value) : [value];
    return sides
      .map((side, i) => `border-${side}${part.toLowerCase()}: ${values[Math.min(i, values.length - 1)]}${important}`)
      .join('; ');
  },
);

/* -- One panel ----------------------------------------------------------------- */

const CONTROL = 'input, select, textarea, button, a[href], [role="button"], [role="switch"], [role="checkbox"], '
  + '[role="radio"], [role="textbox"], [role="combobox"], [contenteditable]';
const SLOT = '.ui-drawer__header, .ui-drawer__body, .ui-drawer__footer';

/** A group that follows another group: the one element inside the body allowed a line. */
const follows = (el) => el.classList.contains('ui-drawer__section')
  && !!el.previousElementSibling?.classList?.contains('ui-drawer__section');

/** What one panel draws inside itself, and what it fails to draw, as plain data. */
function measure(win, panel, where) {
  const style = (el) => win.getComputedStyle(el);
  const inside = [...panel.querySelectorAll('*')].filter((el) => !el.matches(SLOT));
  const hr = (el) => el.tagName === 'HR' && style(el).display !== 'none';
  const edge = (sel, side, said) => [...panel.querySelectorAll(sel)].filter((el) => drawn(style(el), side)).map(() => said);
  const lacks = (sel, side, said) => [...panel.querySelectorAll(sel)].filter((el) => !drawn(style(el), side)).map(() => said);
  // A group separator is a line on the top edge and nothing else. A group that draws
  // its bottom edge too puts two lines in one gap, so it stays a ruled row.
  const separator = (el) => follows(el) && drawn(style(el), 'top') && !drawn(style(el), 'bottom');
  return {
    where,
    cards: inside
      .filter((el) => el.classList.contains('ui-card') || (!hr(el) && !el.closest(CONTROL) && fourSided(style(el))))
      .map((el) => selectorPath(el)),
    ruledRows: inside
      .filter((el) => hr(el) || (isRule(style(el)) && !separator(el)))
      .map((el) => selectorPath(el)),
    strayEdges: [
      ...edge('.ui-drawer__body', 'top', 'a line on the body\'s top edge, under the header\'s own'),
      ...edge('.ui-drawer__body', 'bottom', 'a line on the body\'s bottom edge, under the footer\'s own'),
    ],
    unframed: [
      ...lacks('.ui-drawer__header', 'bottom', 'a header with no line under it'),
      ...lacks('.ui-drawer__footer', 'top', 'a footer with no line over it'),
    ],
    unparted: inside.filter((el) => follows(el) && !drawn(style(el), 'top')).map((el) => selectorPath(el)),
  };
}

// Two groups, the shape the separator is about, for the faults that need one.
const GROUPS = '<section class="ui-drawer__section"><h3 class="ui-drawer__section-title">One</h3>'
  + '<dl class="ui-drawer__rows"><div class="ui-drawer__row"><dt>Amount</dt><dd>12.00</dd></div></dl></section>'
  + '<section class="ui-drawer__section"><h3 class="ui-drawer__section-title">Two</h3>'
  + '<dl class="ui-drawer__rows"><div class="ui-drawer__row"><dt>Source</dt><dd>Bank feed</dd></div></dl></section>';

// Each fault written on purpose, so a pass reads "looked, and found none" rather than
// "could not see". Drawn the way a page would draw it by hand, one per panel. The last
// three take a line away instead of adding one: the header's, the footer's and the one
// between the groups are the three this drawer is supposed to have.
const FAULTS = [
  { fault: 'a line on the body\'s top edge', kind: 'strayEdges', css: '.zz-fault .ui-drawer__body { border-top: 1px solid var(--border); }' },
  { fault: 'a rule under every row', kind: 'ruledRows', body: GROUPS, css: '.zz-fault .ui-drawer__row dt, .zz-fault .ui-drawer__row dd { border-bottom: 1px solid var(--border); }' },
  { fault: 'a logical rule under a group', kind: 'ruledRows', body: GROUPS, css: '.zz-fault .ui-drawer__section { border-block-end: 1px solid var(--border); }' },
  { fault: 'a rule over the first group, where there is nothing to part it from', kind: 'ruledRows', body: GROUPS, css: '.zz-fault .ui-drawer__section { border-top: 1px solid var(--border); }' },
  { fault: 'a ruled title', kind: 'ruledRows', css: '.zz-fault .ui-drawer__title { border-bottom: 1px solid var(--border); }' },
  { fault: 'an <hr> in the body', kind: 'ruledRows', body: '<p>Above</p><hr><p>Below</p>' },
  { fault: 'a box drawn by hand', kind: 'cards', body: '<div style="border: 1px solid var(--border); padding: 12px">Boxed</div>' },
  { fault: 'the header\'s line taken away', kind: 'unframed', css: '.zz-fault .ui-drawer__header { border-bottom: 0; }' },
  { fault: 'the footer\'s line taken away', kind: 'unframed', css: '.zz-fault .ui-drawer__footer { border-top: 0; }' },
  { fault: 'the line between the groups taken away', kind: 'unparted', body: GROUPS, css: '.zz-fault .ui-drawer__section + .ui-drawer__section { border-top: 0; }' },
];

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

  test(`[${theme}] every drawer is framed: a line under the header, one over the footer, none the body draws`, () => {
    const offences = subjects.flatMap((s) => [...s.unframed, ...s.strayEdges].map((e) => `${s.where}  ${e}`));
    assert.deepStrictEqual(
      offences, [],
      'a drawer has lost the line under its header or over its footer, or the body has drawn an edge of '
      + 'its own. Those two lines are what say where a scrolling body ends, and they belong to the '
      + 'header and the footer:\n  ' + offences.join('\n  '),
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
