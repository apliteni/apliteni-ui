# Owner notes on #768, branch builder-ui-r6-pages

Each section gives the change, the limit and the measured numbers. A headless Playwright Chromium measured all of them after `document.fonts.ready`. It checked light and dark at 390, 720 and 1280.

The captures hold one `guideline-<slug>.html` for each of the 25 guideline pages. Each page changed, because the shared stage and Markdown helpers changed. No kit component changed in this round, so there is no `component-*.html`. The only component story change is in the command palette demo data: a middot became a comma.

## 1. Same-border nesting

- Change: The page "The page" has the new rule "One frame per block", with a Do and a Don't picture. That page owns the page ground, the card and the stage, so it owns the rule about which surface holds which.
- Change: The pictures and stories lost every block inside a block with the same border. This includes layout and density, the page, dense tables, file drop, account and settings, spacing, going back, density and accents, and the command palette.
- Limit: The "One frame per block" Don't keeps one card in a card, because that is the mistake it shows.
- Measured: The nest probe finds 1 nesting on all 25 pages: the "One frame per block" Don't. Before the last fix, the file drop "One row" Don't also nested its dashed box in the panel.

## 2. Audit every Don't

- Change: 38 Don'ts are removed and 78 are kept. The list at the end of this file gives a one-line reason for each.
- Change: The contributor rules now say: add a Don't only for a mistake that people really make.

## 3. Colour and theming

- Change: The Overview and Activity tabs have no dark fade shadow at either end. The stage gives the tabs the surface as their ground.
- Change: The forced-colours picture uses a calm dark contrast theme. Canvas #2d3236, text #fff, Highlight #a6d8ff and HighlightText #212d3b.
- Measured: Text on Canvas 12.95:1. HighlightText on Highlight 9.24:1. Highlight on Canvas 8.57:1. The old pair was #000, #fff, #1aebff and #000.

## 4. State set, "Marked errors"

- Change: The rule shows the screen reader announcement with the said picture, next to the field.

## 5. Button labels

- Change: The closed list is a row of real glyph buttons, each with its name under it.
- Change: The #729 and #742 history is a source comment in the story.
- Measured: The page has 240 words. `npm run check:words` exits 0 and reports 12 of 26 pages over budget. Button labels is not in the over-budget list.

## States check

- Measured: 702 rule views on 25 pages, with 0 console errors, 0 sideways scroll and every rule opened by its hash. No file holds `fetch(` or a host path.
- Measured: 0 "·" between facts. 0 card start-x differences over 0.5px. 0 hover size changes.
- Fixed: The hover readouts "Above the mark" clip cut the chart's focus ring by 3.0px. The clip now has bottom padding. Measured after: 0 clipped rings on all pages.
- Kept, centre lines: The dropdown chevron sits 2.26px off the value centre. The kit moves it up by half its rotated ink, so the V looks centred. The toast close sits at the top of a two-line toast, as the kit draws it.
- Kept, empty blocks: 270 hits are drawn parts with no text. These are switch tracks, drawer scrims, breakpoint frames, account shell sketches, phone frames and swatches. They are schematic pictures, not empty blocks.
- Kept, no hover change: Most hits are probe errors. A direct hover on "Create token", "Open payout", "Send", "Close" and "What's new" changes the border or ground. A selected segment, a current tab, a busy button and a button under the drop target have no hover on purpose.
- Gap, outside this task: The filter chip remove mark has no hover paint. A prose link in a guideline keeps its paint on hover. This round changes no kit component, so neither is fixed here.

## Don'ts audit

### Removed (38)

- account-and-settings, `modal`: Nobody puts columns in a full-width sheet for settings. The Do alone shows the shape.
- button-labels, `no-action-on-selection`: A selection toolbar is rare in admin screens. The Do shows the button.
- colour-and-theming, `tokens`: Nobody re-points a named hue at the accent. It was a constructed case.
- command-palette, `ranking`: The ranking is internal logic. The Do shows the result, and no builder chooses the wrong order.
- component-choice, `scale`: Nobody nests a full-page success layout in a card. It was a constructed case.
- dashboards-and-reports, `fast-glance`: A second screen below the figures is a page length, not a picture of a mistake. The Do shows the fold.
- dashboards-and-reports, `report-depth`: A report cut to figures is rare. The Do shows the depth.
- dashboards-and-reports, `export-icon`: The worded button was not a mistake. It only showed a width.
- dashboards-and-reports, `chart-table-switch`: Stacking the table under the chart is rare in the kit. The switch is built in.
- dashboards-and-reports, `value-not-legend`: The kit chart draws values by default, so the Don't showed a state nobody gets.
- dense-tables, `units`: Muted units are a style, not a common mistake. The Do shows where the unit goes.
- dense-tables, `pinned-identity-sub-lines`: The Don't drew internal layout that a reader cannot see.
- dense-tables, `filter-bar`: A table without a filter bar is shown elsewhere. The Do is enough.
- density-and-accents, `check-density`: Nobody forces two figures side by side in a narrow panel. The Do shows the stack.
- density-and-accents, `follow-the-consequence`: The Don't needed a long caption to explain itself. The Do is clear alone.
- destructive-actions, `colour`: The destructive hover is shown in the wording and undo rules. The Don't repeated it.
- drawer, `drawer-or-page`: The Don't was the one-record Don't again. One picture is enough.
- file-drop, `in-the-row`: The Don't drew two shapes and needed words for both. The Do is clear alone.
- file-drop, `limits-once`: The repeated limits were three copies of one line. The picture added nothing.
- going-back, `below-a-list`: Nobody adds a back link in the sidebar. It was a constructed case.
- going-back, `section-lit`: An unlit section is a sidebar state, shown in the Do.
- going-back, `quiet`: Two filled buttons in a header are shown on the page rules. The Don't repeated it.
- hover-readouts, `above-the-mark`: The kit chart places the readout itself, so nobody can force it above.
- hover-readouts, `contents`: Long readout text is rare. The Do shows the contents.
- hover-readouts, `on-touch`: A hover-only touch chart cannot be drawn in a still picture.
- iconography, `stroke-earns-the-bar`: A thin stroke is not a choice a kit glyph allows.
- labels-and-titles, `title-rank`: The kit card title has its rank. Nobody resizes it to the page title.
- layout-and-density, `container`: Page widths in files are source code, not a picture.
- layout-and-density, `measure`: Two competing widths are source code, not a picture.
- layout-and-density, `below-the-page`: T-shirt sizes and ch on a wrapper are source code, not a picture.
- motion, `after-load`: Content that appears in one frame is the default, not a mistake to draw.
- motion, `durations`: A 300ms duration is a number, and a picture does not show it.
- pagination, `counted-total`: A discarded count is server logic, not a picture.
- pagination, `the-jump`: The page links are built into the kit pager. Nobody builds the bad set.
- pagination, `announce-range`: A live region cannot be drawn in a still picture.
- spacing, `two-gaps-phone`: The phone gap is a breakpoint value that the kit sets.
- the-page, `layout`: Moving search or the menu needs two pages. One picture cannot show it.
- the-page, `density`: Mixed row heights need two tables and a long caption. The rule text is enough.

### Kept (78)

- accessibility-floor, `tap-zone`: Builders enlarge the drawn control to reach 44px. This is a common fix that breaks dense rows.
- accessibility-floor, `tap-spacing`: Desktop gaps reach phones unchanged in most products.
- accessibility-floor, `ring-contrast`: A soft glow is the usual default focus style in design tools.
- accessibility-floor, `measurable-pair`: Text on a gradient hero is a common marketing pattern.
- account-and-settings, `nav`: One long settings scroll is the default of many products.
- account-and-settings, `menu`: Settings rows in the account menu are a common shortcut.
- account-and-settings, `in-row`: A modal for one switch is a common reflex.
- button-labels, `words-first`: Icon-only rows with hover names are common in toolbars.
- button-labels, `glyph-repeats-the-verb`: A glyph for the object, not the verb, is a common choice from icon sets.
- button-labels, `wordless-earns-it`: A funnel or a cog with no word is the most common wordless button.
- colour-and-theming, `signals`: Accent as a fill ground is a common way to mark importance.
- colour-and-theming, `selection-accent`: A second accent mark on a selected tab is common in tab kits.
- colour-and-theming, `text-surface`: Grey fields and headers behind text are common in admin themes.
- colour-and-theming, `selected-forced-colours`: An outline is the usual forced-colours fix, and it fails the rule.
- command-palette, `named-things`: Vague rows such as More are common in command menus.
- command-palette, `groups`: Ungrouped mixed rows are the default of a quick palette build.
- command-palette, `ask-first`: Disabling a destructive row is a common shortcut.
- component-choice, `interrupt`: A callout used as a question is common.
- component-choice, `transient`: An auto-closing warning toast is common.
- component-choice, `panels`: Tab roles on filters are a common accessibility mistake.
- component-choice, `one-category`: Views and filters in one button row are common.
- component-choice, `dropdown-search`: A long currency list without search is common.
- dashboards-and-reports, `figures-and-exceptions`: A whole ledger on a dashboard is the most common dashboard mistake.
- dashboards-and-reports, `link-to-the-report`: Exception lists with no links are common.
- dashboards-and-reports, `report-offers`: A table with a fixed period in its title is common.
- dashboards-and-reports, `no-range-on-chart`: A range under the chart title is common.
- dashboards-and-reports, `two-lines-at-most`: Four lines on one chart are common.
- dense-tables, `surface`: Zebra and hover fills are the default of most table kits.
- dense-tables, `density`: Smaller type to fit rows is a common reflex.
- dense-tables, `numbers`: Left-aligned numbers and string sort are common.
- dense-tables, `delta`: Colour-only deltas are common.
- dense-tables, `content-width`: Full-width short tables are the default.
- dense-tables, `overflow`: Squeezed columns are common on phones.
- dense-tables, `states`: A blank table on load or error is common.
- density-and-accents, `reduce-density`: Repeated facts in a preview card are common.
- destructive-actions, `wording`: OK and Cancel under a vague question are common.
- destructive-actions, `undo`: Undo for a removed workspace is common.
- drawer, `one-record`: Long forms in drawers are common.
- drawer, `no-cards`: Cards inside a drawer are common.
- drawer, `three-lines`: A line between every row is common.
- drawer, `rows`: Values at the far edge with row lines are common.
- empty-states, `next-action`: An empty state with no action is common.
- file-drop, `one-row`: The tall dashed drop box is the common default.
- file-drop, `on-drag`: A whole-window drop overlay is common.
- file-drop, `failure`: Replacing the row with a failure line is common.
- file-drop, `which-shape`: A dialog for one file is common.
- going-back, `name-it`: A bare Back link is the most common back link.
- going-back, `address-not-history`: A history back link is common.
- going-back, `one-or-the-other`: Stacked back links per level are common.
- hover-readouts, `overlay`: A readout that pushes content down is common.
- hover-readouts, `not-only-hover`: Sparkline values reachable only by pointing are common.
- iconography, `meaning`: One x glyph for two meanings is common.
- labels-and-titles, `text-ink`: Muted small ink for rank is common.
- labels-and-titles, `sentence-case`: Upper-case labels above figures are common.
- labels-and-titles, `no-repeated-noun`: A noun repeated in a label and its title is common.
- labels-and-titles, `eyebrow-names-the-kind`: A small eyebrow as the only title is common.
- layout-and-density, `density`: Ad-hoc spacing values are common in hand-built screens.
- layout-and-density, `breakpoints`: Extra breakpoint values are common.
- microcopy, `state-not-destination`: Switch labels that name the action are common.
- motion, `easing`: CSS ease for everything is the browser default.
- pagination, `page-size`: One forced page size is common.
- spacing, `two-gaps`: A third gap between sections is common.
- spacing, `title`: A title floated between groups is common.
- spacing, `text-edge`: Chips and tables off the column edge are common.
- stat-bands, `a-band-not-a-card`: Heading-size figures in cards are common.
- stat-bands, `tone-not-direction`: Colour by sign is the common default.
- stat-bands, `say-the-basis`: A missing basis is common.
- state-set, `error-in-markup`: A red field with an unlinked message is common.
- state-set, `loading`: A spinner with no busy state is common.
- the-page, `width`: A wide table in the centred column is common.
- the-page, `head`: Filters above the title are common.
- the-page, `one-h1`: Several page titles are common.
- the-page, `outline`: Skipped heading levels are common.
- the-page, `one-primary`: Three equal actions are common.
- the-page, `stacking`: Many cards for a list are common.
- the-page, `one-frame`: A card around the filter bar and the table card is common.
- the-page, `at-rest`: Panels that open on load are common.
- the-page, `lede`: A filler line under the title is common.
