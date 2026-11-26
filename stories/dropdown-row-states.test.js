// Rule: a dropdown row and a version row show a hover step in both themes with no outline
// (#595), and a dropdown row draws its focus ring inward so a scrolled row's ring is never clipped (#649).
// Every menu row in the shipped sheets keeps both, and a bleeding menu head keeps a gap above the
// first row (#824). A group label is bold in muted ink, so it stands apart from the options, and it
// keeps 4.5:1 on the panel in each theme and accent. A disabled option is paler than the label and
// keeps 3.5:1, so it does not read as a label (#886).
//
// Coverage limits:
// - Source only. It reads the sheet and the token values, and paints nothing. The hover
//   step and the ring's four sides are measured in a browser and reported on the PR.
// - The step is judged as colour distance between two token values, not as a contrast
//   ratio, because the fill is a non-text mark.
// - The group label and the disabled option are measured on the panel's own ground. A consumer
//   who paints the panel another colour is outside it.
// - The disabled option's weight is not read: the option rule sets none, so it keeps the row's.
//
// why: docs/foundations.md#elevation
// Weaken the rule and confirm that its test fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { AA_TEXT, colourOf, ratio, tokensFor } from './lib/contrast.js';
import { CELLS } from './lib/accessibility-walks.js';
import { DISABLED_OPTION_FLOOR } from './guidelines/_accessibility-floor.js';

import { splitSelectorList } from '../scripts/lib/selector-list.js';
const sheet = (file) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const css = sheet('src/styles/dropdown.css');
// The top bar's version rows take the dropdown's hover fill, so both sheets are read.
const ROWS = [['.ui-dropdown__item', css], ['.vopt', sheet('src/styles/topbar.css')]];
const rules = (text) => [...text.matchAll(/([^{}]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)];

/** The background `row` takes on hover in `theme`, as a token name. */
const hoverFill = (text, theme, row = '.ui-dropdown__item') => {
  const hover = new RegExp(`${row.replace('.', '\\.')}:hover$`);
  let fill = null;
  for (const [, head, body] of rules(text)) {
    const heads = splitSelectorList(head).map((h) => h.trim());
    for (const h of heads) {
      if (!hover.test(h)) continue;
      if (h.includes('data-theme') && !h.includes(`"${theme}"`)) continue;
      const m = /(?:^|;|\s)background:\s*var\((--[\w-]+)\)/.exec(body);
      if (m) fill = m[1];
    }
  }
  return fill;
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a, b) => Math.max(...rgb(a).map((v, i) => Math.abs(v - rgb(b)[i])));

for (const [row, text] of ROWS) for (const theme of ['light', 'dark']) {
  test(`a hovered ${row} row differs from the panel in ${theme}`, () => {
    const tokens = tokensFor(theme);
    const fill = hoverFill(text, theme, row);
    assert.ok(fill, `${theme}: no hover fill found`);
    const panel = tokens.get('--bg-elevated');
    assert.notEqual(tokens.get(fill).toLowerCase(), panel.toLowerCase(),
      `${theme}: the hover fill ${fill} equals the panel ground, so hover changes nothing`);
    assert.ok(distance(tokens.get(fill), panel) >= 8,
      `${theme}: the hover fill ${fill} is within 8 levels of the panel ground`);
  });
}

test('the hover gate fails when the light fill goes back to --surface', () => {
  for (const [row, text] of ROWS) {
    const weakened = text.replace(new RegExp(`(data-theme="light"\\]\\) \\${row}:hover \\{ background: )var\\(--surface-3\\)`), '$1var(--surface)');
    assert.notEqual(weakened, text, `${row}: the mutation found nothing to change`);
    const tokens = tokensFor('light');
    assert.equal(tokens.get(hoverFill(weakened, 'light', row)).toLowerCase(), tokens.get('--bg-elevated').toLowerCase());
  }
});

const inward = (text) => rules(text).filter(([, head]) =>
  splitSelectorList(head).some((h) => h.trim() === '.ui-dropdown__item:focus-visible'))
  .map(([, , body]) => body)
  .some((body) => /outline:\s*var\(--ring-scroll\)/.test(body)
    && /outline-offset:\s*var\(--ring-scroll-offset\)/.test(body));

test('a focused dropdown row draws its ring inward, so a scrolled row cannot clip it', () => {
  assert.ok(inward(css), 'the row draws an outset ring, which the list or panel clips at its edge');
});

test('the inward-ring gate fails when the row goes back to the outset ring', () => {
  const weakened = css.replace(/outline:\s*var\(--ring-scroll\);\s*outline-offset:\s*var\(--ring-scroll-offset\)/,
    'outline: var(--ring); outline-offset: var(--ring-offset)');
  assert.notEqual(weakened, css, 'the mutation found nothing to change');
  assert.equal(inward(weakened), false);
});

test('a hovered dropdown row draws no outline, because an outline means focus', () => {
  const edged = rules(css).filter(([, head]) =>
    splitSelectorList(head).some((h) => /\.ui-dropdown__item:hover$/.test(h.trim())))
    .some(([, , body]) => /outline/.test(body));
  assert.equal(edged, false, 'a hover rule paints an outline');
});

test('the hover-outline gate fails when a hover rule paints an outline', () => {
  const weakened = css.replace(/(\.ui-dropdown__item:hover \{ )background/, '$1outline: 1px solid var(--control-edge); background');
  assert.notEqual(weakened, css, 'the mutation found nothing to change');
  const edged = rules(weakened).filter(([, head]) =>
    splitSelectorList(head).some((h) => /\.ui-dropdown__item:hover$/.test(h.trim())))
    .some(([, , body]) => /outline/.test(body));
  assert.equal(edged, true);
});

// #824: the account menu's rows wrote their own hover edge and an outset ring, and the
// tests above read only dropdown.css, so they never saw it. These read every sheet the
// package ships. A menu row is found, not listed: a row class (`.ui-dropdown__item`, or
// one a React `row` adds beside it) or anything inside a panel a React menu names with
// `panelClass`. Limits: a panel or row class built at run time is not found, and a rule
// is judged by its last compound only.
const shipped = () => {
  const dirs = ['src/styles', 'react/src'];
  return dirs.flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith('.css'))
    .map((f) => [`${dir}/${f}`, sheet(`${dir}/${f}`)]));
};
const tsx = readdirSync('react/src').filter((f) => f.endsWith('.tsx')).map((f) => readFileSync(`react/src/${f}`, 'utf8')).join('\n');
const PANELS = ['ui-dropdown__panel', ...new Set([...tsx.matchAll(/panelClass=(?:"|\{`)([\w-]+)/g)].map((m) => m[1]))];
const ROW_CLASSES = ['ui-dropdown__item', ...new Set([...tsx.matchAll(/\$\{props\.className\} ([\w-]+)/g)].map((m) => m[1]))];
const flat = (text) => rules(text).flatMap(([, head, body]) => head.trim().startsWith('@') ? flat(body) : [[head, body]]);
const lastCompound = (sel) => sel.trim().split(/\s*[\s>+~]\s*/).pop();
const isRow = (sel) => {
  const last = lastCompound(sel);
  if (ROW_CLASSES.some((c) => new RegExp(`\\.${c}(?![\\w-])`).test(last))) return true;
  return PANELS.some((p) => new RegExp(`\\.${p}(?![\\w-])`).test(sel) && !new RegExp(`\\.${p}(?![\\w-])`).test(last));
};
/** Each row rule in `sheets` that breaks the row rule, as `file: selector`. */
const rowFaults = (sheets) => sheets.flatMap(([file, text]) => flat(text).flatMap(([head, body]) =>
  splitSelectorList(head).map((h) => h.trim()).filter(isRow).flatMap((h) => {
    const last = lastCompound(h);
    if (/:hover/.test(last) && !/:focus-visible/.test(last) && /outline(?!-offset)\s*:\s*(?!none)/.test(body)) return [`${file}: ${h} draws an edge on hover`];
    if (/:focus-visible/.test(last) && /outline-offset:/.test(body) && !/outline-offset:\s*var\(--ring-scroll-offset\)/.test(body)) return [`${file}: ${h} draws its ring outward`];
    return [];
  })));

test('every menu row the kit ships draws no edge on hover and its ring inward (#824)', () => {
  assert.ok(PANELS.includes('amenu') && PANELS.includes('vsw__menu') && ROW_CLASSES.includes('vopt'),
    `the menus were not found: panels ${PANELS.join(', ')}, rows ${ROW_CLASSES.join(', ')}`);
  const sheets = shipped();
  const measured = sheets.flatMap(([, text]) => flat(text).flatMap(([head]) => splitSelectorList(head).filter(isRow)));
  assert.ok(measured.length >= 20, `only ${measured.length} row selectors were measured`);
  assert.deepEqual(rowFaults(sheets), []);
});

test('the menu-row gate fails on the #824 rules', () => {
  const topbar = sheet('src/styles/topbar.css');
  const weakened = `${topbar}\n.amenu a:hover { outline: 1px solid var(--control-edge); outline-offset: -1px; }
.vopt:focus-visible { outline: var(--ring); outline-offset: var(--ring-offset); }`;
  assert.deepEqual(rowFaults([['src/styles/topbar.css', weakened]]), [
    'src/styles/topbar.css: .amenu a:hover draws an edge on hover',
    'src/styles/topbar.css: .vopt:focus-visible draws its ring outward',
  ]);
});

// A head bleeds through the panel's padding to line its edge. It keeps a gap under its
// hairline, so the first row's fill and ring stand clear of it.
/** Each bleeding head in `sheets` with no gap below it, as `file: selector`. */
/** The values of a shorthand, split at the spaces outside brackets. */
const values = (text) => {
  const out = ['']; let depth = 0;
  for (const ch of text.trim()) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && !depth) { if (out[out.length - 1]) out.push(''); } else out[out.length - 1] += ch;
  }
  return out;
};
/** The margin of a head that bleeds upward through the panel's padding, or null. */
const bleed = (body) => {
  const m = /(?:^|;)\s*margin:\s*([^;]+)/.exec(body);
  if (!/border-bottom:/.test(body) || !m) return null;
  const parts = values(m[1]);
  return /^-|\* -1\)$/.test(parts[0]) ? parts : null;
};
const flushHeads = (sheets) => sheets.flatMap(([file, text]) => flat(text).flatMap(([head, body]) => {
  const parts = bleed(body);
  if (!parts) return [];
  return parseFloat(parts[parts.length >= 3 ? 2 : 0]) > 0 ? [] : [`${file}: ${head.trim()}`];
}));

test('a menu head that bleeds to the panel edge keeps a gap above the first row (#824)', () => {
  const sheets = shipped();
  const heads = sheets.flatMap(([, text]) => flat(text).filter(([, body]) => bleed(body)));
  assert.ok(heads.length >= 2, `only ${heads.length} bleeding heads were found`);
  assert.deepEqual(flushHeads(sheets), []);
});

test('the head-gap gate fails when the account head sits flush on the first row', () => {
  const topbar = sheet('src/styles/topbar.css');
  const weakened = topbar.replace(/margin: -6px -6px 5px;/, 'margin: -6px -6px 0;');
  assert.notEqual(weakened, topbar, 'the mutation found nothing to change');
  assert.deepEqual(flushHeads([['src/styles/topbar.css', weakened]]), ['src/styles/topbar.css: .amenu .ahead']);
});

// A group label names the options under it. Bold and muted ink set it apart from an option,
// which is body weight in body ink (#886). Its size stays the option's. A disabled option takes a
// paler ink than the label, at 3.5:1 or more: the kit floor is 3:1, and the margin is the owner's.
/** What sets the group label apart in `text`, or the faults, as sentences. */
const groupFaults = (text) => {
  const body = (head) => flat(text).filter(([h]) => h.trim() === head).map(([, b]) => b).join(';');
  const group = body('.ui-dropdown__group');
  const ground = /(?:^|;)\s*background:\s*([^;]+)/.exec(body('.ui-dropdown__panel'))?.[1];
  if (!ground) return ['the panel paints no ground to measure on'];
  const faults = [];
  if (!/font-weight:\s*var\(--weight-bold\)/.test(group)) faults.push('the group label is not bold');
  if (!/(?:^|;)\s*color:\s*var\(--muted\)/.test(group)) faults.push('the group label is not in muted ink');
  const ink = /(?:^|;)\s*color:\s*([^;]+)/.exec(group)?.[1] ?? 'var(--text)';
  const off = /(?:^|;)\s*color:\s*([^;]+)/.exec(body('.ui-dropdown__item.is-disabled'))?.[1];
  if (!off) faults.push('the disabled option paints no ink of its own');
  for (const { theme, accent } of CELLS) {
    const vars = tokensFor(theme, accent);
    const panel = colourOf(ground, vars);
    const r = ratio(colourOf(ink, vars), panel);
    if (r < AA_TEXT) faults.push(`the group label has ${r.toFixed(2)}:1 on the panel in ${theme} ${accent}`);
    if (!off) continue;
    const o = ratio(colourOf(off, vars), panel);
    if (o < DISABLED_OPTION_FLOOR) faults.push(`the disabled option has ${o.toFixed(2)}:1 on the panel in ${theme} ${accent}`);
    if (o >= r) faults.push(`the disabled option is not paler than the group label in ${theme} ${accent}`);
  }
  return faults;
};

test('a group label is bold in muted ink at 4.5:1, and a disabled option is paler at 3.5:1 (#886)', () => {
  assert.equal(CELLS.length, 8, `the label was measured in ${CELLS.length} theme and accent cells, not 8`);
  assert.deepEqual(groupFaults(css), []);
});

test('the group-label gate fails when the label goes back to body weight and ink, or fades too far', () => {
  const before = css.replace('font-weight: var(--weight-bold)', 'font-weight: var(--weight-medium)')
    .replace(/(\.ui-dropdown__group \{[^}]*color: )var\(--muted\)/, '$1var(--text)');
  assert.notEqual(before, css, 'the mutation found nothing to change');
  assert.deepEqual(groupFaults(before), ['the group label is not bold', 'the group label is not in muted ink']);
  const faded = css.replace(/(\.ui-dropdown__group \{[^}]*color: )var\(--muted\)/, '$1var(--border)');
  assert.ok(groupFaults(faded).some((f) => /:1 on the panel in dark default$/.test(f)), groupFaults(faded).join('\n'));
});

test('the group-label gate fails when a disabled option takes the label ink, or fades too far', () => {
  const same = css.replace('color: var(--disabled-ink-option)', 'color: var(--disabled-ink)');
  assert.notEqual(same, css, 'the mutation found nothing to change');
  assert.equal(groupFaults(same).length, CELLS.length, groupFaults(same).join('\n'));
  assert.ok(groupFaults(same).every((f) => /^the disabled option is not paler than the group label in /.test(f)));
  const faded = css.replace('color: var(--disabled-ink-option)', 'color: var(--border-strong)');
  assert.ok(groupFaults(faded).some((f) => /^the disabled option has [\d.]+:1 on the panel in dark default$/.test(f)),
    groupFaults(faded).join('\n'));
});
