# React components

Source for the kit's React layer — for surfaces that hold real client state
(dashboards, tables, filters, forms). They render the same `.ui-*` classes and
tokens as the vanilla kit, so the two layers can't drift.

This directory is a **private workspace**, not a package. It builds to `react/dist/`
and ships as the `@apliteni/apliteni-ui/react` subpath of the kit — one package, one
version, one pin. There is no `@apliteni/apliteni-ui-react` on npm.

**Decision rule:** does this surface hold meaningful client state?
No → use the vanilla factories from `@apliteni/apliteni-ui`.
Yes → use these React components.

## Install (as a consumer)

```bash
npm install @apliteni/apliteni-ui react react-dom
```

The kit declares no dependency on `react` or `react-dom`, so install them yourself
(18 or newer). Miss them and the import fails with a module-not-found error.

## Use

```tsx
import '@apliteni/apliteni-ui/css';        // kit tokens + .ui-* classes
import '@apliteni/apliteni-ui/react/css';  // React components' shell styles (modal, pager)
import { DataTable, Modal, Button } from '@apliteni/apliteni-ui/react';
```

Components: `DataTable`, `Modal`, `Button`, `Badge`, `Card`, `Icon`.

## What the Modal does with focus

Opening moves focus to the first eligible control in the body, in DOM order, or to
the dialog itself if none exists. Links and disclosure summaries are eligible; hidden
controls, disabled controls, controls inside a closed disclosure and elements with a
negative tabindex are skipped. Tab and Shift+Tab wrap at the ends of the same list.
Escape and a click on the scrim dismiss the dialog and return focus to its opener.

## Work on them

From the repo root — one `npm install` covers the workspace:

```bash
npm test -w react            # vitest
npm run storybook -w react   # http://localhost:6007
npm run build                # tsup -> react/dist/
```

6007 is a request, not a promise: if something else already holds it, Storybook
walks upward to the next free port. The root Storybook composes these components
by following that drift — it probes 6007 through 6016 (the window Storybook's own
port-finder searches) and takes the first one whose `index.json` lists every story
file this workspace has on disk. A stranger on the port fails that check and is
never shown under "React components"; the section is simply absent, and the root
Storybook's terminal says which ports it tried and what it found.

The probe runs once, while the root Storybook boots. Start this one afterwards and
you have to restart the root Storybook before it appears.

The bare `@apliteni/apliteni-ui` specifier in this source resolves to the kit itself
once installed. In the repo there is no copy to resolve to, so `kit-alias.ts` points
vitest and Storybook straight at `../src/` — which is why the class-name parity tests
now compare against the working tree rather than the last published release.

### Tables with another presentation of the same rows

Pass `selectable={false}` to omit selection controls and their callbacks. Existing callers
that supply selection callbacks retain the checkbox column by default.

`sort` and `onSortChange` make sorting controlled. Both presentations can use the exported
`sortTableRows` helper, so initial order, stable ties and later changes agree:

```tsx
const [sort, setSort] = useState<TableSort<Row>>({ key: 'name', dir: -1 });
const ordered = sortTableRows(rows, sort);

<DataTable columns={columns} rows={rows} selectable={false}
  sort={sort} onSortChange={setSort} />
```

Render the sibling list from `ordered`. Omit `sort` to keep the table's own state;
`onSortChange` can also observe that uncontrolled state. Set `key: undefined` to preserve
input order. Import `TableSort` and `sortTableRows` from `@apliteni/apliteni-ui/react`.

Changing the sort returns the table to its first page. The comparator uses JavaScript
`<` and `>`; use consistently typed, comparable values in sortable columns. Ordering of
mixed types, missing values and `NaN` is not guaranteed. `sortTableRows` always returns
a new array, including when `key` is `undefined`.

Choose controlled or uncontrolled once per table. Passing `sort` for a while and then
dropping it is not supported: the table falls back to the sort state it started with, not to
the one it was last given.
