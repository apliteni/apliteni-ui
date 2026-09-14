# The topbar band's search field: what seven other systems draw, and what this one draws

**Settled on 2026-09-14: Artur chose b · lifted**, from the frames this survey produced — the field
leaves the sunken step for `--surface`, so its fill is lighter than the band rather than darker, and
it takes the kit's focus ring. `a · bordered`, `c · quiet` and `d · wide` were not taken. What
follows is the survey as it was written before the choice, unchanged.

Read for [#318](https://github.com/apliteni/apliteni-ui/issues/318) on 2026-09-14. Artur, on
[#317](https://github.com/apliteni/apliteni-ui/pull/317) while approving the layout: *"btw it
search field looks ugly"*. He did not say what is wrong, so this is the survey the four variants
were drawn from rather than an argument for one of them.

Every row below was read from the thing's own source on 2026-09-14 — the file on this box for
`lessly-ui`, and the served HTML and stylesheet for the rest, fetched and grepped, not recalled.
Where a system could not be read that way it says so and carries no measurements, because a
remembered border width is not evidence.

## What this kit draws today

src/components/shell.js:234 `const searchField = ({ palette, placeholder }) =>` and
src/styles/layout.css:340 `.ui-app__search {`, at `6b4af3e`:

```
<button class="ui-app__search" data-cmdk-open="…" aria-haspopup="dialog">
  <span class="ui-app__search-ic" aria-hidden>  (magnifier, 17px, stroke 2.2)
  <span class="ui-app__search-txt">Search or run a command…
  <kbd class="ui-cmdk__key" data-palette-hotkey>Ctrl K
```

`flex: 0 1 var(--panel-sm)` — 320px, shrinking. `padding: 7px 10px`, `--text-sm` (13px),
`--radius-md` (12px), ink `--muted`. Ground `--surface-2`, edge `1px solid --border`. The cap is
the palette's own `.ui-cmdk__key`: `--surface-3` fill, `--border` edge, `--radius-xs`, ink
`--dim`. Hover moves the edge to `--border-strong` and the ink to `--strong`. Focus is **not**
styled at all.

## The table

| | Field or button | Width | Ground | Border | Radius | Glyph | Placeholder | Key cap | Focus |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **apliteni-ui today** | button, `aria-haspopup="dialog"` | 320px, shrinks | `--surface-2` — **sunken**, below the band | 1px `--border` | 12px | stroked, 17px, 2.2 | "Search or run a command…" — the palette's own prompt | filled box: `--surface-3`, 1px `--border`, 6px | **the browser's own outline** |
| **lessly-ui `QuickSearchRow`** (`d1a25eda`, on this box) | button, `aria-label` = label + shortcut | rail width, `w-full` | `bg-bg-overlay` — **lifted**, above the rail | 1px `field-border` | `rounded-md` | `lucide` Search, 16px | "Quick search" — two words | **plain text**, `text-xs font-medium`, tertiary ink | `ring-2 ring-border-focus` |
| **GitHub** (Primer Brand header, live CSS) | button, `aria-label="Search or jump to, type / to search"` | 12.5rem = **200px**, capped | `--brand-button-subtle-bgColor-rest` = `#00000003`, ~transparent | 1px `--brand-button-subtle-borderColor-rest` | `--brand-borderRadius-small` = 4px | Octicon search, **filled**, 16px | "Search" — **one word** | **outlined, no fill**: `background-color:#0000`, 1px border, inset bottom line, monospace 11px | Primer's own |
| **GitHub** (Primer `TextInput`, live CSS — the real field beside it) | input | — | `--bgColor-default` = **`#fff`** (light) / `#0d1117` | 1px `--control-borderColor-rest` = `#d1d9e0` / `#3d444d` | 6px | — | "Go to file" | — | accent border **plus** a 2px inset accent outline |
| **Vercel Geist** (docs trigger, live CSS) | button, `aria-label="Search Docs"` | `w-full` of a 250px rail, `h-9` = 36px | `bg-background-100` = **`#fff`** (light) — lifted off the grey rail | none; `outline outline-1 outline-gray-alpha-300` = `rgba(0,0,0,.10)` | `rounded-md` | Geist search, **filled**, 16px | "Search Docs" — two words | boxed, but on **the field's own ground**: `bg-background-100`, `shadow-[0_0_0_1px_gray-alpha-400]`, `rounded-sm`, 20px tall, ink `gray-1000` — **the strongest ink on the page** | `shadow-[var(--ds-focus-ring)]` — 2px ground + 2px accent |
| **Notion** (help-centre sidebar, live CSS) | input, `readOnly` — opens a dialog | sidebar width, 36px tall | **none at all** — the page shows through | 1px `--border-color-regular` = `rgba(0,0,0,.08)` | 8px | 16px, muted ink | **"Search"** — one word | **none** | `:focus-within { border-color: --tatami-color-text-muted }` — the edge darkens, no ring |
| **Tailwind docs** (live CSS) | button | content width, ~64px | `bg-gray-950/2` — 2% black | `inset-ring-gray-950/8` — an **inset** 1px ring | `rounded-full` — a pill | **filled**, 16px, `fill-gray-600` | **none — no words at all** | **plain text**, `font-sans text-xs/4 text-gray-500`, reads `⌘K` / `Ctrl K` by platform | Tailwind's own |
| **Raycast docs** (GitBook-hosted, live markup) | real input | header width | `bg-tint-base` | 1px `border-tint-subtle` | `rounded-md` | GitBook's | "Ask or search…" | **two caps**, `⌘` and `k` split, each 20px, 1px border, `rounded-md` | GitBook's |
| **Slack** (help centre, live markup) | real input, a form that submits | hero width | — | — | — | — | "Ask anything" | none | — |
| **Linear** | — | — | — | — | — | — | — | — | — |

**Linear could not be read from source today and so is not described.** `linear.app/docs` ships
its search trigger as a client-rendered chunk (`SearchTrigger--M7HAWGB.js`, fetched — it is four
lines that re-export a component from a bundled design system), the served CSS carries no rule for
it, and the app itself is behind a login this box has no credential for. The alternative was to
write down what Linear's field looks like from memory, which is the thing PR #279 was accepted for
not doing.

Raycast's and Slack's rows are the same caveat in a smaller form: `developers.raycast.com` is
hosted on GitBook and `slack.com/help` is a help centre, so both rows describe a *documentation*
search rather than either product's app chrome. They are in the table because they were read, and
marked because of what they are.

## The six things the table actually says

**1. Nobody puts this control on the sunken step.** It is the one measurement every readable
system agrees on. Primer's field is `#fff` — the page's own default — on a page that is also
white, and lets a `#d1d9e0` border do all of it. Geist's is `#fff` on a *grey* rail, so the fill
is lighter than its ground. lessly-ui's is `bg-bg-overlay` where every other field in that kit is
`bg-bg-primary`, and its own comment says exactly why: *"every other field sits on a card or a
page and this one sits on the rail — which IS `bg-bg-primary`, so the field's own fill would be
its ground and only the border would say it is there"*. Notion has no fill at all.

This kit is the exception, and it is the exception because `.ui-app__search` borrowed
`.ui-input`'s ladder wholesale — the sunken step, the hairline, the radius — and `.ui-input` is
drawn on a card. The band is `--bg`, the bottom of the ladder, so a sunken fill can only go
**down** into it. Measured on the band: `--surface-2` over `--bg` is **1.10:1 in light** and
1.07:1 in dark.

**2. The edge is doing nothing in light.** `--border` over `--bg` is **1.09:1**. Primer's
equivalent is 1.43, Geist's 1.25, Notion's 1.19 — and those three are *carrying* the control,
because they have no fill step to lean on. This kit's field is a 1.10 fill inside a 1.09 edge: two
devices, neither of which reads, which is what a smudge is.

**3. The key cap is a box that is not there.** `.ui-cmdk__key` was drawn for the palette panel,
whose ground is `--surface-2`; it fills with `--surface-3`. On the band the field is *also*
`--surface-2`, so the cap's fill measures **1.04:1 against the field it sits in** and its border
**1.01:1**. A filled, bordered box at 1.04 and 1.01 is ink in the shape of a box with no box under
it. Of the systems that state a key at all, two draw it as plain text (lessly-ui, Tailwind), one
outlines it over nothing (GitHub), and one boxes it on *the field's own ground* with a ring and
the page's strongest ink (Geist). None of them fills it a shade off its container.

**4. The words are the palette's, not the trigger's.** `shell.js:99` defaults the trigger's
placeholder to `'Search or run a command…'`, which is `command-palette.js:297`'s own placeholder —
the prompt for a box you have already opened and are about to type into. Every readable reference
puts one or two words on the trigger: "Quick search", "Search", "Search Docs", or nothing. The
cost is visible rather than theoretical: at 390px the 320px field shrinks and the sentence clips
to *"Search or run a co…"* (`docs/evidence/shell-layouts/shell-topbar-phone-light.png`).

**5. Every one of them styles its own focus. This field does not.** `.ui-app__search` is a
`<button>` without `.ui-btn`, so the kit's shared ring rule —
src/styles/base.css:140 `.ui-focusable:focus-visible,` — never reaches it and `:focus-visible` falls
through to Chrome's default — a square black-and-white outline drawn around a 12px radius
(`docs/evidence/shell-layouts/shell-topbar-search-light.png`). This is the one finding in the
survey that is a defect rather than a preference, and all four variants fix it whichever is
chosen.

**6. 320px is wide for what it holds, and the band is empty either way.** GitHub caps its header
trigger at 200px; Tailwind's is about 64px; Geist's and lessly-ui's fill a rail. Nobody floats a
fixed 320px box in a wide band. At 1280 this band is a 320px control, a 28px mark, and ~700px of
nothing between them.

## Where the four variants came from

| Variant | The finding it answers | Read from |
| --- | --- | --- |
| **a · Bordered** | 1 and 2 — the fill goes, `--border-strong` carries the edge at 1.33 light / 1.95 dark | Notion's border-on-the-page-ground; GitHub's outlined cap |
| **b · Lifted** | 1 — the same pill, one step **up** (`--surface`), so the fill is lighter than the band rather than darker | lessly-ui's own comment; Geist's white-on-grey |
| **c · Quiet** | 3, 4 and 6 — 240px, "Search…", the cap unboxed. Today's fill and today's step, untouched | Tailwind's pill; lessly-ui's plain-text shortcut |
| **d · Wide** | 6 — the field takes the band to the reader's mark, bordered for the reason a is | GitHub's product command bar |

`today` is rendered alongside them, off this same branch, so the baseline in the comparison is the
branch drawing what #317 shipped rather than a picture of it.

The frames are `docs/evidence/318-search-field/` and the page that lays them out is
[`318-search-field.html`](318-search-field.html). The recommendation, and the reason, are in
`PR.md` — labelled as the author's, because this survey does not pick.
