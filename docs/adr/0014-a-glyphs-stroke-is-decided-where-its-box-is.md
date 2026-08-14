# 0014. A glyph's stroke is decided where its box is

- **Date:** 2026-08-14
- **Status:** accepted
- **Code:** `stories/glyph-stroke.test.js`, `stories/lib/glyph-stroke.js`, `src/styles/**`
- **Issues:** #217

## What we ran into

[0010](0010-a-stroked-glyph-earns-the-graphic-bar-by-its-width.md) drew a line — a stroke
rendering under **1.5 CSS px** cannot put three quarters of its colour into any device pixel
row at 1×, so it takes the text bar of 4.5:1 rather than the graphic bar of 3:1 — and then
ruled on the two glyph families that carry a status. Everything else in the kit went on being
drawn at whatever width it had.

Ten of the thirteen stroked glyphs stated in `src/styles` were under that line, `.ui-snippet__copy`
at 0.98 CSS px and `.ui-nav__crumb .ui-nav__ic` at 1.06. Three of the ten paint `--accent`,
whose contrast #157 settled, at a width where the computed ratio overstates what is seen.

Reading the stylesheets is also not enough to find them. Two shapes hide from a scan:

- **A box override with no stroke beside it.** `.ui-nav--side.is-collapsed .ui-nav__ic svg`
  re-sized the rail's icon to 19px and let the stroke come from `.ui-nav__ic svg` seventy lines
  earlier. A gate reading one declaration at a time reports it as having no stroke at all.
- **A stroke that comes from the markup.** `src/assets/icons.js` puts `stroke-width` on every
  icon it emits, `feedback.js` emits its own svgs with a different one, and `sun` and `moon`
  hard-code a third. `.ui-btn svg`, `.ui-fbpill svg` and `.ui-fbc__chip svg` stated only a box,
  so their width was decided in a file no stylesheet scan opens.

## What we decided

**A rule that decides a glyph's box decides its stroke, and both clear 1.5 CSS px.**

What a reader sees is `stroke-width × box ÷ viewBox`, so a stroke stated once and reused at a
second box is two different marks. Eighteen rules were widened or given a stroke they had been
borrowing, every one landing between 1.51 and 1.60 CSS px — the same band 0010's two families
sit in, so a glyph's weight no longer depends on which slot it fell into:

| box | stroke | renders | rules |
|---|---|---|---|
| 13px | 2.8 | 1.52 | `.ui-snippet__copy` |
| 14px | 2.7 | 1.58 | `.ui-fbc__chip`, `.ui-fbc__x` |
| 15px | 2.5 | 1.56 | `.ui-toast__close`, `.ui-nav__crumb .ui-nav__ic` |
| 16px | 2.4 | 1.60 | `.ui-btn`, `.ui-dropdown__tick`, `.ui-fbpill`, `.ui-field__error` |
| 17px | 2.2 | 1.56 | `.ui-nav__ic`, `.ui-input-group__icon`, `.toggle .ic` |
| 18px | 2.1 | 1.58 | `.ui-drawer__close`, `.ui-dropdown__ic` |
| 19px | 2.0 | 1.58 | `.ui-card__icon`, `.amenu a`, the collapsed rail |
| 20px | 1.9 | 1.58 | `.ui-denied__seal` |
| 21px | 1.8 | 1.58 | `.ui-scope__icon` |

`.ui-feature__icon` (1.88), `.ui-empty__icon` (2.00) and `.ui-success__check` (2.20) already
cleared and were left where they were. **No token moved.** Widening a stroke changes how much
of a colour reaches the eye, not which colour it is, so `--accent` is where #157 left it and
every contrast gate reads the same values it did before.

**The gate renders instead of reading.** `stories/glyph-stroke.test.js` builds every story in
`stories/` into a JSDOM carrying the kit's stylesheets and measures every `<svg>` that comes
out, with the cascade already resolved. Its subjects are elements, so the two shapes above are
ordinary: the collapsed rail is an element with an inherited stroke, and an icon whose stroke
came from `icons.js` carries it as an attribute the gate can read. A glyph joins the gate by
being rendered — no selector is typed into it ([0004](0004-the-gates-discover-their-subjects.md)),
which is the correction to 0010's own prose list, a hand-written enumeration that named six of
these ten and missed four.

Four things stop it passing by measuring nothing:

- **The other half of the sweep.** Every rule in `src/styles` that sizes or strokes an icon must
  be exercised by some rendered glyph. `.ui-feature__icon svg` was not: the kit's feature band
  had no specimen anywhere, so it shipped with nothing holding it. It has one now.
- **A glyph it cannot measure is a failure, not a skip** — a box that resolves to no px, a
  stroked svg with no viewBox. Percentages are chased to the slot that owns them and a
  `var()` box is looked up where it is declared, because both are how the kit writes.
- **A corpus that shrinks looks exactly like one that passes**, so the number of stroked glyphs
  found is asserted to be more than a corner of the kit.
- **The arithmetic is exercised on the two widths 0010 measured by hand** — 1.8 at 18px does not
  clear, 2.1 at the same box does ([0008](0008-a-rule-is-proven-by-the-mutation-that-kills-its-case.md)).

**A stroke that ships is stated where the box is, and nowhere else.** `icons.js`'s 1.7 stays a
default for an icon nobody has sized rather than a value anything relies on: it is what the
gate finds when no rule spoke, and at the 1.1em the reset gives a bare icon it clears only above
a ~21px box. Three demo glyphs were failing on exactly that — a bare `icon()` in a card title
and two in a consent note — and the fix in each was to say the box, either by using the kit slot
that already states one (`.ui-card__icon`) or by writing one in the demo's own stylesheet.

**`SOLID_STROKE` has one definition.** The 1.5 lived in `signal-contrast.test.js`, which is now
one of two gates that need it; both import it from `stories/lib/glyph-stroke.js`. The widths in
the table above are pinned by the gate, not by a comment beside each
([0002](0002-a-number-a-comment-argues-for-is-pinned-by-a-measured-test.md)).

## Why not the alternatives

**Record why a control's glyph is held to a different bar.** #217 offered this as the other
outcome, and 0010 had already leaned on it: `.ui-toast__close` was excluded there because it is
a control's glyph and carries no status. The argument does not survive being written down. The
1.5 px line is about what a *display* can paint, not about what a mark *means* — a close button
at 1.13 CSS px is smudged for exactly the reason a warning triangle at 1.13 is, and the reader
who cannot see the stroke is not helped by knowing it carried no status. A second bar would also
need a boundary between the two kinds, and `.ui-nav__ic` — a control's glyph that takes
`--accent` when its row is current — sits on both sides of it.

**Widen the box instead of the stroke.** Free where there is room and it was taken where there
was: three demo glyphs grew rather than thickened. It is not available in a fixed row.
`.ui-toast__close` is 15px inside a toast whose height is set by its text, and the same is true
of the two feedback chips at 14px. One rule that works everywhere beat two that need a judgement
each.

**Raise the default in `icons.js` and change no stylesheet.** This is the one-line version and
it cannot work: the needed width is `36 ÷ box`, so a default that rescues a 13px glyph (2.8)
draws a blob at 25px (2.92 CSS px), and a default that suits 25px leaves 13px where it was. The
same arithmetic is why the reset cannot carry one either — it sizes a bare icon at 1.1em, and
nothing in a stylesheet knows what font-size that lands in.

**`vector-effect: non-scaling-stroke` on every icon.** It makes the rendered width independent
of the box outright, which is a real answer to this. It also makes a 25px glyph and a 13px one
carry identical stroke weight, which is a different kit — the stroke stops being proportional to
the mark. That is a design decision about how the kit's icons look, not a fix for a contrast
floor, and it belongs to whoever wants to make it.

## What this does not cover

- **Colour.** This gate measures width and nothing else. Which bar a glyph is then held to is
  0010's rule, and what its ratio is on its own ground is `signal-contrast.test.js` for the
  status families and `contrast.test.js` for the rest. A glyph that clears 1.5 px in a colour
  nothing measures is still unmeasured for colour.
- **Anything no story renders.** That is the point of the coverage half — but it holds
  `src/styles` only. A consumer's own rule sizing a kit icon is outside every gate here.
- **State.** The corpus is what a story renders at rest. A stroke stated in `:hover` or under a
  media query the JSDOM does not match is not measured, and nothing in the kit writes one today.
- **Device pixels, zoom and transforms.** Everything above is CSS px, exactly as in 0010.
