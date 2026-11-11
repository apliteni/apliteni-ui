# Notifications pattern: sketches for #798

These pages are one-ink sketches. They show layout and behaviour only. They change no kit code. All names, ids and numbers in them are fabricated.

Open a state with its hash, for example `a-inbox-page.html#empty`. Each page lists its states at the top.

## Three answers

- **Why is this necessary?** Each product builds its own bell, count and list. The owner rejected the built showcase and chose Linear as the reference.
- **How often does the problem occur?** 3 issues in the 41 days from 2026-10-01 to 2026-11-10: #529 (closed, not planned), #622 (closed, duplicate) and #798. No issue names two products. So the answer is a composition and a showcase, not a new kit component.
- **Is there a simpler option?** Yes. A labelled "Notifications" link in the side nav, with the count the shell already shows. It gives an app with no side nav no control, so it covers half of the goal.

## Files

- `linear-notifications/`: the pattern record from Linear's public documentation. It has `pattern.md`, `transitions.json` and `sketch.html`.
- `a-inbox-page.html`: layout A. The list is a page, with a detail pane beside it.
- `b-bell-panel.html`: layout B. The list is a panel under the bell.
- `c-drawer.html`: layout C. The list is a drawer.
- `png/`: one picture for each state, at 1440 x 900 and 390 x 844, 1x. A frame whose content ends above 60% of the height is cropped at the bottom.

| Picture | State |
| --- | --- |
| `a-sidenav-count-1440.png` | A: bell with count 3 in the side nav, the page open |
| `a-sidenav-count-390.png` | A: phone, bell with count 3, the page open |
| `a-topbar-count-1440.png` | A: bell with count 3 in the top bar, no side nav |
| `a-zero-1440.png`, `a-zero-390.png` | A: no unread items, bell with no count |
| `a-empty-1440.png`, `a-empty-390.png` | A: empty list |
| `a-error-retry-1440.png`, `a-error-retry-390.png` | A: the list did not load, with Retry |
| `b-sidenav-count-1440.png` | B: panel open from the side nav bell |
| `b-sidenav-count-390.png` | B: phone, panel open under the bar |
| `b-topbar-count-1440.png` | B: panel open from the top bar bell |
| `b-zero-1440.png`, `b-zero-390.png` | B: panel with read items only, bell with no count |
| `b-empty-1440.png`, `b-empty-390.png` | B: empty panel |
| `b-error-retry-1440.png`, `b-error-retry-390.png` | B: panel that did not load, with Retry |
| `c-sidenav-count-1440.png`, `c-sidenav-count-390.png` | C: bell with count, drawer closed |
| `c-list-open-1440.png`, `c-list-open-390.png` | C: drawer open with the list |
| `c-topbar-count-1440.png` | C: bell with count 3 in the top bar, no side nav |
| `c-zero-1440.png`, `c-zero-390.png` | C: bell with no count |
| `c-empty-1440.png`, `c-empty-390.png` | C: empty drawer |
| `c-error-retry-1440.png`, `c-error-retry-390.png` | C: drawer that did not load, with Retry |

At 390 px both shells draw the same phone bar. So each `*-sidenav-count-390.png` also shows the top bar case.

The Linear frames are not in the repository, because the repository is public. They stay in `/tmp/designer-798-apliteni-ui/frames/` on the agent host.

## Recommendation

Use B, the panel from the bell, in both shells. Add A as the "All notifications" page that the panel links to.

- B keeps the reader on the current page, and a notification is a short look.
- B opens at its control, as "Open a panel at its control" asks.
- A gives a long list and the detail pane a place to grow, the same as Linear's inbox.
- Do not use C. It holds a list, but "One-record drawer" keeps a drawer for one record. Its modal layer also hides the bell that opened it.

## Kit conflict

The Iconography page, rule "Icon-only controls":

> **Rule:** Remove a control’s label only for an action on the closed list.
>
> **Why:** Without a legend, readers need labels for unfamiliar glyphs.
>
> **Except:** New entries require a decision and pass Earn a wordless button on Button labels. Allowed: close, copy, overflow, expand, collapse and export. Theme and sidebar toggles and collapsed-rail links have separate approval. On [#729](https://github.com/apliteni/apliteni-ui/issues/729), the owner chose a glyph-only React AppShell search trigger below 560px for one light row of icons. Its sentence stays the accessible name: phones have no hover title. On [#742](https://github.com/apliteni/apliteni-ui/issues/742), the owner asked for a chart's icon-only Chart and Table switch.

The goal asks for a wordless bell. The bell is not on the closed list. The sketches draw it with the accessible name "Notifications, 3 unread" and a hover title. Choose one way:

1. **Follow the kit.** Give the bell the word "Notifications". The top bar and the side nav head then need more width.
2. **Record an exception.** The owner adds the bell to the closed list on this issue, as #729 did for search.
3. **Change the kit.** Add the bell to the closed list in the Iconography and Button labels pages for every product.

## Kit rules

| Part | Kit part | Rule and page |
| --- | --- | --- |
| Bell | `button({ iconOnly })` with the `bell` glyph, React `AppShell` `headControl` or `bandControl` | "Icon-only controls", Iconography. "Earn a wordless button", Button labels |
| Count on the bell | `badge()` | "State and action", Iconography |
| Panel (B) | `dropdown()` with `wireDropdown()` | "Open a panel at its control", Component choice |
| List page (A) | React `SidebarNav` or `NavTabs` link to a page | "Drawer or page", Drawers |
| Drawer (C) | `drawer()` with `drawerSection()` | "One-record drawer", Drawers |
| Empty list | `emptyState()` with "Notification settings" | "Explain what is missing and show the next step", Empty states |
| List did not load | `callout()` in the danger tone, with Retry | "Show lasting conditions", Component choice |
| Loading | `skeleton()` in a `busyRegion()` | "Screen loading", The full state set |

## Parts the kit does not have

- A count slot on `headControl` or on an icon-only button.
- A count that hides at zero. `SidebarNav` and `NavTabs` show 0 today.
- A cap such as 99+.
- A band slot for a product control when the shell has a side nav.
- A phone place for the head control. With a side nav, it moves into the menu drawer.
- A notification row: glyph, title, sub-line, time and link.
- An error state for a list.
- A current style for an icon link.
- A time column on a phone.
- A drawer that starts at the edge of the side nav and keeps the nav and its bell in view.

## Drawer side

In C, the drawer opens on the left, on the side of the bell, and covers the side nav. In the top bar app, it opens on the right, below the bell. The kit `drawer()` takes a left or a right side. The kit menu drawer also opens on the side of its menu button.
