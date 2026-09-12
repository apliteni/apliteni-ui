// Changelog data + renderer for ui.apli.tech/changelog.
// One entry per published release; grouped changes with typed tags.
//
// A change is written as one summary sentence followed by its reasoning. The
// page shows the summary and drops the reasoning: a consumer reading a
// changelog wants what changed, and the argument behind it belongs in the issue
// that settled it — which is why each release carries its issue refs instead.
// The prose stays whole in RELEASES; splitChange chooses what is shown.
//
// Nothing here is asserted that can be derived: the Latest and First badges
// come from the release list, not from a flag on an entry.
// why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them

export const RELEASES = [
  {
    v: '0.31.1', date: '2026-09-12',
    changes: [
      ['fixed', "Every field the kit ships is 16px on a touch screen, so focusing one no longer zooms the page. iOS Safari zooms into a focused field whose text is under 16px and does not zoom back out; the kit's form controls were 14.5px, the pager's size and jump controls 13px, and the dropdown's search field 12.5px. One `@media (pointer: coarse)` rule in the new `src/styles/field-zoom.css` takes `input`, `select` and `textarea` to 16px, and both published stylesheets import it — the React one as well, the way both carry the reduced-motion net. It is written over elements rather than kit classes, so a host page's own fields are covered too, and it is `!important`, because a net has to outrank a component rule it has never seen. The controls with nothing to type into keep their size. With a mouse nothing changes. The local rule 0.30.0 gave the dropdown's search field is gone, replaced by the shared one.", ['Inputs', 'Dropdown', 'Pagination', 'CommandPalette', 'Feedback']],
    ],
  },
  {
    v: '0.31.0', date: '2026-09-12',
    changes: [
      ['breaking', "Already shipped: everything in this entry has been on npm since 0.30.0. The three changes below merged before #287 bumped the version, so 0.28.0, 0.29.0 and 0.30.0 carried them without describing them. A consumer on 0.30.0 already has the capitals gone and the card title as a heading; this is the entry that says so."],
      ['breaking', "Nothing in the kit sets text in capitals by style. `text-transform` is gone from eleven rules — the eyebrow, the table head, the badge, the pill, the nav caption, the menu group caption, the menu row badge, the footer column title, the code sample's label, the confirmation's eyebrow and the version badge — and the letter-spacing that only capitals need went with it. A label written `Paid` rendered `PAID` and now renders `Paid`. Copy that relied on the uppercasing has to be rewritten in sentence case; a word that is capitals in itself is typed that way. `--tracking-caps` is still exported and no kit rule reads it.", ['Badge', 'Table', 'Nav', 'Dropdown', 'Footer', 'Snippet']],
      ['breaking', "`card()` and `<Card>` emit the title as an `h2` instead of a `div`. A card title is now in the page's heading outline, and `level` takes it to `h3`–`h6` for a card under a section heading of its own. A title holding block content has to become inline content — a heading cannot hold a block. `<Card>` renders no heading for an empty title, where it used to emit an empty `div`.", ['Card']],
      ['added', "`commandPalette()` and `wireCommandPalette()`, with `<CommandPalette>` beside them in React. ⌘K or Ctrl+K over a scrim: a text box, grouped results, ranking that keeps the caller's order as the tie-break, and the ARIA combobox keyboard. The kit ships the shell and names no result kinds — a row goes somewhere, runs something, or asks a confirm first, and a destructive row with nothing to ask cannot be run at all. `rank: false` hands the query back for a palette a server feeds. Two densities, compact by default.", ['CommandPalette']],
      ['added', "`drawerSection({ title, rows, body })` — a drawer group, a heading over label and value rows, parted from the group above it by one rule and by space rather than by a box.", ['Drawer']],
      ['added', "React `Drawer`: the HTML drawer's markup, slide and scrim, on the kit's own sheet rather than a second set of styles that can disagree with it.", ['Drawer']],
      ['added', "`playEntrance()` and `ENTRANCE_FALLBACK_MS`. Tab panels, side-nav groups, the feedback error and `setBusy()` content now fade in when they change, and everything that appears after load moves — under `prefers-reduced-motion` none of it does.", ['Tabs', 'Nav', 'Feedback']],
      ['added', "Guidelines / The command palette — six rules: what belongs in a palette, how results are grouped and ranked, the six keys it owes a reader, focus and announcement, and the refusal to run a delete on its own.", ['CommandPalette']],
      ['added', "Guidelines / Drawers and Guidelines / Motion, each rule citing the line of kit code that keeps it.", ['Drawer']],
      ['added', "Guidelines / Labels and titles — four rules on sentence case, the rank a title takes, a card title as a heading, and what an eyebrow is for. Each cites the line of kit code that keeps it.", ['Card']],
      ['added', "`stories/guidelines/letter-case.test.js` — refuses a case change anywhere in `src/`, `stories/`, `site/`, `react/src` and `.storybook`, in a stylesheet, a `<style>` block, an inline style or a JSX style object, across 21 spellings; and renders every story in both themes and every site page to check that the text under a label or chip rank starts with a capital."],
      ['changed', "Labels and chips take named type ranks. A label is `--text-sm` at `--weight-medium`; a chip is `--text-xs` at `--weight-semibold`; a card title is `--text-lg` at `--weight-semibold` and keeps the text face on any element. Five ranks in all, each smaller than the one above it, written in the specification and read at run time by `src/styles/type-ranks.test.js`. The sizes were the owner's choice between three rendered treatments.", ['Badge', 'Card', 'Table']],
      ['changed', "React `Modal` fades in and out, and stays mounted until its exit ends — about 250ms after `open` turns false. A test that expects the dialog gone the instant `open` is false has to wait for it.", ['Modal']],
      ['changed', "React `Modal` paints on the confirm's layer, above a drawer, instead of at `z-index: 50`, and React Modals, Drawers and CommandPalettes share one dialog stack: only the top one takes Escape and Tab, so a confirm opened from a palette row takes one Escape to answer rather than one that closes both. The overlay layers are three steps now — drawer 100, palette 101, confirm 102.", ['Modal', 'Drawer', 'CommandPalette', 'Confirm']],
      ['fixed', "Under `prefers-reduced-motion`, opening a drawer, a confirm or a command palette puts focus on its first control again. It had landed on the panel, or fallen to `<body>` — where the arrows and the letters reached nothing and only a mouse recovered it.", ['Drawer', 'Confirm', 'CommandPalette']],
    ],
  },
  {
    v: '0.30.0', date: '2026-09-12',
    changes: [
      ['added', "`dropdown({ search: true })` puts a field above the rows and filters them as the reader types. It was asked for by the finance portal, whose filter dropdowns hold between 12 and several hundred options each with no way to narrow them. The match is anywhere in the label, ignoring case and accents, and rows keep their order. The arrows move through the rows still showing, Enter picks, Escape closes, and a query that matches nothing says so instead of leaving a blank panel. The field is a combobox inside a small dialog, because a listbox may not contain a text field. A dropdown without `search` renders byte-for-byte what it rendered before.", ['Dropdown']],
      ['added', "Guidelines / Component choice: when a dropdown needs a search field. Ten options or more, or any list fed by data, gets one. It is a rule rather than a recommendation, and the number was settled on #283.", ['Dropdown']],
    ],
  },
  {
    v: '0.29.0', date: '2026-09-12',
    changes: [
      ['added', "`backLink()` — the way up from a page to the page it sits under, drawn above the title in the place a breadcrumb trail would take. It is an `<a href>` to an address the caller names, never a step through the history: a page opened in a new tab, from a bookmark or from a shared address has no history to step through, and the browser's own Back button already does that job. It shows the destination's name beside an arrow and is named \"Back to\" that destination for a screen reader; given no name it shows \"Back\", and a label that already begins \"Back to\" is read as the place after those words. It rests in `--dim` with no box, and its colour rule outranks a host stylesheet's `a:link`, so a page that colours its links does not turn it into one. The kit ships this one treatment and no variant: four were rendered side by side on the review page for #270 — a quiet link, a bordered button above the title, an icon-only arrow beside it, and the breadcrumb trail alone — and the quiet link was chosen.", ['Back link']],
      ['added', "`appShell({ back })` draws the back link where the trail would go and draws no trail, because the two name the same parent twice. The sidebar row marked `active` stays lit and is marked `aria-current=\"true\"` — the current section — rather than `\"page\"`, which announced the list as the page on screen. `sidebarNav({ activeIs: 'section' })` does the same outside the shell.", ['Page shell', 'Navigation']],
      ['added', "Guidelines / Going back: six rules for a page that goes back up — when a page gets a back link, what it names, why it links to an address rather than the history, where it sits, how it relates to the sidebar, and why it stays quiet.", ['Back link']],
    ],
  },
  {
    v: '0.28.0', date: '2026-09-11',
    changes: [
      ['added', "`tooltip()` — the readout a chart, a sparkline or any mark shows while a pointer rests on it, with `wireTooltip(root)` to drive it and `showTooltip` / `hideTooltip` for a chart that does its own hit-testing. It overlays the page in every state: one element, absolutely placed inside its host, whose open state changes only `opacity` and `visibility`, so showing it never moves or resizes anything else. That is the defect #282 was reported against: the finance portal's KPI sparklines wrote their readout into the card as a new line, so the card grew and everything under it moved each time the pointer landed on a point. It opens above the mark and flips below only when above is clipped, by the viewport or by an ancestor that hides its overflow, then slides inward at an edge. It takes no pointer events, writes its label, value and detail as text, shows on focus as well as on hover, and closes on Escape.", ['Tooltip']],
      ['added', "Guidelines / Hover readouts: four rules for any value shown on hover. It overlays the page and never sits in it, it opens above the mark, it names the point, gives the value and stops at one comparison, and hover is never the only way to reach it. Whether a chart's marks should take keyboard focus, and what a tap should do on a touch screen, is still open on #282.", ['Tooltip']],
    ],
  },
  {
    v: '0.27.1', date: '2026-09-11',
    changes: [
      ['changed', "A card is flat: `.ui-card` casts no drop shadow in either theme. In light its hairline `--border` alone marks it off the white page; dark was already shadowless and still groups by surface. An interactive card keeps its 2px hover lift and loses the `--shadow-md` it cast on hover in dark, which light never showed. `--shadow-card` is still defined for anyone reading it, and raised surfaces — dropdown panels, modals, drawers, popovers — keep their shadows.", ['Card']],
    ],
  },
  {
    v: '0.27.0', date: '2026-09-10',
    changes: [
      ['added', "`pagination()` — the strip under a table or a list, and the first pager in the kit that can express a page it did not compute. Rows do not go into it: it takes the current page, the page size and, where the caller has one, the size of the whole result, so a page counted by a server and a page sliced out of an array produce the same markup. Three variants — `steps` (First/Prev/Next/Last, the default), `numbered` (a truncated strip of at most seven slots) and `jump` (a page box) — and a fourth shape nobody selects: given no total it draws Prev and Next alone, because with no last page nothing else can be computed, which is what a cursor API and a `limit + 1` fetch both need. A control at an end is disabled and stays where it is, never removed. One page of content draws no steps, and with no page size on offer it renders nothing at all. The range announces itself in a polite live region, and nothing else in the strip does.", ['Pagination']],
      ['added', "Guidelines / Pagination: seven rules for data-intensive tables, each citing the line of kit code that keeps it. Three of them are in none of the thirteen design systems surveyed for the page — what the controls do during a page turn, announcing the row range by default, and where the responsibility for remembering a page size sits.", ['Pagination']],
      ['breaking', "React `DataTable` pages 100 rows by default, not 4. The old default was written for a demonstration and every consumer of a data-intensive table had to override it. `pageSize` still takes any number; `PAGE_SIZES` and `DEFAULT_PAGE_SIZE` are exported so no call site writes the numbers.", ['DataTable']],
      ['added', "React `DataTable` takes `page` and `onPageChange`, the same controlled/uncontrolled pair `sort` already had. A controlled table renders the rows it is handed and never slices them, so a surface paged by a server says so instead of passing its own row count as a page size to switch the kit's pager off. `total` and `hasMore` carry the count; `pager={false}` renders none at all.", ['DataTable']],
      ['fixed', "React `DataTable` no longer draws a pager for a table that has one page. It used to render `Page 1 of 1 · N rows` under two permanently disabled buttons, with no branch on the page count and no way to turn it off — which is why one consumer hid the strip in CSS on the two surfaces where the sentence was also false.", ['DataTable']],
      ['breaking', "React `DataTable`'s pager markup moved to the kit's shared `pagination()` output. `.rx-pager` and `.rx-pager__info` are gone, the strip is now `<nav class=\"ui-pager\">`, and the status text changed from `Page 1 of 6 · 100 rows` to `1–100 of 4,812`. A stylesheet keyed on the old class stops matching — including a `display: none` written to suppress the pager, which now suppresses nothing and should be deleted in favour of `pager={false}`. The pager's styles also move out of `@apliteni/apliteni-ui/react/css` and into `@apliteni/apliteni-ui/css`, which a consumer importing only the React stylesheet has to add.", ['DataTable', 'Pagination']],
      ['fixed', "A disabled ghost button's label now clears the kit's disabled floor wherever the button is put. A ghost paints no box, on or off, so its label is read on whatever is behind it, and `--disabled-ink` read 5.18:1 on a card and 4.66:1 on `--surface-3` in dark — under the 5.56 that #220 settled. It now takes a new token, `--disabled-ink-bare`, set for the dullest ground: 5.62–7.00 in dark and 5.60–6.50 in light, with the live ghost beside it still reading 1.5 times that in dark and 1.6 in light. The first fix for this painted the flat disabled box onto the ghost instead, on a claim that nothing would get less readable, which was false. Rendered in a pager at page 1, the boxed First and Prev read heavier than the live Next and Last beside them, and it was reverted before release. `src/styles/button-disabled.test.js` pins both inks on every ground and refuses a disabled rule that gives its box back to the ground without this ink.", ['Button']],
    ],
  },
  {
    v: '0.26.0', date: '2026-09-06',
    changes: [
      ['added', "React DataTable can omit selection controls and share controlled sorting with another view of its rows. Existing selection and uncontrolled sorting retain their behavior.", ['DataTable']],
    ],
  },
  {
    v: '0.25.3', date: '2026-09-06',
    changes: [
      ['fixed', "The React Modal now skips hidden controls and controls disabled by a fieldset when choosing opening focus. Previously, a body containing fields inside a closed <details> could open with focus outside the dialog. Its summary now participates in the focus cycle. Negative-tabindex elements, which scripts can focus but Tab skips, are excluded from the trap's endpoints.", ['Modal']],
      ['changed', "A link or disclosure summary before the body's first field now receives opening focus. An empty body still focuses the dialog itself.", ['Modal']],
      ['fixed', "Clicking the scrim now preserves focus on the element that opened the dialog. The scrim cancels the mousedown default action that previously undid focus restoration.", ['Modal']],
      ['added', "Nine focus regression tests and a CollapsedForm story.", ['Modal']],
    ],
  },
  {
    v: '0.25.2', date: '2026-08-31',
    changes: [
      ['changed', 'The account avatar in the topbar repaints. It is a `<button>` carrying the account initials, and `.avatar` stated no family, so those two characters painted in the browser\'s Arial in every release up to 0.25.1 while the label beside them took the kit face. The rule now states `font: inherit`, and keeps its own 600 weight and 12.5px size by writing them after the shorthand, so the initials take the text face the topbar is already set in inside the same 32 × 32 circle. Every app using the topbar sees this. No pixel offset is quoted for it: the reading was taken against 0.23.3 in Chrome 152, when `--font-sans` was Poppins, and 0.25.0 made it IBM Plex Sans, so the number it produced is not the number this release ships. Four more rules took the same declaration and repaint nothing — the drawer close, the toast close, the theme toggle and the feedback composer\'s dismiss each render one `<svg>` and no text characters at all, swept over the 60 story renderings the kit gives them.', ['Topbar', 'Drawer', 'Callout', 'Feedback']],
      ['fixed', 'Three more clickable rows cancel the styling a browser paints on a `<button>`, which is the reset 0.25.1 gave `.ui-dropdown__item` alone. Each is a row the kit renders as a control and never as a button — `.vopt` as a `<div>` with a role and a tabindex, `.ui-card--interactive` as an `<a href>`, `.ui-fbpill` as a bare `<div>` — so the consumer who needs one from the keyboard writes it as a button and gets the grey fill, the 2px outset frame, the centred line and the `font: 400 13.3333px Arial` that #251 measured on the dropdown row. `.vopt` now states all five: `width`, `background`, `border`, `text-align` and `font`. `.ui-card--interactive` and `.ui-fbpill` state three each, and the two they leave out are decisions rather than omissions: both already declare their own background, and neither is a block-level box in normal flow — the card is a grid item everywhere the kit renders it and the pill is `inline-flex` — so a `width` on either would be a live pixel change guessed at rather than measured. `font` and never `font-family`: the browser writes one shorthand, so restoring the family alone leaves the size and the leading standing, and any font longhand a rule keeps goes after it. The non-goal in docs/specification.md is amended to match rather than reversed in silence — hand-written markup stays unsupported except a row the kit renders as a control, which is a consumer\'s to rewrite as a `<button>` when it has to be operable from the keyboard — and docs/library.md carries that markup with the attributes `wireDropdown()` needs to drive it.', ['Topbar', 'Card', 'Feedback']],
      ['changed', '`width: 100%` on `.vopt` is a shape change for a consumer who had already styled that row. Under `box-sizing: border-box` it sizes the border box and not the margin box, so a row given a horizontal margin now overflows its panel by exactly that margin; a row used as a flex item in a row direction, or as a grid item under `justify-items: start` or `center`, stops shrink-to-fitting and fills its track instead, with `text-align: left` carrying the label to the edge of it. Neither shape exists in this repository, so no story moved and nothing here measures it — a consumer on either one sees it at the upgrade.', ['Topbar']],
      ['added', 'A gate that mounts every clickable class the kit ships where a story renders it, once against the chrome a browser paints on a `<button>` and once against its absence, and holds the two readings equal. The seven facets it holds them equal on are background, border, font-family, font-size, line-height, text-align and width. It discovers its subjects from every `cursor: pointer` rule in the stylesheets rather than from a list, so what it fails on is the class the kit renders as a clickable thing and never as a button — the rendering nobody has seen, which is how #251 reached a release. The three it fails on and the three it leaves out are pinned by name as well as derived, because a derived count does not move when a subject stops being a subject and a whole defect can pass at exit 0 while it happens: deleting one `tabindex="-1"` from the dropdown component took `.ui-dropdown__item` out of the measured set with every count still adding up. Rows the kit does render as buttons are measured, counted and answered for in a ledger rather than failed — twelve keep the element\'s centring and four keep its leading, each with the pixels a repair would cost written beside it. Width is the one facet where equal readings are not enough: `width: auto` and `width: fit-content` make the two agree and are the defect itself, so the value is rejected as well as compared.'],
    ],
  },
  {
    v: '0.25.1', date: '2026-08-31',
    changes: [
      ['fixed', '`.ui-dropdown__item` resets the styling the browser puts on a `<button>`. The rule reset only `border-radius` and `transition`, so a row written as a button — the natural reading of a component whose `.ui-dropdown__tick` is commented "listbox variant" and whose `.ui-dropdown__item.is-selected` is what shows it — arrived wearing the browser\'s own button skin. Measured in Chromium 150 on the dark theme, before and after: `background-color` `rgb(107, 107, 107)` to `rgba(0, 0, 0, 0)`, `border` `2px outset rgb(255, 255, 255)` to `0px none`, `font-family` `Arial` to the panel\'s own face, `text-align` `center` to `left`, and the row\'s width 196.86px to the panel\'s own 226px. It reads as broken stacking rather than a missing reset, which is what it cost the consumer who reported it against 0.23.3: twenty minutes inside `z-index` before the computed styles were pulled. The five declarations are the ones `.ui-nav__item` has always carried, with one difference — the face is reset with `font: inherit` rather than `font-family: inherit`. The UA writes one shorthand, `font: 400 13.3333px Arial`, so answering only its family leaves 13.3333px and `line-height: normal` behind; `.ui-nav__item` escapes that only because it declares a size and a line-height of its own, and this rule declares neither. Inheriting also keeps the face in one place: `.ui-dropdown__panel` pins it for the portalled case as of 0.25.0, and the row takes it from there rather than naming the token twice. A `<div>` and an `<a>` row are unchanged — all five declarations were already their computed values.', ['Dropdown']],
      ['added', '`stories/dropdown-tag-parity.test.js`, which mounts a row as each of a `<div>`, an `<a href>` and a `<button>` against the browser defaults transcribed out of that measurement, and goes red when any of the five declarations is taken back out. It carries one gap it names rather than skips: JSDOM pins `text-align: center` onto a `<button>` above any author rule, whatever the specificity and whatever the source order, so that declaration is held on the other two tags and by name in the rule all three share.'],
    ],
  },
  {
    v: '0.25.0', date: '2026-08-31',
    changes: [
      ['breaking', 'The kit has a text typeface. `--font-sans` is now IBM Plex Sans and Poppins moves to a new `--font-display`, so headings and brand marks keep the face the deck is recognised by while tables, fields, paragraphs and chat are set in one drawn for reading. Poppins is a geometric display grotesque — wide, round counters, single-storey a, low stroke contrast — and at 13-14px it smears, worst of all in Cyrillic, which is most of what an application built on this kit renders. Reported against 0.23.3 from an admin panel, with a measurement: one dense table, only the text face swapped, mean row height 62.27px to 56.40px, because three of twelve titles stopped wrapping to a second line. Upgrading needs one action from you — the kit bundles no fonts, so a page loading only Poppins now renders all of its text in the system stack behind it. Load both; the snippet is in the readme. To keep the single-family look, write `:root { --font-sans: var(--font-display) }` after the kit stylesheet.', ['Tokens']],
      ['changed', 'Which face an element takes is decided by the element, never by its size. `h1` through `h6` take the display face from `base.css` and everything else inherits the text face from `body`. A size threshold was the alternative and it is worse: it changes a heading\'s typeface halfway through a resize. Two component titles opt out on purpose — `.ui-drawer__title` and `.ui-confirm__title` are panel labels at 15px rather than headings anybody reads — and a brand lockup opts in at any size, including the 13px `.topbar .brand` runs at.', ['Drawer', 'Confirm', 'Topbar']],
      ['changed', '`b` and `strong` are `--weight-semibold` rather than the browser\'s 700. At the 13px a table row and a chat bubble are set at, 700 stops reading as emphasis and starts reading as a filled-in shape. 700 is still there for anything that asks for it by name.'],
      ['changed', 'The Typography page in Storybook shows two scales rather than one, and sets the same 13px paragraph in both faces side by side. Its standfirst read "Poppins across the board — the deck\'s voice. One family, weights 300–700", which is no longer true of the kit it describes.'],
      ['fixed', 'A portalled dropdown panel is set in the text face wherever it lands. `portal: true` (0.24.0) mounts the panel on `<body>`, so what it inherited stopped being decided by the trigger it came out of and started being decided by `<body>` — the same dropdown inside a display-face subtree measured `var(--font-display)` in place and `var(--font-sans)` once portalled. `.ui-dropdown__panel` now names the text face itself, so a flag that positions a panel no longer changes what it is set in. Nothing visible moved in the kit\'s own screens, where every ancestor a dropdown has already resolves to the text face; what moved is that the panel no longer depends on that being true.', ['Dropdown']],
      ['added', 'Two gates over the split. `src/styles/typeface-roles.test.js` sweeps every family declaration in the kit and refuses one that names a family instead of a role, then renders a document and reads the cascade back — a heading resolves to the display face, everything else to the text face, and `b` to the semibold step, each with the rule cut back out so the assertion has to fail without it. `scripts/font-loading.test.js` reads the families out of the tokens and checks that every place in the repository loading a font loads all of them, the readme snippet included, because that is the copy of the list that lives in other people\'s applications.'],
    ],
  },
  {
    v: '0.24.0', date: '2026-08-31',
    changes: [
      ['added', '`direction` on `dropdown()` — `\'up\'` opens the panel into the space above the trigger, `\'auto\'` measures on each open and flips only when there is no room below and more room above. The upward rule releases the kit\'s own `top`, which is the whole defect: `.ui-dropdown__panel` set `top: calc(100% + 9px)` unconditionally, so a page that opened the panel upward by setting `bottom` had both edges pinned and got a box stretched between them — fourteen pixels tall, and every consumer wrote `top: auto` by hand after finding out why. Both offsets now read one `--ui-dropdown-gap`, so the 9px is the same number whichever way it opens. Measured at 1280×800: a menu at the foot of a 249px rail went from 128.8px tall hanging 66px below the fold to 128.8px tall inside it, 9px from the trigger either way.', ['Dropdown']],
      ['added', '`portal: true` on `dropdown()`, for a panel that has to leave its trigger\'s subtree. `wireDropdown()` mounts it on `<body>` as `position: fixed`, writes the trigger\'s viewport coordinates inline and repositions on scroll and resize. `.ui-app__rail` is why: it is `position: sticky` with `overflow-y: auto`, and each of those traps a popover on its own — a non-visible overflow on one axis makes the other non-visible too, so a 304px panel in a 249px rail lost its right edge, and a sticky ancestor opens a stacking context whatever the panel\'s `z-index`, so `--z-dropdown` could not climb out of it and `--z-overlay` did not help either. Reported by a consumer building a workspace switcher at the top of an app rail, with `document.elementFromPoint()` on the panel\'s right edge returning the page\'s `.ui-card`. It returns the panel now.', ['Dropdown']],
      ['changed', 'A portalled panel carries `is-open` on itself. `.ui-dropdown.open .ui-dropdown__panel` stops matching the moment the panel is moved onto `<body>`, so the open state cannot come from the container any more — but `.open` stays on the container, so the chevron, `aria-expanded`, click-outside and Escape are unchanged. Keyboard handling is bound to the panel as well, since a keystroke on a row no longer bubbles to the container, and a panel whose container has been re-rendered away is swept off `<body>` rather than accumulating one per render.', ['Dropdown']],
      ['added', '`src/components/dropdown.test.js`. It reads the placement out of the stylesheet — any panel rule that pins `bottom` must release `top`, every offset must read `--ui-dropdown-gap`, and the rule that opens a portalled panel must not need a `.ui-dropdown` ancestor — and feeds the wiring measured rects for the arithmetic, JSDOM having no layout of its own. Fourteen of its nineteen tests fail on the commit before this one.'],
    ],
  },
  {
    v: '0.23.4', date: '2026-08-31',
    changes: [
      ['fixed', '`data-accent` paints without `data-theme`. Every accent cell required both attributes at once, so a document that set only `data-accent` matched none of them and kept the default purple — the theme toggled and the accent did not. The kit\'s dark theme has never needed an attribute: `tokens.css` declares it on a two-line selector list whose first line is a bare `:root,`. Each accent\'s dark cell now carries that same shape, so the accent is reachable in exactly the states the theme is. Light cells are three attributes wide and still out-specify the new bare line. Reported against 0.23.3 by a consumer building a document outside the app, where the host leaves `data-theme` off to mean "follow the system". That state is dark, not unstyled, and `docs/library.md` now says so under An absent attribute means dark — the kit ships no `prefers-color-scheme` rule, and a host that wants the system preference resolves it in JS and stamps the attribute, which is what ui.apli.tech itself does.', ['Tokens']],
      ['removed', '`--ink`, which was a second name for `--text` and had already stopped agreeing with it. Declared twice and read once — `body { color: var(--ink) }` in `base.css` — while every other rule in the kit reads `--text`. Dark still matched at `#e9e7f0`; light did not, carrying `#1e232b` against `--text`\'s `#1a1e27`, so the body copy on a light page was a shade lighter than every heading beside it. `base.css` now reads `--text` and the alias is gone. A page that referenced `var(--ink)` directly gets nothing and should read `--text`.', ['Tokens']],
      ['added', '`stories/accent-without-theme.test.js`, which mounts the kit with no `data-theme` and judges the cascade by rendering it rather than by matching selector text. It holds three things nothing held before: an unstamped `:root` resolves every semantic token, it resolves them to the same values `data-theme="dark"` does, and each accent paints there. A fourth check keeps the two halves of an accent pair in step — the bare cell ties on specificity with `:root[data-theme="light"]` and wins on import order, so a property a dark cell declares and its light twin forgets would paint a light page with the dark ramp.'],
    ],
  },
  {
    v: '0.23.3', date: '2026-08-19',
    changes: [
      ['changed', 'Five published files stopped carrying a second copy of an argument the documentation already held. This is the tail of the same sweep as 0.23.1 and 0.23.2, and it reads differently: nothing new was written into `docs/specification.md` or `CONTRIBUTING.md`, because every argument cut was already there behind a `why:` pointer the file was carrying. `src/tokens/tokens.css` loses 54 lines of prose — the spacing scale, the ring and the signal ramps each restated a measurement the specification records and the gates assert. `src/components/shell.js` loses 33, `src/components/overlay.js` 13, `src/tokens/accents.css` 10, and `src/styles/table.css` 10, where the argument that `--dense` rounds its spacing tie downward was a second, unproven copy of what `stories/table-rhythm.test.js` already holds under a section reading "The tie-break, held rather than argued for". Each file keeps its `why:` pointers, and `scripts/doc-refs.test.js` resolves every one. No behaviour changed: every edit under `src/` is a comment.'],
    ],
  },
  {
    v: '0.23.2', date: '2026-08-14',
    changes: [
      ['changed', 'The published stylesheets and components stopped carrying arguments in their headers. `src/tokens/tokens.css` explained why a signal colour that becomes a fill takes its own ink — one near-black clears all five signals in dark, while light needs a token of its own because its signals are deepened to read on white — and `src/styles/callout.css` explained why a toast\'s accent, its solid fill and its trailing action are three colours rather than one. Both are now Colour and contrast in `docs/specification.md`, with the measurements that decided them. `src/styles/base.css` argued for the `:where()` in the icon reset, which holds the whole filter at zero specificity so every component rule out-ranks it; written bare it weighs (0,2,1) and beats every `.ui-btn svg` in the kit, which it once did. That is now The reset is a floor in `CONTRIBUTING.md`. `src/styles/motion.css`, `reduced-motion.css`, `confirm.css` and `loading.css` keep a short note and a `why:` pointer each. No behaviour changed: every edit under `src/` is a comment.'],
    ],
  },
  {
    v: '0.23.1', date: '2026-08-14',
    changes: [
      ['changed', 'Two published files stopped carrying their own design document. `src/assets/icons.js` had a 31-line header whose second half was the contributor rules for adding a glyph — naming, grouping, provenance — and those are now Add a glyph in `CONTRIBUTING.md`, with the incident behind the one-group rule (`card`, `chart` and `doc` each filed under two headings until #199) written out rather than alluded to. `src/components/loading.js` had a 43-line header stating what the busy region guarantees, and that is a guarantee a consumer relies on, so it is now Pending and denied states in `docs/specification.md`: one live region that outlives its content, a skeleton that is `aria-hidden`, a `deniedState()` with no role of its own, and no spinner factory. Each file keeps a short note and a `why:` pointer the doc-refs gate resolves. No behaviour changed.'],
    ],
  },
  {
    v: '0.23.0', date: '2026-08-14',
    changes: [
      ['changed', 'Every transition in the kit reads a duration token and an easing token. Twenty-six declarations across six stylesheets wrote their own number instead, at five speeds — `0.15s`, `0.16s`, `0.18s`, `0.2s`, `0.35s` — and thirty-six named a bare `ease`, which is `cubic-bezier(0.25, 0.1, 0.25, 1)` and not the kit\'s `cubic-bezier(0.4, 0, 0.2, 1)`: a second motion vocabulary that looked like the first. The scale they moved onto is the drawer\'s, because the drawer is the one transition whose reasoning was written down — a surface arriving or leaving takes `--dur-med`, a control changing state takes `--dur-fast`, an entrance takes `--dur-slow`. Listed with what each times under Motion in `docs/specification.md`.'],
      ['fixed', 'Two menus in the topbar and the dropdown panel transitioned `all`, which includes `visibility` — a discrete property held at its OLD value for the whole duration, so the menu was still `hidden` in the frame it opened. `transition: 0.18s ease` and `transition: 0.16s ease` name no property at all; all three now name theirs, and every `visibility` in the kit is timed `linear`, which until now only the drawer and the confirm were held to.'],
      ['added', 'Four easing tokens beside `--ease`: `--ease-out`, `--ease-in`, `--ease-sharp` and `--ease-spring`, each aliasing a brand `--easing-*` primitive. `cubic-bezier(0, 0, 0.2, 1)` was written out by hand four times in `motion.css` as a fallback; the fallback is now written once, in `tokens.css`. `--dur-instant` (80ms) joins the duration scale for the same reason.'],
      ['added', 'The reduced-motion net moved to `src/styles/reduced-motion.css`, one copy, and `apliteni-ui/react/css` now ships it too. The React package publishes its own stylesheet, and a consumer who imported only that one got no net — a latent hole rather than a live one, since `react/src` declares no motion today, but the first transition to land there would have shipped unprotected.'],
      ['added', 'A gate over all of it. `stories/motion-tokens.test.js` reads the duration table out of the specification at run time, resolves each token through `tokens.css` into the brand primitive it aliases and checks the milliseconds agree, then sweeps every stylesheet under `src/` and `react/src/` for a transition carrying a literal time or a bare curve, a `visibility` that is eased, or a published entry that ships motion without the net. Ambient loops and choreographed sequences keep their own numbers — a spinner turns until the request answers, and the success check\'s disc, tick and ring are timed against each other — and each says which kind it is and why, at the declaration, in a note the gate parses.'],
    ],
  },
  {
    v: '0.22.0', date: '2026-08-14',
    changes: [
      ['changed', 'A disabled control is now painted, not faded. `opacity` is a group property: it pulls a label and the box under it toward the ground together, so what a reader is left with is wherever that composite lands — a disabled `.ui-btn--primary` measured 1.48:1, white on a washed-out accent, and no disabled control in the light theme reached 3:1. Every disabled rule with a label under it now takes `--disabled-ink` on `--disabled-surface` at full opacity, which composites predictably. Every disabled label in the kit now measures between 5.56:1 and 6.11:1, in both themes.', ['Button', 'Input', 'Nav', 'Dropdown']],
      ['added', '`--disabled-ink`, `--disabled-surface` and `--disabled-border` — aliases onto `--muted`, `--surface-2` and `--border`, so the ramp gains nothing to keep in sync. They are neutral, so a disabled control does not move with the accent and drops the accent by construction, which is most of what makes it read as inert.'],
      ['added', 'The floor is 3:1, and it has a second half. `docs/specification.md#colour-and-contrast` records both. It is not higher because the counter-pressure turns out not to live on this axis: the disabled primary reads 5.56:1 and the enabled one reads 5.70:1, and nobody confuses white on purple with grey on grey. Contrast carries legibility; the paint carries the state. So the guarantee also says a disabled control never shows the pair it shows enabled — the half a control cannot satisfy by looking available.'],
      ['changed', 'The floor gate takes its subjects from every disabled selector in the sheet rather than from every rule that sets `opacity` — a gate keyed on one technique goes silent the moment the technique changes. It measures each subject twice, once as a story renders it and once with the disabled state taken off the element and the cascade read again, and it refuses an `opacity` under a disabled selector that has a label beneath it. The one rule still fading is the switch track, which has nothing written inside it.'],
      ['changed', 'The accessibility floor page\'s disabled gap is retired: the ledger is gone and the ratchet states a real number.'],
    ],
  },
  {
    v: '0.21.0', date: '2026-08-14',
    changes: [
      ['changed', 'The kit has three breakpoints, not six. `860px` is where the page stops holding three tracks, `720px` is where the shell folds, and `560px` is one column — each a viewport class with what changes at it, listed under Breakpoints in `docs/specification.md`. The three values that belonged to a single surface each moved to the step above the one they wrote: the footer\'s second collapse from 460 to 560, the version switcher\'s label from 600 to 720, and the site\'s split hero from 760 to 860. Folding up rather than to the nearest step is the point — a layout that reflows at a wider viewport has more room than it had, never less, so nothing lost space to the tidy-up.'],
      ['added', 'A gate over the convention. `stories/breakpoints.test.js` reads the three steps out of the specification\'s own table at run time — not a second copy of the list — and fails any `@media` prelude in `src/styles/` or `site/` whose px value is not one of them. It holds the list from both ends: a step nothing queries fails too, so the table cannot grow a row to legalise a stray. Subjects are swept rather than listed, from raw text, which is what reaches the stylesheet inside `site/chrome.mjs`\'s template literal; `site/public/` is build output and is never read.'],
      ['changed', 'The Layout and density guideline states the position on the two coincidences: `560` is also `--panel-lg` and `860` is also `--measure`, and nothing marks it at the query. A breakpoint asks about the viewport and a token bounds a box — the numbers match today and neither follows the other.'],
    ],
  },
  {
    v: '0.20.0', date: '2026-08-14',
    changes: [
      ['fixed', 'The three controls that sat under the kit\'s 24 × 24 CSS px target floor now reach it, and two of them did it without being redrawn. WCAG 2.5.8 measures the target, not the ink: a pointer landing on a control\'s `::before` hits the control, so `.ui-toast__close` and the `.ui-check` input keep the 19 × 19 boxes they are drawn at and each carries a centred 24 × 24 overlay — 2.5px of overhang on every side, against 12px of gap to the toast\'s action and 11px to the checkbox\'s own label. `.ui-snippet__copy` took a real box instead: it was 0.56px short, and a `min-height` nobody can see beat an overlay nobody can measure.', ['Targets']],
      ['changed', 'The target gate measures what a pointer can land on, not what the stylesheet draws. Every `sel::before` / `sel::after` rule is probed onto `sel`, and a control\'s box is the union of its border box and the pseudo-elements it generates — sized from a declared width and height, or from insets against the padding box, which is where the checkbox\'s 1.5px border is the difference between a 24px overlay and a 21px one. Without it a hit-area fix would have failed every test in that file and passed none.'],
      ['added', 'Three tests that keep the new path honest: one fails if no control in the kit reaches the floor through an overlay (so the machinery cannot rot untested), one refuses an out-of-flow pseudo-element whose size the gate cannot read (so nothing hides behind an unmeasurable target), and one derives the floor page\'s gap badge from the exemption list rather than letting the two be written separately. The gate now also states two blind spots it did not have: where an overlay sits, and whether an `overflow: hidden` ancestor clips it.'],
      ['changed', 'The accessibility floor page\'s target-size gap is retired — the exemption list is down to one entry, and that one is a story\'s own demo topbar rather than kit code.'],
    ],
  },
  {
    v: '0.19.1', date: '2026-08-14',
    changes: [
      ['added', '`docs/specification.md` — what the kit ships, what it guarantees, what a consumer may rely on, and what it deliberately does not do. Every statement in it is held by a gate that already runs on `npm test`, so a guarantee that stops being true turns a build red rather than becoming a lie in a document.'],
      ['changed', '`docs/adr/` is gone, and its reasoning was split by who needs it. What the kit guarantees went to the specification; how the repo works — how a gate finds its subjects, how a number gets pinned, how a rule is proven by the mutation that kills its case — went to `CONTRIBUTING.md`, because it never reaches a consumer at all. Why a shape is the way it is stays in the issue that settled it. No code behaviour changed: every edit under `src/` is a comment pointing somewhere new.'],
      ['added', 'A gate over documentation references. `scripts/doc-refs.test.js` sweeps every file git tracks, finds anything written as a citation, and resolves it — the file has to exist and an anchor has to be a heading in it. A broken `why:` is worse than no `why:`, because it reads as though the reason exists. Subjects are discovered rather than listed, so a citation joins by being written.'],
    ],
  },
  {
    v: '0.19.0', date: '2026-08-14',
    changes: [
      ['changed', 'Every stroked glyph in the kit is drawn at 1.5 CSS px or wider. The stroke-width rule drew that line and ruled on the two glyphs that carry a status; ten of the other thirteen were under it, `.ui-snippet__copy` at 0.98 and `.ui-nav__crumb .ui-nav__ic` at 1.06. Eighteen rules were widened or given a stroke they had been borrowing, all landing between 1.51 and 1.60 — the band the status glyphs already sat in, so a glyph\'s weight no longer depends on which slot it fell into. No token moved: widening a stroke changes how much of a colour reaches the eye, not which colour it is.'],
      ['added', 'A gate that renders the kit rather than reading it. Two shapes hide from a stylesheet scan — a box override that inherits its stroke from a rule seventy lines up, and a stroke that comes from `icons.js` rather than any stylesheet — so the subjects are elements: every story is built into a DOM and every glyph measured with the cascade resolved. It also refuses a sizing rule no story renders, which is how `.ui-feature__icon` turned out to be shipping with no specimen anywhere. `docs/specification.md#icons-and-glyphs` records the rule and why a second bar for a control\'s glyph was rejected.'],
      ['added', '`.ui-field__error` sizes its glyph. The error row rendered an icon and left it at the reset\'s `1.1em`, so its box followed whatever font-size it landed in.'],
    ],
  },
  {
    v: '0.18.0', date: '2026-08-14',
    changes: [
      ['fixed', 'The focus ring is the accent at full opacity, and it is declared once. Every ring in the kit was a hand-written `rgba()` at 0.25–0.38 alpha — one per theme in `tokens.css` and six more in `accents.css` — and measured against the grounds it actually lands on, not one of the eight theme × accent cells cleared 3:1. The spread ran 1.35:1 (light Emerald) to 2.21:1 (dark Emerald), against the 3:1 WCAG 1.4.11 asks of a focus indicator. Alpha was the whole gap: `--ring: 0 0 0 3px var(--accent)` clears everywhere, worst cell 4.22:1. Re-pointing `--accent` now re-points the ring, so a sub-theme cannot forget one.', ['Focus']],
      ['changed', 'Seven `--ring` declarations are gone — the light one in `tokens.css` and all six in `accents.css`. A sub-theme re-points the accent family and inherits the ring, which is the shape the rest of that file already had. `docs/specification.md#the-focus-ring` records the decision and the eight measurements behind it.'],
      ['added', 'The accessibility floor page states a ring floor of 4.22:1 rather than a gap. `stories/guidelines/accessibility-floor.test.js` sweeps all eight theme × accent cells with the accents discovered from `accents.css`, holds the ring to a hard 3:1, and fails if `--ring` is ever declared more than once anywhere under `src/` — so the seven that were deleted cannot come back one file at a time.'],
    ],
  },
  {
    v: '0.17.0', date: '2026-08-14',
    changes: [
      ['changed', 'The table\'s row rhythm reads the spacing scale — the base rhythm as much as `--dense`, because the base was as off-scale as the modifier it was being compared against. Six numbers move: the header\'s under-padding 11px → `--space-3`, the body cell 15px → `--space-4`, the dense header and cell 14px → `--space-3` across and 10px → `--space-2` down, and the hover row inset 6px → `--space-2`. A base row is 2px taller and a dense row 4px shorter, which makes the modifier more distinct rather than less: a dense row was 77% of a base row and is now 67%, saving 369px over a twenty-row ledger where it saved 249px.', ['Table']],
      ['changed', 'Three of those numbers sat exactly between two steps — 14 between 12 and 16, 10 between 8 and 12, 6 between 4 and 8 — and where they did the tie goes to what the value is for. `--dense` rounds down, because a modifier that exists to fit more rows spends its own distinction by rounding up; the hover inset rounds up, because what it buys is clearance from a container\'s edge and clearance rounds away. `docs/specification.md#spacing-and-rhythm` records the rule, and why no `--row-*` scale was invented for it.'],
      ['added', 'A gate over the table\'s box spacing. It reads the steps out of the token file rather than repeating them, discovers every padding, margin and gap in the sheet rather than listing them, and holds the tie-break itself: `--dense` has to stay tighter than the rhythm it modifies, which a tie rounded the other way would have quietly ended with every other check still green. The Layout and density page stops recording a gap it no longer has — its `except` says what the modifier\'s steps are.'],
    ],
  },
  {
    v: '0.16.0', date: '2026-08-14',
    changes: [
      ['added', 'Two scales for everything under the reading column, and the unit picks which one you are on. A box that holds a component takes `--panel-sm|md|lg` (320/420/560px); a box that holds a line takes `--prose-caption|lede|body|dense` (44/54/62/72ch), plus `--prose-display` (14ch), which is not a measure but where a display headline rags. Neither scale is new: the drawer has shipped sm/md/lg at exactly those three values since it was written, and `--confirm-w`, `.ui-auth__card` and the toast each wrote one of them out again — so the two 420s the kit was asked about were three. Prose steps are named for what is being read rather than sized s/m/l, because a writer knows which of those they are writing.'],
      ['changed', 'Five widths moved, none by much: the toast and its stack 400px → 420px (`--panel-md`), `.ui-section-head` 620px → 560px (`--panel-lg`), the feedback confirmation line 38ch → 44ch, the hero subtitle 52ch → 54ch and the shell subtitle 60ch → 62ch. Two more were prose bounded in px and are now bounded in characters: `.ui-empty__sub` (340px) and `.ui-denied__sub` (380px) are both `--prose-caption`, which is what they measured to at `--text-sm` — the same sentence, in the same shape of component, previously written two ways. Thirteen of the eighteen declarations reconciled did not move at all.', ['Toast', 'Empty', 'Denied', 'Feedback', 'Hero', 'Shell']],
      ['changed', 'The measure gate\'s floor is the smallest panel step rather than `--measure`, and it is still read out of the token file rather than written into the test — add a step below 320px and the floor follows it down. A bare `Nch` in a `max-width` now fails the same way a bare `Npx` at or above the floor does, and both failures name the nearest step. The paragraph that explained why the floor sat at the reading column is deleted rather than corrected: it argued for a state of affairs this release ends.'],
      ['fixed', 'The gate reads `style="…"` attributes as CSS. `site/index.html` carried a reading column as an inline `max-width` of 840px on a plain div — a page-scale literal the sweep could not see, because it opened `<style>` blocks and nothing else. It is `--measure` now, as is the changelog page\'s own 820px wrapper. Finding the hole also cost a regex fix: a declaration value allowed to cross a quote ran out of one attribute and swallowed the twenty lines of markup after it, `max-width` included.'],
      ['added', 'A written position on breakpoints, which is the one width a token cannot express — a media query cannot read a custom property. The kit takes a convention over a build step: the six literals stay literal under a documented list with a gate over it, rather than putting a compiler between the source and the stylesheet a consumer reads. `docs/specification.md#boxes-below-the-page` records why, and what `@custom-media` would have settled.'],
    ],
  },
  {
    v: '0.15.0', date: '2026-08-14',
    changes: [
      ['changed', 'The two glyphs that carry a status are stroked heavier: the callout icon goes 1.8 → 2.1, the toast check 2 → 2.8. A stroke-width is stated in the glyph\'s own 24-unit box, so what a reader sees is `stroke-width × box ÷ 24` — the callout icon was drawing at 1.35 CSS px and the toast check at 1.08, and under 1.5 CSS px a stroke cannot put three quarters of its colour into any device pixel row at 1×. WCAG 1.4.11 asks 3:1 of a *graphic*, which is the right bar for a graphic; the ruling is that a stroke has to be wide enough to be one, and below that width the mark is optically a text stem and takes the 4.5:1 text bar instead. Both are now over the line, so 3:1 means what it says.', ['Callout', 'Toast']],
      ['fixed', 'The callout icons take the text-grade `--chip-*-ink` rather than the raw signal token. In the light theme the raw signal is a graphic colour and not one a stroke can be read in — the warn icon measured 3.10:1 on its own wash — and the chip inks are the same five statuses at text grade, which is the reasoning the toast\'s trailing action has carried since 0.9. In the dark theme the two are the same value by construction, so only the light theme moves. No token value changed.', ['Callout']],
      ['fixed', 'A neutral toast\'s check is legible. `--toast-on` for neutral was `--strong`, which put white on a `--muted` circle in dark (3.11:1) and near-black on it in light (3.16:1) — the two worst pairs in the kit. It is `--signal-solid-ink` now, because the neutral circle is `--signal-solid-neutral`: one fill, so one ink, and the same pair the solid toast already chose. 6.29:1 and 6.11:1.', ['Toast']],
      ['added', 'A gate over twenty pairs — two glyph families × five statuses × both themes — each held to the bar its own stroke earns. It discovers its subjects from the stylesheet rather than from a list: the families by scanning for a stroked `__icon`, the statuses by the tokens their rules declare. The five-status list the solid-toast gate used to carry is discovered now too, and a status that declares only some of its five paint tokens fails instead of falling through to whatever is in scope. `docs/specification.md#icons-and-glyphs` records why 1.5 CSS px, and why 4.5:1 could not simply be declared instead.'],
    ],
  },
  {
    v: '0.14.0', date: '2026-08-14',
    changes: [
      ['added', '`busyRegion({ label, readyLabel, busy, body, lines })` and `setBusy(root, { busy, message, body })` — a screen\'s pending state, and the first thing in the kit that announces one. The shape is the point: the region is rendered once and outlives the fetch, and `setBusy()` swaps its body and rewrites the visually-hidden line already inside it. A `role="status"` inserted into the document *together with* its text announces nothing on several screen readers, so the obvious version of this — render the loading markup, then replace it with the loaded markup — is silent in exactly the case it was written for. It reuses the `role="status" aria-live="polite"` pair `toast()` and `success()` already carry, and a gate now fails any `aria-live` in the kit that is not polite, and any `role="alert"` at all.', ['Loading']],
      ['added', '`skeleton({ lines, width, height, radius })` and `skeletonTable({ rows, cols, head })` — placeholder shapes that reserve the layout that is coming, so the page does not jump when the rows land. `lines` takes a count or an array of widths. Both are `aria-hidden` throughout, because a shimmer is a picture of content rather than content, and both reuse `.m-skeleton` from the motion library — so there is one shimmer in the kit and reduced motion is already handled. There is deliberately no spinner factory: `.ui-btn__bars` and `.ui-fbspin` already spin, each owning its context, and at screen scale a skeleton says more anyway — it says what shape is coming.', ['Loading']],
      ['added', '`deniedState({ title, sub, need, actions, icon })` — the 403, drawn in `emptyState()`\'s layout language, because to a reader the two are the same event: what you came for is not here. The lock says which one. `need` names the missing scope verbatim (`reports.read`), since a reader who can name what they lack can ask for it, where "insufficient permissions" sends them to a ticket to find out what to ask for. It carries no live region of its own — dropped inside a `busyRegion()` it is announced as how the fetch resolved, and two regions racing one event is how a screen says things twice.', ['Denied']],
      ['added', '`.ui-sr`, the visually-hidden utility the kit did not have. Its message is for assistive tech only; the sighted reader is already looking at the skeleton.'],
      ['added', 'React takes `busy`. `<Button busy>` sets `aria-busy`, disables, and draws the kit\'s bars — the same ruling `button()` has made since day one, which no React component could express until now. New `Skeleton`, `SkeletonTable`, `BusyRegion` and `Denied` alongside it. `<BusyRegion>` announces by staying mounted across the transition; unmounting it and mounting the loaded view in its place is the same silent bug in JSX clothing, and the tests on both sides assert the region element survives.', ['Button', 'Loading', 'Denied']],
      ['fixed', 'The Guidelines / The full state set page stops declaring this a gap. Its `loading` rule carried an `unmet` marker — rendered as a *Gap #128* badge on the guidelines overview — saying the kit had no screen-scale pending state to photograph. It now carries the do/don\'t pair it said could not be drawn, and the do side is a real live region, so a screen reader on that page hears the thing the rule is about.'],
    ],
  },
  {
    v: '0.13.0', date: '2026-08-13',
    changes: [
      ['changed', 'The kit\'s page container is 1120px, down from 1180px. `.ui-container`, `.topbar__in` and `.ui-footer__in` all read one token now, and every page built from them is 60px narrower. The number is not new — it is what ui.apli.tech has always been, and the site got there by overriding the kit\'s own topbar back down, a line of CSS it paid to disagree with the component it borrows. Because nothing in the kit argued for 1180, that override was the only recorded intent there was. If you want the old width, set `--container: 1180px` on `:root` and every one of those surfaces follows.', ['Container', 'Topbar', 'Footer']],
      ['added', '`--container` and `--measure` — the two widths a page actually has. `--container` is the page, gutter to gutter. `--measure` (860px) is the reading column *inside* a track that already has a sidebar beside it, which is what `.ui-app__main` takes. Because they are different axes, one never substitutes for the other: a shell whose main column is `--container` has no sidebar. Counting only page-scale values, the kit held ten different numbers before this and no token for any of them.'],
      ['fixed', 'The app shell states its reading width in one place. `shell.js` carried its own `860px` beside the same number in `layout.css`, and a test compared the two strings to keep them true — two sources with a guard, not one source. Pass no `maxWidth` and the shell now writes no property at all, so the stylesheet resolves to `--measure`. An unusable value removes the property rather than passing it on, which matters more than it sounds: a custom property accepts any token stream, so a bad one is a *valid* declaration that makes `max-width` invalid at computed-value time and drops the column to the full track. Once you pass an explicit `maxWidth`, it works exactly as before.', ['Shell']],
      ['added', 'A gate fails on a literal page-scale `max-width` anywhere in `src/styles` or the site. It finds its subjects by scanning the property rather than reading a list of files, so a new stylesheet is covered by existing, and its floor is read out of `--measure` rather than written into the test. A media query is not a subject, because a breakpoint is a question about the viewport rather than a width given to a box. So a test says exactly that, against a live breakpoint sitting on the floor itself.'],
      ['added', 'A Guidelines / Layout and density page: the two widths, why one source beats two held in step, and where density comes from. The kit has no density mode and that is the position, not an omission — the spacing scale is the control. `.ui-table--dense` is the one component-local exception, and the page says plainly that its own numbers are literals rather than steps.'],
    ],
  },
  {
    v: '0.12.0', date: '2026-08-13',
    changes: [
      ['fixed', 'A status glyph and a close button no longer share a shape. A danger `toast()` rendered the same bare `x` twice — once on the left meaning *this failed*, once on the right meaning *make this go away* — and the reader had to work out which from position. Status now uses the circled glyphs the kit was already shipping and never using: `circleCheck`, `circleX`, `circleAlert`. The bare `x` belongs to the close button alone. The rule underneath is worth knowing if you pick your own: a circled glyph is a state the system reports, a bare glyph is an action you can take. `info` and `neutral` are unchanged, and anything you pass as `icon` still wins.', ['Toast', 'Callout']],
      ['added', '`iconOnlyAllowed` — the closed list of actions a control may drop its visible label for: close or dismiss, copy, overflow menu, expand or collapse. Every kit glyph is `aria-hidden`, so an icon-only button has always been forced to name itself; that said a nameless one cannot ship, never that a wordless one should. This does. A gate reviews the kit\'s own call sites against it, and found one — a settings cog in the button stories — on its first run.', ['Button']],
      ['added', '`iconMeanings` — what a glyph means when a component picks it for you rather than you naming it, covering the eight the kit wires to semantics.'],
      ['fixed', '`card`, `chart` and `doc` are declared once each. The `COMMS` group re-declared all three with byte-identical path data, so the icon catalogue filed one glyph under two headings and the file carried three lines nobody could tell from a real glyph. Nothing you call changes — `icon(\'card\')` resolved the whole time — and a gate now fails a name declared in more than one group.', ['Icons']],
      ['added', 'A Guidelines / Iconography page: when a control may go wordless, what a glyph means, and what adding one costs — naming, which group it belongs to, and where its path came from. Each rule links the gate that holds it.'],
    ],
  },
  {
    v: '0.11.4', date: '2026-08-13',
    changes: [
      ['fixed', 'A toast\'s trailing action is readable on every status. It was painted in the status accent — a colour picked for a 3px rule and a 22px icon circle, not for text — so in the light theme a warn action measured 3.29:1 on its own wash where AA asks 4.5:1, and success, info and danger were short on at least one style each. The action takes the kit\'s text-grade signal inks now, the same ones the chips are set in. Its hover has changed direction too: it used to wash the ground with a second helping of the status colour, which moved the ground *towards* the ink it has to clear, so a hovered action read worse than a resting one. It lifts towards the page instead. The dark theme is unchanged, because there the two inks are already the same value. Nothing you pass to `toast()` changes.', ['Toast']],
      ['added', '`--toast-action-ink` — the trailing action\'s colour is its own custom property, set per status alongside `--toast-accent`. Override it if you want an action in a colour of your own; `--toast-accent` still drives the marker, the icon circle, the timer bar and the outline border.', ['Toast']],
      ['fixed', 'The React data table\'s sort caret is legible. It painted the muted ink at half opacity, which took a glyph carrying the sort direction down to 2.16:1 in the light theme — under half the AA floor. The opacity is gone, so the caret is the muted ink at full strength.', ['DataTable']],
    ],
  },
  {
    v: '0.11.3', date: '2026-08-13',
    changes: [
      ['fixed', 'The accent picker shows Nebula as the violet you actually get. Its swatch was a fixed gradient, and it stopped tracking the tokens in 0.11.0 when the default accent lifted to clear AA on its own wash — so the chip you pressed to choose the kit\'s default accent held neither colour that accent resolves to. Phoenix, Ocean and Emerald were always right and are unchanged. Every swatch is now made of its own accent\'s ramp, and a test holds it there rather than a line in the contributing guide.', ['Footer']],
    ],
  },
  {
    v: '0.11.2', date: '2026-08-13',
    changes: [
      ['added', 'The kit has guidelines — five pages in Storybook under Guidelines, with an index that says what each covers and how many of its rules the kit actually meets. Colour and theming, the full state set, which component suits which job, microcopy and tone, and destructive actions. Every rule shows a live do and don\'t built from real components, and cites the lines of the kit that implement it.'],
      ['added', 'Two rules say the kit does not meet them yet, and name the issue tracking each. A guideline nobody has implemented is worth more written down and marked than left out, and worth less than nothing asserted as if it were true.'],
      ['changed', 'The design rules left `CONTRIBUTING.md`. Tokens over literals, signal colours staying constant, the states a component owes, both themes and all accents, and a control naming the state it is in — all five are in the guidelines now, and deleted from the contributing guide rather than copied. Nothing you install changes; if you had bookmarked a golden rule by its number, it has a page instead.'],
      ['fixed', 'The wording guideline cited a button labelled `Revoke`, which fails the test the rule states out loud — does the label make sense on its own? The example screen says `Revoke access` now, and the rule cites the kit\'s own confirmation first.'],
    ],
  },
  {
    v: '0.11.1', date: '2026-08-13',
    changes: [
      ['fixed', 'A drawer stops taking clicks the moment it starts closing. Its panel and scrim stayed hit-testable for the length of the close fade, so a click landing in that window still reached a control inside the panel and ran your handler a second time — a double-click on a drawer\'s own button was enough. The closing animation is unchanged.', ['Drawer']],
      ['fixed', 'Where two overlays are rendered open together, the one you can see is the one Escape closes. A confirm paints a layer above a drawer, but the keyboard went to whichever root came later in the markup — so a confirm written before the drawer it asks about went inert while Escape closed the drawer underneath it. Opening a confirm over a live drawer with `openConfirm()` was never affected.', ['Drawer', 'Confirm']],
    ],
  },
  {
    v: '0.11.0', date: '2026-08-12',
    changes: [
      ['added', '`appShell()` — the kit has one page shell now. A full-height rail built from the kit\'s own `sidebarNav()`, beside exactly one `<main>`. The breadcrumb trail is yours: pass `crumbs` and it renders `breadcrumbs()`, pass nothing and there is no trail. The topbar is off unless you ask for one.', ['Shell']],
      ['added', 'The rail folds to icons below 720px instead of disappearing. Every row keeps its accessible name at every width, and the icon target measures 45×44px on a phone. Before this, a 375px screen got three navigation links, none of them reachable.', ['Shell']],
      ['breaking', '`accountShell()` is now a preset over `appShell()`, and its markup changed. It emits a `<main>` where it emitted none, its sidebar is `sidebarNav()`\'s `.ui-nav--side` rather than a hand-written `.ui-side`, and its breadcrumb comes from `breadcrumbs()`. Every option it took it still takes, including the old `[id, icon, label, href, target]` nav tuples — but CSS or scripts of yours that reached for `.ui-side`, `.ui-shell`, `.ui-shell__crumbs`, `.ui-shell__page` or `.sub` no longer find anything, because nothing emits that markup any more. The shell has also stopped emitting `.ui-card-stack`; that rule is still in `card.css`, so markup of your own carrying the class still spaces the same way. Inside the shell the card stack is `.ui-app__body` and the page subtitle is `.ui-app__sub`.', ['Shell']],
      ['breaking', '`ACCOUNT_NAV` is a list of `{ id, icon, label }` objects, not `[id, icon, label]` tuples. `sidebarNav()`, `appShell()`, `accountShell()`, `topbar()` and `accountMenu()` all read either shape, so passing it anywhere the kit takes a nav still works — but if you spread or destructure its entries yourself, that is the line to change.', ['Shell']],
      ['breaking', 'A nav label that arrives pre-escaped now shows its entity. Every nav primitive escapes what it is given, so `[\'x\', \'gear\', \'Access &amp; agents\']` renders as `Access &amp;amp; agents`. The kit taught this pattern: the `ACCOUNT_NAV` it shipped spelled that ampersand as an entity, because the old shell interpolated raw HTML. Pass raw text — `Access & agents` — wherever you were passing entities.', ['Shell']],
      ['breaking', '`crumb` is escaped rather than inserted as HTML. It used to land inside a `<b>` the shell wrote itself; it now goes through `breadcrumbs()`, which escapes every label. `crumb: \'<em>Payouts</em>\'` rendered italic before and renders the tags as text now. There is no markup slot in the trail — pass an item with an `icon` to `appShell({ crumbs })` if you need one.', ['Shell']],
      ['changed', '`sub` is a `<p>`, not a `<div>`. It is still a trusted-HTML slot, but a `<p>` closes at the first block element the parser meets, so `sub: \'<div>block</div>\'` now leaves a stray `</p>` behind it. Inline markup is unaffected; anything block-level belongs in `body`.', ['Shell']],
      ['removed', 'The `.ui-side` and `.ui-shell` rules are gone from the stylesheet. Nothing emitted that markup any more.', ['Shell']],
      ['fixed', 'A rail label keeps the kit\'s own colour under a host stylesheet\'s `a:link`. The kit\'s declaration was `.ui-nav__item` at (0,1,0) and a host\'s `a:link` is (0,1,1), so every resting rail label took the host\'s link colour. The breadcrumb link is held the same way.'],
      ['fixed', 'A badged rail row is announced with its count. The row carries an accessible name at every width now, and a name built from the label alone had narrowed "Pending 3" to "Pending".'],
      ['fixed', 'The signed-in reader sits beside the rail\'s navigation, not inside it — a screen reader was announcing the reader\'s email address as a navigation entry.'],
      ['fixed', 'A shell no longer names a reader you did not give it. Where a caller passed only an address, or no account at all, the topbar menu filled the gap with the kit\'s own demo person — so a page could name your reader in the rail and somebody else beside it.', ['Shell']],
      ['changed', 'The account menu\'s initials come from the display name when there is one, and from the address otherwise. They were read from the address alone, so the rail and the menu could draw two different marks for one reader.'],
      ['changed', '`ACCOUNT_NAV` spells its ampersand as `&` rather than `&amp;`. If you read that constant\'s labels yourself, they are raw text now.'],
    ],
  },
  {
    v: '0.10.0', date: '2026-08-12',
    changes: [
      ['breaking', '`drawer({ open: true })` now really opens — the page behind goes inert, Tab is trapped in the panel, Escape closes it. A sidebar or an inline specimen that should sit there open wants `specimen: true`. `confirm()` reads `open: true` the same way.'],
      ['added', '`confirm()` — the question a page stops for before something irreversible. A focus-trapped modal over a scrim; Escape cancels, and it opens on the safe answer, so a reader who hits Enter out of habit keeps what they have.'],
      ['fixed', 'Opening a drawer puts the reader inside it. Focus was asked for while the panel still counted as hidden, so it went nowhere — and the page behind was already hidden from assistive technology by then, leaving the reader on the document body with nothing to read and nothing to tab to.', ['Drawer']],
      ['fixed', 'Two overlays open at once — two drawers, or a confirm over a drawer — no longer hide the whole page from assistive technology until a reload. Closing them out of order used to leave everything outside them `inert` for good.'],
    ],
  },
  {
    v: '0.9.1', date: '2026-08-09',
    changes: [
      ['changed', 'Nothing you can see. 0.9.0 shipped, and then two comments inside shipped stylesheets changed without a version bump, so the package on npm stopped matching the source. This release makes them agree again — upgrading from 0.9.0 changes no rendering and no API.'],
      ['fixed', 'Releasing no longer depends on someone remembering to do it. A version bump landing on `main` is tagged, gets a release whose notes are its changelog entry, and is published. A pull request that changes what the package ships without bumping the version fails, and a daily check opens an issue if what is on npm and what is on `main` disagree for more than a day. Silence used to look the same as success; it no longer does.'],
    ],
  },
  {
    v: '0.9.0', date: '2026-08-09',
    changes: [
      ['breaking', 'The inline-icon reset is a floor again, not a ceiling. `svg:not([width]):not([height])` counted both attribute selectors and weighed (0,2,1), so it quietly outranked every `.ui-btn svg`-shaped rule — in the kit and in your own CSS. It is now `svg:where(:not([width]):not([height]))` at (0,0,1). Any icon rule of yours that was silently losing to it now applies, so icons you sized yourself will change to the size you actually asked for.'],
      ['added', '`footer()`, `success()`, `successCheck()` and `wireSuccess()` are reachable from the package root. They were in the source and missing from the entry point, so nobody could import them.'],
      ['added', '`empty.css` ships through `/inline`, so the empty-state styles reach anyone using the inline stylesheet rather than the built one.'],
      ['fixed', 'The theme control reports the theme you are in, never the one a click would produce — in the glyph and in the accessible name, which is rewritten whenever the state changes.', ['Topbar']],
      ['fixed', '`--pink` clears the surfaces it is drawn on in both themes, and the live pill and info badge clear AA in light.', ['Badge', 'Callout']],
      ['fixed', 'A glow wash is a tint of the colour it carries. The values that had drifted are back in line and a test holds them there.'],
      ['fixed', 'The danger nav row is quiet at rest and turns `--pink` on hover, which is what the destructive-actions guideline says it should do.'],
      ['changed', 'Colour contrast is measured rather than reviewed by eye. Every story is mounted per theme against the real stylesheets, and each text-owning element is measured against the background actually composited beneath it. Pairs that stay below the bar are recorded with a written reason rather than left to be rediscovered.'],
    ],
  },
  {
    v: '0.8.1', date: '2026-08-07',
    changes: [
      ['fixed', 'The zebra table recipe insets its own end cells, so a striped row no longer runs into the container border.', ['Table']],
      ['fixed', 'The audience switcher on the homepage announces itself as a tablist and then behaves like one — roving tabindex, arrow keys, `aria-selected`.'],
      ['fixed', 'The Storybook toolbar selector works again, and the workbench stops composing stories from outside the kit.'],
      ['fixed', 'Releases publish again. `npm publish` was handed the tarball as a bare `a/b` path, which npm reads as owner/repo shorthand, so every publish resolved a repository instead of the file and died on a public-key error.'],
    ],
  },
  {
    v: '0.8.0', date: '2026-08-07',
    changes: [
      ['added', 'React components ship as `@apliteni/apliteni-ui/react` — Button, Badge, Card, Icon, Modal and DataTable, with their own stylesheets and stories. The vanilla kit is unchanged and remains the source of truth for tokens.'],
      ['added', 'Guidelines are a place in Storybook now, starting with destructive actions. Each rule cites the lines of the kit that implement it, and a test fails the build when a cited line drifts.'],
      ['added', 'Storybook flips theme in one click instead of through a dropdown.'],
      ['fixed', 'Light-mode Phoenix and Emerald were deepened to meet WCAG AA. Both failed as text and as a button fill.'],
      ['fixed', 'Danger is always `--pink`, and colour comes from tokens rather than from literals scattered through the components.'],
      ['fixed', 'Field errors are connected to their fields, decorative icons are hidden from assistive technology, every icon-only control has a name, and the accessibility gates that were meant to catch all of this actually run.', ['Inputs']],
      ['changed', 'The icon set is unified on canonical Feather/Lucide glyphs, so the same idea is the same drawing everywhere.'],
      ['changed', 'Storybook 8 → 10 and Vite 5 → 6.'],
    ],
  },
  {
    v: '0.7.2', date: '2026-07-24',
    changes: [
      ['changed', 'Relicensed as MIT (was proprietary/UNLICENSED). The package is published on public npm, so MIT matches how it can actually be used — install and use it freely across your products.'],
    ],
  },
  {
    v: '0.7.1', date: '2026-07-24',
    changes: [
      ['fixed', 'Table row hover no longer collides with its container’s border — `.ui-table--hover` now draws the highlight as an inset, rounded pill (a few px clear of the edge) instead of a full-bleed rectangle. Dense/zebra ledgers keep their existing full-bleed tint.'],
      ['changed', 'Homepage polish: code-block Copy buttons morph a copy glyph into a checkmark on success (reduced-motion swaps instantly), bento icon tiles use larger crisp glyphs, and the footer gets a visible link hover plus an Apliteni → apliteni.com link.'],
    ],
  },
  {
    v: '0.7.0', date: '2026-07-24',
    changes: [
      ['added', 'Tabs component — `tabs({ items, active, name })` renders an accessible tablist + panels (framework-agnostic HTML string); wire it with `initTabs()`. Full WAI-ARIA pattern: roving tabindex, Arrow/Home/End keys, aria-selected and aria-controls wiring. New Components → Tabs story.'],
    ],
  },
  {
    v: '0.6.1', date: '2026-07-23',
    changes: [
      ['changed', 'Theme toggle is now a single icon-only switch — a compact sun/moon button (no "Light/Dark" text). Keeps its `aria-label`, so the accessible name is intact. Affects `topbar({ theme: true })` and the site chrome.'],
    ],
  },
  {
    v: '0.6.0', date: '2026-07-23',
    changes: [
      ['removed', 'Aurora background — the `aurora()` component and the `.ui-bg-aurora` backdrop are gone. Nothing in the kit used them, so they were dead weight. The ambient `.ui-glow` blobs and the other backdrops (spotlight, accent wash, grid, dots) stay. Removing a public export is a breaking change — hence the minor bump.'],
      ['added', 'Homepage bento shows more of the kit — live Icons and Motion cells — and its blocks read as distinct panels (per-cell hue, no card hover).'],
    ],
  },
  {
    v: '0.5.0', date: '2026-07-23',
    changes: [
      ['added', 'Motion library — a small, token-driven set of reusable effects as plain classes: entrances (`.m-fade-in`, `.m-slide-up/-down/-left/-right`, `.m-scale-in`, `.m-blur-in`), micro-interactions (`.m-lift`, `.m-press`, `.m-skeleton`), attention (`.m-pulse`, `.m-shake`, `.m-draw`) and staggered scroll reveals (`[data-reveal]` + the optional `initReveal()` hook). Demoed in Foundations → Motion with a live token table and a Replay playground.'],
      ['added', 'One global `prefers-reduced-motion` rule that neutralises every animation and transition in the kit — closing gaps where the badge pulse and smooth scroll were previously unguarded — while letting one-shots settle on their final frame.'],
      ['changed', 'Motion now speaks the Apliteni brand vocabulary — durations and easings sync from design-system (`--duration-*` / `--easing-*`); the kit’s `--dur-*` / `--ease` alias onto them, with new `--delay-1…5` for staggering.'],
      ['changed', 'Landing “Built for people and agents alike” grid rebuilt as a bento with per-cell hues and no card hover, so the blocks read as distinct and the real controls inside each one no longer fight a card-level animation.'],
    ],
  },
  {
    v: '0.4.0', date: '2026-07-21',
    changes: [
      ['added', 'Ambient aurora background — `aurora()` lays down drifting glow blobs plus an optional paper grain. Colours read the accent tokens, so it re-themes across Nebula, Phoenix, Ocean and Emerald with no per-app CSS. Full-bleed `fixed` mode; `prefers-reduced-motion` respected.'],
      ['added', 'Accessibility CI gate — every story runs through axe (WCAG 2.0/2.1 A + AA) under `npm test`, so violations can’t regress.'],
      ['added', 'Apliteni seedling on the Brand page alongside the kit prism, each with a size ramp.'],
      ['fixed', 'Resolved the WCAG A/AA violations the a11y panel flagged — real labels on every input, named listboxes, `select()` factory.'],
      ['fixed', 'Consent-card brand lockup — the mark no longer jams against the label; `.brand` is now self-contained outside the topbar.'],
      ['fixed', 'The aurora CSS now ships through the inline / server-render bundle too (`/inline` export, site `kit.css`), not just the bundler entry.'],
      ['changed', 'Calmer Storybook manager chrome — purple reads as a sparing accent, not a wall.'],
    ],
  },
  {
    v: '0.3.0', date: '2026-07-21',
    changes: [
      ['changed', 'Light theme is now a true white app — `--bg` / `--surface` both `#ffffff` with retuned neutrals, so downstream products stop forking CSS.'],
      ['added', 'Finance data-table treatment (`.ui-table--dense/--zebra/--hover`, `__num` / `__code`) and the semantic status badges, promoted into the kit.'],
      ['fixed', 'Light cards get a hairline border + soft shadow so they read as panels on white; a too-wide table scrolls inside the card instead of bleeding past its corners.'],
    ],
  },
  {
    v: '0.2.4', date: '2026-07-20',
    changes: [
      ['fixed', 'Active segmented pill now sits inside its track — the heavy card shadow was spilling past the edge and reading as overflow. New tight `--shadow-seg` token.', ['Segmented']],
    ],
  },
  {
    v: '0.2.3', date: '2026-07-20',
    changes: [
      ['added', 'Gradient-bars busy loader on buttons — the button is disabled while it works.', ['Button']],
      ['added', 'Centered + glow Google-SSO sign-in, with idle / signing-in states.'],
    ],
  },
  {
    v: '0.2.2', date: '2026-07-20',
    changes: [
      ['added', '`--accent-strong` token — primary buttons now clear WCAG AA contrast.', ['Button']],
      ['added', '`--seg-active-bg` token — the active segmented pill reads clearly in dark.', ['Segmented']],
      ['added', 'Google-SSO-only sign-in story.'],
      ['fixed', 'Card grids no longer misalign — spacing moved to `.ui-card-stack` (the child margin leaked into rows).', ['Card']],
      ['changed', 'Removed the auto-generated Storybook “Docs” pages; intro wordmark reads apliteni-ui.'],
    ],
  },
  {
    v: '0.2.1', date: '2026-07-20',
    changes: [
      ['fixed', 'Larger feature icons; aligned landing preview cards; roomier hero.'],
      ['changed', 'Version moved to a nav pill; dropped the Strategy footer link.'],
    ],
  },
  {
    v: '0.1.2', date: '2026-07-20',
    changes: [['fixed', 'Enlarged the consent scope + app-chip icons.']],
  },
  {
    v: '0.1.1', date: '2026-07-20',
    changes: [['fixed', 'Account menu stays hidden until the session is confirmed (`.acct.on`).']],
  },
  {
    v: '0.1.0', date: '2026-07-20',
    changes: [
      ['added', 'First release — tokens, components, and the deck theme.'],
      ['added', 'Accent sub-themes — Nebula, Phoenix, Ocean and Emerald — in dark and light.'],
      ['added', 'Storybook workbench + the ui.apli.tech landing.'],
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
  CommandPalette: 'components-command-palette--playground',
  Drawer:    'components-drawer--playground',
  Inputs:    'components-inputs--text-fields',
  Segmented: 'components-segmented-control--playground',
  Snippet:   'components-code-snippet--shell',
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
// why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
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
