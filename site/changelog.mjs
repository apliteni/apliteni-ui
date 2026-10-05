// Write for people who use the kit. Start with what changed and who is affected.
// Use one to three short sentences per change; add detail only for migration
// steps or behavior limits. Use plain words, without praise, filler or a test diary.
// Keep versions, dates, change types, component links and issue references.
// The first sentence is the page summary; full text also appears in release notes.

export const RELEASES = [
  {
    v: '0.93.0', date: '2026-10-05',
    changes: [
      ['changed', 'The focus ring is one solid accent band with no glow, drawn as a real `outline` 1px off the control it marks. Every focusable control in the kit draws it \u2014 buttons, fields, checkboxes, switches, menu rows, tabs, links, chips and panels, in vanilla and React, light and dark. The band\u2019s colour and width are unchanged, so the contrast floor it is held to is the number it already measured; what is gone is the 12px halo over it, which was decoration rather than something a reader read. Artur chose this on #578 after #557 drew a scroll region\u2019s band the same way. Resolves #578.', ['Focus']],
      ['breaking', '`--ring` is an `outline` value now, not a `box-shadow` value. A consumer sheet that writes `box-shadow: var(--ring)` draws nothing after this release; write `outline: var(--ring); outline-offset: var(--ring-offset);` instead. `--ring-gap` is removed with the painted gap it coloured \u2014 an outline leaves its offset unpainted, so the 1px between a control and its band is whatever surface the control is already standing on. If you recomposed `--ring` or set `--ring-gap` on your own painted containers, delete both: one declaration at the root now reaches every control. `--ring-width`, `--ring-color` and `--ring-gap-width` are unchanged and still where you tune it. See #578.', ['Focus']],
      ['fixed', 'A keyboard-focused current day or month in the date picker draws one accent band instead of two. The cell keeps a 1px accent border at rest \u2014 the hollow square that says where you are \u2014 and that border sits inside the box while the band sits 1px outside it, so a focused cell painted 1px of accent, 1px of nothing and then the 2px band. The border now stands aside while the cell holds focus, for a chosen day as well as an unchosen one. Its resting look is unchanged. See #578.', ['DatePicker']],
      ['fixed', 'A filter chip’s chosen menu row shows the arrow keys where they are again. The keyboard cursor marked a row kit-wide with a fill and an inset accent bar; the chosen row keeps its accent wash instead of the fill, so the bar was the whole of its cursor, and this release takes that bar off every selected state. The cursor now deepens the wash by the step hover already takes — 9% more accent — so the row the arrow keys are on reads 1.14:1 off the resting wash in dark and 1.15:1 in light, and still reads as chosen. Hover is unchanged, and a pointer and an arrow key are not on one row at once. See #550, #578.', ['FilterBar', 'Dropdown']],
      ['changed', 'Two things the old carrier forced are gone. No control carries the transparent 2px outline that stood in for the ring under forced colours \u2014 the band is a real outline, which is what the system repaints \u2014 and a floating panel keeps its own edge and drop while it holds focus instead of restating them in its focus rule. A row that is hovered and focused at once draws the band and not the hover edge, which is the one indicator the kit\u2019s menu rows already chose.', ['Focus', 'Dropdown', 'Drawer', 'CommandPalette']],
      ['changed', 'A focused control draws the band and nothing beside it. A text field, a textarea, a select, a dropdown trigger, a dropdown\u2019s search input, a drawer\u2019s close, the shell\u2019s search button and React\u2019s file-drop zone each recoloured their own 1px border to the accent under the ring, which put a second accent band one pixel inside the first with the unpainted offset showing between them \u2014 on the light ground that pair read as a halo rather than as one edge. The border keeps its resting ink now. Six hover rules painted the same pair whenever a pointer rested on a focused control \u2014 the secondary button, the check box, the social mark, the version switcher, the avatar and the dropdown trigger \u2014 and each stands aside while the band is drawn. A drop zone still recolours its dashed edge while a file is over it; that edge is the drop target, not a focus mark. The band\u2019s own colour, width and position are unchanged. See #578.', ['Focus']],
      ['changed', 'A selected item is marked by a background highlight and never by an edge. The chosen pill of a segmented group drops its 1px accent outline, the row the command palette would run drops its 1px edge, and the row a dropdown would pick drops its inset accent bar. Each of those edges was the shape the focus band has, one pixel further in, so a reader could not tell the two apart. An outline means focus and nothing else. If your CSS relied on one of those three marks, it is gone. The current row of a side nav or an open rail is NOT one of them: it keeps its hairline and its accent marker here, because that row is #475\u2019s subject. See #578.', ['Segmented', 'CommandPalette', 'Dropdown']],
      ['fixed', 'Those three marks are visible again on the light theme. They were filled `--surface`, which in light is the same `#ffffff` as `--bg-elevated`, and the segmented track is `--surface` itself \u2014 so on a menu panel, a palette or the strip\u2019s own track the fill drew nothing and the edge above had been the whole mark. The chosen pill now fills `--surface-3` (1.140:1 on its track in light, 1.160:1 in dark) and a menu row and a palette row fill `--surface-2` on their panel (1.183:1 and 1.234:1). The current page in a pager keeps its hairline instead: a pager stands on the page in one showcase and on a card in another, and no fill marks it on both. One consequence worth knowing: a chosen pill\u2019s label now rests on a quiet grey fill, which #455 had reserved for marks that carry no words.', ['Segmented', 'CommandPalette', 'Dropdown']],
      ['fixed', 'Six rules in the kit\u2019s own Storybook draw the band again \u2014 five focusable controls and one static specimen of the ring: the icon gallery\u2019s search field and its tiles, the motion page\u2019s replay button, the stock screener\u2019s sort headers, a link in guideline prose, and the file-drop guideline\u2019s ring figure. Each still wrote `box-shadow: var(--ring)`, which draws nothing now, beside a transparent stand-in outline, so those five controls had no visible focus indicator at all. Nothing a consumer installs was affected.', ['Focus']],
    ],
  },
  {
    v: '0.92.0', date: '2026-10-05',
    changes: [
      ['breaking', 'The React DataTable\u2019s column pager is removed. A scrollable table — one with `stickyHeader` or `pinnedIdentity` — used to draw a Previous columns / More columns pair above itself as soon as its columns overflowed. Reach the far columns by scrolling the table instead: the region around it is already a named, keyboard-focusable scroll region that draws the kit\u2019s inward ring, so a trackpad, a finger and the arrow keys all get there, and the two buttons only repeated a gesture every pointer already has. Nothing replaces them, and no prop is involved: if you were hiding the pair by leaving `stickyHeader` and `pinnedIdentity` off, you can turn them back on. The pager row sat in a `ui-card__row` inside the card, so a table in a card is one row shorter. Resolves #581.', ['DataTable']],
    ],
  },
  {
    v: '0.91.0', date: '2026-10-05',
    changes: [
      ['changed', 'A filter chip’s menu marks the value the chip is showing: the row takes a soft accent wash and keeps the kit’s 16px check. The wash is 1.16:1 over the panel in light and 1.20:1 in dark — a tint, not a fill — so the check is what identifies the state for a reader who cannot separate the two hues, at 6.35:1 and 4.13:1 over the wash. The chosen label holds --strong where the kit elsewhere stepped it down to --text, and the wash survives the keyboard cursor and focus, which each paint an opaque surface and used to take it off — both still read by the paint that is not a fill, the cursor’s bar and the kit ring. Hover deepens the wash by a measured step instead, because its own other paint is a 1px edge that reads 1.06:1 on a washed row: 1.14:1 over the resting wash in dark and 1.15:1 in light, against the 1.11:1 the kit’s opaque fill gives any other row in the panel. Refs #549.', ['FilterBar', 'Dropdown']],
      ['added', '`filterChipItems(filter)` hands a chip’s menu the chip’s items with the chip’s own value marked `selected`, matching a row by its `value` or by its `label` where it has none. Both faces call it, so a consumer no longer has to mark the row themselves to get the mark, and the line the chip prints and the row its menu marks cannot disagree. A chip with nothing chosen, or a value that is in no row, marks no row: every row comes back with its flag written, so a `selected` the consumer left on one cannot stand in for a value the bar is not applying. A `selected` the consumer set is overridden either way, and the consumer’s own array and objects are never written to.', ['FilterBar']],
      ['added', 'filterPanelFit() and DD_MENU_FLOOR are published, so a second implementation of the dropdown asks the kit where a filter chip’s menu may sit instead of measuring its own. The floor argument sets the width the menu reaches.', ['Dropdown', 'FilterBar']],
      ['added', 'transitionMs(el) is published from the motion helpers. It answers how long the stylesheet says an element’s transition lasts, so a caller waiting for a fade to finish sizes its backstop timer from the sheet rather than from a copy of the duration token. A missing element answers 0 rather than throwing, so an unmounted ref gets a timer that fires at once.', ['Motion']],
      ['fixed', 'An open filter menu is readable again. Since a chip began showing its value alone, bounding the menu to that trigger left it about 48px wide, breaking option words mid-letter; an open menu now takes the kit’s 240px menu floor, shifting along the row when the room on the side it opens from is short, and never leaves the row or widens the page. This reaches an end-aligned chip and a searchable one, which were the two compositions still squeezed. A shut menu is unchanged, which is what keeps #467 fixed. Vanilla and React measure it with the same calculation and write the same three properties. Resolves #549.', ['FilterBar', 'Dropdown']],
      ['fixed', 'A menu left open while the layout moves under it is re-fitted to the row it is now in. Both halves watch that row with a ResizeObserver rather than listening for one resize event: a shell whose rail animates its width goes on widening the column under an open menu for a quarter of a second after the event, and a menu fitted at that instant kept a width 70px narrower than its row allowed — the state the floor exists to remove, on a settled page.', ['FilterBar', 'Dropdown']],
      ['fixed', 'An open menu now follows its chip when the chip in front of it changes size. The row keeps its width and its height while that happens, so watching the row alone missed it: re-rendering a preceding chip’s value at 390px carried an open menu’s right edge from 374px to 402px, over the edge of the page, until something else asked for a re-measurement. Both halves now observe the boxes laid out in the row as well as the row, and watch the row for the mutation that moved the chip — a re-rendered value included. A change inside a dropdown panel is not one: a panel is absolutely positioned and can move no chip.', ['FilterBar', 'Dropdown']],
      ['fixed', 'Closing a filter chip’s menu no longer collapses it while it is still on screen. The panel fades out over --dur-med, so the floor, the slide and a searchable chip’s width pin are now held until that fade ends instead of being dropped in the frame the menu closes, where an opaque 240px menu became a 48px column of single letters for the first frames of every close.', ['FilterBar', 'Dropdown']],
      ['fixed', 'A selected option’s tick no longer reaches outside the panel that bounds it inside a filter chip. A 16px mark beside an 11px gap does not fit the 48px trigger a chip printing a short value gives its shut panel, so in a SHUT panel inside a chip the tick may shrink and is clipped. Shut is the whole of it: a menu that is open, or still fading out after a close, keeps the kit’s whole 16px check, because flex lays a chosen row’s label out at its own length first and would otherwise hand the mark the remainder — 9.8px of a 16px check in a 240px menu, drawn as a small chevron rather than a tick. Nothing visible changes in a shut panel, which is the state nothing is painted in.', ['FilterBar', 'Dropdown']],
    ],
  },
  {
    v: '0.90.0', date: '2026-10-05',
    changes: [
      ['fixed', 'A keyboard-focused link on a folded sidebar rail draws the whole focus ring. The rail was clipped across rows still laid out from the open column, so a three-pixel ring lost both ends and arrived as two accent bars above and below the glyph. Every box in the rail is now the rail\u2019s own width and travels it on the rail\u2019s clock, which leaves nothing to clip and keeps the hit area the rail in every frame of the fold; clicks beside a positioned rail used to stop landing on 175px of the page. One limit comes with it: a folded rail flush to a page\u2019s right edge now adds 175px to the page\u2019s scrollable width, where the clip that cut the ring used to hide it. Fixes #575.', ['Navigation', 'SidebarNav']],
    ],
  },
  {
    v: '0.89.0', date: '2026-10-05',
    changes: [
      ['changed', '`npm run check:words` measures the prose on each guidelines page and fails one that is over its word budget. The budget is 60 words a rule, read off the shortest pages in the collection today, and the count is every word a reader reads: any introduction above the first rule, then each rule\u2019s title and the fields it fills. An introduction buys no allowance of its own, so a page with no rules has nothing to spend and any introduction on one fails. The fifteen pages already over the budget are held at their current size until they are cut. It is a drafting aid for whoever edits the collection, deliberately outside CI, and changes nothing the kit renders. Resolves #576.'],
    ],
  },
  {
    v: '0.88.0', date: '2026-10-05',
    changes: [
      ['changed', 'React `FileDrop` draws remove as the kit’s small text button reading “Remove”, where it drew a wordless `x`. `x` is on the kit’s icon-only list for close and dismiss, and taking a file off a row is neither — the row stays and the file leaves it. `removeLabel` now sets a visible word and defaults to “Remove”; a caller passing the old “Remove file” will see those two words on the button, so shorten it. Two worded actions take more of the name’s line than one word and an `x` did: at 320 a failed upload whose name is long enough to be cut gets 119px of stem in a plain row and 87px inside a panel — about seventeen and thirteen characters. A panel at 360 gives 127px, and an ordinary name is cut there too. The extension is never cut, and 390 and wider are unchanged. Refs #565.', ['File drop']],
      ['added', 'Button labels is a new guideline page: keep the words, let a glyph beside a label repeat that label\u2019s verb and treat every button in a row the same way, and drop a button\u2019s words only when its glyph is learned everywhere, its action is on the closed list and its name is left to assistive technology and a hover title. The closed list is the kit\u2019s own decision; the specification keeps it apart from what the cited design systems actually support, and records the shell\u2019s folded rail as a separate trade that shows its labels instead of carrying a tooltip. The funnel is not on the list, so Filter keeps its word, and the glyph beside that word stays optional. Closes #565.', ['Button']],
      ['added', '`iconOnlyNames` says which word a wordless control\u2019s name may open with. A glyph on the closed list can no longer be borrowed for the action beside it \u2014 a `copy` glyph on a Duplicate button now fails the kit\u2019s own gate. Part of #565.', ['Button']],
      ['fixed', 'A link in guideline prose takes the kit focus ring on keyboard focus instead of the browser\u2019s own outline, in both themes. Part of #565.'],
    ],
  },
  {
    v: '0.87.0', date: '2026-10-05',
    changes: [
      ['fixed', 'An underline segmented strip wraps onto a further row when its tabs do not fit, instead of keeping one row and scrolling. In a phone-width column the tabs past the fold were cut off with nothing saying they were there: the stock screener showcase lost \u2018Valuation\u2019 at 390px. A label too long for the column now wraps inside its own tab, and a single unbreakable word narrows with it, so no tab label can widen the strip or the page. Tabs keep their size, order and type rank, and a tab\u2019s focus ring is no longer clipped. Pill strips are unchanged. Resolves #527.', ['Segmented']],
      ['changed', 'The chosen tab in an underline strip is its own label and 2px of accent under it \u2014 no plate, no hairline, no upright rail. Its label steps to --strong at --weight-semibold while a reading label sits at --weight-medium, and the bar spans the label\u2019s width, inset from the tab\u2019s bottom edge. It was an accent rail on that bottom edge plus the accent outline every chosen segmented button carries, which spent the accent twice and left the mark on an edge two wrapped rows could both claim. Every mark is inside the tab now, so a wrapped strip\u2019s rows stand at its own 4px track gap rather than 20px, under both pointers. If your CSS relied on the chosen tab painting a background or a border, it no longer does. Closes #544.', ['Segmented']],
      ['changed', 'An underline strip no longer draws a rule under its tabs. The chosen tab carries the whole selection, so the line marked nothing. A consumer who wants one draws it on the container.', ['Segmented']],
      ['changed', '`filterBar` and React `FilterBar` show the clear action only once a filter is applied, and draw it in the kit\u2019s bordered skin without its fill \u2014 the edge a ghost button does not have, and no grey block under the words, in any state. A disabled or busy bar keeps the edge and takes the kit\u2019s box-less unavailable ink, with nothing painted behind the label. It used to stand in an empty bar, disabled, as the one thing in the row \u2014 which read as a bar that had been switched off. A consumer reading `[data-filter-clear]` finds nothing while no filter is set. If your CSS relied on this one control painting `--surface`, it no longer does.', ['Filter bar']],
      ['fixed', 'Clearing the last filter, or removing the last chip, no longer leaves the focus on the filter bar itself. An emptied bar keeps only an out-of-flow legend, so it measures 0 high and the ring landed on a floating dot above the next control. Both faces now move the focus to the control the reader\u2019s next Tab would reach, which on both showcases is the caller\u2019s own action beside the bar. Controls the reader cannot reach are passed over \u2014 `hidden`, `inert`, `visibility: hidden`, `display: none`, disabled, inside a disabled fieldset or out of the tab order \u2014 and the focus is checked after it is asked for, so a refused request no longer drops the focus onto the page body. The new `nextFocusStop` export names that control for a consumer, and `focusNextStop` places the focus the same way and answers with where it landed. A bar that still holds chips keeps the ring, as before.', ['Filter bar']],
      ['changed', 'An underline tab takes its padding from the spacing scale and its height from the tap floor: `--space-3`, and `min-height: var(--tap-min)`. The off-scale 13px it padded with left the drawn height to the font \u2014 44px with the webfont loaded and 41px without \u2014 so the 44px target it claimed depended on a font arriving. It draws 44 either way now.', ['Segmented']],
    ],
  },
  {
    v: '0.86.0', date: '2026-10-05',
    changes: [
      ['added', 'React AccentPicker provides the four existing accent swatches as a controlled group. The host applies and saves the selected accent. Part of #429.'],
      ['fixed', 'The selected accent swatch says so again: it carries a tick inside the circle, the same mark a checked box takes, in the kit’s ink for a saturated fill. Nothing said which accent was on before, because the selection ring was declared in the swatch’s own gradient and a gradient is not a colour. The tick also holds while the swatch has keyboard focus, where the focus ring used to replace the only signal there was. Focus stays the kit ring and is now the one accent edge a swatch draws: a selected swatch’s shadow is an unselected one’s. The tick reads 6.63:1 or better on every swatch in both themes. Vanilla and React share the fix.', ['AccentPicker']],
      ['added', '`accentSwatchStyle(accent)` returns the custom properties one swatch button carries: `--swatch`, the gradient its circle wears. Both pickers read it, so a page building its own swatch strip paints the same thing, and the kit’s stylesheet draws the selected swatch’s tick, so the strip needs no selection paint of its own.'],
      ['changed', 'The published type of `ACCENTS` narrows from `string[]` to a readonly tuple, so React can derive its `Accent` union from it. TypeScript consumers assigning it to a mutable `string[]` need a copy.'],
    ],
  },
  {
    v: '0.85.1', date: '2026-10-04',
    changes: [
      ['changed', 'The packaged manifest\u2019s `test` script now ends a run with its ten slowest tests and files, and says which of them are over the stated budget. That report never fails a run. It is for whoever contributes to the kit; nothing the kit ships behaves differently. See #560.'],
    ],
  },
  {
    v: '0.85.0', date: '2026-10-04',
    changes: [
      ['fixed', 'A dropdown the keyboard opens puts focus inside itself for a reader who asked for reduced motion. The panel opened and focus stayed on the trigger: under the reduced-motion net an element naming no transition property of its own still transitions the inherited visibility, so everything inside the panel was still hidden in the frame the dropdown focused into it, and focus() on a hidden element does nothing. An open panel now carries no transition inside it at all. The search field, the topbar account menu and the version switcher were the three affected. Fixes #519.', ['Dropdown', 'Topbar']],
      ['fixed', 'The account menu\u2019s keyboard-focused row draws the whole focus ring. The panel clipped at its own edge and padded by nothing, so a three-pixel ring had one pixel to draw in and arrived as two accent bars above and below the row. The panel clips nothing now. Its rows keep the geometry they had \u2014 nothing moves, and no colour or token changes \u2014 so the ring crosses the panel\u2019s edge, standing two pixels outside its border, and a hovered last row\u2019s square fill reaches past the panel\u2019s rounded bottom corners with it. See #519.', ['Topbar']],
    ],
  },
  {
    v: '0.84.0', date: '2026-10-04',
    changes: [
      ['added', 'Stat band figures take a `caption` for context that is not a change, such as what a rate is a share of. It takes the one row under the value, with no arrow and no colour, and leads that row when the figure also has a change, so the row reads what the value is, how it moved and what it moved against. Give a figure a caption only when it adds a unit, a period or a limit the value and its label cannot carry: a rate could be of income or of orders, so it says which, while `Gross margin 36.1%` already names its own denominator and takes none. Keep it to a short phrase. Vanilla and React. Resolves #497.', ['StatBand']],
      ['breaking', 'A stat figure with nothing to compare now shows its value alone, and keeps only the caption you gave it. The row that read `No earlier figure` is gone, and with it `delta.none`, which worded it: beside figures that do carry a change, that sentence is noise. Pass a `caption` if a figure needs words under its value. Table deltas are unaffected \u2014 `deltaValue()` still writes its `missing` text.', ['StatBand']],
      ['changed', 'A change now keeps its arrow and its number on one line. A caption or a `delta.basis` wider than the figure is clipped with an ellipsis there instead of wrapping, and the whole string stays in the markup for a screen reader and for a copy; a caption standing alone keeps wrapping and loses nothing. Before this a long basis could wrap, leaving an arrow at the end of one line and its number at the start of the next. Where a tile cannot show a comparison whole, React `delta.tooltip` carries it to hover, keyboard focus and touch.', ['StatBand']],
      ['changed', 'A band\u2019s own caption is set at 13px rather than 11px, on the kit\u2019s caption rank. The statement that governs the whole row is no longer smaller than one inside a single figure. Existing bands with a `basis` will show a slightly larger caption.', ['StatBand']],
    ],
  },
  {
    v: '0.83.0', date: '2026-10-04',
    changes: [
      ['changed', 'Every card with a description now has 8px between its title and that line, not 5px. The old value was off the kit\u2019s spacing scale and tight enough that the description read as part of the heading; 8px is the step the page header already uses for the same pair. This moves one line in every card that has a description. Part of #499.', ['Card']],
      ['added', 'A table marked `ui-table--stack` lays each row out as a block below the one-column step: the identity and the short cells on the first line, the cell marked `ui-table__long` on a line under them, and the header row clipped rather than removed, so a cell still reads with its column name. A log or a queue whose last column is a paragraph now fits a phone without scrolling sideways. A stacked cell is as tall as its own text, so the row height `ui-table--compact` sets for a one-line cell no longer caps the paragraph. With the header clipped, a short value carries its own unit: the pinned story counts lots in the cell and expands the basis point in the caption above the table. A stacked table has to name the table, row group, row, column header and cell roles in its own markup, because a stylesheet cannot write a role; in Chromium only the body\u2019s row group is actually lost, and the other four are asked for because WebKit and Gecko were not measured. React is not served yet: `DataTable` builds its own class list, takes no `className` and puts its sort control in the header cell, so reaching the modifier from React means hand-writing the table. Resolves #499.', ['Table']],
    ],
  },
  {
    v: '0.82.0', date: '2026-10-04',
    changes: [
      ['added', 'A component-choice guideline: group one category at a time. Views, filters, sorting and actions each take their own group and style; a bar that mixes them hides which control re-draws every row and which only narrows them. See #508.'],
    ],
  },
  {
    v: '0.81.0', date: '2026-10-04',
    changes: [
      ['breaking', '`accountShell()` is removed, with the Showcases/Account preset screen that drew it. It laid account settings out as a full-width page in the shell, which is the shape the new guideline rejects. Call `appShell()` instead: pass your own `nav` and `crumbs` \u2014 `[{ label: cap }, { label: crumb }]` is the trail the preset built \u2014 and a `topbar` bag if you want the band, with `versions`, `showSwitch` and `wireTopbar()` as before. `ACCOUNT_NAV` is still exported and is still the account menu\u2019s fallback nav, and the menu still reads the old `[id, icon, label, href?, target?]` tuples. Components/Topbar draws the band over a shell. Part of #509.', ['Shell']],
      ['fixed', 'Below 720px the topbar\u2019s version menu opens leftwards from its switcher, as the account menu beside it always has. It was anchored by its left edge, and a closed menu is still laid out \u2014 so on a phone it reached well past the right of the page and scrolled it sideways with nothing on screen to explain it. Measured on a 320px viewport: the page’s scroll width was 527px and is 367px. The band\u2019s own controls still need more room than a 320px page gives; that is #558. See #509.', ['Topbar']],
      ['fixed', 'Below 560px the topbar\u2019s controls sit one spacing step apart, so the account avatar is whole on a 390px page. It stood 7px past the right edge and the page scrolled sideways to reach it \u2014 and the avatar is the only way into the account area on that screen. The band now needs 352px of the 362px a 390px page gives it, and that page does not scroll sideways at all. A 320px page still asks more of these controls than it has, which stays #558. See #509.', ['Topbar']],
      ['fixed', 'A bare link in a table cell now gives a pointer the 24px target floor, through a layer that changes no layout. It was as tall as its line box \u2014 21px in a dense table \u2014 and growing the link\u2019s own box would have grown every dense row holding one. See #509.', ['Table']],
      ['added', 'Guidelines / Account and settings says where account and personal settings belong: in one modal over the product, its navigation beside the pane \u2014 above it on a phone \u2014 rather than in a full-width sheet with columns. Five rules cover the modal, the navigation inside it, what the account menu holds, changing a single field in the row that names it, and naming a pane\u2019s action after the change it makes. The page records what the kit cannot draw: it has no modal that takes a navigation pane or a width. Resolves #509.', ['Shell']],
    ],
  },
  {
    v: '0.80.0', date: '2026-10-04',
    changes: [
      ['added', 'The drawer guideline now explains when a drawer fits and when a page does, with a rendered pair that edits one member\u2019s access on a page and in a drawer. A drawer holds one short change: a quick edit, a new key, a filter, a peek at a row\u2019s detail. A long form, several steps, a view with its own address and Back, or work across more than one group belongs on a page, though a drawer may still show groups a reader only reads. Resolves #492.', ['Drawer']],
      ['changed', 'The component-choice guideline sends a long form to a page rather than a drawer, which is what the drawer guideline says. A short form still takes a content-sized modal or a drawer. See #492.'],
    ],
  },
  {
    v: '0.79.0', date: '2026-10-04',
    changes: [
      ['added', 'React DatePicker picks one month, a range of months, one date, or a range of dates, from the dropdown\u2019s own trigger and panel. The grain and the span are separate questions, so a day range takes the same two presses the month range does and carries the same bounds, blocked periods and shortcuts. It takes min and max bounds, blocked periods, and consumer presets in range mode. Every signal in the panel reads without a key beside it, and nothing is drawn under the grid: the twelve month names are drawn at one length, the period you are in now wears a ring and says \u201cthis month\u201d or \u201ctoday\u201d in its own name, and a blocked cell\u2019s label is struck through. The trigger shows the value and no field name in front of it; ariaLabel names the control where the screen around it does not. Bounds and blocked periods written in the other grain are converted rather than dropped, and a preset is clamped to the bounds or switched off. The grid has one tab stop: arrows and the Page keys move it and turn the page, and Home and End go to the ends of the row without leaving the month. Every cell says whether it is the pick. A blocked cell goes bare whatever else it is, so a period the host blocks never wears the accent fill or the range tint under disabled ink. A cell under the pointer takes the kit\u2019s neutral row hover, so the accent stays on the pick and the span; a cell that cannot be pressed and the pick itself draw no edge at all. A blocked period between the two ends of a range stays in the value the host is handed and says so in its name; only its tint is withheld. Below 560px the panel is a bottom drawer, with the kit\u2019s scrim, close control and focus trap, and the grid, the two page steps and the shortcuts all reach the 44px tap floor; pass sheet to force the drawer at any width. The shortcut row scrolls across there, and when the bounds switch every shortcut off it is the row itself the keyboard reaches: it answers with the kit\u2019s band drawn inward, not the browser\u2019s outline. See #531. Part of #429; resolves #506.', ['DatePicker']],
    ],
  },
  {
    v: '0.78.0', date: '2026-10-04',
    changes: [
      ['added', 'React FileDrop is the compact drop: at rest one row with the Upload button and the accepted types beside it, and a drop target painted only while a file is over the region it covers. Your application owns the upload and supplies the file it is holding; a file given with no status is uploading, so the kit never reports a success you have not claimed. A file in hand reads as a stack rather than a line: the name on top with the actions at its end, the size — or the failure message — under it, and the progress track the full width below. No tier takes a second line; the name truncates its stem and keeps its extension, and nothing is hidden or moved at any width. Where you give a progress value the track is the status, so the row spends no word on it and the word travels as the track’s accessible name. Closes #507.'],
      ['added', 'Guidelines / File drop sets seven rules for receiving a file: spend one row at rest, paint the target only while a file is over it, keep the file in the row it arrived in, fail in place, offer a button rather than only a drag, state the limits once, and choose between a row, a region and a dialog. Closes #507.'],
    ],
  },
  {
    v: '0.77.0', date: '2026-10-04',
    changes: [
      ['fixed', 'Every box the kit scrolls now answers the keyboard with a focus indicator of the kit\u2019s own instead of the browser\u2019s outline. A card around a table, a scrolling table wrapper, a dropdown\u2019s search list, a drawer\u2019s body, a confirm\u2019s consequence, the command palette\u2019s list and the React modal\u2019s body took that outline \u2014 black in both themes and blind to the accent \u2014 because a browser makes an overflowing box a keyboard stop with no `tabindex` and no author rule. The underline tab strip and the application rail stay as they are, and now say why: each holds its own tabbable rows, so the browser gives the scrolling box no stop of its own. Nothing is drawn differently until a box takes focus. Closes #531.', ['Card', 'Table', 'Dropdown', 'Drawer', 'Confirm', 'CommandPalette', 'Modal', 'Shell']],
      ['added', '`--ring-scroll` is what a scroll region inside a surface draws: the shared ring\u2019s own 1px gap and 2px band, drawn inward, without the halo. `--ring` is built for a 32px control, where that halo is a glint; around a 400px scroll region it spreads 14px past the band and lights the surface rather than the box that scrolls. Take it with `--ring-scroll-offset`, which is what draws it inward \u2014 the band paints outside the box without it. Tune it where you tune `--ring`: it is the same width, ink and gap width. A box that is itself the outermost surface, such as a floating panel, keeps `--ring`. See #531.'],
      ['changed', 'A confirm\u2019s consequence carries `--space-1` of padding, so its focus band clears the glyphs the way a scrolling table\u2019s does. The text moves 4px; nothing else does.', ['Confirm']],
      ['changed', 'A scrolling table wrapper draws the inward band instead of the full ring, with the six scroll regions beside it. It is a scroll region inside a card like the rest, and was the one left spending a halo across the card around it.', ['Table']],
    ],
  },
  {
    v: '0.76.1', date: '2026-10-04',
    changes: [
      ['fixed', 'In the dark theme a disabled field and a disabled button draw a fainter edge than a live one, so the box reports the state and not only the words. `--disabled-border` resolved to the same hairline as `--field-edge` and `--control-edge`, leaving an unavailable field identical to an available one; it now drops a rung, to `--surface-3`. Light already drew the two states apart and is unchanged. If your CSS reads `--disabled-border`, expect the new value in dark. Fixes #564.', ['Inputs', 'Button']],
      ['fixed', 'A disabled select is no longer faded by the browser on top of the kit\'s own disabled paint. Chromium applies `select:disabled { opacity: 0.7 }`, which took the edge and the words down together — 1.11:1 edge and 3.78:1 words in dark, 3.15:1 words in light — so the kit now resets `opacity` on a disabled field and a select reads what the text field beside it reads: 1.16:1 edge and 6.24:1 words in dark, 1.24:1 and 6.11:1 in light. If your CSS fades a disabled select deliberately, declare that fade yourself.', ['Inputs', 'Pagination']],
    ],
  },
  {
    v: '0.76.0', date: '2026-10-04',
    changes: [
      ['added', 'Table footers are a supported surface: totals open with the strong rule, each footer label sits against the figure it names, and a label marked strong carries the weight across the whole row. Footer labels take the body cell padding in every density. If your CSS left-aligned tfoot labels itself, that override is no longer needed. See #385.', ['Table']],
      ['fixed', 'A final body row keeps its separator when a footer follows it; previously the last row of every row group lost its rule. Numeric table headers hold one line, so a two-word header such as Amount (EUR) no longer wraps beside a wide identity column.', ['Table']],
      ['fixed', 'The theme toggle shows the kit focus ring on keyboard focus instead of the browser\u2019s own outline, in the vanilla topbar, React ThemeToggle and the React shell alike. See #385.', ['ThemeToggle']],
      ['added', 'A document review showcase walks one invoice through review, confirmation and the recorded result, and shows the preview loading, unavailable and refused-approval states. The review step leads with the extracted fields, in the wider column, and keeps the document a quieter preview beside them. See #385.'],
      ['added', 'Density and accents gains a rule: emphasis follows consequence. Where a source sits beside the values a screen will save, the saved values take the leading position, the wider column, the heavier weight and whatever accent the pair carries, and a quieter block is made smaller, later or uncoloured rather than faded. The accent goes on the pane\u2019s own name as ink, never as a border around it. See #385.'],
      ['added', 'React Card merges a caller `className` with the kit class instead of ignoring it, so a page can mark one card without hand-writing `ui-card` beside its own. Part of #385.', ['Card']],
      ['changed', 'The packaged README is about half its old length and reads as plain English. It keeps what a consumer needs — what the kit is, install, the entry points, a vanilla and a React example, the fonts, theme and accent, and where the guidelines live — and sends the rest to the docs pages that already held it. Nothing about the package itself changed. See #385.'],
    ],
  },
  {
    v: '0.75.2', date: '2026-10-02',
    changes: [
      ['fixed', 'A pager’s page-size control keeps its compact width, padding, type size, radius and chevron offset in a React app. `apliteni-ui/react/css` carried a copy of the kit’s form-control CSS, and in a document that loads `apliteni-ui/css` first that copy landed later and won, leaving the control a full-size form field in a row of small buttons. Fixes #551.', ['Pagination']],
      ['changed', '`apliteni-ui/react/css` no longer repeats the kit’s form-control CSS. Import both stylesheets, kit first, as the README has always shown: the React one adds what React’s own components need and cannot stand in for the kit’s. The tooltip panel, the reduced-motion net and the tap-target net still travel with it, because a second copy of each decides nothing the kit had already decided.'],
    ],
  },
  {
    v: '0.75.1', date: '2026-10-02',
    changes: [
      ['fixed', 'A disabled select draws one chevron again, on its right edge, in both themes. The disabled paint was written as the `background` shorthand, which also reset the `background-image`, `-repeat` and `-position` the select draws that chevron with: in light it tiled across the whole field, and in dark it disappeared. The pager’s size control, off while a page loads, showed both. See #511.', ['Inputs']],
    ],
  },
  {
    v: '0.75.0', date: '2026-10-02',
    changes: [
      ['fixed', 'An inline `.ui-code` chip now paints whichever reading surface its container is not on, so an identifier keeps its chip inside a card, a panel, a drawer, a toast, a table cell and a callout. It painted `--surface`, which is the card, so in all of those it had no chip at all in either theme. Nothing about it changes on the page, and it takes no border and no hairline. Fixes #537.', ['Typography']],
      ['added', '`--code-bg` names the reading surface an inline code chip paints. A consumer painting a reading surface of its own hands it the other one; `--table-code-bg` and `--wash-code-bg` are the pairs for a table and for a translucent wash, which need one because they swap sides between the themes. See #537.'],
    ],
  },
  {
    v: '0.74.0', date: '2026-10-02',
    changes: [
      ['changed', 'The status-label guideline no longer asks a status badge for a glyph or a dot: its word and its tone fill are enough. Callouts and toasts keep their glyph. Part of #453.'],
      ['changed', 'The Accessibility minimums page now draws the focus ring, the disabled pair, the status badge and the measurable ground as do/don\u2019t specimens instead of describing them, and its prose is a line or two per point. Guideline pages are written that way from now on: show the rule, say the least you can, and keep measurements in the specification. Every rule the Text length page states now gives its reason too. Part of #453.'],
      ['fixed', 'A focus ring drawn inside a Storybook specimen stage reads its gap from that stage instead of the page behind it, so the documented ring is the one the kit paints. Specimen stages are documentation, not shipped CSS; nothing a consumer renders changes. Part of #453.'],
    ],
  },
  {
    v: '0.73.0', date: '2026-10-02',
    changes: [
      ['fixed', 'Snippet copy controls and keyboard-focused code use the shared focus ring in vanilla and React, including the reveal variant.'],
      ['added', 'React Snippet accepts highlighted token children and can omit its copy button with copy={false}. Copying still uses the original code string. The new codeTokens(raw, lang) helper returns the same tokens the vanilla highlighters use, so displayed tokens and copied text come from one source. Part of #429.'],
      ['added', 'Syntax highlighting covers JSON and TypeScript as well as shell. hlCode(raw, lang) returns the HTML and codeLanguages lists what lang accepts; hlShell is unchanged. Keys, strings and scalars take different token colours, and the snippet stories show one specimen per language.', ['Snippet']],
      ['changed', 'The Snippet copy button is icon-only. copyLabel is now its accessible name and its tooltip rather than visible text, so pass something that names what is copied — it defaults to \u201cCopy code\u201d. Confirming a copy swaps the glyph inside the same 24px box and announces the word through a live region beside the button, so the bar no longer jumps and the confirmation reaches a screen reader. A vanilla button restored after copying keeps its glyph, which the old restore dropped.', ['Snippet']],
    ],
  },
  {
    v: '0.72.0', date: '2026-10-02',
    changes: [
      ['added', 'Below the phone step a coarse pointer gets a transparent 44px tap zone outside each small control, so a finger reaches the floor and no control is drawn any bigger. `--tap-min` names the floor. Closes #488.', ['Button', 'Segmented', 'Tabs', 'Dropdown', 'Pagination']],
      ['changed', 'Below the phone step, to a coarse pointer, the kit\u2019s rows of small controls open to `--tap-gap` (20px) so two zones fit between their drawn edges \u2014 the filter row, a table\u2019s row actions, the confirm, drawer, toolbar, empty-state and success action rows, a segmented strip, a pager, a tabs strip and the footer\u2019s social marks. A row that is already full opens downward only, because widening it across would make the controls narrower. The controls keep their drawn size; the space between them grows a few pixels on a phone.', ['Segmented', 'Tabs', 'Pagination', 'Table', 'Toast', 'Confirm', 'Drawer']],
      ['added', 'A zone grows only where a container has opened the room for it: `--tap-clear-x` and `--tap-clear-y` default to zero, and a container that opens declares what it gives. A row that cannot open \u2014 a chip whose value and remove mark share an edge, a dense table\u2019s rows \u2014 declares its real clearance instead.'],
      ['added', '`--tap-min` (44px) is the target the zone reaches for and `--tap-aa` (24px) the WCAG 2.5.8 target the kit holds at every width. The two layers the kit already drew are floored at the second, so a clamp can only ever grow them.'],
      ['added', 'Two Accessibility minimums rules: the tap zone, and the space two neighbouring small controls need before either can reach the floor.'],
    ],
  },
  {
    v: '0.71.0', date: '2026-10-02',
    changes: [
      ['breaking', 'In the light theme a card, the shell\'s rail and every floating surface no longer draw the neutral hairline. Each casts a soft, diffuse drop instead — `--elev-rest`, `--elev-rail` and a widened `--elev-drop`. Dark is unchanged. A consumer whose light-theme screens relied on the card or rail edge sees a different kit. Closes #490.', ['Card', 'Shell', 'Dropdown', 'Drawer', 'Modal', 'Toast']],
      ['added', 'Four level tokens name which edge each level draws — `--card-edge`, `--rail-edge`, `--float-edge`, `--float-edge-inner` — so a sheet never has to ask which theme it is in. Light resolves all four to `transparent`.'],
      ['changed', 'A line that divides two regions of one surface stays a line in both themes: a card\'s rows, a table\'s rules, the rail\'s head band, the topbar. Fields keep their edge, and a tinted card keeps its own coloured one.'],
      ['fixed', 'The signed-out auth card, the success panel and the feedback composer paint the floating step but never took the floating treatment, so they were the only flat surfaces left on it. All three now carry the two-step edge in dark and the drop in light, like every other floating surface.', ['Shell', 'Success', 'Feedback']],
    ],
  },
  {
    v: '0.70.0', date: '2026-10-02',
    changes: [
      ['fixed', "Keyboard focus draws the kit's ring on the controls that showed the browser's own outline instead: both brand lockups, the theme toggle, the deck and version switchers and the version menu's rows, the account avatar and its menu rows, snippet copy, footer links and social marks, the interactive card, a toast's action and close, the feedback composer's buttons, and the React table's row-selection checkbox. The version menu's rows are reached with the arrow keys rather than Tab, which is why they were missed until last. Each one keeps a transparent outline, so forced-colours mode still shows a system ring. If your own CSS sets focus on any of these, check that it still outranks the kit's rule. Resolves #482.", ['Topbar', 'Footer', 'Snippet', 'Callout', 'Card', 'Table', 'Feedback']],
      ['fixed', 'A dropdown panel that scrolls now draws the ring when it takes keyboard focus. A browser makes a scroll container a focus stop of its own, so the panel showed the browser\u2019s outline \u2014 black in light mode. The focus rule repeats the panel\u2019s edge and drop beside the ring, because a box-shadow list replaces the whole list; a consumer who overrode the panel\u2019s box-shadow should do the same. Other scrolling boxes in the kit still have no ring and are listed on #531.', ['Dropdown']],
    ],
  },
  {
    v: '0.69.0', date: '2026-10-02',
    changes: [
      ['added', 'React SearchField renders the kit\u2019s search input group for a toolbar: a search glyph, a native search input and an accessible name instead of a visible label, so the row keeps the height of the unlabelled controls beside it. It forwards its ref and the native input props and adds no CSS of its own. There is no clear button, the field the kit already draws. See #517.'],
      ['changed', 'The Empty states showcase draws its filtered list\u2019s search box with the kit\u2019s standalone search field, the part React\u2019s SearchField renders, so the box has a name and the search glyph. A new showcase toolbar puts search, then filters, then the view switch in one row. See #517.'],
      ['changed', 'A toolbar\u2019s text field takes the whole line at 560px and below, instead of holding its 6rem basis while narrow controls share the line and cut its placeholder off. Wider rows are unchanged. See #517.'],
    ],
  },
  {
    v: '0.68.0', date: '2026-10-02',
    changes: [
      ['changed', 'A FilterBar chip shows the chosen value by itself instead of printing the field\u2019s name beside it, so a bar of chips reads as the values in force. A chip with nothing chosen shows the field it filters, in placeholder ink, and is named \u201cSector: any\u201d; a chip with a value is named \u201cSector: Technology\u201d. Beside a value the field is no longer drawn: it reaches a reader through that name and the chip\u2019s legend. Keep a filter\u2019s value display text \u2014 it is now the whole visible chip. Vanilla and React. Resolves #535.', ['FilterBar']],
      ['added', 'filterChipText, filterChipName and filterChipUnset are exported from the entry: the one place that decides what a chip prints, what it is called and whether it counts as unset. Pass a filter; take the line, the name or the state. Part of #535.', ['FilterBar']],
    ],
  },
  {
    v: '0.67.0', date: '2026-10-02',
    changes: [
      ['fixed', 'A filter bar no longer widens the page on a phone. Each chip’s dropdown panel now takes the width of the chip it drops from instead of a 240px minimum, so it stays inside the row at any viewport; a filter whose options are longer than its chip wraps them over more rows, breaking mid-token when a value has no break opportunity in it, such as a campaign key or a URL. Vanilla and React share the rule. Resolves #467.', ['FilterBar']],
    ],
  },
  {
    v: '0.66.0', date: '2026-10-02',
    changes: [
      ['fixed', 'A link inside a table cell shows the kit focus ring on keyboard focus instead of the browser’s own outline. A plain cell link is an inline-block box at the kit corner, so a title-cell link that wraps paints one ring rather than one per line, and the struck name of a revoked row still reaches a link inside it, hovered or not. An anchor the kit already styles — a button, an identity, a dropdown row, a nav item or a crumb composed into a cell — keeps its own box and corner. The rules are in the shared stylesheet, so the React `DataTable` takes them with the vanilla table; the React DataTable and Loading stories now carry a cell link that shows it. Resolves #510.', ['Table']],
    ],
  },
  {
    v: '0.65.0', date: '2026-10-01',
    changes: [
      ['added', 'React Success, SuccessPanel and SuccessCheck provide the confirmation layouts and the check mark. Page confirmations accept React actions and a cancelable countdown callback; the caller owns navigation. Part of #429.'],
      ['changed', 'Success confirmations now sit on a plain elevated card. The blurred aurora blobs and the ambient green glow behind them are gone, and with them the `backdrop` option — vanilla callers passing it are unaffected, since the value is now ignored. This is in the shared stylesheet, so it reaches vanilla and React alike.', ['Success']],
      ['changed', 'Success confirmations carry one title and at most one short line. The `eyebrow` option is gone from `success()` and the `eyebrow` prop from React `Success`; vanilla callers passing it are unaffected, since the key is now ignored, and React `Success` is unreleased. Put the outcome in the title rather than in a label above it. Part of #429.', ['Success']],
      ['changed', 'The check mark is now an unmodified Lucide path in the success colour, with no filled disc or burst ring behind it. `check: \'line\'` (the default) is the bare check; `check: \'circled\'` is the smaller circled mark, at 20px, which is what Guidelines / Iconography asks a reported state to use. `success()`, `successPanel()` and both React components take `check`; `successCheck()` takes the same choice as its first argument. The circled mark is 20px wherever it is drawn, the inline panel included, while the line mark keeps the size of the layout it lands in.', ['Success']],
    ],
  },
  {
    v: '0.64.0', date: '2026-10-01',
    changes: [
      ['added', 'React Button accepts href for links and leading for caller-supplied artwork before the label. Disabled and busy links block activation while retaining the existing button styles. Part of #429.', ['Button']],
      ['changed', 'React Button now merges a caller `className` with the kit classes instead of replacing them. Its own `aria-disabled`, `aria-busy` and `data-btn-*` attributes win over spread props, so a busy or disabled control cannot be made to read as idle.', ['Button']],
    ],
  },
  {
    v: '0.63.0', date: '2026-10-01',
    changes: [
      ['added', 'React Checkbox supports checkboxes and grouped radios, and Switch renders a native checkbox with the existing switch track. Both accept native input props and refs, including controlled state and disabled inputs. Switch takes className on its visible label and names an empty label "Toggle". Part of #429.'],
      ['fixed', 'A disabled checkbox or radio now paints as unavailable instead of rendering identically to a live one, and hovering it no longer lights its border with the accent. The vanilla checkbox() factory takes disabled. Part of #429.'],
    ],
  },
  {
    v: '0.62.0', date: '2026-10-01',
    changes: [
      ['added', 'React SidebarNav supports sections, one level of nested disclosure, counts, disabled and danger rows, collapsed presentation, artwork and footer slots, and router links. AppShell uses it in the desktop rail and More drawer with the existing sidebar styling, and a page under a back link keeps its section active in both navs. Part of #429.'],
      ['changed', 'The rail\u2019s collapse control draws Lucide panel-left-close while the rail is open and panel-left-open while it is folded, so the mark says what the press will do; the seam no longer travels. A folded rail marks the current row with one plate on the glyph column, in place of the accent bar and the hairline that a rail one glyph wide cut off. An open rail keeps the accent bar on its own: the current row\u2019s glyph and its counter take body ink. Vanilla and React share all three. Part of #429.', ['AppShell', 'SidebarNav']],
    ],
  },
  {
    v: '0.61.2', date: '2026-10-01',
    changes: [
      ['changed', 'Nothing the kit renders changes. The application rail’s step off the page — 1.186:1 in dark, 1.110:1 in light, the same under all four accents — is now held to those measured numbers instead of the loose floor that let the barely-visible 0.53.3 rail through. The only published byte is a comment in `layout.css` citing a line that moved. See #454.', ['Shell']],
    ],
  },
  {
    v: '0.61.1', date: '2026-09-30',
    changes: [
      ['fixed', 'Iconography guidance allows the shell’s theme toggle, sidebar toggle and collapsed-rail links to drop their visible labels. Resolves #460.'],
    ],
  },
  {
    v: '0.61.0', date: '2026-09-30',
    changes: [
      ['added', 'React TextField supports password and search, takes a decorative glyph by name in `icon`, and forwards its ref to the input. Field exposes the existing label, hint and error frame for composed controls. Part of #429.'],
      ['fixed', 'A search field with a value no longer shows the browser’s own clear button next to the kit glyph. This is in the shared stylesheet, so it reaches vanilla too; no existing vanilla surface pairs `.ui-input` with `type="search"`, so nothing there changes.', ['Input']],
    ],
  },
  {
    v: '0.60.0', date: '2026-09-29',
    changes: [
      ['added', 'React Pill and StatusDot use the existing metadata pill and live dot styling. Dots are decorative by default and accept accessible labels. Part of #429.'],
    ],
  },
  {
    v: '0.59.0', date: '2026-09-29',
    changes: [
      ['added', 'The main entry now ships TypeScript declarations and shared numeric and delta formatting helpers. Existing vanilla factories remain available. Part of #429.'],
      ['changed', 'React FilterBar now uses React Dropdown and table values render native JSX while retaining their classes and controlled behavior.', ['FilterBar', 'Table']],
    ],
  },
  {
    v: '0.58.2', date: '2026-09-29',
    changes: [
      ['fixed', 'Dropdown state and neutral badges use soft fills with similar visibility in both themes and match the standard badge size, without outlines. Selected titles use body ink, leaving the checkmark to indicate selection; non-status badges such as Beta use neutral ink. Vanilla and React share the styling. Resolves #445.'],
    ],
  },
  {
    v: '0.58.1', date: '2026-09-29',
    changes: [
      ['fixed', 'React KeyValueList uses its container’s spacing in modals and other layouts. Lists inside drawers keep their existing spacing. If your custom CSS targets ui-drawer__rows on React KeyValueList, change that selector to ui-kv; vanilla drawer lists still use ui-drawer__rows. See #449.'],
    ],
  },
  {
    v: '0.58.0', date: '2026-09-29',
    changes: [
      ['fixed', 'Segmented controls accept full accessible labels, wrap long pill strips, and keep their content width in grid layouts. Spacing follows the token scale and control transitions use 150ms; underline tabs continue to scroll. See #392 and #435.'],
      ['added', 'React tables offer column navigation when they overflow, and tables inside cards share the card surface.'],
      ['fixed', 'Dense tables inside a card scroll wrapper align their first column with the card title. Zero deltas with currency or other unit suffixes stay neutral.'],
      ['fixed', 'React StatBand accepts a tooltip on each delta and can reference a shared comparison description through basisId.'],
      ['added', 'A period-selection showcase with six months, loading states, labelled status marks, and signed cashflow comparisons.'],
    ],
  },
  {
    v: '0.57.0', date: '2026-09-29',
    changes: [
      ['added', "React Tooltip adds short explanations on hover, keyboard focus, or touch, using the existing tooltip styling. Resolves #398."],
    ],
  },
  {
    v: '0.56.1', date: '2026-09-29',
    changes: [
      ['fixed', 'React fields retain their hint beside validation errors. Buttons accept a completionMessage override so a failed send does not announce completion. See #388.'],
      ['fixed', 'React toast stacks publish their occupied height so floating feedback controls can stay above every notice. Modal titles are headings.'],
      ['changed', 'The feedback showcase uses the shared field surface and a neutral callout for failed sends.'],
    ],
  },
  {
    v: '0.56.0', date: '2026-09-29',
    changes: [
      ['added', 'React Timeline now supports person, rule, and reversal kinds, plus relative timestamps for the newest event. Only the newest marker is filled, while older reversals keep danger ink; new events use kit motion and respect reduced-motion settings. Resolves #425.'],
      ['fixed', 'Timeline examples now use the shared card reading surface instead of the grey canvas. The privileged example reverses its batch directly with Undo.'],
    ],
  },
  {
    v: '0.55.0', date: '2026-09-29',
    changes: [
      ['changed', 'Modal now uses a borderless dialog with a deeper backdrop, a compact header, and a scrolling body so the title and actions stay reachable on short screens. Modal and Drawer actions share the panel surface without a divider. Resolves #448.'],
      ['changed', 'Component guidance allows content-sized modals for short forms and drawers for long forms.'],
    ],
  },
  {
    v: '0.54.0', date: '2026-09-29',
    changes: [
      ['changed', "The light theme re-picks its surface colours: the card is now white (`--surface` #ffffff), the page is lighter and less blue (`--bg` #f2f3f6), the sunken step lifts off the border (`--surface-2` #e9ecf3) and the quiet fill takes the page's old colour (`--surface-3` #eef0f5). A card reads 1.11:1 against the page where it read 1.083:1, and every light ink gained contrast. A light floating panel is no longer the only white surface: a card shares it, and the panel is separated by its two-step edge and its drop, which now measure 1.52 and 1.44. Dark is unchanged. Consumers who hard-coded any of the four light values should read them from the tokens instead. See #455."],
      ['changed', 'Text controls, neutral badges, code blocks and navigation use reading surfaces in both themes instead of grey fills. Inputs are drawn by their edges; disabled labels keep their disabled ink. The Soon badge uses accent ink on the card surface. See #455.'],
      ['changed', "`.ui-card` pads `var(--space-6)` on every side, where it padded `var(--space-6) 26px`, and `.ui-card--pad-sm` pads `var(--space-5) var(--space-6)`. A padding modifier now moves the vertical rhythm only, so cards of different padding line their text up in one column. Card content shifts 2px, and a stat tile's shifts 4px."],
      ['changed', "A tinted card stays above the page. `--card-tint` sets the strength per theme — 9% in dark, 5% in light, where the shared 9% put a light `.ui-card--accent` 1.043:1 below the page. `.ui-card--live` takes a green hairline, where it kept the neutral one."],
      ['changed', "A link inside `.ui-table` takes the row's ink and underlines on hover, instead of the accent. `.ui-btn` and `.ui-identity` inside a table are unaffected. A ledger whose identifier column is a link no longer reads as a column of accent-coloured values."],
      ['fixed', "`.ui-seg` no longer stretches inside a flex or grid parent; `--block` and `--underline` still take the full width. A `dense` or `zebra` table inside a card starts its first column on the card's own text edge."],
    ],
  },
  {
    v: '0.53.4', date: '2026-09-29',
    changes: [
      ['fixed', 'Dense table headers align with their column values. Compact tables also keep the final numeric header aligned with its values. Resolves #452.'],
    ],
  },
  {
    v: '0.53.3', date: '2026-09-28',
    changes: [
      ['fixed', 'Toasts use a compact neutral card with an unfilled tone icon in vanilla and React. Existing actions, dismissal and timers are unchanged. Resolves #426.'],
    ],
  },
  {
    v: '0.53.2', date: '2026-09-28',
    changes: [
      ['added', 'Empty-state guidelines explain how to name missing content and offer an action using the kit. See #430.'],
    ],
  },
  {
    v: '0.53.1', date: '2026-09-28',
    changes: [
      ['added', 'Density and accent guidelines now show paired examples of narrow stat bands, payout previews and primary actions. See #400.'],
    ],
  },
  {
    v: '0.53.0', date: '2026-09-28',
    changes: [
      ['deprecated', 'Vanilla HTML factories, initializers, and the vanilla overlay are scheduled for removal in the next release (#429); this release changes no runtime behavior. React and shared logic, all CSS and tokens, inline strings, motion helpers, guidelines, esc, icon and its name tables, sun, moon, prism, seedling, brand, and illo stay supported.'],
    ],
  },
  {
    v: '0.52.0', date: '2026-09-27',
    changes: [
      ['fixed', 'Theme toggle icons use the control text color for clearer contrast in React and vanilla.'],
      ['added', 'React ThemeToggle cycles through dark, light and auto, saves the choice, and follows the operating system in auto mode. Resolves #395.'],
    ],
  },
  {
    v: '0.51.0', date: '2026-09-27',
    changes: [
      ['added', 'React now includes EmptyState with the vanilla layout, four text presets, and illustration and action slots. Resolves #386.'],
    ],
  },
  {
    v: '0.50.0', date: '2026-09-26',
    changes: [
      ['added', 'React AppShell adds router links to the kit’s rail and top band, with saved folding and a phone navigation sheet. Closes #381.'],
    ],
  },
  {
    v: '0.49.2', date: '2026-09-26',
    changes: [
      ['added', 'The text length guideline explains where UI copy should stay short, when explanations help, and how to remove filler. Closes #399.'],
    ],
  },
  {
    v: '0.49.1', date: '2026-09-26',
    changes: [
      ['changed', 'Contributor rules now require general, composable components reused across products. Domain-specific UI belongs in a Storybook showcase built from existing components. See #424.'],
    ],
  },
  {
    v: '0.49.0', date: '2026-09-26',
    changes: [
      ['added', 'React now includes Callout with four status tones, a neutral default, an icon override, and optional actions. Vanilla callouts now support the same actions and tone glyphs. Resolves #382.', ['Callout']],
    ],
  },
  {
    v: '0.48.0', date: '2026-09-26',
    changes: [
      ['added', 'React now includes Toast and useToast for notifications in the kit’s five tones. Notices close after five seconds, while notices with an action remain until selected or dismissed. Closes #397.'],
    ],
  },
  {
    v: '0.47.0', date: '2026-09-26',
    changes: [
      ['added', 'Added TextField, TextArea, SelectField, and FileField to React. Labels and help or error messages are linked automatically. Files can be picked or dropped. Resolves #389.'],
    ],
  },
  {
    v: '0.46.0', date: '2026-09-26',
    changes: [
      ['added', 'React now includes Timeline for ordered record histories, with timestamps, metadata and optional undo buttons. The app handles confirmation and batch reversal. Closes #396.', ['Timeline']],
    ],
  },
  {
    v: '0.45.0', date: '2026-09-26',
    changes: [
      ['added', 'Added React Confirm, which asks users to approve actions that have a cost. It supports plain and danger actions, safe dismissal, and a busy button that prevents repeated presses. Closes #383.', ['React Confirm']],
    ],
  },
  {
    v: '0.44.0', date: '2026-09-26',
    changes: [
      ['added', 'React now includes Tabs with controlled selection, optional counts, and keyboard navigation. It uses the existing underline tab styles. This resolves #394.'],
    ],
  },
  {
    v: "0.43.1", date: "2026-09-25",
    changes: [
      ["changed", "Contributor setup and component steps now live in README, with short agent rules and plain release notes. The long contributor guide was removed; runtime behavior is unchanged. Closes #402."],
    ],
  },
  {
    v: '0.43.0', date: '2026-09-25',
    changes: [
      ['added', 'React now includes Snippet for copying commands and one-time secrets. It uses the kit’s plain and reveal styles and announces the copy result. Reveal text uses the existing success ink to meet contrast requirements in light mode. Resolves #393.', ['Snippet']],
    ],
  },
  {
    v: '0.42.0', date: '2026-09-25',
    changes: [
      ['added', 'React now includes KeyValueList and DrawerSection for displaying a record’s details. Lists support two columns, React values, em dashes for missing values, and redacted markers. They stack into one column on narrow screens. Resolves #391.'],
    ],
  },
  {
    v: "0.41.5", date: "2026-09-25",
    changes: [
      ["fixed", "Vanilla factories now keep quoted values inside attributes. Text and enum attributes are escaped, while trusted HTML slots keep their existing behavior. Links and image sources reject javascript:, data: and vbscript: URLs; rejected links use #, rejected image sources are empty, and backLink renders nothing. This includes data: image URLs. Part of #376."],
    ],
  },
  {
    v: "0.41.4", date: "2026-09-25",
    changes: [
      ["fixed", "The React documentation now describes the shared dialog stack. Escape closes only the top React dialog and leaves the palette beneath it open; React and vanilla overlays still use separate stacks. Found in #367."],
    ],
  },
  {
    v: "0.41.3", date: "2026-09-25",
    changes: [
      ["changed", "Guideline examples now name concrete choices. Vague wording and two repeated passages were removed while keeping every rule and exception. Resolves #365."],
    ],
  },
  {
    v: "0.41.2", date: "2026-09-25",
    changes: [
      ["fixed", "Publishing an older release no longer moves npm’s latest tag backwards. The release workflow compares versions and publishes older releases under a separate tag. Resolves #370."],
    ],
  },
  {
    v: "0.41.1", date: "2026-09-24",
    changes: [
      ["changed", "Storybook’s Apps section is now called Showcases. Existing story links still work, and the README and contributor documentation use the new name. Requested in #366."],
    ],
  },
  {
    v: "0.41.0", date: "2026-09-24",
    changes: [
      ["changed", "Busy buttons keep each variant’s resting fill, border and ink while replacing the label with larger, brighter dots. Dots scale with the button size and remain readable in both themes. Resolves #327.", ["Button"]],
    ],
  },
  {
    v: "0.40.1", date: "2026-09-24",
    changes: [
      ["added", "The guidelines now recommend giving the committing action more weight than the dismissing action. Examples compare primary Save beside ghost Cancel with two primary buttons. Closes #350."],
    ],
  },
  {
    v: "0.40.0", date: "2026-09-24",
    changes: [
      ["changed", "The DataTable sort chevron now rotates between ascending and descending in 150 ms with the kit's ease-out; rows still reorder instantly. There is no motion under reduced motion. Chosen in #363 because row animation stuttered above about 100 rendered rows."],
    ],
  },
  {
    v: "0.39.1", date: "2026-09-24",
    changes: [
      ["fixed", "DataTable sort indicators are now SVG chevrons instead of text arrow characters, which iOS showed as colour emoji. The sorted column shows one chevron in the sort direction; other sortable columns show a neutral pair. Screen readers still get the state from aria-sort. Found in the design-review trial, #361."],
    ],
  },
  {
    v: "0.39.0", date: "2026-09-24",
    changes: [
      ["changed", "Guideline pages now use short, plain-English rules with a one-sentence reason, clear Do and Don’t examples, and body ink instead of muted text. Source-file references moved to test coverage, and the empty-state copy rule was removed. Closes #335, #329, #330 and #328."],
    ],
  },
  {
    v: "0.38.0", date: "2026-09-24",
    changes: [
      ["added", "Dense financial tables now have value, signed-change and company-identity renderers in vanilla and React. Units use smaller body ink, and callers choose the meaning of change colours. A new compact density uses 33px minimum rows without shrinking the type. Chosen in #344.", ["Table"]],
      ["added", "Tables can keep their header and company column visible while scrolling. Narrow company cells show the symbol and retain the full accessible name. FilterBar supports controlled selection, removal, clear-all and disabled or busy states with focus recovery. Segmented has an underline appearance and shared keyboard behavior in vanilla and React.", ["Table"]],
      ["changed", "Tables use white backgrounds in light mode and the base canvas in dark mode. Zebra no longer adds grey stripes, and hover marks the row edge instead of tinting the surface. This follows the table-surface decision in #344.", ["Table"]],
      ["added", "Dense-table guidelines and a fictional stock screener demonstrate 15 columns, both densities, scrolling and loading, empty and refresh-error states.", ["Table"]],
    ],
  },
  {
    v: "0.37.1", date: "2026-09-24",
    changes: [
      ["changed", "Block confirmations use the glowing green check from the full-page confirmation. The shared mark keeps its draw-in animation and reduced-motion treatment at the block’s existing size, as requested in #331."],
    ],
  },
  {
    v: "0.37.0", date: "2026-09-23",
    changes: [
      ["changed", "Focus now uses a separated solid band with a soft glow. The 1px surface-coloured gap keeps the 2px accent band distinct from filled controls. The glow is decorative, as chosen in #343."],
      ["added", "Focus-ring width, colour and gap can now be tuned independently. The composed `--ring` remains available."],
      ["changed", "Ancestor ring overrides now stop at painted kit containers. Apply a custom `--ring` to the container as well. The app shell keeps root overrides because it adds no new surface."],
      ["fixed", "Focus remains visible in forced-colors mode. Ring consumers keep a real outline when the browser suppresses box shadows. Solid toasts use their contrast ink for the band."],
      ["fixed", "Inputs, textareas and selects now use native focus-visible like the other controls. Text-entry fields can still show focus after a mouse click, according to browser heuristics. Invalid fields retain the shared indicator."],
    ],
  },
  {
    v: "0.36.0", date: "2026-09-23",
    changes: [
      ["changed", "Words now use body ink at every size instead of muted or dim ink for hierarchy. Descriptions, labels, captions, table cells and enabled actions keep their sizes and spacing. Glyphs, state colours and empty-slot placeholders retain their exception ink. Generic badges use body ink, while archived and disabled states remain distinct. This was decided in #340 and #341.", ["Typography"]],
      ["changed", "Guidelines now explain why contrast alone does not justify fading words. Labels and titles show body and muted ink at three sizes, state the closed exception list, and direct extensions through an issue. Accessibility Floor and Back link agree with this rule.", ["Typography"]],
    ],
  },
  {
    v: "0.35.0", date: "2026-09-23",
    changes: [
      ["added", "Button now supports `size=\"xs\"` in vanilla and React for inline controls beside a value. Its 13px glyph uses `stroke-width 2.8` to keep the graphic stroke floor, with a 24px icon-only target and token-sized labels. All other sizes retain 16px glyphs. Chosen on #339.", ["Button"]],
    ],
  },
  {
    v: "0.34.3", date: "2026-09-23",
    changes: [
      ["fixed", "Component text now follows the `--text-*` scale when an app overrides it. Nav, callout, dropdown, drawer, feedback, shell and other component sizes keep their exact defaults. Sizes between scale steps retain a fixed offset from the nearest token. The 16px touch-field zoom protection is unchanged. Fixes #322.", ["Typography"]],
    ],
  },
  {
    v: "0.34.2", date: "2026-09-14",
    changes: [
      ["changed", "Touch and pen taps now open chart readouts; a tap on another mark moves the readout, and a second tap or a tap elsewhere closes it. The opening tap does not trigger the mark’s click action, but still closes an open dropdown; the closing tap can trigger the action. Mouse hover, keyboard focus and Escape still work, including on mixed-input devices. Chart tab stops remain undecided in #282.", ["Tooltip"]],
      ["changed", "The hover-readout guidelines now say to open with a tap and close with the next tap, rather than showing a readout only while a finger is down.", ["Tooltip"]],
    ],
  },
  {
    v: "0.34.1", date: "2026-09-14",
    changes: [
      ["changed", "The topbar search field now uses the raised `--surface` fill so it stays distinct from the band. Width, wording and the boxed key are unchanged; the key’s dark-mode edge is softer. Chosen in #318.", ["Shell"]],
      ["fixed", "The topbar search field now uses the kit’s focus ring and accent edge instead of the browser’s square outline.", ["Shell"]],
    ],
  },
  {
    v: "0.34.0", date: "2026-09-14",
    changes: [
      ["added", "`appShell({ layout: 'topbar' })` adds a band beside the rail with search and the reader’s menu; the fold control moves to the rail’s foot. The rail-only layout remains the default, and `accountShell()` passes `layout` through. This layout does not support the compatibility `topbar` bag, version switcher or theme toggle. Chosen in #308.", ["Shell"]],
      ["added", "Both shell layouts now accept `width: 'wide' | 'centered'`. `centered` remains the default capped column; `wide` fills the track beside the rail, with `maxWidth` available for either. Chosen in #308.", ["Shell"]],
      ["added", "The topbar search trigger now opens the command palette. `wireShell()` adds the platform-specific shortcut to its boxed key and accessible name. Chosen in #308.", ["Shell", "CommandPalette"]],
      ["added", "React `<Dropdown>` now supports both variants, sections, badges, separators, disabled and danger rows, controlled or uncontrolled `open`, `onSelect` and `onOpenChange`. Use `row` to render router links and `search` for the kit’s filtering and keyboard behavior. `portal` and `foot` slots are not yet supported.", ["Dropdown"]],
      ["added", "`dropdownMatch(label, query)` and `dropdownFiltering(query)` are now exported so consumers can reuse the dropdown’s matching rules.", ["Dropdown"]],
      ["added", "React `<BackLink>` now matches `backLink()` and accepts `as` for router links. It keeps `ui-back` on the link element so shell styling applies."],
      ["added", "Dropdown panels now expose `--ui-dropdown-pad` and a `foot` slot with shared header/footer spacing and a separator. The existing `footer` slot stays unwrapped; headers still use `header`. Controls require a dialog panel such as `search: true`, not a menu or listbox. Chosen in #306.", ["Dropdown"]],
      ["added", "A new caption rank uses `--text-sm` at `--weight-normal` for text below specimens, figures and screenshots. It shares the label’s 13px size at a lighter weight, and guideline captions now use it."],
      ["fixed", "Long back-link names now stay on one line and end with an ellipsis. The accessible name retains the full destination, and short names are unchanged. Chosen in #303."],
      ["fixed", "Dropdown-trigger carets are now centered in both states, within a quarter pixel of the trigger’s middle.", ["Dropdown"]],
      ["fixed", "Light-mode dropdown search fields now use `--bg` instead of `--surface-2` to reduce their contrast with the floating panel.", ["Dropdown"]],
      ["added", "A new test rejects emitted `__label` classes without a matching CSS rule in either workspace."],
    ],
  },
  {
    v: "0.33.1", date: "2026-09-13",
    changes: [
      ["changed", "Floating menus, dialogs, drawers, toasts, the command palette and hover readout now have a two-line edge and a broad, faint shadow. Cards, fields, chips and hovered rows keep their existing treatment. Chosen in #309.", ["Dropdown", "Drawer", "Confirm", "Callout", "Tooltip", "CommandPalette", "Topbar"]],
      ["added", "Floating surfaces now use theme-specific `--elev-drop` shadows and an inner edge that can be changed with `--elev-edge`. Focus rings sit in front of both layers; the five deprecated `--shadow-*` tokens still resolve to `0 0 #0000`.", ["Callout"]],
      ["fixed", "Collapsed-rail flyout labels now use the floating surface edge and shadow. They no longer read `--shadow-md`, including consumer overrides of that token.", ["Shell"]],
    ],
  },
  {
    v: "0.33.0", date: "2026-09-13",
    changes: [
      ["breaking", "Sign out now lives in the reader’s menu. Pages passing only `signOutHref` must also pass `account` and call `wireShell()` to make the menu available.", ["Shell"]],
      ["breaking", "`footer()` column titles now use `h2` instead of `h4`. Replace selectors such as `.ui-footer h4` with the title class.", ["Footer"]],
      ["changed", "`success()` now uses `h1` for hero and split titles and `h2` for compact titles; `level` overrides the choice. The consent screen’s “Access granted” title is also an `h1`.", ["Success"]],
      ["added", "The app rail now folds to an icon strip with an animated toggle. Folded rows show labels on hover and keyboard focus; `collapsed` sets the initial state and `collapsible: false` omits the toggle.", ["Shell"]],
      ["added", "`wireShell()` connects the rail toggle, account menu and navigation groups, and stores toggle presses in the `apliteni-ui-rail` cookie. Use `railCollapsed(request.headers.cookie)` for server rendering or `persist: false` to disable persistence. Each press emits a bubbling `ui-rail` event with `detail.collapsed`; `RAIL_COOKIE` is exported.", ["Shell"]],
      ["added", "The reader block at the rail’s foot now opens an account menu above it, including Sign out. Danger rows turn pink during keyboard use and pointer hover.", ["Shell", "Dropdown"]],
      ["added", "The page guidelines now cover heading order, one title and primary action, at most six cards, no overlays at load, one density and a two-sentence introduction. Pages use `appShell()`, named navigation landmarks and type size rather than faded text for hierarchy."],
      ["fixed", "Dropdowns now become visible immediately on opening so arrow-key focus reaches their rows. They stop accepting clicks as soon as closing starts, including rail menus and the topbar’s version and account menus.", ["Dropdown", "Topbar"]],
      ["fixed", "Folded sidebars now keep navigation groups reachable. Rows without a glyph receive a dot.", ["Shell"]],
    ],
  },
  {
    v: "0.32.0", date: "2026-09-12",
    changes: [
      ["breaking", "Cast shadows were removed throughout the kit, including React modals, feedback controls and the `.m-lift` utility. Both themes have new surface colours: dark pages and cards are darker, dark floating panels are lighter, and only floating panels remain pure white in light mode. Surfaces use colour steps and borders for separation.", ["Card", "Dropdown", "Drawer", "Confirm", "CommandPalette", "Modal", "Tooltip", "Callout", "Topbar", "Switch", "Segmented", "Feedback"]],
      ["breaking", "`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-seg` and `--shadow-card` are deprecated and now resolve to transparent `0 0 #0000`; consumers can override them to restore shadows. The transparent value remains valid beside other shadows, including focus rings. Local `--drawer-shadow`, `--confirm-shadow` and `--cmdk-shadow` hooks were removed; `--shadow-ink`, `--sheen`, `--ring` and `--scrim` are unchanged.", ["Drawer", "Confirm", "CommandPalette"]],
      ["breaking", "`--surface-2` now means a sunken field or track, while `--bg-elevated` means a floating panel; update uses that relied on their previous roles. Dark colours are `--bg` #0e0d14, `--surface-2` #161520, `--surface` #211e2d, `--bg-elevated` #2a2639, `--surface-3` #2d293c and `--seg-active-bg` #383350. Light colours are #eef0f5, #e3e6ee, #f8f9fc, #ffffff and #e7eaf1 for the first five tokens respectively."],
      ["breaking", "Cards now have a border in both themes, and accent cards colour that border instead of adding an inset ring. Interactive cards retain it; override `border` if you need borderless dark cards.", ["Card"]],
      ["changed", "Dark `--muted` changed from #948fa8 to #a29db6 to meet AA contrast on the highest surfaces. This also lightens secondary text elsewhere in the kit."],
      ["changed", "Light `--pink` changed to #a92d59, with a matching glow. Success, warning and info chip inks, plus Ocean and Emerald accents, were darkened to meet AA on the new page background.", ["Badge", "Callout", "Nav"]],
      ["fixed", "Hover readouts now use `--surface-3` in both themes so the light-mode panel remains visible over cards.", ["Tooltip"]],
      ["fixed", "Dropdown accent counters now use a flat badge fill with accent ink, matching the navigation badge introduced in #157.", ["Dropdown"]],
      ["fixed", "The rail’s resting glyph opacity was adjusted to remain readable against the new background.", ["Nav"]],
      ["fixed", "Raised-panel hover and active states now use `--surface-3`, including dropdown and account rows, drawer close controls, badges and palette key caps. Dropdown search fields use the sunken `--surface-2`.", ["Dropdown", "Topbar", "Drawer", "CommandPalette"]],
      ["fixed", "Switch knobs now use a `--border-strong` border so they remain visible without a shadow.", ["Switch"]],
      ["fixed", "Select chevrons now use the theme’s `--muted` colour, with a separate SVG stroke value for each theme.", ["Inputs"]],
    ],
  },
  {
    v: "0.31.1", date: "2026-09-12",
    changes: [
      ["fixed", "On touch screens, both published stylesheets now set all `input`, `select` and `textarea` text to 16px to prevent iOS focus zoom, including host-page fields. This is a fixed size, so larger fields also shrink; retain a larger size with a more specific important rule, such as `.hero-search input { font-size: 20px !important; }`. Mouse use and controls without text are unchanged.", ["Inputs", "Dropdown", "Pagination", "CommandPalette", "Feedback"]],
    ],
  },
  {
    v: "0.31.0", date: "2026-09-12",
    changes: [
      ["breaking", "These changes were already on npm by 0.30.0: they merged before the version bump in #287 and shipped in 0.28.0, 0.29.0 and 0.30.0 without release notes."],
      ["breaking", "Eleven text styles no longer force uppercase or add uppercase-only letter spacing. Rewrite copy that depended on that styling in sentence case, and type required capitals explicitly. `--tracking-caps` is still exported but unused by kit rules.", ["Badge", "Table", "Nav", "Dropdown", "Footer", "Snippet"]],
      ["breaking", "`card()` and `<Card>` titles now use `h2`; use `level` for `h3`–`h6` inside sections. Titles must contain inline content rather than blocks, and empty React titles render no heading.", ["Card"]],
      ["added", "Use `commandPalette()` with `wireCommandPalette()`, or React `<CommandPalette>`, for grouped, ranked results opened with ⌘K or Ctrl+K. Rows can navigate, run an action or request confirmation; destructive rows require confirmation, equal ranks keep caller order, and `rank: false` supports server queries. Two densities are available, with compact as the default.", ["CommandPalette"]],
      ["added", "`drawerSection({ title, rows, body })` now defines a drawer group with a heading above label-and-value rows. The group is separated from the group above by one rule and by spacing, rather than by a box.", ["Drawer"]],
      ["added", "React `Drawer` now uses the HTML drawer's markup, slide behavior, and scrim from the kit's own stylesheet. This avoids maintaining a second set of styles that could disagree with the kit.", ["Drawer"]],
      ["added", "Entrance transitions now fade in changing content while respecting reduced-motion preferences. `playEntrance()` and `ENTRANCE_FALLBACK_MS` apply this behavior to tab panels, side-nav groups, the feedback error, and `setBusy()` content. Everything that appears after load also moves during entrance, except when `prefers-reduced-motion` is enabled; then none of these effects run.", ["Tabs", "Nav", "Feedback"]],
      ["added", "Guidelines / The command palette now define six rules for using the pattern. They cover what belongs in a palette, how results are grouped and ranked, the six keys it owes a reader, focus and announcements, and the refusal to run a delete operation by itself.", ["CommandPalette"]],
      ["added", "The drawer and motion guidelines now connect each rule to the kit code that implements it. They are listed as Guidelines / Drawers and Guidelines / Motion.", ["Drawer"]],
      ["added", "Guidelines / Labels and titles now define four rules for text case and heading structure. They cover sentence case, the rank assigned to a title, card titles as headings, and the purpose of an eyebrow. Each rule cites the line of kit code that implements it.", ["Card"]],
      ["added", "The letter-case test now checks CSS and rendered labels across source, stories, site, React and Storybook files, including 21 supported spellings."],
      ["changed", "Labels use `--text-sm` with `--weight-medium`, chips use `--text-xs` with `--weight-semibold`, and card titles use `--text-lg` with `--weight-semibold` and the text face. These belong to five named type ranks checked by the tests.", ["Badge", "Card", "Table"]],
      ["changed", "React `Modal` now fades in and out and remains mounted until its exit transition finishes. It stays mounted for about 250ms after `open` becomes false. A test that expects the dialog to disappear immediately when `open` is false must wait for it to unmount.", ["Modal"]],
      ["changed", "React Modals, Drawers and CommandPalettes now share a dialog stack; only the top dialog responds to Escape and Tab. Layers are drawer 100, palette 101 and confirm 102, so one Escape no longer closes both a palette and its confirmation.", ["Modal", "Drawer", "CommandPalette", "Confirm"]],
      ["fixed", "Reduced-motion opening now places focus on the first control in drawers, confirmations, and command palettes. Under `prefers-reduced-motion`, focus had previously landed on the panel or fallen to `<body>`, where arrow keys and letters reached nothing and only a mouse could recover the interaction.", ["Drawer", "Confirm", "CommandPalette"]],
    ],
  },
  {
    v: "0.30.0", date: "2026-09-12",
    changes: [
      ["added", "`dropdown({ search: true })` adds a search field that matches anywhere in labels, ignores case and accents, and keeps row order. Arrow keys navigate matches, Enter selects, Escape closes, and an empty result is announced. Search uses a combobox in a dialog; dropdowns without search are unchanged.", ["Dropdown"]],
      ["added", "Dropdown guidelines now require search for ten or more options or any data-supplied list, as decided in #283.", ["Dropdown"]],
    ],
  },
  {
    v: "0.29.0", date: "2026-09-12",
    changes: [
      ["added", "`backLink()` adds a parent-page link above the title, showing a destination name beside an arrow. It uses the caller’s URL rather than browser history and announces “Back to” plus the destination, or “Back” without a name. Chosen in #270.", ["Back link"]],
      ["added", "`appShell({ back })` replaces breadcrumbs with a back link and marks the active sidebar row as the current section, not the current page. Use `sidebarNav({ activeIs: 'section' })` for the same behavior outside the shell.", ["Page shell", "Navigation"]],
      ["added", "Guidelines / Going back now define six rules for pages that return to a parent. They explain when a page receives a back link, what it names, why it links to an address instead of browser history, where it appears, how it relates to the sidebar, and why it remains visually quiet.", ["Back link"]],
    ],
  },
  {
    v: "0.28.0", date: "2026-09-11",
    changes: [
      ["added", "`tooltip()` shows chart values without moving or resizing surrounding content. Connect it with `wireTooltip(root)` or `showTooltip` / `hideTooltip`; it opens above the mark, flips or shifts when clipped, ignores pointer events, and writes label, value and detail as text. It also opens on focus and closes on Escape. Fixes #282.", ["Tooltip"]],
      ["added", "Guidelines / Hover readouts now define four rules for values shown on hover. A readout overlays the page instead of occupying space in it, opens above the mark, names the point, gives the value, and stops at one comparison. Hover must never be the only way to reach it. The question of whether chart marks should receive keyboard focus, and what a tap should do on a touch screen, remains open on #282.", ["Tooltip"]],
    ],
  },
  {
    v: "0.27.1", date: "2026-09-11",
    changes: [
      ["changed", "Cards no longer cast shadows in either theme, including interactive-card hover. Interactive cards keep their 2px lift, `--shadow-card` remains defined, and raised menus, dialogs and drawers retain their shadows.", ["Card"]],
    ],
  },
  {
    v: "0.27.0", date: "2026-09-10",
    changes: [
      ["added", "`pagination()` accepts page, page size and an optional total for server, array or cursor paging. Choose `steps`, `numbered` with up to seven slots, or `jump`; without a total it shows only Prev and Next. End controls stay in place when disabled, and a single page hides steps. With one page and no page-size choice, it renders nothing; the range uses a polite live region.", ["Pagination"]],
      ["added", "Pagination guidelines now cover page changes, announcing row ranges and remembering page size, with seven rules linked to kit code.", ["Pagination"]],
      ["breaking", "React `DataTable` now defaults to 100 rows per page instead of 4. Override `pageSize` as before, or import `PAGE_SIZES` and `DEFAULT_PAGE_SIZE`.", ["DataTable"]],
      ["added", "React `DataTable` now supports controlled `page` and `onPageChange`. Controlled tables render the supplied rows without slicing; use `total` and `hasMore` for count information, or `pager={false}` to hide the pager.", ["DataTable"]],
      ["fixed", "React `DataTable` now hides the pager when there is only one page.", ["DataTable"]],
      ["breaking", "The React table pager now uses `.ui-pager` instead of `.rx-pager` and `.rx-pager__info`, with status such as `1–100 of 4,812`. Update old selectors and replace CSS that hides the pager with `pager={false}`. Pager styles moved to `@apliteni/apliteni-ui/css`; add that import if you only use the React stylesheet.", ["DataTable", "Pagination"]],
      ["fixed", "Disabled ghost buttons now use `--disabled-ink-bare` to meet the 5.56:1 floor from #220 on every kit surface. They keep their transparent background and remain less prominent than enabled controls.", ["Button"]],
    ],
  },
  {
    v: "0.26.0", date: "2026-09-06",
    changes: [
      ["added", "React `DataTable` can now omit selection controls and share controlled sorting with another view of the same rows. Existing selection behavior and uncontrolled sorting remain unchanged.", ["DataTable"]],
    ],
  },
  {
    v: "0.25.3", date: "2026-09-06",
    changes: [
      ["fixed", "The React Modal now skips hidden and fieldset-disabled controls when choosing the opening focus. Previously, a body containing fields inside a closed `<details>` element could open with focus outside the dialog. Its summary now participates in the focus cycle. Elements with a negative `tabindex`, which scripts can focus but Tab skips, are excluded from the trap's endpoints.", ["Modal"]],
      ["changed", "Opening focus now reaches a link or disclosure summary before the body's first field. An empty body still focuses the dialog itself.", ["Modal"]],
      ["fixed", "Clicking the scrim now keeps focus on the element that opened the dialog. The scrim cancels the mousedown default action that previously undid focus restoration.", ["Modal"]],
      ["added", "Focus coverage now includes nine regression tests and a CollapsedForm story.", ["Modal"]],
    ],
  },
  {
    v: "0.25.2", date: "2026-08-31",
    changes: [
      ["changed", "Topbar avatar initials now inherit the text font while keeping their 600 weight, 12.5px size and 32 × 32 circle. Drawer and toast close buttons, the theme toggle and feedback dismiss control also reset the browser font, with no visible change to their SVGs. Follows #251.", ["Topbar", "Drawer", "Callout", "Feedback"]],
      ["fixed", "Version rows, interactive cards and feedback pills now reset browser button styles when rendered as `<button>`, following the dropdown repair in #251. Version rows reset width, fill, border, alignment and font; cards and pills keep their existing fill and width. Handwritten markup remains unsupported except when converting these clickable rows to keyboard-operable buttons.", ["Topbar", "Card", "Feedback"]],
      ["changed", "Version rows now use `width: 100%` and left-aligned text. Consumer rows with horizontal margins can overflow by that margin, and rows used as flex or grid items no longer shrink to their contents; review those layouts when upgrading.", ["Topbar"]],
      ["added", "The clickable-style test now compares controls with and without browser button defaults across seven properties. Existing exceptions remain recorded beside the test, and pinned subjects cannot silently leave coverage."],
    ],
  },
  {
    v: "0.25.1", date: "2026-08-31",
    changes: [
      ["fixed", "Dropdown rows rendered as buttons now reset the browser’s fill, border, font, alignment and width. They inherit the panel font and fill its width; div and link rows are unchanged.", ["Dropdown"]],
      ["added", "A regression test now checks dropdown rows rendered as divs, links and buttons. It checks shared alignment separately because jsdom forces its own alignment on buttons."],
    ],
  },
  {
    v: "0.25.0", date: "2026-08-31",
    changes: [
      ["breaking", "Body text now uses IBM Plex Sans through `--font-sans`; headings and brand marks keep Poppins through `--font-display`. Load both fonts using the README snippet, since the kit bundles neither. To keep Poppins everywhere, add `:root { --font-sans: var(--font-display) }` after the kit stylesheet.", ["Tokens"]],
      ["changed", "Typeface now follows role: headings and brand marks use the display face, while body content uses the text face. Drawer and confirmation titles keep the text face as panel labels.", ["Drawer", "Confirm", "Topbar"]],
      ["changed", "`b` and `strong` now use `--weight-semibold` instead of the browser’s 700 weight. Explicit 700 remains available."],
      ["changed", "The Typography story now shows display and text scales, including the same 13px paragraph in both fonts."],
      ["fixed", "Dropdown panels now set their text font explicitly, so portalling a panel out of a display-font container no longer changes its typeface.", ["Dropdown"]],
      ["added", "New tests check typeface roles and confirm that repository font-loading snippets include every required family."],
    ],
  },
  {
    v: "0.24.0", date: "2026-08-31",
    changes: [
      ["added", "Dropdowns now accept `direction: 'up'` or `'auto'`; auto flips when there is insufficient room below and more room above. Both directions keep the 9px `--ui-dropdown-gap`, and upward panels no longer stretch between conflicting offsets.", ["Dropdown"]],
      ["added", "`dropdown({ portal: true })` now lets panels escape clipped or isolated containers. `wireDropdown()` mounts the panel on the body, positions it from the trigger and updates it on scroll and resize.", ["Dropdown"]],
      ["changed", "Portalled panels carry their own `is-open` state and keyboard handlers. Container state, chevrons, accessible state, outside clicks and Escape continue to work; removing the container also removes its panel.", ["Dropdown"]],
      ["added", "Dropdown tests now check placement CSS and viewport-positioning calculations, including upward and portalled panels."],
    ],
  },
  {
    v: "0.23.4", date: "2026-08-31",
    changes: [
      ["fixed", "`data-accent` now works without `data-theme`, using the kit’s default dark theme. An omitted theme does not follow the system; hosts that need that behavior must read the system preference and set the attribute.", ["Tokens"]],
      ["removed", "The conflicting `--ink` alias was removed, and body text now uses `--text` like the rest of the kit. Replace direct `var(--ink)` references with `var(--text)`.", ["Tokens"]],
      ["added", "A regression test now checks tokens and accents without a theme attribute and catches missing light-theme overrides."],
    ],
  },
  {
    v: "0.23.3", date: "2026-08-19",
    changes: [
      ["changed", "Repeated explanations were removed from five published token, component and stylesheet files. Comments retain documentation pointers; runtime behavior is unchanged."],
    ],
  },
  {
    v: "0.23.2", date: "2026-08-14",
    changes: [
      ["changed", "Stylesheet and component headers now use short notes and documentation pointers. Signal-colour explanations moved to the specification; runtime behavior is unchanged."],
    ],
  },
  {
    v: "0.23.1", date: "2026-08-14",
    changes: [
      ["changed", "Icon and loading-component headers now point to documentation instead of repeating it. The icon notes included the duplicate-name repair from #199; loading guarantees moved to the specification. Runtime behavior is unchanged."],
    ],
  },
  {
    v: "0.23.0", date: "2026-08-14",
    changes: [
      ["changed", "Kit transitions now use shared duration and easing tokens: `--dur-fast` for controls, `--dur-med` for surfaces and `--dur-slow` for entrances."],
      ["fixed", "The two topbar menus and dropdown panel now name transition properties explicitly so visibility updates when they open. All visibility transitions use linear timing."],
      ["added", "The motion scale now includes `--ease-out`, `--ease-in`, `--ease-sharp`, `--ease-spring` and the 80ms `--dur-instant`, backed by brand tokens."],
      ["added", "The shared reduced-motion stylesheet now ships through both CSS entry points, including the React stylesheet."],
      ["added", "A new test checks motion tokens, transition properties, visibility timing and reduced-motion coverage. Ambient loops and choreographed sequences can use their own timing with a reason beside the declaration."],
    ],
  },
  {
    v: "0.22.0", date: "2026-08-14",
    changes: [
      ["changed", "Disabled controls now use disabled colours at full opacity instead of `opacity`. Labels use `--disabled-ink` on `--disabled-surface`, measuring 5.56:1–6.11:1 in both themes.", ["Button", "Input", "Nav", "Dropdown"]],
      ["added", "Disabled colours now use neutral aliases: `--disabled-ink`, `--disabled-surface`, and `--disabled-border` alias `--muted`, `--surface-2`, and `--border`. Disabled controls therefore do not follow the accent ramp."],
      ["added", "The disabled-state guarantee now requires at least 3:1 contrast and a colour pair that differs from the enabled state. The contrast floor is documented at `docs/specification.md#colour-and-contrast`."],
      ["changed", "The disabled-control gate now finds subjects from disabled selectors and checks each subject with and without its disabled state. It rejects `opacity` under a disabled selector when that selector has a label. The switch track may still use a fade because it has no written content."],
      ["changed", "The accessibility floor page now records the disabled-state requirement as a numeric value. The disabled gap and its ledger have been removed."],
    ],
  },
  {
    v: "0.21.0", date: "2026-08-14",
    changes: [
      ["changed", "The kit now has three breakpoints: `860px`, `720px`, and `560px`. They mark the three-track limit, shell folding, and one-column layout. The breakpoint table is in `docs/specification.md`; related collapses now move to these larger steps."],
      ["added", "A gate now checks every `@media` px value in `src/styles/` and `site/` against the three breakpoint steps from the specification. It fails for unused steps and for values not in the list. `site/public/` is not scanned."],
      ["changed", "The layout guideline now explains that matching numbers do not create a shared breakpoint token. `560` also names `--panel-lg`, and `860` also names `--measure`, but breakpoints describe viewports while tokens bound boxes."],
    ],
  },
  {
    v: "0.20.0", date: "2026-08-14",
    changes: [
      ["fixed", "All three controls now meet the 24 × 24 CSS px target-size floor. `.ui-toast__close` and `.ui-check` use centred 24 × 24 overlays, while `.ui-snippet__copy` now has a real box with an invisible `min-height`.", ["Targets"]],
      ["changed", "The target-size gate now measures pointer-reachable areas, including pseudo-elements. It combines each control's border box with its generated `::before` and `::after` boxes, using declared sizes or insets."],
      ["added", "Three tests now cover overlay-based target sizes, reject unmeasurable out-of-flow pseudo-elements, and derive the floor page's gap badge from the exemption list. The gate also records that it does not check overlay position or clipping by `overflow: hidden`."],
      ["changed", "The target-size gap has been removed from the accessibility floor page. The only exemption is the story's demo topbar."],
    ],
  },
  {
    v: "0.19.1", date: "2026-08-14",
    changes: [
      ["added", "`docs/specification.md` now defines what the kit ships, guarantees, supports, and does not do. A gate checks every statement during `npm test` and fails when a guarantee becomes untrue."],
      ["changed", "`docs/adr/` has been removed. Its content is now organized by audience: the specification covers consumer guarantees, the contributor guide covered repository mechanics, and the issue that settled a shape explains why it was chosen. Code behavior is unchanged; edits under `src/` point to the new locations."],
      ["added", "Documentation citations now have an automated validity gate. `scripts/doc-refs.test.js` checks tracked files, resolves cited files and anchors, and fails when a file or heading is missing. It discovers citations instead of using a fixed list."],
    ],
  },
  {
    v: "0.19.0", date: "2026-08-14",
    changes: [
      ["changed", "All stroked glyphs now use at least 1.5 CSS px. Eighteen rules were widened or given explicit strokes, with final widths from 1.51 to 1.60. Glyph weight no longer depends on its slot; token values are unchanged."],
      ["added", "The glyph-width gate now builds every story, resolves the cascade, and measures rendered glyphs. It also rejects sizing rules that no story renders; this found that `.ui-feature__icon` had no specimen. `docs/specification.md#icons-and-glyphs` records the rule."],
      ["added", "The error-row glyph now has an explicit size. `.ui-field__error` no longer uses the reset value of `1.1em`, so its box does not change with the surrounding font size."],
    ],
  },
  {
    v: "0.18.0", date: "2026-08-14",
    changes: [
      ["fixed", "The focus ring now uses the accent colour at full opacity through one declaration. `--ring: 0 0 0 3px var(--accent)` gives all eight theme × accent cells at least 4.22:1, above the 3:1 WCAG 1.4.11 requirement.", ["Focus"]],
      ["changed", "Seven duplicate `--ring` declarations have been removed from `tokens.css` and `accents.css`. Sub-themes now inherit the ring when they change the accent family. Measurements are recorded at `docs/specification.md#the-focus-ring`."],
      ["added", "The accessibility-floor page now states a 4.22:1 ring floor. `stories/guidelines/accessibility-floor.test.js` checks all eight theme × accent cells, enforces 3:1, and fails if `--ring` is declared more than once under `src/`."],
    ],
  },
  {
    v: "0.17.0", date: "2026-08-14",
    changes: [
      ["changed", "Table row spacing now follows the spacing scale for base and `--dense` rows. Base rows are 2px taller, dense rows are 4px shorter, and a 20-row ledger saves 369px instead of 249px.", ["Table"]],
      ["changed", "Spacing values exactly between scale steps now round according to purpose. `--dense` rounds down to remain tighter; the hover inset rounds up to keep clearance from the container edge. The rule is recorded at `docs/specification.md#spacing-and-rhythm`."],
      ["added", "The table-spacing gate now reads spacing steps from the token file, discovers padding, margin, and gap values, and enforces the tie-break rule. The Layout and density page now documents the modifier's steps instead of recording a nonexistent gap."],
    ],
  },
  {
    v: "0.16.0", date: "2026-08-14",
    changes: [
      ["added", "The reading column now uses separate scales for component boxes and text lines. Component boxes use `--panel-sm|md|lg` at 320/420/560px; text uses named prose tokens at 44/54/62/72ch, with `--prose-display` at 14ch. Repeated widths now use these tokens."],
      ["changed", "Several component and text widths now use shared tokens: panels use 420px or 560px, and prose uses 44ch, 54ch, or 62ch. Empty and denied subtext use `--prose-caption`; thirteen of eighteen reconciled declarations did not change.", ["Toast", "Empty", "Denied", "Feedback", "Hero", "Shell"]],
      ["changed", "The measure gate now uses the smallest panel step as its floor and reads it from the token file. Bare `Nch` and `Npx` values at or above the floor fail and identify the nearest step. The explanation for the old floor was removed."],
      ["fixed", "The measure gate now reads inline `style=\"…\"` attributes as CSS. The 840px reading column in `site/index.html` and the changelog's 820px wrapper now use `--measure`. The attribute parser was also fixed so quoted values do not consume following markup."],
      ["added", "The kit now documents its breakpoint convention. Breakpoints remain six documented literals because media queries cannot read custom properties. `docs/specification.md#boxes-below-the-page` records the choice and the role `@custom-media` could have played."],
    ],
  },
  {
    v: "0.15.0", date: "2026-08-14",
    changes: [
      ["changed", "The callout and toast status glyphs now use strokes wide enough for their contrast requirement. Their `stroke-width` values are 2.1 and 2.8, which produce CSS widths above 1.5px in their 24-unit boxes.", ["Callout", "Toast"]],
      ["fixed", "Callout icons now use text-grade `--chip-*-ink` colours. This raises the light-theme warn icon from 3.10:1 against its wash; dark-theme values are unchanged.", ["Callout"]],
      ["fixed", "The neutral toast check now uses `--signal-solid-ink` with its neutral circle. Contrast is now 6.29:1 and 6.11:1 instead of 3.11:1 and 3.16:1.", ["Toast"]],
      ["added", "The glyph-contrast gate now checks twenty status pairs across two glyph families, five statuses, and both themes. It discovers glyphs, statuses, and the five-status list from the stylesheet. Missing status paint tokens now fail. The rule is documented at `docs/specification.md#icons-and-glyphs`."],
    ],
  },
  {
    v: "0.14.0", date: "2026-08-14",
    changes: [
      ["added", "Busy regions now announce pending and completed content to screen readers. `busyRegion({ label, readyLabel, busy, body, lines })` and `setBusy(root, { busy, message, body })` keep the region mounted and update its hidden announcement. They use `role=\"status\" aria-live=\"polite\"`; a gate rejects non-polite live regions and any `role=\"alert\"`.", ["Loading"]],
      ["added", "Skeleton components now reserve layout space and share a reduced-motion-aware shimmer. `skeleton({ lines, width, height, radius })` and `skeletonTable({ rows, cols, head })` accept the documented options and remain `aria-hidden`.", ["Loading"]],
      ["added", "Denied states now identify the missing permission. `deniedState({ title, sub, need, actions, icon })` displays the scope, such as `reports.read`, and has no live region of its own. Inside `busyRegion()`, it is announced as the fetch result.", ["Denied"]],
      ["added", "The kit now includes `.ui-sr` for text intended only for assistive technology."],
      ["added", "React now supports busy buttons and persistent busy-region announcements. `<Button busy>` sets `aria-busy`, disables the button, and draws the kit's bars. The release adds `Skeleton`, `SkeletonTable`, `BusyRegion`, and `Denied`; `<BusyRegion>` remains mounted while its content changes.", ["Button", "Loading", "Denied"]],
      ["fixed", "The Guidelines / The full state set page now documents loading as implemented. The former unmet marker and *Gap #128* badge are gone, and the page includes a real live-region example."],
    ],
  },
  {
    v: "0.13.0", date: "2026-08-13",
    changes: [
      ["changed", "The standard page width changed from 1180px to 1120px for containers, topbars and footers. Set `:root { --container: 1180px }` to retain the old width.", ["Container", "Topbar", "Footer"]],
      ["added", "Page width now uses `--container`, while the reading column beside a sidebar uses the 860px `--measure` token."],
      ["fixed", "App shells now use the stylesheet’s `--measure` unless given `maxWidth`. Invalid overrides are removed instead of leaving an invalid computed width; valid overrides work as before.", ["Shell"]],
      ["added", "A new test rejects literal page-scale maximum widths in kit styles and site pages. Viewport breakpoints are excluded."],
      ["added", "Layout guidelines now explain page and reading-column widths and density from spacing tokens. At this release, dense tables remain the only component-specific density exception."],
    ],
  },
  {
    v: "0.12.0", date: "2026-08-13",
    changes: [
      ["fixed", "Status messages now use `circleCheck`, `circleX` and `circleAlert`, leaving the bare x for dismissal. Info and neutral glyphs are unchanged, and an explicit `icon` still wins.", ["Toast", "Callout"]],
      ["added", "`iconOnlyAllowed` now limits wordless actions to dismiss, copy, overflow and expand/collapse. These controls still require accessible names, and kit call sites are checked against the list.", ["Button"]],
      ["added", "`iconMeanings` now documents the eight glyphs that components choose automatically."],
      ["fixed", "Duplicate catalogue entries for `card`, `chart` and `doc` were removed without changing their paths or imports. A test now rejects names repeated across groups.", ["Icons"]],
      ["added", "Iconography guidelines now cover icon-only actions, glyph meanings, naming, grouping and path sources."],
    ],
  },
  {
    v: "0.11.4", date: "2026-08-13",
    changes: [
      ["fixed", "Toast actions now meet AA contrast across statuses and themes by using text-grade signal inks. Hover lightens the background instead of adding another status wash; dark-theme appearance and `toast()` arguments are unchanged.", ["Toast"]],
      ["added", "Use `--toast-action-ink` to override the trailing action’s colour independently. `--toast-accent` still controls the marker, icon circle, timer and outline.", ["Toast"]],
      ["fixed", "React table sort carets now use full-opacity muted ink so they remain readable in light mode.", ["DataTable"]],
    ],
  },
  {
    v: "0.11.3", date: "2026-08-13",
    changes: [
      ["fixed", "The Nebula picker swatch now follows its actual accent ramp. Phoenix, Ocean and Emerald are unchanged, and a test checks every swatch against its tokens.", ["Footer"]],
    ],
  },
  {
    v: "0.11.2", date: "2026-08-13",
    changes: [
      ["added", "Storybook now has five guideline pages for colour, states, component choice, wording and destructive actions. Each page has live examples and code references; the index shows coverage."],
      ["added", "Two unimplemented guideline rules now state their gaps and link to tracking issues."],
      ["changed", "The five design rules moved from the contributor guide into Guidelines: tokens, signal colours, states, themes and accents, and labels that name the current state. The installed package is unchanged."],
      ["fixed", "The wording guideline and example screen now use “Revoke access” instead of “Revoke” so the action makes sense on its own."],
    ],
  },
  {
    v: "0.11.1", date: "2026-08-13",
    changes: [
      ["fixed", "Drawers now stop accepting clicks as soon as closing begins, preventing repeated actions during the fade. The animation is unchanged.", ["Drawer"]],
      ["fixed", "Escape now closes the visible top overlay instead of whichever root appears later in markup. Opening a confirmation over a drawer with `openConfirm()` was already handled correctly.", ["Drawer", "Confirm"]],
    ],
  },
  {
    v: "0.11.0", date: "2026-08-12",
    changes: [
      ["added", "`appShell()` now provides a full-height sidebar beside one main region. Pass `crumbs` for breadcrumbs; the topbar is off unless requested.", ["Shell"]],
      ["added", "Below 720px, the rail now becomes an icon strip instead of disappearing. Links retain accessible names and 45×44px targets.", ["Shell"]],
      ["breaking", "`accountShell()` now uses `appShell()` markup: a main region, `.ui-nav--side` navigation and `breadcrumbs()`. Update selectors for removed `.ui-side`, `.ui-shell`, `.ui-shell__crumbs`, `.ui-shell__page` and `.sub`; shell body and subtitle classes are now `.ui-app__body` and `.ui-app__sub`. The shell no longer emits `.ui-card-stack`, but that class still works in consumer markup; previous options and navigation tuples remain accepted.", ["Shell"]],
      ["breaking", "`ACCOUNT_NAV` entries are now `{ id, icon, label }` objects instead of tuples. Kit navigation accepts both forms, but update code that spreads or destructures entries directly.", ["Shell"]],
      ["breaking", "Pass raw text for navigation labels, such as `Access & agents`, instead of pre-escaped entities. All navigation primitives now escape labels, so `&amp;` would be escaped twice.", ["Shell"]],
      ["breaking", "`crumb` is now escaped text, not trusted HTML. Replace markup in breadcrumb labels with plain text; use an item’s `icon` through `appShell({ crumbs })` when needed.", ["Shell"]],
      ["changed", "The trusted-HTML `sub` slot now renders as a paragraph. Keep its content inline and move block elements into `body`.", ["Shell"]],
      ["removed", "The stylesheet no longer includes `.ui-side` or `.ui-shell`. No component emits that markup anymore.", ["Shell"]],
      ["fixed", "Rail and breadcrumb links now keep kit colours when a host stylesheet defines `a:link`."],
      ["fixed", "Badged rail rows now include their count in the accessible name at every width."],
      ["fixed", "The reader block now sits outside navigation, so screen readers no longer announce the email as a navigation entry."],
      ["fixed", "The shell no longer fills a missing account name with the demo person’s name.", ["Shell"]],
      ["changed", "Account-menu initials now use the display name when available and the address otherwise, matching the rail."],
      ["changed", "`ACCOUNT_NAV` now stores its ampersand as `&`, not `&amp;`. If you read the constant's labels yourself, they are raw text."],
    ],
  },
  {
    v: "0.10.0", date: "2026-08-12",
    changes: [
      ["breaking", "`drawer({ open: true })` now traps focus, makes the background inert and closes on Escape. Use `specimen: true` for an always-visible example without those interactions. Confirmations interpret `open: true` the same way."],
      ["added", "`confirm()` adds a focus-trapped confirmation dialog over a scrim. It starts on the safe answer, and Escape cancels."],
      ["fixed", "Opening a drawer now places focus inside the panel after it becomes visible.", ["Drawer"]],
      ["fixed", "Closing stacked drawers or confirmations out of order no longer leaves the page inert."],
    ],
  },
  {
    v: "0.9.1", date: "2026-08-09",
    changes: [
      ["changed", "The npm package now includes the source-comment updates made after 0.9.0. Rendering and APIs are unchanged."],
      ["fixed", "Merging a version bump now creates a tag and release from the changelog and starts publication. PRs that change shipped files without a bump fail a check; a daily check reports npm/main drift older than a day."],
    ],
  },
  {
    v: "0.9.0", date: "2026-08-09",
    changes: [
      ["breaking", "The inline-icon reset now uses `svg:where(:not([width]):not([height]))`, reducing specificity from (0,2,1) to (0,0,1). Consumer icon rules that previously lost to the reset now apply, so custom icon sizes may change."],
      ["added", "`footer()`, `success()`, `successCheck()` and `wireSuccess()` can now be imported from the package root. They existed in the source but were missing from the entry point, so they could not be imported."],
      ["added", "`empty.css` is now included through `/inline`. Empty-state styles therefore reach users who load the inline stylesheet instead of the built stylesheet."],
      ["fixed", "The theme control now reports the current theme, not the theme a click would produce. This applies to both the glyph and accessible name; the name is rewritten whenever the state changes.", ["Topbar"]],
      ["fixed", "`--pink` now clears the surfaces on which it is drawn in both themes. In light mode, the live pill and info badge also now meet AA contrast.", ["Badge", "Callout"]],
      ["fixed", "Glow washes now use a tint of the colour they carry. Values that had drifted have been aligned again, and a test keeps them aligned."],
      ["fixed", "The danger navigation row is quiet at rest and uses `--pink` on hover. This matches the destructive-actions guideline."],
      ["changed", "Contrast tests now measure every story in both themes against its resolved background. Accepted failures are recorded with reasons."],
    ],
  },
  {
    v: "0.8.1", date: "2026-08-07",
    changes: [
      ["fixed", "The zebra table recipe now keeps its end cells inside the container border. A striped row therefore no longer runs into that border.", ["Table"]],
      ["fixed", "The homepage audience switcher now announces and behaves as a tablist. It uses roving tabindex, arrow keys and `aria-selected`."],
      ["fixed", "The Storybook toolbar selector works again, and the workbench no longer composes stories from outside the kit."],
      ["fixed", "Releases can publish again because `npm publish` now receives the tarball as a file path. Previously, npm received a bare `a/b` path, interpreted it as owner/repo shorthand, resolved a repository instead of the file, and failed with a public-key error."],
    ],
  },
  {
    v: "0.8.0", date: "2026-08-07",
    changes: [
      ["added", "React components are now available from `@apliteni/apliteni-ui/react`. The package includes Button, Badge, Card, Icon, Modal and DataTable, with their own stylesheets and stories. The vanilla kit is unchanged and remains the source of truth for tokens."],
      ["added", "Storybook now contains a Guidelines area, beginning with destructive actions. Each rule cites the kit lines that implement it, and a test fails the build when a cited line no longer matches its reference."],
      ["added", "Storybook now switches themes with one click instead of a dropdown."],
      ["fixed", "Light-mode Phoenix and Emerald are now darker to meet WCAG AA. Both previously failed contrast requirements as text and as a button fill."],
      ["fixed", "Danger uses `--pink` everywhere, and components now get colour from tokens instead of scattered literal values."],
      ["fixed", "Field errors are now connected to their fields, decorative icons are hidden from assistive technology, and every icon-only control has a name. The accessibility gates intended to catch these problems now run.", ["Inputs"]],
      ["changed", "The icon set now uses canonical Feather/Lucide glyphs throughout. The same idea therefore uses the same drawing everywhere."],
      ["changed", "Storybook was upgraded from 8 to 10, and Vite from 5 to 6."],
    ],
  },
  {
    v: "0.7.2", date: "2026-07-24",
    changes: [
      ["changed", "The package license changed from proprietary/UNLICENSED to MIT."],
    ],
  },
  {
    v: "0.7.1", date: "2026-07-24",
    changes: [
      ["fixed", "Table-row hover no longer touches the container border. `.ui-table--hover` now draws the highlight as an inset, rounded pill, with a few px of space from the edge, instead of a full-bleed rectangle. Dense/zebra ledgers keep their existing full-bleed tint."],
      ["changed", "Homepage Copy buttons now show a checkmark after success, instantly under reduced motion. Icon tiles have larger glyphs, and footer links have a visible hover state plus a link to apliteni.com."],
    ],
  },
  {
    v: "0.7.0", date: "2026-07-24",
    changes: [
      ["added", "A new accessible Tabs component is available through `tabs({ items, active, name })`. It renders a tablist and panels as a framework-agnostic HTML string, and you connect its behavior with `initTabs()`. It follows the full WAI-ARIA pattern, including roving tabindex, Arrow/Home/End keys, and `aria-selected` and `aria-controls` wiring. See the new Components → Tabs story."],
    ],
  },
  {
    v: "0.6.1", date: "2026-07-23",
    changes: [
      ["changed", "The theme toggle is now one compact icon-only switch. It uses a sun/moon button without \"Light/Dark\" text and keeps its `aria-label`, so the accessible name remains available. This affects `topbar({ theme: true })` and the site chrome."],
    ],
  },
  {
    v: "0.6.0", date: "2026-07-23",
    changes: [
      ["removed", "The unused public `aurora()` export and `.ui-bg-aurora` backdrop were removed. Ambient `.ui-glow` blobs, spotlight, accent wash, grid and dots remain."],
      ["added", "The homepage bento now shows more of the kit and separates its content into panels. It includes live Icons and Motion cells; each block has its own hue and no card hover."],
    ],
  },
  {
    v: "0.5.0", date: "2026-07-23",
    changes: [
      ["added", "Added a token-driven motion library with reusable effects for entrances, interactions, attention, and scroll reveals. The plain classes include entrances (`.m-fade-in`, `.m-slide-up/-down/-left/-right`, `.m-scale-in`, `.m-blur-in`), micro-interactions (`.m-lift`, `.m-press`, `.m-skeleton`), attention effects (`.m-pulse`, `.m-shake`, `.m-draw`), and staggered scroll reveals (`[data-reveal]` plus the optional `initReveal()` hook). The library is demonstrated in Foundations → Motion with a live token table and a Replay playground."],
      ["added", "Added one global `prefers-reduced-motion` rule that disables every animation and transition in the kit. This closes the previous gaps affecting the badge pulse and smooth scroll, while allowing one-shot animations to finish on their final frame."],
      ["changed", "Connected motion tokens to the Apliteni design-system vocabulary. Durations and easings now sync from design-system (`--duration-*` / `--easing-*`); the kit's `--dur-*` / `--ease` tokens alias those values, and new `--delay-1…5` tokens support staggered effects."],
      ["changed", "The landing page’s people-and-agents grid now uses separate coloured cells without card-level hover animation."],
    ],
  },
  {
    v: "0.4.0", date: "2026-07-21",
    changes: [
      ["added", "Added an ambient aurora background with drifting glow blobs and optional paper grain. The `aurora()` function reads accent tokens, so it automatically re-themes across Nebula, Phoenix, Ocean, and Emerald without per-app CSS. It supports full-bleed `fixed` mode and respects `prefers-reduced-motion`."],
      ["added", "`npm test` now runs every story through axe for WCAG 2.0/2.1 A and AA checks."],
      ["added", "Added the Apliteni seedling to the Brand page beside the kit prism. Both marks now include a size ramp."],
      ["fixed", "Fixed the WCAG A/AA violations reported by the accessibility panel. Every input now has a real label, listboxes have names, and the `select()` factory is available."],
      ["fixed", "Separated the consent-card brand lockup so the mark no longer touches the label. `.brand` is now self-contained outside the topbar."],
      ["fixed", "Included the aurora CSS in the inline and server-render bundles. It is now available through the `/inline` export and the site's `kit.css`, not only through the bundler entry."],
      ["changed", "Reduced the visual intensity of the Storybook manager chrome. Purple now works as a limited accent instead of filling the interface."],
    ],
  },
  {
    v: "0.3.0", date: "2026-07-21",
    changes: [
      ["changed", "Light `--bg` and `--surface` are now #ffffff, with adjusted neutral colours."],
      ["added", "Added the finance data-table treatment and semantic status badges to the kit. The table classes are `.ui-table--dense/--zebra/--hover`, with `__num` and `__code` cell classes."],
      ["fixed", "Improved light cards and table overflow on white backgrounds. Cards now use a hairline border and soft shadow to read as panels, while an overly wide table scrolls inside its card instead of extending beyond the corners."],
    ],
  },
  {
    v: "0.2.4", date: "2026-07-20",
    changes: [
      ["fixed", "Moved the active segmented pill inside its track and added a tighter `--shadow-seg` token. The previous heavy card shadow extended beyond the edge and looked like overflow.", ["Segmented"]],
    ],
  },
  {
    v: "0.2.3", date: "2026-07-20",
    changes: [
      ["added", "Added a gradient-bars busy loader to buttons. The button is disabled while its operation is in progress.", ["Button"]],
      ["added", "Added a centered Google-SSO sign-in with a glow and separate idle and signing-in states."],
    ],
  },
  {
    v: "0.2.2", date: "2026-07-20",
    changes: [
      ["added", "Added the `--accent-strong` token so primary buttons meet WCAG AA contrast requirements.", ["Button"]],
      ["added", "Added the `--seg-active-bg` token so the active segmented pill remains clear in dark mode.", ["Segmented"]],
      ["added", "Added a sign-in story that supports Google SSO only."],
      ["fixed", "Fixed card-grid alignment by moving spacing to `.ui-card-stack`. The child margin had leaked into rows and caused misalignment.", ["Card"]],
      ["changed", "Removed the automatically generated Storybook \"Docs\" pages. The intro wordmark now reads apliteni-ui."],
    ],
  },
  {
    v: "0.2.1", date: "2026-07-20",
    changes: [
      ["fixed", "The landing-page hero now has more space, larger feature icons and aligned preview cards."],
      ["changed", "Moved the version into a navigation pill and removed the Strategy footer link."],
    ],
  },
  {
    v: "0.1.2", date: "2026-07-20",
    changes: [
      ["fixed", "Enlarged the consent-scope icons and app-chip icons."],
    ],
  },
  {
    v: "0.1.1", date: "2026-07-20",
    changes: [
      ["fixed", "Kept the account menu hidden until the session is confirmed. It becomes visible when `.acct.on` is active."],
    ],
  },
  {
    v: "0.1.0", date: "2026-07-20",
    changes: [
      ["added", "Published the first release with tokens, components, and the deck theme."],
      ["added", "Added the Nebula, Phoenix, Ocean, and Emerald accent sub-themes in both dark and light modes."],
      ["added", "Added the Storybook workbench and the ui.apli.tech landing page."],
    ],
  },
];

// Component display name → Storybook story id (title kebab + first export).
// A name absent here renders as a plain, unlinked chip.
const COMPONENTS = {
  Table:     'components-table--finance-data',
  Badge:     'components-badge-status--badges',
  Button:    'components-button--playground',
  Card:      'components-card--variants',
  Callout:   'components-callout-toast--callouts',
  Confirm:   'components-confirm--playground',
  'React Confirm': 'react-confirm--danger',
  CommandPalette: 'components-command-palette--playground',
  Drawer:    'components-drawer--playground',
  Inputs:    'components-inputs--text-fields',
  Segmented: 'components-segmented-control--playground',
  Snippet:   'components-code-snippet--shell',
  StatBand:  'components-stat-band--playground',
  Switch:    'components-switch-checkbox--switches',
  Tooltip:   'components-tooltip--playground',
  Topbar:    'components-topbar--full',
  Feedback:  'components-feedback--default',
};

const STORYBOOK = (id) => `/storybook/?path=/story/${id}`;

const TAG = {
  added: { label: 'Added', cls: 'added' },
  fixed: { label: 'Fixed', cls: 'fixed' },
  changed: { label: 'Changed', cls: 'changed' },
  removed: { label: 'Removed', cls: 'removed' },
  deprecated: { label: 'Deprecated', cls: 'changed' },
  breaking: { label: 'Breaking', cls: 'breaking' },
};

// GitHub handle map — resolves a commit email to an avatar + profile.
// Unknown authors fall back to an initials chip and plain name.
const AUTHORS = {
  'artur.sabirov@apliteni.com': { handle: 'asabirov', name: 'Artur Sabirov' },
};

const initialsOf = (name) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

// Parse `git log --format=%an%x09%ae` output into deduped, bot-filtered contributors.
export const parseContributors = (logText, authors = AUTHORS) => {
  const seen = new Map(); // email → { name, count }
  for (const line of logText.split('\n')) {
    if (!line.trim()) continue;
    const [name, email] = line.split('\t');
    if (!name || !email) continue;
    if (/\[bot\]/i.test(name) || /\[bot\]/i.test(email)) continue;
    const key = email.toLowerCase();
    const cur = seen.get(key) || { name, count: 0 };
    cur.count += 1;
    seen.set(key, cur);
  }
  return [...seen.entries()]
    .map(([email, { name, count }]) => {
      const a = authors[email];
      const person = a
        ? {
            name: a.name, handle: a.handle,
            url: `https://github.com/${a.handle}`,
            avatar: `https://github.com/${a.handle}.png?size=48`,
            initials: initialsOf(a.name),
          }
        : { name, handle: null, url: null, avatar: null, initials: initialsOf(name) };
      return { person, count };
    })
    .sort((a, b) => b.count - a.count || a.person.name.localeCompare(b.person.name))
    .map(({ person }) => person);
};

// Per-release contributor row: avatar (photo or initials) + handle/name chip.
export const contributorChips = (people) => {
  if (!people || !people.length) return '';
  const who = (p) => {
    const av = p.avatar
      ? `<img class="av" src="${attr(p.avatar)}" alt="" width="22" height="22">`
      : `<span class="av ini">${fmt(p.initials)}</span>`;
    const label = p.handle ? `@${fmt(p.handle)}` : fmt(p.name);
    return p.url
      ? `<a class="who" href="${attr(p.url)}">${av}${label}</a>`
      : `<span class="who">${av}${label}</span>`;
  };
  return `<div class="contrib"><span class="people">${people.map(who).join('')}</span></div>`;
};

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

// tiny inline-code + backtick formatter (no external md)
const fmt = (s) => s
  .replace(/[&<>]/g, (c) => HTML_ENTITIES[c])
  .replace(/`([^`]+)`/g, '<code class="ui-code">$1</code>');

// Escape a value for use inside a double-quoted HTML attribute.
const attr = (s) => String(s).replace(/[&"<>]/g, (c) => HTML_ENTITIES[c]);

// Per-change component chips: known → Storybook deeplink, unknown → plain pill.
export const componentChips = (names) => {
  if (!names || !names.length) return '';
  const chip = (n) => COMPONENTS[n]
    ? `<a class="comp" href="${STORYBOOK(COMPONENTS[n])}">${fmt(n)}</a>`
    : `<span class="comp plain">${fmt(n)}</span>`;
  return `<span class="chips">${names.map(chip).join('')}</span>`;
};

export const isBreakingRelease = (r) => r.changes.some(([t]) => t === 'breaking');

const BREAKING_BADGE = `<span class="ui-badge ui-badge--breaking">` +
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>` +
  `Breaking</span>`;

// The newest and oldest releases, derived. Both badges used to be a `tag` an
// entry carried, and nothing cleared the old one — eleven releases claimed
// Latest at once on the live page. A badge that names a superlative has to be
// computed from the whole list, or it is a second copy of the ordering that
// drifts the moment a release is prepended.
// Derive release badges from the list instead of storing flags.
export const cmpVersion = (a, b) => {
  const [pa, pb] = [a, b].map((v) => v.split('.').map(Number));
  return (pa[0] - pb[0]) || (pa[1] - pb[1]) || (pa[2] - pb[2]);
};

/** `{ newest, oldest }` version strings over a release list. */
export const marksOf = (releases = RELEASES) => ({
  newest: releases.reduce((m, r) => (cmpVersion(r.v, m.v) > 0 ? r : m)).v,
  oldest: releases.reduce((m, r) => (cmpVersion(r.v, m.v) < 0 ? r : m)).v,
});

// The always-visible line is capped here. 40 is the longest summary the prose
// already carries — a ratchet pinned at today's worst case, not a target: it
// admits every one of the 143 changes written so far (14-word median, 32 at the
// 90th) and refuses the next one that runs longer. Raising it is a decision
// somebody has to make on purpose, which is the point of it being a number.
export const HEADLINE_MAX = 40;

const wordsIn = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/** Offsets just past each sentence end and each clause break, ignoring
 *  anything inside a `code span` so `--panel-md` and `0.15s` are not breaks. */
function breaks(text) {
  const ends = [], clauses = [];
  let tick = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '`') { tick = !tick; continue; }
    if (tick) continue;
    // A break needs whitespace after it: that alone rules out `0.15s`, `2.5.8`
    // and every decimal, with no list of exceptions to keep.
    if (!/\s/.test(text[i + 1] || '')) continue;
    const rest = text.slice(i + 1).trimStart();
    if (!rest) continue;
    if ('.?!'.includes(c)) { if (/^[A-Z`("“]/.test(rest)) ends.push(i + 1); }
    else if (':;—'.includes(c)) clauses.push(i + 1);
  }
  return { ends, clauses };
}

/** Split a change into the `what` the page shows and the `why` it folds.
 *
 *  Both halves are slices of the input — this compresses the page by choosing
 *  what to show, never by rewriting. `site/changelog.test.js` asserts that over
 *  every change in RELEASES: only separator characters may fall between them. */
export const splitChange = (text) => {
  const { ends, clauses } = breaks(text);
  const at = (cut) => ({
    headline: text.slice(0, cut).replace(/[\s:;—]+$/, ''),
    why: text.slice(cut).trim(),
  });
  let split = ends.length ? at(ends[0]) : { headline: text.trim(), why: '' };
  // A first sentence over the ceiling is one that swallowed its own
  // enumeration. Cutting at its first clause break moves the enumeration into
  // the fold rather than deleting it, which keeps the slices lossless.
  if (wordsIn(split.headline) > HEADLINE_MAX) {
    const c = clauses.find((p) => p < (ends.length ? ends[0] : text.length));
    if (c) split = at(c);
  }
  return split;
};

/** One change: the tag chip, the summary, and its component chips. The
 *  reasoning after the first sentence is not rendered — see the file header. */
const change = ([t, text, comps]) => `<li><span class="tag tag--${TAG[t].cls}">${TAG[t].label}</span>`
  + `<span class="chg">${fmt(splitChange(text).headline)}${componentChips(comps)}</span></li>`;

const REPO = 'https://github.com/apliteni/apliteni-ui';

/** Issue and PR refs a release closed, read out of `git log --format=%s` over
 *  its tag range. Derived from the history rather than written beside the
 *  entry, for the same reason the Latest badge is: a hand-kept list of numbers
 *  is a second copy of something the repo already knows. Ascending, deduped. */
export const parseIssues = (logText) => [...new Set(
  (logText.match(/\(#(\d+)\)/g) || []).map((m) => Number(m.slice(2, -1))),
)].sort((a, b) => a - b);

/** The refs row under a release's changes. Nothing is capped: a release that
 *  closed twenty-four issues says so. */
export const issueChips = (nums) => {
  if (!nums || !nums.length) return '';
  const one = (n) => `<a class="iss" href="${REPO}/issues/${n}">#${n}</a>`;
  return `<p class="issues"><span class="issues__label">Issues</span>${nums.map(one).join('')}</p>`;
};

export const release = (r, contributors, marks = marksOf(), issues) => `
  <section class="rel">
    <div class="rel__rail"><span class="rel__dot${r.v === marks.newest ? ' is-latest' : ''}"></span></div>
    <div class="rel__body">
      <header class="rel__head">
        <span class="rel__v">v${r.v}</span>
        <span class="rel__date">${r.date}</span>
        ${r.v === marks.newest ? '<span class="ui-badge ui-badge--live">Latest</span>' : ''}
        ${r.v === marks.oldest ? '<span class="ui-badge ui-badge--soon">First</span>' : ''}
        ${isBreakingRelease(r) ? BREAKING_BADGE : ''}
      </header>
      <ul class="rel__list">
        ${r.changes.map(change).join('')}
      </ul>
      ${issueChips(issues)}
      ${contributorChips(contributors)}
    </div>
  </section>`;

export const changelogMain = (contributorsByVersion = {}, issuesByVersion = {}) => {
  const marks = marksOf();
  return RELEASES.map((r) => release(r, contributorsByVersion[r.v], marks, issuesByVersion[r.v])).join('');
};
