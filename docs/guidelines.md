# The guidelines collection

`guidelines/*.md` ships in npm and supplies the text Storybook renders.
The Overview links to every rule page.

## Editing a page

Each page has a `#` title and rules, without an introduction or appendix.
Each rule has a short `##` title, a stable `<!-- rule: id -->`, and these fields:

- `**Rule:**` — one sentence stating what to do.
- Optional `**Why:**` — explain only what the rule leaves unclear.
- `**Do:**` and `**Don't:**` — concrete, meaningfully different examples.
- Optional `**Except:**` — necessary boundaries, not history.
- Optional `**Gap #123:**` — a known unmet requirement.

Keep each field on one source line. Backticks mark code. File paths, line numbers,
test names and links to implementation files do not belong in guidelines.

## Show, less tell

A guideline page shows its rule and says the least it can.

Give every rule a picture can carry a rendered do and don't pair, built from kit parts.
Keep each field to a line or two. The rule states what to do, and each caption says what
its picture cannot. Measurements and token names belong in the reader pages; `Except`
keeps the boundaries.

`Why` gives the reason the rule exists, which a picture rarely carries, so a rule may
keep its `Why` beside a specimen pair and most do. What a `Why` may not do is say the
rule again in other words.

The matching story module attaches live specimens by rule id. Rules without a visual
pair render their text examples. Both halves use readable text; explain inaccessible
behaviour in words instead of drawing illegible specimens.

Leave a rule text-only when drawing the failure would break the rule in front of the
reader, when the state depends on a pointer, a keyboard or a viewport a static specimen
cannot set, or when the rule governs an order of work rather than a result. Give the
reason the rule exists first, then name which of those three applies in the same `Why`,
so a missing pair reads as a decision rather than an omission.

`refs.test.js` checks the half of this a test can read: a rule with no specimen pair
carries a `Why`, and the number of pairless rules is asserted, so a page cannot drop out
of the check unnoticed. Whether a `Why` earns its place, and whether a field is a line or
two, is read by a reviewer.

`npm run check:words` reads the other half as a number: a page may carry 60 prose words
per rule, counting every word a reader reads — any introduction, then each rule's title
and the fields it fills — and the check fails a page over that or one that has grown past
the figure recorded for it in `scripts/word-budget.mjs`. An introduction gets no allowance
of its own, so on a page with no rules there is nothing to spend and any introduction
fails. The budget comes from the shortest pages in the collection today, so it stays out
of CI (#576). Run it before handing over a change to a page.

## The ground a page stands on

Every guideline page is reading, so the page is the reading surface rather than the
grey page ground with reading on it. `guidelinePage()` draws that ground; a page it
does not draw — the Overview — takes the same ground from `_layout.js` instead of
painting one of its own. It is a surface and not a card: ten of these pages show a
card as a specimen, and a card around the page would put each of them inside another.

`reading-surface.test.js` mounts every page in both themes and fails any whose title,
rule text, caption, boundary or gap note reads on the page ground.

## Tests and references

`stories/guidelines/references.json` maps rule ids to implementation references for
`refs.test.js`. The guidelines never import that mapping.
`accessibility-coverage.json` keeps the accessibility checks and their declared limits
beside the test that checks coverage. Neither file ships as guideline content.

The page guideline also forbids selectors, tokens and function names in its prose.
Its implementation mapping stays in `stories/guidelines/the-page.test.js`, the gate that
resolves it.

## Adding a page

1. Add its Markdown and a specimen module exporting `TITLE`, `BLURB`, `RULES` and optional `SPEC_CSS`.
2. Add a story calling `guidelinePage({ title, rules, css })`.
3. Add the page to `_overview.js`, the Overview navigation and Storybook's `storySort`.
4. Update collection counts and run `npm test`, React tests, Storybook build and `npm pack --dry-run`.
