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
import { JSDOM } from 'jsdom';
import {
  AA_LARGE,
  AA_TEXT,
  composite,
  desugar,
  effectiveBackground,
  expandAnchors,
  luminance,
  makeStyleCache,
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

// ---- the style cache ------------------------------------------------------
//
// The cache exists for speed, and a cache that returns one element's colour for
// another — or one render's colour for the next — turns the gate into a
// confident liar. These tests are about that, not about the speed.

/** A window whose stylesheet is `css`, with `<div class="box" id="b">` inside. */
const boxWindow = (css) => new JSDOM(
  `<!doctype html><html lang="en"><head><style>${css}</style></head>`
  + '<body><div class="box" id="b">x</div></body></html>',
  { pretendToBeVisual: true },
).window;

test('the style cache asks the window once per element and then answers from memory', () => {
  const win = boxWindow('.box{background:rgb(10,20,30)}');
  const real = win.getComputedStyle.bind(win);
  let calls = 0;
  win.getComputedStyle = (node) => { calls += 1; return real(node); };

  const styles = makeStyleCache(win);
  const el = win.document.getElementById('b');
  const first = styles.of(el);
  for (let i = 0; i < 20; i++) styles.of(el);

  assert.equal(calls, 1, `21 lookups of one element must cost one getComputedStyle, cost ${calls}`);
  assert.equal(first.backgroundColor, 'rgb(10, 20, 30)', 'and the answer is still the real one');
  win.close();
});

test('a DOM write through the cache drops the memo, so a state is never read stale', () => {
  // The load-bearing test. The walk sets data-ui-state on an element, reads it,
  // and takes it off again; JSDOM re-resolves the cascade each time (its own
  // _styleCache is wiped by any attribute change on an attached element). A memo
  // that survived the write would report the at-rest colour for the hover pass
  // and the hover colour for whatever came next — silently, and in the direction
  // that invents passing pairs.
  const win = boxWindow(
    '.box{background:rgb(10,20,30)}.box[data-ui-state~="hover"]{background:rgb(200,100,50)}',
  );
  const styles = makeStyleCache(win);
  const el = win.document.getElementById('b');

  assert.equal(styles.of(el).backgroundColor, 'rgb(10, 20, 30)', 'at rest');
  styles.mutate(() => el.setAttribute('data-ui-state', 'hover'));
  assert.equal(styles.of(el).backgroundColor, 'rgb(200, 100, 50)', 'hovered, not the memoised at-rest colour');
  styles.mutate(() => el.removeAttribute('data-ui-state'));
  assert.equal(styles.of(el).backgroundColor, 'rgb(10, 20, 30)', 'back at rest, not the memoised hover colour');
  win.close();
});

test('the memo is dropped even when the DOM write throws', () => {
  const win = boxWindow('.box{background:rgb(10,20,30)}');
  const styles = makeStyleCache(win);
  const el = win.document.getElementById('b');
  styles.of(el);
  assert.throws(() => styles.mutate(() => { throw new Error('render blew up'); }), /render blew up/);
  // Nothing observable changed, so the assertion is about the memo being gone,
  // not about the colour: a write that half-succeeded must not leave a memo
  // describing the DOM as it was before it.
  const real = win.getComputedStyle.bind(win);
  let calls = 0;
  win.getComputedStyle = (node) => { calls += 1; return real(node); };
  styles.of(el);
  assert.equal(calls, 1, 'the memo survived a throwing write');
  win.close();
});

test('a DOM write that bypassed mutate is refused, not answered from the stale memo', () => {
  // The invariant `mutate` only had by convention until now. Three write sites
  // route through it and the test above proves the mechanism; nothing stopped a
  // fourth being added with a bare setAttribute, and a bare setAttribute leaves
  // a memo describing the document as it was one render ago. That is the worst
  // failure this file can have: the gate reports a colour nobody painted, and
  // reports it confidently. The cache watches the document instead of trusting
  // the caller, so the discipline is checked rather than remembered.
  const win = boxWindow(
    '.box{background:rgb(10,20,30)}.box[data-ui-state~="hover"]{background:rgb(200,100,50)}',
  );
  const styles = makeStyleCache(win);
  const el = win.document.getElementById('b');
  assert.equal(styles.of(el).backgroundColor, 'rgb(10, 20, 30)', 'at rest, memoised');

  el.setAttribute('data-ui-state', 'hover'); // the careless fourth write site

  assert.throws(
    () => styles.of(el),
    /bypassed .*mutate/,
    'the cache must refuse to answer after a write it did not see routed through mutate',
  );
  win.close();
});

test('the guard names any unrouted write, not just one on the element being read', () => {
  // The poison does not have to touch the element you go on to read: any write
  // invalidates JSDOM's own cascade cache for the WHOLE document, so every
  // memoised element is stale after any write anywhere.
  const win = boxWindow('.box{background:rgb(10,20,30)}');
  const styles = makeStyleCache(win);
  const el = win.document.getElementById('b');
  styles.of(el);
  win.document.body.appendChild(win.document.createElement('span'));
  assert.throws(() => styles.of(el), /bypassed .*mutate/);
  win.close();
});

test('the guard latches, so the one throw cannot be swallowed and walked past', () => {
  // Draining the record queue is what detects the write, and draining empties
  // it — so an unlatched guard would throw exactly once and then answer stale
  // colours forever after. One try/catch anywhere above would turn the whole
  // invariant into a single swallowed exception.
  const win = boxWindow('.box{background:rgb(10,20,30)}');
  const styles = makeStyleCache(win);
  const el = win.document.getElementById('b');
  styles.of(el);
  el.setAttribute('data-ui-state', 'hover');
  assert.throws(() => styles.of(el), /bypassed .*mutate/, 'the first read after the write');
  assert.throws(() => styles.of(el), /bypassed .*mutate/, 'and every read after that one');
  styles.mutate(() => el.removeAttribute('data-ui-state'));
  assert.throws(
    () => styles.of(el), /bypassed .*mutate/,
    'a later well-behaved write must not clear the record — the walk it poisoned is still the walk',
  );
  win.close();
});

test('a write routed through mutate leaves the cache willing to answer', () => {
  // The other half: the guard must not fire on the discipline it is enforcing,
  // or the walk cannot run at all.
  const win = boxWindow('.box{background:rgb(10,20,30)}');
  const styles = makeStyleCache(win);
  const el = win.document.getElementById('b');
  styles.of(el);
  styles.mutate(() => el.setAttribute('data-ui-state', 'hover'));
  assert.doesNotThrow(() => styles.of(el));
  styles.mutate(() => { win.document.body.innerHTML = '<div class="box" id="b">y</div>'; });
  assert.doesNotThrow(() => styles.of(win.document.getElementById('b')));
  win.close();
});

test('the cache captures a colour when it stores it, not when it is read back', () => {
  // JSDOM resolves color-mix() LAZILY, on the first read of the property, and
  // what it resolves to depends on what else has been looked up by then. Hold a
  // declaration, look at anything else, then read .color: back comes the raw
  // color-mix(), which parseColour cannot read — so the element is dropped from
  // the walk without a word. Caching the declaration OBJECT hit exactly this:
  // twelve solid-toast text pairs stopped being judged, silently, while every
  // reported finding stayed the same. The cache stores values, not declarations.
  const win = new JSDOM(
    '<!doctype html><html lang="en"><head><style>'
    + '.c{color:color-mix(in srgb, rgb(255,255,255) 90%, transparent)}'
    + '</style></head><body><div class="p"><div class="c" id="c">x</div></div></body></html>',
    { pretendToBeVisual: true },
  ).window;
  const styles = makeStyleCache(win);
  const cs = styles.of(win.document.getElementById('c'));
  // Whatever the walk does between storing a style and reading its colour.
  for (const n of win.document.querySelectorAll('*')) styles.of(n).display;

  assert.ok(
    parseColour(cs.color),
    `the walk's parser must be able to read ${JSON.stringify(cs.color)} — an unresolved `
    + 'color-mix() makes the element vanish from the gate instead of failing it',
  );
  assert.equal(cs.color, 'color(srgb 1 1 1 / 0.9)', 'and it is the resolved value, not some other one');
  win.close();
});

test('the cache refuses a property it does not hold, rather than answering undefined', () => {
  // A style the cache does not carry must not read back as undefined: the walk
  // would treat it as an unparseable colour or a missing opacity and skip the
  // element in silence, which is the failure this whole cache has to avoid.
  const win = boxWindow('.box{background:rgb(10,20,30)}');
  const cs = makeStyleCache(win).of(win.document.getElementById('b'));
  assert.equal(cs.backgroundColor, 'rgb(10, 20, 30)', 'a property it does hold');
  assert.throws(() => cs.borderTopColor, /style cache does not hold "borderTopColor"/);
  win.close();
});

test('a cache cannot answer for an element of another document', () => {
  // The guarantee that makes this safe across theme passes: entries are keyed on
  // the element object itself, and an element belongs to exactly one document.
  // Each walkStories call builds its own DOM and its own cache, so this case
  // should never arise — the test pins the property that makes it harmless if it
  // ever does.
  const a = boxWindow('.box{background:rgb(10,20,30)}');
  const b = boxWindow('.box{background:rgb(200,100,50)}');
  const elA = a.document.getElementById('b');
  const elB = b.document.getElementById('b');

  const styles = makeStyleCache(a);
  assert.equal(styles.of(elA).backgroundColor, 'rgb(10, 20, 30)', "document A's colour");
  assert.notEqual(
    styles.of(elB).backgroundColor, 'rgb(10, 20, 30)',
    "document B's element must not pick up document A's memoised colour",
  );

  // And two caches share no storage, so one theme pass cannot seed the next.
  const other = makeStyleCache(b);
  assert.equal(other.of(elB).backgroundColor, 'rgb(200, 100, 50)', 'a fresh cache resolves against its own document');
  a.close();
  b.close();
});

test('effectiveBackground composites a translucent chain identically with and without the cache', () => {
  // Two translucent layers over an opaque body. Caching the COMPOSITE per
  // element would be a different change from caching getComputedStyle per
  // element, and would have to argue that source-over stays associative down a
  // shared chain. This caches the lookup only, so the composite is still built
  // from scratch per element and the two answers must agree exactly.
  const win = new JSDOM(
    '<!doctype html><html lang="en"><head><style>'
    + 'body{background:rgb(255,255,255)}'
    + '.card{background:rgba(0,0,255,0.5)}'
    + '.inner{background:rgba(255,0,0,0.25)}'
    + '.t{background:transparent}'
    + '</style></head><body><div class="card"><div class="inner"><span class="t" id="t">x</span>'
    + '</div></div></body></html>',
    { pretendToBeVisual: true },
  ).window;
  const el = win.document.getElementById('t');
  const plain = effectiveBackground(el, win);

  // Hand-computed: blue at 0.5 over white is (127.5, 127.5, 255); red at 0.25
  // over that is (159.375, 95.625, 191.25). Pinned so agreement is not agreement
  // on a shared mistake.
  near(plain[0], 159.375, 'red channel');
  near(plain[1], 95.625, 'green channel');
  near(plain[2], 191.25, 'blue channel');

  const styles = makeStyleCache(win);
  const real = win.getComputedStyle.bind(win);
  let calls = 0;
  win.getComputedStyle = (node) => { calls += 1; return real(node); };

  assert.deepEqual(effectiveBackground(el, win, styles.of), plain, 'first cached walk');
  assert.deepEqual(effectiveBackground(el, win, styles.of), plain, 'second cached walk');
  // The chain is span → inner → card → body, and body is opaque so the walk
  // stops there: four nodes, four lookups for both walks together. Eight means
  // the walk is not going through the cache at all.
  assert.equal(calls, 4, `two walks of a four-node chain must cost four lookups, cost ${calls}`);
  win.close();
});
