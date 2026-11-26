# Label ink, issue 886

The owner's sentence has two readings. Without the indent: A, B, C. With space only: D.

**A, `a-weight.html`.** The label is 13px bold. Ink and size stay.

**B, `b-muted-ink.html`.** The label takes `--muted`. Size and weight stay.

**C, `c-small-semibold.html`.** The label takes the `chip` rank, 12px semibold, with `--tracking-wide`. The kit forbids small capitals.

**D, `d-indent.html`.** The options step in 12px, as direction 3. The label stays.

Label against panel, Chromium, equal under all four accents:

| Variant | Light | Dark |
| --- | --- | --- |
| A, C, D | 16.68 | 11.96 |
| B | 6.11 | 5.60 |

## Rules

- A, B and C change `.ui-dropdown__group`. D changes the row padding.
- A and C leave the `label` rank of Foundations "Labels and titles".
- Kit conflict, B. Labels and titles page, "Limit muted ink": "Use muted or dim ink only for the four named exception classes." Ways: follow the kit (A, C, D), record an exception, or change the kit.

## Recommendation

Build A. It obeys "Use body ink" and keeps 11.96:1 in dark. B has the ink of a disabled option and needs an exception.
