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

/* Table footers: the rules that separate totals from line items, and the padding a
 * footer label takes. Source CSS in jsdom, so this covers the shipped rules and their
 * cascade — not browser line breaking, not layout, not contrast. Storybook captures
 * check the rendered edges. Decided in #385. */

// Every modifier in the sheet is a subject, so a new density cannot ship unmeasured.
const tableModifiers = (css) => {
  const found = [...new Set(css.match(/\.ui-table--[\w-]+/g))].map((selector) => selector.slice(1));
  assert.ok(found.length >= 6, 'discover table modifiers from the shipped sheet');
  return ['', ...found];
};

function footerTable(css, modifier = '') {
  return new JSDOM(`<style>${substitute(css, tokensFor('dark', 'default'))}</style>`
    + `<table class="ui-table ${modifier}">
    <thead><tr><th>Item</th><th class="ui-table__num">Amount (EUR)</th></tr></thead>
    <tbody><tr><th scope="row">Sample</th><td>10</td></tr></tbody>
    <tfoot><tr><th>Subtotal</th><td>10</td></tr>
      <tr><th class="ui-table__num--strong">Total</th><td class="ui-table__num ui-table__num--strong">12</td></tr></tfoot>
  </table>`);
}

function checkFooter(css) {
  let measured = 0;
  for (const modifier of tableModifiers(css)) {
    const dom = footerTable(css, modifier);
    try {
      const { document, getComputedStyle } = dom.window;
      const bodyHeader = document.querySelector('tbody th[scope="row"]');
      assert.ok(bodyHeader, 'measure the body row header');
      // A row header is a body cell, so it takes the body cell's padding rather than
      // the head's: `.ui-table th` pads 0 over and --space-3 under, which inside the
      // body sits the name low against the values beside it.
      const header = getComputedStyle(bodyHeader);
      const value = getComputedStyle(document.querySelector('tbody td'));
      assert.equal(header.paddingTop, value.paddingTop, `${modifier}: body header top padding`);
      assert.equal(header.paddingBottom, value.paddingBottom, `${modifier}: body header bottom padding`);
      if (modifier === 'ui-table--compact') {
        for (const side of ['Top', 'Bottom']) {
          assert.equal(header[`padding${side}`], `${SPACE['--space-1']}px`, `compact body header ${side}`);
        }
        for (const side of ['Left', 'Right']) {
          assert.equal(header[`padding${side}`], `${SPACE['--space-3']}px`, `compact body header ${side}`);
        }
      }
      const rows = [...document.querySelectorAll('tfoot tr')];
      assert.equal(rows.length, 2);
      for (const row of rows) {
        const [label, value] = [...row.cells].map((cell) => getComputedStyle(cell));
        assert.equal(label.borderBottomWidth, value.borderBottomWidth, `${modifier}: complete footer rule`);
        assert.equal(label.paddingTop, value.paddingTop, `${modifier}: label top padding`);
        assert.equal(label.paddingBottom, value.paddingBottom, `${modifier}: label bottom padding`);
        assert.equal(getComputedStyle(row.cells[0]).textAlign, 'right', `${modifier}: footer label sits against its figure`);
        measured++;
      }
      for (const cell of rows[0].cells) {
        assert.equal(getComputedStyle(cell).borderTopWidth, '2px', `${modifier}: totals open with the strong rule`);
      }
      // `.ui-table th` states its own weight and ink, so the strong helper has to
      // outrank it or the row comes out bold in the figure only.
      const [totalLabel, totalValue] = [...rows[1].cells].map((cell) => getComputedStyle(cell));
      assert.equal(totalLabel.fontWeight, totalValue.fontWeight, `${modifier}: the strong row carries one weight`);
      assert.equal(totalLabel.color, totalValue.color, `${modifier}: the strong row carries one ink`);
      if (modifier !== 'ui-table--zebra') {
        assert.equal(getComputedStyle(document.querySelector('tbody td')).borderBottomWidth, '1px',
          `${modifier}: items close before totals`);
      }
      document.querySelector('tfoot').remove();
      assert.equal(getComputedStyle(document.querySelector('tbody td')).borderBottomWidth, '0px',
        `${modifier}: no footer preserves last-row behavior`);
    } finally { dom.window.close(); }
  }
  assert.ok(measured >= 14, `every modifier's footer rows must be measured, got ${measured}`);
}

test('table footers keep complete rules and body padding across table modifiers', () => {
  checkFooter(CSS);
});

test('the footer check rejects the old per-row-group border reset', () => {
  assert.throws(() => checkFooter(`${CSS}\n.ui-table tr:last-child td { border-bottom: 0; }`));
});

test('the footer check rejects a sheet with no divide before the totals', () => {
  assert.throws(() => checkFooter(`${CSS}\n.ui-table tfoot tr:first-child > :is(th, td) { border-top: 0; }`));
});

test('the footer check rejects a sheet that leaves footer labels on the left', () => {
  assert.throws(() => checkFooter(`${CSS}\n.ui-table tfoot th { text-align: left; }`));
});

test('the footer check rejects a sheet where the header cell outranks the strong helper', () => {
  assert.throws(() => checkFooter(`${CSS}\n.ui-table th.ui-table__num--strong { font-weight: var(--weight-medium); }`));
});

test('the footer check rejects a body row header narrowed back to the footer', () => {
  const narrowed = CSS.replace('.ui-table--compact :is(tbody, tfoot) th', '.ui-table--compact tfoot th');
  assert.notEqual(narrowed, CSS, 'mutation must narrow the compact body-cell rule');
  assert.throws(() => checkFooter(narrowed), /ui-table--compact: body header top padding/);
});

test('the footer check rejects a dense body row header left on the head\'s padding', () => {
  const narrowed = CSS.replace('.ui-table--dense :is(tbody, tfoot) th', '.ui-table--dense tfoot th');
  assert.notEqual(narrowed, CSS, 'mutation must narrow the dense body-cell rule');
  assert.throws(() => checkFooter(narrowed), /ui-table--dense: body header top padding/);
});

// A numeric column is sized to its content while .ui-table__title claims the rest, so a
// two-word numeric header is the only cell in that column that can wrap.
function checkNumericHeaderWrap(css) {
  let measured = 0;
  for (const modifier of tableModifiers(css)) {
    const dom = footerTable(css, modifier);
    try {
      const { document, getComputedStyle } = dom.window;
      const header = document.querySelector('thead th.ui-table__num');
      assert.ok(header, `${modifier}: the fixture must carry a numeric header`);
      assert.equal(getComputedStyle(header).whiteSpace, 'nowrap', `${modifier}: numeric header holds one line`);
      measured++;
    } finally { dom.window.close(); }
  }
  assert.ok(measured >= 7, `every modifier's numeric header must be measured, got ${measured}`);
}

test('numeric headers hold one line across table modifiers', () => {
  checkNumericHeaderWrap(CSS);
});

test('the numeric-header check rejects a sheet that lets them wrap', () => {
  assert.throws(() => checkNumericHeaderWrap(`${CSS}\n.ui-table th.ui-table__num { white-space: normal; }`));
});

/**
 * The pin's divider is the edge a column keeps while the rest moves under it, so it may
 * only be painted where the region can actually move horizontally. The sheet says this in two halves:
 * the scroll box reports its scroll state, and a query hides the divider where the
 * answer is "no horizontal scroll". Either half alone paints the
 * line at every width — the first with nothing listening, the second with nothing to ask.
 *
 * Its limit: this reads the declarations, not the paint. JSDOM resolves no container
 * query, so that the divider is transparent at 1280 and solid at 390 is measured in
 * Chromium by the three-shape checks in the review evidence.
 */
const PIN_PAINT = /@container\s+not\s+scroll-state\(\s*scrollable:\s*x\s*\)\s*\{([^}]*\{[^}]*\}[^}]*)\}/;

const checkPinDividerPaint = (css) => {
  const resting = css.match(
    /\.ui-table--pinned\s+\.ui-table__identity[^{]*\{([^}]*)\}/,
  );
  assert.ok(resting, 'the pinned column must declare its resting paint');
  assert.match(
    resting[1],
    /border-right:\s*1px\s+solid\s+var\(--border\)/,
    'the pinned column keeps its divider at rest, so an engine that cannot answer the query keeps it',
  );

  assert.match(
    css,
    /\.ui-table-scroll\s*\{[^}]*container-type:\s*scroll-state/,
    'the scroll box must report its scroll state, or nothing can ask whether it scrolls',
  );

  const stood = css.match(PIN_PAINT);
  assert.ok(stood, 'a scroll-state query must cover the region that cannot scroll');
  assert.match(
    stood[1],
    /\.ui-table--pinned[^{]*\.ui-table__identity[^{]*\{[^}]*border-right-color:\s*transparent/,
    'where the region cannot scroll, the pinned divider stands down',
  );
  assert.match(
    stood[1],
    /\.ui-table__selection/,
    'the selection column pins on the same terms, so it stands down on the same terms',
  );
};

test('the pinned divider is painted only where the region can scroll', () => {
  checkPinDividerPaint(CSS);
});

test('the pin-paint check rejects a sheet whose scroll box reports no scroll state', () => {
  assert.throws(() => checkPinDividerPaint(
    CSS.replace(/\.ui-table-scroll\s*\{\s*container-type:\s*scroll-state;\s*\}/, ''),
  ));
});

test('the pin-paint check rejects a sheet that never stands the divider down', () => {
  assert.throws(() => checkPinDividerPaint(CSS.replace(PIN_PAINT, '')));
});

test('the pin-paint check rejects a sheet that stands only the identity column down', () => {
  assert.throws(() => checkPinDividerPaint(
    CSS.replace(/(@container not scroll-state\(scrollable: x\) \{\s*\.ui-table--pinned )[^{]*(\{)/,
      '$1.ui-table__identity $2'),
  ));
});

test('the pin-paint check rejects a sheet that drops the divider from the resting rule', () => {
  assert.throws(() => checkPinDividerPaint(
    CSS.replace(/(\.ui-table--pinned \.ui-table__identity[^{]*\{[^}]*)border-right:\s*1px solid var\(--border\);/, '$1'),
  ));
});

test('the pin-paint check rejects a condition that counts vertical overflow', () => {
  assert.throws(() => checkPinDividerPaint(
    CSS.replace('not scroll-state(scrollable: x)', 'scroll-state(scrollable: none)'),
  ));
});
