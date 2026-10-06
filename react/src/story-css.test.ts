// A story places kit parts; it does not restyle them, and it paints nothing itself.
//
// why: AGENTS.md#changes, #601
// Same rule as stories/story-css.test.js, over the same reader and sorter
// (scripts/lib/story-css.js). Each workspace keeps its own subjects, allow-list and
// recorded figures, which is what AGENTS.md#verification asks for.
//
// This workspace's subjects are its stories and the stylesheets only a story imports.
// A sheet a shipped component imports is that component's own CSS and is not read here:
// the React components are the kit in this workspace, and their paint is theirs to
// write. DocumentReview and FeedbackShowcase are showcases with no component behind
// them, so their sheets are story CSS and are read.
//
// The limits of the reading are stated in scripts/lib/story-css.js. The one that bites
// hardest in JSX: a `style={{…}}` whose `className` is built by an expression reads as
// no class at all, so a placement onto a kit class written that way is counted as glue
// rather than sent to the allow-list.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
import { kitTokenNames, measureStory, problemsIn, show } from '../../scripts/lib/story-css.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

/* ---- the subjects ------------------------------------------------------- */

const entries = readdirSync(here);

/** A sheet nothing but a story (or a test) imports is story CSS. */
const storyOnlySheet = (sheet: string) => entries
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$|\.stories\.tsx$/.test(f))
  .every((f) => !readFileSync(path.join(here, f), 'utf8').includes(`./${sheet}`));

const subjects: string[] = [
  ...entries.filter((f) => f.endsWith('.stories.tsx')),
  ...entries.filter((f) => f.endsWith('.css')).filter(storyOnlySheet),
].map((f) => `react/src/${f}`).sort();

// 36 stories and the two showcase sheets, when this gate was written.
const FOUND = { subjects: 38, declarations: 264, carriers: 23, sheets: 2 };

const tokens: Set<string> = kitTokenNames(
  read('src/tokens/tokens.css'),
  read('src/tokens/accents.css'),
  read('src/tokens/brand.generated.css'),
);

/* ---- the allow-list: layout glue, and only layout glue ------------------ */

// A story may name a kit class to place the part, and only with a reason on record. The
// key is the file and the selector exactly as written. Nothing here may paint — a paint
// declaration onto a kit class is sorted as a shadow and has no allow-list.
const ALLOWED: Record<string, string> = {
  // A card's or a column's width is the page's decision. The kit gives .ui-card its
  // ground, frame and padding and lets what it sits in say how wide it is.
  'react/src/BackLink.stories.tsx|.ui-app__main': 'the specimen column is narrower than the shell',
  'react/src/BadgeStatus.stories.tsx|.ui-card': 'a specimen card is as wide as its specimen',
  'react/src/SwitchCheckbox.stories.tsx|.ui-card': 'a specimen card is as wide as its specimen',

  // A table wider than its scroll region is the only way the region scrolls, and the
  // region's own inset is wrong when the table is inside a card rather than on a page.
  'react/src/Finance.stories.tsx|.pinned-selection .ui-table': 'the pinned columns need a table wider than the viewport',
  'react/src/DocumentReview.stories.tsx|.doc-flow .ui-table-scroll': 'the amounts table sits in a card, not on the page',

  // Space between two kit parts belongs to whatever stacks them, and these stack by hand.
  'react/src/DocumentReview.stories.tsx|.doc-flow__sheet .ui-skel + .ui-skel': 'the preview stacks its skeleton bars by hand',
  'react/src/PeriodPicker.stories.tsx|.ui-card__title': 'the title is the first line of this card',

  // One column of one table reads left because it holds text. The kit right-aligns a
  // footer label on the assumption it spans to sit against its figure; here it owns a
  // column. The font-weight rules on the same selectors are paint, and are recorded below.
  'react/src/DocumentReview.stories.tsx|.ui-table.doc-flow__amounts :is(tbody, tfoot) th': 'a text column keeps its own alignment',

  // A skeleton stands in for content that is not there, so only the page knows its size.
  'react/src/PeriodPicker.stories.tsx|.ui-skel__bar.m-skeleton': 'a skeleton is the size of what it replaces',

  // A field and its menu share one row until the phone step takes the menu to its own.
  'react/src/SearchField.stories.tsx|.invoice-toolbar > .ui-dropdown': 'the toolbar rewraps at the phone step',
};

/* ---- the glue ceiling --------------------------------------------------- */

// Derived in stories/story-css.test.js from the 47 stories across both workspaces that
// wrote no shadow CSS at all: the widest needs 22 glue declarations, nine in ten need 11
// or fewer. One ceiling, because it is one rule about one kind of story.
const GLUE_CEILING = 22;

/* ---- what this workspace carries today ---------------------------------- */

// The shadow CSS already written, at the size it was when this gate was added, and the
// glue of the three stories over the ceiling.
//
// One cause covers every line: the story was written before anything measured it. The
// limitation is the same for all of them and is the real cost of this table — a recorded
// story may stay as it is indefinitely. What it may not do is grow, and when it comes
// under its figure the smaller one gets recorded, until the line goes.
//
// Maintained by hand. Never regenerated.
//
// The follow-ups are in #601's audit. DocumentReview is the largest: six of its twelve
// are `font-weight` on a kit table and a kit drawer row, which is the rank the kit's own
// type ranks should be able to express. FeedbackShowcase.css is twelve declarations of
// page-head and prose type that a kit page-head part would carry.
const RECORDED: Record<string, { shadow?: number; glue?: number }> = {
  'react/src/AccentPicker.stories.tsx': { shadow: 3 },
  'react/src/BadgeStatus.stories.tsx': { shadow: 2, glue: 27 },
  'react/src/Button.stories.tsx': { shadow: 1 },
  'react/src/CommandPalette.stories.tsx': { shadow: 2 },
  'react/src/DatePicker.stories.tsx': { shadow: 2 },
  'react/src/DocumentReview.css': { shadow: 1 },
  'react/src/DocumentReview.stories.tsx': { shadow: 12, glue: 31 },
  'react/src/FeedbackShowcase.css': { shadow: 12 },
  'react/src/FeedbackShowcase.stories.tsx': { shadow: 1 },
  'react/src/SidebarNav.stories.tsx': { shadow: 2 },
  'react/src/Success.stories.tsx': { shadow: 1, glue: 31 },
};

const against = { allowed: ALLOWED, recorded: RECORDED, ceiling: GLUE_CEILING, where: 'this gate' };
const measured = subjects.map((file) => measureStory(file, read(file), tokens));

/** Measure one subject again with its source edited, and ask what went wrong. */
const withEdit = (file: string, edit: (src: string) => string): string[] => problemsIn(
  measured.map((s) => (s.file === file ? measureStory(file, edit(read(file)), tokens) : s)),
  against,
);

describe('story CSS', () => {
  it('finds every story and every story-only stylesheet', () => {
    expect(subjects.length).toBeGreaterThanOrEqual(FOUND.subjects);
    expect(subjects.filter((f) => f.endsWith('.css'))).toEqual([
      'react/src/DocumentReview.css', 'react/src/FeedbackShowcase.css',
    ]);
    expect(subjects.filter((f) => f.endsWith('.css')).length).toBe(FOUND.sheets);
    // A component's own sheet is not a subject: it is this workspace's kit source.
    expect(subjects).not.toContain('react/src/DataTable.css');
    expect(tokens.size).toBeGreaterThan(100);
  });

  it('reads CSS out of them', () => {
    const total = measured.reduce((sum, s) => sum + s.total, 0);
    expect(total).toBeGreaterThanOrEqual(FOUND.declarations);
    expect(measured.filter((s) => s.total > 0).length).toBeGreaterThanOrEqual(FOUND.carriers);
    // Each of the three answers has to be reachable, or a rule below is inert.
    expect(measured.reduce((n, s) => n + s.glue, 0)).toBeGreaterThan(0);
    expect(measured.reduce((n, s) => n + s.placements.length, 0)).toBeGreaterThan(0);
    expect(measured.reduce((n, s) => n + s.shadows.length, 0)).toBeGreaterThan(0);
  });

  it('no story builds a shadow kit', () => {
    expect(problemsIn(measured, against)).toEqual([]);
  });

  it('holds layout glue in the allow-list and nothing else', () => {
    for (const [key, reason] of Object.entries(ALLOWED)) {
      expect(reason.trim().length, `${key} has no reason`).toBeGreaterThanOrEqual(12);
      expect(subjects, `${key} names a file that is not a subject`).toContain(key.split('|')[0]);
    }
    const placed = measured.flatMap((s) => s.placements);
    const painted = placed.filter((d: { property: string }) => !/^(?:--|[a-z-]*(?:width|height|top|right|bottom|left|inset|margin|padding|gap|display|position|order|flex|grid|align|justify|place|overflow|z-index|white-space|text-align|pointer-events|box-sizing|aspect-ratio|columns?)[\w-]*$)/.test(d.property));
    expect(painted.map(show)).toEqual([]);
  });

  /* ---- anti-vacuity: the gate rejects what #601 was opened about -------- */

  // Modal.stories.tsx writes one glue declaration and no shadow CSS, so nothing a
  // mutation adds to it can hide behind what is already recorded.
  const clean = 'react/src/Modal.stories.tsx';

  it('reports a story that paints something of its own', () => {
    expect(measured.find((s) => s.file === clean)!.shadows.length).toBe(0);
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={{ color: '#f00' }} />;\n`);
    expect(problems.join('\n')).toContain('color');
  });

  it('reports a story that restyles a kit class', () => {
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div className="ui-card" style={{ background: '#f00' }} />;\n`);
    expect(problems.join('\n')).toContain('background');
  });

  it('reports a placement onto a kit class with no reason on record', () => {
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div className="ui-tabs" style={{ maxWidth: 10 }} />;\n`);
    expect(problems.join('\n')).toContain(`${clean}|.ui-tabs`);
  });

  it('reports a story that re-declares a kit token', () => {
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={{ '--space-4': '3px' }} />;\n`);
    expect(problems.join('\n')).toContain('--space-4');
  });

  it('reports a story whose layout glue goes over the ceiling', () => {
    const glue = Array.from({ length: GLUE_CEILING + 1 }, (_, i) => `marginTop: ${i}`).join(', ');
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={{ ${glue} }} />;\n`);
    expect(problems.join('\n')).toContain(`ceiling of ${GLUE_CEILING}`);
  });

  it('reports a recorded story that grows, shrinks, or comes clean', () => {
    const file = 'react/src/AccentPicker.stories.tsx';
    expect(measured.find((s) => s.file === file)!.shadows.length).toBe(3);

    const grown = withEdit(file, (src) => `${src}\nconst MUTANT = <div style={{ color: '#f00' }} />;\n`);
    expect(grown.join('\n')).toContain('more than the 3 recorded');

    const shrunk = withEdit(file, (src) => src.replace("background: 'var(--surface)'", 'marginTop: 0'));
    expect(shrunk.join('\n')).toContain('down from the 3 recorded');

    const cleared = withEdit(file, (src) => src.replaceAll("background: 'var(--surface)'", 'marginTop: 0'));
    expect(cleared.join('\n')).toContain('writes no paint');
  });

  it('reports a property it cannot sort', () => {
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={{ scrollbarGutter: 'stable' }} />;\n`);
    expect(problems.join('\n')).toContain('does not sort');
  });

  it('reports a dead allow-list entry', () => {
    const problems = problemsIn(measured, {
      ...against,
      allowed: { ...ALLOWED, 'react/src/Modal.stories.tsx|.ui-nowhere': 'nothing matches this' },
    });
    expect(problems.join('\n')).toContain('nothing matches it');
  });
});
