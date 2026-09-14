# The topbar band's search field leaves the sunken step

Closes #318.

## The decision this is built on

Artur, on PR #317 on 2026-09-14 while approving the topbar layout and keeping the key cap inside the
field's accessible name: *"btw it search field looks ugly"*. He did not say which part, so #318 was
opened as a decision to prepare rather than a fix to guess at: a survey read from source, four
variants rendered against what #317 shipped, and a recommendation he could overrule.

**Artur chose `b · lifted`, on the companion page, round 11, 2026-09-14.** That is the whole of what
this branch now does. `a · bordered`, `c · quiet` and `d · wide` were not taken. The record is
[#318](https://github.com/apliteni/apliteni-ui/issues/318); the page he chose from is
`docs/reviews/318-search-field.html`, which now says on each option which way it went, and the forty
frames the choice was made from are kept under `docs/evidence/318-search-field/`.

| Decision | Choice | Who, and where |
| --- | --- | --- |
| Which look the band's search field takes | **b · lifted** — `--surface` instead of the sunken `--surface-2` | Artur, companion round 11, 2026-09-14, recorded on #318 |
| Whether the field takes the kit's focus ring | **Yes** — it was the only control on the band that did not | Derived, not chosen: a defect all four variants fixed, and it ships with the chosen one |
| `a · bordered` — no fill, `--border-strong` carries the edge | Not taken | Artur, same round |
| `c · quiet` — 240px, `Search…`, the key unboxed | Not taken | Artur, same round |
| `d · wide` — the field grows to the reader's mark | Not taken | Artur, same round |
| The band's arrangement, and the key cap inside the field's name | Settled at #317, not reopened | Artur, 2026-09-14 |

## What ships

Fourteen lines in one file. `src/styles/layout.css`, against `origin/main`:

```css
   color: var(--muted);
-  background: var(--surface-2);
+  /* --surface, not the sunken --surface-2 every other field in the kit takes: …  */
+  background: var(--surface);
   border: 1px solid var(--border);
   …
 .ui-app__search:hover { border-color: var(--border-strong); color: var(--strong); }
+/* Every other control on the band takes the kit's ring. This one is a <button>
+   without `.ui-btn`, so base.css's shared rule never reached it … */
+.ui-app__search:focus-visible { outline: none; box-shadow: var(--ring); border-color: var(--accent); }
```

**One declaration, and a focus rule.** The declaration is the decision; the rule is the defect the
survey found on the way and that every variant fixed.

**Why the fill goes up and not down**, in the comment beside it and at length in the survey: every
other field in the kit is sunken because it sits on a card, and this one sits on the band — which is
`--bg`, the bottom of the elevation ladder — so a sunken fill has nowhere to go but down into its
own ground. Measured in light, the field was **1.10:1 below the band**; it is **1.08 above** it now.
The key cap moves with it for free: `--surface-3` on `--surface-2` measured **1.04:1**, a filled,
bordered box with neither a visible fill nor a visible border, and it is **1.14:1** on the new
ground.

**Why the focus rule.** `.ui-app__search` is a `<button>` without `.ui-btn`, so the kit's shared
ring rule — src/styles/base.css:140 `.ui-focusable:focus-visible,` — never reached it and
`:focus-visible` fell through to Chrome's own square black-and-white outline, drawn around a 12px
radius. Compare `shell-topbar-search-light.png` before and after, below.

## What the settling commit removed

The branch carried all five looks while the decision was open. The settling commit took the other
four out. **Three of the four files it touched are byte-identical to `origin/main` again** —
`git diff origin/main` prints nothing for any of them:

| File | What went |
| --- | --- |
| `src/styles/layout.css` | The whole `#318` section — the four `[data-search-variant="…"]` blocks and the ring rule they shared, 104 lines. The ring rule came back on `.ui-app__search` itself. |
| `scripts/evidence/shot.html` | The `SEARCH_WORDS` map, the `variant` parameter on `laid()`, and the three lines that read `&search=` and set the attribute on the root. **Byte-identical to `main`.** |
| `scripts/evidence/layouts.mjs` | The `#318` loop — five looks × two themes × four frames. **Byte-identical to `main`.** |
| `stories/apps/ShellLayouts.stories.js` | `SEARCH_VARIANTS` and the `SearchVariant` story. **Byte-identical to `main`.** |

Nothing in `src/` ever wrote `data-search-variant` and no consumer set it, so no published API had
it and none loses it.

**One consequence, stated rather than left to be noticed.** The band close-up — `.ui-app__bar`
captured on its own at 1032×52, which is the frame the five looks were actually compared in — was
part of the `#318` loop, so the settled rig has no producer for it. The ten committed band frames
stay as the decision's record, and the check under *Evidence* below shows they are the same pixels
as the band region of the frames the settled tree draws today. If the band is worth shooting
routinely, that is its own small issue rather than a reason to keep half of a removed loop.

**Two things were kept**, and both are records rather than state:

- `stories/elevation.test.js` stays pinned at **41** box-shadows, with the row recording the change
  in `CONTRIBUTING.md#the-elevation-gate-and-its-counts` rewritten from "branch state" to what
  shipped. The 41st is the field's ring. The floating count is untouched at 13, because a ring is
  not a cast layer.
- `docs/reviews/318-search-field.md` and `.html`, and all forty frames under
  `docs/evidence/318-search-field/`. `docs/README.md` says why a design was chosen goes in the issue,
  and that closing an issue which settled something means writing the decision into it; these are
  what that sentence on #318 points at.

## The survey the choice was made from

`docs/reviews/318-search-field.md`. Seven systems, each read from its own source on 2026-09-14 — the
files on this box for `lessly-ui` at `d1a25eda`, and the served HTML plus the served stylesheet,
fetched and grepped, for the rest. Width, ground, border, radius, glyph, placeholder, key-cap
treatment, focus treatment, and whether the thing is a field or a button drawn as one.

The finding the chosen look answers: **nobody draws this control on the sunken step.** Two of the
seven put it a step above its ground — Vercel Geist's is `#fff` on a grey rail, `lessly-ui`'s
`QuickSearchRow` is `bg-bg-overlay` where every other field in that kit is `bg-bg-primary` — and
`QuickSearchRow`'s own comment argues it: *"every other field sits on a card or a page and this one
sits on the rail — which IS `bg-bg-primary`, so the field's own fill would be its ground and only
the border would say it is there"*. Four give it effectively no fill at all, 1.05:1 or less against
the page: GitHub's header trigger at `#00000003`, Primer's real `TextInput` at the page's own
`#fff`, Notion's none, Tailwind's 2% black. **None of the seven puts it on a fill a step below.**

**Linear is in the table as a row that could not be read, not as one written from memory.**
`linear.app/docs` renders its search trigger from a client-side chunk, the served CSS carries no
rule for it, and the app is behind a login this box has no credential for. Raycast's and Slack's
rows carry a smaller version of the same caveat, stated in the survey: they are documentation
searches, not those products' app chrome.

## Evidence

**Before and after, in place.** The twelve `shell-topbar-*` frames under
`docs/evidence/shell-layouts/` are re-shot off the settled tree through the committed rig —
`scripts/evidence/layouts.mjs`, the same server, the same `shot.html`, the same Chrome, waiting on
`settle()` and never on a clock. The `before` side is what those same paths held on `main` from
#317, so the diff of this pull request *is* the before/after pair.

What moved, measured with `scripts/evidence/diff.mjs` rather than by hash:

```
shell-topbar-wide-light       32552 of 2918400 samples differ, max delta 21 in x∈[300,619] y∈[6,44]
shell-topbar-wide-dark        32516 of 2918400 samples differ, max delta 13 in x∈[300,619] y∈[6,44]
shell-topbar-centered-light   32552 of 2918400 samples differ, max delta 21 in x∈[300,619] y∈[6,44]
shell-topbar-centered-dark    32516 of 2918400 samples differ, max delta 13 in x∈[300,619] y∈[6,44]
shell-topbar-folded-light     32552 of 2918400 samples differ, max delta 21 in x∈[125,444] y∈[6,44]
shell-topbar-folded-dark      32516 of 2918400 samples differ, max delta 13 in x∈[125,444] y∈[6,44]
shell-topbar-menu-light       32552 of 2918400 samples differ, max delta 21 in x∈[300,619] y∈[6,44]
shell-topbar-menu-dark        32516 of 2918400 samples differ, max delta 13 in x∈[300,619] y∈[6,44]
shell-topbar-phone-light      20803 of  936000 samples differ, max delta 21 in x∈ [98,311] y∈[6,44]
shell-topbar-phone-dark       20765 of  936000 samples differ, max delta 13 in x∈ [98,311] y∈[6,44]
shell-topbar-search-light     40942 of 2918400 samples differ, max delta 236 in x∈[42,622] y∈[3,166]
shell-topbar-search-dark      40889 of 2918400 samples differ, max delta 240 in x∈[297,622] y∈[3,47]
```

**The box is the whole review.** In every at-rest frame the difference is confined to
`x∈[300,619] y∈[6,44]` — the field's own 320×34 box at the band's start, moved to `x∈[125,444]` when
the rail is folded and to `x∈[98,311]` on a phone. Nothing else on any of those pages moved a
sample. The two focus frames are the larger box and the larger delta, because that is the rule that
replaced Chrome's outline with the kit's ring, which spreads 3px past the field.

The six **rail** frames are deliberately not re-shot: the rail layout draws no search field, so this
change cannot reach them. See the caveat below for what happened when they were shot anyway.

**The frames Artur chose from are the frames that shipped.** The settled tree's output compared with
the committed `lifted` variant frames:

```
shell-topbar-wide-light    vs 318-search-lifted-light-1280.png    0 of 2918400 samples differ, max delta 0
shell-topbar-wide-dark     vs 318-search-lifted-dark-1280.png     0 of 2918400 samples differ, max delta 0
shell-topbar-phone-light   vs 318-search-lifted-light-390.png     0 of  936000 samples differ, max delta 0
shell-topbar-phone-dark    vs 318-search-lifted-dark-390.png      0 of  936000 samples differ, max delta 0
shell-topbar-search-light  vs 318-search-lifted-focus-light.png   19 of 2918400 samples differ, max delta 28 in x∈[42,43] y∈[15,166]
shell-topbar-search-dark   vs 318-search-lifted-focus-dark.png    34 of 2918400 samples differ, max delta 7 in x∈[49,227] y∈[213,214]
```

Four of six to the byte. The two that are not differ **only in the rail**, in the two boxes the
rig's own README already names as raster jitter this host cannot settle — the brand mark's
`clipPath` corners and the active nav row's rounded plate — and neither box contains any part of the
subject. The same two boxes are the only disagreement between **two runs of the settled tree
itself**: eleven of its twelve topbar frames are byte-identical across runs A and B, and the twelfth
is `shell-topbar-search-light`, at the same 19 samples in `x∈[42,43] y∈[15,166]`.

**And the band close-up**, which has no producer on the settled rig. The committed
`318-search-lifted-{light,dark}-band.png` were compared sample for sample against the band's region
of the frames the settled tree draws today — the 1032×52 box at `(249, 0)` inside
`shell-topbar-wide-*`:

```
318-search-lifted-light-band.png: 0 of 160836 samples differ, max delta 0
318-search-lifted-dark-band.png:  0 of 160836 samples differ, max delta 0
```

So all four kinds of frame — band, 1280, 390 and focus, in both themes — are shown to be what the
settled tree draws.

A 2× set of the twelve is at `/home/orca/shots-318-settled/` on the host, shot by the same script
under `UI_DSF=2`. Deliberately not committed: 1× is what the rig's README calls the reproducible
cross-check.

### A caveat about this host, found while shooting and not caused by this branch

The six `shell-rail-*` frames committed by #317 do not reproduce on this box. Re-shot from
`origin/main` itself, with `main`'s own rig and stylesheet, they come back **156 of 2,918,400 samples
apart, max delta 126, in one 13×8 box at `x∈[222,234] y∈[717,724]`** — the chevron on the reader's
trigger at the rail's foot. It is not the Chrome build: `chromium-1194`, `1234` and `1243` all agree
with each other and all disagree with what is committed, identically. It is this Linux host against
whatever machine shot them.

That is why the rail frames are left alone rather than re-shot: re-shooting them would put a
156-sample change into this pull request that has nothing to do with the search field and whose
cause is the shooter's machine. Worth an issue — the rig's README promises "the same checkout, the
same Chrome and the same viewport give the same bytes", and the third variable is not in that list.

## Gates

Every gate the field already had is green on the settled tree, unchanged. Four of them shaped this
work while the decision was open, and each is worth naming because each is the repo's own discipline
doing its job:

| Gate | What it said |
| --- | --- |
| `stories/guidelines/accessibility-floor.test.js` | Refused the new ring rule until a story rendered it — *"a ring selector no story renders is a ring nobody measured"*. On the settled tree the `Apps/Shell layouts` topbar stories land it, so nothing extra is needed. |
| `stories/guidelines/the-page.test.js` | Refused the variants story's first shape: five shells stacked is five `<main>`s, five `h1`s and five nav landmarks sharing a name. Correct — that is not a page. |
| `stories/elevation.test.js` | Refused the kit's 41st `box-shadow` until the pinned count moved **and** the change was recorded, per CONTRIBUTING's own standing instruction to move a number by adding a row. |
| `scripts/doc-refs.test.js`, `scripts/code-refs.test.js` | Refused four citations, including an earlier draft of this body quoting a wrong anchor verbatim. Every `path:line` in the survey is now anchored by a code span quoting the line it names. |
| `stories/guidelines/refs.test.js` | Refused two Guidelines pages after the settling commit: adding twelve lines of comment to `layout.css` moved `rank: page-title` from line 381 to 394 and the 720px block from 416 to 429, and `Labels and titles` and `Layout and density` both cite those lines. Both references are updated. A rule that cites a line number is a rule that notices when the line moves. |

## Proof

Run on this host at the branch head, nothing else running, with `origin/main` (`6ddbe3d`) merged in.

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
ESM ⚡️ Build success in 140ms
DTS ⚡️ Build success in 3126ms
DTS dist/index.d.ts 13.43 KB
```

**The one failure is this host, not this branch, and it is measured rather than asserted.**
`stories/contrast.test.js` — *"the walk has not run away with the clock"* — runs past its 120s
ceiling. `origin/main` fails the same gate on the same box:

```
the contrast walk took 181.2s   # the settled tree, in the run above
main walk: 182.01 s             # origin/main, same node_modules, timed on its own
```

The settled tree carries no story `main` does not have, so its walk **is** `main`'s — 181.2s against
182.01s, within the noise of a shared box. While the branch still carried the extra variants story
it measured 188.95s, about 4% more, which is what one extra screen in every theme × accent cell
should cost; that screen is gone. The ceiling is pinned from a measured worst case on a ten-core
laptop and this box is eight cores shared with the rest of the run, so **the ceiling is not moved** —
moving it to make a slow host green is what the gate exists to stop. The two skips are
`CONTRAST_ACCENTS=1`'s opt-in cells, which `main` skips too.

## `ai-slop-detector`, recommended level

Run over `PR.md`, the survey, the comparison page, `CONTRIBUTING.md`, the settled `layout.css`, the
story and `elevation.test.js`. Nothing this branch adds is flagged as its own finding. What remains:

- **`comment-ratio` on `src/styles/layout.css`, 0.63:1 — pre-existing.** `main`'s own copy measures
  0.60:1 and warns identically; the settled tree adds twelve lines of comment to it. Bringing the
  file under the rule means rewriting comments this branch did not write.
- **`comment-essay` on `stories/elevation.test.js` at line 31 — pre-existing.** The 23-line
  `TREATMENT_DROP` block, which `main` carries unchanged and this branch does not touch.
- **`middot-chain` on `PR.md` and the survey — stated, not fixed.** It is matching the variant
  labels, `a · bordered` and the rest, which is the naming `docs/reviews/295-popover-variants.html`
  used for its own options (`a · Two-step edge`) in a page Artur read and chose from. The rule is
  about a line that packs unrelated facts into a dotted chain; `a · bordered` is one label. Kept for
  continuity with #295, and named here so it is not a silent pass.

Two findings that were real are gone with the variants: the `comment-essay` in the `#318` banner,
and a `comment-ratio` on `elevation.test.js` from recording the moved pin as a comment beside the
number. The pin's record lives in CONTRIBUTING's count table, which is where the file already
pointed.

## No version bump, no changelog entry

The version is untouched at `0.34.0` and `docs/changelog.md` has no new RELEASES entry. The
coordinator sequences versions at merge.

## Changelog entry

```
- **The topbar layout's search field is lighter than the band, not darker.** It takes `--surface`
  instead of the sunken `--surface-2` every other field in the kit takes — those sit on a card and
  this one sits on the band, which is already the bottom of the elevation ladder. In the light
  theme the field measured 1.10:1 below its own ground and its key cap 1.04:1 against the field it
  sits in; they are 1.08 above and 1.14 now. Chosen from four rendered alternatives. (#318, #308)
- **The topbar layout's search field takes the kit's focus ring.** It was the one control on the
  band falling through to the browser's own outline: a `<button>` without `.ui-btn`, which the
  shared rule in `base.css` never reached. (#318)
```

## Open, and deliberately left

1. **The band close-up has no producer on the settled rig**, as above. Its own small issue if it is
   worth shooting routinely.
2. **`shell-rail-*` does not reproduce across machines**, as above. The rig's README promises
   determinism over checkout, Chrome and viewport, and the host is a fourth variable it does not
   name.
3. **The trigger still says the palette's own sentence.**
   src/components/shell.js:99 `return { palette, placeholder: str(given.placeholder) || 'Search or run a command…' };`
   takes its default from `command-palette.js`'s own placeholder — the prompt for a box you have
   already opened — and at 390px it clips to *"Search or run a co…"*. Every readable reference in
   the survey puts one or two words on the trigger. `c · quiet` would have decided this as part of
   the look and was not taken, so it stays a separate, smaller question.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_0138PyywufL61DGrtHuRSSqP
