// Rule: the kit's focus ring is ONE declaration, a real outline, and every control
// that takes it takes its offset too.
//
// #578 made `--ring` an outline rather than a three-layer box-shadow, and took the
// halo off. What that retired is the reason this gate used to be 140 lines of surface
// discovery: a box-shadow ring had to PAINT its own 1px gap, in a colour it could only
// get from whatever surface the control stood on, so every painted container in the kit
// re-pointed `--ring-gap` and recomposed `--ring`, and the gate's job was to find a
// container that had forgotten. An outline leaves its offset UNPAINTED. The gap is the
// surface itself, whatever it is, so there is nothing to hand down and nothing to
// forget — and the guarantee worth holding instead is that the ring really is declared
// once and really is read whole.
//
// Three things are checked, and none of them is visible in a rule that uses the token:
//
//  - **One declaration.** `--ring` and `--ring-offset` are declared at `:root` and
//    nowhere else. A second declaration is how the old shape drifted: #218 found the
//    ring written out eight times and measured the two that were least wrong.
//  - **The offset.** `outline-offset` is what puts the band 1px OUTSIDE the border box.
//    A rule that takes the outline and leaves the offset draws the band flush against
//    the control, closing the gap the ring is read across. Same bug as the one #557
//    found on the inward band, same shape of check.
//  - **No surface token behind it.** A var() inside a custom property is substituted
//    where that property is DECLARED, so a `--ring` that read a token a surface
//    re-points would freeze at `:root` and need the per-surface list back.
//
// And two tripwires: `--ring-gap` must not come back (it is nothing's input now), and
// no consumer keeps the transparent 2px outline that stood in for the ring under
// forced colors — the band is a real outline, which is what the system repaints.
//
// Coverage limits:
// - This reads src/**.css and react/src/**.css as text, with comments blanked. It
//   measures no pixels: that the band lands 1px out and 2px wide in a browser is
//   stories/scroll-ring.test.js's business for the inward band and the contrast ledger's
//   for this one.
// - It asks whether a rule that writes the ring writes it whole. Whether the rule WINS
//   over the always-on rules on the same element is stories/focus-ring.test.js, and
//   whether every keyboard stop has a rule at all is that gate too.
// - A consumer outside these two trees — an example page, a story's own <style> — is not
//   read. Those compose the kit's classes.
//
// why: docs/specification.md#the-focus-ring
// Weaken the rule and confirm that its test fails.
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
/** Whether a value resolves, through the kit's own custom properties, to a surface colour. */
const surface = (value, seen = new Set()) => references(value).some((name) => {
  if (/^--(?:bg(?:-elevated)?|surface(?:-[23])?|glow-[\w-]+|signal-solid-[\w-]+)$/.test(name)) return true;
  if (seen.has(name)) return false;
  return declarations.filter((d) => d.name === name).some((d) => surface(d.value, new Set([...seen, name])));
});
const rules = sheets.flatMap(({ file, css, raw }) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map((m) => ({ file, selector: m[1].trim(), body: m[2], raw: raw.slice(m.index, m.index + m[0].length) })));

/** Rules that draw the outward band, and rules that draw the inward one. */
const consumers = rules.filter(({ body }) => /(?:^|;)\s*outline\s*:[^;]*var\(--ring\)/.test(body));
const scrollRules = rules.filter(({ body }) => /(?:^|;)\s*outline\s*:[^;]*var\(--ring-scroll\)/.test(body));

/**
 * The problem lines a set of rules produces: one per rule that takes a band and
 * leaves the offset that places it. Injectable so the mutations below run the gate
 * itself rather than a paraphrase of it.
 */
const offsetProblems = (subjects, token) => subjects
  .filter(({ body }) => !new RegExp(`(?:^|;)\\s*outline-offset\\s*:[^;]*var\\(${token}-offset\\)`).test(body))
  .map((rule) => `${rule.file}: ${rule.selector} takes ${token} without ${token}-offset, so its band draws on the border box`);

test('every control that takes the ring takes the offset that places it', () => {
  // 47 since #482 and #510 — the nineteen controls that had no focus rule at all, and a
  // link inside a table — minus the seven #531 moved onto the inward band, plus the
  // Snippet's card, which draws the ring for its focused code region because the <pre>
  // has no radius of its own. #578 changed the carrier and not the list: the same rules
  // write `outline: var(--ring)` where they wrote `box-shadow: var(--ring)`.
  // 47 -> 48: the picker's day cell, which used to write the transparent stand-in alone
  // and take the band from base.css. It has to write the band itself now, because the
  // hover rule above it ties base.css's rule on specificity and stands later.
  assert.equal(consumers.length, 48, 'ring consumer discovery changed');
  assert.ok(consumers.filter((r) => r.file.startsWith('react/')).length >= 3,
    'the walk stopped reading react/src: the sort header, the row-selection checkbox, '
    + 'the file drop and the picker cell all take the ring there');
  assert.deepEqual(offsetProblems(consumers, '--ring'), []);
});

test('the offset gate rejects a control that takes the band and leaves the offset', () => {
  const right = { file: 'fixture', selector: '.fx:focus-visible', body: 'outline: var(--ring); outline-offset: var(--ring-offset);' };
  assert.deepEqual(offsetProblems([right], '--ring'), []);
  const wrong = { file: 'fixture', selector: '.fx:focus-visible', body: 'outline: var(--ring);' };
  assert.deepEqual(offsetProblems([wrong], '--ring'),
    ['fixture: .fx:focus-visible takes --ring without --ring-offset, so its band draws on the border box']);
  // And on the tree rather than a fixture: drop the offset from the shared rule in
  // base.css and the gate has to name it.
  const real = consumers.find((r) => r.file === 'src/styles/base.css');
  assert.ok(real, 'base.css no longer claims the ring for the kit\'s controls; move this check');
  assert.deepEqual(offsetProblems([{ ...real, body: real.body.replace(/outline-offset\s*:[^;]*;/, '') }], '--ring'),
    [`src/styles/base.css: ${real.selector} takes --ring without --ring-offset, so its band draws on the border box`]);
});

test('every scroll region that takes the inward band takes its offset too', () => {
  // Eight: the table card and the table wrapper inside it, the dropdown's search list,
  // the drawer's body, the confirm's consequence, the palette's list, React's modal body,
  // and the date picker's shortcut row in its phone sheet. Artur chose the picture on #531
  // round r30; the list is the surfaces it is on.
  assert.equal(scrollRules.length, 8,
    'scroll-ring consumer discovery changed; name the scroll region that was added or removed');
  assert.equal(scrollRules.filter((r) => r.file.startsWith('react/')).length, 2,
    'React\'s modal body and the picker\'s shortcut row are not both among them, so the walk '
    + 'stopped reading react/src');
  assert.deepEqual(offsetProblems(scrollRules, '--ring-scroll'), []);
});

test('the offset gate rejects a scroll region that takes the band and leaves the offset', () => {
  const real = scrollRules.find((r) => r.file === 'src/styles/drawer.css');
  assert.ok(real, 'the drawer body no longer takes the scroll ring; move this check');
  assert.deepEqual(offsetProblems([{ ...real, body: real.body.replace(/outline-offset\s*:[^;]*;/, '') }], '--ring-scroll'),
    ['src/styles/drawer.css: .ui-drawer__body:focus-visible takes --ring-scroll without --ring-scroll-offset, so its band draws on the border box']);
});

test('the ring is declared once, and the two bands differ only in where they land', () => {
  const names = ['--ring', '--ring-offset', '--ring-scroll', '--ring-scroll-offset'];
  for (const name of names) {
    const at = declarations.filter((d) => d.name === name);
    assert.equal(at.length, 1, `${name} is declared ${at.length} times; the ring reads no surface token, so one is enough`);
    assert.equal(at[0].file, 'src/tokens/tokens.css', `${name} is declared outside the token sheet`);
  }
  const value = (name) => declarations.find((d) => d.name === name).value.trim();
  assert.equal(value('--ring'), 'var(--ring-width) solid var(--ring-color)',
    'the band is no longer --ring-width of solid --ring-color — tune it at the widths, not here');
  assert.equal(value('--ring-offset'), 'var(--ring-gap-width)',
    'the band no longer leaves --ring-gap-width of the surface between it and the control');
  assert.equal(value('--ring-scroll'), 'var(--ring)',
    'the inward band is no longer the same band as the outward one');
  assert.equal(value('--ring-scroll-offset'), 'calc(-1 * (var(--ring-gap-width) + var(--ring-width)))',
    'the inward band no longer lands where --ring\'s band lands, mirrored: 1px of gap, then the band');
  // The reason the four need no per-surface recomposition, held as a check rather than
  // as a sentence: none of them reads a token a surface re-points.
  for (const name of names) {
    for (const ref of references(value(name))) {
      assert.ok(!surface(`var(${ref})`),
        `${name} reads ${ref}, which resolves to a surface colour — recompose it per surface or stop reading it`);
    }
  }
});

test('nothing reads or re-points --ring-gap, the colour an outline does not paint', () => {
  const back = declarations.filter((d) => d.name === '--ring-gap')
    .map((d) => `${d.file} declares --ring-gap`);
  const read = rules.filter(({ body }) => body.includes('var(--ring-gap)'))
    .map((r) => `${r.file}: ${r.selector} reads var(--ring-gap)`);
  assert.deepEqual([...back, ...read], [],
    '--ring-gap was retired with the painted gap in #578: an outline leaves its offset '
    + 'unpainted, so the 1px between a control and its band is the surface already there');
  // And the width it was named after is still the input both offsets read.
  assert.ok(declarations.some((d) => d.name === '--ring-gap-width'),
    '--ring-gap-width is the width of the unpainted gap and both offsets are built from it');
});

test('no consumer keeps the transparent outline that stood in for a box-shadow ring', () => {
  const standIns = rules
    .filter(({ body }) => /(?:^|;)\s*outline\s*:\s*2px solid transparent\s*;/.test(body))
    .map((r) => `${r.file}: ${r.selector}`);
  assert.deepEqual(standIns, [],
    'a transparent 2px outline was what forced colors repainted while the ring was a '
    + 'box-shadow. The band is a real outline now, so the stand-in is a second indicator '
    + 'waiting to be drawn');
});

test('form focus rules use focus-visible and invalid fields cannot replace the band with a wash', () => {
  const form = sheets.find((s) => s.file === 'src/styles/input.css').css;
  assert.doesNotMatch(form, /:focus(?!-visible)/);
  assert.doesNotMatch(form, /\.is-invalid[^{}]*\{[^}]*box-shadow/);
});
