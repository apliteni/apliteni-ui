# Landing directions for #463

Three disposable prototypes of the `ui.apli.tech` homepage, made so Artur can
choose one on a round. Nothing here is shipped, imported or served: `site/build.mjs`
reads only `site/`, and this folder is meant to be deleted once the choice is made.

| File | Direction | Slogan |
| --- | --- | --- |
| composed by `shots.mjs` | **A** — the page as it ships, one string changed | The kit behind Apliteni's products |
| `b.html` | **B** — the skill's *Precision* composition | The styling is already decided |
| `c.html` | **C** — the skill's *Poster* composition | Pick a colour. The rest is done. |

Direction A has no file. It *is* `site/index.html` with one hero line replaced,
and a committed copy of 431 lines would start drifting the day it was written, so
`shots.mjs` composes it the way `site/build.mjs` does and swaps the line. If that
line changes in `site/index.html`, the rig throws instead of capturing the old page.

B and C borrow the real chrome from `site/chrome.mjs` through `proto.mjs`, so a
direction is judged against the topbar and footer the page actually ships rather
than a copy of them. `shared.css` holds the page gutter and the focus rings the
shared chrome does not draw — see the finding written beside that block.

## Capturing

Playwright is not a dependency of this package, the same as the evidence rig.

```sh
export UI_PLAYWRIGHT=/path/to/playwright/index.mjs
export UI_CHROME=/path/to/chrome

node docs/reviews/463-landing-directions/shots.mjs out/          # all of it
node docs/reviews/463-landing-directions/shots.mjs out/ focus    # the focus walk only
```

A second argument filters the captures by name. Each page is taken in both themes
at 1440 and 390, full height.

## The focus walk

`shots.mjs` also tabs through each direction and records, per stop, whether the
control's `box-shadow` **changed** from its resting value. The change is the
question, not the presence: the accent dots wear a permanent collar, so "it has a
shadow while focused" would pass every one of them. A stop whose `outline-style`
computes to `auto` is the browser's own ring. What it measures is Chromium at
1440 in dark, up to 44 tab stops; it says nothing about other browsers, forced
colours, or a stop past the 44th.

## What it does not do

It renders no React, so direction B's claim about React components rests on the
package rather than on anything drawn here. The demo screen's workspace, roles and
services are invented for the page. The counts in B and C are written by hand;
a shipped page should compute them the way `site/catalogue.mjs` computes the icon
count, or they go stale in silence.
