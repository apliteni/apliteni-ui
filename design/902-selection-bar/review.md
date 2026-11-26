# Design self-review

Verdict: warn. The prototype is ready for the layout decision. The owner has not approved a kit implementation.

## Evidence

Browser: Playwright 1.63.0 with Chromium headless shell. Time zone: UTC. Pixel scale: 1.
`verification.json` records 37 successful browser checks, 49 captures and the resolved contrast pairs.
The screenshots show the proposed component. No prior equivalent component exists in this checkout.

Both variants were captured in light and dark at 390×844, 820×1180, 1280×800 and 1920×1080.
Additional width checks cover 320, 360, 466, 844, 984, 1536 and 2560px.
The state captures cover selected, set, open, hover, focus, pressed, busy, cleared, long value and overflow.
Other captures show one field, three fields, 200% control text and forced colors.

The browser checks confirm these behaviors:

- The page does not scroll sideways. The table can scroll inside its named region.
- At the end of the table, the last row ends before the bar starts.
- A field remains 144px wide after a long-value pick.
- Escape closes the list first and returns focus. A later Escape clears the selection.
- One Apply call sends the set values. Busy prevents another Apply.
- Clear returns focus to the table selection control.
- The count status changes from four to zero and from zero to eight selected rows.
- The single document works inside a frame with only `allow-scripts`.
- Both themes and all four accents meet the measured contrast limits.

The accessibility scan ran in 16 theme, accent and state combinations. It reported no violations.
The scan covers WCAG A and AA rules through WCAG 2.2 that axe can test.
It does not prove screen-reader speech, mobile browser behavior or full accessibility conformance.

## Corrections

The busy button initially changed width. It now retains its measured width until the action completes.
Its first dot markup was hidden by the kit's busy rule. The prototype now uses the kit's `ui-btn__dots` markup.
Copied root values initially blocked the phone tap-zone clearance. The inverse scope now leaves that clearance to the bar.
B initially overflowed at 320px. Its short Fields label now fits.
B wraps at 200% text size, so its controls remain reachable.
The selected option now keeps system Highlight colors in forced-colors mode.
The table now pins its identity and selection columns during horizontal scrolling.

The first contrast capture caught a theme transition before it finished.
The checks now wait for fonts and finite animations before they measure colors.
The first axe run found the same timing problem in opening panels. The settled-state scans report no violations.

## Design laws

| Check | Result | Evidence |
| --- | --- | --- |
| One purpose and few choices | Yes | One selected-row change flow and two layout variants. |
| Useful signals | Yes | Count, checked rows, Apply state and live feedback. |
| Related parts stay together | Yes | Fields and actions share one bar. |
| Equal roles look equal | Yes | Fixed field widths and kit control classes. |
| Alignment | Yes | One table column and one centred bar. |
| Clear hierarchy | Yes | Page title leads. Apply is the only primary action. |
| Contrast | Yes | Eight measured theme and accent cells. |
| Familiar words | Yes | Team, Status, Apply and Clear. |
| Few decisions | Yes | One layout choice. Placement stays constant. |
| Reachable controls | Yes | Named native controls and phone tap-zone measurements. |
| Responsive layout | Yes | Width checks from 320 through 2560px. |
| Immediate status | Yes | Busy state appears before the simulated result. |
| Reduced motion | Yes | Kit reduced-motion rules and a rendered check. |

## App-screen checks

| Check from `design/references/app-screens.md` | Result |
| --- | --- |
| 1. One task and a clear reading path | Yes. The issue requires the floating action bar. |
| 2. Action heading and short buttons | Yes. “Edit selected rows” and short result labels. |
| 3. One grid | Yes. One bounded table region. |
| 4. At most 80 task words | Yes. Review controls are outside the task area. |
| 5. No unnecessary helper text | Yes. The review notes explain the variant choice. |
| 6. Useful count display | Yes. The issue requires a plain selected count. |
| 7. No collapsed information | Yes for A. B intentionally hides fields as the comparison choice. |
| 8. Facts and actions stay separate | Yes. The bar owns the change controls. Row checkboxes select the affected records. |
| 9. Table rows keep one line | Yes. Long values stay in the table's scroll region. |
| 10. Consistent containers | Yes. The table is on the page. The bar and menus are floating surfaces. |
| 11. Brief requirements are visible | Yes. The controls expose both variants, themes, accents and field counts. |
| 12. Narrow layouts and long text | Yes. Fixed-width fields truncate with full titles. Larger text can reflow B. |
| 13. Dashboard fills its space | Not applicable. This is a table selection flow. |

## AI slop check

The skill's editorial pass covered the complete prototype, copy and rendered states.
The CLI scanned the rendered DOM, not the template source.
It reported zero errors and one palette warning. `slop-review.json` contains the result.

The warning names a near-black and green palette in the embedded kit CSS.
Its values come from `src/tokens/tokens.css`, including `--bg` and `--green-500`.
The default captured state uses Nebula. The green signal token is not visible there.
The warning remains recorded. The review did not change established kit tokens to silence it.

## Limits

A human screen reader, Safari and Firefox were not tested.
The ClickUp reference was read as public documentation. Its authenticated app was not tested.
Translated production text and arbitrary field schemas remain outside this fabricated example.
The proposed inverse tokens, three-field phone layout and 320px field layout still need owner approval.
No diagram was needed. `pattern.md` is a proposed sketch-pattern record, not an installed sketch.
No PR or ship check was requested for this design branch.
