# Fix round 1 on #768, branch builder-ui-r6-components

Each section gives the defect, the change and the measured numbers. A headless Chromium measured all of them, after `document.fonts.ready`.

## 1. Drawer type levels

- Change: The drawer title now uses the kit rank card-title: 18px, weight 600, line height 25.2px.
- Change: The component prototype shows all three levels in one state, `component-drawer.html#playground`: the title "Transaction", the section title "Reconciliation" and the field label "Note".
- Measured: Title 18px at weight 600. Section title 14.5px at weight 600. Field label 13px at weight 500. All three are IBM Plex Sans.
- Measured: The type ranks gate now counts 18 rank notes. It counted 17 before.

## 2. No block in a block

- Change: The "Drawer or page" Do is now one page block. The card inside the page block is gone.
- Change: The Stat bands and Density and accents specimens lost the grey stage ground under their cards.
- Checked: Every picture on the changed pages. The file drop window frame stays, because it stands for the window that the drop rule is about. The "No cards" Don't keeps cards in the drawer, because that is the failure it shows.

## 3. Cut specimens

- Change: A drawer specimen frame is now at least 460px high and grows with its panel.
- Measured: The drawer body scrollHeight equals its clientHeight in every specimen. "Drawer or page" Don't: 448 of 448 at 1280, 637 of 637 at 390. Before: 448 of 329.
- Measured: "No cards" Don't: 428 of 428 at 1280. Before: 428 of 397. At 390, rows fit at 438 of 438. Before: 438 of 397.

## 4. Money

- Change: Money on the changed pages reads "12,480.50 €", with the symbol last. This includes the drawer, stat band, density and command palette specimens.
- Measured: No prototype file holds "€" before a number.
- Limit: The ledger, key value list and stat band component stories outside these prototypes still put "€" first. This branch does not change them.

## 5. Page padding of a component state

- Change: Each component state sits in a 16px padding, the padding of a Storybook story.
- Measured: All 414 cases have a 16px state padding and no sideways scroll at 390, 720 and 1280.

## 6. Loading

- Study: Untitled UI hides the label but keeps the width, or shows a leading spinner before the label. Its spinner is a currentColor arc.
- Study: Radix Themes hides the content but keeps the width. It puts a spinner in the centre and keeps the label for screen readers.
- Study: shadcn/ui puts a leading currentColor spinner before the label.
- Common practice: A short action shows a centred spinner at the same width. A long action shows a leading spinner in place of the icon, with the label.
- The kit keeps focus on a busy button with `aria-disabled`, not `disabled`. This is a deliberate kit choice.
- Change: With `keepLabel`, the spinner now replaces the leading icon. "Export rows" shows one spinner and its label, and no empty icon box.
- Change: The spinner is a three-quarter arc in the button's own ink. The 28% track is gone.
- Measured: Primary arc, white on rgb(106,45,204) in light: 7.34:1. White on rgb(124,58,237) in dark: 5.70:1. Secondary arc: 16.68:1 in light, 13.32:1 in dark.

## Checks in a headless browser

- Every state and every rule, in light and dark, at 390, 720 and 1280, with hover and two Tab presses: 414 cases. I opened the captures of the drawer, loading, drawer guideline and density pages and looked at them.
- Found: No sideways scroll. Each focused link, button, field and table scroller had a solid 2px outline. The palette search input has no outline of its own. This branch does not change that input.
- Fixed in the prototype chrome: At 390 the state bar covered the drawer Cancel button. The bar now sits 80px above the bottom on narrow screens. A rule link also scrolled the rule title under the sticky bar. The rule now keeps a 112px scroll margin.

## Prototypes

- Same 13 file names, same data-rule and data-state ids, same hash rule. A hash opens and marks that rule, or shows that state.
- Each file is self-contained, with inlined fonts and styles. A button switches light and dark. The files hold no host path.

## Tests

- `npm test`: 1759 passed, 0 failed, 28 skipped, in 54s.
- `npm run check:words`: passed.
- `npm run build-storybook` and `node site/build.mjs`: passed.
- `npm test -w react`: The host load average was 17 to 21. The full run took 11m10s. One a11y timeout started an axe "already running" cascade.
- Rerun of a11y alone: 743 of 743 passed, in 98s.
- Rerun of the other files: The contrast walk timed out at 30s on Dashboards and reports and Stock screener, and focus ring timed out at 5s. These stories are not changed on this branch. The same timeouts occurred in the previous round.
- Two count gates fail: field ground counts 151 fields against 150, and reading surface counts 886 prose elements against 888. Both fail with the same numbers on b23362e3, before this round. This round does not change them.
