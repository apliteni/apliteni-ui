# Fields: 16px on a touch screen, from one net (#294)

Prepared for the coordinator to open `asabirov/294-inputs-16px`. Based on main `bb5fd04`,
2026-09-12. Reporter: Artur (@asabirov).

## What & why

iOS Safari zooms the page into a focused field whose text is under 16px and does not zoom
back out. Every field the kit ships was under it. One `@media (pointer: coarse)` rule —
`src/styles/field-zoom.css` — now takes `input`, `select` and `textarea` to 16px, both
published stylesheets import it, and #291's local rule on the dropdown's search field is
gone. Two gates hold it, one per workspace. Version 0.31.1: a patch, because nothing
changes with a mouse and no API moves.

## Problem

| Field | Size before | Zoomed on focus |
| --- | --- | --- |
| `.ui-input`, `.ui-textarea`, `.ui-select` | 14.5px (`--text-base`) | yes |
| `.ui-dropdown__search-input` | 12.5px, 16px under `(pointer: coarse)` since #291 | no |
| `.ui-pager__size-select`, `.ui-pager__jump-input` | 13px (`--text-sm`) | yes |
| `.ui-cmdk__input` | 15.5px (`--text-md`) | yes |
| `.ui-fbcomposer textarea` | 14.5px | yes |

#291 answered it for the one field whose panel focuses it on open. The other six were
left, and the answer was written on the dropdown's own sheet, where nothing else could
reach it.

## Premises

- The fix has to reach a field nobody has written yet. A rule naming kit classes needs an
  edit per component, and it leaves a host page's own fields zooming on the kit's sheet.
- A net that reaches by element has to outrank component rules it has never seen, which is
  `!important` — the same trade `src/styles/reduced-motion.css` already makes, and the
  same idempotence, so importing both stylesheets costs nothing.
- The size must be real. The zoom reads the computed font size, so a 16px field scaled
  back with a `transform` still zooms, and the transform takes the border and the focus
  ring with it.
- A viewport tag is not available to us. `user-scalable=no` / `maximum-scale=1` stops the
  zoom by removing pinch-zoom for every reader, fails WCAG 1.4.4, is argued against by
  Apple's own Human Interface Guidelines, and belongs to the host page rather than to a
  stylesheet. Stated under [A field is 16px on a touch
  screen](docs/specification.md#a-field-is-16px-on-a-touch-screen).
- A flat 16px is a size, not a floor, so it shrinks a field designed above it. No kit field
  is above it, and a gate now refuses one. **A host page's field can be**, and the same
  element reach that covers a component nobody has written yet lands on that one too — see
  [the open decision](#open-decision-how-far-the-net-should-reach) below.

## What changed

| Area | Change |
| --- | --- |
| `src/styles/field-zoom.css` | New. One `@media (pointer: coarse)` block, one declaration: `font-size: 16px !important` over `input` (less the ten types with nothing to type into), `select` and `textarea`. |
| `src/index.css`, `src/inline.js` | Import and read it, beside the reduced-motion net. |
| `react/src/index.ts` | Imports it too, so `apliteni-ui/react/css` carries a net as well. Confirmed in the built `react/dist/index.css`. |
| `src/styles/dropdown.css` | #291's `(pointer: coarse)` rule removed; the sheet states the mouse size and points at the net. |
| `src/components/dropdown-search.test.js` | That component's touch test now holds the mouse size and refuses a local coarse rule beside the net. |
| `stories/field-zoom.test.js`, `react/src/field-zoom.test.tsx`, `stories/lib/field-zoom.js` | The gates, one per workspace over one shared implementation. |
| `react/src/Modal.stories.tsx` | A Notes field beside the Name field in `Playground` — the React catalogue had no textarea, so the React gate covered two of the net's three element kinds. |
| `stories/guidelines/_accessibility-floor.js` | A fourth number, `FIELD_MIN`, the rule that states it, and both gates with their blind spots. |
| `docs/specification.md` | The guarantee, the rejected viewport fix, what the larger text costs — including what it costs a **host page's** own field, with the override recipe — and the dropdown section pointing there. |
| `docs/evidence/294/` | The input at 390 in both themes, before and after. |
| `package.json`, `site/changelog.mjs` | 0.31.1 and its entry. |

## How the gates are built

**No cascade is resolved, and no stylesheet is on the page.** JSDOM does not rank
`!important` between rules: written the way the kit imports them, its cascade hands back the
component's size and reports the net beaten. So neither gate asks it. Each mounts the stories
into a bare document, takes every text-entry control as a subject, asks the element whether
the net's own selector — read out of the net's file as text, not retyped — reaches it with
`matches()`, and reads the contest off the declarations: the net is important, and the gate
fails if anything else in the kit or in a story's `<style>` block is. What that proves is
that the net is the kit's only important font size, not that a browser resolves it that way;
the browser end is the measured table below.

A selector `matches()` will not parse used to drop out of that contest in silence — a skip,
which [CONTRIBUTING.md](CONTRIBUTING.md#a-subject-a-gate-cannot-check-is-a-failure-never-a-skip)
forbids. The vanilla gate now fails on one and names it.

Every mutation was put on disk, the diff confirmed, the failure watched, and the edit
reverted.

| Mutation | Result |
| --- | --- |
| `!important` removed from the net | 2 vanilla tests fail |
| floor lowered to 14px | 2 vanilla tests fail |
| `textarea` dropped from the net's selector | 2 vanilla tests fail, **and** the React gate's reach test — 3 in all |
| `(pointer: coarse)` rule added back to `dropdown.css` | 1 vanilla test fails |
| `.ui-textarea` sized 18px, above the floor | 1 vanilla test fails ("the net would shrink it") |
| `select` dropped from the net's selector | React gate fails (`.ui-select`, Modal story) |
| a `font-size` rule added under a selector jsdom will not parse (`::highlight(found) .ui-input`) | 1 vanilla test fails, naming the rule |
| the textarea taken back out of React's `Modal → Playground` | React gate fails ("all three of the net's element kinds") |

The `textarea` row read "4 tests fail" before this branch was reviewed, and it did not
reproduce: 2 vanilla tests failed and **the React gate stayed green**, because no React story
rendered a textarea. `Modal → Playground` now has one — a Notes field beside the Name field,
the kit's own `.ui-textarea` markup — and the React gate pins that all three of the net's
element kinds are rendered, so that hole cannot reopen quietly.

The "without the net, the kit sizes fields under the floor" test is what stops the suite
passing on its own constant: it lists the rules that are under 16px today and fails if
there are fewer than four.

## Proof, measured in a browser

Headless Chromium over CDP, `Emulation.setEmulatedMedia` with `pointer: coarse`, sizes read
off the rendered fields. Full set, both themes, in `/tmp/asabirov/294-inputs-16px/`; the
before/after pair is committed under `docs/evidence/294/`.

| Screen | 1440, fine pointer | 390, coarse pointer |
| --- | --- | --- |
| Inputs / Text fields | `.ui-input` 14.5px ×5 | 16px ×5 |
| Inputs / Textarea | `.ui-textarea` 14.5px | 16px |
| Inputs / Select and search | 14.5px ×3 | 16px ×3 |
| Dropdown / Search open | `.ui-dropdown__search-input` 12.5px | 16px |
| Pagination / Playground | `.ui-pager__size-select` 13px | 16px |
| Command palette / Playground | `.ui-cmdk__input` 15.5px | 16px |
| Feedback / Default | composer textarea 14.5px | 16px |

Nothing moves at 1440. The emulation is stated as emulation in the evidence README: it
proves the media query matches and the size lands, never Safari's own zoom, which is the
issue's report from a device.

## Decisions

| Decision | Why |
| --- | --- |
| Element selectors, not kit classes | Covers a component nobody has written yet, and a host page's own fields. A class list is an edit per component. **The reach into host fields is not settled — see below.** |
| `!important` | The net has to outrank component rules; `reduced-motion.css` is the precedent, and no other font size in the kit is important — the gate keeps it that way. |
| A new file rather than a block in `input.css` | The net reaches six components, and `input.css` is imported before four of them. A file of its own is also what both stylesheet entries can import. |
| `font-size`, never a viewport tag | Pinch-zoom stays; WCAG 1.4.4; and the tag is the host page's. |
| Keep the flat 16px, and gate the shrink | Writing the net as a `max()` floor complicates every field to protect a case the kit does not have. The gate refuses the case instead. |
| Patch, 0.31.1 | No API moves and nothing changes with a mouse. `asabirov/295-elevation` takes the next minor. |
| The React entry imports the net | A consumer who takes only `apliteni-ui/react/css` would otherwise have no net, which is the hole reduced motion had before #271. |

### Open decision: how far the net should reach

**This is the one call left for Artur, and it is worth making before merge, because the two
answers ship different CSS and a different changelog entry.**

Reaching host fields by element selector was presented as pure benefit. It is not. The net is
a flat size, and a floor on an element's own font size cannot be written in CSS, so a host
field *designed above 16px* is **shrunk** on a touch screen. A host page with
`html { font-size: 112.5% }` and `input { font-size: 1rem }` renders an 18px field; a 20px
hero search is the same case. Measured in headless Chromium under an emulated coarse pointer,
with the kit's sheet on the page:

| Host rule | Size on a coarse pointer |
| --- | --- |
| `#a { font-size: 20px; }` | **16px** — the net wins, the field shrinks |
| `#b { font-size: 20px !important; }` | 20px — the host wins |
| `input.hero { font-size: 20px !important; }`, host sheet after the kit's | 20px — the host wins |
| `input { font-size: 20px !important; }`, host sheet **before** the kit's | **16px** — ties on specificity, loses on source order |
| `.hero input { font-size: 20px !important; }`, host sheet **before** the kit's | 20px — the host wins |

So the override recipe is precise, and it is now published in
[the specification](docs/specification.md#a-field-is-16px-on-a-touch-screen), in the changelog
entry and in the net's own file: **an `!important` rule more specific than a bare element**,
which wins whichever stylesheet loads first.

| Option | What ships | What it costs |
| --- | --- | --- |
| **A — keep the reach (what this branch does)** | `input, select, textarea` under `(pointer: coarse)`, as written. | A host field above 16px is shrunk until its author writes an `!important` override. That is a silent visual regression on a consumer's page, arriving in a **patch** release — they have to read the changelog to know to look. In exchange, a host page's small fields stop zooming with no work at all, which is most host pages. |
| **B — kit fields only** | The same declaration scoped to the kit's own fields — `.ui-input, .ui-textarea, .ui-select, .ui-dropdown__search-input, .ui-pager__size-select, .ui-pager__jump-input, .ui-cmdk__input, .ui-fbcomposer textarea` — or an `:where()` class list beside the elements. | No host page is touched, so nothing regresses for anyone. But the list needs an edit per component, which is the failure mode #294 set out to avoid, and a host page's own small fields go on zooming — the reader still gets the bug, just not from the kit's own controls. `!important` is still needed, and the gate over it is unchanged either way. |

A middle option exists and is **not** recommended: keep the element reach but wrap the
declaration so it applies only below 16px. It cannot be written — `max()` compares lengths,
not the element's own inherited size, and there is no `font-size: max(16px, self)`.

Recommendation: **A**, on the grounds that the consumers of this kit are Apliteni's own
applications rather than arbitrary pages, no field in any of them is above 16px today, and
the override is one line. But the regression is real, it lands in a patch, and the call is
Artur's.

## Checks

Re-run in full after the independent review's four findings were fixed.

| Check | Command | Result |
| --- | --- | --- |
| Unit + a11y, serial | `node --test --test-concurrency=1 'src/**/*.test.js' 'stories/**/*.test.js' 'site/**/*.test.js' 'scripts/**/*.test.js'` | 1410 tests: 1408 pass, 0 fail, 2 skipped (447.0s). |
| Unit + a11y, parallel | `npm test` | 1408 pass, 0 fail, 2 skipped, 124.8s. The wall-clock ceiling that failed on an earlier run of this branch did not fail here. |
| React build | `npm run build` | tsup ESM + d.ts build clean; `react/dist/index.css` carries the net (one `(pointer: coarse)` block). |
| React tests | `npm test --workspace react` | 353 pass in 17 files. |
| Citation gates | `node --test scripts/doc-refs.test.js stories/guidelines/refs.test.js scripts/code-refs.test.js` | 88 pass. (An earlier note here said 89; 88 is what this tree returns, on `main` as well.) |
| gitleaks | `gitleaks git --pre-commit --redact --staged --verbose --config .gitleaks.toml` | no leaks found. |
| gitleaks rules | `node scripts/gitleaks-rules.check.mjs` | 64 mutations, every rule and allowlist entry killed by one. |
| Secret-scan range | `node scripts/secret-scan-range.check.mjs` | 9 scenarios pass. |
| Internal-terms denylist | the staged-diff grep from `.pre-commit-config.yaml` | clean. |
| Slop detector | `slop-detector <8 changed files> --level 3` | 0 errors, 0 medium, 1 warning — `docs/specification.md`'s drawer sentence, present on `main` unchanged. Two `comment-essay` findings the review's edits introduced (the net's header and the gate's) were fixed by moving the argument into the specification and leaving a pointer, not by deleting it. |

## Verification

- [x] `npm test` passes serially; the one parallel failure is the wall-clock ceiling, named above.
- [x] React build and React tests pass.
- [x] Every gate in this change fails under a mutation that removes what it holds.
- [x] Screenshots at 1440 and 390, both themes, for every screen the change touches. The review added one screen — React `Modal → Playground`, which now renders a textarea — captured in `/tmp/asabirov/294-inputs-16px/`, along with the guidelines floor page whose touch rule gained the host-field exception. The React workspace's Storybook pins `data-theme="dark"`, so its light captures set the attribute on the preview document.
- [x] The new React textarea measured in the browser: 14.5px with a fine pointer, 16px with a coarse one.
- [x] No protected data added. The evidence PNGs are Storybook specimens with the kit's own placeholder copy.

## Reviews

| Reviewer/model | Commit | Result |
| --- | --- | --- |
| Implementer / Claude Opus 5 | working tree | Self-check only: mutations, both suites, browser measurement |
| Independent review / Claude Opus 5 | `aab494f` | Four findings, all fixed on this branch: the undisclosed host-field shrink (medium), the gate's published account not matching what it does, an unparseable selector dropping out of the contest in silence, and a mutation count that did not reproduce. The scope question the first finding raises is [left for Artur](#open-decision-how-far-the-net-should-reach). |

## Earned merge

- Closes the defect for every field rather than the one #291 reached, and removes the split
  answer #291 left on the dropdown's sheet.
- A version bump and its changelog entry are included, so `Shipped surface vs version` has
  both halves.
- Required before merge: Artur's review, and **his answer to [the open scope
  decision](#open-decision-how-far-the-net-should-reach)** — option B would change the net's
  selector and its changelog entry.

## Linked issue

Closes #294.

## Changelog entry

- Every field the kit ships is 16px on a touch screen, so focusing one no longer zooms the
  page. Nothing changes with a mouse. The rule reaches a host page's own fields too, and it
  is a flat size rather than a floor — a host field designed above 16px is made smaller on a
  touch screen, and is kept with an `!important` rule more specific than a bare element.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Hx7UY34c8XEvXvU7hcetRP
