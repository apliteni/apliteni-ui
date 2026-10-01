// Source CSS contracts; browser evidence covers actual wrapping and scrolling.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./segmented.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
const valueOf = (selector, prop) => {
  const matches = rules.filter(rule => rule.selector === selector);
  assert.equal(matches.length, 1, `expected one rule for ${selector}`);
  return new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(matches[0].body)?.[1].trim();
};

test('pill strips wrap within their container', () => {
  assert.equal(valueOf('.ui-seg', 'flex-wrap'), 'wrap', 'long pill strips must wrap rather than widen the page');
});

test('underline strips scroll on one row', () => {
  assert.equal(valueOf('.ui-seg--underline', 'flex-wrap'), 'nowrap', 'underline tabs must override the pill wrap');
  assert.equal(valueOf('.ui-seg--underline', 'overflow'), 'auto', 'tabs that exceed the row must remain reachable');
});

/* ---- forced colours ------------------------------------------------------
 * Forced-colors mode replaces `background-color` and keeps `outline`, `border`
 * and anything under `forced-color-adjust: none`. Since #475 the chosen segment
 * is carried by background alone, so without an answer here every pill reads
 * unselected; the underline appearance reserves a transparent bottom border on
 * every tab, which the mode makes visible, so there every tab reads selected.
 * Both faults were found by review on b6d9103, not by a gate — this is the gate.
 * Subjects are discovered from the sheet, so a third appearance with a selected
 * rule fails here until someone decides what it does in forced colours.
 * Browser evidence covers the rendered result; this holds the contract. */
const BLOCKS = (() => {
  const out = [];
  const open = /@media\s*\(\s*forced-colors\s*:\s*active\s*\)\s*\{/g;
  for (let m = open.exec(css); m; m = open.exec(css)) {
    let depth = 1, i = open.lastIndex;
    while (i < css.length && depth > 0) { if (css[i] === '{') depth += 1; if (css[i] === '}') depth -= 1; i += 1; }
    out.push(css.slice(open.lastIndex, i - 1));
  }
  return out;
})();
const forced = BLOCKS.join('\n');
const forcedRules = [...forced.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, s, b]) => ({ selector: s.trim(), body: b }));
const SELECTED = /\.is-active|\[aria-pressed="true"\]|\[aria-selected="true"\]/;
const PRESERVED = /(?:^|;)\s*(?:forced-color-adjust|outline|border(?!-radius)|text-decoration)/;
// Rules outside the block that paint a chosen segment, and nothing else.
const baseCss = BLOCKS.reduce((acc, block) => acc.split(block).join(''), css);
const painted = [...baseCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }))
  .filter((r) => SELECTED.test(r.selector) && /(?:^|;)\s*background(?:-color)?\s*:/.test(r.body));

test('forced colours: the sheet states a chosen segment with a property the mode keeps', () => {
  assert.ok(BLOCKS.length === 1, 'expected exactly one forced-colors block to review');
  assert.equal(painted.length, 2, 'selected-state paint rules changed; decide what each does in forced colours');
  const answered = forcedRules.filter((r) => SELECTED.test(r.selector) && PRESERVED.test(r.body));
  assert.ok(answered.length >= 2, 'every appearance that paints a chosen segment needs a forced-colors answer');
  for (const appearance of [/:not\(\.ui-seg--underline\)/, /\.ui-seg--underline/]) {
    assert.ok(
      answered.some((r) => appearance.test(r.selector)),
      `no forced-colors rule marks the chosen segment for ${appearance}`,
    );
  }
});

test('forced colours: the underline appearance hides the edge it reserves on every tab', () => {
  const reserved = rules.find((r) => r.selector === '.ui-seg--underline button');
  assert.match(reserved.body, /border-bottom:[^;]*transparent/, 'the reserved transparent edge moved');
  const hidden = forcedRules.find((r) => r.selector === '.ui-seg--underline button');
  assert.match(
    hidden?.body ?? '', /border-bottom-color:\s*Canvas/,
    'forced colours paints the reserved edge on every tab unless it is named away, so all tabs read selected',
  );
});

test('forced colours: system colours stay inside the block, so normal rendering is untouched', () => {
  const SYSTEM = /\b(?:Highlight|HighlightText|Canvas|CanvasText|GrayText|ButtonFace|ButtonText|ButtonBorder)\b/g;
  const outside = css.split(forced).join('');
  assert.equal(
    outside.match(SYSTEM), null,
    'a system colour outside the forced-colors block would change the look Artur picked on r23',
  );
  assert.ok(forced.match(SYSTEM).length >= 4, 'the block should name system colours rather than kit tokens');
});
