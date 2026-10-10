/* Reading a stylesheet the way one viewport width reads it.
 *
 * JSDOM evaluates no media queries, so a gate that wants to know what a phone gets
 * has to flatten the sheet itself: top-level rules in source order, with the body of
 * every media block that applies spliced in where it stood. Both table gates ask that
 * question of src/styles/table.css at three widths, so the arithmetic lives here once
 * while each gate keeps its own subjects and its own coverage count.
 *
 * why: docs/foundations.md#breakpoints
 */
import assert from 'node:assert/strict';
import { substitute, tokensFor } from './contrast.js';

/** Blank out comments. A declaration inside one is not a declaration. */
export const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/** `(max-width: 720px)`, `(min-width: 561px)` and their conjunctions. Anything else
 *  is a case a caller cannot judge, so it stops rather than passing over it. */
export function mediaApplies(condition, width) {
  return condition.split(/\s+and\s+/).map((part) => part.trim()).every((part) => {
    const m = /^\((max|min)-width:\s*(\d+(?:\.\d+)?)px\)$/.exec(part);
    assert.ok(m, `a media condition this gate cannot evaluate: ${part}`);
    return m[1] === 'max' ? width <= Number(m[2]) : width >= Number(m[2]);
  });
}

/** The stylesheet as it stands at one viewport width, with its tokens resolved. */
export function sheetAt(css, width, theme = 'light', accent = 'default') {
  const flat = decomment(css);
  let out = '';
  for (let i = 0; i < flat.length;) {
    const at = flat.indexOf('@media', i);
    if (at < 0) { out += flat.slice(i); break; }
    out += flat.slice(i, at);
    const open = flat.indexOf('{', at);
    const condition = flat.slice(at + '@media'.length, open).trim();
    let depth = 1;
    let end = open + 1;
    for (; end < flat.length && depth; end++) {
      if (flat[end] === '{') depth++;
      else if (flat[end] === '}') depth--;
    }
    if (mediaApplies(condition, width)) out += flat.slice(open + 1, end - 1);
    i = end;
  }
  return substitute(out, tokensFor(theme, accent));
}

/** Every rule one `@media` block writes, as `{ selector, declarations }`. The prelude
 *  is matched literally, so a block that is renamed or deleted fails loudly instead of
 *  reporting an empty sweep. */
export function blockRules(css, prelude) {
  const flat = decomment(css);
  const at = flat.indexOf(prelude);
  assert.ok(at > 0, `${prelude} is gone from the stylesheet this gate sweeps`);
  const open = flat.indexOf('{', at);
  let depth = 1;
  let end = open + 1;
  for (; end < flat.length && depth; end++) {
    if (flat[end] === '{') depth++;
    else if (flat[end] === '}') depth--;
  }
  const out = [];
  for (const [, selector, body] of flat.slice(open + 1, end - 1).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = [];
    for (const declaration of body.split(';')) {
      const i = declaration.indexOf(':');
      if (i < 0) continue;
      declarations.push({ property: declaration.slice(0, i).trim(), value: declaration.slice(i + 1).trim() });
    }
    if (declarations.length) out.push({ selector: selector.trim(), declarations });
  }
  return out;
}

/** A CSS length in px at a viewport width. `min()` is evaluated here because JSDOM
 *  reports `min(320px, 50vw)` as `320px` whatever the width is. A percentage, a
 *  keyword and an absent value all read as "no px floor or ceiling of its own". */
export function lengthPx(value, width) {
  const text = String(value).trim();
  if (text === '' || text === 'none' || text === 'auto' || text.endsWith('%')) return null;
  const min = /^min\((.+)\)$/.exec(text);
  const parts = (min ? min[1] : text).split(',').map((p) => p.trim());
  const lengths = parts.map((part) => {
    const px = /^(-?\d+(?:\.\d+)?)px$/.exec(part);
    if (px) return Number(px[1]);
    const vw = /^(-?\d+(?:\.\d+)?)vw$/.exec(part);
    assert.ok(vw, `a length this gate cannot evaluate: ${part}`);
    return (Number(vw[1]) / 100) * width;
  });
  return Math.min(...lengths);
}
