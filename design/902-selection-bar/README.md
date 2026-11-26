# SelectionBar design variants

Open `prototype.html` in the review viewer. It is one HTML document with embedded fonts, styles and scripts.
The document works inside `sandbox="allow-scripts"`. It has no nested frame, network dependency, storage access or frame measurement.

The audience is the kit owner and the implementation reviewer.
The task is to choose a layout for changes to selected table rows.
The prototype uses fabricated documents and a local Apply action. It does not save data.

## Decision

The criteria were set before composition: visible changes, stable field widths, narrow-screen access, clear keyboard order and an uncovered last row.

| Variant | When it fits | Cost | Recommendation |
| --- | --- | --- | --- |
| A: visible fields | People review all changes before Apply. | Two rows below 34.5rem with two fields. | Recommend. It follows the issue and keeps the changes visible. |
| B: overflow panel | One line matters more than visible fields. | Another action reveals the fields. Pending values are hidden when the panel closes. | Reject for this issue. Keep as a proposed issue change. |

Both variants centre the bar. Placement is held constant so the comparison tests one decision.
The coordinator confirmed A as the issue requirement. B is comparison evidence, not approval to change the issue.

## Try the states

Use the row checkboxes to change the count. Use Reset to restore four selected rows with no field values.
Pick a field value to enable Apply. Apply updates the selected rows once and shows a busy state.
Select “Research and development” to check ellipsis and the full hover title.
The Team menu has search because its choices represent data. A search with no match shows “No matches”.
Use Fields to compare one, two or three fields.

These query parameters open useful review states:

- `?variant=a&theme=light&state=set`
- `?variant=a&theme=dark&state=long`
- `?variant=b&theme=light&fields=3`

The header is a review control area. It is not part of SelectionBar.
Its “Screen reader” line mirrors the hidden live region for review.
A real screen reader was not used. The browser checks cover the live-region text, role and update behavior.

## Proposed design-system change

Add inverse semantic tokens. The proposal reuses existing opposite-theme values without changing the kit files.
The page keeps its theme. The bar takes the opposite theme and the same accent family.
The field list takes the page theme.

| Token | Light page, dark bar | Dark page, light bar | Existing source |
| --- | --- | --- | --- |
| `--inverse-bg` | `#0e0d14` | `#ffffff` | Opposite `--bg` |
| `--inverse-text` | `#e9e7f0` | `#1a1e27` | Opposite `--text` |
| `--inverse-strong` | `#ffffff` | `#0c0e13` | Opposite `--strong` |
| `--inverse-muted` | `#a29db6` | `#5c6270` | Opposite `--muted` |
| `--inverse-edge` | `#a29db6` | `#5c6270` | Opposite `--muted`, used for field edges |
| `--inverse-hover` | `#2d293c` | `#eef0f5` | Opposite `--surface-3` |
| `--inverse-disabled-ink` | `#a29db6` | `#5c6270` | Opposite `--disabled-ink` |
| `--inverse-disabled-surface` | `#211e2d` | `#ffffff` | Opposite `--disabled-surface` |
| `--inverse-disabled-border` | `#2d293c` | `#e4e7ee` | Opposite `--disabled-border` |

The light-page bar has no visible outer edge. It uses the light theme's `--elev-drop`.
The dark-page bar has a one-pixel `--inverse-edge` and no shadow.
Fields use the bar ground. The edge therefore contrasts with the same ground on both sides.

| Accent | Light-page inverse accent | Light-page Apply ground / ink | Dark-page inverse accent and Apply ground | Dark-page Apply ink |
| --- | --- | --- | --- | --- |
| Nebula | `#b479ff` | `#7c3aed` / `#ffffff` | `#6a2dcc` | `#ffffff` |
| Phoenix | `#ff6a3d` | `#ff6a3d` / `#241006` | `#a8370c` | `#ffffff` |
| Ocean | `#3b9dff` | `#3b9dff` / `#04121f` | `#005ab4` | `#ffffff` |
| Emerald | `#16c98a` | `#16c98a` / `#04180f` | `#076c48` | `#ffffff` |

Name the accent aliases `--inverse-accent`, `--inverse-accent-strong` and `--inverse-accent-contrast`.
The focus outline uses the inverse accent. It keeps the kit's two-pixel width and one-pixel clear gap.
Apply uses the inverse strong accent ground. Neutral fields keep neutral hover paint.
The focus ring is the only accent on a field. Apply is the only accent-filled control on the bar.

The prototype samples opposite-theme computed tokens at load and after a theme or accent change.
That sampling is prototype code, not the proposed package implementation.
A package implementation needs static semantic tokens or an inverse scope that preserves accent choice.

## Contrast

Ratios use WCAG relative luminance from the browser's resolved colors. Values are rounded to two decimal places.
The complete measured values are in `verification.json`.
The default preview is `screen.png`. The `captures/` folder holds the viewport and state pictures.

| Page theme | Text | Placeholder, field edge and chevron | Focus ring range | Apply text range |
| --- | --- | --- | --- | --- |
| Light | 15.79:1 | 7.40:1 | 6.55–8.98:1 | 5.70–8.54:1 |
| Dark | 16.68:1 | 6.11:1 | 6.47–7.34:1 | 6.47–7.34:1 |

The narrowest Apply-ground separation is 3.39:1, for Nebula on the dark bar.
The dark-page outer edge measures 6.11:1 against its white bar and 3.16:1 against the dark page.
Disabled Apply keeps the opposite theme's disabled paint. It is not faded.
Disabled Apply text measures 6.24:1 on the dark bar and 6.11:1 on the light bar.
Disabled borders retain kit paint and are outside the active-edge contrast measurement.
The field chevron uses the kit's 1.6px mark, which takes the 3:1 graphic threshold.

## Reused kit parts

The prototype embeds the existing token, base, Button, Dropdown, input, table, tap-zone and reduced-motion CSS.
It reuses the small primary Button, small ghost Button, select Dropdown trigger, table, checkboxes and focus indicator.
It models Dropdown search and keyboard selection in local prototype code.
A kit implementation must use React `Button`, `Dropdown` and `DataTable` rather than copy this prototype script.

`FilterBar` supplies the field-name and value naming pattern. It does not supply the batch-change behavior.
The existing floating bar supplies the docking idea. It cannot supply inverse surfaces or the narrow field layout.
The new region, count announcement, Apply transaction and reserved end space form the proposed SelectionBar behavior.

## Kit rules

| Part | Rule | Page and checked source |
| --- | --- | --- |
| Composition | Add a general part only when existing parts cannot supply its behavior without copied logic. | `AGENTS.md`, Changes; `react/src/FilterBar.tsx` and `docs/components.md`, Floating bar |
| Apply and Clear | Give the committing action more weight. | `guidelines/component-choice.md`, Make the committing action stand out; `src/styles/button.css` |
| Field menus | Open the panel at its control. Search data choices. | `guidelines/component-choice.md`, Open a panel at its control and Add dropdown search; `src/styles/dropdown.css` |
| Buttons and fields | Keep words and pill shapes. | `guidelines/button-labels.md`, Keep the words and Give every control one shape; `src/styles/button.css`, `src/styles/dropdown.css` |
| Table | Keep the theme surface, type size, content widths, top alignment and horizontal scrolling. Keep updates stable. | `guidelines/dense-tables.md`, surface, density, content-width, overflow, top-align and states; `src/styles/table.css` |
| Colors | Use semantic tokens and strong accent grounds. Check themes and accents. | `guidelines/colour-and-theming.md`, Semantic tokens, Accent contrast and Theme checks; `src/tokens/tokens.css`, `src/tokens/accents.css` |
| Text | Use body ink. Muted ink marks unset values and disabled states. | `docs/foundations.md`, Text ink; `src/tokens/tokens.css`, `src/styles/input.css` |
| Accent | Keep one primary button and neutral values. | `guidelines/density-and-accents.md`, Give accents a job; `src/styles/button.css` |
| Spacing | Use inner and group gaps. Make room for touch targets. | `guidelines/spacing.md`, Use two gaps and Widen inner gaps on a touch phone; `src/styles/tap-zone.css` |
| Focus | Show one ring. Clear a focused field's edge. Keep 3:1 against the ground. | `guidelines/state-set.md`, Focus rings; `guidelines/accessibility-floor.md`, Focus ring contrast; `src/styles/base.css`, `src/styles/dropdown.css` |
| Busy and disabled | Block repeated Apply and keep disabled paint legible. | `guidelines/state-set.md`, Busy controls; `guidelines/accessibility-floor.md`, Disabled control legibility; `src/styles/button.css` |
| Accessibility | Keep named controls, readable text, opaque grounds and keyboard access. | `guidelines/accessibility-floor.md`, Minimum target size, Tap target on a phone, Body contrast, Measurable pairs and Keyboard first |
| Motion | Use kit timing and curves. Remove movement under reduced motion. | `guidelines/motion.md`; `src/styles/reduced-motion.css`, `src/tokens/tokens.css` |
| Copy | Keep labels short and remove filler. | `guidelines/text-length.md`, Keep controls short and Cut filler |

## Boundaries for the next decision

Three fields of 9rem cannot share a 390px phone row. A adds another field row.
At 320px, two fixed 9rem fields also need separate field rows.
At 200% text size, B wraps its controls to keep them reachable. Its one-line promise applies at the default text size.
This preserves fixed field widths and avoids sideways page scrolling. It extends the issue's two-row narrow state.
The owner must choose this extension or a smaller field-width rule before the kit build.
The prototype's 34.5rem threshold measures available bar room, not viewport width.
It does not add a fourth kit media-query breakpoint.

The prototype paints a proposed component. It is not a component story or a showcase that claims existing kit behavior.
Its inverse paint, neutral field hover and reserved placement must move into an approved kit part before app reuse.
No story CSS allow-list was changed.
`stories/story-css.test.js` and `react/src/story-css.test.ts` were not run. This branch changes no stories or kit package.
The coordinator excluded PR creation and ship check from this design task.

## Sources and review

Issue: https://github.com/apliteni/apliteni-ui/issues/902

Reference: [ClickUp's bulk-action documentation](https://help.clickup.com/hc/en-us/articles/6309768265495-Manage-tasks-with-the-Bulk-Action-Toolbar), read on 2026-11-26.
It describes selection-based batch actions and a More menu for actions outside the main bar.
Only that interaction pattern informed B. No artwork or product styling was copied.
The authenticated ClickUp app was not exercised. The direct page fetch returned HTTP 403; the web reader returned the documentation.

The declared design system is the kit, as `AGENTS.md` states. No separate `DESIGN.md` was created.
The design review used `design/references/app-screens.md` and the component, layout, color, motion, typography and variant rules.
The font sources are IBM Plex Sans and Poppins from Google Fonts. Their OFL notices are included.
No new icon artwork was added. The chevron is the kit's existing CSS mark.

This is a self-review. See `review.md` for checks, corrections and remaining limits.
