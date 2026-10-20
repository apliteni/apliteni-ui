# Colour and theming

## Semantic tokens

**Rule:** Add and use a semantic colour token before writing a literal.

**Why:** Literals cannot follow the theme or accent.

**Do:** Use tokens for ground and ink.

**Don't:** Freeze colours at dark-theme values.

**Except:** Token definitions set the colours; `#000` inside a mask controls alpha, not colour.

<!-- rule: tokens -->

## Stable signals

**Rule:** Let the accent change with a sub-theme, but keep `--pink` and `--green` unchanged.

**Why:** If danger followed the accent, revoke and go would look identical.

**Do:** Keep error as `--pink` under every accent.

**Don't:** Point `--pink` at the accent.

**Except:** Across `data-theme`, signals change: light deepens `--pink` from `#e97ca5` to `#b63361` so it reads as ink on white.

<!-- rule: signals -->

## Accent contrast

**Rule:** Use `--accent-strong` for an accent ground and `--accent` for accent ink.

**Why:** `--accent` is text on the canvas; darker `--accent-strong` lets white clear AA.

**Do:** Use `--accent-strong` behind white text.

**Don't:** Use `--accent` as that ground.

**Except:** In Phoenix, Ocean and Emerald, both are one token; it matters only in Nebula. The selected segmented pill keeps `--accent` in dark, by Artur's choice on #614.

<!-- rule: accent-strong -->

## Limit selection accents

<!-- rule: selection-accent -->

**Rule:** Limit selected navigation to one accent signal: Segmented fill or NavTabs underline.

**Why:** Extra marks compete. A failure specimen breaks this rule.

**Do:** Use contrasting ink on Segmented and body ink on underline NavTabs. For SidebarNav, see Keep text off grey fills.

**Don't:** Accent both the ink and bar.

**Except:** NavTabs pill keeps accent ink over its soft fill to distinguish selection from hover.

## Theme checks

**Rule:** Check dark and light themes and at least two accents before opening a PR.

**Why:** A pair that clears AA in dark can fail in light over a card’s wash.

**Do:** Test both themes and two accents.

**Don't:** Check only dark mode and one accent.


<!-- rule: both-themes -->

## Keep text off grey fills

<!-- rule: text-surface -->

**Rule:** Put text on the page or card surface, never on a grey fill.

**Why:** Grey blocks make reading areas look disabled.

**Do:** Draw inputs with an edge. Keep grey fills for non-text states, such as disabled tracks and dividers.

**Don't:** Put text on grey fields, chips, headers or footers.

**Except:** SidebarNav's current row takes a quiet plate without accent or edge. The rail is a card surface. An outline means focus. A neutral status chip has a soft tint of muted ink. Its tint separates from the panel in each theme, like coloured chips.

## Mark selection in forced colours

<!-- rule: selected-forced-colours -->

**Rule:** In forced colours, fill a selected item with the highlight colour and its label with the highlight text colour.

**Why:** The mode replaces author backgrounds. A specimen cannot switch it on, so this rule draws no pair.

**Do:** Ring a focused selected item in the page text colour.

**Don't:** Mark selection with an outline.
