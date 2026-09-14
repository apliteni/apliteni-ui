# The evidence rig

Every image under `docs/evidence/rail-*.png`, `docs/evidence/nav-collapsed-*.png`
and `docs/evidence/react-*.png` is produced here. Round 9's review said the rig
"still has no producer committed, so I cannot reproduce ten of them"; this is
that producer.

One static server over one checkout, the kit's own factories imported as modules
in the page, one Chrome, one viewport — so between two checkouts only the code
differs, and the before side of a pair is the same rig pointed at `main`.

## Running it

Playwright is deliberately not a dependency: the kit ships no browser and nothing
in `npm test` drives one. Point two variables at what you have.

```sh
export UI_PLAYWRIGHT=/path/to/playwright/index.mjs   # or leave unset if it resolves
export UI_CHROME=/path/to/chrome                     # Chrome, or Chrome for Testing

node scripts/evidence/shoot.mjs . out/               # the eight desktop shots + the phone four
node scripts/evidence/film.mjs  . out/               # the two filmstrips
node scripts/evidence/nav.mjs   . out/ nav-collapsed-after
git worktree add --detach /tmp/before origin/main
node scripts/evidence/shoot.mjs /tmp/before out/ rail-before
node scripts/evidence/nav.mjs   /tmp/before out/ nav-collapsed-before
```

A third argument to `shoot.mjs` is a substring filter over the names, so one
subject can be re-taken on its own.

`react.mjs` is the same rig pointed at the React workspace's own Storybook build,
which is where `docs/evidence/react-*.png` comes from. A React component needs a
bundler and `shot.html` has none, so the subject is the built story rather than a
page that imports the factories:

```sh
npm run build-storybook -w react                     # react/storybook-static
node scripts/evidence/react.mjs . out/               # the ten React shots
node scripts/evidence/react.mjs . out/ select        # one subject, re-taken
```

It takes the same third-argument filter. Both faces are loaded into the story the
way `shot.html` loads them — the React Storybook's preview imports the kit's
stylesheet and nothing else, so without that the shot is of the box's fallback
face rather than of the kit.

It waits on `settle.mjs` and never on a clock: the panel renders open, so its fade
is running when the page arrives, and a query typed into the field starts another.
A fixed `waitForTimeout` over a running transition is a race the rig loses quietly
— it cost 2px of drift in `react-dropdown-search-links-dark.png` between two runs
of the same tree, which a pair shot across two checkouts could not tell from a
change. Reach for `settle()` in any new producer here, and never for a number of
milliseconds.

The clocks were necessary and not sufficient. With them gone, one frame of fourteen
still differed between two runs — a single level of antialiasing on a rounded
corner, and a different frame each time. Three more things buy the rest, and each
is on the launch or the context rather than in a shot:

- `--font-render-hinting=none` and `--disable-lcd-text`, because hinting snaps a
  glyph to the pixel grid from state the browser carries, and one advance landing a
  64th of a pixel differently moves a corner by a level.
- `reducedMotion: 'reduce'`, so no frame can catch a compositor layer mid-travel.
  The kit's net takes the travel off rather than changing what is drawn.
- `--deterministic-mode` and `--disable-partial-raster`, Chromium's own pixel-test
  switches: one raster pass per frame, and no re-raster of a tile already drawn.

Four runs of fourteen frames agree to the byte with those on, and the last of them
against what is committed under `docs/evidence/react-*.png`. A subject that has to
open itself is opened by the rig with a real click once the page has settled: the
dropdown panel freezes the width the whole list needs as it opens, so a panel open
before the webfaces land freezes a width measured in the fallback.

## What is deterministic and what is not

`shoot.mjs` and `nav.mjs` are: the same checkout, the same Chrome and the same
viewport give the same bytes. That is the cross-check to run first — re-shoot
`rail-before-*` off `main` and compare it with what is committed before trusting
anything else the rig says.

`film.mjs` is not, and cannot be. Its frames come off the compositor with
`Page.startScreencast` and each caption is the time the browser painted that
frame, so the six times land near 0, 50, 100, 150, 200 and 250 ms but never on
them. The composition is fixed; the milliseconds are the run's own.

## Fonts

The page loads Poppins and IBM Plex Sans from Google Fonts and waits on
`document.fonts.ready`. Shot with no network, every face falls back and the
bytes will not match — `scripts/font-loading.test.js` is the gate that says why
a token whose family never loads is a token that silently resolves to something
else.
