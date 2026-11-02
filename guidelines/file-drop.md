# File drop

## Spend one row at rest

<!-- rule: one-row -->

**Rule:** At rest, a file drop is one row: the button that opens the picker, with the accepted types beside it. The button is the control, and dragging is only the shortcut.

**Why:** A tall box takes the best space on the page for a file that arrives once a month. A keyboard cannot drag a file, so the keyboard must reach the button and see its focus ring.

**Except:** A page that exists to receive one file can use the field-sized picker, which has its own label. An empty page can show a dashed drop area until the first file arrives.

**Do:** Put an Upload button and “PDF or CSV, up to 10 MB” on one line above the list that they feed.

**Don't:** Draw a tall dashed box with a glyph, an invitation and a button in a stack inside it.

## Paint the target only while a file is over it

<!-- rule: on-drag -->

**Rule:** Show the drop target only while a file is over the region that accepts it.

**Why:** A target drawn before a file arrives covers content that the reader still needs.

**Do:** Cover the panel that accepts the file the moment the file crosses it.

**Don't:** Cover the whole window when one panel accepts the file.

**Except:** A page that accepts files anywhere can cover the whole page. Over a table, the cover is slightly transparent and blurred.

## Keep the file in the row it arrived in

<!-- rule: in-the-row -->

**Rule:** After the drop, the file's name, size and progress take the place of the button. Remove is on the name line.

**Why:** A row that changes in place keeps the page still during the upload.

**Do:** Put Remove at the end of the name line, the size under the name, and the progress track below both.

**Don't:** Push the list down with a progress card, or open a dialog over the page.

## Fail in place

<!-- rule: failure -->

**Rule:** A refused file stays in its place, tells what was wrong with it under its name, and shows Retry next to Remove.

**Why:** If a row removes the file, the reader must choose a file again.

**Do:** Keep the name on its line, and show “Larger than 10 MB” and Retry under it.

**Don't:** Replace the row with “Upload failed”, because this removes the file and the retry.

## State the limits once

<!-- rule: limits-once -->

**Rule:** Name the accepted types and the size limit once, beside the button, in the product's own words.

**Why:** Repeated limits teach the reader to skip them.

**Do:** Write “PDF or CSV, up to 10 MB” beside the button. Let a failure say what was wrong with this file.

**Don't:** Repeat the limits under the button, in a tooltip and again in the error.

## Choose the row, the region or the dialog

<!-- rule: which-shape -->

**Rule:** Use a row when the file joins a list on the page, a region when one panel owns the file, and a dialog only when the upload must ask its own questions.

**Why:** A dialog that asks no questions is one more thing that the reader must close.

**Do:** Add a statement in the row under the statements that it joins.

**Don't:** Open a dialog for one file that the row behind the dialog could accept.
