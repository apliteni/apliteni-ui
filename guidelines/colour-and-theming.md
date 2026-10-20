# Colour and theming

## Semantic tokens

**Rule:** Use semantic colour tokens instead of literals.

**Why:** Literals cannot follow themes or accents.

**Do:** Tokenize ground and ink.

**Don't:** Freeze dark-theme colours.

**Except:** Token definitions set colours; `#000` in masks controls alpha.

<!-- rule: tokens -->

## Stable signals

**Rule:** Let accents follow sub-themes; keep `--pink` and `--green` fixed.

**Why:** If danger followed the accent, revoke and go would match.

**Do:** Keep errors `--pink` under every accent.

**Don't:** Point `--pink` at the accent.

**Except:** Across `data-theme`, light deepens `--pink` from `#e97ca5` to `#b63361` for legibility on white.

<!-- rule: signals -->

## Accent contrast

**Rule:** `--accent-strong` is accent ground; `--accent` is accent ink.

**Why:** `--accent` is canvas ink; darker `--accent-strong` lets white clear AA.

**Do:** Set white text on `--accent-strong`.

**Don't:** Use `--accent` as ground.

**Except:** Phoenix, Ocean and Emerald use one token for both; only Nebula differs. The selected segmented pill keeps `--accent` in dark, by Artur's choice on #614.

<!-- rule: accent-strong -->

## Limit selection accents

<!-- rule: selection-accent -->

**Rule:** Limit selected navigation to one accent signal: the fill of a Segmented pill, or the bar under an underline tab.

**Why:** Two accent marks on one item read as two states.

**Do:** Use contrasting ink on a Segmented pill and strong ink above an underline bar. For SidebarNav, see Keep text off grey fills.

**Don't:** Add a second accent mark, such as an accent counter, to a selected tab.

**Except:** The NavTabs pill keeps accent ink on its soft fill, because the fill alone does not tell the current route from a hovered one, by Artur's choice on #429.

## Theme checks

**Rule:** Before opening a PR, check both themes and two accents.

**Why:** Dark AA can fail over a light card wash.

**Do:** Test both themes and two accents.

**Don't:** Check only dark and one accent.


<!-- rule: both-themes -->

## Keep text off grey fills

<!-- rule: text-surface -->

**Rule:** Keep text on page or card surfaces, off grey fills.

**Why:** Grey reading areas look disabled.

**Do:** Give inputs an edge. Use grey fills for non-text states: disabled tracks and dividers.

**Don't:** Put text on grey fields, chips, headers or footers.

**Except:** In the page shell the rail is the card surface. There, SidebarNav's current row, label and all, takes the quiet fill one rung off the rail, with no accent or edge, because an outline there means focus, by Artur's choice, r34 on #475. A neutral status chip takes a light tint of muted ink that leaves the panel in one direction per theme, so it reads as one family with the coloured chips.

## Mark selection in forced colours

<!-- rule: selected-forced-colours -->

**Rule:** In forced colours, fill selection with highlight and its label with highlight text.

**Why:** Forced colours replace author backgrounds. A static specimen cannot show this mode.

**Do:** Ring focused selection in the page text colour.

**Don't:** Mark selection with an outline.
