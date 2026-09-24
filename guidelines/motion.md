# Motion

What moves after page load, how long it takes, and what happens when a reader asks for less.

## Move anything that appears or leaves after page load.

<!-- rule: after-load -->

**Why:** Sliding a panel from its edge shows where it comes from and returns to; appearing in one frame reads as a jump. Content present at load stays still so readers need not wait.

**Except:** Text that changes in place, such as a count, range, or status line, changes immediately. A moving number is not yet readable.

## Set timing by what moves: 150ms for a control, 250ms for a surface, and 400ms for an entrance.

<!-- rule: durations -->

**Why:** Use --dur-fast, --dur-med and --dur-slow, plus --dur-instant at 80ms for a press. Every transition uses these four tokens; 300ms fails the build, keeping one tempo within Atlassian’s 150–400ms panel range.

## Use the kit's curves: --ease for a surface that comes and goes, --ease-out for one that arrives and stays, and linear for visibility.

<!-- rule: easing -->

**Why:** CSS ease differs from --ease despite their similar spelling. visibility holds its old value during transition, so easing adds nothing and overshoot can flip it mid-fade.

## When a reader asks for less motion, change immediately.

<!-- rule: reduced -->

**Why:** Every published bundle caps animations and transitions at 0.01ms under prefers-reduced-motion; opening drawers and confirms cancel internal transitions so focus lands on a visible control. WCAG 2.3.3 permits fades and Apple uses them, but the kit follows Atlassian, Primer and Fluent’s instant change so new components cannot forget.

**Except:** Spinners and skeletons stop too; the surrounding region announces the wait.
