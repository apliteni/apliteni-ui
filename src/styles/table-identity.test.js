/* Rule: on a phone a pinned identity cell is one line of identity wide — never a
 * wrapped sliver, and never wider than its cap.
 *
 * The defect (#500): `width: 1%` sized the pinned column to its longest WORD, so
 * "North region" or a name over a sub-line wrapped and the column became tall and
 * thin. Nothing but a consumer restyle of the kit's own cell could widen it.
 *
 * What this measures: the shipped stylesheet, flattened for ONE viewport width and
 * resolved against real markup. Three cell shapes are mounted — the kit's own
 * `rowIdentity()`, a two-word plain-text cell, and a name over a sub-line — and the
 * winning declarations are read back at 390 and again at 1280, so a rule that stops
 * reaching the cell, or starts reaching the desktop, fails here.
 *
 * Its limits, stated rather than assumed:
 *   - JSDOM models no layout. This proves which declarations reach the cell, not the
 *     drawn line box. Chromium measured the drawn box for #500: at 390 the plain
 *     cell is 195px with the text cut at its edge, a sub-line cell is two lines
 *     (45.4px), and a focused company link keeps its whole ring.
 *   - The cap's `min()` is evaluated here, because JSDOM reports
 *     `min(320px, 50vw)` as `320px` at every width.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { substitute, tokensFor } from '../../stories/lib/contrast.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}
const { rowIdentity } = await import('../components/table-values.js');

const CSS = read('src/styles/table.css');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/** `(max-width: 720px)`, `(min-width: 721px)` and their conjunctions. Anything else
 *  is a case this gate cannot judge, so it stops rather than passing over it. */
function mediaApplies(condition, width) {
  return condition.split(/\s+and\s+/).map((part) => part.trim()).every((part) => {
    const m = /^\((max|min)-width:\s*(\d+(?:\.\d+)?)px\)$/.exec(part);
    assert.ok(m, `table.css asks a media condition this gate cannot evaluate: ${part}`);
    return m[1] === 'max' ? width <= Number(m[2]) : width >= Number(m[2]);
  });
}

/** The stylesheet as it stands at one viewport width: top-level rules in source
 *  order, with the body of every media block that applies spliced in at its place. */
function sheetAt(width) {
  const css = decomment(CSS);
  let out = '';
  for (let i = 0; i < css.length;) {
    const at = css.indexOf('@media', i);
    if (at < 0) { out += css.slice(i); break; }
    out += css.slice(i, at);
    const open = css.indexOf('{', at);
    const condition = css.slice(at + '@media'.length, open).trim();
    let depth = 1;
    let end = open + 1;
    for (; end < css.length && depth; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}') depth--;
    }
    if (mediaApplies(condition, width)) out += css.slice(open + 1, end - 1);
    i = end;
  }
  return substitute(out, tokensFor('light', 'default'));
}

/** `min(320px, 50vw)` at a viewport width, in px. The one piece of arithmetic JSDOM
 *  will not do for us. */
function evaluateLength(value, width) {
  const min = /^min\((.+)\)$/.exec(value.trim());
  const parts = (min ? min[1] : value).split(',').map((p) => p.trim());
  const lengths = parts.map((part) => {
    const px = /^(-?\d+(?:\.\d+)?)px$/.exec(part);
    if (px) return Number(px[1]);
    const vw = /^(-?\d+(?:\.\d+)?)vw$/.exec(part);
    assert.ok(vw, `the identity cap uses a length this gate cannot evaluate: ${part}`);
    return (Number(vw[1]) / 100) * width;
  });
  return Math.min(...lengths);
}

/** The three shapes a pinned identity cell is built in, mounted in one table. */
function cellsAt(width) {
  const document = dom.window.document;
  document.head.innerHTML = `<style>${sheetAt(width)}</style>`;
  document.body.innerHTML = `<table class="ui-table ui-table--compact ui-table--sticky ui-table--pinned">
    <tbody>
      <tr><td class="ui-table__identity" id="kit">${rowIdentity({ symbol: 'NORT', name: 'Northstar Analytics Incorporated', href: '#company' })}</td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="plain">North region</td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="sub"><div>North region</div><div class="ui-table__code">EU-NORTH-1 district office</div></td><td class="ui-table__num">1.00</td></tr>
    </tbody></table>`;
  const style = (sel) => dom.window.getComputedStyle(document.querySelector(sel));
  return { style, shapes: ['#kit', '#plain', '#sub'] };
}

/** Every declaration the phone block writes on an identity, as `property` names. */
function phoneIdentityDeclarations() {
  const css = decomment(CSS);
  const at = css.indexOf('@media (max-width: 720px)');
  assert.ok(at > 0, 'the phone block for pinned identities is gone from table.css');
  const open = css.indexOf('{', at);
  let depth = 1;
  let end = open + 1;
  for (; end < css.length && depth; end++) {
    if (css[end] === '{') depth++;
    else if (css[end] === '}') depth--;
  }
  const out = [];
  for (const [, selector, body] of css.slice(open + 1, end - 1).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selector.includes('identity')) continue;
    for (const declaration of body.split(';')) {
      const i = declaration.indexOf(':');
      if (i < 0) continue;
      out.push({ selector: selector.trim(), property: declaration.slice(0, i).trim(), value: declaration.slice(i + 1).trim() });
    }
  }
  return out;
}

// Each is asserted below; a declaration outside this list is a case nobody measured.
const MEASURED = ['width', 'max-width', 'min-width', 'white-space', 'overflow', 'overflow-clip-margin', 'text-overflow', 'display'];

/** What the phone block writes for one property on one selector, as source text. */
function declaredOn(selector, property) {
  const match = phoneIdentityDeclarations().find((d) => d.selector.endsWith(selector) && d.property === property);
  assert.ok(match, `the phone block writes no ${property} on ${selector}`);
  return match.value;
}

test('at 390 a pinned identity cell holds one line and cuts the rest', () => {
  const { style, shapes } = cellsAt(390);
  const cap = /--ui-table-identity-max:\s*([^;}]+)/.exec(substitute(decomment(CSS), tokensFor('light', 'default')));
  assert.ok(cap, 'the identity cap property is gone, so a consumer has nothing to retune');
  const capPx = evaluateLength(cap[1], 390);
  assert.ok(capPx > 0 && capPx <= 195, `the cap leaves the columns beside it no room: ${capPx}px of 390`);

  let measured = 0;
  for (const shape of shapes) {
    const cell = style(shape);
    assert.equal(cell.whiteSpace, 'nowrap', `${shape} still wraps, which is the sliver #500 reported`);
    assert.ok(['clip', 'hidden'].includes(cell.overflow), `${shape} does not cut what passes its cap: ${cell.overflow}`);
    assert.equal(cell.textOverflow, 'ellipsis', `${shape} cuts its text without saying so`);
    // JSDOM reports `min(320px, 50vw)` as `320px`, so the cap is read from the
    // stylesheet and evaluated above; what is checked here is that it reaches the cell.
    assert.match(declaredOn(shape === '#kit' || shape === '#plain' || shape === '#sub' ? '.ui-table__identity' : shape, 'max-width'), /--ui-table-identity-max/, `${shape} is not capped by --ui-table-identity-max`);
    assert.notEqual(cell.maxWidth.trim(), '', `${shape} reaches no cap at all`);
    measured++;
  }
  assert.equal(measured, shapes.length, 'a mounted shape went unmeasured');

  // The ring is the reason the cut is `clip` with a margin: a 4px row inset leaves
  // a focused link's glow nowhere else to go.
  assert.ok(evaluateLength(style('#plain').overflowClipMargin, 390) >= 12,
    'the cut leaves a focused link no room for its ring');

  // A sub-line is its own block, so the cell's own ellipsis cannot reach it.
  const subLine = style('#sub .ui-table__code');
  assert.equal(subLine.textOverflow, 'ellipsis', 'a sub-line is cut without saying so');
  assert.ok(['clip', 'hidden'].includes(subLine.overflow), `a sub-line runs past the cap: ${subLine.overflow}`);

  const name = style('#kit .ui-identity__name');
  assert.equal(name.whiteSpace, 'nowrap', 'the name wraps inside the cell');
  assert.equal(name.textOverflow, 'ellipsis', 'a long name is cut without saying so');
  assert.notEqual(name.position, 'absolute', 'the name is hidden again rather than shown on one line');
  assert.ok(['', 'none'].includes(name.clipPath), 'the name is clipped out of view rather than shown');
  assert.equal(style('#kit .ui-identity__logo').display, 'none', 'the logo is back in the narrow column');
});

test('at 1280 the phone rules are off and the desktop identity is what it was', () => {
  const { style, shapes } = cellsAt(1280);
  for (const shape of shapes) {
    assert.equal(style(shape).maxWidth.trim(), 'none', `${shape} took the phone cap to the desktop`);
    assert.ok(['', 'clip'].includes(style(shape).textOverflow), `${shape} cuts its text on the desktop`);
  }
  // The desktop composition, unchanged by #500: the name wraps inside its own cap and
  // the logo is drawn.
  assert.equal(style('#kit .ui-identity__name').whiteSpace, 'normal', 'the desktop name stopped wrapping');
  assert.notEqual(style('#kit .ui-identity__logo').display, 'none', 'the desktop lost the identity logo');
});

test('every phone-width identity declaration is one this gate measures', () => {
  const declarations = phoneIdentityDeclarations();
  assert.ok(declarations.length >= 8, `the phone block shrank to ${declarations.length} declarations; what is no longer written is no longer measured`);
  assert.deepEqual(
    declarations.filter((d) => !MEASURED.includes(d.property)),
    [],
    'a declaration reaches the pinned identity at phone width that no case here measures',
  );
});
