# Fixes for the integrated review (#768)

Branch `builder-ui-integrate-human-review`, commit f723e633. Each prototype opens a rule from its hash.

- C1 hover-readouts, above-the-mark: the Do opens the readout below a tall bar near the top of the clipping region, and the Don't clips the month and the value.
- C2 hover-readouts, overlay: the Expenses card draws a kit spark, so the chart area is not empty in the Do and the Don't.
- C3 dashboards-and-reports, line end labels: two end labels that end close together no longer overlap. The lower label goes under its point, and the upper label moves up.
- C4 layout-and-density: the page does not scroll sideways at 720 or 390. Each bar label sits in its own track, so no bar is wider than its frame.
- C5 loading button: the label slot clips only the vertical slide, so the word Refresh keeps its last glyph at every size.

Each prototype was served with the CSP header and measured at 390, 720 and 1280 in light and dark. No rule had an error, no element left its frame, and no chart scrolls sideways.
