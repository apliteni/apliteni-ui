# Resizable columns

27 November 2026. These prototypes propose resize controls for `ThreeColumnPage` and `SplitLayout`.
They do not change the kit.

## References

| Reference | Useful pattern |
| --- | --- |
| [VS Code](https://code.visualstudio.com/docs/configure/custom-layout) | Full-height dividers and saved layout. |
| [Finder](https://sindresorhus.com/guides/finder-column-width-mac) | Small handle and double-click to fit. |
| [Thunderbird](https://support.mozilla.org/en-US/kb/how-change-thunderbird-layout) | Folders, list and open item beside each other. |
| [Atlassian](https://atlassian.design/components/navigation-system/layout/examples) | Bounded width and explicit app persistence. |
| [PrimeVue](https://primevue.org/splitter/) | Pane limits, resize events and optional storage. |
| [shadcn/ui](https://ui.shadcn.com/docs/components/resizable) | Optional visible grip. |
| [WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) | Named separator with values and keyboard controls. |

[Reference details](references.md) distinguish documented behaviour from unknown states.

## Approaches

| Approach | Handle and target | Keyboard | Limits | Reset | Persistence | Phone | Motion | Tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [A](line.html) | Line, 12px full-height target | Shared | Shared | Shared | None | Shared | None | A |
| [B](grip.html) | Centre grip, 24px full-height target | Shared | Shared | Shared | None | Shared | None | B |
| [C](header.html) | Header grip, 44×44px target | Shared | Shared | Shared | None | Shared | None | C |

All use `role="separator"`, `aria-orientation="vertical"`, `aria-controls`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and a pane name.
Left/Right moves 16px. Shift moves 48px. Home/End selects the limits. Escape cancels a drag.
Collapse is absent, so Enter has no collapse action.

Folders: 200–320px. Files: 240–420px. Open file: at least 320px.
The first divider exchanges width with Files.
The second exchanges width with the open file.
Review: 320–860px, with at least 320px for the preview.
Available space can reduce each maximum.

Double-click resets one divider. Reset widths restores both examples.
Resize stops at 860px. At 560px, folders show one level with Back.
Review stacks below 860px. Coarse-pointer targets reach 44px above that breakpoint.
No animation runs during resize, including reduced motion.

Shared tokens: `--space-*`, `--panel-sm/md`, `--measure`, `--tap-min`, `--border`, `--accent`, `--ring-scroll`.
A adds `--muted`. B/C add `--radius-pill`, `--bg`, `--text`, `--border-strong`, `--accent-strong`, `--accent-contrast`.

Recommend **B**. Its grip makes resizing visible, and its full-height target is easy to reach.
A is harder to discover. C requires reaching the header.
All widths reset on reload. A future app-supplied storage key needs a separate implementation decision.
