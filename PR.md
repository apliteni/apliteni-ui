# Page guidelines: what a page may and may not do

Closes #275.

## Premises

**What this is about.** The kit has fifteen guideline pages and every one of them is about a
part — a button, a drawer, a pager, a trail. Nothing was about the **page**: how many of those
parts may be on one, in what order, which one leads, and what may be on screen before the reader
has done anything. So it was decided per product, and the finance portal is what that looks like
— a trail saying `Home` on a page whose sidebar said `Company` (#621), four local rules
correcting a column the kit already sets (#632), a redundant way back under a card (#546), and a
KPI strip whose four captions followed four patterns (#610).

**Scope.** Artur settled it on 2026-09-12: layout, structure, density **and** interaction — all
four, not layout alone.

**What I found.** The rules were mostly right already; nothing was holding the kit's own screens
to them. Rendering all seventeen screens under `stories/apps/` and measuring them found two
faults that every other gate was green about:

- **A page with no `h1`.** `Apps / Consent → Granted` — the screen a reader lands on after
  granting an agent access — said "Access granted" in a `<div class="ui-success__title">`. Nothing
  on that page was a heading, so a reader moving by heading had nowhere to land and nothing said
  which page they were on.
- **The kit's only `h4`.** `footer()` drew its column titles as `<h4>`, and on the landing page
  the heading before them is an `h2` — so the outline read h2 → h4, a rank a reader hears
  missing. It was the only `h4` the kit emitted anywhere.

**What I did.** Wrote *Guidelines / The page* — ten rules covering the four scopes — and
`stories/guidelines/the-page.test.js`, which discovers every screen under `stories/apps/` and
holds each of them to every rule. Fixed the two faults. Put the four numbers that are judgement
calls in front of Artur as rendered screens.

**The verdict: Changed.** The issue asks for a document. A document is half of it; the half that
lasts is the gate.

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
JavaScript and returned only the lines above. Nothing is filled in from memory.

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
6. **Not one of these rules is held by a test anywhere.** Every system above publishes prose and
   relies on review. That is the difference this PR is actually about: ten rules, ten checks, over
   the kit's own seventeen screens, keyed to each other so neither can move alone.

## The page

**Guidelines / The page** — `stories/guidelines/_the-page.js`, first in the Guidelines sidebar
under the Overview, because it is the frame the other fifteen hang off.

| Rule | What it holds | Cites |
|---|---|---|
| `shell` | An application page is `appShell()`'s. The two page kinds outside it — an auth card, a marketing page — are named, and inside every other rule | the page shell |
| `head` | The way back, the title, the lede, the body. Nothing above the title but the way back | Going back (#290), Stat bands (#288) |
| `one-h1` | One page, one `h1`, and it is the page title | Labels and titles (#292) |
| `outline` | Down one rank at a time, stopping at `h3` | Labels and titles (#292) |
| `one-primary` | One primary button. An overlay carries its own; a marketing page is out | Destructive actions |
| `stacking` | Six cards at most, and no card inside a card. A stat band is one thing whatever it draws | Drawers (#289), Stat bands (#288) |
| `navs` | Every navigation landmark named, and no two on a page sharing a name | The command palette (#293) |
| `at-rest` | No drawer, confirm, toast, readout or palette on screen at load | Drawers (#289), Hover readouts (#287) |
| `density` | One density per page, and no screen writes its own cell padding | Layout and density, Pagination (#279) |
| `lede` | Two sentences at most, and not one of them the title again | Microcopy and tone |

Every citation is a `kit` entry — a file, a line and a literal on that line — and
`stories/guidelines/refs.test.js` resolves all twenty of them, so a rule that cites a page whose
line has moved fails the build rather than pointing a reader at the wrong rule.

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

ARTUR_DECISION

## Two faults the gate found, and what changed

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
Same two screenshots, lower half: the before and the after are the same picture, which is the
claim.

Both are the split the kit already publishes on *Labels and titles*: the level is the outline and
the class is the look.

## The gate

`stories/guidelines/the-page.test.js`. It discovers its subjects — every story under
`stories/apps/` — renders each one, and asks structural questions of the markup.

- **A check per rule, keyed by the rule's `id`.** One test asserts `Object.keys(CHECKS)` equals
  the page's rule ids, so a rule with no check is a build failure and a check for a rule nobody
  wrote is too.
- **Three page kinds**, classified from the markup: an application page (the shell's `<main>`),
  an auth card, a marketing page. A screen that is none of them fails the `shell` rule, which is
  what "do not build your own chrome" means mechanically.
- **The three numbers live in one place.** `LIMITS` in `_the-page.js` is read by the prose *and*
  by the gate, so a limit edited in the sentence and not in the check cannot happen.
- **What it cannot see** is stated in the gate and on *The accessibility floor*, which now lists
  it: it resolves no CSS, it does not read what the headings say, and a consumer's own page is
  covered only where the kit draws the same shape.

**Each rule was broken on purpose and watched go red.** A temporary `stories/apps/` story per
fault — a page with no chrome, a toolbar above the title, two `h1`s, an `h1 → h3` jump, two
primary buttons, seven cards, a card in a card, an unnamed `<nav>`, a second `<nav>` named
"Finance", a drawer drawn at load, a dense table beside a roomy one, a three-sentence lede.
All twelve checks failed, each naming its own story and its own fault, and nothing else. The
file was deleted; the transcript is in the PR thread.

## Discoverable where consumers look

- **[docs/specification.md#the-page](docs/specification.md#the-page)** — a new section stating
  every limit as a guarantee and naming the gate that holds it, linked from the contract's own
  table of contents.
- **docs/library.md** — `appShell()`'s row now says what may go on the page it opens, and links
  the section.
- **docs/README.md** — the Guidelines line names the page rules first.
- **README.md** — the pointer now says *The page* is the one to read first, and no longer claims
  the collection has five pages.
- **docs/guidelines.md** — the collection's own doc had said "five pages" since there were five;
  it says sixteen, and the two other stale counts beside it are fixed.

## Before / After

**The page itself** — `Guidelines / The page`, rendered in both themes:
`docs/evidence/the-page-guidelines-dark.png`, `docs/evidence/the-page-guidelines-light.png`.
Ten rules, four specimen pairs, twenty citations.

**The two faults** — `docs/evidence/the-page-fixes-dark.png`,
`docs/evidence/the-page-fixes-light.png`. Top: the consent screen's title as a `div` and as an
`h1`. Bottom: the footer's columns as `h4` and as `h2` — the same picture twice, which is what
"the class sets the look" means.

**The four limits** — `docs/evidence/page-limits-dark.png`,
`docs/evidence/page-limits-light.png`, drawn from
[docs/reviews/275-page-limits.html](docs/reviews/275-page-limits.html).

## The gates

```
                        before      after
root  npm test          NNNN        NNNN
react npm test          NNN         NNN
```

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
Guidelines / The page — ten rules for what one screen may hold: the head's order, one h1, an
outline that stops at h3, one primary action, six cards, every nav landmark named, nothing
overlaying the page at load, one density, a two-sentence lede. Held by
stories/guidelines/the-page.test.js over every screen in stories/apps/.
The consent screen's "Access granted" is an h1 — that page had no heading at all. footer()'s
column titles are h2, not h4: they were the kit's only h4 and read h2 → h4 on the landing page.
```
