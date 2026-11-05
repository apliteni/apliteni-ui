# Chart look and hover, issue #768, round 8

Six prototypes, one for each look and surface:

| File | Surface | Look |
| --- | --- | --- |
| `kpi-band-look-a.html` | KPI band sparks | a |
| `kpi-band-look-b.html` | KPI band sparks | b |
| `kpi-band-look-c.html` | KPI band sparks | c |
| `guideline-charts-look-a.html` | Charts guideline page and a full line chart | a |
| `guideline-charts-look-b.html` | Charts guideline page and a full line chart | b |
| `guideline-charts-look-c.html` | Charts guideline page and a full line chart | c |

The file name holds the look. No file has a look switch.

## The looks

- **a** is in the source on `builder-ui-r8-charts`. It has a smooth curve, a gradient stroke, a soft glow that ends well above the base, and a halo dot.
- **b** has a smooth curve and a plain stroke. A thin fade shows only on the side of the active point. Small charts have no fill and no halo.
- **c** has straight segments, as before. Small charts have no fill and no halo. Full-size charts keep the fill, with a lighter fade.

All three looks use only the kit tokens and the chart tones. An accent does not change a chart tone.

## How each prototype is made

Each file is one Vite build of the branch source, with all assets inline. It needs no server and opens from `file://`.

- **a** builds the source unchanged.
- **b** and **c** build the same source through a small Vite plugin. The plugin replaces exact strings in `react/src/Chart.tsx` and `react/src/chart-looks.tsx` before the build. It stops the build if a string does not match exactly once.
- **b** turns off the spark glow, the spark gradient stroke and both halos. It replaces the full chart's glow with the same path under a mask. The mask is a horizontal gradient that is opaque at the active point and clear one step to each side. With no active point, the mask sits on the latest point.
- **c** turns off the spark glow, the spark curve and both halos. It turns on the old straight spark line with its casing. The full chart draws straight segments, and its fade starts at 16% opacity.

## States and the hash

Each file has three sections: `rest`, `hover` and `dark`. Each section has a `data-rule` id that is the same as its state name. The loader and the hash rule are the same as on `review-captures/builder-ui-r6-chartspage`.

- The kit applies a theme only on the root element. So the hash also sets the theme. `#rest` and `#hover` set light, and `#dark` sets dark. Any other hash leaves the theme unchanged.
- The hover sections put a pointer at 60% of the way between the third and the fourth point. The pointer touches no dot. The chart snaps to the nearest point, April.
- In the KPI band, the pointer goes to the first stat only, because the band shows one readout at a time.

## Data

All figures are fabricated demo data: money in and money out for January to June 2026.

## Gradients and the design rules

The design skill says "no gradients". The owner asked for this chart look by name, so the owner's request wins for look a and the fades in b and c.

## Checks

The captures are at 390, 720 and 1280 px, in light and dark, after `document.fonts.ready`, with the pointer between two points and with keyboard focus on a chart.

## Results

Look a is commit `29ffc308` on `builder-ui-r8-charts`.

- `npm test`: pass.
- `npm test -w react`: 4947 of 4949 pass. The two failures were timeouts in the stock screener story, which has no chart, while other worktrees loaded the host. That file passed 98 of 98 when it ran alone.
- `npm run check:words`: pass.
- `npm run build-storybook` and `node site/build.mjs`: pass.
- `CHART_TARGETS=1 node --test stories/chart-target.test.js`: 11 of 11 pass.
- `node --test stories/accent-contrast.test.js`: 11 of 11 pass.
- The captures showed no page errors and no horizontal scroll at any width.
