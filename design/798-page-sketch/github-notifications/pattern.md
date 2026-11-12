# GitHub: notifications inbox where a row opens its record

Source: https://docs.github.com/en/subscriptions-and-notifications/how-tos/viewing-and-triaging-notifications/managing-notifications-from-your-inbox and https://docs.github.com/en/subscriptions-and-notifications/how-tos/viewing-and-triaging-notifications/triaging-a-single-notification, public documentation pages and their pictures, no account and no sign-in. Second source, text only: https://docs.gitlab.com/user/todos/
Captured: 2026-11-12, recorded by an agent
Best for: a product where each notification points at a record that already has its own page. A click on a row opens that page. The inbox is one full-width list with no detail pane.

## States

- `inbox`: the "Inbox" heading and one list, newest first, with read and unread rows. A row has a check box, a type glyph, the place of the record on one line, the record title on the next line and a time. An unread row has a mark. Opens on: the inbox glyph in the top bar. The glyph has a mark when an unread notification exists.
- `selected`: one or more rows have a checked box. The list head shows the count, such as "2 selected", and the bulk actions Done, Unsubscribe and a more menu. Opens on: a check box of a row.
- `opened`: the page of the record, not a pane. The top of that page gives Done, Unsubscribe, Mark as read, Save and a way back to the inbox. Opens on: a click on a row.
- `empty`: the list has no notifications. The designer's choice: the source shows no empty state.
- `error`: the list did not load, with Retry. The designer's choice: the source shows no error state.

## Transitions

The source pages give no motion values, and the agent did not open the app. `transitions.json` is empty.

- `inbox` to `opened`. Trigger: a click on a row. Moves: nothing. The browser goes to the page of the record. not seen.
- `inbox` to `selected`. Trigger: a click on a check box. Moves: nothing. The list head changes in place. not seen.

## Hard cases

- Long title: not seen. The sketch wraps the title.
- Read rows: the source marks an unread row with a filled dot. The kit wants no dots, so the sketch marks an unread row with a semibold title and a hidden "Unread:" word.
- Many notifications: not seen. The source says that the top bar glyph has a mark, not a count.
- Empty list, failed load, narrow screen and phone: not seen.

## Notes

- The source keeps triage on the record page. "When you click an individual notification from your inbox, you're directed to the conversation that prompted the notification." So the inbox needs no pane to show the record.
- The source also has filters in a side column (Assigned, Participating, Mentioned, Review requested, custom), a Read and Unread toggle, Saved and Done lists, and grouping. The sketch leaves them out. Add one only when the product has the same need.
- GitLab's To-Do List is the same shape in text: "a chronological list of items waiting for your input". A row opens its item, and Mark as done is to the right of each row.
- The sketch keeps no brand, text or picture of the source. The sample rows are fabricated.
- The cut frames stay outside the repository, because the repository is public.
