import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CSS = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "table.css"),
  "utf8",
);

/**
 * The inset is written as a step of the spacing scale (ADR 0012), so what this test needs
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
