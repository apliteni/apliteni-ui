# Contributing

Use Node 20 or newer and install [jq](https://jqlang.github.io/jq/). Then:

```bash
npm ci
npm run storybook              # the kit on 6006; -w react for React's own, on 6007
npm test && npm test -w react && npm run build-storybook && node site/build.mjs
```

Run that last line before you open a pull request.

The kit's own promises are in [components.md](components.md) and
[foundations.md](foundations.md); the design rules for a screen are in
[guidelines](../guidelines/overview.md). [AGENTS.md](../AGENTS.md) holds the rules an agent
follows.

```
src/          the kit: tokens, one stylesheet per component, HTML-string factories
react/        the React wrapper over the same CSS
stories/      Storybook: where components are built and reviewed
guidelines/   the design rules, as Markdown that ships in the package
site/         the public site: homepage, changelog, hosted Storybook
scripts/      the gates that are not component tests
```

## Adding a component

Put the token-based CSS in `src/styles/`, and name it in `src/index.css` and in both the
`styles` map and `cssText` in `src/inline.js`. Put the HTML factory in `src/components/` and
export it from `src/index.js` — a module the entry never names still ships in the tarball and
still cannot be imported. Add a playground and the states in `stories/components/`. React
components go in `react/src/`, each with a test and a story built from the shared classes and
tokens.

## Storybook

`@storybook/html-vite` renders the kit's strings: a story calls a factory and puts the
returned string on the canvas.

```js
export default { title: 'Components/Button' };
export const Playground = { render: () => button({ label: 'Save', variant: 'primary' }) };
```

A decorator applies the toolbar's globals to `<html>`, paints the canvas with the theme's
`--bg` and calls `wireTopbar()`, so every story is viewable in two themes and four accents
with no code of its own. Do not wire theming or `wireTopbar` yourself.

The toolbar has a **Theme** toggle that shows the theme you are in and flips it in one
click, plus **Inspect** and **Accent** dropdowns. The config is in `.storybook/`:
`main.js` for the framework and the story glob, `preview.js` for the globals, the decorator
and the section order, and `manager.js` with `manager-head.html` for the Storybook shell's
own brand.

Stories are grouped by `title` into four sections: **Foundations**, **Guidelines**,
**Components** (one kit factory each) and **Showcases** (whole pages that use the components,
with shared scaffolding in `stories/apps/_*.js`).

```bash
npm run storybook          # dev, on port 6006
npm run build-storybook    # static, into storybook-static/
```

`storybook-static/index.json` is the truth about story ids.

## The guidelines collection

`guidelines/*.md` ships in the package and supplies the text Storybook renders; the Overview
links to every page. A page is a `#` title and its rules, with no introduction or appendix.
Each rule has a short `##` title, a stable `<!-- rule: id -->` and a `**Rule:**` line, plus
`**Why:**`, `**Do:**`, `**Don't:**`, `**Except:**` and `**Gap #123:**` as it needs them, each
on one source line.

A page shows its rule and says the least it can. Most rules carry a rendered do-and-don't pair
built from kit parts, and the text is only what the picture cannot carry. `npm run check:words`
is the length check; `refs.test.js` and `reading-surface.test.js` are the other two.
[AGENTS.md](../AGENTS.md#the-guidelines-collection) has the rest.

To add a page: write its Markdown and a specimen module exporting `TITLE`, `BLURB`, `RULES`
and an optional `SPEC_CSS`; add a story calling `guidelinePage({ title, rules, css })`; list
it in `_overview.js`, the Overview navigation and Storybook's `storySort`; then update the
collection counts and run the suites.

## The site

`site/` builds the public site: a static homepage, the changelog and the hosted Storybook.
There is no server — `site/public/` is one self-contained static tree that the host serves
directly.

```
site/
  index.html        homepage, with {{PLACEHOLDER}} slots for the shared chrome
  changelog.html    the changelog page's shell
  chrome.mjs        the one shared topbar, footer and their CSS and JS
  changelog.mjs     the RELEASES data and the render helpers — pure, no git and no fs
  catalogue.mjs     the counts the homepage prints, read off the published types
  build.mjs         emits site/public/
```

`node site/build.mjs` imports `cssText` from the package's own `src/inline.js`, so the site
always styles itself with the CSS the package ships. It hashes that CSS, so a deploy cannot
serve a stale sheet, fills the chrome placeholders, resolves the version and folds a built
Storybook into `public/storybook/`. To add a page, create `site/<page>.html` with those
placeholders and run it through the same two helpers in `build.mjs`.

```bash
npm run build-storybook    # → storybook-static/, only if you want /storybook
node site/build.mjs        # → site/public/
```

To look at the result, serve `site/public/` with any static server.

`site/public/` is gitignored, and `.gitattributes` declares it generated so a tool reading
the repository can tell a built tree from work in progress. Declare build output you add
in that file too.

## The changelog

The changelog is hand-written, newest release first, in `site/changelog.mjs`:

```js
{
  v: '0.3.0', date: '2026-07-22', tag: 'latest',   // tag: 'latest' | 'first' | undefined
  changes: [
    // [type, text, components?]   added | changed | fixed | deprecated | removed | breaking
    ['breaking', '`accountShell()` renamed `cap` → `maxWidth`.', ['Shell']],
    ['added',    'Finance data-table treatment.',                ['Table']],
    ['fixed',    'Enlarged the consent scope icons.'],
  ],
}
```

`text` takes `` `code` `` and is escaped for you. A component name in the `COMPONENTS`
registry becomes a pill linking to its story; a name that is not in it becomes a plain pill,
so naming anything is safe. A `breaking` change gets the red tag and puts the **Breaking**
badge on the release's header.

The contributor row is derived from git by `build.mjs`, not stored: it reads the log between
each release's tag and the one before, and resolves authors through an `AUTHORS` map. Every
git call is guarded, so a missing tag only means no contributor row.

To add a release: prepend the entry and move `tag: 'latest'` onto it, write the changes, add
any new component to `COMPONENTS` with its id checked against `storybook-static/index.json`,
and run `node --test site/changelog.test.js` and `node site/build.mjs`.

## Releasing

Bump `package.json` and `package-lock.json` and add the changelog entry in the same pull
request. Merging the bump is what starts the release: `tag-on-bump` tags the commit and
dispatches **Release**, which publishes to npm over OIDC with no stored token. Do not tag or
publish by hand.

A release whose tag commit is on `main`, whose CI and Security passed for that commit, and
whose version is above npm's `latest` is approved by policy and goes straight out. A
prerelease, or anything else valid, waits at the **npm-publish-review** environment for a
named reviewer. An invalid tag stops before the build, and the publish job checks the version
against `latest` again, so an older one can never move the tag backwards.

A merge is not proof of publication. After a merge to `main`, check the Release run and npm's
`latest`. Compare a waiting run's version with `latest` before approving it — a stale run
should be reported, not approved. To pause automatic releases, turn required reviewers back on
for the **npm-publish** environment; never remove its main-only rule or npm's binding to it.
`.github/workflows/release.yml` records how that boundary is configured and why.
