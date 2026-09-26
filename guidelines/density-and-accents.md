# Density and accents

## Check a narrow stat band

<!-- rule: check-density -->

**Rule:** At block widths of 28rem or less, a stat band must show one figure per row; placing two figures side by side fails this check.

**Why:** Stacking gives each label and value the full width of the block.

**Do:** Let the [Stat band tiles](https://ui.apli.tech/storybook/?path=/story/components-stat-band--gallery) stack at 28rem.

**Don't:** Override the same tiles to keep four figures across at 28rem.

## Keep the summary short

<!-- rule: reduce-density -->

**Rule:** Keep the identity, status, key facts and next action visible; remove repeated labels, group related facts, and move history or secondary details out of the preview.

**Why:** The preview helps the reader decide whether to act or open the full record.

**Do:** Use the [Stat band “Figures only” state](https://ui.apli.tech/storybook/?path=/story/components-stat-band--states) for the summary, and group full-record details as [Drawer Record](https://ui.apli.tech/storybook/?path=/story/components-drawer--record) does.

**Don't:** Add every history entry and a trend to each figure in the summary.

## Give accents a job

<!-- rule: purposeful-accent -->

**Rule:** Use at most one primary button per preview, use secondary or ghost buttons for other actions, and keep labels and values in neutral ink.

**Why:** One accented action is easier to find than several competing actions.

**Do:** Use [Button primary for Continue and ghost for Cancel](https://ui.apli.tech/storybook/?path=/story/components-button--variants).

**Don't:** Make both Continue and Cancel primary, or colour every stat value with the accent.

**Except:** Keep [Badge success, pending and danger](https://ui.apli.tech/storybook/?path=/story/components-badge-status--badges) for their named statuses; do not replace those signals with the accent.
