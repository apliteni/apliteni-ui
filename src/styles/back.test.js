import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

/**
 * What the back link's sheet decides that nothing else checks: that the colour
 * holds against a host stylesheet's link rule, that the link is a 32px pill, and
 * that a long destination clips rather than wrapping.
 * Read as text, because the package ships CSS as its artifact: the first two are
 * `var()` values, which jsdom resolves to nothing, and the third is an ellipsis,
 * which needs a layout jsdom does not have. What the clip looks like when a
 * browser does the layout is docs/evidence/back-label-long-*.png.
 * why: docs/components.md#back-link
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const CSS = decomment(read('back.css'));
const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }));
const SPACE = Object.fromEntries(
  [...decomment(read('../tokens/tokens.css')).matchAll(/--(space-[\w-]+):\s*(\d+)px/g)].map((m) => [m[1], Number(m[2])]),
);

/** Specificity as [ids, classes, types] — enough for the selectors this sheet writes. */
const specificity = (sel) => {
  const s = sel.replace(/::[\w-]+/g, '');
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const classes = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
  const types = (s.replace(/\[[^\]]+\]/g, '').match(/(?:^|[\s>+~])[a-z][\w-]*/gi) || []).length;
  return [ids, classes, types];
};
const beats = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

test('the sheet is being read', () => {
  assert.ok(rules.length >= 5, `parsed ${rules.length} rules out of back.css`);
});

test('every rule that paints the link its colour outranks a host a:link and a:hover', () => {
  const painting = rules.filter((r) => /(?:^|;)\s*color\s*:/.test(r.body));
  assert.ok(painting.length >= 2, 'no colour rules found — the check is reading nothing');
  for (const r of painting) {
    for (const host of ['a:link', 'a:visited', 'a:hover']) {
      assert.ok(beats(specificity(r.selector), specificity(host)) > 0,
        `"${r.selector}" is ${specificity(r.selector)} and loses to a host "${host}"`);
    }
  }
});

test('the resting colour is a token, and not the accent', () => {
  const rest = rules.find((r) => r.selector === '.ui-back[href]');
  assert.ok(rest, 'no resting colour rule for .ui-back[href]');
  const color = /color\s*:\s*([^;]+)/.exec(rest.body)[1].trim();
  assert.match(color, /^var\(--[\w-]+\)$/);
  assert.doesNotMatch(color, /accent/);
});

// #834: 32px tall and a pill, with 12px after the words. #869 took the space before
// the arrow to 4px, so the ring stays on a phone's screen; the test below holds why.
test('the link is a 32px pill', () => {
  const base = rules.find((r) => r.selector === '.ui-back');
  const m = /min-height\s*:\s*var\(--(space-[\w-]+)\)/.exec(base.body);
  assert.ok(m, '.ui-back declares no min-height from the spacing scale');
  assert.ok(SPACE[m[1]] >= 32, `--${m[1]} is ${SPACE[m[1]]}px`);
  assert.match(base.body, /(?:^|;)\s*border-radius\s*:\s*var\(--radius-pill\)/);
  assert.match(base.body, /(?:^|;)\s*padding\s*:\s*0 var\(--space-3\) 0 var\(--space-1\)/);
});

// #869: the arrow's ink starts on the edge the title starts on. The ink's offset is the
// left padding plus the chevron's empty space: its leftmost point less half a round
// join's stroke, scaled from the 24-unit box to the glyph's width. Read from the glyph
// and the sheets, so a new glyph, stroke, size or padding moves the sum. Its limits: it
// assumes the arrow is the link's first box, and it does not lay anything out —
// stories/back-align.test.js measures the ink against the title in a browser.
test("the arrow's ink starts on the column edge, and the ring stays on a phone's screen", () => {
  const decl = (rule, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(rule.body)?.[1].trim();
  const px = (expr) => {
    const lengths = { ...SPACE, ...Object.fromEntries([...decomment(read('../tokens/tokens.css'))
      .matchAll(/--(ring-[\w-]+):\s*(\d+)px/g)].map((m) => [m[1], Number(m[2])])) };
    const arithmetic = expr.replace(/var\(--([\w-]+)\)/g, (_, name) => {
      assert.ok(name in lengths, `--${name} has no px value in the kit sheet`);
      return String(lengths[name]);
    }).replace(/calc\(/g, '(').replace(/(\d+(?:\.\d+)?)px/g, '$1');
    assert.match(arithmetic, /^[\d\s.+\-*/()]+$/, `cannot evaluate "${expr}"`);
    return Function(`return ${arithmetic}`)();
  };
  const glyph = /<Icon name="(\w+)"/.exec(read('../../react/src/BackLink.tsx'))?.[1];
  assert.equal(glyph, 'chevronLeft', 'BackLink draws another glyph: check its empty space');
  const shape = new RegExp(`${glyph}: '<polyline points="([^"]+)"`).exec(read('../assets/icons.js'));
  assert.ok(shape, `no polyline for ${glyph} in icons.js`);
  const xs = shape[1].trim().split(/\s+/).filter((_, i) => i % 2 === 0).map(Number);
  const svg = rules.find((r) => r.selector === '.ui-back svg');
  const width = px(decl(svg, 'width'));
  const inset = (Math.min(...xs) - Number(decl(svg, 'stroke-width')) / 2) / 24 * width;

  const base = rules.find((r) => r.selector === '.ui-back');
  const before = px(decl(base, 'padding').split(/\s+(?![^(]*\))/)[3]);
  const margin = decl(base, 'margin-inline-start');
  assert.ok(margin, '.ui-back declares no margin-inline-start: its arrow starts right of the title');
  const ink = px(margin) + before + inset;
  assert.ok(Math.abs(ink) <= 0.5, `the arrow's ink starts ${ink.toFixed(2)}px from the column edge`);

  // The ring and its gap stand outside the pill, which now starts left of the column.
  // The shell's phone gutter must hold both.
  const layout = decomment(read('layout.css'));
  const phone = /@media \(max-width: 720px\)[\s\S]*?\.ui-app__main\s*\{\s*padding:\s*\S+\s+var\(--(space-[\w-]+)\)/.exec(layout);
  assert.ok(phone, "no phone padding for .ui-app__main in layout.css");
  const ring = px('var(--ring-width) + var(--ring-gap-width)');
  const room = SPACE[phone[1]] + px(margin) - ring;
  assert.ok(room >= 0, `the focus ring runs ${(-room).toFixed(2)}px off a phone's screen`);
});

// #834: on a phone with touch the tap layer takes the 32px link to the 44px floor. Read
// as text, so it proves the declarations, not the hit area: stories/tap-zone.test.js
// measures that in a browser with TAP_ZONES=1.
test('on a phone with touch the link carries a tap layer that reaches 44px', () => {
  const tap = decomment(read('tap-zone.css'));
  const list = (re) => splitSelectorList(re.exec(tap)?.[1] ?? '').map((s) => s.trim());
  assert.ok(list(/:where\(([^)]+)\)\s*\{\s*position:\s*relative;/).includes('.ui-back'), 'not a containing block');
  assert.ok(list(/:where\(([^)]+)\)::after\s*\{/).includes('.ui-back'), 'not on the ::after carrier list');
  const clear = /\.ui-back\s*\{\s*--tap-clear-y:\s*var\(--(space-[\w-]+)/.exec(tap);
  assert.ok(clear, 'no --tap-clear-y on .ui-back');
  const base = rules.find((r) => r.selector === '.ui-back');
  const height = SPACE[/min-height\s*:\s*var\(--(space-[\w-]+)\)/.exec(base.body)[1]];
  assert.ok(height + SPACE[clear[1]] >= 44, `${height}px and ${SPACE[clear[1]]}px of clear space do not reach 44px`);
});

test("the destination's name clips to one line rather than wrapping", () => {
  // The link stands above the page title, so a second line moves the page down.
  // Which four declarations, and why min-width is one of them: back.css's own
  // note on the rule. That it EXISTS at all is src/styles/label-coverage.test.js.
  const decl = (rule, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(rule.body)?.[1].trim();
  const label = rules.find((r) => r.selector === '.ui-back__label');
  assert.ok(label, 'no rule for .ui-back__label');
  assert.equal(decl(label, 'white-space'), 'nowrap');
  assert.equal(decl(label, 'overflow'), 'hidden');
  assert.equal(decl(label, 'text-overflow'), 'ellipsis');
  // A flex item's own floor is its content, so the three above never come into
  // play without this: the label refuses to shrink and the link overflows instead.
  assert.equal(decl(label, 'min-width'), '0');

  // And the link itself needs a ceiling. `width: fit-content` resolves to at
  // least the box's own min-content, which a `nowrap` label makes the whole
  // destination name — so without this the four declarations above are dead and
  // the link pushes through the column. Measured: docs/evidence/back-label-*.png.
  const base = rules.find((r) => r.selector === '.ui-back');
  assert.equal(decl(base, 'max-width'), '100%');
});
