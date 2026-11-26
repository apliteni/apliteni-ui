# Design self-review

Verdict: warn. The prototype is ready for the owner’s pattern decision. It does not approve a kit implementation.

## Checked result

The browser run passed 60 checks and saved 54 captures.
It used Playwright 1.65.0, Chromium headless shell, UTC, and pixel scale 1.
A separate touch run passed four edge hit tests for each visible bar button at 390×844.
Its additional capture and `touch-check.json` show the result.
The source document also passed inside a viewer with only `sandbox="allow-scripts"`.
There is no nested frame or script that measures or sizes a frame.

Both themes have captures at 390×844, 844×390, 820×1180, 1280×800, 1920×1080, 360×800, 466×678, 984×1016, 1536×864, and 2560×1440.
Additional captures cover 1440×900, 320px, actual doubled text sizes, reduced motion, and forced colors.
State captures show selection, hover, keyboard focus, press, an open picker, an applied pick, all selected, More, Clear, and Delete confirmation.
The phone captures also show a field opened through More and a long chosen value.

The checks confirm immediate picks, stable trigger names and widths, count changes, the last row’s end space, and no sideways page overflow.
Escape closes the picker before clearing selection. Both paths return focus.
Delete starts with Keep focused, traps Tab, and removes only selected rows after confirmation.
The count is a hidden polite, atomic status region. Its visible mirror shows the same text.
No browser script error was observed.

Axe found no violations in 24 theme, accent, and interaction states.
The scan covers the WCAG A and AA rules through WCAG 2.2 that axe can test.
It does not prove screen-reader speech or full accessibility conformance.

## Measured contrast

The ratios use resolved browser colors and WCAG relative luminance. `verification.json` holds all eight theme and accent cells.

| Pair | Dark bar on light | Light bar on dark |
| --- | --- | --- |
| Text | 15.79:1 | 16.68:1 |
| Count edge | 7.40:1 | 6.11:1 |
| Focus, all accents | 6.55–8.98:1 | 6.47–7.34:1 |
| Hover text | 11.48:1 | 14.63:1 |
| Danger ink on bar | 7.26:1 | 6.55:1 |

These pairs were reviewed against the actual token values. No accepted-failure ledger was changed.

## Corrections

The table’s inherited height limit trapped rows in a second vertical scroll region on a short screen.
The prototype removes that layout limit. The page scrolls through the table and ends with space for the bar.

The first layout allowed the actions container to shrink over More.
The container now keeps its measured content width. Extra actions move into More before they overlap.

The state links retained an open confirmation when moving between hashes.
The prototype now closes that confirmation before it enters the next state.

The phone bar now fills its available width. It keeps Count, Clear, Status, and More visible.
At doubled text size, the bar wraps to keep the controls readable.

The initial bar enlarged small controls to meet the phone target floor.
It now keeps their kit size and uses transparent tap zones with declared gaps.
The title now uses the kit’s inner gap above the table.

The copy scan flagged Due date. The control now says Due, which matches the table header.

## Design laws

| Check | Result |
| --- | --- |
| One task and few choices | Yes. Select records, then act on those records. |
| Useful signals | Yes. Checkboxes, count, pressed picker, and result feedback. |
| Proximity and grouping | Yes. Clear stays with the count. Field actions stay together. |
| Equal roles look equal | Yes. Neutral kit buttons and kit menu rows. |
| Alignment | Yes. One table region and a centered bar. |
| Hierarchy | Yes. The page title leads. Selection gives the bar its purpose. |
| Contrast | Yes. Measured in both themes and all accents. |
| Familiar words | Yes. Field names and action verbs. |
| Few decisions | Yes. One pattern with explicit issue changes. |
| Reachable controls | Yes. Named native controls and transparent phone tap zones. |
| Responsive layout | Yes. Phone overflow and doubled-text reflow. |
| Visible response | Yes. Picks update rows and result feedback immediately. |
| Reduced motion | Yes. The browser check found no long animation. |

## App-screen checks

| Check from the design skill’s App screens page | Result |
| --- | --- |
| 1. One task and reading path | Yes. Table, selection, then actions. |
| 2. Action heading and short buttons | Yes. Edit documents and labels of at most two words. |
| 3. One grid | Yes. One bounded content column. |
| 4. Short task content | Yes. Review controls remain outside the task area. |
| 5. No unnecessary explanations | Yes. The source and decisions stay in these notes. |
| 6. Useful count | Yes. The issue and pattern require a plain selected count. |
| 7. No collapsed information | Yes for records. The requested More menu holds actions. |
| 8. Facts and actions separate | Yes. Row checkboxes select records. The bar changes them. |
| 9. Table rows keep their structure | Yes. The table scrolls sideways inside its own region. |
| 10. Consistent containers | Yes. Kit floating surfaces and a plain table. |
| 11. Brief requirements visible | Yes. Both themes, selected rows, actions, Clear, focus, count speech mirror, and narrow layout. |
| 12. Narrow and long-content cases | Yes. A long chosen value leaves trigger width unchanged. Doubled text wraps. |
| 13. Dashboard fills its space | Not applicable. This is a document table. |

## AI slop review and limits

The editorial pass reviewed the complete prototype and the rendered states.
The CLI scanned the rendered DOM. It reported no errors and one palette warning.
The warning comes from the embedded kit palette, including `--green-500` and the dark `--bg`.
Those established tokens remain unchanged. The captured default is Nebula, not Emerald.
The copy scan passed. `slop-review.json` and `copy-review.json` record the results.

This was a self-review. No independent reviewer or real screen reader was used.
Safari, Firefox, a physical phone, translations, and a production backend were not tested.
Duplicate, Export, and Copy links are explicit previews. Pending and error states remain undefined in the source pattern.
The inverse token proposal and the differences from issue 902 still need owner decisions.
No kit package tests, story gates, release checks, or ship check were run for this design-only branch.
