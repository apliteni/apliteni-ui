// Regenerates docs/reviews/295-popover-variants.html.
//
//   node docs/reviews/295-popover-variants/build-page.mjs docs/reviews/295-popover-variants.html
//
// The review page is the kit's review-page template with one thing replaced: the
// review-data JSON. Rather than keep a second copy of that template, this reads
// docs/reviews/270-back-control.html, keeps everything outside its review-data
// element, and writes this round's data into the middle — so a fix to the shared
// page reaches this one by re-running the script.
import { readFileSync, writeFileSync } from 'node:fs';

const E = '../evidence/295-popover';
const P = '295-popover-variants/variants.html';

// Four frames per option: the list panel and the form popover, each theme, at 1440.
// The 390 evidence for every variant is the four contact sheets, linked from the
// decision context, because each contact sheet already holds all seven treatments.
const frames = (id, name) => [
  { label: `${name} — dropdown panel over a card, light, 1440px`, url: `${E}/${id}-list-light-1440.png`, image: true },
  { label: `${name} — dropdown panel over a card, dark, 1440px`, url: `${E}/${id}-list-dark-1440.png`, image: true },
  { label: `${name} — popover holding a form, light, 1440px`, url: `${E}/${id}-form-light-1440.png`, image: true },
  { label: `${name} — popover holding a form, dark, 1440px`, url: `${E}/${id}-form-dark-1440.png`, image: true },
  { label: `${name} — live, dropdown panel, light`, url: `${P}?v=${id}&frame=list&theme=light` },
  { label: `${name} — live, form popover, dark`, url: `${P}?v=${id}&frame=form&theme=dark` },
];

const sheets = [
  { label: 'All seven side by side — dropdown panel, light, 1440px', url: `${E}/all-list-light-1440.png`, image: true },
  { label: 'All seven side by side — dropdown panel, dark, 1440px', url: `${E}/all-list-dark-1440.png`, image: true },
  { label: 'All seven side by side — form popover, light, 1440px', url: `${E}/all-form-light-1440.png`, image: true },
  { label: 'All seven side by side — form popover, dark, 1440px', url: `${E}/all-form-dark-1440.png`, image: true },
  { label: 'All seven on a phone — dropdown panel, light, 390px', url: `${E}/all-list-light-390.png`, image: true },
  { label: 'All seven on a phone — dropdown panel, dark, 390px', url: `${E}/all-list-dark-390.png`, image: true },
  { label: 'All seven on a phone — form popover, light, 390px', url: `${E}/all-form-light-390.png`, image: true },
  { label: 'All seven on a phone — form popover, dark, 390px', url: `${E}/all-form-dark-390.png`, image: true },
];

const data = {
  id: 'apliteni-ui-295-popover-variants',
  title: 'Now that nothing casts a shadow, how does a floating panel separate from the page?',
  goal: "Pick the treatment that makes the kit's floating surfaces — the dropdown panel, the hover readout, the account and workspace menus, confirm, and the command palette — read as raised, after #295 took every shadow out. The answer must not be flat-and-hairline-only, which is what it is today.",
  constraints: [
    'Placeholder names and figures only. This repository is public, so nothing here is real.',
    'No change to src/ on this branch. Every frame below is drawn by a review prototype (docs/reviews/295-popover-variants/variants.html) that imports the kit’s real stylesheet and its real dropdown, card, field, select and button factories. The winner gets built on a branch of its own.',
    'The floating step, --bg-elevated, is the subject. Cards stay flat: that is #284 and it is not reopened here.',
    '--muted has to clear WCAG AA on whatever the panel becomes. It carries a dropdown row’s description and the readout’s label, and the specification already says the ladder is capped by ink, not by taste.',
    'Nothing merges without Artur’s approval. This branch is pushed; the coordinator opens the pull request.',
  ],
  source: 'https://github.com/apliteni/apliteni-ui/issues/295',
  rounds: [
    {
      id: 'r2',
      title: 'Floating surfaces · round 2 (variants)',
      prior: [
        {
          title: 'The elevation ladder',
          choice: 'Approved — nothing casts, a surface says how high it is with its step and its hairline',
          reason: 'Round 1 of #295, on the branch this one is cut from. The ladder, the light exception at the top step, the deprecated --shadow-* tokens and the glow-is-not-a-shadow distinction are all settled and are not reopened here.',
          source: 'https://github.com/apliteni/apliteni-ui/issues/295',
        },
        {
          title: 'What was asked next',
          choice: 'Offer more solutions for the flat popover',
          reason: 'The reporter, on the approved ladder: "i dont like how flat popover and now - offer more solutions". So this round is about the floating step only, and it is not allowed to answer with a thinner hairline.',
          source: 'https://github.com/apliteni/apliteni-ui/issues/295',
        },
        {
          title: 'Cards are flat',
          choice: 'Settled at #284 — not reopened',
          reason: 'From the brief for this task. A card keeps its step and its hairline whatever is chosen below; only the floating step is in question.',
          source: 'https://github.com/apliteni/apliteni-ui/issues/284',
        },
      ],
      decisions: [
        {
          id: 'separation',
          title: 'How should a floating surface separate from what it covers?',
          context:
            'Every frame is the same scene: the kit’s own dropdown panel, held open over the kit’s own card, on the page — and then the same treatment on a popover holding a small form (two selects and Save / Cancel), which is the surface the complaint was about. Light and dark, 1440px and 390px. The measurement under each option is a WCAG contrast ratio: the step is the panel against the card it covers, the edge is the panel’s outermost line against that card, and the ink is --muted, the faintest text the panel carries (AA is 4.5). Today the panel measures a 1.11 step in dark and 1.05 in light, on a 1px line at 1.27 / 1.18. That is the complaint as a number, and it is why the honest answer is not a better hairline colour. The eight contact sheets under the first option hold all seven treatments side by side — both frames, both themes, 1440px and 390px — and are the fastest way to compare them; the per-option frames below are the close-ups. Recommended: a + b, the two-step edge with the floating drop — the last option. It is the only treatment that moves both themes at once: the second line takes the edge to 1.64 / 1.44 and works identically light and dark, and the drop is the only device that separates by area rather than by one pixel, which is what makes the light frame finally read as raised. It is also the shape GitHub Primer and Vercel Geist already ship — a 1px line in the box-shadow list, then soft drops, reserved for the overlay layer. The cost is one new token and one rewritten sentence in the specification, drafted in full under that option. If you want to keep "nothing casts a shadow" standing exactly as written, take a alone: it is free, it needs no new token, and it still doubles the edge. The research, with the sources and every measurement, is in docs/reviews/295-popover-research.md.',
          recommendation: 'edge-and-drop',
          options: [
            {
              id: 'today',
              title: "Today — the step and one hairline",
              summary: 'What the approved ladder ships: --bg-elevated over --surface, edged by --border. Here as the thing every other option is read against.',
              tradeoff: 'Step 1.11 dark / 1.05 light. Edge 1.27 / 1.18. Ink 5.60 / 6.11. In light, 1.05 is under the level at which most viewers see an edge on a large flat area at all, and the whole separation then rests on a 1px line at 1.18. Costs nothing, because it is already built.',
              evidence: [...frames('today', 'Today'), ...sheets],
            },
            {
              id: 'two-step-edge',
              title: 'a · Two-step edge',
              summary: 'The one line becomes two: --border-strong outside, --border inset one pixel inside it, and the panel inside that. Three tones across two pixels, so the edge reads as a rim rather than a hairline. Raycast’s elevated surfaces do the same thing — an outer ring lighter than the surface and an inner ring darker.',
              tradeoff: 'Edge 1.27 → 1.64 in dark and 1.18 → 1.44 in light, with the same rule in both themes and the ink untouched at 5.60 / 6.11. No new token: --border-strong and --border both ship already. It leaves the specification sentence exactly as written. What it does not do is change the step — the panel is still 1.05 above the card in light — so it makes the panel better drawn rather than higher.',
              evidence: frames('edge', 'Two-step edge'),
            },
            {
              id: 'float-shadow',
              title: 'b · A soft shadow, on floating surfaces only',
              summary: 'The hairline and the step stay; a broad, faint drop is added, and only to the five components on the --bg-elevated step — a menu, a panel, the drawer, a modal, a toast. Vercel Geist leans on borders everywhere and reserves a true box-shadow for popovers and modals; GitHub Primer publishes --shadow-floating-* for exactly that layer and nothing else.',
              tradeoff: 'The only device here that separates by area rather than by one pixel, and the only one whose light frame reads unmistakably as raised: the drop core measures 1.43 against the card in light. In dark it is weak — 1.20 — because the page is already near-black, which is the reason the no-shadow rule existed. Costs one token (--shadow-float, per theme, built from --shadow-ink which already ships) and it is the only option that rewrites the specification. The exception would read: "Nothing in the kit casts a shadow except a surface that floats. A card, a field, a chip and a row say how high they are with two things: their step on a ladder of lightness, and the kit’s hairline around them. A menu, a panel, the drawer, a modal and a toast — the --bg-elevated step and nothing below it — keep those two and add one soft drop, --shadow-float, because they are the only surfaces whose whole job is to be temporarily above something else. The drop is broad and faint, never tight and dark: it separates the panel from what it covers, it does not draw its edge." Four of the five deprecated --shadow-* tokens would stay transparent and unread.',
              evidence: frames('shadow', 'Soft shadow'),
            },
            {
              id: 'frost',
              title: 'c · Frost — a translucent, blurred material',
              summary: 'The panel goes to 78% and blurs what is behind it. This is Radix Themes’ default: panelBackground is translucent, and it is the background for popovers and dropdown menus. Apple’s Liquid Glass is the same idea taken further — the floating layer is a material rather than a shadow.',
              tradeoff: 'Measured, it is the weakest of the five, and the frames show why. Translucency composites the panel toward what is behind it, so the step goes down, not up: 1.11 → 1.08 in dark and 1.05 → 1.04 in light. A blur separates by texture, by smearing what is behind it, and a panel opened over a flat card has nothing to smear — the light frost frame and the light "today" frame are indistinguishable. Any gain it shows comes from the stronger line the recipe carries beside the blur, which option a gets on its own for free. It is also the most expensive: two tokens, an @supports fallback for browsers without backdrop-filter, and — following Apple’s own rule about what may sit on a material — the fields inside the panel could no longer be the plain sunken step.',
              evidence: frames('frost', 'Frost'),
            },
            {
              id: 'stronger-step',
              title: 'd · A stronger lightness step, floating only',
              summary: 'Push the floating surface two steps above the card instead of one. In dark that is a brighter panel, #38324f. In light there is nothing above white, so the only way to open the gap is to bring the card down, to #f2f4f9 — which is what the light frame shows.',
              tradeoff: 'The biggest step gain on offer in dark: 1.11 → 1.35. But it spends everything at once. --muted lands at 4.62, AA by 0.12, with the next step up at 4.32 and failing outright — the specification’s "the ladder is capped by ink" is exactly this wall. The hairline, which does not move with the panel, collapses from 1.14 to 1.06 against the brighter surface, so the panel gains a step and loses its line. And light cannot do it at all: the panel only reaches 1.10 by taking the card down to 1.04 against the page, where the card stops reading as a card so that the panel can read as a panel. Visible in the light frame, where the card has faded into the page.',
              evidence: frames('step', 'Stronger step'),
            },
            {
              id: 'tinted-edge',
              title: 'e · Tinted edge — an accent hairline and a tinted surface',
              summary: 'The hairline takes 30% of the accent and the surface 5%, the shape the accent card already uses (src/styles/card.css:30, .ui-card--accent). This is Material 3’s tonal elevation: a raised surface takes more of the primary colour, and with no shadow colour set the tint carries the elevation alone.',
              tradeoff: 'The strongest line of the five — edge 1.27 → 2.00 in dark and 1.18 → 1.91 in light — and it costs no new token, written as color-mix() at the rule. The objection is meaning rather than measurement: in this kit the accent already says "this one is chosen". It is the selected row’s label, the focus ring, the active nav row. Painting it onto every floating surface makes a panel look permanently selected and takes the accent’s existing job away from it. It also runs against a rule the specification states in the same section — the accent wash goes on a base surface, never a raised one — which is why the dropdown’s own accent badge keeps a flat surface and changes only its ink (src/styles/dropdown.css:166, .ui-dropdown__badge.is-accent).',
              evidence: frames('tint', 'Tinted edge'),
            },
            {
              id: 'edge-and-drop',
              title: 'a + b · The two-step edge with the floating drop',
              summary: 'The two stacked, in one declaration: the inset line, then the soft drops. This is the shape Primer’s --shadow-floating-* already has — a 1px line living in the box-shadow list, then broad faint drops after it — and it is what Geist means by reserving a real shadow for the overlay layer.',
              tradeoff: 'Edge 1.64 / 1.44 from the second line, which works the same in both themes, plus the drop, which is the only thing that lifts the light frame. Each half covers the other’s weakness: the drop is weak in dark, where the double edge is strongest, and the line is doing all the work in light, where the drop is strongest. Cost is b’s cost, because a adds no token: one --shadow-float per theme, and the rewritten specification sentence quoted under b. Ink is untouched at 5.60 / 6.11, and nothing outside the five floating components changes.',
              evidence: frames('both', 'Two-step edge and the drop'),
            },
          ],
        },
        {
          id: 'scope',
          title: 'Which surfaces does the chosen treatment apply to?',
          context:
            'Whatever is chosen above has to have a boundary, or it becomes the kit’s look rather than the kit’s elevation. The ladder already names the members of the floating step, so the narrow answer is already written down. Recommended: the floating step as the ladder lists it, because that list exists, is short, and is the one the specification would cite.',
          recommendation: 'floating-step',
          options: [
            {
              id: 'floating-step',
              title: 'The --bg-elevated step, as the ladder already lists it',
              summary: 'A menu, a panel, the drawer, a modal, a toast — plus the hover readout and the command palette, which sit on that step today. Nothing below it: not the card, not a field, not a chip, not a row.',
              tradeoff: 'The list is already in the specification’s ladder table, so the rule cites something rather than inventing a category. It does mean a hovered row inside a panel and a chip keep the flat treatment, which is correct — they are inside the floating surface, not another one.',
            },
            {
              id: 'transient-only',
              title: 'Only what is temporary — a menu, a popover, a toast',
              summary: 'Narrower again: the drawer and the modal keep the flat treatment, because they take the whole screen and have a scrim to separate them.',
              tradeoff: 'Arguably truer — a modal over a dimmed page does not need a drop to say it is above. But it splits one ladder step into two treatments, and a reader then has to know which side of the line the drawer is on.',
            },
            {
              id: 'everything-raised',
              title: 'Every surface above the page, cards included',
              summary: 'Apply it down the ladder, so a card gets a smaller version of the same treatment.',
              tradeoff: 'Consistent, and the shape most systems ship. But it reverses #284, which is a decision Artur already made in the other direction, and it is not what this round was asked to reopen.',
            },
          ],
        },
      ],
    },
  ],
};

const OPEN = '<script type="application/json" id="review-data">';
const template = readFileSync(new URL('../270-back-control.html', import.meta.url), 'utf8');
const from = template.indexOf(OPEN);
if (from < 0) throw new Error('template has no review-data element');
const to = template.indexOf('\n  </script>', from);
const head = template.slice(0, from + OPEN.length + 1);
const tail = template.slice(to + 1);
// The JSON lives inside a <script> element, so a literal "<" would end it early.
const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
writeFileSync(process.argv[2], `${head}${json}\n${tail}`);
console.log('wrote', process.argv[2]);
