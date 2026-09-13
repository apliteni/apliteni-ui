# React: `<Dropdown>` and `<BackLink>`, so a consumer stops re-drawing the kit

Closes #304.

## The decision this is built on

#304 offered three acceptance criteria and the third was an alternative to the first two:
*"Or: the kit documents that these are vanilla-only and how a React consumer is expected to
compose them without copying."* Artur answered it on the issue on 2026-09-13, through the
coordinator:

> **Decision (Artur, 2026-09-13):** build both — `<Dropdown>` and `<BackLink>` in the React
> package. The "document vanilla-only" alternative was put to him and rejected.

Why, in his words on that comment: react/README's own rule is *"holds client state → React
component"*, and a dropdown whose rows are router links does; the back link is stateless but
the only composition available today breaks the kit's own selector. This branch builds exactly
that and reopens neither half.

## What this is about

The React entry exported Badge, Button, Card, DataTable, Modal, Drawer, CommandPalette,
Pagination, StatBand and the loading set. `dropdown()` and `backLink()` were HTML-string
factories and nothing else, so a React consumer needing either had two ways to get one, and
both are bad:

- **Re-draw it.** A `<div>` row costs every option its router link, so the rows become
  `<Link>`s written by hand — which means the classes, the roles, the `tabindex`, the
  open/close, the arrows, Escape and the focus return are all copied into the consumer, and
  they drift the day the kit changes any of them.
- **`dangerouslySetInnerHTML`.** For the back link this also breaks the shell: the string has
  to be injected into *some* element, and that wrapper stands between `.ui-app__main` and
  `.ui-back`, so the kit's `.ui-app__main > .ui-back` rule — the one that gives the link the
  trail's distance from the title — stops matching.

#304 reports both, seen in one consumer on the same day: a search dropdown whose rows must be
`<Link>`s, and the back control rendered through `dangerouslySetInnerHTML`.

## What was found in the code

Read before anything was written, and each of these shaped what is here:

- **`src/components/dropdown.js` is two components in one factory.** `variant: 'select'`
  renders `role="listbox"` with `role="option"` rows and a tick, `'menu'` renders
  `role="menu"` with `role="menuitem"` rows, and the variant is *inferred* when the caller
  leaves it out — from any item carrying `selected` or a `value`. A row is a `<div>`, or an
  `<a>` when it carries `href` **and** the dropdown is not a select. Both had to be ported
  exactly, inference included, or the parity gate would be comparing two different components.
- **`wireDropdown()` is the keyboard, and it is shared.** The topbar's version switcher and
  the rail's account menu are the same wiring in bespoke clothes. Its rules are specific and
  are ported line for line: ArrowDown on a closed trigger opens onto the first row and ArrowUp
  onto the *selected* one; the ring wraps; a disabled row is not in it; Home and End; Enter and
  Space activate the row focus is on; Escape closes and returns focus to the trigger; Tab
  closes and does not; a click outside closes every open dropdown anywhere, and opening one
  closes the others.
- **The two rules #286 round 8 left in `dropdown.css`, and what they mean for React.**
  A panel a key opens is visible in the frame the key lands (`visibility` comes off the
  transition while the panel is open), and a closing panel stops taking clicks before it stops
  being drawn (`pointer-events: none` on the closed panel, taken back by the open rules). Both
  are properties of the *panel being in the DOM and changing class* — which is why this
  component renders the panel always and toggles `open` on the container, exactly as the
  factory does, rather than mounting the panel on open the way `<Modal>` and `<Drawer>` mount
  theirs. Mounting it on open would have re-opened both defects in React, and JSDOM cannot see
  either. `stories/overlay-css.test.js` still holds both against the sheet, and the sheet is
  untouched here.
- **`react/src/Pagination.test.tsx` is the parity discipline.** It renders the factory and the
  component for the same inputs and compares a *shape* read off both DOMs, documenting by name
  the one thing it does not compare. Both gates here are written to that pattern.
- **Every vanilla dropdown story passes `ariaLabel`.** All fifteen `dropdown()` calls in
  `stories/components/Dropdown.stories.js` do. That is not decoration: an unnamed `role=listbox`
  is an axe violation, and the React a11y gate found it the moment a select story went in
  without one. The factory only writes the panel's `aria-label` when it is given, so the
  component does the same and the README says to pass it.

## What this does

**`react/src/Dropdown.tsx`** — the React face of `dropdown()` and of `wireDropdown()`. Both
variants, sections with their group headings, separators (`'---'` and `{ separator: true }`),
icons, descriptions, badges with their tones, disabled rows and danger rows, `align`,
`direction: 'up'`, `scroll` as a flag or a height, `panelClass`, `triggerClass`,
`triggerContent`, `chevron`, `header` and `footer` slots. `open` + `onOpenChange` make the open
state controlled; leave `open` out and it keeps its own from `defaultOpen`. `onSelect` reports
the item's value and the item. A pick writes itself into the trigger and moves the tick, the
way `selectOption()` rewrites the panel.

**`row` draws the row.** It is handed the item and every prop the row has to carry, and the
caller spreads them onto whatever element the row should be:

```tsx
<Dropdown items={items} row={(item, props) => <Link to={item.href!} {...props} />} />
```

**`react/src/BackLink.tsx`** — a stateless port of `backLink()`, rule for rule: no address, or
a `javascript:` address however it is spelt, renders nothing; the label is the destination and
one that already says "Back to" is not said twice; `aria-label` only when a destination is
named; the arrow is `aria-hidden` so the accessible name says it in words. It renders the
anchor itself, which is the entire point — `ui-back` lands on the element
`.ui-app__main > .ui-back` looks for. `as` takes the element the link is drawn as and passes it
every prop this component does not read, which is how a router link gets its own `to`.

## The row is a render prop, and not an `as`

The brief allowed either and asked for the reason. `row` won:

- **An `as` cannot carry the row's own props.** `as={Link}` can be handed the item's `href`,
  but a real call site writes `to`, and often `state`, `replace` or a prefetch flag — and it
  writes them *per row*, from the item. There is nowhere on an `as` for those to come from.
- **It keeps one row contract.** Everything the row needs — the class list, the role, the
  `tabindex="-1"` the panel moves itself, `data-dd-item`, `data-value`, `aria-selected`,
  `aria-disabled`, the click — is one object the caller spreads, and the arrow-key ring finds
  the row through `data-dd-item` in it. A consumer cannot take half of it by accident.
- **`<BackLink>` takes `as` and not a render prop**, because it has exactly one element and no
  per-row anything; the props it does not read pass straight through to it. The two differ
  because the problems differ, and both are documented in `react/README.md`.

## What is deliberately not here

| Left out | Why |
|---|---|
| `data-dropdown` on the container | It is what `wireDropdown()` looks for. A page that calls `wireDropdown(document)` must not adopt a dropdown React owns — the same decision `<Drawer>` makes about `data-drawer`. The row and panel hooks stay: they are the row contract `docs/library.md` publishes, and nothing queries them outside a wired container. |
| `portal: true` | It is `wireDropdown()` measuring a trigger and writing viewport coordinates onto a panel it moved, re-run on scroll and resize. It is worth doing and it is not this PR; until it exists, a dropdown inside `.ui-app__rail` wants the vanilla factory, and the README says so. |
| `search: true` | Same answer, and one more reason: the match is `ddMatch()` inside `dropdown.js`, which the entry does not export. Re-implementing the fold-and-match table in React is exactly the drift this package exists to stop, so the honest port exports the kit's matcher first — the way `<CommandPalette>` imports `rankGroups()` rather than ranking twice. Filed below. |
| A `foot` slot | `fix/306-dropdown-pad-foot` is adding `--ui-dropdown-pad` and `.ui-dropdown__foot` to the vanilla panel in parallel. It had not landed when this was written, so there is nothing to mirror; `footer` here is the factory's existing raw slot, and a `foot` option arriving on the factory is a one-slot follow-up. No file this branch touches is a file that branch touches. |

## Evidence

Ten shots, light and dark, produced by `scripts/evidence/react.mjs` — #286's rig pointed at the
React workspace's own Storybook build, with the kit's two faces loaded into the page the way
`shot.html` loads them.

**The menu, open.** Icons, a description, a separator, a disabled row and a danger row.

![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-dropdown-menu-dark.png)
![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-dropdown-menu-light.png)

**The select, open.** The pick in the trigger, the tick beside it, a live badge and an accent one.

![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-dropdown-select-dark.png)
![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-dropdown-select-light.png)

**A row a router `<Link>` drew, under the keyboard.** Two real presses — Tab to the trigger,
then ArrowDown — so the ring is the browser's own. The rig fails rather than shoots if the ring
did not land on a row.

![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-dropdown-link-row-dark.png)
![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-dropdown-link-row-light.png)

**The back link, short and long**, in the slot the trail would take, above the title.

![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-back-short-dark.png)
![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-back-short-light.png)
![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-back-long-dark.png)
![](https://raw.githubusercontent.com/apliteni/apliteni-ui/a2e9748/docs/evidence/react-back-long-light.png)

## The gates this adds, and what each would catch

| Gate | What it holds | What killing it would let through |
|---|---|---|
| `react/src/Dropdown.test.tsx`, 28 parity cases | Renders `dropdown()` and `<Dropdown>` for the same options and compares the container's class list plus a shape: the trigger's tag, classes, `type`, `aria-haspopup`, `aria-expanded`, `aria-label`, its prefix and value and chevron; the panel's classes, role, name and inline max-height; every section's role, name and heading; and every row's tag, classes, role, `tabindex`, `data-value`, `aria-selected`, `aria-disabled`, `href`, `target`, label, description, badge and badge tone, and which glyph slots it drew. | A React-only rule. The variant inference drifting. A row that is a `<div>` where the factory draws an `<a>`. A select row quietly becoming a link. A badge tone the factory would have spelt differently. |
| the same file, 13 keyboard cases under `user-event` | Real key presses: the trigger's click, ArrowDown/ArrowUp opening onto the first row or the selected one, the ring wrapping and stepping over the disabled row, Home and End, Enter and Space, Escape and the focus return, Tab, the outside click, one dropdown closing another, controlled `open` refusing a close, and a `<Link>` row still moving with the arrows. | Any of `wireDropdown()`'s rules being approximated. The most likely regression: a row drawn by a caller falling out of the arrow ring, which is the whole feature. |
| `react/src/BackLink.test.tsx`, 22 parity cases + 9 script addresses | The same shape comparison against `backLink()`, over the cases `src/components/back.test.js` pins — including every `javascript:` spelling, each asserted to parse as `javascript:` first so none is a straw man — plus `.ui-app__main > .ui-back` matching, and the one difference stated by name. | The guard being written differently in the two languages, which is the one that matters: a `javascript:` address rendering a link in React and nothing in a server render. |
| `react/src/a11y.test.tsx` (existing, auto-discovering) | Nine new stories × two themes through axe. It already found one thing: a `select` dropdown with no `ariaLabel` is an unnamed listbox. | An unnamed listbox, an option outside a listbox, a menuitem outside a menu. |
| `stories/guidelines/accessibility-floor.test.js` (existing) | Both new gates are named on the Guidelines / Accessibility floor page with what they check and the blind spots they carry. The page's list is checked against a scan of the tree, so a gate it has never heard of fails the build. | Adding an accessibility gate nobody can find. |

## Proof

- [x] A person meets it in something running: the ten screens above, both themes, off the
      React Storybook's own build.
- [x] A consumer can write the row as a router link and every row still moves with the arrow
      keys — asserted in the gate, and shot with the ring on it.
- [x] `react/dist/index.d.ts` names both components and their props after the build.
- [x] The vanilla factories and their gates are untouched. `src/` carries no change on this
      branch; `dropdown.css` is not opened, per the fence around `fix/306-dropdown-pad-foot`.

```
$ npm test          # root — REAL TAIL
$ npm run build     # REAL TAIL
$ cd react && npm test && npm run build   # REAL TAIL
```

## Decisions, and who made each

| Decision | Who | Where it is recorded |
|---|---|---|
| Build both components rather than document vanilla-only | Artur, 2026-09-13 | #304, in the issue thread |
| The row is a render prop (`row`), not an `as` | This branch | The section above, and `react/README.md` |
| `<BackLink>` takes `as` rather than a render prop | This branch | Same |
| The container carries no `data-dropdown` | This branch, following `<Drawer>`'s `data-drawer` | Stated in `Dropdown.test.tsx`'s header, held by a test |
| The panel is always rendered and the container toggles `open` | This branch, following the factory | Stated in `Dropdown.tsx`, and it is what keeps #286's two round-8 rules true in React |
| `portal` and `search` are follow-ups | This branch | The table above, `react/README.md`, and the follow-ups below |
| The chevron in `<BackLink>` goes through `<Icon>`, wrapper span and all | This branch, following `<Button>` | Asserted by name in `BackLink.test.tsx` |

## Reviews

| Round | Reviewer | Verdict | What it found |
|---|---|---|---|
| | | | *left for the coordinator* |

## What a reviewer should push on

- **The `<Icon>` wrapper in `<BackLink>`.** The factory writes the svg straight into the
  anchor; `<Icon>` wraps it in an aria-hidden span, which becomes a second flex item in a
  `display: flex` anchor. `.ui-back svg` is a descendant selector and the anchor is
  `width: fit-content`, so nothing moves — but it is a real difference and it is asserted
  rather than hidden. The alternative is `<Dropdown>`'s: write the glyph into the slot the
  factory already draws. `<Button>` set the precedent this follows.
- **`onSelect(value, item)` rather than `onSelect(value)`.** The brief says `onSelect(value)`.
  The second argument is additive and typed; a caller who wants only the value ignores it. A
  menu row usually has no `value` at all, and without the item such a caller has nothing.
- **The controlled/uncontrolled `picked` state.** With a `value` prop the trigger shows what
  the host gives it; without one the component remembers the pick, the way the factory's
  wiring rewrites the trigger in place. Both are tested. A reviewer who wants only one of the
  two should say so now.

## Filed as a follow-up, not fixed here

- **`portal: true` for the React dropdown** — the rail case. It needs the measuring and the
  scroll/resize repositioning `wireDropdown()` does, and it is a PR of its own.
- **`search: true` for the React dropdown**, and the export it needs: `ddMatch()` and its fold
  table are private to `dropdown.js`. The right first step is publishing the kit's matcher, so
  a server render and a React render hide the same rows — the `rankGroups()` precedent.
  Guidelines / Component choice requires a search field at ten options or more, so until then
  a React list that long wants the factory.

## Changelog entry

- **React: `<Dropdown>`.** The React face of `dropdown()` and of `wireDropdown()`'s keyboard —
  both variants, sections, badges, separators, disabled and danger rows, controlled or
  uncontrolled `open`, `onSelect` and `onOpenChange`. A `row` render prop draws each row, so a
  router `<Link>` can be the row without losing its classes, role, tab stop or keyboard.
  Held against the factory shape by shape. No `portal` and no `search` yet. (#304)
- **React: `<BackLink>`.** The React face of `backLink()`, with the same rules and the same
  refusals, rendered rather than interpolated — which is what keeps `ui-back` on the element
  the shell's `.ui-app__main > .ui-back` rule looks for. Takes `as`, so a router link can be
  the anchor. (#304)

## How this was made

Branched off `origin/main` at `233a1e7`. Three commits: the components and their gates, the
docs, the evidence and its rig. No version bump and no `docs/changelog.md` entry — the lines
are above, and the coordinator sequences versions at merge.
