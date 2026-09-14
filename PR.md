# The band's search field, in five looks: a survey, four variants, and the decision to put to Artur

Prepares #318. **This branch is not a fix and is not meant to merge as it stands.** It carries all
five looks at once so Artur can choose from renders rather than from prose; the chosen one is one
commit to keep and the other four are one commit to remove, and both commits are written out below.

## The decision this is built on

Artur, on PR #317 on 2026-09-14 while approving the topbar layout and keeping the key cap inside the
field's accessible name: *"btw it search field looks ugly"*.

That is the whole of the brief. He did not say which part, so the one thing this branch is careful
not to do is guess — #318 asks for a survey, renders, and a recommendation, and the recommendation
below is labelled as the author's rather than presented as the answer.

Two things from #317 are settled and are not reopened here: the band's arrangement (beside the rail,
52px, the reader's mark at its end), and the key cap being part of the field's name rather than
`aria-hidden`. Every option keeps both.

## What was found in the code, before anything was drawn

src/components/shell.js:234 `const searchField = ({ palette, placeholder }) =>` and
src/styles/layout.css:340 `.ui-app__search {`, at `6b4af3e`. Three of these are measurements, not
opinions.

**The field is the only control on the band that does not take the kit's focus ring.** It is a
`<button>` without `.ui-btn`, so the shared rule —
src/styles/base.css:140 `.ui-focusable:focus-visible,` — never reaches it and `:focus-visible`
falls through to Chrome's own square black-and-white outline, drawn around a 12px
radius. `docs/evidence/shell-layouts/shell-topbar-search-light.png`, already committed on `main`,
is a picture of it. **This is a defect rather than a preference and every variant fixes it**,
including — if `today` is what Artur picks — the do-nothing option.

**In the light theme the field is a smudge, by the numbers.** The fill, `--surface-2` over the
band's `--bg`, measures **1.10:1**. The edge, `--border` over the same `--bg`, measures **1.09:1**.
Two devices, neither of which reads. Dark is the theme it was built in and holds up there (1.07 and
1.50).

**The key cap is a box that is not there.** `.ui-cmdk__key` was drawn for the palette panel, whose
ground is `--surface-2`, and fills itself with `--surface-3`. On the band the field is *also*
`--surface-2`, so in light the cap's fill measures **1.04:1 against the field it sits in** and its
border **1.01:1** — a filled, bordered box with neither a visible fill nor a visible border.

**The words on the trigger are the palette's own.**
src/components/shell.js:99 `return { palette, placeholder: str(given.placeholder) || 'Search or run a command…' };`
defaults the trigger's words to the palette's own placeholder — the prompt for a box
you have already opened. At 390px the 320px field shrinks and it clips to *"Search or run a co…"*
(`docs/evidence/shell-layouts/shell-topbar-phone-light.png`).

## The survey

`docs/reviews/318-search-field.md`. Seven systems, each read from its own source on 2026-09-14 —
the files on this box for `lessly-ui` at `d1a25eda`, and the served HTML plus the served stylesheet,
fetched and grepped, for the rest. Width, ground, border, radius, glyph, placeholder, key-cap
treatment, focus treatment, and whether the thing is a field or a button drawn as one, for each.

The finding that produced two of the four variants: **nobody draws this control on the sunken step.**
Primer's is `#fff` on a white page and lets a `#d1d9e0` border do all of it. Geist's is `#fff` on a
grey rail. lessly-ui's `QuickSearchRow` is `bg-bg-overlay` where every other field in that kit is
`bg-bg-primary`, and its own comment argues it: *"every other field sits on a card or a page and
this one sits on the rail — which IS `bg-bg-primary`, so the field's own fill would be its ground
and only the border would say it is there"*. Notion's has no fill at all. This kit's is sunken
because `.ui-app__search` borrowed `.ui-input`'s ladder wholesale, and `.ui-input` is drawn on a
card.

**Linear is in the table as a row that could not be read, not as one written from memory.**
`linear.app/docs` renders its search trigger from a client-side chunk (fetched: four lines
re-exporting a component from a bundled design system), the served CSS carries no rule for it, and
the app is behind a login this box has no credential for. Raycast's and Slack's rows carry a smaller
version of the same caveat, stated in the survey: they are documentation searches, not those
products' app chrome.

## The five looks

The look is a stylesheet's, keyed off `data-search-variant`. **The markup is identical in all
five** — the same `<button>`, the same accessible name, the same `[data-cmdk-open]`, the same
`kbd` — which is why every gate the field already has is green on each of them.

| | What changes | Read from | Light: fill / edge |
| --- | --- | --- | --- |
| **today** | nothing — what #317 ships, rendered off this branch | — | 1.10 / 1.09 |
| **a · bordered** | no fill at all; `--border-strong` carries it at 9px; the cap outlined on the same ground | Notion's search; GitHub's header cap (`background-color:#0000` + 1px border) | — / **1.33** |
| **b · lifted** | the same pill one step **up** (`--surface`), so the fill is lighter than the band | lessly-ui's own comment; Geist's white-on-grey | **1.08 above** / 1.09 |
| **c · quiet** | 240px, `Search…`, the key set beside the words rather than boxed | Tailwind's docs trigger; lessly-ui's plain-text shortcut | 1.10 / 1.09 |
| **d · wide** | the field grows to the reader's mark, bordered | GitHub's product command bar | — / 1.33 |

`today` is shot off this branch with no attribute set at all, so the baseline in the comparison is
the branch drawing #317 rather than a copy of #317's evidence.

One of the four changes a string as well as a rule: **c** shortens the placeholder, and the
placeholder is an argument to `appShell()`. On this branch the rig passes it
(`scripts/evidence/shot.html`); if **c** is chosen, `shell.js:99`'s default moves with it.

## My recommendation, and the reason

**b · lifted**, and this is the author's call rather than Artur's — he has not seen the frames yet
as this is written.

Three reasons, in the order they matter:

1. **It is the one thing every readable reference agrees on.** Two of the seven put this control
   a step *above* its ground (lessly-ui, Geist), four give it effectively no fill at all —
   1.05:1 or less against the page (GitHub's header at `#00000003`, Primer's real field at the
   page's own `#fff`, Notion's none, Tailwind's 2% black) — and **none of the seven puts it on a
   fill a step below**. That is not a taste; it is what happens when a field designed for a card
   is moved onto a page. The band is `--bg`, the bottom of the ladder, so a sunken fill has
   nowhere to go but down into it.
2. **It is one declaration, and it fixes the cap for free.** The cap stops being invisible without
   being redesigned: `--surface-3` on `--surface` is 1.14:1 rather than 1.04:1. Nothing else in
   the kit moves, and `.ui-app__search` keeps its family resemblance to `.ui-input` — same radius,
   same hairline, same shape, one step the other way.
3. **It leaves the separable questions separate.** The sentence and the width are arguably wrong
   too, but each is fixable on its own afterwards and neither needs to ride on this decision.

**Where I would go instead:** if what reads as ugly is specifically the light theme, **a** is the
stronger answer — it is the only option that moves the *edge*, which is the device carrying the
control in every reference that has no fill to lean on, and 1.09 → 1.33 is the largest single
improvement on the list. And if what reads as ugly is the phone, **c** is the only one that fixes it.

I would not pick **d** without Artur saying the empty band is the complaint: it makes the topbar
layout stop looking like a sibling of the rail layout, which is a larger change than he asked for.

## Evidence

Forty frames under `docs/evidence/318-search-field/`, all from the committed rig —
`scripts/evidence/layouts.mjs`, extended with a variant switch rather than shot by hand, over the
same server, the same `shot.html` and the same Chrome. Eight per look:

| What | Files |
| --- | --- |
| the band alone, life size (1032×52) — the fastest comparison | `318-search-<v>-{light,dark}-band.png` |
| the whole screen, 1280×760 | `318-search-<v>-{light,dark}-1280.png` |
| a phone, 390×800 — where today's sentence clips | `318-search-<v>-{light,dark}-390.png` |
| the field under a **real Tab press** — today's browser outline against every variant's kit ring | `318-search-<v>-focus-{light,dark}.png` |

`<v>` is `today`, `bordered`, `lifted`, `quiet`, `wide`.

The band close-up is captured as `.ui-app__bar` rather than as a hand-written clip box, for the
reason `float.mjs` captures `.fl-cell`: a box measured from the document cannot drift from what the
document draws. The focus frames are reached by real `Tab` presses through `tabTo()`, and the rig
waits on `settle()` — `document.getAnimations()` — and never on a clock.

A 2× set of the same forty is at `/home/orca/shots-318/` on the host for the review page, shot by
the same script under `UI_DSF=2`. **Deliberately not committed**: 1× is what the rig's README calls
the reproducible cross-check.

### Re-shot, and what did not hold still

The eight `lifted` frames were re-shot off the committed branch after the last code change and
compared with `scripts/evidence/diff.mjs`, pixel by pixel rather than by hash:

```
0 of 2918400 samples differ, max delta 0      (light 1280, dark 1280, both focus frames)
0 of  936000 samples differ, max delta 0      (both phones)
0 of  160836 samples differ, max delta 0      (both bands)
34 of 2918400 samples differ, max delta 7 in x∈[49,227] y∈[213,214]   (dark, 1280)
```

Seven of eight to the byte. The eighth is the caveat #317 measured and wrote into the rig's README:
in the topbar layout, the active nav row's rounded plate rasterises one of two ways at its bottom
corners — `rows 213–215` at `x 49–51` and `x 226–228`, which is the box above. It is not in the
subject, it is not this branch's, and it is named rather than rounded to "deterministic".

### The comparison page

`docs/reviews/318-search-field.html`, in the shape of `docs/reviews/295-popover-variants.html` —
the same `review-page` template, the goal, the constraints, the prior decisions with their sources,
five options each with its own tradeoff paragraph and its eight frames, and a recommendation marked
as a recommendation.

## What this branch changes, and what it does not

| File | What |
| --- | --- |
| `src/styles/layout.css` | The `#318` section at the end of the file: one focus-ring rule the variants share, and four `[data-search-variant="…"]` blocks. **Nothing above that banner is touched.** |
| `scripts/evidence/shot.html` | Reads `&search=<v>` and sets the attribute on the root; names the one variant that shortens the placeholder. |
| `scripts/evidence/layouts.mjs` | The `#318` loop — five looks × two themes × four frames. Filtered by the rig's existing third argument, so `… . out 318-search` shoots only these. |
| `stories/apps/ShellLayouts.stories.js` | `SearchVariant` — one screen in a box carrying the attribute, the look picked from a control. |
| `stories/elevation.test.js`, `CONTRIBUTING.md` | The pinned box-shadow count, 40 → 41 — the variants' shared focus rule — and the row in the count table that records it. |
| `docs/reviews/318-search-field.md`, `.html` | The survey and the comparison page. |
| `docs/evidence/318-search-field/` | The forty frames. |

Nothing in `src/` writes `data-search-variant` and no consumer sets it, so **unset — which is every
consumer — the field is byte-for-byte what #317 shipped.**

The attribute is read on *any ancestor* rather than on `:root`, and that is not cosmetic: a story is
mounted into the body, so a rule keyed on `<html>` is a rule no gate can reach. Keying it on an
ancestor is what lets `SearchVariant` land the variants' ring selector for
`stories/guidelines/accessibility-floor.test.js` to measure — which is the gate that caught this in
the first place, on the first run, with `a ring selector no story renders is a ring nobody
measured`.

## The two commits that settle it

**To keep the chosen one** — replace `.ui-app__search`'s own declarations with the chosen block's,
and add the shared focus rule to it. Written out so the commit is mechanical:

```css
/* whichever is chosen, this lands: the field takes the kit's ring like every
   other control on the band. why: docs/specification.md#the-focus-ring */
.ui-app__search:focus-visible { outline: none; box-shadow: var(--ring); }

/* a · bordered */ background: transparent; border-color: var(--border-strong);
                   border-radius: var(--radius-sm);
                   :hover { border-color: var(--muted) }
                   :focus-visible { border-color: var(--accent) }
                   kbd { background: transparent; border-color: var(--border-strong) }
/* b · lifted   */ background: var(--surface); border-color: var(--border);
                   :hover { border-color: var(--border-strong) }
                   :focus-visible { border-color: var(--accent) }
/* c · quiet    */ flex-basis: 240px; border-radius: 999px;
                   kbd { min-width: 0; padding: 0; border: 0; background: none;
                         font-weight: var(--weight-medium); color: var(--muted) }
                   …and shell.js:99's default placeholder becomes 'Search…'
/* d · wide     */ flex: 1 1 auto; background: transparent;
                   border-color: var(--border-strong); border-radius: var(--radius-sm);
                   :hover { border-color: var(--muted) }
                   :focus-visible { border-color: var(--accent) }
                   kbd { background: transparent; border-color: var(--border-strong) }
```

**To remove the other four** — delete four additive hunks and nothing else:

1. `src/styles/layout.css`: everything from `/* -- #318 · the search field's look` to the end of
   the file.
2. `scripts/evidence/shot.html`: the `SEARCH_WORDS` map, the `variant` parameter on `laid()`, and
   the three lines in the `layouts` branch that read `&search=` and set the attribute.
3. `scripts/evidence/layouts.mjs`: the `#318` loop.
4. `stories/apps/ShellLayouts.stories.js`: `SEARCH_VARIANTS` and `SearchVariant`.
5. `stories/elevation.test.js` and its row in `CONTRIBUTING.md`: back to 40 — unless the chosen
   look keeps the focus rule, which it should, in which case 41 stays and the row is rewritten
   from "branch state" to what shipped.

Then re-shoot `318-search-<chosen>` into `docs/evidence/318-search-field/` off the folded version
and drop the other thirty-two frames, so what is committed is the look that shipped.

### Both commits were rehearsed, on a scratch branch, and thrown away

Not asserted. `b · lifted` was folded into `.ui-app__search` and the whole `#318` section, the rig's
two hunks and the story were deleted, exactly as written above. What came out:

- `scripts/evidence/shot.html`, `scripts/evidence/layouts.mjs` and
  `stories/apps/ShellLayouts.stories.js` are **byte-identical to `origin/main`** — `git diff` prints
  nothing for any of the three.
- `src/styles/layout.css` is `main` **plus five lines**: `--surface-2` → `--surface` on one
  declaration, and the four-line focus rule. That is the whole of what shipping `lifted` is.
- 243 tests across `shell.test.js`, `shell-states.test.js`, `shell-rail.test.js`, `the-page.test.js`,
  `accessibility-floor.test.js` and `elevation.test.js` pass on the folded tree. The elevation pin
  stays at 41, because the folded field keeps the ring.
- The folded tree re-shot through the rig's ordinary `shell-topbar-wide` frames comes back
  **byte-identical** to the committed variant frames — `0 of 2918400 samples differ, max delta 0`
  in both themes against `318-search-lifted-{light,dark}-1280.png`. The picture Artur chooses from
  is the picture that ships.

The four other looks fold the same way; `lifted` was rehearsed because it is the one recommended.
The scratch branch was deleted and this branch still carries all five.

The survey, the comparison page and the frames stay whichever way it goes: #318 is closed by
writing the decision into the issue, and the page is the evidence it was taken from.

## Proof

Run on this host at the branch head, nothing else running. `origin/main` is at `6b4af3e`.

```
$ npm test
ℹ tests 1595
ℹ suites 0
ℹ pass 1592
ℹ fail 1
ℹ cancelled 0
ℹ skipped 2
ℹ todo 0

$ npm test -w react
 Test Files  20 passed (20)
      Tests  530 passed (530)

$ npm run build
ESM dist/index.js  55.98 KB
ESM dist/index.css 2.15 KB
ESM ⚡️ Build success in 210ms
DTS ⚡️ Build success in 4928ms
DTS dist/index.d.ts 13.43 KB
```

**The one failure is this host, not this branch, and it is measured rather than asserted.**
`stories/contrast.test.js` — *"the walk has not run away with the clock"* — took 197.7s against a
120s ceiling. `origin/main` fails the same gate on the same box:

```
$ node --test stories/contrast.test.js          # feat/318-search-field
branch walk: 188.95 s   ℹ pass 20  ℹ fail 1

$ node --test stories/contrast.test.js          # origin/main at 6b4af3e, same node_modules
main walk: 182.01 s     ℹ pass 20  ℹ fail 1
```

So the branch costs **7s of 182**, about 4%, which is one extra screen in every theme × accent
cell and is what one extra screen should cost. The ceiling is a number pinned from a measured worst
case on a ten-core laptop; this box is eight cores shared with the rest of the run, so **the ceiling
is not moved** — moving it to make a slow host green is the thing the gate exists to stop. The two
skips are `CONTRAST_ACCENTS=1`'s opt-in cells, which `main` skips too.

Two gates caught real mistakes on the way and are worth naming, because both are the repo's own
discipline working:

- `stories/guidelines/accessibility-floor.test.js` refused the variants' ring rule until a story
  rendered it — *"a ring selector no story renders is a ring nobody measured"*. That is why
  `SearchVariant` exists and why the selector is not `:root`-keyed.
- `scripts/doc-refs.test.js` refused the ring rule's citation, which named an anchor `#focus` the
  specification does not have — it is `#the-focus-ring` — and named the right one back. It then
  refused this list's first draft, which quoted the wrong anchor verbatim.
- `scripts/code-refs.test.js` refused three prose citations in the survey until each was anchored
  by a code span quoting the line it names.
- `stories/guidelines/the-page.test.js` refused the story's first shape — five shells stacked on
  one page, which is five `<main>`s, five `h1`s and five nav landmarks sharing a name. Correctly:
  that is not a page. It is one screen with the look on a control now, which is also what the
  contrast walk's own clock gate was objecting to — five extra screens are paid for again in every
  theme × accent cell, and it timed out at 205s against a 120s ceiling.
- `stories/elevation.test.js` refused the 41st `box-shadow` in the kit until the pinned count moved
  and the change was recorded in CONTRIBUTING's count table. The 41st is the variants' focus ring.

## `ai-slop-detector`, recommended level

Run over `PR.md`, the survey, the comparison page, the variants CSS, the story and both rig files.
Two findings were real and are fixed; two are stated rather than rounded to a pass.

**Fixed.** `comment-essay` at the `#318` banner in `layout.css` — a 17-line prose block in a
stylesheet, which is what CONTRIBUTING's "No visual slop" is about. It is nine lines now, and the
argument lives here and in the issue where it can be reviewed and superseded.

**Fixed.** `comment-ratio` on `stories/elevation.test.js`. The moved pin needed recording, and the
first draft recorded it as a comment beside the number — which tipped a file that sits at 0.497:1
on `main` over the rule. The repo already has the right home for it and the test file already
points at it: the count table in **CONTRIBUTING.md#the-elevation-gate-and-its-counts**, whose
standing instruction is *"Move a number by adding a row, not by editing one"*. There is a `41` row
there now and no comment in the test file.

**Stated, not fixed — `comment-ratio` on `layout.css`, 0.65:1.** Pre-existing: `origin/main`'s copy
of the same file measures 0.60:1 and warns identically. This branch moved it by five hundredths.
Bringing the file under the rule means rewriting comments this branch did not write.

**Stated, not fixed — `middot-chain` on `PR.md` and the survey.** It is matching the variant labels,
`a · bordered` and the rest, which is the naming `docs/reviews/295-popover-variants.html` used for
its own options (`a · Two-step edge`) in a page Artur read and chose from. The rule is about a line
that packs unrelated facts into a dotted chain; `a · bordered` is one label. Kept for continuity
with #295, and named here so it is not a silent pass.

One finding on `stories/elevation.test.js` is pre-existing and untouched: `comment-essay` at its
line 31, the 23-line `TREATMENT_DROP` block, which `origin/main` carries identically.

## No version bump, no changelog entry

Per the standing rule: the version is untouched at `0.33.1` and `docs/changelog.md` has no new
RELEASES entry. The coordinator sequences versions at merge.

## Changelog entry

Nothing has shipped yet — this branch is the decision, not the change. The line to write when the
chosen look lands is one of these, and the second half is the same in all five:

```
- **The topbar layout's search field is drawn <the chosen look>.** <one clause naming what moved.>
  The field's markup, its accessible name and the key cap inside it are unchanged. (#318, #308)
- **The topbar layout's search field takes the kit's focus ring.** It was the one control on the
  band falling through to the browser's own outline. (#318)
```

## Open questions

1. **Which look lands.** With Artur; the branch carries all five until he answers.
2. **Whether the trigger keeps the palette's sentence.** Only option **c** decides this as part of
   the look. If anything else is chosen, `'Search or run a command…'` on a 320px trigger — and its
   clipping at 390 — is a separate, smaller question, and probably its own issue.
3. **Whether `.ui-cmdk__key` should be the cap here at all.** It is the palette panel's cap, and
   the panel's ground is not the band's. Options **a**, **c** and **d** each answer it differently
   in passing; **b** answers it by giving the cap a ground to sit on. Worth a line in the issue
   whichever way it goes.

## How to look at it

```sh
npm run storybook            # Apps / Shell layouts / Search variant — flip `variant`, Tab into the field
open docs/reviews/318-search-field.html
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_0138PyywufL61DGrtHuRSSqP
