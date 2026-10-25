// What tooltip.css guarantees about the hover readout, read as text: showing a
// readout moves nothing on the page. JSDOM has no layout, so the defect this holds
// is a declaration that puts the readout back into flow. The React Tooltip's own
// tests drive the placement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const CSS = readFileSync(new URL('./tooltip.css', import.meta.url), 'utf8');
const TIP = readFileSync(new URL('../../react/src/tip.ts', import.meta.url), 'utf8');

/** Every leaf rule in a sheet as { selector, body }, comments stripped. */
function rules(css) {
  const out = [];
  const open = [];
  let buf = '';
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '{') { open.push(buf.trim()); buf = ''; } else if (ch === '}') {
      const selector = open.pop() ?? '';
      if (buf.trim()) out.push({ selector, body: buf.trim() });
      buf = '';
    } else buf += ch;
  }
  return out;
}

const RULES = rules(CSS);
const decl = (rule, prop) => {
  const m = [...rule.body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`, 'g'))];
  return m.length ? m[m.length - 1][1].trim() : null;
};
// A rule about the readout box itself — not its host, not its parts.
const isReadout = (selector) => splitSelectorList(selector).some((s) => /\.ui-tip(?![\w-])/.test(s));
const base = RULES.find((r) => r.selector.trim() === '.ui-tip');

// ---- The stylesheet ------------------------------------------------------
// The subjects are discovered from the sheet, so a new state joins the sweep by
// being written.
// Discover subjects from source and check the coverage count.

test('the readout is out of flow in every state the sheet gives it', () => {
  const subjects = RULES.filter((r) => isReadout(r.selector));
  assert.ok(subjects.length >= 3, `found ${subjects.length} readout rules — the sweep is broken, not the sheet`);
  assert.equal(decl(base, 'position'), 'absolute', 'the base readout is absolutely placed');
  for (const rule of subjects) {
    const position = decl(rule, 'position');
    if (position === null) continue;
    assert.match(
      position, /^(absolute|fixed)$/,
      `${rule.selector} puts the readout in flow (position: ${position}), and a readout in flow `
      + 'pushes the page when it opens — the fault this component exists to prevent',
    );
  }
});

test('opening the readout changes paint, never a box', () => {
  const open = RULES.find((r) => r.selector.trim() === '.ui-tip.is-open');
  assert.ok(open, 'the sheet has no open state');
  const props = [...open.body.matchAll(/(?:^|;)\s*([\w-]+)\s*:/g)].map((m) => m[1]);
  assert.deepEqual(props.sort(), ['opacity', 'visibility'],
    'the open state may only change opacity and visibility — a size, a display or a margin in it '
    + 'is a readout that takes up room the moment it appears');
});

test('the readout never takes the pointer', () => {
  assert.equal(decl(base, 'pointer-events'), 'none');
});

test('both placements read one gap, so neither can drift from the other', () => {
  const gap = decl(base, '--ui-tip-gap');
  assert.match(gap, /^\d+(\.\d+)?px$/, '--ui-tip-gap is declared on the readout as a length');
  const offsets = RULES.filter((r) => isReadout(r.selector)).map((r) => decl(r, 'translate')).filter(Boolean);
  assert.ok(offsets.length >= 2, 'an above offset and a below one');
  for (const value of offsets) {
    assert.match(value, /var\(--ui-tip-gap\)/, `${value} writes its own offset instead of reading --ui-tip-gap`);
  }
});

test('the React placement falls back to the number the sheet declares', () => {
  const css = parseFloat(decl(base, '--ui-tip-gap'));
  const js = parseFloat(/const TIP_GAP = ([\d.]+)/.exec(TIP)?.[1]);
  assert.equal(js, css, 'TIP_GAP in react/src/tip.ts is the fallback for a document without the sheet');
});
