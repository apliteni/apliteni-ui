# Signal contrast on the glow washes

This page is for a maintainer. It records why the signal tokens hold their current values.
It was the Storybook page Foundations → Signal contrast until #758 moved it here.

The ratios below were computed on 2026-10-31 from the token values in
[`src/tokens/tokens.css`](../src/tokens/tokens.css), by the WCAG 2.x formula. They do not
update when a token moves. [`stories/signal-contrast.test.js`](../stories/signal-contrast.test.js)
holds the current values.

## How to read the numbers

- The AA line is 4.5:1, the WCAG 2.2 §1.4.3 threshold for normal text. No specimen here is
  large text. The largest is 14.5px and the smallest is 11px.
- A glyph is held to 3:1, the WCAG 2.2 §1.4.11 threshold for non-text contrast.
- Each ratio uses the two colours that the cell paints. A wash counts as the flat colour that
  it composites to over its base.
- A live component lets the compositor blend the wash. That can round a channel one step
  further, worth at most 0.05 of a ratio. It changes no verdict on this page.

## The problem

In the light theme, `--pink`, `--cyan` and `--green` all missed AA for normal text. They
missed it most on a 10% wash of the same colour, which is the surface where the kit puts them.
Dark `--pink` also missed it.

- Cyan and green were fixed when their chips moved to the deepened chip pairs. Neither token
  moved.
- `--pink` moved in both themes, in opposite directions.
- The same rule was then needed for surfaces where a signal is the fill and not the ink.

## 1. The four places that failed

Each pair used to miss AA and clears it now. The pill and the badge moved to a chip pair. The
nav row and the field follow `--pink`, which moved.

| Place | Ink and ground | Light | Dark |
| --- | --- | --- | --- |
| Destructive nav row, hovered: `.ui-nav__item.is-danger:hover` in `src/styles/nav.css` | `--pink` on `--glow-pink` | 4.98 | 4.65 |
| Live pill: `.ui-pill--live` in `src/styles/badge.css` | `--chip-success-*` | 4.64 | 8.42 |
| Info badge: `.ui-badge--info` in `src/styles/badge.css` | `--chip-info-*` | 4.71 | 7.20 |
| Required marker and field error: `.ui-field__req` and `.ui-field__error` in `src/styles/input.css` | `--pink` on plain `--surface`, no wash | 5.78 | 6.05 |

All eight cells pass AA.

The field is why a consumer change could not fix pink. Its `--pink` sits on plain white with
no wash under it, and it missed AA there too: 4.42 on white alone. The wash was only the part
that turned a near miss into a clear miss. So the token itself had to move.

## 2. The mechanism: more ink in the ground lowers the contrast

Each row is one signal colour on grounds that hold more and more of the same colour over
white. `--surface-2`, the grey inset, sits where its own contrast puts it. The glow wash is
worth about twice the darkening of `--surface-2`. This part does not depend on the shipped
values. It is why a signal on its own tint is the surface to design against.

| Ink | Specimen | White (`--surface`) | 5% wash | `--surface-2` | 10% (glow) | 15% wash | 20% wash |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `--pink` #b63361, danger | 14.5px nav row label | 5.78 | 5.37 | 5.35 | 4.98 | 4.58 | 4.23 fails |
| `--cyan` #0c8fa8, link and info | 11px badge | 3.81 fails | 3.59 fails | 3.53 fails | 3.39 fails | 3.18 fails | 3.00 fails |
| `--green` #1c8a2c, live and success | 11px pill | 4.45 fails | 4.17 fails | 4.12 fails | 3.91 fails | 3.65 fails | 3.44 fails |

Cyan and green are short of AA even on plain white. The wash turns a near miss into a clear
miss.

## 3. Green and cyan: the chips moved, the tokens did not

A chip pair is a solid ink on a solid fill, with no wash. A chip that reads its pair instead of
a raw signal is fixed without a change to a colour that other rules use. Every green and cyan
failure was a chip. So `--green` and `--cyan` keep the values they always had.

| Chip | Pair | Ratio |
| --- | --- | --- |
| Revoked | `--chip-danger-*` | 4.85 |
| Pending | `--chip-warn-*` | 4.93 |
| Live | `--chip-success-*` | 4.64 |
| Preview | `--chip-info-*` | 4.71 |

- **Green needed no new token.** Six rules painted `var(--green)` on `var(--glow-green)` at
  3.97. Next to them, `.ui-badge--live` used the chip pair and passed at 4.64. Each fix moved
  one line to the existing pair. The 3.97 is the value at that time. A later re-tint of
  `--glow-green` from `--green` moved it to 3.91.
- **Cyan needed a new pair.** `.ui-badge--info` was the last chip variant that still painted
  a raw signal token, at 3.39 on its own glow. `--chip-info-*` was added as #0a7286 on
  #ddeff3, at 4.71. That is inside the 4.64 to 4.93 band of the other three pairs.

Danger could also take this route. `--chip-danger-ink` measures 6.01 on white. It did not take
it, because the failing danger consumers are not chips. A nav row on hover and two pieces of
form text cannot borrow a chip token without a second job that the token's own comment
rejects. Section 4 covers danger.

## 4. The one token that moved: `--pink`

Danger is read mostly on its own wash. A wash pulls the ground toward the ink from the side
where the page starts.

- In light, the ground is white. The wash does not lighten it, so the ink had to go darker:
  #d63c72 to #b63361.
- In dark, the ground is near-black. The wash lifts the ground faster than the hue lifts the
  ink, so the ink had to go lighter: #e35b8f to #e97ca5.

The table shows the same surfaces before and after #131.

| Theme | `--pink` | Ground | Ratio |
| --- | --- | --- | --- |
| Light, before | #d63c72 | white (`--surface`) | 4.42 fails |
| Light, before | #d63c72 | `--surface-2` | 4.09 fails |
| Light, before | #d63c72 | its glow at that time | 3.87 fails |
| Light, now | #b63361 | white (`--surface`) | 5.78 |
| Light, now | #b63361 | `--surface-2` | 5.35 |
| Light, now | #b63361 | `--glow-pink` | 4.98 |
| Dark, before | #e35b8f | `--bg` | 5.30 |
| Dark, before | #e35b8f | its glow at that time, over the page | 4.36 fails |
| Dark, before | #e35b8f | its glow at that time, over a card | 3.82 fails |
| Dark, now | #e97ca5 | `--bg` | 6.80 |
| Dark, now | #e97ca5 | `--glow-pink`, over the page | 5.32 |
| Dark, now | #e97ca5 | `--glow-pink`, over a card | 4.65 |

- **The wash moved with the token.** `--glow-pink` holds a literal `rgba()`, so a move of
  `--pink` alone would leave the wash behind. A second reason: `.ui-btn--danger:hover` mixes
  `--pink` at 10% itself. A frozen `--glow-pink` would put two different pink washes in one
  app. The re-tint changes no verdict: light 5.05 to 4.98, dark over a card 4.90 to 4.65.
- **`--surface-2` is a reference column, not a live failure.** No kit rule puts
  signal-coloured text on it. `.ui-input.is-invalid` puts `--pink` on it as a border. A border
  is held to 3:1, and it clears that.

## 5. When a signal is the fill

The sections above paint a signal as ink. A solid toast inverts that: the signal is the
ground, and another colour must read on it. The kit used to choose the fill from the status
and the ink from a global value. Nothing made a status's fill and its ink clear each other,
and four of the ten status and theme combinations failed. Light `--green` settles it: as a
solid fill it measures 4.40 against near-black and 4.45 against white. No ink can rescue it,
so the fill had to move.

| Theme | Ink (`--signal-solid-ink`) | Success | Danger | Warn | Info | Neutral |
| --- | --- | --- | --- | --- | --- | --- |
| Dark: the bright signals | #0c0c0c | 15.87 | 7.35 | 13.40 | 11.75 | 6.29 |
| Light: the deepened chip inks | white | 5.39 | 6.01 | 5.70 | 5.58 | 6.11 |

All ten pairs clear 4.5:1.

**The rule.** A solid fill is the status at its theme's extreme. The ink is the opposite pole,
so one ink for each theme clears all five. A new status supplies one
`--signal-solid-<status>` on the correct side of its theme's midline and inherits the ink. The
quieter of the two inks is diluted to 90% and not given an `opacity`, because the dilution
used to spend exactly the contrast that the pair was chosen for.

**The status circle takes the ink half of that rule, not the fill half.** A soft or outline
toast draws its glyph on a 22px `--toast-accent` circle. That circle cannot move to the
theme's extreme, because the outline border uses the same token. A circle that left the
accent would put two pinks in one toast. Only the ink is free, and the bar for a glyph is 3:1.

- In dark, one ink still works, because the five dark accents are the same five bright hues
  as the solid fills.
- In light, one ink does not work. The light accents are deepened to read as ink on white,
  so they sit at mid-luminance. Light keeps an ink for each status.

**Dark danger was the combination that broke.** Its glyph was white, which was correct while
dark `--pink` was #e35b8f. Section 4 made it #e97ca5 for the wash, and white then fell below
the 3:1 bar on the circle. Dark `--danger-contrast` is now `--signal-contrast`, so dark danger
is no longer an exception.

| Glyph on the dark danger circle | Ratio |
| --- | --- |
| White on the old circle | 3.41 |
| White on the circle today | 2.66 fails |
| Near-black on the circle today | 7.35 |

Light danger keeps its white glyph at 5.78. Near-black would measure 3.39 there, so the token
stays split by theme. `stories/signal-contrast.test.js` holds all ten solid pairs and all ten
glyph pairs.

## 6. `--glow-green` is a tint of `--green`

A wash is its own colour at low alpha. Green's wash was not. It was `rgba(30, 150, 50, 0.1)`,
while `--green` is #1c8a2c, `rgb(28, 138, 44)`. The two were different from the initial
commit. `rgb(30, 150, 50)` was not a token, a ramp step or the dark green. It was a leftover
from a hand-authored palette. It is now `rgba(28, 138, 44, 0.1)`, which is `--green` at the
alpha of the other three light glows.

| `--green` on | Ratio |
| --- | --- |
| The old wash, #e9f5eb | 3.97 fails |
| `--glow-green` today, #e8f3ea | 3.91 fails |
| White (`--surface`) | 4.45 fails |

- **The change moves almost nothing.** Over white the wash goes from #e9f5eb to #e8f3ea, two
  levels on one channel, worth 0.06 of a ratio. Every surface that reads `--glow-green` keeps
  its verdict. The success callout, the soft success toast, the success panel and the feedback
  confirmation carry body copy at 9.29 before and 9.15 after. The first two cells still fail
  AA against `--green`, as before. The drift did not cause those failures.
- **No chip moved.** The success chips stopped reading `--green` on `--glow-green` in
  section 3. They read `--chip-success-ink` on `--chip-success-fill`, at 4.64. In light that
  fill is the solid #dff3e4, not a wash. Dark `--glow-green` was already an exact tint of dark
  `--green` and did not change.

`stories/signal-contrast.test.js` holds all four glows in both themes.
