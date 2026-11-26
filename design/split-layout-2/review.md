# Split layout review

One proposed variant. This is a design specimen, not a package component.
The audience compares extracted values with their source before approval.
The prototype uses one HTML document with embedded scripts, styles, and fonts.
Self-review used the design skill's `references/app-screens.md` page.

## Choice

The criteria are a continuous page split, saved values first, independent desktop scrolling, and a visible phone action.

| Variant | Use | Cost |
| --- | --- | --- |
| Recommended 60/40 split below the shared top bar | Keep global navigation separate from document review | The preview has less width than the saved values |

No second variant adds a useful choice here.
A source-first layout breaks the order rule.
A split through the top bar would divide global search from its navigation.
The earlier card composition does not give the page two continuous panes.

## Structure

`AppShell width="full"` removes the page inset and width cap.
The title, fields, totals, and action belong to the first pane.
The second pane begins directly below the top bar and reaches the viewport bottom.
Its entire backdrop uses `.ui-document-ground`.
The controls retain a reading surface inside that backdrop.
The document sheet retains the kit's paper surface in both themes.
Neither pane is a card.

On desktop, the values scroll above their action footer.
The preview sheet scrolls beneath its controls.
The sidebar and top bar stay outside both scroll areas.
At 860px and below, the panes stack in source order.
The shared scroll area keeps the action at its bottom edge.
The preview controls stay visible when its section scrolls.
Fit considers both available height and width. Percentage zoom uses the sheet's normal width.

## Interface and scope

`SplitLayout` takes primary content, preview content and state, actions, zoom, and a zoom callback.
It owns layout, document sizing, and scrolling. It contains no approval rules.
The proposed source lives only in this folder.
Existing `AppShell`, `BackLink`, `KeyValueList`, table classes, `Button`, `EmptyState`, and `Skeleton` supply the parts.

The Today view imports `DocumentReview.stories.tsx` without changes.
Its source matches main `65549fbfba779ef622968a69f8ea90b329643374`.
Its existing appearance and behavior remain baseline evidence.
All sample names, dates, account details, and amounts are fabricated.
No kit source, guideline, version, or dependency changed.

## Evidence

The PNG names identify the view, theme, size, or state.
`screen.png` is the recommended light desktop view.
Both themes show Today and the split at all requested sizes:
390×844, 844×390, 820×1180, 1280×800, 1920×1080, 360×800, 466×678, 984×1016, 1536×864, and 2560×1440.
The additional 1440×900 views cover the design skill's width.
Narrow preview captures show the stack after scrolling.
Separate pictures show Fit, zoom, hover, focus, press, loading, unavailable preview, recovery, confirmation, and the phone action.
The 320px long-name capture checks narrow content.

## Kit rules and sources

- Pane order: “Follow the consequence”, `guidelines/density-and-accents.md`.
- Backdrop: “Elevation”, `docs/foundations.md`.
- Page shell and document sheet: `docs/components.md`.
- Spacing and breakpoints: `guidelines/layout-and-density.md`.
- Numerals: right alignment in the kit table.

The declared system is the kit named by `AGENTS.md`, not a new design system.
`src/tokens/tokens.css` defines `--ui-document-ground` as `--surface-2` in both themes.
The resolved values are light `#e9ecf3` and dark `#161520`.
`src/styles/layout.css` provides `.ui-document-ground`.
`react/src/AppShell.tsx` and `AppShell.css` provide the full-width shell.
The default accent is used throughout. No new color token is proposed.

## Limits

This prototype saves nothing and provides no document parser or PDF engine.
The source is a fabricated HTML sheet. Real document formats need separate verification.
Global shell navigation remains demonstration navigation.
The page split and control surface are proposed component styles, not approved showcase glue.
No PR, release, full package suite, or ship check is part of this design delivery.

## Verification

The self-review found and fixed four defects:

- The initial preview ground began below its toolbar. The ground now reaches the pane's top edge.
- The landscape preview tools left the view while scrolling. They now stay visible within the preview section.
- The wide-screen footer missed the text edge. Its content now shares the values' maximum width.
- The action and zoom controls lacked declared touch clearance. They now give the kit room for its transparent 44px targets.

The browser checks cover pane bounds, action bounds, body overflow, Fit, zoom, recovery, and sandbox operation.
The sandbox has exactly `allow-scripts`. Theme changes and preview recovery work without same-origin access.
The prototype neither reads nor changes any frame size.

`node --test stories/story-css.test.js`: 26 tests passed.
`npm test -w react -- story-css`: 36 tests passed.
These gates cover the existing stories. They do not certify this proposed component's CSS.

The slop detector scanned the rendered DOM in both themes.
A second scan used computed styles of present elements to separate unused bundled styles from visible work.
It reported no errors and nine warnings per theme:

- Four control-label warnings concern the sidebar, account, search, and continuation controls.
  These labels keep the existing kit meanings and the distinction between review and approval.
- Four repeated warnings concern the fabricated service name “Prototype review”. This is document content, not an interface explanation.
- One nested-card warning concerns the search keyboard shortcut. It is the kit's shortcut key, not a content card.

The initial scan also matched unused gradient and blur rules in bundled kit styles.
No visible gradient text or glass panel exists on this screen.
The notes and review prose passed the detector with no findings.
The editorial pass found no remaining correction within this design's scope.
The self-review verdict is `warn` because the detector warnings remain recorded.
This verdict is not owner approval.

Asset sources: kit glyphs, kit paper styles, and embedded kit fonts.
`font-licenses.txt` preserves the font licenses.
Real document rendering, operating-system font settings, and assistive-technology behavior remain outside this specimen's verification.

The final browser run passed 28 axe scans with zero violations and zero page errors.
It also passed separate checks for independent keyboard scrolling and the action's 44px touch hit area.
The zoom controls expose 44px touch layers.
The large-text specimen doubles the task content's computed font sizes and uses a longer supplier name.
It confirms scrolling within the values pane while the preview stays in place.
This simulated font check does not replace operating-system text-size testing.
Build command: `node design/split-layout-2/build.mjs`.
