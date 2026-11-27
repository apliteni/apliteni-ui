# Filter chip width review

Branch: `asabirov/915-variants`. Base: `86f40609`, kit 0.215.0.

Choose a prototype, then select values from its chips.
Use Long, Short, and Reset to compare widths. Dark and Light change the theme.

| Prototype | Recommendation |
| --- | --- |
| [Today on main](main.html) | Comparison. |
| [Shared cap](shared.html) | Alternative. |
| [Per-chip caps](product.html) | Recommended. |
| [Current value](current.html) | Alternative. |

Read [notes](notes.md) for the cause and 1440px measurements.
Read [the contract](contract.md) for behavior and documentation proposals.
Read [the review](review.md) for checks, retained warnings, and limitations.

## Viewports

Each picture shows the longest selected values. Measurements use the same fabricated options.

| Prototype | Viewport | Light | Dark |
| --- | --- | --- | --- |
| Today on main | 1440×900 | [Light](screenshots/main-light-1440x900.png) | [Dark](screenshots/main-dark-1440x900.png) |
| Today on main | 1280×800 | [Light](screenshots/main-light-1280x800.png) | [Dark](screenshots/main-dark-1280x800.png) |
| Today on main | 1920×1080 | [Light](screenshots/main-light-1920x1080.png) | [Dark](screenshots/main-dark-1920x1080.png) |
| Today on main | 820×1180 | [Light](screenshots/main-light-820x1180.png) | [Dark](screenshots/main-dark-820x1180.png) |
| Today on main | 390×844 | [Light](screenshots/main-light-390x844.png) | [Dark](screenshots/main-dark-390x844.png) |
| Today on main | 2560×1440 | [Light](screenshots/main-light-2560x1440.png) | [Dark](screenshots/main-dark-2560x1440.png) |
| Shared cap | 1440×900 | [Light](screenshots/shared-light-1440x900.png) | [Dark](screenshots/shared-dark-1440x900.png) |
| Shared cap | 1280×800 | [Light](screenshots/shared-light-1280x800.png) | [Dark](screenshots/shared-dark-1280x800.png) |
| Shared cap | 1920×1080 | [Light](screenshots/shared-light-1920x1080.png) | [Dark](screenshots/shared-dark-1920x1080.png) |
| Shared cap | 820×1180 | [Light](screenshots/shared-light-820x1180.png) | [Dark](screenshots/shared-dark-820x1180.png) |
| Shared cap | 390×844 | [Light](screenshots/shared-light-390x844.png) | [Dark](screenshots/shared-dark-390x844.png) |
| Shared cap | 2560×1440 | [Light](screenshots/shared-light-2560x1440.png) | [Dark](screenshots/shared-dark-2560x1440.png) |
| Per-chip caps | 1440×900 | [Light](screenshots/product-light-1440x900.png) | [Dark](screenshots/product-dark-1440x900.png) |
| Per-chip caps | 1280×800 | [Light](screenshots/product-light-1280x800.png) | [Dark](screenshots/product-dark-1280x800.png) |
| Per-chip caps | 1920×1080 | [Light](screenshots/product-light-1920x1080.png) | [Dark](screenshots/product-dark-1920x1080.png) |
| Per-chip caps | 820×1180 | [Light](screenshots/product-light-820x1180.png) | [Dark](screenshots/product-dark-820x1180.png) |
| Per-chip caps | 390×844 | [Light](screenshots/product-light-390x844.png) | [Dark](screenshots/product-dark-390x844.png) |
| Per-chip caps | 2560×1440 | [Light](screenshots/product-light-2560x1440.png) | [Dark](screenshots/product-dark-2560x1440.png) |
| Current value | 1440×900 | [Light](screenshots/current-light-1440x900.png) | [Dark](screenshots/current-dark-1440x900.png) |
| Current value | 1280×800 | [Light](screenshots/current-light-1280x800.png) | [Dark](screenshots/current-dark-1280x800.png) |
| Current value | 1920×1080 | [Light](screenshots/current-light-1920x1080.png) | [Dark](screenshots/current-dark-1920x1080.png) |
| Current value | 820×1180 | [Light](screenshots/current-light-820x1180.png) | [Dark](screenshots/current-dark-820x1180.png) |
| Current value | 390×844 | [Light](screenshots/current-light-390x844.png) | [Dark](screenshots/current-dark-390x844.png) |
| Current value | 2560×1440 | [Light](screenshots/current-light-2560x1440.png) | [Dark](screenshots/current-dark-2560x1440.png) |

## States at 1440×900

The selected state appears in each viewport picture above.

| Prototype | Theme | Unset | Hover | Focus | Pressed | Open menu |
| --- | --- | --- | --- | --- | --- | --- |
| Today on main | Light | [Unset](screenshots/main-light-unset.png) | [Hover](screenshots/main-light-hover.png) | [Focus](screenshots/main-light-focus.png) | [Pressed](screenshots/main-light-pressed.png) | [Menu](screenshots/main-light-menu.png) |
| Today on main | Dark | [Unset](screenshots/main-dark-unset.png) | [Hover](screenshots/main-dark-hover.png) | [Focus](screenshots/main-dark-focus.png) | [Pressed](screenshots/main-dark-pressed.png) | [Menu](screenshots/main-dark-menu.png) |
| Shared cap | Light | [Unset](screenshots/shared-light-unset.png) | [Hover](screenshots/shared-light-hover.png) | [Focus](screenshots/shared-light-focus.png) | [Pressed](screenshots/shared-light-pressed.png) | [Menu](screenshots/shared-light-menu.png) |
| Shared cap | Dark | [Unset](screenshots/shared-dark-unset.png) | [Hover](screenshots/shared-dark-hover.png) | [Focus](screenshots/shared-dark-focus.png) | [Pressed](screenshots/shared-dark-pressed.png) | [Menu](screenshots/shared-dark-menu.png) |
| Per-chip caps | Light | [Unset](screenshots/product-light-unset.png) | [Hover](screenshots/product-light-hover.png) | [Focus](screenshots/product-light-focus.png) | [Pressed](screenshots/product-light-pressed.png) | [Menu](screenshots/product-light-menu.png) |
| Per-chip caps | Dark | [Unset](screenshots/product-dark-unset.png) | [Hover](screenshots/product-dark-hover.png) | [Focus](screenshots/product-dark-focus.png) | [Pressed](screenshots/product-dark-pressed.png) | [Menu](screenshots/product-dark-menu.png) |
| Current value | Light | [Unset](screenshots/current-light-unset.png) | [Hover](screenshots/current-light-hover.png) | [Focus](screenshots/current-light-focus.png) | [Pressed](screenshots/current-light-pressed.png) | [Menu](screenshots/current-light-menu.png) |
| Current value | Dark | [Unset](screenshots/current-dark-unset.png) | [Hover](screenshots/current-dark-hover.png) | [Focus](screenshots/current-dark-focus.png) | [Pressed](screenshots/current-dark-pressed.png) | [Menu](screenshots/current-dark-menu.png) |

## Sandboxed viewer at 390×844

Each picture shows a dark prototype inside one frame with `sandbox="allow-scripts"`.

| Prototype | Open menu |
| --- | --- |
| Shared cap | [Menu](screenshots/shared-dark-sandbox-menu-390x844.png) |
| Per-chip caps | [Menu](screenshots/product-dark-sandbox-menu-390x844.png) |
| Current value | [Menu](screenshots/current-dark-sandbox-menu-390x844.png) |

## Measurements

- [All viewport and selection measurements](measurements.json)
- [Final layout and interaction checks](final-checks.json)
- [Accessibility and difficult layout cases](browser-checks.json)
- [Visible menu rows and contrast](menu-checks.json)
- [Sandbox interaction checks](sandbox-checks.json)
- [Rendered DOM and prose scan results](slop-checks.json)
