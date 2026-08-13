# The guidelines collection

Five pages of UI rules, rendered as Storybook stories under `Guidelines/`, plus an
Overview that indexes them. A page is a **content module** holding the rules and a
**story module** that hands them to the shared shell.

```
stories/guidelines/
  _layout.js            The shell: specimen stage, page CSS, guidelinePage().
  _<page>.js            One page's TITLE, BLURB, RULES, and its specimen CSS.
  <Page>.stories.js     The story: a Guidelines/ title and one export.
  _overview.js          ENTRIES — the five pages in order — and the index data.
  Overview.stories.js   The index table.
```

## The shape of a rule

A rule is a plain object in a content module's `RULES` array.

| Field | | Holds |
|---|---|---|
| `imperative` | required | The rule as an instruction. It is the page's `<h2>`. |
| `why` | required without a pair | One sentence on what breaking it costs. Rendered only when the rule has no specimens — a pair says the same thing faster. |
| `doHtml` / `dontHtml` | both or neither | Functions returning the specimen pair's markup. |
| `doCaption` / `dontCaption` | required with a pair | What the picture cannot say. |
| `except` | optional | Where the rule stops applying. Leave it out rather than empty — not every rule has a boundary, and inventing one to fill the field is worse than an absent one. |
| `kit` | optional | `[{ ref: 'src/styles/button.css:68', pattern: '.ui-btn--danger:hover' }]` — code in this repo that already applies the rule, so a reader can copy a working one. |
| `unmet` | optional | `{ issue, note }` — the kit does not meet this rule yet, and the issue tracking it. |
| `id` | | A handle for talking about the rule. Nothing renders it. |

A content module also exports `TITLE` (the page heading), `BLURB` (one line for the
Overview row) and, when its specimens need a stage of their own, `SPEC_CSS` — a
`<style>` string appended after the shared CSS.

## The contract every page keeps

Every specimen is a real kit factory rendered live, the don'ts included. What is wrong
in a don't is colour, wording, or the choice of component — never broken markup.

## The gates that walk these pages

Two repo-wide gates render every story in `stories/`, including these, in both themes:

- `stories/a11y.test.js` runs axe over WCAG 2.0/2.1 A + AA. Both halves of every pair
  must pass it.
- `stories/contrast.test.js` measures every text-owning element against the background
  composited above it.

So a don't that is a genuine accessibility failure cannot be drawn. Two rules carry
no pair, and one specimen is drawn short of what it would otherwise show:

| Where | What is missing | Why |
|---|---|---|
| `accent-strong` (Colour and theming) | the pair | The honest don't is white on `--accent`, which measures 3.87:1 in dark Nebula. Drawing it turns `contrast.test.js` red. |
| `both-themes` (Colour and theming) | the pair | "Check both themes" is an act, not an appearance. There is nothing to photograph. |
| `transientDont` (Component choice) | the toast's `action` | A warn `toast()` with an action paints `--amber` ink that misses AA in light (#131), and a specimen of one rule must not also be a specimen of an unrelated fault. |

A rule with no pair stands on its `why` instead.

## The collection's own gates

`stories/guidelines/refs.test.js` resolves every `kit` entry on every page: the file
exists, the line exists, and the line contains the entry's `pattern`. A failure names
the page, the rule, the reference, and where the pattern moved to — so a refactor that
shifts a cited line fails CI instead of pointing a reader at the wrong code. The same
file checks each rule's shape: an `imperative` that says something, a pair that is both
halves or neither, captions on a pair, a `why` on a rule without one, and an `unmet`
that is `{ issue, note }`.

`stories/guidelines/overview.test.js` is the index gate. It never enumerates the pages
— it discovers every module beside it that publishes `RULES`, so a sixth page fails the
build until `ENTRIES` in `_overview.js` lists it. It also checks that every link the
index builds is a story id Storybook publishes, and that the ids the last static build
published still match. That last check skips when `storybook-static/` is absent.

## Story ids

A story's URL id comes from its **export name**, not its title. `Guidelines/The full
state set` exports `StateSet`, so the story is `guidelines-the-full-state-set--state-set`
— a link built from the title alone is a 404 on two of the five pages.

`_overview.js` reproduces Storybook's two-step rule (`startCase`, then `sanitize`)
rather than importing it, so the page bundles no Storybook internals. `overview.test.js`
holds the reproduction to Storybook's real `toId` and `storyNameFromExport`.

## Adding a page

1. Write `stories/guidelines/_<page>.js` exporting `TITLE`, `BLURB` and `RULES`, plus
   `SPEC_CSS` if its specimens need a stage the shell does not give them.
2. Write `stories/guidelines/<Page>.stories.js`: a default export with
   `title: 'Guidelines/<Title>'` and `parameters: { layout: 'fullscreen' }`, and one
   named export whose `render` calls `guidelinePage({ title, rules, css })`.
3. Import both modules in `_overview.js` and add the pair to `ENTRIES`, in the order
   the page should read on the index.
4. Add the title to the `Guidelines` list in `.storybook/preview.js` `storySort`, or the
   sidebar sorts it last.
5. Run `npm test`, then `npm run build-storybook`, then `npm test` again so the
   built-ids check runs against the new page.
