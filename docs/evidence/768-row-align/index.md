# Row alignment, #768

Captures from the Storybook build with agent-browser at device scale 2. "Before" is origin/main
ebe17c8b. "After" is this branch. Each value is the control's height `h` and the y of its centre
`cy` from the top of its row, in CSS px. No capture scrolls sideways.

| File | Row | Theme | Width | Measured |
| --- | --- | --- | --- | --- |
| filter-bar-before-1280-light.png | Dense tables, filter bar | light | 1280 | field h 45, cy 22.50. Status chip h 39.16, cy 19.58 |
| filter-bar-after-1280-light.png | Dense tables, filter bar | light | 1280 | field h 45, cy 22.50. Status chip h 45, cy 22.50 |
| filter-bar-after-390-dark.png | Dense tables, filter bar | dark | 390 | field h 45, cy 22.50, alone on line 1. Status chip h 39.16, cy 74.58, alone on line 2 |
| toolbar-before-1280-light.png | SearchField, Toolbar | light | 1280 | field h 45, cy 22.50. Status and Period chips h 39.16, cy 19.58. View seg h 42, cy 21.00 |
| toolbar-after-1280-light.png | SearchField, Toolbar | light | 1280 | field, chips and seg h 45, cy 22.50 |
| toolbar-before-390-dark.png | SearchField, Toolbar | dark | 390 | one kind of control on each line. Field h 45. Chips h 39.16, cy 74.58. Seg h 42, cy 125.16 |
| toolbar-after-390-dark.png | SearchField, Toolbar | dark | 390 | the same as before |
| finance-report-before-1280-light.png | Finance report, toolbar | light | 1280 | field and Export h 45, cy 22.50. Period seg h 42, cy 21.00. Chips h 39.16, cy 19.58 |
| finance-report-after-1280-light.png | Finance report, toolbar | light | 1280 | field, Export, seg and chips h 45, cy 22.50 |
| finance-report-before-390-dark.png | Finance report, toolbar | dark | 390 | chips h 39.16, cy 126.58. Export h 36, cy 125.00 |
| finance-report-after-390-dark.png | Finance report, toolbar | dark | 390 | chips and Export h 39.16, cy 126.58 |
| file-drop-before-1280-light.png | File drop, error row actions | light | 1280 | Retry h 30, cy 15. Remove h 29, cy 15 |
| file-drop-after-1280-light.png | File drop, error row actions | light | 1280 | Retry and Remove h 30, cy 15 |
| file-drop-before-390-dark.png | File drop, error row actions | dark | 390 | Retry h 30, cy 15. Remove h 29, cy 15 |
| file-drop-after-390-dark.png | File drop, error row actions | dark | 390 | Retry and Remove h 30, cy 15 |

The Dense tables row at 390 does not change, so it has no "before" capture. The Remove button has
no edge or fill at rest, so its 1px change does not show in the file drop pictures.
