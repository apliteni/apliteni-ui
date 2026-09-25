// The touch-zoom net, read rather than assumed — shared by the two gates over it,
// stories/field-zoom.test.js and react/src/field-zoom.test.tsx.
//
// Both ask the same two questions of a field: does the net's own selector reach
// it, and what sizes it. Only the mounting differs, which is why the walks are
// per workspace and this arithmetic is not.
// Share the calculation but check each workspace separately.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The net's file, relative to the repository root. */
export const NET = 'src/styles/field-zoom.css';

export const readRepo = (rel) => readFileSync(path.join(root, rel), 'utf8');
export const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

const RULE = /([^{}]+)\{([^{}]*)\}/g;

// What a reader types into. The three element kinds Safari zooms into, less the
// input types that hold no text: none of those zooms, and sizing them would be a
// change to controls #294 is not about.
const TYPELESS = ['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'];

/** The query that finds a field, and the test that keeps only the typeable ones. */
export const FIELDS = 'input, select, textarea';
export const typeable = (el) => el.tagName !== 'INPUT'
  || !TYPELESS.includes((el.getAttribute('type') || 'text').toLowerCase());

/**
 * Every rule in one stylesheet that sets a font size, as
 * `{ selector, px, inherits, important, raw, where }`.
 *
 * `font` is read beside `font-size`, because the shorthand sets the size too and
 * the kit writes `font: inherit` on two fields. A value that is not a px length —
 * `inherit`, and anything a future rule writes in em or rem — comes back with
 * `px: null` rather than being dropped, so the gate can fail on a size it cannot
 * read instead of passing over it.
 * Report unmeasured subjects as failures.
 */
export function sizingRules(css, where) {
  const out = [];
  for (const [, selector, body] of decomment(css).matchAll(RULE)) {
    if (selector.trimStart().startsWith('@')) continue;
    for (const decl of body.split(';')) {
      const at = decl.indexOf(':');
      if (at < 0) continue;
      const prop = decl.slice(0, at).trim().toLowerCase();
      if (prop !== 'font-size' && prop !== 'font') continue;
      const raw = decl.slice(at + 1).trim();
      // Tokens have already been substituted by the caller; accept only px arithmetic.
      const resolved = raw.replace(/calc\(\s*(-?[\d.]+)px\s*([+-])\s*([\d.]+)px\s*\)/g,
        (_, left, op, right) => `${Number(left) + (op === '+' ? 1 : -1) * Number(right)}px`);
      const size = /(^|\s)(-?[\d.]+)px(\s|\/|$)/.exec(resolved);
      out.push({
        selector: selector.trim().replace(/\s+/g, ' '),
        px: size ? Number(size[2]) : null,
        inherits: /^inherit\b/.test(raw),
        important: /!important/.test(raw),
        raw,
        where,
      });
    }
  }
  return out;
}

/** The net's stylesheet, comments gone. */
export const netCss = decomment(readRepo(NET));

/**
 * The net's own selector list, read out of the net rather than retyped in a gate.
 * A gate holding its own copy would go on passing after the net stopped covering
 * an element kind.
 */
export const netSelector = (() => {
  const block = /@media[^{]*\{([\s\S]*)\}/.exec(netCss);
  if (!block) throw new Error(`${NET} holds no @media block`);
  const rule = /([^{}]+)\{/.exec(block[1]);
  if (!rule) throw new Error(`${NET} holds no rule`);
  return rule[1].trim().replace(/\s+/g, ' ');
})();

/** Does this selector reach this element? `null` when the selector will not parse. */
export function reaches(el, selector) {
  try {
    return el.matches(selector);
  } catch {
    return null;
  }
}

export const distinct = (list) => [...new Set(list)].sort();
