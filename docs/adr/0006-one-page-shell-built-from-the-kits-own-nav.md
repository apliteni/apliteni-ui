# 0006. One page shell, built from the kit's own nav

- **Date:** 2026-08-12
- **Status:** accepted
- **Code:** `src/components/shell.js`, `src/styles/layout.css`, `src/components/nav.js`
- **Issues:** #127

## What we ran into

Five things in this repository drew a page shell and no two of them agreed. `accountShell()` in
`src/components/shell.js` was the published one: a topbar over a sticky 200px sidebar it wrote by
hand as `.ui-side`, with a breadcrumb it assembled itself out of `cap` and `crumb`. Beside it,
`stories/apps/_appShell.js` drew a 248px full-height rail in a `<style>` block of its own,
`stories/apps/_financeShell.js` and `_accountShell.js` wrapped `accountShell()` twice over, and
`stories/apps/FinanceReport.stories.js` wrote its own crumb trail inline and had no shell at all.

They disagreed about things a reader can see. The kit shipped `sidebarNav()` and `breadcrumbs()` in
`src/components/nav.js` and not one shell used either. `accountShell()` emitted no `<main>`, so
three of the four example screens had no main landmark. Nor did they agree on the entries: the same
one was `plug` in one file and `key` in another, and its label was `Access &amp; agents` where the
shell interpolated raw HTML and `Access & agents` where it escaped. Worst of the set,
`_appShell.js` hid its rail outright below 820px, so a phone got a page with no navigation on it —
measured at 375px, three nav links present and zero of them reachable.

## What we decided

**Option B, chosen by Artur.** Three candidates were built and rendered side by side in
`stories/apps/ShellOptions.stories.js` — a story written to be thrown away, and now deleted.
Option A kept `accountShell()`'s centred settings layout and taught it the kit's nav primitives.
Option C kept two shells and wrote a rule for choosing between them: `appShell()` for a console,
`accountShell()` for a settings page. Option B promoted the full-height rail to be the kit's one
shell and made `accountShell()` a preset over it. Having read all three side by side, Artur picked
B, this session.

The decisions that followed, in the order they were taken:

**`appShell()` is the kit's answer; `accountShell()` is a compatibility preset.** New work calls
`appShell()`. `accountShell()` stays for the `/account` pages already on it, and `docs/library.md`
marks it as such — so nobody has to be told which of two exported factories to reach for.

**The topbar stays, off by default.** `appShell()` renders none unless the caller passes one.
`accountShell()` passes one, because `versions`, `showSwitch` and `wireTopbar()` are published
behaviour — dropping the topbar silently would take the theme toggle and the account menu off every
consuming `/account` page.

**The narrow rail is CSS, not JavaScript.** `sidebarNav({ collapsed })` is a render-time flag, so
the alternative was re-rendering the rail on a media-query change. Instead `sideLeaf()` emits
`aria-label` at every width, which lets `layout.css` fold `.ui-nav__label` out of view below 720px
with the accessible name intact.

**No `title` tooltip at narrow widths.** A 375px touch device has no hover to show one with, and
emitting `title` always would put a tooltip on every rail row at every width. `title` stays for the
explicitly collapsed rail only.

**`key`, not `plug`, for "Access & agents".** `key` means credentials. `plug` means integration, and
the plug already belongs to the "Connect over MCP" card inside that page.

**The nav definition holds a raw `&`.** `nav.js` runs every label through `esc()`, so a pre-escaped
`&amp;` comes out as `&amp;amp;`. The old shell needed the entity because it interpolated raw HTML;
the new one must not.

**The caller owns the breadcrumb trail.** `appShell()` renders `breadcrumbs()` from a `crumbs`
array and invents nothing. Pass no crumbs and there is no trail and no breadcrumb landmark.
`accountShell()` folds its old `cap` and `crumb` strings into that array, so its callers keep the
trail they had.

Six more decisions came out of reviewing the first implementation:

**The signed-in reader is a sibling of the `<nav>`, not its footer.** Inside the landmark, a screen
reader walking the navigation announces the reader's email address as a navigation item. It is
still pinned to the bottom of the rail; it is no longer inside the nav.

**The freed footer slot holds sign out.** Signing out *is* a navigation action, so the nav footer is
where it belongs. It is opt-in through `signOutHref`, because a shell that renders it unasked puts a
dead link on a page with no session behind it. `accountShell()` passes `#logout`, which is the link
its sidebar had before this change and lost.

**`ACCOUNT_NAV` is two entries.** Preferences and Access & agents, as the published default has
always been. A third entry in the kit's default is a live link on every consuming `/account` page,
pointing at a screen the kit does not ship. The demo screens that want an Overview compose it
themselves as `[{ id: 'overview', … }, ...ACCOUNT_NAV]`, so the shared entries still have one source.

**The rail brand steps aside for a topbar.** Rendering both drew the product word twice on every
`accountShell()` page.

**The rail claims no DOM id.** Nothing referenced the `id="app-rail"` it was emitting — no
`aria-controls`, no skip link — and two shells on one page would have emitted a duplicate id.

**A badged row keeps its count in its accessible name.** An always-on `aria-label` overrides the
row's own text, so a name built from the label alone narrowed "Pending 3" to "Pending". The name is
built from both.

## Why not the alternatives

**Option A — teach `accountShell()` the nav primitives.** It keeps a centred 960px settings column,
which reads well for a form and badly for a console, so the kit would have been left with a shell
whose shape argues about what the page is for. The rail is the shape that works for both.

**Option C — two shells and a rule.** A rule for choosing between two shells is a page-composition
guideline that has to be written with a qualification in it, which is the DoD item this issue exists
to clear. It also keeps every divergence the five forks had, and adds a document telling you which
divergence is correct.

**A JavaScript collapse for the narrow rail.** It works, and it costs a re-render on every resize, a
listener the consumer has to wire, and a rail that is wrong until the JavaScript runs.

**Leave `.ui-side` and `.ui-shell` in the stylesheet.** Nothing emits that markup any more, so the
rules were dead weight that would have been read as a supported second shell. They are removed, and
that is a breaking change for anyone who hand-wrote the markup rather than calling the factory.

## What this does not cover

The fold is one breakpoint at 720px and one shape below it — an icon strip. There is no drawer, no
toggle, and no way for a reader to see the labels again at that width without turning the device.

There is no skip link. The rail comes before `<main>` in the source, so a sighted keyboard-only
reader tabs every nav row before reaching the page — at 375px the rail is still every entry, just
narrower. The landmarks are what carries this: `<nav>` and `<main>` are both named, which satisfies
WCAG 2.4.1 through ARIA11, so it is a limitation and not a failure. It is a limitation a reader
using a keyboard without a screen reader feels on every page.

`<main>` is settled for the pages the shell composes and for those alone. `Landing`, `SignIn` and
`Consent` are not shell-composed — they draw `.ui-hero` and `.ui-auth` directly — and still emit no
main landmark at all.

A badge is hidden in the folded rail, as it is in the explicitly collapsed one. The count survives
in the accessible name and not on screen.

A grouped nav folds to a flat strip. Its children are *not* folded away with the labels: hiding the
nested list left the group's toggle announcing `aria-expanded="true"` over a list that was not drawn,
and took the row carrying `aria-current="page"` — the page the reader is standing on — with it. So a
group's children sit under its head at the same 44px pitch, and what goes instead is the indent and
its guide hairline, which a 46px column has no room for. The head still opens and closes them,
because `wireNav()` toggles the `hidden` attribute and nothing at that width overrides it.

The cost is that a row has only its icon to show. `sidebarNav()` takes `icon` as optional at every
level, so a top-level leaf, a group's head and a group's child can all arrive without one; each gets
a dot in the row's ink rather than a blank 44px target. It is named by `aria-label` either way, but
a dot is the one thing in the rail where what you see does not say which entry it is. A nav with
more than a handful of icon-less rows will read as a column of near-identical marks on a phone.

`sidebarNav({ collapsed: true })` — the explicit icon-only rail, which is a different surface from
this shell's CSS fold — still hides a group's children outright. That gap is unchanged here.

`.ui-card__row` stacks below 720px only inside `.ui-app__main`. A settings row in somebody else's
container still overflows at that width; that is a gap in `card.css`, not in this shell.

The shell does not size a consumer's content. A wide table already scrolls, because
`.ui-card:has(> .ui-table)` in `card.css` says so — but anything else wide has to say how it behaves
on a phone itself, and `stories/apps/FinanceReport.stories.js` stacks its statistic strip in its own
file rather than in the kit.
