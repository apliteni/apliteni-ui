# #887 Drawer Save: variants

Kit: apliteni-ui 0.197.0. Each file shows the current drawer, the proposal and a long form, in light and dark.

## Variants

1. **The footer follows the form** (`direction-1-footer-follows.html`). The body takes only its content height (`flex: 0 1 auto`), and the form is the last group. The footer stands under the form, and a long body still scrolls.
2. **Save in the group** (`direction-2-save-in-group.html`). Save stands under the fields of its group, on the text edge. The drawer has no footer.
3. **Save in the header** (`direction-3-save-in-header.html`). The `headerActions` slot holds a small Save, and the form is the first group. Save stays in view.

## Contrast

No text line changes.

| Line | Light | Dark |
| --- | --- | --- |
| Save, white on the accent fill | 7.34 | 5.70 |
| Cancel, `--text` on the panel | 16.68 | 11.96 |

## Rules

- 1 follows "The actions stay outside the scrolling body." (`docs/components.md`). It moves the footer of each short drawer.
- 2 breaks "The actions stay outside the scrolling body." Proposed design-system change: a class `.ui-drawer__group-actions`, because the kit has no place for a group's action.
- 3 uses a kit slot and no new CSS. Save comes before the fields in the tab order.
- All three use only kit tokens. `one-record` sends a long form to a page.

## Recommendation

Use direction 1. Save stands next to a short form and a long form, with one CSS value. Direction 2 hides Save below the fold in a low window and a long form. Direction 3 puts Save far from the last field.

## Guideline

Add a rule to `guidelines/drawer.md`: put the form last, and the footer stands under it. Show a do-and-don't pair.
