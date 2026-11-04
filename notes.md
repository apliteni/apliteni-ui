# Fix round 2 on #768, branch builder-ui-r6-components

Commit 97f0d2a9. A headless Chromium measured each number after `document.fonts.ready`. This round replaces only `component-button-loading.html` and this file. The next worker rebuilds every other prototype from the integrated branch.

## 1. File drop area

- Change: The prototype now wires the area. A click anywhere in the area opens the file picker once. The Upload button stays the only keyboard stop. The kit `<FileDrop>` already did this in Storybook, so its code did not change.
- Measured on `component-file-drop.html#area`, at 390 and 1280: a click at the corner opens the picker 1 time, a click at the bottom 1 time, and a click on Upload 1 time. One keyboard stop, and the first Tab goes to Upload.
- Test that fails without the fix: the same spy on the round 1 prototype counts 0 at the corner, 0 at the bottom and 0 on Upload.
- Test that fails without the kit wiring: with the area `onClick` removed, the React test "opens the picker once from the button and once from a click on the box" fails with "expected 2 times, got 1".
- Limit: The file drop prototype on this branch keeps its round 1 file. The next worker rebuilds it with this wiring.

## 2. Busy button

- Change: Every busy button keeps its label. With a glyph, the spinner takes the glyph place. With no glyph, the spinner stands before the label. The `keepLabel` prop and the label slide are removed. The text in Busy button labels says the same.
- Measured at the default size: Save is 65px at rest and 89px busy, so it grows by 24px, which is 16px of spinner and 8px of gap. Export rows is 131px at rest and 131px busy.
- The rule waits for the owner. Option A is built. The state `component-button-loading.html#busy-options` shows A, B and C on Save and on Export rows, so the owner can compare them:
  - A, as built: Save 65px at rest, 89px busy. Export rows 131px and 131px.
  - B, the side padding shrinks: Save 65px and 65px. Export rows 131px and 131px. The busy Save has 5px side padding.
  - C, Save gets a check glyph: Save 89px and 89px. Export rows 131px and 131px.

## 3. Em dashes

- Change: Demo text in the changed stories uses a comma in place of an em dash. Examples are "Nutra, DE push", "248 KB, 40%" and "Time zone, UTC". The drawer guideline example is now `Status: Active`.
- Measured: No em dash remains in the visible text of the 13 rebuilt prototypes. The invoice empty cell mark and code comments keep theirs.

## Checks in a headless browser

- Light and dark at 390, 720 and 1280, with hover and two Tab presses. I opened the captures of busy-options, busy-button and the file drop area, and looked at them. Each busy button shows its label, and the focused button has its 2px ring.
- Limit: The walk log kept only its last 18 lines, so it has no case count. These 18 lines say that after a click on the state edge and two Tab presses, no element in the file drop states had focus. The spy above shows that the first Tab goes to Upload. The coordinator stopped the walk before a rerun.

## Tests

- `npm test`: 1759 passed, 1 failed, 27 skipped. The failure was two stale `Button.tsx` line references in the guideline references. I fixed them, and `stories/guidelines` then passed 81 of 81. The coordinator stopped a full rerun.
- `npm test -w react`: The full run is too large for this host's memory, and the coordinator stopped it. The Button, Loading, FileDrop, DataTable and Drawer test files passed: 7 files, 211 tests.
- `npm run check:words`: passed. `npm run build-storybook`: passed. `node site/build.mjs`: not run.
- gitleaks on the new commit: no leaks.
