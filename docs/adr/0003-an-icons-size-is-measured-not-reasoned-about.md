# 0003. An icon's size is settled by measuring the cascade, not by reading the stylesheet

- **Date:** 2026-08-08
- **Status:** accepted
- **Code:** `src/styles/icon-size.test.js`, `scripts/lib/icon-cascade.js`, `src/styles/base.css`
- **Issues:** #148, #171

## What we ran into

The kit sizes icons in two places and they compete. `base.css` carries a reset for bare `icon()`
calls; two dozen component rules size the icon in their own slot. For as long as both existed the
reset won every contest, and nobody noticed — the losing rule is still right there in the file.
`.ui-nav__ic svg { width: 17px }` reads as a decision and rendered at 1.1em.

The arithmetic: `svg:not([width]):not([height])` is **(0,2,1)** — `:not()` carries its argument's
specificity, and two attribute selectors are two class-level units. A component rule like
`.ui-btn svg` is **(0,1,1)**. Source order never entered into it, so the comment promising that
component rules "come later and win the tie" described a tie that was never tied.

Twenty-one of twenty-four sizing rules were not applying. The largest icon in the kit — an 88px
animated check — rendered at 15.94px.

## What we decided

**Mount and read.** The gate does not parse stylesheets and reason about specificity. It mounts an
element matching each rule's selector against the kit's real stylesheets, in the order
`src/index.css` imports them, and reads `getComputedStyle` back. A wrong answer about the cascade is
then a failing test rather than a better argument.

**A subject is any rule setting `width` or `height` on an element that is an `<svg>`** — two shapes,
and the second is easy to miss:

```
.ui-btn svg     the selector ends in `svg`
.ui-fbck        a CLASS the kit puts ON an svg
```

`.ui-fbck` is (0,1,0) and lost to the old reset exactly like the rest. An earlier version collected
only selectors ending in `svg` and was blind to it. The class list is derived from the components
rather than typed into the test.

**Provenance, not selector shape.** Each stylesheet goes in as its own `<style>` element, so every
rule knows which file it came from, and the reset is looked for in `base.css` and nowhere else.
Inside that file it is found by *what makes it the reset*: the one rule that sizes an icon with no
class on it and nothing around it. Everything else in `base.css` is a subject like any other — so
`.ui-nav__ic svg` written there is measured rather than swallowed, which it was for as long as the
gate skipped the file by name.

"Has no class in it" was the obvious shortcut and breaks the moment anyone writes a nested rule:
jsdom serialises `.x { svg { … } }` as `& svg`, which has no class either and would be dropped in
silence as though it were the reset. The question is asked of an element instead, and a nested rule
is refused by name before it is asked.

**Logical properties are folded onto physical ones before anything is mounted.** `inline-size` and
`block-size` share a computed value with `width` and `height` and cascade as one with them, so
`.x svg { inline-size: 40px }` at (0,1,1) beats the reset's `width` at (0,0,1) and decides the icon.
jsdom does not model that sharing — it keeps the logical declaration in a cascade of its own that
`width` never enters, where it wins every contest including the ones a browser makes it lose.
Measured as written, that is a gate that cannot fail.

The fold carries the value and the `!important` alike and respects where the declaration sat in its
block. The subject keeps the property as the file spells it, so every test name is a string the
stylesheet contains.

That fold assumes a horizontal writing mode, which is every icon in this repo, and the assumption
is asserted rather than taken: a `writing-mode` declaration anywhere in these stylesheets stops the
gate, because in a vertical mode `inline-size` is the other axis and folding it onto `width` would
measure the wrong contest and pass.

## Why not the alternatives

**Compute specificity and compare.** That is reasoning about the cascade, and the reasoning is what
was wrong for months — including in a comment that stated the opposite of the truth with confidence.

**Assert the rendered pixel size.** jsdom has no layout, and a real browser would make this a
different and far slower kind of test. The contract chosen is narrower and honest about it: the
declared value is what the cascade resolves.

**Identify the reset by its selector.** Cheaper, and wrong for nested rules — see above.

## What this does not cover

Stated weakly on purpose. Silence here must not read as coverage.

- **A reset scoped to an ancestor.** Subjects are mounted with only the ancestors their own selector
  names, so `.ui-app svg:not([width])` — (0,2,2), beating every component rule inside any `.ui-app`
  wrapper — reintroduces this exact defect with the gate fully green. Nothing short of rendering
  every real screen would catch it.
- **The value.** The expectation is read from the declaration under test, so this asserts "the
  declared value is what the cascade resolves", never "the icon is 17px". Editing 17px to 18px
  renames the test and stays green. That is the right contract for a cascade gate and the wrong one
  to mistake for design review.
- **An icon sized by a clamp.** `min-`/`max-` never enter `width`'s cascade, so there is no contest
  to measure. Nothing in the kit clamps an icon, and the test `no rule in the kit sizes an icon with
  a clamp` is what keeps that true rather than merely current.
- **An icon reset by `all`.** `all: unset`, `all: revert` and `all: initial` each take `width` back
  to `auto` in a browser, so a rule carrying one decides the icon by unsaying the reset. jsdom
  expands the shorthand into nothing, so the element still computes the reset here. Named, not
  refused.
- **An icon sized around `width` altogether** — `zoom`, `transform: scale()`, `aspect-ratio`,
  `contain-intrinsic-size`. `aspect-ratio` is the sharp one: `.x svg { width: 20px; aspect-ratio: 1 }`
  derives the height from the width, so the height a browser renders is decided by a rule this gate
  reads as setting a width and nothing else.
- **Layout.** jsdom has none, so `width: 100%` reads back as the string `100%`. That proves the rule
  won and says nothing about pixels.
- **Markup.** A rule can apply perfectly and never meet an element, because nothing emits that class.
- **The size of a slot that holds an icon.** `.ui-empty__icon` is a div; its 44px-to-32px change is a
  design decision no assertion here covers.
- **An icon carrying its own `width`/`height` attributes**, which the reset skips on purpose. Seven
  svgs in `src/` do: the brand logos, the success check, the empty-state illustration.
- **Anything outside the stylesheets `src/index.css` imports.** `index.css` is a list of sheets, not
  a sheet, and a rule written into it would ship unread — the test `src/index.css still holds nothing
  but @imports` keeps it a list. The other rendering surfaces are covered by [0004](0004-the-gates-discover-their-subjects.md)
  and [0005](0005-one-gate-per-workspace-one-implementation.md).

## A comment that contradicts this

`src/styles/base.css` says "Two gates" and calls `.storybook/` a surface neither sweeps. Both
stopped being true when the third gate landed. It stays wrong because `src/` ships and rewording it
costs a version bump for no rendered change. This record is the account to trust; the comment is
tracked separately.
