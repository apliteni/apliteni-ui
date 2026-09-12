# A dropdown that can be searched, and the rule for when one has to be

Closes #283.

## What this is about

The finance portal's filter dropdowns hold between 12 and several hundred options each, and the
kit gave them no way to narrow the list. The panel stops growing at 300px, which shows seven rows
that carry no description and five that do, so past that the reader scrolls for a word they could
have typed.

## What changed

**`dropdown({ search: true })`** pins a text field above the rows and filters them as the reader
types. It is opt-in, and a dropdown without it renders byte-for-byte what it rendered before —
every new rule keys on a class only the search variant emits.

- **The match is anywhere in the label**, ignoring case and accents, and rows keep their order.
  "dollar" finds the US, Canadian and Australian dollars; "kron" finds the Danish krone, the
  Icelandic króna and the Swedish krona. Descriptions are not searched, because the match is not
  highlighted and a row shown for text in its second line leaves the reader hunting for why.
- **Focus stays in the field.** It is a `role="combobox"` controlling the list, and the row Enter
  would pick is named by `aria-activedescendant` rather than focused, so the reader can keep
  typing. The field carries `--ring`; the active row takes the hover fill and a 2px accent bar,
  because two rings of equal weight leave the reader unable to tell focus from the pick.
- ↑ and ↓ walk the rows still showing, skip a disabled row and wrap. Enter picks, Escape closes
  and returns focus to the trigger, Home and End belong to the text field. The pointer moves the
  active row too, so Enter never picks a row other than the one under it.
- **A query that matches nothing says so** — `No match for “…”` and a nudge, in a `role="status"`
  region. A filter gets a nudge and no action, per Guidelines / Microcopy.
- **The panel is a dialog.** A listbox may own only options and groups, so a field inside one
  fails axe's `aria-required-children`. With search on the panel is a `role="dialog"` named after
  the dropdown, and the listbox sits inside it beside the field.

**A guideline.** Guidelines / Component choice gains the rule for when a dropdown must have one:
ten options or more, or any list fed by data. Under six, a field only puts one more stop between
the trigger and the rows; six to nine is the author's call. It cites kit code, and `refs.test.js`
resolves each citation to a file, a line and a literal on that line.

**A specification section.** `docs/specification.md#a-dropdown-with-a-search-field`.

## The threshold is the rule, not a proposal

It shipped on this branch marked *proposed in #283 and not yet agreed* — the number was the
owner's to set. **Artur has set it.** Ten options or more, or any list fed by data, is now stated
as the rule the kit holds, in the guideline (`_component-choice.js`), in the specification and in
the changelog. Nothing about the behaviour changed; three sentences that hedged no longer do.

## Four defects found after the first round, and how each was settled

- **The field did not take focus in a real browser.** Opening transitioned `visibility` from
  hidden, so the panel was still hidden when `openDropdown()` focused the field, Chromium dropped
  the focus, and typing went nowhere. jsdom cannot see this; a Storybook run did. The open search
  panel now transitions opacity and transform only; closing still fades.
- **An IME's committing Enter picked a row.** While an input method is composing, Enter, the
  arrows and Escape in the field belong to it. Guarded on `isComposing` *and* `keyCode 229`,
  because Safari sends the committing Enter with `isComposing` false.
- **A divider above the first group a query left standing.** A sibling combinator does not skip a
  `display: none` box, so `.ui-dropdown__section + .ui-dropdown__section` still drew a rule and
  5px above the next group. The selector now keys on groups that are not `[hidden]`, which covers
  the factory's preset `query` as well as a typed one. A dropdown without search matches the same
  groups as before.
- **iOS zoomed into the field.** iOS Safari zooms into a focused field under 16px, and opening
  the panel focuses this one. Under `(pointer: coarse)` the field is a real 16px — not a scaled
  one, because the zoom reads the computed size and a transform would shrink the border and the
  ring with it.

## Rebase

Rebased onto `origin/main`, which had moved five releases under this branch: **#292** (labels and
titles in sentence case, five type ranks, the card title as a heading — #268/#269), **#289** (a
quieter drawer, drawer and motion guidelines), **#293** (the command palette), **#287** (the
tooltip, 0.28.0) and **#290** (the back link, 0.29.0), over **#285** (the flat card, 0.27.1).

- **Version is now 0.30.0**, not 0.28.0: #287 took 0.28.0 and #290 took 0.29.0, and a new API on
  a component is a minor. The changelog entry for this branch sits above #290's.
- **`src/styles/icon-size.test.js`: 64 → 66.** The branch was written against 58 subjects and
  claimed 60 for the search glyph's width and height; main had reached 64 through the command
  palette's two glyphs and the back link's arrow. Re-measured on the merged tree rather than
  added up: 66.
- **`src/styles/typeface-roles.test.js`: 49 → 50.** Main reached 49 through the card title, the
  drawer section title, the palette's three, the key legend's `<kbd>`, the tooltip and the back
  link. `.ui-dropdown__search-input { font: inherit }` is the 50th. Re-measured, not assumed.
- **`docs/specification.md`:** both sides' sections kept. Main added *The drawer* and *The hover
  readout* where this branch added *A dropdown with a search field*; the search section now sits
  with the other two dropdown sections, above the drawer.
- **`docs/library.md`:** both sides' rows kept. The `dropdown()` row is this branch's, with
  `search` in the signature; main's `tooltip()` and `backLink()` rows and its `nav()` note stand.
- **Main's motion gate answered.** #271/#272 added a sweep that asks how every rule which shows or
  hides an element moves. `.ui-dropdown__list [hidden] { display: none }` now carries
  `/* motion: still — a row the query no longer matches is gone on the next keystroke */`, the
  same answer `.ui-cmdk__item[hidden]` gives on the command palette. Both branches reached the
  same shape independently; there was nothing to choose between.
- **Three citations moved:** main added three lines to `dropdown.js` above `ddMatch` and dropped
  two above the `dropdown.css` rules cited. `refs.test.js` caught all three.
- **`.storybook/preview.js` was not touched** by this branch — it adds no page, only a rule to an
  existing guideline and stories to an existing file — so there was no `storySort` collision.

Nothing here was a design collision: main and this branch never changed the same rule differently.

## Held by

`src/components/dropdown-search.test.js` — 23 tests that drive the kit's own wiring with real
events, over the shared gates every component answers to (contrast, the focus ring, icon sizing,
typeface roles, sentence case, the 24px target, the motion sweep, axe on every story). The
rendering is held by the browser only: jsdom does not rank the UA sheet below author rules, so it
cannot show that `.ui-dropdown__item`'s `display: flex` would outrank `[hidden]`.

```
root  npm test           1362 tests, 1361 passing, 1 skipped, 0 failing
react npm test            300 tests, 300 passing
      npm run build       react/dist built
      build-storybook     completed
```

The one skip is the opt-in `CONTRAST_ACCENTS=1` matrix.

One gate is sensitive to the machine rather than to the diff: `stories/contrast.test.js` fails its
120s wall-clock ceiling when the host is busy, and it failed on two earlier runs here at 120.1s
and 154.1s before passing at 111.1s in the green run above. It is not this branch:
**`origin/main` fails the same gate on the same host**, at 120.4s under a full `npm test` measured
back to back. Run on its own the branch walks in 109.0s against main's 90.2s; it adds 550 of
12,802 judged pairs (+4.3%), which is ~4s, and the rest is contention. The deterministic companion
gate — the style-cache miss rate, which the file's own comment calls the one that catches a real
regression — is 0.2053 here against 0.1959 on main, both well under the 0.30 ceiling.

## Proof

Screenshots at 1440px and 390px, light and dark, of every screen this touches — the five search
stories, Guidelines / Component choice with the rule as it now reads, and the changelog page with
0.30.0 above 0.29.0. Paths are in the worker's report.

The merged tree was also driven in a real browser rather than only in jsdom: opening the panel
puts focus in `.ui-dropdown__search-input` (`role="combobox"`), typing `kron` leaves the Danish
krone, the Icelandic króna, the Norwegian krone and the Swedish krona showing with the first of
them active, and ↓ then Enter writes `Icelandic króna (ISK)` into the trigger and closes the panel.

- [x] A person meets it in something running.
- [ ] Exercised against the finance portal. Not done here and not claimed: the consumer installs a
      published version, so this is provable only after a release.
