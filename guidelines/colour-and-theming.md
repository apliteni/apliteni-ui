# Colour and theming

Where colours come from and which may change with the accent.

## Use a semantic colour token; add one before writing a literal.

<!-- rule: tokens -->

**Why:** Literals cannot follow the theme or accent.

**Except:** The token ramp is not scanned; #000 inside mask is an alpha channel, not a colour.

**Do:** Use tokens for ground and ink.

**Don't:** Freeze them at dark-theme values.

## Let the accent change with a sub-theme; keep --pink and --green unchanged.

<!-- rule: signals -->

**Why:** If danger followed the accent, revoke and go would look identical.

**Except:** Signals change across data-theme: light deepens --pink from #e97ca5 to #b63361 so it reads as ink on white.

**Do:** Error keeps --pink under every accent.

**Don't:** Point --pink at the accent.

## Use --accent-strong for an accent ground and --accent for accent ink.

<!-- rule: accent-strong -->

**Why:** --accent reads as text on the canvas; --accent-strong is its darker sibling, which white clears AA on.

**Except:** Under Phoenix, Ocean and Emerald, both are one token; the difference matters only on Nebula.

## Check dark and light themes and at least two accents before opening a PR.

<!-- rule: both-themes -->

**Why:** A pair that clears AA in dark can fail in light over a card's wash.

**Except:** --surface-3 is not measured: nothing paints the accent wash on a raised surface anymore.
