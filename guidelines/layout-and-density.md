# Layout and density

## Use the container token

<!-- rule: container -->

**Rule:** Read the page width from `--container`, and do not write the number.

**Why:** Shared tokens prevent page widths that conflict, and they prevent topbar overrides.

**Do:** Use `--container` for the page width and the topbar width.

**Don't:** Put four page-width numbers in different files.

## Use the measure token

<!-- rule: measure -->

**Rule:** Use `--measure` for a reading column, and never use `--container` for it.

**Why:** `--container` covers the width of the page, but `--measure` limits the text beside a sidebar.

**Do:** Use `--measure` for a reading column that has a sidebar.

**Don't:** Treat `--container` and `--measure` as two page widths that compete.

## Use the spacing scale

<!-- rule: density -->

**Rule:** Set density with the spacing scale, and note that the kit has no kit-wide density mode.

**Why:** The ten-step scale aligns gaps and padding, so a density switch at runtime is not necessary.

**Do:** Use `--space-3` for rows inside a card.

**Don't:** Set separate values such as `13px`, `9px`, `14px`, `6px`, and `17px`.

**Except:** `.ui-table--dense` applies only inside its component. Inside base `--space-4`, it uses `--space-3` across and `--space-2` down. It still uses the scale. Do not add a compact or comfortable mode, a `data-density` attribute or a row-height scale.

## Use panel and prose units

<!-- rule: below-the-page -->

**Rule:** Below the reading column, use `--panel-*` in `px` for component boxes and `--prose-*` in `ch` for text lines.

**Why:** Pixel widths keep content of different sizes in one box, and `ch` limits a text line by the font size of that line.

**Do:** Use panel `sm/md/lg` for 320/420/560px boxes, and use prose tokens for caption, lede, body and dense text.

**Don't:** Use t-shirt sizes for prose, or put `ch` on a wrapper that has two font sizes.

**Except:** Put `ch` on the element that has the font size it measures. The centred `.ui-section-head` uses `--panel-lg` for its 40px heading and its 17px copy. Keep `.ui-footer__brand` at 300px, because its flex track controls wrapping.

## Use the three breakpoints

<!-- rule: breakpoints -->

**Rule:** Use the literal breakpoint values 860px, 720px or 560px.

**Why:** Media queries cannot read custom properties, and an added compiler would make the published CSS less readable.

**Do:** Use `@media (max-width: 860px)`.

**Don't:** Use `@media (max-width: var(--panel-lg))` or add other breakpoint values.

**Except:** `560` also equals `--panel-lg`, and `860` equals `--measure`, but viewport breakpoints and box widths are independent. Do not suggest a link between them.
