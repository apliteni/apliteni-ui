/* The hand-written ledger stories/contrast.test.js checks every finding against, pulled out
 * so the dark and light walks (stories/contrast-dark.test.js, stories/contrast-light.test.js)
 * can both check against the one list rather than two copies drifting apart.
 *
 * why: #562 split the walk by theme so each file stays inside its own time budget; the ledger
 * itself did not change, and `STORY_BUCKET_COUNTS` records what was already true before the
 * split — a story-cited bucket's rows have always split evenly between the two themes, measured
 * directly rather than assumed: `dark` findings 87, `light` findings 89, both matching this
 * ledger's totals exactly.
 */
import { rgbOf, tokensFor } from './contrast.js';

// Two stories whose SUBJECT is colour itself. They render raw brand primitives
// and superseded token values on purpose, so they are cited by story rather than
// by token — the failing pairs are the documentation, not a defect in it.
export const DOC_STORIES = {
  PALETTE: 'foundations/BrandPrimitives.stories.js:Palette',
  SIGNAL: 'foundations/SignalContrast.stories.js:Diagnosis',
};

/**
 * One entry per CAUSE, not per row. Written by hand on purpose: the mandatory
 * `why` is the anti-automation device, so do not build a regenerator.
 *
 * Review changed measurements and explain accepted failures by hand.
 *
 * `fg` names a TOKEN, resolved per theme at run time, so moving a token's value
 * does not silently re-point a bucket at a different colour — it changes the
 * count, and the count is asserted exactly.
 */
export const LEDGER = [
  // #344 removes tinted table rows, resolving former bucket A's stacked-wash failure.
  {
    id: 'B',
    fg: '--accent',
    themes: ['dark'],
    bg: 'grounds mixed from the accent itself, in the dark theme',
    example: 'button.mz-replay',
    count: 1,
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
      + 'ratio. These are historical findings: #393 cleared the snippet hover with --strong. '
      + 'Only the replay control remains. The dropdown badge (src/styles/dropdown.css) left at #295: '
      + 'its ground was the mix over whatever the row beneath it is, and the row lightens to '
      + '--surface when hovered or focused, which is exactly where it failed. It takes the shape '
      + 'the nav badge already had — --glow-purple on a base surface, and on a raised one that '
      + 'surface itself rather than the wash stacked on top of it. #157 wrote that rule when it '
      + 'found the stacked pair below the floor; #295 applied it here, because the elevation '
      + 'ladder made the panel the badge sits in a raised surface and a wash over a raised '
      + 'surface sits closer to the ink than a wash over the page. The '
      + 'replay control is styled inside the motion story, fails only in its hover state, and '
      + 'belongs to whoever owns that story. The other row is the odd one out: the hovered copy '
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
    bg: 'plain white in the light theme',
    example: 'span.s',
    count: 1,
    worst: 4.45,
    why: 'Light --green has to stay recognisably green while carrying text, and green is the '
      + 'hue that darkens worst without turning into a colour nobody reads as success. #155 '
      + 'took the live pill and the badge over the line; what is left is the string token a '
      + 'snippet highlights — shell arguments, and since #474 JSON string values and '
      + 'TypeScript literals too. #393 removed the reveal label and value '
      + 'from this bucket by using text-grade success ink. #429 removed the other row this '
      + 'bucket still carried, and it was the deeper of the two: the confirmation eyebrow is '
      + 'gone from the markup and the stylesheet, because a confirmation now carries one title '
      + 'and at most one line and has no label tier to paint. Deleting the element rather than '
      + 'recolouring it is why the count drops and the floor rises in the same change. A shell '
      + 'argument repeats a '
      + 'meaning already carried by an icon or nearby wording, so it was allowed to lag components that carry '
      + 'meaning alone; a JSON string value does not, and that part of the bucket is larger in '
      + 'kind than when this entry was written. It stays accepted because the value IS the text '
      + 'a reader reads rather than a hint over it, and because closing it means re-picking '
      + '--green for the light card — a palette decision, not a component one. It sits just '
      + 'under the floor on white, which `worst` records. The toast action used to be here too, on its own soft wash and again on '
      + 'the outline card, and #131 closed those rows: the action is the one part of a toast '
      + 'that is both the status colour and a piece of text, so it stopped taking the accent and '
      + 'took the text-grade chip ink instead. That left the rows above, which are not the '
      + 'accent used as text but the accent used as itself. The floor moved again at #295, and '
      + 'not because any of these rows changed: the light page stopped being white, so every '
      + 'translucent wash in the theme composites over a darker ground now and sits that much '
      + 'closer to the ink read on it. Every pair in this bucket deepened by about the step the '
      + 'page took. The floor moved once before that: '
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
    worst: 3.05,
    why: 'Cyan in the light theme is the same problem as green and for the same reason: the hue '
      + 'runs out of room before it runs out of contrast. #155 moved the info badge; what is '
      + 'left is what the snippet colours cyan: flags and URLs in a shell command, and since '
      + '#474 the scalars in JSON and TypeScript — numbers, true, false, null. In a shell '
      + 'command the colour is a second signal on top of text that is already readable in its '
      + 'own right. On a JSON scalar it is not: in "retries": 3 the 3 is the value, nothing '
      + 'else carries it, and this ink is the only ink it gets. That row is accepted anyway, '
      + 'because the character a reader reads is the value itself rather than a hint about it, '
      + 'and because no token moved at #474 — closing it means re-picking --cyan for the light '
      + 'card, which is a palette decision. The outline toast\'s action and its hovered state were here '
      + 'too until #131, which gave the action the text-grade info ink rather than the accent — '
      + 'a toast action is read as text, a syntax fragment is read as a hint over text that is '
      + 'already legible, and that difference is why one moved and the other stays.',
  },
  /* F — --purple-mid on accent-tinted grounds — has left LEDGER for ALTERNATE_CAUSES
     below, beside L, because the default accent no longer owes it a row. Its one row was
     the landing page's "For agents" badge: a 9% accent wash on a card that was itself a
     9% accent wash. #451 took the light tint to 5%, the ground under the badge lightened
     with it, and the pair cleared the floor. Phoenix and emerald still owe rows against
     the same cause, so the entry moved rather than being deleted — a cause the expanded
     gate still finds is what ALTERNATE_CAUSES is for. */
  /* H — --muted on the snippet's shell bar, which is lighter than the card it sits
     in — is closed. The entry said the cheap fix was to darken the bar rather than
     the ink; #295 did neither and closed it anyway, by re-picking --muted against the
     top of the new elevation ladder. The ink rose, the bar did not, and the pair went
     over the floor. Deleted rather than zeroed, for D's reason: a bucket holding
     nothing matches nothing and would pass whatever happened to that surface next. */
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

/**
 * A story-cited bucket's total split by theme, measured directly rather than assumed: run
 * `walkCells` for one theme at a time and group its own findings. Dark gave 87 total (B 1, P
 * 65, S 21) and light gave 89 (C 1, E 2, P 65, S 21) — both themes owe this bucket the same
 * count, because the documentation pages that cause it do not change shape between themes.
 */
export const STORY_BUCKET_COUNTS = { P: 65, S: 21 };

/** The buckets a finding belongs to. Doc buckets and token buckets are disjoint
 *  by construction: a finding produced only by a documentation story can match
 *  nothing but that story's entry. */
export function bucketsFor(finding, ledger = LEDGER) {
  const docOnly = [...finding.stories].every((s) => Object.values(DOC_STORIES).includes(s));
  return ledger.filter((e) => {
    if (e.story) return docOnly && [...finding.stories].every((s) => s === e.story);
    if (docOnly) return false;
    if (!e.themes.includes(finding.theme)) return false;
    const token = tokensFor(finding.theme, finding.accent).get(e.fg);
    return token != null && finding.fg === rgbOf(token);
  });
}

export const show = (f) => `${f.ratio.toFixed(2)} (needs ${f.need}) ${f.key}\n      ${[...f.paths][0]}\n      in ${[...f.stories].join(', ')}`;

// #455, reviewed by hand: card-ground snippets raise C/E to 4.45/3.81.
// Soon badges and pills use accent ink on the card and leave F; the remaining
// rows are the hero eyebrow (Phoenix/Emerald) and snippet keyword (Emerald).
// No new failure is accepted; dark cells and the existing P/S/L causes stay put.
export const ALTERNATE_CAUSES = [...LEDGER, {
  id: 'F',
  fg: '--purple-mid',
  themes: ['light'],
  bg: 'the hero eyebrow wash and snippet keywords under middle-ramp ink',
  why: 'The remaining middle-ramp failures are the hero eyebrow in two light accents and '
    + 'the snippet keyword in Emerald. Their existing limitation is recorded under #376. '
    + 'The eyebrow keeps a wash of its own hue and the keyword keeps the middle-ramp ink; '
    + 'neither is badge text. #455 moves Soon badges and pills to accent ink on the card '
    + 'surface, so those rows are removed. The snippet reading surface also improves '
    + 'contrast, but does not bring its Emerald keyword to the text floor.',

}, {
  id: 'L',
  fg: '--accent',
  themes: ['light'],
  bg: 'the motion replay control, under its hover wash',
  why: 'The motion documentation mixes the replay hover background from the accent ink. '
    + 'The light alternate-accent inks work on the plain page but fail on this darker background. '
    + 'This is existing story-local debt found by the expanded gate. It remains under #376 '
    + 'because this change is authorised to measure colours, not to choose replacements. '
    + 'The motion story owner must change the hover background or choose another text ink.',
}];

// Measure counts and floors for each cell. An improvement in one accent must not
// hide a regression in another. LEDGER above explains each cause.
// Run locally: CONTRAST_ACCENTS=1 node --test --test-name-pattern='contrast ledger:' stories/contrast-dark.test.js stories/contrast-light.test.js
// Add CONTRAST_LEDGER_REPORT=1 to print measured values. It does not change the gates.
// Last full report: 2026-09-28, source 9b24b1f, re-run at #451's rework — see below.
export const ACCENT_LEDGER = {
  'dark/phoenix': { B: [1, 4.24], P: [65, 1.06], S: [21, 2.66] },
  'dark/ocean': { B: [1, 4.20], P: [65, 1.06], S: [21, 2.66] },
  'dark/emerald': { P: [65, 1.06], S: [21, 2.66] },
  'light/phoenix': { C: [1, 4.45], E: [2, 3.81], F: [1, 4.35], L: [1, 4.31], P: [65, 1.06], S: [21, 2.66] },
  // No F: #448 lifted this cell's one "soon" row (4.32) over AA. The bucket keeps its entry
  // because phoenix and emerald still owe rows against it.
  'light/ocean': { C: [1, 4.45], E: [2, 3.81], L: [1, 4.46], P: [65, 1.06], S: [21, 2.66] },
  'light/emerald': { C: [1, 4.45], E: [2, 3.81], F: [2, 3.36], L: [1, 4.34], P: [65, 1.06], S: [21, 2.66] },
};
