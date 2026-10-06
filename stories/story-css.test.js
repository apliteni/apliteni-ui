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
 * LIMITS are stated in scripts/lib/story-css.js, next to the reader they belong to. The
 * one that matters most here: this is source, not paint. A story that assembles a
 * declaration at run time, or sets `element.style`, walks past this gate.
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

/* Every showcase and component story, discovered from the directories so a new story
 * joins by existing — plus the `_name.js` support modules the stories build with. Those
 * are in because they are where this collection's worst habit lives: `_gallery.js`
 * writes the specimen label's type for twenty-four stories at once, so a gate that read
 * only the stories would call every one of them clean. */
const subjects = [
  ...readdirSync(path.join(root, 'stories')).filter((f) => /^_[\w-]+\.js$/.test(f))
    .map((f) => `stories/${f}`),
  ...readdirSync(path.join(root, 'stories/apps')).filter((f) => /\.stories\.js$|^_[\w-]+\.js$/.test(f))
    .map((f) => `stories/apps/${f}`),
  ...readdirSync(path.join(root, 'stories/components')).filter((f) => f.endsWith('.stories.js'))
    .map((f) => `stories/components/${f}`),
].sort();

/* Foundations and guideline pages are deliberately NOT subjects. A foundations page's
 * job is to draw the token — a swatch of `--surface-3` is the specimen, and painting it
 * is the page working — and a guideline page is one shipped reading layout whose own
 * gates measure it (stories/guidelines/reading-surface.test.js). #601 measured them
 * anyway, for the record: 1812 declarations across the two collections, 783 of them
 * paint. Gating them would demand an allow-list longer than the pages. */
const FOUND = { subjects: 41, declarations: 520, carriers: 34 };

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

/* Read off the stories that wrote no shadow CSS at all — by construction, the ones that
 * used the kit. Across both workspaces there are 47 of them, the widest needs 22 glue
 * declarations (CalloutToast's stack of toasts), nine in ten need 11 or fewer, and the
 * median needs 1.
 *
 * So 22 is the measured cost of the widest honest composition in the collection, not a
 * round number over it. Five subjects in the two workspaces are above it, and all five
 * carry shadow CSS as well: the ceiling and the shadow rule pick out the same five
 * stories without being told to. That is the evidence the number is in the right place. */
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

test('every subject this gate reads is a story or a story support module', () => {
  const stray = subjects.filter((f) => !/\.stories\.js$/.test(f) && !/\/_[\w-]+\.js$/.test(f));
  assert.deepEqual(stray, [], 'the sweep reached a file that is neither a story nor a support '
    + 'module for one. Kit source has its own gates and its own permissions.');
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

test('the gate reports a story that paints something of its own', () => {
  // CalloutToast writes no shadow CSS today, so a colour added to it has nowhere to hide.
  const file = 'stories/components/CalloutToast.stories.js';
  const before = measured.find((s) => s.file === file);
  assert.equal(before.shadows.length, 0, `${file} was the clean subject this mutation needs and `
    + 'is no longer clean — pick another and say so here.');
  const problems = withEdit(file, (src) => src.replace(
    'export const', '/* */ const MUTANT = `<style>.ct-x { color: #ff0000; }</style>`;\nexport const',
  ));
  assert.ok(problems.some((p) => p.includes(file) && p.includes('color')),
    `a story painting its own ink was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a story that restyles a kit class', () => {
  const file = 'stories/components/CalloutToast.stories.js';
  const problems = withEdit(file, (src) => src.replace(
    'export const', '/* */ const MUTANT = `<style>.ui-callout { background: #ff0000; }</style>`;\nexport const',
  ));
  assert.ok(problems.some((p) => p.includes(file) && p.includes('.ui-callout')),
    `repainting a kit class was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a placement onto a kit class with no reason on record', () => {
  const file = 'stories/components/CalloutToast.stories.js';
  const problems = withEdit(file, (src) => src.replace(
    'export const', '/* */ const MUTANT = `<style>.ui-callout { max-width: 10px; }</style>`;\nexport const',
  ));
  assert.ok(problems.some((p) => p.includes(`${file}|.ui-callout`)),
    `an unlisted placement was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a story that re-declares a kit token', () => {
  const file = 'stories/components/CalloutToast.stories.js';
  const problems = withEdit(file, (src) => src.replace(
    'export const', '/* */ const MUTANT = `<style>.ct-x { --space-4: 3px; }</style>`;\nexport const',
  ));
  assert.ok(problems.some((p) => p.includes(file) && p.includes('--space-4')),
    `a re-declared kit token was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a story whose layout glue goes over the ceiling', () => {
  const file = 'stories/components/Footer.stories.js';
  const glue = `.mx { ${Array.from({ length: GLUE_CEILING + 1 }, (_, i) => `margin-top: ${i}px`).join(';')} }`;
  const problems = withEdit(file, (src) => src.replace(
    'export const', `/* */ const MUTANT = \`<style>${glue}</style>\`;\nexport const`,
  ));
  assert.ok(problems.some((p) => p.includes(file) && p.includes(`ceiling of ${GLUE_CEILING}`)),
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

  const clean = withEdit(file, (src) => src.replace(/font-size: var\(--text-sm\);|color: var\(--(?:muted|text)\);/g, ''));
  assert.ok(clean.some((p) => p.includes(file) && p.includes('writes no paint')),
    `a story that has nothing left to record was not reported:\n${clean.join('\n')}`);
});

test('the gate reports a property it cannot sort', () => {
  const file = 'stories/components/CalloutToast.stories.js';
  const problems = withEdit(file, (src) => src.replace(
    'export const', '/* */ const MUTANT = `<style>.ct-x { scrollbar-gutter: stable; }</style>`;\nexport const',
  ));
  assert.ok(problems.some((p) => p.includes('scrollbar-gutter') && p.includes('does not sort')),
    `an unsorted property was not reported:\n${problems.join('\n')}`);
});

test('the gate reports a dead allow-list entry', () => {
  const problems = problemsIn(measured, {
    ...against,
    allowed: { ...ALLOWED, 'stories/components/Footer.stories.js|.ui-nowhere': 'nothing matches this' },
  });
  assert.ok(problems.some((p) => p.includes('.ui-nowhere') && p.includes('nothing matches it')),
    `a dead allow-list entry was not reported:\n${problems.join('\n')}`);
});
