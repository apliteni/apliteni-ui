import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

/**
 * The guarantee: a link written inside a table cell takes the kit ring on keyboard focus,
 * and WHICH ring follows the cell it stands in. A cell marked `.ui-table__linked` holding
 * one link hands the link its padding, so the link's box is the cell's and the ring is the
 * inward band; every other cell link keeps its own box and the outset ring.
 * why: docs/components.md#dense-financial-tables; decided in #510 and #500.
 *
 * Subjects come from the markup and from SHAPES below, because a composition the kit does
 * not ship is still one a consumer may write.
 *
 * Limits: the cascade, not paint; literal tags only; and `@media` is invisible here, which
 * is why the stacked card's undo is measured in src/styles/table-identity.test.js. A rule
 * painting `var(--ring)` must carry no selector list — the kit's other ring gates split a
 * selector on every comma.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../..");

// Sheets that can reach a cell's link: the table's own rules, the shared ring, and the
// button rules a `.ui-btn` link in a cell brings with it.
const SHEETS = ["table.css", "base.css", "button.css"]
  .map((file) => readFileSync(path.join(here, file), "utf8"))
  .join("\n");

// Surfaces the kit renders. Test files are left out: their fixtures exist to drive a
// check, not to be looked at, and several build broken markup on purpose.
//
// Tracked files, not a directory walk: `site/public` and `storybook-static` hold built
// copies of these same stories, and a gate whose subject count depends on whether anyone
// has run a build is a gate that fails for the wrong reason. Stage a new story before
// running this.
const SOURCES = ["stories", "react/src", "src/components", "site"];
const RENDERED = /\.(js|jsx|ts|tsx|html)$/;

const sourceFiles = () => execFileSync("git", ["ls-files", "-z", "--", ...SOURCES], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter((file) => file && RENDERED.test(file) && !/\.test\./.test(file));

/** Every `<a>` written inside a cell of a table, carried with the WHOLE row it stands in
 *  and its own position among that row's links. The row is what makes `:first-child`,
 *  `:nth-child()` and `:only-child` read as the browser reads them: a reconstruction that
 *  rebuilds each link as the lone child of a first cell makes those three true of every
 *  subject, and the rules keyed on them then appear to cover compositions they never
 *  reach — a link in the second cell, or one standing beside words (#500 review). */
const cellLinks = () => sourceFiles().flatMap((file) => {
  const source = readFileSync(path.join(root, file), "utf8");
  return [...source.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/g)].flatMap((table) => {
    const open = table[0].match(/<table\b[^>]*>/)[0];
    // Through the row, because a revoked row styles the link inside it (`tr.is-dead`).
    return [...table[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].flatMap((row) => {
      const subjects = [];
      for (const cell of row[0].matchAll(/<(t[dh])\b[^>]*>[\s\S]*?<\/\1>/g)) {
        for (const link of cell[0].matchAll(/<a\b[^>]*>/g)) {
          subjects.push({
            file, table: open, row: row[0], cell: cell[1], link: link[0], at: subjects.length,
          });
        }
      }
      return subjects;
    });
  });
});

// JSX spells the attribute `className`, which HTML parsing lowercases to `classname` and
// leaves `classList` empty — every selector then misses, and the gate reports a hole that
// is not there. The spelling is normalised before the markup is parsed.
const asHtml = (tag) => tag.replace(/\bclassName=/g, "class=");

/** One link, standing in the row and table the source puts it in. `at` picks it out of
 *  the row's links; the row is mounted as written, interpolations and all — a `${id}` or
 *  `{id}` parses to the text node it will be, which is exactly what `:only-child` has to
 *  be read against. */
const element = (subject) => {
  const row = asHtml(subject.row);
  const body = subject.cell === "th" ? `<thead>${row}</thead>` : `<tbody>${row}</tbody>`;
  const dom = new JSDOM(`${asHtml(subject.table)}${body}</table>`);
  return dom.window.document.querySelectorAll("a")[subject.at ?? 0];
};

/** A fabricated subject: a row of cells written out, and which of its links to read. */
const shape = ({ what, table = "ui-table", cells, at = 0, rowOpen = "<tr>", cell = "td", ...rest }) => ({
  what,
  file: "fixture",
  table: `<table class="${table}">`,
  row: `${rowOpen}${cells.join("")}</tr>`,
  cell,
  link: what,
  at,
  ...rest,
});

/** A selector list split on its own commas — the ones inside `:where(td, th)` are not
 *  separators, and splitting on them yields fragments that parse as neither. The kit's
 *  other ring gates do split on every comma, which is why the rule this file holds carries
 *  no `:where()`; this one reads whatever the sheet says, so it does not depend on that. */
const selectorParts = (list) => {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of list) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) { parts.push(current); current = ""; continue; }
    current += character;
  }
  return [...parts, current].map((part) => part.trim()).filter(Boolean);
};

/** Selectors of every rule that paints the kit ring on focus. The band is an outline
 *  since #578. Comments come out first, or the prose above a rule is read as part of
 *  its selector. */
const ringSelectors = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /outline:\s*var\(--ring\)/.test(body))
  .flatMap(([, selector]) => selectorParts(selector))
  .filter((part) => part.includes(":focus-visible"));

/** The states a reading can be in. JSDOM matches none of them, so each is stripped before the
 *  selector is handed to `matches()` and accounted for by the caller instead. */
const STATES = [":focus-visible", ":hover"];

/** Does this selector reach the element, in a reading that is in the states `on`? A selector
 *  keyed to a state the reading is not in reaches nothing — which is how a rest reading and a
 *  hover reading of the same element come out different. */
const reaches = (selector, el, on = []) => {
  if (STATES.some((state) => selector.includes(state) && !on.includes(state))) return false;
  return el.matches(STATES.reduce((rest, state) => rest.replaceAll(state, ""), selector));
};

/** Specificity as (ids, classes, types) of a selector with no `:is()`, `:not()` or
 *  `:where()` left in it. */
const countOf = (flat) => {
  const count = (pattern) => (flat.match(pattern) || []).length;
  return [
    count(/#[\w-]+/g),
    count(/\.[\w-]+/g) + count(/\[[^\]]*\]/g) + count(/(?<!:):[\w-]+/g),
    count(/(?:^|[\s>+~(,])[a-zA-Z][\w-]*/g) + count(/::[\w-]+/g),
  ];
};
const outranks = (a, b) => a.some((n, i) => n !== b[i] && n > b[i] && a.slice(0, i).every((m, j) => m === b[j]));

/** Specificity as (ids, classes, types). `:where()` contributes nothing; `:not()` and
 *  `:is()` contribute their MOST SPECIFIC argument, so a list inside either is resolved
 *  branch by branch rather than counted whole — `:is(a:not([class]), a.ui-identity)` is
 *  one class and one type, not both branches added together. Innermost first, because the
 *  argument pattern matches no nested parentheses. */
const specificity = (selector) => {
  let flat = selector;
  while (/:where\(/.test(flat)) flat = flat.replace(/:where\(([^()]*)\)/, "");
  while (/:(?:not|is)\(/.test(flat)) {
    flat = flat.replace(/:(?:not|is)\(([^()]*)\)/, (_, argument) => {
      const branches = selectorParts(argument);
      let best = "";
      for (const branch of branches) if (!best || outranks(countOf(branch), countOf(best))) best = branch;
      return ` ${best} `;
    });
  }
  return countOf(flat);
};

/** The value the cascade leaves on `property` for this element, in the states `on`. Rules that
 *  reach it are ranked by specificity, ties going to the later one — the cascade's own order.
 *
 *  Limits: it reads these sheets only, so no `!important`, no inline style and no author rule
 *  from anywhere else; and it expands no shorthand beyond the pairs `aliases` names. The
 *  mutation tests below fail if either stops being enough for what they measure. */
const declared = (css, property, el, on = [], aliases = []) => {
  const wanted = [property, ...aliases];
  let best = null;
  for (const [, selector, body] of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const name of wanted) {
      const match = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(body);
      if (!match) continue;
      for (const part of selectorParts(selector)) {
        if (!reaches(part, el, on)) continue;
        const rank = specificity(part);
        if (!best || !outranks(best.rank, rank)) best = { rank, value: match[1].trim() };
      }
    }
  }
  return best && best.value;
};
/** Which kit ring, if any, the cascade leaves on a focused link.
 *
 *  Two are kit rings. `outline: var(--ring)` plus its offset is the outset one every control takes. The
 *  other is the inward band, which a link filling its cell takes instead because the cell's
 *  own edges would cut an outset ring; docs/foundations.md composes it as a PAIR, and the
 *  offset is what draws it inward, so a link holding only one of the two is reported bare
 *  rather than ringed. */
const ringOn = (css, el) => {
  const on = [":focus-visible"];
  const outline = declared(css, "outline", el, on);
  const offset = declared(css, "outline-offset", el, on);
  if (outline === "var(--ring)" && offset === "var(--ring-offset)") return "outset";
  if (outline === "var(--ring-scroll)" && offset === "var(--ring-scroll-offset)") return "inward";
  return null;
};

/** Links the cascade leaves with no kit ring at all. Read from the winning declarations and
 *  not from whether a ring rule REACHES the link: a later, more specific rule can reach it
 *  too and take the shadow straight back off, which a reach-only reading calls covered. */
const bare = (css, subjects) => subjects
  .filter((subject) => !ringOn(css, element(subject)))
  .map((subject) => `${subject.file}: ${subject.link}`);

// A table whose class list is a JS expression (`className={[...].join(' ')}`) carries no
// class this reader can see, so a link inside it would be reported bare whatever the
// stylesheet says. Measure that one in a rendered story instead.
const unreadable = (subject) => !/\sclass(?:Name)?="[^"{}]*\bui-table\b/.test(subject.table);

test("every link in a table cell takes the kit ring", () => {
  const subjects = cellLinks();
  assert.deepEqual(
    subjects.filter(unreadable).map((s) => `${s.file}: ${s.table}`),
    [],
    "this table's class list is built at runtime, so a source scan cannot say which rules " +
      "reach the link inside it — measure it in a rendered story and exclude it here",
  );
  assert.equal(
    subjects.length,
    4,
    "every link the kit writes in a cell must be measured; update this count with the " +
      `subjects, which are now:\n${subjects.map((s) => `${s.file}: ${s.link}`).join("\n")}`,
  );
  assert.deepEqual(
    bare(SHEETS, subjects),
    [],
    "these cell links fall back to the browser's own focus outline (#457, #510)",
  );
});

/* ---------------------------------------------------------------------------------------
 * The compositions docs/components.md promises, and what each one's link must come to.
 *
 * `fill` is the handle: the cell is marked, holds one link and nothing else, so the link's
 * box is the cell's and the ring is the inward band. `fill: false` is every other link in a
 * cell — beside words, in a cell nobody marked, in the second column, or an anchor the kit
 * already styles — which keeps its own box and the outset ring.
 *
 * These stand beside the discovered subjects rather than replacing them: the four links the
 * kit ships are all marked first cells, so without this list the rules that must NOT reach
 * a link would have nothing to be measured against.
 */
const IDENTITY = '<a class="ui-identity" href="#company">'
  + '<span class="ui-identity__symbol">NORT</span><span class="ui-identity__name">Northstar</span></a>';

const SHAPES = [
  shape({
    what: "a marked first cell holding one bare link",
    table: "ui-table ui-table--dense ui-table--zebra",
    cells: ['<td class="ui-table__linked"><a href="#">1162</a></td>', "<td>12 Jun</td>"],
    ring: "inward", fill: true, box: { display: "flex", "border-radius": "var(--radius-xs)" },
  }),
  shape({
    what: "a marked identity cell standing behind a selection column",
    table: "ui-table ui-table--compact ui-table--pinned",
    cells: [
      '<td class="ui-table__selection"><input type="checkbox"></td>',
      `<td class="ui-table__identity ui-table__linked">${IDENTITY}</td>`,
      '<td class="ui-table__num">1.00</td>',
    ],
    at: 0,
    ring: "inward", fill: true, box: { display: "flex" },
  }),
  shape({
    what: "a first cell reading \"Invoice 1162\" with the number linked",
    table: "ui-table ui-table--dense",
    cells: ['<td>Invoice <a href="#">1162</a></td>', "<td>12 Jun</td>"],
    ring: "outset", fill: false, box: { display: "inline-block" },
  }),
  shape({
    what: "a first cell holding one bare link that nobody marked",
    table: "ui-table ui-table--dense",
    cells: ['<td><a href="#">1162</a></td>', "<td>12 Jun</td>"],
    ring: "outset", fill: false, box: { display: "inline-block" },
  }),
  shape({
    what: "a bare link in the second cell",
    table: "ui-table ui-table--dense",
    cells: ["<td>1162</td>", '<td><a href="#">12 Jun</a></td>'],
    ring: "outset", fill: false, box: { display: "inline-block" },
  }),
  shape({
    what: "a title cell whose link is long enough to wrap",
    table: "ui-table",
    cells: ['<td class="ui-table__title"><a href="#">Cedar Infrastructure Holdings International</a></td>'],
    ring: "outset", fill: false, box: { display: "inline-block" },
  }),
  shape({
    what: "a marked cell whose link gained an element sibling",
    table: "ui-table ui-table--dense",
    cells: ['<td class="ui-table__linked"><a href="#">1162</a><span class="ui-badge">New</span></td>'],
    ring: "outset", fill: false, box: { display: "inline-block" },
  }),
  shape({
    what: "a button-shaped link in an actions cell",
    table: "ui-table ui-table--dense",
    cells: ["<td>1162</td>", '<td class="ui-table__act"><a class="ui-btn ui-btn--primary" href="#">Open</a></td>'],
    at: 0,
    ring: "outset", fill: false,
    // The button's own box, corner and paint, which docs/components.md promises it keeps.
    box: { display: "inline-flex", "border-radius": "var(--radius-sm)", padding: "var(--btn-pad-y) var(--btn-pad-x)" },
  }),
  shape({
    what: "a button-shaped link in a first cell somebody marked by mistake",
    table: "ui-table ui-table--dense",
    cells: ['<td class="ui-table__linked"><a class="ui-btn ui-btn--primary" href="#">Open</a></td>'],
    ring: "outset", fill: false,
    box: { display: "inline-flex", "border-radius": "var(--radius-sm)", padding: "var(--btn-pad-y) var(--btn-pad-x)" },
  }),
];

/** Is the cascade filling this link's cell with it? Both halves are read, because either
 *  one alone is a different defect: a link told to fill a cell that kept its padding grows
 *  the row by a cell's padding, and a cell that gave its padding up to a link still sized
 *  to its own text leaves the text against the cell's edge. */
const fills = (css, el) => {
  const cell = el.closest("td, th");
  return {
    link: declared(css, "display", el) === "flex" && declared(css, "width", el) === "100%",
    cell: declared(css, "padding", cell) === "0" && declared(css, "height", cell) === "1px",
  };
};

/** Every way a listed composition comes out wrong, as lines a reader can act on. A pure
 *  function of the stylesheet, so the mutations below go through exactly this check. */
const shapeProblems = (css) => {
  const problems = [];
  for (const subject of SHAPES) {
    const el = element(subject);
    const ring = ringOn(css, el);
    if (ring !== subject.ring) {
      problems.push(`${subject.what}: the ring is ${ring ?? "the browser's own outline"}, not the ${subject.ring} band`);
    }
    const fill = fills(css, el);
    for (const [half, filled] of Object.entries(fill)) {
      if (filled !== subject.fill) {
        problems.push(`${subject.what}: the ${half} ${filled ? "fills the cell" : "does not fill the cell"}, `
          + `and this composition ${subject.fill ? "has to" : "must not"}`);
      }
    }
    for (const [property, value] of Object.entries(subject.box ?? {})) {
      const got = declared(css, property, el);
      if (got !== value) problems.push(`${subject.what}: ${property} comes to ${got ?? "nothing"}, not ${value}`);
    }
  }
  return problems;
};

test("every composition the reader pages name takes the ring and keeps the box it promises", () => {
  assert.deepEqual(shapeProblems(SHEETS), [], "a promised table composition is not what it was promised");
});

/** The rules that ring a cell link: the shared `a` selector, and the inward one a link
 *  filling a marked cell takes over it. Both are named here so a mutation can take either
 *  away on its own. */
const RING_RULES = {
  outset: /a:focus-visible,\n/,
  inward: /\.ui-table td\.ui-table__linked > :is\(a:not\(\[class\]\), a\.ui-identity\):only-child:focus-visible \{[^}]*\}/,
};

test("the check rejects a cell link dropped from the ring", () => {
  const subjects = cellLinks();
  for (const [name, rule] of Object.entries(RING_RULES)) {
    assert.ok(rule.test(SHEETS), `the ${name} ring rule must exist to be taken out`);
  }

  // Taking the inward rule away alone leaves the outset one underneath, so every subject is
  // still ringed — which is the fallback working, not a hole.
  assert.deepEqual(
    bare(SHEETS.replace(RING_RULES.inward, ""), subjects),
    [],
    "with the inward rule gone a filled cell link must fall back to the outset ring",
  );
  // Both gone is the hole, and it has to reach every subject.
  const stripped = Object.values(RING_RULES).reduce((css, rule) => css.replace(rule, ""), SHEETS);
  assert.equal(
    bare(stripped, subjects).length,
    subjects.length,
    "without the shared link selector and the inward override every cell link must be reported bare — if any still " +
      "passes, a third rule is covering it and this gate is measuring the wrong one",
  );
  // And half an inward ring is no ring: the offset is what draws the band inside the box, so
  // a rule that keeps the band and loses the offset paints it OUTSIDE — on the cell's edges,
  // where the pinned column and the scroller cut it. The outset ring does not come back to
  // cover that, because the same rule has already taken the shadow off.
  assert.equal(
    bare(SHEETS.replace("\n  outline-offset: var(--ring-scroll-offset);", ""), subjects).length,
    subjects.length,
    "an inward ring that loses its offset must be reported bare, not read as a ring",
  );
});

/**
 * Each way the fill reaches a composition it must not, or stops reaching one it must. The
 * first two are the regressions the review of #500 measured in Chromium, and the third is
 * the hole it found in this file: the old reconstruction stood every subject alone in a
 * first cell, so a rule keyed on the second column could take a ring away and no subject
 * noticed.
 */
const FILL_MUTATIONS = [
  ["a second cell's link stripped of its ring",
    (css) => `${css}\n.ui-table td:nth-child(2) a:focus-visible { box-shadow: none; outline: none; }\n`],
  ["the fill keyed on the cell's position again, which reaches a cell reading \"Invoice 1162\"",
    (css) => css.replaceAll("td.ui-table__linked", "td:is(.ui-table__identity, :first-child)")],
  ["the fill handed any anchor, which resizes a button-shaped link and replaces its own ring",
    (css) => css.replaceAll(":is(a:not([class]), a.ui-identity):only-child", "a:only-child")],
  ["the outset rule deleted, which leaves every link the fill does not reach on the browser's own outline",
    (css) => css.replace(RING_RULES.outset, "")],
];

test("the check rejects a fill that reaches the wrong composition", () => {
  const survived = [];
  for (const [what, mutate] of FILL_MUTATIONS) {
    const mutated = mutate(SHEETS);
    assert.notEqual(mutated, SHEETS, `the mutation "${what}" no longer matches the sheet, so it proves nothing`);
    if (!shapeProblems(mutated).length) survived.push(what);
  }
  assert.deepEqual(survived, [], "a mutation passed this gate unnoticed");
});

/** The displays that make a link ONE box rather than a run of line boxes. `inline-block` is
 *  what a link sitting inside a value takes; `flex` is what a link filling its own cell takes,
 *  and it is a block-level box, so it fragments no more than the first does. */
const BOXED = ["inline-block", "flex"];

test("a cell link is one box, so a wrapped one paints one ring", () => {
  // The guarantee `docs/components.md#dense-financial-tables` states: one ring around the whole link, including a
  // title-cell link that wraps. A link left in the inline flow takes a ring per line box —
  // seven of them, measured at 390 on a title cell — so the box is what carries this.
  const subjects = cellLinks();
  const flowed = subjects
    .filter((subject) => !BOXED.includes(declared(SHEETS, "display", element(subject))))
    .map((subject) => `${subject.file}: ${subject.link}`);
  // The corner the ring follows is the other half of that box, and docs/components.md states
  // it, so it is read the same way rather than left to the comment above the rule.
  const square = subjects
    .filter((subject) => declared(SHEETS, "border-radius", element(subject)) !== "var(--radius-xs)")
    .map((subject) => `${subject.file}: ${subject.link}`);

  assert.deepEqual(flowed, [], "these cell links stay in the inline flow and would fragment");
  assert.deepEqual(square, [], "these cell links take a ring at a corner the kit does not set");
});

test("the check rejects a cell link left in the inline flow", () => {
  // Two rules give a cell link a box — the plain-link one, and the fill rule that puts the
  // link's box over its whole cell. Both have to go, or the survivor covers the hole.
  const rules = [
    /\n\.ui-table :where\(td, th, caption\) a:not\(\[class\]\) \{[^}]*\}/,
    /\n\.ui-table td\.ui-table__linked > :is\(a:not\(\[class\]\), a\.ui-identity\):only-child \{[^}]*\}/,
  ];
  for (const rule of rules) assert.ok(rule.test(SHEETS), "the box rules must exist to be taken out");

  const stripped = rules.reduce((css, rule) => css.replace(rule, ""), SHEETS);
  const subjects = cellLinks();
  const flowed = subjects.filter((s) => !BOXED.includes(declared(stripped, "display", element(s))));
  const square = subjects.filter((s) => declared(stripped, "border-radius", element(s)) !== "var(--radius-xs)");
  assert.equal(
    flowed.length,
    subjects.length,
    "without that rule every cell link must read as an inline flow box — if any still passes, " +
      "a second rule is setting the display and this gate is measuring the wrong one",
  );
  assert.equal(square.length, subjects.length, "and every one must lose the kit's corner with it");
});

// The one state the kit gives a cell of its own: a revoked row strikes its title. The strike is
// painted by the cell, and `display: inline-block` makes the link a box an ancestor's decoration
// does not cross, so the link carries it itself — at rest, and on hover, where the cell-link
// hover rule is a whole `text-decoration` that would otherwise replace it.
const DEAD = shape({
  what: "a linked name in a revoked row",
  rowOpen: '<tr class="is-dead">',
  cells: ['<td class="ui-table__title"><a href="#token">Old integration</a></td>'],
});
const strike = (css, on) => declared(css, "text-decoration-line", element(DEAD), on, ["text-decoration"]);

test("a linked name in a revoked row stays struck, at rest and on hover", () => {
  assert.match(strike(SHEETS, []) ?? "", /line-through/, "at rest the linked name must be struck");
  assert.match(strike(SHEETS, [":hover"]) ?? "", /line-through/, "and hovering it must not take the strike off");
  assert.match(strike(SHEETS, [":hover"]) ?? "", /underline/, "while still underlining, as any cell link does");
});

test("the check rejects the strike dropped from a revoked row's link", () => {
  const rules = [...SHEETS.matchAll(/\n\.ui-table tr\.is-dead td\.ui-table__title a(?::hover)? \{[^}]*\}/g)]
    .map((match) => match[0]);
  assert.equal(rules.length, 2, "the rest rule and the hover rule must both exist to be taken out");

  for (const rule of rules) {
    const stripped = SHEETS.replace(rule, "");
    const states = [[], [":hover"]].filter((on) => /line-through/.test(strike(stripped, on) ?? ""));
    assert.ok(
      states.length < 2,
      `with this rule gone the strike must be missing in at least one state:\n${rule.trim()}`,
    );
  }
});

test("a table whose class list is built at runtime is refused, not guessed at", () => {
  // `className={[...].join(' ')}` leaves no class a source scan can read, so a link inside it
  // would be reported bare whatever the stylesheet says. The refusal is the honest answer.
  const runtime = {
    ...shape({ what: "a runtime class list", cells: ['<td><a href="#">ID</a></td>'] }),
    table: "<table className={classes.join(' ')}>",
  };
  const literal = { ...runtime, table: '<table className="ui-table ui-table--dense">' };

  assert.ok(unreadable(runtime), "a runtime class list must be refused");
  assert.ok(!unreadable(literal), "a literal one must be read, not refused");
  assert.deepEqual(bare(SHEETS, [literal]), [], "and read as taking the ring");
});

test("a JSX subject is read the same as its HTML spelling", () => {
  // Without `asHtml` this is the gate's own false positive: `className` parses to the
  // attribute `classname`, `classList` stays empty, every selector misses, and the first
  // React cell link written is reported as falling back to the native outline.
  const jsx = {
    ...shape({ what: "a JSX cell link", cells: ['<td className="ui-table__title"><a href="#">ID</a></td>'] }),
    table: '<table className="ui-table">',
  };
  const html = { ...jsx, table: '<table class="ui-table">', row: jsx.row.replace("className=", "class=") };

  assert.deepEqual(bare(SHEETS, [jsx]), [], "a JSX cell link must be seen to take the ring");

  // And the normaliser is load-bearing: parsed as JSX writes it, the table carries the
  // attribute `classname` and its `classList` is empty. The shared link ring still reaches
  // it, so the trap is read on the table-specific box.
  const raw = new JSDOM(`${jsx.table}<tbody>${jsx.row}</tbody></table>`).window.document.querySelector("a");
  assert.equal(raw.closest("table").classList.length, 0, "HTML parsing must drop the JSX class");
  assert.notEqual(
    declared(SHEETS, "display", raw), "inline-block",
    "the trap this normaliser removes must still be there to remove",
  );
  assert.deepEqual(bare(SHEETS, [html]), [], "the HTML spelling reads the same way");
});

test("a button in a cell keeps its own ring, not the cell link's", () => {
  // `.ui-btn` carries the button's radius in its focus rule. The table rule excludes it so
  // a button-shaped link in an actions column is not re-rounded to a text link's corner.
  const button = shape({
    what: "a button-shaped link",
    cells: ['<td class="ui-table__act"><a class="ui-btn ui-btn--ghost" href="#">Open</a></td>'],
  });
  const el = element(button);
  const reaching = ringSelectors(SHEETS).filter((part) => reaches(part, el, [":focus-visible"]));

  assert.ok(reaching.length > 0, "a button in a cell must still take the ring");
  assert.deepEqual(
    reaching.filter((part) => part.startsWith(".ui-table a")),
    [],
    "the table's cell-link focus rule must not reach a `.ui-btn`",
  );
});

/* ---------------------------------------------------------------------------------------
 * The cell-filling link: its box IS the cell, so the inward ring above outlines the cell.
 *
 * What makes that true is that the cell's padding MOVES onto the link. The two readings
 * below are of the same sheet on two boxes: what a plain body cell is padded with at one
 * position in one table, and what the fill pads the link with when the cell at that same
 * position is marked. They have to agree on all four sides.
 *
 * Position is part of the reading because the sheet pads the row's END cells differently —
 * zebra insets both — so a fill that matched a first cell could still be a step out in the
 * middle of the row, which is where a marked identity behind a selection column sits.
 *
 * Limits: the sheet, not a drawn box; one modifier at a time over the base table, so
 * `--dense --zebra` is covered by each of its two halves; three cells to a row, and the
 * sheet pads no middle differently from this one. Chromium measured the boxes for #500.
 */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** A padding declaration's sides, in CSS's own order. The logical pair is expanded too:
 *  the sheet writes `padding-inline`, and a reading that skipped it would compare a cell
 *  that had given its sides up against a link that had not. Read as left/right, which is
 *  what start/end come to in the kit's own direction. */
const sidesOf = (property, value) => {
  const parts = value.trim().split(/\s+/);
  if (property === "padding") {
    const [top, right = top, bottom = top, left = right] = parts;
    return { "padding-top": top, "padding-right": right, "padding-bottom": bottom, "padding-left": left };
  }
  if (property === "padding-inline") {
    const [left, right = left] = parts;
    return { "padding-left": left, "padding-right": right };
  }
  if (property === "padding-block") {
    const [top, bottom = top] = parts;
    return { "padding-top": top, "padding-bottom": bottom };
  }
  return { [property]: value.trim() };
};

const PADDING_SIDES = ["padding-top", "padding-right", "padding-bottom", "padding-left"];

/** The four sides the cascade leaves on a box: every rule that reaches it, ranked by
 *  specificity, ties going to the later one — `declared` for one property, done four
 *  times over with the shorthands expanded. */
const paddingSides = (css, el) => {
  const value = {};
  const rank = {};
  for (const [, selector, body] of decomment(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const [, property, declaration] of body.matchAll(/(?:^|;)\s*(padding(?:-[a-z]+)?)\s*:\s*([^;]+)/g)) {
      const sides = sidesOf(property, declaration);
      for (const part of selectorParts(selector)) {
        if (!reaches(part, el)) continue;
        const here = specificity(part);
        for (const [side, step] of Object.entries(sides)) {
          if (!rank[side] || !outranks(rank[side], here)) { rank[side] = here; value[side] = step; }
        }
      }
    }
  }
  return Object.fromEntries(PADDING_SIDES.map((side) => [side, value[side] ?? "0"]));
};

/** Every rule in the sheet that pads something, as its selector parts. */
const paddingRules = (css) => [...decomment(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /(?:^|;)\s*padding(?:-[a-z]+)?\s*:/.test(body))
  .flatMap(([, selector]) => selectorParts(selector).map((part) => part.trim()));

const CELL = /^(\.ui-table(?:--[a-z]+)?) td(?::(?:first|last)-child)?$/;

/** The table classes the sheet pads a body cell under, the base table included. */
const tableClasses = (css) => [...new Set(paddingRules(css).map((part) => CELL.exec(part)?.[1]).filter(Boolean))];

const PLAIN = "<td>1.00</td>";
const MARKED = '<td class="ui-table__linked"><a href="#">1162</a></td>';
/** Where in a three-cell row the marked cell stands. */
const POSITIONS = [["the first cell", 0], ["a middle cell", 1], ["the last cell", 2]];

/** One row of three cells on a table carrying `tableClass`, with the cell at `marked`
 *  holding a link and nothing else. `marked: -1` is the row nobody marked, which is what
 *  the cell's own padding is read from. */
const rowOf = (tableClass, marked) => {
  const table = tableClass === ".ui-table" ? "ui-table" : `ui-table ${tableClass.slice(1)}`;
  const cells = [0, 1, 2].map((index) => (index === marked ? MARKED : PLAIN));
  const dom = new JSDOM(`<table class="${table}"><tbody><tr>${cells.join("")}</tr></tbody></table>`);
  return dom.window.document;
};

test("every padding the sheet writes on a table is one this reading expands", () => {
  // A property this reading does not know becomes a key of its own and is compared against
  // nothing, so the comparison below would pass with the cell and the link padded
  // differently. `padding-inline-start` is the one to watch: the kit writes the pair.
  const known = new Set(["padding", "padding-inline", "padding-block", ...PADDING_SIDES]);
  const unknown = [...new Set([...decomment(SHEETS).matchAll(/(?:^|[;{])\s*(padding-[a-z-]+)\s*:/g)]
    .map(([, property]) => property))].filter((property) => !known.has(property));
  assert.deepEqual(unknown, [], "these padding properties are written but not expanded into sides");
});

test("a filled cell link is padded with exactly what its cell gave up, wherever the cell stands", () => {
  const classes = tableClasses(SHEETS);
  assert.deepEqual(
    classes,
    [".ui-table", ".ui-table--dense", ".ui-table--zebra", ".ui-table--compact"],
    "the table classes that pad a body cell have changed; every one of them needs a fill "
      + "padding to match, so update this list with the rules",
  );

  for (const tableClass of classes) {
    for (const [where, index] of POSITIONS) {
      const cell = rowOf(tableClass, -1).querySelectorAll("td")[index];
      const link = rowOf(tableClass, index).querySelectorAll("td")[index].querySelector("a");
      assert.deepEqual(
        paddingSides(SHEETS, link),
        paddingSides(SHEETS, cell),
        `on ${tableClass}, in ${where}, the link the fill puts over the cell is padded differently `
          + "from the cell itself, so the link's box is not the cell's box and its text has moved",
      );
    }
  }
});

test("the filled cell hands its padding over and the link takes the whole box", () => {
  // Matching paddings are only half of it. The cell has to stop drawing its own, or the two
  // stack and the row grows by a cell's padding; and the link has to be told to fill what is
  // left, or its box still stops at its text and the ring with it.
  const handover = /\.ui-table td\.ui-table__linked:has\(> :is\(a:not\(\[class\]\), a\.ui-identity\):only-child\) \{([^}]*)\}/
    .exec(decomment(SHEETS));
  assert.ok(handover, "the rule that empties the filled cell must exist");
  assert.match(handover[1], /padding:\s*0\s*;/, "the filled cell must keep no padding of its own");

  // At every position, because the handover is what makes the paddings above comparable.
  for (const [where, index] of POSITIONS) {
    const cell = rowOf(".ui-table--dense", index).querySelectorAll("td")[index];
    assert.equal(declared(SHEETS, "padding", cell), "0", `${where} keeps a padding the link also takes`);
    assert.equal(declared(SHEETS, "height", cell), "1px", `${where} states a height of its own`);
    for (const [property, value] of [["width", "100%"], ["box-sizing", "border-box"], ["height", "100%"]]) {
      assert.equal(
        declared(SHEETS, property, cell.querySelector("a")),
        value,
        `in ${where} a filled cell link must set \`${property}: ${value}\`, or its box stops at its text`,
      );
    }
  }
});

test("the check rejects a fill that moves the text", () => {
  const mismatch = (css) => {
    for (const tableClass of tableClasses(css)) {
      for (const [, index] of POSITIONS) {
        const cell = rowOf(tableClass, -1).querySelectorAll("td")[index];
        const link = rowOf(tableClass, index).querySelectorAll("td")[index].querySelector("a");
        if (JSON.stringify(paddingSides(css, link)) !== JSON.stringify(paddingSides(css, cell))) return true;
      }
    }
    return false;
  };

  // One step off under one modifier is the whole failure mode: the row still looks right at
  // the other densities, and only the table that carries that one drifts.
  const stepOut = SHEETS.replace(
    ".ui-table--dense td.ui-table__linked > :is(a:not([class]), a.ui-identity):only-child { padding: var(--space-2) var(--space-3); }",
    ".ui-table--dense td.ui-table__linked > :is(a:not([class]), a.ui-identity):only-child { padding: var(--space-2) var(--space-4); }",
  );
  assert.notEqual(stepOut, SHEETS, "the dense fill rule must be there to be changed");
  assert.ok(mismatch(stepOut), "a fill padded with a different step from its cell must be caught");

  // And the position half of it: zebra insets the row's end cells only, so a fill that
  // takes that inset everywhere pushes a marked middle cell's text a step right. This is
  // the shape the review of #500 measured in a stacked card, read here in the row.
  const everywhere = SHEETS.replace(
    ".ui-table--zebra td.ui-table__linked:first-child > :is(a:not([class]), a.ui-identity):only-child",
    ".ui-table--zebra td.ui-table__linked > :is(a:not([class]), a.ui-identity):only-child",
  );
  assert.notEqual(everywhere, SHEETS, "the zebra fill's first-cell scope must be there to be widened");
  assert.ok(mismatch(everywhere), "a fill that insets a cell the table did not inset must be caught");

  // And a cell that keeps its padding while the link takes one too.
  const stacked = SHEETS.replace(
    /(\.ui-table td\.ui-table__linked:has\(> :is\(a:not\(\[class\]\), a\.ui-identity\):only-child\) \{)[^}]*\}/,
    "$1 }",
  );
  assert.doesNotMatch(
    /\.ui-table td\.ui-table__linked:has\(> :is\(a:not\(\[class\]\), a\.ui-identity\):only-child\) \{([^}]*)\}/
      .exec(decomment(stacked))[1],
    /padding:\s*0\s*;/,
    "the handover check must read the rule it is given, not a copy of the real one",
  );
});
