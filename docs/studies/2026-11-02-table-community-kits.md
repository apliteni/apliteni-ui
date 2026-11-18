# Study: how community UI kits design data tables

Date: 2026-11-02. All sources were accessed on 2026-11-02.

## Question, decision and stop rule

- Question: how do Untitled UI and other modern UI kits design data tables?
- Decision: what the apliteni-ui compact "quiet" table needs. The table has rows of about 36 px, no row lines, no zebra, and an accent only as a light hover tint on the row.
- Stop rule: stop when each kit has a primary source (its code or its own docs) for each of the five topics, or when the gap is named.
- Method: I read component source on GitHub and npm (CSS, TSX), the kit docs, and DeepWiki answers. A web fetch can summarize a page, so I used source code for every number. A value marked "calc" is my arithmetic. The study has no browser measurement of rendered rows.

## Answer in short

- Only Radix Themes size 1 (36 px minimum cell height), MUI compact (about 36 px, calc) and Atlassian (about 4 px block padding) get near a 36 px row.
- Atlassian is the only kit with no row lines. Its cells have `border: none`. It has a 2 px line under the header. Its hover is a light neutral tint. This is the closest match to the quiet table.
- No kit uses zebra by default. Carbon and Untitled UI offer it as an option.
- Carbon is the only kit that documents touch handling for row actions. It shows the overflow menu only on hover, and keeps it visible when the device cannot hover.
- No kit changes cell padding on a phone. Untitled UI and Polaris change only the edge padding. The common phone answers are to hide columns, to scroll sideways, or (Polaris) to switch to a list.

## Sources

| Id | Source | Published | Accessed |
|---|---|---|---|
| U1 | https://github.com/untitleduico/react/blob/main/components/application/table/table.tsx (last commit on the repo 2026-10-09) | n/a | 2026-11-02 |
| U2 | https://github.com/untitleduico/react/blob/main/components/base/dropdown/dropdown.tsx | n/a | 2026-11-02 |
| U3 | https://www.untitledui.com/react/components/tables | n/a | 2026-11-02 |
| S1 | https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/table.tsx | n/a | 2026-11-02 |
| S2 | https://ui.shadcn.com/docs/components/data-table | n/a | 2026-11-02 |
| R1 | https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/components/table.css | n/a | 2026-11-02 |
| R2 | https://www.radix-ui.com/themes/docs/components/table | n/a | 2026-11-02 |
| P1 | https://github.com/primer/react/blob/main/packages/react/src/DataTable/Table.module.css | n/a | 2026-11-02 |
| P2 | https://primer.style/product/components/data-table/accessibility/ | n/a | 2026-11-02 |
| P3 | https://primer.style/product/components/data-table/guidelines/ | n/a | 2026-11-02 |
| A1 | https://unpkg.com/@atlaskit/dynamic-table@19.3.8/dist/esm/styled/table-row.compiled.css (also `table-cell`, `head-cell`, `table` in the same folder) | n/a | 2026-11-02 |
| A2 | https://atlassian.design/components/dynamic-table/examples | n/a | 2026-11-02 |
| C1 | https://carbondesignsystem.com/components/data-table/style/ | n/a | 2026-11-02 |
| C2 | https://carbondesignsystem.com/components/data-table/usage/ | n/a | 2026-11-02 |
| C3 | https://github.com/carbon-design-system/carbon/blob/main/packages/styles/scss/components/data-table/_data-table.scss (commit of 2026-11-02) | n/a | 2026-11-02 |
| L1 | https://github.com/Shopify/polaris/blob/main/polaris-react/src/components/IndexTable/IndexTable.module.css | n/a | 2026-11-02 |
| L2 | https://github.com/Shopify/polaris/blob/main/polaris-react/src/components/IndexTable/IndexTable.tsx | n/a | 2026-11-02 |
| M1 | https://mui.com/x/react-data-grid/row-height/ | n/a | 2026-11-02 |
| M2 | https://github.com/mui/mui-x/blob/master/packages/x-data-grid/src/hooks/features/density/densitySelector.ts | n/a | 2026-11-02 |
| M3 | DeepWiki answer on mui/mui-x: https://deepwiki.com/search/datagrid-density-what-are-defa_714eb528-4bbe-40e6-93f8-5f9cf2a31bb2 | n/a | 2026-11-02 |
| M4 | https://mui.com/x/react-data-grid/accessibility/ | n/a | 2026-11-02 |
| G1 | https://github.com/material-components/material-web/issues/386 (found by web search, not opened) | undated | 2026-11-02 |

Publication dates: the kit pages show none. The code files are on the default branch, so they are current at the access date.
Tools and versions: @atlaskit/dynamic-table 19.3.8 (npm latest on 2026-11-02). For the other kits I read the default branch and found no version number. I did not record one.

## 1. Row height and cell padding

| Kit | Densities | Row height | Cell padding | Source |
|---|---|---|---|---|
| Untitled UI | `sm`, `md` (default) | `h-14` = 56 px (sm), `h-18` = 72 px (md). Header `h-9` = 36 px, `h-11` = 44 px. Calc, at 4 px per Tailwind unit. | Cell: `px-5 py-3` (20/12) for sm, `px-6 py-4` (24/16) for md. Header cell: `px-6 py-2`. | U1 |
| shadcn/ui | none | Not fixed. Body cell `p-2` (8 px) so it is content height + 16 px. Header `h-10` = 40 px. | `p-2` = 8 px each side. Font `text-sm`. | S1 |
| Radix Themes | size 1, 2 (default), 3 | Min cell height: 36 px, 44 px, `space-8`. All times `--scaling`. | Size 1: `space-2`. Size 2: `space-3`. Size 3: `space-3 space-4`. Radix spaces are 8, 12, 16 px in the default scale (from memory, not checked this session). | R1 |
| GitHub Primer | `condensed`, `normal` (default), `spacious` | Font 12 px, line height 20 px. Row = line + 2 x block padding + 1 px border: 29, 37, 45 px. Calc. Assumes the thin border token is 1 px. | Block/inline: 4/8 px, 8/12 px, 12/16 px. The first and last cell get 16 px at the edge. | P1 |
| Atlassian dynamic table | none | Not fixed. Cell block padding is 4 px. | 4 px block, 8 px inline. The first cell has 0 start padding and the last has 0 end padding. | A1 |
| IBM Carbon | xs, sm, md, lg, xl | 24, 32, 40, 48, 64 px. The header row matches. | Column padding 16 px (`$spacing-05`). | C1 |
| Polaris IndexTable | none found | Not fixed in CSS. | Cell `space-200 space-400` (8/16 px). Heading `space-150` inline, `space-200` block. | L1 |
| MUI DataGrid | compact, standard, comfortable | Default 52 px, header 56 px. Factors 0.7 and 1.3, so about 36.4 and 67.6 px. Calc. I did not find how the code rounds. | 10 px inline. | M1, M2, M3 |
| Material 3 | none | M3 has no data table component. I found a request thread only (G1). The older Material guide gives 52 dp rows and 56 dp header (search snippet. The page itself did not load). MUI says its 52 px "matches the standard height in the Material Design guidelines" (M1). | 16 dp in the same search snippet. | G1, M1 |

Notes:
- Untitled UI rows are tall (56 or 72 px). Its smallest row is 20 px taller than our 36 px target.
- A 36 px row is the Radix size 1 floor, the Carbon "sm" to "md" range (32 to 40 px), and the MUI compact result.
- Inline padding in the compact kits is 8 to 12 px (Primer condensed and normal, Atlassian, Radix 1 and 2, MUI 10 px).

## 2. Phone and narrow width

| Kit | What it does | Source |
|---|---|---|
| Untitled UI | The table sits in an `overflow-x-auto` wrapper. Docs say to hide columns with responsive classes such as `hidden md:table-cell`. The card header and the selection column use smaller edge padding below `md` (`px-4`, `pl-4`) and larger from `md` (`px-6`, `pl-6`). Cell padding does not change. No sticky column. No scroll shadow. No card layout. | U1, U3 |
| shadcn/ui | The table wrapper is `relative w-full overflow-x-auto`. The data-table page has no responsive guidance. Only toolbar buttons hide below `lg`. | S1, S2 |
| Radix Themes | `size` is responsive. Padding props are responsive. The docs say nothing on scroll. | R2 |
| Primer | The table is inside a `ScrollableRegion`. The accessibility page says the scroll wrapper must be focusable and have a name, so arrow keys can scroll it. Guidance: size columns, remove less important columns, or scroll sideways. A list is better for sparse or long-form data. No sticky column. | P1, P2, P3 |
| Atlassian | No built-in horizontal scroll. The docs say to simplify the table first, because scroll causes accessibility problems. A wrapper with `overflow-x: auto` is the suggested extension. | A2 |
| Carbon | The usage page does not cover responsive layout, scroll or sticky columns. | C2 |
| Polaris | Sticky first column and sticky header exist. A drop shadow (`drop-shadow(1px 0 0 …)`) shows on the sticky column while the table scrolls. Padding of the checkbox cell changes at `sm-down`. The code has a `condensed` mode that renders a `<ul>` list. I did not confirm from the docs when a page sets it. | L1, L2 |
| MUI DataGrid | Pinned columns are `position: sticky` and have a background and an optional border. The layout and accessibility pages say nothing about phones. | M3, M4 |

No kit documents a scroll-edge fade. Polaris is the only one with a shadow, and it is a 1 px edge line, not a fade.

## 3. Row actions

| Kit | Pattern | Touch | Label | Source |
|---|---|---|---|---|
| Untitled UI | One "dots" button in the last cell (`TableRowActionsDropdown`). It opens a menu with Edit, Copy link, Delete. The icon is 20 px with no padding. Always visible. | Always visible, so no hover issue. The icon is a small target: 20 px (calc from `size-5`). | `aria-label="Open menu"`. | U1, U2 |
| shadcn/ui | A ghost icon button, `h-8 w-8`, opens a dropdown with the heading "Actions". Always visible. | Always visible. Target 32 px. | `<span class="sr-only">Open menu</span>`. Checkboxes have `aria-label` "Select all" and "Select row". | S2 |
| Radix Themes | No row action pattern. | n/a | n/a | R2 |
| Primer | Actions are buttons or menus in a cell. The action column has no visible header. | Not covered. | The row header is added to each action name. Use "Delete test repository", not "Delete". Icon-only actions need `aria-label`. | P2, P3 |
| Atlassian | An Actions column with a "More" control. No detail. | Not covered. | Not covered. | A2 |
| Carbon | One overflow menu per row. With fewer than three options, use inline icon buttons. Prop `overflowMenuOnHover` hides the menu until hover or focus. The CSS sets the icon to `opacity: 0` under `(hover: hover)` and `opacity: 1` on `tr:hover` under `(any-hover: hover)`. In batch mode the row actions are disabled. | The usage page says: on touch devices the menu stays visible even with `overflowMenuOnHover`. The CSS agrees: a device that cannot hover never gets `opacity: 0`. | Not read. | C2, C3 |
| Polaris | Rows are clickable (`cursor: pointer`). Bulk actions sit in a bar. Per-row action pattern: not found. | Not found. | Not found. | L1 |
| MUI DataGrid | An `actionsCell` with inline icons, gap `spacing(1)`. The `showInMenu` option: not confirmed (DeepWiki could not find it). | Not covered. | Not covered. | M3, M4 |

## 4. Row states

| Kit | Hover | Keyboard focus | Selected | Pressed or disabled | Source |
|---|---|---|---|---|---|
| Untitled UI | `bg-secondary` (a light gray fill) with a color transition. | 2 px outline in `focus-ring` color, offset -2 (inside the row). The row line hides on focus. | `bg-secondary` (same fill as hover). Can turn off with `highlightSelectedRow={false}`. | Not found. Menu button: pressed state shows an outline. | U1, U2 |
| shadcn/ui | `hover:bg-muted/50`. | Not set on the row. | `data-[state=selected]:bg-muted`. Also `bg-muted/50` while a menu in the row is open (`has-aria-expanded`). | Not found. | S1 |
| Radix Themes | None in the CSS. | Not set. | Not set. | Not set. | R1 |
| Primer | `--control-transparent-bgColor-hover` on the cells. | Not set in the CSS I read. | Not set in the table CSS I read. | Not found. | P1 |
| Atlassian | `background-neutral-subtle-hovered`, fallback `#0515240f` (a 6% dark tint). | 2 px focused-border outline, offset -2. | `background-selected` (`#e9f2fe`), hover `#cfe1fd`. A separate `highlightedRowIndex` exists. Docs say never use it for selection or focus. | Not found. | A1, A2 |
| Carbon | `$layer-hover` background. Docs: always enable row hover, even on non-interactive rows, to help scanning. | `$focus` border. | `$layer-selected` background. Selected + hover is `$layer-selected-hover`. Border changes to `$border-subtle-selected`. | Not found. | C1, C2, C3 |
| Polaris | `bg-surface-hover`. Written after "selected" so a selected row still reacts to hover. | Not read. | `bg-surface-selected`. | A `TableRow-disabled` class exists. I did not read its style. | L1 |
| MUI DataGrid | `hoverBackground`. | A cell outline: 0.5 alpha focus color, offset inside the cell. Focus is per cell, not per row. | `selectedBackground`, hover `selectedHoverBackground`. | Not found. | M3, M4 |

All the kits show states with a background tint, except focus. Focus is an outline or border drawn inside the row or cell.

## 5. Separators and header

| Kit | Row lines | Header | Source |
|---|---|---|---|
| Untitled UI | A 1 px line under each row, except the last, from a pseudo-element so it takes no space. The "Alternating fills" variant is zebra. | `bg-secondary` fill, 1 px line under, `text-xs font-semibold`, quaternary text color. | U1, U3 |
| shadcn/ui | `border-b` on each row. The last body row has none. Header has `border-b`. | Header `font-medium`, `h-10`. No fill. | S1 |
| Radix Themes | A 1 px inset shadow, `gray-a5`, under each cell. The surface variant removes it on the last row. | Bold. The surface variant fills the header with `gray-a2`. | R1 |
| Primer | A 1 px line under each cell and a side line at the table edges (a full grid frame). | `semibold`, muted text, muted fill. Sorted column turns to default text color. | P1 |
| Atlassian | None. Cells have `border: none`. | Body small font, bold, subtle text, a 2 px line under the header. A 2 px line also closes the table. | A1 |
| Carbon | A bottom line `$border-subtle` on each row. Zebra is a variant that uses `$layer-accent`. | `$layer-accent` fill, 14 px semibold. Header cell has hover, active and focus states. | C1, C3 |
| Polaris | A 1 px top line on each row. The first row has a stronger line. | `bg-surface-secondary`. | L1 |
| MUI DataGrid | `border-top: 1px solid` on each row. The first visible row has a transparent top. | Not read. | M3 |

## Where sources disagree or I found nothing

- Row lines: 7 of 8 kits draw them. Atlassian does not. Carbon says its lines are part of the style. Nothing found says a no-line table fails on usability. Atlassian is the only evidence that it can work.
- Hover-only actions: Carbon offers them and keeps them visible on touch. Untitled UI and shadcn/ui always show the control. Primer does not say. Nothing found compares the two on usability.
- Selected fill: Untitled UI uses the same fill for hover and selected. Carbon and Polaris use a separate selected fill and a third one for both. The sources disagree.
- Not found: Untitled UI mobile guidance beyond hiding columns (the Figma file was not opened). Polaris row action and touch pattern (the docs moved to shopify.dev and did not load); Atlassian row height; Primer and Radix selected state; disabled and pressed row visuals in all kits; Material 3 data table guidance; scroll-edge fades in any kit; MUI `showInMenu`.
- The Untitled UI, shadcn and Radix pages showed truncated code, so I read source files. Values from GitHub `main` can change.

## What this means for the kit

### (a) Row actions: text, icons or a menu, and touch

1. Use one trailing icon button that opens a menu when a row has three or more actions. Use inline icon buttons when it has fewer than three. Supported by Carbon (C2). Untitled UI (U1) and shadcn/ui (S2) use the one-menu pattern.
2. Give every icon button an `aria-label`. Add the row name to it, such as "Delete test repository". Primer (P2) says this. Untitled UI and shadcn/ui use a generic "Open menu" label. That is weaker and the label does not name the row.
3. Show the action on hover and on keyboard focus only inside `@media (hover: hover)`. On a device that cannot hover, keep it always visible. Supported by Carbon (C2, C3). If you do not want hover-only actions, the always-visible pattern is also supported (U1, S2). Choose hover-only only if the quiet look needs it.
4. Make the touch target larger than the 20 px icon of Untitled UI (U1). shadcn/ui uses 32 px (S2). Carbon's small menu is 32 px (C1). No kit gave a 44 px target for a compact row. This is my inference: use a 32 px button inside the 36 px row, and test it on a phone. I found no source that sets the right size.
5. Do not use text buttons in a 36 px row. No kit does it. This is the absence of evidence, not a finding against text buttons.

### (b) Phone cell padding

1. Keep the row height at 36 px on a phone. No kit changes cell padding on a phone. Untitled UI (U1) and Polaris (L1) change only the edge padding.
2. Use 12 px inline cell padding on a phone and 8 to 12 px on desktop. Compact kits use 8 to 12 px (P1, A1, R1, M3). This is the only value in the compact kits that fits both sizes. Keep the first and last cell at 16 px, as Primer does (P1), so text lines up with the page edge.
3. Do not add a card layout as the default. Only Polaris has a list mode (L2), and I did not confirm when it applies. Primer says to use a list for sparse or long-form data (P3).
4. For a wide table: hide low-priority columns first (U3, P3). Then scroll sideways. Make the scroll wrapper focusable with a name (P2). Atlassian warns that scroll causes accessibility problems (A2).
5. A sticky first column is optional. Only Polaris and MUI have it (L1, M3). If you add one, add an edge line while it scrolls (L1). I found no source for a fade.

### (c) Row states

1. Hover: a light tint on the whole row. All kits do it. Carbon says to show hover even on non-interactive rows (C2). Atlassian shows that a 6% neutral tint is enough (A1). Wrap hover in `@media (hover: hover)` so a touch tap does not leave a stuck tint. No kit source says this, so it is my inference.
2. Keyboard focus: a 2 px inside outline, drawn inside the row (U1, A1). Do not rely on the tint. The tint cannot be the only focus mark.
3. Selected: a tint that is different from hover, with a third tint for selected + hover. Carbon and Polaris do this (C1, L1). Untitled UI uses one fill for both (U1), which makes a selected row and a hovered row look the same.
4. Pressed: no kit gave a row pressed state. Do not add one for rows that are not links. This is my inference.
5. Disabled: only Polaris has a disabled row class (L1). Add it only if the kit has a disabled row use case.
6. No row lines and no zebra: supported by Atlassian alone (A1). With no lines, the header line (Atlassian uses 2 px) and the hover tint must carry row scanning. Test with a long table. The tint alone is the least-tested option among the sources.
