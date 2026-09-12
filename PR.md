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
- A flat 16px is a size, not a floor, so it could shrink a field designed above it. No kit
  field is, and a gate now refuses one.

## What changed

| Area | Change |
| --- | --- |
| `src/styles/field-zoom.css` | New. One `@media (pointer: coarse)` block, one declaration: `font-size: 16px !important` over `input` (less the ten types with nothing to type into), `select` and `textarea`. |
| `src/index.css`, `src/inline.js` | Import and read it, beside the reduced-motion net. |
| `react/src/index.ts` | Imports it too, so `apliteni-ui/react/css` carries a net as well. Confirmed in the built `react/dist/index.css`. |
| `src/styles/dropdown.css` | #291's `(pointer: coarse)` rule removed; the sheet states the mouse size and points at the net. |
| `src/components/dropdown-search.test.js` | That component's touch test now holds the mouse size and refuses a local coarse rule beside the net. |
| `stories/field-zoom.test.js`, `react/src/field-zoom.test.tsx`, `stories/lib/field-zoom.js` | The gates, one per workspace over one shared implementation. |
| `stories/guidelines/_accessibility-floor.js` | A fourth number, `FIELD_MIN`, the rule that states it, and both gates with their blind spots. |
| `docs/specification.md` | The guarantee, the rejected viewport fix, and what the larger text costs. The dropdown section points there. |
| `docs/evidence/294/` | The input at 390 in both themes, before and after. |
| `package.json`, `site/changelog.mjs` | 0.31.1 and its entry. |

## How the gates are built

JSDOM does not rank `!important` between rules: written the way the kit imports them, its
cascade hands back the component's size and reports the net beaten. So neither gate asks
it. Each mounts the stories, takes every text-entry control as a subject, asks the element
whether the net's own selector — read out of the net's file, not retyped — reaches it, and
reads the contest off the declarations: the net is important, and the gate fails if
anything else in the kit or in a story's `<style>` block is.

Every mutation was put on disk, the diff confirmed, the failure watched, and the edit
reverted.

| Mutation | Result |
| --- | --- |
| `!important` removed from the net | 2 tests fail |
| floor lowered to 14px | 2 tests fail |
| `textarea` dropped from the net's selector | 4 tests fail |
| `(pointer: coarse)` rule added back to `dropdown.css` | 1 test fails |
| `.ui-textarea` sized 18px, above the floor | 1 test fails ("the net would shrink it") |
| `select` dropped from the net's selector | React gate fails (`.ui-select`, Modal story) |

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
| Element selectors, not kit classes | Covers a component nobody has written yet, and a host page's own fields. A class list is an edit per component. |
| `!important` | The net has to outrank component rules; `reduced-motion.css` is the precedent, and no other font size in the kit is important — the gate keeps it that way. |
| A new file rather than a block in `input.css` | The net reaches six components, and `input.css` is imported before four of them. A file of its own is also what both stylesheet entries can import. |
| `font-size`, never a viewport tag | Pinch-zoom stays; WCAG 1.4.4; and the tag is the host page's. |
| Keep the flat 16px, and gate the shrink | Writing the net as a `max()` floor complicates every field to protect a case the kit does not have. The gate refuses the case instead. |
| Patch, 0.31.1 | No API moves and nothing changes with a mouse. `asabirov/295-elevation` takes the next minor. |
| The React entry imports the net | A consumer who takes only `apliteni-ui/react/css` would otherwise have no net, which is the hole reduced motion had before #271. |

## Checks

| Check | Command | Result |
| --- | --- | --- |
| Unit + a11y, serial | `node --test --test-concurrency=1 'src/**/*.test.js' 'stories/**/*.test.js' 'site/**/*.test.js' 'scripts/**/*.test.js'` | 1408 pass, 0 fail, 2 skipped. Contrast walk 106.2s against its 120s ceiling. |
| Unit + a11y, parallel | `npm test` | 1407 pass, 1 fail — only `the walk has not run away with the clock`, at 133.6s on this host. Machine speed under contention, the failure this repo's PR notes have recorded before; it is green serially. |
| React build | `npm run build` | tsup ESM + d.ts build clean; `react/dist/index.css` carries the net. |
| React tests | `npm test --workspace react` | 352 pass in 17 files, up from 322 in 16. |
| Citation gates | `node --test scripts/doc-refs.test.js stories/guidelines/refs.test.js scripts/code-refs.test.js` | 89 pass. |
| gitleaks | `gitleaks git --pre-commit --redact --staged --verbose --config .gitleaks.toml` | no leaks found. |
| gitleaks rules | `node scripts/gitleaks-rules.check.mjs` | 64 mutations, every rule and allowlist entry killed by one. |
| Secret-scan range | `node scripts/secret-scan-range.check.mjs` | 9 scenarios pass. |
| Internal-terms denylist | the staged-diff grep from `.pre-commit-config.yaml` | clean. |
| Slop detector | `slop-detector <14 changed files> --level 3` | 0 errors, 0 medium, 2 warnings — both present on `main` unchanged: `docs/specification.md`'s drawer sentence, and `react/src/index.ts`'s comment ratio (0.70:1 on main, 0.71:1 here). |

## Verification

- [x] `npm test` passes serially; the one parallel failure is the wall-clock ceiling, named above.
- [x] React build and React tests pass.
- [x] Every gate in this change fails under a mutation that removes what it holds.
- [x] Screenshots at 1440 and 390, both themes, for every screen the change touches.
- [x] No protected data added. The evidence PNGs are Storybook specimens with the kit's own placeholder copy.

## Reviews

| Reviewer/model | Commit | Result |
| --- | --- | --- |
| Implementer / Claude Opus 5 | working tree | Self-check only: mutations, both suites, browser measurement |
| Independent review | — | Not run; the coordinator dispatches it |

## Earned merge

- Closes the defect for every field rather than the one #291 reached, and removes the split
  answer #291 left on the dropdown's sheet.
- A version bump and its changelog entry are included, so `Shipped surface vs version` has
  both halves.
- Required before merge: independent review, then Artur's.

## Linked issue

Closes #294.

## Changelog entry

- Every field the kit ships is 16px on a touch screen, so focusing one no longer zooms the
  page. Nothing changes with a mouse.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Hx7UY34c8XEvXvU7hcetRP
