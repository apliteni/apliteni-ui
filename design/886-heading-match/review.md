# Heading comparison

This is a proposal for the owner’s review. No kit component changes.
Open `index.html`. Both themes appear by default. Theme and accent controls change the preview.
The document includes its fonts and CSS. It makes no network request.

## Sources

| Part | Verified source |
| --- | --- |
| Today | `main` at `b142578355ebdbd19733b77f681f1e1207d03369` |
| Sidebar heading | `src/styles/nav.css:43`, `.ui-nav__cap`, 13px, weight 500, body ink |
| Sidebar ground | `src/styles/layout.css:38`, `.ui-app__rail`, card surface |
| Palette heading | `src/styles/command-palette.css:166`, `.ui-cmdk__group-head`, 13px, weight 500, body ink |
| Palette ground | `src/styles/command-palette.css:17`, `--cmdk-surface` resolves to the floating surface |
| Dropdown reference | PR 893 at `cfafb7a565783462aecaf9386eaf6a8ced734a5e` |
| Dropdown heading | PR source `src/styles/dropdown.css:438`, `.ui-dropdown__group`, 13px, weight 700, muted ink |
| Tokens | Main `src/tokens/tokens.css`, `src/tokens/accents.css`, `src/tokens/brand.generated.css` |

The HTML copies these styles. It removes source comments and scopes theme tokens to each preview section.
The reference also copies PR 893’s disabled-option token.
The only proposed component overrides change heading weight and ink.

These are static excerpts with fabricated names. Panel placement and column widths serve the comparison.
Sidebar and palette excerpts each show two groups. The reference shows two groups and one disabled option.
Search, navigation, opening and selection behavior are outside this visual comparison.

IBM Plex Sans uses weights 400, 500, 600 and 700. Poppins uses weight 600.
Embedded Latin subsets come from Fontsource. Their SIL Open Font License files are beside the HTML.

## Choice

The criteria are clear group boundaries, consistent category headings, unchanged spacing, readable text and a narrow exception.

| Variant | When it fits | Cost |
| --- | --- | --- |
| Leave | Keep the current body-ink and label-rank rules. | Group headings retain two styles across the kit. Palette headings retain the option weight. |
| Match | Give all three category headings the approved Dropdown style. | Lower contrast and a wider exception for two components. |

Recommend **match**, after the owner records that exception.
Bold weight makes a category distinct from an option. Muted ink gives the three headings the same appearance.
Leave loses on consistency. It remains the valid implementation until the owner approves the wider exception.
A general change to all label ranks would affect unrelated labels. This proposal does not recommend that change.

## Contrast

Values use Chromium’s computed ink and the first opaque ancestor ground.
The calculation uses WCAG sRGB relative luminance and `(lighter + 0.05) / (darker + 0.05)`.
Each cell measures both displayed headings. `contrast.json` holds all 80 heading measurements.

| Theme | Heading | Nebula | Phoenix | Ocean | Emerald |
| --- | --- | --- | --- | --- | --- |
| Light | Current sidebar | 16.68 | 16.68 | 16.68 | 16.68 |
| Light | Matched sidebar | 6.11 | 6.11 | 6.11 | 6.11 |
| Light | Current palette | 16.68 | 16.68 | 16.68 | 16.68 |
| Light | Matched palette | 6.11 | 6.11 | 6.11 | 6.11 |
| Light | Dropdown reference | 6.11 | 6.11 | 6.11 | 6.11 |
| Dark | Current sidebar | 13.32 | 13.32 | 13.32 | 13.32 |
| Dark | Matched sidebar | 6.24 | 6.24 | 6.24 | 6.24 |
| Dark | Current palette | 11.96 | 11.96 | 11.96 | 11.96 |
| Dark | Matched palette | 5.60 | 5.60 | 5.60 | 5.60 |
| Dark | Dropdown reference | 5.60 | 5.60 | 5.60 | 5.60 |

All ratios are `:1`. Nebula is the default accent.
Accents change neither heading ink nor ground. The sidebar’s darker ground explains its higher dark-theme ratio.

| Token | Light | Dark |
| --- | --- | --- |
| Body ink `--text` | `#1a1e27` | `#e9e7f0` |
| Muted ink `--muted` | `#5c6270` | `#a29db6` |
| Sidebar `--surface` | `#ffffff` | `#211e2d` |
| Palette and Dropdown `--bg-elevated` | `#ffffff` | `#2a2639` |

All headings exceed 4.5:1. Bold 13px text still needs the small-text threshold.
The match falls below the kit’s 7:1 body-text target.

## Kit conflicts

The brief records Dropdown approval in `rev_568222ce59df/d16` and acceptance in `rev_fba96462ca19/d26`.
PR 893 records an exception only for a Dropdown group label.
The request to show matching headings, `rev_fba96462ca19/d27`, authorizes this prototype. It does not approve a kit change.

These main rules conflict with the proposed match:

- Labels and titles, **Use body ink**: “Use body ink for all words; use size, weight and spacing for hierarchy.”
- Labels and titles, **Limit muted ink**: “Use muted or dim ink only for the four named exception classes.”
- Labels and titles, **Keep category labels compact**: “Give each category a compact, nonselectable label in body ink, with space before the next category.”
- Accessibility minimums, **Body contrast**: “Keep body text close to 7:1 at every size, not merely at 4.5:1.”

The owner can keep the current style, approve a named exception for both components, or change the general kit rule.
This proposal recommends the named exception. An accessible group name does not replace visual contrast.

## Kit rules

| Page and rule | Effect of matching | Wider exception needed? |
| --- | --- | --- |
| Labels and titles, Use body ink | Both headings use muted ink for hierarchy. | Yes, both components. |
| Labels and titles, Limit muted ink | Neither heading belongs to main’s four exceptions. PR 893 adds only Dropdown. | Yes, name both under the same group-label exception. |
| Labels and titles, Keep category labels compact | Size, spacing and nonselectable behavior stay. Main’s body-ink requirement changes. | Yes on main. PR 893 already removes the body-ink clause. |
| Accessibility minimums, Body contrast | Lowest ratio becomes 5.60:1. All pairs pass WCAG AA, below the kit’s 7:1 target. | Yes, acknowledge these measured ratios. |
| Foundations, Labels and titles | Weight 700 leaves the weight-500 label rank. | Yes, name a category-heading exception. Keep other labels at 500. |
| Foundations, Text ink | A sidebar caption and a palette heading currently keep body ink. | Yes, extend the recorded chrome use to both. |
| The command palette, Product-owned groups | Product names and 13px size stay. Its example specifies the label rank. | Clarify the weight exception in the example. |
| The page, Group the sidebar one way | Captions still group flat items. No sub-items appear. | No. |
| Labels and titles, Use sentence case | Names retain their case. | No. |
| Colour and theming, Semantic tokens | Uses existing `--muted` and `--weight-bold`. | No new token. |
| Colour and theming, Theme checks | Measures two themes and all four accents. | No. |
| Colour and theming, Keep text off grey fills | Card and floating reading surfaces stay. | No. |
| Accessibility minimums, Measurable pairs | Each heading keeps an opaque ground. | No. |
| PR 893 Dropdown, Set group labels apart | Reference keeps bold muted labels and unindented options. | Existing approval covers the reference. |

The Dropdown rule’s option-size clause remains specific to Dropdown.
Sidebar and palette options stay 14.5px. Their headings stay 13px, as requested.
No disabled-option or interaction rule changes in the two proposed components.

## Verification

This is a self-review using the design skill’s App screens page.
The comparison is a review sheet, so it keeps all requested samples rather than an app’s single task column.
The project’s fonts, colors and reading surfaces govern the samples.

- Checked 390×844, 844×390, 820×1180, 1280×800, 1920×1080, 360×800, 466×678, 984×1016, 1536×864 and 2560×1440 in both themes.
- Checked 1440×900 for the design skill. Screenshots are in `screens/`.
- Checked 320px reflow and 200% zoom. No page overflow or clipped headings occurred.
- Checked all 80 heading instances across eight theme and accent cells.
- Checked unchanged heading size, padding, line height, font and ground between Today and Match.
- Checked theme and accent controls inside a viewer with `sandbox="allow-scripts"`. No frame access or script error occurred.
- Checked selected, hover, focus and pressed control states. State screenshots are in `screens/`.
- Checked axe across all eight cells with no violations. The disabled reference uses PR 893’s accepted ink.
- Ran the AI slop detector on the HTML as an artifact. It reported no findings.
- Inspected the rendered light and dark samples. Fixed a misplaced palette and aligned the prototype breakpoint and select corner with the kit.
- `stories/story-css.test.js`: not run. No story or kit source changed.
- `react/src/story-css.test.ts`: not run. No React source changed.

The reference samples are static. This review does not verify navigation, search, focus traps or other browser engines.
Full kit suites do not apply to this isolated design artifact. No package changes.
