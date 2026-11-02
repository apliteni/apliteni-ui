# Colour and theming

## Semantic tokens

**Rule:** Add and use a semantic colour token before writing a literal colour.

**Why:** A literal cannot follow theme or accent.

**Do:** Use tokens for ground and ink.

**Don't:** Write dark-theme colours as literals.

**Except:** Token definitions set colours. The mask `#000` controls alpha, not colour.

<!-- rule: tokens -->

## Stable signals

**Rule:** Accents can follow sub-themes, but `--pink` and `--green` stay fixed.

**Why:** If danger followed the accent, revoke and go would match.

**Do:** Keep errors `--pink` under every accent.

**Don't:** Point `--pink` at the accent.

**Except:** Signals change across `data-theme`. Light deepens `--pink` from `#e97ca5` to `#b63361` to stay legible on white.

<!-- rule: signals -->

## Accent contrast

**Rule:** Use `--accent-strong` for accent ground and `--accent` for accent ink.

**Why:** `--accent` is canvas ink. Darker `--accent-strong` lets white text pass AA.

**Do:** Put white text on `--accent-strong`.

**Don't:** Use `--accent` as ground.

**Except:** Only Nebula gives the tokens different values. Artur chose `--accent` for dark selected Segmented pills on #614.

<!-- rule: accent-strong -->

## Limit selection accents

<!-- rule: selection-accent -->

**Rule:** Give selected navigation one accent signal: a Segmented pill's fill or an underline tab's bar.

**Why:** Two accent marks on one item suggest two states.

**Do:** Use contrasting ink on Segmented pills and strong ink above underline bars. SidebarNav follows Keep text off grey fills.

**Don't:** Add an accent counter or other second accent mark to a selected tab.

**Except:** NavTabs pills keep accent ink on a soft fill, because fill alone is too faint to mark the route. Artur chose this on #429.

## Keep text off grey fills

<!-- rule: text-surface -->

**Rule:** Keep text on page or card surfaces, never on grey fills.

**Why:** Grey reading areas look disabled.

**Do:** Give inputs edges. Keep grey fills for textless states: disabled tracks, dividers.

**Don't:** Put text on grey fields, chips, headers or footers.

**Except:** The SidebarNav rail is the card surface. Its current row and label get a quiet fill one step off it, without accent or edge. An outline means focus. Artur chose this in r34 of #475. Neutral status chips get a light muted-ink tint, off the panel one way per theme, matching coloured chips.

## Mark selection in forced colours

<!-- rule: selected-forced-colours -->

**Rule:** In forced colours, give a selected item the highlight colour and its label the highlight text colour.

**Why:** The mode replaces author backgrounds.

**Do:** Ring a focused selected item in page text colour.

**Don't:** Mark selection with an outline.
