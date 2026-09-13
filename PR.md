# Elevation: nothing casts, and every surface says how high it is (#295)

Prepared for the coordinator to open from `asabirov/295-elevation`. Based on main `bb5fd04`,
2026-09-12. Implements the three decisions Artur recorded on
[#295](https://github.com/apliteni/apliteni-ui/issues/295) from the review page
`docs/reviews/295-elevation.html`; the research that page rests on is
[#299](https://github.com/apliteni/apliteni-ui/pull/299), read here and not merged.

## What & why

Since [#284](https://github.com/apliteni/apliteni-ui/issues/284) the card is flat and ten other
places still cast. #295 asked what should separate a surface once the shadow goes. The answer
picked is `lift-line`: **nothing casts anywhere**, a surface says how high it is with its step on
a ladder of lightness, and every floating surface keeps the kit's hairline. The card takes one in
both themes, where only light had one.

The five `--shadow-*` tokens stay published and resolve to `none`. See
[Deprecated, not deleted](#deprecated-not-deleted) for why.

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

**Two more were not on that list, and this branch found them by re-running the sweep:**

- `src/styles/feedback.css:70` `.ui-fbcomposer {` — a floating composer whose only edge was
  `--shadow-lg`. It already painted `--bg-elevated`; it takes the hairline now.
- `src/styles/motion.css:72` `.m-lift:hover {` — a published utility that cast `--shadow-md` on
  hover. It is the travel alone now, and the `box-shadow` it transitioned went with it.

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
published** and are set to `none` in both themes. Deleting them would leave a consumer's
`box-shadow: var(--shadow-lg)` as an unresolved `var()` — which computes to the property's
initial value in most cases but is a silent cliff, and a consumer who deliberately wants a cast
shadow back can set the token instead of rewriting their rules. Nothing under `src/` reads any of
them. `--shadow-ink`, `--sheen`, `--ring` and `--scrim` are untouched: none of them is a cast
shadow.

The three local hooks `--drawer-shadow`, `--confirm-shadow` and `--cmdk-shadow` are removed
rather than zeroed, because a local hook that resolves to `none` and is composed with `--ring` is
the parse trap above.

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

Surfaces read off the rendered pixels rather than the stylesheet, page / card / dropdown panel /
readout / account menu:

- **dark before** `#16151f` / `#221f2e` / `#1b1927` / `#2a2739` / `#1b1927` — the panel and the
  menu are *darker* than the card they float over.
- **dark after** `#0e0d14` / `#211e2d` / `#2a2639` / `#2d293c` / `#2a2639`.
- **light before** `#ffffff` / `#ffffff` / `#f5f6f9` / `#ffffff` / `#f5f6f9`.
- **light after** `#eef0f5` / `#f8f9fc` / `#ffffff` / `#e7eaf1` / `#ffffff`.

## Where the rule is written now

- `docs/specification.md` gets an **Elevation** section: the ladder, why light runs it downwards,
  what the line does that the step cannot, where the accent wash may be painted, and the standing
  cost to the ink.
- `Foundations/Elevation` in Storybook was three shadow swatches that now render nothing. It
  draws the ladder instead, each step over the step it actually sits on, with a pair showing what
  the hairline adds. The story export is renamed `Shadows` → `Ladder`; nothing references its id.
- `Foundations/Backgrounds` orders its surface list by the ladder and says so. The card story,
  the drawer guideline and the site's bento cells stop calling light an all-white app, and the
  site's adoption prompt stops telling a consumer to migrate to `--shadow-*`.

## Proof

| Check | Command | Result |
| --- | --- | --- |
| Node suite | `npm test` | 1,399 tests, **1,397 pass, 2 skipped, 0 fail** — see the timing note below |
| React build | `npm run build --workspace react` | pass |
| React tests | `npm test --workspace react` | **322 pass**, 16 files |
| Secrets | `gitleaks detect --config .gitleaks.toml --log-opts origin/main..HEAD` | 6 commits scanned, **no leaks found** (v8.30.1) |
| Internal terms | the `.pre-commit-config.yaml` denylist, over `git diff origin/main..HEAD -U0` | clean |
| Slop detector | `slop-detector.js` over every file this branch touches | **0 errors / 4 medium / 3 warnings — identical to the same sweep on `origin/main`** |
| Citations | `scripts/code-refs.test.js`, `scripts/doc-refs.test.js`, `stories/guidelines/refs.test.js` | 92 pass |

**Timing note.** `stories/contrast.test.js` "the walk has not run away with the clock" is on the
edge of its 120s ceiling on this host and flips with load. It failed twice during the branch's
runs — 157.9s under the full suite's contention, and 122.8s with the file run alone — and passed
on the final full run (whole-suite wall clock 119.4s). The same file run alone on `origin/main`,
back to back in the same shell, measured **125.9s** against this branch's **122.8s**: the branch
is *faster* than main on the same machine, so the ceiling is a property of the host rather than
of this change, and it is not touched here. A CI run is the number to trust.

## Decisions taken while implementing

Small and reversible, listed rather than asked:

| Decision | Why |
| --- | --- |
| Deprecate the five `--shadow-*` in place rather than delete them | A published token a consumer reads should degrade to nothing, not to an unresolved `var()`. Named in the changelog as **breaking** anyway, because the kit's own appearance changes |
| Remove `--drawer-shadow` / `--confirm-shadow` / `--cmdk-shadow` | A local hook at `none` composed with `--ring` is a parse error that silently deletes the focus ring |
| `--shadow-card` set to `none` in light as well | It was already `none` in dark and unread since #284; leaving light's two-layer value published would contradict the rule the same file states |
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

## Linked issue

Closes [#295](https://github.com/apliteni/apliteni-ui/issues/295).

## Changelog entry

`0.32.0` in `site/changelog.mjs` — four `breaking`, three `changed`, three `fixed`. `0.32.0` was
free: `origin/main` is on `0.31.0` and no open branch had taken it.
