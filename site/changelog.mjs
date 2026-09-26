// Write for people who use the kit. Start with what changed and who is affected.
// Use one to three short sentences per change; add detail only for migration
// steps or behavior limits. Use plain words, without praise, filler or a test diary.
// Keep versions, dates, change types, component links and issue references.
// The first sentence is the page summary; full text also appears in release notes.

export const RELEASES = [
  {
    v: '0.54.0', date: '2026-09-26',
    changes: [
      ['added', 'React now includes FeedbackWidget, which lets users send a note with the page, section, and selected text from a shared Drawer. Closes #388.'],
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
