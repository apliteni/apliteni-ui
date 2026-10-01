import { test } from "node:test";
import { JSDOM } from "jsdom";
import { substitute, tokensFor } from "../../stories/lib/contrast.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CSS = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "table.css"),
  "utf8",
);

/**
 * The inset is written as a step of the spacing scale (the rhythm rule), so what this test needs
 * from a declaration is its resolved width in px — the step looked up in the token file,
 * never a number repeated here. A bare px still resolves: the rule this test holds is
 * "the end cells are inset", and which of the two ways it is spelled is a different rule,
 * held next door in stories/table-rhythm.test.js.
 */
const SPACE = Object.fromEntries(
  [
    ...readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../tokens/tokens.css"),
      "utf8",
    ).matchAll(/--(space-[\w-]+):\s*(\d+(?:\.\d+)?)px/g),
  ].map((m) => [`--${m[1]}`, Number(m[2])]),
);

const insetOf = (declaration) => {
  const m = declaration.match(/padding-(?:left|right):\s*([^;}]+)/);
  if (!m) return null;
  const value = m[1].trim();
  const token = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
  if (token) return SPACE[token[1]] ?? null;
  const px = /^(\d+(?:\.\d+)?)px$/.exec(value);
  return px ? Number(px[1]) : null;
};

/**
 * The zebra stripe is full-bleed on purpose, so its end cells have to be inset by the
 * recipe itself.
 *
 * How the defect got in: `.ui-table td` sets `padding-left: 0`, and the only rule that
 * put it back was `--dense`. The docs above the modifiers say to compose a ledger as
 * `--dense --zebra --hover`, so every table anyone built by hand had the inset and the
 * gap was invisible. `DataTable` then shipped `ui-table ui-table--hover ui-table--zebra`
 * with no `--dense`, and its checkboxes rendered at exactly x=0 of the tint — measured at
 * 0px, reported from the finance portal.
 *
 * This reads the stylesheet rather than a rendered page because the package ships CSS as
 * its artifact; there is no build step between this file and what a consumer installs.
 */
test("the zebra recipe insets its own end cells, without needing --dense", () => {
  const zebra = CSS.split("\n").filter((l) => l.includes(".ui-table--zebra"));

  const firstChild = zebra.filter((l) => l.includes("first-child"));
  const lastChild = zebra.filter((l) => l.includes("last-child"));

  assert.ok(
    firstChild.some((l) => l.includes("th")) && firstChild.some((l) => l.includes("td")),
    "zebra must inset BOTH th:first-child and td:first-child — insetting one misaligns " +
      "the header from the body, which is a worse defect than the one being fixed",
  );
  assert.ok(
    lastChild.some((l) => l.includes("th")) && lastChild.some((l) => l.includes("td")),
    "same on the trailing edge: th:last-child and td:last-child together",
  );

  // Anchored at a line start, and `:not(` selectors are excluded on purpose: the hover
  // rules above are written `.ui-table--hover:not(.ui-table--zebra) … td:first-child`,
  // which contains this modifier's name while being a rule about its ABSENCE. An
  // unanchored match picks those up and the test fails on the wrong thing — it did.
  const declarations = (CSS.match(/^\.ui-table--zebra[^{]*\{[^}]*\}/gm) ?? []).filter(
    (d) => /first-child|last-child/.test(d) && !d.includes(":not("),
  );
  assert.ok(declarations.length > 0, "no zebra end-cell rule found at all");
  for (const d of declarations) {
    const inset = insetOf(d);
    assert.ok(
      inset !== null,
      `a zebra end-cell rule with no padding this test can resolve: ${d}`,
    );
    assert.ok(
      inset > 0,
      `zebra end-cell padding must be greater than zero — 0 is the defect: ${d}`,
    );
  }
});

// JSDOM checks source order but not selector specificity, layout or nested content.
// The trailing-inset check below covers the higher-specificity base override.
// Storybook captures separately check text edges and scrolling in Chromium.

function columnInsets(css) {
  const modifiers = [...new Set(css.match(/ui-table--[\w-]+/g))];
  assert.ok(modifiers.includes('ui-table--dense') && modifiers.includes('ui-table--compact')
    && modifiers.includes('ui-table--zebra'), 'density subjects must exist');
  const recipes = Array.from({ length: 2 ** modifiers.length }, (_, mask) =>
    modifiers.filter((_, i) => mask & (2 ** i)))
    .filter(classes => classes.some(c => /--(dense|compact|zebra)$/.test(c)));
  const html = recipes.flatMap(classes => [false, true].map(numeric =>
    `<table class="ui-table ${classes.join(' ')}"><thead><tr>${[0, 1, 2].map(() =>
      `<th class="${numeric ? 'ui-table__num' : ''}">Heading</th>`).join('')}</tr></thead>`
    + `<tbody><tr>${[0, 1, 2].map(() => `<td class="${numeric ? 'ui-table__num' : ''}">Value</td>`).join('')}</tr></tbody></table>`)).join('');
  const win = new JSDOM(`<style>${substitute(css, tokensFor('dark', 'default'))}</style>${html}`).window;
  const failures = [];
  let measured = 0;
  for (const table of win.document.querySelectorAll('table')) {
    const headers = table.querySelectorAll('th');
    const cells = table.querySelectorAll('td');
    assert.equal(headers.length, 3);
    assert.equal(cells.length, 3);
    headers.forEach((header, i) => {
      const h = win.getComputedStyle(header), c = win.getComputedStyle(cells[i]);
      for (const prop of ['paddingLeft', 'paddingRight']) {
        if (h[prop] !== c[prop]) failures.push(`${table.className}, column ${i + 1}, ${prop}: ${h[prop]} / ${c[prop]}`);
      }
      if (header.classList.contains('ui-table__num') && (h.textAlign !== 'right' || c.textAlign !== 'right')) failures.push('numeric header lost right alignment');
      measured++;
    });
  }
  assert.equal(measured, recipes.length * 2 * 3, 'every recipe and column must be measured');
  assert.ok(measured >= 42, 'all density combinations must be covered');
  win.close();
  return failures;
}

test('table headers and cells have matching horizontal insets in every density recipe', () => {
  assert.deepEqual(columnInsets(CSS), []);
});

test('the inset gate rejects a middle-column header regression', () => {
  assert.ok(columnInsets(`${CSS}\n.ui-table--dense th:nth-child(2) { padding-left: 0; }`).length > 0);
});

function compactTrailingInset(css) {
  const rule = css.match(/^\.ui-table--compact th:last-child,\s*\.ui-table--compact td:last-child\s*\{([^}]+)\}/m);
  return rule ? insetOf(rule[1]) : null;
}

test('compact end cells override the base last-header inset together', () => {
  assert.equal(compactTrailingInset(CSS), SPACE['--space-3']);
  assert.equal(compactTrailingInset(CSS.replace('.ui-table--compact th:last-child,', '')), null,
    'removing the header override must be rejected');
});

/**
 * Rule: a table sizes to its content and is capped at the room it has; no rule in this
 * sheet stretches one. #504 was a two-column table across a 1440px page, with the amount
 * a screen away from its label.
 *
 * Subjects are discovered: every rule here whose selector sizes a table ELEMENT — cell
 * rules are excluded, because `__title`'s own 99% is the documented way to let a text
 * column take the slack, and `__selection`'s fixed track is a column width.
 *
 * What it does not reach: whether a stretched table is still reachable from outside this
 * sheet. A consumer writing `width: 100%` in their own CSS, or a story adding a class of
 * its own, is their choice and no gate here sees it. The guideline is what forbids it.
 */
const CELL = /(?:__|\s(?:td|th|thead|tbody|tr|caption)\b)/;
// Comments out first: the header comment above the base rule names a cell class,
// and an uncommented scan read it as part of that rule's selector.
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const tableSizingRules = (css) => [...noComments(css).matchAll(/([^{}\n][^{}]*)\{([^}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }))
  .filter(({ selector, body }) => /\.ui-table(?:--[\w-]+)?(?![\w-])/.test(selector) && !CELL.test(selector)
    && /(?:^|;|\s)width\s*:/.test(body));

const stretches = (value) => !/^auto$/.test(value.trim());

function tableWidths(css) {
  const rules = tableSizingRules(css);
  assert.ok(rules.length > 0, 'no rule in this sheet sizes a table — the subject is gone');
  const problems = [];
  let measured = 0;

  for (const { selector, body } of rules) {
    for (const [, value] of body.matchAll(/(?:^|;|\s)width\s*:\s*([^;}]+)/g)) {
      if (stretches(value)) problems.push(`${selector} sizes the table itself: width: ${value.trim()}`);
      measured++;
    }
  }
  assert.equal(measured, rules.length, 'every sizing rule must be measured once');

  // The cap is the other half: without it a short table shrinks but a bled one
  // inside a card loses the end inset it bleeds into.
  const caps = [...noComments(css).matchAll(/([^{}\n][^{}]*)\{([^}]*max-width[^}]*)\}/g)]
    .filter(([, selector]) => /\.ui-table(?:--[\w-]+)?(?![\w-])/.test(selector) && !CELL.test(selector));
  if (!caps.some(([, , body]) => /max-width\s*:\s*100%/.test(body))) {
    problems.push('no rule caps a table at the room it has');
  }
  if (!caps.some(([, selector, body]) => selector.includes('.ui-card') && /calc\(100%/.test(body))) {
    problems.push('the card bleed no longer caps a table at the width it bleeds to');
  }
  return problems;
}

test('a table sizes to its content and is capped, never stretched', () => {
  assert.deepEqual(tableWidths(CSS), []);
});

test('the width gate rejects a table stretched back to its container', () => {
  for (const [name, mutation] of [
    ['the base rule', CSS.replace('  width: auto;', '  width: 100%;')],
    ['a modifier', `${CSS}\n.ui-table--dense { width: 100%; }`],
    ['a composition inside a card', `${CSS}\n.ui-card > .ui-table--zebra { width: calc(100% + 2 * var(--space-3)); }`],
  ]) {
    assert.ok(tableWidths(mutation).length > 0, `${name} stretching a table must be rejected`);
  }
  assert.ok(tableWidths(CSS.replace('  max-width: 100%;', '')).length > 0,
    'removing the cap must be rejected');
  assert.ok(tableWidths(CSS.replace('max-width: calc(100% + 2 * var(--space-3));', 'max-width: 100%;')).length > 0,
    'a card bleed that caps at the card instead of the bled width must be rejected');
});
