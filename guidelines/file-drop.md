# File drop

## Spend one row at rest

<!-- rule: one-row -->

**Rule:** At rest, a file drop is one row: the button that opens the picker and the accepted types beside it.

**Why:** A tall box holds the page's best space open for a file that arrives once a month.

**Do:** Put an Upload button and “PDF or CSV, up to 10 MB” on one line above the list they feed.

**Don't:** Draw a tall dashed box with a glyph, an invitation and a button stacked inside it.

**Except:** A page whose whole purpose is receiving one file may use the field-sized picker, which carries a label of its own.

## Paint the target only while a file is over it

<!-- rule: on-drag -->

**Rule:** Show the drop target while a file is over the region that accepts it, and nowhere else.

**Why:** A target drawn before there is a file to catch covers content the reader still needs.

**Do:** Cover the panel that accepts the file the moment the file crosses it.

**Don't:** Cover the whole window when one panel accepts the file.

## Keep the file in the row it arrived in

<!-- rule: in-the-row -->

**Rule:** After the drop, put the file's name, size and progress in the row the button was in, with remove beside them.

**Why:** A row that changes in place keeps the page still while the file uploads.

**Do:** Show the name, the size and a progress bar on the line, and let Remove end it.

**Don't:** Push the list down with a progress card, or open a dialog over the page.

## Fail in place

<!-- rule: failure -->

**Rule:** A refused file stays in the row, says what it did wrong, and offers Retry beside Remove.

**Why:** A row that drops the file sends the reader back to choosing one.

**Do:** Keep the name on the line and say “Larger than 10 MB” beside it, with Retry.

**Don't:** Replace the row with “Upload failed”, losing both the file and the retry.

## Offer a button, not only a drag

<!-- rule: button-path -->

**Rule:** Give the reader a button that opens the picker, and let dragging be the shortcut.

**Why:** A keyboard cannot drag a file.

**Do:** Make the Upload button the control, reachable by keyboard and showing the focus ring.

**Don't:** Write “Drag a file here” with nothing to press.

## State the limits once

<!-- rule: limits-once -->

**Rule:** Name the accepted types and the size limit once, beside the button, in the product's own words.

**Why:** Repeated limits teach the reader to skip them.

**Do:** Write “PDF or CSV, up to 10 MB” beside the button, and let a failure say what this file did wrong.

**Don't:** Repeat the limits under the button, in a tooltip and again in the error.

## Choose the row, the region or the dialog

<!-- rule: which-shape -->

**Rule:** Use a row where the file joins a list on the page, a region when one panel owns the file, and a dialog only when the upload needs answers of its own.

**Why:** A dialog that asks nothing is one more thing to dismiss. The rule picks between three containers, so a drawing would show one of them and not the choice.

**Do:** Take a statement into the row under the statements it joins, and a replacement logo into the panel that shows it.

**Don't:** Open a dialog for one file that the row behind it could have taken.
