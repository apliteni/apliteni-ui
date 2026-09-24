# Destructive actions

Deletion, button labels, and when undo cannot be trusted.

## Keep destructive controls quiet; turn them --pink on hover.

<!-- rule: colour -->

**Why:** A destructive control that turns --accent on hover looks ordinary.

**Except:** --pink also marks a seen error, not an impending action.

**Do:** Hover makes the danger row --pink.

**Don't:** Hover repaints the row --accent.

## Name what each button does: destroy or not.

<!-- rule: wording -->

**Why:** “OK” explains nothing; “Revoke access” names the cost.

**Except:** Cancel is correct when there is nothing to keep yet, such as a new form or upload.

**Do:** Each label makes sense alone.

**Don't:** “Are you sure?” About what?

## Choose confirmation or undo based on reversibility; never both.

<!-- rule: undo -->

**Why:** If undoable, confirmation costs a click; if not, undo is an empty promise.

**Except:** Even reversible actions need confirmation for many items: one row is undoable with one click; a whole selection is not.

**Do:** Nothing can be restored, so it asks first.

**Don't:** Undo on an already-gone workspace.
