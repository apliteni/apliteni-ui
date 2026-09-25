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
    v: '0.41.5', date: '2026-09-25',
    changes: [
      ['fixed', 'Vanilla factories now keep quoted values inside their attributes. Text and enum attributes are escaped, while trusted HTML slots keep their existing behavior. Links and image sources reject javascript:, data: and vbscript: URLs; rejected links use #, rejected image sources are empty, and backLink renders nothing. This includes data: image URLs. Part of #376.'],
    ],
  },
  {
    v: '0.41.4', date: '2026-09-25',
    changes: [
      ['fixed', 'The React documentation now describes the shared dialog stack. Escape closes only the top React dialog and leaves the palette beneath it open; React and vanilla overlays still use separate stacks. This corrects outdated guidance without changing runtime behavior. Found in #367.'],
    ],
  },
  {
    v: '0.41.3', date: '2026-09-25',
    changes: [
      ['changed', 'Guideline examples now name concrete choices. The audit covered every guideline, clarified vague wording, and removed two repeated passages while keeping every rule and its exceptions. Resolves #365.'],
    ],
  },
  {
    v: '0.41.2', date: '2026-09-25',
    changes: [
      ['fixed', 'Publishing an older release no longer moves npm’s latest tag backwards. The release workflow compares versions and publishes older releases under a separate tag. Resolves #370.'],
    ],
  },
  {
    v: '0.41.1', date: '2026-09-24',
    changes: [
      ['changed', 'Storybook’s Apps section is now called Showcases. Existing story links still work, and the README and contributor docs use the new name. Requested in #366.'],
    ],
  },
  {
    v: '0.41.0', date: '2026-09-24',
    changes: [
      ['changed', 'Busy buttons keep each variant’s resting fill, border and ink while replacing the label with larger, brighter dots. Dots scale with the button size and remain readable in both themes. Resolves #327.', ['Button']],
    ],
  },
  {
    v: '0.40.1', date: '2026-09-24',
    changes: [
      ['added', 'The guidelines now say to give the committing action more weight than the dismissing action. The examples compare primary Save beside ghost Cancel with two primary buttons. Closes #350.'],
    ],
  },
  {
    v: '0.40.0', date: '2026-09-24',
    changes: [
      ['changed', "The DataTable sort chevron now rotates between ascending and descending in 150 ms with the kit's ease-out; rows still reorder instantly. There is no motion under reduced motion. Chosen in #363 after measuring a row-animation alternative, which stuttered above about 100 rendered rows."],
    ],
  },
  {
    v: '0.39.1', date: '2026-09-24',
    changes: [
      ['fixed', "DataTable sort indicators are now drawn as SVG chevrons instead of text arrow characters, which iOS showed as colour emoji. The sorted column shows one chevron in the sort direction; other sortable columns show a neutral pair. Screen readers still get the state from aria-sort. Found in the design-review trial, #361."],
    ],
  },
  {
    v: '0.39.0', date: '2026-09-24',
    changes: [
      ['changed', 'Guideline pages now use short, plain-English rules with a one-sentence reason, clear Do and Don’t examples, and body ink instead of muted text. Source-file references moved to test-side coverage, and the empty-state copy rule was removed. Closes #335, #329, #330 and #328.'],
    ],
  },
  {
    v: '0.38.0', date: '2026-09-24',
    changes: [
      ['added', 'Dense financial tables now have value, signed-change and company-identity renderers in vanilla and React. Units use smaller body ink, and callers choose the meaning of change colours. A new compact density uses 33px minimum rows without shrinking the type. Chosen in #344.', ['Table']],
      ['added', 'Tables can keep their header and company column visible while scrolling. Narrow company cells show the symbol and retain the full accessible name. FilterBar supports controlled selection, removal, clear-all and disabled or busy states with focus recovery. Segmented has an underline appearance and shared keyboard behavior in vanilla and React.', ['Table']],
      ['changed', 'Tables use white backgrounds in light mode and the base canvas in dark mode. Zebra no longer adds grey stripes, and hover marks the row edge instead of tinting the surface. This follows the table-surface decision in #344.', ['Table']],
      ['added', 'Dense-table guidelines and a fictional stock screener demonstrate 15 columns, both densities, scrolling and loading, empty and refresh-error states.', ['Table']],
    ],
  },
  {
    v: '0.37.1', date: '2026-09-24',
    changes: [
      ['changed', 'Block confirmations use the glowing green check from the full-page confirmation. The shared mark keeps its draw-in animation and reduced-motion treatment at the block’s existing size, as requested in #331.'],
    ],
  },
  {
    v: '0.37.0', date: '2026-09-23',
    changes: [
      ['changed', "Focus now uses a separated solid band with a soft glow. The 1px surface-coloured gap keeps the 2px accent band distinct from filled controls. The glow is decorative, as chosen in #343."],
      ['added', "Focus-ring width, colour and gap can now be tuned independently. The composed `--ring` remains available."],
      ['changed', "Ancestor ring overrides now stop at painted kit containers. Apply a custom `--ring` to the container as well. The app shell keeps root overrides because it adds no new surface."],
      ['fixed', "Focus remains visible in forced-colors mode. Ring consumers keep a real outline when the browser suppresses box shadows. Solid toasts use their contrast ink for the band."],
      ['fixed', "Inputs, textareas and selects now use native focus-visible like the other controls. Text-entry fields can still show focus after a mouse click, according to browser heuristics. Invalid fields retain the shared indicator."],
    ],
  },
  {
    v: '0.36.0', date: '2026-09-23',
    changes: [
      ['changed', "Words now use body ink at every size instead of muted or dim ink for hierarchy. Descriptions, labels, captions, table cells and enabled actions keep their sizes and spacing. Glyphs, state colours and empty-slot placeholders retain their exception ink. Generic badges use body ink, while archived and disabled states remain distinct. This was decided in #340 and #341.", ['Typography']],
      ['changed', "Guidelines now explain why contrast alone does not justify fading words. Labels and titles show body and muted ink at three sizes, state the closed exception list, and direct extensions through an issue. Accessibility Floor and Back link agree with this rule.", ['Typography']],
    ],
  },
  {
    v: '0.35.0', date: '2026-09-23',
    changes: [
      ['added', "Button now supports `size=\"xs\"` in vanilla and React for inline controls beside a value. Its 13px glyph uses `stroke-width 2.8` to keep the graphic stroke floor, with a 24px icon-only target and token-sized labels. All other sizes retain 16px glyphs. Chosen on #339.", ['Button']],
    ],
  },
  {
    v: '0.34.3', date: '2026-09-23',
    changes: [
      ['fixed', "Component text now follows the `--text-*` scale when an app overrides it. Nav, callout, dropdown, drawer, feedback, shell and other component sizes keep their exact defaults. Sizes between scale steps retain a fixed offset from the nearest token. The 16px touch-field zoom protection is unchanged. Fixes #322.", ['Typography']],
    ],
  },
  {
    v: '0.34.2', date: '2026-09-14',
    changes: [
      ['changed', "Touch screens now use tap to open hover readouts and a later tap to move or close them. Previously, a touch-screen tap produced no useful readout: a finger does not rest over a mark, so the readout appeared under the tap and disappeared when the finger lifted. With a coarse pointer, `pointerover` now opens nothing; the tap controls the readout instead. A tap on a mark opens its readout, a tap on another mark moves the readout, and a tap on the same mark or elsewhere on the page closes it. The opening tap is captured and never reaches the mark's own `click`, so a chart that drills down on a bar does not drill down on the tap that requested the bar's value. The closing tap is allowed through, so the drill-down occurs one tap later. The document still receives the opening tap, targeted at the root element, so an open dropdown panel closes under that tap as it would under any other tap. The active pointer type is read from the event, not from the device: a laptop with a touch screen hovers with its mouse and taps with a finger, while a keystroke returns the readout to focus. A pen taps like a finger instead of hovering like a mouse; a stylus presses the screen rather than resting over it. Focus also opens the readout under a coarse pointer, except when the focus is reached by the tap that leads to the click deciding the interaction. Therefore, a reader reaching a mark through a screen reader receives the value and its `aria-describedby`; a finger receives the value from the tap. A tap that closes a readout dismisses that mark like Escape, whether it lands on the mark or on the chart background. A tap outside the host counts as the pointer leaving and dismisses nothing. Keyboard focus still opens the readout, and Escape still closes it. This resolves half of what #282 left open; whether chart marks should receive a tab stop remains open on that issue.", ['Tooltip']],
      ['changed', "Guidelines / Hover readouts now include a fifth rule for touch screens: open the readout with a tap and close it with the next tap. The page no longer says that a tap shows the readout only while the finger is down, because that stopped being true in this release.", ['Tooltip']],
    ],
  },
  {
    v: '0.34.1', date: '2026-09-14',
    changes: [
      ['changed', "The topbar band's search field now uses a raised surface instead of the sunken step. Every other field in the kit uses `--surface-2`, one rung below the surface it occupies. This field sits on the band, and the band is `--bg`, the bottom of the ladder; therefore, a sunken fill had nowhere to go except into its own background. In light, the old fill measured 1.10:1 below the band, and its key cap measured 1.04:1 against the field. The field now uses `--surface`, one rung above: 1.08:1 above the band, with the cap at 1.14:1. This was chosen on #318 from five looks rendered from one branch (today, bordered, lifted, quiet, wide). The survey of seven systems and all forty frames are in `docs/reviews/318-search-field.*`. The width, the palette's sentence and the boxed key stay unchanged. In dark, the cap's edge softens with the lift, changing from 1.29:1 to 1.16:1; this was left as it landed.", ['Shell']],
      ['fixed', "The same field now uses the kit's focus ring. It is a `<button>` without `.ui-btn`, so the shared rule never reached it and focus fell through to the browser's square outline around a 12px radius. It now draws `--ring` and the accent edge on `:focus-visible`, like every other control on the band.", ['Shell']],
    ],
  },
  {
    v: '0.34.0', date: '2026-09-14',
    changes: [
      ['added', "The app shell now supports a second layout, `topbar`. `appShell({ layout: 'topbar' })` moves the signed-in reader from the rail's foot onto a band beside the rail, with a search field and the reader's menu. The fold's control takes the place at the rail's foot. The rail-only layout is unchanged and remains the default. `accountShell()` passes `layout` through. The banded layout does not compose with the compatibility `topbar` bag, so a page using it has no version switcher or theme toggle in the band. This was decided on #308 from the reference read from source: the band stands beside the rail rather than above it, and the trigger on the band is the avatar alone.", ['Shell']],
      ['added', "The content column now supports two widths. On both layouts, use `appShell({ width: 'wide' | 'centered' })`: `centered` is the default, chosen on #308, and remains the capped, centred column the kit has always drawn; `wide` fills the track beside the rail. `maxWidth` is the number used under either name.", ['Shell']],
      ['added', "The topbar search now opens the command palette. It is a field-shaped trigger with the palette's `[data-cmdk-open]` hook and the opening key included in its accessible name: \"Search or run a command… Ctrl K\". `wireShell()` writes the reader's own platform into the key. The shortcut remains in the name because, as decided on #308, it is the one fact the control exists to teach.", ['Shell', 'CommandPalette']],
      ['added', "React now provides `<Dropdown>` as the React face of `dropdown()` and of `wireDropdown()`'s keyboard behavior. It supports both variants, sections, badges, separators, disabled and danger rows, controlled or uncontrolled `open`, `onSelect` and `onOpenChange`. A `row` render prop draws each row, so a router `<Link>` can be the row without losing its classes, role, tab stop or keyboard behavior. `search` places the kit's own field above the rows and filters through the kit's own matcher. The implementation was checked shape by shape against the factory, and against the factory plus `wireDropdown()` for which rows remain after a query. `portal` and `foot` slots are not available yet.", ['Dropdown']],
      ['added', "The kit now exports `dropdownMatch(label, query)` and `dropdownFiltering(query)`. These are the matching and filtering functions already used by a dropdown's search field, published so a second implementation can reuse them instead of writing another fold table. The factory's own output is unchanged.", ['Dropdown']],
      ['added', "React now provides `<BackLink>` as the rendered React face of `backLink()`. It keeps the same rules and refusals, which keeps `ui-back` on the element targeted by the shell's `.ui-app__main > .ui-back` rule. It accepts `as`, so a router link can be used as the anchor."],
      ['added', "Dropdown panels now expose padding and a foot slot. `.ui-dropdown__panel` declares `--ui-dropdown-pad` beside `--ui-dropdown-gap` and uses it for padding, so a page pinning its own block inside the panel can read the value instead of copying `-6px` from the kit's stylesheet. The new `.ui-dropdown__foot` mirrors `.ui-dropdown__head`: both use the same inner padding from one shared rule, which bleeds to the panel's bottom edge, and its line sits on the edge it faces. `dropdown({ foot })` draws the foot; `footer` remains the unwrapped slot and sits inside it. Only the foot was added, by decision on #306; a head remains the page's own markup through `header`. A head or foot containing a control belongs in a panel that may contain one. `search: true` makes the panel a dialog; a menu or listbox accepts rows and nothing else.", ['Dropdown']],
      ['added', "Type now has a sixth rank, caption: `--text-sm` at `--weight-normal`, for a sentence below a specimen, figure or screenshot. It is the first rank without its own size: it shares the label's 13px size and is separated by weight. The rank table's ordering rule therefore reads \"smaller, or the same size and lighter\". Guidelines / The page had borrowed the label rank for captions, creating a medium 13px line below a normal 14.5px line; captions are now normal weight. The gate that holds the ranks reads rank notes in stories, site pages, docs and React sources, as well as in the sheets shipped with the kit. A rule drawn in a story is held to the same table."],
      ['fixed', "Back-link destination names now stay on one line and clip with an ellipsis. Since 0.29.0, `backLink()` has emitted `<span class=\"ui-back__label\">` without a rule behind it, so a parent page with a long name wrapped to two or four lines above the page title. The label now behaves like a rail row's label, and `.ui-back` has a `max-width` so the column limits it. Short names are unchanged. The full name remains in the accessible name. Chosen on #303 over wrapping like the breadcrumb trail, which pushed the page title down on a phone."],
      ['fixed', "Dropdown-trigger carets are now centred on their ink in both states. Each caret is made from two borders of a rotated square, so the mark is an L and the opposite corner is empty. Previously, the caret sat 1.75px too low when pointing down and 3.88px too high when pointing up. It now lands within a quarter pixel of the trigger's middle in either direction.", ['Dropdown']],
      ['fixed', "In light mode, a dropdown search field now uses `--bg` instead of `--surface-2`. A sunken box is read against the surface containing it, while a floating panel is one rung above a card. In light mode, that panel is pure white, so the ordinary field token sat two rungs below it and looked like a hole.", ['Dropdown']],
      ['added', "The kit now checks every emitted `__label` for a matching CSS rule. `src/styles/label-coverage.test.js` rejects a component that places a `__label` in its markup without a rule for it in either workspace's CSS. This catches the omission above, which a consumer's own class-coverage guard found first."],
    ],
  },
  {
    v: '0.33.1', date: '2026-09-13',
    changes: [
      ['changed', "Floating surfaces now cast shadows again, while high but non-floating surfaces keep their existing elevation treatment.\n\nWhether a surface floats depends on its purpose, not its position on the elevation ladder. Floating surfaces include the dropdown panel, account and workspace menus, `confirm()`, drawer, React modal, all three toast styles, command palette, and hover readout. The hover readout uses `--surface-3`, one step above the others. Each floating surface has a two-line hairline: `--border-strong` on the border and `--border` one pixel inside it. Each also has one broad, faint drop shadow underneath.\n\nSurfaces that are only high do not change. Cards, fields, chips, and hovered rows still show their elevation through their ladder step and hairline. The last two use the hover readout's step.\n\nThis decision was made in #309 using the measured frames in `docs/reviews/295-popover-variants.html`. In light mode, the panel was only 1.05 above the card, with a 1px line at 1.18, so one pixel created the entire separation. The edge now measures 1.64 in dark mode and 1.44 in light mode. The drop's core measures 1.20 / 1.44 against the card.", ['Dropdown', 'Drawer', 'Confirm', 'Callout', 'Tooltip', 'CommandPalette', 'Topbar']],
      ['added', "Floating surfaces now use the theme-specific `--elev-drop` token together with an overridable edge token.\n\n`--elev-drop` contains the drop shadow for the floating treatment, with one token per theme. Its order follows Primer's `--shadow-floating-*`: the inset 1px line comes first, followed by the drop shadow.\n\nA floating surface writes both parts itself: `box-shadow: inset 0 0 0 1px var(--elev-edge, var(--border)), var(--elev-drop)`. It places its focus ring in front of both. The line is written at the call site instead of inside the token because CSS resolves a `var()` inside a custom property against the element that declares that property. For example, an `--elev-edge` read at `:root` resolves at `:root`, so a lower surface cannot point it somewhere else.\n\n`--elev-edge` provides that override. A status toast can therefore draw its inner line in its own colour; when unset, it uses `--border`. The five deprecated `--shadow-*` tokens are unchanged and still resolve to `0 0 #0000`.", ['Callout']],
      ['fixed', "The collapsed rail's flyout label now uses the floating treatment instead of the deprecated transparent shadow.\n\nBoth of the label's rules previously used `--shadow-md`. That token was deprecated in 0.32 and resolves to the transparent shadow, so the label cast no shadow even though its rules still referenced one.\n\nThe label now behaves like the hover readout's twin: it appears over the page while the pointer rests on a row and uses the same elevation step. Its border also uses `--border-strong`, matching the rest of the floating step.\n\nIf a consumer sets `--shadow-md`, the kit's drop shadow is applied to this label instead of the consumer's custom shadow.", ['Shell']],
    ],
  },
  {
    v: '0.33.0', date: '2026-09-13',
    changes: [
      ['breaking', "`appShell()` now needs `account` as well as `signOutHref` to show sign out.\n\nSign out is now a row in the reader's menu. The block at the foot of the rail that names the signed-in reader opens that menu. Without a reader, there is no session to end, so `appShell()` with `signOutHref` but no `account` draws neither the reader block nor sign out.\n\nA page that passed only `signOutHref` and relied on a sign-out row in the navigation list must now pass `account` too. It must also call `wireShell()`, because the menu is interactive rather than a plain link.", ['Shell']],
      ['breaking', "`footer()` now uses `h2` for column titles instead of `h4`.\n\nThese titles were the kit's only `h4` elements on a page, so the heading outline changed from `h2` directly to `h4`. A stylesheet that currently targets `.ui-footer h4` must target the class instead.", ['Footer']],
      ['changed', "`success()` now gives its title the correct heading level for its layout.\n\n`hero` and `split` represent the page itself, so their title is now `h1`. `compact` uses `h2`. Previously every layout used `h3`, which meant a success screen had no page title. The `level` option overrides the automatically chosen level.\n\nThe consent screen's \"Access granted\" is now an `h1`; that page previously had no heading at all.", ['Success']],
      ['added', "The rail can now fold to an icon strip and expand again.\n\n`appShell()` draws a toggle at the far end of the brand row. The toggle has one icon: a still frame crossed by a seam. It folds the rail to the icon strip used below 720px and opens it again.\n\nThe fold is animated. The column keeps its open width while a box closes over it, so each glyph stays in place as the width changes. The words fade before the closing edge reaches them. The toggle moves with that edge onto the glyph column, and the product lockup folds with the rail.\n\nWhen the rail is folded, a row shows its name beside the glyph on hover and keyboard focus. The label is drawn in CSS and anchored to the row when the browser supports anchor positioning. `collapsible: false` draws no toggle. `collapsed` controls the first paint.", ['Shell']],
      ['added', "`wireShell()` now controls rail persistence, server-side initial state, and rail events.\n\nUse `wireShell(root, { persist })`, `railCollapsed(cookieHeader?)`, and `RAIL_COOKIE` as follows. `wireShell()` connects the rail toggle, the reader's menu, and navigation groups. Each toggle press is stored in the `apliteni-ui-rail` cookie and applied to any collapsible shell rendered without `collapsed`.\n\nOn the server, pass `railCollapsed(request.headers.cookie)` so the shell paints at the correct width immediately. `persist: false` keeps every shell under `root` out of the cookie. Each press also dispatches a bubbling `ui-rail` event with `detail.collapsed`.", ['Shell']],
      ['added', "The signed-in reader's block at the rail's foot now opens the account menu.\n\nThe menu includes Sign out as one of its rows. It uses the kit's own `dropdown()`, is portalled clear of the rail, and opens upward. A destructive row changes to `--pink` during keyboard use as well as pointer hover.", ['Shell', 'Dropdown']],
      ['added', "Guidelines / The page now define the content and structure one screen may contain.\n\nA page must follow the head's order, have one title, use an outline no deeper than three levels, provide one primary action, contain no more than six cards, show nothing overlaying the page at load, use one density, and include a two-sentence lede.\n\nTwo additional limits are documented in `docs/specification.md#the-page`: a page belongs to `appShell()`, and every navigation landmark must be named. That document maps each rule to the line of the kit that enforces it. All ten rules are checked by `stories/guidelines/the-page.test.js` across every screen in `stories/apps/`.\n\nThe page uses one ink colour. Its hierarchy comes from type ranks rather than grey."],
      ['fixed', "Dropdowns now update visibility and pointer interaction in the same frame as their state changes.\n\nA dropdown panel is visible in the frame in which it opens. As a result, arrow keys move focus to a row instead of leaving focus on the trigger, and the next Tab does not immediately leave the menu.\n\nWhen a panel begins fading out, it stops accepting clicks immediately rather than after `--dur-med`. This prevents a hidden account-menu item from receiving a stray click that could sign the reader out.\n\nBoth behaviours apply to every menu drawn by the kit: the `dropdown()` panel, the rail's portalled copy, and the topbar's version switcher and account menu.", ['Dropdown', 'Topbar']],
      ['fixed', "`sidebarNav({ collapsed })` no longer hides navigation groups when the rail is folded.\n\nIt no longer forces a group closed or hides its list, so the current page remains reachable on the folded rail. A row without a glyph now receives a dot.", ['Shell']],
    ],
  },
  {
    v: '0.32.0', date: '2026-09-12',
    changes: [
      ['breaking', "The kit no longer casts shadows, and its surface colours changed in both themes.\n\nA screen built with the kit therefore looks different immediately after upgrading. The dark page and dark card are darker, every dark floating panel is lighter, and the light page and card are no longer pure white. On a light screen, a floating panel is now the only pure white surface.\n\nThe following shadow rules stopped casting: the switch knob, topbar theme pill, soft toast, success panel, outline toast, hover readout, dropdown panel, account menu, workspace menu, confirm, drawer, command palette, auth card, solid toast, React modal, active segmented pill, floating feedback composer, `.m-lift` hover utility, and feedback pill. The feedback pill previously cast an accent glow and a layer of ink at rest, grew both on hover, and gave its glyph a 1px ink `drop-shadow()`.\n\nSurfaces are now separated by their step on the elevation ladder and by the kit's hairline. The feedback pill uses neither: it is the accent at full fill strength on the page.", ['Card', 'Dropdown', 'Drawer', 'Confirm', 'CommandPalette', 'Modal', 'Tooltip', 'Callout', 'Topbar', 'Switch', 'Segmented', 'Feedback']],
      ['breaking', "`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-seg`, and `--shadow-card` are deprecated and resolve to `0 0 #0000` in both themes. They remain published, so reading one gives a transparent shadow instead of an unresolved `var()`. A consumer that wants a cast shadow again can set these tokens.\n\nThe value is transparent rather than `none` because shadow tokens are often used in a list. The kit's pre-0.32 pattern was `box-shadow: var(--shadow-lg), var(--ring)`. Putting `none` inside that list makes the entire declaration invalid, so the browser also removes the focus ring. A consumer combining a kit shadow with anything else needs no migration. A consumer that wants the surface to be bare should remove the `var()` instead of relying on it to paint nothing.\n\n`--shadow-ink`, `--sheen`, `--ring`, and `--scrim` are unchanged; none of them is a cast shadow. The drawer, confirm, and command palette also remove their local `--drawer-shadow`, `--confirm-shadow`, and `--cmdk-shadow` hooks, which now have nothing to carry.", ['Drawer', 'Confirm', 'CommandPalette']],
      ['breaking', "The surface tokens now follow an ordered ladder, and three tokens have new roles.\n\n`--surface-2` is the SUNKEN step for fields, tracks, and disabled boxes. The six floating surfaces that previously used it—the dropdown panel, account and workspace menus, confirm, drawer, and command palette—now use `--bg-elevated`.\n\n`--bg-elevated` is the FLOATING step. In dark mode it is a full step above the card, whereas previously it was below the card. Any consumer using these tokens for a purpose other than the role named by the ladder must re-point that usage.\n\nDark: `--bg` #0e0d14, `--surface-2` #161520, `--surface` #211e2d, `--bg-elevated` #2a2639, `--surface-3` #2d293c, `--seg-active-bg` #383350.\n\nLight: `--bg` #eef0f5, `--surface-2` #e3e6ee, `--surface` #f8f9fc, `--bg-elevated` #ffffff, `--surface-3` #e7eaf1."],
      ['breaking', "`.ui-card` now has a hairline in both themes, and accent cards use that line for their colour.\n\nPreviously, only light cards had a hairline. `.ui-card--accent` now recolours the hairline instead of drawing an inset ring inside it, so an accent card has one edge rather than two. `.ui-card--interactive` no longer removes the border. A consumer that depends on a borderless dark card must override `border`.", ['Card']],
      ['changed', "Dark `--muted` is now #a29db6 instead of #948fa8 for better contrast on the highest surfaces.\n\nThe new value uses the same violet-grey and moves fourteen steps up in every channel. It was chosen against the TOP of the elevation ladder rather than against the page because it carries a dropdown row's description and the readout's label, both of which appear on the highest surfaces.\n\nThe new value clears AA with room on every ladder step that was raised. The old value cleared the top two steps only by hundredths. Because `--muted` is used on every secondary line in the kit, this change is visible throughout the interface."],
      ['changed', "Light theme signal colours were darkened to preserve contrast on the new page background.\n\n`--pink` is now #a92d59, and `--glow-pink` is re-tinted from it. `--chip-success-ink`, `--chip-warn-ink`, and `--chip-info-ink` are also deepened.\n\nEach colour is read on a translucent wash. Those washes now composite over a page that is no longer white, so the colour pairs fell below WCAG AA even though they had previously passed. Light Ocean's and light Emerald's `--accent` values are deepened for the same reason.", ['Badge', 'Callout', 'Nav']],
      ['fixed', "The light-theme hover readout now has a visible panel again.\n\nThe kit had pointed light `--ui-tip-bg` to `--surface`. Because the page was white, `--surface` was also white. The new ladder makes `--surface` the card step, so a readout over a card used the card's own colour and appeared to disappear.\n\nThat override has been removed. The readout now uses `--surface-3` in both themes.", ['Tooltip']],
      ['fixed', "The accent counter in a dropdown row now uses its own flat badge surface instead of a wash over the panel.\n\nIt uses the accent as its ink, matching the shape the navigation badge has used since #157. A wash over a raised surface sits closer to the ink displayed on it than the same wash over the page, and the new ladder makes the panel a raised surface.", ['Dropdown']],
      ['fixed', "The app rail's resting glyph is readable against the rail again. Its opacity was adjusted when the light rail was one step below white, and the ladder lowered the rail together with the page.", ['Nav']],
      ['fixed', "Raised-panel hover states now use the correct surface level. A hovered, focused, or active dropdown row, workspace and account menu rows, the drawer's close button, the dropdown's trailing badge and accent counter, the workspace menu's archive chip, and the palette's key cap all previously painted `--surface` — the card step, which the ladder places BELOW `--bg-elevated` in dark mode. As a result, they appeared to sink while their panels floated. They now use `--surface-3`, the step above the panel, as the command palette's active row has always done. The dropdown's search field uses the opposite level, the sunken `--surface-2`, which `.ui-input` also uses.", ['Dropdown', 'Topbar', 'Drawer', 'CommandPalette']],
      ['fixed', "The switch knob now has a visible edge. `--shadow-sm` was its only visual edge, and when that shadow disappeared, an off knob in light mode became a white disc on a `#e7eaf1` track with a 1.20:1 contrast ratio. It now uses the `--border-strong` hairline already used by the checkbox beside it.", ['Switch']],
      ['fixed', "The `<select>` chevron now follows the theme's `--muted` colour. Its stroke was a hexadecimal value frozen inside a data URI — the dark `--muted` value from before this release — and it had a 2.49:1 contrast ratio on the light field. Because a data URI cannot read a token, the ink is written separately for each theme.", ['Inputs']],
    ],
  },
  {
    v: '0.31.1', date: '2026-09-12',
    changes: [
      ['fixed', "Touch-screen fields now use 16px text, preventing iOS Safari from zooming the page when one receives focus. iOS Safari zooms into a focused field whose text is smaller than 16px and does not zoom back out. The kit's form controls used 14.5px, the pager's size and jump controls used 13px, and the dropdown's search field used 12.5px. A new `(pointer: coarse)` rule in `src/styles/field-zoom.css` sets `input`, `select`, and `textarea` to 16px. Both published stylesheets import it, including the React stylesheet, just as both carry the reduced-motion net. The rule targets elements instead of kit classes, so it also covers fields on the host page. It uses `!important` because the net must outrank a component rule it has never seen. This wider reach has an important cost: the rule sets a flat size rather than a minimum size. Therefore, a host field designed above 16px — such as a 20px hero search — becomes smaller on a touch screen than it is with a mouse. Keep that larger size with your own `!important` rule, using a selector more specific than a bare element: `.hero-search input { font-size: 20px !important; }` wins regardless of which stylesheet loads first. Controls that do not accept text keep their existing size. Nothing changes when the user has a mouse. The local rule added for the dropdown's search field in 0.30.0 has been removed and replaced by this shared rule.", ['Inputs', 'Dropdown', 'Pagination', 'CommandPalette', 'Feedback']],
    ],
  },
  {
    v: '0.31.0', date: '2026-09-12',
    changes: [
      ['breaking', "This entry records changes that were already available on npm by 0.30.0. The three changes below merged before #287 increased the version, so 0.28.0, 0.29.0, and 0.30.0 included them without describing them. A consumer using 0.30.0 already has the capitals removed and the card title rendered as a heading; this entry makes that status explicit."],
      ['breaking', "The kit no longer changes text to capitals through styling. `text-transform` was removed from eleven rules: the eyebrow, table head, badge, pill, nav caption, menu group caption, menu row badge, footer column title, code sample label, confirmation eyebrow, and version badge. The letter-spacing used only with capitals was removed as well. Text written as `Paid` previously rendered as `PAID` and now renders as `Paid`. Rewrite copy that depended on automatic uppercasing in sentence case; words that are capitalized by definition must be typed that way. `--tracking-caps` remains exported, but no kit rule reads it.", ['Badge', 'Table', 'Nav', 'Dropdown', 'Footer', 'Snippet']],
      ['breaking', "`card()` and `<Card>` now render the title as an `h2` instead of a `div`. The card title is therefore part of the page's heading outline, and `level` changes it to `h3`–`h6` when the card appears under its own section heading. A title containing block content must become inline content because a heading cannot contain a block. When the title is empty, `<Card>` renders no heading; previously, it emitted an empty `div`.", ['Card']],
      ['added', "The kit now provides a command-palette shell with grouped, ranked results and accessible keyboard behavior. Use `commandPalette()` and `wireCommandPalette()`, or `<CommandPalette>` in React. Press ⌘K or Ctrl+K to open a palette over a scrim, with a text box, grouped results, ranking that preserves the caller's order as the tie-break, and the ARIA combobox keyboard behavior. The kit provides the shell but does not define result kinds: a row navigates somewhere, runs something, or asks for confirmation first. A destructive row that has nothing to ask cannot be run at all. `rank: false` returns the query so a palette can be fed by a server. Two densities are available, with compact as the default.", ['CommandPalette']],
      ['added', "`drawerSection({ title, rows, body })` now defines a drawer group with a heading above label-and-value rows. The group is separated from the group above by one rule and by spacing, rather than by a box.", ['Drawer']],
      ['added', "React `Drawer` now uses the HTML drawer's markup, slide behavior, and scrim from the kit's own stylesheet. This avoids maintaining a second set of styles that could disagree with the kit.", ['Drawer']],
      ['added', "Entrance transitions now fade in changing content while respecting reduced-motion preferences. `playEntrance()` and `ENTRANCE_FALLBACK_MS` apply this behavior to tab panels, side-nav groups, the feedback error, and `setBusy()` content. Everything that appears after load also moves during entrance, except when `prefers-reduced-motion` is enabled; then none of these effects run.", ['Tabs', 'Nav', 'Feedback']],
      ['added', "Guidelines / The command palette now define six rules for using the pattern. They cover what belongs in a palette, how results are grouped and ranked, the six keys it owes a reader, focus and announcements, and the refusal to run a delete operation by itself.", ['CommandPalette']],
      ['added', "The drawer and motion guidelines now connect each rule to the kit code that implements it. They are listed as Guidelines / Drawers and Guidelines / Motion.", ['Drawer']],
      ['added', "Guidelines / Labels and titles now define four rules for text case and heading structure. They cover sentence case, the rank assigned to a title, card titles as headings, and the purpose of an eyebrow. Each rule cites the line of kit code that implements it.", ['Card']],
      ['added', "The letter-case test now checks every supported source area and rendered story. `stories/guidelines/letter-case.test.js` rejects a case change anywhere in `src/`, `stories/`, `site/`, `react/src` and `.storybook`, including stylesheets, `<style>` blocks, inline styles, and JSX style objects, across 21 spellings. It also renders every story in both themes and every site page to verify that text under a label or chip rank starts with a capital."],
      ['changed', "Labels and chips now use named type ranks with explicit sizes and weights. A label uses `--text-sm` at `--weight-medium`; a chip uses `--text-xs` at `--weight-semibold`; and a card title uses `--text-lg` at `--weight-semibold` while keeping the text face on any element. There are five ranks in total, each smaller than the rank above it. They are defined in the specification and read at runtime by `src/styles/type-ranks.test.js`. The sizes were chosen by the owner from three rendered treatments.", ['Badge', 'Card', 'Table']],
      ['changed', "React `Modal` now fades in and out and remains mounted until its exit transition finishes. It stays mounted for about 250ms after `open` becomes false. A test that expects the dialog to disappear immediately when `open` is false must wait for it to unmount.", ['Modal']],
      ['changed', "React `Modal` now renders on the confirmation layer above a drawer instead of at `z-index: 50`. React Modals, Drawers, and CommandPalettes share one dialog stack, so only the topmost one responds to Escape and Tab. A confirmation opened from a palette row therefore takes one Escape to answer, rather than one Escape closing both. The overlay layers now use three steps: drawer 100, palette 101, and confirm 102.", ['Modal', 'Drawer', 'CommandPalette', 'Confirm']],
      ['fixed', "Reduced-motion opening now places focus on the first control in drawers, confirmations, and command palettes. Under `prefers-reduced-motion`, focus had previously landed on the panel or fallen to `<body>`, where arrow keys and letters reached nothing and only a mouse could recover the interaction.", ['Drawer', 'Confirm', 'CommandPalette']],
    ],
  },
  {
    v: '0.30.0', date: '2026-09-12',
    changes: [
      ['added', "`dropdown({ search: true })` now adds a field above the rows and filters them as the reader types. The finance portal requested this because its filter dropdowns contain between 12 and several hundred options, with no other way to narrow them. Matching checks anywhere in the label, ignores case and accents, and preserves row order. Arrow keys move through the rows that remain visible, Enter selects a row, and Escape closes the dropdown. When no row matches, the dropdown says so instead of showing a blank panel. The field is a combobox inside a small dialog because a listbox cannot contain a text field. A dropdown without `search` renders byte-for-byte as it did before.", ['Dropdown']],
      ['added', "Guidelines / Component choice now requires a search field for sufficiently large dropdowns. A dropdown with ten options or more, or any list supplied by data, gets one. This is a rule rather than a recommendation, and #283 established the number.", ['Dropdown']],
    ],
  },
  {
    v: '0.29.0', date: '2026-09-12',
    changes: [
      ['added', "`backLink()` now provides a quiet link from a page to its parent page. It appears above the title where a breadcrumb trail would normally appear. It is an `<a href>` to an address named by the caller, never a step through browser history: a page opened in a new tab, from a bookmark, or from a shared address has no history to follow, and the browser's Back button already handles history. The link shows the destination name beside an arrow and is announced to screen readers as \"Back to\" followed by that destination. Without a name, it shows \"Back\"; when a label already begins with \"Back to\", it is read as the place after those words. It uses `--dim` without a box, and its colour rule outranks a host stylesheet's `a:link`, so page-level link colours do not change it into another style. The kit provides only this treatment and no variant. Four treatments were rendered side by side on the review page for #270 — a quiet link, a bordered button above the title, an icon-only arrow beside the title, and the breadcrumb trail alone — and the quiet link was selected.", ['Back link']],
      ['added', "`appShell({ back })` now places the back link where the breadcrumb trail would appear and removes the trail, because both would name the same parent twice. The sidebar row marked `active` remains highlighted and now uses `aria-current=\"true\"` to identify the current section, rather than `\"page\"`, which announced the list as the page currently on screen. `sidebarNav({ activeIs: 'section' })` provides the same behavior outside the shell.", ['Page shell', 'Navigation']],
      ['added', "Guidelines / Going back now define six rules for pages that return to a parent. They explain when a page receives a back link, what it names, why it links to an address instead of browser history, where it appears, how it relates to the sidebar, and why it remains visually quiet.", ['Back link']],
    ],
  },
  {
    v: '0.28.0', date: '2026-09-11',
    changes: [
      ['added', "`tooltip()` now provides a non-disruptive readout for marks such as charts and sparklines. Use `wireTooltip(root)` to drive it, or use `showTooltip` / `hideTooltip` when a chart performs its own hit-testing. The tooltip overlays the page in every state: it is one element, absolutely positioned inside its host, and its open state changes only `opacity` and `visibility`. Showing it therefore never moves or resizes other content. This is the defect described by #282: the finance portal's KPI sparklines wrote their readout into the card as a new line, causing the card to grow and everything below it to move whenever the pointer reached a point. The tooltip opens above the mark and flips below only when the upper position is clipped by the viewport or by an ancestor that hides overflow; at an edge, it slides inward. It accepts no pointer events, writes its label, value, and detail as text, appears on focus as well as hover, and closes on Escape.", ['Tooltip']],
      ['added', "Guidelines / Hover readouts now define four rules for values shown on hover. A readout overlays the page instead of occupying space in it, opens above the mark, names the point, gives the value, and stops at one comparison. Hover must never be the only way to reach it. The question of whether chart marks should receive keyboard focus, and what a tap should do on a touch screen, remains open on #282.", ['Tooltip']],
    ],
  },
  {
    v: '0.27.1', date: '2026-09-11',
    changes: [
      ['changed', "Cards are now flat, while raised surfaces keep their shadows. `.ui-card` casts no drop shadow in either theme. In light, only the hairline `--border` separates it from the white page; dark was already shadowless and still groups the card by surface. An interactive card keeps its 2px hover lift, but no longer casts `--shadow-md` on hover in dark; light never showed that shadow. `--shadow-card` remains defined for anyone reading it, and raised surfaces — dropdown panels, modals, drawers, and popovers — keep their shadows.", ['Card']],
    ],
  },
  {
    v: '0.27.0', date: '2026-09-10',
    changes: [
      ['added', "`pagination()` now supports server-counted, array-sliced, and cursor-based pages with four rendering shapes. `pagination()` is the strip under a table or list, and it is the first pager in the kit that can express a page it did not compute. It does not receive rows. Instead, it takes the current page, the page size, and, when the caller has one, the size of the whole result. Therefore, a page counted by a server and a page sliced from an array produce the same markup. It has three selectable variants: `steps` (First/Prev/Next/Last, the default), `numbered` (a truncated strip with at most seven slots), and `jump` (a page box). It also has a fourth shape that nobody selects: when no total is provided, it draws only Prev and Next. Without a last page, no other control can be computed, which is what both a cursor API and a `limit + 1` fetch need. A control at either end is disabled and remains in place; it is never removed. One page of content draws no steps, and when no page-size choice is offered either, it renders nothing. The range is announced in a polite live region; nothing else in the strip is.", ['Pagination']],
      ['added', "Guidelines / Pagination now defines seven rules for data-intensive tables and cites the kit code supporting each rule. Three rules appear in none of the thirteen design systems surveyed for the page: what the controls do during a page turn, announcing the row range by default, and where responsibility for remembering a page size belongs.", ['Pagination']],
      ['breaking', "React `DataTable` now uses 100 rows as its default page size instead of 4. The old default was written for a demonstration, so every consumer of a data-intensive table had to override it. `pageSize` still accepts any number. `PAGE_SIZES` and `DEFAULT_PAGE_SIZE` are exported, so call sites do not need to write the numbers themselves.", ['DataTable']],
      ['added', "React `DataTable` now supports controlled paging through `page` and `onPageChange`. These form the same controlled/uncontrolled pair that `sort` already had. A controlled table renders the rows it receives and never slices them. This lets a server-paged surface represent server paging correctly instead of passing its own row count as a page size to disable the kit's pager. `total` and `hasMore` provide the count information, and `pager={false}` renders no pager at all.", ['DataTable']],
      ['fixed', "React `DataTable` no longer renders a pager when the table has one page. Previously, it rendered `Page 1 of 1 · N rows` below two permanently disabled buttons. There was no branch for the page count and no way to turn the pager off, so one consumer hid the strip with CSS on the two surfaces where that sentence was also false.", ['DataTable']],
      ['breaking', "The React `DataTable` pager now uses the kit's shared `pagination()` markup and stylesheet. `.rx-pager` and `.rx-pager__info` no longer exist. The strip is now `<nav class=\"ui-pager\">`, and its status text changed from `Page 1 of 6 · 100 rows` to `1–100 of 4,812`. A stylesheet keyed to either old class will stop matching. This includes a `display: none` rule used to suppress the pager: it now suppresses nothing and should be deleted in favour of `pager={false}`. Pager styles also moved from `@apliteni/apliteni-ui/react/css` to `@apliteni/apliteni-ui/css`. A consumer that imports only the React stylesheet must add the latter import.", ['DataTable', 'Pagination']],
      ['fixed', "Disabled ghost buttons now use a separate ink token that meets the kit's disabled contrast floor. A ghost button paints no box in either state, so its label must remain readable against whatever is behind it. The original `--disabled-ink` measured 5.18:1 on a card and 4.66:1 on `--surface-3` in dark, below the 5.56 settled in #220. The new token, `--disabled-ink-bare`, is set for the dullest ground: 5.62–7.00 in dark and 5.60–6.50 in light. The live ghost beside it still measures 1.5 times that in dark and 1.6 times that in light. The first attempted fix painted the flat disabled box onto the ghost, based on the claim that nothing would become less readable; that claim was false. In a pager at page 1, the boxed First and Prev looked heavier than the live Next and Last beside them, so the change was reverted before release. `src/styles/button-disabled.test.js` now pins both inks on every ground and rejects any disabled rule that gives its box back to the ground without using this ink.", ['Button']],
    ],
  },
  {
    v: '0.26.0', date: '2026-09-06',
    changes: [
      ['added', "React `DataTable` can now omit selection controls and share controlled sorting with another view of the same rows. Existing selection behavior and uncontrolled sorting remain unchanged.", ['DataTable']],
    ],
  },
  {
    v: '0.25.3', date: '2026-09-06',
    changes: [
      ['fixed', "The React Modal now skips hidden and fieldset-disabled controls when choosing the opening focus. Previously, a body containing fields inside a closed `<details>` element could open with focus outside the dialog. Its summary now participates in the focus cycle. Elements with a negative `tabindex`, which scripts can focus but Tab skips, are excluded from the trap's endpoints.", ['Modal']],
      ['changed', "Opening focus now reaches a link or disclosure summary before the body's first field. An empty body still focuses the dialog itself.", ['Modal']],
      ['fixed', "Clicking the scrim now keeps focus on the element that opened the dialog. The scrim cancels the mousedown default action that previously undid focus restoration.", ['Modal']],
      ['added', "Focus coverage now includes nine regression tests and a CollapsedForm story.", ['Modal']],
    ],
  },
  {
    v: '0.25.2', date: '2026-08-31',
    changes: [
      ['changed', "The topbar account avatar now uses the kit's text font for its initials. It is a `<button>` containing the account initials, but `.avatar` previously specified no font family. As a result, those two characters appeared in the browser's Arial in every release through 0.25.1, while the adjacent label used the kit font. The rule now declares `font: inherit`, then declares its own 600 weight and 12.5px size after the shorthand. The initials therefore use the text face already set for the topbar inside the same 32 × 32 circle. Every app using the topbar receives this change. No pixel offset is quoted: the reading was taken against 0.23.3 in Chrome 152, when `--font-sans` was Poppins, while 0.25.0 changed it to IBM Plex Sans. Therefore, that measurement is not the value shipped in this release. Four other rules received the same declaration but repaint nothing: the drawer close, toast close, theme toggle, and feedback composer's dismiss each render one `<svg>` and no text characters, across the 60 story renderings the kit provides.", ['Topbar', 'Drawer', 'Callout', 'Feedback']],
      ['fixed', "Three clickable rows now reset the browser styling applied to a `<button>`. This is the reset that 0.25.1 gave only to `.ui-dropdown__item`. Each row is rendered by the kit as a control but not as a button: `.vopt` is a `<div>` with a role and a tabindex, `.ui-card--interactive` is an `<a href>`, and `.ui-fbpill` is a bare `<div>`. Previously, a consumer who rewrote one of these rows as a button for keyboard access received the grey fill, 2px outset frame, centred line, and `font: 400 13.3333px Arial` measured by #251 on the dropdown row. `.vopt` now specifies all five properties: `width`, `background`, `border`, `text-align`, and `font`. `.ui-card--interactive` and `.ui-fbpill` specify three each. The two omitted properties are deliberate: both already declare their own background, and neither is a block-level box in normal flow. The card is a grid item everywhere the kit renders it, and the pill is `inline-flex`, so adding `width` to either would create a live pixel change based on a guess rather than a measurement. The rule uses `font`, never only `font-family`, because the browser writes one shorthand. Restoring the family alone would leave the size and leading unchanged, and any font longhand that a rule keeps must come after the shorthand. The non-goal in docs/specification.md was amended to match rather than reversed silently: hand-written markup remains unsupported, except for a row the kit renders as a control, which the consumer must rewrite as a `<button>` when it needs keyboard operation. docs/library.md includes that markup with the attributes `wireDropdown()` needs to drive it.", ['Topbar', 'Card', 'Feedback']],
      ['changed', "Adding `width: 100%` to `.vopt` changes its shape for consumers who already styled that row. With `box-sizing: border-box`, it sizes the border box rather than the margin box. Therefore, a row with a horizontal margin now overflows its panel by exactly that margin. A row used as a flex item in row direction, or as a grid item under `justify-items: start` or `center`, no longer shrink-fits. It fills its track instead, and `text-align: left` carries the label to that edge. Neither shape exists in this repository, so no story moved and nothing here measures it. Consumers using either shape will see the change after upgrading.", ['Topbar']],
      ['added', "The clickable-style gate now compares rendered controls with and without browser button styling and records every exception. It mounts every clickable class the kit ships where a story renders it, once with the chrome a browser paints on a `<button>` and once without that chrome, then requires the two readings to be equal. It compares seven facets: background, border, font-family, font-size, line-height, text-align, and width. It discovers subjects from every `cursor: pointer` rule in the stylesheets instead of using a list. This means it can fail on a class the kit renders as a clickable thing but never as a button — the rendering nobody had seen, which is how #251 reached a release. The three classes it fails on and the three it leaves out are pinned by name as well as derived. A derived count does not change when a subject stops being a subject, so an entire defect could pass with exit 0: deleting one `tabindex=\"-1\"` from the dropdown component removed `.ui-dropdown__item` from the measured set while every count still added up. Rows the kit does render as buttons are measured, counted, and answered for in a ledger rather than failed. Twelve preserve the element's centring and four preserve its leading, with the pixel cost of each repair written beside it. Width is the one facet where equal readings are insufficient: `width: auto` and `width: fit-content` make the two readings agree while leaving the defect intact, so the gate rejects those values as well as comparing them."],
    ],
  },
  {
    v: '0.25.1', date: '2026-08-31',
    changes: [
      ['fixed', "Button rows now use the dropdown's intended styling instead of the browser's default button appearance. `.ui-dropdown__item` resets the browser styling applied to a `<button>`. Before this change, it reset only `border-radius` and `transition`, so a row written as a button—consistent with the component's `.ui-dropdown__tick` comment, \"listbox variant\", and its `.ui-dropdown__item.is-selected` state—appeared with the browser's own button skin. In Chromium 150 on the dark theme, the measured values changed as follows: `background-color` from `rgb(107, 107, 107)` to `rgba(0, 0, 0, 0)`; `border` from `2px outset rgb(255, 255, 255)` to `0px none`; `font-family` from `Arial` to the panel's own face; `text-align` from `center` to `left`; and width from 196.86px to the panel's own 226px. The result looked like broken stacking rather than a missing reset. A consumer reported this against 0.23.3 and spent twenty minutes investigating `z-index` before checking the computed styles. The five declarations are the ones `.ui-nav__item` has always used, except that the font face is reset with `font: inherit` instead of `font-family: inherit`. The browser supplies the shorthand `font: 400 13.3333px Arial`; resetting only its family would leave `13.3333px` and `line-height: normal` behind. `.ui-nav__item` avoids this because it declares its own size and line-height, but this rule declares neither. Inheritance keeps the font definition in one place: as of 0.25.0, `.ui-dropdown__panel` sets the face for the portalled case, and the row inherits it instead of naming the token again. `<div>` and `<a>` rows are unchanged because all five declarations already had their computed values.", ['Dropdown']],
      ['added', "A regression test now checks dropdown rows rendered as `<div>`, `<a href>`, and `<button>`. `stories/dropdown-tag-parity.test.js` mounts each row type against the browser defaults recorded in that measurement and fails when any of the five declarations is removed. The test documents one limitation instead of ignoring it: JSDOM forces `text-align: center` onto a `<button>` above any author rule, regardless of specificity or source order. Therefore, the test checks that declaration on the other two tags and keeps it explicitly in the shared rule for all three."],
    ],
  },
  {
    v: '0.25.0', date: '2026-08-31',
    changes: [
      ['breaking', "The kit now separates its reading typeface from its display typeface. `--font-sans` is now IBM Plex Sans, while Poppins moves to the new `--font-display`. Headings and brand marks therefore keep the face recognised from the deck, while tables, fields, paragraphs, and chat use a face intended for reading. Poppins is a geometric display grotesque with wide, round counters, a single-storey a, and low stroke contrast. At 13-14px it becomes difficult to read, especially in Cyrillic, which is most of the text rendered by applications built with this kit. In an admin panel reported against 0.23.3, changing only the text face reduced the mean row height in one dense table from 62.27px to 56.40px because three of twelve titles no longer wrapped onto a second line. To upgrade, load both fonts: the kit bundles no fonts, so a page that loads only Poppins now renders all text in the system stack behind it. The readme contains the snippet. If you want one family everywhere, add `:root { --font-sans: var(--font-display) }` after the kit stylesheet.", ['Tokens']],
      ['changed', "Typeface selection now follows the element's role, not its size. `h1` through `h6` use the display face from `base.css`, while everything else inherits the text face from `body`. A size threshold would be worse because resizing could change a heading's typeface halfway through the resize. Two component titles intentionally opt out: `.ui-drawer__title` and `.ui-confirm__title` are panel labels at 15px, not headings intended for reading. A brand lockup intentionally opts in at every size, including the 13px `.topbar .brand` runs.", ['Drawer', 'Confirm', 'Topbar']],
      ['changed', "Bold inline text now uses the semibold weight for better reading at small sizes. `b` and `strong` use `--weight-semibold` instead of the browser's 700. At the 13px size used by table rows and chat bubbles, 700 stops looking like emphasis and starts looking like a filled-in shape. Weight 700 remains available for anything that requests it by name."],
      ['changed', "The Typography Storybook page now shows separate display and text scales. It presents the same 13px paragraph in both faces side by side. Its previous standfirst, \"Poppins across the board — the deck's voice. One family, weights 300–700\", no longer accurately describes the kit."],
      ['fixed', "Portalled dropdown panels now keep the text face wherever they are mounted. With `portal: true` (0.24.0), the panel mounts on `<body>`, so its inherited font is determined by `<body>` rather than by the trigger's subtree. The same dropdown inside a display-face subtree measured `var(--font-display)` before portalling and `var(--font-sans)` after portalling. `.ui-dropdown__panel` now sets the text face explicitly, so positioning a panel no longer changes its typeface. Nothing visibly changed in the kit's own screens because every existing dropdown ancestor already resolves to the text face. The change removes the panel's dependence on that inherited condition.", ['Dropdown']],
      ['added', "Two tests protect the separation between display and text faces. `src/styles/typeface-roles.test.js` checks every family declaration in the kit and rejects declarations that name a family instead of a role. It then renders a document and reads the cascade: a heading must resolve to the display face, everything else to the text face, and `b` to the semibold step. Each rule is removed in turn so the assertion must fail without it. `scripts/font-loading.test.js` reads the families from the tokens and checks that every font-loading location in the repository loads all of them, including the readme snippet. This matters because the snippet is the copy of the font list used in other people's applications."],
    ],
  },
  {
    v: '0.24.0', date: '2026-08-31',
    changes: [
      ['added', "Dropdowns can now open upward without stretching between conflicting offsets. In `dropdown()`, `direction: 'up'` opens the panel into the space above the trigger, while `direction: 'auto'` measures on every open and flips only when there is no room below and more room above. The upward rule releases the kit's `top` value. Previously, `.ui-dropdown__panel` always set `top: calc(100% + 9px)`, so a panel opened upward with `bottom` also set had both edges pinned and stretched between them. The result was a box fourteen pixels tall, and consumers had to add `top: auto` by hand. Both offsets now use the same `--ui-dropdown-gap`, so the gap remains 9px in either direction. At 1280×800, a menu at the foot of a 249px rail changed from 128.8px tall and hanging 66px below the fold to 128.8px tall inside the available space, 9px from the trigger in either direction.", ['Dropdown']],
      ['added', "Dropdown panels can now leave clipped or isolated trigger subtrees by using `portal: true` on `dropdown()`. `wireDropdown()` mounts the panel on `<body>` as `position: fixed`, writes the trigger's viewport coordinates inline, and repositions the panel on scroll and resize. This is needed because `.ui-app__rail` uses `position: sticky` and `overflow-y: auto`, and each can trap a popover. Non-visible overflow on one axis makes the other axis non-visible too, so a 304px panel inside a 249px rail lost its right edge. A sticky ancestor also creates a stacking context regardless of the panel's `z-index`; therefore, `--z-dropdown` could not escape it, and `--z-overlay` did not help. A consumer reported this while building a workspace switcher at the top of an app rail. Before the change, `document.elementFromPoint()` at the panel's right edge returned the page's `.ui-card`; it now returns the panel.", ['Dropdown']],
      ['changed', "A portalled dropdown panel now carries its own `is-open` state. Once the panel moves to `<body>`, `.ui-dropdown.open .ui-dropdown__panel` no longer matches, so the open state cannot come from the container. `.open` still remains on the container, which keeps the chevron, `aria-expanded`, click-outside handling, and Escape handling unchanged. Keyboard handling is also bound to the panel because a keystroke on a row no longer bubbles to the container. If the container is re-rendered away, its panel is removed from `<body>` instead of leaving one panel behind per render.", ['Dropdown']],
      ['added', "Dropdown tests now verify both placement rules and viewport-positioning arithmetic. `src/components/dropdown.test.js` reads placement from the stylesheet: any panel rule that pins `bottom` must release `top`; every offset must use `--ui-dropdown-gap`; and the rule for opening a portalled panel must not require a `.ui-dropdown` ancestor. The wiring receives measured rectangles for its arithmetic because JSDOM has no layout of its own. Fourteen of the nineteen tests fail on the commit before this one."],
    ],
  },
  {
    v: '0.23.4', date: '2026-08-31',
    changes: [
      ['fixed', "`data-accent` now applies its accent without requiring `data-theme`. Previously, every accent cell required both attributes, so a document with only `data-accent` matched none of them and kept the default purple: the theme changed, but the accent did not. The kit's dark theme has never required an attribute. In `tokens.css`, it is declared with a two-line selector list whose first line is a bare `:root,`. Each dark accent cell now uses the same selector shape, so the accent is available in exactly the states where the theme is available. Light cells still have three attributes and therefore outrank the new bare line in specificity. A consumer reported this against 0.23.3 while building a document outside the app, where the host omits `data-theme` to mean \"follow the system.\" That state is dark, not unstyled. `docs/library.md` now explains this under \"An absent attribute means dark.\" The kit ships no `prefers-color-scheme` rule, so a host that wants the system preference must resolve it in JS and stamp the attribute; ui.apli.tech does this.", ['Tokens']],
      ['removed', "The kit now uses `--text` consistently and removes the conflicting `--ink` alias. `--ink` was a second name for `--text`, but the two values had already stopped agreeing. It was declared twice and read once by `body { color: var(--ink) }` in `base.css`, while every other kit rule read `--text`. Dark mode still matched at `#e9e7f0`, but light mode used `#1e232b` for `--ink` instead of `#1a1e27` for `--text`, making light-page body copy a shade lighter than the headings beside it. `base.css` now reads `--text`, and the alias is gone. Any page that directly references `var(--ink)` must change it to `--text`.", ['Tokens']],
      ['added', "A regression test now verifies the cascade when `data-theme` is absent. `stories/accent-without-theme.test.js` mounts the kit without `data-theme` and judges the rendered cascade rather than matching selector text. It checks that an unstamped `:root` resolves every semantic token, resolves them to the same values as `data-theme=\"dark\"`, and paints every accent. A fourth check keeps the two halves of each accent pair aligned. The bare cell ties in specificity with `:root[data-theme=\"light\"]` and wins by import order; therefore, if a dark cell declares a property that its light twin forgets, the test catches the dark ramp being painted on a light page."],
    ],
  },
  {
    v: '0.23.3', date: '2026-08-19',
    changes: [
      ['changed', "Five published files now keep only documentation pointers instead of repeating arguments.\n\nThis continues the same cleanup as 0.23.1 and 0.23.2, but with an important difference: nothing new was added to `docs/specification.md` or `CONTRIBUTING.md`. Every removed argument was already documented there, behind a `why:` pointer in the file.\n\n`src/tokens/tokens.css` loses 54 lines of prose about the spacing scale, the ring, and the signal ramps. Each repeated a measurement already recorded in the specification and checked by the gates. `src/components/shell.js` loses 33 lines, `src/components/overlay.js` 13, `src/tokens/accents.css` 10, and `src/styles/table.css` 10. The table text repeated the claim that `--dense` rounds its spacing tie downward. That claim is already held by `stories/table-rhythm.test.js` in the section titled \"The tie-break, held rather than argued for\".\n\nEach file keeps its `why:` pointers, and `scripts/doc-refs.test.js` resolves every pointer. Behaviour did not change: every edit under `src/` changes only a comment."],
    ],
  },
  {
    v: '0.23.2', date: '2026-08-14',
    changes: [
      ['changed', "Published stylesheets and components now keep only short notes and pointers in their headers.\n\n`src/tokens/tokens.css` previously explained why a signal colour used as a fill needs its own ink: one near-black colour clears all five signals in dark mode, while light mode needs a separate token because its signals are deepened to remain readable on white. `src/styles/callout.css` explained why a toast's accent, solid fill, and trailing action use three colours instead of one. Both explanations, including the measurements that determined them, are now in the Colour and contrast section of `docs/specification.md`.\n\n`src/styles/base.css` also argued for `:where()` in the icon reset. This keeps the filter inside `:where()` at zero specificity, allowing every component rule to outrank it. Without `:where()`, the selector has specificity `(0,2,1)` and beats every `.ui-btn svg` rule in the kit, which it previously did. This explanation is now in The reset is a floor in `CONTRIBUTING.md`.\n\n`src/styles/motion.css`, `reduced-motion.css`, `confirm.css`, and `loading.css` each keep a short note and a `why:` pointer. Behaviour did not change: every edit under `src/` changes only a comment."],
    ],
  },
  {
    v: '0.23.1', date: '2026-08-14',
    changes: [
      ['changed', "Two published files now point to their design documentation instead of carrying complete copies.\n\n`src/assets/icons.js` had a 31-line header. Its second half described the contributor rules for adding a glyph, including naming, grouping, and provenance. Those rules are now in Add a glyph in `CONTRIBUTING.md`. The documentation also records the incident behind the one-group rule: `card`, `chart`, and `doc` were each filed under two headings until #199.\n\n`src/components/loading.js` had a 43-line header describing the guarantees of the busy region. Consumers rely on those guarantees, so they are now in Pending and denied states in `docs/specification.md`: one live region that outlives its content, a skeleton that is `aria-hidden`, a `deniedState()` with no role of its own, and no spinner factory.\n\nEach file keeps a short note and a `why:` pointer, and the doc-refs gate resolves each pointer. Behaviour did not change."],
    ],
  },
  {
    v: '0.23.0', date: '2026-08-14',
    changes: [
      ['changed', "All kit transitions now use duration and easing tokens instead of repeated literal values.\n\nTwenty-six declarations across six stylesheets previously used their own duration values: `0.15s`, `0.16s`, `0.18s`, `0.2s`, and `0.35s`. Thirty-six declarations used a bare `ease`, which means `cubic-bezier(0.25, 0.1, 0.25, 1)`, rather than the kit's `cubic-bezier(0.4, 0, 0.2, 1)`. This created a second motion vocabulary that looked like the first.\n\nThe declarations now use the drawer's scale because the drawer is the transition whose reasoning was documented: a surface arriving or leaving uses `--dur-med`, a control changing state uses `--dur-fast`, and an entrance uses `--dur-slow`. These durations are listed with what each one times under Motion in `docs/specification.md`."],
      ['fixed', "Three menus now name their transition properties explicitly, so `visibility` changes correctly.\n\nTwo topbar menus and the dropdown panel previously transitioned `all`. Because `all` includes `visibility`, this discrete property stayed at its OLD value for the entire transition, so a menu remained `hidden` during the frame in which it opened. The declarations `transition: 0.18s ease` and `transition: 0.16s ease` also named no property at all.\n\nAll three transitions now name their properties, and every `visibility` transition in the kit uses `linear`. Previously, only the drawer and the confirm were checked for `linear` visibility timing."],
      ['added', "The motion scale now includes four named easing tokens and an instant duration token.\n\nAlongside `--ease`, the kit adds `--ease-out`, `--ease-in`, `--ease-sharp`, and `--ease-spring`. Each aliases a brand `--easing-*` primitive. `motion.css` previously wrote `cubic-bezier(0, 0, 0.2, 1)` by hand four times as a fallback; `tokens.css` now defines that fallback once.\n\n`--dur-instant` (80ms) also joins the duration scale for the same reason: transitions can use a shared named value instead of repeating a literal."],
      ['added', "The reduced-motion rules now ship once and are included in the React package.\n\nThe reduced-motion net moved to `src/styles/reduced-motion.css`, where it has one copy. `apliteni-ui/react/css` now ships that stylesheet too. The React package publishes its own stylesheet, and a consumer who imported only that stylesheet previously received no reduced-motion net.\n\nThis was a latent hole rather than a live one because `react/src` declares no motion today. However, the first transition added there would have shipped without protection."],
      ['added', "A new gate checks motion tokens, transitions, visibility timing, and reduced-motion coverage.\n\n`stories/motion-tokens.test.js` reads the duration table from the specification at run time. It resolves each token through `tokens.css` to the brand primitive it aliases, then checks that the milliseconds agree. It also scans every stylesheet under `src/` and `react/src/` for transitions that use a literal time or a bare curve, `visibility` transitions that use easing, or published entries that ship motion without the reduced-motion net.\n\nAmbient loops and choreographed sequences keep their own numbers. A spinner turns until the request answers, and the success check's disc, tick, and ring are timed against each other. Each such declaration states what kind it is and why, in a note at the declaration; the gate parses that note."],
    ],
  },
  {
    v: '0.22.0', date: '2026-08-14',
    changes: [
      ['changed', "Disabled controls are now painted with disabled colours instead of being faded with `opacity`.\n\n`opacity` is a group property: it moves a label and its surrounding box toward the background together. The resulting contrast depends on where that combined image lands. A disabled `.ui-btn--primary` measured 1.48:1 because white was placed on a washed-out accent, and no disabled control in the light theme reached 3:1.\n\nEvery disabled rule with a label beneath it now uses `--disabled-ink` on `--disabled-surface` at full opacity. This produces predictable compositing. Every disabled label in the kit now measures between 5.56:1 and 6.11:1 in both themes.", ['Button', 'Input', 'Nav', 'Dropdown']],
      ['added', "Disabled colours now use neutral aliases, so disabled controls no longer follow the accent ramp.\n\n`--disabled-ink`, `--disabled-surface`, and `--disabled-border` alias `--muted`, `--surface-2`, and `--border`. The colour ramp therefore has no additional disabled values to keep synchronized.\n\nThese aliases are neutral, so a disabled control does not move with the accent and drops the accent by construction. That is most of what makes the control read as inert."],
      ['added', "The disabled-state guarantee now requires both a 3:1 contrast floor and a visibly different colour pair.\n\n`docs/specification.md#colour-and-contrast` records both requirements. The contrast requirement is not higher because the counter-pressure is not on this axis: the disabled primary reads 5.56:1, while the enabled one reads 5.70:1, and nobody confuses white on purple with grey on grey.\n\nContrast provides legibility; the paint communicates the state. The guarantee therefore also says that a disabled control must never show the same pair of colours it shows when enabled. A control must not look available merely because it satisfies the contrast requirement."],
      ['changed', "The disabled-control gate now finds subjects from disabled selectors rather than from `opacity` declarations.\n\nThe gate takes its subjects from every disabled selector in the stylesheet, not from every rule that sets `opacity`. A gate based on one technique would become silent as soon as the technique changed.\n\nIt measures each subject twice: once as a story renders it, and once after removing the disabled state from the element and reading the cascade again. It rejects any `opacity` under a disabled selector when that selector has a label beneath it.\n\nThe only rule still using a fade is the switch track, which has nothing written inside it."],
      ['changed', "The accessibility floor page now records the disabled-state requirement as a real number.\n\nIts disabled gap has been retired: the ledger is gone, and the ratchet now states a real number."],
    ],
  },
  {
    v: '0.21.0', date: '2026-08-14',
    changes: [
      ['changed', "The kit now has three breakpoints instead of six.\n\n`860px` is where the page stops holding three tracks, `720px` is where the shell folds, and `560px` is where the layout becomes one column. Each value is a viewport class with its associated change, listed under Breakpoints in `docs/specification.md`.\n\nThree values that belonged to a single surface moved to the next larger step: the footer's second collapse moved from 460 to 560, the version switcher's label moved from 600 to 720, and the site's split hero moved from 760 to 860.\n\nThe purpose of folding upward, rather than choosing the nearest step, is to ensure that a layout reflowing at a wider viewport has at least as much room as before. No layout lost space during the cleanup."],
      ['added', "A gate now enforces the breakpoint list directly from the specification.\n\n`stories/breakpoints.test.js` reads the three steps from the specification's own table at run time, rather than keeping a second copy of the list. It fails when any `@media` prelude in `src/styles/` or `site/` contains a px value that is not one of the three steps.\n\nThe gate checks the list from both directions: a step that nothing queries also fails. This prevents the table from gaining a row merely to legalise a stray breakpoint.\n\nThe gate scans subjects from raw text rather than from a manually listed set. Raw text is what reaches the stylesheet inside `site/chrome.mjs`'s template literal. `site/public/` is build output and is never read."],
      ['changed', "The layout guideline now explains why matching numbers do not create a shared breakpoint token.\n\nThe Layout and density guideline records two coincidences: `560` is also `--panel-lg`, and `860` is also `--measure`. Nothing marks either coincidence at the query.\n\nA breakpoint asks about the viewport, while a token bounds a box. The numbers match today, but neither one follows from the other."],
    ],
  },
  {
    v: '0.20.0', date: '2026-08-14',
    changes: [
      ['fixed', "All three controls now meet the kit's 24 × 24 CSS px target-size floor: two got overlays, and one got a real box.\n\nWCAG 2.5.8 measures the target area, not the visible ink. A pointer landing on a control's `::before` reaches the control. Therefore, `.ui-toast__close` and the `.ui-check` input keep their drawn 19 × 19 boxes and each receives a centred 24 × 24 overlay. The overlay extends 2.5px on every side, with 12px of gap to the toast's action and 11px to the checkbox's own label.\n\n`.ui-snippet__copy` needed a real box instead. It was 0.56px short, and an invisible `min-height` was more reliable than an overlay that no test could measure.", ['Targets']],
      ['changed', "The target-size gate measures the area a pointer can reach, including pseudo-elements.\n\nEvery `sel::before` and `sel::after` rule is probed onto `sel`. A control's box is the union of its border box and the pseudo-elements it generates. The gate sizes those pseudo-elements from a declared width and height, or from insets against the padding box.\n\nThat distinction matters for the checkbox: its 1.5px border determines whether the overlay measures 24px or 21px. Without this calculation, the hit-area fix would have failed every test in that file and passed none."],
      ['added', "Three tests now protect the overlay-based target-size path and document its blind spots.\n\nOne test fails when no control in the kit reaches the floor through an overlay, so the overlay machinery cannot become untested. A second rejects an out-of-flow pseudo-element whose size the gate cannot read, preventing an unmeasurable target from hiding behind the implementation. A third derives the floor page's gap badge from the exemption list, so the two cannot be written separately.\n\nThe gate also states two blind spots it did not previously record: where an overlay sits, and whether an ancestor with `overflow: hidden` clips it."],
      ['changed', "The target-size gap on the accessibility floor page has been retired.\n\nThe exemption list now contains one entry: the story's own demo topbar, rather than kit code."],
    ],
  },
  {
    v: '0.19.1', date: '2026-08-14',
    changes: [
      ['added', "`docs/specification.md` now defines what the kit ships, guarantees, supports, and deliberately does not do. Every statement is checked by a gate that already runs with `npm test`. If a guarantee stops being true, the build fails instead of leaving an incorrect statement in the document."],
      ['changed', "`docs/adr/` has been removed, and its content is now organized by its audience. The specification contains guarantees for kit consumers. `CONTRIBUTING.md` explains repository mechanics, including how a gate finds subjects, how a number is pinned, and how a mutation proves that a rule is tested. The issue that settled a shape remains the place for explaining why that shape was chosen. Code behavior did not change: every edit under `src/` is a comment pointing to a new location."],
      ['added', "Documentation citations now have an automated validity gate. `scripts/doc-refs.test.js` checks every file tracked by git, finds text written as a citation, and resolves each reference. The referenced file must exist, and any anchor must be a heading in that file. A broken `why:` reference is worse than no `why:` reference because it suggests that the explanation exists. The gate discovers subjects instead of using a fixed list, so a citation becomes part of the check when it is written."],
    ],
  },
  {
    v: '0.19.0', date: '2026-08-14',
    changes: [
      ['changed', "All stroked glyphs now use at least 1.5 CSS px. The `stroke-width` rule established this limit and evaluated the two status glyphs; ten of the other thirteen glyphs were below it, including `.ui-snippet__copy` at 0.98 and `.ui-nav__crumb .ui-nav__ic` at 1.06. Eighteen rules were widened or given an explicit stroke instead of borrowing one. Their final widths are between 1.51 and 1.60, matching the range already used by the status glyphs. A glyph's weight therefore no longer depends on the slot where it appears. No token changed: widening a stroke changes how much colour reaches the eye, not which colour is used."],
      ['added', "The glyph-width gate now measures rendered elements instead of only reading stylesheets. Two cases are invisible to a stylesheet scan: a box override inherits its stroke from a rule seventy lines earlier, and another stroke comes from `icons.js` rather than a stylesheet. The gate therefore builds every story into a DOM and measures every glyph after resolving the cascade. It also rejects sizing rules that no story renders; this revealed that `.ui-feature__icon` shipped without any specimen. `docs/specification.md#icons-and-glyphs` records the rule and explains why a second control-glyph bar was rejected."],
      ['added', "The error-row glyph now has an explicit size. `.ui-field__error` rendered an icon at the reset value of `1.1em`, so its box changed with the font size where the icon appeared."],
    ],
  },
  {
    v: '0.18.0', date: '2026-08-14',
    changes: [
      ['fixed', "The focus ring now uses the accent colour at full opacity through one declaration. Previously, every ring was a handwritten `rgba()` with 0.25–0.38 alpha: one declaration per theme in `tokens.css` and six more in `accents.css`. Measurements used the backgrounds where the rings actually appear. None of the eight theme × accent cells cleared 3:1. Contrast ranged from 1.35:1 (light Emerald) to 2.21:1 (dark Emerald), below the 3:1 focus-indicator requirement in WCAG 1.4.11. Alpha caused the entire shortfall: `--ring: 0 0 0 3px var(--accent)` clears every cell, with a worst result of 4.22:1. Changing `--accent` now changes the ring automatically, so a sub-theme cannot omit a ring update.", ['Focus']],
      ['changed', "The seven duplicate `--ring` declarations have been removed. This deletes the light declaration in `tokens.css` and all six declarations in `accents.css`. A sub-theme now changes the accent family and inherits the ring, matching the structure already used elsewhere in that file. `docs/specification.md#the-focus-ring` records the decision and its eight measurements."],
      ['added', "The accessibility-floor page now states a 4.22:1 ring floor. `stories/guidelines/accessibility-floor.test.js` checks all eight theme × accent cells, discovering the accents from `accents.css`. It enforces a hard 3:1 minimum and fails if `--ring` is declared more than once anywhere under `src/`. The seven deleted declarations therefore cannot return one file at a time."],
    ],
  },
  {
    v: '0.17.0', date: '2026-08-14',
    changes: [
      ['changed', "Table row spacing now follows the spacing scale for both base and `--dense` rows. Six values changed: header under-padding changed from 11px to `--space-3`; body-cell padding changed from 15px to `--space-4`; dense header and cell padding changed from 14px to `--space-3` horizontally and from 10px to `--space-2` vertically; and the hover-row inset changed from 6px to `--space-2`. A base row is now 2px taller, while a dense row is 4px shorter. This makes the modifier more distinct: a dense row changed from 77% of a base row to 67%, saving 369px in a twenty-row ledger instead of 249px.", ['Table']],
      ['changed', "Three spacing values were exactly between two scale steps, and their purpose now decides how they round. The values were 14 between 12 and 16, 10 between 8 and 12, and 6 between 4 and 8. `--dense` rounds down because a modifier intended to fit more rows would lose its distinction if it rounded up. The hover inset rounds up because it provides clearance from a container edge, and clearance rounds away from that edge. `docs/specification.md#spacing-and-rhythm` records this rule and explains why no `--row-*` scale was created."],
      ['added', "The table-spacing gate now checks box spacing against the token scale. It reads the scale steps from the token file instead of duplicating them, discovers every padding, margin, and gap in the stylesheet instead of using a list, and enforces the tie-break itself. `--dense` must remain tighter than the rhythm it modifies; rounding a tie the other way would have violated that rule while leaving every other check green. The Layout and density page no longer records a gap that does not exist. Its `except` statement now explains the modifier's steps."],
    ],
  },
  {
    v: '0.16.0', date: '2026-08-14',
    changes: [
      ['added', "The reading column now uses separate scales for component boxes and text lines. Component boxes use `--panel-sm|md|lg` at 320/420/560px. Text lines use `--prose-caption|lede|body|dense` at 44/54/62/72ch, plus `--prose-display` at 14ch; this is not a measure, but the width where a display headline rags. These scales are not new: the drawer has used sm/md/lg at exactly those values since it was written. `--confirm-w`, `.ui-auth__card`, and the toast each repeated one of those values, so the two 420px uses under discussion were actually three. Prose tokens are named for what the reader is reading instead of using s/m/l, because writers know which kind of text they are creating."],
      ['changed', "Five widths changed, and each change was small. The toast and its stack changed from 400px to 420px (`--panel-md`); `.ui-section-head` changed from 620px to 560px (`--panel-lg`); the feedback confirmation line changed from 38ch to 44ch; the hero subtitle changed from 52ch to 54ch; and the shell subtitle changed from 60ch to 62ch. Two other prose widths changed from pixel limits to character limits: `.ui-empty__sub` changed from 340px to `--prose-caption`, and `.ui-denied__sub` changed from 380px to `--prose-caption`. At `--text-sm`, both measured to the same value, so identical sentence-shaped components now use one token instead of two declarations. Thirteen of the eighteen reconciled declarations did not change.", ['Toast', 'Empty', 'Denied', 'Feedback', 'Hero', 'Shell']],
      ['changed', "The measure gate now uses the smallest panel step as its floor instead of `--measure`. It reads that step from the token file instead of duplicating it in the test, so adding a step below 320px also lowers the floor. A bare `Nch` in a `max-width` now fails in the same way as a bare `Npx` at or above the floor, and both failures identify the nearest step. The paragraph explaining why the floor belonged to the reading column was deleted because it described a condition this release ends."],
      ['fixed', "The measure gate now reads inline `style=\"…\"` attributes as CSS. `site/index.html` contained a reading column on a plain div with an inline `max-width` of 840px. The previous sweep could not see it because it opened `<style>` blocks and nothing else. The value is now `--measure`, as is the changelog page's 820px wrapper. Finding this case also required a regular-expression fix: a declaration value allowed to cross a quote escaped its attribute and consumed the next twenty lines of markup, including `max-width`."],
      ['added', "The kit now documents its breakpoint convention. A breakpoint is the one width a token cannot express because a media query cannot read a custom property. The kit keeps the six literals under a documented list with a gate over that list, rather than adding a compiler between the source and the stylesheet consumed by users. `docs/specification.md#boxes-below-the-page` explains this choice and what `@custom-media` would have resolved."],
    ],
  },
  {
    v: '0.15.0', date: '2026-08-14',
    changes: [
      ['changed', "The two status glyphs now use strokes wide enough to meet their contrast requirement. The callout icon changed from 1.8 to 2.1, and the toast check changed from 2 to 2.8. `stroke-width` is expressed in the glyph's own 24-unit box, so the visible CSS width is `stroke-width × box ÷ 24`: the callout icon was 1.35 CSS px and the toast check was 1.08 CSS px. Below 1.5 CSS px, a stroke cannot place three quarters of its colour into any device-pixel row at 1×. WCAG 1.4.11 requires 3:1 for a *graphic*, which is appropriate for a graphic. The decision is that a stroke must be wide enough to count as one; below that width, the mark is optically a text stem and must meet the 4.5:1 text requirement instead. Both glyphs now exceed the line, so 3:1 has its intended meaning.", ['Callout', 'Toast']],
      ['fixed', "Callout icons now use text-grade `--chip-*-ink` colours. In the light theme, the raw signal colour is intended for graphics and cannot be read reliably as a stroke: the warn icon measured 3.10:1 against its own wash. The chip inks are the same five statuses at text grade, following the reasoning already used by the toast's trailing action since 0.9. In the dark theme, the raw signal and chip ink are equal by construction, so only the light theme changes. No token value changed.", ['Callout']],
      ['fixed', "The neutral toast check now has sufficient contrast in both themes. Previously, neutral `--toast-on` used `--strong`: white against a `--muted` circle in dark measured 3.11:1, while near-black against it in light measured 3.16:1. These were the two weakest pairs in the kit. `--toast-on` now uses `--signal-solid-ink`, because the neutral circle is `--signal-solid-neutral`: one fill uses one ink, matching the choice already made by the solid toast. The resulting measurements are 6.29:1 and 6.11:1.", ['Toast']],
      ['added', "The glyph-contrast gate now checks twenty status pairs against the requirement earned by each stroke. It covers two glyph families × five statuses × both themes. The gate discovers its subjects from the stylesheet: it finds families by scanning for a stroked `__icon`, and statuses by reading the tokens declared by their rules. It also discovers the five-status list that the solid-toast gate previously stored manually. A status that declares only some of its five paint tokens now fails instead of using whichever values happen to be in scope. `docs/specification.md#icons-and-glyphs` explains why the threshold is 1.5 CSS px and why the kit could not simply require 4.5:1 for every glyph."],
    ],
  },
  {
    v: '0.14.0', date: '2026-08-14',
    changes: [
      ['added', "Busy regions now announce pending and completed content reliably to screen readers. `busyRegion({ label, readyLabel, busy, body, lines })` and `setBusy(root, { busy, message, body })` represent a screen's pending state, and this is the kit's first component that announces it. The region renders once and remains mounted while the fetch runs; `setBusy()` replaces its body and rewrites the visually hidden line already inside it. A `role=\"status\"` added to the document together with its text announces nothing on several screen readers. Therefore, the obvious approach—render loading markup and then replace it with loaded markup—is silent in the exact situation it is meant to support. Busy regions reuse the `role=\"status\" aria-live=\"polite\"` pair already used by `toast()` and `success()`. A gate now fails any `aria-live` in the kit that is not polite, and it fails any `role=\"alert\"`.", ['Loading']],
      ['added', "Skeleton components now reserve the layout and share one shimmer that respects reduced-motion preferences. `skeleton({ lines, width, height, radius })` and `skeletonTable({ rows, cols, head })` create placeholder shapes that reserve the upcoming layout, so the page does not jump when rows appear. `lines` accepts either a count or an array of widths. Both components remain `aria-hidden` throughout because a shimmer represents content visually rather than providing content itself. Both reuse `.m-skeleton` from the motion library, so the kit has one shimmer implementation and reduced motion is already handled. The kit deliberately has no spinner factory: `.ui-btn__bars` and `.ui-fbspin` already spin, and each owns its context. At screen scale, a skeleton communicates more because it shows the shape that is coming.", ['Loading']],
      ['added', "Denied states now explain which permission is missing without competing with the fetch announcement. `deniedState({ title, sub, need, actions, icon })` renders a 403 in the layout language of `emptyState()`. To a reader, both states describe the same event: what they requested is not available. The lock identifies the denied state. `need` names the missing scope verbatim, such as `reports.read`, so a reader can request the specific permission. The phrase \"insufficient permissions\" does not provide enough information about what to request. The component has no live region of its own. When placed inside a `busyRegion()`, it is announced as the result of the fetch; two regions announcing the same event would make a screen reader repeat it.", ['Denied']],
      ['added', "The kit now includes `.ui-sr` for text that only assistive technology should receive. `.ui-sr` is the visually hidden utility the kit previously lacked. Its message is for assistive technology only; sighted readers are already looking at the skeleton."],
      ['added', "React now supports busy buttons and persistent busy-region announcements. React accepts `busy`. `<Button busy>` sets `aria-busy`, disables the button, and draws the kit's bars. This follows the same rule that `button()` has used since day one, but no React component could express it until now. The release also adds `Skeleton`, `SkeletonTable`, `BusyRegion` and `Denied`. `<BusyRegion>` announces the transition by remaining mounted. Unmounting it and mounting the loaded view in its place creates the same silent bug in JSX, and tests on both sides assert that the region element survives.", ['Button', 'Loading', 'Denied']],
      ['fixed', "The Guidelines / The full state set page now documents loading as an implemented state. Its `loading` rule previously carried an `unmet` marker, rendered as a *Gap #128* badge on the guidelines overview. That marker said the kit had no screen-scale pending state to photograph. The page now includes the do/don't pair that previously could not be drawn. The do example is a real live region, so a screen reader on that page hears the state described by the rule."],
    ],
  },
  {
    v: '0.13.0', date: '2026-08-13',
    changes: [
      ['changed', "The kit's standard page container is now 1120px instead of 1180px. `.ui-container`, `.topbar__in` and `.ui-footer__in` now use one token, making every page built from them 60px narrower. The number is not new: it is the width ui.apli.tech has always used. The site achieved that width by overriding the kit's own topbar, so its CSS disagreed with the component it borrowed. Because nothing in the kit explained why 1180 was used, that override was the only recorded intent. To restore the old width, set `--container: 1180px` on `:root`; all three surfaces will follow it.", ['Container', 'Topbar', 'Footer']],
      ['added', "The kit now distinguishes page width from reading-column width with `--container` and `--measure`. These are the two widths a page actually has. `--container` spans the page from gutter to gutter. `--measure` is 860px and defines the reading column inside a track that already has a sidebar; `.ui-app__main` uses it. Because these widths describe different axes, one cannot replace the other: a shell whose main column is `--container` has no sidebar. Before this change, the kit had ten different page-scale numbers and no token for any of them."],
      ['fixed', "The app shell now takes its reading width from the stylesheet unless you provide an explicit override. `shell.js` previously contained its own `860px` beside the same number in `layout.css`, and a test compared the two strings to keep them equal. That was two sources protected by a guard, rather than one source. When you omit `maxWidth`, the shell now writes no property, so the stylesheet resolves to `--measure`. If the value is unusable, the shell removes the property instead of passing it through. This matters because a custom property accepts any token stream: a bad value is still a *valid* declaration, but it makes `max-width` invalid at computed-value time and expands the column to the full track. An explicit `maxWidth` continues to work exactly as before.", ['Shell']],
      ['added', "A new gate rejects literal page-scale `max-width` values in `src/styles` and on the site. It finds violations by scanning the property instead of reading a file list, so new stylesheets are covered automatically. The gate reads its minimum from `--measure` instead of writing that floor into the test. Media queries are excluded because a breakpoint describes the viewport, not a width assigned to a box. The test states this distinction directly and checks it against a live breakpoint that sits on the floor itself."],
      ['added', "The Guidelines / Layout and density page now explains the two widths and the source of density. It covers the two widths, why one source is better than two sources kept in step, and where density comes from. The kit has no density mode, and that is intentional rather than an omission: the spacing scale controls density. `.ui-table--dense` is the only component-local exception, and the page states plainly that its numbers are literals rather than spacing steps."],
    ],
  },
  {
    v: '0.12.0', date: '2026-08-13',
    changes: [
      ['fixed', "Status glyphs and close buttons now use different shapes. A danger `toast()` previously rendered the same bare `x` twice: on the left, it meant *this failed*; on the right, it meant *make this go away*. Readers had to infer the meaning from position. Status messages now use the circled glyphs the kit already shipped but did not use: `circleCheck`, `circleX`, `circleAlert`. The bare `x` belongs only to the close button. The rule is useful when you choose your own icon: a circled glyph represents a state reported by the system, while a bare glyph represents an action the reader can take. `info` and `neutral` are unchanged, and any value passed as `icon` still takes precedence.", ['Toast', 'Callout']],
      ['added', "The kit now checks which actions may use an icon-only control. `iconOnlyAllowed` is the closed list of actions for which a control may omit its visible label: close or dismiss, copy, overflow menu, and expand or collapse. Every kit glyph is `aria-hidden`, so an icon-only button has always needed an accessible name. That requirement prevented nameless buttons but did not decide which actions should be wordless; `iconOnlyAllowed` now does. A gate now checks the kit's own call sites against this list and found one violation on its first run: a settings cog in the button stories.", ['Button']],
      ['added', "The kit now documents the meanings of glyphs that components choose automatically. `iconMeanings` describes what a glyph means when a component selects it instead of you naming it. It covers the eight glyphs that the kit wires to semantics."],
      ['fixed', "The icon catalogue now declares `card`, `chart` and `doc` only once each. The `COMMS` group had re-declared all three with byte-identical path data. As a result, the catalogue filed each glyph under two headings, and the file contained three lines that were indistinguishable from real glyph declarations. Nothing you call changes: `icon('card')` resolved correctly throughout. A gate now fails whenever a name is declared in more than one group.", ['Icons']],
      ['added', "The Guidelines / Iconography page now explains icon-only controls and the cost of adding a glyph. It covers when a control may be wordless, what each glyph means, and what adding a glyph requires: a name, its group, and the source of its path. Each rule links to the gate that enforces it."],
    ],
  },
  {
    v: '0.11.4', date: '2026-08-13',
    changes: [
      ['fixed', "A toast's trailing action now remains readable in every status and theme. The action previously used the status accent, a colour selected for a 3px rule and a 22px icon circle rather than for text. In the light theme, a warn action measured 3.29:1 against its own wash, below the AA requirement of 4.5:1; success, info and danger were also below the requirement in at least one style each. The action now uses the kit's text-grade signal inks, the same inks used by chips. Its hover treatment also changed: it previously added a second wash of the status colour, moving the background towards the ink that needed to remain legible. As a result, the hovered action was less readable than the resting action. It now lifts towards the page instead. The dark theme is unchanged because its two inks already have the same value. Nothing passed to `toast()` changes.", ['Toast']],
      ['added', "The toast action colour is now independently configurable through `--toast-action-ink`. `--toast-action-ink` controls the trailing action's colour and is set per status alongside `--toast-accent`. Override it when you want the action to use your own colour. `--toast-accent` still controls the marker, icon circle, timer bar and outline border.", ['Toast']],
      ['fixed', "The React data table's sort caret is now readable in the light theme. It previously used muted ink at half opacity, reducing the sort-direction glyph to 2.16:1, below half the AA floor. The opacity has been removed, so the caret now uses muted ink at full strength.", ['DataTable']],
    ],
  },
  {
    v: '0.11.3', date: '2026-08-13',
    changes: [
      ['fixed', "The accent picker now shows Nebula with the violet colour it actually produces. Its swatch previously used a fixed gradient and stopped tracking the tokens in 0.11.0, when the default accent was lightened to meet AA on its own wash. Therefore, the chip for the kit's default accent contained neither colour that the accent resolves to. Phoenix, Ocean and Emerald were already correct and are unchanged. Every swatch now uses its own accent's ramp, and a test keeps it synchronized instead of relying on a line in the contributing guide.", ['Footer']],
    ],
  },
  {
    v: '0.11.2', date: '2026-08-13',
    changes: [
      ['added', "The kit now includes five guideline pages in Storybook. They appear under Guidelines, with an index explaining what each page covers and how many of its rules the kit meets. The pages cover colour and theming, the full state set, which component suits which job, microcopy and tone, and destructive actions. Every rule shows a live do and don't built from real components and cites the kit lines that implement it."],
      ['added', "Two guideline rules now state that the kit does not meet them and identify their tracking issues. A guideline that has not been implemented is more useful when it is written down and marked than when it is omitted. It is less useful than no guideline at all if it is presented as already true."],
      ['changed', "The design rules now live in Guidelines instead of `CONTRIBUTING.md`. The five rules cover tokens over literals, constant signal colours, the states a component owes, both themes and all accents, and controls naming the state they represent. They are now in the guidelines and have been deleted from the contributing guide rather than copied. Nothing you install changes. If you bookmarked a golden rule by number, it now has a page instead."],
      ['fixed', "The wording guideline now uses the clearer button label `Revoke access`. It previously cited a button labelled `Revoke`, which failed the rule's explicit test: does the label make sense on its own? The example screen now says `Revoke access`, and the rule first cites the kit's own confirmation."],
    ],
  },
  {
    v: '0.11.1', date: '2026-08-13',
    changes: [
      ['fixed', "A drawer now stops accepting clicks as soon as its closing animation starts. Its panel and scrim previously remained hit-testable for the full close fade. A click during that interval could still reach a control inside the panel and run its handler a second time; even a double-click on the drawer's own button was enough. The closing animation itself is unchanged.", ['Drawer']],
      ['fixed', "Escape now closes the overlay you can see. When two overlays were open, Escape closed whichever root came later in the markup, even if it was underneath. A confirm painted above a drawer could therefore become inactive when the confirm was written before the drawer it asked about. Opening a confirm over a live drawer with `openConfirm()` was never affected.", ['Drawer', 'Confirm']],
    ],
  },
  {
    v: '0.11.0', date: '2026-08-12',
    changes: [
      ['added', "`appShell()` now provides one standard page shell. It contains a full-height rail built with the kit's own `sidebarNav()`, beside exactly one `<main>`. You control the breadcrumb trail by passing `crumbs`; the shell renders `breadcrumbs()`. If you pass nothing, there is no trail. The topbar is disabled unless you request it.", ['Shell']],
      ['added', "The rail now becomes an icon rail below 720px instead of disappearing. Each row keeps its accessible name at every width, and the icon target is 45×44px on a phone. Previously, a 375px screen showed three navigation links, but none could be reached.", ['Shell']],
      ['breaking', "`accountShell()` is now a preset built on `appShell()`, so its markup has changed. It now emits a `<main>`, its sidebar is `sidebarNav()`'s `.ui-nav--side` instead of a hand-written `.ui-side`, and its breadcrumb comes from `breadcrumbs()`. It still accepts every previous option, including the old `[id, icon, label, href, target]` navigation tuples. However, your CSS or scripts can no longer find `.ui-side`, `.ui-shell`, `.ui-shell__crumbs`, `.ui-shell__page` or `.sub`, because the shell no longer emits that markup. The shell also no longer emits `.ui-card-stack`. That rule remains in `card.css`, so your own markup using the class keeps the same spacing. Within the shell, the card stack is `.ui-app__body`, and the page subtitle is `.ui-app__sub`.", ['Shell']],
      ['breaking', "`ACCOUNT_NAV` is now a list of `{ id, icon, label }` objects. It is no longer a list of `[id, icon, label]` tuples. `sidebarNav()`, `appShell()`, `accountShell()`, `topbar()` and `accountMenu()` accept either shape, so passing it to any kit navigation still works. If you spread or destructure its entries yourself, update that code.", ['Shell']],
      ['breaking', "Navigation labels must now be passed as raw text, not pre-escaped entities. Every navigation primitive escapes its input, so `['x', 'gear', 'Access &amp; agents']` renders as `Access &amp;amp; agents`. The kit's earlier `ACCOUNT_NAV` used an entity because the old shell inserted raw HTML. Wherever you previously passed entities, pass raw text such as `Access & agents` instead.", ['Shell']],
      ['breaking', "`crumb` is now escaped and displayed as text. Previously, the shell inserted it inside its own `<b>` element; it now passes it through `breadcrumbs()`, which escapes every label. Therefore, `crumb: '<em>Payouts</em>'` previously rendered italic text, but now renders the tags as text. The breadcrumb trail has no markup slot. If you need an icon, pass an item with an `icon` to `appShell({ crumbs })`.", ['Shell']],
      ['changed', "`sub` is now a `<p>` instead of a `<div>`. It remains a trusted-HTML slot, but a `<p>` closes when the parser reaches the first block element. Therefore, `sub: '<div>block</div>'` now leaves a stray `</p>`. Inline markup is unaffected; put block-level content in `body`.", ['Shell']],
      ['removed', "The stylesheet no longer includes `.ui-side` or `.ui-shell`. No component emits that markup anymore.", ['Shell']],
      ['fixed', "Rail labels now keep the kit's colour when a host stylesheet defines `a:link`. The kit's `.ui-nav__item` declaration had specificity (0,1,0), while the host's `a:link` had (0,1,1), so resting rail labels used the host's link colour. Breadcrumb links are protected in the same way."],
      ['fixed', "Badged rail rows now announce their count. Every row has an accessible name at every width, and building the name from only the label had changed \"Pending 3\" to \"Pending\"."],
      ['fixed', "The signed-in reader is now outside the rail's navigation. Previously, a screen reader announced the reader's email address as a navigation entry."],
      ['fixed', "The shell no longer invents a reader name when you provide none. If a caller passed only an address, or no account at all, the topbar menu previously filled the gap with the kit's demo person. A page could therefore show your reader in the rail and someone else beside it.", ['Shell']],
      ['changed', "The account menu now uses the display name for initials when one exists, and the address otherwise. Previously, it always used the address, so the rail and menu could show different marks for the same reader."],
      ['changed', "`ACCOUNT_NAV` now stores its ampersand as `&`, not `&amp;`. If you read the constant's labels yourself, they are raw text."],
    ],
  },
  {
    v: '0.10.0', date: '2026-08-12',
    changes: [
      ['breaking', "`drawer({ open: true })` now opens for real: the page behind goes inert, Tab stays in the panel, and Escape closes it. For a sidebar or inline specimen that should remain visibly open without this interaction, use `specimen: true`. `confirm()` interprets `open: true` in the same way."],
      ['added', "`confirm()` now provides a focus-trapped modal for questions that must be answered before an irreversible action. It appears over a scrim; Escape cancels it, and it opens on the safe answer. This means a reader who presses Enter out of habit keeps what they have."],
      ['fixed', "Opening a drawer now places focus inside it. Previously, focus was requested while the panel still counted as hidden, so it went nowhere. At the same time, the page behind was already hidden from assistive technology, leaving the reader on the document body with nothing to read or tab to.", ['Drawer']],
      ['fixed', "Multiple open overlays now restore assistive-technology access correctly. When two drawers, or a confirm over a drawer, were open, closing them out of order could leave everything outside them `inert` until a reload."],
    ],
  },
  {
    v: '0.9.1', date: '2026-08-09',
    changes: [
      ['changed', "This release restores the package's source and npm contents without changing rendering or the API. Version 0.9.0 shipped, and then two comments inside shipped stylesheets changed without a version bump, so the npm package no longer matched the source. Upgrading from 0.9.0 makes them agree again; it changes no rendering and no API."],
      ['fixed', "Releases are now published automatically after a version bump reaches `main`. The bump is tagged, a release is created with notes from its changelog entry, and the package is published. A pull request that changes what the package ships without bumping the version now fails. A daily check opens an issue when npm and `main` disagree for more than a day. Silence no longer looks the same as success."],
    ],
  },
  {
    v: '0.9.0', date: '2026-08-09',
    changes: [
      ['breaking', "The inline-icon reset now has lower priority than your icon rules. `svg:not([width]):not([height])` counted both attribute selectors and had specificity (0,2,1), so it silently outranked every `.ui-btn svg`-style rule in the kit and your CSS. It is now `svg:where(:not([width]):not([height]))` with specificity (0,0,1). Any icon rule that was losing to the reset now applies, so icons you sized yourself will use the size you requested."],
      ['added', "`footer()`, `success()`, `successCheck()` and `wireSuccess()` can now be imported from the package root. They existed in the source but were missing from the entry point, so they could not be imported."],
      ['added', "`empty.css` is now included through `/inline`. Empty-state styles therefore reach users who load the inline stylesheet instead of the built stylesheet."],
      ['fixed', "The theme control now reports the current theme, not the theme a click would produce. This applies to both the glyph and accessible name; the name is rewritten whenever the state changes.", ['Topbar']],
      ['fixed', "`--pink` now clears the surfaces on which it is drawn in both themes. In light mode, the live pill and info badge also now meet AA contrast.", ['Badge', 'Callout']],
      ['fixed', "Glow washes now use a tint of the colour they carry. Values that had drifted have been aligned again, and a test keeps them aligned."],
      ['fixed', "The danger navigation row is quiet at rest and uses `--pink` on hover. This matches the destructive-actions guideline."],
      ['changed', "Colour contrast is now measured against the rendered styles, not judged only by eye. Each story is mounted for every theme with the real stylesheets, and each text-owning element is measured against the background actually composited beneath it. Pairs below the required bar are recorded with a written reason instead of being left for someone to rediscover."],
    ],
  },
  {
    v: '0.8.1', date: '2026-08-07',
    changes: [
      ['fixed', "The zebra table recipe now keeps its end cells inside the container border. A striped row therefore no longer runs into that border.", ['Table']],
      ['fixed', "The homepage audience switcher now announces and behaves as a tablist. It uses roving tabindex, arrow keys and `aria-selected`."],
      ['fixed', "The Storybook toolbar selector works again, and the workbench no longer composes stories from outside the kit."],
      ['fixed', "Releases can publish again because `npm publish` now receives the tarball as a file path. Previously, npm received a bare `a/b` path, interpreted it as owner/repo shorthand, resolved a repository instead of the file, and failed with a public-key error."],
    ],
  },
  {
    v: '0.8.0', date: '2026-08-07',
    changes: [
      ['added', "React components are now available from `@apliteni/apliteni-ui/react`. The package includes Button, Badge, Card, Icon, Modal and DataTable, with their own stylesheets and stories. The vanilla kit is unchanged and remains the source of truth for tokens."],
      ['added', "Storybook now contains a Guidelines area, beginning with destructive actions. Each rule cites the kit lines that implement it, and a test fails the build when a cited line no longer matches its reference."],
      ['added', "Storybook now switches themes with one click instead of a dropdown."],
      ['fixed', "Light-mode Phoenix and Emerald are now darker to meet WCAG AA. Both previously failed contrast requirements as text and as a button fill."],
      ['fixed', "Danger uses `--pink` everywhere, and components now get colour from tokens instead of scattered literal values."],
      ['fixed', "Field errors are now connected to their fields, decorative icons are hidden from assistive technology, and every icon-only control has a name. The accessibility gates intended to catch these problems now run.", ['Inputs']],
      ['changed', "The icon set now uses canonical Feather/Lucide glyphs throughout. The same idea therefore uses the same drawing everywhere."],
      ['changed', "Storybook was upgraded from 8 to 10, and Vite from 5 to 6."],
    ],
  },
  {
    v: '0.7.2', date: '2026-07-24',
    changes: [
      ['changed', "The package is now licensed under MIT instead of proprietary/UNLICENSED. Because it is published on public npm, MIT matches its actual use: you can install and use it freely across your products."],
    ],
  },
  {
    v: '0.7.1', date: '2026-07-24',
    changes: [
      ['fixed', "Table-row hover no longer touches the container border. `.ui-table--hover` now draws the highlight as an inset, rounded pill, with a few px of space from the edge, instead of a full-bleed rectangle. Dense/zebra ledgers keep their existing full-bleed tint."],
      ['changed', "The homepage now gives clearer feedback and stronger visual details. Code-block Copy buttons change from a copy glyph to a checkmark after success; with reduced motion, the change happens instantly. Bento icon tiles use larger, crisp glyphs, and the footer now has a visible link hover plus an Apliteni → apliteni.com link."],
    ],
  },
  {
    v: '0.7.0', date: '2026-07-24',
    changes: [
      ['added', "A new accessible Tabs component is available through `tabs({ items, active, name })`. It renders a tablist and panels as a framework-agnostic HTML string, and you connect its behavior with `initTabs()`. It follows the full WAI-ARIA pattern, including roving tabindex, Arrow/Home/End keys, and `aria-selected` and `aria-controls` wiring. See the new Components → Tabs story."],
    ],
  },
  {
    v: '0.6.1', date: '2026-07-23',
    changes: [
      ['changed', "The theme toggle is now one compact icon-only switch. It uses a sun/moon button without \"Light/Dark\" text and keeps its `aria-label`, so the accessible name remains available. This affects `topbar({ theme: true })` and the site chrome."],
    ],
  },
  {
    v: '0.6.0', date: '2026-07-23',
    changes: [
      ['removed', "The Aurora background has been removed. The `aurora()` component and `.ui-bg-aurora` backdrop are gone because nothing in the kit used them. The ambient `.ui-glow` blobs and the other backdrops—spotlight, accent wash, grid and dots—remain. Removing a public export is a breaking change, so this release uses a minor version bump."],
      ['added', "The homepage bento now shows more of the kit and separates its content into panels. It includes live Icons and Motion cells; each block has its own hue and no card hover."],
    ],
  },
  {
    v: '0.5.0', date: '2026-07-23',
    changes: [
      ['added', "Added a token-driven motion library with reusable effects for entrances, interactions, attention, and scroll reveals. The plain classes include entrances (`.m-fade-in`, `.m-slide-up/-down/-left/-right`, `.m-scale-in`, `.m-blur-in`), micro-interactions (`.m-lift`, `.m-press`, `.m-skeleton`), attention effects (`.m-pulse`, `.m-shake`, `.m-draw`), and staggered scroll reveals (`[data-reveal]` plus the optional `initReveal()` hook). The library is demonstrated in Foundations → Motion with a live token table and a Replay playground."],
      ['added', "Added one global `prefers-reduced-motion` rule that disables every animation and transition in the kit. This closes the previous gaps affecting the badge pulse and smooth scroll, while allowing one-shot animations to finish on their final frame."],
      ['changed', "Connected motion tokens to the Apliteni design-system vocabulary. Durations and easings now sync from design-system (`--duration-*` / `--easing-*`); the kit's `--dur-*` / `--ease` tokens alias those values, and new `--delay-1…5` tokens support staggered effects."],
      ['changed', "Rebuilt the landing-page \"Built for people and agents alike\" grid as a bento layout with separate hues for each cell. Card hover was removed, so the blocks remain visually distinct and the real controls inside each block no longer compete with a card-level animation."],
    ],
  },
  {
    v: '0.4.0', date: '2026-07-21',
    changes: [
      ['added', "Added an ambient aurora background with drifting glow blobs and optional paper grain. The `aurora()` function reads accent tokens, so it automatically re-themes across Nebula, Phoenix, Ocean, and Emerald without per-app CSS. It supports full-bleed `fixed` mode and respects `prefers-reduced-motion`."],
      ['added', "Added an accessibility CI gate that runs every story through axe under `npm test`. It checks WCAG 2.0/2.1 A + AA requirements, so accessibility violations cannot regress unnoticed."],
      ['added', "Added the Apliteni seedling to the Brand page beside the kit prism. Both marks now include a size ramp."],
      ['fixed', "Fixed the WCAG A/AA violations reported by the accessibility panel. Every input now has a real label, listboxes have names, and the `select()` factory is available."],
      ['fixed', "Separated the consent-card brand lockup so the mark no longer touches the label. `.brand` is now self-contained outside the topbar."],
      ['fixed', "Included the aurora CSS in the inline and server-render bundles. It is now available through the `/inline` export and the site's `kit.css`, not only through the bundler entry."],
      ['changed', "Reduced the visual intensity of the Storybook manager chrome. Purple now works as a limited accent instead of filling the interface."],
    ],
  },
  {
    v: '0.3.0', date: '2026-07-21',
    changes: [
      ['changed', "Made the light theme a true white application. `--bg` and `--surface` are both `#ffffff`, with retuned neutrals so downstream products no longer need to fork the CSS."],
      ['added', "Added the finance data-table treatment and semantic status badges to the kit. The table classes are `.ui-table--dense/--zebra/--hover`, with `__num` and `__code` cell classes."],
      ['fixed', "Improved light cards and table overflow on white backgrounds. Cards now use a hairline border and soft shadow to read as panels, while an overly wide table scrolls inside its card instead of extending beyond the corners."],
    ],
  },
  {
    v: '0.2.4', date: '2026-07-20',
    changes: [
      ['fixed', "Moved the active segmented pill inside its track and added a tighter `--shadow-seg` token. The previous heavy card shadow extended beyond the edge and looked like overflow.", ['Segmented']],
    ],
  },
  {
    v: '0.2.3', date: '2026-07-20',
    changes: [
      ['added', "Added a gradient-bars busy loader to buttons. The button is disabled while its operation is in progress.", ['Button']],
      ['added', "Added a centered Google-SSO sign-in with a glow and separate idle and signing-in states."],
    ],
  },
  {
    v: '0.2.2', date: '2026-07-20',
    changes: [
      ['added', "Added the `--accent-strong` token so primary buttons meet WCAG AA contrast requirements.", ['Button']],
      ['added', "Added the `--seg-active-bg` token so the active segmented pill remains clear in dark mode.", ['Segmented']],
      ['added', "Added a sign-in story that supports Google SSO only."],
      ['fixed', "Fixed card-grid alignment by moving spacing to `.ui-card-stack`. The child margin had leaked into rows and caused misalignment.", ['Card']],
      ['changed', "Removed the automatically generated Storybook \"Docs\" pages. The intro wordmark now reads apliteni-ui."],
    ],
  },
  {
    v: '0.2.1', date: '2026-07-20',
    changes: [
      ['fixed', "Improved the landing-page hero and feature previews. Feature icons are larger, preview cards are aligned, and the hero has more room."],
      ['changed', "Moved the version into a navigation pill and removed the Strategy footer link."],
    ],
  },
  {
    v: '0.1.2', date: '2026-07-20',
    changes: [['fixed', "Enlarged the consent-scope icons and app-chip icons."]],
  },
  {
    v: '0.1.1', date: '2026-07-20',
    changes: [['fixed', "Kept the account menu hidden until the session is confirmed. It becomes visible when `.acct.on` is active."]],
  },
  {
    v: '0.1.0', date: '2026-07-20',
    changes: [
      ['added', "Published the first release with tokens, components, and the deck theme."],
      ['added', "Added the Nebula, Phoenix, Ocean, and Emerald accent sub-themes in both dark and light modes."],
      ['added', "Added the Storybook workbench and the ui.apli.tech landing page."],
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
