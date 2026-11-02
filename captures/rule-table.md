# New specimens against the guideline rules

Columns name the rules that apply to a specimen picture. A Don't half breaks its own rule on purpose. That is not a fail.

| Page / rule | Own Do and Don't | target-size, tap-zone | body-contrast, signals | focus-visible | stroke-earns-the-bar, provenance | sentence-case, words-first | text-edge (grid) | width, no overflow | useful-captions |
|---|---|---|---|---|---|---|---|---|---|
| accessibility-floor / touch-field-size | pass | pass | pass | pass | n/a | pass | pass | pass | pass |
| accessibility-floor / body-contrast | pass | n/a | pass (swatch and readout, no failing text) | n/a | n/a | pass | pass | pass | pass |
| accessibility-floor / keyboard-first | pass | pass | pass | pass | n/a | pass | pass | pass | pass |
| colour-and-theming / accent-strong | pass | pass | pass (swatch 2.95:1, no white text) | pass | n/a | pass (fixed) | pass | pass | pass |
| colour-and-theming / both-themes | pass | n/a | pass | n/a | n/a | pass | pass | pass | pass |
| colour-and-theming / text-surface | pass (fixed) | pass | pass | pass | n/a | pass | pass | pass | pass |
| colour-and-theming / selected-forced-colours | pass | n/a | pass | n/a | n/a | pass | pass | pass | pass |
| iconography / provenance | pass | n/a | pass | n/a | pass (Lucide circleCheck) | pass | pass | pass | pass |
| iconography / stroke-earns-the-bar | pass | n/a | pass | n/a | pass (Don't listed as thin on purpose) | pass | pass | pass | pass |
| labels-and-titles / text-ink | pass | n/a | pass | n/a | n/a | pass | pass | pass | pass |
| labels-and-titles / text-ink-exceptions | pass (fixed) | pass (no control) | pass | pass (no control) | n/a | pass | pass | pass | pass |
| labels-and-titles / title-is-heading | pass | n/a | pass | n/a | n/a | pass | pass | pass | pass |
| layout-and-density / measure | pass (fixed) | n/a | pass | n/a | n/a | pass | pass | pass | pass |
| layout-and-density / below-the-page | pass (fixed) | n/a | pass | n/a | n/a | pass | pass | pass | pass |
| layout-and-density / breakpoints | pass | n/a | pass | n/a | n/a | pass | pass | pass (narrow and wide side by side) | pass |

Evidence: the React gates accessibility-floor, contrast-1 to -8, focus-ring, glyph-stroke, field-zoom, guidelines and story-css. The Node gates stories/guidelines/*.test.js and stories/story-css.test.js. getBoundingClientRect measurement at 1280 and 390 in both themes. The slop CLI. The other rule pages (dense tables, pagination, drawer, file-drop, motion and similar) govern parts that these specimens do not draw, so they do not apply. No new specimen is a motion rule.
