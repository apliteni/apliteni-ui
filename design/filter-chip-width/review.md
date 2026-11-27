# Design review

This is a self-review of the design prototypes. The owner has not approved a variant.
The review used the design skill's App screens, Components, Layout, Colour, Typography, Picks, Content and words, and AI look pages.

## Result

The three variants meet the proposed 1440px layout criterion in both themes.
The consumer documentation and guideline changes remain drafts in `contract.md`.
They are not shipped kit guarantees.

Shared cap and Per-chip caps keep every chip at the same position through unset, short, and long selections.
Current value deliberately permits movement. Its proposed guideline exception records this behavior.
The recommendation is Per-chip caps.

## Browser evidence

The documents use the actual React FilterBar, Dropdown, SearchField, Button, and kit CSS from main at `86f40609`.
The build changes only prototype bundles. Kit source files remain unchanged.

- Both themes were captured at 1440×900, 1280×800, 1920×1080, 820×1180, 390×844, and 2560×1440.
- Rest, unset, hover, keyboard focus, selected values, open menus, and pressed states have pictures.
- Every measured viewport kept page overflow within the viewport. Tables retain their own scrolling region.
- The long menu retains complete option names. Home, End, arrows, Enter, and Escape work.
- Escape returns focus to the chip. Mouse selection changes the chip's value.
- The accessible name retains the filter name and full value. Variant titles retain the same text.
- A search with no matches shows an empty result. Clearing it restores the sample rows.
- All three prototypes work inside one viewer frame with only `sandbox="allow-scripts"`.
- The prototype documents contain no frames. They load no external assets.
- Additional checks at 320px, doubled page scale, and longer text found no page overflow.

`measurements.json`, `browser-checks.json`, `menu-checks.json`, `sandbox-checks.json`, and `final-checks.json` contain the observations.
`index.md` lists every picture and prototype.

## Accessibility and contrast

Axe checked 52 combinations of variant, theme, state, and viewport. It reported no violations.
Eight open-menu checks reported incomplete contrast and scroll-region results.
The menu had clipped rows above or below its scroll window.
Each of the 13 Category rows was then scrolled into view and measured in both themes.
All 26 row contrast checks passed without incomplete results.
The menu uses the same kit paint in every variant.
Home and End reached the first and last options, which confirms keyboard access to the scroll region.

This does not prove spoken output in a screen reader.
The review checked accessible names and keyboard behavior, not a VoiceOver or NVDA session.
Physical devices, other browser engines, and live reload behavior were not tested.
The prototype uses the kit's existing reduced-motion rules and touch target styles.

## Design checks

| Check | Result |
| --- | --- |
| Purpose, order, hierarchy, proximity, and alignment | Yes. The title, controls, and table share the content track. |
| Kit colors, type, spacing, corners, and control states | Yes. No prototype paint, type, or motion rules were added. |
| Search and extra-control widths | Yes. The brief's 320px and 192px widths govern this study. |
| Long values and full-value access | Yes. The chip clips text, while the title, accessible name, and menu retain it. |
| Responsive layout and keyboard access | Yes, within the browser coverage above. |
| App-screen heading and short button rules | Kit and brief exceptions. Transactions names the table. The extra control retains the issue's exact label. |
| Empty and recovery states | Yes. Search can produce and clear an empty result. |
| Loading and server errors | Not applicable. This study has no server data or persistence. |
| Content honesty | Yes. The page identifies fabricated data and the table's limited purpose. |

The kit's dense-table rules govern the table and toolbar instead of generic form-width and action-screen rules.
The prototype-only geometry is the proposal under review, not an approved token change.

## AI slop review

The CLI scanned the rendered DOM, and the visuals received an editorial pass.
The review shortened the theme and sample-value buttons. Their accessible names remain descriptive.
The remaining long-value warnings identify selected filter data as action labels.
Changing these values would remove the long-content case that the brief requires.
The remaining control warning is “Missing unit or category”, the exact label required by the brief.
The contract and notes scans passed without findings.

Verdict: warn for these retained scanner warnings. No blocking visual defect was found in the proposed variants.
This verdict does not approve a variant or certify the kit for release.

## Repository checks

- `node --test stories/story-css.test.js`: 26 passed.
- `npm test -w react -- story-css`: 36 passed in `react/src/story-css.test.ts`.

These gates inspect stories. They do not inspect this design folder.
The prototype CSS was reviewed separately. It contains layout glue and the explicit width proposals only.
No full suite, ship check, PR, release, or kit implementation was requested for this design task.

## Sources and limits

The asset sources and font licenses are listed in `contract.md`.
The review covers the six viewport sizes above, not every possible host container.
A host with a sidebar or narrower content track must select smaller limits or permit wrapping.
No cap can guarantee one line in every container.
