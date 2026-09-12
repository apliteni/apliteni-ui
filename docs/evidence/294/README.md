# #294 — a field is 16px on a touch screen

`Components/Inputs → Text fields` at 390px, in both themes, before and after the touch-zoom
net (`src/styles/field-zoom.css`).

| | dark | light |
| --- | --- | --- |
| before | `input-390-dark-before.png` | `input-390-light-before.png` |
| after | `input-390-dark-after.png` | `input-390-light-after.png` |

**The coarse pointer is emulated, not a device.** Headless Chromium, driven over CDP:
`Emulation.setDeviceMetricsOverride` at 390×844 with `mobile: true`,
`Emulation.setTouchEmulationEnabled`, and `Emulation.setEmulatedMedia` with `pointer` and
`any-pointer` set to `coarse`. The page agrees it is one — `matchMedia('(pointer: coarse)')`
was read back as `true` in every capture below. What no emulation can show is Safari's own
zoom, which is the behaviour the net exists to stop; that end of it is the issue's report
from a real iPhone.

**"Before" is this branch with the net's `@import` removed**, so the two pictures differ by
the net alone. For these fields that is what `main` renders: `main` sizes `.ui-input` at
`--text-base`, and the one touch rule it has covers the dropdown's search field only.

The size was read off the rendered fields rather than judged by eye:

| | dark | light |
| --- | --- | --- |
| before | 14.5px ×5 | 14.5px ×5 |
| after | 16px ×5 | 16px ×5 |

The same run over every screen the change touches, at 1440 with a fine pointer and at 390
with a coarse one, is in the pull request's own table: nothing moves at 1440, and at 390
`.ui-input`, `.ui-textarea`, `.ui-select`, `.ui-dropdown__search-input`,
`.ui-pager__size-select`, `.ui-cmdk__input` and the feedback composer's textarea all read
16px.
