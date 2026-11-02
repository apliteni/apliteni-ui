# Destructive actions

## Quiet destructive controls

<!-- rule: colour -->

**Rule:** Keep destructive controls quiet until hover, and then change them to `--pink`.

**Why:** `--accent` makes a destructive control look ordinary.

**Except:** `--pink` also marks a visible error, not an action that is about to occur.

**Do:** On hover, the danger row changes to `--pink`.

**Don't:** On hover, the row changes to `--accent`.

## Name both actions

<!-- rule: wording -->

**Rule:** Name the action that destroys and the action that does not.

**Why:** “OK” explains nothing, but “Revoke access” names the cost.

**Except:** If there is nothing to keep yet, such as in a new form or upload, use “Cancel”.

**Do:** Pair “Revoke access” with “Keep access”.

**Don't:** Pair “OK” with “Cancel” under “Are you sure?” and do not name the action.

## Choose confirmation or undo

<!-- rule: undo -->

**Rule:** Choose confirmation or undo by reversibility. Never use both.

**Why:** Confirmation adds a click to an undoable action. Undo is an empty promise for an action that cannot be restored.

**Except:** Confirm an action on many items. One click undoes one row, but not a whole selection.

**Do:** If nothing can be restored, ask first.

**Don't:** Offer undo for a workspace that is gone.
