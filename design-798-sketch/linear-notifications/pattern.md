# Linear: inbox of notifications

Source: https://linear.app/docs/inbox and https://linear.app/docs/notifications, public documentation pages and their pictures, no account and no sign-in
Captured: 2026-11-11, recorded by an agent
Best for: a work tool where a notification points at a record to act on, and a person works through many in one sitting. Use it for an inbox page in the side nav with a list, a detail pane, two tabs and display options.

## States

- `inbox`: the "Inbox" heading, a more menu and three icon buttons (an inbox glyph with a dot, filter, display options). Two pill tabs, "Priority" and "Other", each with a count. The list of notifications. Opens on: the Inbox link in the side nav, or the keys G then I.
- `other`: the same page with the "Other" tab selected. It holds the notifications that do not need attention. Opens on: the Other tab.
- `item-open`: the list on the left and the record of the selected notification in a pane on the right. The record shows its id, title, status and description. Opens on: a click on a row, or Enter on the row that J/K or the arrow keys selected.
- `display-options`: a panel under its icon button. It holds a priority inbox switch, a choice of what goes in the priority inbox, the badge count (priority and other), grouping of unread rows, the order (newest), and switches for snoozed and unread-first. Opens on: the display options button.
- `empty`: the list has no notifications. The designer's choice: the source shows no empty state. Opens on: the last notification deleted, or a new account.
- `error`: the list did not load, with Retry. The designer's choice: the source shows no error state. Opens on: a failed load.

A row has an avatar with a small action glyph, an unread dot, the record id and title, a sub-line with the event, a status glyph and a relative time (1h, 4h, 13h, 22h).

## Transitions

The source pages give no motion values, and the agent did not open the app. Each value below is the designer's choice from the kit motion tokens.

- `inbox` to `item-open`. Trigger: a click on a row. Moves: the detail pane fades in (opacity 150 ms, cubic-bezier(0.4, 0, 0.2, 1)). estimated.
- `inbox` to `display-options`. Trigger: a click on the display options button. Moves: the panel fades in and moves 4 px down (opacity and transform 150 ms, cubic-bezier(0.4, 0, 0.2, 1)). estimated.
- `inbox` to `other`. Trigger: a click on a tab. Moves: nothing. The list changes in place. estimated.

## Hard cases

- Long title: the title truncates with an ellipsis on one line.
- Read rows: the source fades a read row. The kit wants full ink, so the sketch marks an unread row with a semibold title, not a fade of the read row.
- Many notifications: the tab counts carry the number. A cap such as 99+ was not seen.
- Empty list, failed load, narrow screen and phone: not seen.

## Notes

- Keys from the documentation: J/K or the arrow keys move through the list. Backspace deletes a notification, and Shift Backspace deletes all read notifications. U marks read or unread, and Option/Alt U marks all read. H snoozes, and Shift S unsubscribes. Cmd/Ctrl F opens quick search, and Esc clears it.
- The badge count is an option: priority and other, or priority only. The sketch shows the choice. The kit has no such count today.
- The sketch keeps no brand, text or picture of the source. The sample rows are fabricated.
- The cut frames stay in `/tmp/designer-798-apliteni-ui/frames/` and are not in the repository, because the repository is public.
