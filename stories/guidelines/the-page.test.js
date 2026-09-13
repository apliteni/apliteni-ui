/* Rule: every screen the kit draws keeps the page rules — the head in one
 * order, one h1, one primary action, one density, nothing overlaying it at
 * load. The subjects are the screens under stories/apps/, discovered rather
 * than listed. Every rule owns one check here, keyed by its `id` — from the
 * story or from its `GATED_ELSEWHERE`, a split the contract settles — and the
 * first test holds the lists in step.
 *
 * The outline and the landmark names are accessibility questions, so this is
 * one of the accessibility gates the floor page lists — and what it cannot
 * see is stated there with the rest.
 *
 * why: docs/specification.md#the-page
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

import { RULES, GATED_ELSEWHERE, LIMITS } from './_the-page.js';

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

// An application page is the shell's <main>; an auth card is the one screen
// kind with no rail to sit beside; a marketing page is not a screen of an
// application at all. Anything else has built chrome of its own, which is the
// `shell` rule's whole subject.
const kindOf = (doc) => (doc.querySelector('main.ui-app__main') ? 'app'
  : doc.querySelector('.ui-auth__card') ? 'auth'
    : doc.querySelector('.ui-hero') ? 'marketing' : 'none');

for (const s of screens) s.kind = kindOf(s.doc);

const apps = () => screens.filter((s) => s.kind === 'app');
const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

// An overlay is drawn over the page rather than in it, so what is inside one is
// not on the page: its primary action, its tables and its headings are the
// overlay's own. Mounted and closed is the normal state for all five — a page
// ships the markup and opens it later — so the roots and the open states are
// two lists, not one.
//
// The first draft of this gate spelled two of them `.ui-tooltip` and
// `.ui-palette`, which the kit has never emitted: `at-rest` could not see a
// hover readout at all, and `inOverlay` could not exclude one. A selector that
// matches nothing reads exactly like a rule nothing breaks, which is why
// `the overlay selectors are classes the kit really writes` is below.
const OVERLAY_ROOTS = ['.ui-drawer', '.ui-confirm', '.ui-cmdk', '.ui-tip', '.ui-fbcomposer'];
// A toast has no closed state: it is appended when it is shown and removed after.
const OPEN = ['.ui-drawer.is-open', '.ui-confirm.is-open', '.ui-cmdk.is-open', '.ui-tip.is-open', '.ui-toast'];
const inOverlay = (el) => OVERLAY_ROOTS.some((sel) => el.closest(sel));

// ---- one check per rule --------------------------------------------------
//
// A check returns the lines it objects to. Empty is a pass, and the lines are
// what a reader sees when it is not, so each names the screen and the fault.

const CHECKS = {
  shell(s) {
    if (s.kind === 'none') {
      return [`${s.where} is none of the three page kinds — it draws neither the shell's <main>, `
        + 'nor an auth card, nor a hero. A screen that lays out its own page keeps none of the '
        + 'rules below by accident.'];
    }
    if (s.kind !== 'app') return [];
    const mains = s.doc.querySelectorAll('main');
    return mains.length === 1 ? []
      : [`${s.where} emits ${mains.length} <main> landmarks — the shell emits one, so a second `
        + 'came from the screen.'];
  },

  head(s) {
    if (s.kind !== 'app') return [];
    const main = s.doc.querySelector('main.ui-app__main');
    const kids = [...main.children];
    const problems = [];

    const up = kids.filter((el) => el.matches('nav.ui-nav--crumbs, .ui-back'));
    if (up.length > 1) {
      problems.push(`${s.where} draws ${up.length} ways back up. A page has a trail or a back `
        + 'link, never both — Guidelines / Going back.');
    }

    const shape = kids.map((el) => (el.matches('nav.ui-nav--crumbs, .ui-back') ? 'up'
      : el.tagName === 'H1' ? 'title'
        : el.matches('p.ui-app__sub') ? 'lede'
          : el.matches('.ui-app__body') ? 'body' : `«${el.tagName.toLowerCase()}»`));
    // Each part may appear once, in this order: the index walks forward past the
    // one it just matched, so a second body — or a second title — is as much a
    // failure as one in the wrong place.
    const ORDER = ['up', 'title', 'lede', 'body'];
    let at = 0;
    for (const part of shape) {
      const next = ORDER.indexOf(part, at);
      at = next + 1;
      if (next < 0) {
        problems.push(`${s.where} puts ${part} in the page head, reading ${shape.join(' → ')}. `
          + `The head is ${ORDER.join(' → ')}, and a filter or a toolbar belongs first thing `
          + 'inside the body rather than above the title.');
        break;
      }
    }
    return problems;
  },

  'one-h1'(s) {
    const h1s = s.doc.querySelectorAll('h1');
    if (h1s.length === 1) return [];
    if (h1s.length === 0) {
      return [`${s.where} has no h1. The screen has no name a reader moving by heading can land `
        + 'on, and nothing says which page they are on.'];
    }
    return [`${s.where} has ${h1s.length} h1s — ${[...h1s].map((h) => `"${text(h)}"`).join(', ')}. `
      + 'One screen, one page title.'];
  },

  outline(s) {
    // An overlay keeps its own outline — a drawer's h2 and the feedback
    // widget's h4 are inside a dialog, not in the page's ranks.
    const levels = [...s.doc.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter((h) => !inOverlay(h))
      .map((h) => ({ level: Number(h.tagName[1]), what: text(h).slice(0, 40) }));
    const problems = [];
    let last = 0;
    for (const { level, what } of levels) {
      if (!last && level > 1) {
        problems.push(`${s.where} opens its outline at h${level}, on "${what}". The first heading `
          + 'on a page is its title.');
      }
      if (level > LIMITS.outline) {
        problems.push(`${s.where} sets "${what}" at h${level}, below the h${LIMITS.outline} floor. `
          + 'A fourth rank is a page that has become two.');
      }
      if (last && level > last + 1) {
        problems.push(`${s.where} jumps h${last} → h${level} at "${what}". A reader moving by `
          + 'heading hears the missing rank as content they have skipped.');
      }
      last = level;
    }
    return problems;
  },

  'one-primary'(s) {
    if (s.kind === 'marketing') return [];
    const primaries = [...s.doc.querySelectorAll('.ui-btn--primary')].filter((b) => !inOverlay(b));
    if (primaries.length <= LIMITS.primary) return [];
    return [`${s.where} carries ${primaries.length} primary buttons — `
      + `${primaries.map((b) => `"${text(b)}"`).join(', ')}. A page leads with ${LIMITS.primary}; `
      + 'the rest are secondary, tertiary or links.'];
  },

  stacking(s) {
    const problems = [];
    const nested = s.doc.querySelectorAll('.ui-card .ui-card');
    if (nested.length) {
      problems.push(`${s.where} puts ${nested.length} card(s) inside another card. Two borders `
        + 'around one thing, and the kit has no rank for the inner one.');
    }
    const body = s.doc.querySelector('.ui-app__body');
    if (body) {
      // Every card the body holds that no other card holds — counted by
      // ancestry rather than by direct childhood, because a wrapper around
      // twelve cards is still twelve cards on the page.
      const stacked = [...body.querySelectorAll('.ui-card')]
        .filter((el) => !inOverlay(el) && !el.parentElement.closest('.ui-card'));
      if (stacked.length > LIMITS.cards) {
        problems.push(`${s.where} stacks ${stacked.length} cards. Past ${LIMITS.cards} the page `
          + 'is a list of lists and wants sections, tabs, or a second page.');
      }
    }
    return problems;
  },

  navs(s) {
    const problems = [];
    const seen = new Map();
    for (const nav of [...s.doc.querySelectorAll('nav')].filter((n) => !inOverlay(n))) {
      const by = nav.getAttribute('aria-labelledby');
      // aria-labelledby takes a list of ids, and the name is what they say in order.
      const name = nav.getAttribute('aria-label')
        || (by ? by.trim().split(/\s+/).map((id) => text(s.doc.getElementById(id))).filter(Boolean).join(' ') : '');
      if (!name) {
        problems.push(`${s.where} draws a navigation landmark with no name (${nav.className || '<nav>'}). `
          + 'A reader moving by landmark hears "navigation" and nothing else.');
        continue;
      }
      if (seen.has(name)) {
        problems.push(`${s.where} has two navigation landmarks both named "${name}" — two `
          + 'identical doors, and the shell already draws one of them.');
      }
      seen.set(name, nav);
    }
    return problems;
  },

  'at-rest'(s) {
    const open = OPEN.filter((sel) => s.doc.querySelector(sel));
    return open.length === 0 ? []
      : [`${s.where} opens ${open.join(', ')} before the reader has asked for anything. A page `
        + 'arrives at rest; an overlay is what a reader opens. Mounted and closed is fine.'];
  },

  density(s) {
    const problems = [];
    const tables = [...s.doc.querySelectorAll('table.ui-table')].filter((t) => !inOverlay(t));
    const densities = new Set(tables.map((t) => (t.classList.contains('ui-table--dense') ? 'dense' : 'roomy')));
    if (densities.size > 1) {
      problems.push(`${s.where} draws ${tables.length} tables at ${[...densities].join(' and ')} `
        + 'density. One page, one rhythm.');
    }
    // A screen that writes its own cell padding has left the scale, and no
    // amount of agreeing with itself makes that one density. Two spellings
    // reach it: a rule in the story's own <style> block, and a style attribute
    // on the cell, which is the one the DOM can see.
    const inline = [...s.doc.querySelectorAll('td[style], th[style]')]
      .filter((c) => /padding|height/.test(c.getAttribute('style')));
    if (inline.length) {
      problems.push(`${s.where} sets cell padding or height on ${inline.length} cell(s) inline. `
        + 'Density comes from .ui-table--dense and the spacing scale.');
    }
    // The other spelling is a rule in the story's own <style> block. It is a
    // fact about the file, so it is read once per file rather than once per
    // screen the file publishes.
    const local = s.firstOfFile && /\.ui-table[^{}]*\b(?:td|th)\b[^{}]*\{[^}]*padding\s*:/.exec(s.source);
    if (local) {
      problems.push(`${s.file} sets table cell padding in its own stylesheet: `
        + `${local[0].slice(0, 60)}… Density comes from .ui-table--dense and the spacing scale, `
        + 'not from a rule per screen.');
    }
    return problems;
  },

  lede(s) {
    if (s.kind !== 'app') return [];
    const main = s.doc.querySelector('main.ui-app__main');
    const title = text(main.querySelector('h1'));
    const lede = text(main.querySelector('p.ui-app__sub'));
    if (!lede) {
      return [`${s.where} has a title and no lede. What is counted, how far back and where the `
        + 'numbers come from is what the title cannot say.'];
    }
    const problems = [];
    // Abbreviations end in a full stop and do not end a sentence. Counting
    // segments rather than stops also counts a last sentence with no stop
    // at all, which counting stops does not.
    const sentences = lede
      .replace(/\b(?:e\.g|i\.e|etc|vs|approx|no|fig|cf)\./gi, '$&\u0000')
      .replace(/\u0000/g, '')
      .split(/(?<!\b(?:e\.g|i\.e|etc|vs|approx|no|fig|cf))[.!?]+(?:\s|$)/i)
      .map((part) => part.trim()).filter(Boolean).length;
    if (sentences > LIMITS.lede) {
      problems.push(`${s.where} sets a ${sentences}-sentence lede. ${LIMITS.lede} is the most a `
        + 'reader takes before the content; past that it is a paragraph nobody reads twice.');
    }
    // The fault is the title said twice, wherever in the opening sentence it
    // lands: "Payouts — this is the payouts page" is the rule's own example and
    // opens with a dash, not with the title.
    const opening = lede.split(/[.!?]/)[0].toLowerCase();
    if (title && opening.includes(title.toLowerCase())) {
      problems.push(`${s.where} spends its opening sentence on the title again — `
        + `"${lede.slice(0, 60)}…" under "${title}". The reader has just read it.`);
    }
    return problems;
  },
};

// ---- the gates -----------------------------------------------------------

// The floors are what the tree holds today, not a round number underneath it:
// a floor with slack in it is a floor that a deleted story walks under.
// why: CONTRIBUTING.md#a-subject-a-gate-cannot-check-is-a-failure-never-a-skip
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

// The limits are stated three times — in the rule prose, in this gate, and in
// the specification's contract — and only the first two are one object. This is
// the third: the section has to say the same numbers, spelled either way.
//
// Each is held against the SENTENCE that states it and not against the section
// at large. Searching the section for a bare number was close to vacuous:
// LIMITS.cards could go from 6 to 1 and the check stayed green, because the word
// "one" appears a dozen times in that section while the specification went on
// saying "Six stacked cards at most". Only `primary` ever failed, and only
// because neither "0" nor "zero" happens to be written there. So each pattern
// carries the limit's own noun, and the number is the one part of it that moves.
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** `6` or `six`, either spelling, for a number the specification may write out. */
const either = (n) => `(?:${n}${WORD[n] ? `|${WORD[n]}` : ''})`;

const SPEC_SENTENCE = {
  cards: (n) => ({
    re: new RegExp(`\\b${either(n)}\\s+stacked cards at most\\b`, 'i'),
    says: `"${WORD[n] || n} stacked cards at most"`,
  }),
  lede: (n) => ({
    re: new RegExp(`\\bit is\\s+${either(n)}\\s+sentences? at most\\b`, 'i'),
    says: `"a lede … is ${WORD[n] || n} sentences at most"`,
  }),
  outline: (n) => ({
    re: new RegExp(`\\bstops at \`h${n}\``),
    says: `"the outline … stops at \`h${n}\`"`,
  }),
  primary: (n) => ({
    re: new RegExp(`\\b${either(n)}\\s+primary action at most\\b`, 'i'),
    says: `"${WORD[n] || n} primary action at most"`,
  }),
};

test('the specification states the same limits this gate measures', () => {
  const spec = readFileSync(path.join(root, 'docs/specification.md'), 'utf8');
  const section = spec.slice(spec.indexOf('\n## The page\n'), spec.indexOf('\n## The page shell\n'));
  assert.ok(section.length > 400, 'docs/specification.md has no "## The page" section to read');

  // Every limit is checked, so a fifth one added to LIMITS with no sentence to
  // hold it to fails here rather than going unwritten in the contract.
  assert.deepEqual(
    Object.keys(LIMITS).sort(), Object.keys(SPEC_SENTENCE).sort(),
    'a limit has no sentence in docs/specification.md that this gate knows how to read, or a '
    + 'pattern here names a limit that is gone. Either way one of the three copies is unheld.',
  );

  const missing = Object.entries(LIMITS)
    .map(([key, n]) => ({ key, n, ...SPEC_SENTENCE[key](n) }))
    .filter(({ re }) => !re.test(section))
    .map(({ key, says }) => `${key}: the section does not say ${says}`);
  assert.deepEqual(missing, [], 'the specification and the page disagree about a limit, or the '
    + 'specification stopped stating one. The number moved in stories/guidelines/_the-page.js and '
    + 'the sentence in docs/specification.md#the-page did not:\n  ' + missing.join('\n  '));
});

// ---- the rule-to-code table ----------------------------------------------
// The contract's table is the only rule-to-code mapping. The guideline page
// carries no code references. It carries no line numbers on purpose, which is
// the right call and has a cost: a path that stops existing and a symbol that is
// renamed both go quiet. So the fenced spans are read out of the table and
// resolved. Subjects are discovered from the table itself, so a row added
// tomorrow is checked without editing this file.
//
// Ledger, what a pass does not say: nothing about whether the line found is the
// line that HOLDS the rule — only that the file is there and the name is in it.
// A symbol is searched as text, so a mention in a comment counts.

const TABLE_HEADING = '### Which line of the kit holds each of them';
/** A fenced span that names a file rather than a symbol or a selector. */
const isPath = (span) => /^[\w.\-/]+\.(?:js|css|mjs)$/.test(span);

/** The table's rows, each as `{ rule, spans }`, read out of the contract. */
function ruleToCode(spec) {
  const at = spec.indexOf(TABLE_HEADING);
  assert.ok(at >= 0, `docs/specification.md no longer carries "${TABLE_HEADING}" — this gate is `
    + 'reading nothing, and the rules whose only mapping lives there are unheld');
  const section = spec.slice(at, spec.indexOf('\n## ', at + 1));
  const rows = section.split('\n')
    .filter((line) => line.startsWith('|') && !/^\|\s*-+/.test(line) && !/^\|\s*Rule\s*\|/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((c) => c.trim()));
  const fenced = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  return rows.map(([rule, where]) => ({ rule: fenced(rule)[0] ?? rule, spans: fenced(where) }));
}

const SPEC = readFileSync(path.join(root, 'docs/specification.md'), 'utf8');

test('the contract’s rule-to-code table names one row per rule, and only rules', () => {
  const table = ruleToCode(SPEC);
  assert.deepEqual(
    table.map((r) => r.rule).sort(), GATED.map((r) => r.id).sort(),
    'the rule-to-code table in docs/specification.md#the-page and the rules themselves have '
    + 'drifted. Every rule needs a row saying where the kit holds it, and a row needs a rule.',
  );
});

test('every file the rule-to-code table names exists, and every name it fences is in one', () => {
  const problems = [];
  for (const { rule, spans } of ruleToCode(SPEC)) {
    const paths = spans.filter(isPath);
    if (!paths.length) { problems.push(`${rule}: the row names no file at all`); continue; }
    // A row may name siblings by basename alone — `confirm.js` after
    // `src/components/drawer.js` — so a bare name resolves against the
    // directories the row has already spelled out.
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
  assert.deepEqual(problems, [], 'the rule-to-code table in docs/specification.md#the-page cites '
    + 'code that is not there. The table is the only rule-to-code mapping, and it '
    + 'carries no line numbers, so nothing else would have said so:\n  ' + problems.join('\n  '));
});

// A rule reaches this gate two ways — drawn on the page, or stated only in the
// contract — and the union is what the gate has to walk. Either list drifting
// from CHECKS is the same failure: a rule with no check is a wish, and a check
// with no rule is a rule the reader is held to and never told.
const GATED = [
  ...RULES.map((r) => ({ id: r.id, says: r.imperative })),
  ...GATED_ELSEWHERE.map((r) => ({ id: r.id, says: r.states })),
];

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

for (const rule of GATED) {
  test(`${rule.id}: ${rule.says}`, () => {
    const problems = screens.flatMap((s) => CHECKS[rule.id](s));
    assert.deepEqual(problems, [], `${problems.length} screen(s) break this rule:\n  `
      + `${problems.join('\n  ')}`);
  });
}
