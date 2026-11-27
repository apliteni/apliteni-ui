# Filter chip width proposals

These are design proposals for [issue #915](https://github.com/apliteni/apliteni-ui/issues/915).
No kit component, published documentation, or release changes here.

## Decision criteria

At 1440px, five chips must fit beside a 320px search field and a 192px control.
Keep 32px between these three groups.
Keep the full selected value available to assistive technology and in the menu.
Document the width limit and any movement after selection.
Show a category list with 12 options, including a 30-character option.

## Common test page

The page uses the React components and CSS from main at `86f40609`, version 0.215.0.
It has 32px page margins and a 1376px content track at 1440px.
There is no sidebar. This is a component comparison, not a copy of the reporting product.
The search width stays 320px above the phone breakpoint in every document.
The reporting product lets its search field shrink. Its measurements therefore differ from this study.
Below 560px, the search takes its own line. Other controls wrap below it.
The table scrolls inside its own region.

The longest values have 14, 24, 30, 19, and 23 characters, including spaces.
They are September 2026, International operations, Professional advisory services, EUR 10,000 and above, and Imported bank statement.
All records are fabricated. Filter choices demonstrate chip behavior. They do not filter the sample table.
Search and the missing-value control demonstrate empty results and recovery.

## Variants

| Document | Width rule | Long value | Assistive technology | Movement after selection |
| --- | --- | --- | --- | --- |
| [Today on main](main.html) | Reserve the longest option, capped at 224px. | Existing kit ellipsis. | Complete filter name and value. | None with this fixed option list. |
| [Shared cap](shared.html) | Reserve the longest option, capped at 128px. | Ellipsis, complete title, complete menu label. | Complete filter name and value, regardless of truncation. | None with this fixed option list. |
| [Per-chip caps](product.html) | Reserve each longest option within its product limit. | Ellipsis, complete title, complete menu label. | Complete filter name and value, regardless of truncation. | None with this fixed option list. |
| [Current value](current.html) | Reserve the name and current value, capped at 128px. | Ellipsis, complete title, complete menu label. | Complete filter name and value, regardless of truncation. | Following chips can move. The guideline must permit this explicit mode. |

The per-chip limits are Month 144px, Unit 112px, Category 160px, Amount 112px, and Source 112px.
The limits include the chip border, padding, and chevron.
Proposed design-system change: expose chip limits as supported component settings, with the values shown in the variants.
Clear all retains its space in every variant, including the unset state.
The width remains stable through value changes only while labels, options, font metrics, and limits remain unchanged.

Native titles support pointer hover. Keyboard and touch users can open the menu to read the complete value.
The accessible name uses the existing kit format, such as “Category: Professional advisory services”.
Hidden measurement text stays outside the accessibility tree.

## Proposed consumer contract

These APIs are proposals, not available kit features.

For Shared cap, change the default chip limit to 128px.
Expose `chipMaxWidth` on FilterBar so a product can change that limit directly on the bar.
Keep option-based reservation as the default.

For Per-chip caps, retain the existing 224px default.
Expose `chipMaxWidth` on FilterBar and `maxWidth` on each filter, measured in CSS pixels.
The filter limit overrides the bar limit.
Each limit includes the border, padding, and chevron.
Choose a limit that keeps the filter name readable.

For Current value, expose `reserveWidth="current"` with a 128px limit.
Keep `reserveWidth="options"` as the default.
Support the same bar and per-chip limit controls.
This option permits movement within the row after selection.

For every variant, make the text grid shrink inside the cap.
Keep the chevron outside the text clipping area.
Do not size a chip from an open menu.

## Draft for the component documentation

For Shared cap or Per-chip caps:

> Set a width limit on the bar or on each filter when long options make the toolbar wrap.
> The limit includes the chip border, padding, and chevron.
> Keep enough room for the filter name.
> Each chip reserves its longest option within that limit.
> A selected value longer than the available text space ends with an ellipsis.
> The title, accessible name, and open menu retain the complete value.
> With unchanged options and limits, a value change does not move following chips.

For Current value, add:

> Use current-value reservation only when the screen permits following chips to move after selection.
> This mode reserves the filter name and the current value within the width limit.

## Draft rule for Dense tables

### Limit long filter chips

<!-- rule: filter-chip-width -->

**Rule:** Limit each filter chip so long options do not force other toolbar groups onto another line.

**Why:** Space reserved for unseen values can push useful controls away from the search field.

**Do:** Keep chip widths stable and show the complete selected value in the menu.

**Don't:** Reserve every long category name when the search field and other controls then wrap.

**Except:** On narrow screens, wrap the toolbar groups while keeping all controls available.

For Current value, extend Except with this sentence:

> Current-value reservation may move following chips when the product explicitly accepts that movement.

Use the long-category menu from this study for the guideline picture.
The Do picture uses the chosen variant. The Don't picture uses Today on main with the same data and viewport.

## Recommendation

Choose Per-chip caps. It keeps the earlier stability decision and gives a product control over its available space.
Month remains readable, and Category gets more room than the other values.
Shared cap truncates every product's chips, including products that have enough room.
Current value saves the most space while unset, but restores movement that issue #885 asked to remove.
The owner has not selected a variant.

## Kit rules

- FilterBar: “Show only the value”, Dropdown.
- Toolbar: “Size the bar to the rows”, Dense tables.
- Refresh behavior: “Keep updates stable”, Dense tables.
- Layout: inner gap 8px and group gap 32px, Foundations.
- Appearance: existing tokens, typefaces, pill corners, focus, and menu selection paint.

## Sources and rebuilding

Read [notes.md](notes.md) for the cause and measurements.
Read [review.md](review.md) for browser checks and limitations.
`prototype.tsx` composes the kit. `prototype.css` contains layout glue and the proposed geometry.
`build.mjs` applies the proposed behavior only while building these standalone documents.
The baseline bundle uses the unchanged React FilterBar.

Run `node design/filter-chip-width/build.mjs` after installing the repository lockfile.
Each HTML file embeds its CSS, scripts, and fonts. It needs no network connection.
Use it directly as the document inside a viewer with `sandbox="allow-scripts"`.
The documents contain no frames and no frame-sizing code.
The viewer supplies its own dimensions.

IBM Plex Sans and Poppins come from Google Fonts. Their OFL files are included beside the documents.
The embedded font subsets contain Latin text, punctuation, and the euro sign.
Glyphs come from the kit. No external images are used.
