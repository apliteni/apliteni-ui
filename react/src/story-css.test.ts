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
// rather than sent to the allow-list. A `style={name}` and a `...spread` of one are read
// the way React reads them; anything this file cannot settle reports as unreadable.
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

/** Every file under a directory, repo-relative, however deep it sits. */
function filesUnder(rel: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const next = `${rel}/${entry.name}`;
    if (entry.isDirectory()) filesUnder(next, acc);
    else acc.push(next);
  }
  return acc;
}

// What react/.storybook/main.ts serves: `../src/**/*.stories.@(tsx|ts)`. Recursive, and
// two extensions — so this sweep is too. A sweep narrower than the glob gates less than
// Storybook ships, and the gap is silent: the aggregate counts below stay green while a
// story in a new folder paints whatever it likes.
const SERVED = /\.stories\.tsx?$/;

const files = filesUnder('react/src');

/** A module that could own a stylesheet: not a story, not a test. */
const isModule = (file: string) => /\.tsx?$/.test(file)
  && !SERVED.test(file) && !/\.test\.tsx?$/.test(file);

/** Does `file` import `sheet`? Resolved, so an import from a subfolder counts. */
const importsSheet = (file: string, sheet: string) => {
  const from = path.dirname(path.join(root, file));
  for (const m of read(file).matchAll(/['"]([^'"]+\.css)['"]/g)) {
    if (path.resolve(from, m[1]) === path.join(root, sheet)) return true;
  }
  return false;
};

/** A sheet nothing but a story (or a test) imports is story CSS. */
const storyOnlySheet = (sheet: string) => !files.filter(isModule).some((f) => importsSheet(f, sheet));

/** The subjects among a list of paths, so a mutation can hand this one it invented. */
export const subjectsAmong = (paths: string[]) => paths.filter((p) => SERVED.test(p)).sort();

const subjects: string[] = [
  ...subjectsAmong(files),
  ...files.filter((f) => f.endsWith('.css')).filter(storyOnlySheet),
].sort();

// Measured, not guessed: 36 stories and the two showcase sheets, as this gate last
// audited them. Every figure is a lower bound, so the gate fails when the reading stops
// reaching something rather than when the workspace grows.
const FOUND = { subjects: 38, declarations: 321, carriers: 29, sheets: 2 };

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
// wrote no shadow CSS at all: the median needs 1 glue declaration, 40 of the 47 need 11 or
// fewer, and 22 is the second-widest. The widest is this workspace's SwitchCheckbox at 26,
// which is recorded at its figure below rather than moving the line up to it. One ceiling,
// because it is one rule about one kind of story.
const GLUE_CEILING = 22;

/* ---- what this workspace carries today ---------------------------------- */

// The shadow CSS already written, at the size it was when this gate was added, and the
// glue of the stories over the ceiling. One cause covers every line: the story was
// written before anything measured it. A recorded story may stay as it is indefinitely;
// what it may not do is grow, and when it comes under its figure the smaller one gets
// recorded, until the line goes. Maintained by hand, never regenerated.
//
// Three figures rose without their story changing, each because the reader stopped
// dropping source: BadgeStatus's glue, 27 to 39, for three `style={row}` rows;
// FeedbackShowcase's shadow, 1 to 2, for a `transition` inherited through a spread; and
// SwitchCheckbox's glue, newly 26, for the three properties each of two rows inherits
// from the object it spreads. The follow-ups and the reasons are on #601.
const RECORDED: Record<string, { shadow?: number; glue?: number }> = {
  'react/src/AccentPicker.stories.tsx': { shadow: 3 },
  'react/src/BadgeStatus.stories.tsx': { shadow: 2, glue: 39 },
  'react/src/Button.stories.tsx': { shadow: 1 },
  'react/src/CommandPalette.stories.tsx': { shadow: 2 },
  'react/src/DatePicker.stories.tsx': { shadow: 2 },
  'react/src/DocumentReview.css': { shadow: 1 },
  'react/src/DocumentReview.stories.tsx': { shadow: 12, glue: 31 },
  'react/src/FeedbackShowcase.css': { shadow: 12 },
  'react/src/FeedbackShowcase.stories.tsx': { shadow: 2 },
  'react/src/SidebarNav.stories.tsx': { shadow: 2 },
  'react/src/SwitchCheckbox.stories.tsx': { glue: 26 },
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

  it('sweeps every folder under src, so a nested story cannot hide', () => {
    expect(files.some((f) => f.startsWith('react/src/primitives/'))).toBe(true);
    // Everything Storybook serves is read; nothing here is excluded on purpose.
    expect(files.filter((f) => SERVED.test(f)).filter((f) => !subjects.includes(f))).toEqual([]);
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
    // Distinct properties, because a style object is read the way React reads it: one
    // key, one declaration, however many times the source writes it.
    const PLACES = ['display', 'position', 'top', 'right', 'bottom', 'left', 'zIndex',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'marginTop',
      'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight',
      'paddingBottom', 'paddingLeft', 'gap', 'order', 'boxSizing'];
    expect(new Set(PLACES).size, 'the ceiling mutation needs distinct glue properties')
      .toBeGreaterThan(GLUE_CEILING);
    const glue = PLACES.slice(0, GLUE_CEILING + 1).map((property) => `${property}: 0`).join(', ');
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

  it('reports a property it cannot sort even on a kit class', () => {
    // The vocabularies are consulted before the selector. A kit class used to buy a
    // declaration the word "placement", whatever the property did.
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div className="ui-card" style={{ scrollbarColor: '#f00 #0f0' }} />;\n`);
    expect(problems.join('\n')).toContain('scrollbar-color');
    expect(problems.join('\n')).toContain('does not sort');
  });

  it('reports a column rule as paint and smooth scrolling as motion', () => {
    // Both used to read as placement: a `column-[\w-]+` pattern answered for
    // `column-rule-color`, and a `scroll-[\w-]+` one for `scroll-behavior`.
    for (const [property, declaration] of [
      ['column-rule', "columnRule: '8px solid #f00'"],
      ['column-rule-color', "columnRuleColor: '#f00'"],
      ['scroll-behavior', "scrollBehavior: 'smooth'"],
    ]) {
      const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={{ ${declaration} }} />;\n`);
      expect(problems.join('\n'), `${declaration} was not reported as paint`).toContain(property);
    }
  });

  /* ---- anti-vacuity: the reader does not drop ordinary source ----------- */

  it('reads a style object that carries a comment', () => {
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={{ /* the brand red */ color: '#f00' }} />;\n`);
    expect(problems.join('\n')).toContain('color');
  });

  it('reads a style object whose value has brackets of its own', () => {
    // The old reader stopped at the first `}`, so a nested object threw the whole style
    // away and the story measured zero declarations.
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={{ color: ({ light: '#f00', dark: '#0f0' })[theme] }} />;\n`);
    expect(problems.join('\n')).toContain('color');
  });

  it('reads the kit class whether it is written before or after the style', () => {
    for (const tag of [
      '<div className="ui-tabs" style={{ maxWidth: 10 }} />',
      '<div style={{ maxWidth: 10 }} className="ui-tabs" />',
    ]) {
      const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = ${tag};\n`);
      expect(problems.join('\n'), `the kit class in ${tag} was not read`).toContain(`${clean}|.ui-tabs`);
    }
  });

  it('reads a style object the story binds by name', () => {
    // `style={row}` is an ordinary declaration list written a few lines up. Three of
    // this workspace's stories write their layout that way.
    const mutant = "\nconst MUTANT_PAINT = { color: '#f00' };\nconst MUTANT = <div style={MUTANT_PAINT} />;\n";
    expect(withEdit(clean, (src) => src + mutant).join('\n')).toContain('color');

    const member = "\nconst MUTANT_SHEET = { head: { color: '#f00' } };\nconst MUTANT = <div style={MUTANT_SHEET.head} />;\n";
    expect(withEdit(clean, (src) => src + member).join('\n')).toContain('color');
  });

  it('reports a style object it cannot read', () => {
    // The dodge the reader used to pass in silence: hand `style` an expression it could
    // not follow and it measured zero declarations, which reads like a story with no CSS.
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={props.style} />;\n`);
    expect(problems.join('\n')).toContain('cannot read');
  });

  it('follows a spread into the object it names', () => {
    // A `...spread` used to be skipped, and an object nothing else references is never
    // measured on its own, so `style={{ ...PAINT }}` measured the paint as zero.
    const mutant = "\nconst MUTANT_PAINT = { color: '#f00' };\nconst MUTANT = <div style={{ ...MUTANT_PAINT }} />;\n";
    expect(withEdit(clean, (src) => src + mutant).join('\n')).toContain('color');

    // Through a member, through a spread of a spread, and into an object written there.
    const member = "\nconst MUTANT_SHEET = { head: { color: '#f00' } };\nconst MUTANT = <div style={{ ...MUTANT_SHEET.head }} />;\n";
    expect(withEdit(clean, (src) => src + member).join('\n')).toContain('color');
    const chained = "\nconst MUTANT_A = { color: '#f00' };\nconst MUTANT_B = { ...MUTANT_A };\nconst MUTANT = <div style={{ ...MUTANT_B }} />;\n";
    expect(withEdit(clean, (src) => src + chained).join('\n')).toContain('color');
    const inline = "\nconst MUTANT = <div style={{ ...{ color: '#f00' } }} />;\n";
    expect(withEdit(clean, (src) => src + inline).join('\n')).toContain('color');
  });

  it('reads a spread object the way React reads it: a later key answers an earlier one', () => {
    // `{ ...stack, gap: 14 }` is every property `stack` holds with one of them answered.
    // Both halves matter: the geometry it inherits is measured, and the paint it inherits
    // is not measured twice because the tag writes the same property again.
    const mutant = "\nconst MUTANT_BASE = { color: '#f00', marginTop: 1 };"
      + "\nconst MUTANT = <div style={{ ...MUTANT_BASE, marginTop: 2 }} />;\n";
    const before = measured.find((s) => s.file === clean)!;
    const after = measureStory(clean, read(clean) + mutant, tokens);
    expect(after.total - before.total).toBe(2);
    expect(withEdit(clean, (src) => src + mutant).join('\n')).toContain('color');

    // A spread after an explicit key is the one that wins, which is how React reads it.
    const reversed = "\nconst MUTANT_BASE = { color: '#f00' };"
      + "\nconst MUTANT = <div style={{ color: 'red', ...MUTANT_BASE }} />;\n";
    const painted = measureStory(clean, read(clean) + reversed, tokens);
    expect(painted.shadows.map((d: { value: string }) => d.value)).toEqual(["'#f00'"]);
  });

  it('reports a spread it cannot settle rather than skipping it', () => {
    for (const expression of ['...props.style', '...paintFor(theme)', '...(open ? a : b)']) {
      const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={{ ${expression} }} />;\n`);
      expect(problems.join('\n'), `${expression} was skipped`).toContain('cannot read');
    }
    // A name that spreads itself has no declarations to find and must not loop.
    const cyclic = '\nconst MUTANT_LOOP = { ...MUTANT_LOOP, color: 1 };\nconst MUTANT = <div style={MUTANT_LOOP} />;\n';
    expect(withEdit(clean, (src) => src + cyclic).join('\n')).toContain('cannot read');
  });

  it('reports a name this file binds twice instead of reading the first of the two', () => {
    // Which of the two paints is a question about scope. The reader used to answer it with
    // the first binding in the file, so a scoped object that paints measured as the
    // module-level one that does not.
    const mutant = "\nconst MUTANT_ROW = { marginTop: 0 };"
      + "\nfunction MutantDemo() { const MUTANT_ROW = { color: '#f00' }; return <div style={MUTANT_ROW} />; }\n";
    expect(withEdit(clean, (src) => src + mutant).join('\n')).toContain('cannot read');
  });

  it('reads a style object past a comment that holds a brace', () => {
    // `braced()` used to balance the source's braces without skipping comments, so the
    // `}` in `/* } */` closed the object and the paint after it measured as zero.
    const problems = withEdit(clean, (src) => `${src}\nconst MUTANT = <div style={{ /* } */ color: '#f00' }} />;\n`);
    expect(problems.join('\n')).toContain('color');
  });

  it('reads a stylesheet the story names, in any of the three quotes', () => {
    // `<style>{CSS}</style>` used to resolve only a backtick, so changing one quote took
    // the whole sheet out of coverage.
    for (const quote of ['`', "'", '"']) {
      const mutant = `\nconst MUTANT_CSS = ${quote}.mutant { color: #f00 }${quote};`
        + '\nconst MUTANT = <style>{MUTANT_CSS}</style>;\n';
      const problems = withEdit(clean, (src) => src + mutant);
      expect(problems.join('\n'), `a ${quote}-quoted stylesheet was dropped`).toContain('color');
    }
    // And written at the tag, which is how the two showcase stories would write one.
    const inline = '\nconst MUTANT = <style>{`.mutant { color: #f00 }`}</style>;\n';
    expect(withEdit(clean, (src) => src + inline).join('\n')).toContain('color');
  });

  it('reports a stylesheet it cannot settle rather than measuring it as empty', () => {
    // Each of these used to measure zero declarations, which reads exactly like a story
    // that writes no CSS at all.
    const cases: Array<[string, string]> = [
      ['an unresolved name', '\nconst MUTANT = <style>{externalCSS}</style>;\n'],
      ['a concatenation', "\nconst MUTANT_CSS = '.a {' + paint + '}';\nconst MUTANT = <style>{MUTANT_CSS}</style>;\n"],
      ['an interpolated template', '\nconst MUTANT = <style>{`.mutant { color: ${red} }`}</style>;\n'],
      ['a call', '\nconst MUTANT = <style>{sheetFor(theme)}</style>;\n'],
      ['a name bound twice', "\nconst MUTANT_CSS = '.a { color: #f00 }';\nconst MUTANT_CSS = '.b { margin: 0 }';\nconst MUTANT = <style>{MUTANT_CSS}</style>;\n"],
    ];
    for (const [what, mutant] of cases) {
      const problems = withEdit(clean, (src) => src + mutant);
      expect(problems.join('\n'), `${what} was measured as an empty sheet`).toContain('cannot read');
    }
  });

  it('reads the outer rule of a nested one, not only the inner', () => {
    // The reading this replaced matched the innermost `{…}`, so nesting one rule inside
    // another took the outer rule's own declarations out of coverage. Chromium paints
    // both: the run's evidence holds the measurement.
    const nested = '\nconst MUTANT = <style>{`.mutant { color: #f00; & > span { margin: 0 } }`}</style>;\n';
    expect(withEdit(clean, (src) => src + nested).join('\n')).toContain('color');

    // And a nested rule is written out against its parent, so it reaches the allow-list.
    const placed = '\nconst MUTANT = <style>{`.ui-tabs { & > span { max-width: 10px } }`}</style>;\n';
    expect(withEdit(clean, (src) => src + placed).join('\n')).toContain(`${clean}|.ui-tabs > span`);
  });

  it('reports a dead allow-list entry', () => {
    const problems = problemsIn(measured, {
      ...against,
      allowed: { ...ALLOWED, 'react/src/Modal.stories.tsx|.ui-nowhere': 'nothing matches this' },
    });
    expect(problems.join('\n')).toContain('nothing matches it');
  });

  /* ---- anti-vacuity: discovery ----------------------------------------- */

  it('makes a story served from a new folder or a new extension a subject, paint and all', () => {
    for (const file of [
      'react/src/New.stories.ts',
      'react/src/nested/New.stories.tsx',
      'react/src/primitives/deeper/New.stories.ts',
    ]) {
      expect(subjectsAmong([...files, file]), `Storybook would serve ${file} and this gate would not read it`).toContain(file);
      const planted = measureStory(file, "const M = <div style={{ color: '#f00' }} />;", tokens);
      const problems = problemsIn([...measured, planted], against);
      expect(problems.join('\n'), `paint in a newly served ${file} was not reported`).toContain(file);
    }

    // A test and a stylesheet are not stories.
    for (const file of ['react/src/New.test.tsx', 'react/src/New.css']) {
      expect(subjectsAmong([...files, file])).not.toContain(file);
    }
  });

  it('owns a stylesheet by who imports it, from any folder', () => {
    // A component's sheet stays the component's however deep the import sits, and a
    // showcase's sheet stays story CSS because only its story imports it.
    expect(importsSheet('react/src/DataTable.tsx', 'react/src/DataTable.css')).toBe(true);
    expect(storyOnlySheet('react/src/DataTable.css')).toBe(false);
    expect(storyOnlySheet('react/src/FeedbackShowcase.css')).toBe(true);
    expect(files.filter(isModule).some((f) => f.startsWith('react/src/primitives/'))).toBe(true);
  });
});
