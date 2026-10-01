// Discover painted surfaces and ring consumers in both workspaces.
// Local inherit annotations explain controls, transparent washes and noninteractive paint.
// Discover subjects from source and check the coverage count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { customPropertiesIn } from '../scripts/lib/box-shadow.js';

const files = ['src', 'react/src'].flatMap((base) => readdirSync(base, { recursive: true })
  .filter((file) => String(file).endsWith('.css')).map((file) => `${base}/${file}`));
const sheets = files.map((file) => {
  const raw = readFileSync(file, 'utf8');
  return { file, raw, css: raw.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' ')) };
});
const declarations = sheets.flatMap(({ file, css }) => customPropertiesIn(css).map((d) => ({ file, ...d })));
const references = (value) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
const surface = (value, seen = new Set()) => references(value).some((name) => {
  if (/^--(?:bg(?:-elevated)?|surface(?:-[23])?|glow-[\w-]+|signal-solid-[\w-]+)$/.test(name)) return true;
  if (seen.has(name)) return false;
  return declarations.filter((d) => d.name === name).some((d) => surface(d.value, new Set([...seen, name])));
});
const rules = sheets.flatMap(({ file, css, raw }) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map((m) => ({ file, selector: m[1].trim(), body: m[2], raw: raw.slice(m.index, m.index + m[0].length) })));
const surfaces = rules.filter(({ body }) => {
  const background = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(body)?.[1].trim();
  return background && (surface(background) || background.startsWith('color-mix('));
});
const own = (rule) => new Map(customPropertiesIn(`${rule.selector}{${rule.body}}`).map((d) => [d.name, d.value]));
const compositions = rules.filter((r) => own(r).has('--ring'));
const consumers = rules.filter(({ body }) => /(?:^|;)\s*box-shadow\s*:[^;]*var\(--ring\)/.test(body));

test('every painted surface sets a matching gap or explains why the containing gap is correct', () => {
  assert.equal(surfaces.length, 142, 'surface discovery changed; the folded rail\'s current-row plate adds three, the disabled checkbox box and its radio mark add two, the file drop\'s progress track and drop target add two, and the picker\'s hovered and in-range cells add two');
  // Any composition rule, not only the shared recipe: #537 gives .ui-code its own, because a
  // chip's gap has to be the surface it paints and the shared recipe is also what hands a
  // chip the OTHER surface. The guarantee is unchanged — the rule recomposes --ring — and a
  // painted surface that composes nothing still fails below.
  const composed = new Set(compositions.filter((r) => !r.selector.includes(':root'))
    .flatMap((r) => r.selector.split(',').map((s) => s.trim())));
  const covered = (rule) => rule.selector.split(',').every((selector) => composed.has(selector.trim()));
  for (const rule of surfaces) {
    const gap = own(rule).get('--ring-gap');
    const background = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(rule.body)[1].trim();
    if (/\/\* ring-gap: inherit — .+\. \*\//.test(rule.raw)) {
      assert.ok(gap === undefined || gap === 'inherit', `${rule.selector} must inherit the containing gap`);
      continue;
    }
    assert.equal(gap, background, `${rule.file}: ${rule.selector} gap differs from its background`);
    assert.ok(covered(rule), `${rule.selector} does not compose the ring`);
  }
  // Alias-setting variants can paint through a background declared on their base.
  // They still need their own composition (for example an opaque footer variant).
  for (const rule of rules.filter((r) => !r.selector.includes(':root') && own(r).has('--ring-gap') && own(r).get('--ring-gap') !== 'inherit')) {
    assert.ok(covered(rule), `${rule.selector} changes the gap without composing the ring`);
  }
  assert.doesNotMatch(rules.find((r) => r.selector === '.ui-app').body, /--ring(?:-gap)?\s*:/, 'the page shell must preserve root overrides');
});

// ---- the same contract, for surfaces declared in a story ---------------------
//
// Discovery above reads src/**.css and react/src/**.css. A story paints its own
// stages in a <style> block inside a JS module, which that walk cannot see — and
// #453 found the hole the hard way: the Accessibility minimums page drew a focus
// ring inside a stage painted --surface while the gap fell back to the :root --bg,
// landing at 1.20:1 in dark and 1.11:1 in light under a caption that said the gap
// was surface-coloured. Every gate on the page was green, because none of them
// looked here.
//
// The contract is the src one minus `covered()`: a story surface does not compose
// the shared ring (that list is the kit's), but a ring drawn inside one still reads
// its gap from it, so the gap must follow the background.
const storyFiles = readdirSync('stories', { recursive: true })
  .map(String)
  .filter((file) => file.endsWith('.js') || file.endsWith('.css'))
  .map((file) => `stories/${file}`)
  .sort();

const storySheets = storyFiles.flatMap((file) => {
  const raw = readFileSync(file, 'utf8');
  const blocks = file.endsWith('.css')
    ? [raw]
    : [...raw.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  return blocks.map((block) => ({
    file,
    raw: block,
    css: block.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' ')),
  }));
});

const storyRules = storySheets.flatMap(({ file, css, raw }) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map((m) => ({ file, selector: m[1].trim(), body: m[2], raw: raw.slice(m.index, m.index + m[0].length) })));

const backgroundOf = (body) => /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(body)?.[1].trim();
const paints = (rule) => {
  const background = backgroundOf(rule.body);
  return Boolean(background) && (surface(background) || background.startsWith('color-mix('));
};
const storySurfaces = storyRules.filter(paints);

/** The problem lines a set of story surfaces produces. Exported shape so the
 *  mutation below runs the gate itself rather than a paraphrase of it. */
const gapProblems = (subjects) => subjects.flatMap((rule) => {
  const background = backgroundOf(rule.body);
  const gap = own(rule).get('--ring-gap');
  if (/\/\* ring-gap: inherit — .+\. \*\//.test(rule.raw)) {
    return gap === undefined || gap === 'inherit'
      ? [] : [`${rule.file}: ${rule.selector} claims to inherit but sets a gap`];
  }
  return gap === background
    ? [] : [`${rule.file}: ${rule.selector} paints ${background} and its gap is ${gap}`];
});

test('a surface a story paints sets a matching gap, so a ring drawn inside it is measurable', () => {
  assert.ok(storySheets.length >= 50,
    `only ${storySheets.length} story style blocks found — the walk stopped reading <style> blocks`);
  // 32 -> 34: #488's two inert tap-zone Don't cells on the Accessibility
  // minimums page, which paint the surface and now declare its gap. 34 -> 38:
  // #507's File drop stages — the window, the panel, the progress card a Don't
  // draws, and the tall box's glyph tile, which inherits.
  assert.equal(storySurfaces.length, 38,
    'story surface discovery changed; update the count with the stages that moved');
  assert.deepEqual(gapProblems(storySurfaces), [],
    'a story paints a surface whose focus ring would draw its gap in the page colour');
});

test('the story-surface gate rejects a stage that paints without a gap', () => {
  const missing = { file: 'fixture', selector: '.fx-stage', body: 'background: var(--surface);', raw: '' };
  assert.deepEqual(gapProblems([missing]),
    ['fixture: .fx-stage paints var(--surface) and its gap is undefined']);
  const wrong = { file: 'fixture', selector: '.fx-stage', body: 'background: var(--surface); --ring-gap: var(--bg);', raw: '' };
  assert.equal(gapProblems([wrong]).length, 1, 'a gap that disagrees with the background must fail');
  const right = { file: 'fixture', selector: '.fx-stage', body: 'background: var(--surface); --ring-gap: var(--surface);', raw: '' };
  assert.deepEqual(gapProblems([right]), []);
});

// ---- the scroll ring is one indicator, drawn where --ring's band is -----------
//
// A scroll region inside a surface answers focus with --ring-scroll rather than
// --ring (docs/specification.md#the-focus-ring): the same 1px gap and 2px band, drawn
// inward, no halo. It is an OUTLINE, because an inset box-shadow is painted under the
// box's own children and a table scrolled sideways under one erases the band.
//
// Two things make that outline the same picture as --ring's band, and neither is
// visible in the rule that uses it:
//
//  - the offset. `outline-offset` is what puts the band 1px inside the border box; a
//    rule that takes the outline and leaves the offset draws it OUTSIDE instead, which
//    is the bug the whole round was about and is invisible in JSDOM.
//  - the arithmetic. The offset has to be the gap width plus the ring width, negated,
//    or the band lands somewhere --ring's never does.
//
// A third thing holds the token itself: --ring-scroll must read no token that a
// surface re-points, because it is declared once at :root and a var() inside a custom
// property is substituted where that property is DECLARED. --ring is recomposed on
// twenty-odd surfaces for exactly that reason; --ring-scroll needs no such list only
// while it stays clear of --ring-gap and the surface tokens behind it.

/** Rules that take the scroll ring, and whether each one also takes its offset. */
const scrollRules = rules.filter(({ body }) => /(?:^|;)\s*outline\s*:[^;]*var\(--ring-scroll\)/.test(body));
const offsetProblems = (subjects) => subjects
  .filter(({ body }) => !/(?:^|;)\s*outline-offset\s*:[^;]*var\(--ring-scroll-offset\)/.test(body))
  .map((rule) => `${rule.file}: ${rule.selector} takes --ring-scroll without --ring-scroll-offset, so its band draws outside the box`);

test('every scroll region that takes the scroll ring takes its offset too', () => {
  // Seven: the table card and the table wrapper inside it, the dropdown's search list,
  // the drawer's body, the confirm's consequence, the palette's list, and React's modal
  // body. Artur chose the picture on #531 round r30; the list is the surfaces it is on.
  assert.equal(scrollRules.length, 7,
    'scroll-ring consumer discovery changed; name the scroll region that was added or removed');
  assert.equal(scrollRules.filter((r) => r.file.startsWith('react/')).length, 1,
    'React\'s modal body is not among them, so the walk stopped reading react/src');
  assert.deepEqual(offsetProblems(scrollRules), []);
});

test('the offset gate rejects a scroll region that takes the band and leaves the offset', () => {
  const right = { file: 'fixture', selector: '.fx:focus-visible', body: 'outline: var(--ring-scroll); outline-offset: var(--ring-scroll-offset);' };
  assert.deepEqual(offsetProblems([right]), []);
  const wrong = { file: 'fixture', selector: '.fx:focus-visible', body: 'outline: var(--ring-scroll);' };
  assert.deepEqual(offsetProblems([wrong]),
    ['fixture: .fx:focus-visible takes --ring-scroll without --ring-scroll-offset, so its band draws outside the box']);
  // And on the tree rather than a fixture: drop the offset from the drawer's rule and
  // the gate has to name that rule.
  const real = scrollRules.find((r) => r.file === 'src/styles/drawer.css');
  assert.ok(real, 'the drawer body no longer takes the scroll ring; move this check');
  assert.deepEqual(offsetProblems([{ ...real, body: real.body.replace(/outline-offset\s*:[^;]*;/, '') }]),
    ['src/styles/drawer.css: .ui-drawer__body:focus-visible takes --ring-scroll without --ring-scroll-offset, so its band draws outside the box']);
});

test('the scroll ring is declared once, from the same widths --ring draws its band from', () => {
  const declaredAt = declarations.filter((d) => d.name === '--ring-scroll' || d.name === '--ring-scroll-offset');
  assert.equal(declaredAt.length, 2,
    'the scroll ring is declared more than once; it reads no surface token, so it needs no second declaration');
  const band = declaredAt.find((d) => d.name === '--ring-scroll').value.trim();
  const offset = declaredAt.find((d) => d.name === '--ring-scroll-offset').value.trim();
  assert.equal(band, 'var(--ring-width) solid var(--ring-color)',
    'the band is no longer --ring\'s own width and ink');
  assert.equal(offset, 'calc(-1 * (var(--ring-gap-width) + var(--ring-width)))',
    'the band no longer lands where --ring\'s band lands: 1px of gap, then the band');
  // The reason the pair needs no per-surface recomposition, held as a check rather
  // than as a sentence: neither half reads a token a surface re-points.
  for (const { name, value } of declaredAt) {
    for (const ref of references(value)) {
      assert.ok(!surface(`var(${ref})`),
        `${name} reads ${ref}, which resolves to a surface colour — recompose it per surface or stop reading it`);
      assert.notEqual(ref, '--ring-gap',
        `${name} reads --ring-gap, which is re-pointed by every painted surface and frozen here at :root`);
    }
  }
});

test('every ring consumer keeps a real outline for forced colors', () => {
  // 27 -> 28: a link inside a table takes the ring on focus instead of the browser's
  // own outline (#510), and like every other consumer keeps a transparent outline
  // under forced colors. 28 -> 47 is #482, which gave the ring to the nineteen
  // controls that had no focus rule at all: the two brand lockups, the deck/text
  // and version switchers, the theme toggle, the account avatar and its menu rows,
  // snippet copy, three footer link kinds, the interactive card, both toast
  // controls, the feedback composer's two, React's row-selection checkbox, the
  // dropdown panel — a scroll container Chrome makes a keyboard stop, found by
  // #487's review — and `.vopt`, the version switcher's rows, which the arrow keys
  // focus and #487's re-review found still taking the browser's outline. 47 -> 48:
  // a Snippet's card, which now draws the ring for its focused code region because
  // the `<pre>` has no radius of its own.
  // 48 -> 47: #531 moved the scrolling table wrapper off --ring and onto --ring-scroll
  // with the six scroll regions beside it. A --ring-scroll consumer is not counted here
  // and owes no transparent outline: its band IS an outline, which is the one forced
  // colors repaints. The gate above holds those seven.
  assert.equal(consumers.length, 47, 'ring consumer discovery changed');
  for (const { file, selector, body } of consumers) {
    assert.match(body, /(?:^|;)\s*outline:\s*2px solid transparent\s*;/, `${file}: ${selector} loses focus when forced colors removes box-shadow`);
  }
});

test('form focus rules use focus-visible and invalid fields cannot replace the band with a wash', () => {
  const form = sheets.find((s) => s.file === 'src/styles/input.css').css;
  assert.doesNotMatch(form, /:focus(?!-visible)/);
  assert.doesNotMatch(form, /\.is-invalid[^{}]*\{[^}]*box-shadow/);
});
