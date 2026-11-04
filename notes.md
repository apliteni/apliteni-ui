# Round 6: tables and filter bar (#768)

Branch: `builder-ui-r6-tables`, based on `builder-ui-integrate-human-review` (f723e633).
Fix round 1 commit: 7c99f6d5, on top of 7a53941f.
All rows are fabricated demo data. The measurements use headless Chromium (Playwright), never Google Chrome.
Widths: 390, 720 and 1280. Themes: light and dark. States: rest, hover and keyboard focus.

## Owner notes

### 1. "have you seen the hover effect on the table rows?? ... why dont you use the new look?"

Status: done.

- Every table picture on the five changed guideline pages uses `ui-table--hover` with no zebra.
  The pages are Dashboards and reports, Dense tables, Density and accents, The page and Spacing.
- One exception: the surface Don't on Dense tables keeps zebra, because zebra is the failure that it shows.
- Kit fix: the row hover is now `--surface-3`, not `--surface-2`.
  In dark, `--surface-2` is darker than the card, so a hovered row read as a hole.
  - Dark: `--surface-3` #2d293c on the card #211e2d.
  - Light: `--surface-3` #eef0f5 on white.
- Accent contrast: `node --test stories/accent-contrast.test.js` gives 11 of 11 pass. The kit default accent was used.
- Prototype: `component-table.html` shows Default, Dense, Compact and Scroll tables in a card, plus the DataTable stories.

### 2. Filter bar: the search icon and the "Reference" placeholder are not aligned with "Status" in dark

Status: done.

- Kit fixes:
  - `input.css`: the search glyph has a small translate, through the new `ui-input-group__search` class.
    React `<SearchField>` and `<Field>` set this class.
  - `filter-bar.css`: the chip trigger has `padding-top: calc(var(--space-1) - 1px)`.
  - `dropdown.css`: the chevron has `translate: 0 0.06em`.
- Measured: the spread of the ink centre lines in one row is 0.50px or less.
  This covers rest, hover and focus, in light and dark, at 390, 720 and 1280.
  At 390 the chips wrap, so each line is measured by itself.
- Prototype: `component-filter-bar.html` shows the FilterBar, SearchField, Field and Dropdown stories.

### 3. The card titles are off from the table's "Period" column

Status: done.

- Kit fixes in `table.css`:
  - A default hover table directly in a card now bleeds by its 8px row inset, so the first column meets the card title.
  - The card bleed now also covers `ui-table--compact`.
  - `chart.css`: the data table under a chart hangs out by `--space-1` to meet the chart title.
- Measured: a card title, the first column text, a back link and body text start on the same x.
  The alignment script found 0 differences on every page, in both themes, at all three widths.

### 4. "why is that empty block" (the Do of "Keep identity sub-lines as text")

Status: done.

- Cause: the phone frame read its picture through `contentDocument`.
  Under the viewer's sandbox CSP that is null, so the frame stayed empty.
- Fix: the phone frame writes its picture through `srcDoc` and gets its height by `postMessage`.
- Measured: no empty phone frame on any prototype.

### 5. Currency decision

Status: done.

- A single-currency table puts the code in the header, for example "Fees (EUR)".
- The cells hold plain, right-aligned tabular numbers.
- Every KPI number keeps its symbol.

### 6. "you failed again to check vertical alignment" (FilterBar chips)

Status: done.

- Cause: a chip is a fieldset with `display: flex`. The chip did not stretch its trigger, so an unset chip sat 3px off the row's centre line.
- Kit fix: `filter-bar.css` gives the chip trigger a `min-height` from the row height.
- Measured after `document.fonts.ready`: the spread of the ink centre lines in one row.
  - Unset story: 3.08px before, 0.00px now.
  - FilterBar page: 162 lines, every story and state (rest, hover, keyboard focus), light and dark, 390, 720 and 1280. Worst spread 0.50px, on the Adding "Filter" add control.
  - Every filter bar on all 8 prototype pages: worst spread 0.50px.

### 7. The field name in each chip

Status: done.

- Each chip prints the field and then the value, for example "Status: Active".
- A chip with nothing chosen prints "Listing: Any".
- The trigger's accessible name holds the same words.
- The field name uses the normal weight. The value keeps full ink. The placeholder keeps its placeholder ink.
- Measured: every chip in every FilterBar story reads "Field: value", the Composed story included.

### 8. "FilterBar: Empty" was an empty block

Status: done.

- The Empty story now gives the bar its add catalogue, so the bar draws the "+ Filter" add control.
- Measured: the Empty section shows the add control at 390, 720 and 1280, in light and dark.

## Checks on the prototypes

- 222 rule views opened by hash, with 0 console errors and 0 hash misses.
- Nothing scrolls sideways at 390, 720 or 1280.
- No "·" separator on the changed pages.
  The CommandPalette descriptions still hold "·". That page is not in this round.
- No card inside a card with the same border.
- No visible focus ring is clipped. The flagged rings on the fast-glance rule are below the fold, on purpose.
- The files hold no host paths.

## Files

- Guideline pages: `dashboards-and-reports.html`, `dense-tables.html`, `density-and-accents.html`, `the-page.html`, `spacing.html`.
- Kit components: `component-table.html`, `component-filter-bar.html`, `component-chart.html`.

## Test results

### Fix round 1 (7c99f6d5)

gitleaks on the branch commits: no leaks.

- `npm test` and `npm test -w react`: both full runs were killed for low memory on a loaded host (load average 85 to 100). They were not run again.
- Targeted root tests: 139 of 139 pass. These are the filter-bar logic and styles, filter-row-edge, filter-bar-fit, packaging, dropdown-trigger-edge, dropdown-placement, story-css and react-types tests.
- Targeted React tests: FilterBar and Dropdown give 185 of 185 pass. Finance and filter-selected-mark timed out under load once, and a rerun gives 17 of 17 pass.
- `npm run build-storybook`: pass.
- `npm run check:words`: fails on `button-labels.md` (299 of 240). The base fails in the same way. This round changed no guideline.
- TAP_ZONES: 31 pass and 3 fail. All failures are on the page cards of the guidelines Overview. At 390, 13 cards are drawn at a different size. At 1280 with a fine pointer, 25 Overview targets changed. No failure is on a FilterBar control. This round did not change the Overview.

### Round 6 (7a53941f)

gitleaks on the branch commits: no leaks.

- `npm test`: 1756 pass and 4 fail. The 4 failures were stale line references in `references.json`. They are fixed, and `refs.test.js` gives 61 of 61 pass. The full suite was not run again.
- `npm test -w react`: under a host load of 15 to 18, the full run timed out. A rerun of the 9 failed files with a longer timeout gives 1558 pass and 4 fail. The 4 failures are the contrast walks of DashboardsAndReports and StockScreener Screener, light and dark. Each one is "Test timed out in 30000ms", which is the walk's own timeout under load.
- `npm run check:words`: fails on `button-labels.md` (299 of 240). The base f723e633 fails in the same way. This round changed no guideline text.
- `npm run build-storybook` and `node site/build.mjs`: pass.
- Accent contrast: 11 of 11 pass, with the kit default accent.
- CHART_TARGETS: 11 of 11 pass.
- TAP_ZONES: 31 pass and 3 fail. The one real failure is "no control is drawn at a different size" at 390, on the 13 page cards of the guidelines Overview. This round did not change the Overview page or any card-link CSS. It was not measured again on base.
- DROPDOWN_EDGES: 4 pass and 3 fail. React Dropdown Search, Search With Link Rows and Rows Are Links widen the page at 320, 375 and 390. A slid trigger widens the page at 390. This round changed only the chevron's vertical translate. It was not measured again on base.
- FIELD_PAINT: skipped, because `stories/field-ground.test.js` does not exist.
