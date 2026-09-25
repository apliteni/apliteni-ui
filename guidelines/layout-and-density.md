# Layout and density

## Use the container token

<!-- rule: container -->

**Rule:** Read page width from `--container`; do not write the number.

**Why:** Shared tokens prevent conflicting page widths and topbar overrides.

**Do:** Use `--container` for the page and topbar widths.

**Don't:** Put four page-width numbers in different files.


## Use the measure token

<!-- rule: measure -->

**Rule:** Use `--measure`, never `--container`, for a reading column.

**Why:** `--container` spans the page, while `--measure` limits text beside a sidebar.

**Do:** Use `--measure` for a reading column with a sidebar.

**Don't:** Treat `--container` and `--measure` as competing page widths.

## Use the spacing scale

<!-- rule: density -->

**Rule:** Set density with the spacing scale; there is no kit-wide density mode.

**Why:** The ten-step scale aligns gaps and padding without runtime density switching.

**Do:** Use `--space-3` for rows inside a card.

**Don't:** Set separate values such as `13px`, `9px`, `14px`, `6px`, and `17px`.

**Except:** `.ui-table--dense` is component-local: use `--space-3` across and `--space-2` down inside base `--space-4`. It still uses the scale. Do not add a compact/comfortable mode, `data-density` attribute, or row-height scale.

## Use panel and prose units

<!-- rule: below-the-page -->

**Rule:** Below the reading column, use `--panel-*` in `px` for component boxes and `--prose-*` in `ch` for text lines.

**Why:** Pixel widths keep mixed-size content in one box; `ch` limits a text line using its own font size.

**Do:** Use panel `sm/md/lg` for 320/420/560px boxes and prose tokens for caption, lede, body, and dense text.

**Don't:** Use t-shirt sizes for prose or put `ch` on a wrapper with two font sizes.

**Except:** Put `ch` on the element using its font size. The centred `.ui-section-head` uses `--panel-lg` for its 40px heading and 17px copy. Keep `.ui-footer__brand` at 300px because its flex track controls wrapping.

## Use the three breakpoints

<!-- rule: breakpoints -->

**Rule:** Use literal breakpoints of 860px, 720px or 560px.

**Why:** Media queries cannot read custom properties, and adding a compiler would make published CSS less readable.

**Do:** Use `@media (max-width: 860px)`.

**Don't:** Use `@media (max-width: var(--panel-lg))` or add other breakpoint values.

**Except:** `560` also equals `--panel-lg`, and `860` equals `--measure`, but viewport breakpoints and box widths are independent. Do not imply a link between them.
