import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

/**
 * A link written inside a table cell must take the kit ring on keyboard focus (#510).
 *
 * How the defect got in: `table.css` gave a cell's link the row's ink and an underline on
 * hover, which is the whole of its look at rest — and nothing for `:focus-visible`. The
 * shared ring in `base.css` is keyed to control classes (`.ui-btn`, `.ui-input`,
 * `.ui-focusable`), and a bare `<a>` carries none of them, so Chromium drew its own
 * outline: a black box in light and a white one in dark, square against the cell.
 * `guidelines/state-set.md` asks for the same `--ring` on every focusable control, and
 * #457 put a link and a disclosure summary onto the shared focus class for that reason.
 * This one was photographed on the payouts ledger while #490 was being captured.
 *
 * Subjects are discovered from the markup the kit renders, not listed here, so a new
 * ledger with a linked ID joins this gate by existing.
 *
 * Limits: this reads the cascade, not paint. Whether the ring is visible against the
 * surface behind it belongs to stories/ring-surfaces.test.js and the contrast ledger;
 * whether `:focus-visible` matches on a real keystroke is the browser's, and the PR's
 * captures carry that evidence. It walks markup written as literal HTML — a cell whose
 * link is assembled at runtime from parts is outside what a source scan can see, and is
 * covered by the same stylesheet rule rather than by this list.
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
    return [...table[0].matchAll(/<(t[dh])\b[^>]*>[\s\S]*?<\/\1>/g)].flatMap((cell) => {
      const cellOpen = cell[0].match(/<t[dh]\b[^>]*>/)[0];
      return [...cell[0].matchAll(/<a\b[^>]*>/g)]
        .map((link) => ({ file, table: open, cell: cell[1], cellOpen, link: link[0] }));
    });
  });
});

/** A cell's link, standing in the table and cell the source puts it in. */
const element = (subject) => {
  const row = `<tr>${subject.cellOpen}${subject.link}ID</a></${subject.cell}></tr>`;
  const body = subject.cell === "th" ? `<thead>${row}</thead>` : `<tbody>${row}</tbody>`;
  const dom = new JSDOM(`${subject.table}${body}</table>`);
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

// JSDOM never matches `:focus-visible`, so the question asked of it is the one this gate
// is about: does a ring rule reach this element at all.
const reaches = (selector, el) => el.matches(selector.replaceAll(":focus-visible", ""));
const bare = (css, subjects) => {
  const selectors = ringSelectors(css);
  return subjects
    .filter((subject) => !selectors.some((part) => reaches(part, element(subject))))
    .map((subject) => `${subject.file}: ${subject.link}`);
};

test("every link in a table cell takes the kit ring", () => {
  const subjects = cellLinks();
  assert.equal(
    subjects.length,
    3,
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
  const reaching = ringSelectors(SHEETS).filter((part) => reaches(part, el));

  assert.ok(reaching.length > 0, "a button in a cell must still take the ring");
  assert.deepEqual(
    reaching.filter((part) => part.startsWith(".ui-table a")),
    [],
    "the table's cell-link focus rule must not reach a `.ui-btn`",
  );
});
