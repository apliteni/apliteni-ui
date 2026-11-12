import { splitSelectorList } from '../../scripts/lib/selector-list.js';
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

function columnInsets(css, { part = 0, parts = 1, only = () => true } = {}) {
  const modifiers = [...new Set(css.match(/ui-table--[\w-]+/g))];
  assert.ok(modifiers.includes('ui-table--dense') && modifiers.includes('ui-table--compact')
    && modifiers.includes('ui-table--zebra'), 'density subjects must exist');
  const recipes = Array.from({ length: 2 ** modifiers.length }, (_, mask) =>
    modifiers.filter((_, i) => mask & (2 ** i)))
    .filter(classes => classes.some(c => /--(dense|compact|zebra)$/.test(c)));
  const total = recipes.length;
  const mine = recipes.filter((classes, i) => i % parts === part && only(classes));
  const html = mine.flatMap(classes => [false, true].map(numeric =>
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
  assert.equal(measured, mine.length * 2 * 3, 'every recipe and column must be measured');
  assert.ok(total * 2 * 3 >= 42, 'all density combinations must be covered');
  win.close();
  return failures;
}

// The recipes are dealt over four tests so no one test walks them all.
const INSET_PARTS = 4;
for (let part = 0; part < INSET_PARTS; part++) {
  test(`table headers and cells have matching horizontal insets in every density recipe, part ${part + 1} of ${INSET_PARTS}`, () => {
    assert.deepEqual(columnInsets(CSS, { part, parts: INSET_PARTS }), []);
  });
}

test('the inset gate rejects a middle-column header regression', () => {
  assert.ok(columnInsets(`${CSS}\n.ui-table--dense th:nth-child(2) { padding-left: 0; }`, { only: (classes) => classes.includes('ui-table--dense') }).length > 0);
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

// The row table: a hover table that is neither dense nor zebra.
const ROW_TABLE = '.ui-table.ui-table--hover:not(.ui-table--zebra):not(.ui-table--dense)';

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

// Cells align to the top, so two cells of a row must centre their first lines together.
// A row table's header is a size smaller than its values, so its top padding differs (#806).
function assertLevel(header, value, message) {
  const firstLine = (cell) => parseFloat(cell.paddingTop) + parseFloat(cell.lineHeight) / 2;
  const level = header.lineHeight === value.lineHeight
    ? header.paddingTop === value.paddingTop
    : Math.abs(firstLine(header) - firstLine(value)) < 0.01;
  assert.ok(level, `${message} ${header.paddingTop} puts its first line off the value's ${value.paddingTop}`);
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
      assertLevel(header, value, `${modifier}: body header top padding`);
      assert.equal(header.paddingBottom, value.paddingBottom, `${modifier}: body header bottom padding`);
      if (modifier === 'ui-table--compact') {
        // The cell aligns to the top, so the top step centres one line in the 33px row (#806).
        assert.equal(header.paddingTop, `${SPACE['--space-2']}px`, 'compact body header Top');
        assert.equal(header.paddingBottom, `${SPACE['--space-1']}px`, 'compact body header Bottom');
        for (const side of ['Left', 'Right']) {
          assert.equal(header[`padding${side}`], `${SPACE['--space-3']}px`, `compact body header ${side}`);
        }
      }
      const rows = [...document.querySelectorAll('tfoot tr')];
      assert.equal(rows.length, 2);
      for (const row of rows) {
        const [label, value] = [...row.cells].map((cell) => getComputedStyle(cell));
        assert.equal(label.borderBottomWidth, value.borderBottomWidth, `${modifier}: complete footer rule`);
        assertLevel(label, value, `${modifier}: label top padding`);
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
      // The row table draws no lines between its rows; the totals' strong rule divides them.
      if (modifier !== 'ui-table--zebra' && modifier !== 'ui-table--hover') {
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

// A right-aligned last column ends where its header ends. The base table dropped the cell gap
// on the header only, so the figures stood 16px in from the header and the table edge. Limit:
// JSDOM computes padding, not layout, so this holds the inset the edge is made of.
function checkLastColumnEdge(css) {
  let measured = 0;
  for (const modifier of tableModifiers(css)) {
    const dom = footerTable(css, modifier);
    try {
      const { document, getComputedStyle } = dom.window;
      const header = getComputedStyle(document.querySelector('thead th:last-child'));
      for (const cell of document.querySelectorAll('tbody td:last-child, tfoot td:last-child')) {
        assert.equal(getComputedStyle(cell).paddingRight, header.paddingRight, `${modifier}: last body cell ends with its header`);
        // A hovered row's band is the last cell, so it needs room past the figures.
        if (modifier === 'ui-table--hover') assert.notEqual(getComputedStyle(cell).paddingRight, '0px', 'hover: the band keeps room past the last figure');
        measured++;
      }
    } finally { dom.window.close(); }
  }
  assert.ok(measured >= 14, `every modifier's last column must be measured, got ${measured}`);
}

test('a right-aligned last column shares its header\'s right edge across table modifiers', () => {
  checkLastColumnEdge(CSS);
});

test('the last-column check rejects a hover table whose band ends at the figures', () => {
  // A plain hover table is the row table, which pads its end cells with --cell-edge.
  const without = CSS.replace(`${ROW_TABLE} :is(th, td):last-child { padding-right: var(--cell-edge); }`,
    `${ROW_TABLE} :is(th, td):last-child { padding-right: 0; }`);
  assert.notEqual(without, CSS, 'the mutation edits the sheet');
  assert.throws(() => checkLastColumnEdge(without));
});

test('the last-column check rejects a sheet that leaves the body cell gap', () => {
  assert.throws(() => checkLastColumnEdge(CSS.replace('.ui-table td:last-child { padding-right: 0; }', '')));
});

// JSDOM checks the linked cell's cascade. The browser gate checks paint.
function checkLinkedHoverInset(css) {
  let measured = 0;
  for (const modifier of ['ui-table--hover', 'ui-table--hover ui-table--dense', 'ui-table--hover ui-table--compact', 'ui-table--hover ui-table--zebra']) {
    const dom = new JSDOM(`<style>${substitute(css, tokensFor('light', 'default'))}</style>
      <table class="ui-table ${modifier}"><thead><tr><th>Invoice</th></tr></thead>
      <tbody><tr><td class="ui-table__linked"><a href="#invoice">Invoice</a></td></tr></tbody></table>`);
    try {
      const { document, getComputedStyle } = dom.window;
      const header = getComputedStyle(document.querySelector('th'));
      const link = getComputedStyle(document.querySelector('td a'));
      // The one cell is both ends of its row, so its link holds the room at both.
      for (const side of ['paddingLeft', 'paddingRight']) {
        assert.equal(link[side], header[side], `${modifier}: linked end cell keeps the header inset, ${side}`);
        assert.notEqual(link[side], '0px');
        // A dense hover fill keeps --space-2 at its ends. The row table and zebra keep their own inset.
        if (modifier.includes('dense')) assert.equal(link[side], `${SPACE['--space-2']}px`, `${modifier}: linked end cell room, ${side}`);
      }
      measured++;
    } finally { dom.window.close(); }
  }
  assert.equal(measured, 4);
}

test('a linked end cell keeps the hover table inset', () => checkLinkedHoverInset(CSS));
test('the linked end-cell check rejects a missing inset', () => {
  // The row table states its own linked end cells, so only the dense rule is mutated here.
  for (const end of ['first', 'last']) {
    const variant = CSS.replace(new RegExp(`:where\\(\\.ui-table--hover:not\\(\\.ui-table--zebra\\)\\):is\\(\\.ui-table--dense, \\.ui-table--compact\\) td\\.ui-table__linked:${end}-child > :is\\([^{}]+\\{[^}]+\\}`), '');
    assert.notEqual(variant, CSS, `the dense and compact ${end}-child rule must exist to be taken out`);
    assert.throws(() => checkLinkedHoverInset(variant), `a missing dense or compact ${end}-child inset must be rejected`);
  }
});

/**
 * A hovered row's fill spans the table. On a dense hover table it rounds its ends (#773):
 * each end cell keeps --space-2 inside the fill, the same as its header, and an end action
 * cell keeps it. A row line that met a round corner crossed it, so the hovered row, the
 * row above it and, over the first row, the header drop their lines. Every other line stays.
 * The row table of #770 (base and compact) draws no body row line, and its end figure
 * cells start and end with their header.
 *
 * Limit: JSDOM has no pointer, so `:hover` is rewritten to a class the test sets. It
 * computes padding and border colour, not the paint of the corners. It does not resolve
 * the row table's --cell-edge, so the row table's room is read against its header only.
 */
function checkHoverRowEnds(css) {
  const probe = substitute(css, tokensFor('light', 'default')).replace(/:hover\b/g, '.is-probe-hover');
  assert.notEqual(probe, css, 'the sheet must have hover rules to probe');
  const room = `${SPACE['--space-2']}px`;
  const clear = (style) => style.borderBottomWidth === '0px' || ['transparent', 'rgba(0, 0, 0, 0)'].includes(style.borderBottomColor);
  const failures = [];
  let measured = 0;
  const shapes = ['', 'ui-table--dense', 'ui-table--compact'].flatMap((variant) => [
    { variant, end: '<td class="ui-table__num">' },
    { variant, end: '<td class="ui-table__act"><button class="ui-btn">Revoke</button>' },
  ]);
  for (const { variant, end } of shapes) for (let hovered = 0; hovered < 3; hovered++) {
    const dom = new JSDOM(`<style>${probe}</style><table class="ui-table ui-table--hover ${variant}">
      <thead><tr><th>Campaign</th><th class="ui-table__num">Clicks</th></tr></thead>
      <tbody>${[0, 1, 2].map((i) => `<tr class="${i === hovered ? 'is-probe-hover' : ''}"><td>Demo ${i}</td>${end}${i}</td></tr>`).join('')}</tbody></table>`);
    const at = `${variant || 'base'} ${end.includes('__act') ? 'action' : 'figure'} row ${hovered + 1}`;
    try {
      const { document, getComputedStyle } = dom.window;
      const rows = [...document.querySelectorAll('tbody tr')];
      const head = [...document.querySelectorAll('thead th')].map((th) => getComputedStyle(th));
      const first = getComputedStyle(rows[hovered].firstElementChild);
      const last = getComputedStyle(rows[hovered].lastElementChild);
      const dense = variant === 'ui-table--dense';
      if (dense ? first.paddingLeft !== room || head[0].paddingLeft !== room : first.paddingLeft !== head[0].paddingLeft) failures.push(`${at}: first cell room ${first.paddingLeft}, header ${head[0].paddingLeft}`);
      // The row table's action cell gives part of its room to the button's own inset.
      if (dense ? last.paddingRight !== room || head[1].paddingRight !== room : !end.includes('__act') && last.paddingRight !== head[1].paddingRight) failures.push(`${at}: last cell room ${last.paddingRight}, header ${head[1].paddingRight}`);
      if (dense && clear(head[0]) !== (hovered === 0)) failures.push(`${at}: header line ${head[0].borderBottomColor}`);
      // The last row of the table has no line of its own, so only the rows above it are read.
      rows.slice(0, 2).forEach((row, i) => {
        const style = getComputedStyle(row.firstElementChild);
        if (clear(style) !== (!dense || i === hovered || i === hovered - 1)) failures.push(`${at}: line under row ${i + 1} ${style.borderBottomColor}`);
      });
      measured++;
    } finally { dom.window.close(); }
  }
  assert.equal(measured, shapes.length * 3, 'every row of every shape must be hovered once');
  return failures;
}

test('a hovered row keeps room inside its fill and no line crosses its corners', () => {
  assert.deepEqual(checkHoverRowEnds(CSS), []);
});

test('the hover-row check rejects a sheet that loses an end room or a dropped line', () => {
  const headerLine = ',\n.ui-table--hover:not(.ui-table--zebra) thead:has(+ tbody > tr:first-child:hover) > tr > th';
  const rowAbove = '.ui-table--hover:not(.ui-table--zebra) tbody tr:has(+ tr:hover) > :is(td, th),\n';
  const variantRoom = /:where\(\.ui-table--hover:not\(\.ui-table--zebra\)\):is\(\.ui-table--dense, \.ui-table--compact\) :is\(th, td\):last-child \{[^}]*\}/;
  for (const [name, mutated] of [
    ['row table line', CSS.replace(`${ROW_TABLE} tbody > tr > :is(td, th) { border-bottom: 0; }`, '')],
    ['dense and compact room', CSS.replace(variantRoom, '')],
    ['header line', CSS.replace(headerLine, '')],
    ['row-above line', CSS.replace(rowAbove, '')],
  ]) {
    assert.notEqual(mutated, CSS, `the ${name} rule must exist to be taken out`);
    assert.notDeepEqual(checkHoverRowEnds(mutated), [], `a sheet without the ${name} rule must be rejected`);
  }
});

test('the linked end-cell check rejects a row table without its last-cell inset', () => {
  // Limit: the check resolves every var(--cell-edge) to the sheet's last --cell-edge, which must differ from the link's 12px fallback.
  const without = CSS.replace(`${ROW_TABLE} td.ui-table__linked:last-child > :is(a:not([class]), a.ui-identity):only-child { padding-right: var(--cell-edge); }`, '');
  assert.notEqual(without, CSS);
  assert.throws(() => checkLinkedHoverInset(without));
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

const CELL = /(?:__|\s(?:thead|tbody|tr|caption)\b)/;
// Comments out first: the header comment above the base rule names a cell class,
// and an uncommented scan read it as part of that rule's selector.
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
// `:where(…)` and `:is(…)` hold their own comma lists, so the wrapper goes before the
// selector is split on commas — `.ui-card > :where(.ui-table--dense, .ui-table--zebra)`
// is two selectors, and the second one ended in a bracket the match could not read.
const compounds = (selector) => splitSelectorList(selector.replace(/:where\(|:is\(|\)/g, ''))
  .map((part) => part.trim().split(/[\s>+~]+/).filter(Boolean).pop() || '');
const TABLE_ELEMENT = /^(?:table|\.ui-table(?:--[\w-]+)?)(?:[:.[][^\s]*)?$/;
const targetsTable = (selector) => compounds(selector).some((last) => TABLE_ELEMENT.test(last));

// A brace walk, not one regex: a media block opens a block of its own, and a match that
// stops at the first `}` swallows the first rule inside it. A rule in a media block has to
// be a subject of its own, or the sheet can hide one there.
const rulesIn = (css) => {
  const src = noComments(css);
  const open = [];
  const out = [];
  let start = 0;
  for (let i = 0; i < src.length; i += 1) {
    if (src[i] === '{') {
      open.push(src.slice(start, i).trim());
      start = i + 1;
    } else if (src[i] === '}') {
      const selector = open.pop() || '';
      const body = src.slice(start, i);
      if (selector && !selector.startsWith('@') && !body.includes('{')) out.push({ selector, body });
      start = i + 1;
    }
  }
  return out;
};
const tableSizingRules = (css) => rulesIn(css)
  .filter(({ selector, body }) => targetsTable(selector) && !CELL.test(selector)
    && /(?:^|;|\s)width\s*:/.test(body));

function tableWidths(css) {
  const rules = tableSizingRules(css);
  assert.ok(rules.length > 0, 'no rule in this sheet sizes a table — the subject is gone');
  const problems = [];
  let measured = 0;

  for (const { selector, body } of rules) {
    for (const [, value] of body.matchAll(/(?:^|;|\s)width\s*:\s*([^;}]+)/g)) {
      const width = value.trim();
      const expected = {
        '.ui-table': '100%',
        '.ui-card > :where(.ui-table--dense, .ui-table--zebra)': 'calc(100% + 2 * var(--space-3))',
        ':where(.ui-card--fit) .ui-table': 'auto',
        '.ui-card--fit > :where(.ui-table--dense, .ui-table--zebra)': 'auto',
        // A dense hover table holds 8px at its ends, so it bleeds by that much (#773).
        '.ui-card > .ui-table--dense.ui-table--hover:not(.ui-table--zebra)': 'calc(100% + 2 * var(--space-2))',
        '.ui-card--fit > .ui-table--dense.ui-table--hover:not(.ui-table--zebra)': 'auto',
        // The row table and its frame reach the card's edges, past the card's padding.
        '.ui-card > :is(.ui-table.ui-table--hover:not(.ui-table--zebra):not(.ui-table--dense), .ui-table-scroll:has(> .ui-table.ui-table--hover:not(.ui-table--zebra):not(.ui-table--dense)))': 'calc(100% + 2 * var(--space-6))',
        '.ui-card--fit > :is(.ui-table.ui-table--hover:not(.ui-table--zebra):not(.ui-table--dense), .ui-table-scroll:has(> .ui-table.ui-table--hover:not(.ui-table--zebra):not(.ui-table--dense)))': 'auto',
      }[selector];
      if (width !== expected) {
        problems.push(`${selector} sizes the table itself: width: ${width}`);
      }
      measured++;
    }
  }
  assert.equal(measured, rules.length, 'every sizing rule must be measured once');
  for (const selector of [
    '.ui-table',
    '.ui-card > :where(.ui-table--dense, .ui-table--zebra)',
    ':where(.ui-card--fit) .ui-table',
    '.ui-card--fit > :where(.ui-table--dense, .ui-table--zebra)',
  ]) {
    if (!rules.some((rule) => rule.selector === selector)) {
      problems.push(`${selector} has no sizing rule`);
    }
  }
  // A dense hover table bleeds by --space-2 at each end, or its first content sits 4px off
  // the card's text edge (#773). The width above is one end of it; these are the rest.
  // It reads the declarations, not the layout: the 4px it prevents is a browser measurement.
  for (const [selector, property, value] of [
    ['.ui-card > .ui-table--dense.ui-table--hover:not(.ui-table--zebra)', 'width', 'calc(100% + 2 * var(--space-2))'],
    ['.ui-card > .ui-table--dense.ui-table--hover:not(.ui-table--zebra)', 'margin-inline', 'calc(-1 * var(--space-2))'],
    ['.ui-card--fit > .ui-table--dense.ui-table--hover:not(.ui-table--zebra)', 'max-width', 'calc(100% + 2 * var(--space-2))'],
  ]) {
    const rule = rules.find((candidate) => candidate.selector === selector);
    const found = rule && rule.body.match(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;}]+)`));
    if (!found || found[1].trim() !== value) {
      problems.push(`${selector} no longer bleeds by --space-2: ${property}: ${found ? found[1].trim() : 'missing'}`);
    }
  }
  // The cap is the other half: without it a short table shrinks but a bled one
  // inside a card loses the end inset it bleeds into.
  const caps = rulesIn(css).filter(({ selector, body }) => /max-width/.test(body)
    && targetsTable(selector) && !CELL.test(selector));
  if (!caps.some(({ body }) => /max-width\s*:\s*100%/.test(body))) {
    problems.push('no rule caps a table at the room it has');
  }
  // Every card bleed caps at its bled width, so each bleed cap is read, not only one.
  const cardCaps = caps.filter(({ selector }) => selector.includes('.ui-card >') || selector.includes('.ui-card--fit >'));
  if (!cardCaps.length || cardCaps.some(({ body }) => !/calc\(100%/.test(body))) {
    problems.push('the card bleed no longer caps a table at the width it bleeds to');
  }
  return problems;
}

test('tables fill their container unless a fit card requests content sizing', () => {
  assert.deepEqual(tableWidths(CSS), []);
});

test('the width gate rejects a table stretched back to its container', () => {
  for (const [name, mutation] of [
    ['the base rule shrinking every table', CSS.replace('  width: 100%;', '  width: auto;')],
    ['the fit rules losing their widths', CSS.replaceAll('  width: auto;', '')],
    ['the fit rule stretching its table', CSS.replace('  width: auto;', '  width: 100%;')],
    ['a modifier', `${CSS}\n.ui-table--dense { width: 100%; }`],
    ['a composition inside a fit card', `${CSS}\n.ui-card--fit > .ui-table--zebra { width: 100%; }`],
    // The hole #504's first review named: a bare `table` reached through the scroll
    // host stretches every table in the kit and names no `.ui-table` class at all.
    ['a bare table under the scroll host', `${CSS}\n.ui-table-scroll > table { width: 100%; }`],
    // And the one its second review named: a wrapper sized to a pager, with the table
    // filling it, is a stretch written in two rules instead of one.
    ['a table filling a box of its own', `${CSS}\n.ui-table-frame .ui-table { width: 100%; }`],
    // A rule hidden in a media block used to be unreadable, because the match that read
    // its opener stopped at the first `}` inside it.
    ['a rule inside a media block', `${CSS}\n@media (max-width: 560px) { .ui-table--hover { width: 100%; } }`],
  ]) {
    assert.ok(tableWidths(mutation).length > 0, `${name} must be rejected`);
  }
  assert.ok(tableWidths(CSS.replace('  max-width: 100%;', '')).length > 0,
    'removing the cap must be rejected');
  assert.ok(tableWidths(CSS.replace(/max-width: calc\(100% \+ 2 \* var\(--space-\d\)\);/g, 'max-width: 100%;')).length > 0,
    'a card bleed that caps at the card instead of the bled width must be rejected');
  const HOVER = /\.ui-card > \.ui-table--dense\.ui-table--hover:not\(\.ui-table--zebra\) \{[^}]*\}/;
  const FIT_HOVER = /\.ui-card--fit > \.ui-table--dense\.ui-table--hover:not\(\.ui-table--zebra\) \{[^}]*\}/;
  for (const [name, mutation] of [
    ['the dense hover bleed removed', CSS.replace(HOVER, '')],
    ['the dense hover fit bleed removed', CSS.replace(FIT_HOVER, '')],
    ['the dense hover width at the dense bleed', CSS.replace(HOVER, (rule) => rule.replace('--space-2', '--space-3'))],
    ['the dense hover margin at the dense bleed', CSS.replace(HOVER, (rule) => rule.replace('calc(-1 * var(--space-2))', 'calc(-1 * var(--space-3))'))],
    ['the dense hover fit cap at the dense bleed', CSS.replace(FIT_HOVER, (rule) => rule.replace('--space-2', '--space-3'))],
  ]) {
    assert.notEqual(mutation, CSS, `${name}: the mutation must change the sheet`);
    assert.ok(tableWidths(mutation).length > 0, `${name} must be rejected`);
  }
});

/**
 * Rule: the card bleed reaches the table in the shapes the kit actually renders.
 *
 * Both bleed rules are direct-child selectors on the card, and a wrapper added inside
 * `DataTable` put a `<div>` between them and the table: every dense React table in a card
 * lost its bleed, its columns moved 24px off the card's text edge, and every gate stayed
 * green. The selectors are read out of the sheet rather than written here, so renaming one
 * fails this rather than passing it quietly.
 *
 * What it does not reach: the bleed's own numbers, and any shape the kit does not render.
 * jsdom matches selectors; the margin it would pull is the rule above's business.
 */
const SHAPES = {
  'a vanilla dense table in a card': '<div class="ui-card"><table class="ui-table ui-table--dense"></table></div>',
  'a vanilla zebra table in a card': '<div class="ui-card"><table class="ui-table ui-table--zebra"></table></div>',
  'a React dense table in a card': '<div class="ui-card"><div class="ui-table-scroll">'
    + '<table class="ui-table ui-table--dense"></table></div></div>',
};

function bleedReaches(css, shapes = SHAPES) {
  const selectors = rulesIn(css)
    .filter(({ selector, body }) => selector.startsWith('.ui-card >') && /margin-inline/.test(body))
    .map(({ selector }) => selector);
  assert.ok(selectors.length >= 2, `the card bleed is gone from the sheet: ${selectors.length} rule(s)`);
  const missed = [];
  let measured = 0;
  for (const [name, html] of Object.entries(shapes)) {
    const win = new JSDOM(html).window;
    if (!selectors.some((selector) => win.document.querySelector(selector))) missed.push(name);
    measured++;
    win.close();
  }
  assert.equal(measured, Object.keys(shapes).length, 'every shape must be measured');
  return missed;
}

test('the card bleed reaches the table in every shape the kit renders', () => {
  assert.deepEqual(bleedReaches(CSS), []);
});

test('the bleed gate rejects a wrapper that puts the table out of reach', () => {
  assert.deepEqual(
    bleedReaches(CSS, {
      framed: '<div class="ui-card"><div class="ui-table-frame"><div class="ui-table-scroll">'
        + '<table class="ui-table ui-table--dense"></table></div></div></div>',
    }),
    ['framed'],
    'a table one wrapper further from the card must be reported',
  );
  assert.throws(() => bleedReaches(CSS.replace(/margin-inline/g, 'margin-left')), /card bleed is gone/);
});
