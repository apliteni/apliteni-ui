# Page guidelines: what a page may and may not do

Closes #275.

## Premises

**What this is about.** The kit has sixteen guideline pages and every one of them is about a
part — a button, a drawer, a pager, a trail. Nothing was about the **page**: how many of those
parts may be on one, in what order, which one leads, and what may be on screen before the reader
has done anything. So it was decided per product, and the finance portal is what that looks like
— a trail saying `Home` on a page whose sidebar said `Company` (#621), four local rules
correcting a column the kit already sets (#632), a redundant way back under a card (#546), and a
KPI strip whose four captions followed four patterns (#610).

**Scope.** Artur settled it on 2026-09-12: layout, structure, density **and** interaction — all
four, not layout alone.

**What I found.** The rules were mostly right already; nothing was holding the kit's own screens
to them. Rendering all eighteen screens under `stories/apps/` and measuring them found faults
that every other gate was green about:

- **A page with no `h1`.** `Apps / Consent → Granted` — the screen a reader lands on after
  granting an agent access — said "Access granted" in a `<div class="ui-success__title">`. Nothing
  on that page was a heading, so a reader moving by heading had nowhere to land and nothing said
  which page they were on.
- **The only `h4` on a page.** `footer()` drew its column titles as `<h4>`, and on the landing
  page the heading before them is an `h2` — so the outline read h2 → h4, a rank a reader hears
  missing. (The kit draws one more, inside the feedback widget's dialog, which is an outline of
  its own.)
- **A page-sized component with no page title.** `success()` — the screen a flow lands on — drew
  its title as an `h3`, found in review rather than by the first draft of the gate.

**What I did.** Wrote ten rules covering the four scopes and
`stories/guidelines/the-page.test.js`, which discovers every screen under `stories/apps/` and
holds each of them to every rule. Eight of the ten are drawn on *Guidelines / The page*, written
for whoever is designing the screen; the other two are the kit's own decisions and are stated in
[the contract](docs/specification.md#the-page). Fixed the three faults. Put the four numbers that are judgement
calls in front of Artur as rendered screens.

**The verdict: Changed.** The issue asks for a document, and a document nothing enforces is a
wish — so this is a document and the gate that holds it.

## The survey

Twelve systems, read from their own source or published guidance on 2026-09-12, not from memory.
It sits in the pull request rather than in `docs/` because
[`docs/README.md`](docs/README.md#where-a-decision-gets-recorded) says so: *"Why this shape and not
the other goes in the issue, and stays there."*

| System | A page component? | Regions, in order | Primary actions | The way up | Page title's rank |
|---|---|---|---|---|---|
| **Polaris** (`Page`) | yes | backAction, then breadcrumbs, title (with metadata), subtitle, primaryAction, secondaryActions, actionGroups, pagination | *"Be organized around a primary activity. If that primary activity is a single action, provide it as a primary button in the page header."* No number | **both** — a back action *and* breadcrumbs; *"Always provide breadcrumbs when a page has a parent page"* | — |
| **Primer** (`PageHeader`) | yes | ContextArea (ParentLink, ContextBar), then TitleArea (LeadingVisual, Title, TrailingVisual), LeadingAction, Actions, TrailingAction, Breadcrumbs, Description, Navigation | not numbered | ParentLink on **narrow viewports only**; a back button as LeadingAction on regular | **`h2` by default** — *"shipped as an H2 by default… modify the level if the default does not make sense"* |
| **Carbon** (core) | **none** — no page-header component in the component index | — | **the only number in the survey**: *"Each page should have only one primary button"*, and *"Primary buttons should only appear once per screen (not including the application header, modal dialog, or side panel)"* | breadcrumb *"sits underneath the header and navigation, but above the page title"*; current page is not a crumb by default | — |
| **Carbon for IBM Products** (`PageHeader`) | yes | *"6 zones"*: breadcrumbs, then page title, subtitle/description, available space, tabs, actions | *"critical page actions"* — no number | the breadcrumb zone | — |
| **GOV.UK** | a page **template**, no header component | skip link, then header, `<main>` in a width-constrained container, footer | one Continue button, *"labelled 'Continue', not 'Next'"* | a back link, **required** on every question page | the page heading; *"Do not use the same page heading across multiple pages"* |
| **Material 3 / Android** | canonical **layouts**, not a page | list-detail, feed, and supporting pane (primary ≈ ⅔, secondary the rest) | — | — | — |
| **Atlassian** (`PageHeader`) | yes | *"a title and can be optionally combined with breadcrumbs buttons, search, and filters"* | not readable | breadcrumbs | — |
| **USWDS** | page **templates** (404, documentation, landing, authentication, form) | declines to prescribe: *"you can add or remove components within these templates to suit your users' needs"* | — | — | — |
| **Ant Design** | **removed** — `ant.design/components/page-header` 404s; `PageHeader` was dropped in v5 and lives outside the core library | — | — | — | — |
| **Adobe Spectrum** | **none** — `components/page` in spectrum-css is document ground (background colour, tap highlight), not a layout | — | — | — | — |
| **Fluent (React v9)** | **none** — no page or page-header package in `packages/react-components` | — | — | — | — |
| **Salesforce Lightning** | a `page-header` blueprint | readable only as class names (`__col-title`, `__col-actions`, `__col-meta`, `__col-details`); the prose did not render on either the current or the v1 docs site | not read | not read | — |

Atlassian and Lightning are recorded as **partially read**: both sites render their guidance in
JavaScript and returned only the lines above. Nothing else is filled in for them.

### Where they genuinely disagree

**How many primary actions.** Carbon writes the number down and exempts the app header, a modal
and a side panel. Polaris implies one by shape — a `primaryAction` slot and a `secondaryActions`
array — and never says a page may not have two. Nobody else numbers it at all.

**Whose rank the page title takes.** Primer ships its title as an `h2` and tells the caller to
change it if the page's outline says otherwise, which is the opposite of a rule. GOV.UK's page
heading is the `h1` and must not repeat across pages. Nobody else says.

**The way up, three incompatible answers.** Polaris ships a back action *and* breadcrumbs and
recommends the breadcrumbs. Primer swaps a parent link for a back button by viewport width.
GOV.UK requires a back link on every question page and has no breadcrumb at all. Not one of them
says *pick one* — which is exactly the rule this kit settled in #270.

**Whether a page component is a good idea.** Two systems never built one (Spectrum, Fluent), one
removed it (Ant, in v5), and one ships templates while explicitly declining to prescribe (USWDS).
Carbon's core library has none and its product library has six zones.

### What nobody does — and what this PR does about it

Checked for specifically across all twelve:

1. **Nobody says how much may stack on one page.** GOV.UK's *"one thing per page"* is the only
   size rule in the survey, and it is about a question in a form flow, not a screen of an
   application. → **we state a number, and gate it.**
2. **Nobody says how deep a page's heading outline may go.** → **h3, and no skipped rank.**
3. **Nobody says what a page looks like at load.** No system in the survey has a rule about what
   may already be on screen before the reader acts — no "no dialog, no drawer, no toast at
   arrival". → **a page arrives at rest.**
4. **Nobody ties density to the page.** Where density exists it is a property of a component.
   → **one density per page: all of its tables or none of them.**
5. **Nobody writes the lede's length down.** Polaris comes closest and it is about an annotated
   section's description, not the page's: *"Be short, no more than 1–3 sentences."*
6. **Every one of them publishes this as prose.** Whether any enforces it in CI is not something
   their documentation says, and I did not read their pipelines. What this PR adds is the check:
   ten rules, ten checks, over the kit's own eighteen screens, keyed to each other so neither can
   move alone.

## The page

**Guidelines / The page** — `stories/guidelines/_the-page.js`, first in the Guidelines sidebar
under the Overview, because it is the frame the other sixteen hang off.

| Rule | Where it is stated | What it holds |
|---|---|---|
| `head` | the page | The way back, the title, the line under it. Nothing else above the title |
| `one-h1` | the page | One title, and only one |
| `outline` | the page | Down one level at a time, stopping three deep |
| `one-primary` | the page | One filled button; everything else is quieter |
| `stacking` | the page | Six cards at most, and no card inside a card |
| `at-rest` | the page | Nothing over the page until the reader asks |
| `density` | the page | One row height, every table or none |
| `lede` | the page | Two sentences at most, and not one of them the title again |
| `shell` | the contract | An application page is `appShell()`'s, and it draws one `<main>` |
| `navs` | the contract | Every navigation landmark named, and no two on a page sharing a name |

Each of the eight on the page ends in one citation — a file, a line and a literal on that line —
and `stories/guidelines/refs.test.js` resolves all eight, so a rule whose line has moved fails the
build rather than pointing a reader at the wrong code. The two in the contract cite by file and
symbol instead, in the mapping table under
[docs/specification.md#the-page](docs/specification.md#the-page); nothing there carries a line
number, because a line number in a document no gate resolves is a citation that rots in silence.

## Round 6: only UX, and the two rules that left the page

Artur's verdict on the round-5 page: *"Too verbose. I don't want too low details — like
guidelines for code. Only UX."* The four numbers were settled in the same round and did not move.

**What the page says now.** Each rule is one plain sentence, its Do/Don't where it has one, one
sentence of why, and one citation. Gone from it: the function and component names, the CSS
selectors, the gate names, the `Except` paragraphs about markup, and the rows of two and three
citations under each rule. Nothing that was true was dropped — it moved to
[docs/specification.md#the-page](docs/specification.md#the-page), which is where a contributor
reads, and which now also carries a table naming the line of the kit each rule hangs on.

**Two rules left the page.** `shell` — compose the page with `appShell()` — and `navs` — name
every navigation landmark — are not decisions anybody takes per screen. The kit has already taken
both: `appShell()` names the rail and the trail itself, and a designer looking at a mock cannot
break either one. They are stated in the contract, and their ids sit in `GATED_ELSEWHERE` in
`stories/guidelines/_the-page.js`, so the same gate still walks all ten. The keying test reads
both lists, and a rule on neither is still a build failure. `refs.test.js` holds the shape of a
rule drawn on the page and never sees `GATED_ELSEWHERE`, so the gate checks that shape itself: an
entry with no `id` or no sentence fails there rather than naming a test `undefined`.

**Where the length landed, and where the brief said it would.** The brief asked for roughly a
third of the page's height. Measured at 1200 wide in the same browser, before and after:

| | before | after |
|---|---|---|
| the whole page | 4,067px | **2,699px** |
| prose — the imperatives, the whys, the excepts, the citations | 1,719px | **675px** |
| the four Do/Don't specimen pairs | 1,339px | 1,241px |

The prose is 39% of what it was. The page is 66%, and it cannot go much below that while it keeps
the specimens: the four pairs, the rules between them and the page's own padding come to about
2,000px before a word is written. A third of 4,067px is 1,356px — less than the pictures alone.
The brief's number was reachable only by dropping the Do/Don't pairs, which the same brief asked
to keep, so the pictures stayed and the prose took the whole cut.

## The four numbers, and who chose them

`docs/reviews/275-page-limits.html` draws each one as the same finance screen, by the kit's own
`appShell()`, with one limit changed. Screenshotted in both themes:
`docs/evidence/page-limits-dark.png`, `docs/evidence/page-limits-light.png`.

| | Alternatives drawn | Shipped |
|---|---|---|
| How many cards may stack | four, **six**, nine | six |
| Two primary actions | **one**, two | one |
| How deep the outline goes | stop at h2, **down to h3** | h3 |
| What density a data page takes | roomy, **dense** | dense allowed, never mixed |

**Who chose.** The alternatives went to Artur on the review page before the rules were written
down. He has the board; the rules on this branch are written at the recommendations above, and
each one is a single number in `LIMITS` (`stories/guidelines/_the-page.js`) that the prose and the
gate both read — so a different answer is one edit, not a rewrite. If he moves one, this section
records what he chose and what he rejected, and the issue gets the same sentence.

## Three faults the gate found, and what changed

**The consent screen had no `h1`.** `Apps / Consent → Granted` wrote its title in a `<div>`.
It is now an `<h1 class="ui-success__title">`. The class sets the size, the weight and the colour,
so the only visual change is the family: `base.css` gives every heading `--font-display`, which is
what the `h1` on every other auth screen in the kit already takes.
Before and after, both themes, in `docs/evidence/the-page-fixes-dark.png` and
`docs/evidence/the-page-fixes-light.png`.

**The footer drew the kit's only `h4`.** `footer()`'s column titles are now `h2`: they name
top-level sections of the page's end matter, and `h2` is the one rank that cannot skip whatever
heading came before it. `.ui-footer__col-title` sets the size, weight, colour and margin — it is
marked `/* rank: label */` and stays that — so nothing moves.
Same two screenshots, lower half.

**`success()` had the same fault as the consent screen.** Documented as "the page", it drew its
title as an `h3` — so a page whose whole content is a success screen had no `h1`. The rank now
follows the layout: `h1` for `hero` and `split`, which are the page, `h2` for `compact`, which
sits beside other content. `level` overrides it. `.ui-sx__title` sets the look and does not move.

This was the one fix here with no gate over it, and an independent review said so: no test in the
tree imported `src/components/success.js`, and no screen under `stories/apps/` renders `success()`,
so `the-page.test.js` cannot reach it either — it discovers its subjects from those screens.
`src/components/success.test.js` holds it now: the layout→rank mapping, `level` overriding it at
all six ranks and from a string, a non-rank falling back to the layout rather than drawing an
`<hundefined>`, and the class staying put while the tag moves.

All three are the split the kit already publishes on *Labels and titles*: the level is the outline
and the class is the look.

## The gate

`stories/guidelines/the-page.test.js`. It discovers its subjects — every story under
`stories/apps/` — renders each one, and asks structural questions of the markup.

- **A check per rule, keyed by the rule's `id`.** One test asserts `Object.keys(CHECKS)` equals
  the page's rule ids, so a rule with no check is a build failure and a check for a rule nobody
  wrote is too.
- **Three page kinds**, classified from the markup: an application page (the shell's `<main>`),
  an auth card, a marketing page. A screen that is none of them fails the `shell` rule, which is
  what "do not build your own chrome" means mechanically.
- **The four numbers live in one place.** `LIMITS` in `_the-page.js` is read by the prose *and*
  by the gate, so a limit edited in the sentence and not in the check cannot happen.
- **What it cannot see** is stated in the gate and on *The accessibility floor*, which now lists
  it: it resolves no CSS, it does not read what the headings say, and a consumer's own page is
  covered only where the kit draws the same shape.

- **It discovers subjects the way Storybook does** — `stories/apps/**/*.stories.@(js|mjs)`,
  CSF2 function stories included — and an export beside them that publishes no render is named as
  a failure rather than skipped.
- **The overlay selectors are checked against the kit.** A test asserts every class the gate
  calls an overlay is one `src/` actually writes. The first draft spelled two of them
  `.ui-tooltip` and `.ui-palette`, which the kit has never emitted; the review caught it, and this
  test is what stops the next one.
- **The specification is held to the same numbers.** A test reads the `## The page` section and
  fails if it stops stating a limit, or states a different one from `LIMITS`.

**Each rule was broken on purpose and watched go red.** A temporary `stories/apps/` story per
fault — a page with no chrome, a toolbar above the title, two `h1`s, an `h1 → h3` jump, two
primary buttons, seven cards, a card in a card, an unnamed `<nav>`, a second `<nav>` named
"Finance", a drawer opened at load, a dense table beside a roomy one, a three-sentence lede.
All ten rule checks went red, each naming the story that broke it and the fault, and nothing
else did. The file was deleted.

## Discoverable where consumers look

- **[docs/specification.md#the-page](docs/specification.md#the-page)** — a new section stating
  every limit as a guarantee, naming the gate that holds it, and mapping each rule to the line of
  the kit it hangs on. Linked from the contract's own table of contents. Two of the ten rules are
  stated only here.
- **docs/library.md** — `appShell()`'s row now says what may go on the page it opens, and links
  the section.
- **docs/README.md** — the Guidelines line names the page rules first.
- **README.md** — the pointer now says *The page* is the one to read first, and no longer claims
  the collection has five pages.
- **docs/guidelines.md** — the collection's own doc had said "five pages" since there were five;
  it says seventeen, and the two other stale counts beside it are fixed.

## Before / After

**The page itself** — `Guidelines / The page`, rendered in both themes:
`docs/evidence/the-page-guidelines-dark.png`, `docs/evidence/the-page-guidelines-light.png`.
Eight rules, four specimen pairs, eight citations, 2,699px tall at 1200 wide.

**The two faults** — `docs/evidence/the-page-fixes-dark.png`,
`docs/evidence/the-page-fixes-light.png`. Top: the consent screen's title as a `div` and as an
`h1`. Bottom: the footer's columns as `h4` and as `h2` — the same picture twice, which is what
"the class sets the look" means.

**The four limits** — `docs/evidence/page-limits-dark.png`,
`docs/evidence/page-limits-light.png`, drawn from
[docs/reviews/275-page-limits.html](docs/reviews/275-page-limits.html).

## The version bump this PR does not carry

`src/components/footer.js` and `src/components/success.js` are inside the published tarball and
their bytes changed, while `package.json` still says `0.31.0`. CI's `shipped-surface` job compares
the tarball against the base and exits non-zero when the surface moves and the version does not —
**so this branch fails that check as it stands, by instruction.** Several PRs are in flight and
this repo has already shipped two bumping to the same version, so the coordinator sequences the
version at merge. The changelog lines are under *Changelog entry* below, and the bump is the one
thing left to add on top of this branch.

## Three citations this branch cannot fix, and what they become at merge

`stories/guidelines/_the-page.js` cites three lines that #286 (the rail the reader folds) moves.
Neither branch's files touch, so git merges both without a marker and then
`stories/guidelines/refs.test.js` goes red on the merged tree — in either merge order. The three
citations are correct on this branch as it stands, so they cannot be repaired here: writing the
post-merge numbers now would fail this branch's own `refs.test.js`.

| rule | the citation on this branch, and the text it anchors on | line on a tree merged with #286 |
|---|---|---|
| `head` | `src/components/shell.js:182` `crumbs.length ? breadcrumbs` | **238** |
| `lede` | `src/components/shell.js:184` `ui-app__sub` | **240** |
| `outline` | `src/styles/layout.css:136` `rank: page-title` | **205** |

Whoever merges second edits those three numbers in `_the-page.js` and re-runs
`node --test stories/guidelines/refs.test.js`, which prints any that have moved again. Citing by
heading anchor instead would not help: `refs.test.js`'s `parseRef` accepts `file:line` and nothing
else, and every one of the collection's seventeen pages cites that way.

**Two of the five are gone, and the right-hand column is a prediction, not a measurement.** It was
measured once, on a real merge off `origin/main` @ `7ffbde4` with #286 as it stood then. The two
that dropped out belonged to `shell` and `navs`, the rules that moved to the contract — one cited
`appShell()` in the shell, the other the breadcrumb variant in the nav — and the contract cites by
file and symbol, which no line move touches. #286 is being reworked in parallel, so the three
numbers above will need re-reading against it as it lands rather than trusted.

That merge also gives exactly two conflicts, both expected: `PR.md`, whole file — a scratch file,
take whichever branch merges second — and the `appShell(...)` row of `docs/library.md`, where both
branches rewrite the cell. The resolution is a union: keep #286's three rows (the
`collapsible, collapsed` signature, its new `wireShell(...)` row, the `accountShell` passthrough)
and splice this branch's one sentence — *"What may then go on the page it opens … is The page,
and Guidelines / The page draws it"*, with its link to `docs/specification.md#the-page` — into the
`appShell` cell after "beside exactly one `<main>`." Nothing else conflicts.

## A ledger this moved, and one failure that is the box

`scripts/font-loading.test.js` counts the pages in the tree that load a webfont, because *"a
loader that stops being found stops being checked, and an empty sweep passes as loudly as a full
one"*. The review prototype is the seventh, so the number and the comment naming the six both
move — and the page loads the same two families at the same five weights as every other loader,
which is the gate's other rule and caught my first draft loading IBM Plex Sans at three.

`stories/contrast.test.js` → *"the walk has not run away with the clock"* is a 120s wall-clock
ceiling over the contrast walk, and this box goes over it whenever anything else is running:
**206.7s on `7ffbde4`**, **141.6s** in round 5, and **150.3s** in round 6, each in a run that
shared sixteen cores with something else. Run alone it passes — **122.0s** minutes later on the
same box, in a run whose whole file took 122.0s end to end. Nothing else about
the walk changed — it measures the same elements plus the new page's specimens, and every one of
them passes.

## The gates

```
                       before (7ffbde4)                 after (round 6, on bb5fd04)
root npm test          1397 tests, 1394 pass            1422 tests, 1420 pass
                       1 fail (the clock, 206.7s)       1 fail (the clock, 150.3s)
                       2 skipped                        1 skipped
```

Both runs' single failure is the same wall-clock ceiling over the contrast walk, described above,
and both boxes were contended — the round-6 run shared sixteen cores with a Storybook dev server
of mine and with another worktree's suite. Re-run alone on the same box minutes later,
`stories/contrast.test.js` is green: 23 tests, 22 pass, 0 fail, the file taking 122.0s end to end
and the walk inside it clearing its own ceiling. Nothing else in the suite fails in either run.

The round-6 rewrite adds and removes no tests — the gate still walks ten rules, eight read off the
story and two off its `GATED_ELSEWHERE` — so the count is the same 1422 it was before it.

The skip count moves because one of the two is `overview.test.js`'s built-ids check, which skips
when `storybook-static/` is absent and ran here against a fresh build. Eighteen of the new tests
are the fourteen in `the-page.test.js`, the two `refs.test.js` subtests for the new page, axe's run
over the new story, and its contrast walk; the other seven are
`src/components/success.test.js`, added after the review to gate the third fix.

Nothing under `react/` is touched by this change; its suite was run anyway and passes — 16 files,
322 tests, 0 failing.

`npm run build` (the React workspace, tsup + dts): success.
`npm run build-storybook`: success, and `overview.test.js`'s built-ids check ran against it.

The slop detector is clean on everything new at level 2, with one medium it cannot avoid: the
review prototype links Google Fonts, which the linter cannot read from disk, exactly as
`docs/reviews/270-back-control/variants.html` does.

## Review

Two independent reviews ran on this branch: a diff review with a red-team pass (28 findings, 8
critical) and a prose review. Every finding below was reproduced before it was fixed.

**Blocking, fixed.**
- `.ui-tooltip` and `.ui-palette` are not classes this kit writes — the real roots are `.ui-tip`
  and `.ui-cmdk`. The `at-rest` check could not see an open hover readout at all, and the same
  dead list meant `inOverlay()` never excluded anything.
- The same check tested *presence*, not openness, so a correctly closed `drawer()` — the way a
  drawer is meant to ship — would have failed it. It now reads `is-open`, and mounted-and-closed
  is stated as fine in the rule, the specification and the gate.
- The gate discovered only `*.stories.js` at the top level of `stories/apps/` and silently
  dropped CSF2 function stories. Both are fixed, and an unrenderable export is now a failure.
- `docs/specification.md` said "the kit draws no `h4`". It does — src/components/feedback.js:53
  `<h4>${esc(doneTitle)}</h4>` — inside a `role="dialog"`. The claim is corrected, and the `outline` check now skips headings
  inside an overlay — a drawer's `h2` and that `h4` are the overlay's outline, not the page's.
- `stacking` counted only the body's direct children, so twelve cards inside one wrapper counted
  as zero. It counts by ancestry now.
- The `one-h1` fix had landed in the consent story alone. `success()` — documented as "the page"
  — emitted an `h3` as its only heading, so a page whose whole content is a success screen had no
  `h1` either. Its title's rank now follows its layout: `h1` for `hero` and `split`, `h2` for
  `compact`, `level` overrides both. `successPanel()` is left alone: it is a block inside a page
  that has its own `h1`.
- The lede's sentence count read `e.g.` as a sentence end and missed a last sentence with no full
  stop. The repeat-the-title check missed the rule's own example, `Payouts` under
  "This is the payouts page" — it reads the opening sentence now, not just its first characters.
- The sweep's floors (5/12/8) sat under the real counts (8/18/12), so two deleted story files
  would have passed. They are the real counts.
- An outline that opens below `h1` was not a skip. It is now.
- `docs/library.md` and the floor page each carried their own copy of the numbers. Both now name
  the rules instead, so `LIMITS`, the page and the specification are the only three, and a test
  holds the third to the first.
- The story had no `name:`, so the sidebar said "The Page" while everything else said "The page".
- The specimen prefix `gp-` is `_pagination.js`'s; this page's is `tp-`.

**Claims of mine that were false.** "The kit draws no `h4`" (above). "Two page kinds are outside
this rule and inside every other one below" — the head, the lede and the card count do not reach
an auth card either; the `shell` rule now says which rules reach which kind, as an `except` rather
than buried in its reasoning. "Carbon is the only system that writes the number down" is now
scoped to the twelve systems actually read.

**Not fixed, and why.**
- The `head` check cannot fail on the kit's own screens: `appShell()` emits that container in one
  order and nothing else emits it. It fires on a hand-built `<main>` — which is exactly what a
  consumer writes, and what the finance portal wrote — and the negative control proves it. Kept.
- `density`'s two-density branch has no subject today: no screen in `stories/apps/` draws two
  tables. It is a limit rule; it fires the day one does.
- `stacking`'s count has the same property: the busiest screen here stacks two cards against a
  limit of six.

## Proof

- [x] Every rule is held by a check over the kit's own screens, and each check was broken on
      purpose and watched go red.
- [x] The four judgement calls were rendered as real screens, in both themes, before they were
      settled.
- [x] Two faults the gate found on `main` are fixed, and photographed before and after.
- [x] Every `kit` citation resolves to a file, a line and a literal on that line.
- [ ] Exercised against the finance portal. Not done here and not claimed: the portal installs a
      published version. What would settle it is `finance.apli.tech` running this gate's checks
      over its own routes.

## Changelog entry

```
Guidelines / The page — what one screen may hold: the head's order, one title, an outline that
stops three levels deep, one primary action, six cards, nothing overlaying the page at load, one
density, a two-sentence lede. Two more limits — a page is appShell()'s, and every nav landmark is
named — are in docs/specification.md#the-page, which also maps every rule to the line of the kit
that holds it. All ten are held by stories/guidelines/the-page.test.js over every screen in
stories/apps/.
The consent screen's "Access granted" is an h1 — that page had no heading at all. footer()'s
column titles are h2, not h4: on a page they were the kit's only h4, and read h2 → h4 on the
landing page. success() gives its title the rank its layout earns — h1 for hero and split, which
are the page, h2 for compact — where it was always an h3, so a success screen had no page title;
`level` overrides it.
```
