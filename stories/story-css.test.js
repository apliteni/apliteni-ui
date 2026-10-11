/* Rule: a showcase or component story places kit parts. It does not restyle them, and
 * it does not paint, type or animate anything itself.
 *
 * why: AGENTS.md#changes, #601
 *
 * A showcase exists to show what the kit does on its own. CSS a story writes for itself
 * breaks that twice: the page stops being evidence about the kit, and the gap the CSS
 * papers over never reaches an issue. #601 found 139 such declarations in this
 * workspace's stories — hand-rolled page heads, a sort button rebuilt from scratch, a
 * feature grid the kit already ships as `.ui-feature-grid`.
 *
 * The reading and the sorting are scripts/lib/story-css.js, shared with the React
 * workspace's gate; the subjects, the allow-list and the recorded figures below are this
 * workspace's own, which is what AGENTS.md#verification asks for.
 *
 * Three answers per declaration, and each has its own consequence:
 *  - glue, free up to GLUE_CEILING;
 *  - placement — glue written onto a kit class — allowed from ALLOWED, with a reason;
 *  - shadow — paint, type, motion, or a kit token re-declared — never allowed, and held
 *    at the figure in RECORDED until it is gone.
 *
 * A fourth answer, unknown, is this gate admitting it cannot sort something: a property
 * in neither vocabulary, or a style block it cannot read. Both fail, because a gate that
 * passes what it cannot classify is a gate with a hole in it.
 *
 * LIMITS are stated in scripts/lib/story-css.js, next to the reader they belong to. The
 * one that matters most here: this is source, not paint. A story that sets
 * `element.style`, or toggles a class the kit does not own, walks past this gate.
 *
 * The subjects are the stories, the `_name.js` modules they build with, and the
 * stylesheets those import: a served story reaches paint through its own module graph as
 * easily as through a `<style>` block.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { kitTokenNames, measureStory, problemsIn, show } from '../scripts/lib/story-css.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

/* ---- the subjects ------------------------------------------------------- */

/** Every file under a directory, repo-relative, however deep it sits. */
function filesUnder(rel, acc = []) {
  for (const entry of readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const next = `${rel}/${entry.name}`;
    if (entry.isDirectory()) filesUnder(next, acc);
    else acc.push(next);
  }
  return acc;
}

/* What .storybook/main.js serves: `../stories/**\/*.stories.@(js|mjs)`. Recursive, and
 * two extensions — so this sweep is too. A sweep narrower than the glob gates less than
 * Storybook ships, and the gap is silent: the aggregate counts below stay green while a
 * story in a new folder paints whatever it likes. */
const SERVED = /\.stories\.m?js$/;

/* The `_name.js` support modules the stories build with. They are subjects because they
 * are where this collection's worst habit lives: `_gallery.js` writes the specimen
 * label's type for twenty-four stories at once, so a gate that read only the stories
 * would call every one of them clean. */
const SUPPORT = /(?:^|\/)_[\w-]+\.m?js$/;

/* Foundations and guideline pages are deliberately NOT subjects. A foundations page's
 * job is to draw the token — a swatch of `--surface-3` is the specimen, and painting it
 * is the page working — and a guideline page is one shipped reading layout whose own
 * gates measure it (stories/guidelines/reading-surface.test.js). #601 measured them
 * anyway, for the record: 1812 declarations across the two collections, 783 of them
 * paint. Gating them would demand an allow-list longer than the pages. */
const EXCLUDED = /^stories\/(?:foundations|guidelines)\//;

/* The stylesheets the stories own. A served story can reach paint through its own module
 * graph — `import './review.css'` puts a sheet on the page with nothing left in the story
 * for a reader of the story to find — so a sheet a story imports is the story's CSS and a
 * subject. A sheet imported from outside this folder, or by something that is not a story,
 * belongs to whatever imports it: the same ownership rule react/src/story-css.test.ts
 * applies to that workspace's component sheets. */
const SHEET = /\.css$/;

/** Does `source`, the text of `file`, import `sheet`? Resolved against `file`'s folder,
 * so an import from a subfolder or with a `../` in it names the same sheet. */
const importsSheet = (file, source, sheet) => {
  const from = path.posix.dirname(file);
  for (const m of source.matchAll(/['"]([^'"]+\.css)['"]/g)) {
    if (path.posix.normalize(path.posix.join(from, m[1])) === sheet) return true;
  }
  return false;
};

/**
 * The subjects among a list of paths: every story Storybook serves, the support modules
 * they build with, and the stylesheets those import. `sourceOf` reads a path, so a
 * mutation can hand this one a story and a sheet that do not exist yet.
 */
export const subjectsAmong = (paths, sourceOf) => {
  const stories = paths.filter((p) => !EXCLUDED.test(p) && (SERVED.test(p) || SUPPORT.test(p)));
  const sources = new Map(stories.map((story) => [story, sourceOf(story)]));
  const sheets = paths.filter((p) => !EXCLUDED.test(p) && SHEET.test(p)
    && stories.some((story) => importsSheet(story, sources.get(story), p)));
  return [...stories, ...sheets].sort();
};

const files = filesUnder('stories');
const subjects = subjectsAmong(files, read);

/** A reader for a mutation's invented paths: the real files from disk, an invented one
 * empty unless the case gives it a source. */
const sourceAmong = (invented = {}) => (file) => invented[file]
  ?? (files.includes(file) ? read(file) : '');

/* Measured, not guessed: the figures as this gate last audited them. Every one is a
 * lower bound, so the gate fails when the reading stops reaching something rather than
 * when the collection grows. */
const FOUND = { subjects: 41, served: 37, declarations: 520, carriers: 35, sheets: 0 };

const tokens = kitTokenNames(
  read('src/tokens/tokens.css'),
  read('src/tokens/accents.css'),
  read('src/tokens/brand.generated.css'),
);

/* ---- the allow-list: layout glue, and only layout glue ------------------ */

/* A story may name a kit class to place the part, and only with a reason on record. The
 * key is the file and the selector exactly as written; the value says why the kit offers
 * no other way. Nothing here may paint — a paint declaration onto a kit class is a
 * shadow and has no allow-list. */
const ALLOWED = {
  // src/styles/base.css ships the glow as a shape with no place: "scale/position with
  // inline styles". Four of these entries are the kit's own instruction being followed.
  'stories/apps/Consent.stories.js|.ui-glow.ui-glow--purple': 'the kit ships the glow unplaced',
  'stories/apps/Consent.stories.js|.ui-glow.ui-glow--green': 'the kit ships the glow unplaced',
  'stories/apps/Landing.stories.js|.ui-glow.ui-glow--purple': 'the kit ships the glow unplaced',
  'stories/apps/Landing.stories.js|.ui-glow.ui-glow--cyan': 'the kit ships the glow unplaced',
  'stories/apps/SignIn.stories.js|.ui-glow.ui-glow--purple': 'the kit ships the glow unplaced',
  'stories/apps/SignIn.stories.js|.ui-glow.ui-glow--cyan': 'the kit ships the glow unplaced',

  // A card's width is the page's decision, not the card's: the kit gives .ui-card a
  // ground, a frame and padding, and lets the column it sits in say how wide it is.
  'stories/apps/Consent.stories.js|.ui-auth__card': 'the auth card takes its width from the screen',
  'stories/components/BadgeStatus.stories.js|.ui-card': 'a specimen card is as wide as its specimen',
  'stories/components/SwitchCheckbox.stories.js|.ui-card': 'a specimen card is as wide as its specimen',
  'stories/components/Table.stories.js|.ui-card': 'a specimen card is as wide as its specimen',

  // Space between two kit parts belongs to whatever stacks them, and these pages stack
  // by hand. #601's follow-up is the one fix for all four: stack them in a kit layout.
  'stories/apps/Consent.stories.js|.ui-auth__foot': 'the page stacks the foot by hand',
  'stories/apps/SignIn.stories.js|.ui-auth__foot': 'the page stacks the foot by hand',
  'stories/apps/EmptyStates.stories.js|.ui-toolbar': 'the page stacks the toolbar by hand',
  'stories/apps/Landing.stories.js|.ui-section-head': 'the page stacks the section head by hand',
  'stories/components/Feedback.stories.js|.ui-eyebrow': 'the page stacks the eyebrow by hand',
  'stories/components/Card.stories.js|.ui-card__sub': 'the sub is the card\'s last line here',

  // The success panel is inside the auth card rather than on a page of its own, so the
  // page gives it the inset the card would have given it. Its `background: transparent`
  // on the same tag is paint, and is recorded as a shadow below.
  'stories/apps/Consent.stories.js|.ui-success': 'the panel sits inside the auth card',
  'stories/apps/Consent.stories.js|.ui-success__sub': 'the sub takes a measure and a centre',

  // A fifteen-column table has to be wider than its scroll region or nothing scrolls,
  // and the region has to say how tall it is. Both are the page answering a question the
  // kit asks: src/styles/table.css reads --ui-table-height with a fallback.
  'stories/apps/StockScreener.stories.js|.screener .ui-table': 'fifteen columns are wider than the viewport',
  'stories/apps/StockScreener.stories.js|.screener .ui-table-scroll': 'the page stacks the scroll region by hand',
  'stories/apps/StockScreener.stories.js|.screener .ui-identity__name': 'a company name does not wrap mid-row',
  'stories/apps/Landing.stories.js|.ui-card.ui-card--accent.ui-card--pad-lg': 'one centred card on the landing page',
  'stories/components/Tooltip.stories.js|.ui-tip-host': 'the host hugs the part the readout points at',

  // Staging an overlay flat on the canvas. An open command palette and an open dropdown
  // panel are positioned against a viewport and a trigger; a static specimen has
  // neither, so the story takes the positioning off. The kit has no specimen mode for an
  // overlay — #601's clearest gap, because the three paint declarations each of these
  // also needs (opacity, visibility, transform) are recorded as shadows below.
  'stories/components/CommandPalette.stories.js|.cp-stage .ui-cmdk': 'an overlay has no specimen mode',
  'stories/components/CommandPalette.stories.js|.cp-stage .ui-cmdk__scrim': 'an overlay has no specimen mode',
  'stories/components/CommandPalette.stories.js|.cp-stage .ui-cmdk.is-open .ui-cmdk__panel': 'an overlay has no specimen mode',
  'stories/components/CommandPalette.stories.js|.cp-stage .ui-cmdk__list': 'an overlay has no specimen mode',
  'stories/components/Dropdown.stories.js|.ui-dropdown__panel': 'an overlay has no specimen mode',
  'stories/components/Dropdown.stories.js|.ui-card': 'an overlay has no specimen mode',
  'stories/components/Dropdown.stories.js|.ui-app': 'the shell is cut down to the width this specimen needs',
  'stories/components/Dropdown.stories.js|.ui-app__rail': 'the shell is cut down to the width this specimen needs',
};

/* ---- the glue ceiling --------------------------------------------------- */

/* Read off the 47 stories across both workspaces that wrote no shadow CSS at all — by
 * construction, the ones that used the kit. The median needs 1 glue declaration, 40 of
 * the 47 need 11 or fewer, and 22 is the second-widest, CalloutToast's stack of toasts.
 *
 * Six subjects are above 22. Five carry shadow CSS as well, so the ceiling and the shadow
 * rule pick out the same stories without being told to; the sixth is
 * react/src/SwitchCheckbox.stories.tsx at 26, which is clean, and it is recorded at its
 * figure rather than the line being moved up to it — a ceiling of 26 lets every story in
 * both collections lay out a page. Whether 22 or 26 is right is the open question on
 * #601, which holds the distribution it came from. */
export const GLUE_CEILING = 22;

/* ---- what the collection carries today ---------------------------------- */

/* The shadow CSS already written, at the size it was when this gate was added, and the
 * glue of the two stories over the ceiling.
 *
 * One cause covers every line and is not worth repeating twenty-one times: the story was
 * written before anything measured it. The limitation is the same for all of them and is
 * the real cost of this table — a recorded story may stay as it is indefinitely. What it
 * may not do is grow, and when it comes under its figure the smaller one gets recorded,
 * until the line goes.
 *
 * Maintained by hand. Never regenerated: a figure that rises because a tool wrote it is
 * not a decision anybody made.
 *
 * The follow-ups are listed in #601's audit; the ones that would clear the most at once
 * are a kit page-head part (the `font: 600 22px/1.2 var(--font-display)` repeated across
 * Confirm, Drawer, Stat, Feedback and CommandPalette), a type rank for the specimen
 * label in `_gallery.js`, a specimen mode for an overlay, and a chart the kit owns
 * instead of `_chart.js`. */
const RECORDED = {
  'stories/_chart.js': { shadow: 15 },
  'stories/_gallery.js': { shadow: 2 },
  'stories/apps/Access.stories.js': { shadow: 2 },
  'stories/apps/Consent.stories.js': { shadow: 18, glue: 26 },
  'stories/apps/Landing.stories.js': { shadow: 24, glue: 61 },
  'stories/apps/SignIn.stories.js': { shadow: 1 },
  'stories/apps/StockScreener.stories.js': { shadow: 9 },
  'stories/components/BackLink.stories.js': { shadow: 3 },
  'stories/components/BadgeStatus.stories.js': { shadow: 2 },
  'stories/components/Button.stories.js': { shadow: 1 },
  'stories/components/Card.stories.js': { shadow: 1 },
  'stories/components/CommandPalette.stories.js': { shadow: 10 },
  'stories/components/Confirm.stories.js': { shadow: 6 },
  'stories/components/Drawer.stories.js': { shadow: 7 },
  'stories/components/Dropdown.stories.js': { shadow: 3 },
  'stories/components/Feedback.stories.js': { shadow: 11 },
  'stories/components/Pagination.stories.js': { shadow: 4 },
  'stories/components/Stat.stories.js': { shadow: 4 },
  'stories/components/Table.stories.js': { shadow: 2 },
  'stories/components/Tabs.stories.js': { shadow: 7 },
  'stories/components/Tooltip.stories.js': { shadow: 7 },
};

const against = { allowed: ALLOWED, recorded: RECORDED, ceiling: GLUE_CEILING, where: 'this gate' };
const measured = subjects.map((file) => measureStory(file, read(file), tokens));

/* ---- the subjects are really there -------------------------------------- */

test('the gate found every showcase and component story, and read CSS out of them', () => {
  assert.ok(subjects.length >= FOUND.subjects, `only ${subjects.length} subjects, against `
    + `${FOUND.subjects} when this gate was written. A story left the collection, or the sweep `
    + 'stopped reaching it — say which in the same commit.');

  assert.ok(tokens.size > 100, `only ${tokens.size} kit token names were read, so the check for a `
    + 're-declared token is measuring nothing. The token sheets moved or stopped parsing.');

  const total = measured.reduce((sum, s) => sum + s.total, 0);
  assert.ok(total >= FOUND.declarations, `only ${total} declarations read across the subjects, `
    + `against ${FOUND.declarations} when this gate was written. A reader that stops seeing CSS `
    + 'passes every story.');

  const carriers = measured.filter((s) => s.total > 0).length;
  assert.ok(carriers >= FOUND.carriers, `only ${carriers} of ${measured.length} subjects carry any `
    + `CSS, against ${FOUND.carriers} when this gate was written.`);

  // Each of the three answers has to be reachable, or a rule below is inert.
  for (const [verdict, count] of [
    ['glue', measured.reduce((n, s) => n + s.glue, 0)],
    ['placement', measured.reduce((n, s) => n + s.placements.length, 0)],
    ['shadow', measured.reduce((n, s) => n + s.shadows.length, 0)],
  ]) {
    assert.ok(count > 0, `nothing in the collection sorted as ${verdict}, so the rule for it is `
      + 'measuring nothing');
  }
});

test('every story Storybook serves is a subject, and the sweep goes all the way down', () => {
  const served = files.filter((f) => SERVED.test(f));
  assert.ok(served.length >= FOUND.served, `only ${served.length} served stories found under `
    + `stories/, against ${FOUND.served} when this gate was written.`);

  const ungated = served.filter((f) => !EXCLUDED.test(f) && !subjects.includes(f));
  assert.deepEqual(ungated, [], 'Storybook serves these stories and this gate does not read them. '
    + 'Either they are subjects or the exclusion above has to say why not.');

  // The sweep is recursive, proven on a folder that exists: the exclusions are reached.
  assert.ok(files.some((f) => /^stories\/guidelines\/[^/]+$/.test(f)),
    'the sweep did not descend into stories/guidelines, so it is not reading folders at all');
});

test('every subject is a story, a support module, or a stylesheet one of them imports', () => {
  const stray = subjects.filter((f) => !SERVED.test(f) && !SUPPORT.test(f) && !SHEET.test(f));
  assert.deepEqual(stray, [], 'the sweep reached a file that is neither a story, nor a support '
    + 'module for one, nor a sheet they import. Kit source has its own gates and its own '
    + 'permissions.');

  // No story in this collection imports a stylesheet today, which is why the figure is
  // zero rather than a lower bound. The rule is proven on an invented sheet below, through
  // the complete gate; this line is what fails on the day a real one arrives.
  assert.equal(subjects.filter((f) => SHEET.test(f)).length, FOUND.sheets, 'a story now imports '
    + `a stylesheet: ${subjects.filter((f) => SHEET.test(f)).join(', ')}. Read its figures, record `
    + 'them if it carries paint, and set FOUND.sheets to the new count.');
});

/* ---- the rule ----------------------------------------------------------- */

test('no showcase or component story builds a shadow kit', () => {
  const problems = problemsIn(measured, against);
  assert.deepEqual(problems, [], `\n\n${problems.join('\n\n')}\n`);
});

test('the allow-list holds layout glue and nothing else', () => {
  const placements = measured.flatMap((s) => s.placements);
  for (const [key, reason] of Object.entries(ALLOWED)) {
    assert.ok(reason && reason.trim().length >= 12, `'${key}' is allow-listed with no reason. An `
      + 'entry without one is a permission nobody granted.');
    const [file] = key.split('|');
    assert.ok(subjects.includes(file), `'${key}' names ${file}, which is not a subject`);
  }
  // A paint declaration onto a kit class is sorted as a shadow, never as a placement, so
  // this holds by construction — asserted so a change to the sorting cannot quietly turn
  // the allow-list into a way of repainting a kit part.
  const painted = placements.filter((d) => !/^(?:--|[a-z-]*(?:width|height|top|right|bottom|left|inset|margin|padding|gap|display|position|order|flex|grid|align|justify|place|overflow|z-index|white-space|text-align|pointer-events|box-sizing|aspect-ratio|columns?)[\w-]*$)/.test(d.property));
  assert.deepEqual(painted.map(show), [], 'a declaration allowed as a placement is not a '
    + 'placement. The allow-list is for putting a kit part somewhere, not for changing it.');
});

/* ---- anti-vacuity: the gate rejects what #601 was opened about ---------- */

/** Measure one subject again with its source edited, and ask what went wrong. */
const withEdit = (file, edit) => problemsIn(
  measured.map((s) => (s.file === file ? measureStory(file, edit(read(file)), tokens) : s)),
  against,
);

/* CalloutToast writes no shadow CSS, so paint added to it has nowhere to hide; Footer
 * writes two glue declarations, so glue added to it does not also trip the ceiling. */
const clean = 'stories/components/CalloutToast.stories.js';
const spare = 'stories/components/Footer.stories.js';

/** Put one more declaration list into a story, ahead of its first export. */
const plant = (markup) => (src) => src.replace(
  'export const', `/* */ const MUTANT = \`${markup}\`;\nexport const`,
);

test('the gate reports a story that paints something of its own', () => {
  const before = measured.find((s) => s.file === clean);
  assert.equal(before.shadows.length, 0, `${clean} was the clean subject this mutation needs and `
    + 'is no longer clean — pick another and say so here.');
  const problems = withEdit(clean, plant('<style>.ct-x { color: #ff0000; }</style>'));
  assert.ok(problems.some((p) => p.includes(clean) && p.includes('color')),
    `a story painting its own ink was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a story that restyles a kit class', () => {
  const problems = withEdit(clean, plant('<style>.ui-callout { background: #ff0000; }</style>'));
  assert.ok(problems.some((p) => p.includes(clean) && p.includes('.ui-callout')),
    `repainting a kit class was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a placement onto a kit class with no reason on record', () => {
  const problems = withEdit(clean, plant('<style>.ui-callout { max-width: 10px; }</style>'));
  assert.ok(problems.some((p) => p.includes(`${clean}|.ui-callout`)),
    `an unlisted placement was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a story that re-declares a kit token', () => {
  const problems = withEdit(clean, plant('<style>.ct-x { --space-4: 3px; }</style>'));
  assert.ok(problems.some((p) => p.includes(clean) && p.includes('--space-4')),
    `a re-declared kit token was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a story whose layout glue goes over the ceiling', () => {
  const glue = `.mx { ${Array.from({ length: GLUE_CEILING + 1 }, (_, i) => `margin-top: ${i}px`).join(';')} }`;
  const problems = withEdit(spare, plant(`<style>${glue}</style>`));
  assert.ok(problems.some((p) => p.includes(spare) && p.includes(`ceiling of ${GLUE_CEILING}`)),
    `glue over the ceiling was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a recorded story that grows, shrinks, or comes clean', () => {
  const file = 'stories/components/BackLink.stories.js';
  assert.equal(measured.find((s) => s.file === file).shadows.length, 3, `${file} was the `
    + 'three-shadow subject these mutations need — pick another and say so here.');

  const grown = withEdit(file, (src) => src.replace(
    'export default', '/* */ const MUTANT = `<style>.bl-x { color: #ff0000; }</style>`;\nexport default',
  ));
  assert.ok(grown.some((p) => p.includes(file) && p.includes('more than the 3 recorded')),
    `a recorded story that grew was not reported:\n${grown.join('\n')}`);

  const shrunk = withEdit(file, (src) => src.replace('color: var(--muted)', 'margin-top: 0'));
  assert.ok(shrunk.some((p) => p.includes(file) && p.includes('down from the 3 recorded')),
    `a recorded story that came under its figure was not reported:\n${shrunk.join('\n')}`);

  const clear = withEdit(file, (src) => src.replace(/font-size: var\(--text-sm\);|color: var\(--(?:muted|text)\);/g, ''));
  assert.ok(clear.some((p) => p.includes(file) && p.includes('writes no paint')),
    `a story that has nothing left to record was not reported:\n${clear.join('\n')}`);
});

test('the gate reports a property it cannot sort', () => {
  const problems = withEdit(clean, plant('<style>.ct-x { scrollbar-gutter: stable; }</style>'));
  assert.ok(problems.some((p) => p.includes('scrollbar-gutter') && p.includes('does not sort')),
    `an unsorted property was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a property it cannot sort even on a kit class', () => {
  // The vocabularies are consulted before the selector. A kit class used to buy a
  // declaration the word "placement", whatever the property did.
  const problems = withEdit(clean, plant('<style>.ui-callout { scrollbar-color: #ff0000 #00ff00; }</style>'));
  assert.ok(problems.some((p) => p.includes('scrollbar-color') && p.includes('does not sort')),
    `an unsorted property on a kit class was not reported as unsorted:\n${problems.join('\n')}`);
});

test('the gate reports a column rule as paint and smooth scrolling as motion', () => {
  // Both used to read as placement: a `column-[\w-]+` pattern answered for
  // `column-rule-color`, and a `scroll-[\w-]+` one for `scroll-behavior`.
  for (const declaration of [
    'column-rule: 8px solid #ff0000',
    'column-rule-color: #ff0000',
    'scroll-behavior: smooth',
  ]) {
    const problems = withEdit(clean, plant(`<style>.ct-x { ${declaration}; }</style>`));
    const [property] = declaration.split(':');
    assert.ok(problems.some((p) => p.includes(clean) && p.includes(property)),
      `\`${declaration}\` was not reported as paint:\n${problems.join('\n')}`);
  }
});

/* ---- anti-vacuity: the reader does not drop ordinary source ------------- */

test('the gate reads a single-quoted style attribute', () => {
  const problems = withEdit(clean, plant("<div style='color: #ff0000'></div>"));
  assert.ok(problems.some((p) => p.includes(clean) && p.includes('color')),
    `a single-quoted style attribute was dropped:\n${problems.join('\n')}`);
});

test('the gate reads a style attribute that carries a comment', () => {
  const problems = withEdit(clean, plant('<div style="/* the brand red */ color: #ff0000"></div>'));
  assert.ok(problems.some((p) => p.includes(clean) && p.includes('color')),
    `a commented style attribute was dropped:\n${problems.join('\n')}`);
});

test('the gate reads the kit class whether it is written before or after the style', () => {
  for (const tag of [
    '<div class="ui-callout" style="max-width: 10px"></div>',
    '<div style="max-width: 10px" class="ui-callout"></div>',
  ]) {
    const problems = withEdit(clean, plant(tag));
    assert.ok(problems.some((p) => p.includes(`${clean}|.ui-callout`)),
      `the kit class in \`${tag}\` was not read as the subject:\n${problems.join('\n')}`);
  }
});

test('the gate reports a style attribute whose text it cannot read', () => {
  // The dodge the reader used to pass in silence: assemble the attribute and it measured
  // zero declarations, which reads exactly like a story that writes no CSS.
  const mutant = 'const MUTANT = `<div style="${paint}"></div>`;';
  const problems = withEdit(clean, (src) => `${src}\n${mutant}\n`);
  assert.ok(problems.some((p) => p.includes(clean) && p.includes('cannot read')),
    `an unreadable style attribute was measured as empty:\n${problems.join('\n')}`);
});

test('the gate reads the outer rule of a nested one, not only the inner', () => {
  // The reading this replaced matched the innermost `{…}`, so `.x { color: red; & > b {
  // margin: 0 } }` measured the margin and dropped the colour. Chromium paints both.
  const problems = withEdit(clean, plant('<style>.ct-x { color: #ff0000; & > b { margin: 0 } }</style>'));
  assert.ok(problems.some((p) => p.includes(clean) && p.includes('color')),
    `the outer rule of a nested rule was dropped:\n${problems.join('\n')}`);
});

test('the gate reads a nested rule as a placement onto the kit class it sits in', () => {
  // The nested selector is written out against its parent, so `&` and a bare descendant
  // both reach the allow-list rather than passing as the story's own glue.
  for (const markup of [
    '<style>.ui-callout { & > b { max-width: 10px } }</style>',
    '<style>.ui-callout { b { max-width: 10px } }</style>',
  ]) {
    const problems = withEdit(clean, plant(markup));
    assert.ok(problems.some((p) => p.includes(`${clean}|.ui-callout`)),
      `the parent kit class in \`${markup}\` was not read as the subject:\n${problems.join('\n')}`);
  }
});

test('the gate reports a style block it cannot account for', () => {
  // Three ways a sheet used to read as fewer declarations than it holds: an at-rule the
  // reader does not know, a declaration outside every rule, and an unbalanced block.
  for (const [markup, what] of [
    ['<style>@scope-nonsense (.a) { .ct-x { color: #ff0000 } }</style>', 'an unknown at-rule'],
    ['<style>color: #ff0000;</style>', 'a declaration outside every rule'],
    ['<style>.ct-x { color: #ff0000 } }</style>', 'a stray brace'],
  ]) {
    const problems = withEdit(clean, plant(markup));
    assert.ok(problems.some((p) => p.includes(clean) && p.includes('cannot read')),
      `${what} was measured as nothing:\n${problems.join('\n')}`);
  }
});

test('the gate reports a style block assembled at run time', () => {
  // `<style>.ct-x { color: ${red} }</style>` is CSS the source does not hold. It used to
  // read as a rule with a literal `${red}` in it; now it reads as unaccounted for.
  const mutant = 'const MUTANT = `<style>.ct-x { color: ${RED} }</style>`;';
  const problems = withEdit(clean, (src) => `${src}\n${mutant}\n`);
  assert.ok(problems.some((p) => p.includes(clean) && p.includes('cannot read')),
    `an interpolated stylesheet was measured as source:\n${problems.join('\n')}`);
});

test('the gate reads a declaration whose value carries a comment or a bracketed `;`', () => {
  // A `;` inside `url(a;b)` and a `}` inside a quoted value are not syntax, so neither
  // splits one declaration into two nor closes the rule it sits in.
  for (const markup of [
    '<style>.ct-x { background: url(a;b.png); color: #ff0000 }</style>',
    '<style>.ct-x { content: "}"; color: #ff0000 }</style>',
    '<style>[data-ct="}"] { color: #ff0000 }</style>',
  ]) {
    const problems = withEdit(clean, plant(markup));
    assert.ok(problems.some((p) => p.includes(clean) && p.includes('color')
      && !p.includes('cannot read')), `\`${markup}\` was misread:\n${problems.join('\n')}`);
  }

  for (const declaration of ['color: /* the brand red */ #ff0000', 'color: rgb(255 0 0 / 50%)']) {
    const problems = withEdit(clean, plant(`<style>.ct-x { ${declaration} }</style>`));
    assert.ok(problems.some((p) => p.includes(clean) && p.includes('color')),
      `\`${declaration}\` was dropped:\n${problems.join('\n')}`);
  }
});

test('a stylesheet a story imports is a subject, and its paint fails the gate', () => {
  // The last way into this collection without writing a line of CSS in a story: put the
  // paint in a sheet and import it. Storybook serves it through the story's own module
  // graph, so the sheet is the story's CSS.
  const story = 'stories/components/Review.stories.mjs';
  const sheet = 'stories/components/review.css';
  const imports = { [story]: "import './review.css';\nexport default { title: 'Review' };\n" };
  assert.ok(subjectsAmong([...files, story, sheet], sourceAmong(imports)).includes(sheet),
    `${story} imports ${sheet} and this gate would not read it`);

  const problems = problemsIn(
    [...measured, measureStory(sheet, '.ui-card { background: #ff0000 }', tokens)], against,
  );
  assert.ok(problems.some((p) => p.includes(sheet) && p.includes('background')),
    `paint in an imported ${sheet} was not reported:\n${problems.join('\n')}`);

  // Resolved against the importing file, so a `../` and a subfolder both land on it.
  const deep = 'stories/apps/nested/Deep.stories.js';
  assert.ok(subjectsAmong([...files, deep, sheet],
    sourceAmong({ [deep]: "import '../../components/review.css';" })).includes(sheet),
  `an import with a \`../\` in it did not resolve to ${sheet}`);

  // Matched on the resolved path and nothing else: another sheet's name, a sheet nothing
  // imports, and a guideline page's own sheet all stay out.
  assert.ok(!subjectsAmong([...files, story, sheet],
    sourceAmong({ [story]: "import './other.css';" })).includes(sheet),
  `${sheet} became a subject without being imported`);
  const page = 'stories/guidelines/deep/Page.stories.js';
  const pageSheet = 'stories/guidelines/deep/page.css';
  assert.ok(!subjectsAmong([...files, page, pageSheet],
    sourceAmong({ [page]: "import './page.css';" })).includes(pageSheet),
  'a guideline page\'s own sheet must stay out of this gate');
});

test('the gate reports a dead allow-list entry', () => {
  const problems = problemsIn(measured, {
    ...against,
    allowed: { ...ALLOWED, 'stories/components/Footer.stories.js|.ui-nowhere': 'nothing matches this' },
  });
  assert.ok(problems.some((p) => p.includes('.ui-nowhere') && p.includes('nothing matches it')),
    `a dead allow-list entry was not reported:\n${problems.join('\n')}`);
});

/* ---- anti-vacuity: discovery ------------------------------------------- */

test('a story served from a new folder or a new extension becomes a subject, paint and all', () => {
  for (const file of [
    'stories/components/New.stories.mjs',
    'stories/components/nested/New.stories.js',
    'stories/apps/nested/deeper/New.stories.mjs',
    'stories/nested/_support.js',
  ]) {
    assert.ok(subjectsAmong([...files, file], sourceAmong()).includes(file),
      `Storybook would serve ${file} and this gate would not read it`);
    const problems = problemsIn(
      [...measured, measureStory(file, '<style>.n { color: #ff0000 }</style>', tokens)],
      against,
    );
    assert.ok(problems.some((p) => p.includes(file) && p.includes('color')),
      `paint in a newly served ${file} was not reported:\n${problems.join('\n')}`);
  }

  // The two exclusions are still exclusions, at any depth.
  for (const file of ['stories/foundations/New.stories.js', 'stories/guidelines/deep/New.stories.mjs']) {
    assert.ok(!subjectsAmong([...files, file], sourceAmong()).includes(file),
      `${file} is a foundations or guideline page and must stay out of this gate`);
  }

  // A test, a test helper and a stylesheet nothing imports are not stories.
  for (const file of ['stories/components/New.test.js', 'stories/lib/helper.js', 'stories/x.css']) {
    assert.ok(!subjectsAmong([...files, file], sourceAmong()).includes(file), `${file} is not a story`);
  }
});
