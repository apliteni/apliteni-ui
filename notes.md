# builder-ui-r8-account (#768)

The branch starts from origin/builder-ui-r6-chartspage. The task: the account navigation takes at most a third of the modal, at every width. Rule: "Give the modal its own navigation" (nav).

## The navigation's share before the change

The share is the navigation width divided by the window or panel width.

| Surface | 390 | 720 | 1280 |
| --- | --- | --- | --- |
| React AccountWindow | tabs row over the pane, 123 of 800 px high | rail 240 of 691, 0.35 | rail 240 of 1024, 0.23 |
| Guideline specimen, Do | side list stacked over the pane, 276 of 278 wide, 202 px high | stacked, 606 of 608 wide, 202 px high | 233 of 428, 0.54 |

## The share after the change (variant a, in the source)

| Surface | 390 | 720 | 1280 |
| --- | --- | --- | --- |
| React AccountWindow | one tabs row in the 374 px header, the pane takes the full width | rail 214 of 691, 0.31 | rail 240 of 1024, 0.23 |
| Guideline specimen, Do | one tabs row, 57 px high | 189 of 608, 0.31 | 142 of 428, 0.33 |

Other React widths: 561 gives 164 of 539 (0.30), 600 gives 176 of 576 (0.31), 860 gives 240 of 826 (0.29).

## The variants

- a, guideline-account-and-settings-look-a.html: at 560 px and less, the navigation is one row of tabs over the pane, and the pane takes the full width. Above 560 px, the rail is at most a third of the window. This is the source on builder-ui-r8-account.
- b, guideline-account-and-settings-look-b.html: the side rail stays at every width. At 560 px and less it shows only the avatar, and each entry is an icon over a short label. The rail is 58 of 390 (0.15). The specimen's nav is 92 of 278 (0.33). Variant b is a patch in the prototype only.
- b uses short labels: Security, Agents, Theme and Alerts. AccountSection has no short label today. To ship b, the component needs a `shortLabel` field, and the Do caption needs new words, because it says "above the pane on a phone".

## Source changes (variant a)

- react/src/AccountWindow.css: the column rule repeats the window width expression. It declares no custom property, because the React contrast walk requires that every var() in react/src resolves to a kit token. The rail has a max-width of a third less its margins. The nav column is min(216 px, a third of the window less the margins and padding). At 560 px and less, the cap is off, because the rail is a row.
- react/src/AccountWindow.test.tsx: one new test reads the three declarations. It fails on the CSS of the base branch.
- stories/guidelines: the Do and Don't specimens render the SidebarNav and the NavTabs, as the window does. The specimen CSS shows one. On a phone, it shows the tabs row over the pane.
- docs/components.md: the rail takes at most a third of the window.
- guidelines/account-and-settings.md: not changed. The page is at its word budget, and the Do caption already says "above the pane on a phone".

## Decisions and rejected choices

- Rejected: container-type on the window. It makes a new containing block, so the lifted dropdown panels inside the window would anchor to the window and not to the viewport.
- Rejected: a guideline sentence about the third. The page is at 345 words against a budget of 336, so the floor is in docs/components.md.
- The account menu, the phone breakpoint and the tap sizes did not change. So THEME_SUBMENU and TAP_ZONES were not required.

## The prototypes

- The branch is review-captures/builder-ui-r8-account. It holds the two files and this note.
- Each file is the Account and settings guideline page, with the data-rule ids of the guideline and the same hash rule as review-captures/builder-ui-r6-chartspage.
- The bottom bar opens the states: page, modal-phone (390 x 844), modal-tablet (720 x 900) and modal-desktop (1280 x 800). Each state shows the live React AccountWindow in a frame of that size, scaled to fit the screen.
- The window has fabricated data: Dana Example, dana@example.com, and five sections. It opens on Security.
- The checks: both files, every state, light and dark, at 390, 720 and 1280, after document.fonts.ready, with a hover on a row and keyboard focus after two Tab presses. No page error and no horizontal overflow in any case.

## How the files are built

- Each file is one bundle of the story module and a frame entry, from this branch's source, made with the repository's Vite 8 and the kit alias.
- The Markdown of the guideline is put into the bundle, so a file reads nothing from disk or network.
- The head is the head of the reference guideline file: the storage shim and the IBM Plex @font-face block. A page starts in dark, as Storybook does.
- The hash rule is the reference text, unchanged. It runs in its own function scope, because its short names collide with names in this bundle.
- A state frame is a srcdoc copy of the same file with html[data-frame], so the frame renders only the window. The frame follows the page theme.

## Known limits

- At 720 px, variant a cuts the label "Agents & API tokens" with an ellipsis. The rail is 214 px wide there.
- At 561 px, the email in the rail is cut with an ellipsis.
- At 390 px in variant a, the tabs row scrolls. "Agents & API tokens" is past the right edge until the reader scrolls the row.
- The proto bar is fixed, so in a capture of the page state it covers part of the Don't specimen.
- Variant b is not built from the source. Its short labels are fixed in the prototype entry.
