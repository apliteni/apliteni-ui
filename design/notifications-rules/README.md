# Notifications rules: draft for #798

This folder holds three draft guideline rules and their pictures. The owner approves them before any build. No shipped file changes on this branch.

- `rules.md` has the three rules in the guideline page format.
- Each rule has one do picture and one don't picture, in light and in dark.

## Target page of each rule

| Rule | Target page | Reason |
| --- | --- | --- |
| Keep missed events in the bell (`bell-toast-callout`) | Component choice | The brief names this page. The rule chooses between three parts, as the `transient` and `interrupt` rules do. |
| Mark read on open (`read-state`) | A new Notifications page | The rule governs the behaviour of one screen part. Microcopy governs the words of a control, and only the toast text of this rule is words. |
| Show a failed load as an error (`failed-load`) | Empty states | The Why of that page already names the confusion between no content and a failure. State set is over its budget and frozen, so it cannot take a new rule. |

## Word budget

The draft has 176 words in 3 rules. The budget is 180, at 60 words a rule. Each target page changes as follows:

| Page | Now | With the rule | Budget | Result |
| --- | --- | --- | --- | --- |
| Component choice | 570, recorded | 627 | 540 | 57 over the recorded 570. The build must cut 57 words from the present rules. |
| Notifications, new | none | 60 | 60 | Passes. |
| Empty states | 91, recorded | 150 | 120 | 30 over the budget. The build must cut about 30 words from the `next-action` rule, and then delete the recorded line. |

**Alternative:** put all three rules on the new Notifications page. That page has 176 of 180 words and needs no cuts. Rules 1 and 3 then stay out of the pages where a reader looks for a part choice or an empty state.

A new page also needs these changes: the collection counts, the Overview, `storySort` and a row in the collection index.

## Conflict to decide

The `undo` rule on the Destructive actions page has this Except: "Confirm actions affecting many items: one row is undoable with one click, but a whole selection is not". Rule 2 says the opposite for Mark all read. One Undo restores the read state of the whole set.

If the owner accepts rule 2, the `undo` Except needs a boundary, such as "unless one Undo restores the whole set". If the owner rejects it, rule 2 loses its Don't and its toast.

## Gaps that the rules record

The rules use only the parts that the kit has. They do not invent a part.

- The kit has no unread row weight. Rule 2 records this with a Gap #798 line. In the bell picture, only hidden text marks a row as unread.
- The dropdown has no error part. Rule 3 records this with a Gap #798 line. The do picture shows the failed load in a card, not in the bell panel.
- The dropdown has no pressed mark. No rule needs it, so no rule records it.
- There is no phone bell with a side nav. No rule needs it, so no rule records it.

## Pictures

All pictures are PNG at device scale 2. Each picture is cropped to its specimen and its caption. The pictures use only kit parts with their kit look. A temporary story placed them on the guideline page layout. That story is not on this branch.

| Rule | Do | Don't |
| --- | --- | --- |
| `bell-toast-callout` | The open bell menu: the bell glyph, a "99+" badge, the accessible name "Notifications, 120 unread", and three notification rows. | A danger toast "Payout run PR-204 failed" and nothing else. |
| `read-state` | A success toast "3 notifications marked read" with Undo. | A confirm "Mark all notifications read?" with "Keep unread" and "Mark all read". |
| `failed-load` | A Notifications card with a danger callout "Notifications did not load" and a Retry button. | A Notifications card with the empty state "No notifications". |

File names: `<rule>-<do|dont>-<light|dark>.png`. All names, IDs and amounts in the pictures are fabricated.

## Word checks

- `npm run check:words` on the repository passes. This branch changes no page in the collection.
- `node scripts/word-budget.mjs` on a folder that holds only `rules.md` passes: 176 words, budget 180, worst rule 60. Run it on such a folder, because this README has no rules and the check counts it as a page.
