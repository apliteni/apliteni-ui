# Notifications: layout variants for #798

These are design prototypes for issue #798. They are not part of the kit. The pictures are in `shots/`. All data is fabricated.

The owner's goal, from the dispatch: "An icon button with a count badge, for the side nav and the top bar. It shows no badge at zero. A notifications list. Each row has an icon, a title, a time and a link. An empty state and an error state for the list. The same parts on a phone."

The coordinator decided that no new kit component is allowed. Each variant is a composition of kit parts. The only local CSS is layout glue in `glue.css`.

## Three answers

1. **Why is it necessary?** A product that must tell a user about new problems builds its own bell, badge and list (#798). Each product sizes, places and names the count in a different way (#529).
2. **How often does the problem occur?** In the 41 days from 2026-10-01 to 2026-11-10, 3 issues asked for it: #529 (closed as not planned), #622 (closed as a duplicate of #529) and #798. No issue names a product that uses it. The repository rule for a new component needs two named products, so a composition is correct.
3. **Is there a simpler option?** Yes. Variant D is a labelled "Notifications" section in the side nav with the shell's own count. It needs no glue and no kit exception. It hides the count at zero, it gets the kit's current style, and it shows in the phone menu. It is not an icon button, and an app with one section has no side nav, so D gives that app no control.

## Variants

| Variant | Where the list opens | Kit parts |
| --- | --- | --- |
| C | A Notifications page that the bell links to | AppShell head control, nav row link with the nav badge, DataTable, EmptyState, Callout |
| D | A Notifications page that a nav section links to | AppShell sections with `count`, SidebarNav, DataTable, EmptyState |

## Recommendation

Use C for the bell, and use D where the product has a side nav and the owner does not approve a wordless bell.

The reasons:

- A page holds all 6 rows at full width with a time column.
- A page has a URL, so a link in an email or a toast can open it. "Open a panel at its control" on Component choice keeps a panel for a short choice, not for a record list.
- C and D share one page. Only the entry is different, so a product can start with D and add the bell later.

## Pictures

Desktop pictures are 1440x900. Phone pictures are 390x844. All are at 1x, in the light theme.

| Picture | What it shows | Kit parts and rules |
| --- | --- | --- |
| `shots/c-side.png` | C: the Notifications page with 6 rows. The bell in the rail head has the current plate and the count 6 | Nav row current plate, nav badge, DataTable. Dense tables "Use the right surface" and "Size the table to its content" |
| `shots/c-band.png` | C: the same page in a one-section app. The bell on the band has the current plate | DataTable. The page "Keep one shell" |
| `shots/c-overview.png` | C: the Overview page, the bell with the count 6 and no plate | StatBand, DataTable. Stat bands "Use a stat band" and "State the comparison basis" |
| `shots/c-zero.png` | C: the Overview page, the bell at zero with no count, in the same place as in `c-overview.png` | Nav row link, icon only. Button labels "Earn a wordless button" |
| `shots/c-empty.png` | C: the empty list, with no table head | EmptyState first-run with "Open Overview". Empty states "Explain what is missing and show the next step" |
| `shots/c-error.png` | C: the list did not load | Danger Callout with Retry. Component choice "Show lasting conditions" |
| `shots/c-phone-bar.png` | C on a phone: the top bar with search, the bell with the count 6, and Menu | AppShell phone band, nav badge. The bell is a stand-in for a missing part, see below |
| `shots/c-phone-menu.png` | C on a phone: the menu drawer with the bell in its head | AppShell menu drawer, head control |
| `shots/c-phone-list.png` | C on a phone: the Notifications page. Each title wraps and each time is complete | DataTable. Dense tables "Scroll instead of squeezing" |
| `shots/c-phone-empty.png` | C on a phone: the empty list | EmptyState first-run |
| `shots/c-phone-error.png` | C on a phone: the list did not load | Danger Callout with Retry |
| `shots/c-state-bell-hover.png` | C: pointer on the bell at zero | Nav row hover wash |
| `shots/c-state-bell-focus.png` | C: keyboard focus on the bell with its count | Nav row focus ring. The full state set "Focus rings" |
| `shots/c-state-row-hover.png` | C: pointer on a row link | DataTable linked cell. Labels and titles "Use body ink" |
| `shots/c-state-row-focus.png` | C: keyboard focus on a row link | DataTable linked cell. The full state set "Focus rings" |
| `shots/d-nav.png` | D: a Notifications section with the count 6 | SidebarNav badge, neutral tone |
| `shots/d-nav-zero.png` | D: the count at zero, no badge, the current page and the empty list | SidebarNav current row, EmptyState |
| `shots/d-phone-menu.png` | D on a phone: the menu drawer with Notifications 6 | AppShell menu drawer, SidebarNav |

C and D use one count: the nav badge with the neutral tone. The bell is drawn as a nav row, so it gets the same current plate, hover wash and focus ring as D's row.

## Kit conflict

The bell in C is a wordless control. Iconography, rule "Icon-only controls", says word for word:

> **Rule:** Remove a control’s label only for an action on the closed list.
> **Why:** Without a legend, readers need labels for unfamiliar glyphs.
> **Except:** New entries require a decision and pass Earn a wordless button on Button labels. Allowed: close, copy, overflow, expand, collapse and export. Theme and sidebar toggles and collapsed-rail links have separate approval. On #729, the owner chose a glyph-only React AppShell search trigger below 560px for one light row of icons. Its sentence stays the accessible name: phones have no hover title. On #742, the owner asked for a chart's icon-only Chart and Table switch.
> **Do:** A wordless overflow menu and a labelled Settings.
> **Don't:** A wordless cog, even with a perfect `aria-label`.

The bell is not on the closed list. There are three ways:

1. **Follow the kit.** Use D, a labelled nav section. A one-section app then has no notifications control.
2. **Record an exception.** The owner approves a wordless bell in this issue. Its accessible name is "Notifications, 6 unread", or "Notifications" at zero.
3. **Change the kit.** Add the bell to the closed list in "Icon-only controls", with a count slot on the head control.

The prototypes show the bell so that the owner can decide. They do not assume the exception.

## Missing kit parts

| Missing part | How close the kit comes |
| --- | --- |
| A count slot on the head control or an icon button | Close. The nav badge fits, but the head control is one glyph wide, so the glue widens the link to 64px. |
| Hide the count at zero | Close. SidebarNav draws a count of 0, so the consumer passes `count || undefined`. |
| A band slot for a product control when a side nav exists | Not close. The phone bar has no slot. The prototype puts the bell before Menu with a portal. That bell keeps the nav glyph's faded ink, but search and Menu have full ink. Glue cannot repaint it. |
| A notification row with icon, title, time and link | Partial. The DataTable row works but is a table. The Dropdown row has no time column. Timeline has 3 fixed kinds. |
| A list error state | Close. The danger Callout with Retry works. No list part has an error prop. |
| A current style for an icon link | Close. The kit head control draws no style for `aria-current`. The prototype draws the bell as a nav row, so it gets the nav row's current plate. |
| A cap such as 99+ | Not present. The badge draws any number. |
| A time column on a phone | Close. At 390px the title column wraps, so the time is complete. A longer time word can still push the table to scroll. |

## Kit rules

- Bell entry: Iconography "Icon-only controls" and Button labels "Earn a wordless button" (in conflict, see above).
- Bell place: the page "Keep one shell".
- Bell paint and states: the nav row and the nav badge, the same parts as D's row.
- List page (C, D): Dense tables "Use the right surface", "Size the table to its content", "Scroll instead of squeezing" and "Keep identity sub-lines as text".
- Row text: Labels and titles "Use body ink" and "Limit muted ink".
- Overview: Stat bands "Use a stat band" and "State the comparison basis".
- Empty list: Empty states "Explain what is missing and show the next step".
- Error: Component choice "Show lasting conditions".
- Account menu: Account and settings "Limit the account menu to identity and the way in". The bell does not go in it.
- States: the full state set "Focus rings".

## Layout glue

`glue.css` sets no paint, no type, no motion and no token. It does not re-declare `--ui-head-control-w`. It sets these boxes only:

- The bell link is 64px wide: a 12px inset, the 17px bell, a 4px gap, a two-digit count and a 5px end. The kit head control has no count slot.
- At zero the link is the kit's one-glyph width (41px), and a 23px end margin holds the room of the count. So the bell does not move when its count hides.
- On a phone, the bar bell shows before Menu at the bar's 40px control height. Above 720px it is hidden.
- In a row, the glyph stands 11px off the title, as on a nav row.

## Build and capture

Run these commands in this folder. The prototype imports the kit's built CSS and React package, so run `npm ci` and `npm run build -w react` at the repository root first.

```sh
L=$(mktemp -d); mkdir -p "$L/@apliteni" && ln -s "$(cd .. && pwd)" "$L/@apliteni/apliteni-ui"
NODE_PATH=$L ../node_modules/.bin/esbuild app.tsx --bundle --minify --format=iife --jsx=automatic \
  --outfile=app.js --define:process.env.NODE_ENV='"production"'
UI_PLAYWRIGHT=<path to playwright/index.mjs> node capture.mjs "$PWD" shots
rm -r "$L"
```

The link folder lets the bundle resolve the package's own name. `capture.mjs` waits for `document.fonts.ready` and for each animation to finish before each picture. A third argument captures only the pictures whose names start with it.

## Self-review

This is a self-review, not an independent review.

- Pages read: the guidelines Overview, Iconography, Button labels, Component choice, Empty states, Stat bands, the page, Dense tables, Labels and titles, Account and settings, the full state set, and `docs/components.md` for AppShell, SidebarNav and DataTable.
- Each rounded corner and focus ring was checked at 3x zoom.
- axe-core ran on 8 desktop scenes and 4 phone scenes. The phone scenes are clean. Each desktop scene has one `label-content-name-mismatch` on the kit's account trigger, whose name is "Signed in as Sam Rivera, sam@example.com". D adds the same hit on the SidebarNav row "Notifications 6", because the visible text has no space before the count. Both hits are in kit parts, not in the composition.
- The AI slop detector ran on the rendered DOM of the same 12 scenes, on `glue.css` and on this README. It found no hit in the composition. The kit's own labels "Collapse sidebar", "Search or run a command" and the account trigger get `multiword-control`. Kit rules for parts that these scenes do not show get `gradient-text` and `glassmorphism`.
- Contrast was not measured apart from axe. The dark theme and the other accents were not captured.
