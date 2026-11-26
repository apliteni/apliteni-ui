# Toast offset and ring

Recommend A: `bottomOffset` sets the total bottom inset, in pixels or a CSS length. Default: 16px. Update published reach when it changes.

B uses `--ui-toast-bottom` on the document. It needs separate handling when CSS moves the stack. Both pictures use the same ring.

Use the action ink for the arc. Keep the 35% full-circle backdrop. All five tones pass 3:1 in both themes and all four accents. Minimum: 3.35:1.

Baseline: main `a02e4fa`. The prototype freezes timers. This is a proposal, not a kit build.

Kit rules:

- Toast: behaviour, colour and screen room, `docs/components.md`.
- Ring: colour, elevation, focus and glyphs, `docs/foundations.md`.
- Notice: Show lasting conditions, `guidelines/component-choice.md`.
- Paint: Semantic tokens and Stable signals, `guidelines/colour-and-theming.md`.
- Controls: Focus rings, `guidelines/state-set.md`.
- Layout: container, spacing, panels and breakpoints, `guidelines/layout-and-density.md`.

There is no separate Toast guideline on main.
