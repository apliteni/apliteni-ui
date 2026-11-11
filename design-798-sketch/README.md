# Notifications pattern: sketches for #798

These pages are one-ink sketches. They show layout and behaviour only. They change no kit code. All names, ids and numbers in them are fabricated.

Open a state with its hash, for example `a-inbox-page.html#empty`. Each page lists its states at the top.

## Three answers

- **Why is this necessary?** Each product builds its own bell, count and list. The owner rejected the showcase and named Linear as the reference.
- **How often does the problem occur?** 3 issues in 41 days: #529 (closed as not planned), #622 (closed as duplicate) and #798. No issue names two products. So build a showcase, not a new kit component.
- **Is there a simpler option?** Yes. A labelled side-nav link with its count. An app with no side nav gets nothing.

## Files

- `linear-notifications/`: the pattern record from Linear's public documentation. It has `pattern.md`, `transitions.json` and `sketch.html`.
- `b-bell-panel.html`: step 1 of the flow. The list is a panel under the bell. "All notifications" and each row open the A page.
- `a-inbox-page.html`: step 2 of the flow. The list is a page, with a detail pane beside it.
- `png/`: one picture for each state, at 1440 x 900 and 390 x 844, 1x. A frame whose content ends at or above 60% of the height is cropped at the bottom.

| Picture | State |
| --- | --- |
| `b-sidenav-count-1440.png` | B: panel open from the side nav bell, below the page title |
| `b-sidenav-count-390.png` | B: phone, panel at full width under the bar |
| `b-topbar-count-1440.png` | B: panel open from the top bar bell |
| `b-zero-1440.png`, `b-zero-390.png` | B: side nav, read items only, bell with no count |
| `b-topbar-zero-1440.png` | B: top bar, read items only, bell with no count |
| `b-empty-1440.png`, `b-empty-390.png` | B: side nav, empty panel |
| `b-topbar-empty-1440.png` | B: top bar, empty panel |
| `b-error-retry-1440.png`, `b-error-retry-390.png` | B: side nav, panel that did not load, with Retry |
| `b-topbar-error-1440.png` | B: top bar, panel that did not load, with Retry |
| `b-kit-drawer-390.png` | Phone menu drawer: where the kit puts the bell today |
| `a-sidenav-count-1440.png`, `a-sidenav-count-390.png` | A: side nav, bell with count 3, the page current |
| `a-topbar-count-1440.png` | A: top bar, bell with count 3, the page current |
| `a-zero-1440.png`, `a-zero-390.png` | A: side nav, no unread items, bell with no count |
| `a-topbar-zero-1440.png` | A: top bar, no unread items, bell with no count |
| `a-empty-1440.png`, `a-empty-390.png` | A: side nav, empty list |
| `a-topbar-empty-1440.png` | A: top bar, empty list |
| `a-error-retry-1440.png`, `a-error-retry-390.png` | A: side nav, the list did not load, with Retry |
| `a-topbar-error-1440.png` | A: top bar, the list did not load, with Retry |

At 390 px both shells draw the same phone bar. So each `*-390.png` also shows the top bar case.

The Linear frames are not in the repository, because the repository is public. They stay in `/tmp/designer-798-apliteni-ui/frames/` on the agent host.

## Recommendation

Use B and A as one flow in both shells. The bell opens the B panel. "All notifications" in the panel opens the A page.

- B keeps the reader on the current page, and a notification is a short look.
- B opens at its control, as "Open a panel at its control" asks.
- A gives a long list and the detail pane a place to grow, the same as Linear's inbox.
- The bell has two marks. When the panel is open, it has the kit's pressed fill. When the A page is current, it has the wash and a 3px ink rule below it.
- On the phone, the bell stays on the bar. The kit has no part for this when a side nav is present. Today the kit puts the bell in the menu drawer head, before the close button, as `b-kit-drawer-390.png` shows.

Rejected: C, a drawer with the list. "One-record drawer" keeps a drawer for one record, and its modal layer hides the bell.

## Kit conflict

The Iconography page, rule "Icon-only controls":

> **Rule:** Remove a control’s label only for an action on the closed list.
>
> **Why:** Without a legend, readers need labels for unfamiliar glyphs.
>
> **Except:** New entries require a decision and pass Earn a wordless button on Button labels. Allowed: close, copy, overflow, expand, collapse and export. Theme and sidebar toggles and collapsed-rail links have separate approval. On [#729](https://github.com/apliteni/apliteni-ui/issues/729), the owner chose a glyph-only React AppShell search trigger below 560px for one light row of icons. Its sentence stays the accessible name: phones have no hover title. On [#742](https://github.com/apliteni/apliteni-ui/issues/742), the owner asked for a chart's icon-only Chart and Table switch.

The goal asks for a wordless bell. The bell is not on the closed list. The sketches draw it with the accessible name "Notifications, 3 unread" and a hover title. Choose one way:

1. **Follow the kit.** Give the bell the word "Notifications".
2. **Record an exception.** Add the bell to the rule's "Except" line on this issue, as #729 did for search.
3. **Change the kit.** Add the bell to the closed list for every product.

## Kit rules

| Part | Kit part | Rule and page |
| --- | --- | --- |
| Bell | `button({ iconOnly })` with the `bell` glyph, React `AppShell` `headControl` or `bandControl` | "Icon-only controls", Iconography. "Earn a wordless button", Button labels |
| Count on the bell | `badge()`, dropped as null at zero | "State and action", Iconography |
| Panel (B) | `dropdown()` with `wireDropdown()` and description rows | "Open a panel at its control", Component choice |
| List page (A) | React `SidebarNav` or `NavTabs` link to a page | "Drawer or page", Drawers |
| Empty list | `emptyState()` with "Settings" | "Explain what is missing and show the next step", Empty states |
| List did not load | `callout()` in the danger tone, with Retry | "Show lasting conditions", Component choice |
| Loading | `skeleton()` in a `busyRegion()` | "Screen loading", The full state set |

## Parts the kit does not have

- A count on an icon-only control.
- A visible count on the phone when a side nav is present.
