# Pager variants

Open `index.html`. It works in a viewer with `sandbox="allow-scripts"`.

Recommend **A. Footer band**. It groups the count and controls, including the one-row case. **B. Open accent** makes Next stronger, but can compete with the page’s main action. No new token is needed.

The baseline uses the actual kit components at `d495a9c`. The prototype contains all styles, scripts and fonts. All records are fabricated. The page names every affected kit rule.

Captures cover 390×844, 1280×800 and 1920×1080 in both themes. Additional captures show states.

Self-review: pass. Forty accessibility scans passed. Proposed phone controls reach 44px. Paging, focus, loading, page sizes, empty results and the sandbox passed. `stories/story-css.test.js` and `react/src/story-css.test.ts` passed, with 26 and 36 tests. The rendered-page slop scan found no findings.

The owner’s choice, kit build and release remain with the coordinator. No PR was opened.
