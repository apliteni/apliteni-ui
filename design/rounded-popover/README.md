# Rounded popover review

Recommend [B. Balanced round](b-balanced.html). Open each HTML file in the review viewer or a browser.

| Version | Prototype | Light | Dark |
| --- | --- | --- | --- |
| Current kit | [Main](main.html) | [Short select](screenshots/main-light-select-short-1280x800.png) | [Long select](screenshots/main-dark-select-long-390x844.png) |
| A | [Compact round](a-compact.html) | [Short select](screenshots/a-compact-light-select-short-1280x800.png) | [Long select](screenshots/a-compact-dark-select-long-390x844.png) |
| B | [Balanced round](b-balanced.html) | [Short select](screenshots/b-balanced-light-select-short-1280x800.png) | [Long select](screenshots/b-balanced-dark-select-long-390x844.png) |
| C | [Soft round](c-soft.html) | [Short select](screenshots/c-soft-light-select-short-1280x800.png) | [Long select](screenshots/c-soft-dark-select-long-390x844.png) |

Use Theme, Panel, and List to change the example. Open the trigger after a change if its panel closes.
Use the arrow keys, Home, and End to move through rows. Press Enter to pick. Press Escape to return to the trigger.

[Notes](notes.md) give the tokens, measured contrast, and comparison. [Screenshots](screenshots.md) lists all 152 captures.

## Scope and sources

This is a design proposal for the owner’s dropdown request under issue 888. It changes no shipped component, token, or guideline.
No PR, release, or ship check is part of this design task.

The baseline is main at `1fac5f0a`. Every document bundles its actual React `Dropdown` and supporting kit code from that commit.
The baseline uses unchanged dropdown CSS. Each proposal adds its own CSS after the same kit CSS.
The page layout and review controls are shared across all four documents.

The reference is the supplied description of `owner-d74.png`. That image file was not available in this checkout.
No reference artwork was copied. All menu content is fabricated.

The proposals use the existing custom `Dropdown` select and menu variants. They do not change native `SelectField` options.
An action menu has no stored selection. It shows hover and focus, then reports the picked action without changing a document.

## Kit rules

- Dropdown triggers show only the value. Source: [Dropdown guideline](../../guidelines/dropdown.md).
- Floating surfaces retain their edge and shadow. Source: [Foundations](../../docs/foundations.md#elevation).
- An outline means focus. Selection uses a fill. Source: [Focus ring](../../docs/foundations.md#the-focus-ring).
- Panels keep their keyboard behavior and viewport limits. Source: [Dropdown](../../docs/components.md#dropdown).

The owner requested a radius experiment. These proposals therefore depart from the 12px floating-panel rule in Foundations.
They use existing radius tokens and round corners. The current kit keeps its supported squircle treatment.
The inset includes the border. A scrolling panel also reserves space for its scrollbar beside the rows.

## Checks

Self-review used the design skill’s App screens page. The review controls and specimen serve one comparison task.

- Checked 128 viewport states: four documents, two themes, two panel types, two list lengths, and four sizes.
- Checked 1280×800, 1920×1080, 820×1180, and 390×844. All panels stayed inside the viewport without horizontal page overflow.
- Checked 320px, 1440px, and 2560px widths, long labels, and 200% row text for each proposal in both themes.
- Checked arrows, Home, End, Enter, Escape, Tab, pointer selection, internal scroll, and touch selection.
- Checked each document inside `sandbox="allow-scripts"`. Each has no nested frame and makes no outside request.
- Checked phone proposal rows at 44px or more. The baseline retains the current kit’s row sizing.
- Checked selected, hovered, focused, pressed, and closed states with axe for each proposal, theme, and panel type. No violations were reported.
- Checked text and focus contrast from computed browser colors. The default accent is Nebula.
- Checked the rendered DOM with `ai-slop-detector`. Eight DOM exports and the notes passed without findings.
- Fixed native scrollbar arrows. The proposals now use a thin rounded scrollbar in Chromium.

Each document is under 400 KB, with inline CSS, scripts, and fonts. The kit supplies the check glyph.
IBM Plex Sans and Poppins use their included OFL licenses. The fonts are embedded as WOFF2 data.

Limits: Chromium was tested. Firefox and Safari were not tested. Their native scrollbar shape can differ.
No screen reader session or independent review was performed. The proposal is ready for the owner’s choice, not approved implementation.
