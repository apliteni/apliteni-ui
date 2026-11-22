/* Rule: every button, dropdown trigger, filter chip and select is a pill, and a wordless
 * button a circle. Every field that takes text has the field corner. Only the controls in
 * KEEPS draw another corner.
 * why: docs/foundations.md#control-corners, #823, #836
 *
 * The subjects are discovered: every `border-radius` the shipped style sheets declare
 * (src/styles/*.css and react/src/*.css) on a selector whose subject, its last compound,
 * carries a control class. Each must be `var(--radius-pill)`, or `var(--radius-md)` for a
 * class in FIELDS. A later rule that gives a control another corner fails here, whatever
 * its specificity.
 *
 * Limits: the gate reads declarations, not layout. It does not prove that the padding
 * keeps text, a glyph, a unit or the ring off the rounder edge; the PR for #823 measured
 * that in Chromium. A control class missing from CONTROLS is not checked, so the gate
 * fails when a listed class is no longer found, and the count below pins what it read.
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
// The controls that keep another corner, each with its reason.
const KEEPS = {
  'ui-app__user-trigger': 'In the side rail it is a rail row and keeps the rail rows’ corner. In the band it is a circle, held below.',
};
const PILL = 'var(--radius-pill)';
const FIELD = 'var(--radius-md)';
const cornerOf = (cls) => (FIELDS.includes(cls) ? FIELD : PILL);

const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const classesOf = (selector) => {
  const last = selector.trim().split(/\s*[\s>+~]\s*/).pop();
  return [...last.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
};

/** Every corner declared on a control: { sheet, selector, cls, value }. */
export function controlCorners(sheets) {
  const out = [];
  for (const [sheet, css] of sheets) {
    for (const m of decomment(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const value = /(?:^|;)\s*border-radius\s*:\s*([^;]+)/.exec(m[2])?.[1].trim();
      if (!value) continue;
      for (const selector of splitSelectorList(m[1].trim())) {
        const classes = classesOf(selector);
        // A modifier such as ui-btn--lg is the control it modifies.
        const base = classes.map((c) => c.replace(/--[\w-]+$/, ''));
        const cls = base.find((c) => c in KEEPS) ?? base.find((c) => CONTROLS.includes(c) || FIELDS.includes(c));
        if (cls) out.push({ sheet, selector: selector.trim().replace(/\s+/g, ' '), cls, value });
      }
    }
  }
  return out;
}

/** What breaks the rule: a control or a field with the wrong corner, and a listed class never found. */
export function faults(corners) {
  const out = corners.filter((c) => !(c.cls in KEEPS) && c.value !== cornerOf(c.cls))
    .map((c) => `${c.sheet}: ${c.selector} has corner ${c.value}, not ${cornerOf(c.cls)}`);
  for (const cls of [...CONTROLS, ...FIELDS]) {
    if (!corners.some((c) => c.cls === cls && c.value === cornerOf(cls))) out.push(`.${cls}: no ${cornerOf(cls)} corner found, so it was not measured`);
  }
  // A wordless button in the band: the account trigger is a circle there. #834
  const band = corners.find((c) => c.selector === '.ui-app__bar .ui-app__user-trigger');
  if (band?.value !== PILL) out.push(`.ui-app__bar .ui-app__user-trigger: corner ${band?.value}, not ${PILL}`);
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

test('every control is a pill and every field has the field corner, except the controls that keep their corner', (t) => {
  const corners = controlCorners(sheets());
  for (const c of corners) t.diagnostic(`${c.sheet}: ${c.selector} ${c.value}`);
  assert.deepEqual(faults(corners), []);
  // What the tree holds today. A lower count means a control lost its declaration.
  // 18 since #847: a band action's Button and dropdown trigger take the band's 40px pill on a phone.
  assert.equal(corners.filter((c) => c.value === PILL).length, 18, 'pill corners read');
  assert.equal(corners.filter((c) => c.value === FIELD).length, 5, 'field corners read');
  assert.ok(SHEETS.length >= 45, `${SHEETS.length} style sheets read`);
});

// Each mutation puts back a corner the kit drew before #823. The gate must reject each.
const MUTATIONS = [
  ['the button back on --radius-sm', 'src/styles/button.css', /(line-height: var\(--leading-tight\);\n  border-radius: )var\(--radius-pill\)/, '$1var(--radius-sm)'],
  ['the large button on --radius-md', 'src/styles/button.css', /(--btn-font: var\(--text-md\);) \}/, '$1 border-radius: var(--radius-md); }'],
  ['the field trigger on the old input corner', 'src/styles/dropdown.css', /(\.ui-field > \.ui-dropdown > \.ui-dropdown__trigger \{\n)/, '$1  border-radius: var(--radius-md);\n'],
  ['the filter chip back on --radius-sm', 'src/styles/filter-bar.css', /(var\(--control-edge\); border-radius: )var\(--radius-pill\)/, '$1var(--radius-sm)'],
  ['the text input back on the pill', 'src/styles/input.css', /(\.ui-input,\n\.ui-textarea \{ border-radius: )var\(--radius-md\)/, '$1var(--radius-pill)'],
  ['the dropdown search field back on the pill', 'src/styles/dropdown.css', /(border-radius: )var\(--radius-md\)(; \/\* The field corner)/, '$1var(--radius-pill)$2'],
  ['the select on the field corner', 'src/styles/input.css', /(\.ui-select \{\n  border-radius: )var\(--radius-pill\)/, '$1var(--radius-md)'],
  ['the account button in the band on --radius-sm', 'src/styles/layout.css', /(justify-content: center;\n  border-radius: )var\(--radius-pill\)/, '$1var(--radius-sm)'],
  ['the back link on --radius-sm', 'src/styles/back.css', /(\n  border-radius: )var\(--radius-pill\)/, '$1var(--radius-sm)'],
];
for (const mutation of MUTATIONS) {
  test(`the gate rejects ${mutation[0]}`, () => {
    assert.notDeepEqual(faults(controlCorners(sheets(mutation))), []);
  });
}
