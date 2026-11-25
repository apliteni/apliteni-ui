/* Rule: every button, dropdown trigger, filter chip and select is a pill, and a wordless
 * button a circle. Every one-line typed field has the field corner and a text area or a
 * message box the larger corner. A card and a floating panel have the round corner. Where
 * the browser supports it, a card, a panel and a typed field use a squircle corner. Only
 * the controls in KEEPS draw another corner.
 * why: docs/foundations.md#control-corners, #823, #836, #874
 *
 * The subjects are discovered: every `border-radius` the shipped style sheets declare
 * (src/styles/*.css and react/src/*.css) on a selector whose subject, its last compound,
 * carries a listed class. Each must be `var(--radius-pill)` for a control, `var(--radius-lg)`
 * for a one-line field, `var(--radius-2xl)` for a text area, or `var(--radius-md)` for a
 * card or panel. Every `corner-shape: squircle` declaration must sit inside
 * `@supports (corner-shape: squircle)`, and every listed card, panel and typed field keeps
 * one. A later rule that gives a listed class another corner fails here, whatever its
 * specificity.
 *
 * Limits: the gate reads declarations, not layout. It does not prove that the padding
 * keeps text, a glyph, a unit or the ring off the rounder edge; the PR for #823 measured
 * that in Chromium. A class missing from CONTROLS, FIELDS or SURFACES is not checked, so
 * the gate fails when a listed class is no longer found, and the counts below pin what it
 * read. The squircle check reads the source, not a rendering engine, so it does not prove
 * that a browser draws the squircle or the round fallback.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHEETS = ['src/styles', 'react/src'].flatMap((dir) => readdirSync(path.join(root, dir))
  .filter((f) => f.endsWith('.css')).map((f) => `${dir}/${f}`));

// The classes a reader presses: a button, a dropdown trigger, a filter chip and its remove
// mark, a select and the back link.
const CONTROLS = ['ui-btn', 'ui-fbbtn', 'toggle', 'ui-dropdown__trigger', 'ui-filter-bar__chip',
  'ui-filter-bar__remove', 'ui-select', 'ui-pager__size-select', 'ui-app__search', 'ui-app__menu', 'ui-back'];
// The fields a reader types into. They take the field corner. #836
const FIELDS = ['ui-input', 'ui-textarea', 'ui-dropdown__search-input', 'ui-pager__jump-input'];
// Cards and floating panels: dialogs, dropdown panels, menus, callouts, toasts, success
// surfaces, code blocks and hover readouts. They take the round corner. #874
const SURFACES = ['ui-card', 'ui-auth__card', 'rx-modal', 'ui-dropdown__panel', 'ui-cmdk__panel',
  'ui-confirm__panel', 'vsw__menu', 'amenu', 'ui-callout', 'ui-toast', 'ui-success', 'ui-sx',
  'ui-snippet', 'ui-tip', 'ui-fbcomposer'];
// The controls that keep another corner, each with its reason.
const KEEPS = {
  'ui-app__user-trigger': 'In the side rail it is a rail row and keeps the rail rows’ corner. In the band it is a circle, held below.',
};
const PILL = 'var(--radius-pill)';
const FIELD = 'var(--radius-lg)';
const MESSAGE = 'var(--radius-2xl)';
const SURFACE = 'var(--radius-md)';
const cornerOf = (cls) => (cls === 'ui-textarea' ? MESSAGE
  : FIELDS.includes(cls) ? FIELD
    : SURFACES.includes(cls) ? SURFACE : PILL);

const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const classesOf = (selector) => {
  const last = selector.trim().split(/\s*[\s>+~]\s*/).pop();
  return [...last.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
};
const listedClass = (classes) => {
  const base = classes.map((c) => c.replace(/--[\w-]+$/, ''));
  return base.find((c) => c in KEEPS)
    ?? base.find((c) => CONTROLS.includes(c) || FIELDS.includes(c) || SURFACES.includes(c));
};

/** Every corner declared on a control, field or surface: { sheet, selector, cls, value }. */
export function corners(sheets) {
  const out = [];
  for (const [sheet, css] of sheets) {
    for (const m of decomment(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const value = /(?:^|;)\s*border-radius\s*:\s*([^;]+)/.exec(m[2])?.[1].trim();
      if (!value) continue;
      for (const selector of splitSelectorList(m[1].trim())) {
        // A modifier such as ui-btn--lg is the control it modifies.
        const cls = listedClass(classesOf(selector));
        if (cls) out.push({ sheet, selector: selector.trim().replace(/\s+/g, ' '), cls, value });
      }
    }
  }
  return out;
}

/** The bodies of every `@supports (corner-shape: squircle)` block, brace-matched so the
 * inner rules' braces do not end the block, and the sheet with those blocks removed. */
const squircleBodies = (css) => {
  const bodies = [];
  const rest = [];
  let pos = 0;
  const open = /@supports\s*\(corner-shape:\s*squircle\)\s*\{/g;
  for (const m of css.matchAll(open)) {
    let depth = 0;
    let end = -1;
    for (let i = m.index + m[0].length - 1; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    rest.push(css.slice(pos, m.index));
    bodies.push(css.slice(m.index + m[0].length, end));
    pos = end + 1;
  }
  rest.push(css.slice(pos));
  return { bodies, rest: rest.join('') };
};

/** Every squircle corner declared: { sheet, selector, cls, guarded }. Guarded means inside
 * `@supports (corner-shape: squircle)`, so a browser without it keeps the round fallback. */
export function squircleCorners(sheets) {
  const out = [];
  for (const [sheet, css] of sheets) {
    const clean = decomment(css);
    const { bodies, rest } = squircleBodies(clean);
    const readOne = (text, guarded) => {
      for (const r of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!/corner-shape\s*:\s*squircle/.test(r[2])) continue;
        for (const selector of splitSelectorList(r[1].trim())) {
          out.push({ sheet, selector: selector.trim().replace(/\s+/g, ' '),
            cls: listedClass(classesOf(selector)), guarded });
        }
      }
    };
    for (const body of bodies) readOne(body, true);
    readOne(rest, false);
  }
  return out;
}

/** What breaks the rule: a control, field or surface with the wrong corner, a listed class
 * never found, and a squircle that is unguarded or missing from a card, panel or field. */
export function faults(allCorners, squircles) {
  const out = allCorners.filter((c) => !(c.cls in KEEPS) && c.value !== cornerOf(c.cls))
    .map((c) => `${c.sheet}: ${c.selector} has corner ${c.value}, not ${cornerOf(c.cls)}`);
  for (const cls of [...CONTROLS, ...FIELDS, ...SURFACES]) {
    if (!allCorners.some((c) => c.cls === cls && c.value === cornerOf(cls))) out.push(`.${cls}: no ${cornerOf(cls)} corner found, so it was not measured`);
  }
  // A wordless button in the band: the account trigger is a circle there. #834
  const band = allCorners.find((c) => c.selector === '.ui-app__bar .ui-app__user-trigger');
  if (band?.value !== PILL) out.push(`.ui-app__bar .ui-app__user-trigger: corner ${band?.value}, not ${PILL}`);
  for (const s of squircles) {
    if (!s.guarded) out.push(`${s.sheet}: ${s.selector} has corner-shape: squircle outside @supports`);
  }
  for (const cls of [...SURFACES, ...FIELDS]) {
    if (!squircles.some((s) => s.cls === cls)) out.push(`.${cls}: no squircle corner found, so it was not measured`);
  }
  return out;
}

const read = (sheet) => readFileSync(path.join(root, sheet), 'utf8');
const sheets = (mutation) => SHEETS.map((sheet) => {
  const css = read(sheet);
  if (!mutation || mutation[1] !== sheet) return [sheet, css];
  const broken = css.replace(mutation[2], mutation[3]);
  assert.notEqual(broken, css, `${mutation[0]}: the mutation did not apply, so it proves nothing`);
  return [sheet, broken];
});

test('every control is a pill, every field and surface has its corner, and every squircle is guarded', (t) => {
  const allCorners = corners(sheets());
  const squircles = squircleCorners(sheets());
  for (const c of allCorners) t.diagnostic(`${c.sheet}: ${c.selector} ${c.value}`);
  for (const s of squircles) t.diagnostic(`${s.sheet}: ${s.selector} ${s.guarded ? 'guarded' : 'UNGUARDED'}`);
  assert.deepEqual(faults(allCorners, squircles), []);
  // What the tree holds today. A lower count means a class lost its declaration.
  // 18 since #847: a band action's Button and dropdown trigger take the band's 40px pill on a phone.
  assert.equal(allCorners.filter((c) => c.value === PILL).length, 18, 'pill corners read');
  assert.equal(allCorners.filter((c) => c.value === FIELD).length, 4, 'one-line field corners read');
  assert.equal(allCorners.filter((c) => c.value === MESSAGE).length, 1, 'message box corners read');
  assert.equal(allCorners.filter((c) => c.value === SURFACE).length, 15, 'card and panel corners read');
  assert.equal(squircles.filter((s) => s.guarded).length, 27, 'guarded squircle corners read');
  assert.equal(squircles.filter((s) => !s.guarded).length, 0, 'no unguarded squircle corner');
  assert.ok(SHEETS.length >= 45, `${SHEETS.length} style sheets read`);
});

// Each mutation puts back a corner the kit drew before #874, or drops a squircle. The gate
// must reject each.
const MUTATIONS = [
  ['the button back on --radius-sm', 'src/styles/button.css', /(line-height: var\(--leading-tight\);\n  border-radius: )var\(--radius-pill\)/, '$1var(--radius-sm)'],
  ['the large button on --radius-md', 'src/styles/button.css', /(--btn-font: var\(--text-md\);) \}/, '$1 border-radius: var(--radius-md); }'],
  ['the field trigger on the old input corner', 'src/styles/dropdown.css', /(\.ui-field > \.ui-dropdown > \.ui-dropdown__trigger \{\n)/, '$1  border-radius: var(--radius-md);\n'],
  ['the filter chip back on --radius-sm', 'src/styles/filter-bar.css', /(var\(--control-edge\); border-radius: )var\(--radius-pill\)/, '$1var(--radius-sm)'],
  ['the text input back on the pill', 'src/styles/input.css', /(\.ui-input \{ border-radius: )var\(--radius-lg\)/, '$1var(--radius-pill)'],
  ['the message box back on the one-line corner', 'src/styles/input.css', /(\.ui-textarea \{ border-radius: )var\(--radius-2xl\)/, '$1var(--radius-lg)'],
  ['the dropdown search field back on the pill', 'src/styles/dropdown.css', /(border-radius: )var\(--radius-lg\)(; \/\* The one-line field corner)/, '$1var(--radius-pill)$2'],
  ['the select on the field corner', 'src/styles/input.css', /(\.ui-select \{\n  border-radius: )var\(--radius-pill\)/, '$1var(--radius-md)'],
  ['the account button in the band on --radius-sm', 'src/styles/layout.css', /(justify-content: center;\n  border-radius: )var\(--radius-pill\)/, '$1var(--radius-sm)'],
  ['the back link on --radius-sm', 'src/styles/back.css', /(\n  border-radius: )var\(--radius-pill\)/, '$1var(--radius-sm)'],
  ['the card back on the field corner', 'src/styles/card.css', /(\.ui-card \{\n[\s\S]*?  border-radius: )var\(--radius-md\)/, '$1var(--radius-lg)'],
  ['the dropdown panel back on the field corner', 'src/styles/dropdown.css', /(\.ui-dropdown__panel \{\n[\s\S]*?  border-radius: )var\(--radius-md\)/, '$1var(--radius-lg)'],
  ['the card squircle dropped', 'src/styles/card.css', /\n@supports \(corner-shape: squircle\) \{\n  \.ui-card, \.ui-card__viewer > \.ui-table-scroll \{ corner-shape: squircle; \}\n\}/, ''],
];
for (const mutation of MUTATIONS) {
  test(`the gate rejects ${mutation[0]}`, () => {
    assert.notDeepEqual(faults(corners(sheets(mutation)), squircleCorners(sheets(mutation))), []);
  });
}
