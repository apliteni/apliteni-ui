# File drop

## Spend one row at rest

<!-- rule: one-row -->

**Rule:** At rest, a file drop is one row with the button that opens the picker and the accepted types next to it, and that button, which the keyboard can reach and which shows the focus ring, is the control, while drag is only the shortcut.

**Why:** A tall box uses the best space on the page for a file that arrives once a month. A keyboard cannot drag a file.

**Except:** A page that exists to receive one file can use the field-sized picker, which has its own label. An empty page can show a dashed drop area until the first file arrives.

**Do:** Put an Upload button and “PDF or CSV, up to 10 MB” on one line above the list that they feed.

**Don't:** Draw a tall dashed box with a glyph, an invitation and a button in a stack inside it.

## Paint the target only while a file is over it

<!-- rule: on-drag -->

**Rule:** Show the drop target only on the region that accepts the file, and only while the file is over that region.

**Why:** A target that shows before a file is there to catch covers content that the reader still needs.

**Do:** Cover the panel that accepts the file immediately when the file crosses it.

**Don't:** Cover the whole window when one panel accepts the file.

**Except:** A page that accepts files anywhere can cover the whole page. Over a table, this cover is slightly transparent and blurred.

## Keep the file in the row it arrived in

<!-- rule: in-the-row -->

**Rule:** After the drop, the name, size and progress of the file go in the place of the button, and Remove is on the same line as the name.

**Why:** A row that changes in place keeps the page stable during the upload.

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

**Rule:** Name the accepted types and the size limit once, next to the button, in the product's own words.

**Why:** When the limits show again and again, the reader learns to skip them.

**Do:** Write “PDF or CSV, up to 10 MB” next to the button, and let a failure tell what was wrong with this file.

**Don't:** Repeat the limits under the button, in a tooltip and again in the error.

## Choose the row, the region or the dialog

<!-- rule: which-shape -->

**Rule:** Use a row when the file joins a list on the page, a region when one panel owns the file, and a dialog only when the upload must ask its own questions.

**Why:** A dialog that asks no questions is one more thing that the reader must close.

**Do:** Add a statement in the row under the statements that it joins.

**Don't:** Open a dialog for one file that the row behind the dialog could accept.
