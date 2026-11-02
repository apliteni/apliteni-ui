# Chart inventory for #768

Branch: `builder-ui-charts-human-review`. The measurements come from the built Storybook at 1280, 720 and 390 px wide.

## Every chart drawing

| File | Before | After | Look |
| --- | --- | --- | --- |
| `react/src/Chart.tsx`, `react/src/chart-looks.tsx` | Kit Chart. A spark with bars did not keep zero in its band. | Kit Chart. A spark with bars keeps zero in its band. | Kit looks of #742, Soft fade tones of #740 |
| `react/src/Chart.stories.tsx` | Kit Chart: area, bridge, donut, line, spark, stacked | No change | Kit |
| `stories/guidelines/HoverReadouts.stories.tsx` | 11 kit charts. All 11 scrolled at 390. The plots scrolled by 169 to 369 px, and the 365-day spark by about 8,500 px. 3 sparks drew bars down to y=115 in a 32 px plot. | 11 kit charts. They show 4 months, and the weekly spark shows 8 weeks. The sparks draw a line. | Kit |
| `stories/guidelines/DashboardsAndReports.stories.tsx` | 13 kit charts and 6 hand-drawn sparklines from `stories/lib/sparkline.js`. 12 kit charts scrolled at 390. | 19 kit charts. The month charts show the first quarter. The Cashflow sparks are kit sparks. | Kit |
| `stories/guidelines/_dashboards-and-reports.js` | 6 months of spend data | 3 months of spend data | Data only |
| `stories/guidelines/StatBands.stories.tsx` | 1 hand-drawn sparkline | 1 kit spark with 6 points | Kit |
| `stories/apps/FinanceDashboard.stories.tsx`, `stories/apps/_finance-data.js` | 3 hand-drawn sparklines | 3 kit sparks through `stories/apps/_cashflow-trend.tsx`, with at most 6 points | Kit |
| `stories/lib/sparkline.js` | The hand-drawn sparkline | Deleted | None |
| `stories/apps/SignIn.stories.tsx` | Vendor brand mark | No change. It is not a chart. | Not a chart |
| `stories/_guideline.tsx` and the empty states | The `ui-illo` illustration | No change. It is not a chart. | Not a chart |
| `site/` | The site draws no chart. `site/index.html` holds a glyph only. | No change | Not a chart |

## Result

- Charts fixed: 33 of 34. 10 hand-drawn sparklines became kit sparks. 23 kit charts that scrolled now fit their column.
- After the change, all 34 charts have 0 sideways scroll, 0 bars outside the plot and 0 errors at 1280, 720 and 390.
- No CSS hides a scroll. Each chart got fewer periods, because a plot column is 48 px and a spark point is 24 px. Those floors are point-target guarantees in `docs/components.md`, so they did not change.

## Kit change

`react/src/Chart.tsx`: a spark that draws bars now keeps zero in its scale. Before, its bars started below the plot. `react/src/Chart.test.tsx` holds this. The test fails when the fix is removed.

## Out of scope

`guidelines-layout-and-density` has a page that is 25 px too wide at 720 and 390. It holds no chart, and it is the same before this change.

## Files on this branch

- `html/`: one prototype for each changed guideline page.
- `captures/<page>--<rule>--before|after--desktop|phone.png`: each chart, cropped. Desktop is 1280 and phone is 390.
- `inventory.md`: this page.
