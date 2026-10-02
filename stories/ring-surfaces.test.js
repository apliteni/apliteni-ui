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
  assert.equal(surfaces.length, 138, 'surface discovery changed; the folded rail\'s current-row plate adds three and the disabled checkbox box and its radio mark add two');
  const shared = compositions.find((r) => !r.selector.includes(':root'));
  const covered = (rule) => rule.selector.split(',').every((selector) => shared.selector.split(',').map((s) => s.trim()).includes(selector.trim()));
  for (const rule of surfaces) {
    const gap = own(rule).get('--ring-gap');
    const background = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(rule.body)[1].trim();
    if (/\/\* ring-gap: inherit — .+\. \*\//.test(rule.raw)) {
      assert.ok(gap === undefined || gap === 'inherit', `${rule.selector} must inherit the containing gap`);
      continue;
    }
    assert.equal(gap, background, `${rule.file}: ${rule.selector} gap differs from its background`);
    assert.ok(covered(rule), `${rule.selector} does not compose the shared ring`);
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
  assert.equal(storySurfaces.length, 32,
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
  assert.equal(consumers.length, 48, 'ring consumer discovery changed');
  for (const { file, selector, body } of consumers) {
    assert.match(body, /(?:^|;)\s*outline:\s*2px solid transparent\s*;/, `${file}: ${selector} loses focus when forced colors removes box-shadow`);
  }
});

test('form focus rules use focus-visible and invalid fields cannot replace the band with a wash', () => {
  const form = sheets.find((s) => s.file === 'src/styles/input.css').css;
  assert.doesNotMatch(form, /:focus(?!-visible)/);
  assert.doesNotMatch(form, /\.is-invalid[^{}]*\{[^}]*box-shadow/);
});
