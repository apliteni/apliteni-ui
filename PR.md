# On a touch screen the tap is the switch: a readout that opens, and closes, on a finger

Follows #282, which shipped the readout in #287 and left what a tap should do open. Artur
settled it on 2026-09-12: **a tap toggles the readout** — the first tap on a mark opens it, a
tap elsewhere or on the same mark again closes it.

## What this is about

A finger has no hover. It arrives already pressing and it is gone the moment it lifts, so the
readout opened on the `pointerover` under a tap and went again on the `pointerleave` after it: a
flash nobody could read, landing on the way to whatever the mark does when it is pressed. The
spec said as much and called it undecided. This decides it.

## What changed

**The wiring.** `src/components/tooltip.js`.

- Under a coarse pointer `pointerover` opens nothing and `pointerleave` closes nothing. The tap
  toggles instead: a tap on a mark opens its readout, a tap on another mark moves it there, and a
  tap on the same mark — or anywhere else on the page — closes it.
- **The tap that opens the readout does not fire the mark's own click.** It is handled on the
  host in the capture phase and stopped there, so a chart that drills down on a bar does not
  drill down on the tap that was asking what the bar says. The tap that closes the readout *is*
  let through, so the drill-down is one tap further away rather than unreachable — the
  reveal-then-activate pattern a touch screen has always used for anything behind a hover.
- **Which pointer is in play is read from the event, not from the device.** A pointer event
  carries `pointerType`; a click and a focus do not, so the last kind seen is remembered for
  them, and `(pointer: coarse)` answers for a gesture that arrives before any pointer event. A
  laptop with a touch screen therefore hovers under its mouse and taps under a finger.
- **A keystroke hands the readout back to focus.** Focus landing on a mark is suppressed while a
  finger is in play, because a browser focuses a focusable mark on the way down and the readout
  would open and immediately toggle shut. Any key clears that, so a tablet with a keyboard tabs
  to a mark and gets the readout as it always did. Escape still closes it.
- **The dismissed-mark rule from #287 still holds.** A tap that closes a readout dismisses that
  mark the way Escape does, so a chart calling `showTooltip()` on every pointer sample does not
  bring it straight back. One decision inside that: **another tap on the same mark opens it
  again.** A tap is deliberate and a sample is not, and a toggle that needs an intervening tap
  somewhere else to reset is not a toggle. Say so and it is a one-line change.

**The guideline.** Guidelines / Hover readouts gains a fifth rule — *On a touch screen, open the
readout with a tap and close it with the next one* — and stops telling readers a tap shows the
readout only while the finger is down. It carries no specimen pair: like *Check both themes* on
the Colour page, what a tap does is an act rather than an appearance, and there is nothing to
photograph. The rule below it, *Never make hover the only way to a value*, keeps its place and
loses the half of its open question that is now answered.

**The spec and the catalogue.** `docs/specification.md#the-hover-readout` states the tap as a
guarantee and narrows *Not decided yet* to the one thing still open — whether a chart's marks
should take a tab stop at all. `docs/library.md` says it in a sentence. Every kit citation on the
guideline page is re-pinned against `tooltip.js` as it now stands — the file grew, and
`stories/guidelines/refs.test.js` reads the pattern at the line rather than taking the number on
trust.

## Tests

`src/components/tooltip.test.js` gains nine, against a coarse pointer simulated from both sides
the wiring reads: events carrying the `pointerType` a browser puts on them, and a
`(pointer: coarse)` answer for the gesture that arrives before any of them. JSDOM dispatches no
`PointerEvent` and answers no media query, so both had to be supplied.

The tap is driven in the order a browser fires it for a finger — `pointerover`, `pointerdown`,
`pointerup`, `pointerleave`, then `click` last — which is the order that makes the guards
necessary and is where a simpler simulation would have proved nothing.

Covered: a finger crossing a mark opens nothing; a tap opens and a second tap on the same mark
closes; a tap on another mark moves it; a tap away closes it, inside the host and outside it;
the opening tap is not the mark's click and the closing one is; a mark a tap closed is not
reopened by a pointer sample but is by another tap; `(pointer: coarse)` alone is enough; the
focus a tap lands opens nothing and a key hands it back; and a mouse arriving after a finger
hovers the way it always did.

## Not in this pull request

- **No tab stop on a mark.** That half of #282 is still open and still waits on the owner.
- **No finger scrub.** A finger dragging along a line to read successive points was the other
  half of the question and was not what was decided; a chart that wants it can do its own
  hit-testing and call `showTooltip()`.
- **No change to the finance portal.** This gives it the behaviour; adopting it is its own work.

## Release

0.34.1 → **0.34.2**, a patch: behaviour under a coarse pointer changes and no API does.
`Shipped surface vs version` is red without the bump and the changelog entry that describes it.
The entry is renumbered from the 0.31.1 this branch carried before the rebase below.

## The readout is a floating surface now, and the tap opens that one

Between this branch's approval and this rebase, `#295` took the kit off `--shadow-md` onto a
ladder of lightness and `#314` (0.33.1) gave the floating step a two-step edge and a soft drop.
The hover readout is on that step: `.ui-tip` carries `border: 1px solid var(--border-strong)`
and `box-shadow: inset 0 0 0 1px var(--elev-edge, var(--border)), var(--elev-drop)`, and
`.ui-tip.is-open` still flips nothing but `opacity` and `visibility`.

**A tapped readout therefore carries the treatment by construction, not by a second rule.** The
tap path calls the same `showTooltip()` and adds the same `.is-open` to the same element, so
there is one painted readout and one place it is painted from. This branch adds no CSS at all —
no `box-shadow`, no open-state variant, nothing the elevation gate would have to be told about.
`stories/elevation.test.js` keeps its pinned 41 swept declarations and 13 floating ones, and
`react/src/elevation.test.ts` keeps the React modal it counts on its own side; both ran green
after the rebase rather than being edited to pass. The screenshots below show the tapped
readout over a card in both themes.

## Rebase

Rebased onto `origin/main` a third time. The branch was approved at 9238a4b on a base of
`Release 0.31.0` (#297); main has since shipped 0.31.1 (#305), 0.32.0 (#307, the elevation
ladder), 0.33.0 (#311, the rail and the guidelines), 0.33.1 (#314, the floating edge and the
drop), 0.34.0 (#319, the topbar layout, React `<Dropdown>` and `<BackLink>`, the dropdown foot)
and 0.34.1 (#321). This pass replays the four commits onto d9c9ce3.

Conflicts, and how each was settled:

- **`package.json` and `package-lock.json` — the version.** **0.34.2**, a patch on top of the
  0.34.1 main serves, rather than the 0.31.1 this branch carried.
- **`site/changelog.mjs` — both sides kept.** This branch's entry is renumbered to 0.34.2 and
  dated 2026-09-14, and sits above main's 0.34.1; every entry below it is untouched. Its text is
  unchanged: what it describes is the behaviour, which the rebase did not alter.
- **`stories/guidelines/_hover-readouts.js` — three conflicts, all over the same thing.** Both
  sides had re-pinned the page's kit citations at `tooltip.js` line numbers, and each side's
  numbers were wrong for the merged file. Neither side's were taken: every citation was
  **re-measured against the rebased `src/components/tooltip.js`** — 112, 118, 132, 200, 290 and
  277 — and the file's own gate reads the pattern at the line, so a stale number fails rather
  than passes quietly. The two `src/styles/tooltip.css` refs are main's (18 and 58) and this
  branch does not move them. The prose is this branch's: the new *On a touch screen* rule, and
  the shortened *Never make hover the only way to a value*.
- **`docs/library.md` — both sides' rows kept.** Main's `tooltip()` row is character-for-character
  the base's, so this branch's row is that row plus its coarse-pointer sentence. Main's rewritten
  `dropdown()` row (the `foot` slot, `dropdownMatch`, the portal's tree rule), its `nav()` row
  with the folded rail and its `backLink()` row with the React note all stand as main wrote them.
- **`PR.md` — a modify/delete.** Main carries no `PR.md` any more; each merge drops it. This
  branch's copy stands, with this section and the two above it rewritten for this pass.
- **`docs/specification.md` merged without a conflict.** Main grew *Elevation*, *The second
  layout* and the rest elsewhere in the file while this branch rewrote *The hover readout*; both
  sides' text is present. One line was rewrapped by hand where the merge left it over the file's
  width.
- **`src/components/tooltip.js` applied without a conflict.** Main's only change to it was the
  class-sweep comment above `PARTS`, which the sweep in `src/styles/label-coverage.test.js`
  needs; it is still there, above the new pointer-kind block rather than displaced by it.

Gate counts re-measured on the merged tree rather than carried over from the last pass — the
numbers this section used to quote (66, 50, 14) were main's at 0.31.x and have all moved since.
As measured now: `icon-size` 70, `typeface-roles` 52, `type-ranks` 15, `elevation` 41 swept and
13 floating. This branch changes none of them: it adds no glyph, no family declaration, no type
rank and no shadow. Each of the suites asserting those numbers ran green after the rebase.

## Verification after the rebase

- `npm test`, run serially: **1600 pass, 1 fail, 2 skipped** of 1603. The one failure is
  `stories/contrast.test.js` — *the walk has not run away with the clock*: the walk took 169.4s
  against a 120s ceiling. A detached `origin/main` run on the same host with the same command
  fails the same test at **177.4s** (1591 pass, 1 fail, 2 skipped of 1594), so it is this host's
  clock and not this branch — and main is the slower of the two.
- React: `npm run build` (tsup) clean, `vitest run` **530 pass across 20 files**.
- `gitleaks` over `origin/main..HEAD` and over the working tree, with `.gitleaks.toml`: no leaks.
- `security.yml`'s internal-terms denylist grep: no hits.
- Colour and elevation gates: `colour-tokens`, `accent-contrast`, `signal-contrast`,
  `danger-colour` and `elevation` — 121 pass; `react/src/elevation.test.ts` and
  `react/src/contrast.test.tsx` — 83 pass.
- The slop detector over every file this branch touches: clean, except one pre-existing
  `scope-template` warning in `docs/specification.md` that is main's, in the drawer's motion
  paragraph, and untouched here.
- A browser, at 1440px and 390px, in both themes, under real `Input.dispatchTouchEvent` touches
  with `(pointer: coarse)` true and `maxTouchPoints` 5: a tap opens the readout, a second tap on
  the same mark closes it, a tap elsewhere closes it, and with touch emulation off a mouse still
  opens it on hover. All four in all four contexts.

The browser run drives `Input.dispatchTouchEvent` over CDP rather than a synthetic `click`,
because a synthetic click carries no `pointerType` and would have proved nothing: the wiring
reads that field. Frames kept, of the four the readout is visible in:

| | 1440px | 390px |
| --- | --- | --- |
| Dark | `touch-1440-dark-1-tap-opens.png` | `touch-390-dark-1-tap-opens.png` |
| Light | `touch-1440-light-1-tap-opens.png` | `touch-390-light-1-tap-opens.png` |

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01H8hitUsQtfrcQgmAJvH8jR
