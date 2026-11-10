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
| A | A menu panel under the bell | AppShell head control, Dropdown (menu, search, 480px scroll), nav badge |
| B | A drawer on the bell's side | AppShell head control, Button, Drawer, DrawerSection, Timeline |
| C | A Notifications page that the bell links to | AppShell head control, Button link, DataTable, EmptyState, Callout |
| D | A Notifications page that a nav section links to | AppShell sections with `count`, SidebarNav, DataTable, EmptyState |

## Recommendation

Use C for the bell, and use D where the product has a side nav and the owner does not approve a wordless bell.

The reasons:

- A page holds all 6 rows at full width with a time column. The A menu caps at 300px, about 3.5 rows, unless the consumer sets a scroll height. The B drawer fixes the row shape to the 3 Timeline kinds.
- A page has a URL, so a link in an email or a toast can open it. "Open a panel at its control" on Component choice keeps a panel for a short choice, not for a record list.
- C and D share one page. Only the entry is different, so a product can start with D and add the bell later.

## Pictures

Desktop pictures are 1440x900. Phone pictures are 390x844. All are at 1x, in the light theme.

| Picture | What it shows | Kit parts and rules |
| --- | --- | --- |
| `shots/a-side.png` | A: the menu open from the bell in the rail head, 6 rows | Dropdown menu. Component choice "Open a panel at its control" and "Add dropdown search" |
| `shots/a-band.png` | A: the menu open from the bell on the band of a one-section app | Dropdown menu. The page "Keep one shell" |
| `shots/a-state-row-focus.png` | A: keyboard focus on a menu row | Dropdown row. The full state set "Focus rings" |
| `shots/b-side-closed.png` | B: the bell with its count in the rail head, drawer closed | Button, nav badge. Iconography "Icon-only controls" |
| `shots/b-side.png` | B: the drawer open on the left, Today and Earlier groups | Drawer, DrawerSection, Timeline. Drawers "Drawer or page" and "Grouped content" |
| `shots/b-band-closed.png` | B: the bell on the band, drawer closed | Button, nav badge. The page "Keep one shell" |
| `shots/b-band.png` | B: the drawer open on the right | Drawer, Timeline. Drawers "One-record drawer" |
| `shots/c-side.png` | C: the bell in the rail head, the Notifications page with 6 rows | Button link, DataTable. Dense tables "Use the right surface" and "Size the table to its content" |
| `shots/c-band.png` | C: the same page in a one-section app, bell on the band | DataTable. The page "Keep one shell" |
| `shots/c-zero.png` | C: the bell at zero, with no badge | Button, icon only. Button labels "Earn a wordless button" |
| `shots/c-empty.png` | C: the empty list | EmptyState first-run with "Open Overview". Empty states "Explain what is missing and show the next step" |
| `shots/c-error.png` | C: the list did not load | Danger Callout with Retry. Component choice "Show lasting conditions" |
| `shots/c-phone-bar.png` | C on a phone: the top bar | AppShell phone band. The bell is not on the bar (a missing part) |
| `shots/c-phone-menu.png` | C on a phone: the menu drawer with the bell in its head | AppShell menu drawer, head control |
| `shots/c-phone-list.png` | C on a phone: the Notifications page | DataTable. Dense tables "Scroll instead of squeezing" |
| `shots/c-state-bell-hover.png` | C: pointer on the bell at zero | Button ghost hover |
| `shots/c-state-bell-focus.png` | C: keyboard focus on the bell with its count | Button focus. The full state set "Focus rings" |
| `shots/c-state-row-hover.png` | C: pointer on a row link | DataTable linked cell. Labels and titles "Use body ink" |
| `shots/c-state-row-focus.png` | C: keyboard focus on a row link | DataTable linked cell. The full state set "Focus rings" |
| `shots/d-nav.png` | D: a Notifications section with the count 6 | SidebarNav badge, neutral tone |
| `shots/d-nav-zero.png` | D: the count at zero, no badge, the current page and the empty list | SidebarNav current row, EmptyState |
| `shots/d-phone-menu.png` | D on a phone: the menu drawer with Notifications 6 | AppShell menu drawer, SidebarNav |

## Kit conflict

The bell in A, B and C is a wordless control. Iconography, rule "Icon-only controls", says word for word:

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
| A count slot on the head control or an icon button | Close. The nav badge fits, but the 40px head control needs glue to widen. |
| Hide the count at zero | Close. SidebarNav draws a count of 0, so the consumer passes `count || undefined`. |
| A band slot for a product control when a side nav exists | Not close. On a phone the bell shows only in the menu drawer's head, not on the top bar. |
| A notification row with icon, title, time and link | Partial. The Dropdown row has no time column. Timeline has 3 fixed kinds. The DataTable row works but is a table. |
| A list error state | Close. The danger Callout with Retry works. No list part has an error prop. |
| A current style for an icon link | Not close. `aria-current` on the bell draws no style. D gets the style from SidebarNav. |
| A cap such as 99+ | Not present. The badge draws any number. |
| A taller menu | Partial. The Dropdown menu caps at 300px, about 3.5 rows. `scroll={480}` lifts it. |
| A time column on a phone | Partial. DataTable scrolls sideways, so the time is off screen at 390px. |

## Kit rules

- Bell entry: Iconography "Icon-only controls" and Button labels "Earn a wordless button" (in conflict, see above).
- Bell place: the page "Keep one shell".
- Menu panel (A): Component choice "Open a panel at its control" and "Add dropdown search".
- Drawer (B): Drawers "Drawer or page", "One-record drawer" and "Grouped content".
- List page (C, D): Dense tables "Use the right surface", "Size the table to its content", "Scroll instead of squeezing" and "Keep identity sub-lines as text".
- Row text: Labels and titles "Use body ink" and "Limit muted ink".
- Empty list: Empty states "Explain what is missing and show the next step".
- Error: Component choice "Show lasting conditions".
- Account menu: Account and settings "Limit the account menu to identity and the way in". The bell does not go in it.
- States: the full state set "Focus rings".

## Build and capture

Run these commands in this folder. The prototype imports the kit's built CSS and React package, so run `npm ci` and `npm run build -w react` at the repository root first.

```sh
L=$(mktemp -d); mkdir -p "$L/@apliteni" && ln -s "$(cd .. && pwd)" "$L/@apliteni/apliteni-ui"
NODE_PATH=$L ../node_modules/.bin/esbuild app.tsx --bundle --minify --format=iife --jsx=automatic \
  --outfile=app.js --define:process.env.NODE_ENV='"production"'
UI_PLAYWRIGHT=<path to playwright/index.mjs> node capture.mjs "$PWD" shots
```

The link folder lets the bundle resolve the package's own name. `capture.mjs` waits for `document.fonts.ready` and for each animation to finish before each picture.

## Self-review

This is a self-review, not an independent review.

- Pages read: the guidelines Overview, Iconography, Button labels, Component choice, Empty states, the page, Drawers, Dense tables, Labels and titles, Account and settings, the full state set, and `docs/components.md` for AppShell, SidebarNav, Dropdown, DataTable, Drawer and Timeline.
- axe-core ran on 13 scenes. B and the phone scenes are clean. Each other scene has one `label-content-name-mismatch` on the kit's account trigger, whose name is "Signed in as Sam Rivera, sam@example.com". D adds the same hit on the SidebarNav row "Notifications 6", because the visible text has no space before the count. Both hits are in kit parts, not in the composition.
- The AI slop detector ran on the rendered DOM of 10 scenes and on `glue.css`. It found no hit in the composition. The kit's own labels "Collapse sidebar", "Search or run a command" and the account trigger get `multiword-control`. Kit rules for parts that these scenes do not show get `gradient-text` and `glassmorphism`. The detector first flagged "Try again", so the error state now says "Retry", as the kit's file drop does.
- Contrast was not measured apart from axe. The dark theme and the other accents were not captured.
