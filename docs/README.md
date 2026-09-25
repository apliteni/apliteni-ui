# apliteni-ui docs

The top-level [`README.md`](../README.md) is the quick start (install, use, publish,
deploy). These pages explain how each part works.

```
@apliteni/apliteni-ui        the kit — tokens + component CSS + HTML-string factories   (src/)
      ├── Storybook           the workbench where components are built and reviewed      (stories/, .storybook/)
      └── ui.apli.tech        the public site: landing + hosted Storybook + changelog    (site/)
```

- [specification.md](specification.md) — the contract: what the kit ships, what it
  guarantees, what a consumer may rely on, and what it deliberately does not do. Every
  statement in it is held by a gate that runs on `npm test`.
- [library.md](library.md) — the package: architecture, `src/` layout, tokens &
  theming, the component catalog.
- [landing-page.md](landing-page.md) — the `ui.apli.tech` site: chrome, the build
  pipeline, the server.
- [changelog.md](changelog.md) — the changelog: data model, Storybook deeplinks,
  breaking flags, git-derived contributors.
- [storybook.md](storybook.md) — the workbench: config, theming toolbar, story
  conventions.
- [guidelines.md](guidelines.md) — the Guidelines collection: the shape of a rule,
  the gates that walk the pages, how to add one.
- **[Guidelines](https://ui.apli.tech/storybook/?path=/story/guidelines-overview--overview)**
  — a Storybook section, not a page in this folder: what one page may hold, the UI rules for
  colour and theming, the full state set, component choice, destructive actions, and microcopy
  and tone. The link lands on the overview, which lists the pages and the rules the kit has yet
  to meet.

## Where a decision gets recorded

Three places: choose the home by the kind of statement:

**What the kit guarantees** goes in [specification.md](specification.md). A consumer needs to
know that every stroked glyph clears 1.5 CSS px; they do not need the sub-pixel argument that
settled on 1.5. State the guarantee, name the gate holding it, link the issue.

**How to contribute** goes in the [README](../README.md#contribute).
[AGENTS.md](../AGENTS.md) holds rules that need agent judgment. Tests explain
what they check, what they miss and how to fix a failure.

**Why a design was chosen** goes in the issue. Keep measurements, alternatives and discussion
in that thread, and link to them instead of maintaining a second copy.

An issue opens with a problem, so closing it does not itself record a decision. [#198][i198]
asked that "someone has to say which is right and why the others exist" but closed without an
answer in the thread. **When you close an issue that settled something, write the decision into
it**: what was chosen, what was rejected, and who chose if it was a call rather than a derivation.
This gives the specification's outcome a record a reader can check.

Code cites the specification, never an issue:

```js
// why: docs/specification.md#icons-and-glyphs
```

One line, pointing at a heading. `scripts/doc-refs.test.js` resolves every one of them — the file
has to exist and the anchor has to be a heading in it — so a citation that stops landing turns a
build red rather than misleading a reader who follows it.

[i198]: https://github.com/apliteni/apliteni-ui/issues/198
