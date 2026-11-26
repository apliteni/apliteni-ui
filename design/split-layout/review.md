# Split layout review

This is a design prototype for issue 903. No package file changed.
Self-review used the design skill's `references/app-screens.md` page.

The audience checks extracted values against a source before approval.
The medium is a browser page. Both panes remain in the document at every width.
All names, dates, amounts, and account details are fabricated.

Today renders `DocumentReview.stories.tsx` from main `65549fbfba779ef622968a69f8ea90b329643374`.
It keeps that story's existing defects. It is not a reconstruction.
The reference pictures came from `9dfbc593`, under `design/903-document-review/`.
The proposed screen is a separate specimen, not a kit implementation.

## Choice and reuse

Recommend the saved-values-first variant. The kit requires this order and emphasis.
A source-first variant would break “Follow the consequence”. Tabs would hide one side of the comparison.

| Existing part | Decision |
| --- | --- |
| `Card` | Reuse both surfaces, heading ranks, viewer toolbar, and document sheet. |
| `KeyValueList` | Reuse paired labels and values. The primary pane owns their emphasis. |
| Table | Reuse numeric alignment, dense rows, and total emphasis. |
| `Button` | Reuse actions, focus, hover, press, and disabled states. |
| `ThreeColumnPage` | Reuse its content-width query approach. Its column chain and hidden phone columns do not fit this task. |
| `Drawer` | Its overlay and focus trap do not fit a page with two visible panes. |

The proposed layout absorbs all 12 declarations in the PR 909 review.
These comprise one title colour, six value weights, one zoom transition, two zoom assignments, and two footer paint declarations.
The example supplies content and actions without its own screen CSS.

The prototype adds labelled zoom controls and Fit. It removes unavailable page arrows for this one-page document.
It removes the subtitle that repeats the approval action.
The pane pair stops at `--container`. This keeps values nearer their labels on large screens.
The panes stack when their content area reaches 860px. The sidebar therefore cannot squeeze the primary pane below the preview's width.
The action bar sticks below the 560px phone breakpoint. Landscape views above that breakpoint keep it after the content.
The page scrolls vertically. Only a magnified preview scrolls horizontally.

## Kit rules

| Part | Rules | Source |
| --- | --- | --- |
| Pane order and emphasis | Follow the consequence. Give accents a job. | `guidelines/density-and-accents.md` |
| Pane width and spacing | Use the container token. Use the spacing scale. Use panel and prose units. Use the three breakpoints. | `guidelines/layout-and-density.md` |
| Reading text | Use the measure token applies to reading columns. This comparison has two component panels. | `guidelines/layout-and-density.md` |
| Shell and headings | Keep one shell. Choose content width. Order page headings. Use one page title. Follow heading levels. Never nest cards. | `guidelines/the-page.md` |
| Actions | Emphasize one action. Make the committing action stand out. | `guidelines/the-page.md`, `guidelines/component-choice.md` |
| Pane visibility | Match controls to panels. No tabs or segmented control hides a pane. | `guidelines/component-choice.md` |
| Labels | Use body ink. Limit muted ink. Use sentence case. Rank card titles. Use heading levels. | `guidelines/labels-and-titles.md` |
| Value pairs | Spaced label rows. Its exception puts compared figures in a table. | `guidelines/drawer.md` |
| Tables | Align numeric values. Keep units readable. Keep table density consistent. | `guidelines/dense-tables.md`, `guidelines/the-page.md` |
| Gaps | Use two gaps. Widen inner gaps on a touch phone. Keep a title on its block. Put text on the column edge. | `guidelines/spacing.md` |
| Controls | Keep the words. Earn a wordless button. Give every control one shape. Icon-only controls. | `guidelines/button-labels.md`, `guidelines/iconography.md` |
| Access | Minimum target size. Tap target on a phone. Space between small targets. Focus ring contrast. Keyboard first. | `guidelines/accessibility-floor.md` |
| Text and state | Body contrast. Disabled control legibility. Touch field text. | `guidelines/accessibility-floor.md` |
| Loading and focus | Screen loading. Focus rings. | `guidelines/state-set.md` |
| Zoom | Match duration to motion. Use the kit curves. Honor reduced motion. | `guidelines/motion.md` |
| Surfaces | Card, document viewer, and document page. | `docs/components.md`, verified in `src/styles/card.css` |
| Tokens | Widths, typefaces, text ink, elevation, focus ring, and tap floors. | `docs/foundations.md`, verified in `src/tokens/tokens.css` |

Resolved values: container 1120px, panel-md 420px, group gap 32px, inner gap 8px, footer inset 12px, and weights 400/500/600.
The existing themes, default accent, Poppins, and IBM Plex Sans supply all paint and type.
No new token is proposed.

## Evidence

Files named `today-<theme>-<size>.png` and `split-<theme>-<size>.png` are matched viewport captures.
Both themes cover 390×844, 844×390, 820×1180, 1280×800, 1920×1080, 360×800, 466×678, 984×1016, 1536×864, and 2560×1440.
`preview` and `scrolled` pictures expose the lower content. `full` pictures show the entire laptop page.
State pictures show hover, keyboard focus, press, magnification, horizontal scrolling, Fit, loading, and unavailable content.
`viewer` pictures show the actual sandbox at 390×844, 1280×800, and 1920×1080 in both themes.

Checked: both panes stay present, saved values lead, page overflow stays zero, and the wider pane holds the saved values.
Checked: zoom, Fit, horizontal arrow scrolling, approval navigation, retry, 320px reflow, long content, and enlarged text.
Checked: six opaque-origin `sandbox="allow-scripts"` runs with every network request blocked.
No nested frame exists inside the prototype. No prototype script measures or sizes a frame.

The matrix and interaction samples passed 48 WCAG accessibility scans without violations.
Two later scans of the final unavailable state also passed without violations.
Reduced motion limits the zoom transition to 0.01ms.
The final keyboard and loading samples passed four further accessibility scans.
The zoom controls and primary action reach 44px touch targets.
The zoom targets initially reached 42px. The next spacing token corrected their transparent clearance.
The review controls initially created a duplicate banner landmark. A named region corrected it.
The unavailable state initially inherited unrelated empty-state copy. Explicit content corrected it.

`node --test stories/story-css.test.js`: 26 passed.
`npm test -w react -- story-css`: 36 passed.
These tests limit existing story CSS growth. They do not certify the proposed component.
The design brief exempts this branch from ship check.

The slop detector scanned the rendered DOM in both themes and `notes.md`.
It reported no errors. Each DOM scan reported 11 warnings.
Six concern necessary action names or the existing shell's accessible names.
Three mistake the invoice item “Prototype review” for interface guidance.
Two concern unused kit selectors: `.ui-hero__title .grad` and `.ui-drop--page`.
These are contextual false positives or unused styles, not new screen decoration.
The notes had no findings.

Review verdict: pass for this prototype's scope.
Chromium emulation does not establish physical-device, Firefox, WebKit, or full assistive-technology support.
Enlarged text was a CSS test, not an operating-system setting.
The approval step is a navigation stub. It saves nothing.
Document rendering, pagination, and server integration remain outside this design task.

## Assets and rebuild

Fonts came from Google Fonts. Their licences are in `font-licenses.txt`.
Icons and the brand mark come unchanged from the kit.
The HTML embeds its scripts, styles, and fonts. It needs no server or network in the viewer.

Run `node design/split-layout/build.mjs` from an installed checkout to rebuild it.
The build reads embedded fonts from the existing HTML.
