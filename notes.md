# Owner notes on #768, branch builder-ui-r6-components

Each section gives the owner note, the change and the measured numbers. A headless Chromium measured all of them.

## 1. The palette clips the search focus ring in dark mode

- Change: The search field's top corners now use a radius of `calc(var(--radius-lg) - 1px)`. That radius is 15px inside the 16px panel.
- Measured: The ring is a solid 2px line at offset -3px. It follows the round corners, in light and in dark, at 390, 720 and 1280. The check found no clipped ring.

## 2. Remove the "·" separators

- Change: The last "·" left `stories/lib/dropdown-contain.js`, `stories/lib/target-geometry.js` and `stories/select-chevron.test.js`.
- Measured: No text file under `src`, `react/src`, `stories`, `guidelines` or `docs` holds "·". No rendered story that this branch changes holds "·".

## 3. One palette entry for the danger zone

- Change: The rule "Send destructive actions to their page" now asks for one Go to row, "Danger zone in Settings", that opens the settings section.
- Change: The Do specimen shows that row. The Don't specimen lists "Delete workspace…" and "Revoke every API key…".
- Change: Both specimens use the `roomy` palette. Before, the Do label was cut to "Danger zone in Setti…" at 1280.
- Limit: The component story Destructive still shows the danger API of the palette, because the API stays in the kit.
- Measured: The row floor of the palette guideline gate went from 58 to 57, because the Do specimen now has one row.

## 4. Loading

- Change: A busy button shows a spinner, keeps its width, is disabled and has `aria-busy`.
- Change: A new `keepLabel` keeps the label next to the spinner for a long action.
- Change: A DataTable with no rows on a first load draws skeleton rows in its own columns. The new story is DataTable First load.
- Change: The Dense tables Don't now shows an empty state, not an empty block.
- Change: The DataTable First load story has the campaign filter bar above the table, as every table story has.
- Measured: Save is 65.0px wide at rest and busy. Export rows is 155px wide and keeps its label. Both have `aria-busy="true"` and are disabled.

## 5. Two type levels in the drawer

- Change: A drawer section title, such as "How it is classified", is 14.5px at weight 600. A field label, such as "Category", is 13px at weight 500.
- Limit: The drawer title is 15px at weight 600. So the title and the section title are close in size. The owner can decide if the title needs a larger step.

## 6. The whole file drop zone opens the picker

- Change: The drop zone is the target. It is a button with tabindex 0. The inner Upload control has tabindex -1.
- Measured: A click, Enter and Space each open the picker once. There is no double fire.

## 7. File row Remove

- Change: Remove is a kit small secondary button on the row centre line.
- Measured: The Remove label centre differs from the file name centre by 0.49px. The button box centre differs by 0.01px.

## 8. Back link indent

- Change: The back link pulls its chevron ink onto the column edge with `margin-inline-start: calc(-1 * var(--space-1) - 5px)`.
- Measured: The chevron ink starts at x 60.2 and the title at x 60.0, at 1280 and at 390. Before the change, the ink started at about x 69.2.

## Word budgets

- The Button labels page was 299 words against a budget of 240, after earlier commits on this branch. It is now 240. The Except of "Earn a wordless button" no longer links the issues. It names the owner-approved entries in one sentence.
- The Command palette page was 337 words against its recorded 322. It is now 322.

## Checks in a headless browser

- The changed guideline and React stories passed in light and dark at 390, 720 and 1280, with hover and keyboard focus.
- The check found no sideways scroll, no "·", no clipped focus ring and no console error.

## Prototypes

- Each changed guideline page has one HTML file: `guideline-*.html`. A hash such as `#danger-page` opens and marks that rule.
- Each changed component has one HTML file in all its states: `component-*.html`. A hash such as `#done` shows that state.
- Each file is self-contained, with inlined fonts and styles. A button switches light and dark.
- Under the viewer CSP, every rule and every state opened with no console error. The files hold no host path.

## Tests

- Root `npm test`: 1760 passed, 0 failed, 27 skipped, in 99s.
- `npm run check:words`: passed.
- `npm run build-storybook` and `node site/build.mjs`: passed.
- Four count gates moved by one, each with its reason: type ranks 17, typeface subjects 53, scroll rings 17 and the palette row floor 57.
- `npm test -w react`: the full run on a loaded host (load average 17 to 24) took 14m43s. 643 tests failed.
  - One failure was real: the palette row floor. It is fixed. The palette, palette guideline and DataTable files then passed 79 of 79. After the last changes, the DataTable, palette and guidelines files passed. One guidelines test timed out at 5s at load average 21, and it passed alone.
  - The a11y, focus-ring, guidelines and filter-selected-mark files passed 1220 of 1220 on a rerun with a 60s timeout. The first failures came from one axe timeout. After it, each axe run failed with "Axe is already running".
  - In the contrast walk, ComponentChoice, DashboardsAndReports and Screener time out at the 30s limit of each test. This branch does not change those stories. They need a rerun on a quiet host.
