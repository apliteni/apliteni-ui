/* Unit tests for the contrast resolver's mechanical half.
 *
 * Every expected value here was computed independently of the implementation —
 * by hand in Python against the WCAG 2.x relative-luminance formula — and then
 * pinned. If you change the implementation to make one of these pass, you have
 * broken the maths, not fixed the test.
 *
 * The gate that consumes this module is stories/contrast.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AA_LARGE,
  AA_TEXT,
  composite,
  desugar,
  expandAnchors,
  luminance,
  parseColour,
  ratio,
  specialiseContextual,
  substitute,
  tokensFor,
} from './contrast.js';

const near = (actual, expected, what, tol = 0.005) => assert.ok(
  Math.abs(actual - expected) <= tol,
  `${what}: expected ${expected} ± ${tol}, got ${actual}`,
);

// ---- the ratio ------------------------------------------------------------

test('black on white is the maximum ratio the formula can produce', () => {
  near(ratio(parseColour('#000'), parseColour('#fff')), 21.00, '#000 on #fff');
});

test('the canonical AA boundary resolves to 4.54, not 4.5', () => {
  // #767676 on white is the greyscale value the WCAG reference implementation
  // uses as its worked example. A resolver that rounds or approximates lands
  // on 4.5 here and silently mis-judges every pair within a hair of the floor.
  near(ratio(parseColour('#767676'), parseColour('#ffffff')), 4.5422, '#767676 on #fff');
});

test('ratio is symmetric — the lighter colour is always the numerator', () => {
  const a = parseColour('#767676');
  const b = parseColour('#ffffff');
  assert.equal(ratio(a, b), ratio(b, a));
});

test("the dark theme's body text clears AA comfortably", () => {
  // --text #e9e7f0 on --bg #16151f. This exact pair is re-asserted inside the
  // gate as a self-check that the resolver reached the real token files.
  near(ratio(parseColour('#e9e7f0'), parseColour('#16151f')), 14.7725, '--text on --bg (dark)');
});

test("the light theme's body text clears AA comfortably", () => {
  near(ratio(parseColour('#1a1e27'), parseColour('#ffffff')), 16.6809, '--text on --bg (light)');
});

test('white on the dark --muted fill fails AA for normal text', () => {
  const r = ratio(parseColour('#ffffff'), parseColour('#948fa8'));
  near(r, 3.1095, '#ffffff on #948fa8');
  assert.ok(r < AA_TEXT, 'this pair is supposed to be a failure');
  assert.ok(r >= AA_LARGE, 'and it is supposed to clear the large-text floor');
});

test('luminance is monotonic in brightness', () => {
  assert.ok(luminance(parseColour('#000')) < luminance(parseColour('#767676')));
  assert.ok(luminance(parseColour('#767676')) < luminance(parseColour('#fff')));
});

// ---- compositing ----------------------------------------------------------

test('a translucent ink over a background composites to a real colour', () => {
  // --pink light (#b63361) painted on its own 10% tint over white. The tint is
  // the background; the arithmetic is source-over.
  const tint = composite([...parseColour('#b63361').slice(0, 3), 0.10], parseColour('#ffffff'));
  near(tint[0], 247.7, 'tint red');
  near(tint[1], 234.6, 'tint green');
  near(tint[2], 239.2, 'tint blue');
  assert.equal(tint[3], 1, 'compositing onto an opaque background yields an opaque colour');
  near(ratio(parseColour('#b63361'), tint), 4.97, '--pink light on its own 10% tint');
});

test('a fully opaque foreground composites to itself', () => {
  assert.deepEqual(composite(parseColour('#b63361'), parseColour('#ffffff')), [182, 51, 97, 1]);
});

test('a fully transparent foreground composites to the background', () => {
  assert.deepEqual(composite([255, 0, 0, 0], parseColour('#123456')), [18, 52, 86, 1]);
});

// ---- parsing --------------------------------------------------------------

test('parseColour reads the notations JSDOM and the kit actually produce', () => {
  assert.deepEqual(parseColour('#fff'), [255, 255, 255, 1], 'three-digit hex');
  assert.deepEqual(parseColour('#16151f'), [22, 21, 31, 1], 'six-digit hex');
  assert.deepEqual(parseColour('rgb(22, 21, 31)'), [22, 21, 31, 1], 'rgb()');
  assert.deepEqual(parseColour('rgba(22, 21, 31, 0.5)'), [22, 21, 31, 0.5], 'rgba()');
  assert.deepEqual(parseColour('transparent'), [0, 0, 0, 0], 'the transparent keyword');
});

test('parseColour reads the color(srgb …) form color-mix resolves to', () => {
  // JSDOM hands a resolved color-mix() back in this notation. A resolver that
  // cannot read it reports every tinted surface as unparseable.
  const c = parseColour('color(srgb 0.709804 0.45098 0.0392157 / 0.13)');
  assert.ok(c, 'color(srgb …) must parse');
  near(c[0], 181.0, 'srgb red channel scaled to 0-255');
  near(c[1], 115.0, 'srgb green channel scaled to 0-255');
  near(c[2], 10.0, 'srgb blue channel scaled to 0-255');
  near(c[3], 0.13, 'the alpha channel survives');
});

test('an unreadable value returns null rather than a silent zero', () => {
  // A resolver that returns black for what it cannot read fabricates a passing
  // ratio against a light background. Null forces the caller to decide.
  for (const bad of ['', 'chartreuse-ish', 'var(--nope)', 'url(x.png)', undefined, null]) {
    assert.equal(parseColour(bad), null, `${JSON.stringify(bad)} must not parse`);
  }
});

// ---- the cascade rewrites -------------------------------------------------

test('tokensFor picks the requested theme, not the first declaration it meets', () => {
  const dark = tokensFor('dark', 'default');
  const light = tokensFor('light', 'default');
  assert.equal(dark.get('--bg'), '#16151f', 'the dark page background');
  assert.equal(light.get('--bg'), '#ffffff', 'the light page background');
  assert.notEqual(dark.get('--pink'), light.get('--pink'), 'the two themes disagree about --pink');
});

test('tokensFor also harvests custom properties declared outside the token files', () => {
  // --ui-fb-pill-grad lives in src/styles/feedback.css. Miss it and the pill
  // resolves to nothing, which reads back as a fabricated 1.00:1.
  assert.ok(tokensFor('dark', 'default').has('--ui-fb-pill-grad'), 'component-scoped properties are harvested');
});

test('tokensFor lets the token files win over a component declaration', () => {
  const vars = tokensFor('light', 'default');
  assert.equal(vars.get('--bg'), '#ffffff', 'a component file cannot shadow a semantic token');
});

test('substitute resolves a chain of var() references', () => {
  const vars = new Map([['--a', 'var(--b)'], ['--b', '#abcdef']]);
  assert.equal(substitute('x{color:var(--a)}', vars), 'x{color:#abcdef}');
});

test('substitute honours a fallback for a property nobody declared', () => {
  assert.equal(substitute('x{color:var(--missing, #123456)}', new Map()), 'x{color:#123456}');
});

test('substitute terminates on a self-referencing property instead of spinning', () => {
  const vars = new Map([['--loop', 'var(--loop)']]);
  assert.equal(substitute('x{color:var(--loop)}', vars), 'x{color:var(--loop)}');
});

test('desugar turns state pseudo-classes into attribute selectors of equal weight', () => {
  assert.equal(desugar('.a:hover{color:red}'), '.a[data-ui-state~="hover"]{color:red}');
  assert.equal(desugar('.a:focus-visible{color:red}'), '.a[data-ui-state~="focus-visible"]{color:red}');
});

test('expandAnchors gives a bare `a` rule the :link/:visited forms JSDOM needs', () => {
  // JSDOM ranks its UA sheet's a:link above a same-specificity author `a` rule,
  // so an anchor with an href reads back as the UA blue. See the gate's header.
  assert.match(expandAnchors('a{color:#9b5dff}'), /a,a:link,a:visited\{/);
  assert.equal(expandAnchors('.k a{color:red}'), '.k a{color:red}', 'a descendant `a` is already correct');
});

test('specialiseContextual keeps a per-variant custom property from flattening', () => {
  // --toast-accent is declared once per toast status. Flatten it first-wins and
  // every toast reports the first status's colour.
  const css = '.t--ok{--x:green}.t--bad{--x:red}.t__action{color:var(--x)}';
  const out = specialiseContextual(css);
  assert.match(out, /\.t--ok \.t__action[^{]*\{[^}]*green/, 'the ok variant gets its own copy');
  assert.match(out, /\.t--bad \.t__action[^{]*\{[^}]*red/, 'the bad variant gets its own copy');
});

test('specialiseContextual never emits a bare :root into a selector list', () => {
  // Specialising a :root block would set an inherited colour on <html> and emit
  // both themes' literals with the wrong one last. tokensFor already picks the
  // right theme, so root blocks must be left alone.
  const css = ':root{--x:green}:root[data-theme="light"]{--x:red}.t{color:var(--x)}';
  const out = specialiseContextual(css);
  assert.equal(
    out.match(/:root/g).length, 2,
    `no :root rule may be specialised — the two in the input must be the only two, got: ${out}`,
  );
});

test('a specialised copy never out-ranks a later override of the same property', () => {
  // The copy gains a class of specificity. Emitted at the end of the sheet it
  // beats a later, equally specific override written for the same element —
  // which is how `.ui-toast--solid .ui-toast__action` (src/styles/callout.css:110)
  // lost to `.ui-toast--danger .ui-toast__action` and the solid danger toast's
  // action was reported as pink on pink, a fabricated 1.00:1. The copy must
  // therefore sit immediately after the rule it specialises, not at the end.
  const css = '.t--ok{--x:green}.t--bad{--x:red}.t__a{color:var(--x)}.t--solid .t__a{color:white}';
  const out = specialiseContextual(css);
  const lastCopy = Math.max(out.lastIndexOf('.t--ok .t__a'), out.lastIndexOf('.t--bad .t__a'));
  const override = out.indexOf('.t--solid .t__a');
  assert.ok(lastCopy >= 0, 'the variants are still specialised');
  assert.ok(
    override > lastCopy,
    'the later override must stay after every specialised copy, or it loses the '
    + `cascade it wins in a browser. Got copies ending at ${lastCopy}, override at ${override}:\n${out}`,
  );
});
