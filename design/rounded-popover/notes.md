# Rounded popover options

Recommend **B**. Its 18px corner gives more separation from today’s panel. The neutral check mark keeps selection clear.

| Variant | Panel token | Edge inset | Row radius | Selection |
| --- | --- | --- | --- | --- |
| A | `--radius-lg` (16px) | `--space-1` (4px) | 12px | Neutral check |
| B | `--radius-xl` (18px) | `--radius-xs` (6px) | 12px | Neutral check |
| C | `--radius-2xl` (24px) | `--space-2` (8px) | 16px | Bold text |

Each row radius equals the panel radius minus the inset. Padding subtracts the existing 1px border from that inset.

All variants retain `--bg-elevated`, `--float-edge`, `--float-edge-inner`, and `--elev-drop`. Corners use round geometry.

B and C select with `--surface-2`. A uses that token in light and `--surface-3` in dark.

Hover uses `--surface-3` in light and `--surface` in dark. Focus uses `--ring-scroll` with `--ring-scroll-offset`. Focus keeps selection visible. Unselected focus has no fill.

The scrollbar uses `--muted`, `--space-2`, and `--radius-pill`. Phone rows are at least 44px.

Measured text contrast, light / dark:

| Variant | Selected | Hovered | Focused selection |
| --- | --- | --- | --- |
| A | 14.10 / 11.48 | 16.93 / 16.30 | 14.10 / 11.48 |
| B | 14.10 / 14.76 | 16.93 / 16.30 | 14.10 / 14.76 |
| C | 14.10 / 14.76 | 16.93 / 16.30 | 14.10 / 14.76 |

Focus contrast is at least 4.77:1 against the row and 4.96:1 against the panel. Measurements use Nebula.

A costs less space but changes the silhouette less. C gives more rounding but loses the check mark.

These proposals use the owner’s requested exception to the 12px floating-panel rule. They change no kit tokens or components.
