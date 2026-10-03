import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

/**
 * The guarantee: a link written inside a table cell takes the kit ring on keyboard focus.
 * Subjects are discovered from the markup, so a new ledger with a linked ID joins by
 * existing. why: docs/specification.md#dense-financial-tables; decided in #510.
 *
 * Limits: this reads the cascade, not paint. Whether the ring is visible against the
 * surface behind it belongs to stories/ring-surfaces.test.js and the contrast ledger;
 * whether `:focus-visible` matches on a real keystroke is the browser's, and the PR's
 * captures carry that evidence. It reads markup written as literal tags — a cell whose
 * link or whose table's class list is assembled at runtime cannot be read from source,
 * and the check below refuses such a table rather than guessing at it.
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

/** Every `<a>` written inside a cell of a table, with the table and cell that hold it. */
const cellLinks = () => sourceFiles().flatMap((file) => {
  const source = readFileSync(path.join(root, file), "utf8");
  return [...source.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/g)].flatMap((table) => {
    const open = table[0].match(/<table\b[^>]*>/)[0];
    // Through the row, because a revoked row styles the link inside it (`tr.is-dead`).
    return [...table[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].flatMap((row) => {
      const rowOpen = row[0].match(/<tr\b[^>]*>/)[0];
      return [...row[0].matchAll(/<(t[dh])\b[^>]*>[\s\S]*?<\/\1>/g)].flatMap((cell) => {
        const cellOpen = cell[0].match(/<t[dh]\b[^>]*>/)[0];
        return [...cell[0].matchAll(/<a\b[^>]*>/g)]
          .map((link) => ({ file, table: open, row: rowOpen, cell: cell[1], cellOpen, link: link[0] }));
      });
    });
  });
});

// JSX spells the attribute `className`, which HTML parsing lowercases to `classname` and
// leaves `classList` empty — every selector then misses, and the gate reports a hole that
// is not there. The spelling is normalised before the markup is parsed.
const asHtml = (tag) => tag.replace(/\bclassName=/g, "class=");

/** A cell's link, standing in the table and cell the source puts it in. */
const element = (subject) => {
  const row = `${asHtml(subject.row ?? "<tr>")}${asHtml(subject.cellOpen)}${asHtml(subject.link)}ID</a></${subject.cell}></tr>`;
  const body = subject.cell === "th" ? `<thead>${row}</thead>` : `<tbody>${row}</tbody>`;
  const dom = new JSDOM(`${asHtml(subject.table)}${body}</table>`);
  return dom.window.document.querySelector("a");
};

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

/** Selectors of every rule that paints the kit ring on focus. Comments come out first,
 *  or the prose above a rule is read as part of its selector. */
const ringSelectors = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /box-shadow:\s*var\(--ring\)/.test(body))
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

/** Specificity as (ids, classes, types). `:where()` contributes nothing; `:not()` and `:is()`
 *  contribute their argument's, which is why both are unwrapped rather than counted. */
const specificity = (selector) => {
  let flat = selector;
  while (/:where\(/.test(flat)) flat = flat.replace(/:where\(([^()]*)\)/, "");
  while (/:(?:not|is)\(/.test(flat)) flat = flat.replace(/:(?:not|is)\(([^()]*)\)/, " $1 ");
  const count = (pattern) => (flat.match(pattern) || []).length;
  return [
    count(/#[\w-]+/g),
    count(/\.[\w-]+/g) + count(/\[[^\]]*\]/g) + count(/(?<!:):[\w-]+/g),
    count(/(?:^|[\s>+~(,])[a-zA-Z][\w-]*/g) + count(/::[\w-]+/g),
  ];
};
const outranks = (a, b) => a.some((n, i) => n !== b[i] && n > b[i] && a.slice(0, i).every((m, j) => m === b[j]));

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
const bare = (css, subjects) => {
  const selectors = ringSelectors(css);
  return subjects
    .filter((subject) => !selectors.some((part) => reaches(part, element(subject), [":focus-visible"])))
    .map((subject) => `${subject.file}: ${subject.link}`);
};

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
  // 4 -> 7: #505's Finance dashboard and the two specimens on the Dashboards and
  // reports page, each of which links a payout reference out of a cell.
  assert.equal(
    subjects.length,
    7,
    "every link the kit writes in a cell must be measured; update this count with the " +
      `subjects, which are now:\n${subjects.map((s) => `${s.file}: ${s.link}`).join("\n")}`,
  );
  assert.deepEqual(
    bare(SHEETS, subjects),
    [],
    "these cell links fall back to the browser's own focus outline (#457, #510)",
  );
});

test("the check rejects a cell link dropped from the ring", () => {
  const subjects = cellLinks();
  const rule = /\.ui-table a:not\(\.ui-btn\):focus-visible \{[^}]*\}/;
  assert.ok(rule.test(SHEETS), "the rule this gate holds must exist to be taken out");

  const stripped = SHEETS.replace(rule, "");
  assert.equal(
    bare(stripped, subjects).length,
    subjects.length,
    "without the table's focus rule every cell link must be reported bare — if any still " +
      "passes, a second rule is covering it and this gate is measuring the wrong one",
  );
});

test("a cell link is an inline-block box, so a wrapped one paints one ring", () => {
  // The guarantee `docs/specification.md` states: one ring around the whole link, including a
  // title-cell link that wraps. A link left in the inline flow takes a ring per line box —
  // seven of them, measured at 390 on a title cell — so the box is what carries this.
  const subjects = cellLinks();
  const flowed = subjects
    .filter((subject) => declared(SHEETS, "display", element(subject)) !== "inline-block")
    .map((subject) => `${subject.file}: ${subject.link}`);
  // The corner the ring follows is the other half of that box, and the specification states
  // it, so it is read the same way rather than left to the comment above the rule.
  const square = subjects
    .filter((subject) => declared(SHEETS, "border-radius", element(subject)) !== "var(--radius-xs)")
    .map((subject) => `${subject.file}: ${subject.link}`);

  assert.deepEqual(flowed, [], "these cell links stay in the inline flow and would fragment");
  assert.deepEqual(square, [], "these cell links take a ring at a corner the kit does not set");
});

test("the check rejects a cell link left in the inline flow", () => {
  const rule = /\n\.ui-table :where\(td, th, caption\) a:not\(\[class\]\) \{[^}]*\}/;
  assert.ok(rule.test(SHEETS), "the plain-link box rule must exist to be taken out");

  const stripped = SHEETS.replace(rule, "");
  const subjects = cellLinks();
  const flowed = subjects.filter((s) => declared(stripped, "display", element(s)) !== "inline-block");
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
const DEAD = {
  file: "fixture", table: '<table class="ui-table">', row: '<tr class="is-dead">',
  cell: "td", cellOpen: '<td class="ui-table__title">', link: '<a href="#token">',
};
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
    file: "fixture", table: "<table className={classes.join(' ')}>", cell: "td",
    cellOpen: "<td>", link: '<a href="#">',
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
    file: "fixture", table: '<table className="ui-table">', cell: "td",
    cellOpen: '<td className="ui-table__title">', link: '<a href="#">',
  };
  const html = {
    ...jsx, table: '<table class="ui-table">', cellOpen: '<td class="ui-table__title">',
  };

  assert.deepEqual(bare(SHEETS, [jsx]), [], "a JSX cell link must be seen to take the ring");

  // And the normaliser is load-bearing: parsed as JSX writes it, the table carries the
  // attribute `classname`, its `classList` is empty, and no ring selector reaches the link.
  const raw = new JSDOM(`${jsx.table}<tbody><tr>${jsx.cellOpen}${jsx.link}ID</a></td></tr></tbody></table>`)
    .window.document.querySelector("a");
  assert.equal(raw.closest("table").classList.length, 0, "HTML parsing must drop the JSX class");
  assert.ok(
    !ringSelectors(SHEETS).some((part) => reaches(part, raw, [":focus-visible"])),
    "the trap this normaliser removes must still be there to remove",
  );
  assert.deepEqual(bare(SHEETS, [html]), [], "the HTML spelling reads the same way");
});

test("a button in a cell keeps its own ring, not the cell link's", () => {
  // `.ui-btn` carries the button's radius in its focus rule. The table rule excludes it so
  // a button-shaped link in an actions column is not re-rounded to a text link's corner.
  const button = {
    file: "fixture",
    table: '<table class="ui-table">',
    cell: "td",
    cellOpen: '<td class="ui-table__act">',
    link: '<a class="ui-btn ui-btn--ghost" href="#">Open</a>',
  };
  const el = element(button);
  const reaching = ringSelectors(SHEETS).filter((part) => reaches(part, el, [":focus-visible"]));

  assert.ok(reaching.length > 0, "a button in a cell must still take the ring");
  assert.deepEqual(
    reaching.filter((part) => part.startsWith(".ui-table a")),
    [],
    "the table's cell-link focus rule must not reach a `.ui-btn`",
  );
});
