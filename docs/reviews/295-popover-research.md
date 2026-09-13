# How a shadowless system still says "above" — notes for #295

Research behind `docs/reviews/295-popover-variants.html`. The kit went shadowless at
[#295](https://github.com/apliteni/apliteni-ui/issues/295); the reporter's answer to the merged
elevation ladder was *"i dont like how flat popover and now - offer more solutions"*. These notes
record what the current panel actually measures, what other 2025–26 systems do in the same
position, and where each of the five offered variants — and the pair of them the review page
recommends — comes from.

Nothing here changes `src/`. The prototype that renders the variants is
`docs/reviews/295-popover-variants/variants.html`.

## What the panel measures today

Every number below is a WCAG 2.x contrast ratio between two flat colours, computed from the
token values in `src/tokens/tokens.css` on this branch. The script is reproduced at the bottom
so the figures can be re-run.

| Reading | Dark | Light |
| --- | --- | --- |
| Panel against the card it opens over (`--bg-elevated` / `--surface`) | **1.11** | **1.05** |
| Panel's hairline against the panel (`--border` / `--bg-elevated`) | **1.14** | **1.24** |
| Panel's hairline against the card behind it | 1.27 | 1.18 |
| Panel against the page (`--bg`) | 1.32 | 1.14 |
| `--muted` on the panel (the row description, the readout label) | 5.60 | 6.11 |
| `--surface-3` row hover against the panel | 1.04 | 1.20 |

Three things follow, and the first two are the complaint stated as numbers.

**The step is spent.** A floating panel over a card differs by 1.11 in dark and 1.05 in light.
1.05 is below the threshold at which most viewers will see an edge at all on a large flat area;
it is the step the specification already admits light cannot run, because `--bg-elevated` is
`#ffffff` and light has nothing brighter to give the layer above it.

**The line is thin twice over.** It is one pixel, and it is 1.14 / 1.24 against what it edges.
So the whole separation rests on a 1px line at roughly 1.2 contrast — the specification's own
sentence, "the line draws the edge; the step says which way is up", is true, but both halves are
running at the bottom of their range at once.

**The ladder has one step of headroom in dark and none in light.** Raising `--bg-elevated` in
dark to `#38324f` keeps `--muted` at 4.62 (AA, just); `#3d3656` drops it to 4.32 and fails. In
light the panel is already `#ffffff`, so there is no value above it at all. This is the cost the
specification names — "the ladder is capped by ink, not by taste" — measured.

## What other systems do in this position

Source quality is marked. **Primary** means the system's own documentation or shipped tokens;
**reverse-engineered** means a third party reading the rendered CSS, which is directionally
useful and not authoritative.

### GitHub Primer — a ring inside the shadow, then a soft drop (primary)

Primer publishes `--overlay-bgColor: #ffffff` with `--overlay-borderColor: #d1d9e080` (a
translucent line), and a family of `--shadow-floating-*` tokens used only for the overlay layer.
`--shadow-floating-medium` is:

```
0 0 0 1px #d1d9e000,
0 8px 16px -4px #25292e14,
0 4px 32px -4px #25292e14,
0 24px 48px -12px #25292e14,
0 48px 96px -24px #25292e14
```

Two things matter here. The declaration opens with a **zero-offset, zero-blur, 1px-spread
layer** — a line drawn in the shadow layer, not a border — and then stacks four very light,
widely spread drops. The ink is `#25292e` at 8% (`14` hex), not black at 30%: the drop is broad
and faint rather than tight and dark. And it is reserved for the floating layer; "resting"
shadows are separate, smaller tokens. Source:
<https://primer.style/foundations/primitives/color>.

### Vercel Geist — border in the shadow layer, real shadow only for overlays (secondary)

Geist's characteristic line is `box-shadow: 0 0 0 1px rgba(0,0,0,0.08)` — a border living in the
shadow layer, which avoids the box-model cost of a real border and composites cleanly with a
radius. Its depth system is layered shadow stacks where one layer is the border, one the soft
elevation and one the ambient depth. The part that bears directly on this decision: **true
box-shadow is reserved for elements that need to appear above the main content plane — popovers
and modals — while lower levels lean on borders.** That is variant (b)'s argument almost word
for word, coming from a system otherwise as flat as this one. Source (a reading of Geist's
shipped CSS, not Vercel's own docs): <https://designmd.cc/benchmarks/vercel>.

### Radix Themes — the panel is translucent by default (primary)

Radix Themes has a `panelBackground` prop on the theme: *"The `panelBackground` prop controls
whether panelled elements use a solid or a translucent background color."* The **default is
`translucent`**, which *"creates a subtle overlay effect"*; `solid` exists for when you *"prefer
to present information unobstructed."* The token pair is `--color-panel-solid` /
`--color-panel-translucent`, and it is the background for *"cards, tables, popovers, dropdown
menus, etc."* — form controls take `--color-surface` instead. So a mainstream, accessible,
token-driven system ships the frost as the default for exactly this component. Source:
<https://www.radix-ui.com/themes/docs/theme/color>.

### Material 3 — elevation is a tonal overlay, and the shadow is optional (primary)

M3: *"Material 3 represents elevation mainly using tonal color overlays. This is a new way to
differentiate containers and surfaces from each other — increasing tonal elevation uses a more
prominent tone — in addition to shadows."* The overlay colour *"comes from the primary color
slot"*, and the surface carries `tonalElevation` and `shadowElevation` as separate inputs — with
`shadowColor` null, no drop shadow renders and the tint carries elevation alone. That is variant
(e): the accent, at a few percent, mixed into the raised surface. Source:
<https://developer.android.com/develop/ui/compose/designsystems/material3>.

Note the asymmetry M3 lives with and this kit would inherit: a 5% primary tint on a near-black
surface is perceptually much stronger than the same tint on white. The measurements below show
it — 1.20 step in dark, 1.03 in light at the same 5%.

### Apple — the floating layer is a material, not a shadow (primary, paraphrased)

Since WWDC25, Liquid Glass is described as a translucent material that reflects and refracts its
surroundings, defining *a functional layer that floats above the content*. The guidance that
matters here is the restraint attached to it: it is *best reserved for the navigation layer that
floats above content*, stacking glass on glass *"can quickly make the interface feel cluttered"*,
and elements placed **on** glass should use fills, transparency and vibrancy rather than a second
material. Source: <https://developer.apple.com/videos/play/wwdc2025/219/> and the HIG Materials
page. Applied here: frost would belong to the panel, and the fields inside it would have to stop
being `--surface-2` and become something thinner — which is a real cost, not a detail.

### Linear — hairlines plus a luminance step, no drop (reverse-engineered)

Reported values: 0.5px hairlines around `#23252a`–`#383b3f`, elevation carried by stepping the
surface's white overlay `0.02 → 0.04 → 0.05`, an inset shadow for *sunken* panels, and menus
without a border where popovers have one. This is essentially what the kit already does, one
notch finer: a half-pixel line and a smaller, more numerous set of steps. It is the closest
system to the kit's current state and it is worth noting that it does **not** solve the light
case — Linear's dark theme is the one everybody cites. Source:
<https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1>.

### Raycast — a double ring, outer light and inner dark (reverse-engineered)

Reported: cards at `#101111` with a `1px solid rgba(255,255,255,0.06)` line, and elevated
elements carrying `rgb(27,28,30) 0 0 0 1px` outer together with `rgb(7,8,10) 0 0 0 1px inset` —
a **double-ring containment**, one ring lighter than the surface and one darker. That is variant
(a) exactly, and it is a dark-only system, which is the caution that comes with it. Source:
<https://www.shadcn.io/design/raycast>.

### Uber Base, Red Hat, and the general 2025–26 drift (secondary)

Base recommends not using shadows to define boundaries and reaching for colour or borders
instead. Red Hat's popover documentation states the problem plainly: drop shadows give popovers
subtle elevation above light backgrounds, but **shadows cannot be seen on dark backgrounds**.
Both point the same way, and both are the reason the kit's rule exists. Neither addresses the
inverse, which is the case this issue is actually about: a *lightness step* cannot be seen on a
light background. Sources: <https://base.uber.com/6d2425e9f/p/595594-elevation>,
<https://ux.redhat.com/elements/popover/style/>.

## The finding that decides the shape of the answer

Put the two together and the kit is caught between them:

- a cast shadow is weak in dark (the page is already near-black — the measured drop core reads
  **1.20** against the card) and much stronger in light (**1.43**);
- a lightness step is strong in dark (**1.35**, using the last of the ink's headroom) and
  impossible in light (**1.10**, and only by taking the card down to 1.04 against the page);
- translucency is weakest of all here, because it composites the panel *toward* what is behind
  it: the step goes **down**, 1.11 → 1.08 in dark and 1.05 → 1.04 in light;
- a **line** is the only device that works in both, and the only one that can be made materially
  stronger without touching the ladder or the ink: a second line takes the edge from 1.27/1.18 to
  **1.64/1.44**, and tinting it takes it to **2.00/1.91**.

So the treatments split into three families: *make the line do more* (a, e), *let the floating
layer alone cast* (b), and *move the surface* (c, d — each of which works in one theme and does
nothing, or costs something else, in the other).

One honest caveat on the numbers: a contrast ratio scores a 1px line and a 24px penumbra on the
same scale, and that scale models neither area nor gradient. The shadow's 1.43 is spread over
tens of pixels of falling ink; the tinted line's 1.91 is one pixel. Both numbers are in the
table, and the frames are there because the ratio alone does not settle it.

## Measured, per variant

Computed the same way. **Step** is the panel against the card it opens over. **Edge / card** is
the panel's outermost line against the card outside it; **edge / panel** is the same line against
the panel inside it — a line needs both, and today both are weak. Ink is `--muted`, the faintest
text a panel carries.

| Variant | Theme | Step | Edge / card | Edge / panel | `--muted` | Note |
| --- | --- | --- | --- | --- | --- | --- |
| today | dark | 1.11 | 1.27 | 1.14 | 5.60 | |
| today | light | 1.05 | 1.18 | 1.24 | 6.11 | |
| a · two-step edge | dark | 1.11 | **1.64** | **1.48** | 5.60 | inner line 1.14 on the panel; outer-to-inner 1.30 |
| a · two-step edge | light | 1.05 | **1.44** | **1.52** | 6.11 | inner line 1.24 on the panel; outer-to-inner 1.23 |
| b · soft shadow | dark | 1.11 | 1.27 | 1.14 | 5.60 | drop core `#0d0b11` = **1.20** on the card |
| b · soft shadow | light | 1.05 | 1.18 | 1.24 | 6.11 | drop core `#d1d2d8` = **1.43** on the card |
| c · frost 78% | dark | **1.08** | 1.91 | 1.76 | 5.76 | panel composites to `#282436` |
| c · frost 78% | light | **1.04** | 1.44 | 1.50 | 6.05 | panel composites to `#fdfefe` |
| d · stronger step | dark | **1.35** | 1.27 | **1.06** | **4.62** | panel `#38324f` |
| d · stronger step | light | **1.10** | 1.12 | 1.24 | 6.11 | card down to `#f2f4f9`; the card then reads 1.04 on the page |
| e · tinted edge | dark | 1.20 | **2.00** | 1.67 | 5.21 | panel `#312a43`, line `#5a457d` |
| e · tinted edge | light | 1.03 | **1.91** | 1.86 | 5.66 | panel `#f8f5fc`, line `#bfafe4` |
| a + b · edge and drop | dark | 1.11 | **1.64** | **1.48** | 5.60 | a's two lines, then b's drop core at 1.20 on the card |
| a + b · edge and drop | light | 1.05 | **1.44** | **1.52** | 6.11 | a's two lines, then b's drop core at 1.43 on the card |

Four entries need reading rather than scanning.

**c's gain is its line, not its frost.** Translucency *lowers* the step — 1.11 → 1.08 in dark,
1.05 → 1.04 in light — because the panel composites toward the card behind it, which is the
opposite of separating from it. The 1.91 / 1.44 in the edge column comes from the stronger line
the frost recipe carries alongside the blur (white at 13% over `--border` in dark,
`--border-strong` in light). Take the line away and frost measures worse than today in both
themes. A blur separates by *texture* — by smearing whatever is behind it — and it therefore
needs something textured behind it to work. A panel opened over a flat card has nothing to smear.

**c in light is invisible.** A panel at 78% over `#f8f9fc` composites to `#fdfefe`. The light
frost frame and the light "today" frame are indistinguishable to the eye, and the number agrees.

**d buys a step and spends its line.** Raising the dark panel to `#38324f` takes the step from
1.11 to 1.35 — the largest step gain on offer — but the hairline, which is `--border` and does
not move with it, collapses from 1.14 to **1.06** against the brighter panel. And `--muted`
lands at 4.62: AA by 0.12, with the next step up (`#3d3656`) at 4.32 and failing. So d's real
cost is that it uses the last of the dark ladder's headroom *and* would require `--border` to be
re-picked for the new panel.

**d in light can only buy the step by spending the card's.** The panel is white and light has
nothing above white, so the only way to open a gap is to bring the card down. At `#f2f4f9` the
panel gains 1.05 → 1.10 and the card loses 1.14 → **1.04** against the page. Push to `#eef0f6`
and the card and the page are the same colour. The card stops reading as a card so that the panel
can read as a panel; the transaction is visible in the light `d` frame, where the card has
faded into the page.

## What each variant costs in tokens

| Variant | New tokens | Reads tokens that already ship |
| --- | --- | --- |
| a · two-step edge | **none** | `--border-strong`, `--border` |
| b · soft shadow | **one** (`--shadow-float`, per theme) | `--shadow-ink` |
| c · frost | **two** (panel alpha, frost line) + an `@supports` fallback + a re-look at fields inside the panel | `--bg-elevated`, `--sheen`, `--border-strong` |
| d · stronger step | **one** in dark (a second floating step); in light it is not a token but a **change to `--surface`**, which every card in the kit reads | — |
| e · tinted edge | **none**, if written as `color-mix()` at the rule, the way `src/styles/card.css:30` `.ui-card--accent` already is | `--accent`, `--border`, `--bg-elevated` |
| a + b · edge and drop | **one** — b's, because a adds none | `--border-strong`, `--border`, `--shadow-ink` |

## What the specification sentence becomes

Today, `docs/specification.md#elevation` opens:

> **Nothing in the kit casts a shadow.** A surface says how high it is with two things: its step
> on a ladder of lightness, and the kit's hairline around it.

- **a, c, d, e** leave that sentence standing. a and e change the second half ("the kit's
  hairline" becomes "two hairlines" / "a hairline that carries the accent"), c and d change the
  first half, and none of them touches the shadow rule or the five deprecated `--shadow-*`
  tokens.
- **b is the only one that rewrites it.** The exception has to be narrow and it has to say why,
  because the rule it carves out of was not really about shadows in general — it was the answer
  to flat cards ([#284](https://github.com/apliteni/apliteni-ui/issues/284)) generalised. The
  proposed wording:

> **Nothing in the kit casts a shadow except a surface that floats.** A card, a field, a chip and
> a row say how high they are with two things: their step on a ladder of lightness, and the kit's
> hairline around them. A menu, a panel, the drawer, a modal and a toast — the `--bg-elevated`
> step and nothing below it — keep those two and add one soft drop, `--shadow-float`, because
> they are the only surfaces whose whole job is to be temporarily above something else. The drop
> is broad and faint, never tight and dark: it separates the panel from what it covers, it does
> not draw its edge. Four of the five deprecated `--shadow-*` tokens stay transparent and
> unread; `--shadow-float` is the one shadow the kit paints.

That rewrite keeps the thing #284 actually asked for — cards are flat — and confines the
exception to a list of five components that is already written down in the ladder table. **a + b**
carries exactly b's cost here: a changes nothing about the shadow rule, so stacking them rewrites
the same one sentence and no other.

## The recommendation, and why

**a + b — the two-step edge with the floating drop.** It is the last option on the review page,
and the reasons are these.

*It is the only treatment that moves both themes.* Each of the others is strong in one theme and
weak or impossible in the other: the drop measures 1.43 in light and 1.20 in dark; the step
reaches 1.35 in dark and cannot be done in light at all. The two halves of a + b are strongest
where the other is weakest — the double edge carries light, where it takes the line from 1.18 to
1.44 and the drop adds the only area-based separation available; the double edge carries dark
too, 1.27 to 1.64, where the drop is nearly invisible.

*It separates by area, which is what "flat" was actually about.* Every other option here is still
a one-pixel argument. A reader calling a panel flat is not reading a contrast ratio off its edge;
they are looking for the thing that tells them one surface is in front of another, and over a
century of that signal has been a shadow. The frames make this plain: the light `today` frame and
the light `a` frame differ in how well the panel is *drawn*, and only the frames with a drop
differ in how *high* it looks.

*It is what the two best-documented systems in this space actually ship.* Primer's
`--shadow-floating-medium` is literally this shape — a 1px line in the box-shadow list, then
broad faint drops — reserved for the overlay layer. Geist leans on borders everywhere and keeps a
real box-shadow for popovers and modals. Both are flat-leaning systems that made the same
exception, in the same place, for the same reason.

*Its cost is one token and one sentence.* `--shadow-float`, per theme, built from `--shadow-ink`
which already ships; a adds nothing. The rewritten specification sentence is drafted above, and it
leaves the card rule — the thing #284 asked for — untouched, because the exception names five
components that the ladder table already lists.

The fallback, if the rule is worth more than the lift: **a alone**. Free, no new token, the
sentence stands as written, and it still takes the edge from 1.27 / 1.18 to 1.64 / 1.44. What it
will not do is make the light panel look higher, only better drawn.

Against **e**, which measures best on the line: in this kit the accent already means *this one is
chosen* — the selected row's label, the focus ring, the active nav row — and painting it on every
floating surface takes that job away from it. It also runs against a rule the same specification
section states, that the accent wash goes on a base surface and never a raised one, which is why
`src/styles/dropdown.css:166` `.ui-dropdown__badge.is-accent` keeps the accent badge flat and
moves only its ink.

## Reproducing the numbers

```js
const hex=(h)=>{h=h.replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');
  return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
const lin=(c)=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;};
const L=(p)=>0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2]);
const ratio=(a,b)=>{const[x,y]=[L(hex(a)),L(hex(b))].sort((m,n)=>n-m);return (x+0.05)/(y+0.05);};
const over=(fg,alpha,bg)=>hex(fg).map((c,i)=>Math.round(c*alpha+hex(bg)[i]*(1-alpha)));
// dark:  bg #0e0d14  surface-2 #161520  surface #211e2d  bg-elevated #2a2639
//        surface-3 #2d293c  border #332f45  border-strong #453f5c  muted #a29db6  accent #b479ff
// light: bg #eef0f5  surface-2 #e3e6ee  surface #f8f9fc  bg-elevated #ffffff
//        surface-3 #e7eaf1  border #e4e7ee  border-strong #cdd2dc  muted #5c6270  accent #6a2dcc
ratio('#ffffff', '#f8f9fc'); // 1.05 — the light panel against the light card
```

`over()` is how the shadow core, the frost composite and the tint values in the tables were
produced. The light drop is `#101626` at 17% over the card `#f8f9fc`, giving `#d1d2d8` — the
1.43 in the table; the dark drop is black at 62% over `#211e2d`, giving `#0d0b11` and 1.20.

## Sources

- <https://primer.style/foundations/primitives/color> — Primer overlay and shadow primitives.
- <https://www.radix-ui.com/themes/docs/theme/color> — Radix Themes `panelBackground`.
- <https://developer.android.com/develop/ui/compose/designsystems/material3> — M3 tonal elevation.
- <https://developer.apple.com/videos/play/wwdc2025/219/> — Apple, Meet Liquid Glass.
- <https://designmd.cc/benchmarks/vercel> — a reading of Geist's shipped CSS.
- <https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1> — a reading of Linear's.
- <https://www.shadcn.io/design/raycast> — a reading of Raycast's.
- <https://base.uber.com/6d2425e9f/p/595594-elevation> — Uber Base elevation.
- <https://ux.redhat.com/elements/popover/style/> — Red Hat popover style.
