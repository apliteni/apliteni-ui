# builder-ui-r6-chartspage (#768)

The branch starts from origin/builder-ui-r6-pages. It merges origin/builder-ui-r6-charts, origin/builder-ui-r6-tables and origin/builder-ui-r6-components, in that order.

## Merge conflicts

- charts merge, scripts/word-budget.mjs: both sides kept. The recorded figures of both branches are in the list.
- tables merge, DashboardsAndReports, DenseTables and DensityAndAccents stories: the r6-pages content is kept, with the tables class ui-table--hover.
- components merge, guidelines/button-labels.md: the r6-pages guideline text is kept.
- components merge, CommandPalette stories, test, snapshot and guideline test: the components code is kept (components owns the component).
- components merge, stories/guidelines/CommandPalette.stories.tsx: the components code is kept.
- components merge, DenseTables and DensityAndAccents stories: the components imports are kept. The r6-pages specimens are kept.
- components merge, StatBands stories: the KpiBand from charts is kept. The money uses the "k €" and "6,459,401 €" format.
- components merge, _drawer.js: the components code is kept.
- components merge, _file-drop.js: the r6-pages guideline text is kept.

## Counts that the merges changed

- Palette rows: 53. Components removed one Go to row and r6-pages removed the Don't palette of the ranking rule.
- React fields: 151. The DataTable FirstLoad story from components adds one search field.

## Rule choices for the Charts page

- Hover readouts, overlay: moved. It is about a chart readout.
- Hover readouts, above-the-mark: moved. It is about a chart readout.
- Hover readouts, contents: moved. It is about a chart readout.
- Hover readouts, on-touch: moved. It is about a chart readout.
- Hover readouts, not-only-hover: moved. It is about chart access.
- Hover readouts page: removed, because no rule stayed. Old links open Charts.
- Dashboards and reports, two-lines-at-most: moved. It is about lines on a chart.
- Dashboards and reports, value-not-legend: moved. It is about line labels.
- Dashboards and reports, no-range-on-chart: moved. It is about the chart card's title and range.
- Dashboards and reports, chart-table-switch: moved. It is about the chart's table switch.
- Dashboards and reports, fast-glance, figures-and-exceptions, link-to-the-report, report-depth, report-offers and export-icon: stay. They are about the page.
- Stat bands: no rule moved. a-band-not-a-card, tone-not-direction and say-the-basis are about the band, not the spark line.
- Order on Charts: lines and labels, range, hover readouts, table switch, other access.
- Word budget: charts.md has 547 words. Its budget is 540 (9 rules at 60 words). The figure is recorded. No fact was cut.

## Known limits

- React contrast walk, StockScreener Screener cell: it took 33 s on this host, over the 30 s cell timeout. Each source branch took 26 s. The load average was 16. A split in SPLIT_STATE_SHARES makes it pass. The coordinator chose to record it and not to change it here.
- React focus ring, "every exemption still names a control": it takes 5.5 s to 7.2 s, over the 5 s timeout. It also fails on r6-pages and r6-components. Main took 4.4 s.

## The prototypes

- The branch is review-captures/builder-ui-r6-chartspage. It holds 36 files and this note.
- 25 guideline pages: every page of the collection less Overview, which no reference builds. guideline-hover-readouts.html is gone, because the page is gone. guideline-charts.html is new.
- kpi-band.html and chart.html: the charts format. In kpi-band.html a hover on a spark point puts that month in the figure above it (onActive).
- component-table, component-filter-bar and component-chart: the tables format.
- component-back-link, -button-loading, -command-palette, -datatable, -drawer and -file-drop: the components format, with the bottom bar that switches the states.
- component-button-loading.html keeps the busy-options state with options A, B and C, built from the live Button.
- The names, the data-rule ids and the hash rule are those of review-captures/builder-ui-r6-pages. The drawer page is guideline-drawer.html, as on that branch.
- The duplicate files without the "guideline-" prefix from the charts, components and tables branches are not repeated. Their pages are the guideline-*.html files here.

## How the files are built

- Each file is one bundle of the story module, from this branch's source, made with the repository's Vite 8 and the kit alias.
- The Markdown of each guideline is put into the bundle, so a file reads nothing from disk or network.
- Every file embeds the IBM Plex @font-face block of the components reference. The pages reference loads no font, so its type falls back. Here the type is the kit's own.
- A guideline page starts in dark, as Storybook does. The viewer sets html[data-theme]. A component file starts in light and has a Dark theme button.

## The browser check

- Headless Chromium shell through playwright-core. Chrome was not started.
- Every file, every state, light and dark, at 390, 720 and 1280 px, after document.fonts.ready.
- Each capture checks: no page error, no console error, a filled root, no horizontal overflow, and a ring on the first Tab stop.
- Hover: on kpi-band, Charts, Stat bands and Dashboards and reports, a pointer on a spark point changes the figure text. It changed in every capture that has a spark point.
- Two pages failed first: Accessibility floor and File drop showed nothing, because their helper module imports loadGuideline beside another name. The build now rewrites that import too. Both pages pass.
- Motion and Layout and density have no focusable element, in this build and in the pages reference. The Tab check has nothing to reach there.
- In the command palette states, the kit draws the ring on the search row, not on the input. That is the kit's design.
- In the open command palette states, the modal palette covers the bottom bar, as in the components reference. Press Escape before the theme button.
- In a full-page capture of "Prefer above the mark", the readout can show while it moves to its place. In a viewport capture it sits below the clipped top, as the rule says.
- I looked at these captures: guideline-charts (light 1280, dark 390), kpi-band (dark 390), component-button-loading busy-options (light 1280), guideline-dashboards-and-reports (light 720), guideline-stat-bands (dark 390) and the above-the-mark rule alone.
- The `.ui-file:hover` text in guideline-colour-and-theming.html is a CSS selector, not a file path.

## Known limit of the contrast timing

- The coordinator stopped the contrast timing check across branches. The StockScreener cell timeout above stays a known limit.
