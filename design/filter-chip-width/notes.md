# Filter chip width

Main is `86f40609`, version 0.215.0.

`react/src/FilterBar.tsx:24` collects every option for width measurement.
Line 92 renders hidden measurement text.
`src/styles/filter-bar.css:24` sets the 224px limit. Line 29 places all values in one grid cell.

[PR #891](https://github.com/apliteni/apliteni-ui/pull/891) added this for [issue #885](https://github.com/apliteni/apliteni-ui/issues/885).
The owner chose stable widths because selection moved chips and content below the bar.
[PR #897](https://github.com/apliteni/apliteni-ui/pull/897) integrated it in commit `d64094a7`, whose package version is 0.209.0.
The PR text still names 0.202.0. The merged package is the version source.
After 0.209.0, the later change added small heights, not width reservation.

The bar's own limit overrides an inherited limit.
A 128px limit on the toolbar still computes as 224px on the bar.
Setting it directly on the bar produces 128px chips.

At 1440px, the test track is 1376px, with 32px group gaps.
Search is 320px and the extra control is 192px in every case.
Widths include Clear all and internal gaps. Both themes give the same measurements.

| Variant | Bar, px | Chips, px: Month, Unit, Category, Amount, Source | Extra on first line |
| --- | ---: | --- | --- |
| Main | 1037.70 | 142.16, 187.05, 221.23, 177.27, 195.17 | No |
| Shared cap | 754.83 | 128, 128, 128, 128, 128 | Yes |
| Per-chip caps | 752.98 | 142.16, 112, 160, 112, 112 | Yes |
| Current value, longest selected | 754.83 | 128, 128, 128, 128, 128 | Yes |

Choose Per-chip caps. It preserves stable positions and gives Month and Category more room.
Shared cap truncates more than necessary. Current value changes from 528.95px unset to 754.83px with long values.
All proposals retain full values in titles, accessible names, and menus.
The consumer contract and guideline draft are in [contract.md](contract.md).
