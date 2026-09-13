# app shell: a second layout, and a content column in two widths

Closes #308.

## The decision this is built on

Artur, reviewing PR #286 on 2026-09-13: *"make another layout: sidebar (logo, togger on the
bottom), topbar (searchbox, usemenu), content layout in shell (two types - wide and centered)"*.

He then answered the three questions the issue left open, on the issue itself, and those answers
are the brief rather than the acceptance criteria written above them:

| Question | Artur's answer |
| --- | --- |
| What is the topbar's search box? | A palette trigger drawn as a field — `lessly-ui`'s `QuickSearchRow` moved into the topbar. Looks like a search field, shows ⌘K, opens `commandPalette()` (#274). No second search implementation. |
| How does it ship? | `appShell({ layout: 'topbar' })` — a second layout on the one shell. The current layout stays the default. `accountShell()` passes it through. |
| Where does wide vs centred apply? | Both layouts: `appShell({ width: 'wide' \| 'centered' })`. Render both; Artur picks the default next round. |

The reference is `lessly-hub/lessly-ui` at `d1a25eda` — `app-shell.tsx`, `app-sidebar.tsx`,
`quick-search-row.tsx`, `user-menu.tsx`, `page-column.tsx` and `.page-column` in `src/styles.css`.
Read from source on 2026-09-13, not from memory. The clone refused on this host (the repository is
private and no credential lives here, by design); the six files were handed over instead, and the
escalation is in the run.

## What the reference actually says, and the three things it changed

The band's shape and two of the smaller decisions came out of reading the files rather than out of
the issue, and each one reversed something this branch had already built.

**The band stands beside the rail, not across the top of both.** `app-shell.tsx` gives the rail the
viewport's left edge and its whole height, and puts the top bar in the column next to it — with a
comment saying why: the bar is `h-14`, *"the same height `AppSidebar`'s header band"*, so *"the
sidebar divider is the only line the band needs"* and the two rules meet as one line across the app
(#320 in their tracker). The first version here stacked a full-width band above the rail, which is
what the kit's compatibility `.topbar` does. That put the product's mark in a second band directly
under the first — two horizontal bands in the top-left corner, saying the same thing twice. The band
moved beside the rail, `.ui-app` grew a `.ui-app__well` for the second column's two rows, and the
three boxes — the band, the rail's head, the rail's foot — were given one height.

**On a band, the user menu is the mark alone.** `user-menu.tsx` carries the note in its props:
*"A top bar is the case for turning it off: the avatar"*, with `aria-label={user.name}` on the
trigger. The first version here reused the rail's trigger whole — avatar, name and address — which
does technically fit a 52px row and reads as a rail block that wandered onto a bar. It is the avatar
now, and the sentence the two lines said is written on the control, which is the same sentence
`readerFace()` already writes when there is no menu and the avatar is the block.

**The key is read out loud.** `quick-search-row.tsx` builds its accessible name as
`` `${label} ${stated}` `` and argues for it: the shortcut is *"the one fact a person needs before
they stop reaching for the sidebar at all"*. The first version here had the cap `aria-hidden`, on
the kit's own palette-row rule. That rule is about forty rows — *"a screen reader reading 'G then I'
after every label is noise a sighted reader can simply skip"* — and there is one of these. The cap
is inside the name now. It is the smaller of the two decisions left open below.

One thing the reference does that Artur's answer overrides: `QuickSearchRow` is the **rail's** first
row there (`railTop`, *"between the header's rule and the rows"*). He asked for it in the topbar,
so that is where it is.

## What this does

`appShell({ layout: 'topbar' })` is the same shell with three parts in different places.
`layout: 'rail'` is the default and is what every page already on the shell keeps — untouched.

- **The reader's block leaves the rail's foot for the band, and the fold's control takes its
  place.** At the foot the toggle stands on the glyph column from the first frame, so the fold moves
  it nowhere; the ride along the closing edge stays the head band's, which is the one place on the
  rail where a mark does not start on that column. The toggle at the foot is where the reference
  draws it, and where this kit drew it before Artur moved it to the head for the other layout.
- **The band carries a search field at its start and the reader at its end.** A `<header>` outside
  the navigation landmark — neither of the two is a place to go.
- **The search field is a palette trigger drawn as a field.** It carries `[data-cmdk-open]`, the
  palette's own delegated trigger, so the kit has one search surface and not two. The caller names
  the palette they rendered; with no palette named there is no field — the argument `signOutHref`
  takes. `paletteHotkey()` reads the platform and a server has none, so the markup ships `Ctrl K`
  and `wireShell()` writes the reader's own key into the cap.
- **`width: 'wide' | 'centered'` on both layouts.** `centered` is the column the kit has always
  drawn; `wide` takes the cap off and fills the well.

### What was reused, and what was not

The issue asked this to be said out loud.

| From | Reused | Not reused, and why |
| --- | --- | --- |
| `topbar()` / `.topbar` | The **height**. `--ui-app-band` is held to `.topbar`'s own height by a gate, so the kit has one band height. The `.ui-app-page` sticky-offset pattern was read and deliberately not used — see the right column. | Everything it draws. `topbar()` is the compatibility preset: `brand()`, the Deck/Text switch, the version switcher, the theme toggle and `accountMenu()` — a second account menu with its own `.acct`/`.avatar` classes. Artur asked for the #286 menu, which is `dropdown()`-based. Reusing `topbar()` would have put two account menus in the kit's one shell. `.ui-app-page` is not used either: it offsets the rail *below* a band, and this band does not stand over the rail. |
| `railUser()` (#286) | The **whole block** — the same `dropdown()`, the same panel head, the same Sign out row, the same `wireDropdown()` wiring. One function draws it in both places. | Nothing. Only `direction`, `align`, the chevron and the trigger's contents differ, and each is an argument. |
| `commandPalette()` (#274) | The **trigger hook** (`[data-cmdk-open]`), `paletteHotkey()`, and the key cap class `.ui-cmdk__key`. | Nothing. The shell draws no palette of its own and implements no search. |
| `.ui-input` | The field ladder — the sunken step, the kit's hairline, the field radius. | The class itself: `.ui-input` is `width: 100%`, which is wrong for an item on a band. |
| `.ui-cmdk__search-ic` | The glyph's **box and stroke**, 17px at 2.2, so the trigger and the thing it opens are not two search marks. | — |
| The #277/#286 gates | Extended in place: `PHONE_ONLY_RULES` grew the rail's foot, the fold-offset gate was scoped to the head band, the collapsed/narrow normaliser learned the layout qualifier. | A second set of gates. Every one of the four shell test files is the same file. |

### How `width` and `maxWidth` were reconciled

One column, one cap, two ways to name it:

- `width` picks the cap the column **falls back to** — `var(--measure)` centred, `none` wide.
- `maxWidth` is the **number**, and it replaces that fallback on either width.

So the two options cannot disagree, and neither writes a second copy of a number. `centered` adds no
class, because it is the rule that was already there; `wide` adds `.ui-app__main--wide`, whose whole
content is the cap it removes. This is the reference's own discipline — *"`full` is the absence of
that class, never a second copy of the number"* — inverted so that markup already on `.ui-app__main`
keeps the column it had.

The reference's cap is **not** taken. `.page-column` is
`calc(var(--grid-container-max) - 249px - 48px)` — the container less the rail less the inset. This
kit records a reading column in `--measure` (#198, #208, Artur's own call between three options),
and a third derived width would be a fourth number for one gate to hold against three files. Named
here rather than left to look like an oversight.

## A defect the gates found, and two the pictures did

**`layout: ['topbar']` drew half a second layout.** The option was read through `String()`, and
`String(['topbar'])` is `'topbar'`. Both names are read strictly now, against the one name each that
is not the default. Found by the gate that tries the wrong values on purpose.

**`wireShell()` read the wrong realm's `navigator`.** `paletteHotkey()` defaults to the global one,
so a shell in a frame, in a second document, or under test was handed another page's platform — and
under Node, a `navigator` with no platform at all. It reads the root's own window now, which is the
discipline `command-palette.js` already keeps for its events.

**A folded rail in the new layout drew an empty band.** The first evidence run showed a 52px head
band with nothing in it and its hairline still under it at the top-left — which is the exact defect
`docs/specification.md#the-page-shell` says the 720px block exists to avoid, arriving on a desktop
instead. The lockup only goes where something *arrives* on its column; in this layout the toggle is
at the foot and nothing does. The fade is scoped to the layout that earns it, the mark stays and its
word still folds away, and a gate holds both halves.

## Evidence

Eighteen images under `docs/evidence/shell-layouts/`, all produced by the committed rig —
`scripts/evidence/layouts.mjs`, new beside `shoot.mjs` and `nav.mjs`, over the same server, the same
`shot.html` and the same Chrome. 1280×760 unless said otherwise.

**Both layouts × both widths × both themes** — the matrix Artur picks the default from:

| | wide | centred |
| --- | --- | --- |
| topbar, dark | `shell-topbar-wide-dark.png` | `shell-topbar-centered-dark.png` |
| topbar, light | `shell-topbar-wide-light.png` | `shell-topbar-centered-light.png` |
| rail, dark | `shell-rail-wide-dark.png` | `shell-rail-centered-dark.png` |
| rail, light | `shell-rail-wide-light.png` | `shell-rail-centered-light.png` |

**The states the layout is about:**

| What | Files |
| --- | --- |
| the banded layout folded — the toggle has not moved, the mark has stayed | `shell-topbar-folded-{dark,light}.png` |
| the search field under the keyboard, with the browser's own ring | `shell-topbar-search-{dark,light}.png` |
| the reader's menu open from the band, focus on Sign out | `shell-topbar-menu-{dark,light}.png` |
| a phone at 390×800, one per layout | `shell-{rail,topbar}-phone-{dark,light}.png` |

Every focused and open state is reached by real `Tab` and `ArrowDown` presses, not by a class forced
on — the rig walks the tab order until the element it wants has focus, and fails if it never does.

A 2× set of the same frames (minus the phones) is at `/home/orca/shots-308/` on the host for the
review page, shot by the same script under `UI_DSF=2`. It is deliberately **not** committed: 1× is
what the rig's README calls the reproducible cross-check.

## The gates this adds

Every rule below is enforced, and each one names the mutation that kills it.

| Gate | What it holds | What breaks it |
| --- | --- | --- |
| `shell.test.js` — the band | `layout: 'topbar'` draws a `<header>` outside the nav; the default draws none; `accountShell()` passes the option through | drawing the band in both layouts, or swallowing the option in the preset |
| `shell.test.js` — the well | the band is the first of exactly two rows in `.ui-app__well`, and nothing wraps the shell in `.ui-app-page` | putting the band back above the rail, or re-using the compatibility wrapper that offsets the rail |
| `shell.test.js` — one reader | exactly one `.ui-app__user` per layout, in the band or at the foot, never both | drawing the block in both places |
| `shell.test.js` — the band's trigger | the avatar alone, named by `aria-label`, initials `aria-hidden` | reusing the rail's two-line trigger, or leaving the button with no name |
| `shell.test.js` — one toggle | exactly one `[data-rail-toggle]`, in the rail, at the foot or in the head band | drawing it twice, or leaving it outside the rail |
| `shell.test.js` — the search | no palette named, no field; `[data-cmdk-open]` carries the id; `aria-haspopup="dialog"` | drawing a field that opens nothing, or implementing the open |
| `shell.test.js` — the key | the cap is `.ui-cmdk__key`, is not `aria-hidden`, and holds `paletteHotkey()`'s answer | hiding the key, or writing a cap of the shell's own |
| `shell.test.js` — the widths | both widths in both layouts; one `main.ui-app__main`; `--wide` iff wide | a second column, or a class on the wrong width |
| `shell.test.js` — the number | `maxWidth` survives either width name | letting the name outrank the number |
| `shell.test.js` — strictness | six wrong layout names and five wrong width names all fall to the default | reading either through `String()` |
| `shell.test.js` — one band | `layout: 'topbar'` + a `topbar` bag draws one `<header>`, and it is not `.topbar` | composing the two into a page with two headers |
| `shell-states.test.js` — one height | the band, the rail's head and the rail's foot resolve to one height, and it is `.topbar`'s | a second literal for either box |
| `shell-states.test.js` — the stick | the band is `sticky` at `top: 0` | a band that scrolls away with the page |
| `shell-states.test.js` — the caps | centred falls to `--measure`, wide to `none`, both centre in their track | capping the wide column, or copying `--measure` into a second rule |
| `shell-states.test.js` — the mark | a folded rail keeps the lockup in the banded layout and loses it in the default, and loses its word in both | fading the mark where nothing takes its column |
| `shell-states.test.js` — the foot, both ways | below 720px the rail's foot is not drawn; on the reader's fold it is | hiding the foot on the press, or leaving an empty one on a phone |
| `shell-rail.test.js` — the fold | the toggle at the foot folds the rail and writes the cookie, both ways | a fold path that only finds the head band's control |
| `shell-rail.test.js` — the menu | `wireShell()` reaches the menu on the band; Sign out is in it | wiring only what is in the rail |
| `shell-rail.test.js` — the open | the field opens the palette it names | dropping the trigger hook |
| `shell-rail.test.js` — the platform | with `navigator.platform` set to a Mac, the cap reads `⌘K` | reading the global `navigator`, which is the defect above |
| `the-page.test.js` — `layout` | no screen the kit draws names the reader twice, opens the palette from two controls, or stacks two bands | a demo screen that hand-rolls a second search box or menu |
| `the-page.test.js` — `width` | no screen caps its own page at a number | a page-scale `max-width` inside `main` |

## Guidelines

Two rules on **Guidelines / The page** (#298's page, which landed four commits before this branch),
each with a check keyed to its id in `the-page.test.js` and a row in the contract's rule-to-code
table:

- **`layout`** — *Choose one shell layout for a product and keep every screen on it.* One layout per
  product is not something one screen can show, so what the check measures is the half a screen
  **can** break: the parts a layout moves must not be drawn twice.
- **`width`** — *Give a page the wide content column when it is mostly tables and boards, and the
  centred one when it is mostly reading and forms.* With a Do/Don't pair, drawn to scale: the same
  table in the wide column and in the centred one, where its last column is off the side.

The page now carries ten rules and five Do/Don't pairs; the counts in `docs/specification.md` moved
with it, and a gate holds rules, checks and table rows in step.

## Proof

Run on this host at the branch head.

```
$ npm test
ℹ tests 1545
ℹ suites 0
ℹ pass 1542
ℹ fail 1
ℹ cancelled 0
ℹ skipped 2
ℹ todo 0

✖ failing tests:
✖ the walk has not run away with the clock
  AssertionError [ERR_ASSERTION]: the contrast walk took 199.5s, against a 120s ceiling
  set from a measured worst case of 47.6s on a fully contended 10-core laptop.
```

**That one failure is the wall-clock ceiling and nothing else, and it is red on `main` on this host
too.** Measured, not asserted: `origin/main` checked out at `233a1e7` in a second worktree over the
same `node_modules`, `node --test stories/contrast.test.js`:

```
ℹ tests 22
ℹ pass 20
ℹ fail 1
  AssertionError: the contrast walk took 160.2s, against a 120s ceiling…
```

So `main` is 160.2s and this branch 199.5s, both over a 120s bar, on a box running several agents.
The walk's own assertions — every ground, every chip pair, both themes — pass on both. The two skips
are the opt-in `CONTRAST_ACCENTS=1` matrix and the `jq`-gated publish check, skipped on `main` as
well.

```
$ npm run build
ESM dist/index.css 2.06 KB
ESM dist/index.js  39.58 KB
ESM ⚡️ Build success in 89ms
DTS ⚡️ Build success in 2151ms
DTS dist/index.d.ts 8.49 KB

$ npx vitest run   # in react/
 Test Files  17 passed (17)
      Tests  353 passed (353)
   Duration  11.79s
```

**There is no React `<AppShell>` for these options to reach.** `react/src/index.ts` publishes
`Icon`, `Button`, `Badge`, `Card`, `StatBand`, `Modal`, `Drawer`, `CommandPalette`, `DataTable`,
`Pagination` and the loading set — components, not layout. The acceptance criterion's "if one
exists" is answered: it does not, and building one is a larger question than this issue.

**`ai-slop-detector`, paranoid level:** `ShellLayouts.stories.js` **pass**,
`_the-page.js` **pass**, `layouts.mjs` **pass**, `PR.md` **pass**, `shell.js` **pass**.
`layout.css` warns on `comment-ratio` at 0.58:1 — it warns on `main` too, at 0.54:1, so the file
was already over the bar and this branch is 0.04 further along it. The rule CONTRIBUTING actually
enforces — a comment block that has become a design document — is clean on every file here; the
first draft of `shell.js` was not, and the argument it carried moved into
`docs/specification.md#the-page-shell`, where it can be reviewed and superseded.

## Decisions, and who made each

| Decision | Who | Where it is recorded |
| --- | --- | --- |
| A second layout at all; the rail keeps the logo, the toggle goes to the bottom, the topbar carries search and the user menu; content wide or centred | **Artur**, 2026-09-13 | #308 |
| The search is a palette trigger, not a second search | **Artur**, on #308 | the contract, *The second layout* |
| It ships as `layout: 'topbar'`, the current layout stays the default, `accountShell()` passes it through | **Artur**, on #308 | the contract |
| `width` applies to both layouts; Artur picks the default | **Artur**, on #308 | **open — see below** |
| The band stands beside the rail rather than above it | worker, from `app-shell.tsx` | the contract; reversible |
| On the band the trigger is the avatar alone | worker, from `user-menu.tsx` | the contract; reversible |
| `width` names the cap, `maxWidth` is the number under it | worker | the contract, *Widths* |
| The reference's `container − rail − inset` cap is not taken; `--measure` stands | worker | the contract, *Widths* |
| One band per page: `layout: 'topbar'` does not compose with the `topbar` bag | worker | the contract; the cost is named there |
| A folded rail in the banded layout keeps the product's mark | worker, from the first evidence run | the contract |
| The key cap is inside the field's accessible name | worker, from `quick-search-row.tsx` | **open — see below** |

### Open, and put to Artur

1. **The default `width`.** `centered` ships provisionally, because it is the column the kit has
   always drawn and nothing already on `appShell()` moves. But every screen the kit itself draws is
   a table or a card stack, which the wide column suits. The eight matrix shots above are the
   comparison. Asked on 2026-09-13; unanswered when this was written.
2. **The key cap in the accessible name.** Kept, on the reference's argument. One word reverses it.

## What a reviewer should push on

- **The band beside the rail is the biggest departure from what this kit already had**, and it is
  the one thing a screenshot settles faster than prose. Look at the top-left corner of
  `shell-topbar-wide-dark.png`: the rule under `Finance` and the rule under the band are one line.
  If that corner is wrong, the whole arrangement is wrong.
- **`layout: 'topbar'` silently drops the `topbar` bag.** That costs `accountShell()` its version
  switcher and its theme toggle in this layout. It is stated in the contract and gated, but it is a
  real loss and the alternative — composing the two — is a page with two headers.
- **The rail gives up its top inset in this layout** so the head band can declare a height. Nothing
  else on the rail moved, and the gates measure the three heights, but it is a geometry change
  scoped by a class and worth a look.

## Changelog entry

```
- **The app shell has a second layout.** `appShell({ layout: 'topbar' })` moves the signed-in
  reader out of the rail's foot and onto a band beside the rail, carrying a search field and the
  reader's menu; the fold's control takes the place at the rail's foot. The rail-only layout is
  unchanged and stays the default. `accountShell()` passes `layout` through. (#308)
- **The content column comes in two widths.** `appShell({ width: 'wide' | 'centered' })`, on both
  layouts: `centered` is the capped, centred column the kit has always drawn, `wide` fills the
  track beside the rail. `maxWidth` is the number under either name. (#308)
- **The topbar layout's search opens the command palette.** It is a trigger drawn as a field,
  carrying the palette's own `[data-cmdk-open]` hook and the key that opens it; `wireShell()`
  writes the reader's own platform into the key. (#308, #274)
```

## Reviews

_Left for the coordinator._

| Review | Reviewer | Verdict |
| --- | --- | --- |
| | | |
