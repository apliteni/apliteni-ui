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
// - A consumer outside these two trees — an example page, a story's own <style>, and the
//   whole of site/ — is not read. Those compose the kit's classes. site/ matters here
//   because it has rules of its own that compete with the band: its selected accent
//   controls mark themselves with an accent box-shadow, which an outline does not
//   replace, so each stands aside under the band (#590 review). What reads site/ is
//   stories/focus-ring.test.js, which resolves the cascade on the built page.
//
// why: docs/foundations.md#the-focus-ring
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
  // 48 -> 47: #587 put the `a` element on the shared rule in base.css — one existing
  // selector list gains a member, not a new rule — and removed table.css's own copy of
  // the link's ring, which was its own rule block and so its own consumer.
  // 47 -> 49: #489's cap made the topbar's version switcher menu and account menu
  // scroll by default, so each needs the ring on its own scroll region the way
  // `.ui-dropdown__panel` already does — `.vsw__menu:focus-visible` and
  // `.amenu:focus-visible`.
  assert.equal(consumers.length, 49, 'ring consumer discovery changed');
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
  // Nine: the table card and the table wrapper inside it, the dropdown's search list,
  // the drawer's body, the confirm's consequence, the palette's list, React's modal body,
  // and the date picker's shortcut row in its phone sheet. Artur chose the picture on #531
  // round r30; the list is the surfaces it is on.
  // The ninth consumer is a focused table row, which uses the inward band.
  assert.equal(scrollRules.length, 9,
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

// ---- one band, and no accent edge beside it (#578 round r34) ----------------
//
// Artur, on the round's light captures: "Do not use glowing on outline on light theme."
// What read as a glow was not a halo — #578 had already taken that off — but a SECOND
// accent band: five controls recoloured their own 1px border to `--accent` in the same
// rule that drew the ring, so a focused field painted 2px of accent, 1px of unpainted
// offset, and 1px of accent again. On the light ground those three read as one soft
// edge. The band is the only accent the kit draws on a focused control now.
//
// Limits: this reads declarations, not pixels. A rule that paints an accent edge from
// a token this does not recognise as the accent family, or from a pseudo-element, is
// not seen; the browser captures on the pull request are what close that.

/** Whether a declared value resolves to the accent, through the kit's own properties. */
const accent = (value, seen = new Set()) => references(value).some((name) => {
  if (/^--(?:accent|accent-strong|ring-color)$/.test(name)) return true;
  if (seen.has(name)) return false;
  return declarations.filter((d) => d.name === name).some((d) => accent(d.value, new Set([...seen, name])));
});
/** The edge properties a second band can arrive on, beside the `outline` the band takes. */
const EDGE = /(?:^|;)\s*(border(?:-(?:top|right|bottom|left))?(?:-color)?|box-shadow|outline-color)\s*:\s*([^;]+)/g;
const fillOf = (body) => /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(body)?.[1].trim();
const secondBands = (subjects) => subjects.flatMap((rule) => [...rule.body.matchAll(EDGE)]
  .filter(([, , value]) => accent(value))
  // A border in the FILL's own colour is the fill reaching the border box, not an edge
  // beside the band — the primary button's hover and the picker's chosen day both
  // paint that pair, and neither draws a line a reader can see.
  .filter(([, , value]) => value.trim() !== fillOf(rule.body))
  .map(([, prop]) => `${rule.file}: ${rule.selector} paints ${prop} in the accent beside the band`));

test('a focus rule draws the band and no second accent edge', () => {
  // Every consumer is read, so this cannot go quiet by losing its subjects: the count
  // is the one the offset gate pins, and the two have to move together.
  assert.equal(consumers.length, 49, 'ring consumer discovery changed');
  assert.deepEqual(secondBands(consumers), []);
});

test('the second-band gate rejects each way of drawing one', () => {
  const ring = 'outline: var(--ring); outline-offset: var(--ring-offset);';
  assert.deepEqual(secondBands([{ file: 'fixture', selector: '.fx:focus-visible', body: ring }]), []);
  // The shape the five shipped, and the same thing said three other ways.
  for (const [prop, decl] of [
    ['border-color', 'border-color: var(--accent);'],
    ['border', 'border: 1px solid var(--accent-strong);'],
    ['box-shadow', 'box-shadow: inset 0 0 0 1px var(--ring-color);'],
    ['border-bottom-color', 'border-bottom-color: var(--accent);'],
  ]) {
    assert.deepEqual(
      secondBands([{ file: 'fixture', selector: '.fx:focus-visible', body: `${decl} ${ring}` }]),
      [`fixture: .fx:focus-visible paints ${prop} in the accent beside the band`],
      `a focus rule writing ${decl} has to be named`,
    );
  }
  // A neutral edge beside the band is not a second band and must not be named.
  assert.deepEqual(secondBands([{
    file: 'fixture', selector: '.fx:focus-visible', body: `border-color: var(--field-edge); ${ring}`,
  }]), []);
  // And on the tree rather than a fixture: give a real consumer the accent border back.
  const real = consumers.find((r) => r.file === 'src/styles/input.css');
  assert.ok(real, 'input.css no longer takes the ring; move this check');
  assert.deepEqual(secondBands([{ ...real, body: `border-color: var(--accent); ${real.body}` }]),
    [`src/styles/input.css: ${real.selector} paints border-color in the accent beside the band`]);
});

// An always-on accent edge is the same second band, drawn by the pointer instead of by
// the focus rule: a control hovered AND focused would paint both. The kit settles that
// one way — the band wins, one indicator — so every hover rule that paints an accent
// edge stands aside with `:not(:focus-visible)`.
const hoverEdges = rules.filter((rule) => /:hover/.test(rule.selector) && secondBands([rule]).length);

test('a hover rule that paints an accent edge stands aside under the band', () => {
  assert.ok(hoverEdges.length >= 6,
    `${hoverEdges.length} hover rules paint an accent edge; the kit has at least six `
    + '(the secondary button, the check box, the social mark, the version button, the '
    + 'avatar and the dropdown trigger)');
  const standing = hoverEdges
    .filter((rule) => !/:not\(\s*:focus-visible\s*\)/.test(rule.selector))
    .map((rule) => `${rule.file}: ${rule.selector}`);
  // ONE exception, and it is not a hover mark: the picker paints an accent border on
  // today's cell AT REST, and these two rules only keep it there while the pointer is
  // on it, so standing them aside would change nothing. Whether a CURRENT day should
  // carry a hollow accent ring at all is the open question on #578 round r34 — it is
  // the calendar's hollow-for-here, filled-for-chosen pair, and replacing it needs a
  // mark that does not collide with the range tint or the row hover. Artur's call.
  assert.deepEqual(standing, [
    'react/src/DatePicker.css: .ui-datepicker__opt.is-disabled.is-today,\n.ui-datepicker__opt.is-disabled.is-today:hover',
  ]);
});

test('the hover gate rejects an accent edge left standing under the band', () => {
  const real = hoverEdges.find((r) => r.file === 'src/styles/dropdown.css');
  assert.ok(real, 'the dropdown trigger no longer lights its edge on hover; move this check');
  assert.match(real.selector, /:not\(\s*:focus-visible\s*\)/, 'the real rule stands aside');
  assert.equal(/:not\(\s*:focus-visible\s*\)/.test(real.selector.replace(':not(:focus-visible)', '')), false,
    'stripping the guard from the real rule leaves a selector this gate would name');
});
