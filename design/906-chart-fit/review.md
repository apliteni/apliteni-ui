# Design review for issue 906

This is a self-review of a design proposal. It changes no kit source and opens no pull request.

The coordinator approved `design/references/charts-and-graphics.md` as the replacement for the missing `dataviz` skill.
The review also used `design/references/app-screens.md` and the requested frontend, browser, and AI slop skills.
The sketch and diagram skills were loaded. This task needs a working chart prototype, not a separate sketch or diagram.

## Basis and choice

The owner must compare charts that fit their cards. The medium is one HTML document inside an `allow-scripts` sandbox.
The choice criteria are complete data, readable names, no sideways scroll at the requested widths, and access by pointer and keyboard.

| Proposal | Use | Cost | Recommendation |
| --- | --- | --- | --- |
| Sparse month names | Up to 15 ordered months | Some axis names are omitted | Use it. All bars remain visible. |
| Categories A, names above | Signed values with long names | Each row needs space for its name | Use it. The scale gets more width. |
| Categories B, names beside | Names close to their bars | The scale has less width | Keep as an alternative. Small differences are harder to compare. |
| Bridge A, compact columns | Four steps with short word groups | Names can wrap | Use it. The current reading order remains. |
| Bridge B, horizontal steps | Longer step names | The reading direction changes | Keep as an alternative for tighter cards. |

The issue is the task record. Its examples permit both category layouts and both bridge layouts.
The specific design-only brief takes precedence over the generic PR and ship-check instructions.

## Current main

The baseline is `a02e4fa0492cbdf1e5f4e311f1f36cc2375f3c0a`, release 0.205.0.
The before panels run its unchanged React `Chart`, `Card`, and `Segmented` code.
The prototype bundles those components and their kit CSS. It does not recreate the before charts with drawings.

Checked against that source:

- `react/src/Chart.tsx:307` sets the bridge floor to 88 px.
- `react/src/Chart.tsx:1084` wraps month and bridge names at spaces.
- `react/src/Chart.tsx:1099` sets the word-based column floor.
- `react/src/Chart.tsx:1151` checks the gap between printed names. The month proposal keeps this check from #882.
- `react/src/Chart.tsx:565` rejects negative values in stacked, area, and donut charts.
- `react/README.md:946` still claims that months fit without scroll. This differs from the code and `docs/components.md:1474`.

The implementation must align the Chart reader pages and the guideline after the owner chooses a design.
This design branch leaves those shipped files unchanged.
The demo uses the kit's 12 px chart text. The issue's finance2 measurements used 13 px text.

## Kit rules

The proposed rule change is deliberate. The owner has not yet approved the final design.

| Part | Rule and page | Treatment |
| --- | --- | --- |
| Month names | “Keep every bar labelled”, `guidelines/dashboards-and-reports.md` | Change the rule for ordered months only. Keep all bars and full names in readout and table. |
| Category names | Same rule | Keep every full name visible. Support signed horizontal bars without using a stacked look. |
| Bridge names | Same rule | Keep every step name. Replace the fixed 88 px floor with the room its words need. |
| All charts | “Switch a chart to its table”, same page | Keep the switch in the card title row. |
| Card titles | “Leave the range out of a chart card”, same page | Name the measure. Keep units in the review context and table. |
| Chart geometry | Chart section, `docs/components.md` | Keep zero baselines, flat tones, rounded measured ends, and bridge connectors. |
| Projection | Chart section, same page | Keep solid marks, the boundary, and “Not final”. Readouts and table rows retain projected status. |
| Readouts | All five rules, `guidelines/hover-readouts.md` | Float the readout. Keep full names, values, keyboard access, tap, and Escape. |
| Type and paint | Typefaces, spacing, elevation, and focus ring, `docs/foundations.md` | Use the exported kit tokens. |
| Targets | Minimum target size and tap target rules, `guidelines/accessibility-floor.md` | Category rows reach 44 px. Dense month targets use the table as equivalent access to values. |

The current label rule says: “Give each bar a distinct short name, never cut to a fixed length.”
Its exception says: “Where one word is wider than its column, the plot scrolls sideways so every bar keeps its name.”
The issue asks to change this behavior. Keeping that exception unchanged would not meet the request.

## Tokens and assets

Colours come from `src/tokens/tokens.css`. Accent aliases come from `src/tokens/accents.css` and `src/tokens/brand.generated.css`.
The default product accent is used. Chart tones are independent of it.

| Token | Light | Dark |
| --- | --- | --- |
| `--chart-accent` | `#236cbd` | `#347bcd` |
| `--chart-good` | `#3e6c29` | `#4c7a37` |
| `--chart-bad` | `#c15260` | `#dd6a77` |
| `--chart-neutral` | `#5c6270` | `#a29db6` |
| `--surface` | `#ffffff` | `#211e2d` |

The lowest chart-tone contrast on its card is 4.52:1 in light and 3.22:1 in dark.
The font families are IBM Plex Sans and Poppins. The HTML embeds the font files and their licence.
Font files came from Fontsource packages `@fontsource/ibm-plex-sans@5.2.5` and `@fontsource/poppins@5.2.1`.
The kit supplies the Chart and Table glyphs. No new artwork is used.

## Evidence

`captures/overview-{width}-{theme}.png` shows the full prototype at 390, 820, 1280, and 1920 px in both themes.
`captures/viewport-{width}-{theme}.png` keeps the exact requested 390×844, 1280×800, and 1920×1080 viewport.
Each chart has separate `focus` and `hover` captures in both themes.
The recommended variants also have `table` captures. `screen.png` is the 1280 px light overview.

The browser checks measure the rendered page, printed month names, chart overflow, and point hit areas.
They also walk the switches, arrow keys, Home, End, Escape, and touch readouts.
The sandbox check uses an external viewer with only `sandbox="allow-scripts"`.
The prototype has no nested frames, network assets, or code that sizes the viewer.

## Check results

| Check | Result |
| --- | --- |
| Required 390, 820, and 1280 px, light and dark | Passed. All five proposed layouts fit without sideways scroll. |
| Extra 1440, 1920, and 2560 px, light and dark | Passed. |
| 12, 14, and 15 months at the required widths | Passed 18 theme, width, and count combinations. No printed names overlap. |
| Month hit tests | Every bar answers at its target centre in those 18 combinations. |
| Hover, focus, arrows, Home, End, Escape, and tables | Passed for all eight charts in both themes. |
| Touch open and close | Passed for all five proposals at 390 px. |
| Opaque sandbox | Passed with only `allow-scripts`. |
| axe WCAG A and AA scans | No findings in either theme. |
| AI slop scan of both rendered DOMs | Passed with no findings. Repeated captions were removed. |
| `node --test stories/story-css.test.js` | 26 passed. |
| `npm test -w react -- story-css` | 36 passed. |

The browser harness used Playwright 1.65.0 and Chromium headless shell, with UTC and reduced motion.
The Orca browser rejected the required `--page` flag on tab creation. The permitted headless-shell fallback was used.
`checks.json` records the measured widths and the prototype hash.
The story CSS tests cover the repository stories. They do not cover this standalone prototype.
No kit suite, PR check, or ship check is claimed for this design-only branch.

Verdict: pass for the requested design scope. The limits below remain explicit.

## Limits

This is a prototype, not a shipped Chart API. The kit implementation and its full chart target gate remain for the builder.
The layout passes at the requested widths. At 320 px, the compact bridge can still scroll when its plot is narrower than its words require.
Month targets are narrower than 24 px when 15 bars share 300 px. The table provides the same values without those targets.
No claim is made that dense month bars have 44 px tap targets.
Screen-reader speech and operating-system text enlargement were not tested.
There is no remote loading, error flow, or editable dataset in this prototype.
