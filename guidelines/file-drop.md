# File drop

## Spend one row at rest

<!-- rule: one-row -->

**Rule:** At rest, a file drop is one row: the button that opens the picker and the accepted types beside it.

**Why:** A tall box holds the page's best space for a file that arrives once a month.

**Do:** Put an Upload button and “PDF or CSV, up to 10 MB” on one line above the list they feed.

**Don't:** Draw a tall dashed box that stacks a glyph, an invitation and a button.

**Except:** A page that only receives one file may use the labelled field-sized picker. An empty page may show a dashed drop area until the first file arrives.

## Paint the target only while a file is over it

<!-- rule: on-drag -->

**Rule:** Show the drop target while a file is over the region that accepts it, and nowhere else.

**Why:** A target drawn before there is a file to catch covers content the reader still needs.

**Do:** Cover the accepting panel as the file crosses it.

**Don't:** Cover the whole window when one panel accepts the file.

**Except:** A page that takes files anywhere may cover the whole page, slightly transparent and blurred over a table.

## Keep the file in the row it arrived in

<!-- rule: in-the-row -->

**Rule:** After the drop, the file's name, size and progress stand on one line where the button was, and remove ends it.

**Why:** A row that keeps its height keeps the page still during the upload.

**Do:** Put the name, the size and a track filling the free room on one line, then remove.

**Don't:** Put the size or track under the name, or push the list down with a progress card.

**Except:** A narrow row drops the size, and cuts the name first but keeps its extension.

## Fail in place

<!-- rule: failure -->

**Rule:** A refused file keeps its place, says what went wrong on its name's line, and offers Retry beside Remove.

**Why:** A row that drops the file sends the reader back to choosing one.

**Do:** Say “Larger than 10 MB” beside the name, with Retry.

**Except:** A reason that does not fit beside the name moves under it.

**Don't:** Replace the row with “Upload failed”, losing the file and the retry.

## Offer a button, not only a drag

<!-- rule: button-path -->

**Rule:** Give the reader a button that opens the picker, and let dragging be the shortcut.

**Why:** A keyboard cannot drag a file.

**Do:** Make Upload the control, reachable by keyboard, with the focus ring.

**Don't:** Write “Drag a file here” with nothing to press.

## State the limits once

<!-- rule: limits-once -->

**Rule:** Name the accepted types and the size limit once, beside the button, in the product's own words.

**Why:** Repeated limits teach the reader to skip them.

**Do:** Write “PDF or CSV, up to 10 MB” beside the button, and let a failure name this file's fault.

**Don't:** Repeat the limits under the button, in a tooltip and again in the error.

## Choose the row, the region or the dialog

<!-- rule: which-shape -->

**Rule:** Use a row where the file joins a list on the page, a region when one panel owns the file, and a dialog only when the upload needs answers of its own.

**Why:** A dialog that asks nothing is one more thing to dismiss.

**Do:** Take a statement into the row under the statements it joins.

**Don't:** Open a dialog for one file the row could take.
