// Source CSS contracts. Nothing here lays anything out: the rendered outcome —
// two rows at a phone width, one at 1280, no tab past the strip's edge — is
// measured in a browser by stories/segmented-wrap.test.js.
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

// What the chosen tab says, read off the sheet. The rendered half — where the
// bar lands inside the tab, and that a reader can tell the rows apart — is
// stories/segmented-wrap.test.js's; this file holds the declarations that half
// depends on, so deleting one fails here without a browser.
// Top-level rules only: the forced-colours restatement below repeats these
// selectors, and reading the two as one would compare a rule against its own
// exception.
const topLevel = (text) => {
  let depth = 0, out = '', skipping = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    if (!skipping && ch === '{' && /@[a-z-]+[^{}]*$/i.test(out)) { skipping = depth; out = out.replace(/@[a-z-]+[^{}]*$/i, ''); }
    if (!skipping) out += ch;
    if (ch === '}') { depth -= 1; if (skipping && depth < skipping) skipping = 0; }
  }
  return out;
};
const baseCss = topLevel(css);
const ruleBody = (text, selector) => {
  const found = [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) => sel.split(',').map(part => part.trim()).includes(selector));
  assert.equal(found.length, 1, `expected one rule for ${selector}`);
  return found[0][2];
};
const decl = (body, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim();

// guidelines/layout-and-density.md, the spacing scale: the step is 12px and 13px
// is the kind of value the rule names. The tab's height comes from the tap floor
// token instead of a padding sum, which is also what makes it independent of the
// font — the off-scale padding it replaced drew 41 without the webfont.
test('the underline tab pads off the scale and draws the tap floor', () => {
  const tab = ruleBody(baseCss, '.ui-seg--underline button');
  const padding = decl(tab, 'padding');
  assert.match(
    padding, /^var\(--space-\d+\)(\s+var\(--space-\d+\))?$/,
    `the tab pads \`${padding}\`; every side has to be a step of the scale`,
  );
  assert.match(decl(tab, 'min-height'), /^var\(--tap-min(,\s*44px)?\)$/, 'the drawn height is the floor');
});

test('the chosen tab is a weight step and one bar, and draws no box', () => {
  const tab = ruleBody(baseCss, '.ui-seg--underline button.is-active');
  const resting = ruleBody(baseCss, '.ui-seg--underline button');
  // Artur, #527 round r31: the plate and the upright rail together read as a
  // list-row grip, so a reader offered to drag the strip. Both are gone, and
  // neither may come back without this failing.
  assert.equal(decl(tab, 'background'), 'none', 'the chosen tab keeps the ground it stands on');
  assert.equal(decl(tab, 'box-shadow'), undefined, 'the chosen tab draws no hairline of its own');
  assert.equal(decl(tab, 'border'), undefined);
  assert.equal(decl(tab, 'border-bottom'), undefined, 'the rail on the tab\'s own edge is what the inset bar replaced');
  // This is what holds the tab to no box. It cancelled the accent outline the pill
  // rule gave every chosen button, a second accent mark on a tab that already had one
  // — #544 — and since #475 took that outline off the pill rule it goes on refusing
  // any other outline a later rule would put here.
  assert.equal(decl(tab, 'outline'), '0', 'the chosen tab declares no outline of its own');

  // The type step. Both halves are read, because one alone is not a step: a
  // resting tab at --semibold and a chosen tab at --semibold say the same thing.
  assert.equal(decl(resting, 'font-weight'), 'var(--weight-medium)', 'a reading label sits a weight below the chosen one');
  assert.equal(decl(tab, 'font-weight'), 'var(--weight-semibold)');
  assert.equal(decl(tab, 'color'), 'var(--strong)', 'the ink steps with the weight');
  // Nothing resting is drawn as unavailable: the kit's body rank, not its muted
  // one. guidelines/labels-and-titles.md
  assert.equal(decl(ruleBody(baseCss, '.ui-seg button'), 'color'), 'var(--text)');

  // Every tab reserves the bar; only the chosen one draws it.
  const slot = ruleBody(baseCss, '.ui-seg--underline button::before');
  const bar = ruleBody(baseCss, '.ui-seg--underline button.is-active::before');
  assert.equal(decl(slot, 'height'), '2px');
  assert.equal(decl(slot, 'background'), 'var(--accent)');
  assert.equal(decl(slot, 'opacity'), '0', 'a resting tab reserves the slot and draws nothing in it');
  assert.equal(decl(bar, 'opacity'), '1');
  // Inset on three sides, which is the whole of why the strip can wrap: a mark
  // on the tab's bottom edge is a mark on the line between two rows, and the
  // reader picks which row it belongs to.
  assert.equal(decl(slot, 'left'), 'var(--space-3)', 'the bar spans the label, not the tab');
  assert.equal(decl(slot, 'right'), 'var(--space-3)');
  assert.ok(/^[1-9]/.test(decl(slot, 'bottom') ?? ''), 'the bar stands clear of the tab\'s bottom edge');
  assert.equal(decl(slot, 'top'), undefined, 'the bar is under the label, not beside it');
  assert.equal(decl(slot, 'width'), undefined);
});

test('the mark grows in place, the way the kit\'s other underline tab does', () => {
  // The bar is reserved on every tab and revealed on the chosen one, which is
  // the only structure that can animate it: a mark that exists only while it is
  // chosen has nothing to transition from. nav.css reaches the same picture
  // declaration for declaration, so the two are read against each other — a
  // strip that snapped the mark between tabs would be the one place in the kit
  // that does. guidelines/motion.md
  const slot = ruleBody(baseCss, '.ui-seg--underline button::before');
  const navSlot = ruleBody(topLevel(readFileSync(new URL('./nav.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')), '.ui-nav--tabs.is-underline .ui-nav__tab::after');
  for (const prop of ['height', 'border-radius', 'background', 'opacity', 'transform', 'transition']) {
    assert.equal(decl(slot, prop), decl(navSlot, prop), `the bar's ${prop} is the kit's underline tab's`);
  }
  assert.equal(decl(ruleBody(baseCss, '.ui-seg--underline button.is-active::before'), 'transform'), 'scaleX(1)');
});

test('the chosen tab keeps the kit ring rather than falling back to the browser\'s', () => {
  // `outline: 0` on the chosen tab reaches (0,3,0); the kit's own focus rule
  // reaches (0,2,1), so it loses, and the tab focuses with nothing under it.
  // Artur rejected a native outline on #457, and in forced colours the
  // transparent outline is the indicator. Restated at the same reach.
  const focused = ruleBody(baseCss, '.ui-seg--underline button.is-active:focus-visible');
  assert.equal(decl(focused, 'box-shadow'), 'var(--ring)');
  assert.equal(decl(focused, 'outline'), '2px solid transparent');
  assert.equal(decl(ruleBody(baseCss, '.ui-seg--underline button[aria-pressed="true"]:focus-visible'),
    'box-shadow'), 'var(--ring)', 'both selectors the factory can emit carry it');
});

test('the underline strip draws no rule under its tabs', () => {
  // Artur, on #545: the line under the strip reads as noise. The selection is
  // the chosen tab's own label now, so the rule marked nothing.
  const strip = ruleBody(baseCss, '.ui-seg--underline');
  assert.equal(decl(strip, 'border-bottom'), undefined, 'the strip declares no bottom rule');
  assert.equal(decl(strip, 'border'), undefined);
  assert.equal(decl(ruleBody(baseCss, '.ui-seg--underline button'), 'border-bottom'), undefined, 'no tab reserves a rail');
  // The rows close back to the track's own gap, because a contained highlight
  // belongs to no row but its own. stories/segmented-wrap.test.js measures it.
  assert.equal(decl(strip, 'row-gap'), 'var(--space-1)');
});

test('underline strips wrap and clip nothing', () => {
  // Both declarations are read, so dropping either one fails here rather than in
  // a screenshot. `overflow: visible` is the initial value, so this catches the
  // declaration going missing and NOT clipping reintroduced by a parent or a
  // later rule; stories/segmented-wrap.test.js measures the rendered outcome.
  assert.equal(valueOf('.ui-seg--underline', 'flex-wrap'), 'wrap', 'underline tabs must wrap rather than hide the ones past the fold');
  assert.equal(valueOf('.ui-seg--underline', 'overflow'), 'visible', 'a scroll box would clip the focus ring against the strip padding');
});

/* ---- forced colours ------------------------------------------------------
 * Forced-colors mode replaces every author colour. A declaration survives it by
 * naming a system colour, or by sitting under `forced-color-adjust: none`;
 * `opacity`, which is not a colour, is kept either way.
 * That is a fault in each appearance, and a different one. The pill's selection
 * is carried by `background` alone since #475, so with no answer here every pill
 * reads unselected. The underline tab's mark is a bar painted `--accent`, which
 * the mode repaints as the ink every resting label already has, so the bar would
 * be there and say nothing. Both are restated below.
 * Subjects are discovered from the sheet, so a third appearance with a chosen
 * rule fails this file until someone decides what it says in the mode.
 * The rendered result is browser evidence; this holds the contract. */
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
const forcedRules = [...forced.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({ selector: sel.trim(), body }));
const SELECTED = /\.is-active|\[aria-pressed="true"\]|\[aria-selected="true"\]/;
const SYSTEM = /\b(?:Highlight|HighlightText|Canvas|CanvasText|GrayText|ButtonFace|ButtonText|ButtonBorder)\b/;
// What the mode can flatten, and therefore what owes it an answer. `opacity` is
// not here: it is not a colour, so the reveal it drives survives the mode.
const FLATTENED = /(?:^|;)\s*(?:background(?:-color)?|border(?:-[a-z]+)*-color|box-shadow|outline-color)\s*:/;
// Which appearance a selector belongs to. `.ui-seg:not(.ui-seg--underline)` is
// the pill, so the first `.ui-seg` wins and the exclusion is ignored.
const appearanceOf = (selector) => /\.ui-seg(--[\w-]+)?/.exec(selector)?.[0] ?? null;
const baseRules = [...baseCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));

test('forced colours: every appearance that marks a chosen segment answers the mode', () => {
  assert.equal(BLOCKS.length, 1,
    'the sheet answers forced colours in one block, so what the control says without the palette reads in one pass');
  const marked = [...new Set(baseRules
    .filter((r) => SELECTED.test(r.selector) && FLATTENED.test(r.body))
    .map((r) => appearanceOf(r.selector))
    .filter(Boolean))].sort();
  assert.deepEqual(marked, ['.ui-seg', '.ui-seg--underline'],
    'the appearances marking a chosen segment changed; decide what each says in forced colours');
  const answered = new Set(forcedRules
    .filter((r) => SELECTED.test(r.selector) && (SYSTEM.test(r.body) || /forced-color-adjust/.test(r.body)))
    .map((r) => appearanceOf(r.selector)));
  for (const appearance of marked) {
    assert.ok(answered.has(appearance),
      `${appearance} marks a chosen segment with a colour the mode drops and restates nothing`);
  }
});

test('forced colours: the chosen pill keeps a fill, and its ring and disabled pair come with it', () => {
  // Opting out is what lets the pill keep a fill at all — and it carries the
  // focus outline and the disabled paint out with it, so both are restated.
  const chosen = forcedRules.find((r) => r.selector.includes('.ui-seg:not(.ui-seg--underline) button.is-active,'));
  assert.equal(decl(chosen.body, 'forced-color-adjust'), 'none');
  assert.equal(decl(chosen.body, 'background'), 'Highlight');
  assert.equal(decl(chosen.body, 'color'), 'HighlightText', 'the label is read on the fill the mode gives it');
  const ring = forcedRules.find((r) => r.selector.includes('.ui-seg:not(.ui-seg--underline) button.is-active:focus-visible'));
  assert.match(decl(ring.body, 'outline') ?? '', /HighlightText/, 'an opted-out pill gets no outline from the mode');
  assert.ok(/^-/.test(decl(ring.body, 'outline-offset') ?? ''),
    'the ring is drawn inside the fill, which is the one colour that fill is guaranteed to contrast');
  const off = forcedRules.find((r) => r.selector === '.ui-seg:not(.ui-seg--underline) button:disabled');
  assert.equal(decl(off.body, 'color'), 'GrayText', 'an unavailable choice is the mode\'s own grey, not the kit\'s');
});

test('forced colours: the chosen tab\'s bar is restated, and its reveal is not', () => {
  const slot = ruleBody(baseCss, '.ui-seg--underline button::before');
  assert.equal(decl(slot, 'background'), 'var(--accent)', 'the bar the mode would flatten');
  assert.equal(decl(slot, 'opacity'), '0');
  const bar = forcedRules.find((r) => r.selector.includes('.ui-seg--underline button.is-active::before'));
  assert.equal(decl(bar.body, 'background'), 'Highlight',
    'repainted as the labels\' own ink, the bar would be drawn and mark nothing');
  assert.equal(forcedRules.some((r) => /(?:^|;)\s*opacity\s*:/.test(r.body)), false,
    'the mode keeps opacity, so the reveal needs no restatement here');
});

test('forced colours: system colours stay inside the block, so normal rendering is untouched', () => {
  const outside = css.split(forced).join('');
  assert.equal(
    outside.match(new RegExp(SYSTEM.source, 'g')), null,
    'a system colour outside the forced-colors block would change the look Artur picked on r23',
  );
  assert.ok(forced.match(new RegExp(SYSTEM.source, 'g')).length >= 4, 'the block should name system colours rather than kit tokens');
});
