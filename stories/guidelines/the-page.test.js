/* Rule: every screen the kit draws keeps the page rules — the head in one
 * order, one h1, one primary action, one density, nothing overlaying it at
 * load. The subjects are the screens under stories/apps/, discovered rather
 * than listed. Every rule owns one check here, keyed by its `id` — from the
 * story or from its `GATED_ELSEWHERE`, a split the contract settles — and the
 * first test holds the lists in step.
 *
 * The outline and the landmark names are accessibility questions, so this is
 * one of the accessibility gates the Accessibility minimums page lists — and what it cannot
 * see is stated there with the rest.
 *
 * why: guidelines/the-page.md#the-page
 * Discover subjects from source and check the coverage count.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

import { RULES, GATED_ELSEWHERE, LIMITS } from './_the-page.js';
import { CHECKS, OPEN, OVERLAY_ROOTS, kindOf, text } from '../lib/the-page-checks.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const appsDir = path.join(root, 'stories/apps');

// ---- the subjects --------------------------------------------------------

const storyFiles = readdirSync(appsDir).filter((f) => f.endsWith('.stories.js')).sort();

/** Every exported story in stories/apps/, rendered once and parsed. */
const screens = [];
/** Exports beside the stories that publish nothing renderable — named, never skipped. */
const unrenderable = [];
for (const file of storyFiles) {
  const mod = await import(path.join(appsDir, file));
  const def = mod.default || {};
  const source = readFileSync(path.join(appsDir, file), 'utf8');
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || story == null) continue;
    // CSF3 is an object carrying `render`; CSF2 is the render function itself.
    // Storybook publishes both, so both are subjects here.
    const render = typeof story === 'function' ? story : story.render || def.render;
    if (typeof render !== 'function') { unrenderable.push(`stories/apps/${file}:${name}`); continue; }
    const args = { ...def.args, ...(typeof story === 'object' ? story.args : null) };
    const html = render(args, { globals: {}, args });
    const doc = new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;
    const firstOfFile = !screens.some((x) => x.file === `stories/apps/${file}`);
    screens.push({ where: `stories/apps/${file}:${name}`, doc, source, file: `stories/apps/${file}`, firstOfFile });
  }
}

for (const s of screens) s.kind = kindOf(s.doc);

const apps = () => screens.filter((s) => s.kind === 'app');

// ---- the gates -----------------------------------------------------------

// The floors are what the tree holds today, not a round number underneath it:
// a floor with slack in it is a floor that a deleted story walks under.
// Report unmeasured subjects as failures.
const FOUND = { files: 8, screens: 18, apps: 12 };

test('the gate found the kit’s own screens', () => {
  assert.ok(storyFiles.length >= FOUND.files, `only ${storyFiles.length} story files under `
    + `stories/apps/, against ${FOUND.files} when this was written. A screen left the tree, or `
    + 'the sweep stopped reaching it — say which in the same commit.');
  assert.ok(screens.length >= FOUND.screens, `only ${screens.length} screens rendered, against `
    + `${FOUND.screens} when this was written.`);
  assert.ok(apps().length >= FOUND.apps, `only ${apps().length} of them are shell pages, against `
    + `${FOUND.apps} when this was written.`);
  assert.deepEqual(unrenderable, [], 'an export beside the stories that publishes no render — '
    + 'this gate cannot check it, and a subject it cannot check is a failure, never a skip');
});

test('the overlay selectors are classes the kit really writes', () => {
  const kit = ['src/components', 'src/styles'].flatMap((dir) => readdirSync(path.join(root, dir))
    .map((f) => readFileSync(path.join(root, dir, f), 'utf8'))).join('\n');
  const unknown = [...OVERLAY_ROOTS, ...OPEN]
    .map((sel) => sel.split('.').filter(Boolean)[0])
    .filter((cls, i, all) => all.indexOf(cls) === i)
    .filter((cls) => !kit.includes(cls));
  assert.deepEqual(unknown, [], 'this gate names an overlay the kit has never drawn. A selector '
    + 'that matches nothing passes every screen and hides the rule it was written for.');
});

// A limit is stated twice — in the rule prose a designer reads and in this gate
// — and the two have to agree. guidelines/the-page.md is the reader's home for
// these rules, so it is the copy read here.
//
// Each is held against the SENTENCE that states it and not against the page at
// large. Searching a page for a bare number was close to vacuous: LIMITS.cards
// could go from 6 to 1 and the check stayed green, because the word "one"
// appears a dozen times there. So each pattern carries the limit's own noun, and
// the number is the one part of it that moves.
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** `6` or `six`, either spelling, for a number the page may write out. */
const either = (n) => `(?:${n}${WORD[n] ? `|${WORD[n]}` : ''})`;

const PAGE_SENTENCE = {
  cards: (n) => ({
    re: new RegExp(`\\bno more than\\s+${either(n)}\\s+cards\\b`, 'i'),
    says: `"no more than ${WORD[n] || n} cards"`,
  }),
  lede: (n) => ({
    re: new RegExp(`\\b${either(n)}\\s+sentences?\\s+or fewer\\b`, 'i'),
    says: `"${WORD[n] || n} sentences or fewer"`,
  }),
  outline: (n) => ({
    re: new RegExp(`\\bstops?\\s+at\\s+\`?h${n}\`?\\b`, 'i'),
    says: `"stop at h${n}"`,
  }),
  primary: (n) => ({
    re: new RegExp(`\\b${either(n)}\\s+filled button for the main action\\b`, 'i'),
    says: `"${WORD[n] || n} filled button for the main action"`,
  }),
};

const GUIDELINE = 'guidelines/the-page.md';

test('the guideline page states the same limits this gate measures', () => {
  const page = readFileSync(path.join(root, GUIDELINE), 'utf8');
  assert.ok(page.length > 400, `${GUIDELINE} has no rules to read`);

  // Every limit is checked, so a fifth one added to LIMITS with no sentence to
  // hold it to fails here rather than going unwritten for the reader.
  assert.deepEqual(
    Object.keys(LIMITS).sort(), Object.keys(PAGE_SENTENCE).sort(),
    `a limit has no sentence in ${GUIDELINE} that this gate knows how to read, or a pattern here `
    + 'names a limit that is gone. Either way one of the two copies is unheld.',
  );

  const missing = Object.entries(LIMITS)
    .map(([key, n]) => ({ key, n, ...PAGE_SENTENCE[key](n) }))
    .filter(({ re }) => !re.test(page))
    .map(({ key, says }) => `${key}: the page does not say ${says}`);
  assert.deepEqual(missing, [], `${GUIDELINE} and this gate disagree about a limit, or the page `
    + 'stopped stating one. The number moved in stories/guidelines/_the-page.js and the sentence '
    + `in ${GUIDELINE} did not:\n  ` + missing.join('\n  '));
});

// A rule reaches this gate two ways — drawn on the guideline page, or named only
// in GATED_ELSEWHERE beside it — and the union is what the gate has to walk.
// Either list drifting from CHECKS is the same failure: a rule with no check is a
// wish, and a check with no rule is a rule the reader is held to and never told.
const GATED = [
  ...RULES.map((r) => ({ id: r.id, says: r.imperative })),
  ...GATED_ELSEWHERE.map((r) => ({ id: r.id, says: r.states })),
];

// ---- the rule-to-code mapping --------------------------------------------
// RULE_TO_CODE below is the only rule-to-code mapping, and it sits beside this
// gate because neither home for a reader will take it: the guideline page is
// written for a designer and carries no code references, and the pages under
// docs/ state what the kit guarantees rather than which line holds it. It
// carries no line numbers on purpose, which is the right call and has a cost: a
// path that stops existing and a symbol that is renamed both go quiet. So its
// spans are resolved here. Subjects are discovered from the mapping itself, so
// an entry added tomorrow is checked without editing this file.
//
// Ledger, what a pass does not say: nothing about whether the line found is the
// line that HOLDS the rule — only that the file is there and the name is in it.
// A symbol is searched as text, so a mention in a comment counts.

/* Where the kit holds each rule of the Guidelines / The page collection.
 *
 * This is the only rule-to-code mapping for that page, and it lives in the gate
 * that resolves it rather than in a document: the guideline page is written for
 * a designer and carries no file paths at all, and the pages under docs/ state
 * what the kit guarantees rather than which line holds it.
 *
 * It names files and symbols instead of line numbers, so moving a line does not
 * break a reference.
 *
 * An entry may name a sibling by basename alone, the way `confirm.js` follows
 * `src/components/drawer.js`; a bare name resolves against the directories the
 * entry has already spelled out.
 */
const RULE_TO_CODE = {
  layout: ['appShell()', 'src/components/shell.js', '.ui-app__bar', 'src/styles/layout.css'],
  width: ['appShell()', 'src/components/shell.js', '.ui-app__main--wide', 'src/styles/layout.css'],
  shell: ['appShell()', 'src/components/shell.js', 'financeShell()', 'stories/apps/_finance-nav.js'],
  head: ['src/components/shell.js', '<h1>', '.ui-app__sub', '.ui-app__body'],
  'one-h1': ['card()', 'src/components/index.js', 'success()', 'src/components/success.js'],
  outline: ['rank: page-title', 'src/styles/layout.css', 'rank: card-title', 'src/styles/card.css'],
  'one-primary': ['.ui-btn--primary', 'src/styles/button.css'],
  stacking: ['.ui-card', 'src/styles/card.css'],
  navs: ['sidebarNav()', 'breadcrumbs()', 'src/components/nav.js', 'appShell()', 'src/components/shell.js'],
  'at-rest': ['drawer()', 'confirm()', 'commandPalette()', 'tooltip()',
    'src/components/drawer.js', 'confirm.js', 'command-palette.js', 'tooltip.js'],
  density: ['.ui-table--dense', 'src/styles/table.css'],
  lede: ['.ui-app__sub', 'appShell()', 'src/components/shell.js'],
};

const MAPPING = 'the RULE_TO_CODE table in this file';
/** A span that names a file rather than a symbol or a selector. */
const isPath = (span) => /^[\w.\-/]+\.(?:js|css|mjs)$/.test(span);

/** The mapping's entries, each as `{ rule, spans }`. */
const ruleToCode = (table) => Object.entries(table).map(([rule, spans]) => ({ rule, spans }));

test('the rule-to-code mapping names one entry per rule, and only rules', () => {
  const table = ruleToCode(RULE_TO_CODE);
  assert.ok(table.length > 0, `${MAPPING} is empty, so this gate is reading nothing and the rules `
    + 'whose only mapping lives there are unheld');
  assert.deepEqual(
    table.map((r) => r.rule).sort(), GATED.map((r) => r.id).sort(),
    `${MAPPING} and the rules themselves have drifted. Every rule needs an entry saying where the `
    + 'kit holds it, and an entry needs a rule.',
  );
});

test('every file the mapping names exists, and every name it fences is in one', () => {
  const problems = [];
  for (const { rule, spans } of ruleToCode(RULE_TO_CODE)) {
    const paths = spans.filter(isPath);
    if (!paths.length) { problems.push(`${rule}: the entry names no file at all`); continue; }
    // An entry may name siblings by basename alone — `confirm.js` after
    // `src/components/drawer.js` — so a bare name resolves against the
    // directories the entry has already spelled out.
    const dirs = [...new Set(paths.filter((f) => f.includes('/')).map((f) => path.dirname(f)))];
    const resolved = [];
    for (const file of paths) {
      const tries = file.includes('/') ? [file] : dirs.map((d) => `${d}/${file}`);
      const found = tries.find((f) => existsSync(path.join(root, f)));
      if (found) resolved.push(found);
      else problems.push(`${rule}: \`${file}\` does not exist (looked at ${tries.join(', ')})`);
    }
    const text = resolved.map((f) => readFileSync(path.join(root, f), 'utf8')).join('\n');
    for (const span of spans.filter((x) => !isPath(x))) {
      // `appShell()` is written `appShell` where it is declared, `<h1>` is written
      // `<h1 class=…` where it is emitted, and a class is `.ui-app__sub` in a
      // stylesheet and `ui-app__sub` in the markup that carries it.
      const needle = span.replace(/\(\)$/, '').replace(/^<(\w+)>$/, '<$1').replace(/^\./, '');
      if (!text.includes(needle)) {
        problems.push(`${rule}: \`${span}\` is in none of ${resolved.join(', ')}`);
      }
    }
  }
  assert.deepEqual(problems, [], `${MAPPING} cites code that is not there. It is the only `
    + 'rule-to-code mapping, and it carries no line numbers, so nothing else would have said '
    + 'so:\n  ' + problems.join('\n  '));
});

test('every page rule owns a check here, and every check owns a rule', () => {
  // stories/guidelines/refs.test.js holds the shape of a rule on the page and
  // never sees GATED_ELSEWHERE, so an entry with nothing to say would reach the
  // test names below as "undefined". It is a failure here instead.
  assert.deepEqual(
    GATED.filter((r) => !r.id || typeof r.says !== 'string' || r.says.trim() === ''), [],
    'a rule reaching this gate says nothing — GATED_ELSEWHERE needs an `id` and a `states` '
    + 'sentence, the same way a rule on the page needs an `id` and an `imperative`.',
  );
  assert.deepEqual(
    Object.keys(CHECKS).sort(), GATED.map((r) => r.id).sort(),
    'the page, the contract and this gate have drifted. A rule drawn on '
    + 'stories/guidelines/_the-page.js or listed in its GATED_ELSEWHERE needs a check here, and a '
    + 'check needs one of the two to have stated it.',
  );
});

// `lede` only measures a screen that carries one, so a kit whose screens all
// dropped their introduction would leave both halves of that check — the
// sentence count and the restatement — asserting over nothing and reporting
// green. The subjects are counted here instead, from the same rendered screens.
test('the lede checks still reach screens that carry one', () => {
  const carrying = screens.filter((s) => s.kind === 'app'
    && text(s.doc.querySelector('main.ui-app__main p.ui-app__sub')));
  assert.ok(carrying.length >= 20,
    `${carrying.length} app screen(s) carry a lede; 23 do today, across Access, AccountPreset, `
    + 'CollapsibleRail, EmptyStates, Preferences, ShellLayouts and StockScreener. Below twenty the '
    + 'two when-present checks are measuring too little to catch a two-sentence limit or a lede '
    + 'that opens on its own title. Lowering this is the deliberate act of someone who has seen '
    + `the screens: today they are ${carrying.map((s) => s.where).join(', ')}.`);
});

for (const rule of GATED) {
  test(`${rule.id}: ${rule.says}`, () => {
    const problems = screens.flatMap((s) => CHECKS[rule.id](s));
    assert.deepEqual(problems, [], `${problems.length} screen(s) break this rule:\n  `
      + `${problems.join('\n  ')}`);
  });
}
