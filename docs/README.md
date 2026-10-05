# apliteni-ui docs

The top-level [`README.md`](../README.md) is the quick start (install, use, publish,
deploy). These pages explain how each part works.

```
@apliteni/apliteni-ui        the kit — tokens + component CSS + HTML-string factories   (src/)
      ├── Storybook           the workbench where components are built and reviewed      (stories/, .storybook/)
      └── ui.apli.tech        the public site: landing + hosted Storybook + changelog    (site/)
```

Two pages are for someone using the kit:

- [foundations.md](foundations.md) — the tokens and the floors: widths, breakpoints,
  spacing, type, labels and titles, motion, ink, colour and contrast, elevation, the focus
  ring, the 16px field, the tap floor, icons.
- [library.md](library.md) — the package: what to import, theming, the component
  catalog, and what each component guarantees.

The rest of this folder is for someone working on the kit:

- [landing-page.md](landing-page.md) — the `ui.apli.tech` site: chrome, the build
  pipeline, the server.
- [changelog.md](changelog.md) — the changelog: data model, Storybook deeplinks,
  breaking flags, git-derived contributors.
- [storybook.md](storybook.md) — the workbench: config, theming toolbar, story
  conventions.
- [guidelines.md](guidelines.md) — the Guidelines collection: the shape of a rule,
  the gates that walk the pages, how to add one.
- [release-approval.md](release-approval.md) — the release workflow's environment and
  who approves a waiting run.
- **[Guidelines](https://ui.apli.tech/storybook/?path=/story/guidelines-overview--overview)**
  — a Storybook section, not a page in this folder: what one page may hold, the UI rules for
  colour and theming, the full state set, component choice, destructive actions, and microcopy
  and tone. The link lands on the overview, which lists the pages and the rules the kit has yet
  to meet.

## Where a decision gets recorded

Four places, and the kind of statement picks the home.

**What the kit guarantees** goes in a reader page: a token or a floor in
[foundations.md](foundations.md), a component's promise in [library.md](library.md), a rule
for a screen in `guidelines/`. State the guarantee in words a consumer can act on. A reader
needs to know that every stroked glyph clears 1.5 CSS px; they do not need the sub-pixel
argument that settled on 1.5, and they do not need the name of the gate holding it.

**How a gate works** goes beside the gate: what it discovers, what it cannot measure, and
what a failure means. [AGENTS.md](../AGENTS.md#verification) asks for that, and it is the one
home for it — a reader page that described a gate would be documenting this repository rather
than the package.

**How to contribute** goes in the [README](../README.md#contribute).
[AGENTS.md](../AGENTS.md) holds the rules that need agent judgment.

**Why a design was chosen** goes in the issue. Keep measurements, alternatives, rejected
options, round numbers and quotes in that thread, and link to them instead of maintaining a
second copy.

An issue opens with a problem, so closing it does not itself record a decision. [#198][i198]
asked that "someone has to say which is right and why the others exist" but closed without an
answer in the thread. **When you close an issue that settled something, write the decision into
it**: what was chosen, what was rejected, and who chose if it was a call rather than a derivation.
That gives a guarantee's outcome a record a reader can check.

Code cites a reader page, never an issue:

```js
// why: docs/foundations.md#icons-and-glyphs
```

One line, pointing at a heading. `scripts/doc-refs.test.js` resolves every one of them — the file
has to exist and the anchor has to be a heading in it — so a citation that stops landing turns a
build red rather than misleading a reader who follows it.

A guideline rule has two names and only one of them belongs in a citation. `guidelines/*.md` marks
each rule with a `<!-- rule: id -->` comment, which is the handle its Storybook page and
`stories/guidelines/references.json` use. A citation still points at the rule's **heading**, because
that is what a reader following the link lands on. `guidelines/dense-tables.md#align-numeric-values`
is the citation; `numbers` is the same rule's id. Reading the ids as the citable anchors makes twenty
working links look invented, which is what happened on [#437][i437].

[i437]: https://github.com/apliteni/apliteni-ui/pull/437

[i198]: https://github.com/apliteni/apliteni-ui/issues/198
