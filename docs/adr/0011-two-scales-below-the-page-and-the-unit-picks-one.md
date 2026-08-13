# 0011. Below the page there are two scales, and the unit picks one

- **Date:** 2026-08-14
- **Status:** accepted
- **Code:** `src/tokens/tokens.css`, `src/styles/*.css`, `site/index.html`, `site/changelog.html`,
  `stories/measure-tokens.test.js`, `stories/guidelines/_layout.js`
- **Issues:** #208, follows #198 (ADR 0009)

## What we ran into

ADR 0009 gave the page its two tokens and drew the measure gate's floor at `--measure`, on the
stated grounds that below the reading column there was no scale, so a literal down there had
nothing to become. #208 asked what that remainder actually was.

Counting every width under 860px, the answer was not one family:

| px | where | what it bounds |
|---|---|---|
| 300 | `footer.css` `.ui-footer__brand` | a flex track in a wrapping row |
| 320 | `drawer.css` `--drawer-w` sm | an overlay panel |
| 340 | `empty.css` `.ui-empty__sub` | one sentence under a glyph |
| 380 | `loading.css` `.ui-denied__sub` | one sentence under a glyph |
| 400 | `callout.css` `.ui-toast` **and** `.ui-toast-stack` | an overlay panel, twice |
| 420 | `confirm.css` `--confirm-w` | an overlay panel |
| 420 | `drawer.css` `--drawer-w` md | an overlay panel |
| 420 | `layout.css` `.ui-auth__card` | a card that behaves like one |
| 560 | `drawer.css` `--drawer-w` lg | an overlay panel |
| 620 | `layout.css` `.ui-section-head` | a centred block of marketing copy |

and, in `ch`, 14, 38, 44, 52, 54, 60, 62 and 72 — the issue named six, and there were eight.

Three things fall out of the table that a list of numbers hides.

**The two 420s were three.** `--confirm-w`, the drawer's `md` step and `.ui-auth__card` are the
same measure written out three times, and a fourth 420 sits in `base.css` as the width of a blur
blob, which is not a measure at all.

**The scale already existed.** The drawer has shipped `sm` / `md` / `lg` at 320 / 420 / 560 since
it was written. It was never a component-local decision; it was the kit's panel scale, named in
one file and copied by hand everywhere else.

**Two of the px numbers were prose.** `.ui-empty__sub` and `.ui-denied__sub` are single sentences
under an icon, bounded in px. Poppins sets digits at 0.6em and both paragraphs are `--text-sm`
(13px), so 340px is 43.6ch and 380px is 48.7ch — the same sentence, in the same shape of
component, with the measure written in the unit that does not survive a font-size change.

## What we decided

**Two scales, and the unit says which one you are on.**

```css
--panel-sm: 320px;   --prose-display: 14ch;   /* not a measure: where a headline rags */
--panel-md: 420px;   --prose-caption: 44ch;   /* a sentence under a glyph */
--panel-lg: 560px;   --prose-lede:    54ch;   /* the line under a title */
                     --prose-body:    62ch;   /* a left-aligned column */
                     --prose-dense:   72ch;   /* reference prose set below 13px */
```

A box that holds a **component** takes a `--panel-*` step in px. A box that holds a **line** takes
a `--prose-*` step in ch. Nothing has to be looked up to choose: the thing being bounded picks the
unit, and the unit picks the scale.

The steps are almost entirely numbers that were already there. Of the eighteen declarations
reconciled, thirteen did not move at all; the five that did moved a total of 6ch, 2ch, 2ch, 20px
and 60px, and each is listed in the changelog.

`--prose-*` steps are named for what is being read rather than sized `s`/`m`/`l`, because the
writer knows which of those they are writing and does not know which t-shirt it is. They are also
**declared on the paragraph, never on a wrapper**: `ch` resolves against the font-size of the
element carrying it, so the same token on a wrapper holding an `h2` and a `p` means two different
widths. That is why `.ui-section-head` — a centred block with a 28–40px heading above 17px copy —
takes `--panel-lg` and not a prose step. It is the one box in the kit where the measure cannot be
stated in the unit the content deserves.

`.ui-footer__brand` keeps its literal 300px, and it is the only one that does. It is a flex track
in a wrapping row: its width is what decides when the footer breaks into columns, so it answers to
the row rather than to a scale, and it sits below the smallest panel step on purpose.

## Breakpoints: a convention, not a build step

A media query cannot read a custom property. `@media (max-width: var(--panel-lg))` is invalid, and
no amount of token discipline changes that, so the six literals — 460, 560, 600, 720, 760, 860 —
have exactly two futures.

**A build step.** Sass, PostCSS or a generator inlines the value at build time. This is what most
kits do, and we are not doing it. The kit's distribution story is a plain stylesheet a consumer
`<link>`s or imports — no compiler between the source and the published file. Introducing one so
that six numbers can be spelled differently buys a consistency a test already buys, and it costs
every consumer the ability to read the shipped CSS and see what it says. `@custom-media` would
solve this properly and is not shipping; container queries would solve a larger problem and are a
re-architecture, not a rename.

**A convention.** The literals stay literal, a documented list says which values are breakpoints,
and a gate discovers every `@media (max-width: Npx)` in the swept trees and fails any value that
is not on that list. Same guarantee against drift, no compiler, and the source stays readable.

**We take the convention.** The gate that enforces it is not built here — this lane leaves the six
literals exactly where they are — and is filed as its own issue, because a list of legal
breakpoints is a design decision about how many the kit wants, not a discovery about how many it
happens to have. Note that two of the six already coincide with tokens (`560` = `--panel-lg`,
`860` = `--measure`), which is the kind of thing that list will have to take a position on.

## How it is held

`stories/measure-tokens.test.js` sweeps `src/styles/**` and `site/**` by property, never by a
file list, per ADR 0004. Three things changed in it.

**The floor is discovered, not written.** It was `--measure` (860px); it is now the smallest step
of the panel scale, read out of `src/tokens/tokens.css` with a regex over `--panel-*`. Add a
smaller step and the floor follows it down without anyone editing the test. The paragraph in the
old header explaining why the floor sat where it did is deleted rather than corrected — it argued
for a state of affairs this ADR ends.

**A second rule, for the other scale.** A bare `Nch` in a `max-width` now fails the same way a
bare `Npx` at or above the floor does, and the failure names the nearest step.

**The sweep reads inline styles.** `site/index.html` carried a reading column as
`<div style="max-width:840px">` — a page-scale literal that the old sweep could not see, because
it opened `<style>` blocks and nothing else. It is `var(--measure)` now, and the sweep reads
`style="…"` attributes as CSS. Finding that hole also cost a regex fix: a declaration value that
was allowed to cross a quote ran out of one attribute and swallowed the twenty lines of markup
after it, `max-width` included. A test asserts that every inline width comes back out of the
sweep, at its own line, so the attribute half cannot quietly stop working.

Four mutations were run and each killed only its own case: a panel width back to `400px`, the
inline column back to `840px`, a prose measure back to a bare `44ch`, and the attribute half of
the mask deleted.

## What this costs

Five visible changes, all of them small and none crossing a breakpoint:

| | before | after |
|---|---|---|
| `.ui-toast`, `.ui-toast-stack` | 400px | 420px |
| `.ui-section-head` | 620px | 560px |
| `.ui-fbc__done p` | 38ch | 44ch |
| `.ui-hero__sub` | 52ch | 54ch |
| `.ui-app__sub` | 60ch | 62ch |
| `.ui-denied__sub` | 380px | 44ch (≈343px at 13px) |
| `site/changelog.html .wrap` | 820px | `--measure` (860px) |
| `site/index.html` inline block | 840px | `--measure` (860px) |

`stories/` is not swept by the gate. `stories/guidelines/_layout.js` was reconciled by hand and
`stories/guidelines/Overview.stories.js` still writes `62ch`, which is now exactly `--prose-body`
and can be swapped for the token with no visual change at all. Widening the sweep to a third tree
is a bigger change than this issue asked for.

The new tokens are appended at the **end** of `tokens.css` rather than beside `--container` and
`--measure`, where they belong. Guideline pages cite that file by line number and
`stories/guidelines/_colour-and-theming.js` pins `tokens.css:161`; an insert higher up moves it.
That is a real constraint on a shared file and worth knowing about before the next token block
goes in.
