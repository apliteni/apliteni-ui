/**
 * Rule: a menu trigger keeps its hover answer while it is pressed and while its menu is
 * open, as a select does. A trigger that drops its edge or its ground, such as the filter
 * chip, a band control or the account block, otherwise shows nothing once the pointer
 * leaves an open menu, and nothing under a finger. rev_cac4d2ac968c/d66, #915
 *
 * It discovers the triggers: the kit's `.ui-dropdown__trigger`, every `triggerClass`
 * that a React component gives a Dropdown, and each `--` variant of them that a sheet names. In every sheet, each rule that answers the
 * pointer on one of them needs the pressed trigger and the trigger of an open menu in a rule
 * of the same sheet with the same paint. It reads selectors, not the cascade; the filter chip's edge is read in
 * filter-bar.test.js and in a browser in stories/filter-chip-width.test.js.
 * why: docs/components.md#dropdown
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const listed = (dir, ext) => readdirSync(path.join(root, dir)).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const SHEETS = [...listed('src/styles', '.css'), ...listed('react/src', '.css')];
const BASES = ['ui-dropdown__trigger', ...new Set(listed('react/src', '.tsx')
  .filter((f) => !/\.(test|stories)\.tsx$/.test(f))
  .flatMap((f) => [...read(f).matchAll(/triggerClass="([\w-]+)"/g)].map((m) => m[1])))];
/** Each base and every `--` variant of it that a sheet names, such as the ghost trigger. */
const TRIGGERS = [...new Set([...BASES, ...SHEETS.flatMap((f) => BASES.flatMap((b) =>
  [...read(f).matchAll(new RegExp(`\\.(${b}--[\\w-]+)`, 'g'))].map((m) => m[1])))])];

/** Close the spaces inside parentheses, so a compound splits on its combinators only. */
const tight = (s) => s.trim().replace(/\s+/g, ' ').replace(/\(([^()]*)\)/g, (m) => m.replace(/\s+/g, ''));
const compounds = (s) => tight(s).replace(/\s*>\s*/g, ' > ').split(' ').filter((c) => c !== '>');
const subject = (s) => compounds(s).at(-1);
const HOVER = /:hover|:is\(:hover,:active\)/;
const OFF = /:disabled|aria-disabled/;
const names = (compound, cls) => new RegExp(`\\.${cls}(?![\\w-])`).test(compound);

/** The at-rule blocks of a sheet, so a rule is compared only with rules under the same query. */
const blocks = (css) => [...css.matchAll(/@[^{};]+\{/g)].map((m) => {
  let depth = 1; let i = m.index + m[0].length;
  for (; depth && i < css.length; i += 1) depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
  return { at: tight(m[0].slice(0, -1)), from: m.index, to: i };
});
const rulesOf = (css) => {
  const text = decomment(css);
  const at = blocks(text);
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => !m[1].trimStart().startsWith('@'))
    .map((m) => ({ list: splitSelectorList(m[1]).map(tight), body: m[2],
      media: at.filter(({ from, to }) => from < m.index && m.index < to).map((b) => b.at).join(' ') }));
};
const PAINT = ['background', 'background-color', 'border-color', 'color', '--ui-dropdown-field-edge'];
/** The paint a rule body declares, so a state rule elsewhere in the sheet must declare the same. */
const paintOf = (body) => PAINT.map((p) => (new RegExp(`(?:^|[;\\s])${p}\\s*:\\s*([^;]+)`).exec(body)?.[1] ?? '').trim()).join('|');
const withoutOpen = (c) => c.replace(/\.open(?![\w-])/, '');
/** An open trigger cannot be off, and an open rule without the focus guard covers focus too, so
 *  these two narrowing filters may be absent from an open selector. */
const unguarded = (c) => c.replace(/:enabled|:not\(:focus-visible\)/g, '');

/** Each live pointer answer on a trigger, with the states the sheet lacks for it. A pressed or
 *  open selector counts in any rule of the same sheet, under the same query, with the same paint. */
function sweep(sheets) {
  return sheets.flatMap(([file, css]) => {
    const rules = rulesOf(css);
    const all = rules.flatMap(({ list, body, media }) => list.map((t) => ({ t, paint: paintOf(body) + media })));
    return rules.flatMap(({ list, body, media }) => list
      .filter((s) => TRIGGERS.some((cls) => names(subject(s), cls)) && HOVER.test(subject(s)) && !OFF.test(subject(s)))
      .map((s) => {
        const paint = paintOf(body) + media;
        const rest = subject(s).replace(HOVER, '');
        const above = compounds(s).slice(0, -1);
        const pressed = /:is\(:hover,:active\)/.test(subject(s))
          || all.some(({ t, paint: p }) => p === paint && t === s.replace(/:hover(?=[^:]*$|:)/, ':active'));
        const open = all.some(({ t, paint: p }) => {
          const up = compounds(t).slice(0, -1);
          return p === paint && unguarded(subject(t)) === unguarded(rest) && up.some((c) => /\.open(?![\w-])/.test(c))
            && above.every((c) => up.map(withoutOpen).includes(c));
        });
        return { file, selector: s, missing: [!pressed && 'pressed', !open && 'open'].filter(Boolean) };
      }));
  });
}

const KIT = SHEETS.map((f) => [f, read(f)]);
const found = sweep(KIT);

test('the gate finds the account block and every pointer answer on a menu trigger', () => {
  assert.ok(TRIGGERS.includes('ui-app__user-trigger'), `triggers: ${TRIGGERS}`);
  const files = new Set(found.map(({ file }) => file));
  for (const f of ['src/styles/dropdown.css', 'src/styles/filter-bar.css', 'src/styles/layout.css', 'react/src/AppShell.css']) {
    assert.ok(files.has(f), `no trigger answer read in ${f}`);
  }
  // 17: the select live and invalid; the ghost trigger's edge and fill; the filter chip and
  // the add control; the account block on the rail, in the drawer and on the phone band; the
  // head control; the band actions on a phone and wider; the band control; the topbar view
  // switch and avatar; a column menu; a selection bar control (#911). A new trigger answer changes this count, so read it
  // before you raise it. dropdown-trigger-edge.test.js counts 14 edge scopes: it reads the
  // ghost's edge as one scope and its fill not at all.
  assert.ok(TRIGGERS.includes('ui-dropdown__trigger--ghost'), `triggers: ${TRIGGERS}`);
  assert.equal(found.length, 17, found.map(({ file, selector }) => `${file}: ${selector}`).join('\n'));
});

test('every menu trigger keeps its hover answer while pressed and while its menu is open', () => {
  const short = found.filter(({ missing }) => missing.length);
  assert.deepEqual(short.map(({ file, selector, missing }) => `${file}: ${selector} lacks ${missing.join(' and ')}`), []);
});

test('the sweep refuses a band trigger that answers only the pointer', () => {
  const sheet = KIT.find(([f]) => f === 'react/src/AppShell.css')[1];
  const shell = sheet
    .replace('.ui-react-app__band-actions > .ui-dropdown > .ui-dropdown__trigger:hover,\n.ui-react-app__band-actions > .ui-dropdown > .ui-dropdown__trigger:active {',
      '.ui-react-app__band-actions > .ui-dropdown > .ui-dropdown__trigger:hover {')
    .replace('\n.ui-react-app__band-actions > .ui-dropdown.open > .ui-dropdown__trigger { background: var(--surface);',
      '\n.ui-react-app__band-actions > .ui-dropdown.open > .ui-dropdown__trigger { background: var(--surface-3);');
  assert.notEqual(shell, sheet, 'the mutation changed nothing');
  const caught = sweep([['react/src/AppShell.css', shell]]).filter(({ missing }) => missing.length);
  assert.deepEqual(caught.map(({ selector, missing }) => [selector, missing]),
    [['.ui-react-app__band-actions > .ui-dropdown > .ui-dropdown__trigger:hover', ['pressed', 'open']]]);
});

test('the sweep refuses a select edge that leaves the open menu', () => {
  const dropdown = KIT.find(([f]) => f === 'src/styles/dropdown.css')[1]
    .replace('.ui-dropdown.open > .ui-dropdown__trigger:enabled:not(:focus-visible),', '.ui-dropdown__trigger:enabled:focus-within:not(:focus-visible),');
  assert.notEqual(dropdown, KIT.find(([f]) => f === 'src/styles/dropdown.css')[1], 'the mutation changed nothing');
  const caught = sweep([['src/styles/dropdown.css', dropdown]]).filter(({ missing }) => missing.length);
  assert.deepEqual(caught.map(({ selector, missing }) => [selector, missing]), [['.ui-dropdown__trigger:enabled:hover:not(:focus-visible)', ['open']]]);
});

test('the sweep refuses a ghost trigger that drops its answer while pressed', () => {
  const sheet = KIT.find(([f]) => f === 'src/styles/dropdown.css')[1];
  const dropdown = sheet.replaceAll('.ui-dropdown__trigger--ghost:enabled:active:not(:focus-visible),\n', '');
  assert.equal(sheet.length - dropdown.length, 2 * '.ui-dropdown__trigger--ghost:enabled:active:not(:focus-visible),\n'.length, 'the mutation did not remove both ghost pressed selectors');
  const caught = sweep([['src/styles/dropdown.css', dropdown]]).filter(({ missing }) => missing.length);
  assert.deepEqual(caught.map(({ selector, missing }) => [selector, missing]), [
    ['.ui-dropdown__trigger--ghost:enabled:hover:not(:focus-visible)', ['pressed']],
    ['.ui-dropdown__trigger--ghost:enabled:hover:not(:focus-visible)', ['pressed']],
  ]);
});
