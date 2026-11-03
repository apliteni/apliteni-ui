# builder-ui-r6-charts: chart look and hover that drives the figure (#768)

Version 0.160.0. All data in the prototypes and stories is fabricated.

## Owner notes

| Owner note | Status | Change |
| --- | --- | --- |
| "where are my new charts??? … (some glass effect)" | Done | The finance dashboard "Money in" and "Money out" cards are a kit `Chart` spark again. The spark fills the room under its line with the Soft fade tones (#740) and the gradient area (#744). The faint tone is at the lowest value and the full tone is at the highest. The hand-drawn `_cashflow-trend.tsx` is removed. |
| "when i hover on chart - i expect changing the upper numbers and to see a dot on the chart" | Done | On a hover, a tap or a keyboard step, the headline shows the point value and the caption shows its period. The chart draws a dot on the point. On leave or blur, the headline reverts. These cards have no readout pill. |
| "i dont like that rounded bars - need to audit all the charts guidelines" | Done | Every bar has a 2px radius on the end away from the axis, and a square base. This applies to months, stacked, side-by-side, rows and bridge. A bridge step rounds the end further from zero. The audit of the two guideline pages is below. |
| "next time do you yourself check all the states" | Done | I checked light and dark, hover, focus and keyboard, at 390, 720 and 1280 px, in a headless Chromium. The numbers are below. |

## New prop for approval

```ts
onActive?: (point: ChartActivePoint | null) => void;
type ChartActivePoint = { index: number; period: string; value: number };
```

- The chart calls it when a pointer, a tap or a key opens a point. It calls it with `null` when the point closes.
- While `onActive` is passed, the chart shows no readout pill. It draws the dot `circle.ui-chart__dot` (radius 3) on the open point.
- Use it only for a chart of one series. `stories/_kpi.tsx` (`KpiBand`) wraps `StatBand` and shows the point in the figure.

## Guideline audit

- **Hover readouts, "Keep readouts over the page", now "Keep readouts off the layout" (`overlay`)**: the change made it wrong. It said "beside its mark, never inside the page layout". The KPI card now shows the value in its figure. The rule now says: "Show the hover value in its figure or beside its mark, never in a new line." The picture now shows a KPI band that holds a point, and each figure has a delta, so the band keeps its height.
- **Hover readouts, the other four rules**: still correct. Their pictures use the kit `Chart`.
- **Dashboards and reports, all ten rules**: none became wrong. Every chart picture is the kit `Chart` with the fade tones and the new bar ends.
- **Stat bands, "A band, not a card"**: the picture now uses `KpiBand` with a spark.

## Measured numbers

All on the Storybook build, headless Chromium, light and dark, at 390, 720 and 1280 px:

- Sideways scroll: 0 px on every page. No "·" on any page. Console errors: 0.
- Centre lines in one row: spread 0.0 px (limit 0.5 px).
- X alignment of the card title, the first table column, the table head and the body text: spread 0.0 px in every card. Finance at 41 px. Dashboards at 82 px or 65 px. Hover readouts at 65 px. No page has a back link.
- Hover changes the figure, and leave reverts it. Finance "Money in" at rest "635,500 €". Hover "61,000 € / Apr 2026". End key "64,000 € / Jun 2026".
- Hover readouts held specimen: "€49,300 / Oct 2025".
- Card height change on hover: 0 px. No readout pill shows.
- Dot clearance from the clip edge: 8.6 to 12.4 px. Focus ring clearance: 39 px where an ancestor clips.
- `CHART_TARGETS=1 node --test stories/chart-target.test.js`: 11 pass, 0 fail. A tap on trend-0 and trend-10 shows the point in the figure.
- `node --test stories/accent-contrast.test.js`: 11 pass, 0 fail, under the default accent. The spark tones are the existing tone tokens. No new colour token.
- `npm test`: 1760 pass, 0 fail, 1m04s.
- `npm run build-storybook` and `node site/build.mjs`: both succeed.
- `npm test -w react`: 4920 pass, 6 fail, 10m39s at a load of 9 to 14 on 8 cores. All 6 failures are timeouts. A second run of the 5 failing files passed except the StockScreener contrast walk, a story this branch does not change. With `--testTimeout=180000` it passes 96 of 96, at 26.5 s and 28.9 s for each theme against a 30 s limit.
- `npm run check:words`: every page passes except `button-labels.md` (59 words over). That failure is already on base. `hover-readouts.md` is 330 words, 1 word less than its recorded figure. `WORD_BUDGET_CLI=1 node --test scripts/word-budget.test.js`: 9 pass, 0 fail.

## Bug found and fixed

A second tap on a mark moved focus to the scroller, and the frame blur closed the point. The frame `onBlur` now keeps the point while a press moves focus inside the chart. A test covers it. With the fix removed, the test fails.

## Test gate edits (not a security checker)

- `stories/chart-target.test.js` now finds `<KpiBand` charts. When a chart has a dot and no pill, the tap check reads the stat figure.

## Known issues already on base

- The `Sparkline` story overflows at 1280 px (scrollWidth 264 px against clientWidth 222 px).
- `button-labels.md` is over its word budget.

## Prototypes

- `hover-readouts.html`, `dashboards-and-reports.html`, `stat-bands.html`: the guideline pages. Each rule has `data-rule`. A hash such as `#overlay` opens that rule.
- `chart.html`: every `Chart` story, one section each. `kpi-band.html`: the KPI band at rest, hover, last point, first point and with no trend.
- I checked each file in a sandboxed iframe under the viewer CSP. Every rule opens at the top, or at the page end for the last rules. Console errors: 0. Sideways scroll: 0. No host paths.
- The CSP blocks Google Fonts, so the prototypes use fallback fonts.
