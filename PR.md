# Pagination for data-intensive tables: guidelines, a component, and three variants to choose from [waiting: Artur re-confirms the ghost-button trade]

Closes #273.

## Premises

**What this is about.** The kit has one pager, it can only page rows that are already in the
browser, and it draws itself whether or not there is a second page. A portal built on it ends
up with a different pager on every surface.

**What I found.** The complaint is about the look. The look is bad, but the cause is
structural and guidelines alone would not have fixed it.

- `DataTable` rendered its `.rx-pager` **unconditionally** — no branch on the page count and
  no prop to suppress it. A table whose rows fit on one page still got the sentence
  `Page 1 of 1 · N rows` and two permanently dead buttons. That is Artur's second screenshot,
  and it was on thirteen-plus tables in the finance portal.
- The pager slices the `rows` array it was handed, so it cannot express a page a server
  computed. `finance.apli.tech` defeats it (`pageSize={pageSize ?? rows.length}`,
  `web/src/components/Table.tsx:282`) and then hides it outright on the two surfaces where
  the false sentence would sit next to a true one — `.fin-txn .rx-pager { display: none }`
  and `.fin-inv .rx-pager { display: none }`.
- Its own comment there already names the fix: *"the real fix is a `pager` prop, the same
  shape as the selection gap already filed for #632"* (`web/src/styles/invoices.css:205-216`).
- With no kit component to reach for, the portal grew **six** pagination treatments that
  disagree on wording (`Prev`/`Next` vs `Newer`/`Older` vs `Next` alone), on element
  (`<button>`, router `<Link>`, plain `<a>`), on what happens to an unavailable control
  (disabled, removed from the DOM, or swapped for a muted `<span>`), on wrapper (a labelled
  `<nav>` twice, a bare `<div>` four times) and on whether a total, a page count, both or
  neither is shown. `Page 1 of 6` with a lone Next — Artur's first screenshot — is the
  transactions pager *removing* Prev at page 1. Not one of the six carries `aria-current` or
  a live region.

**What I will do.** Give the kit a pagination component that can express a page it did not
compute, stop it drawing a pager for a table that has one page, write the guidelines that
govern both, and put three variants in front of Artur to choose the default from.

**The verdict: Changed.** The problem is live; the issue is wrong about its size.

## The survey

Thirteen systems read from their own source or published guidance on 2026-09-10, not from
memory. This sits in the pull request rather than in `docs/` because
[`docs/README.md`](docs/README.md#where-a-decision-gets-recorded) says so: *"Why this shape and
not the other goes in the issue, and stays there."*

| System | Default page size | Size options | Jump affordance | Total shown | ARIA on the region |
|---|---|---|---|---|---|
| Carbon `Pagination` | 10 | consumer supplies | page `<select>`, no first/last | `1–10 of 500 items` | **none** — no `<nav>`, no live region |
| Carbon `PaginationNav` | — | — | numbered + overflow `<select>` | — | `<nav>`, `aria-current`, `aria-live="polite"` |
| Atlassian | n/a | none | numbered, max **7** | none | `<nav aria-label>`, `aria-current` |
| Polaris | n/a | none | **prev/next only** — no props exist to render a number | only a caller-supplied label | `<nav>`, `aria-live` on the label |
| MUI `TablePagination` | required | `[10, 25, 50, 100]` | first/last both default **off** | `from–to of count`; `-1` → `more than 10` | `role="navigation"` |
| MUI DataGrid | **100** | `[25, 50, 100]` | numbered | + `estimatedRowCount` third state | — |
| GOV.UK | n/a | none | numbered + ellipsis | **no** | `<nav aria-label="Pagination">`, page number in `<title>` |
| Adobe Spectrum | — | — | **ships no pagination component at all** | — | — |
| Primer | n/a | none | numbered; `showPages={false}` for prev/next only | no | `<nav>`, `aria-current`, **focus rule** |
| Ant Design | 10 | `[10, 20, 50, 100]` | numbered; `•••` jumps ±5; quick-jumper off by default | **opt-in, off by default** | `aria-current`, **no `<nav>`** |
| USWDS | n/a | none | **7 slots**, ellipsis in fixed positions | no | `<nav>`, `aria-current`, `aria-label="page N"` |
| TanStack | 10 | headless | `firstPage`/`lastPage`/`setPageIndex` | `pageCount: -1` = unknown | headless |
| AG Grid | **100** | `[20, 50, 100]` | first/prev/next/last + `Page X of Y` | `1 to 100 of 1,000`; unknown → literal **`?`** | not verified |

Salesforce Lightning could not be read — the docs endpoint returns 403 and the design-system
site ships no component URLs in its sitemap. Recorded as unverified rather than filled in.

### Where they genuinely disagree

**Numbered pages or not.** Eight systems ship numbers. Polaris ships no way to render one —
its props are `hasNext`/`hasPrevious`/`onNext`/`onPrevious` and nothing else. Primer supports
both and is the only system that publishes a reason for turning numbers *off*: *"prevent users
from skipping pages and force them to navigate sequentially."* The structural argument sits in
GitHub's own REST docs, which concede *"the link to the last page won't be included if it can't
be calculated"* — numbered pagination presumes a computable last page, and at scale there often
isn't one.

**Whether to show a total.** Carbon treats the range and the page count as named anatomy. Ant
treats the total as decoration: `showTotal` has no default, so you write a function or you get
no total. Polaris cannot produce one. GOV.UK and USWDS show neither counts nor totals at all.

**How to say "we don't know the total" — four incompatible answers.** Carbon flips a boolean
`pagesUnknown` and swaps the strings. MUI renders the literal text `more than 10`. AG Grid
renders a literal `?`. USWDS changes the *layout* — the current page pins to slot 4 and slot 7
holds a permanent overflow. These are four different answers to one user question, and MUI's
`estimatedRowCount` is the only one that risks showing a number that later changes.

**Default page size, 10 against 100.** The split tracks ancestry, not data: design-system
pagination bars default to 10 (Carbon, Ant, TanStack), enterprise grids default to 100 (AG Grid,
MUI DataGrid). Not one of the thirteen publishes a sentence explaining its number.

**Infinite scroll.** GOV.UK prohibits it — *"Avoid using the 'infinite scroll' technique… This
causes problems for keyboard users."* Adobe Spectrum declined to build pagination at all and
does `onLoadMore` instead. Polaris takes both positions in one system: prev/next on web,
infinite scrolling on iOS and Android.

### What nobody does — and what this PR does about it

Checked for specifically across all thirteen. These are the gaps, and three of them are where
"more advanced than the current one" actually lives:

1. **Nobody addresses layout shift or scroll position on a page turn.** No rule anywhere about
   holding the table's height while the next page loads. AG Grid's `paginationAutoPageSize`
   sidesteps it mechanically without ever stating it as a principle. → **we state it as a rule.**
2. **Nobody announces the new range by default.** Two of thirteen carry any live region, and
   Polaris's only fires if the caller passes a label — despite WCAG 2.2 SC 4.1.3 covering exactly
   this class of message (the rows are not a status message; *"Showing 21–40 of 1,204"* is).
   → **ours is a live region by default.**
3. **Nobody persists the page size**, though NN/g called it the most important pagination detail
   back in 2013. → **we make it the consumer's to persist, and say so.**
4. Nobody replaces the outgoing page with skeleton rows of the same count. MUI's skeleton is for
   the *no rows* case; Atlassian spins on top of the current page.
5. Nobody documents a keyboard shortcut for next/previous page. Polaris ships the mechanism
   (`nextKeys`) and no keys.
6. Nobody says at what row count numbered pages should be abandoned — even though a million-row
   ledger yields ten thousand of them and every truncation algorithm surveyed degenerates there.

**The APG has no Pagination pattern at all** — verified against the patterns index. There is no
normative keyboard model for pagination; every system above is inventing one. Its nearest
relative, the Feed pattern, is where `aria-setsize="-1"` means "total unknown" — the same `-1`
convention MUI, TanStack and AG Grid each arrived at independently.

## The variants, and which one is the default

All three are built, tested and rendered. **Artur chose A — Steps — on the screenshots**,
and it is the documented default. B and C ship and are one prop away.

Storybook: **Components / Pagination → Gallery** shows all three at the first page, page 25
of 49 and the last page, in both themes. `docs/evidence/variants-dark.png`,
`docs/evidence/variants-light.png`.

| | At page 25 of 49 | Reaches page 30 in | Tab stops |
|---|---|---|---|
| **A · Steps** *(default)* | `2,401–2,500 of 4,812` · First Prev Next Last | 5 presses, or Last and back | 4 |
| B · Numbered | `…` · Prev 1 … 24 **25** 26 … 49 Next | still several — 1, 24, 26 and 49 are the only reachable pages | up to 9 |
| C · Jump | `…` · First Prev Page `[25]` of 49 Next Last | 1 — type it | 6 |

```js
pagination({ page, pageSize, total, variant: 'numbered' })   // B
pagination({ page, pageSize, total, variant: 'jump' })       // C
```

Steps is the default because these ledgers are read by filtering and sorting rather than by
hopping, and the consumer had already written that down before this issue existed —
`web/src/components/pages/Transactions.tsx:220`: *"Forty-nine numbered links is a control
nobody uses on a table that is read by filtering, and it is forty-nine more tab stops
between the rows and the footer."* The decision was made against that comment, not against
a preference. Numbered was recommended for nothing: it is the shape the web has trained
people to expect and the one that does not deliver what it appears to promise — at page 25
of 49 it can reach four pages.

A fourth shape is **not** a variant and cannot be chosen: given `total: null`, every variant
renders Prev and Next alone, because with no last page nothing else can be computed. That is
the cursor/`limit + 1` case, and the invoices list and the audit trail are both already in it.

## A kit defect this uncovered, and how it was settled

The pager is the first component to put disabled ghost buttons on a card, and that measured
5.18:1 in dark, under the 5.56 floor `#220` settled for every disabled control. A ghost button
paints no box, on or off (`.ui-btn--ghost:disabled` sets `background: transparent`), so its
label is read on whatever is behind it.

| `--disabled-ink` on | dark | light |
|---|---|---|
| `--bg`, the page | 5.82 | 6.11 |
| `--surface`, a card, where every portal table sits | **5.18** | 6.11 |
| `--surface-2`, what a solid disabled button paints for itself | 5.56 | 5.66 |
| `--surface-3`, a raised surface | **4.66** | **5.26** |

Nothing here failed WCAG, where the floor is 3:1. It failed the kit's own ratchet, which exists
to make this a decision somebody writes down. It took three steps to settle, and the first two
were wrong.

**1. The box, on a false claim.** Artur's first call was to fix the kit by removing the
exemption, so a disabled ghost took the flat disabled box like every other disabled button and
every ground read one number: 5.56 in dark, 5.66 in light. The question put to him said
"nothing gets less readable anywhere". That was false, and the review caught it: `--bg` lost
0.26 in dark and 0.46 in light, and `--surface` lost 0.46 in light. The correction went to him
with those numbers. The box was built, tested and photographed on a specimen board:
`docs/evidence/ghost-disabled-before-dark.png`, `…-before-light.png` (no box),
`docs/evidence/ghost-disabled-after-dark.png`, `…-after-light.png` (the box).

**2. The box, rendered where it lives.** Artur then looked at it in the real pager, at page 1,
in a card, in both themes. The boxed, disabled First and Prev read heavier than the boxless,
enabled Next and Last beside them: the controls that are off looked like the ones that are on.
The variant without a border did the same, more mildly. A contrast table cannot show this, and
the screenshot showed it at once. He reversed the call.
`docs/evidence/pager-card-painted-dark.png`, `…-light.png`.

**3. What shipped.** The box is reverted, and the exemption is back with its original comment:
*"A ghost button draws no box when it is on, so it draws none when it is off."* The disabled
ghost takes its own ink instead, `--disabled-ink-bare`, set to clear the floor on the dullest
ground: `#a39eb7` in dark and `#585e6c` in light, which is `--muted` moved 15 steps lighter per
channel in dark and 4 darker in light. Artur proposed the values. I measured them separately and
got his figures to the hundredth, and nothing is lower than it was.

| `--disabled-ink-bare` on | dark | light | the live ghost's `--dim`, same ground (dark / light) |
|---|---|---|---|
| `--bg` | 7.00 | 6.50 | 10.41 / 10.42 |
| `--surface`, a card | 6.24 | 6.50 | 9.27 / 10.42 |
| `--surface-2` | 6.69 | 6.01 | 9.95 / 9.64 |
| `--surface-3` | 5.62 | 5.60 | 8.35 / 8.98 |

Final render: `docs/evidence/pager-card-final-dark.png`, `…-light.png`. First and Prev are off
and lighter than Next and Last beside them, and there is no box.

**Two points I pushed back on.**
- *7.00 on `--bg` is above #220's 6.11.* No ink can clear 5.56 on every ground and stay under
  6.11. A boxless label takes on the spread between the grounds, which is 1.25× in dark, and that
  is wider than the whole 5.56–6.11 band (1.10×). These values are the smallest uniform shift of
  `--muted` that clears 5.56 everywhere; I searched. The worry about a disabled control reading
  too strong is right, and it is answered against the live control beside it, which still reads
  1.5 times the contrast on every ground in dark and 1.6 in light. The gate now holds that as well.
- *A ghost-only ink forks the token.* `--disabled-ink` is one alias per theme, and a ghost-only
  value needs a second one. I put that to Artur as a choice instead of doing it quietly: a named
  token (this), moving `--disabled-ink` for every disabled control, or restoring the exemption
  alone and lowering the ratchet. FORK_DECISION

**What changes in the portal:** no box appears anywhere. A disabled ghost button's label is a
little lighter in dark and a little darker in light. Solid disabled buttons, inputs, selects,
nav rows and dropdown items do not change.

`src/styles/button-disabled.test.js` holds it:
- both inks are pinned on all four grounds in both themes;
- the bare ink stays above the floor everywhere, and below the live ghost ink everywhere;
- the solid pair is unchanged;
- any disabled rule that gives its box back to the ground has to paint `--disabled-ink-bare`,
  and the scan refuses 25 spellings of that, four of them found by review.

The floor gate in `stories/guidelines/accessibility-floor.test.js` now also measures a disabled
ghost on a card, because the new **Components / Pagination → In a card** story puts one there.
That is the specimen this was judged on, and no story had it before.

## Before / After

**The pager, unchanged base, same story, same viewport** — `docs/evidence/before-kit-pager.png`

*Before.* `Page 1 of 2 · 5 rows`, a disabled Prev and a Next thrown to the far end of the
table. No page-size control, no way to reach page 47, no `<nav>`, no live region, and `5 rows`
is the whole result while three are on screen — a reader on page 1 of 2 cannot tell which
number they are being shown. On a table that fits on one page it read `Page 1 of 1 · N rows`
with two buttons that could never do anything, on thirteen-plus tables in one portal.

*After.* `1–100 of 4,812` · First Prev Next Last, in a `<nav aria-label="Pagination">`, with
the range in a polite atomic live region, an optional rows-per-page control, and nothing at
all rendered when there is one page and no size to choose.

**The gates**

```
                       before      after
root  npm test          1058       1126   (0 failing, 2 skipped as on main)
react npm test           103        213   (0 failing)
```

## Proof

- [x] A person meets it in something running — the Storybook gallery, screenshotted in both
      themes, is how Artur chose the variant.
- [x] The three variants are comparable side by side, from one result set at one page size.
- [x] The ghost-disabled change is photographed at each step, in both themes: the reverted
      box on all four grounds, the reverted box in the real pager in a card, and the ink that
      shipped in the same pager and card.
- [x] Every rule on the guidelines page cites kit code, and `refs.test.js` resolves each
      citation to a file, a line and a literal on that line.
- [ ] Exercised against the finance portal. Not done here and not claimed: the consumer
      installs a published version, so this is provable only after a release. What would
      settle it is `finance.apli.tech` dropping its two `display: none` rules and its
      `pageSize={rows.length}` workarounds and its four hand-built pagers.

## Review

Two independent reviews ran on this branch: a diff review with a red-team pass, and a prose
review. Every finding below was reproduced before it was fixed, and every fix was broken on
purpose to watch its test go red.

**Blocking, fixed.**
- A controlled table re-sorted the page the server sent. This was the exact trap
  `finance.apli.tech` had written down in `InvoiceRow.tsx`. The rows are now rendered as handed.
- A controlled table with no `pageSize` announced `1–100 of 5,000` over 20 rows. The page size
  is now the size of the page handed in.
- `<DataTable page={1} onPageChange={f} />` compiled and drew a dead pager. A controlled table
  must now state `total`, and `hasMore` when the total is `null`.
- The published React types re-exported from a package with no types. They are now declared
  locally.
- Picking a page size fired two callbacks that undid each other.
- The jump box sent the reader to page 1 when cleared, and to the wrong page when a step was
  pressed mid-typing.
- `?total=` erased the vanilla pager and `?pageSize=` meant one row per page.
- The vanilla jump box and size control did nothing, and a re-rendered pager could not be
  heard. `wirePagination()` and `setPagerStatus()` fix both.
- The ghost-button gate was defeatable thirteen ways.

**A claim of mine that was false.** "Nothing gets less readable": see step 1 above.

**A fix that passed every gate and was still wrong.** The box that step 1 put on the disabled
ghost cleared every contrast check and read backwards in the pager: off looked heavier than on.
Artur caught it on a screenshot, and it was reverted (step 2). The gate now also checks that
direction, so a disabled ghost cannot read at least as strong as a live one on any ground.

**Also fixed.** Two pagers on one page shared a label id and a landmark name. `.ui-select`
had no disabled paint. Focus dropped to the body when a pressed step became disabled. The
changelog had no breaking entry for `.rx-pager`. Three React stories did not demonstrate what
they were named for. One guideline don't differed from its do in control count. The guidelines
index order and the sidebar order disagreed. The same four rules were restated in five
documents. The numbered variant was said to reach "five places" while naming four.

**Not fixed, on purpose.** The kit does not remember a reader's page size (the consumer's job,
stated in the guidelines). The HTML pager does not restore focus itself, because its caller
re-renders it; the guideline says so. `button({ href })` puts its `href` into the markup
unescaped. That was already in the kit before this branch and is outside this issue; it should
be filed as its own issue.

## What a reviewer should push on

- The status line for an unknown total reads `Page 3`. Carbon does the same; MUI writes
  `more than 300` and AG Grid writes `1 to 100 of ?`. I picked the one that claims least.
- `slotsFor()` caps the numbered variant at seven slots. USWDS and Atlassian both land on
  seven independently; nobody publishes a reason for that number and neither do I.
- The kit renders the page-size choice and deliberately does not remember it. If you think
  persistence belongs in the kit rather than in the consumer's URL, say so — NN/g has called
  it the most important detail of a pager since 2013 and no design system has shipped it.
