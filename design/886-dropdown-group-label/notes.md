# #886 Dropdown group label: variants

Kit: apliteni-ui 0.197.0. Each file shows the current look and the proposal, in light and dark.

## Variants

1. **Weight** (`direction-1-weight.html`). The label becomes 13px semibold in `--strong`. The drawer group title has the same treatment.
2. **Size** (`direction-2-size.html`). The label takes the chip rank. That is 12px semibold in `--text`.
3. **Indent** (`direction-3-indent.html`). The label does not change. Each option under it starts at `--space-6`, 12px inside the label's edge.

## Contrast

| Line | Light | Dark |
| --- | --- | --- |
| Current label, `--text` | 16.68 | 11.96 |
| Option, `--strong`, not changed | 19.30 | 14.64 |
| 1: label, `--strong` | 19.30 | 14.64 |
| 2: label, `--text` at 12px | 16.68 | 11.96 |
| 3: option on the hover fill | 16.93 | 16.30 |

Each line is above 4.5:1. Today the label ink is weaker than the option ink.

## Rules

- All three follow foundations "Text ink" and "Labels and titles", and keep "space, not a rule" (#852).
- 1 is outside the rank table, as `.ui-drawer__section-title` is. Proposed design-system change: a rank for a group title, `--text-sm` with `--weight-semibold`.
- 2 stays in the rank table, but the table gives the chip rank to a badge.
- 3 changes no rank. It costs 12px of row width.

## Recommendation

Use direction 1. It is the clearest in dark, it costs no width, and the drawer already solves the same problem this way. Direction 2 is too weak, because a 1px step does not show. Direction 3 is clear, but it moves each glyph and wraps a long option earlier.

## Guideline

The kit has no Dropdown guideline. Add `guidelines/dropdown.md` with a rule `group-label` and a do-and-don't pair.
