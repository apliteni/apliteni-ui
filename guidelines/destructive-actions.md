# Destructive actions

## Quiet destructive controls

<!-- rule: colour -->

**Rule:** Keep destructive controls quiet at rest and turn them `--pink` on hover.

**Why:** `--accent` makes a destructive control look ordinary.

**Except:** `--pink` also marks a seen error, not an impending action.

**Do:** Hover makes the danger row `--pink`.

**Don't:** Hover repaints the row `--accent`.

## Name both actions

<!-- rule: wording -->

**Rule:** Name the action that destroys and the action that does not.

**Why:** “OK” explains nothing; “Revoke access” names the cost.

**Except:** Use “Cancel” when there is nothing to keep yet, such as a new form or upload.

**Do:** Each label makes sense alone.

**Don't:** Use “Are you sure?” without saying what will happen.

## Choose confirmation or undo

<!-- rule: undo -->

**Rule:** Choose confirmation or undo based on reversibility; never use both.

**Why:** Confirmation adds a click to undoable actions, while undo is an empty promise for actions that cannot be restored.

**Except:** Confirm actions affecting many items: one row is undoable with one click, but a whole selection is not.

**Do:** Ask first when nothing can be restored.

**Don't:** Offer undo for an already-gone workspace.
