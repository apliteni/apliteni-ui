# Prototype checks

27 November 2026. This is a self-review, not an independent review or owner approval.

## Result

`verify.mjs` passed 340 checks and 108 axe-core scans.
The run saved 216 screenshots. No browser errors occurred.
[The screenshot index](screenshots.md) links every image.
[The test record](verification.json) lists each check and scan.

The owner can open `line.html`, `grip.html` or `header.html` in the viewer.
Each file embeds its CSS, fonts and script.
The tests used the viewer's `sandbox="allow-scripts"` restriction.
The document could not access local storage and contained no nested frames.

Set `UI_PLAYWRIGHT`, `UI_CHROME` and `UI_AXE` to installed tool files.
Run this command from the repository root:

```sh
CAPTURE=1 node design/resizable-columns/verify.mjs
```

`UI_CHROME` must name a Chromium headless shell.
The tests serve the committed HTML through intercepted browser requests.
No server, package install or external request is needed during the checks.
`CAPTURE=1` replaces the screenshots. Without it, the checks still run.

The coordinator confirmed that this design task needs no ship check or PR.
Kit tests and package builds did not run because the kit was not changed.

## Coverage

| Check | Result |
| --- | --- |
| Drag with a mouse | checked |
| Drag with touch at 984px | checked |
| Coarse-pointer target reaches 44px | checked |
| Left, Right, Shift, Home and End | checked |
| Both folder dividers and the review divider | checked |
| Double-click and Reset widths | checked |
| Escape restores the width before a drag | checked |
| Focus moves to visible content when a divider disappears | fixed and checked |
| Resize geometry has no transition | fixed and checked |
| Phone has no resize controls | checked |
| Empty folder, one file and back navigation | checked |
| Zoom, Fit and decision feedback | checked |
| Example tabs support arrows, Home and End | checked |
| Light and dark themes | checked |
| No page overflow at 320px and double text size | checked |
| Review actions remain below the preview on phones | fixed and checked |
| Rest, hover, drag and focus screenshots | checked |

The screenshots cover both examples and themes at these sizes:
390×844, 844×390, 820×1180, 1280×800, 1920×1080, 360×800,
466×678, 984×1016, 1536×864, 2560×1440, 320×800 and 1440×900.
Rest, hover, drag and focus have separate images at 1280×800 and 1920×1080.
The folder state images use its first divider.
The second divider has separate keyboard limit checks.
`screen.png` copies the recommended variant at rest.
The other sizes have rest images.

## Contrast

These ratios use the colours resolved in Chromium under the default purple accent.
The numbers compare the control mark with its adjacent ground.

| Pair | Light | Dark |
| --- | --- | --- |
| Plain divider against page | 6.11:1 | 7.40:1 |
| Focus ring against page | 7.34:1 | 6.55:1 |
| Grip marks against page | 16.68:1 | 15.79:1 |
| Active grip marks against fill | 7.34:1 | 5.70:1 |

The axe scans include text contrast in all requested desktop interaction states and the phone view.
They do not prove screen-reader behaviour or browser interoperability.
Safari, Firefox and hardware screen readers were not tested.

## Slop review

The detector scanned 12 rendered DOM snapshots after scripts, styles and hidden panels were removed.
It reported zero errors, zero medium findings and 84 warnings.
Every warning was `multiword-control`.
The following table records all distinct hits and their context.

| Hit | Context and decision |
| --- | --- |
| Document review | This tab names the example requested in the brief. Retained. |
| Dark theme | This toggle names the preference. Retained. |
| Reset widths | “Widths” distinguishes layout reset from data reset. Retained. |
| Mark as checked | The existing kit example uses this action. Retained. |
| Request changes | This requests a revision instead of making one. Retained. |
| Brief, Plan, Notes, Report, Budget and Risks, each with “22 Nov” | These are file names and separate date values. They are not verbose action labels. Retained. |

The CLI verdict is `warn`, not a clean scan.
The editorial review found no filler, decorative badges or unsupported product claims.
The longer labels preserve the task and the source example's meaning.

## Kit rules

- Columns: use page ground and full-height boundaries, from Components, Three-column page.
- Review: use two panes and document ground, from Components, Split layout.
- Widths: use panel units and the reading measure, from Layout and density.
- Spacing: use the spacing scale, from Layout and density.
- Responsive layout: use the three breakpoints, from Layout and density.
- Focus: use the kit ring, from Foundations, The focus ring.
- Phone controls: keep a 44px target, from Foundations, A tap reaches the floor below the phone step.
- Example selection: use tabs for panels, from Components, Segmented or tabs.

The review used the design skill's App screens page.
The existing kit governs the column browser and document layout.
The screenshots were inspected as whole views and as crops of each handle state.
The remaining product decision is which handle the owner prefers.

## Assets and limits

The prototypes embed unchanged kit CSS and token values from the base commit recorded in `references.md`.
Their additional CSS draws only the proposed resize controls and positions the examples.
IBM Plex Sans and Poppins came from Google Fonts.
Their SIL Open Font Licenses are in `FONT-LICENSES.txt`.
No product art or customer data is included.

These files are disposable HTML demonstrations.
They do not implement React props, app storage, collapse, right-to-left layout or production resize events.
