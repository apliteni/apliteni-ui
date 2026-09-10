Table pagination for data-intensive tables: `pager()` in three tiers, a guidelines page, and the `DataTable` break

---

Closes #273.

The kit shipped no pagination. Four Finance surfaces improvised four different pagers, and on two
of them the kit's own control is switched off with CSS and filed as a kit gap in the stylesheet.
This branch adds the control, the rules for using it, and the guarantees a consumer can build on.

**Three tiers ship as options and one question is left open for you** — which becomes the
documented default. That is [the decision below](#the-three-tiers--your-call), and it is one line
plus a changelog entry either way.

**CI has not run on this branch.** [Why, and what ran instead](#verification--and-the-check-that-did-not-run).

---

## The problem, as evidence

On `main`, `react/src/DataTable.tsx:103` renders `.rx-pager` **unconditionally** — a *client* pager
over whatever rows it was handed, with `pageSize = 4` (`:28`), reading
`Page {page} of {pages} · {n} rows` (`:104`). There is no prop to turn it off.

The Finance portal pages on the **server**. So that sentence is about the wrong set of rows, and
both surfaces that hit it hid the control rather than fork away from the kit:

> **THE KIT'S OWN PAGER IS HIDDEN ON THIS SURFACE, AND THAT IS A KIT GAP, NOT A PREFERENCE.**
>
> `DataTable` renders `.rx-pager` unconditionally, reading "Page 1 of 1 · 100 rows". It is a
> CLIENT pager over the rows it was handed, and this page hands it ONE SERVER PAGE of 4,812 — so
> it states a page count and a row count that are both about the wrong set, directly beneath a
> server pager stating the right ones. Two pagers disagreeing about how much data there is, on a
> finance page, is worse than either alone.
>
> — `web/src/styles/transactions.css:138`

The invoices sheet files the same thing and names the fix — *"the real fix is a `pager` prop"* (`web/src/styles/invoices.css:207-208`).

With nothing to use, every surface improvised. **Five treatments in one portal:**

| Surface | Controls | Position indicator | Backing query |
|---|---|---|---|
| Transactions | `← Prev` / `Next →` | `Page N of M` | real `COUNT(*)` |
| Notifications | `← Prev` / `Next →` (disabled as `<span>`) | `Page N of M` | count |
| Invoices | `Newer` / `Older` | **none** | `LIMIT n+1` overshoot |
| Admin audit | `Newer` / `Older` | **none** | overshoot |
| Kit `DataTable` | `Prev` / `Next` | `Page 1 of 1 · N rows` | client — **`display: none`d twice** |

Three vocabularies, two position conventions, one control that states a falsehood. The
inconsistency is the symptom; the missing component is the cause.

### The capability split the old control conflates

`shared/src/ops/invoices.ts:142` is `LIMIT ${perPage + 1} OFFSET ${(page - 1) * perPage}`, with
`hasMore: records.length > perPage` at `:148`, and `worker/src/routes/api/invoices.ts:26` records
that a total is deliberately **not paid for**. On that surface the total is **unknown while the offset
exists**: `of M` is impossible, yet jump-to-page is mechanically fine.

*Knowing the total* and *being able to jump* are independent capabilities. The kit now models them
separately, which is why an unknown total is a first-class state here rather than an error.

<sub>Consumer citations read from `finance.apli.tech@2683589` (`origin/main`). The two workarounds are
the rules `.fin-txn .rx-pager` (`web/src/styles/transactions.css:154`) and `.fin-inv .rx-pager`
(`web/src/styles/invoices.css:209`); the selectors and the quoted text are what survive the next
refactor, the line numbers are there to find them with.</sub>

---

## The survey

Acceptance criterion 1. It lives here rather than in `docs/`, because `docs/specification.md:7` is
explicit that the contract file states guarantees and sends the argument to the issue that settled
it. This is that argument reaching GitHub.

**Carbon (IBM)** splits the control in two. *Simple* is the current page plus previous and next.
*Advanced* adds items-per-page and jump-to-page. Two components, one vocabulary — the split is by
how much the reader is working in the table, not by how much data there is.

**Ant Design** exposes the same split as independent flags on one component: `showSizeChanger`
and `showQuickJumper`. Its defaults are `pageSize` **10**, size options **`[10, 20, 50, 100]`**,
and the size changer turns itself on above **50** items.

**MUI** labels position as a **row range, not a page number** — the default reads `1–5 of 13`.
`rowsPerPageOptions` is **`[10, 25, 50, 100]`**. Its unknown-total state is real and supported:
`count={-1}` renders **`1–5 of more than 5`**. Its `getItemAriaLabel` supplies the per-control
wording this kit adopts verbatim — `Go to next page`, `Go to previous page`, `Go to first page`,
`Go to last page`.

**Primer (GitHub)** specifies the truncation rule: the **first and last page always reachable**,
a margin around the current page, and an ellipsis for the rest. It also carries the requirement
most kits leave out — on an in-place page change, **focus moves to the updated content**, or the
reader is left in a control whose surroundings silently changed.

**NN/g** on infinite scroll: it is the wrong pattern for task-oriented structured data. No stable
position, no deep link, and no sense of how much there is. That finding is why infinite scroll is
**out of scope and documented as a "don't"** rather than built.

### What the survey settled

| Finding | Consequence here |
|---|---|
| Two tiers, everywhere | Three tiers ship; the third is the numbered list Primer specifies |
| The indicator is a row range | `1–100 of 4,812`, never `Page 1 of 6` |
| Unknown total is a supported state | `1–100 of more than 100` — and it resolves exactly on the last page |
| No kit defaults a page size below 10 | The kit shipped **4**. Client paging now defaults to **25** |
| `<nav aria-label>`, `aria-current`, per-control labels, ≥24×24px targets | The kit met **none** of these. It meets all four — controls are `min-width`/`min-height` **28px** (`src/styles/pagination.css:47-48`) |

**One thing here is not the field's, it is ours.** On the last page of an overshoot pager the total
*is* knowable — it is `(page - 1) * perPage + rowsOnPage` — so the range resolves to the exact
figure instead of shrugging. MUI stops at "more than". That single line upgrades Invoices and Admin
audit from showing **no position at all** to showing a real range that becomes exact at the end.

---

## What ships

`pager()` and `pagerRange()`, framework-agnostic HTML-string factories like every other in the kit,
plus `src/styles/pagination.css` and a ninth guidelines page.

```js
pager({
  page,            // 1-based
  perPage,
  total,           // number, or omitted when unknown
  hasMore,         // required when `total` is omitted
  rowsOnPage,      // required when `total` is omitted
  tier,            // 'compact' | 'advanced' | 'numbered'
  perPageOptions,  // default [10, 25, 50, 100]
  href,            // (page) => string. Given -> real <a>. Omitted -> real <button>.
  label,           // nav aria-label, default 'Pagination'
  busy,            // boolean
})
```

A vanilla factory is not a preference here. `docs/guidelines.md` states *"Every specimen is a real
kit factory rendered live"*, so the guidelines page could not have been built on a React-only
component — acceptance criterion 2 would have been unbuildable. It also keeps
`docs/specification.md` honest where it says the React subpath is *"a wrapper over the same CSS
rather than a second kit."*

**`href` is load-bearing.** Given it, every control is a real `<a>` and the pager works with
**no JavaScript at all** — which is exactly how all four Finance pagers already work. Omit it and
every control is a real `<button>` keyed by `data-page`. Neither is ever faked with the other: a
button fires on Enter and Space, a link on Enter alone. A control with nowhere to go is a disabled
`<button>` in **both** modes, because `aria-disabled` on an anchor is a promise the browser does
not keep — it stays clickable.

### The position indicator

| State | Renders |
|---|---|
| total known | `1–100 of 4,812` |
| total unknown, `hasMore` | `1–100 of more than 100` |
| total unknown, `!hasMore` | `201–247 of 247` — **exact** |

Digits are grouped. The dash is an en dash. A total is never invented: an unknown total handed over
without `hasMore` and `rowsOnPage` is **refused**, because the range would otherwise have to guess.

---

## The three tiers — your call

Acceptance criterion 4, and the one open question in this PR. **All three ship as options.** They
share one control and one stylesheet and differ by roughly forty lines, so this is not a fork —
it is one component with a `tier`.

The portal needs at least two of them: Transactions has 4,812 rows and a real `COUNT(*)`,
Notifications does not.

### A — `compact`

<img src="https://raw.githubusercontent.com/apliteni/apliteni-ui/948d46a/docs/assets/pagination/compact-dark.png" alt="Compact tier, dark theme: the range 201-300 of 4,812 with Previous and Next" width="820">

<img src="https://raw.githubusercontent.com/apliteni/apliteni-ui/948d46a/docs/assets/pagination/compact-light.png" alt="Compact tier, light theme" width="820">

The range, and a way either side of it. Carbon's *simple*.

**For:** assumes least about the consumer's query — it needs no total and no page count, so it is
the one tier that renders correctly on every surface in the portal today. Smallest target area,
least to mis-wire, and it never states anything it cannot back.
**Against:** getting to page 30 means twenty-nine clicks. No sense of scale beyond the range
sentence.

### B — `advanced`

<img src="https://raw.githubusercontent.com/apliteni/apliteni-ui/948d46a/docs/assets/pagination/advanced-dark.png" alt="Advanced tier, dark theme: rows per page, the range, go to page, and First Previous Next Last" width="980">

<img src="https://raw.githubusercontent.com/apliteni/apliteni-ui/948d46a/docs/assets/pagination/advanced-light.png" alt="Advanced tier, light theme" width="980">

Adds rows-per-page, a jump field, and first and last. Carbon's *advanced*; Ant's
`showSizeChanger` + `showQuickJumper`.

**For:** the tier for a table somebody works in rather than glances at. Rows-per-page is the single
control that most reduces paging, and the jump field reaches page 30 in one keystroke. It is also
the only tier that still draws on a single-page table, because the size control is the reason to
stay.
**Against:** the most chrome, and the most for a consumer to wire — two extra handlers. The jump
field needs a known total to bound itself, so on an overshoot query it is unbounded and `Last` is
absent entirely.

### C — `numbered`

<img src="https://raw.githubusercontent.com/apliteni/apliteni-ui/948d46a/docs/assets/pagination/numbered-dark.png" alt="Numbered tier, dark theme: 226-250 of 500, Previous, pages 1 ellipsis 8 9 10 11 12 ellipsis 20, Next" width="900">

<img src="https://raw.githubusercontent.com/apliteni/apliteni-ui/948d46a/docs/assets/pagination/numbered-light.png" alt="Numbered tier, light theme" width="900">

A truncated page list on Primer's rule: first and last always reachable, two either side of the
current page, an ellipsis for the rest. Where a gap is a single page it is drawn as the page — the
number costs the width the ellipsis would have taken and hides nothing.

**For:** the only tier that shows scale at a glance and puts a distant page one click away. Carries
`aria-current="page"`, so a screen reader states position without reading the range.
**Against:** **requires a known total**, and therefore cannot render on Invoices or Admin audit at
all — it throws rather than drawing a last page that does not exist. Widest of the three, and the
most page-number-shaped, which is the vocabulary the survey argues against.

### The state the portal has been missing entirely

<img src="https://raw.githubusercontent.com/apliteni/apliteni-ui/948d46a/docs/assets/pagination/unknown-total-dark.png" alt="Unknown total, dark theme: more than 100 while pages remain, the exact total on the last page, and advanced with no Last control" width="900">

<img src="https://raw.githubusercontent.com/apliteni/apliteni-ui/948d46a/docs/assets/pagination/unknown-total-light.png" alt="Unknown total, light theme" width="900">

Three specimens, and each is a guarantee: **"more than"** while pages remain, the **exact total**
on the last page where it is arithmetic, and `advanced` with **no `Last` control at all** rather
than a dead one.

Invoices and Admin audit show no position today. This is what they can show instead.

### The decision I need from you

`tier` currently defaults to **`compact`**, and that is a placeholder rather than a
recommendation — it is simply the tier that assumes least about the consumer's query, so it was
the safe thing to default to while the build proceeded.

**Which tier should be the documented default?** Changing it is one line in `pager()` plus a
changelog entry. Nothing else in this branch depends on the answer, and all three tiers remain
available whichever you pick.

---

## Breaking: `DataTable` no longer draws a pager

At `c062346`, `react/src/DataTable.tsx` rendered `.rx-pager` unconditionally (`:103`) — a **client**
pager over whatever rows it was handed, `pageSize = 4` (`:28`), reading
`Page {page} of {pages} · {rows} rows` (`:104`). Under a page a server had already paged, that
sentence describes the wrong set.

Now, at `react/src/DataTable.tsx:32`: **`pager = false`, `pageSize = 25`.** Without `pager` the
table shows every row it was handed and draws nothing under it. With `pager` it pages on the client
at 25 and draws `<Pagination>` — the same control and stylesheet as `pager()` — and a turned page
moves focus onto the table. `.rx-pager` is gone from `DataTable.tsx` and `DataTable.css`; nothing
emits the class any more.

**Migration**

| If your table… | Do this |
|---|---|
| relied on the old client pager | pass `pager` |
| passed `pageSize` only to stop the kit paging a server's page a second time | drop the prop |
| hid `.rx-pager` with CSS | delete the rule — it matches nothing now |

**What this makes deletable in the Finance portal.** Both of its table surfaces hide the kit's pager
and say why in their own comments. As of `finance.apli.tech@2683589`:

- `.fin-txn .rx-pager { display: none }` — `web/src/styles/transactions.css:154`, under the banner at
  `:138`: *"THE KIT'S OWN PAGER IS HIDDEN ON THIS SURFACE, AND THAT IS A KIT GAP, NOT A PREFERENCE."*
- `.fin-inv .rx-pager { display: none }` — `web/src/styles/invoices.css:209`, under the comment at
  `:207-208`: *"the real fix is a `pager` prop"*.

Line numbers in another repository drift; the selectors and the quoted text do not. Deleting those
rules is a Finance change and is not part of this PR.

---


## This PR bumps the version to 0.27.0 — merging it cuts a release

Read this before you merge, because it is a one-line edit now and a published version afterwards.

This branch changes the **published surface** — `src/components/pagination.js`,
`src/styles/pagination.css` and three registration points, and in `react/dist` the new
`<Pagination>` and the `DataTable` change above — and `scripts/shipped-surface.mjs`
states the rule in the repo's own words: *"To ship it: bump `version` in package.json and add a
matching entry to the RELEASES array in site/changelog.mjs."* A changed surface with no bump is
its own failure verdict, so both land together: `package.json` **0.26.0 → 0.27.0**, and a matching
`0.27.0` entry in `site/changelog.mjs`.

0.27.0 rather than 0.26.1 because a breaking change on a 0.x line takes the minor.

**What happens on merge.** `.github/workflows/tag-on-bump.yml` watches every push to `main` and
acts when the version in `package.json` is not on npm — so merging creates the `v0.27.0` tag and
the GitHub Release, and the contributor row on the changelog page renders from then on.
**Publishing to npm still pauses for a human**: the `npm-publish` environment requires a reviewer,
so the bump does not put anything on the registry by itself.

**If you would rather merge without releasing**, revert the `package.json` version line before
merging and the workflow does nothing. That is the difference between a decision you can reverse
in ten seconds and one you find out about afterwards.

---

## Fixed in passing (pre-existing, unrelated to pagination)

Four defects this branch ran into. Each predates it, and none is caused by pagination.

1. `.storybook/preview.js` — `'The accessibility floor'` was missing from the `Guidelines` `storySort`, so page 8 sorted to the end of the sidebar.
2. `docs/guidelines.md` ×3 — said "Five pages" while eight shipped; the third was a different count and was **recounted, not renumbered** — pages whose export name differs from their title are **three of nine**, not two.
3. `stories/guidelines/_overview.js` — the Overview read `does not meet 0 of them yet —  — and the table marks the pages that hold them` whenever no page declared an `unmet`; it now stops after the page count, gated in both directions.
4. `docs/guidelines.md` — said `why` renders *"only when the rule has no specimens"*; `_layout.js` has rendered it in both cases since #219.

## A note, not a fix

`scripts/code-refs.test.js` fails for anyone who runs `npm test` **before committing** a new
guidelines page, and the failure text never mentions git.

The two halves of its assertion count different sets. `declared` walks the directory with
`readdirSync(stories/guidelines)`, so a new page counts the moment it exists on disk. `delegated`
comes from the sweep, whose subject set is `execFileSync('git', ['ls-files', '-z'])` at
`scripts/code-refs.test.js:197`, so the same page counts only once it is tracked. Between writing
a page and committing it, `declared` exceeds `delegated` and the gate reports *"N citations were
stood off as guideline `kit` entries, but the guideline pages declare M — the difference is gated
by nothing"* — which sends the reader looking for a citation bug that does not exist.

Worth an issue; **not fixed here**, because it is unrelated to pagination and this branch is
already carrying four fixes that are.

---

## Verification — and the check that did not run

### CI has not run on this branch. Nobody has executed it.

`.github/workflows/ci.yml:3-5` triggers on `push: branches: [main]` and `pull_request`. This host
has **no GitHub API token**, so no PR could be opened from here, and a push to a feature branch
fires nothing. There is no green check on this branch and no red one either — there is no run.

CI turns green or red when this PR is opened, which is the first time it will have been executed
at all.

### What ran instead

A full local run of what CI runs, on this branch, at the commit this PR is opened from. Real
output, pasted:

```console
$ npm ci
> @apliteni/apliteni-ui@0.27.0 prepare
> npm run build


> @apliteni/apliteni-ui@0.27.0 build
> npm run build --workspace react


> build
> tsup

CLI Building entry: src/index.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Using tsup config: /home/orca/.rocket/worktrees/apliteni-ui/pagination-guidelines-and-component-docs-and-pr/react/tsup.config.ts
CLI Target: es2020
CLI Cleaning output folder
ESM Build start
ESM dist/index.css 1.76 KB
ESM dist/index.js  13.62 KB
ESM ⚡️ Build success in 76ms
DTS Build start
DTS ⚡️ Build success in 1799ms
DTS dist/index.d.ts 3.85 KB

added 275 packages, and audited 277 packages in 8s

69 packages are looking for funding
  run `npm fund` for details

2 vulnerabilities (1 low, 1 high)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
npm warn install-scripts 2 packages have install scripts not yet covered by allowScripts:
npm warn install-scripts   esbuild@0.28.1 (postinstall: node install.js)
npm warn install-scripts   esbuild@0.27.7 (postinstall: node install.js)
npm warn install-scripts
npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
EXIT=0
```

```console
$ npm test
> @apliteni/apliteni-ui@0.27.0 test
> for d in src stories site scripts; do [ -d "$d" ] || { echo "npm test: no such directory: $d" >&2; exit 1; }; done; node --test 'src/**/*.test.js' 'stories/**/*.test.js' 'site/**/*.test.js' 'scripts/**/*.test.js'

✔ prose citations resolve: .storybook/main.js (3.759902ms)

...individual test names elided; the suite prints one line per test...

ℹ tests 1091
ℹ suites 0
ℹ pass 1090
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 77300.184421
EXIT=0
```

```console
$ npm run build
> @apliteni/apliteni-ui@0.27.0 build
> npm run build --workspace react


> build
> tsup

CLI Building entry: src/index.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Using tsup config: /home/orca/.rocket/worktrees/apliteni-ui/pagination-guidelines-and-component-docs-and-pr/react/tsup.config.ts
CLI Target: es2020
CLI Cleaning output folder
ESM Build start
ESM dist/index.js  13.62 KB
ESM dist/index.css 1.76 KB
ESM ⚡️ Build success in 81ms
DTS Build start
DTS ⚡️ Build success in 1718ms
DTS dist/index.d.ts 3.85 KB
EXIT=0
```

<!-- TASK4-HOLE-REACT-TESTS: the React vitest suite and the packaging guard go here once task 4
     has landed and been run. -->

### What that does and does not prove

**Proves:** 1,090 gates pass and none fail, on **Node v24.20.0** — the same major CI pins, so this
is not a run on a different toolchain. That count includes the axe-core accessibility gate over
every story in both themes, the contrast gate over every story file resolved against the real
stylesheets, and the packaging guard, which packs the tarball for real and installs it.

**Does not prove:** anything about a browser. Every gate here runs in **jsdom**, which has no
layout — it resolves the cascade but never lays a box out, so nothing above measures a rendered
pixel. The screenshots in this PR are the only evidence in it produced by a real rendering engine
(Chrome for Testing 149, against the built Storybook). It also does not prove a clean-runner
install: this host had a warm npm cache.

**One thing in the output that is not mine.** `npm ci` reports `2 vulnerabilities (1 low, 1 high)`
— `brace-expansion`, and an `esbuild` reached through `tsup`. Both are transitive **dev**
dependencies, and both **predate this branch**: `package-lock.json` is untouched here, and
`git diff origin/main..HEAD -- package-lock.json` is empty. Nothing in this PR adds a dependency of
any kind. Left alone rather than swept into a pagination PR.

---

## Reviewing this quickly

- **The screenshots above** are the visual proof; all eight are committed under
  `docs/assets/pagination/` (96KB the lot) and were captured from the built Storybook.
- **`docs/specification.md` → "Table pagination"** is the contract: guarantees only, each naming
  the gate that holds it.
- **Storybook → `Components/Pagination`** has the tiers, the unknown-total shapes and the states
  (link mode, first page, last page, loading) as live specimens.
- **Storybook → `Guidelines/Tables at scale`** is the ninth guidelines page.
- **One question needs you:** [which tier becomes the documented default](#the-three-tiers--your-call).

No dependency was added for the screenshots. This kit ships zero runtime dependencies, and a
~300MB dev dependency for eight PNGs is a trade Dependabot would carry forever — they were taken
with the `chrome-headless-shell` already on the host, driven by `--screenshot`.
