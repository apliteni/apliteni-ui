# Quiet popover grounds

Recommend **B1**. Its hover remains visible at a glance without today’s grey block. This is a visual judgement, not a perception threshold.

All mixes use `color-mix(in srgb, TOKEN PERCENT, var(--bg-elevated))`.
The panel remains `--bg-elevated`: light `#ffffff`, dark `#2a2639`.
Delta means absolute OKLCH lightness difference from the panel, on the 0–1 scale.

| Ground | Light mix | Dark mix | Delta, light / dark | Text contrast, light / dark |
| --- | --- | --- | --- | --- |
| A, B1, C hover and selection | `--surface-2` 40% | `--surface` 30% | 0.02279 / 0.01075 | 18.07 / 15.14 |
| B2 hover and selection | `--surface-2` 60% | `--surface` 60% | 0.03422 / 0.02160 | 17.48 / 15.64 |
| Today’s hover | `--surface-3` | `--surface` | 0.04496 / 0.03625 | 16.93 / 16.30 |

The light `--surface` candidate equals the panel. Its delta is zero, so it cannot show hover.
B1 is the lightest visible option tested. B2 gives more separation but retains more grey.
Dark uses a weaker card mix because the sunken token makes a larger lightness change.

Selection uses the hover ground plus a neutral check. The check identifies selection without a stronger block.
C now uses this check instead of bold text alone.

Focus keeps `--ring-scroll` and `--ring-scroll-offset`. Focus contrast is at least 5.13:1 against the row and 4.96:1 against the panel.
Rounded corners, panel edges, shadows, and styled scrollbars retain their first-round values.
A uses 16px corners, B1 and B2 use 18px, and C uses 24px.

B1 keeps B’s balanced inset. A leaves less space. C uses more rounding than this list needs.
`main.html` is unchanged. An action menu has no stored selection.
