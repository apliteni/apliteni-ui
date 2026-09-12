# How other products separate surfaces without shadows

Research for [issue #295](https://github.com/apliteni/apliteni-ui/issues/295). The variants it
supports are on [the review page](./295-elevation.html); the prototype that draws them is in
[`295-elevation/`](./295-elevation/).

The question behind the issue is narrow. Since #284 the card is flat, and the kit still casts a
shadow from ten other places. If shadows go, something has to say *this panel is above that
page* instead. Four things are in use across the industry, and every product below picks one or
two of them:

1. **A line.** A hairline border carries the whole edge.
2. **A step of lightness.** The surface is brighter (dark theme) or the page is darker (light
   theme) than what it sits on.
3. **A material.** The surface is translucent and blurs what is behind it.
4. **A shadow anyway** — kept, but small, and paired with one of the above.

A note on sourcing. Radix, Geist, Primer, Atlassian and Material publish their tokens, and every
value quoted below is from their own documentation. Linear publishes an article about its colour
system but not its tokens. Stripe's internal system (Sail) is private; what is public is the
styling API it gives Dashboard apps, which is itself informative. Raycast and Arc publish
neither. Where a product publishes nothing, this note says so rather than guessing.

---

## Radix Themes — a 12-step scale, and translucent panels by default

Radix is the most explicit of the published systems, because it numbers every step and says what
each one is for.

| Step | What it is for |
| --- | --- |
| 1 | App background |
| 2 | Subtle background |
| 3 | UI element background |
| 4 | Hovered UI element background |
| 5 | Active / selected UI element background |
| 6 | "Subtle borders on components which are not interactive. For example sidebars, headers, cards, alerts, and separators" |
| 7 | "Subtle borders on interactive components" |
| 8 | "Stronger borders on interactive components and focus rings" |

Two things matter for #295. The first is that steps 1 and 2 exist *as a pair* — the app
background and a second background a step off it — so a surface sitting on the page is a
different colour from the page before anything is drawn around it. The second is that a card and
a menu do not share a border step with a button: step 6 is the non-interactive edge, step 7 the
interactive one.

Radix Themes then has a `panelBackground` prop with two values. The default is `translucent`,
which "creates a subtle overlay effect"; `solid` is offered "when you'd prefer to present
information unobstructed". A major system shipping translucency as the *default* panel treatment
is the strongest evidence for the frost variant — and the fact that it ships an opt-out is the
strongest evidence against making it the only one.

- <https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale>
- <https://www.radix-ui.com/themes/docs/theme/color>

## Vercel Geist — two backgrounds, a ten-step grey, and no shadow in the colour docs

Geist publishes exactly two background tokens and a ten-step grey, and assigns every step a job:

| Token | Job |
| --- | --- |
| `--ds-background-100` | Default element background |
| `--ds-background-200` | Secondary background |
| `--ds-gray-100` / `200` / `300` | Component background / hover / active |
| `--ds-gray-400` / `500` / `600` | Border / hover border / active border |
| `--ds-gray-700` / `800` | High-contrast background |
| `--ds-gray-900` / `1000` | Secondary and primary text |

Three of ten steps are borders. The colour documentation names no shadow token at all. Vercel's
interface is the clearest working example of the **hairline** answer: the separation between a
panel and the page is a line and a background step, and nothing else.

- <https://vercel.com/geist/colors>

## GitHub Primer — a shadow, with a hairline baked into it

Primer is the counter-example, and worth reading closely because of *how* it keeps shadows:

```
--shadow-resting-xsmall   0 1px 1px 0 #1f23280d
--shadow-resting-small    0 1px 1px 0 #1f23280a, 0 1px 2px 0 #1f232808
--shadow-floating-small   0 0 0 1px #d1d9e040, 0 6px 12px -3px #25292e0a, 0 6px 18px 0 #25292e1f
--shadow-floating-medium  0 0 0 1px #d1d9e000, 0 8px 16px -4px #25292e14, …
--shadow-floating-large   0 0 0 1px #d1d9e000, 0 40px 80px 0 #25292e3d
```

Every *floating* shadow starts with `0 0 0 1px` — a hairline ring, before any blur. On
`floating-small` that ring is `#d1d9e040`, a visible line; on medium and large it is
`#d1d9e000`, fully transparent, because by then the blur is wide enough to carry the edge alone.
Primer is not choosing between a line and a shadow. It is saying the line is what does the work
at short range and the shadow takes over at long range.

The resting shadows are almost nothing — `0 1px 1px 0` at 5% ink. A card in Primer is, for
practical purposes, flat with a line.

- <https://primer.style/foundations/primitives/color>

## Linear — elevation is lightness, computed in LCH

Linear's redesign article is the closest thing to a first-party statement of Artur's rule. They
moved the whole palette to LCH, and give the reason:

> "LCH has the benefit that it's perceptually uniform, meaning a red and a yellow color with
> lightness 50 will appear roughly equally light to the human eye."

and say what they use it for:

> to deal with different elevations for our surfaces (e.g. background, foreground, panels,
> dialogs, and modals)

The rest of the article is about reduction: "Instead of having to define 98 specific variables
for each theme, we defined three: base color, accent color, and contrast." A theme is a base
colour, an accent and a contrast setting; the surface steps are *derived* from them by moving
lightness. That is elevation-as-lightness taken to its conclusion — the steps are not picked by
hand at all.

The contrast variable is the part worth stealing: because the steps are computed, they can
automatically "include super high-contrast themes for users who need it for accessibility
reasons". A hand-picked ladder cannot do that without a second hand-picked ladder.

- <https://linear.app/now/how-we-redesigned-the-linear-ui>

## Atlassian — lighter surfaces in dark mode, and a shadow kept beside them

Atlassian says the rule outright, in its own token documentation:

> `elevation.surface.raised` — "Always pair `elevation.surface.raised` with
> `elevation.shadow.raised`. This is particularly important in dark mode, where raised surfaces
> are lighter to help differentiate elevations."

and the same sentence again for `elevation.surface.overlay`. So: raised surfaces are lighter in
dark mode — Artur's rule, from a system that has shipped it at scale. But the instruction is
"always pair", not "instead of". Atlassian runs lightness *and* a shadow, and treats using one
without the other as a mistake.

Two more of its tokens are directly useful here. `elevation.surface` carries the note "To create
flat cards, pair with a border" — the hairline answer, named as such. And there is an
`elevation.surface.sunken`, "a backdrop to group content or elements together (such as a kanban
board) on the default surface". A sunken step is a thing a full ladder needs, and the kit's
`--surface-2` is already doing that job for fields and tracks.

- <https://atlassian.design/foundations/elevation>

## Material 3 — tone first, shadow second

Material used to express dark-theme elevation as a white overlay whose opacity rose with the
elevation level. Material 3 replaced that with tone:

> "Material 3 represents elevation mainly using tonal color overlays. This is a new way to
> differentiate containers and surfaces from each other — increasing tonal elevation uses a more
> prominent tone — in addition to shadows."

and then went further, replacing the computed overlay with five named surface-container roles
(lowest, low, default, high, highest) plus `surfaceBright` and `surfaceDim`. The "updated roles
remove the use of opacity overlays and thus of surface tint colors."

The direction of travel is what matters: from a shadow, to a computed overlay, to **named
surface steps you can point a token at**. That is the same move the `lift` variant makes.

- <https://developer.android.com/develop/ui/compose/designsystems/material3>
- <https://m3.material.io/blog/tone-based-surface-color-m3>

## Stripe — the public API has a background and a keyline, and no shadow

Sail is not published. What *is* published is the styling API Stripe gives apps that render
inside the Dashboard, which has to look like the Dashboard. It offers:

- `backgroundColor`, with a `container` token described as a darker background than the default;
- `keyline`, for a border (`<Box css={{ keyline: 'neutral' }}>`);
- `<Divider />`, for a line between stacked items.

There is no shadow, elevation or blur property in the API at all. An app cannot cast a shadow in
the Stripe Dashboard, which is a fairly direct statement about how the Dashboard separates its
own surfaces: a background step and a keyline.

- <https://docs.stripe.com/stripe-apps/style>

## Raycast and Arc — a material, not a token set

Neither publishes a design system. Raycast's theme format is the only public surface, and it is
short: a "background color or gradient", a primary and support colours, defined separately for
light and dark. There is no elevation or shadow vocabulary in it. The extension API exposes
colours that "automatically adapt to the Raycast theme (light or dark)" and an `adjustContrast`
flag that pulls a raw colour toward high contrast against the Raycast UI.

What Raycast and Arc actually share is not a token — it is the platform material: a translucent
panel over a blurred backdrop, which on the web is `backdrop-filter`. It reads as elevation
because a real material in front of something blurs it. The cost is that the panel's background
is no longer a colour you control; it is a colour plus whatever happened to be behind it, which
is why contrast on a frosted panel has to be checked against the worst backdrop, not the token.

- <https://manual.raycast.com/themes>
- <https://developers.raycast.com/api-reference/user-interface/colors>
- <https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter>
- <https://developer.apple.com/design/human-interface-guidelines/materials>

---

## What this means for the kit

**Nobody separates surfaces with a shadow alone.** Every system above carries at least a
background step, and most carry a line as well. Where a shadow survives it is either tiny
(Primer's resting shadows, at 5% ink) or explicitly paired with a lighter surface (Atlassian).
The kit today is the outlier in the other direction. In dark, `--shadow-lg` is
`0 18px 50px rgba(0,0,0,.5)` — and the dropdown panel it lifts is `#1b1927` sitting on a
`#16151f` page, a contrast ratio of **1.05**. The surfaces are doing essentially nothing; the
shadow is carrying the entire separation on its own. Remove it and the panel does not become
subtle, it disappears. That is the actual risk in #295, and it is why every variant here has to
move a token as well as delete a shadow.

**Artur's rule is the majority position, and it is stated most plainly by Atlassian and Linear.**
Raised surfaces are lighter in dark mode. The disagreement between the published systems is not
about the ladder, it is about whether the ladder is enough on its own. Linear and Material say
roughly yes; Atlassian, Primer and Radix say pair it with a line.

**Light theme cannot run the rule in the same direction.** Nothing is brighter than the white the
kit's card already is, so light has to move the page down instead of the card up. Every system
here does the same thing: Radix's step 1 is not white, Geist's page is `#fafafa` rather than
`#ffffff`, Atlassian's default surface sits above a darker page. The kit's light theme is
currently a white page holding white cards, which is exactly the case a hairline was invented
for — and exactly why light cannot drop its hairline even if dark does.

**The accessibility floor is not what it looks like.** WCAG 2.2's [1.4.11 Non-text
Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) asks for 3:1
against adjacent colours, but only for "visual information required to identify user interface
components and states". A card is a decorative container and is not covered — a 2:1 step between
page and card breaks no rule. A dropdown panel is a different matter: the boundary tells you
where the menu ends, and "adjacent colors" there means the page behind it.

The real ceiling in dark is the ink, not the edge. `--muted` is `#948fa8`, and it carries the
dropdown item's description and the tooltip's label, so it has to clear AA 4.5 on every surface
the ladder raises. Measured:

| Surface | `--muted` on it | |
| --- | --- | --- |
| `#2a2639` — panel, top of the ladder | 4.71 | clears |
| `#2d293c` — tooltip, one step above it | 4.52 | clears, barely |
| `#2f2b40` | 4.38 | **fails** |

The first draft of the prototype put `--surface-3` at `#2f2b40` and broke the tooltip's label.
It is fixed there now, but the lesson is the one that matters for the decision: **the dark
ladder has about one step of headroom left, and `--muted` is what spends it.** A rule that says
"raised surfaces are lighter" is a rule that will keep asking for another step. If it ships,
`--muted` gets re-picked with it — which is, in the end, why Linear computes its steps from a
contrast variable instead of choosing them by hand.
