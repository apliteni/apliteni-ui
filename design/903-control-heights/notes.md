Recommend `size="sm"` for FilterBar and Dropdown beside small SearchField and Button. Use 32px with a mouse and 40px with touch. Remove ancestry conditions.

Before uses main `d495a9c6` (0.204.0). After includes PR #897 `dc2ab5be`. That PR stabilizes chip widths, reserves clear space, and removes chip crosses. It keeps heights.

Phone targets reach 44px. A native search label adds 2px above and below the 40px field. This is a proposed addition.

Screenshots cover both themes and eleven widths. Phone card captures show scrolled views.

Kit rules:

- Components: Filter bar, Toolbar, Search field, Button, Dropdown.
- Foundations: Control corners, Typefaces, Spacing and rhythm, focus ring, touch fields, tap floor.
- Button labels: Earn a wordless button, Give every control one shape.
- Accessibility minimums: target size, tap zone, tap spacing, touch field text, focus contrast, keyboard access.
- Spacing: two gaps, phone gaps, title placement.
- Iconography: Icon-only controls, Preserve glyph paths.
