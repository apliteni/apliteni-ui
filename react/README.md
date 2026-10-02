# React components

The kit's React layer supplies components for stateful surfaces: dashboards, tables,
filters, and forms. They use the vanilla kit's `.ui-*` classes and tokens.

This directory is a **private workspace**, not a package. It builds to `react/dist/`
and ships as the `@apliteni/apliteni-ui/react` subpath of the kit — one package, one
version, one pin. There is no `@apliteni/apliteni-ui-react` on npm.

Use React components for new React screens. The vanilla factories are deprecated
and scheduled for removal under #429. This version still ships them, working as
before: keep existing vanilla surfaces on them, and move a surface to React when
you next change it.

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

Both stylesheets. The React one adds what React's own components need — it carries no tokens, no
reset and none of the kit's control CSS, so it cannot stand in for the first import.

Components: `Success`, `SuccessPanel`, `SuccessCheck`, `Checkbox`, `Switch`, `SearchField`, `EmptyState`, `DataTable`, `Pagination`, `StatBand`, `Modal`, `Confirm`, `Drawer`, `CommandPalette`, `Dropdown`, `BackLink`, `Tooltip`, `Snippet`, `Tabs`, `Button`, `Badge`, `Pill`, `StatusDot`, `Card`, `Callout`, `Icon`.

`Pill` renders metadata with the existing pill spacing. Omit `variant` for neutral
metadata or use `live` or `soon`. Its children accept React content.
`StatusDot` takes `live` (default `false`). Place it beside visible status text;
it is decorative by default. Use `aria-label` or `aria-labelledby` to expose a
meaningful dot as a named image. Neither component announces changes automatically.
Both forward a span ref and native span attributes, including `className`.

```tsx
<Pill variant="soon">Coming soon</Pill>
<span><StatusDot live /> API online</span>
```

`Snippet` accepts `label`, `code`, `reveal`, `copy`, `copyLabel`, and `children` props. It treats `code`
as plain text and copies it exactly as provided. After a successful clipboard write,
it shows “Copied” for 1.4 seconds. If copying fails, it shows “Copy failed” so readers
can try again or select the text manually.

```tsx
<Snippet label="Terminal" code="npm install @apliteni/apliteni-ui" />
```

Set `copy={false}` to omit the copy button. Supply React children for highlighted
text using the existing `.k` (command), `.f` (flag), `.s` (string), `.u` (URL), and
`.c` (comment) classes. Keep `code` as the original source: copying always uses it,
regardless of the displayed children. Neither strings nor children are parsed as HTML.

Build the children from `code` with `codeTokens`, the same tokenizer the vanilla
`hlShell` and `hlCode` use, so the text on screen cannot drift from the text the
button copies. Writing the spans out by hand means keeping two copies of the string
in step. The second argument is the language — `shell` (the default), `json` or
`ts`; `codeLanguages` lists them.

```tsx
import { codeTokens } from '@apliteni/apliteni-ui';

const code = '{ "url": "https://example.com/mcp" }';

<Snippet label="mcp.json" code={code} copyLabel="Copy configuration">
  {codeTokens(code, 'json').map(({ cls, text }, at) =>
    cls ? <span key={at} className={cls}>{text}</span> : text)}
</Snippet>
```

The copy button is icon-only: `copyLabel` is its accessible name and its tooltip
rather than visible text, so name what is being copied — “Copy command”, “Copy
configuration”. It still shows words while it confirms.

Before a reveal snippet, explain that the secret is stored hashed and will not be
shown again, and ask the reader to copy it now. The page decides when to remove it.

`Callout` accepts `children`, optional `actions`, and an `icon` override. `neutral` is the default.
The other variants are `info`, `success`, `warn`, and `danger`. Only `danger` uses `role="alert"`.

```tsx
<Callout variant="warn" actions={<Button size="sm">Review period</Button>}>
  <b>Incomplete.</b> This period is still open.
</Callout>
```

`Button` accepts `size="xs" | "sm" | "md" | "lg"` (default `md`). Use `xs`
for a small inline control: `<Button size="xs" variant="ghost" icon="copy" iconOnly>Copy</Button>`.
Its glyph is 13px and its icon-only target is 24×24px; labelled xs buttons use
`--text-xs`. The other sizes keep 16px glyphs.

`Button href="/reports"` renders a native link and forwards an anchor ref. Without
`href`, it remains a native button. `leading={<VendorMark />}` puts decorative
caller artwork before the label and takes precedence over `icon`; artwork must
contain no focusable elements. Use visible children or an explicit accessible name.
Disabled links leave the tab order; busy links keep focus. Both remove their href
and block activation until enabled. Anchor attributes such as `target`, `rel`,
and `download` pass through. The kit does not supply vendor artwork.

A `className` you pass is added to the kit's classes rather than swapped for them,
and the component's own `aria-busy`, `aria-disabled` and `data-btn-*` attributes win
over anything you spread in, so a busy control cannot be made to read as idle. An
icon-only control with no children, no `icon` and no label ships nameless on purpose:
the gap then shows up in an accessibility check instead of reading as satisfied.

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

## EmptyState

`EmptyState` uses the vanilla layout. `variant` selects `first-run`, `no-matches`,
`not-found`, or `not-yet-built` copy; `title`, `sub`, and `icon` override it.
`art` accepts a vanilla illustration name, trusted SVG string, or React node; `actions` accepts React nodes. Use at most one primary action and one ghost
action. The page supplies its own h1; EmptyState uses vanilla’s div title.

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

## Tabs

Tabs is controlled through `value` and `onChange`. Pass items with unique values, labels, optional counts, and React panel content. Provide a label for the tablist and a value that matches one item. Inactive panel content is unmounted.

Arrow keys move between tabs and wrap from the last tab to the first. They also activate the selected tab. Home and End select the first and last tabs. Tab moves to the selected panel. New panels use the kit’s fade animation, which is shortened when reduced motion is enabled.

## Confirm

Use `Confirm` before an action that has a cost. Put the object name in `title`. In
`body`, explain what will change and whether the change can be reversed. Give both
buttons clear, specific labels. For an undoable action, use a toast with Undo instead.

```tsx
<Confirm open={open} title="Revoke demo token?"
  body="This token will stop working immediately. You cannot restore it."
  confirmLabel="Revoke token" cancelLabel="Keep the token" danger busy={saving}
  onConfirm={revokeToken} onCancel={() => setOpen(false)} />
```

The consumer controls `open` and `busy`. `Confirm` does not wait for `onConfirm` or
close itself. Set `busy` while saving. This keeps focus, prevents repeated presses, and
announces progress. Without `danger`, the committing button uses the primary tone.

Escape, the scrim, the close button, and the safe action call `onCancel`, even while
busy. Closing the dialog does not cancel a write that has already started.

`Confirm` uses Modal's focus trap, focus return, and reduced-motion transitions. When it
opens, focus goes to the safe action. It renders an `alertdialog`, named by its title
and described by its body. Modal also accepts
`initialFocusRef` for a mounted, focusable element inside its panel. Without it, Modal
uses its normal opening focus.

## Timeline

`Timeline` displays a record’s events in the order provided. Pass events from oldest
to newest, with stable IDs, machine-readable `dateTime` values, and formatted
`timestamp` text. Place Timeline on a page or card reading surface, never a grey
fill; the standalone stories compose it inside `Card`.
Descriptions should say what changed and to where. Optional `kind` accepts
`person`, `rule`, or `reversal` (`TimelineEventKind`); these show the kit’s user,
bolt, or refresh glyph in a 20px ring. The last event is newest and its ring is
filled, using the danger colour for a reversal. Events without a kind keep their
dot. Mixed histories mute older dots; older reversal glyphs keep danger ink.

Initial history stays still, including history loaded into an empty list.
New IDs added to a non-empty history enter with the kit’s slide-up motion (400ms)
and marker scale-in (250ms, delayed 60ms). Existing IDs stay still when reordered
or edited. Reduced motion disables the entrance. Optional `relativeTimestamp`
(such as "just now") appears beside the absolute stamp only on the newest row,
in accent ink. The caller updates this text; Timeline does not run a clock.

```tsx
<Timeline aria-label="Record history" events={[
  {
    id: 'created', actor: 'Demo operator', dateTime: '2026-09-01T09:00:00Z',
    timestamp: '1 Sep, 09:00 UTC', description: 'Created the record in Unassigned.',
    meta: 'Batch DEMO-12',
  },
]} />
```

Omit `undo` for read-only events. For a reversible batch, pass
`undo: { label: 'Undo batch DEMO-12', onUndo }`. The app checks permissions,
reverses the entire batch, and adds a new event without a confirmation dialog. Timeline only calls `onUndo`; it does not
modify history.
Import both the kit CSS and React CSS. The Privileged story shows Undo adding a reversing event.

## Fields

`TextField`, `TextArea`, `SelectField`, and `FileField` pair a label with a native
control. Each creates its own IDs and links hints or errors automatically. Use
native control props. `SelectField` accepts option children. `TextField` takes
text, number, email, password and search, forwards its ref to the input, and
places a decorative kit glyph with `icon` — the same glyph names `Button` and
`Dropdown` take. Number fields can combine a glyph with a `unit`.

```tsx
<TextField label="Weight" type="number" unit="kg" required />
<TextArea label="Notes" hint="Optional" />
<SelectField label="Currency"><option>EUR</option><option>USD</option></SelectField>
<FileField label="Attachment" accept=".pdf" hint="PDF, up to 5 MB."
  onFileChange={file => setAttachment(file)} />
```

`FileField` accepts one file from a picker or a drop and reports it through
`onFileChange`. Use `accept` and `hint` to describe allowed file types and size.
Your application must validate files before upload.

## File drop

`FileDrop` is the compact drop: one row with the button that opens the picker and
the accepted types beside it, and a drop target painted only while a file is over
the region. Use it where a file joins a list on the page; use `FileField` where a
labelled, field-sized picker belongs. The guideline page states when to use a row,
a region or a dialog.

```tsx
<FileDrop note="PDF or CSV, up to 10 MB" accept=".pdf,.csv"
  file={upload} onFile={send} onRemove={clear} onRetry={send} />
```

Your application owns the upload and supplies the `file` it is holding: the
name, the `size` already written for a reader, `progress` while it uploads, and
the `error` when it failed. A file with no `status` is uploading, so a file
handed over before the request starts never reads as uploaded. A status the row
draws shows a mark and a word; where you give `progress` the track says it
instead, and the word goes to the track's accessible name. The file reads as a
stack: the name on top with the actions at its end, the size — or the failure
message — under it, and the track the full width below. No tier takes a second
line. The name truncates its stem and keeps its extension, with the whole name in
a `title`, and nothing is hidden or moved at any width. `Remove` is the icon-only
`x`, named by `removeLabel`; `Retry` keeps its word. Both appear only when you
handle them. Children render above the row, inside the region the target covers;
pass `dragging` to drive that target from a parent. `accept` filters the system
picker only — validate type and size yourself.

Use `Field` when an existing labelled control needs the kit frame. Spread its
render-prop attributes onto one labelable control, and apply the existing control
class and invalid styling as appropriate:

```tsx
<Field label="Due date" hint="Use the delivery date." required>
  {control => <input {...control} className="ui-input" type="date" />}
</Field>
```

The frame supplies a stable ID, required state, and linked hint/error messages.
An optional `id` lets the caller choose the control ID; it must be unique.

### Search

`SearchField` is the toolbar's search box: a search glyph, a native
`type="search"` input, and no visible label, so the row keeps the height of the
unlabelled controls beside it. `ariaLabel` is required and is the control's only
name. It forwards its ref and the native input props, and `className` joins
`.ui-input`. There is no clear button — see the specification for why.

```tsx
<div className="ui-toolbar">
  <SearchField ariaLabel="Search invoices" placeholder="Vendor or number"
    value={query} onChange={e => setQuery(e.currentTarget.value)} />
  {/* then the filters, then the view switch */}
</div>
```

Put it first in a `.ui-toolbar`. Above 560px it is the control there that grows
into the slack the others leave; at 560px and below it takes a line of its own
and the rest of the row wraps under it. Use `TextField` instead wherever the
field stands in a form and a visible label belongs over it.

## Toast

Wrap your app in `Toast`, then call `useToast()` inside it to add a notice.
Pass `title`, optional `text`, and a `tone`: success (default), danger, warn, info,
or neutral. Notices disappear after five seconds, pausing while hovered or focused.
Danger notices are announced assertively; other tones are polite. An `action` with a `label` and
`onClick` stays until selected or dismissed. New notices appear at the bottom.

```tsx
function SaveButton() {
  const push = useToast();
  return <Button onClick={() => push({ title: 'Saved', text: 'Your changes were saved.' })}>Save</Button>;
}

<Toast><SaveButton /></Toast>
```

## ThemeToggle

ThemeToggle uses the existing topbar button. It shows the current theme and the
action that will happen next. Add `labelled` to display the current theme beside
the button.

```tsx
import { ThemeToggle, THEME_INIT_SCRIPT } from '@apliteni/apliteni-ui/react';

<ThemeToggle />
<ThemeToggle labelled />
```

### Contract

| Surface | Contract |
| --- | --- |
| Props | `ThemeToggleProps` has one optional prop: `labelled?: boolean`, default `false`. There are no controlled-value or callback props. |
| Choices | Each press cycles `dark` → `light` → `auto` → `dark`. Auto shows a monitor icon and keeps its own label even when the resolved theme changes. |
| Storage | Explicit choices use localStorage key `apliteni-strategy-theme`. Existing `dark` and `light` values work without migration. `auto`, missing values and unknown values follow the OS; mounting does not rewrite storage. |
| DOM | On mount, the control sets `data-theme-choice` to dark, light or auto and `data-theme` to dark or light on `html`. Auto resolves to light when `(prefers-color-scheme: light)` matches, otherwise dark. An existing `data-theme-choice` takes precedence on mount; unknown attribute values become auto. |
| Updates | Mounted controls follow OS changes in auto mode and storage changes from other tabs. A press dispatches a plain `apliteni-theme-choice` event on `window`, with no payload; read the root attributes for the choice and resolved theme. OS and storage updates do not dispatch that event. |
| Storage failure | The button still works and retains its choice on the current page. Persistence across reloads requires working storage. |
| Before paint | `THEME_INIT_SCRIPT: string` reads the same stored values and sets only `data-theme`. It neither writes storage nor subscribes to OS changes; mounted controls handle later updates. Server rendering starts with the Auto label and does not set root attributes. |

Place `THEME_INIT_SCRIPT` in an inline `<head>` script before styles load so the theme
is set before the first paint. Allow this script through your Content Security Policy
with a nonce or hash. The component applies the preference when React mounts, but it
cannot change an earlier paint.

```tsx
<script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
```

## AppShell

AppShell includes the kit’s rail and top band. Pass the current router pathname so the longest matching section path becomes active. Spread the props from `renderLink` onto your router link. The rail’s folded state is saved in a shared cookie. On phones, the bar shows up to four sections. If there are more, it shows three sections and a More sheet. Provide no more than one primary page action. The palette defaults to section links; pass `palette` to add custom commands. Import both the kit CSS and React CSS.

```tsx
<AppShell
  pathname={location.pathname}
  sections={[{ href: '/reports', label: 'Reports', icon: 'chart' }]}
  title="Reports"
  account={{ name: 'Demo User', email: 'demo@example.com' }}
  onSignOut={signOut}
  renderLink={(section, { href, ...props }) => <Link to={section.href} {...props} />}
>
  <Reports />
</AppShell>
```

## Tooltip

Tooltip accepts text and inline children, without nested controls. Hovering or focusing opens it; pressing Escape, moving focus away, or moving the mouse away closes it. On touch devices, tapping toggles it. It uses the kit’s tooltip styles and moves below the trigger when there is not enough space above. Keep the same information elsewhere on the page.

```tsx
<Tooltip text="Updated daily">Balance</Tooltip>
```

## Success

`SuccessPanel` confirms an outcome inside the current page with `title` and optional
`sub`, takes the same `check` as `Success`, and forwards a ref to its root div. `SuccessCheck` is the bare mark both
confirmations draw, matching the kit's `successCheck()`, and forwards a ref to its
`svg`. It carries no size or box of its own: to compose it alone, put it in a wrapper
that sets both, such as the kit's `ui-success__check`, and name the outcome in text
next to it.

```tsx
<div className="ui-success__check"><SuccessCheck /></div>
```

The mark comes in two: `line` (the default) is the bare Lucide check in the success
colour, which strokes itself on and takes its size from the layout it lands in;
`circled` is Lucide `circle-check-big` at 20px, the kit's label size, drawn at rest and
the same size everywhere — in every `Success` layout and in `SuccessPanel`. Pick it with `check` on `Success` or `variant` on
`SuccessCheck`. Guidelines / Iconography reserves a circled glyph for a state and a
bare one for an action, and a confirmation reports a state — so `circled` is the mark
that rule asks for, and `line` is the default because it carries the moment at page
size. Neither has a filled disc behind it.

`Success` provides `hero`, `split`, and `compact` layouts on a plain elevated card;
there is no backdrop layer and no `backdrop` prop. Pass `title`, one short `body`
line, and React `actions`. There is no `eyebrow` prop: a confirmation carries one
title and at most one line under it, so put the outcome in the title rather than in a
label above it. A kit `Button` carries the focus ring already; a router link or
a plain `<a>` must also take `className="ui-focusable"`, or it falls back to the
browser's own focus outline. An omitted or empty `actions`
leaves out the actions row. Hero and split default to h1; compact defaults to h2.
`level` overrides the heading rank, and a value outside 1–6 falls back to that layout
default. `confetti` enables the existing decorative animation. All three components
use the kit CSS and its reduced-motion rules.

```tsx
<Success title="Changes saved" check="circled"
  countdown={waiting ? { seconds: 5, label: 'Continuing' } : null}
  onCountdownEnd={continueToNextPage}
  actions={<Button onClick={() => setWaiting(false)}>Stay here</Button>} />
```

Removing `countdown` or unmounting cancels the timer. Changing its duration restarts
it; changing its label or callback does not. Durations are whole seconds rounded
down, with five seconds used for omitted, non-finite, or sub-one values. Completion
fires once per countdown, including in StrictMode. Navigation belongs to the caller.

## Checkbox and Switch

`Checkbox` wraps a native checkbox and its visible `label`. Set `type="radio"`
and give related options the same `name` for a native radio group. Use a fieldset
and legend to name the group. `Switch` has the same native checkbox behavior,
with the kit's switch track; its required `label` supplies the accessible name.
Place visible setting text beside a switch.

Both accept native input props: `checked` with `onChange` for controlled state,
`defaultChecked` for uncontrolled state, and `disabled`, `name`, `value`,
`required`, and ARIA attributes. Refs and every other prop reach the input.
`className` reaches the input on `Checkbox` and the `.ui-switch` label on
`Switch`, whose input is a hidden zero-size box that paints nothing. An empty
`Switch` label falls back to "Toggle", as the vanilla factory does. Disabled
controls do not activate, submit, or enter the Tab order, and the shared
stylesheet paints them with the kit's disabled ink, surface and edge and drops
the accent from a checked box.

```tsx
<Checkbox label="Read only" type="radio" name="scope" value="read" defaultChecked />
<Checkbox label="Full access" type="radio" name="scope" value="full" />
<Switch label="Email notifications" checked={email} onChange={event => setEmail(event.currentTarget.checked)} />
```

## DatePicker

`DatePicker` picks one month (`mode="month"`, the default), a range of months
(`mode="range"`), one date (`mode="day"`) or a range of dates (`mode="day-range"`). It
uses the dropdown's own trigger and panel, so it sits beside a `Dropdown` as the same
control. Periods are ISO strings in the mode's grain: `'2026-08'` for months,
`'2026-08-14'` for dates. Pass `value`/`onChange` for the single-period modes and
`range`/`onRangeChange` for the two range modes, or `defaultValue`/`defaultRange` to
leave the state to the component. Import both the kit CSS and the React CSS.

```tsx
<DatePicker label="Month:" value={month} onChange={setMonth}
  min="2025-01" max="2026-12" disabledPeriods={['2026-07']}
  marks={{ '2026-06': { label: 'Restated', tone: 'warn' } }} />

<DatePicker mode="range" label="Period:" range={span} onRangeChange={setSpan}
  presets={[{ label: 'This year', range: { start: '2026-01', end: '2026-12' } }]} />

<DatePicker mode="day-range" label="Dates:" range={span} onRangeChange={setSpan}
  presets={[{ label: 'This week', range: { start: '2026-09-14', end: '2026-09-20' } }]} />
```

**The grid has one tab stop.** The arrows move one period and one row, Home and End go to
the ends of the row — they never leave the month, so the blank slots a day grid pads its
first and last weeks with are not somewhere they can take you — Page Up and Page Down
move a year in the month modes and a month in day mode, Enter and Space pick, and Escape
closes and returns focus to the trigger. A move past the edge of the shown year or month
turns the page and keeps the reader on the period they moved to. Each cell's accessible
name says what the cell is: `selected` for the pick in every mode, plus `range start`,
`range end` and `in range` in range mode, the mark's word, and `today`.

**Bounds hold against your code as well as the reader's.** `min`, `max` and
`disabledPeriods` are `string`, so a period in the other grain is converted rather than
dropped: in day mode `min="2026-09"` is 1 September and `max="2026-09"` is the 30th, and
`disabledPeriods={['2026-09']}` blocks the whole month; in month mode a date means the
month it falls in. Blocked cells get `aria-disabled` and refuse the press while staying
focusable. A page step with nowhere to go is disabled.

**A range mode takes a start, then an end**, staying open in between; a second pick above
or below the first always reads as the same range, so the ends swap rather than
restarting. `range` and `day-range` differ only in grain — a range may run past the page
it started on, and the span is painted on both pages.
`onRangeChange` fires on each end, so `{ start, end: null }` reaches you too. `presets`
set both ends at once and are held to the same bounds the grid is: a preset that overruns
them is clamped, one with no overlap at all is disabled, and one whose end lands on a
blocked period is disabled too rather than quietly moved inwards. A blocked period between
the two ends is not part of the range — it keeps neither the tint nor the words "in range".

**Blocked beats every other state in the paint.** Block the period your own `value` names
and the cell goes bare like any other blocked cell, keeping its place by weight rather
than wearing the accent fill under disabled ink. Its name still says `selected` and the
gridcell still carries `aria-selected`: it is still your value, it just cannot be
pressed.

**`marks` are the consumer's own notes**, keyed by period. Each shows as a dot in the
cell, as a word in the legend under the grid, and in the cell's accessible name. Give
`tone` one of `neutral`, `info`, `success`, `warn` or `danger`.

**Below 560px the panel is a bottom `Drawer`**, so the sheet has the kit's scrim, close
control and focus trap and the page behind it is inert. Pass `sheet` to force that at any
width — a host that already knows it is on a phone, or one rendering where no viewport
can be read, should, because the picker reads the viewport with `matchMedia` and starts
as the popover until it has.

Pass `today` (a `'YYYY-MM-DD'` date) to fix what the grid calls today — stories and tests
use it to stay the same whenever they run. `locale` names the months and weekdays,
`weekStartsOn` sets the first column in day mode, and `align="end"` hangs the panel off
the trigger's trailing edge. `ariaLabel` names the trigger and the panel; with `label` it
replaces the trigger's own text as the accessible name. The popover stays mounted while
closed, and is `inert` while it is.
