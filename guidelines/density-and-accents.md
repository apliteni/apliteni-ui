# Density and accents

## Check a narrow stat band

<!-- rule: check-density -->

**Rule:** At block widths of 28rem or less, a stat band must show one figure per row; placing two figures side by side fails this check.

**Why:** Stacking gives each label and value the full width of the block.

**Do:** Stack Paid and In transit, as [Stat band tiles](https://ui.apli.tech/storybook/?path=/story/components-stat-band--gallery) do in a narrow panel.

**Don't:** Force the same figures side by side in that panel.

## Keep the summary short

<!-- rule: reduce-density -->

**Rule:** Keep the identity, status, key facts and next action visible; remove repeated labels, group related facts, and move history or secondary details out of the preview.

**Why:** The preview helps the reader decide whether to act or open the full record.

**Do:** Keep the payout table compact. Show the selected payout with grouped facts and Open payout. [Linear Peek](https://linear.app) uses this list-and-preview pattern.

**Don't:** Repeat the payout reference, status and amount, then show its history before Open payout.

## Give accents a job

<!-- rule: purposeful-accent -->

**Rule:** Use at most one primary button per preview, use secondary or ghost buttons for other actions, and keep labels and values in neutral ink.

**Why:** One accented action is easier to find than several competing actions.

**Do:** Make Open payout the primary action and Copy reference the secondary action. Keep the amount and date neutral.

**Don't:** Make both actions primary or colour every label and value with the accent.

**Except:** Keep [Badge success, pending and danger](https://ui.apli.tech/storybook/?path=/story/components-badge-status--badges) for their named statuses; do not replace those signals with the accent.

## Follow the consequence

<!-- rule: follow-the-consequence -->

**Rule:** Where a screen shows a source beside the values that will be saved, give the saved values the leading position, the wider column, the heavier weight and whatever accent the pair carries; leave the source with none of the four.

**Why:** Emphasis tells the reader what the screen is for. A preview that outweighs the data being committed makes a commitment look like a reading task, and an accent on the reference says the reference is the point.

**Do:** Lead with the extracted fields, in the wider column, with each value heavier than its label, and put the accent on the pane's own name.

**Don't:** Give the source document the leading, wider pane, or let a control inside it hold the only accent on the screen while the saved values hold none.

**Except:** Carry the accent as ink on the name, not as a border around the pane: a line strong enough to be read as the signal is the outlined box the kit does not draw, and the figures stay neutral so the two readings can still be compared. Fade nothing to make a block quieter either; a quieter block is smaller, later or uncoloured, never muted. See [Limit muted ink](https://ui.apli.tech/storybook/?path=/story/guidelines-labels-and-titles--page).
