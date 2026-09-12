# A quieter drawer, drawer and motion guidelines, and a React drawer that moves

Closes #272. Closes #271.

## Premises

**What this is about.** The Finance portal's transaction drawer is noisy, with a rule under
every field and bordered cards inside a bordered panel, and it appears with no motion. The kit
said nothing about either.

**What I found.**

- The kit's HTML `drawer()` already slid in and out on `--dur-med` and `--ease`, and
  `stories/motion-tokens.test.js` already refused a hand-written duration. The drawer #271
  describes is not that drawer.
- The portal's drawer is the kit's **React `Modal`**, pinned to the right edge by portal CSS
  (`web/src/styles/transaction-drawer.css` in apliteni/finance.apli.tech), because the kit
  shipped no React drawer. That `Modal` mounted on `open` and returned `null` on close, so it
  had no motion at all.
- Drawer guidelines: none. The one line about drawers was an `except` on Component choice, and
  there was no slot for label and value rows, so every consumer hand-built them.
- `prefers-reduced-motion` was listed as ungated on The accessibility floor.
- The drawer's own reduced-motion block promised "a plain fade". The global net sets every
  duration to 0.01ms, so that fade never ran.

**What I did.** Wrote drawer and motion guidelines, each rule held by a gate. Gave the drawer a
heading-and-rows slot and a quieter default, picked by Artur from three rendered variants. Gave
the React side a `Drawer` and a `Modal` that move. Answered #271's first-pass question with an
inventory.

**The verdict: Changed.** Both problems are live, and the cause is in the React package rather
than the drawer the issues assume.

## The survey

Fourteen systems, read from their own guidance or source on 2026-09-11 rather than from memory.
It sits here and not in `docs/` because
[`docs/README.md`](docs/README.md#where-a-decision-gets-recorded) says why-this-shape belongs to
the issue.

Could not be read: SAP Fiori (every page returned 403), Adobe Spectrum (the site needs
JavaScript, and its token package has no animation values), the m3.material.io site (Material's
Android docs on GitHub were read instead), and Carbon for IBM Products' SidePanel. They are
recorded as unread rather than filled in.

**Drawers**

| System | Ships one | When, in its words | Rules between rows | Header / footer rule |
|---|---|---|---|---|
| Polaris | Sheet, **deprecated** | "encourages designers to create a new layer on top of the page instead of improving the existing user interface" | not stated | not stated |
| Atlassian | Drawer, **being deprecated** | "Please use Modal instead." | not rendered | not rendered |
| Primer | Side sheet (Dialog) | "global actions… quick previews"; "Don't use side sheets to present create/edit forms" | not stated | footer rule "If the content area has overflow scrolling… Otherwise… optional" |
| Ant Design | Drawer | "Use a Form to create or edit a set of information" | Descriptions: `bordered` is off by default | both, always |
| Fluent 2 | Drawer (inline, overlay) | confirmations go to a dialog; drawers "need to be scannable" | not stated | none |
| shadcn/ui | Sheet | "complements the main content of the screen" | n/a | none, spacing only |
| Material 3 | Side sheet | keeps "secondary content visible" | dividers optional: full width between unrelated sections, inset within one | not stated |
| GOV.UK | no drawer, no modal | n/a | summary list rows ruled by default: "Think carefully before you remove row borders… users who zoom in" | n/a |
| Apple HIG | Sheet | "a scoped task that's closely related to their current context" | not stated | not stated |
| USWDS | no drawer | a modal is "a last resort" | n/a | n/a |

**Motion**

| System | Durations | Enter vs exit | Reduced motion |
|---|---|---|---|
| Carbon | 70, 110, 150, 240, 400, 700 ms | separate entrance and exit curves | "provide alternatives" |
| Atlassian | 50–150 interactions, 150–400 "Modals, Panels" | ease-out in, accelerate out | "motion is off and instant" |
| Primer | micro 100, short 200, medium 300, long 500 | easeOut entering, easeIn exiting | "MUST Provide instant alternatives" |
| Fluent 2 | 50–500 ms; drawer 250–500 by size | decelerate in, accelerate out | 1 ms by default |
| Ant Design | 100, 200, 300 ms | spec says exits faster; the Drawer code does not | `transition: none` |
| Material 3 | 50–1000 ms in 16 steps | decelerate in, accelerate out | not in the docs read |
| Apple HIG | none published | not stated | "Replacing transitions in x-, y-, and z-axes with fades" |

WCAG 2.3.3 does not count opacity as motion: motion animation "does not include changes of
color, blurring, or opacity" (an erratum has since taken blurring back out of that list).

**Where they disagree.** Whether a drawer should exist at all: Polaris and Atlassian are
retiring theirs for a modal, while Fluent, Ant, Material and shadcn ship one. Forms in a drawer:
Ant says yes, Primer says no. Reduced motion: instant (Atlassian, Primer, Fluent, Ant) against a
fade in place of movement (Apple, which WCAG allows). Row rules in a key/value list: GOV.UK on
by default and warns against removing them, Ant off by default.

**What nobody says.** No system says anything for or against cards inside a drawer, and none
gives a general rule for when a divider beats space. Nobody gives a drawer its own
reduced-motion treatment or says what the scrim does under it.

## #271's question: which components are in the first pass

The rule is "anything that appears or leaves after the page has loaded moves". The inventory is
every show and hide in the kit, taken from the stylesheets and the factories. The coverage gate
now finds the same set itself: 36 state rules today.

| Change after load | Before this PR | After |
|---|---|---|
| Drawer opens and closes (HTML) | slides, scrim fades, 250ms | unchanged |
| Confirm opens and closes | fades and rises, 250ms | unchanged |
| Dropdown, version switcher, account menu | fade and drop, 250ms | unchanged |
| Toast arrives and leaves | slides in 250ms, out 150ms | unchanged |
| Feedback pill, scrim, composer | fade and rise, 250ms | unchanged |
| **React `Modal`** (the portal's drawer) | **none: mounts and unmounts** | fades and rises, in and out |
| **React `Drawer`** | did not exist | new; the HTML drawer's markup, slide and scrim |
| **Tabs: the panel a switch reveals** | **instant** | fades in, 150ms |
| **Side nav: a group's sub-list** | **instant** (only the caret turned) | fades in and drops 4px, 150ms |
| **Feedback: the error line** | **instant** | fades in, 150ms |
| **`setBusy()`: content replacing the skeleton** | **instant** | fades in, 250ms |
| Switch knob; a dropdown opening upward | moved | unchanged, and now counted by the gate |
| Dropdown row's tick; nav current-row marker and icon; checkbox tick's turn | instant | still, each with its reason at the rule |
| Collapsed side rail | instant | still, with its reason at the rule |

Nothing animates on first render: `playEntrance()` runs only on the change the reader caused.

Deferred, and why:

- **The toast stack closing up** after one toast leaves. The others jump into the gap. Moving
  them needs each toast measured before and after, which is JavaScript the stack does not have.
- **React `DataTable` rows** on a sort or a page turn. The rows are the consumer's, and the
  pagination guideline already says a page turn must not move the ground under the reader.
- **React `BusyRegion`** content arriving. The React tree cannot tell a first render from a
  re-render without a key the consumer does not give it today.
- **`.acct.on`**, the signed-in account button. It is not in the coverage gate's list of state
  hooks: it describes a state the page loads in, not a change the reader makes.

## The variants, and which one is the default

The same fabricated record in each frame, beside the look #272 reported ("Today"). All three
drop the cards and the rule under every row, and put each value beside its label instead of at
the far edge of the panel.

![Drawer variants, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/684124b645893295c8ea279078977da2ece892f7/docs/evidence/drawer-variants-light.png)

![Drawer variants, dark](https://raw.githubusercontent.com/apliteni/apliteni-ui/684124b645893295c8ea279078977da2ece892f7/docs/evidence/drawer-variants-dark.png)

| | Lines inside the panel on this record | What you live with |
|---|---|---|
| Today | about 17 | the report |
| A, space only | 0 | a long record scrolls under the header and the footer with nothing marking where either ends |
| **B, one rule per group** *(chosen, and the default)* | 4: header, footer, two between groups | some lines still, and the header and footer stay framed while the body scrolls |
| C, filled groups | 0, and three tinted blocks | a third surface tone, and in dark it is the heaviest of the three |

**Artur picked B**, on 2026-09-11, from those frames. A drawer's normal state is a long record
scrolling under its header, and B is the one variant that stays framed while it does. A buys no
lines at the price of no scroll edge; C gets there without lines but adds a third surface tone,
and in dark it is the heaviest of the three.

B is the smallest of the three in the diff: the line under the header and the line over the
footer are the ones the drawer already had on `main`, so `src/styles/drawer.css` keeps them
untouched and the only rule this PR adds inside the panel is the one between groups. Every row
still holds its neighbour apart with space alone.

## What changed

- **Drawer.** `drawerSection({ title, rows, body })` puts a heading over a `<dl>` of label and
  value rows. Labels and values are escaped; a value passed as `{ html }` is trusted markup. One
  rule parts a group from the group above it, and nothing else inside the panel draws a line —
  the header's and the footer's are the two the drawer already had. The drawer's and the
  confirm's dead reduced-motion blocks are gone.
- **Guidelines / Drawers** has four rules: one record per drawer; group under headings and never
  put a card inside; draw three lines and no others; set each value beside its label.
- **Guidelines / Motion** has four rules: move what appears or leaves after load; time a change
  by what moves (150, 250 or 400ms); take the kit's curves; change at once under reduced motion.
- **React.** A new `Drawer` renders the vanilla `drawer()` markup class for class, with a parity
  test over 24 side, size and footer combinations. `Modal` fades and rises in and out and stays
  mounted until its exit ends. Both share one dialog module (`react/src/dialog.ts`) for the Tab
  trap, Escape, inert background and return of focus. While a dialog leaves, it takes no clicks.
- **Motion.** `playEntrance()` in `src/motion.js` drives the entrances in the table above.
  `motion: still` notes record the changes that are right to leave still.
- **Specification.** A new "The drawer" section, and additions under "Motion".

## Found along the way

**Reduced motion lost keyboard focus in both overlays.** The net gives every element a 0.01ms
transition, so a child inherits `visible` one tick after the overlay's root. The control the kit
focuses on open is still hidden in that frame. Measured in Chrome, clicking each story's trigger:

| Opening | Motion on | Reduced motion, before | Reduced motion, after |
|---|---|---|---|
| HTML drawer | close button | **the panel itself** | close button |
| Confirm | Cancel | **`<body>`: focus lost** | Cancel |
| React drawer | first field | **the panel** (reported by the builder) | first field |

This dates from #200. Opening now cancels every transition inside the overlay under reduced
motion, and `stories/overlay-css.test.js` holds it for both sheets.

**The kit's own "Form in a drawer" story wrapped its intro in a card.** The new drawer gate
caught it on its first run, and the card is gone.

**The contrast walks could not resolve any `--ease*` token.** `substitute()` in
`stories/lib/contrast.js` stopped at the first `)`, so a fallback holding `cubic-bezier()` stayed
unresolved. It now matches each `var(` to its own bracket. The vanilla walk measures the same
results as before; the React walk's check that every `var()` resolves passes.

## Before / After

**Before**, as reported in #272:

The Finance portal's transaction drawer as it was reported — three bordered cards inside a bordered panel, a rule under every row — is the first screenshot in #272; it is not copied here because GitHub attachment URLs carry a UUID the repo's denylist refuses.

**After**: the kit's drawer on the same kind of record, default B.

![Drawer, final, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/ab18a3ff32d6d9275fbefa1784cc0bd1fc0ced45/docs/evidence/drawer-final-light.png)

![Drawer, final, dark](https://raw.githubusercontent.com/apliteni/apliteni-ui/ab18a3ff32d6d9275fbefa1784cc0bd1fc0ced45/docs/evidence/drawer-final-dark.png)

**Motion**, which a still screenshot cannot show. Each sheet is six frames of one real opening
in Chrome, taken by pausing the running transitions at fixed times after the click. With motion
on, opening starts two 250ms transitions: the scrim's opacity and the panel's transform.

![Drawer opening, dark](https://raw.githubusercontent.com/apliteni/apliteni-ui/ab18a3ff32d6d9275fbefa1784cc0bd1fc0ced45/docs/evidence/drawer-open-frames-dark.png)

![Drawer opening, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/ab18a3ff32d6d9275fbefa1784cc0bd1fc0ced45/docs/evidence/drawer-open-frames-light.png)

Under forced reduced motion the drawer is open in the first frame. Before the focus fix below,
Chrome listed every transition it started at 0.01ms; now opening starts none inside the panel.

![Drawer opening under reduced motion](https://raw.githubusercontent.com/apliteni/apliteni-ui/ab18a3ff32d6d9275fbefa1784cc0bd1fc0ced45/docs/evidence/drawer-open-frames-reduced-dark.png)

**The guideline pages**

![Guidelines / Drawers, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/ab18a3ff32d6d9275fbefa1784cc0bd1fc0ced45/docs/evidence/drawer-guidelines-light.png)

![Guidelines / Drawers, dark](https://raw.githubusercontent.com/apliteni/apliteni-ui/ab18a3ff32d6d9275fbefa1784cc0bd1fc0ced45/docs/evidence/drawer-guidelines-dark.png)

![Guidelines / Motion, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/a7bbc2400748b8b1084b4c7a31fd361cd4c98fdd/docs/evidence/motion-guidelines-light.png)

![Guidelines / Motion, dark](https://raw.githubusercontent.com/apliteni/apliteni-ui/a7bbc2400748b8b1084b4c7a31fd361cd4c98fdd/docs/evidence/motion-guidelines-dark.png)

**The gates**

```
                          main (c9a48c8)     this branch
root   npm test           1126 (2 skipped)   1171 (2 skipped)
react  vitest run          213               271
react  dist/index.css      1.55 KB           1.80 KB
```

The real tails, from the tree this body describes:

```
$ npm test
ℹ tests 1171
ℹ pass 1168
ℹ fail 1           (a wall clock, and main fails it here too — see below)
ℹ skipped 2        (the same two as on main: the accent matrix and the built-Storybook index)

$ cd react && npx vitest run
 Test Files  14 passed (14)
      Tests  271 passed (271)

$ npm run build
ESM dist/index.css 1.80 KB
ESM ⚡️ Build success in 160ms
DTS ⚡️ Build success in 3450ms
```

**The one failure is a clock, not a measurement.** It is `stories/contrast.test.js`'s "the walk
has not run away with the clock", which holds the contrast walk to 120s. The default was switched
to B on a shared 8-core machine running several agents at once: the walk took 213.1s here. On the
same machine in the same hour, `origin/main` at c9a48c8 takes 270.9s and fails the same assertion
— 1126 tests, 1123 pass, 1 fail, 2 skipped. The 21 contrast measurements themselves pass on both,
this branch does not touch `stories/contrast.test.js`, and nothing it changes is on that path.
The 0-failing tail this branch carried earlier was measured on a different machine, where the
walk came in under the ceiling.

Run against `a3dfaa0` — the commit before the switch to B — on the same machine, the test list
differs only by this change's own two tests out and four in.

## Proof

- [x] A person meets it in something running: Storybook stories and both guideline pages,
      screenshotted in both themes.
- [x] Motion measured in a real browser, not asserted: 250ms with motion on, 0.01ms with reduced
      motion forced.
- [x] Focus on open measured in Chrome before and after the reduced-motion fix, for all three
      overlays.
- [x] Every new rule is held by a gate, and each gate was broken on purpose to watch it fail:
  - a rule under every drawer row, a box around every group, the rule between groups deleted and
    the header's rule deleted → `drawer-rules.test.js` red, all four re-run after the switch to B;
  - the tabs entrance deleted → `motion-coverage.test.js` red;
  - `transition-duration` deleted from the net → `reduced-motion.test.js` red;
  - toasts' fallback timer deleted → the end-event check red, where the old rule passed on
    toasts' reduced-motion branch alone;
  - the confirm's reduced-motion open rule deleted → `overlay-css.test.js` red;
  - React `Drawer` and `Modal` unmounting at once → six React tests red;
  - every React dialog handling keys instead of only the top one → the three nested tests red;
  - the React `Modal` put back at `z-index: 50` → "a React modal paints above a drawer" red;
  - sixteen more on the tightened drawer, reduced-motion and coverage gates, listed under Review.
- [x] **Artur's pick of the drawer default.** B, on 2026-09-11, from the rendered variants;
      the record is below.
- [ ] **Exercised in the Finance portal.** Not done and not claimed: the portal installs a
      published version. What settles it is the portal replacing its `Modal` and
      `transaction-drawer.css` with `<Drawer>` and `drawerSection`-shaped rows.
- [ ] **CI, at the final SHA.** All five required checks — `build`, `Dependency audit`,
      `Published artifact check`, `Secret scan (gitleaks)` and `Internal-terms denylist` — are
      expected green, and the merge button needs all five (CONTRIBUTING → Issues & pull requests).
      Read them on the pull request rather than here: this line is the expectation, not a
      measurement. `Shipped surface vs version` will be red, and it is not a required check —
      this branch carries no version bump by design. The two that were red on an earlier SHA
      were the denylist and gitleaks, both on a bare UUID in this file's image URL; the image
      lives in the GitHub body instead and the tree is clean under the workflow's own pattern.

## Review

Two independent reviews ran on this branch: a diff review (with security, testing,
maintainability and adversarial passes, and a red team) and a prose review. Every finding below
was reproduced before it was fixed.

**Blocking, fixed.**

- Two React dialogs open at once broke each other. Every open dialog listened on `document`,
  and none checked whether it was on top. With a `Modal` over a `Drawer`, one Escape closed both,
  Tab was swallowed, and closing one brought the page behind back to life while the other was
  still open. `react/src/dialog.ts` now keeps one stack: only the top dialog takes keys, and
  inertness comes from the stack. When the top dialog closes, the one below is live again with
  focus where it left it. A dialog rendered inside another's content always sorts above it,
  even when both mount in the same commit. Nine new tests failed against the old code, each for
  the reason it names. Letting every dialog handle keys again turns the three nested tests red.
- A React `Modal` opened from a React `Drawer` would have painted underneath it: the scrim sat at
  `z-index: 50`, the drawer at 100. It now takes the confirm's layer, one above the drawer.
- React dialogs and the vanilla `drawer()` and `confirm()` keep separate stacks. They are not
  merged, because `overlay.js` is internal to the kit. `react/README.md` says not to open one
  over the other.

**Gates that stayed green while their rule was broken, fixed.** Each was shown green with the
fault present, then red after the fix:

- The drawer gate did not measure the body's own edges or anything inside the header and
  footer. It read no logical `border-block` property and caught no `<hr>`. It let a four-sided
  box without `.ui-card` pass, and asserted "at least 5" panels where it finds 12.
- The reduced-motion checks accepted a `prefers-reduced-motion: no-preference` block. They
  missed React's `onTransitionEnd`, and let a component's own reduced-motion block outvote the net.
- The coverage gate was satisfied by `playEntrance`'s default argument alone. It counted a
  `display` transition as motion, and its list of state hooks missed some the kit uses.

Sixteen mutations prove it: each one stayed green before the fix and turns red after. They are a
border on the body, a border under the title, a logical `border-block-end` under a group, an
`<hr>`, a hand-bordered box, a deleted drawer story, a `no-preference` block, `! important` with
a space, a React `onTransitionEnd` with no timer, an `!important` duration and an infinite loop
inside a component's reduced-motion block, `tabs.js` no longer calling `playEntrance`, and a tick
shown by a `display` transition. The coverage gate now finds 36 state rules; three new ones came
from the wider hook list and each is decided. The switch knob and the upward dropdown already
moved. The checkbox tick's turn is left still, with its reason at the rule.

One subject went rather than gained a note. The collapsed rail hid a group's sub-list outright
(`.ui-nav--side.is-collapsed .ui-nav__sub { display: none }`), which is the defect #277 is about:
`wireNav()` toggles the list's `hidden` attribute and nothing else, so the toggle announced a list
it could not open, and the current page's own row was gone on a folded rail. #286 deletes that
selector; it is deleted here too, so a "take both" merge cannot quietly put it back while
`stories/apps/shell.test.js` stays green — that gate reads the markup, and this is CSS. That is
why the count above is 36 and not the 37 this branch found before.

**The drawer gate, rewritten for B.** It reads the three lines in both directions now: a line the
panel should not draw fails, and so does one of the three gone missing. Four mutations were run
against this tree — the rule between groups deleted, the header's rule deleted, a rule under every
row, and a box around every group. Each turns it red, and the tree with none of them is green.

**Also fixed.** `drawerSection()` wrote its row values as markup while escaping its labels, and
the obvious input is bank-feed data. Values are now escaped, and `{ html }` passes trusted markup.
`substitute()` no longer stops at an unbalanced `var(`. A leaving dialog is `aria-hidden`, and
focus has somewhere to go when its opener is gone. The panel's dead `opacity` rules are removed.
Nine comments and doc lines the branch had made false are corrected. From the prose review, the
spec no longer quotes a measurement the focus fix made stale.

**A claim of mine that was false.** The spec said every transition the drawer starts under
reduced motion runs 0.01ms. After the focus fix, opening starts none. The prose review caught it.

**Not fixed, on purpose.**

- No version bump and no changelog entry, per the brief; see "Changelog entry" below.
- A and C do not ship as options. They were rendered for the decision and nothing more: the kit
  has one drawer default, and a gate that holds it. A consumer who wants A takes the two rules
  off in its own sheet and loses the gate with them.
- A `setTimeout` anywhere in the function counts as the fallback for an end-event listener. The
  gate says so in its ledger; telling a fallback from an unrelated timer needs a parser.
- The `motion-css` rule parser misreads nested rules and braces inside strings. Nothing in the
  kit writes either, and the gate's ledger says so.

## What a reviewer should push on

- **The default is B, and B is not the quietest of the three.** The complaint in #272 was the
  lines, and A removes every one of them. B keeps four on this record because a drawer that
  scrolls needs an edge at each end and a long record needs dividing; that is a judgement about
  the normal case, not about this screenshot, and it is the one Artur made.
- **Reduced motion means instant, not a fade.** WCAG and Apple would allow a fade. The kit keeps
  the one net it already had (#200), because a net over every sheet is the only version a new
  component cannot forget.
- **The React drawer focuses the first field in its body; the HTML drawer focuses its close
  button.** The React side follows `Modal`'s rule from #262. I left the HTML drawer as it was.
- **The React `Modal` moved from `z-index: 50` to the confirm's layer (101).** A page that placed
  its own layer between those two numbers now finds it under an open Modal rather than over it.
  I think that is right for a dialog, but it is a visible change and is in the changelog below.
- **`drawer.css` is not in the React stylesheet.** React consumers take kit styles from
  `@apliteni/apliteni-ui/css`, as `Pagination` already does. A second copy loaded later could
  beat a consumer's own overrides.
- **`PR.md` at the repository root** carried #279's body. This branch replaces it with this one,
  because that file is how a pull request is opened from this machine.

## Decision record for the issues

**The drawer's default look, for #272.** Chosen: **B, one rule per group** — the line under the
header, the line over the footer, and one between each group, with nothing between rows. Rejected:
**A, space only**, which takes every line out and with them the edge that says where a scrolling
body ends; and **C, filled groups**, which needs no lines but pays for it with a third surface
tone, and in dark reads heaviest of the three. Decided by Artur on 2026-09-11, from the variants
rendered above in both themes rather than from a description of them.

## Changelog entry

Not added to `docs/changelog.md` and no version bump, per the brief; the coordinator sequences
versions at merge. The entry this would take:

- **Added** `drawerSection({ title, rows, body })`: a drawer group, a heading over label and
  value rows, parted from the group above it by one rule (#272).
- **Added** React `Drawer`, the HTML drawer's markup, slide and scrim (#271, #272).
- **Changed (visible)** React `Modal` fades in and out, and stays mounted until its exit ends,
  about 250ms after `open` turns false. A test that expects it gone at once needs to wait for
  it (#271).
- **Changed (visible)** React `Modal` paints on the confirm's layer, above a drawer, instead of
  at `z-index: 50`. React Modals and Drawers share one dialog stack: only the top one takes
  Escape and Tab (#271, #272).
- **Added** `playEntrance()` and `ENTRANCE_FALLBACK_MS`. Tab panels, side-nav groups, the
  feedback error and `setBusy()` content now fade in when they change (#271).
- **Fixed** Under `prefers-reduced-motion`, opening a drawer or a confirm puts focus on its
  first control again. It had landed on the panel, or fallen to `<body>`.
- **Docs** New Guidelines pages: Drawers and Motion.
