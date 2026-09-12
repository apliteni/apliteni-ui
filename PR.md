# The way up from a record: a back link, the guideline, and the treatment that was chosen

Closes #270.

## What this is about

The report is one sentence about the Finance portal: *"back button is ugly - offer variants"*.
Today that control is a plain text link above the page title — `Back to invoices`, in the portal's
own blue link colour, hand-written on each record page. The kit had nothing to point it at, so
every page that needed one drew its own.

Two things were wrong and only one of them is the look. A link painted in the accent sits above
the title on every record page and competes with it and with the page's own action. And a control
that walks the browser's history does nothing at all on a page opened from a bookmark, in a new
tab or from a shared address, which is how a record in a portal of lists is usually reached.

## What changed

**A component.** `backLink({ href, label })` in `src/components/back.js`, with
`src/styles/back.css`, in the kit's usual shape: an HTML-string factory and nothing to wire.

- **It is a link to an address, never a step through the history.** Given no address it renders
  nothing, and a `javascript:` address counts as none — including `java\tscript:`, because a
  browser strips tabs and newlines out of a scheme before it reads it and so does the check.
- **It names where it goes.** The arrow is `aria-hidden`, so the accessible name is "Back to
  Invoices" while the visible text is `Invoices` — the destination as the sidebar spells it. A
  label that already says "Back to Invoices" is read as the place after those words rather than
  doubled. Given no name, or the word Back, it shows `Back` and nothing more.
- **It stays quiet.** `--dim` ink, no box until the pointer is on it, and its colour rule is
  (0,2,0) so a host stylesheet's `a:link` at (0,1,1) cannot repaint it. That is the complaint in
  the issue, answered in the stylesheet rather than in a guideline nobody reads.
- **It clears 24px.** The line of text is 17px tall, so `min-height: var(--space-6)` carries it to
  WCAG 2.5.8's floor without a box.

**A slot in the shell.** `appShell({ back })` draws the link where the breadcrumb trail would go
and draws no trail: a page has one or the other, and the two name the same parent twice. A `back`
that `backLink()` refuses leaves the trail standing. The sidebar row marked `active` stays lit and
is marked `aria-current="true"` — the current section — rather than `"page"`, which announced the
list as the page on screen; `sidebarNav({ activeIs: 'section' })` does the same outside the shell.

**A guideline.** Guidelines / Going back: six rules for a page that goes back up — when a page
gets one, what it names, why it is an address and not the history, where it sits, how it relates
to the lit sidebar row, and why it stays quiet. Every rule cites kit code, and `refs.test.js`
resolves each citation to a file, a line and a literal on that line.

**A specification section.** `docs/specification.md#the-back-link`.

## The treatment, and how it was chosen

Four treatments were built and rendered side by side on the same placeholder record, in the kit's
own shell, light and dark at 1440px and a phone at 390px:
[docs/reviews/270-back-control.html](docs/reviews/270-back-control.html).

| | What it is | Why not |
|---|---|---|
| **Quiet link** *(chosen)* | `‹ Invoices` in dim ink, no box, in the trail's slot | — |
| Bordered button | a small secondary button in the same slot | reads as an action, and adds a second box beside the page's own |
| Arrow beside the title | an icon-only arrow on the title's line | the destination is invisible, the kit's closed icon-only list would have to grow, and the title stops lining up with the cards |
| Trail only | the shell's existing breadcrumbs | spends a line naming the app and the current page to offer one useful link |

**Artur chose the quiet link.** It is now stated as what the kit ships rather than what was
recommended — in `src/components/back.js`, in the specification, in the changelog and on the
Back link story. The other three are not built; the review page keeps them, each marked **Not
chosen**, as the comparison the choice was made against.

## Rebase

Rebased onto `origin/main`, which had moved five releases under this branch: **#292** (labels and
titles in sentence case, five type ranks, the card title as a heading — #268/#269), **#289**
(a quieter drawer, drawer and motion guidelines), **#293** (the command palette), **#287** (the
tooltip, released as 0.28.0) and **#285** (the flat card, 0.27.1).

- **Version is now 0.29.0**, not 0.28.0: #287 took that number, and a new component is a minor.
  The changelog entry for this branch sits above #287's.
- **`src/styles/icon-size.test.js`: 60 → 64.** The branch was written against 58 subjects and
  claimed 60 for `.ui-back svg`'s width and height; main had raised it to 62 for the command
  palette's two glyphs. Re-measured on the merged tree rather than added up: 64.
- **`src/styles/typeface-roles.test.js`: 42 → 49.** Main reached 48 through the card title, the
  drawer section title, the palette's three, the key legend's `<kbd>` and the tooltip. `.ui-back`
  is the 49th. Re-measured, not assumed — the earlier report predicted 43 before #287 landed.
- **Storybook sidebar order:** both branches added pages. Guidelines now ends
  `… Drawers, Motion, The command palette, Hover readouts, Going back`, and Components places
  `Back link` after `Navigation`. The Guidelines index (`_overview.js`) carries the same order,
  which a gate checks.
- **`docs/specification.md` and `docs/library.md`:** both sides' sections kept. The spec index
  lists The back link between The page shell and The drawer, matching the body.
- **Two citations moved:** `sidebarNav()`'s signature shifted a line on main, and the note naming
  the chosen treatment shifted `backLink()` by six. `refs.test.js` caught both.

Nothing here was a design collision: main and this branch never changed the same rule differently.

## Held by

`src/components/back.test.js` and `src/styles/back.test.js` — 20 tests of their own, over the
shared gates every component answers to (contrast, the focus ring, icon sizing, typeface roles,
sentence case, the 24px target, axe on every story).

```
root  npm test           1337 tests, 1335 passing, 1 skipped (as on main), 0 failing
react npm test            300 tests, 300 passing
      build-storybook     completed
```

The one skip is the release-workflow test that skips itself without `jq`, the same one `main`
skips locally; CI stops rather than skipping it.

## Proof

Screenshots at 1440px and 390px, light and dark, of every screen this touches — the record page
in the shell, the Back link gallery, Guidelines / Going back, the Guidelines index, and the review
page with the decision settled. Paths are in the worker's report.

- [x] A person meets it in something running: the four treatments were rendered side by side and
      the choice was made on those screenshots.
- [ ] Exercised against the finance portal. Not done and not claimed: the consumer installs a
      published version, so this is provable only after a release. What would settle it is
      `finance.apli.tech` dropping its hand-written `Back to invoices` links for `appShell({ back })`.

## Not in this pull request

- **The Guidelines index reads `The kit does not meet 0 of them yet — —`** when no rule is unmet.
  That is `_overview.js` on `main`, unchanged by this branch, and it became visible when the last
  unmet rule was closed. It wants its own issue.
- Capital-cased labels were #268, settled on another branch and merged as part of #292.

## Release

Version `0.29.0`, changelog entry written. `main` is protected and publishing is gated: merging
tags and releases but does not publish, and the `npm-publish` environment needs a human.
