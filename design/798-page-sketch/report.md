# Draft issue for asabirov/sketch-skill: a pattern record must say where a row opens

Draft only. Nobody filed it.

**What happened.** apliteni-ui #798 built a notifications page from the record `patterns/linear-notifications`. The owner rejected the page. The fault he chose was "The detail pane beside the list". His note was "need to ask the sketch skill how it should look like?".

**Cause.** The record's "Best for" line names "a list, a detail pane, two tabs and display options". Its `item-open` state puts the record of the selected notification in a pane on the right. The sketch and the builder copied the pane, because the record gave no other choice. The product already has a page for each record, so the pane only repeated that page.

**Proposed change.** In `references/patterns.md`, add one required line to `pattern.md`: "Row opens: in place, in a pane, or on the record's own page". Also add one rule: a "Best for" line names the job of the screen, not its layout parts. Before a sketch uses a record, the sketch author checks that the product needs the same "Row opens" value.

**Evidence.** A second record, `github-notifications`, was captured from public GitHub documentation on 2026-11-12. In it, a row opens the record's own page. The new sketch is on apliteni-ui branch `design/798-page-sketch`.
