# Notifications page without a detail pane (#798)

This sketch replaces the notifications page that the owner rejected. The rejected page had a detail pane beside the list. In this sketch, a row is a link. A click on a row opens the record on its own page.

Open `notifications-page.html` in a browser. Each state has its own address, for example `#unread`. Add `?theme=dark` for the dark theme.

## Pattern

The sketch uses the pattern record `github-notifications/`. The sources are public documentation pages with pictures:

- GitHub Docs, "Managing notifications from your inbox" and "Triaging a single notification". Captured 2026-11-12.
- GitLab Docs, "To-Do List", as a second text source.

The record gives the source text, the states and the hard cases. Its `sketch.html` is the generic pattern sketch. The source frames are not in the repository, because the repository is public.

## States

| State | Address | What it shows |
| --- | --- | --- |
| Unread | `#unread` | The list, newest first. Three unread rows have a semibold title. The bell count is 3. Mark all read is at the top right. |
| All read | `#all-read` | The same list after Mark all read. No row is semibold. The bell has no count. Mark all read is gone. |
| Opened | `#opened` | The record page after a click on the first row. The bell count is 2. The placeholder stands for the page that the product already has. |
| Empty | `#empty` | No notifications, with one sentence that tells what will show here. |
| Error | `#error` | The list did not load, with Retry. |
| Panel | `#panel` | The bell panel, as approved in the B sketch on `design/798-sketch`. |

## Pictures

`png/` holds the light pictures and `png-dark/` holds the dark pictures. Each state is at 1280 and 390 CSS px, at device scale 2. `png/hover-1280.png` shows a row in hover. `png/focus-1280.png` shows a row with keyboard focus.

## Kept from the approved sketch

- The bell in the rail head, and the menu bar on the phone.
- The count on the bell.
- The panel that opens from the bell, with its rows and its motion values.

## Left out

- Check boxes and bulk actions. The task asks for Mark all read only. The GitHub source has them, and the pattern sketch shows them.
- Filters, Saved and Done lists. The pattern record says to add one only when the product needs it.
- The unread dot of the source. The design rules forbid dots, so an unread row has a semibold title and a hidden "Unread:" word.

## Open questions

- The opened record is a payout run, so its parent page is Payouts. The kit rule "Link to the parent address" (Going back) names the parent. The sketch shows "Back to notifications", as the source does. The owner must choose one of the two links.
- Must a click on a row mark it read, as the sketch shows? The source does this, but it also has Mark as read on the record page.

## Kit rules

- Page shell: "Keep one shell" (The page). The rail on a laptop, the menu bar on a phone.
- Page title: "Use one page title" (The page). One h1, "Notifications".
- Mark all read: "Emphasize one action" (The page). A secondary button, because the page has no main action.
- Notification list: "Use the right surface" (Dense tables). One table, not cards, with no card around it.
- Row glyphs: "Preserve glyph paths" (Iconography). Lucide glyphs, unchanged.
- Empty state: "Explain what is missing and show the next step" (Empty states).
- Error state: "Screen loading" (State set). The whole list shows the failure, with Retry.
- Focus: "Focus rings" (State set). One ring on the focused row.
- Back link: "Name the destination" (Going back). See the open questions.
