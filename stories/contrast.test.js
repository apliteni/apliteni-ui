/* Rule: a foreground/background pair the kit renders as text must clear WCAG AA,
 * or be named in the ledger below by a person who decided it is acceptable.
 *
 * There is no hand-maintained list of pairs. Every story in stories/ is rendered
 * in both themes, its real markup mounted in JSDOM against the kit's real
 * stylesheets with the token files substituted per theme, and every text-owning
 * element is measured against the background chain composited above it. Adding a
 * component adds its pairs with no human step. The resolver lives in
 * stories/lib/contrast.js and is unit-tested against hand-computed values in
 * stories/lib/contrast.test.js.
 *
 * WHAT THIS GATE ACTUALLY CHECKS, stated weakly on purpose. Not "the pairs the
 * kit renders" — "the pairs a story renders, resolved without layout, for text
 * only, in two themes at one accent". A gate that overstates itself is how
 * contrast came to be "verified visually" in the first place.
 *
 * WHAT IT WILL NOT CATCH:
 *
 *  - Anything layout decides. JSDOM has no layout. The gate uses DOM ancestry as
 *    a proxy for visual stacking, and the proxy is wrong wherever an element is
 *    painted over something that is not its ancestor: a toast over the page, a
 *    dropdown panel over a card, a sticky topbar over scrolled content, the
 *    drawer over its scrim. This is the largest gap and only a real browser
 *    closes it. Playwright is the honest upgrade path; it is a new dependency
 *    plus a browser download in CI, which is why it is not here.
 *  - A PAINT LAYER THE WALK CANNOT SEE, which is the one that costs most. The
 *    background chain is built from an element's own ancestors, so any layer that
 *    is not an ancestor is invisible and the text above it is measured against
 *    the ground UNDERNEATH that layer. Two live shapes, both measured:
 *      · a pseudo-element. Every .ui-bg-* backdrop (src/styles/base.css) paints
 *        its gradient on ::before at inset 0, and
 *        stories/foundations/Backgrounds.stories.js renders real copy over all
 *        four. Nine pairs per backdrop come back JUDGED, none unjudgeable.
 *      · a sibling overlay. The ambient glows (.ui-glow--*, src/styles/base.css)
 *        are gradients on empty spans beside the content, never an ancestor of
 *        it. Backgrounds:Glow reports nine judged pairs and zero unjudgeable.
 *    What is proved is that these pairs are rated against the wrong ground. What
 *    is NOT proved is that any current pair's verdict flips: bounding the
 *    translucent spotlight and wash moved the worst pair 5.82 -> 4.92, still over
 *    the floor. The opaque grid and dot fields cannot be bounded without a
 *    browser. So: a wrong ground today, and no way to know it stays harmless.
 *  - ::before / ::after as TEXT are not computed either. The kit's carry none —
 *    every content: declaration in src/styles is the empty string.
 *  - Gradients and images an element owns itself, or inherits from an ancestor.
 *    The brand gradient stops (src/styles/layout.css) are the verified case:
 *    h1.ui-hero__title > span.grad comes back unjudgeable, which is the honest
 *    answer rather than a fix or a silent pass. Forty-one such records in a dark
 *    walk. The bullet above is the shape that does NOT reach this path.
 *  - filter. .ui-btn--primary:hover uses filter: brightness(1.1)
 *    (src/styles/button.css); the gate reads the pre-filter colour. No
 *    mix-blend-mode ships anywhere. backdrop-filter ships once, and not in what
 *    this file walks: .rx-scrim (react/src/Modal.css) blurs what is behind the
 *    modal, and it is react/src/contrast.test.tsx that measures over it.
 *  - Inactive components, and everything inside them. Skipped on purpose per WCAG
 *    1.4.3, but the skip is by closest(), so a disabled CONTAINER takes its whole
 *    subtree out of the walk. A disabled control is exempt from the contrast
 *    requirement and is not exempt from being readable — which is the hole
 *    stories/guidelines/accessibility-floor.test.js fills, at the floor #220
 *    settled. It is still a hole HERE.
 *  - Anything with no story — and "story" is narrower than it sounds: files
 *    ending .stories.js under stories/. The React workspace's .stories.tsx are
 *    not walked here; react/src/contrast.test.tsx gates those instead.
 *  - Anything not visible at rest. display:none, visibility:hidden and opacity:0
 *    are dropped BEFORE anything else is asked of the element, and that is the
 *    resting state of four families: the dropdown panel (src/styles/dropdown.css),
 *    the confirm scrim and panel (src/styles/confirm.css), the drawer
 *    (src/styles/drawer.css), and the whole feedback overlay — pill, scrim and
 *    composer (src/styles/feedback.css). Each is measured only where a story
 *    ships it already open. This drop happens first, which is why the pill's
 *    --ui-fb-pill-grad is not reported unjudgeable either: it is not reported.
 *  - States past four. The walk FORCES hover, focus-visible, focus and active,
 *    and forces nothing else — not :focus-within, ::placeholder, ::selection, nor
 *    any class-driven state (.open, .is-open, .is-active) a story does not ship.
 *    Read that precisely: :checked and :disabled are matched natively by JSDOM,
 *    so markup a story ships already checked or disabled IS styled by those
 *    rules. It is the forcing that is absent, not the matching.
 *  - Anything a script would do. The body is set from a static string, so the
 *    wiring .storybook/preview.js imports — wireTopbar, wireNav, wireDrawer,
 *    wireConfirm, initTabs — never runs, and no class the live app applies at
 *    runtime is ever measured.
 *  - Custom properties a story pins INLINE. Every var() is flattened against one
 *    theme-wide token map before mount, so the accent panels of
 *    stories/foundations/SubThemes.stories.js, which set --accent and its family
 *    in a style attribute, are every one of them measured as the DEFAULT accent.
 *  - Non-text contrast (WCAG 1.4.11) — borders, focus rings, icon strokes. The
 *    3:1 rule is against ADJACENT colours, which needs geometry. Say so, because
 *    "the contrast gate is green" will otherwise be read as covering it.
 *  - Text that is not a text node: placeholder, value, alt, title, aria-label.
 *  - More than one accent. The default run is two themes at the default accent.
 *    The eight-cell matrix behind CONTRAST_ACCENTS=1 counts pairs and asserts a
 *    floor on that count — never that any pair clears AA.
 *  - Whether the colour is readable. The AA floor is a floor, not a verdict.
 *
 * AND WHAT COVERS SOME OF IT INSTEAD. This file is the STORY WALK, which is not
 * the whole of the kit's contrast measurement — a gap named above may already be
 * closed by a sibling, and saying so is part of not overstating this one.
 * stories/accent-contrast.test.js is a token contract: it renders nothing, costs
 * milliseconds, and so affords all eight theme x accent cells, seeing pairs no
 * story happens to render. stories/signal-contrast.test.js reads declarations out
 * of the source rather than rendering, and gates the signal inks and the solid
 * toast in both themes. react/src/contrast.test.tsx mounts the React workspace.
 * What none of the four reaches is the first bullet above: layout.
 *
 * JSDOM AND THE CASCADE. JSDOM applies AUTHOR rules by specificity and source
 * order faithfully, and that is the whole of the guarantee — it does not rank by
 * origin. There is one known exception, at the user-agent boundary: the UA
 * sheet's `a:link` out-ranks a same-specificity author `a` rule, so a linked
 * anchor reads back as the UA's rgb(0, 0, 238). The resolver rewrites the kit's
 * single bare `a` rule to carry :link/:visited, and a self-check below asserts
 * that colour appears nowhere in the walk. Do not repeat the unqualified claim
 * in stories/nav-cascade.test.js:11-16 that JSDOM's cascade matches a browser's;
 * it holds among author rules only.
 *
 * A custom property re-declared per component variant (--toast-accent, once per
 * toast status) would flatten to whichever status came first, repainting every
 * toast one colour. The resolver emits a variant-scoped copy of each consuming
 * declaration instead, immediately after the rule it specialises so a later
 * override of equal weight still wins. That relies on a base rule preceding its
 * variants, which is the kit's convention throughout; the five-toast self-check
 * below pins it.
 *
 * COST, HONESTLY. The walk is the most expensive thing in `npm test` and it runs
 * on every invocation. It is also the suite's critical path: `node --test` runs
 * files as parallel child processes, and this one outlasts all the others put
 * together. Measured on a 10-core laptop: the suite runs in ~18s with this file
 * and ~8s without it, so the gate still roughly doubles it.
 *
 * It used to be worse. The walk asked JSDOM for a computed style 138,534 times
 * across the two cells, because every text element was walked up its ancestor
 * chain three separate times — background, hidden test, opacity — and siblings
 * share almost all of that chain. Memoising the lookup per element between DOM
 * writes (makeStyleCache in stories/lib/contrast.js) cut that to 28,706 calls,
 * and the walk from ~23s to ~16s. Not the 3x the call count suggests: what
 * remains is dominated by the 5,738 DOM writes the state passes make, each of
 * which throws away JSDOM's own style cache for the whole document and forces
 * the next lookups to resolve the cascade from scratch. That is JSDOM's own
 * invalidation rule and nothing here can safely be cleverer than it.
 *
 * All three of those numbers are now asserted rather than remembered. The miss
 * rate they imply — 28,706 of 138,534 reads — is gated below, and it is the only
 * cost assertion here that is deterministic enough to see a doubling. The 5,738
 * writes are gated too, as the anti-vacuity counter for the invariant that keeps
 * the cache honest: every DOM write in the walk goes through `mutate`, and the
 * cache now refuses to answer if one did not. See makeStyleCache.
 *
 * Cost grows with theme×accent cells, close to linearly — measured 16.3s for the
 * default 2 cells and 63.4s for all 8, so about 8s a cell. The eight-cell accent
 * matrix is behind CONTRAST_ACCENTS=1 and is OFF by default; turning it on finds
 * 739 distinct failing pairs — the count the matrix test prints at the foot of
 * this file — against the 185 of the ledger total asserted below, because the
 * accent families carry different literals under Phoenix, Ocean and Emerald and
 * would each need their own ledger entries. Both numbers are re-readable from a
 * run rather than remembered. Whether it ever runs in CI is undecided.
 * stories/a11y.test.js made the same trade explicitly, so the precedent is to
 * say so rather than drop it quietly. Anyone adding a cell should know they are
 * buying ~8s of every `npm test`, forever.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LEDGER IS WRITTEN BY HAND ON PURPOSE. DO NOT BUILD A SCRIPT THAT
 * REGENERATES IT.
 *
 * The mandatory `why` on every entry is the anti-automation device. A
 * regenerator would have to invent the sentence explaining why bucket B's four
 * dark accent rows — its `count` a screen below — are acceptable debt, and it
 * cannot, so the entries stay attached to a person who decided. Contrast this
 * with stories/danger-colour.test.js, whose AT_REST_EXEMPT keys on a CSS
 * SELECTOR PARSED OUT OF THE SOURCE and whose test at :141 fails when an
 * exemption stops naming a live rule. That ledger cannot rot, because a rename
 * breaks it. This one keys on a MEASUREMENT, which changes whenever a token
 * moves — so it needs a human, and the `why` is where the human is.
 *
 * Counts are asserted with ===, never as a ceiling. A ceiling would let a fix in
 * one row mask a regression in another inside the same bucket. An exact count
 * costs a one-line edit whenever a story is added that renders an
 * already-failing component, and that edit is the point: a human then looks at
 * the new row. A total ceiling over everything means a finding that matches no
 * bucket has nowhere to hide.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import {
  AA_TEXT,
  composite,
  groupFindings,
  kitCssFor,
  parseColour,
  ratio,
  rgbOf,
  substitute,
  tokensFor,
  walkStories,
} from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const THEMES = ['dark', 'light'];
const ACCENT = 'default';
const ACCENTS = ['default', 'phoenix', 'ocean', 'emerald'];

// Two stories whose SUBJECT is colour itself. They render raw brand primitives
// and superseded token values on purpose, so they are cited by story rather than
// by token — the failing pairs are the documentation, not a defect in it.
const DOC_STORIES = {
  PALETTE: 'foundations/BrandPrimitives.stories.js:Palette',
  SIGNAL: 'foundations/SignalContrast.stories.js:Diagnosis',
};

/**
 * One entry per CAUSE, not per row.
 *
 * `fg` names a TOKEN, resolved per theme at run time, so moving a token's value
 * does not silently re-point a bucket at a different colour — it changes the
 * count, and the count is asserted exactly.
 */
const LEDGER = [
  {
    id: 'A',
    fg: '--pink',
    themes: ['dark'],
    bg: 'the hovered danger row of a table, tinted by --glow-pink',
    example: 'span.ui-badge.ui-badge--danger',
    count: 1,
    worst: 4.14,
    why: 'The danger signal painted on its own tint is the kit\'s only danger cue at rest, '
      + 'and #156 moved --pink in both themes so it clears the surfaces it is drawn on. What '
      + 'survives is the hover state of a danger badge inside an already-tinted table row: two '
      + 'washes stacked, which the token move was never going to reach. It is a '
      + 'badge beside legible text, not the only carrier of the meaning, so it is debt rather '
      + 'than a defect. Fixing it means deciding whether a tinted row may tint its badges again. '
      + 'The floor moved once since: the wash under it is a color-mix of --accent '
      + '(src/styles/table.css), so #157 lifting the dark accent lifted this ground with it and '
      + 'took the pair down. Same row, same cause, a slightly deeper worst.',
  },
  {
    id: 'B',
    fg: '--accent',
    themes: ['dark'],
    bg: 'grounds mixed from the accent itself, in the dark theme',
    example: 'span.ui-dropdown__badge.is-accent',
    count: 4,
    worst: 3.97,
    why: 'This was the largest bucket in the ledger until #157 lifted the dark accent onto '
      + '--purple-mid and thinned its wash. That closed every row whose ground was --glow-purple — '
      + 'the wash a component reaches for by token — and what is left is the shape a token value '
      + 'reaches only at a price nobody has agreed to pay: a ground a component mixes for itself '
      + 'out of the very ink that will be read on it. Such a ground DOES rise with the accent, but '
      + 'it rises by a fraction of the accent\'s own rise — that is what the mix percentage means — '
      + 'so the pair opens rather than holding, and a light enough accent does close it. That is '
      + 'the honest statement and it is weaker than the one this entry used to make. What keeps '
      + 'these rows here is not arithmetic but the brand: the accent that closes them is well past '
      + 'the point where it is still this violet, and #96 and #157 both chose the hue before the '
      + 'ratio. So they are debt with a known price, not an impossibility. Three rules remain, '
      + 'over four rows. The dropdown badge (src/styles/dropdown.css) is the kit\'s own and is two '
      + 'of them: its ground is the mix over whatever the row beneath is, and the row lightens to '
      + '--surface when hovered or focused, which is exactly where it fails. It should follow the '
      + 'nav badge, which takes --glow-purple on a base surface and, on an active row, the row\'s '
      + 'own raised surface instead of stacking the wash on top of it; #157 changed that rule when '
      + 'it found the stacked pair below the floor, and the badge clears on both grounds now. The '
      + 'replay control is styled inside the motion story, fails only in its hover state, and '
      + 'belongs to whoever owns that story. The last row is the odd one out: the hovered copy '
      + 'control on the green-tinted snippet bar of a live card, whose ground is not mixed from '
      + 'the accent at all and so does not rise when the accent does. Walked across all eight '
      + 'theme x accent cells it fails in three of them — dark Nebula, Phoenix and Ocean — and '
      + 'clears under dark Emerald and in every light cell, so it is a fixed dark bar that three '
      + 'of the four dark accents sit too close to rather than a pair any one accent owns. '
      + 'Darkening the bar closes all three at once, which is why it belongs to the snippet and '
      + 'card owners and not to a token here. The "soon" badge on an '
      + 'accent-tinted card was a dark row here until #157 moved --purple-mid up a step behind the '
      + 'accent; the dark row now clears, and the light one it always had lives in bucket F. #157 '
      + 'records the rest rather than closing them.',
  },
  {
    id: 'C',
    fg: '--green',
    themes: ['light'],
    bg: 'the success wash and plain white in the light theme',
    example: 'div.ui-sx__eyebrow',
    count: 4,
    worst: 3.92,
    why: 'Light --green has to stay recognisably green while carrying text, and green is the '
      + 'hue that darkens worst without turning into a colour nobody reads as success. #155 '
      + 'took the live pill and the badge over the line; what is left is the eyebrow on the '
      + 'success screen and the shell glyphs in a revealed snippet. Each of these repeats a '
      + 'meaning that is already carried by an icon or by '
      + 'wording next to it, which is why they were allowed to lag the components that carry '
      + 'meaning alone. The toast action used to be here too, on its own soft wash and again on '
      + 'the outline card, and #131 closed those rows: the action is the one part of a toast '
      + 'that is both the status colour and a piece of text, so it stopped taking the accent and '
      + 'took the text-grade chip ink instead. That left the rows above, which are not the '
      + 'accent used as text but the accent used as itself. The floor moved once before that: '
      + '#158 re-tinted --glow-green from a colour '
      + 'that matched no token to an exact tint of --green, which darkened the success wash by '
      + 'about one level per channel and took the toast action down with it — which is how deep '
      + 'the bucket was when the action left it.',
  },
  /* D — --signal-solid-ink on a solid toast's fill under the action's hover wash —
     is closed. #131 did what this entry's own `why` said the fix was: the hover
     darkens the fill with a wash of --signal-contrast instead of lightening the
     ink towards it. Deleted rather than zeroed, because a bucket holding nothing
     matches nothing and would pass whatever happened to that surface next. */
  {
    id: 'E',
    fg: '--cyan',
    themes: ['light'],
    bg: 'the info wash and plain white in the light theme',
    example: 'div.ui-snippet > pre > span.f',
    count: 2,
    worst: 3.53,
    why: 'Cyan in the light theme is the same problem as green and for the same reason: the hue '
      + 'runs out of room before it runs out of contrast. #155 moved the info badge; what is '
      + 'left is the flag and URL '
      + 'fragments the snippet colours inside a shell command. The snippet fragments are syntax '
      + 'highlighting, where the colour is a second signal on top of text that is already '
      + 'readable in its own right. The outline toast\'s action and its hovered state were here '
      + 'too until #131, which gave the action the text-grade info ink rather than the accent — '
      + 'a toast action is read as text, a syntax fragment is read as a hint over text that is '
      + 'already legible, and that difference is why one moved and the other stays.',
  },
  {
    id: 'F',
    fg: '--purple-mid',
    themes: ['light'],
    bg: 'the accent-tinted card, under the "soon" badge',
    example: 'span.ui-badge.ui-badge--soon',
    count: 1,
    worst: 4.48,
    why: 'The "soon" status is deliberately the quietest thing the kit can render — it marks '
      + 'something that does not exist yet and must not compete with what does. It is set in '
      + 'the mid purple on a purple wash, which is the same ink-on-its-own-hue problem as the '
      + 'accent bucket, chosen here on purpose. This was a two-theme entry until #157, which moved '
      + 'the dark accent up onto --purple-mid and then moved the ramp up a step behind it, so dark '
      + '--purple-mid is a lighter colour than it was and its "soon" row clears. The dark row is '
      + 'therefore gone from the ledger, not relocated: the two tokens tell each other apart in '
      + 'both themes again, and there is no dark row left for this entry to hold. `themes` is a '
      + 'matcher, so it names only light, where the pair still fails — a dark row appearing here '
      + 'later should be looked at by a person, which is what leaving it out makes happen. Nobody '
      + 'owns it: the decision to '
      + 'make is whether a status that means "not yet" is allowed to sit below the floor, and if '
      + 'not, whether it stops being purple or stops being washed.',
  },
  {
    id: 'H',
    fg: '--muted',
    themes: ['dark'],
    bg: 'the snippet\'s shell bar, which is lighter than the card it sits in',
    example: 'button.ui-snippet__copy',
    count: 1,
    worst: 4.00,
    why: 'The copy control on a snippet\'s title bar is muted so the command itself reads first, '
      + 'and the bar it sits on is lifted off the card for the same reason. The two moves are '
      + 'individually right and together they close the gap. It is a single control with a '
      + 'permanent visible label, so nothing is lost to a reader who does not resolve the ink — '
      + 'but it is one step from the floor and would be cheap to fix by darkening the bar '
      + 'rather than the ink. Unfiled.',
  },
  {
    id: 'P',
    story: DOC_STORIES.PALETTE,
    count: 130,
    worst: 1.06,
    why: 'The brand primitives page draws every raw ramp swatch with its hex printed on top of '
      + 'itself, in a fixed low-alpha black that stays put while the swatch behind it runs from '
      + 'near-black to white. Most of that run cannot clear the floor and is not supposed to: '
      + 'the label is documentation OF a colour, positioned on the colour it names so the reader '
      + 'can see them together. Making each label legible would mean flipping its ink partway '
      + 'down the ramp, which is a different page. This bucket exists so the other buckets are '
      + 'not buried under it.',
  },
  {
    id: 'S',
    story: DOC_STORIES.SIGNAL,
    count: 42,
    worst: 2.66,
    why: 'The signal-contrast page is the written record of why the signal tokens hold the '
      + 'values they hold, and it works by painting the values they USED to hold beside the ones '
      + 'they hold now. The failures it reports are the exhibits — pairs that were replaced '
      + 'precisely because they failed, kept on the page so the comparison is visible rather '
      + 'than asserted. A gate that demanded this page pass would delete the evidence. It is '
      + 'cited by story rather than by token for that reason: the tokens on it are historical, '
      + 'and matching them by name would tie this entry to values nobody ships.',
  },
];

// ---- the walk, once -------------------------------------------------------

const walk = {
  findings: [], stats: {}, problems: [], elapsed: 0, storyIds: new Set(),
  // Instrumentation about the RESOLVER, kept apart from `stats`, which is about
  // the kit. Nothing here is a fact about the catalogue.
  cache: { queries: 0, lookups: 0, routedWrites: 0 },
};

before(async () => {
  const started = Date.now();
  const records = [];
  for (const theme of THEMES) {
    const r = await walkStories({ theme, accent: ACCENT, states: true });
    records.push(...r.records);
    walk.problems.push(...r.problems);
    for (const id of r.stats.storyIds) walk.storyIds.add(id);
    for (const [k, v] of Object.entries(r.stats)) {
      if (typeof v === 'number') walk.stats[k] = (walk.stats[k] || 0) + v;
    }
    for (const k of Object.keys(walk.cache)) walk.cache[k] += r.cache[k];
    walk.stats.uaBlue = (walk.stats.uaBlue || []).concat(r.stats.uaBlue);
  }
  walk.elapsed = Date.now() - started;
  walk.records = records;
  walk.findings = groupFindings(records);
});

/** The buckets a finding belongs to. Doc buckets and token buckets are disjoint
 *  by construction: a finding produced only by a documentation story can match
 *  nothing but that story's entry. */
function bucketsFor(finding) {
  const docOnly = [...finding.stories].every((s) => Object.values(DOC_STORIES).includes(s));
  return LEDGER.filter((e) => {
    if (e.story) return docOnly && [...finding.stories].every((s) => s === e.story);
    if (docOnly) return false;
    if (!e.themes.includes(finding.theme)) return false;
    const token = tokensFor(finding.theme, ACCENT).get(e.fg);
    return token != null && finding.fg === rgbOf(token);
  });
}

const show = (f) => `${f.ratio.toFixed(2)} (needs ${f.need}) ${f.key}\n      ${[...f.paths][0]}\n      in ${[...f.stories].join(', ')}`;

// ---- the gate -------------------------------------------------------------

test('every story renders — a story the walk cannot mount is not covered', () => {
  assert.equal(
    walk.problems.length, 0,
    `\n${walk.problems.join('\n')}\n\nA story that will not render silently drops out of the `
    + 'gate. Fix the story or the harness; do not skip it.',
  );
});

test('every finding falls in exactly one ledger bucket', () => {
  const homeless = [];
  const ambiguous = [];
  for (const f of walk.findings) {
    const hits = bucketsFor(f);
    if (hits.length === 0) homeless.push(show(f));
    if (hits.length > 1) ambiguous.push(`${show(f)}\n      matches ${hits.map((h) => h.id).join(', ')}`);
  }
  assert.equal(
    homeless.length, 0,
    `\n${homeless.length} contrast failure(s) match no ledger entry:\n\n${homeless.join('\n\n')}\n\n`
    + 'Either fix the pair, or add an entry naming the CAUSE with a hand-written `why` saying '
    + 'why it is acceptable debt and who owns it.',
  );
  assert.equal(
    ambiguous.length, 0,
    `\nA finding matched more than one bucket, so the counts double-count:\n\n${ambiguous.join('\n\n')}`,
  );
});

for (const entry of LEDGER) {
  test(`ledger ${entry.id}: ${entry.story || `${entry.fg} on ${entry.bg}`}`, () => {
    const rows = walk.findings.filter((f) => bucketsFor(f).some((e) => e.id === entry.id));
    assert.equal(
      rows.length, entry.count,
      `\nbucket ${entry.id} holds ${rows.length} finding(s), the ledger says ${entry.count}.\n\n`
      + `${rows.map(show).join('\n\n')}\n\n`
      + 'The count is exact on purpose — a ceiling would let a fix in one row hide a regression '
      + 'in another. If this shrank, delete the rows from the count and say so. If it grew, a '
      + 'human looks at the new row before the number moves.',
    );
    const worst = Math.min(...rows.map((r) => r.ratio));
    assert.ok(
      worst >= entry.worst - 0.005,
      `\nbucket ${entry.id}'s worst pair fell to ${worst.toFixed(2)}; the ledger floor is `
      + `${entry.worst}. A regression can deepen a bucket without changing its size.`,
    );
  });
}

test('the ledger totals exactly what the walk found', () => {
  const total = LEDGER.reduce((n, e) => n + e.count, 0);
  assert.equal(
    walk.findings.length, total,
    `the walk found ${walk.findings.length} distinct failing pairs; the ledger accounts for `
    + `${total}. A finding that matches no bucket has nowhere to hide.`,
  );
});

// ---- anti-vacuity: a scan that matches nothing passes everything ----------

test('the ledger is not empty and every entry carries a hand-written why', () => {
  assert.ok(LEDGER.length >= 5, 'an emptied ledger would make every assertion above vacuous');
  for (const e of LEDGER) {
    assert.ok(e.why && e.why.length > 200, `ledger ${e.id} has no real \`why\` — see this file's header`);
    assert.ok(
      !/\d+(\.\d+)?\s*:\s*1|\b\d\.\d{2}\b/.test(e.why),
      `ledger ${e.id}'s \`why\` quotes a ratio. Numbers live in \`count\` and \`worst\`, which `
      + 'the assertions read; the prose is about the cause and must survive a token moving.',
    );
  }
});

test('every ledger entry still names something the kit renders', () => {
  for (const e of LEDGER) {
    if (e.story) {
      assert.ok(
        walk.storyIds.has(e.story),
        `ledger ${e.id} cites ${e.story}, which no longer renders — the bucket would match `
        + 'nothing and pass by default',
      );
      continue;
    }
    const rows = walk.findings.filter((f) => bucketsFor(f).some((x) => x.id === e.id));
    assert.ok(
      rows.some((r) => [...r.paths].some((p) => p.includes(e.example))),
      `ledger ${e.id}'s example selector \`${e.example}\` matches none of its own findings — `
      + 'the entry is citing a rule that no longer exists',
    );
    assert.ok(tokensFor(e.themes[0], ACCENT).has(e.fg), `ledger ${e.id} names token ${e.fg}, which is gone`);
  }
});

test('the walk actually walked — a scan that finds nothing must not pass', () => {
  assert.ok(walk.stats.judged > 5000, `only ${walk.stats.judged} pairs were judged; the walk is not reaching the kit`);
  assert.ok(walk.stats.stories > 150, `only ${walk.stats.stories} story renders across both themes`);
  assert.ok(walk.findings.length > 0, 'the walk found nothing at all, which means it is measuring nothing');
  assert.ok(
    walk.stats.unjudgeable > 0,
    'no element reported an image or gradient background — the unjudgeable path is dead code, '
    + 'which means gradients are being silently composited instead',
  );
});

test('the style cache watched the real walk, so its guard is not dead code', () => {
  // Anti-vacuity for the invariant in makeStyleCache. The guard refuses to
  // answer a read after a DOM write that did not go through `mutate`, and it
  // learns about writes from a MutationObserver. A watcher that was attached to
  // the wrong node, or never attached, would report nothing and permit
  // everything — silently, exactly like a source scan whose pattern stops
  // matching. This asserts the watcher saw the walk's own writes: the state
  // passes toggle data-ui-state on and off around every stateful element and
  // replace the body once per story, and every one of those arrives at the
  // watcher as a record. Zero means the guard is watching nothing.
  assert.ok(
    walk.cache.routedWrites > 1000,
    `the style cache's watcher saw only ${walk.cache.routedWrites} DOM mutation record(s) across `
    + 'the whole walk. It should see thousands — one per data-ui-state toggle plus the body '
    + 'replacement per story. A watcher that sees nothing can never fire, so the `mutate` '
    + 'invariant would be enforced by comment again.',
  );
});

// ---- self-checks: does the resolver reach the real cascade? ---------------

test("the dark theme's body text resolves to its known ratio", () => {
  const vars = tokensFor('dark', ACCENT);
  assert.equal(vars.get('--text'), '#e9e7f0');
  assert.equal(vars.get('--bg'), '#16151f');
  const r = ratio(parseColour(vars.get('--text')), parseColour(vars.get('--bg')));
  assert.ok(Math.abs(r - 14.7725) < 0.005, `--text on --bg resolved to ${r}, not the known 14.77`);
});

test('no computed colour anywhere in the walk is the user-agent link blue', () => {
  // Guards the A2 rewrite. Before it, three table links reported rgb(0, 0, 238)
  // and produced false failures at the bottom of the list.
  assert.deepEqual(
    walk.stats.uaBlue, [],
    'an anchor resolved to JSDOM\'s UA blue instead of the kit\'s colour — expandAnchors is no '
    + 'longer reaching the bare `a` rule in src/styles/base.css',
  );
});

test('a color-mix background resolves to a translucent colour, not to transparent', () => {
  assert.ok(
    walk.stats.colorMixTranslucent > 0,
    'nothing in the walk composited a translucent layer. Every tinted surface in the kit is a '
    + 'color-mix; if none resolved, the backgrounds being measured are not the real ones',
  );
});

test('the five toast statuses resolve to five different accents and five different action inks', () => {
  // Guards the A1 rewrite. Before it, --toast-accent flattened first-wins and
  // all five statuses reported the success green.
  //
  // Two properties are probed, not one. A toast's status rule sets --toast-accent
  // for the graphic marks and --toast-action-ink for the one mark that is text,
  // and #131 split them because in the light theme they cannot be the same value.
  // A flattening bug does not care which property it hits, so a probe that read
  // only one of them would leave the other guarded by nothing. They are read off
  // different elements on purpose: the timer bar is the accent at its plainest —
  // an opaque background, no mix, no state — and the action is the ink.
  const accents = {
    success: '--green', danger: '--pink', warn: '--amber', info: '--cyan', neutral: '--muted',
  };
  const inks = {
    success: '--chip-success-ink',
    danger: '--chip-danger-ink',
    warn: '--chip-warn-ink',
    info: '--chip-info-ink',
    neutral: '--muted',
  };
  for (const theme of THEMES) {
    const { vars, css } = kitCssFor(theme, ACCENT);
    const html = Object.keys(accents)
      .map((s) => `<div class="ui-toast ui-toast--${s}" id="t-${s}">`
        + '<div class="ui-toast__timer"></div><button class="ui-toast__action">Go</button></div>')
      .join('');
    const win = new JSDOM(
      `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
      + `<body>${html}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    const probes = [
      ['accent', '.ui-toast__timer', 'backgroundColor', accents],
      ['action ink', '.ui-toast__action', 'color', inks],
    ];
    for (const [what, sel, prop, tokens] of probes) {
      const seen = new Set();
      for (const [status, token] of Object.entries(tokens)) {
        const el = win.document.querySelector(`#t-${status} ${sel}`);
        const got = win.getComputedStyle(el)[prop];
        // Through `substitute`, because a token may be declared as an alias of
        // another: dark's --chip-*-ink ARE the dark accents, written as var().
        assert.equal(
          got, rgbOf(substitute(vars.get(token), vars)),
          `in ${theme}, the ${status} toast's ${what} resolved to ${got}, not ${token}. `
          + 'A contextual custom property has flattened — every toast is reporting one status\'s colour.',
        );
        seen.add(got);
      }
      assert.equal(
        seen.size, 5,
        `the five toast ${what}s collapsed to ${seen.size} colour(s) in ${theme}`,
      );
    }
    win.close();
  }
});

test('the style cache is still serving four reads in five from memory', () => {
  // THE DETERMINISTIC HALF OF THE COST GATE. The wall-clock ceiling below cannot
  // see a 2x regression through machine noise, and says so. This can: the walk
  // asks for a computed style a fixed number of times for a fixed catalogue, and
  // how many of those reach JSDOM is arithmetic, not weather. Two identical runs
  // give identical numbers.
  //
  // THE NUMBERS. Measured over both default cells: 138,534 queries — every read
  // the walk performs, which is exactly the number of getComputedStyle calls the
  // walk made before the cache existed — of which 28,706 miss and reach JSDOM.
  // A miss rate of 0.2072.
  //
  // WHY A RATIO AND NOT THE 28,706. The absolute count is a fact about the
  // catalogue as much as about the cache: it moves every time a story is added,
  // so an exact assertion on it would have to be re-pinned by whoever adds one,
  // and the number they would re-pin it to carries no judgement. The miss rate
  // is the quantity the cache actually controls. It was 1.0 by definition before
  // the cache existed, it is 0.2072 now, and adding a story moves the numerator
  // and the denominator together — the two themes, which walk identical markup
  // through different colours, agree to three decimal places (0.2068 / 0.2077).
  // The absolute figures are logged rather than asserted, so a human reading a
  // CI log still sees them move.
  //
  // THE CEILING. 0.30: about 1.45x today's rate, and comfortably below the 0.41
  // a doubling of lookups would produce. A single added story cannot shift an
  // aggregate over 138,534 reads by that much, so this does not tax the person
  // adding one. What trips it is the cache being neutered, or a DOM write
  // appearing inside the per-element loop — either of which turns hits back into
  // misses across the whole walk.
  //
  // WHAT IT DOES NOT SEE, stated because the wall-clock note below earns its
  // keep by being honest about the same thing: a new ancestor walk that reads
  // through the cache and hits every time raises `queries` and leaves `lookups`
  // alone, which moves this ratio DOWN while making the walk slower. The miss
  // rate is a gate on the cache, not on the walk's shape.
  const { queries, lookups } = walk.cache;
  console.log(
    `contrast walk: ${lookups} style lookups served from ${queries} reads `
    + `(miss rate ${(lookups / queries).toFixed(4)}), ${walk.cache.routedWrites} DOM writes`,
  );
  assert.ok(
    queries > 50000,
    `only ${queries} style reads were made; the ratio below would be measuring almost nothing`,
  );
  const missRate = lookups / queries;
  assert.ok(
    missRate < 0.30,
    `the style cache's miss rate rose to ${missRate.toFixed(4)} (${lookups} lookups from ${queries} `
    + 'reads), against a ceiling of 0.30 set from a measured 0.2072. Unlike the wall clock this is '
    + 'deterministic, so this is a real regression and not a busy machine: either the memo stopped '
    + 'being kept, or something started writing to the DOM inside the walk\'s per-element loop and '
    + 'is dropping the memo on every element.',
  );
});

test('the walk has not run away with the clock', () => {
  // WHAT THIS NUMBER IS. Measured on a 10-core laptop, two default cells:
  // 15.7-16.5s run alone, 16.4-18.3s inside `npm test` where it shares those
  // cores with 21 other files, and 47.6s with all ten cores deliberately
  // saturated by competing processes. The ceiling is set off that last number,
  // not the first: 120s is ~2.5x the worst measurement and ~7x the normal one.
  //
  // WHAT IT PROTECTS AGAINST, stated narrowly because a ceiling that overstates
  // itself is worse than none. It catches a runaway — a walk that stopped
  // terminating, or a theme×accent cell added to THEMES/ACCENT without anyone
  // costing it, which is ~8s each and 63s for all eight. It does NOT catch a 2x
  // performance regression, and no wall-clock number can: contention alone
  // spans 3x on one machine, so any threshold tight enough to see a doubling
  // flakes on a busy laptop, and a ceiling that flakes gets deleted by the next
  // person. The doubling is the miss-rate test's job, immediately above; the two
  // are kept apart because they fail for different reasons. A runaway shows up
  // here and not there — a walk that stopped terminating keeps a perfectly good
  // miss rate — and a doubling shows up there and not here.
  console.log(
    `contrast walk: ${(walk.elapsed / 1000).toFixed(1)}s for ${THEMES.length} theme×accent cell(s), `
    + `${walk.stats.judged} pairs judged, ${walk.findings.length} distinct failures`,
  );
  assert.ok(
    walk.elapsed < 120000,
    `the contrast walk took ${(walk.elapsed / 1000).toFixed(1)}s, against a 120s ceiling set from `
    + 'a measured worst case of 47.6s on a fully contended 10-core laptop. It is the critical '
    + 'path in `npm test` and sets the whole suite\'s wall clock. At this margin the cause is not '
    + 'a slow machine: either the walk stopped terminating, or theme×accent cells were added '
    + 'without anyone costing them.',
  );
});

// ---- the walker's structural blind spot ----------------------------------

test('every chip ink/fill token pair clears AA, whether or not a story renders it', () => {
  // The walk sees what the catalogue renders. A token pair that no story puts on
  // screen is invisible to it — and the chip pairs exist precisely so a status
  // badge can be built without reaching for a raw signal token, which means a
  // new consumer can appear long after the pair was last looked at. Derived from
  // token NAMES so a family added to tokens.css is judged with no edit here.
  const src = readFileSync(path.join(root, 'src/tokens/tokens.css'), 'utf8');
  const families = [...new Set([...src.matchAll(/--chip-([a-z]+)-ink\s*:/g)].map((m) => m[1]))];

  assert.ok(
    families.length >= 3,
    `only ${families.length} chip families were derived from src/tokens/tokens.css. A rename `
    + 'would make this test pass by matching nothing, which is the failure mode it exists to avoid.',
  );

  const problems = [];
  for (const theme of THEMES) {
    const { vars, css } = kitCssFor(theme, ACCENT);
    // Mounted rather than parsed: a dark chip fill is a color-mix(), and JSDOM
    // is what resolves that into a colour with an alpha channel.
    const probes = families
      .map((f) => `#chip-${f}{color:var(--chip-${f}-ink);background:var(--chip-${f}-fill)}`)
      .join('');
    const win = new JSDOM(
      `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style>`
      + `<style>${substitute(probes, vars)}</style></head><body>`
      + `${families.map((f) => `<span id="chip-${f}">x</span>`).join('')}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    const page = parseColour(substitute(vars.get('--bg'), vars));
    for (const family of families) {
      const cs = win.getComputedStyle(win.document.getElementById(`chip-${family}`));
      const ink = parseColour(cs.color);
      const fill = parseColour(cs.backgroundColor);
      if (!ink || !fill) {
        problems.push(`${theme} ${family}: ink or fill did not resolve (${cs.color} / ${cs.backgroundColor})`);
        continue;
      }
      const r = ratio(ink, composite(fill, page));
      if (r < AA_TEXT) problems.push(`${theme} --chip-${family}-ink on --chip-${family}-fill is ${r.toFixed(2)}`);
    }
    win.close();
  }
  assert.deepEqual(
    problems, [],
    `\n${problems.join('\n')}\n\nA chip pair is the ink and fill of a status badge. Both halves `
    + 'move together or neither does; fix the pair in src/tokens/tokens.css.',
  );
});

// ---- the accent matrix, off by default -----------------------------------

test('every theme × accent cell, behind CONTRAST_ACCENTS=1', { skip: !process.env.CONTRAST_ACCENTS }, async () => {
  const records = [];
  for (const theme of THEMES) {
    for (const accent of ACCENTS) {
      const r = await walkStories({ theme, accent, states: true });
      records.push(...r.records);
    }
  }
  const found = groupFindings(records);
  // The accent families carry different literals under Phoenix, Ocean and
  // Emerald, so the default ledger cannot account for these. This asserts only
  // that the matrix runs and still measures something — per-accent entries are
  // an undecided question, recorded in the plan, not smuggled in here.
  assert.ok(found.length >= walk.findings.length, 'the matrix found fewer pairs than the two default cells');
  console.log(`CONTRAST_ACCENTS: ${THEMES.length * ACCENTS.length} cells, ${found.length} distinct failing pairs`);
});
