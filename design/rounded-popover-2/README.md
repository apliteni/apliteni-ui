# Compare quieter popovers

Open [the viewer](viewer.html). It contains all five documents in one frame with `sandbox="allow-scripts"`.
Each prototype also opens alone. No document requests outside resources. Fonts, CSS, and scripts are inline.

Recommend **B1**. It keeps B’s shape and gives the lightest visible hover in this comparison.

| Version | Prototype | Light example | Dark example |
| --- | --- | --- | --- |
| Today | [Main](main.html) | [Short select](screenshots/main-light-select-short-1280x800.png) | [Long select](screenshots/main-dark-select-long-390x844.png) |
| A | [Compact quiet](a-compact.html) | [Short select](screenshots/a-compact-light-select-short-1280x800.png) | [Long select](screenshots/a-compact-dark-select-long-390x844.png) |
| B1 | [Balanced quiet](b1-balanced.html) | [Short select](screenshots/b1-balanced-light-select-short-1280x800.png) | [Long select](screenshots/b1-balanced-dark-select-long-390x844.png) |
| B2 | [Balanced clearer](b2-balanced.html) | [Short select](screenshots/b2-balanced-light-select-short-1280x800.png) | [Long select](screenshots/b2-balanced-dark-select-long-390x844.png) |
| C | [Soft quiet](c-soft.html) | [Short select](screenshots/c-soft-light-select-short-1280x800.png) | [Long select](screenshots/c-soft-dark-select-long-390x844.png) |

Use Theme, Panel, and List to change the example. If a panel closes, open its trigger.
Use arrows, Home, and End to move. Press Enter to choose. Press Escape to return to the trigger.
In a short landscape view, scroll to the example before opening its panel.

[Notes](notes.md) give every ground, its lightness delta, text contrast, and the recommendation.
[The screenshot index](screenshots.md) links every capture. Each select comparison shows English hovered and French selected.
An action menu has no stored selection. Its pictures show Duplicate hovered.

## Scope

This is the owner’s dropdown design revision under issue 888. It changes no shipped kit code.
No PR or ship check belongs to this task.
The source is `c8ab37de`. The copied `main.html` is byte-for-byte unchanged.
The proposals retain that commit’s bundled React Dropdown and keyboard behavior.
Only proposal styles, initial example selection, titles, and captions changed.
C now uses a neutral check instead of bold text alone.

The owner’s supplied description identifies English’s hover ground as too strong.
The photo itself was not available in this workspace. All example content is fabricated.

## Kit rules

- Dropdown triggers show only the value. Source: [Dropdown guideline](../../guidelines/dropdown.md).
- Floating panels retain their edge and shadow. Source: [Foundations](../../docs/foundations.md#elevation).
- Focus keeps its outline. Selection keeps a fill. Source: [Focus ring](../../docs/foundations.md#the-focus-ring).
- Keyboard navigation uses the bundled component. Source: [Dropdown](../../react/src/Dropdown.tsx).

The owner requested these radius and ground experiments. They are proposal exceptions, not new kit tokens.
Proposed design-system change: use B1’s mixtures for dropdown hover and selection, after owner approval.

IBM Plex Sans and Poppins are embedded WOFF2 fonts from the first round. Their OFL licenses are included.
The check glyph comes from the bundled kit. No outside artwork was added.

## Checks and limits

Self-review used the design skill’s App screens, Colour, Layout, Components, Picks, and AI look pages.
The review verdict is **pass** for this design comparison. Owner approval remains separate.

- Checked 80 comparison states in Orca at 1280×800 and 390×844, across all documents, themes, panel types, and list lengths.
- Captured eight keyboard-focus pictures and eight pressed-trigger pictures with Orca.
- Checked all proposals in the viewer at the ten requested sizes, plus 320px and 1440px widths.
- Checked arrows, Home, End, Enter, Escape, pointer selection, action feedback, and scrolling to the last option.
- Checked axe on select hover, selected focus, menu hover, and menu focus in both themes. No violations occurred.
- Checked all five documents in the sandbox. No nested frame or outside resource request occurred.
- Checked the rendered DOM with `ai-slop-detector`. All eight proposal exports passed. The notes passed too.
- Measured the actual row colours, text contrast, and focus contrast. The accent is Nebula.
- Confirmed that all proposed phone rows meet 44px. The baseline retains its original size.

[Measurements](measurements.json) record the 80 comparison states and calculated lightness deltas.
[Verification](verification.json) records the sandbox, keyboard, axe, and viewport checks.
Delta uses the OKLab lightness component of OKLCH. Text contrast uses linear sRGB relative luminance.

The viewport walk scrolls to the example and opens the menu at each size. It does not certify every open-panel resize path.
Orca could not automate a frame on the paired desktop. Playwright’s Chromium headless shell performed the sandbox checks.
Firefox, Safari, screen readers, and physical touch devices were not tested. This was a self-review, with no independent reviewer.
