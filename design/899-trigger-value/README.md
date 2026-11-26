# Dropdown trigger comparison

Open `index.html` in the viewer. It contains the scripts, styles, and fonts. It needs no network requests or nested frames.

The audience is the kit owner. The decision is whether to approve the trigger text and naming behavior for issue 899.

The page places each Today control beside its Proposed control. At the phone breakpoint, each pair stacks in that order.

Use Light and Dark to change the theme. Open a trigger to select an option. Clear all resets the filter.

`?theme=dark` selects dark mode. `?side=before` and `?side=after` show one side for captures.

## Recommendation

| Variant | Suitable use | Cost |
| --- | --- | --- |
| Value only | A filter row that uses FilterBar | Keep the filter name in its accessible name. |

Recommend this variant. It meets the owner's rule and keeps the existing FilterBar behavior.

A second visible name for a chosen filter would conflict with the acceptance criteria. No second variant is proposed.

## Proposed guideline

### Show only the value in the trigger

**Rule:** Show only the value or placeholder in the trigger.

**Do:** In a form, place the name in a Field label.

**Do:** In a filter row, show the name only while no value is set.

**Don't:** Put a field name before the chosen value inside the trigger.

The paired pictures provide the proposed do-and-don't examples. The builder must add them to the Dropdown guideline.

## Source inventory

The baseline is main commit `26028b76`. These are component specimens, with fabricated data, rather than full copies of the story screens.

| Place | Source | Prototype coverage |
| --- | --- | --- |
| Form field | `react/src/Dropdown.tsx:904`, `react/src/Field.tsx` | Filled and empty forms reproduce the supported label prop. |
| Filter row | `react/src/FilterBar.tsx:90`, `src/logic/filter-bar.js:20` | Filled and empty chips already follow the proposed visible rule. |
| Entity switcher | `react/src/EntitySwitcher.stories.tsx:26` | The Entity prefix disappears. Studio remains visible. |
| Currency choice | `stories/guidelines/ComponentChoice.stories.tsx:30` | The currency prefix disappears. EUR and search remain. |
| Version captions | `stories/foundations/LabelsAndTitles.stories.tsx:85` | The version prefix disappears. The version value remains. |

These are all three story sites that pass `label` directly to Dropdown. Test fixtures also pass it in Dropdown and KeyValueList tests.

The prototype adds the form reproductions because the brief requires them. Existing form stories already use Field without a Dropdown label.

## Accessible names

| Context | Proposed name | Method |
| --- | --- | --- |
| Filled form | Unit Engine team | Field label and trigger value through `aria-labelledby`. |
| Empty form | Unit Choose a unit | Field label and placeholder through `aria-labelledby`. |
| Filled filter | Unit: Engine team | Existing FilterBar `aria-label` and hidden legend. |
| Empty filter | Unit: any | Existing FilterBar `aria-label` and hidden legend. |
| Entity switcher | Entity: Studio | Proposed explicit name plus value. |
| Currency choice | Currency: EUR | Proposed explicit name plus value. |
| Version captions | Version: phoenix.2026.002 | Proposed explicit name plus value. |

The browser checks these actual names. The captions beside the controls expose the expected names for review.

`Dropdown.tsx:891` applies `ariaLabel` to the trigger only with `triggerContent`. Line 931 applies it to the panel.

Thus, removing the visible prefix alone loses the name outside Field. The prototype includes explicit trigger naming for that case.

The builder must preserve a custom trigger's existing `ariaLabel`. A Field must still combine its label and displayed value.

## PR 897 overlap

Reviewed open PR 897 at `0d3643950de129f057cec71e9b916aaefc3936a7`.

The Dropdown diff changes placement and focus. It does not change the trigger JSX or the prefix.

The FilterBar diff does change `triggerContent`. It adds hidden width copies inside `ui-filter-bar__fit`.

The build must keep:

- Panels above scrolling bodies and footers, without scrolling the body on open.
- The panel's alignment with its trigger when the page moves.
- The focus changes around opening the panel.
- Filter widths based on their longest value, capped at 224px.
- Reserved space for removal and Clear all controls.
- Stable placeholder weight when disabled.
- The focus tokens from the merged base, including PR 897's proposed ring change if merged.

Remove the prefix from all three Dropdown text locations. Keep the remaining hidden width copies for Field sizing.

These pictures isolate issue 899 against main. They do not preview the unrelated width or ring changes in PR 897.

## Kit rules

| Part | Rule or guarantee | Page |
| --- | --- | --- |
| Trigger | Add the value-only rule. Keep group labels apart. | `guidelines/dropdown.md` |
| Form name | Keep a visible label above the control. A placeholder is not a name. | `docs/components.md`, Fields |
| Form width | Fit the longest option up to the field width. | `docs/components.md`, Fields |
| Filter name | Show only the value, or the filter name while unset. | `docs/components.md`, Filter bar |
| Filter placement | Keep the bar on the page above its table card. | `docs/components.md`, Filter bar |
| Accessible name | Keep the Field label and value. Name a trigger outside Field. | `docs/components.md`, Dropdown |
| Search and width | Add dropdown search. Keep the longest-option width rule. | `guidelines/component-choice.md` |
| Panel | Open a panel at its control. | `guidelines/component-choice.md` |
| Text | Use body ink and sentence case. Say the noun once. | `guidelines/labels-and-titles.md` |
| Focus | Keep the ring visible and its contrast at least 3:1. | `docs/foundations.md`, The focus ring |
| Controls | Keep keyboard access and minimum pointer targets. | `guidelines/accessibility-floor.md` |
| Surfaces | Place forms on cards. Use semantic colors and both themes. | `docs/components.md`, Fields, and `guidelines/colour-and-theming.md` |
| Layout | Keep the spacing scale and phone breakpoint. | `guidelines/layout-and-density.md` |
| Story CSS | Use kit parts. Keep local CSS to layout glue. | `AGENTS.md`, Changes |

The exported token files remain unchanged. The prototype uses their actual values through the kit stylesheets.

## Rebuild

From the repository root, run `node design/899-trigger-value/build.mjs` after `npm ci`.

The build uses main's Dropdown twice. A build plugin changes only the proposed copy in memory.

The plugin removes the prefix and adds the missing accessible name. It does not write to kit source files.

`prototype.css` places the review samples. Kit styles draw every control.

Poppins and IBM Plex Sans come from Google Fonts. `fonts.css` embeds the downloaded fonts for offline viewing.

## Evidence

`captures/` holds the paired viewport pictures, full-page pictures, separate before and after pictures, and interactive state pictures.

The three capture sizes are 390×844, 1280×800, and 1920×1080. Each has light and dark evidence.

`checks.json` records actual accessible names, browser checks, and axe results. This is a self-review, using the design skill's App screens page.

A real screen reader application was not tested. Browser accessibility names are not a claim about a specific reader's spoken output.

No ship check is required for this design branch. No package source changed. The builder still owns kit implementation and release verification.

### Review results

Verdict: warn. Browser checks passed. The remaining limits below are explicit.

- Checked: 28 trigger names across both themes.
- Checked: selection, long values, Escape focus return, filter clearing, and empty search results.
- Checked: the opaque-origin viewer with `sandbox="allow-scripts"`.
- Checked: 38 captures, plus two phone long-value pictures. Phone captures use a coarse pointer.
- Checked: width measurements from 320px to 2560px. No page overflow occurred.
- Checked: axe reported no violations in ten theme and state checks.
- Checked: the AI slop detector scanned the rendered DOM in both themes. It reported zero errors and 18 warnings.

The warnings all use `multiword-control`. They concern values, placeholders, or prefixes in the required Today pictures.

Each theme has nine warnings: filled form twice, empty form twice, filled filter twice, and the three Today story triggers.

The kit requires these controls to show a value or placeholder. Replacing these words with action verbs would change their meaning.

`slop.json` records every warning. This review retains the required values and the accurate baseline pictures.

Axe leaves some open-panel contrast checks incomplete where the panel covers the comparison captions. The empty search list also needs manual review.

The browser exposes the empty list and its visible no-match message. This prototype does not change that existing kit behavior.

The state pictures use reduced motion to capture settled states. The prototype retains the kit's normal motion and reduced-motion rules.

The review covers the App screens checks that apply to component comparisons. A task flow, save action, and dashboard are outside this artifact.

No layout failure required a visual change. Two test selectors were corrected to match the kit's keyboard sequence and combobox role.

Orca rejected the required `--page` flag on its tab command. Agent-browser rendered the page, but screenshot capture timed out.

The captures therefore use the Playwright Chromium headless shell. No Google Chrome command was used.

`screen.png` is the default light overview. Font licenses are in `font-licenses.txt`.

Checked: the secret scan found no leaks in the design files. No customer data or private service details were used.
