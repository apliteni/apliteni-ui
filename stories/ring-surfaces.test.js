// Discover painted surfaces and ring consumers in both workspaces.
// Local inherit annotations explain controls, transparent washes and noninteractive paint.
// Discover subjects from source and check the coverage count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { customPropertiesIn, layersOf } from '../scripts/lib/box-shadow.js';

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
// --ring-inset is the shared ring drawn inward (#531); a consumer of either owes the
// same transparent outline for forced colors.
const consumers = rules.filter(({ body }) => /(?:^|;)\s*box-shadow\s*:[^;]*var\(--ring(?:-inset)?\)/.test(body));

test('every painted surface sets a matching gap or explains why the containing gap is correct', () => {
  assert.equal(surfaces.length, 138, 'surface discovery changed; the folded rail\'s current-row plate adds three and the disabled checkbox box and its radio mark add two');
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
  // minimums page, which paint the surface and now declare its gap.
  assert.equal(storySurfaces.length, 34,
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

// ---- --ring and --ring-inset are composed as a pair --------------------------
//
// The spec publishes both and promises that tuning one tunes both
// (docs/specification.md#the-focus-ring). That holds only while every rule that
// recomposes one recomposes the other, because a var() inside a custom property is
// substituted on the element that DECLARES it: a rule re-pointing --ring-gap and
// composing only --ring leaves --ring-inset carrying the gap of the surface above it.
// The visible cost is small and wrong — the drawer body's 1px gap would paint the page
// ground inside the drawer surface, 1.32:1 against it in dark — and it is the class of
// slip the surface gate above exists to catch, which until #531's review it did not.

/** The inset twin of an outset composition: the same layers, each drawn inward. */
const insetOf = (outset) => layersOf(outset).map((layer) => `inset ${layer}`).join(', ');

/** The problem lines a set of rules produces. Exported shape so the mutation below
 *  runs the gate itself rather than a paraphrase of it. */
const pairProblems = (subjects) => subjects.flatMap((rule) => {
  const declared = own(rule);
  const outset = declared.get('--ring');
  const inset = declared.get('--ring-inset');
  if (outset === undefined) return [`${rule.file}: ${rule.selector} composes --ring-inset without --ring`];
  if (inset === undefined) return [`${rule.file}: ${rule.selector} composes --ring without --ring-inset`];
  return insetOf(outset) === inset
    ? [] : [`${rule.file}: ${rule.selector} draws its inset ring from different layers`];
});

test('a rule that recomposes the ring recomposes its inset twin, from the same layers', () => {
  const recomposers = rules.filter((r) => own(r).has('--ring') || own(r).has('--ring-inset'));
  // Three: :root, the grouped painted-container rule, and .ui-code, which composes its
  // own because #537 gives a chip the surface its container is not on.
  assert.equal(recomposers.length, 3,
    'ring composition discovery changed; name the rule that was added or removed');
  assert.equal(recomposers.filter((r) => r.selector.includes(':root')).length, 1,
    'the root composition is not among the subjects, so the walk stopped reading tokens.css');
  assert.deepEqual(pairProblems(recomposers), []);
});

test('the pairing gate rejects a composition that drops or alters one half', () => {
  const both = { file: 'fixture', selector: '.fx', body: '--ring: 0 0 0 1px red, 0 0 2px blue; --ring-inset: inset 0 0 0 1px red, inset 0 0 2px blue;' };
  assert.deepEqual(pairProblems([both]), []);
  const outsetOnly = { file: 'fixture', selector: '.fx', body: '--ring: 0 0 0 1px red, 0 0 2px blue;' };
  assert.deepEqual(pairProblems([outsetOnly]),
    ['fixture: .fx composes --ring without --ring-inset']);
  const insetOnly = { file: 'fixture', selector: '.fx', body: '--ring-inset: inset 0 0 0 1px red;' };
  assert.deepEqual(pairProblems([insetOnly]),
    ['fixture: .fx composes --ring-inset without --ring']);
  const drifted = { file: 'fixture', selector: '.fx', body: '--ring: 0 0 0 1px red, 0 0 2px blue; --ring-inset: inset 0 0 0 2px red, inset 0 0 2px blue;' };
  assert.deepEqual(pairProblems([drifted]),
    ['fixture: .fx draws its inset ring from different layers']);
  // A comma inside color-mix() is not a layer break, so the twin of the shipped
  // recipe has to read as a match.
  const real = rules.find((r) => r.file === 'src/styles/code.css' && r.selector === '.ui-code');
  assert.ok(real, 'the chip rule is gone; move this check to another composition');
  assert.equal(layersOf(own(real).get('--ring')).length, 3, 'the ring is three layers');
  assert.deepEqual(pairProblems([real]), []);
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
  // 48 -> 54: #531 gave the ring to the six scroll containers that had none — the table
  // card, the dropdown search list, the drawer body, the confirm body, the palette list
  // and React's modal body. Four of the six are painted on the container around them, the
  // way #474 paints a snippet's, so the rule counted here is the one on that container.
  assert.equal(consumers.length, 54, 'ring consumer discovery changed');
  for (const { file, selector, body } of consumers) {
    assert.match(body, /(?:^|;)\s*outline:\s*2px solid transparent\s*;/, `${file}: ${selector} loses focus when forced colors removes box-shadow`);
  }
});

test('form focus rules use focus-visible and invalid fields cannot replace the band with a wash', () => {
  const form = sheets.find((s) => s.file === 'src/styles/input.css').css;
  assert.doesNotMatch(form, /:focus(?!-visible)/);
  assert.doesNotMatch(form, /\.is-invalid[^{}]*\{[^}]*box-shadow/);
});
