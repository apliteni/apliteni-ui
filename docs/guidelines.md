# The guidelines collection

`guidelines/*.md` is the source of all guideline prose and ships in the npm package.
Start at `guidelines/overview.md`. Storybook reads these same documents; it does not
keep a second copy of their rules, reasons, exceptions or captions.

The seventeen rule pages keep their existing live Do/Don't specimens. The Overview
links to each page. The accessibility page also documents aims and measurement limits.

## Editing a page

Edit its Markdown document. Use one `#` title and a short introductory paragraph.
Each rule has a `##` imperative, a stable `<!-- rule: id -->` comment, and paragraphs
labelled `**Why:**`, `**Except:**`, `**Do:**` and `**Don't:**`. An exception is optional;
do not invent one to fill a field. `**Gap #123:**` records a known unmet rule.

Keep each labelled paragraph on one source line. Inline backticks mark code. A source
filename, path or line number never belongs in reader-facing guidance.

The accessibility appendix uses `##` sections with `<!-- section: name -->`, `###`
entry headings and labelled `Apply`, `Checks`, `Limit` or `Note` paragraphs. Repeated
`Limit` paragraphs form the list of limitations for a check.

`stories/guidelines/_markdown.js` loads the Markdown in Node tests and as a Vite asset
in Storybook. Its parser rejects unrecognised fields. The matching `_name.js` module
exports parsed prose and attaches specimen factories by stable rule id. Rule counts
and ids must match, so deleting or reordering a rule cannot silently change its example.

## Specimens and internal references

Specimens use real kit factories. Both Do and Don't examples must pass the shared
accessibility and text-contrast checks; a genuine accessibility failure is explained
in prose rather than drawn. Rules without a pair must explain why.

Internal `kit` entries remain in specimen modules as `{ ref, pattern }` metadata.
They are checked against the implementation but never rendered or packaged as guidance.
The page guideline's stronger `specification-only` policy also forbids selectors,
tokens and function names in its prose; its code mapping stays in the specification.

## Verification

`refs.test.js` checks internal references, rule shape, Markdown coverage, matching
rendered prose and the absence of visible source references, including appendices.
It also proves that a Markdown edit changes rendered content and that mismatched
specimen ids fail. `overview.test.js` discovers the pages, checks every navigation
link against Storybook's own id rules, and verifies the packaged index.

The measurement tests still import the same rule ids and numeric bounds. They now
read their explanatory text from Markdown, including the disabled-contrast ratios.

## Adding a page

1. Add its Markdown document and a matching specimen module exporting `TITLE`,
   `BLURB` and `RULES`, plus `SPEC_CSS` if needed.
2. Add its story calling `guidelinePage({ title, rules, css })`.
3. Add the page/story pair to `_overview.js`, its Markdown link to the Overview,
   and its title to Storybook's `storySort`.
4. Update the collection counts and run `npm test`, the React tests,
   `npm run build-storybook` and `npm pack --dry-run`.
