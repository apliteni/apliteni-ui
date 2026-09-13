# Elevation: nothing casts, and every surface says how high it is (#295)

Prepared for the coordinator to open from `asabirov/295-elevation`. Based on main `7cb8727`,
2026-09-13. Implements the three decisions Artur recorded on
[#295](https://github.com/apliteni/apliteni-ui/issues/295) from the review page
`docs/reviews/295-elevation.html`; the research that page rests on is
[#299](https://github.com/apliteni/apliteni-ui/pull/299), read here and not merged.

**Rebase note.** Rebased onto `7cb8727` (#305, release 0.31.1) on 2026-09-13 — 0.32.0 stays
above 0.31.1 in `package.json`, `package-lock.json` and the changelog, #305's touch-zoom net is
untouched, and every check in [Proof](#proof) was re-run on the rebased tree.

## What & why

Since [#284](https://github.com/apliteni/apliteni-ui/issues/284) the card is flat and ten other
places still cast. #295 asked what should separate a surface once the shadow goes. The answer
picked is `lift-line`: **nothing casts anywhere**, a surface says how high it is with its step on
a ladder of lightness, and every floating surface keeps the kit's hairline. The card takes one in
both themes, where only light had one.

The five `--shadow-*` tokens stay published and resolve to the transparent shadow `0 0 #0000`.
See [Deprecated, not deleted](#deprecated-not-deleted) for why, and why not `none`.

**An independent review of this branch raised ten findings. Nine are fixed here and the tenth is
[a question for Artur](#open-to-artur); [the review round](#the-review-round) lists all ten.**

## Premises

- The model, the light half and the ink were decided by Artur on the review page, from rendered
  frames. This branch implements those three picks; it does not re-open them.
- `docs/reviews/295-elevation/elevation.css` on `asabirov/295-elevation-variants` is the source
  for the exact values. Every token below was checked against it, and the review page's
  measured-surface line was checked against the rendered frames here.
- The research already warned where the bill lands: *"the dark ladder has about one step of
  headroom left, and `--muted` is what spends it."* The light half of that bill — every
  translucent wash in the theme composites over a page that is no longer white — was not on the
  review page, and is the largest part of this diff. It is itemised under
  [The ladder's bill](#the-ladders-bill).
- Nothing in `docs/reviews/` is touched. The prototype was copied into a scratch tree to draw the
  frames; the **after** frames are the real stylesheet from `src/`, with no prototype override
  loaded at all.

## The decision record

| Decision | Pick | The reason, from the review page |
| --- | --- | --- |
| Which elevation model should the kit ship? | **lift-line** — lightness and a hairline | *"What Atlassian, Primer, Geist and Radix all actually ship, and it is what makes light survivable: the ladder carries dark, the line carries light, and neither theme depends on the half that is weak for it."* The cost named there is the one this branch pays: the card is no longer edgeless in dark. |
| In light, does the card come off white? | **card-steps-down** | *"Light gets a real ladder, which means a panel is still separated if a line is ever dropped, and it matches Radix (step 1 is not white) and Geist (#fafafa, not #ffffff)."* The rejected option kept the card white and made the card and every floating panel the same white, so light could never drop its hairline. |
| Dark has about one step of headroom left. Who spends it? | **repick-muted** | *"The honest version of the rule: if raised surfaces get lighter, the ink on them gets lighter too, once, deliberately."* The alternative capped the ladder and enforced the cap with nothing — *"a quiet 4.38 that no gate catches."* |

## What changed

### The ladder

Bottom to top. Every value verified against `elevation.css`, and read back off the rendered page.

| Token | The step | Dark before → after | Light before → after |
| --- | --- | --- | --- |
| `--bg` | the page | `#16151f` → `#0e0d14` | `#ffffff` → `#eef0f5` |
| `--surface-2` | **sunken** — fields, tracks, disabled, code | `#1b1927` → `#161520` | `#f5f6f9` → `#e3e6ee` |
| `--surface` | the card | `#221f2e` → `#211e2d` | `#ffffff` → `#f8f9fc` |
| `--bg-elevated` | **floating** — menus, panels, drawer, modal, toasts | `#1c1a28` → `#2a2639` | `#ffffff` (unchanged) |
| `--surface-3` | the top step — the readout, chips, the rail's hover | `#2a2739` → `#2d293c` | `#eceef3` → `#e7eaf1` |
| `--seg-active-bg` | the active segmented pill | `#34314a` → `#383350` | `#ffffff` (unchanged) |

Dark's `--bg-elevated` used to sit **below** the card it floated over — `#1c1a28` against
`#221f2e`. It is a full step above it now.

### Nothing casts

Sixteen rules stop drawing a `box-shadow`, which is the list the issue and the review page
carry: the switch knob, the topbar theme pill, the soft toast (`--shadow-sm`); the success
panel, the outline toast, the hover readout (`--shadow-md`); the dropdown panel, the account
menu, the workspace menu, the confirm, the drawer, the command palette, the auth card, the solid
toast, the React modal (`--shadow-lg`); the active segmented pill (`--shadow-seg`).

**Three more were not on that list, and re-running the sweep found them:**

- `src/styles/feedback.css:70` `.ui-fbcomposer {` — a floating composer whose only edge was
  `--shadow-lg`. It already painted `--bg-elevated`; it takes the hairline now.
- `src/styles/motion.css:72` `.m-lift:hover {` — a published utility that cast `--shadow-md` on
  hover. It is the travel alone now, and the `box-shadow` it transitioned went with it.
- `src/styles/feedback.css:36` `.ui-fbpill` — found by the review round, and the one the first
  sweep missed twice over: it wrote its two layers by hand rather than through a `--shadow-*`
  token, so a sweep looking for the tokens did not see it. It cast an accent glow ten pixels down
  and a layer of ink under that, grew both on hover, and its glyph carried a 1px ink
  `drop-shadow()` as well. All of that is gone. It takes **no hairline** in exchange — see
  [the review round](#the-review-round).

The count in the changelog went with them: the entry names the surfaces and no longer states a
number a reader cannot check against the list beside it.

Six floating surfaces stop painting `--surface-2` and paint `--bg-elevated`: the same token
cannot be both a field's inset and a menu's lift. The confirm, the palette and the drawer take it
on the hook each publishes, never on the full-viewport container.

One trap worth naming, because it is silent: the drawer, the confirm and the palette composed
their local shadow with the focus ring — `box-shadow: var(--drawer-shadow), var(--ring)`. With
the shadow at `none` that is `box-shadow: none, var(--ring)`, which **does not parse**, and the
declaration would have been dropped along with the focus ring. The three local hooks are gone and
those rules are `box-shadow: var(--ring)`.

### Two wiring faults the ladder exposed

- **In light the hover readout lost its panel.** `src/styles/tooltip.css` re-pointed
  `--ui-tip-bg` at `--surface`, which was white while the page was white. The ladder makes
  `--surface` the card step, so a readout drawn over a card was painted the card's own colour.
  The override is gone; the readout takes `--surface-3` in both themes. Drawn, rather than
  described: [`found-light-tip-unwired-1440.png`](docs/evidence/elevation/found-light-tip-unwired-1440.png)
  is this branch's stylesheet with that one override put back — the readout measures `#f8f9fc`,
  exactly the card under it. With the fix it measures `#e7eaf1`.
- **The dropdown's accent counter stacked a wash on a raised surface.**
  `.ui-dropdown__badge.is-accent` mixed 14% accent over the row under it. That is fine over the
  page and not over a panel; the ladder made the panel a raised surface and every dark
  theme × accent cell but Emerald went under AA. It takes the shape the nav badge has had since
  #157 — `src/styles/nav.css:128` `.ui-nav__item.is-active .ui-nav__badge.is-accent` — the flat
  surface, the accent as ink. This also closes two of the four rows in the contrast ledger's
  bucket B, which had been prescribing exactly this fix since #157.

### Deprecated, not deleted

`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-seg` and `--shadow-card` **stay
published** and are set to the transparent shadow `0 0 #0000` in both themes. Deleting them would
leave a consumer's
`box-shadow: var(--shadow-lg)` as an unresolved `var()` — which computes to the property's
initial value in most cases but is a silent cliff, and a consumer who deliberately wants a cast
shadow back can set the token instead of rewriting their rules. Nothing under `src/` reads any of
them. `--shadow-ink`, `--sheen`, `--ring` and `--scrim` are untouched: none of them is a cast
shadow.

The three local hooks `--drawer-shadow`, `--confirm-shadow` and `--cmdk-shadow` are removed
rather than zeroed, because a local hook that resolves to `none` and is composed with `--ring` is
the parse trap above.

**The deprecated tokens were `none` until the review round, and that was the same trap pointed at
the consumer.** `none` is valid only on its own, so `box-shadow: var(--shadow-lg), var(--ring)` —
the kit's own pre-0.32 pattern, and the exact line three of its components carried — became
invalid the moment the token resolved, and the browser dropped the whole declaration with the
focus ring inside it. `0 0 #0000` paints the same nothing and composes in a list. The changelog's
breaking entry says so and carries the migration note: a consumer composing a kit shadow with
anything else needs no migration, and one who wants the surface bare should drop the `var()`
rather than rely on it painting nothing.

## `--muted`, measured

The decision asks for `--muted` picked against the **top** of the dark ladder, clearing AA 4.5
with room to spare — a target of ≥ 5.0 on `--bg-elevated` and on `--surface-3`. Dark `--muted`
goes `#948fa8` → `#a29db6`: the same violet-grey, lifted fourteen steps on every channel, so
`G = R − 5` and `B = R + 20` hold exactly as before and the hue does not move.

Every surface dark `--muted` sits on, WCAG 2.x:

| Surface | Old ink on old surface | **Old ink on the new surface** | **New ink on the new surface** |
| --- | --- | --- | --- |
| `--bg` `#0e0d14` | 5.82 | 6.22 | **7.40** |
| `--surface-2` `#161520` | 5.56 | 5.81 | **6.91** |
| `--surface` `#211e2d` | 5.18 | 5.24 | **6.24** |
| `--bg-elevated` `#2a2639` | 5.50 | 4.71 | **5.60** |
| `--surface-3` `#2d293c` | 4.66 | 4.52 | **5.38** |
| `--seg-active-bg` `#383350` | 4.01 | 3.84 | **4.57** |

The middle column is what shipping the ladder without the repick would have cost: the two
floating steps clearing by hundredths, which is the 4.71 / 4.52 the research measured. Every
surface clears 4.5 with the new ink, the two floating steps clear 5.0 with room, and
`--seg-active-bg` — which no rule paints `--muted` on today, and which was already the worst
ground in the kit at 4.01 — clears 4.5 for the first time.

Light `--muted` (`#5c6270`) does not move. It is measured on every new light ground and the worst
is the sunken step: `--bg` 5.36, `--surface` 5.81, `--bg-elevated` 6.11, `--surface-3` 5.07,
`--surface-2` **4.89**. That 4.89 is the ratchet move under [The ladder's bill](#the-ladders-bill).

## The ladder's bill

Everything below moved because a token the decision named moved. Each one is a gate turning red,
not a preference.

| What moved | Why | Gate |
| --- | --- | --- |
| Light `--pink` `#b63361` → `#a92d59`, `--glow-pink` re-tinted from it | Every `--pink`-on-its-own-tint pair reads over the page, and the page is no longer white: the danger nav row, the danger badge, the hovered danger button and the composer's error all fell to 4.38 or below | `stories/signal-contrast.test.js` |
| Light `--chip-success-ink` `#1c7034`, `--chip-warn-ink` `#825900`, `--chip-info-ink` `#096a7c` | #131 gave a toast's action the chip ink; the soft toast's wash composites over the page | `stories/contrast.test.js` |
| Light Ocean `--accent` `#005bc8` → `#005ab4`; light Emerald `#087a52` → `#076c48` | Emerald was the only cell that failed **flat** as well as washed — green has the least room of the four hues | `stories/accent-contrast.test.js` |
| `.ui-app__rail .ui-nav__ic svg` opacity `0.62` → `0.66` | The light rail is `--surface-2` and went down a step with the page; the resting glyph fell to 4.34 against a hard 4.5 bar | `stories/apps/shell-states.test.js` |
| `DISABLED_FLOOR` `5.56` → `4.89` | The 5.56–6.11 band was a property of a white light app. `--disabled-surface` is the sunken step, and light's sunken step used to sit one notch under `#ffffff`. The label still clears WCAG AA, and `DISABLED_MIN` — the bar the rule is actually held to — is 3 | `stories/guidelines/accessibility-floor.test.js` |
| `GLYPH_FLOOR` `4.39` → `3.85` | The four callout glyphs are painted straight on the callout's own translucent wash. Every one is a graphic held to `GRAPHIC_AA` 3:1 and still clears it by more than a quarter again. Deepening four more chip inks to hold a ratchet none of them is failing was the worse trade | `stories/signal-contrast.test.js` |
| Contrast ledger: bucket H deleted, bucket B 4 → 2 rows, buckets C / E / F deepened | H closed because `--muted` rose; B closed two rows because the dropdown badge was fixed; C, E and F deepened by about the step the light page took | `stories/contrast.test.js` |
| Accent gate stops measuring the wash over `--bg-elevated` | It is a raised surface now, and the kit's own rule is that the accent wash goes on a base surface — which is true again once the dropdown badge is fixed | `stories/accent-contrast.test.js` |

Both ratchets move **down**, which the repo treats as a decision somebody writes rather than a
number somebody edits, so each carries the reason at its declaration. Neither is a WCAG bar, and
no WCAG bar is crossed anywhere in this branch.

## Evidence

The board frame the research drew — two cards, the plan dropdown held open over a card, the
account menu, the hover readout over a chart, an outline and a soft toast — plus the React modal
over all of it. Before is `origin/main`, after is this branch, both through the same prototype
page with **no override stylesheet loaded**, so the after frames are the shipped kit.

| Frame | Dark before | Dark after | Light before | Light after |
| --- | --- | --- | --- | --- |
| Board, 1440 | [png](docs/evidence/elevation/before-board-dark-1440.png) | [png](docs/evidence/elevation/after-board-dark-1440.png) | [png](docs/evidence/elevation/before-board-light-1440.png) | [png](docs/evidence/elevation/after-board-light-1440.png) |
| Board, 390 | [png](docs/evidence/elevation/before-board-dark-390.png) | [png](docs/evidence/elevation/after-board-dark-390.png) | [png](docs/evidence/elevation/before-board-light-390.png) | [png](docs/evidence/elevation/after-board-light-390.png) |
| Modal, 1440 | [png](docs/evidence/elevation/before-modal-dark-1440.png) | [png](docs/evidence/elevation/after-modal-dark-1440.png) | [png](docs/evidence/elevation/before-modal-light-1440.png) | [png](docs/evidence/elevation/after-modal-light-1440.png) |
| Modal, 390 | [png](docs/evidence/elevation/before-modal-dark-390.png) | [png](docs/evidence/elevation/after-modal-dark-390.png) | [png](docs/evidence/elevation/before-modal-light-390.png) | [png](docs/evidence/elevation/after-modal-light-390.png) |

Plus [`found-light-tip-unwired-1440.png`](docs/evidence/elevation/found-light-tip-unwired-1440.png)
— the readout fault, drawn from this branch with the one removed override put back.

**The after frames and the found frame were re-shot after the review round**, from the same page
with no override loaded. Each was diffed pixel-for-pixel against the frame it replaced: the only
pixels that moved anywhere in the set are a 20×20 box at the switch knob, which is the hairline
the review round gave it. The before frames are `origin/main` and are untouched.

Two pairs for the fixes a board frame cannot show, each drawn the way the readout fault above was
— this branch's stylesheet with the one rule put back:

| Fix | Before | After |
| --- | --- | --- |
| A hovered row in a raised panel, dark. Before it measures `#211e2d` — the card step — inside a `#2a2639` panel, so the hover is *darker* than the surface it is on. After, `#2d293c` | [png](docs/evidence/elevation/review-dropdown-hover-before-dark-1440.png) | [png](docs/evidence/elevation/review-dropdown-hover-after-dark-1440.png) |
| The switch knob, light, off: a white disc on `#e7eaf1` with and without the hairline | [png](docs/evidence/elevation/review-switch-before-light-1440.png) | [png](docs/evidence/elevation/review-switch-after-light-1440.png) |
| The feedback pill, dark, with and without the accent glow and the ink under it. It is an accent gradient on the page: it is found without either | [png](docs/evidence/elevation/review-pill-before-dark-1440.png) | [png](docs/evidence/elevation/review-pill-after-dark-1440.png) |

Surfaces read off the rendered pixels rather than the stylesheet, page / card / dropdown panel /
readout / account menu:

- **dark before** `#16151f` / `#221f2e` / `#1b1927` / `#2a2739` / `#1b1927` — the panel and the
  menu are *darker* than the card they float over.
- **dark after** `#0e0d14` / `#211e2d` / `#2a2639` / `#2d293c` / `#2a2639`.
- **light before** `#ffffff` / `#ffffff` / `#f5f6f9` / `#ffffff` / `#f5f6f9`.
- **light after** `#eef0f5` / `#f8f9fc` / `#ffffff` / `#e7eaf1` / `#ffffff`.

## The review round

An independent review of the branch — grep over the sweep, the ladder's values, the `--muted`
table, the bill and both ratchets — raised ten findings. Nine are fixed in the commits above;
number 3 is [Open to Artur](#open-to-artur) below, because it is a value he picked from rendered
frames and not a defect to repair quietly.

| # | Finding | What was done |
| --- | --- | --- |
| 1 | `.ui-fbpill` still cast a real drop shadow — a `0 10px 26px` accent glow plus `0 2px 6px` of ink, heavier on hover — under a spec and a changelog that say nothing casts | **Stripped**, and the glyph's `drop-shadow()` with it. Decision below |
| 2 | `--shadow-*: none` makes `box-shadow: var(--shadow-lg), var(--ring)` — the kit's own pre-0.32 pattern — invalid, silently deleting the consumer's focus ring | Deprecated to `0 0 #0000`, which composes. Changelog's breaking entry says so and carries the migration note |
| 3 | Light's ladder is not monotonic: `--surface-3` sits below the page, so the light readout renders like an input, while the spec and the Elevation story claimed a monotonic ladder | **Open to Artur.** The spec and the story now state what actually ships, and neither claims monotonic |
| 4 | Hover/active rows and chips inside raised panels painted `--surface`, a step *below* `--bg-elevated` in dark: menu hover sank while the palette lifted | Every one of them lifts to `--surface-3`. The dropdown's search field goes the other way to the sunken step |
| 5 | The switch knob lost its only edge: white on `#e7eaf1` at 1.20:1 with no hairline | Takes `--border-strong`, the edge the checkbox beside it uses |
| 6 | `package-lock.json` still said `0.31.0`, in both places it states a version | Bumped, and the packaging guard now reads the lockfile so it cannot drift again |
| 7 | The floor page cited `src/tokens/tokens.css:171` `--disabled-ink-bare` for a rule about `--disabled-ink` | Re-pointed to `src/tokens/tokens.css:164` `--disabled-ink: var(--muted);`, with the whole declaration as the pattern — the old citation passed only because `--disabled-ink` is a prefix of `--disabled-ink-bare` |
| 8 | The changelog said the dark card got *lighter* (it went `#221f2e` → `#211e2d`, darker) and its swept list was two rules short | Corrected, list completed, count dropped, three entries added for this round |
| 9 | "The disabled primary reads 6.91:1 in dark" cherry-picks — light reads 4.89, and the floor page still said 5.56 | Both themes stated in both places, and a new test measures the pair and requires the rule's prose to say both |
| 10 | The select's chevron hard-codes dark `--muted`'s old `#948fa8` inside a data URI — 2.49:1 on the light field | Written once per theme from the current `--muted`, and the colour gate now decodes `%23` so it can see the next one |

Three of the nine were fixed by **adding a gate**, because each had survived precisely because
nothing read it:

- `stories/colour-tokens.test.js` sweeps encoded colours in data URIs and requires each to still
  be a value `src/tokens` declares. Verified by putting `#948fa8` back: it reds and names the line.
- `scripts/packaging.test.js` asserts both of the lockfile's version fields against
  `package.json`.
- `stories/guidelines/accessibility-floor.test.js` measures `--disabled-ink` on
  `--disabled-surface` in both themes and requires the floor page's own prose to quote both.
  Verified by putting `5.56:1` back: it reds and prints the measured number.

**Why the pill takes no hairline.** The rule is a step on the ladder plus a line, and the pill is
on neither: it paints an accent gradient at full fill strength, over the page. That is the solid
toast's case — *"it is the status at full fill strength and needs no edge to be found"* — and a
grey `--border` line around a purple gradient is not a vocabulary this kit has. What stays is the
inset sheen, which is gloss on the surface rather than a layer of ink under it. Stripping the
glyph's `drop-shadow()` draws the line the spec now states: **a cast shadow is an offset layer of
ink, whichever property draws it; a zero-offset layer of the signal's own colour is a glow.** That
is what keeps the success mark's two green `drop-shadow()` glows legitimate, and they stay.

## Open to Artur

**Light's ladder is not monotonic, and its top step is the one that cannot be.**

| | Dark | Light |
| --- | --- | --- |
| `--bg` the page | `#0e0d14` | `#eef0f5` |
| `--surface-2` sunken | `#161520` | `#e3e6ee` |
| `--surface` card | `#211e2d` | `#f8f9fc` |
| `--bg-elevated` floating | `#2a2639` | `#ffffff` |
| `--surface-3` **top** | `#2d293c` | **`#e7eaf1`** |

In dark every step is lighter than the one under it. In light `--surface-3` is *below the page*
and 1.04:1 above the sunken step — so the hover readout, which is the surface that rides highest
in the kit, renders in light as a recessed panel that reads like an input
([`after-board-light-1440.png`](docs/evidence/elevation/after-board-light-1440.png), the readout
above the bars). `#e7eaf1` is the value the picked prototype carried and the frames were approved
on, so it ships as picked. The two options:

1. **Keep it, and say what it means** — what this branch does. Light's top step is the *quiet
   fill*: a chip, a hovered row, the readout's panel. The spec says so, the Elevation story says
   so, and neither claims a ladder light does not run. A hover inside a white panel is drawn
   downwards, which is how light themes have always drawn one.
2. **Give the readout the top** — it would have to take `--bg-elevated` (white) with the hairline,
   since nothing in light is brighter than white. That makes the readout and the panel it is
   drawn over the same colour, which is exactly the trap the rejected `card-stays-white` option
   was rejected for; the line would be carrying all of the separation.

**Recommended: 1.** It is the picked value, it is honest about what light can do, and option 2
spends the one step light has left on the surface that needs it least — a readout is transient
and small, and the hairline it already has is doing the work. If the recessed readout is wrong to
your eye, the fix is a new value for light's `--surface-3`, which is a pick to make on rendered
frames rather than a defect to repair here.

## Where the rule is written now

- `docs/specification.md` gets an **Elevation** section: the ladder with both themes' values,
  what the line does that the step cannot, where the accent wash may be painted, what a row inside
  a raised panel takes, the line between a cast shadow and a glow, the standing cost to the ink —
  and, after the review round, the plain statement that **light's ladder is not monotonic** and
  what its top step means instead.
- `Foundations/Elevation` in Storybook was three shadow swatches that now render nothing. It
  draws the ladder instead, each step over the step it actually sits on, with a pair showing what
  the hairline adds. The story export is renamed `Shadows` → `Ladder`; nothing references its id.
- `Foundations/Backgrounds` orders its surface list by the ladder and says so. The card story,
  the drawer guideline and the site's bento cells stop calling light an all-white app, and the
  site's adoption prompt stops telling a consumer to migrate to `--shadow-*`.

## Proof

Re-run in full on the rebased tree (`7cb8727`); the earlier run after the review round is
superseded by this one.

| Check | Command | Result |
| --- | --- | --- |
| Node suite | `npm test` | 1,416 tests, **1,414 pass, 2 skipped, 0 fail** (2m06s) |
| Node suite, serially | `node --test --test-concurrency=1 'src/**/*.test.js' 'stories/**/*.test.js' 'site/**/*.test.js' 'scripts/**/*.test.js'` | same 1,416, **1,414 pass, 2 skipped, 0 fail** (6m43s) — the timing test passes with no contention |
| React build | `npm run build --workspace react` | pass |
| React tests | `npm test --workspace react` | **353 pass**, 17 files — the 31 added are #305's `react/src/field-zoom.test.tsx` |
| Secrets | `gitleaks detect --config .gitleaks.toml --log-opts origin/main..HEAD` | every commit this branch adds to `main`, **no leaks found** (v8.30.1) |
| Internal terms | the `.pre-commit-config.yaml` denylist, over `git diff origin/main..HEAD -U0` | clean |
| Slop detector | `slop-detector.js` over every file this branch touches | **0 errors / 4 medium / 3 warnings — identical to the same sweep over the same files on `origin/main`, run back to back** |
| Gates #305 and this branch both touch | `stories/field-zoom.test.js`; `stories/contrast.test.js`; `stories/accent-contrast.test.js`, `stories/signal-contrast.test.js` and `stories/guidelines/accessibility-floor.test.js` | 14 pass; 21 pass + the accent skip; 122 pass |
| Citations | `scripts/code-refs.test.js`, `scripts/doc-refs.test.js`, `stories/guidelines/refs.test.js` | 92 pass |

The two skips are the ones `main` skips: the accent sweep behind `CONTRAST_ACCENTS=1`, and the
story-id check that needs a `storybook-static/` build.

**Timing note.** `stories/contrast.test.js` "the walk has not run away with the clock" is on the
edge of its 120s ceiling and flips with load. It failed twice during the branch's earlier runs —
157.9s under the full suite's contention, and 122.8s with the file run alone. It passed on both
runs above, and the serial run is the clean read: with nothing else on the machine it does not
come near the ceiling. The same file run alone on `origin/main`, back to back in the same shell,
measured **125.9s** against this branch's **122.8s**: the branch is *faster* than main on the same
machine, so the ceiling is a property of the host rather than of this change, and it is not
touched here.

## Decisions taken while implementing

Small and reversible, listed rather than asked:

| Decision | Why |
| --- | --- |
| Deprecate the five `--shadow-*` in place rather than delete them, at `0 0 #0000` rather than `none` | A published token a consumer reads should degrade to nothing, not to an unresolved `var()` — and not to a value that is invalid in the list the kit's own pattern reads it in. Named in the changelog as **breaking** anyway, because the kit's own appearance changes |
| Remove `--drawer-shadow` / `--confirm-shadow` / `--cmdk-shadow` | A local hook at `none` composed with `--ring` is a parse error that silently deletes the focus ring |
| `--shadow-card` deprecated in light as well | It was already `none` in dark and unread since #284; leaving light's two-layer value published would contradict the rule the same file states |
| The soft toast takes a status-tinted hairline at 22% (the outline style's is 40%) | Its shadow was its only edge. A `--border` hairline on a status-tinted wash reads as a stray line; the status tint at half the outline's weight is the same vocabulary |
| The solid toast takes no border | It is the status at full fill strength and needs no edge to be found |
| `.ui-card--accent` re-colours the card's hairline instead of keeping its inset ring | With the card edged in both themes, the ring drew a second line inside the first |
| `--disabled-ink-bare` kept, though the ladder closed the three grounds it was cut for | It is the margin above the floor now rather than the rescue from under it, and the rule that holds every box-less disabled rule to it is unchanged. Retiring it is its own change |
| Light `--muted` left alone | The decision names dark. Its worst new ground is 4.89, which clears AA; holding the 5.56 ratchet would have meant darkening the secondary ink across the whole light theme, which nobody asked for |
| `site/index.html`'s `.term` keeps its window shadow | It is chrome for a simulated terminal window, not a kit surface. Worth a second opinion |

## Not done

- **`docs/reviews/`** is untouched. The prototype and its `elevation.css` stay on
  [#299](https://github.com/apliteni/apliteni-ui/pull/299).
- **`--disabled-ink-bare` is now within one step of `--muted`** (`#a39eb7` against `#a29db6`,
  5.44 against 5.38 on `--surface-3`). The token has arguably outlived its reason; retiring it
  belongs to whoever owns #273, not to this issue.
- **No Storybook static build** was run, so the one story-id check that needs
  `storybook-static/` stays skipped, as it does on main.
- Light's ladder **tops out at white**. A floating panel and anything that would need to float
  above it are the same colour, which is the limit the rejected `card-stays-white` option would
  have hit one step sooner. Nothing in the kit needs that step today.

Found during the review round and deliberately left, each one a change nobody asked for:

- **`src/styles/badge.css:29` `.ui-badge--archive`** paints `--surface` in dark, so a neutral
  badge on a card is the card's own colour. Light already gives the same chip `--surface-3`
  (`badge.css:39`), which is what the ladder says a chip is. Unifying them would re-colour every
  neutral badge in dark, which is a design change rather than a defect fix — and it is outside a
  raised panel, where the finding was.
- **`src/styles/command-palette.css:297` `.ui-cmdk--roomy .ui-cmdk__ic`** paints `--surface`
  inside the raised palette, so the icon tile is a well rather than a tile. It is deliberately
  paired with an active state one step deeper (`--surface-2`), so moving it is a design decision
  about that pair, not a mis-wiring.
- **The three prose ratios in the floor page's history** (1.48, 1.35, the 5.56–6.11 band) are
  past-tense and stay; only the present-tense pair is pinned by the new test.

## Linked issue

Closes [#295](https://github.com/apliteni/apliteni-ui/issues/295).

## Changelog entry

`0.32.0` in `site/changelog.mjs` — four `breaking`, two `changed`, six `fixed`. `0.32.0` was
free: `origin/main` is on `0.31.0` and no open branch had taken it. The kit's #305 is `0.31.1`
and lands first. `package.json` and both of `package-lock.json`'s version fields agree.
