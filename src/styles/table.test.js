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
 * Rule: a table sizes to its content and is capped at the room it has (#504). The one
 * exception is the frame — the box a table shares with its pager or toolbar — where the
 * table fills a box already sized to the widest part, so the two keep the same edges.
 *
 * Subjects are discovered by what a rule's last compound targets: a table element, bare or
 * by class. Cell rules are out: `__title`'s 99% is how a text column takes the slack.
 *
 * What it does not reach: layout, and any sheet but this one. Whether the frame is wide
 * enough for both parts is Chromium's answer, and `react/src/DataTable.test.tsx` asks it.
 */
const CELL = /(?:__|\s(?:thead|tbody|tr|caption)\b)/;
// Comments out first: the header comment above the base rule names a cell class,
// and an uncommented scan read it as part of that rule's selector.
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
// `:where(…)` and `:is(…)` hold their own comma lists, so the wrapper goes before the
// selector is split on commas — `.ui-card > :where(.ui-table--dense, .ui-table--zebra)`
// is two selectors, and the second one ended in a bracket the match could not read.
const compounds = (selector) => selector.replace(/:where\(|:is\(|\)/g, '').split(',')
  .map((part) => part.trim().split(/[\s>+~]+/).filter(Boolean).pop() || '');
const TABLE_ELEMENT = /^(?:table|\.ui-table(?:--[\w-]+)?)(?:[:.[][^\s]*)?$/;
const targetsTable = (selector) => compounds(selector).some((last) => TABLE_ELEMENT.test(last));

const rulesIn = (css) => [...noComments(css).matchAll(/([^{}\n][^{}]*)\{([^}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));
const tableSizingRules = (css) => rulesIn(css)
  .filter(({ selector, body }) => targetsTable(selector) && !CELL.test(selector)
    && /(?:^|;|\s)width\s*:/.test(body));
const declared = (body, property) => {
  const found = [...body.matchAll(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;}]+)`, 'g'))];
  return found.length ? found[found.length - 1][1].trim() : null;
};

function tableWidths(css) {
  const rules = tableSizingRules(css);
  assert.ok(rules.length > 0, 'no rule in this sheet sizes a table — the subject is gone');
  const problems = [];
  let measured = 0;

  for (const { selector, body } of rules) {
    for (const [, value] of body.matchAll(/(?:^|;|\s)width\s*:\s*([^;}]+)/g)) {
      const width = value.trim();
      const inFrame = selector.includes('.ui-table-frame');
      if (width !== 'auto' && !(inFrame && width === '100%')) {
        problems.push(`${selector} sizes the table itself: width: ${width}`);
      }
      measured++;
    }
  }
  assert.equal(measured, rules.length, 'every sizing rule must be measured once');

  // The cap is the other half: without it a short table shrinks but a bled one
  // inside a card loses the end inset it bleeds into.
  const caps = rulesIn(css).filter(({ selector, body }) => /max-width/.test(body)
    && (targetsTable(selector) || selector.includes('.ui-table-frame')) && !CELL.test(selector));
  if (!caps.some(({ selector, body }) => targetsTable(selector) && /max-width\s*:\s*100%/.test(body))) {
    problems.push('no rule caps a table at the room it has');
  }
  if (!caps.some(({ selector, body }) => selector.includes('.ui-card') && /calc\(100%/.test(body))) {
    problems.push('the card bleed no longer caps a table at the width it bleeds to');
  }

  // The frame: one box for the table and what is attached to it, sized to the widest of
  // them. Both halves are needed — a frame that does not size to its content puts the
  // pager back on the container's edge, and a table that does not fill the frame leaves
  // the two on different edges whenever the pager is the wider part.
  const frame = rulesIn(css).find(({ selector }) => selector === '.ui-table-frame');
  if (!frame) problems.push('no frame for a table and the parts attached to it');
  else {
    if (!/^(?:fit|max)-content$/.test(declared(frame.body, 'width') || '')) {
      problems.push(`the frame does not size to its content: width: ${declared(frame.body, 'width')}`);
    }
    if (declared(frame.body, 'max-width') !== '100%') problems.push('the frame is not capped at its container');
  }
  if (!tableSizingRules(css).some(({ selector, body }) => selector.includes('.ui-table-frame')
    && declared(body, 'width') === '100%')) {
    problems.push('a table in the frame does not fill it, so it cannot share the pager\'s edges');
  }
  return problems;
}

test('a table sizes to its content and is capped, never stretched', () => {
  assert.deepEqual(tableWidths(CSS), []);
});

test('a table and the parts attached to it share one box', () => {
  const frame = rulesIn(noComments(CSS)).find(({ selector }) => selector === '.ui-table-frame');
  assert.ok(frame, 'the frame is the box; without it the pager sizes to the container');
  assert.equal(declared(frame.body, 'width'), 'fit-content');
  assert.equal(declared(frame.body, 'max-width'), '100%');
  assert.deepEqual(tableWidths(CSS.replace('.ui-table-frame .ui-table { width: 100%; }', '')).length > 0, true,
    'a table that does not fill the frame must be rejected');
});

test('the width gate rejects a table stretched back to its container', () => {
  for (const [name, mutation] of [
    ['the base rule', CSS.replace('  width: auto;', '  width: 100%;')],
    ['a modifier', `${CSS}\n.ui-table--dense { width: 100%; }`],
    ['a composition inside a card', `${CSS}\n.ui-card > .ui-table--zebra { width: calc(100% + 2 * var(--space-3)); }`],
    // The hole #504's review named: a bare `table` reached through the scroll host
    // stretches every table in the kit and names no `.ui-table` class at all.
    ['a bare table under the scroll host', `${CSS}\n.ui-table-scroll > table { width: 100%; }`],
    ['a frame sized to its container', CSS.replace('.ui-table-frame { width: fit-content;', '.ui-table-frame { width: 100%;')],
  ]) {
    assert.ok(tableWidths(mutation).length > 0, `${name} must be rejected`);
  }
  assert.ok(tableWidths(CSS.replace('  max-width: 100%;', '')).length > 0,
    'removing the cap must be rejected');
  assert.ok(tableWidths(CSS.replace('max-width: calc(100% + 2 * var(--space-3));', 'max-width: 100%;')).length > 0,
    'a card bleed that caps at the card instead of the bled width must be rejected');
  assert.ok(tableWidths(CSS.replace('.ui-table-frame { width: fit-content; max-width: 100%; }', '')).length > 0,
    'removing the frame must be rejected');
});
