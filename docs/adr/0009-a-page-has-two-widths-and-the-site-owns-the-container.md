# 0009. A page has two widths, and the site's number is the container

- **Date:** 2026-08-13
- **Status:** accepted
- **Code:** `src/tokens/tokens.css`, `src/styles/base.css`, `src/styles/layout.css`,
  `src/components/shell.js`, `stories/measure-tokens.test.js`
- **Issues:** #198, #208, #211

## What we ran into

Counting only page-scale values — 820px and up — `src/`, `stories/` and `site/` hard-coded 820,
840, 860, 900, 1000, 1040, 1060, 1080, 1120 and 1180. Ten numbers, and no token for any of them,
beside a spacing scale of ten steps and a radius scale of seven.

They were not ten answers to one question. They were answers to three:

| | |
|---|---|
| **page container**, gutter to gutter | 1180 (`base.css:91`, `topbar.css:17`, `footer.css:24`) and 1120 (`site/index.html:18`, `site/chrome.mjs:53,66`) |
| **content grid** inside a container | 1080 (`layout.css:301`) and a scatter of one-off story and site sections |
| **reading column** inside a shell track | 860 (`layout.css:122`, and a second copy at `shell.js:97`) |

So `860` and `1180` were never in conflict: a column that already has a sidebar beside it and a
page measured gutter to gutter are different axes. Treating all ten as one disagreement is what
made the problem look unsolvable.

The one real disagreement was 1180 against 1120, and the evidence for it was a single
declaration. `site/chrome.mjs:53` read `.site-topbar .topbar__in { max-width: 1120px }` — the site
reusing the kit's own `.topbar` component and then paying a line of CSS to override its width back
down. That line existed for no reason except that the two disagreed.

The cost had already been paid elsewhere. When the guideline pages needed a measure to lay
specimens out there was none, so `stories/guidelines/_layout.js` took the confirm dialog's
`--confirm-w` across a cascade boundary and `destructive-actions.test.js` held the copy honest.

## What we decided

**Two tokens, because a page has two widths.**

```
--container: 1120px;   /* the page, gutter to gutter */
--measure:    860px;   /* the reading column inside a track */
```

**1120 wins.** The override is the only recorded intent in the tree: the site chose that number
and paid for it. Nothing anywhere argued for 1180. The usual reason for a split runs backwards
here — a marketing hero normally takes the *wider* container and app chrome the tighter one, and
this was the other way round — so it reads as drift rather than intent. The kit's chrome narrows
by 60px and the live site renders unchanged; the override is deleted, having nothing left to do.
`layout.css:301`'s 1080 folds into `--container` for the same reason: a third page-scale number
with nothing arguing for it.

This was the owner's call between three options, not a derivation. The two rejected are below.

**One width, one place.** `shell.js` carried `const MAIN_MAX = '860px'` beside `layout.css`'s
`var(--ui-app-main, 860px)`, and a test compared the two strings to keep them true. That is two
sources with a guard, not one source. The shell now writes **no** `--ui-app-main` at all when the
caller gives none, so the CSS falls through to `var(--measure)`.

An unusable `maxWidth` has to *remove* the property rather than replace its value. A custom
property accepts any token stream, so `--ui-app-main: wibble` is a valid declaration that makes
`max-width` invalid at computed-value time and drops the column to `none` — the full track, which
is the fault the guard exists for. Omitting the property is what lets the fallback fire.

**The gate reads its own floor.** `stories/measure-tokens.test.js` discovers subjects by scanning
the `max-width` property across `src/styles/*.css`, the `<style>` blocks of `site/*.html` and
`site/*.mjs` — never a file list, per [0004](0004-the-gates-discover-their-subjects.md). "Page
scale" is not a number written into the test: it is `--measure`, read out of `tokens.css` at run
time, so the rule moves when the scale does.

A media query is not a subject. `@media (max-width: 860px)` is a question about the viewport, not
a width assigned to a box, and the declaration regex only matches a property following `;`, `{`,
`}` or the start of text — the one inside `@media (…)` follows `(`. That is load-bearing rather
than lucky: `site/index.html:99` carries a breakpoint at exactly the floor, so a leak would turn
the gate red on a correct file. A test asserts the exclusion directly rather than leaving it to be
inferred from a green run.

## Why not the alternatives

**One container at 1180, the site widens.** Keeps the kit and every consumer app rendering exactly
as today, and deletes the same override. Rejected because it moves the one surface real users
load, as a side effect of a token cycle — and it keeps the number nothing argues for while
discarding the one that was chosen deliberately enough to be paid for in CSS.

**A three-step scale — `--container-narrow: 1080`, `--container: 1120`, `--container-wide: 1180`.**
It carries no visual risk at all, because every rendered pixel holds while every page-scale
literal still becomes a `var()`.
Rejected because it names the disagreement instead of settling it. The question was whether 1120
and 1180 are *meant* to disagree, and there is no reason to write into the token comment beyond
"they always have". Three container steps is also more vocabulary than any surface here asked for,
and the next width would land on whichever step is closest rather than on the one that is right.

**Keep the two copies of 860 and keep the test that compares them.** That test is the smell, not
the fix — it proves two sources agree today and does nothing about there being two.

## What this does not cover

**Everything below the reading column.** Component widths (400px, 340px, 420px, 620px), character
measures (38ch, 44ch, 52ch, 60ch, 72ch) and breakpoints (460, 560, 600, 720, 760, 860) are still
literal, and the gate's floor sits at `--measure` for that reason: below it there is no scale for a
literal to become, and a token for one component would look like a scale and be a sample of one.
Tracked as #208. Breakpoints need more than a token — a media query cannot read a custom property,
so that one is a build step or a convention.

**`stories/guidelines/_layout.js`'s `--confirm-w` borrow.** It stays. The guideline grid has to be
as wide as the widest *specimen* it lays out, and that specimen is a confirm dialog, so the number
wanted is the component's width and not the page's. `--measure` there would size the grid to a
reading column unrelated to what is in the cells. What removes the copy is #208.

**Density.** Related but separate, and stated on the `Guidelines / Layout and density` page rather
than here: no kit-wide density mode, the spacing scale is the control, and `.ui-table--dense` is
the one component-local modifier. Its own numbers are literals rather than steps — #211.

**Whether 1120 is the right number.** This records that it was chosen, by whom, and on what
evidence. It does not claim it is optimal for reading, for tables, or for any surface not yet
built.
