// What a label or a chip reads as: the rules that claim the label or the chip rank, and
// whether a rendered label starts the way its author should write it. Shared by the
// vanilla gate (stories/guidelines/letter-case.test.js) and the React one
// (react/src/letter-case.test.tsx).
// why: docs/foundations.md#labels-and-titles
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { kitSheetNames } from '../../scripts/lib/icon-cascade.js';

export const blankComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** Every selector whose rule claims the label or the chip rank, with where it says so. */
export const rankedSelectors = (dir) => kitSheetNames(dir).flatMap((rel) => {
  const css = readFileSync(path.join(dir, rel), 'utf8');
  const text = blankComments(css);
  return [...css.matchAll(/\/\*\s*rank\s*:\s*(label|chip)\s*\*\//gi)].flatMap((m) => {
    const open = text.lastIndexOf('{', m.index);
    if (open < 0 || text.lastIndexOf('}', m.index) > open) return [];
    return [{
      selector: text.slice(text.lastIndexOf('}', open) + 1, open).trim(),
      rank: m[1].toLowerCase(),
      where: `src/${rel}:${css.slice(0, m.index).split('\n').length}`,
    }];
  });
});

/**
 * 'ok', 'name' or 'bad' for one rendered label.
 *
 * A label that opens on a figure or a sign — "3 overdue", "+12% on last year" —
 * has no first letter to capitalise and is 'ok'. A first word carrying anything
 * but letters is a name spelled in its own case and is 'name'.
 */
export const labelCase = (text) => {
  const t = text.trim();
  const first = t[0];
  if (!first || first.toLocaleLowerCase() !== first || first.toLocaleUpperCase() === first) return 'ok';
  return /^\p{L}+$/u.test(t.split(/\s/)[0]) ? 'bad' : 'name';
};

