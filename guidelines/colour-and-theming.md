# Colour and theming

## Semantic tokens

**Rule:** Add and use a semantic colour token before writing a literal.

**Why:** Literals cannot follow themes or accents.

**Do:** Use tokens for ground and ink.

**Don't:** Freeze dark-theme colours.

**Except:** Token definitions set colours. Mask `#000` controls alpha, not colour.

<!-- rule: tokens -->

## Stable signals

**Rule:** Accents can follow sub-themes, but `--pink` and `--green` stay fixed.

**Why:** If danger followed accents, revoke and go would look identical.

**Do:** Keep errors `--pink` under every accent.

**Don't:** Point `--pink` at the accent.

**Except:** Across `data-theme`, signals change: light deepens `--pink` from `#e97ca5` to `#b63361` for legibility on white.

<!-- rule: signals -->

## Accent contrast

**Rule:** Use `--accent-strong` for accent ground and `--accent` for accent ink.

**Why:** `--accent` is canvas ink; darker `--accent-strong` lets white clear AA.

**Do:** Set white text on `--accent-strong`.

**Don't:** Use `--accent` as ground.

**Except:** Only Nebula gives the two tokens different values. Artur chose `--accent` for dark selected Segmented pills on #614.

<!-- rule: accent-strong -->

## Limit selection accents

<!-- rule: selection-accent -->

**Rule:** Limit selected navigation to one accent signal: a Segmented pill's fill or an underline tab's bar.

**Why:** Two accent marks on one item imply two states.

**Do:** Use contrasting ink on Segmented pills and strong ink above underline bars. See Keep text off grey fills for SidebarNav.

**Don't:** Add a second accent mark, such as an accent counter, to a selected tab.

**Except:** NavTabs pills keep accent ink on soft fill. Fill alone is too faint to mark the route. Artur chose this on #429.

## Theme checks

**Rule:** Check both themes and two accents before a PR.

**Why:** A pair passing AA in dark can fail in light over a card wash.

**Do:** Test both themes and two accents.

**Don't:** Check only dark and one accent.


<!-- rule: both-themes -->

## Keep text off grey fills

<!-- rule: text-surface -->

**Rule:** Keep text on page or card surfaces, never grey fills.

**Why:** Grey reading areas appear disabled.

**Do:** Give inputs edges. Reserve grey fills for non-text states, such as disabled tracks and dividers.

**Don't:** Put text on grey fields, chips, headers or footers.

**Except:** The page shell's SidebarNav rail is the card surface. Its current row and label take a quiet fill one rung off the rail, without accent or edge. An outline means focus. Artur chose this in r34 of #475. Neutral status chips use a light muted ink tint that leaves the panel in one direction per theme. They read as one family with coloured chips.

## Mark selection in forced colours

<!-- rule: selected-forced-colours -->

**Rule:** In forced colours, fill a selected item with the highlight colour and its label with the highlight text colour.

**Why:** The mode replaces author backgrounds. A specimen cannot switch it on, so this rule draws no pair.

**Do:** Ring a focused selected item in the page text colour.

**Don't:** Mark selection with an outline.
