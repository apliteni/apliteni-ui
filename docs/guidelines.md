# The guidelines collection

`guidelines/*.md` ships in npm and supplies the text Storybook renders.
The Overview links to the nineteen rule pages.

## Editing a page

Each page has a `#` title and rules, without an introduction or appendix.
Each rule has a short `##` title, a stable `<!-- rule: id -->`, and these fields:

- `**Rule:**` — one sentence stating what to do.
- `**Why:**` — one sentence explaining why.
- `**Do:**` and `**Don't:**` — concrete, meaningfully different examples.
- Optional `**Except:**` — necessary boundaries, not history.
- Optional `**Gap #123:**` — a known unmet requirement.

Keep each field on one source line. Backticks mark code. File paths, line numbers,
test names and links to implementation files do not belong in guidelines.

The matching story module attaches live specimens by rule id. Rules without a visual
pair render their text examples. Both halves use readable text; explain inaccessible
behaviour in words instead of drawing illegible specimens.

## Tests and references

`stories/guidelines/references.json` maps rule ids to implementation references for
`refs.test.js`. The guidelines never import that mapping.
`accessibility-coverage.json` keeps the accessibility checks and their declared limits
beside the test that checks coverage. Neither file ships as guideline content.

The page guideline also forbids selectors, tokens and function names in its prose.
Its implementation mapping stays in the specification.

## Adding a page

1. Add its Markdown and a specimen module exporting `TITLE`, `BLURB`, `RULES` and optional `SPEC_CSS`.
2. Add a story calling `guidelinePage({ title, rules, css })`.
3. Add the page to `_overview.js`, the Overview navigation and Storybook's `storySort`.
4. Update collection counts and run `npm test`, React tests, Storybook build and `npm pack --dry-run`.
