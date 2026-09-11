import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The pager writes almost no paint of its own: its controls are .ui-btn and its
 * size control is a .ui-select, so what this sheet actually decides is where it
 * stands ON TOP of those two. Both rules below are about that boundary, and both
 * read the other sheet rather than repeating what it says.
 *
 * Read as text, like the table's sheet next door, because the package ships CSS
 * as its artifact — there is no build step between this file and what a consumer
 * installs — and because both subjects are `var()` values, which jsdom resolves
 * to nothing at all.
 * why: CONTRIBUTING.md#an-unresolved-var-measures-nothing-and-reports-green
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');

/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const CSS = decomment(read('pagination.css'));
const BUTTON = decomment(read('button.css'));
const INPUT = decomment(read('input.css'));

const RULE = /([^{}]+)\{([^{}]*)\}/g;
const rules = (css) => [...css.matchAll(RULE)]
  .filter((m) => !m[1].trimStart().startsWith('@'))
  .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }));

const propsOf = (body) => new Set(
  [...body.matchAll(/(?:^|;)\s*(-?[a-zA-Z][\w-]*)\s*:/g)].map((m) => m[1].toLowerCase()),
);
const valueOf = (body, prop) => {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body);
  return m ? m[1].trim() : null;
};

/** The spacing scale, looked up in the token file and never repeated here. */
const SPACE = Object.fromEntries(
  [...decomment(read('../tokens/tokens.css')).matchAll(/--(space-[\w-]+):\s*(\d+(?:\.\d+)?)px/g)]
    .map((m) => [`--${m[1]}`, Number(m[2])]),
);
/** A length as a number of px, whether it is written as a token or a literal. */
const pxOf = (value) => {
  if (!value) return null;
  const token = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
  if (token) return SPACE[token[1]] ?? null;
  const px = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  return px ? Number(px[1]) : null;
};

test('the sheet and the two it stands on are all being read', () => {
  // Every assertion below compares the pager against another sheet, so an empty
  // read on either side is a comparison of nothing that passes whatever the kit
  // does. The floor is on all three at once.
  assert.ok(rules(CSS).length >= 8, `parsed ${rules(CSS).length} rules out of pagination.css`);
  assert.ok(rules(BUTTON).length >= 10, 'parsed almost nothing out of button.css');
  assert.ok(rules(INPUT).length >= 10, 'parsed almost nothing out of input.css');
  assert.ok(Object.keys(SPACE).length >= 5, 'the spacing scale is not being read from the tokens');
});

// ---- 1. the current page steps aside for the disabled paint -----------------

/**
 * `.ui-btn:disabled` weighs (0,2,0), and so does `.ui-pager__page.is-current`.
 * pagination.css is imported after button.css, so a current-page rule written
 * plainly wins on order and repaints a control that is off — which is exactly
 * what a `loading` pager renders, since the page you are on is disabled with all
 * the others. A disabled control that looks live is the one thing the busy state
 * must not leave behind, and stories/guidelines/accessibility-floor.test.js
 * fails a kit that ships one.
 *
 * The rule is that the current-page paint stands off a disabled control; either
 * spelling of the state does that, and the sheet says which it uses and why.
 */
const standsOffDisabled = (selector) => /:not\(\s*(?::disabled|\[disabled\])\s*\)/.test(selector);

const currentRules = rules(CSS).filter((r) => r.selector.includes('.is-current'));

test('the current-page paint stands off a control that is disabled', () => {
  assert.ok(currentRules.length > 0, 'no current-page rule found at all — the sweep reads nothing');
  for (const r of currentRules) {
    assert.ok(
      standsOffDisabled(r.selector),
      `\`${r.selector}\` out-ranks .ui-btn:disabled on order alone, so a loading pager paints its `
      + 'current page as though it were live. Write it :not(:disabled).',
    );
  }
});

test('every colour the current page paints is one the disabled rule paints back', () => {
  // The stand-off only holds for the properties the disabled rule actually
  // writes: a colour set here that button.css's off state never mentions would
  // survive :not(:disabled) being there and repaint the control anyway.
  const off = rules(BUTTON)
    .filter((r) => /\.ui-btn(--\w+)?:disabled/.test(r.selector))
    .flatMap((r) => [...propsOf(r.body)]);
  assert.ok(off.length > 0, 'button.css declares no disabled paint — this check has no baseline');

  const isColour = (p) => p === 'color' || p === 'background' || p.endsWith('-color');
  for (const r of currentRules) {
    for (const prop of [...propsOf(r.body)].filter(isColour)) {
      assert.ok(
        off.includes(prop),
        `\`${r.selector}\` sets ${prop}, which .ui-btn:disabled never sets — the disabled state `
        + 'cannot take it back off.',
      );
    }
  }
});

test('the check refuses a current-page rule written plainly, and accepts the guarded one', () => {
  // The mutation that kills its case: without this, a regex that stopped
  // matching would report the sheet as guarded no matter what it says.
  assert.equal(standsOffDisabled('.ui-pager__page.is-current'), false);
  assert.equal(standsOffDisabled('.ui-pager__page.is-current:hover'), false);
  assert.equal(standsOffDisabled('.ui-pager__page.is-current:disabled'), false);
  assert.equal(standsOffDisabled('.ui-pager__page.is-current:not(:disabled)'), true);
  assert.equal(standsOffDisabled('.ui-pager__page.is-current:not([disabled])'), true);
});

// ---- 2. the size control's padding clears the chevron ----------------------

/**
 * `.ui-select` paints its own chevron as a background image, positioned from the
 * right edge, and reserves room for it with `padding-right`. The pager resizes
 * that control to sit in a row of sm buttons, which means re-writing BOTH — and
 * either one written alone puts the glyph on top of the words.
 *
 * The glyph's width and the offset are read out of input.css and this sheet
 * rather than stated, so the arithmetic follows a change to either.
 */
const selectRule = rules(CSS).find((r) => r.selector.includes('.ui-pager__size-select'));
// The glyph is an inline SVG in a data URI, so its width is written percent-
// encoded inside the value of `background-image`; that declaration is where it
// is read from, and nowhere else in the sheet carries one.
const chevronWidth = Number(/width='(\d+)'/.exec(
  rules(INPUT).filter((r) => r.selector.includes('.ui-select'))
    .map((r) => valueOf(r.body, 'background-image')).filter(Boolean).join('\n'),
)?.[1]);

const clears = ({ padding, offset, glyph }) => padding >= offset + glyph;

test('the resized size control keeps its padding clear of its own chevron', () => {
  assert.ok(selectRule, 'no .ui-pager__size-select rule found — the sweep reads nothing');
  assert.ok(chevronWidth > 0, `read a chevron ${chevronWidth}px wide out of input.css`);

  const position = valueOf(selectRule.body, 'background-position');
  assert.ok(position, 'the rule resizes the control without repositioning the chevron it draws');
  const offset = pxOf(/right\s+(\S+)\s+center/.exec(position)?.[1]);
  assert.notEqual(offset, null, `background-position \`${position}\` is not a length this test can resolve`);

  const shorthand = valueOf(selectRule.body, 'padding');
  const padding = pxOf(valueOf(selectRule.body, 'padding-right') ?? shorthand?.split(/\s+/)[1]);
  assert.notEqual(padding, null, `padding \`${shorthand}\` gives no right side this test can resolve`);

  assert.ok(
    clears({ padding, offset, glyph: chevronWidth }),
    `padding-right is ${padding}px and the chevron takes ${offset + chevronWidth}px from that edge `
    + `(${offset}px offset + ${chevronWidth}px glyph) — the value runs under the glyph.`,
  );
});

test('the arithmetic refuses a padding that only reaches the offset', () => {
  // Same mutation rule: the case this is here to catch, checked against the
  // check itself. A pager that dropped padding-right back to the offset would
  // look fine in a sheet and put the chevron over the number.
  assert.equal(clears({ padding: 8, offset: 8, glyph: 12 }), false);
  assert.equal(clears({ padding: 19, offset: 8, glyph: 12 }), false);
  assert.equal(clears({ padding: 20, offset: 8, glyph: 12 }), true);
});
