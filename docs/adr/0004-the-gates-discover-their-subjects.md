# 0004. The gates discover their subjects and never enumerate them

- **Date:** 2026-08-09
- **Status:** accepted
- **Code:** `scripts/icon-size-surfaces.test.js`, `scripts/lib/icon-cascade.js`
- **Issues:** #165, #172

## What we ran into

[0003](0003-an-icons-size-is-measured-not-reasoned-about.md) gates the rules inside `src/styles`. It
builds its list from the `@import`s of `src/index.css`, so anything the kit renders through another
path is outside it by construction. Three such paths existed:

- **the landing site** — `site/build.mjs` writes `assets/kit.css` from `src/inline.js`, which carries
  `src/styles/base.css` verbatim, and both `site/index.html` and `site/changelog.html` link it.
  Their own `<style>` blocks then compete with that reset. Eight bento icons went from ~16px to 24px
  that way, found by hand.
- **the stories** — Storybook loads `src/index.css` and every story's `<style>` block competes with
  the same reset.
- **the workbench** — `.storybook/preview.js` imports `../src/index.css`, so CSS written beside it
  lands in every story iframe against that reset.

The defect underneath was an **undercount**: a header that named two files out of five read as a
complete account of the gap, so the next person trusted it and stopped looking.

## What we decided

**No list of filenames.** The surfaces are swept:

| | |
|---|---|
| `site/*.html` | every page `site/build.mjs` writes, composed here the way it composes them |
| `stories/**/*.stories.js\|mjs` | the glob `.storybook/main.js` loads, plus every file under `stories/` they import transitively — which is how the shared shells join coverage without being named |
| `.storybook/` | every `*.css`, and the `<style>` blocks of every `*.html` |

A new page, a new story, a new shared shell, a stylesheet beside `preview.js`: all in scope by
existing. A file that stops carrying an icon rule leaves the count, and the count is asserted.

**Where a count cannot see, a test says so.** `.storybook/` contributes no subject today, so the
count cannot tell whether it was read at all — the test `the Storybook chrome is one of the swept
surfaces` is what does.

**The chrome is swept here rather than in a gate of its own**, because this gate already holds the
site and the stories under one count, and `.storybook/` is the third leg of the same workbench its
stories render in. The two halves of that directory render differently and are measured the same
way: `preview.js` loads the kit into the story iframe, while `manager-head.html` styles the
Storybook UI around it and loads no kit CSS at all. Holding a manager rule to the iframe's cascade
is the stricter reading — the reset is (0,0,1) and loses every tie on source order, so a manager
rule has to go out of its way to lose to it — and the looser reading would leave the iframe's own
CSS measured by nobody.

**Composed from source, never from a built site.** CI runs `npm test` before `npm run
build-storybook` and never runs `site/build.mjs`, so `site/public/` does not exist there. A gate
reading it would fail in CI; one that skipped when it was absent would silently drop coverage, which
is the fault this gate exists to fix. Composing from source means importing what `site/build.mjs`
imports and substituting the same placeholders — the raw HTML carries `{{CHROME_CSS}}` and friends,
and feeding that to a CSS parser drops rules on the floor. The same argument is why the walk that
derives the svg class set skips `site/public` and friends by name.

**Both shapes of story CSS are read.** `stories/apps/_appShell.js` writes its CSS literally between
`<style>` and `</style>`; `stories/foundations/Iconography.stories.js` writes `<style>${STYLE}</style>`
and declares `STYLE` above. An extractor handling only the first measures nothing for the second and
says so in green. An interpolation that cannot be resolved becomes a marker this gate then refuses
to ignore.

## Why not the alternatives

**Name the files.** That is what was there, and naming two of five was read as naming all of them.
A list is a claim about the world that nothing keeps true.

**One gate over every surface including React.** A shared count cancels — see
[0005](0005-one-gate-per-workspace-one-implementation.md).

**Read the built site.** Doesn't exist in CI, and skipping when absent is the silence being fixed.

## What this does not cover

- A `.js` or `.jsx` file under `.storybook/` is not read for `<style>` blocks. `theme-toggle.jsx`
  writes none; the day one does, it falls outside this sweep.
- Everything [0003](0003-an-icons-size-is-measured-not-reasoned-about.md) lists under *what this does
  not cover* applies here too — this gate asks the same question of more surfaces, not a better
  question.
