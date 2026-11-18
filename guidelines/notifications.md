# Notifications

## Keep missed events in the bell

<!-- rule: bell-toast-callout -->

**Rule:** Put an event that the reader can miss in the bell.

**Why:** A toast closes after 5 seconds.

**Except:** A toast for the reader's own action, such as Saved, stays out of the bell.

**Do:** Show “99+” above 99, and name the bell “Notifications, 120 unread”.

**Don't:** Report a failed run only in a toast.

## Mark read on open

<!-- rule: read-state -->

**Rule:** Mark a notification read when the reader opens it, and let a toast undo Mark all read.

**Why:** One Undo restores the set, so a confirmation only adds a click.

**Do:** Show “3 notifications marked read” with Undo.

**Don't:** Ask “Mark all notifications read?” first.

**Gap #798:** The kit has no unread row weight, so only hidden text marks the row.

## Show a failed load as an error

<!-- rule: failed-load -->

**Rule:** When a list or a panel fails to load, say so and offer Retry.

**Why:** “No notifications” after a failure tells the reader that nothing happened.

**Do:** Show “Notifications did not load” with Retry.

**Don't:** Show “No notifications” after a failed request.

**Gap #798:** The dropdown has no error part, so a panel uses the empty state.
