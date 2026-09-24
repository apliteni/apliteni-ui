# Motion

What moves after page load, how long it takes, and what happens when a reader asks for less.

## Move anything that appears or leaves after page load.

<!-- rule: after-load -->

**Why:** A panel appearing in one frame makes the page jump. Sliding it from its edge shows its origin and return. Content present at load stays still; moving it delays reading.

**Except:** Text that changes in place, such as a count, range, or status line, changes immediately. A moving number is not yet readable.

## Set timing by what moves: 150ms for a control, 250ms for a surface, and 400ms for an entrance.

<!-- rule: durations -->

**Why:** These timings are --dur-fast, --dur-med, and --dur-slow; --dur-instant is 80ms for a press. Every kit transition uses one of these four values. A surface set to 300ms fails the build instead of adding a tempo. This range matches published systems: Atlassian uses 150–400ms for modals and panels.

## Use the kit's curves: --ease for a surface that comes and goes, --ease-out for one that arrives and stays, and linear for visibility.

<!-- rule: easing -->

**Why:** The CSS keyword ease has a different curve from --ease, although stylesheets make them look alike. Visibility keeps its old value throughout the transition, so easing adds nothing. An overshooting curve can switch it during the fade.

## When a reader asks for less motion, change immediately.

<!-- rule: reduced -->

**Why:** Under prefers-reduced-motion, the reduced-motion stylesheet sets every animation and transition in every published kit bundle to at most 0.01ms, so components need not remember this rule. An opening drawer or confirm also cancels internal transitions, so the control it moves the reader to is not hidden in that frame. WCAG 2.3.3 allows a fade because opacity is not counted as motion, and Apple replaces slides with fades. The kit follows Atlassian, Primer, and Fluent: motion is off and instant, because one rule for everything is the only version a new component cannot forget.

**Except:** A spinner or skeleton stops too. The surrounding region tells the reader what they are waiting for; motion does not.
