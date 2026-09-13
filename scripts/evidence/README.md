# The rail's evidence rig

Every image under `docs/evidence/rail-*.png` and `docs/evidence/nav-collapsed-*.png`
is produced here. Round 9's review said the rig "still has no producer committed,
so I cannot reproduce ten of them"; this is that producer.

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

`guideline.mjs` shoots a Guidelines page on the same server, through the story's
own `guidelinePage()` call under Storybook's theme decorator. Its third argument
is the side of the pair and its fourth is the page, defaulting to `the-page`; it
writes the full page and a life-size crop of the first rule that draws a specimen
pair. #310's caption evidence is these two calls, eight images:

```sh
node scripts/evidence/guideline.mjs .           docs/evidence/caption-rank after
node scripts/evidence/guideline.mjs /tmp/before docs/evidence/caption-rank before
```

## What is deterministic and what is not

`shoot.mjs`, `nav.mjs` and `guideline.mjs` are: the same checkout, the same
Chrome and the same viewport give the same bytes. That is the cross-check to run
first — re-shoot `rail-before-*` off `main` and compare it with what is committed
before trusting anything else the rig says.

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
