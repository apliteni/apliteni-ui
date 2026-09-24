# Layout and density

A page has two widths. Without a density mode, spacing scale sets density.

## Take page width from --container. Do not write the number.

<!-- rule: container -->

**Why:** The kit declared 1180px in three files; the site declared 1120px in three others. Each could not see the other, so the site overrode the kit topbar and disagreed with it. A literal width cannot follow a shared decision.

**Except:** The token definitions declare the scale, so they are not scanned.

**Do:** One token, read by both kit and site.

**Don't:** Four page-scale numbers; no two files agree. Drawn to scale, not size.

## A reading column takes --measure, never --container.

<!-- rule: measure -->

**Why:** These are different axes, not competing opinions about one number. --container runs gutter to gutter. --measure is the column inside a track with a sidebar. A shell whose main column is --container has no sidebar. Treating them as competing widths made nine widths seem like one disagreement.

## One width, one place. If a second copy needs a test to stay true, the test is the smell.

<!-- rule: one-source -->

**Why:** The shell had its own 860px beside the value in the layout styles, and a test compared the strings. That is two sources with a guard, not one. The shell now writes no width when the caller gives none, so CSS falls through to the token and nothing must stay in step.

**Except:** A caller may still pass an explicit maxWidth — an override is a decision, not a copy.

## Set density with the spacing scale. There is no kit-wide density mode.

<!-- rule: density -->

**Why:** There is no compact mode, comfortable mode, data-density attribute, or row-height scale. That is intended, not an omission. The ten-step spacing scale is already the control: a tight row takes --space-2; a roomy one, --space-5. Both remain legible as steps in one system. A mode would be justified by a surface needing both densities at once and switching at runtime — a reader preference, not a designer's per-screen choice. No such surface exists here; building the mechanism first would mean guessing its values.

**Except:** .ui-table--dense is the kit's one modifier. It is intentionally component-local: a many-column ledger is the one place where tighter rhythm belongs to the data, not the surrounding page. It is an exception to the mode, not the scale: --space-3 across and --space-2 down, one step tighter than the base table's --space-4. When an old number fell exactly between steps, the job decided the tie: a modifier made to fit more rows rounds down.

**Do:** Every gap and pad is a step: --space-3 rows inside a card.

**Don't:** 13px, 9px, 14px, 6px, 17px — each row settled separately, none aligned.

## Below the reading column, the unit chooses the scale: a box holding a component takes --panel-* in px; a box holding a line takes --prose-* in ch.

<!-- rule: below-the-page -->

**Why:** The bounded thing chooses the unit, and the unit chooses the scale. Neither scale was invented for this purpose. Since it was written, the drawer used sm/md/lg at 320/420/560, and confirm, the auth card, and the toast each repeated one number. The two 420s the kit was asked about were actually three. Prose steps are named for what is read — caption, lede, body, dense — because a writer knows the text type, not its t-shirt size.

**Except:** ch resolves against the font-size of the element carrying it, so put a prose step on the paragraph, never on a wrapper containing two type sizes. .ui-section-head is a centred block with a 40px heading above 17px copy, so it takes --panel-lg instead. .ui-footer__brand keeps literal 300px: it is a flex track whose width controls when the footer wraps, so it follows the row, not a scale.

## A breakpoint stays literal and must be one of the three steps listed in the specification. If you break elsewhere, the gate says so.

<!-- rule: breakpoints -->

**Why:** A media query cannot read a custom property: @media (max-width: var(--panel-lg)) is invalid, and token discipline does not change that. Alternatives are a build step that inlines the value, or a convention keeping the literal under a documented legal-value list, with a gate checking it. The kit ships a plain stylesheet that consumers link or import. A compiler between source and published file would make shipped output harder to read. @custom-media would solve this properly, but is not shipping. Therefore the discipline is the list: three steps describing each change, plus a gate reading them from the specification instead of repeating them. A second list copy would repeat the defect of six values in ten files. Three surfaces each had their own value; each moved to the step above because wider viewports give reflow more room, never less.

**Except:** Two steps coincide with tokens: 560 is also --panel-lg, and 860 is also --measure. Nothing marks that at the query. A breakpoint asks about the viewport; a token bounds a box. The numbers match today, but neither follows the other, so a comment claiming a nonexistent link would confuse readers more than silence.
