# React components

The kit's React layer supplies components for stateful surfaces: dashboards, tables,
filters, and forms. They use the vanilla kit's `.ui-*` classes and tokens.

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
import '@apliteni/apliteni-ui/react/css';  // React components' shell styles (modal, sort control)
import { DataTable, Modal, Button } from '@apliteni/apliteni-ui/react';
```

Components: `DataTable`, `Pagination`, `StatBand`, `Modal`, `Drawer`, `CommandPalette`, `Dropdown`, `BackLink`, `Snippet`, `Button`, `Badge`, `Card`, `Icon`.

`Snippet` accepts `label`, `code`, `reveal`, and `copyLabel` props. It treats `code`
as plain text and copies it exactly as provided. After a successful clipboard write,
it shows “Copied” for 1.4 seconds. If copying fails, it shows “Copy failed” so readers
can try again or select the text manually.

```tsx
<Snippet label="Terminal" code="npm install @apliteni/apliteni-ui" />
```

Before a reveal snippet, explain that the secret is stored hashed and will not be
shown again, and ask the reader to copy it now. The page decides when to remove it.

`Button` accepts `size="xs" | "sm" | "md" | "lg"` (default `md`). Use `xs`
for a small inline control: `<Button size="xs" variant="ghost" icon="copy" iconOnly>Copy</Button>`.
Its glyph is 13px and its icon-only target is 24×24px; labelled xs buttons use
`--text-xs`. The other sizes keep 16px glyphs.

`CommandPalette` renders the kit's `commandPalette()` markup, class for class, and imports the
kit's ranking rather than repeating it — so a palette a server rendered and the same palette
after a keystroke put the same row first. Two differences from the vanilla one follow from
the React host owning state: it has no Cmd+K binding, since
`open` is the host's prop to set from whatever key it wants; and a destructive row names an
`onConfirm` callback rather than the id of a confirm dialog, which is refused the same way — a
`danger` row with neither renders disabled. `rank={false}` hands the query back through
`onQueryChange` for a palette a server feeds.

The React palette, Modal and Drawer share one dialog stack. Escape closes only the top
one, so dismissing a confirmation leaves the palette open. Vanilla overlays use a separate
stack; do not open a React dialog and a vanilla overlay over each other on the same page.

`Pagination` renders the kit's `pagination()` markup, class for class, so its styles come from
`@apliteni/apliteni-ui/css` rather than from this bundle. One deliberate difference: it takes no
`href`, because a React pager reports through `onPageChange` rather than navigating. Use the
vanilla factory where the steps have to be real links. `PAGE_SIZES` and
`DEFAULT_PAGE_SIZE` are exported here too — the scale is the kit's, so no call site writes
either number. They are declared in this package's own types, and `PAGE_SIZES` is a
`readonly number[]`: pass it to `pageSizes`, but do not add sizes to it.

## What the Modal does with focus

Opening moves focus to the first eligible control in the body, in DOM order, or to
the dialog itself if none exists. Links and disclosure summaries are eligible; hidden
controls, disabled controls, controls inside a closed disclosure and elements with a
negative tabindex are skipped. Tab and Shift+Tab wrap at the ends of the same list.
Escape and a click on the scrim dismiss the dialog and return focus to its opener.

The Modal fades in and out: the scrim fades and the panel rises a few pixels. After `open`
turns false it stays mounted until that transition ends, then unmounts. While it leaves,
focus is already back on the opener and the dialog takes no clicks.

## Drawer

A panel that slides in from an edge of the screen over a scrim. It renders the vanilla
`drawer()` markup, class for class, so it looks and moves like the kit's drawer, and like
`Pagination` its styles come from `@apliteni/apliteni-ui/css` rather than from this bundle.
Group its contents with `DrawerSection` and `KeyValueList`; see Guidelines / Drawers.

```tsx
<Drawer open={open} title="Transaction" onClose={() => setOpen(false)}
  side="right" size="md" footer={<Button onClick={save}>Save</Button>}>
  …
</Drawer>
```

`side` is `right` (default), `left`, `top` or `bottom`. `size` is `sm`, `md` (default) or
`lg`, measured along the slide. `closeLabel` names the close button (default "Close").
Focus, Escape, the scrim, Tab and the return of focus behave as the Modal's do. Like the
Modal, it stays mounted until its exit slide ends. It is portalled to `document.body`.

React Modals, Drawers and CommandPalettes share one stack. When one is open over another,
only the top one takes Escape and Tab, and closing it hands focus back to the one below —
so a destructive palette row that opens a Modal takes one Escape to answer, not one that
closes both. The vanilla `drawer()`, `confirm()` and `commandPalette()` keep a separate
stack that this one cannot see, so do not open a React dialog and a vanilla overlay over
each other on the same page.

## Dropdown

Use `badge: { text: 'Archivado', tone: 'state' }` for off, unset, disabled or archived
states, including translated labels. Explicit `tone: 'neutral'` uses body ink. When tone
is omitted, exact English off/unset/disabled/archive/archived labels fall back to state
ink and Live to live ink; other labels use body ink. This also applies to vanilla `dropdown()`.

`Dropdown` renders the kit's `dropdown()` markup, class for class, and carries
`wireDropdown()`'s keyboard: the arrows open it onto the first row or the selected one and
then walk the ring, stepping over a disabled row and wrapping at both ends; Home and End go
to the first and last; Enter and Space pick the row focus is on; Escape closes and returns
focus to the trigger; Tab closes; a click outside closes it, and opening one closes every
other on the page. Both flavours are here — `variant="select"` is a listbox that writes the
pick into the trigger and moves the tick, `variant="menu"` is an action list — and, as in
the factory, the variant is inferred when you leave it out.

```tsx
<Dropdown items={items} ariaLabel="Row actions" triggerContent="Actions"
  onSelect={(value, item) => run(item)} />
```

**A row can be anything, including a router link.** `row` is handed the item and every prop
the row has to carry — the classes, the role, the tab stop the panel moves itself, the pick
and the click — and you spread them onto whatever element the row should be:

```tsx
import { Link } from 'react-router';

<Dropdown items={items} row={(item, props) => <Link to={item.href!} {...props} />} />
```

That is the shape #304 was opened for, and it is a render prop rather than an `as` because
the row is where a router link needs props of its own: `as={Link}` could pass the item's
`href`, but not the `to`, `state`, `replace` or `prefetch` a real call site writes — and it
could not vary them per row. Every row is still in the arrow-key ring, because the panel
finds its rows by `data-dd-item`, which is in the props you spread.

`open` and `onOpenChange` make the open state controlled, the way `sort` does on `DataTable`;
leave `open` out and the component keeps its own, starting from `defaultOpen`. `onSelect`
reports the item's `value` and the item. Pass `ariaLabel` to a `select` dropdown: a listbox
needs a name, and axe says so — the same reason every vanilla dropdown story passes one.

**`search` puts a field over the rows**, the same one the factory draws, and Guidelines /
Component choice makes it a rule at ten options or any list fed by data:

```tsx
<Dropdown variant="select" label="currency:" ariaLabel="Currency" scroll={220}
  search={{ placeholder: 'Search currencies' }} items={currencies} onSelect={setCurrency} />
```

Typing filters and focus stays in the field, which is a `role="combobox"` naming the row Enter
would pick through `aria-activedescendant`. ↑ and ↓ walk the rows still showing, skip a disabled
one and wrap; Enter picks; Home and End move the caret, because they belong to the text field;
Escape closes and Tab closes. Every open starts from the whole list. A query that matches nothing
shows "No match for “…”" and a nudge — reword either with `search.empty` (where `{q}` stands for
the query) and `search.hint`. With a field in it the panel is a `role="dialog"`, so every row
becomes an option: a row carrying `href` is drawn as a plain option rather than a link, exactly as
the factory draws it — which is what `row` is for when the rows must be router links.

**The match is the kit's, not this package's.** `dropdownMatch()` and `dropdownFiltering()` are
exported from `@apliteni/apliteni-ui` and imported here, the way `CommandPalette` imports
`rankGroups()`, so a list a server rendered and the same list after a keystroke hide the same
rows. `Dropdown.test.tsx` types the same query into the factory-plus-`wireDropdown()` and into
this component and compares what is left.

Two things the factory has that this does not, both deliberate. It emits no `data-dropdown`
on the container, so a page that calls `wireDropdown(document)` cannot adopt a dropdown React
owns — the same decision `Drawer` makes about `data-drawer`; the row and panel hooks stay,
because they are the row contract `docs/library.md` publishes. And it has no `portal: true`: the
panel is a child of the trigger's container, so a dropdown inside `.ui-app__rail`
(`position: sticky` with `overflow-y: auto`) still wants the vanilla factory.

## BackLink

`BackLink` is the kit's `backLink()`, rendered by React rather than through
`dangerouslySetInnerHTML`. It holds the same rules: no address, or a `javascript:` one,
renders nothing; the label is the destination as the sidebar spells it, and one that already
says "Back to" is not said twice; the arrow is `aria-hidden`, so the accessible name says
"Back to" that destination in words.

```tsx
<BackLink href="/invoices?status=open&page=3" label="Invoices" />
<BackLink as={Link} to="/invoices" href="/invoices" label="Invoices" />
```

It renders the anchor itself, so `ui-back` is on the element the shell's
`.ui-app__main > .ui-back` rule looks for — which is the whole reason a stateless component
is here. `as` takes the element the link is drawn as and passes it every prop this component
does not read, which is how a router link gets its own `to`; `href` is still required,
because it is what the `javascript:` guard reads.

## Work on them

From the repo root — one `npm install` covers the workspace:

```bash
npm test -w react            # vitest
npm run storybook -w react   # http://localhost:6007
npm run build                # tsup -> react/dist/
```

If port 6007 is occupied, Storybook tries higher ports until one is free. The root
Storybook composes these components by following that drift — it probes 6007 through 6016 (the window Storybook's own
port-finder searches) and takes the first one whose `index.json` lists every story
file this workspace has on disk. A stranger on the port fails that check and is
never shown under "React components"; the section is simply absent, and the root
Storybook's terminal says which ports it tried and what it found.

The probe runs once when the root Storybook starts. If you start the React Storybook
later, restart the root Storybook to include it.

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

### Tables paged by a server

`page` and `onPageChange` make pagination controlled, the same way `sort` does — and the same
rule applies: choose one mode per table and keep it. Given a `page`, the table renders `rows`
exactly as handed to it and never slices or re-orders them; the range comes from `page`,
`pageSize` and `total`:

```tsx
<DataTable columns={columns} rows={pageOfRows} selectable={false}
  page={page} total={total} pageSize={size} onPageChange={fetchPage}
  pageSizes={PAGE_SIZES} onPageSizeChange={setSize} loading={loading} />
```

`total` is required with `page`: it is the row count of the whole result, not of `rows`. Pass
`total={null}` for a result whose size is not known, and then `hasMore` is required too — the
pager offers Prev and Next alone, because no other control can be computed without a last
page. Leave both out and the call does not type-check: a pager told nothing can only draw two
dead buttons.

Without `pageSize`, a controlled table takes the page size from `rows.length`, the page it was
handed. Pass `pageSize` whenever the last page can be shorter than the rest.

A controlled table never sorts the rows it is handed. Changing the sort asks its owner for page
1 through `onPageChange`, which is the most a controlled table can do about it. Keep `sort`
controlled too, so the headers can say which column the server ordered by. Without it the
headers still report a press through `onSortChange`, but no column announces `aria-sort` or
draws a direction, because the table does not know the server's order.

Omit `page` to keep the table's own paging: it slices `rows` in memory and the total is
`rows.length`. `pageSizes` offers a size control in either mode — without a `pageSize` prop the
table remembers the size the reader picked, with one it reports the choice through
`onPageSizeChange` and shows what it is given. A table that owns its page returns the reader to
page 1 when the size changes. A controlled table only calls `onPageSizeChange`, once, and
leaves the page to its owner: a new size means page 1, so fetch page 1 at that size. It does
not also call `onPageChange(1)`, because that second call would carry the old size.

`pageSize` is read the way the pager reads it, so the rows and the range always agree: a
fraction is truncated, and `NaN`, zero or a negative number falls back to the default. A value
taken from a URL, such as `Number(params.get('size'))`, is safe to pass as it is.

`pager={false}` renders no pager at all, for a surface that supplies its own. One page of
content renders none either: the pager keeps GOV.UK's rule that pagination for a single page is
not shown, and with a size control on offer it keeps the row count and that control alone.

Focus stays on the step the reader pressed, so they can press it again. At an end that step is
disabled, and a browser drops focus from a disabled control to the page body. So once the new
page has arrived, the pager moves focus to the nearest step that can still move, never into
the rows. It moves focus only after a press in the pager, and never while `loading`.
Clearing the page-jump box, or typing into it and then pressing a step, does not change the
page.

`pageSize` defaults to `DEFAULT_PAGE_SIZE` (100). **Breaking:** it used to default to 4.

## KeyValueList and DrawerSection

KeyValueList displays one record’s facts with labels beside their values. Pass rows
with a label and a React value. Set `columns={2}` to show two label-value pairs on
each line. Null and undefined values are displayed as an em dash. Boolean values
are displayed as `false` or `true`, zero remains visible, and strings are preserved.
Set `redacted` on a row to display “Hidden” with an eye-off icon without rendering
the value. Below 560px, each label appears above its value, and the layout
changes to one column.

DrawerSection groups content under a heading and adds a hairline between adjacent
sections. Its `headingLevel` defaults to 3. Import both the kit CSS and the React
CSS. Use a table for figures that readers need to compare down a column.

```tsx
import { DrawerSection, KeyValueList } from '@apliteni/apliteni-ui/react';
import '@apliteni/apliteni-ui/css';
import '@apliteni/apliteni-ui/react/css';

<DrawerSection title="Transaction">
  <KeyValueList rows={[
    { label: 'Reference', value: <a href="/invoices/1001">INV-1001</a> },
    { label: 'Amount', value: '€ 1,240.00' },
    { label: 'Account', redacted: true },
    { label: 'Note' },
  ]} />
</DrawerSection>
```
