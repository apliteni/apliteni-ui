# Colour and theming

## Semantic tokens

**Rule:** Add and use a semantic colour token before you write a literal colour value.

**Why:** A literal value cannot change with the theme or the accent.

**Do:** Use tokens for the ground (the background colour) and the ink (the text colour).

**Don't:** Do not write dark-theme colours as literal values.

**Except:** Token definitions set colours. The mask `#000` controls alpha (transparency), not colour.

<!-- rule: tokens -->

## Stable signals

**Rule:** Accents can follow sub-themes, but `--pink` and `--green` do not change.

**Why:** If the danger colour followed the accent, revoke and go would look identical.

**Do:** Keep errors in `--pink` with every accent.

**Don't:** Do not make `--pink` refer to the accent.

**Except:** Signals change across `data-theme` values. The light theme makes `--pink` darker, from `#e97ca5` to `#b63361`, so that it is legible on white.

<!-- rule: signals -->

## Accent contrast

**Rule:** Use `--accent-strong` for an accent ground and `--accent` for accent ink.

**Why:** `--accent` is the ink colour for the canvas, and `--accent-strong` is darker, so white text on it passes the AA contrast level.

**Do:** Put white text on `--accent-strong`.

**Don't:** Do not use `--accent` as a ground.

**Except:** Only Nebula gives the two tokens different values. Artur chose `--accent` for dark selected Segmented pills on #614.

<!-- rule: accent-strong -->

## Limit selection accents

<!-- rule: selection-accent -->

**Rule:** Give selected navigation only one accent signal, either the fill of a Segmented pill or the bar of an underline tab.

**Why:** Two accent marks on one item suggest two different states.

**Do:** Use contrasting ink on Segmented pills and strong ink above underline bars. For SidebarNav, see Keep text off grey fills.

**Don't:** Do not add a second accent mark, such as an accent counter, to a selected tab.

**Except:** NavTabs pills keep accent ink on a soft fill. The fill alone is too faint to mark the route. Artur chose this on #429.

## Keep text off grey fills

<!-- rule: text-surface -->

**Rule:** Keep text on page or card surfaces, and never put it on grey fills.

**Why:** A grey reading area looks disabled.

**Do:** Give inputs edges. Use grey fills only for states without text, such as disabled tracks and dividers.

**Don't:** Do not put text on grey fields, chips, headers or footers.

**Except:** The SidebarNav rail in the page shell is the card surface. Its current row and label get a quiet fill one step away from the rail, with no accent and no edge. An outline means focus. Artur chose this in r34 of #475. Neutral status chips use a light tint of the muted ink, and this tint moves away from the panel in one direction for each theme. These chips look like one family with the coloured chips.

## Mark selection in forced colours

<!-- rule: selected-forced-colours -->

**Rule:** In forced colours, fill a selected item with the highlight colour and give its label the highlight text colour.

**Why:** Forced colours mode replaces the backgrounds that the author sets.

**Do:** Put a ring in the page text colour around a focused selected item.

**Don't:** Do not use an outline to mark selection.
