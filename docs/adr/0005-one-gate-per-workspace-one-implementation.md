# 0005. One gate per workspace, over one shared implementation

- **Date:** 2026-08-10
- **Status:** accepted
- **Code:** `scripts/icon-size-react.test.js`, `scripts/lib/icon-cascade.js`
- **Issues:** #172

## What we ran into

`react/.storybook/preview.ts` imports `@apliteni/apliteni-ui/css`, and `react/kit-alias.ts` points
that specifier at `src/index.css` — the sheets the other two gates compose. So every React story
renders against the inline-icon reset in `src/styles/base.css`, and
`react/src/primitives/Icon.tsx` injects the kit's own glyph markup, so the specificity contest of
[0003](0003-an-icons-size-is-measured-not-reasoned-about.md) happens here on the same terms.

Nothing measured it. A rule like `.rx-btn svg { width: 16px }` in `react/src/DataTable.css` either
won or lost, and neither gate could say which — the state the kit itself was in when 21 of its 24
sizing rules were not applying.

## What we decided

**A gate of its own, not a fourth surface in the surfaces gate.** That file holds one count across
everything it sweeps, and a shared count cancels: a React rule dropping out of coverage and a site
rule arriving in the same commit leave the number where it was, and the tripwire says nothing. The
two workspaces also fail for different people — a broken React sweep is a problem for consumers of
the `./react` entry point, and it should say so in its own red.

**One implementation underneath all three.** The machinery is imported from
`scripts/lib/icon-cascade.js` rather than copied, so the gates cannot drift into measuring different
things. Three gates asking one question is the point; three gates asking three questions would be
worse than one gate.

**It discovers, like the others.** Every `*.css` under `react/src` at any depth, so
`react/src/primitives/` joins the sweep the day it grows a stylesheet — and every `<style>` block
written inside a `.ts` or `.tsx` there, in both spellings: the CSS between the tags, and the string
a `dangerouslySetInnerHTML` hands them, which is what React writes when the CSS is a value rather
than markup. That idiom would otherwise fall between this gate and the `stories/*.stories.js` glob
the surfaces gate runs on.

**It reads source, not built output.** `react/dist` is gitignored and built by `prepare`, and
`release.yml` installs with `--ignore-scripts`, so a gate reading `dist` would measure something CI
does not have and would produce the local-green/CI-red class of defect this area keeps hitting.

## Why not the alternatives

**Widen the surfaces gate's glob to `.tsx`.** The extraction shape does not fit: React's CSS lives in
files imported by components, so there is no `<style>` block to read, and the counts would then
share a tripwire that cancels.

**Measure the built bundle.** Closer to what ships, and unavailable in CI at the point the tests run.

## What this does not cover

- **File order.** The gate mounts in path order; the built bundle orders by export. With an
  equal-specificity contest across two React stylesheets, the gate and the shipped sheet can name
  different winners. Moot at zero subjects today, and real.
- **`react/.storybook/` itself** is swept by no gate.
- **A component named `Style`.** In a `.tsx`, `<Style>` is a component reference, not the element,
  and the extractor reads it as a `<style>` block — a false red, with a message pointing at the
  wrong function. Nothing under `react/src` is named that today.
