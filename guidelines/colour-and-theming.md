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

**Why:** `--accent` is text on the canvas; its darker sibling, `--accent-strong`, lets white clear AA.

**Do:** Use `--accent-strong` behind white text.

**Don't:** Use `--accent` as that ground.

**Except:** In Phoenix, Ocean and Emerald, both are one token; the difference matters only in Nebula.

<!-- rule: accent-strong -->

## Theme checks

**Rule:** Check dark and light themes and at least two accents before opening a PR.

**Why:** A pair that clears AA in dark can fail in light over a card’s wash.

**Do:** Test both themes and two accents.

**Don't:** Check only dark mode and one accent.


<!-- rule: both-themes -->
