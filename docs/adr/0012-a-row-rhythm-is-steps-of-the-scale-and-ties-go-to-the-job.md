# 0012. A row rhythm is steps of the scale, and a tie goes to the job

- **Date:** 2026-08-14
- **Status:** accepted
- **Code:** `src/styles/table.css`, `stories/table-rhythm.test.js`,
  `stories/guidelines/_layout-and-density.js`
- **Issues:** #211, follows #208 (ADR 0011)

## What we ran into

#211 asked why `.ui-table--dense` — the kit's only density modifier, and the one exception the
Layout and density page grants itself — is built from numbers that are on no scale. Reading the
sheet, the modifier was not the interesting half: the base rhythm it modifies was as off-scale as
it was.

| px | where | on the scale? |
|---|---|---|
| 16 | `.ui-table th`, `.ui-table td` — across | `--space-4`, exactly |
| 11 | `.ui-table th` — under the label | nearest is `--space-3` (12px) |
| 15 | `.ui-table td` — above and below | nearest is `--space-4` (16px) |
| 6 | `.ui-table--hover` — row inset | between `--space-1` and `--space-2` |
| 14 | `.ui-table--dense` — across | between `--space-3` and `--space-4` |
| 10 | `.ui-table--dense` — down | between `--space-2` and `--space-3` |
| 12 | `--dense` and `--zebra` end insets | `--space-3`, exactly |

Three of the six numbers that were not steps sit **exactly between two steps**, and that is the
whole of the question. Where a nearest step exists, snapping is arithmetic and needs no decision.
Where two are equidistant, something has to break the tie, and "whichever looked right" is how the
sheet got here in the first place.

## What we decided

**Every padding, margin and gap in the table's sheet is `0` or a `--space-*` step.** Base rhythm
and modifier alike — a fix that touched only `--dense` would have left the larger half behind.

**A tie is broken by what the value is for.** Not by rounding half up, which is a coin toss wearing
a rule's clothes, and not by whichever number is closer to the old one, which is the old number
deciding again:

- `--dense` rounds **down** — 14px to `--space-3`, 10px to `--space-2`. The modifier exists so a
  many-column ledger fits more rows on a screen. Rounding a tie up would have put it one step from
  the base rhythm and spent the distinction it is for.
- the hover inset rounds **up** — 6px to `--space-2`. It exists so the rounded hover fill clears a
  container's border (#71); what it buys is clearance, and clearance rounds away from the edge.

Those are one rule, not two: each value has a job, the job is stated where the value is written,
and the job says which way it goes.

**No new scale.** ADR 0011 settled that a box below the page picks its scale from what it bounds. A
row rhythm is spacing, the spacing scale already had every step this needed, and a `--row-*` scale
invented here would have been a third answer to a question that already has one.

Nothing about the exception itself changed. `.ui-table--dense` is still component-local, still the
only density modifier, and still there because a tighter rhythm in a ledger is a property of the
data rather than of the page around it. What ends is the second half of that `except` on the
guidelines page — the sentence admitting the one component with an exception to the rule did not
meet it.

## What it costs, measured

Rendered heights of a two-column table at 900px, with the kit's tokens, `base.css` and `table.css`
as shipped, read out of `getBoundingClientRect()` in headless Chrome:

| | before | after |
|---|---|---|
| base header row | 29.31px | 30.31px |
| base body row | 54.48px | 56.48px |
| dense header row | 28.31px | 26.31px |
| dense body row | 42.05px | 38.05px |
| hover row inset from the table edge | 6px | 8px |
| `--dense` / `--zebra` end insets | 12px | 12px, now `--space-3` |

The base table gains 2px a row and the dense one loses 4. A dense row was 77% of a base row and is
now 67%, so the modifier reads as **more** distinct after the snap, not less: over a 20-row ledger
it now saves 369px where it saved 249px. That is the tie-break paying for itself, and it is the
reason the direction of a tie is worth a rule.

The measurement is a one-off. The repo has no browser dependency and this change is not worth
adding one, so no committed test pins those pixels — what is pinned is the property they are
evidence for, below.

## How it is held

`stories/table-rhythm.test.js`. It reads the steps out of `src/tokens/tokens.css` rather than
repeating them: add a step and it is legal on its own, rename the scale and the gate fails loudly
instead of passing over an empty set. Within the table's sheet nothing is enumerated — the subjects
are every box-spacing declaration the sweep finds, so a `.ui-table--airy { padding: 7px }` added
tomorrow is caught with no edit here (ADR 0004). Four rules:

1. no box-spacing literal in the sheet — the failure names the nearest step, and both steps when
   the number is a tie;
2. every `var(--space-…)` the sheet names is a step that exists, because an unresolved `var()`
   computes to nothing and no rule above would see the padding disappear;
3. **`--dense` is tighter than the rhythm it modifies** — this is the tie-break itself, held rather
   than argued for. Round the tie up and rule 1 stays green, because rule 1 only ever objects to
   literals;
4. the sweep can see: it found subjects at all, it found as many `padding`s as a plainer count of
   them does, and the steps it expects to be read are being read.

Seven mutations were run, each killed by its own case: a dense literal back in the sheet (rule 1
names both candidate steps), the hover inset back to `6px` (same), a `--space-99` that does not
exist (rule 2), the tie rounded up to `--space-4` instead (rule 3), the compared selector renamed
to one the sheet does not carry (rule 3's other branch), the property regex blinded to `padding`
(rule 4), and the declaration regex narrowed so it missed every declaration after a `;` — that last
one leaves subjects on the table and is caught only by the plainer count, which is why the count is
there.

## What this does not do

The rest of `src/styles` is untouched. Its nineteen other sheets carry 288 box-spacing
declarations and 221 of them hold a literal, which is not a bigger version of this change: it is
the argument about which of those numbers are a rhythm and which are a component's own interior —
a button's optical padding is not a row rhythm, and treating them alike would flatten a distinction
worth keeping. Widening the gate is one string in it; deciding what that string should cover is a
question this lane was not asked and did not answer.
