# Components (`@apliteni/apliteni-ui`)

This page tells you which component to use for a screen, how to call it and what the user sees.
[foundations.md](foundations.md) gives the tokens and the floors that every component keeps.
The design rules for a screen are in [the guidelines](../guidelines/overview.md). React's notes
are in [react/README.md](../react/README.md).

```tsx
import '@apliteni/apliteni-ui/css';
import '@apliteni/apliteni-ui/react/css';
import { Button } from '@apliteni/apliteni-ui/react';

<Button variant="primary" onClick={save}>Save</Button>
```

## Entry points

| Import | Use |
|--------|-----|
| `@apliteni/apliteni-ui/react` | The React components. Most screens need only this entry and the two stylesheets. |
| `@apliteni/apliteni-ui/css` | The whole kit stylesheet, for bundler and browser builds. |
| `@apliteni/apliteni-ui/react/css` | The styles that the React components add to the kit stylesheet. |
| `@apliteni/apliteni-ui` | The shared helpers: `icon`, `brand`, `esc`, `safeUrl`, the motion helpers and the shared logic. See [Shared helpers](#shared-helpers). |
| `…/inline` | The CSS as strings, for a server that inlines it (`tokensCss`, `topbarCss`, `cssText`, …). |
| `…/tokens`, `…/accents` | Only the tokens, or only the accent themes. |
| `…/motion` | The motion helpers. |
| `…/guidelines/*` | The guideline pages, as Markdown. |

The package has no runtime dependency and no build step. You can ship it as it is. `…/css` and
the `cssText` of `…/inline` hold the same stylesheets in the same order. If you take single
sheets from `styles`, take every sheet that a component needs, after `tokensCss` and `baseCss`.

### Load both stylesheets

Import `@apliteni/apliteni-ui/css` first, then `@apliteni/apliteni-ui/react/css`. The React
stylesheet holds only what the React components add. It holds no second copy of the kit, so a
React stylesheet that loads later cannot override a kit rule.

Four sheets travel in both stylesheets, because their order cannot change the result: the
reduced-motion net, the 16px field net, the tap-zone sheet and the hover readout sheet. A page
that loads only `react/css` still gets them.

## Themes and accents

Every colour is a CSS custom property. Two attributes on `<html>` select the values:

```html
<html data-theme="light" data-accent="phoenix">
```

- **`data-theme`** is `dark` or `light`. It sets the surfaces, the text, the borders and the
  signal colours.
- **`data-accent`** is `phoenix`, `ocean` or `emerald`. Without it, the accent is **Nebula**,
  the purple default. The accent changes only the accent colours, so every accent works in both
  themes.

Neither attribute changes the type. `--font-display` is for headings and brand marks,
`--font-sans` is for all text that the user reads, and `--font-mono` is for code. The package
does not ship the font files, so your page loads them. See [Typefaces](foundations.md#typefaces).

Use `ThemeToggle` to let the user choose the theme from a bar. Use [`ThemeChoice`](#theme-choice)
on a settings page. Put `THEME_INIT_SCRIPT` in a `<script>` in the `<head>`, so the first paint has
the stored theme. Use `AccentPicker` to let the user choose
the accent. It calls `onChange`. Your page sets `data-accent` and stores the choice. `ACCENTS`
from the root entry lists the accent names.

### An absent attribute means dark

`data-theme` and `data-accent` are optional. Without them, the kit shows dark Nebula.

```html
<html>                              <!-- dark, Nebula -->
<html data-accent="ocean">          <!-- dark, Ocean -->
<html data-theme="light">           <!-- light, Nebula -->
```

## Choose a component

Find the job in the left column. The section gives when to use the component, an example and
what the user sees.

| The job | Component | Section |
|---------|-----------|---------|
| Hold the page: navigation, title, account | `AppShell` | [Page shell](#page-shell) |
| Go up to the parent page | `BackLink` | [Back link](#back-link) |
| Switch between sibling routes | `NavTabs` | [Route tabs](#route-tabs) |
| A section list outside `AppShell` | `SidebarNav` | [Sidebar navigation](#sidebar-navigation) |
| The product band of a marketing page | `TopBar` | [Top bar](#top-bar) |
| A sign-in page | `AuthShell` | [Auth shell](#auth-shell) |
| A site or app footer | `Footer` | [Footer](#footer) |
| Run an action | `Button` | [Button](#button) |
| An action that the user cannot undo | `Button hold` | [Hold to confirm](#hold-to-confirm) |
| Choose one value from a list, or open a menu of actions | `Dropdown` | [Dropdown](#dropdown) |
| Find and run anything with ⌘K | `CommandPalette` | [Command palette](#command-palette) |
| A labelled form control | `TextField`, `TextArea`, `SelectField`, `FileField`, `Field` | [Fields](#fields) |
| Search a list from its toolbar | `SearchField` | [Search field](#search-field) |
| A yes or no, or a set of options | `Checkbox`, `CheckList`, `Switch` | [Checkbox and switch](#checkbox-and-switch) |
| A month, a date or a range | `DatePicker` | [Date picker](#date-picker) |
| Upload a file | `FileDrop` | [File drop](#file-drop) |
| Narrow a list or flip a setting | `Segmented` | [Segmented](#segmented) |
| Show one of several panels | `Tabs` | [Tabs](#tabs) |
| Filter the rows of a table | `FilterBar` | [Filter bar](#filter-bar) |
| A row of controls above a list | `.ui-toolbar` | [Toolbar](#toolbar) |
| Group content on a surface | `Card` | [Card](#card) |
| A status or a label on a record | `Badge`, `Pill`, `StatusDot` | [Badge, pill and status dot](#badge-pill-and-status-dot) |
| A person | `Avatar` | [Avatar](#avatar) |
| A message inside the page | `Callout` | [Callout](#callout) |
| A short notice after an action | `Toast`, `useToast` | [Toast](#toast) |
| Confirm that a task is done | `Success`, `SuccessPanel` | [Success confirmations](#success-confirmations) |
| Content that is loading, or that the user may not see | `BusyRegion`, `Skeleton`, `Denied` | [Loading and denied states](#loading-and-denied-states) |
| A list, a table or a page with nothing in it | `EmptyState` | [Empty state](#empty-state) |
| Code that the user reads or copies | `Snippet` | [Snippet](#snippet) |
| The history of a record | `Timeline` | [Timeline](#timeline) |
| A line glyph | `Icon` | [Icon](#icon) |
| A form or a question over the page | `Modal` | [Modal](#modal) |
| Stop before a destructive action | `Confirm` | [Confirm](#confirm) |
| Look at or change one record without leaving the list | `Drawer` | [Drawer](#drawer) |
| Account and settings | `AccountWindow` | [Account window](#account-window) |
| A word or a value on hover and focus | `Tooltip` | [Tooltip](#tooltip) |
| Feedback on a selected passage | `Feedback` | [Feedback](#feedback) |
| Rows of records | `DataTable` | [Data table](#data-table) |
| Pages of a long list | `Pagination` | [Pagination](#pagination) |
| A row of key figures | `StatBand` | [Stat bands](#stat-bands) |
| Numbers over time, or parts of a whole | `Chart` | [Chart](#chart) |
| A number or a change in a cell | `NumericValue`, `DeltaValue`, `RowIdentity` | [Table values](#table-values) |

## Page structure

### Page shell

Use `AppShell` for each page of a product. It draws the navigation, the page title and the
account, and you give it the page content. Do not use it for a sign-in page. Use
[`AuthShell`](#auth-shell) for that. Do not put a second shell or a second top band inside it.

```tsx
<AppShell sections={sections} pathname={location.pathname} title="Invoices"
  account={{ name: 'Dana Reyes', email: 'dana@example.com' }} onSignOut={signOut}
  palette={{ groups: commands }} renderLink={(section, props) => <Link to={section.href} {...props} />}>
  <InvoiceTable />
</AppShell>
```

`sections` lists the destinations, each with `href`, `label`, `icon` and an optional `count`.
A section can hold one level of sub-items in `items`, each with `href`, `label` and an optional
`count`. That section then opens its sub-items and is not a link itself. To sort the sections
under group labels instead, give `groups` in place of `sections`: each group has a `label` and its
`sections`, with no sub-items. A sidebar takes group labels or sub-items, never both, and the
types refuse the mix. The longest `href` that matches `pathname` is the current section or
sub-item. The current sub-item stays shown, and its parent row shows as current. `word` names the product, and
its default is `apliteni-ui`, so set it. `brand` replaces the mark, and `brandHref` is its link,
`/` by default.

**Two layouts.** `layout="topbar"` is the default. It has a sidebar with the sections, a band with
the search trigger, the command palette and the theme switch. `layout="rail"` has only the side
rail, with the sections and the account at its foot. The rail layout has no search trigger, no
command palette, no Cmd+K, no theme switch, no section counts, and takes no `bandControl` and no
`headControl`. `width="wide"` removes the limit on the content column. `centered` is the
default.

**The title row.** `title` is the page's one `h1`. `lede` is one line under it. `tools` puts small
tools for the whole page at the end of the title row, such as a version badge, a period picker or
a `size="sm"` button. Tools that do not fit go under the title. `actions` puts the page's buttons
in their own row under the title. `back` puts a [back link](#back-link) above the title.

**The account menu.** `accountItems` adds rows, such as Account settings and Support, at the top
of every account menu. A row takes `href` to go to a page, or `onSelect` to open something in
place. A separator stands before Sign out. In the topbar layout, a Theme row opens a submenu with
Auto, Light and Dark. The account button's name is "Signed in as", the name and the address. It
holds each line of text that the button shows, and the menu takes the same name.

**Topbar layout only.**

- `searchLabel` gives the words and the accessible name of the search trigger, at every width.
  Its default is "Search or run a command…". `searchShortLabel` is deprecated, and the shell does
  not draw it.
- `palette` gives the command palette its groups. Without it, the palette lists the sections
  under their group labels, or each sub-item with the name of its parent.
  `onNavigate` sends a same-tab pick in the palette to your router, so the page changes without a
  reload. If your `palette` sets its own `onNavigate`, the shell uses that one.
- `bandControl` stands under the sidebar head. `headControl` is one glyph control in the sidebar
  head, before the fold button.
- `bandActions` puts glyph controls, such as a notification bell, at the right end of the band,
  in each sidebar structure and at every width. With a sidebar, they stand before the menu
  button, and search keeps the centre of the band while it has room. Where the band is short of
  room, search moves off the centre and shrinks, and never goes under an action. With no
  sidebar, they stand before the theme switch. Put one or two there, and give each one a hover
  title. Each action there is a 40px square with a 17px glyph, a `Button` and a dropdown trigger
  alike, and the glyph stays in the centre of its square with or without a count. A count in a
  dropdown trigger is a red pill on the trigger's top end corner, with a 2px ring in the band's
  colour that cuts it from the glyph. The focus ring passes under it, so no ring line crosses the
  digits. A long count, such as 99+, grows over the glyph and stays clear of the next control.
  Give the trigger a name that holds the count it shows, such as "Notifications, 99+ unread".
  Below 560px,
  each action is a 40px glyph with no border and keeps a 44 by 44px tap zone.

**Routing.** `renderLink` lets your router draw each section and sub-item link.

**What the user sees.**

- Above 720px the sidebar or the rail folds and unfolds with a button. The shell stores the choice
  in the `apliteni-ui-rail` cookie. `defaultCollapsed` sets the first state. A folded row keeps its
  name and its count for keyboard and pointer users. A folded rail takes clicks only on the glyph
  column, so a click beside it reaches the page.
- At 720px and below, the sidebar goes away and a 52px band shows. In the topbar layout, the band
  holds the brand mark, the page title on one line, the search trigger, the band actions and a menu button. In the
  rail layout, it holds only the menu button and the mark. The menu button opens the full section
  list in a drawer. The drawer opens from the side of the menu button: the right in the topbar
  layout and the left in the rail layout. `drawerSide` chooses the side in either layout. The
  drawer keeps two or more group labels, and leaves out the label of one group. A press
  on a section, Escape or a wider window closes the drawer, and the focus goes back to the menu
  button.
- Below 560px each band control is a 40px glyph with no border. The search trigger shows only its
  glyph, and keeps the same accessible name.
- The current section is one quiet fill behind its row. A row under the pointer has a lighter
  fill. In the topbar layout, a shell with one destination and no back link draws no sidebar, no fold
  control and no menu button. The section stays in the command palette. The rail layout always
  draws the rail.
- In the topbar layout, the theme switch applies the stored theme when the shell mounts, or
  follows the system. A page that sets its own `data-theme` must also set `data-theme-choice`, or
  store the choice. Otherwise `<html data-theme="light">` on a dark system turns dark when the
  shell mounts.

**Keyboard and screen reader.** The shell draws one `<main>` landmark, and each navigation
landmark has its own name. The band is a `<header>` outside the navigation. The page title in the
phone band is hidden from screen readers, because the `h1` keeps the name.

**Room on the screen.** The rail is sticky and scrolls. A dropdown inside the rail opens out of
it. A folded rail at the right edge of a page adds 175px to the scroll width of the page.

### Back link

Use `BackLink`, or the `back` prop of `AppShell`, on a subpage to go up to the page that holds it.
Do not use it as a history step. When a page takes one: [Going back](../guidelines/going-back.md).

```tsx
<AppShell back={{ href: '/invoices', label: 'Invoices' }} … />
```

**What the user sees.** A link with an arrow and the name of the parent page, as the sidebar
writes it. It stands above the title, in the place of a trail. A long name is cut, not wrapped.
The section of the parent page stays marked with `aria-current="true"`. Without an `href`, or with
a `javascript:` address, it draws nothing. `as` lets a router link draw it.

**Keyboard and screen reader.** It is an `<a href>`. The arrow is hidden from screen readers.

### Route tabs

Use `NavTabs` for a row of links between sibling routes of one page. Each tab is a link to an
address. Do not use it to show panels on one page. Use [`Tabs`](#tabs) for that.

```tsx
<NavTabs items={[{ id: 'open', label: 'Open', href: '/invoices/open', badge: 4 },
  { id: 'paid', label: 'Paid', href: '/invoices/paid' }]} active="open" />
```

`variant` is `underline`, the default, or `pill`. `renderLink` takes the same signature as in
`AppShell`, so your router can draw each link. Item ids must be unique. An item with no `href`
uses its id as a fragment.

**What the user sees.** The tabs stay on one row and never wrap. When they are wider than the
column, the row scrolls inside itself and a shade marks each edge with more tabs. The page does not
get wider. The current tab has an accent label, on a soft fill in the pill appearance and above an
accent bar in the underline appearance. A disabled item is text that the user cannot focus. A badge
of zero stays visible. A null or empty badge is not drawn.

**Keyboard and screen reader.** The tabs are native links, and the current one has
`aria-current="page"`. When the keyboard reaches a tab, the row scrolls to show the tab and its full
focus band, and the page does not move. A row that overflows and has only disabled tabs becomes one
keyboard stop. In forced colours, both appearances keep a visible mark on the current tab.

**Room on the screen.** The row sizes itself on mount, on a route change and on a resize, and it
keeps the user's scroll position.

### Sidebar navigation

Use `SidebarNav` for a section list in a layout of your own. In a product page, use
[`AppShell`](#page-shell), which draws this list for you.

```tsx
<SidebarNav sections={[{ label: 'Billing', items: [{ id: 'inv', label: 'Invoices', href: '/invoices', badge: 4 }] }]}
  active="inv" />
```

It takes flat `items` or captioned `sections`, rows with sub-items, badges and `renderLink`.
Nesting stops at one level. A sidebar takes captions or sub-items, never both: the type refuses
the mix, and in development the component warns. When the current page comes into a group, the
group opens, and its row shows as current. A collapsed row keeps its name and its count.

### Top bar

Use `TopBar` for the product band of a site or documentation page that has no `AppShell`. Do not
put it in an `AppShell` page, because a page has one band.

```tsx
<TopBar word="Strategy" view={<ViewSwitch items={views} active="deck" />}
  version={<VersionSwitcher versions={versions} value="v3" onChange={setVersion} />}
  theme={<ThemeToggle />} account={<AccountMenu name="Dana Reyes" email="dana@example.com" onSignOut={signOut} />} />
```

Each slot is optional. A bar with no account is the signed-out bar. On a phone the bar has two rows.
The current view in `ViewSwitch` has the accent fill. The version button shows only the chosen
name, and its menu shows each name with its badge and a tick on the chosen one. They follow
`value` until you change it. `AccountMenu` marks the page named by `current` in accent ink.

### Auth shell

Use `AuthShell` for a sign-in or sign-up page. It centres one card and puts the brand above it.

```tsx
<AuthShell brand={<img src="/logo.svg" alt="Example" />}><SignInForm /></AuthShell>
```

### Footer

Use `Footer` at the end of a site page or an app page. `variant` is `full`, `slim` or `app`.

```tsx
<Footer variant="full" word="Ledger" tagline="Made for finance teams" legal="© 2026 Example Ltd" />
```

The `slim` and `app` footers draw only the legal row: `legal`, `legalLinks` and the `switcher`.
The `full` footer adds the brand, the `tagline`, the link `columns` and the `social` links. Its
columns stand side by side above the phone width and stack on a phone. `brand={false}` hides the
whole brand block. Set `word` and `legal`, because their defaults are `Strategy` and
"© <year> Apliteni".

## Actions

### Button

Use `Button` for each action that the user runs. Use `variant="link"`, or pass `href`, when the
action goes to another page. Use [`Dropdown`](#dropdown) for a list of actions, and
[hold to confirm](#hold-to-confirm) for an action that the user cannot undo.

```tsx
<Button variant="primary" icon="download" busy={exporting} onClick={exportRows}>Export</Button>
```

`variant` is `primary`, `secondary`, `ghost`, `danger` or `link`. `size` is `xs`, `sm`, `md` or
`lg`. `icon` puts a glyph before the label and `iconRight` after it. `leading` puts your own
decorative content before the label, and it wins over `icon`. `block` fills the row.

**Links.** With `href`, the button is an `<a>` with the button classes. Without `href`, it is a
`<button type="button">`. Refs and native attributes go to the element that it draws.

**Icon-only buttons.** With `iconOnly`, the glyph is the whole button. The button copies its
string children, or else its icon name, into `aria-label` and `title`. With neither, it has no
name. Earn a wordless button on the Button labels page of the guidelines.

**Busy.** `busy` shows three pulsing dots in place of the label, and the button keeps its size.
The button keeps the focus. Clicks, Enter and Space do nothing while it is busy. A status region
announces the progress and then the completion. `completionMessage` sets the completion words. Set
`completionMessage=""` when a form error or another live region announces the result. Under
reduced motion the dots do not move.

**Extra small.** `size="xs"` draws a 13px glyph in a target of at least 24×24px. A labelled xs
button grows to fit its label.

**Your props and the button state.** `className` adds to the kit classes. The button state wins
over your spread props: `aria-disabled`, `aria-busy`, the `data-btn-*` hooks, the `role` of a
link, and the `href` and `tabIndex` that a disabled or busy button removes. Space is blocked only
on a `<button>`, because Space scrolls the page on a link.

### Hold to confirm

Use React `<Button hold>` for one primary or danger action that the user cannot undo, such as
a send to many people or the deletion of a workspace. Do not use it for an action that the user
can undo, for a routine save or for a form submit. Use a plain button for those. A link takes no
`hold`.

```tsx
<Button hold variant="danger" onConfirm={deleteWorkspace}>Delete workspace</Button>
```

Put the action in `onConfirm`. The button calls only `onConfirm`. A click does not call
`onClick`, and the button never submits its form.

**What the user sees.** The user presses the button and holds it for 1000 ms. A fill grows from
the start edge. A primary button fills with `--accent`. A danger button stays quiet at rest and
shows `--pink` only while it is hovered, focused or held. If the user releases before the end,
the fill goes back to empty and nothing happens. A press shorter than 300 ms shows "Hold to
confirm" above the button. A slide off the button does not stop the hold. Under reduced motion
the fill moves in four 250 ms steps, and the hold still takes 1000 ms. A busy or disabled button
does not hold.

**Keyboard and screen reader.** Enter or Space held for 1000 ms confirms, the same as a pointer.
Two presses within 3000 ms also confirm. This is the path for a screen reader user. The button
gives the description "Hold to confirm, or press twice." after any `aria-describedby` of your
own.

**Room on the screen.** The hint shows over the content above the button, so the button does
not move. Leave room for one line above the button. An ancestor with `overflow: hidden` clips
the hint. If a result replaces the button after the confirm, give the result the focus. Give
its row a minimum height of `--btn-height-md`, so the row keeps the height of an md button.

### Dropdown

Use `Dropdown` with `variant="select"` to choose one value from a list, and with
`variant="menu"` for a list of actions. Use [`Segmented`](#segmented) when all the choices fit on
one row and must stay visible. When a
dropdown must have a search field: [Component choice](../guidelines/component-choice.md).

```tsx
<Field label="Owner">{control => (
  <Dropdown {...control} variant="select" items={people} value={owner?.label}
    selectedValue={owner?.value} search={{ count: people.length }} onSelect={setOwnerById} />
)}</Field>
```

`items` is a list of rows. A row has `label`, and can have `value`, `description`, `icon`,
`avatar`, `badge`, `muted`, `selected` and `disabled`. `'---'` is a separator. `sections` groups
rows under captions, with space before each next group. `header` and `footer` add content above and below the rows. `onSelect` gets the value
and the row. `open`, `defaultOpen` and `onOpenChange` control the panel. `disabled` turns the
trigger off: no keyboard stop, no panel and the disabled paint.

**What the user sees.**

- The panel opens below the trigger. `direction="up"` opens it above. `align` chooses the edge of
  the trigger that the panel hangs from. The panel keeps that edge where it fits, and moves along
  the row where it does not.
- The panel stays inside the view, open and closed. It never makes the page wider. It keeps
  `--ui-dropdown-edge` from the edge of the view. Set that property to 0 for a panel flush with
  the edge. At 720px and below, the gap is the 16px page margin, or the safe area of the phone
  when that is wider.
- The panel is at least 240px wide where the view allows. A long unbroken word, such as a file
  name or a URL, breaks in the middle, so one row cannot make the panel wider than the screen.
- An open panel is never taller than the room between the trigger and the edge of the view. It
  scrolls inside, and the wheel stops at its end. By default the panel stops at 300px, in the
  middle of a row, so the user sees that the list continues. `scroll={n}` asks for another cap
  in px. A panel with fewer rows keeps its content height.
- When the room is less than 120px, a panel that can go to the other side flips there. Otherwise
  the page can grow so that the user can scroll to the last rows.
- In a Modal or a Drawer, the panel opens below the trigger and the body scrolls the least
  distance that shows the whole panel, with the label and the trigger above it. A body that is too
  short or too narrow for the panel lifts the panel over the body and its footer.
- A closed panel adds no scroll room at the end of a page or a body. Closing a panel does not move
  the field while the user is still scrolled into the room that the panel needed.
- The panel follows its trigger when the page moves the trigger: a new layout, a sideways scroll
  or a transition.
- A row names its item in the body weight, as a native list does. A group caption is a compact
  label in body ink.
- Each row answers the pointer with a fill and draws no edge. A destructive row turns `--pink` on
  hover and focus. In forced colours a separator stays a visible line.

**Muted or disabled.** Use `muted` for a row that the user can still pick but that is no
longer current, such as an archived unit for a late invoice. Give it the state word:
`muted: 'Archived'`. The row keeps its name in body ink and shows the word in a state badge after
it. The row stays in the keyboard order. After a pick, the trigger shows `Cedar Studio (Archived)`.
Use `disabled` for a row that the user cannot pick now. A disabled row is faded, and the arrow
keys skip it.

**Search.** `search` adds a text field above the rows. Typing filters the rows, and the focus stays
in the field. The match is anywhere in the label, without case or accents. Descriptions are not
searched, so put the words that a user types in the label. `search={{ count, noun }}` names the
size of the set, for example "Search 214 people". Each open starts with the whole list. A query
with no matches says so.

**Submenus.** The account menu of `AppShell` has a Theme row that opens a submenu. Right and Enter
open it, Left and Escape close it, and the focus goes back to the row. On a phone the submenu
replaces the rows, under a back row.

**Your own rows.** `row` lets you draw each row. It gets the row and the props that the row must
spread: the class, the role, `tabIndex`, `data-dd-item`, the selected and disabled state and the
click handler. Use it when a row must be a native `<button>` or a router link.

**Keyboard and screen reader.** The arrow keys move between rows. Escape closes only the panel and
sends the focus to the trigger. A click outside also closes it. A select panel is a `listbox` of
options and a menu panel is a `menu` of menu items. With `search`, the panel is a `dialog`, because
a listbox may own only options. The focus ring of a row is drawn inside the row, so the panel edge
never cuts it. Inside a [`Field`](#fields), the label and then the value name the trigger. Outside
a field, give `ariaLabel`. A placeholder is not a name.

### Command palette

Use `CommandPalette` to let the user find a page, a record or an action and run it with the
keyboard. `AppShell` draws one when you pass `palette`. Do not use it as the only way to reach a
page.

```tsx
<CommandPalette open={open} onClose={close} groups={groups}
  onNavigate={(href) => router.push(href)} />
```

`groups` holds your items. An item has `id` and `label`, and can have `description`, `icon`,
`keywords`, `shortcut`, `badge` and `href`. Your product names the groups and the kinds of result.
Every pick calls `onSelect` with the item first. Then the palette closes, and a row with `href`
goes to the address: `onNavigate` sends a same-tab pick to your router, and a Cmd- or Ctrl-held
pick opens a new tab.

**Destructive rows.** After `onSelect`, an item with `danger` calls its `onConfirm`, and the
palette stays open, so open your [`Confirm`](#confirm) there. A `danger` item without `onConfirm`
is disabled. An item with `disabled` cannot be picked. `density` is
`compact` or `roomy`.

**Ranking.** The palette ranks rows by how the query matches. A whole label beats a prefix, a
prefix beats a word start, a word start beats a substring, a keyword beats a note, and initials
come last. Groups take the score of their best row. Equal scores keep your order. When a server
ranks the results, pass `rank={false}` and use `rankGroups` from the root entry on the server, so
both sides rank the same way. `onQueryChange` gives you the query.

**Keyboard and screen reader.** Cmd+K or Ctrl+K opens the palette. Ctrl+K inside another text box
is left alone. The arrow keys move the active row and wrap at both ends. Enter runs the row, and
Escape closes the top overlay. Tab stays in the panel. Home and End move the text caret. The focus
starts in the text box and stays there, over an inert page. The palette opens empty. It stands
above a drawer and below a confirm.

## Forms and filters

### Fields

Use `TextField`, `TextArea`, `SelectField` and `FileField` for each labelled control in a form.
Use `Field` to give the same label, hint and error to a control of your own, such as a `Dropdown`
or a `DatePicker`. Do not use a placeholder as the label.

```tsx
<TextField label="Invoice number" hint="As printed on the invoice" error={errors.number} required />
<Field label="Due date">{control => <DatePicker {...control} mode="day" value={due} onChange={setDue} />}</Field>
```

**What the user sees.** The label stands above the control, then the hint. An error marks the
control invalid and stands before the hint, so a hint with consent, safety or legal words stays on
the screen. A required field shows a decorative marker, and the control has the native
`required` attribute. `TextField` takes `unit` and `icon`. `FileField` takes one file from the
picker or by drop. `accept` only filters the system picker, so check the file before you upload it.

**`Field` with your own control.** The child function gets the `id`, `required`, `aria-invalid`
and `aria-describedby`. Spread them on the control. A dropdown or date picker trigger then has the
label and the value as its name, and the error gives it the invalid edge. In a field, a dropdown
trigger has the height of a text input and keeps the pill corner. A long value stays on one line
and ends with an ellipsis.

**A list of options in `SelectField`.** The browser draws the open list, so the kit does not
style an `<option>`. For an option that the user can still pick but that is no longer current,
write the state word in its text: `<option>Cedar Studio (Archived)</option>`. Do not disable it.
Name a group with `<optgroup label="Studios">`, not with a disabled option.

**Keyboard and screen reader.** The component makes the ids and points the label, the hint and the
error at the control. The error has `role="alert"`, so a new error is announced and the focus does
not move.

**Room on the screen.** Put a form on a card, not on the page ground. A field is drawn by its edge,
and on the page ground that edge is too faint. See
[Colour and contrast](foundations.md#colour-and-contrast). A filter bar is the one exception.

### Search field

Use `SearchField` for the search box that starts a toolbar above a list. Do not use it in a form.
Use `TextField type="search"` with a label there.

```tsx
<SearchField ariaLabel="Search invoices" size="sm" value={query} onChange={(e) => setQuery(e.target.value)} />
```

`ariaLabel` is required, because no visible label names the field. `size="sm"` is the field above
a dense table. With a mouse it is 32px high with `--text-sm`. On a touch screen it is 40px high with
16px text, because iOS zooms into a field with smaller text. The field has no clear button of its
own, because the browser draws one. See [Toolbar](#toolbar).

### Checkbox and switch

Use `Checkbox` for an option that the user turns on or off and then submits. Use
`type="radio"` for one choice of a few that all stay visible. Use `CheckList` to group options
under a legend. Use `Switch` for a setting that takes effect at once.

```tsx
<CheckList legend="Notify me">
  <Checkbox label="Paid invoices" hint="One email for each payment" defaultChecked />
  <Checkbox label="Overdue invoices" />
</CheckList>
```

**What the user sees.** A resting box has the field fill and an edge that is clear on the page, a
card, a menu and a hovered row. A checked box, a partial box and a checked radio have a light
accent tint, an accent edge and an accent mark. `Checkbox` has no `indeterminate` prop. Set the DOM
property through a ref, and the box shows a short dash. `hint` stands under the label and describes the box. A disabled box has the same disabled
paint as every other control, and dims its hint.

### Date picker

Use `DatePicker` to choose a month, a range of months, a date or a range of dates. Do not use it for
a date and a time.

```tsx
<Field label="Period">{control => (
  <DatePicker {...control} mode="range" range={period} onRangeChange={setPeriod} max="2026-12" />
)}</Field>
```

`mode` is `month`, `range`, `day` or `day-range`. A single period uses `value` and `onChange`. A
range uses `range` and `onRangeChange`. Values are ISO strings in the grain of the mode: `2026-08`
or `2026-08-14`. A value in the other grain still counts: a month in day grain is the whole month.
`min`, `max` and `disabledPeriods` block periods. `presets`, `locale`, `weekStartsOn` and `today`
are optional. `placeholder` is the trigger text while nothing is chosen, such as "Select a date"
by default. `ariaLabel` names the trigger and the title of the phone sheet, and wins over the label
of a `Field`. Outside a `Field` and without `ariaLabel`, the placeholder is the sheet title.

**What the user sees.** The panel opens like a dropdown and holds a grid. A blocked cell has a
struck label and refuses a press, but the keyboard can still reach it. A range covers everything
between its ends, also blocked periods. The current period has an accent hairline. Below 560px the
panel is a sheet from the bottom of the screen. The sheet opens with the chosen period in view and
the focus on it. In a Modal, the panel opens over the edge of the dialog.

**Keyboard and screen reader.** The grid has one Tab stop. The arrow keys move between cells, and
Home and End go to the ends of the row. Each cell says what it is in its own name. Escape closes
only the calendar, and the next Escape closes the dialog around it. In a `Field`, the label of the
field is the title of the sheet, and the trigger reads like "Due date, August 2026".

### File drop

Use `FileDrop` to upload a file in a form or a panel. Use `FileDrop` with `title` for the empty
page of a list that the user fills by upload. Use `FileField` for a file field that matches the
other fields of a form. When a page uses a row, a region or a dialog:
[File drop](../guidelines/file-drop.md).

```tsx
<FileDrop label="Upload invoice" note="PDF up to 10 MB" accept=".pdf"
  file={upload} onFile={startUpload} onRemove={clearUpload} onRetry={retryUpload} />
```

You own the upload. `FileDrop` sends a chosen or dropped file to `onFile` and shows the `file` that
you pass back: `name`, `size`, `status`, `progress` and `error`. A file with no `status` is
uploading, so the kit never shows success that you did not report. `onFiles` gets every dropped
file. `multiple` lets the picker take more than one.

**What the user sees.** At rest, one row with the button that opens the picker and your note
beside it. A file keeps the 32px height of the row: the name, the size, and the status or the
progress track on one line, then Remove. A long name keeps its extension. A status has a circled
mark and a word. A refused file shows its reason, under the name when the line is full. Remove and
Retry show only when you pass `onRemove` and `onRetry`. The drop target shows only while a file is
over the region, over the content and not in place of it. Children of `FileDrop` stand above the
row, inside the same region, so a whole panel can take the drop. In a parent that sizes to its
content, the row is 420px wide or less.

With `title`, `FileDrop` is a dashed box with the title, the accepted types and an Upload button.
The button is the keyboard path. A click on the box also opens the picker. A disabled drop accepts
nothing.

**A page that takes a file anywhere.** Put `.ui-drop--page` on
`.ui-drop.ui-drop--area.is-dragging` markup, and mount it only while a file is over the page. It is
a fixed layer with the dashed accent edge and an `EmptyState`. It takes no pointer events. Your
page owns the drag logic, and its Upload button stays the keyboard path.

### Segmented

Use `Segmented` when a choice narrows a list, flips a unit or sets a preference, and all the options
fit on one row. Use [`Tabs`](#tabs) when each choice shows a different panel. See
[Segmented or tabs?](#segmented-or-tabs).

```tsx
<Segmented label="Period" value={period} onChange={setPeriod}
  options={[{ value: 'm', label: 'Month' }, { value: 'q', label: 'Quarter' }, { value: 'y', label: 'Year' }]} />
```

`appearance` is `pill`, the default, or `underline`. `size="sm"` makes the pill smaller, and in
the underline appearance it changes only the type size. `block` fills the row. An option's `icon`
draws a glyph before its label. With `iconOnly`, the glyph is the whole button and the label is
its name and its hover title.

**What the user sees.** The chosen pill has the accent fill of a primary button. The chosen
underline tab is its label with a 2px accent bar under it, and no box. Hover changes only the
ink. When the options do not fit, they wrap onto more rows, so the strip never makes the column
wider. A long label wraps inside its own option.

**Keyboard and screen reader.** One named toolbar of pressed buttons, with one Tab stop. The arrow
keys move and choose, wrap at the ends and skip disabled options. Home and End go to the first and
last enabled option. In forced colours the chosen option uses the system highlight colours.

### Theme choice

Use `ThemeChoice` for the theme on a settings page. Use `ThemeToggle` in a bar. Use `Segmented`
for other preferences.

```tsx
<Card title="Theme"><ThemeChoice /></Card>
```

`label` names the group, `Theme` by default. The choice applies and is stored at once, as with
`ThemeToggle`, so the page needs no Save.

**What the user sees.** Three cards in one row at every width: System, Light and Dark. Each card is
a small picture of a page in that theme, drawn from the theme's tokens, with its name under it.
System is half light and half dark. The chosen card has a fill, and its name is in strong, heavier
ink. Hover gives another card half that fill. The first and last pictures sit on the card's text
edges. The fill extends 8 px into the card's padding, and the focus ring extends 3 px more. So put
the group in a padded container, such as `Card`.

**Keyboard and screen reader.** One named radio group, with one Tab stop on the chosen card. The
arrow keys move and choose. The focus ring is the kit's band around the card, and nothing else.
In forced colours the chosen card's name takes the system highlight colour.

### Tabs

Use `Tabs` when each choice shows a different block of content on the same page. Use
[`NavTabs`](#route-tabs) when each choice is its own address.

```tsx
<Tabs label="Invoice" value={tab} onChange={setTab}
  items={[{ value: 'lines', label: 'Lines', count: 12, panel: <Lines /> }, { value: 'notes', label: 'Notes', panel: <Notes /> }]} />
```

It draws a tablist and the panel of the chosen tab. Content of the other panels is not mounted.
The arrow keys, Home and End move between tabs and choose them.

### Filter bar

Use `FilterBar` for the row of filter chips above a table. Each chip narrows the rows by one field.
Use a [`Dropdown`](#dropdown) instead when a list of values needs more room than a chip gives.

```tsx
<FilterBar filters={filters} add={addable}
  onChange={(id, value) => setFilter(id, value)} onRemove={removeFilter} onClear={clearFilters}
  onAdd={(id, value) => addFilter(id, value)} />
```

You control the bar. A filter has `id`, `label`, `items` and an optional `value`. A pick, a remove
and Clear all call your handlers. They never change your filters. `add` and `onAdd` add a Filter
control after the chips. Its menu holds one section for each filter that the bar does not show,
with a search field from ten values. When you add the filter in the same update, the focus goes to
the new chip. `clearLabel`, `clearVariant` and `addLabel` change the words and the look.

**What the user sees.** A chip shows only the chosen value. Without a value, it shows the filter
name. The open menu is at least 240px wide, or the width of the row when the row is narrower. It
stays inside the row and never makes the page wider. The menu marks the chip's value with a soft
accent wash and a check. Clear all and the remove mark of a chip show only when there is a value to
clear. A disabled or busy bar answers nothing. A menu of your own in the bar that needs more than
240px, such as a catalogue with a search field, declares `--ui-filter-panel-ask` in your
stylesheet. It is then 320px wide where the row has the room, and the width of the row where it
does not.

**Keyboard and screen reader.** The name of each filter reaches the user through the trigger name
and a hidden legend. When the user clears the last filter, the focus goes to the Filter control,
or else to the next control that Tab would reach. If the focused remove mark goes, the focus goes
to the chip's trigger.

**Room on the screen.** The bar stands on the page directly above its table card, with no card of
its own. Keep its search field live, because a disabled field is too faint on the page ground.

### Toolbar

Use `.ui-toolbar` for the row of controls above a list: a search field, then the filters, then the
view switch. Put a create action on its own row above the toolbar, at the left.

```tsx
<div className="ui-toolbar">
  <SearchField ariaLabel="Search invoices" size="sm" />
  <FilterBar … />
  <Segmented label="View" size="sm" … />
</div>
```

**What the user sees.** Each control on a toolbar line has the same height, so a button beside a
field has the same top and bottom edge. Do not change the size of a control to make it fit. A
toolbar that starts with a small search field is a small row: with a mouse, the chips, Filter,
Clear all, a dropdown trigger, a small Segmented and a small button are 32px. Give the Segmented
and the button `size="sm"` yourself. The small search field stops at 320px. On a touch screen the
row is 40px. `.ui-toolbar--split` puts the last control at the end of the row, also on a phone.

**Room on the screen.** The row wraps only when the text field would be narrower than 6rem. At
560px and below, each search field takes the full line and the other controls wrap under it. The
toolbar stands 8px above the block that it controls, or 20px on a touch phone below 560px.

## Content and status

### Card

Use `Card` to group the content of one topic on a surface: a form, a table, a chart or a setting
list. Do not put a card in a card, and do not use a card only to add space.

```tsx
<Card title="Payments" sub="Last 30 days" tools={<Button size="sm" variant="ghost" icon="download" iconOnly>Download PDF</Button>}>
  <PaymentsTable />
</Card>
```

`title` is a heading one level under the page's: an `h2` by default, and `level` moves it to
`h3`–`h6`. `variant` is `accent` or `live`, a tinted surface without a coloured edge. `pad="sm"`
gives less vertical space, and `pad="lg"` makes a centred landing card. `icon` adds a title chip.
`href` makes the whole card a link. `tools` puts small controls at the end of the title row,
centred on the title line. On a touch phone the tools stand `--tap-gap` apart. A `Chart` in a
titled card puts its Chart and Table switch there.

**Setting rows.** A setting row keeps its choice on one line. On a phone, the control stands under
its label and hint. Use `ui-card__row--tight-choice` for a three-option row that must stay on one
line below 360px.

**A document in a card.** Wrap a `.ui-toolbar` and a `.ui-table-scroll` in `.ui-card__viewer`, and
give the document `.ui-card__page`. The toolbar is a slim row between two lines. The page is a
white sheet with dark text in both themes, with A4 proportions at the least.

### Badge, pill and status dot

Use `Badge` for the status of a record, such as Paid or Overdue. Use `Pill` for a `live` or `soon`
marker on a product or a feature. Use `StatusDot` beside a word that says live or off. Use an
[ink word](#data-table) for a second status in the same row.

```tsx
<Badge variant="success">Paid</Badge> <Pill variant="live">Live</Pill> <StatusDot live /> Connected
```

None of them has an interactive role or a live region. Put the status words beside the dot. The
colour never carries the status alone.

### Avatar

Use `Avatar` to show a person beside their name. Do not use it in place of the name.

```tsx
<Avatar personKey={user.id} name="Dana Reyes" src={user.photo} size={32} />
```

**What the user sees.** A filled circle with the first and last initials, 24px or 32px. The hue
comes from `personKey`, the stable id of the person, so one person keeps one hue on every screen.
The letters are readable on each hue in both themes and under every accent. A name with no letters
shows the `user` glyph. `empty` shows a dashed ring for "no one". A `src` photo covers the letters,
and the letters show when the photo does not load. The top bar account button, its menu and the
shell's reader block show the same mark. A dropdown row takes `avatar: { key, name, src }`, and a
select shows the mark of the chosen row in its trigger.

**Keyboard and screen reader.** The mark is hidden from assistive technology, because the name
stands beside it. It has no hover, focus or cursor of its own.

### Callout

Use `Callout` for a message that belongs to the page that the user is on, such as a warning above a
form. Use a [toast](#toast) for a short notice after an action.

```tsx
<Callout variant="warn" actions={<Button size="sm">Review</Button>}>Two invoices have no due date.</Callout>
```

`variant` is `neutral`, `info`, `success`, `warn` or `danger`. Success, danger and warn take a
circled status glyph. Info and neutral take `info`. Pass `icon` when the tone does not say enough.

### Toast

Use a toast for a short notice that an action finished or failed. Do not use it for a message that
the user must read before going on. Use a [callout](#callout) or a [confirm](#confirm) for that.

```tsx
<Toast collapse><App /></Toast>

const push = useToast();
push({ tone: 'success', title: 'Invoice sent', action: { label: 'Undo', onClick: undoSend } });
```

Use one `Toast` provider for each document. A notice has `title`, and can have `text`, `tone`,
`action`, `compact`, `dismissible` and `timer`. `compact` has no body text.
`dismissible={false}` hides the close button. `timer={false}` keeps the notice until the user
closes it. A number sets the seconds.

**What the user sees.** The stack is at the bottom right, with the newest notice at the bottom. A
notice without an action closes after five seconds. Its timer line and its countdown stop while it
is hovered, focused or held in a pile. A notice with an action stays until the user picks the
action or closes it. With `collapse`, the stack is a pile with the newest notice in front. The pile
opens into a column on hover and on focus. A ninth notice makes the pile no taller than a third. A
device without hover always shows the column. Under reduced motion the timer line is not drawn.

**Keyboard and screen reader.** An ordinary notice is polite and a danger notice is assertive. A
new notice does not move the focus.

**Room on the screen.** The provider sets `--rx-toast-stack` on the document root to the height of
the stack, or `0px` when it is empty. A fixed page action can use it to stay clear of the notices.

### Success confirmations

Use `SuccessPanel` to confirm a task inside the page where the user stays, such as after a form
submit. Use `Success` when the confirmation is the whole screen and the user needs somewhere to go
next. See [SuccessPanel or Success?](#successpanel-or-success).

```tsx
<Success title="Payment sent" body="Dana will get an email." actions={<Button href="/payments">Back to payments</Button>} />
```

A confirmation has one title and at most one short line under it. It has no eyebrow. It stands on
a plain elevated card. `Success` takes `layout` (`hero`, `split` or `compact`), `level`, `actions`,
`confetti` and `countdown` with `onCountdownEnd` for a redirect. `SuccessCheck` is the mark alone.

`check` chooses the mark:

| `check` | Mark | Size | Motion |
| --- | --- | --- | --- |
| `line` (default) | the `check` glyph, in the success colour | 56px hero, 72px split, 28px compact, 28px in a panel | draws itself over `--dur-slow` |
| `circled` | the `circleCheck` glyph | 20px in every layout | none |

A circled glyph reports a state, so use `circled` where [Iconography](../guidelines/iconography.md)
asks for a state mark.

### Loading and denied states

Use `BusyRegion` around content that loads after the page. Use `Skeleton` and `SkeletonTable` as
its placeholder. Use `Denied` when the user may not see the content. Do not show a spinner for a
screen-sized wait.

```tsx
<BusyRegion busy={loading} label="Loading your report…" message={`${rows.length} rows`}
  placeholder={<SkeletonTable rows={4} />}>
  <ReportTable rows={rows} />
</BusyRegion>
```

**What the user sees.** While `busy`, the region shows the placeholder, which has the shape of the
content that comes. Then it shows the content.

**Keyboard and screen reader.** The region stays mounted and announces `label` while busy and
`message` when done. It is the one part of the kit that announces a pending state. A skeleton is
hidden from screen readers. `Denied` has no role of its own, so the region where you put it
announces it. Pass `need` to say what access the user needs.

### Empty state

Use `EmptyState` when a list, a table or a page has nothing to show. Say why and give the next
step. Do not use it for an error.

```tsx
<EmptyState variant="no-matches" actions={<Button onClick={clearFilters}>Clear filters</Button>} />
```

`variant` is `first-run`, `no-matches`, `not-found` or `not-yet-built`, and each has default words
and art. `title`, `sub`, `icon` and `art` replace them. The page keeps its own `h1`.

### Snippet

Use `Snippet` for a block of code that the user reads or copies, such as an API key or a command.
To copy one identifier where it stands, in a drawer row or a table cell, use an icon-only
`Button` with the `copy` glyph instead.

```tsx
<Snippet label="Install" code="npm install @apliteni/apliteni-ui" />
<Button variant="ghost" size="sm" icon="copy" iconOnly>Copy INV-1162</Button>
```

`label` is the head line, `shell` by default. `code` is the text. `children` can show other markup, and copy still writes `code`. `reveal` hides
the code until the user shows it. `copy={false}` removes the copy button. `copyLabel` names it.

**What the user sees.** The copy button has only a glyph. After a copy the glyph changes to a check
in the same box, and a hidden live region says the word. In a card, the block has the page ground.
A shade marks an edge with more code past it. The highlight colours are readable in both themes.
In light, keywords, flags and URLs are below AA where the shade is darkest. This is a known gap.

**Highlighting.** `hlCode(raw, lang)` from the root entry returns highlighted HTML for `shell`,
`json` and `ts`. `codeLanguages` lists them, and another name is read as shell. It colours short
snippets, not whole programs.

### Timeline

Use `Timeline` for the history of one record, such as who changed an invoice and when.

```tsx
<Timeline events={[{ id: 'e1', actor: 'Dana Reyes', dateTime: '2026-08-14T09:30', timestamp: '14 Aug, 09:30', description: 'Sent the invoice' }]} />
```

The events show from oldest to newest. Only the marker of the last event is filled. An event can
have `kind`, `meta` and `undo`. A new event in a list that is not empty plays an entrance.

### Icon

Use `Icon` for a line glyph beside words. Use `Button icon` for a glyph in a button.

```tsx
<Icon name="download" />
```

`iconNames` from the root entry lists the names. A glyph without a word is allowed only for the
names in `iconOnlyAllowed`. See [Icons and glyphs](foundations.md#icons-and-glyphs).

## Overlays

### Modal

Use `Modal` for a short form or a question that must finish before the user goes on. Use a
[drawer](#drawer) to look at or change a record beside its list. Use [`Confirm`](#confirm) for a
destructive question.

```tsx
<Modal open={open} title="Rename workspace" onClose={close}
  footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
  <TextField label="Name" defaultValue={name} />
</Modal>
```

**What the user sees.** A raised surface over a deep scrim, at most 96% of the viewport high. The
body scrolls, and the title, the close control and the footer stay visible. The title is an `h2`.
`initialFocusRef` chooses the first focus.

`size="sm"` gives a 360px panel for a short sign-in form. Without `size`, Modal uses its default
wide panel.

**On a phone.** At 560px and narrower, with a coarse pointer, each footer button has a 44px tap
zone. The buttons keep their drawn size.

### Confirm

Use `Confirm` before a destructive action that the page must stop for. Use
[hold to confirm](#hold-to-confirm) when the user can confirm on the button itself.

```tsx
<Confirm open={open} title="Delete 3 invoices?" body="This cannot be undone." danger
  confirmLabel="Delete" cancelLabel="Keep" busy={deleting} onConfirm={remove} onCancel={close} />
```

It is an `alertdialog`. The safe action gets the focus and stands before the committing action.
`onConfirm` only reports the press. You save, show errors and close. The answers are the modal's
footer buttons, so on a phone each one has a 44px tap zone.

### Drawer

Use `Drawer` to look at or change one record without leaving the list that opened it. Use a page
when the task needs more than one record. When a flow needs a drawer or a page:
[Drawer](../guidelines/drawer.md).

```tsx
<Drawer open={open} title="Invoice INV-1162" onClose={close} footer={<Button>Edit</Button>}>
  <DrawerSection title="Details">
    <KeyValueList rows={[{ label: 'Customer', value: 'Northwind' }, { label: 'Due', value: '14 Aug 2026' }]} />
  </DrawerSection>
</Drawer>
```

`side` is `right`, `left`, `top` or `bottom`. `size` is `sm`, `md` or `lg`. `headerActions` puts
controls between the title and the close button.

**What the user sees.** The panel slides in over a scrim. The body groups by heading, never by
card. `DrawerSection` puts a heading on a 1px line, and groups stand 32px apart. `KeyValueList`
shows label and value pairs, in one or two columns. A value stays beside its label. An icon button
at the end of a value, such as a copy button, stays on the value's line. Nothing in a drawer draws a
card, a row rule or an `<hr>`. The actions stay outside the scrolling body. Under reduced motion
the panel does not slide.

**A key figure.** Put a `<dl class="ui-drawer__figure">` in a first group with no heading. Its
`<dd>` holds a `.ui-drawer__figure-value` at 22px, with a status badge beside it.

**A table in a drawer.** It takes the 13px text of the drawer, a semibold head and no lines between
rows. Its first and last columns line up with the drawer text.

**Keyboard and screen reader.** A screen reader hears each label with its value. Escape that a
tooltip or a picker already used closes only that overlay. The next Escape closes the drawer.

### Account window

Use `AccountWindow` for an account area of several groups. When the account area is only a
profile and a few preferences, open a Profile page and a Preferences page in the app shell from
the account menu, with no second navigation column:
[Account and settings](../guidelines/account-and-settings.md).

```tsx
<AccountWindow open={open} onClose={close} reader={{ name: 'Dana Reyes', email: 'dana@example.com' }}
  sections={[{ id: 'profile', label: 'Profile', icon: 'user', content: <Profile /> }]} />
```

You give the reader and the sections. The window draws the scrim, the close control, the section
title and the rail. `section` with `onSectionChange` controls the open section. `defaultSection`
leaves it to the window.

**What the user sees.** A window 1024px wide and 76% of the viewport high, with a rail of sections
and the reader at the top. The open section has the accent. When the section changes, the pane
mounts again, so a half-filled form does not follow the user. At 560px and below, the window
floats with a gap on each side and is as tall as its content. The sections become tabs under the
reader.

**Keyboard and screen reader.** Each rail row is a button with `aria-current`. On a phone the tabs
have one Tab stop, and the arrow keys, Home and End move between them.

### Tooltip

Use `Tooltip` to show a word or a value when the user rests on or focuses a mark, such as the name
of an icon button or the value of a chart bar. Do not put a value only in a tooltip. When a value
may be in a readout: [Hover readouts](../guidelines/hover-readouts.md).

```tsx
<Tooltip control text="Download PDF"><Button variant="ghost" icon="download" iconOnly>Download PDF</Button></Tooltip>
<Tooltip label="Revenue" value="€12,400" detail="August 2026"><span tabIndex={0}>€12.4k</span></Tooltip>
```

`label`, `value` and `detail` are the parts, and empty parts are hidden. `text` is a short form of
`label`. `placement` is `top` or `bottom`. Use `control` when the child is one control that names
itself: the readout then adds no Tab stop and no description.

**What the user sees.** A pointer that rests for 300ms opens the readout, and it closes at once when
the pointer leaves. Within 300ms after one closes, the next opens at once. The readout is in the
top layer, over a sticky cell. It stays inside the viewport and moves with a scroll or a resize. It
never moves anything else on the page. On a touch screen, a tap opens the readout and does not
also run the mark's action.

**Keyboard and screen reader.** Keyboard focus opens the readout at once, and the trigger gets it
as its description. Escape closes only the readout and keeps the focus on the trigger. The next
Escape reaches the dialog around it.

### Feedback

Use `Feedback` to let a reader select a passage and send a note about it, such as on a report.

```tsx
<Feedback container={articleRef} onSend={sendFeedback} />
```

A "Give feedback" pill shows on a text selection in `container`. It opens a form with the quoted
passage and a note. `onSend` files the note. A failed send keeps the note and shows the error. A
sent note shows one line of thanks. Escape sends the focus back to the control before it.

## Tables and figures

### Data table

Use `DataTable` for rows of records that the user compares, sorts or selects. Use a
[`KeyValueList`](#drawer) for the fields of one record. Do not lay a table out as cards on a phone.
The table rules: [Dense tables](../guidelines/dense-tables.md).

```tsx
<DataTable caption="Invoices" scrollLabel="Invoices" selectable={false} pinnedIdentity
  columns={[{ key: 'name', label: 'Customer', cell: 'title', sortable: true },
    { key: 'amount', label: 'Amount', num: true, width: '12ch' }]}
  rows={invoices} />
```

Each row needs a `name`, which is also the key of a selection. A column has `key` and `label`, and
can have `num`, `sortable`, `render`, `cell`, `width`, `linked` and `rowHeader`. A `label` can hold
React content, such as a [`Tooltip`](#tooltip). `empty` is the text of a table with no rows, "No
rows" by default. `DataTable` takes no `className`. `stack` is deprecated and does nothing: a table
scrolls sideways on a phone.

**Columns.** `cell` is `title`, `code`, `long`, `strong` or `act`. A `title` column takes the free
width and is never narrower than 20 characters. A `width` such as `'12ch'` holds while the rows
reload or are empty, so the columns do not move when data arrives. Set the narrow columns and leave
the title column unset. `rowHeader` draws the body cells as `th scope="row"`. `linked` marks a
column whose cells hold one link and nothing else: the link then fills the cell and its ring is the
cell.

**Look.** `zebra`, `hover` (on by default) and `density` (`dense`, `compact` or `comfortable`)
choose the look. A hover table that is not zebra or dense is a row table: rows 48px tall, 36px with
`compact` and 56px with `comfortable`, with no lines between rows. Every cell aligns its content to
the top, so other values stay level with the first line of a cell that wraps. A badge in a cell is
19px high and never makes its row taller. `rowState` marks a row `target` or `dead`. A dead row is
muted, so put the word that names its state in one of its cells. `footer` takes totals rows. `caption` names the table for
assistive technology.

**Status words.** Use a badge for the status of the record. For a second status in the same row,
use an ink word: `.ui-status--success`, `--danger`, `--warn`, `--info` or `--neutral`. Each is at
least 4.5:1 on a plain or a selected row.

**Scrolling.** With `stickyHeader` or `pinnedIdentity`, the table stands in a named scroll region.
`pinnedIdentity` pins the first column, or the column whose key you give. A table wider than its
frame scrolls sideways, and the page does not. The pinned column draws its divider only when the
region can scroll. When the region is scrolled, the next column's text stops one cell padding
short of the divider. Below 720px a pinned cell keeps one line and is cut at
`--ui-table-identity-max`. Lower that cap for a table with a selection column. Below 560px the
frame has no scrollbar. `scrollLabel` names the region, `Table` by default. Use the subject of the table, such as
`Invoices`, and name the gesture only when the columns overflow at every width.

**Sorting and paging.** A table either controls its sort with `sort` and `onSortChange`, or leaves
the sort to the table, and keeps that mode while it is on the page. The default sort is the first
sortable column, descending. Equal values keep your order, and your array is never reordered. A
controlled pager (`page`, `onPageChange`, `total` or `hasMore`) shows all the rows that you give. A
sortable header label is cut with an ellipsis before its sort mark is.

**Selection.** Pass `selected`, `onToggle` and `onTogglePage`, or `selectable={false}`. The
selection boxes are kit checkboxes. The header box shows the dash when some rows of the page are
selected. A dense table marks a selected row only with its box.

**Links in cells.** A link in a cell uses the row's ink, gets an underline on hover and the ring on
focus. A `.ui-table__sub` puts a second value under the first, such as an email under a name.
`.ui-table__pair` groups a reference and a status, and stacks them when the cell is narrow.

**Keyboard and screen reader.** When its content overflows, the scroll region takes the focus and
draws the ring inside its edge, so the arrow keys, a trackpad and a finger reach the same columns.
When the content fits, also after a resize, the region is not a Tab stop. A control in the region
that takes the focus by keyboard or by script scrolls fully into view.

**In a card.** The table reaches the card's edges, and its end cells keep the card's text edge.
At 560px and narrower, a row table's end cells pad by 16px, so its first column starts 8px
outside the card's text edge. A row table has hover and is neither zebra nor dense.
`.ui-card--fit` makes the card end at the table's content.

### Pagination

Use `Pagination` under a table or a list that is too long for one page. `DataTable` draws one for
you when you give it a page.

```tsx
<Pagination page={page} pageSize={50} total={total} onPageChange={setPage} onPageSizeChange={setSize} />
```

**What the user sees.** The pager shows a page that you already have. When you do not know the
total, pass `total={null}` and `hasMore`. The pager then offers the step before and the step after
and does not show a page count. A control that would leave the result is disabled and stays in its
place. One page of content gets no steps. `pageSizes` chooses the sizes from the kit's scale.
`loading` keeps the numbers readable, marks the pager busy and stops input. `variant` is `steps`,
`numbered` or `jump`.

**Keyboard and screen reader.** The row range is announced politely, as one message. It is the only
part of the pager that announces.

### Stat bands

Use `StatBand` for a row of key figures above a report, such as revenue and its change. Put the
totals of a list in the table's footer rows, not in a stat band.

```tsx
<StatBand basis="vs. July" stats={[
  { label: 'Revenue', value: '€124,800', delta: { value: '+8.2%', tone: 'good' } },
  { label: 'Open invoices', value: '42' }]} />
```

`variant` is `tiles`, the default, with each figure on its own card, `band` on one card, or `open`
with no surface and a larger value. A figure has `label`, `value`, `caption`, `delta` and `trend`.

**What the user sees.** A value never wraps and is never cut. The words under it give way first. A
change shows an arrow from the sign that you print, and its colour follows your `tone` only. A
figure with nothing to compare shows no change row, never `+0%`. A figure shows at most one line
under its value. Use a caption only for a unit, a period or a limit that the figure cannot say.
`trend` is a slot for a small chart, such as a `Chart variant="spark"`.

**Say what a change compares with.** Put it once for the band in `basis`, or with `basisId` point
at text before the figures. A caption comes before the figures. A hover `title` does not count.
When a period control already states the window, do not repeat it.

**Room on the screen.** A band folds by its own width, not the window's, so give it a width in a
flex row or an `auto` grid track:

| Layout | Four fold two by two at | An odd count stacks at | One column at | Smaller value below |
|---|---|---|---|---|
| Band and tiles | 56rem | 42rem | 28rem | 14rem |
| Open | 66rem | 50rem | 32rem | 15rem |

**Keyboard and screen reader.** The band is a description list, so a screen reader reads each
figure as one statement.

### Chart

Use `Chart` to show numbers over periods or the parts of a whole. Use a [stat band](#stat-bands)
for one figure, and a [table](#data-table) when the user must read exact values side by side.

```tsx
<Chart variant="line" title="Revenue" format={eur} formatAxis={eurShort}
  periods={[{ label: 'June 2026', short: 'Jun' }, { label: 'July 2026', short: 'Jul' }]}
  series={[{ id: 'rev', name: 'Revenue', values: [118400, 124800] }]} />
```

`title` names the plot, the table and the switch, and is not drawn, because the card around the
chart has the title. `format` prints exact values in the readout, the live region and the table.
`formatAxis` prints the axis ticks, which are whole units.

**Variants.**

| `variant` | Data | `look` values | Default look |
| --- | --- | --- | --- |
| `months` | `periods`, `series` | none: columns per period with a line across them, fitted to the card | |
| `bridge` | `steps` | none: one period from a start total to a result | |
| `spark` | `periods`, `series` | none: one series at text size, for a stat band `trend` | |
| `line` | `periods`, `series` | `thin`; `points`, a point on each value; `labels`, the last value at the line's end | `thin` |
| `area` | `periods`, `series` | `flat`, each series from zero; `curves`, each series from zero as a smooth curve with a point on each value; `stacked`; `share`, each column is 100% | `stacked` |
| `stacked` | `periods`, `series` | `columns`; `share`, each column is 100%; `rows`, a bar for each period | `columns` |
| `donut` | `slices` | `thin`, the total in the centre; `table`, a list of the shares beside the ring; `labels`, the name, value and share at each slice | `table` |

`area`, `stacked` and `donut` take only values of 0 or more. A negative value throws a `RangeError`.
A stacked look reads a missing value as zero. The readout of a stacked or a share look lists each
series of the column and the total, and the table adds a `Total` column. A share look shows the
parts as percentages, and its table keeps your values. Use `curves` for two or three series that
the user compares by shape, not by total. A donut slice says its value and its share of the whole.
`totalLabel` names the whole, `Total` by default. A donut has no `selectable`.

**Series.** A series is `{ id, name, values }`, with an optional `tone`. In `months`, its `shape`
is `bars`, `bars-below` or `line`. `bars` stand on the zero line. `bars-below` takes positive
values and hangs them under the line.

**Tones.** A series without `tone` takes the next of `accent`, `accent-soft`, `info`, `warn`,
`good`, `bad` and `neutral`. The product accent does not change them. Each full tone is at least
3:1 on the card and the page in both themes.

**What the user sees.** In `months`, every period shares the card's width, so the plot never
scrolls. A bar is one flat fill of its tone. It takes two thirds of its column, and at most 48px.
Where the period labels do not fit, the chart prints every second, third or later label, counted
from the first period that is not final, or from the latest period. Set `values` to print each
bar's value past its end, in `formatAxis`: over a bar that grows up from zero, and under a bar
that grows down. A value takes at most half the space to the next value,
at the 12px text size, and stays inside the plot. A value that does not fit there is left out.
The readout and the table always show it. A chart that prints no value gives that room to its
bars. `legend`
shows the legend. A period with `estimated` keeps its solid mark in the series
ink. Set `estimated` to `'incomplete'` for the period that is still running, to `'projected'` for a
future period, or to `true` for any other estimate. In `months`, one solid line stands before the
first period that is not final, and the words "Not final" stand over that group. Put the periods
that are not final last. The hover and keyboard readout and each table row say "Incomplete",
"Projected" or "Estimated", followed by the `note`. The readout of a period also compares it with
the period before it. Set `compare: false` on a period to show its value with no comparison text.
A switch at the top right
shows the same numbers as a chart or as a table. In a titled `Card`, the switch stands in the
card's title row. `table={false}` removes the switch and the table. `selectable` with `selected`
and `onSelect` lets the user pick a column, which gets a band behind it. In the other variants, at
phone widths the plot scrolls and the value axis stays. A chart of periods that is wider than its
card opens at its latest period. A bridge opens at its opening total.

**Keyboard and screen reader.** The switch is the first Tab stop and the chart is the second. Left,
Right, Home and End move between columns and announce each one. Enter picks a column when
`selectable` is set. A plot that scrolls adds one more Tab stop for the scroll box. On a touch
screen, the first tap on a mark opens its readout and does not call `onSelect`. After Escape, a
new tap on the same mark opens its readout again. Every value is
reachable at full strength by pointer or keyboard.

### Table values

Use `NumericValue` and `DeltaValue` for a number and a change in a table cell. Use `RowIdentity` for
a company cell with a logo.

```tsx
<NumericValue value={1250.5} unit="EUR" missing="No amount" />
<DeltaValue value="-3.1%" tone="danger" basisId="basis" />
<RowIdentity symbol="NWD" name="Northwind" logo={logoUrl} href="/companies/nwd" />
```

`NumericValue` tells a missing value from zero. `DeltaValue` prints your sign and uses your `tone`.
The colour never supplies the sign. `RowIdentity` shows the first letter of `symbol` when the logo
does not load. `formatNumericValue` and `formatDeltaValue` from the root entry give the same result
as plain text.

## Shared helpers

The root entry `@apliteni/apliteni-ui` publishes the helpers that the React components use. Use
them for markup that you write yourself, or on a server that must give the same result.

| Name | Use |
|------|-----|
| `esc(s)` | Escape a text value for HTML that you write yourself. |
| `safeUrl(url, fallback?)` | Make an address safe. A `javascript:`, `data:` or `vbscript:` address becomes the fallback, `#` by default. |
| `icon(name, cls)`, `illo(name)`, `iconNames`, `illoNames`, `iconCategories` | Line glyphs and illustrations as SVG strings. `sun` and `moon` are also exported. |
| `iconOnlyAllowed`, `iconOnlyNames`, `iconMeanings` | The icon rules as data: which glyphs may stand without a word, and the words that each one may mean. |
| `seedling`, `prism`, `brand` | The brand mark. |
| `ACCENTS`, `accentSwatchStyle(accent)` | The accent names, and the `--swatch` property of a swatch button. |
| `ACCOUNT_NAV` | The kit's default account navigation. |
| `AVATAR_HUES`, `avatarHue(key)`, `avatarInitials(name)` | The avatar hue and initials, for a mark that you draw yourself. |
| `calloutIcons` | The default glyph of each callout tone. |
| `hlCode`, `hlShell`, `codeTokens`, `codeLanguages` | Code highlighting. See [Snippet](#snippet). |
| `rankGroups`, `rankCommands`, `scoreCommand`, `SCORE`, `paletteHotkey()` | The command palette ranking, for a server that sorts the same way. |
| `dropdownMatch`, `dropdownFiltering` | The dropdown search match. |
| `dropdownAvail` | The room that a dropdown panel has below or above its trigger. |
| `filterChipText`, `filterChipName`, `filterChipUnset`, `filterChipItems`, `nextFocusStop`, `focusNextStop` | The filter bar logic, for a filter bar that you draw yourself. |
| `dropdownViewportFit`, `dropdownHeightFit`, `dropdownLift`, `dropdownReveal`, `dropdownRest`, `dropdownSnap`, `filterPanelFit`, `filterPanelRow`, `DD_MENU_FLOOR` | The dropdown placement, for a second dropdown that must place its panel as the kit does. |
| `observeNavFit(row)`, `revealCurrentNav(row)`, `revealFocusedNav(row, target)` | The route tab sizing and scrolling, for a tab row that you draw yourself. |
| `chartScale`, `bridgeWalk`, `pointTarget`, `CHART_FLOOR` | The chart arithmetic, with no DOM. |
| `formatNumericValue`, `formatDeltaValue` | Table values as plain text. |
| `PAGE_SIZES`, `DEFAULT_PAGE_SIZE`, `segmentedNextIndex`, `nearestSection`, `themeIcon` | Small shared values and helpers. |
| `prefersReducedMotion()`, `staggerDelay`, `initReveal`, `replay`, `playEntrance`, `transitionMs(el)`, `ENTRANCE_FALLBACK_MS` | The motion helpers. See [Motion](foundations.md#motion). |

The public surface is the set of names that the root entry exports. Other modules ship in the
package, but you cannot import them.

### Escaping and URLs

`Footer`, `NavTabs`, `TopBar` and `Card` send each address through `safeUrl`. `BackLink` draws
nothing for an address that starts with `javascript:`. The other components, such as `AppShell`,
`SidebarNav`, `Dropdown`, `Button`, `RowIdentity` and `Avatar`, write the address that you give.
Check an address that comes from a user before you pass it to one of them.

`safeUrl` replaces an address that starts with `javascript:`, `data:` or `vbscript:`, in any case,
with the fallback. Before it reads the scheme, it removes tabs and line breaks everywhere, and
spaces and control characters at the start. Other schemes, relative paths and fragments stay as
they are. Use `esc` and `safeUrl` when you write HTML yourself.

## What the kit does not do

- **No build step.** As a result, the [breakpoints are literals](foundations.md#breakpoints).
- **No density system.** `.ui-table--dense`, `.ui-table--compact`, `.ui-table--comfortable` and
  `.ui-cmdk--roomy` are the only density modifiers, and each belongs to one component.
- **No container scale.** There is one `--container`.
- **No second bar for the glyph of a control.** 1.5 CSS px is the line for every stroked mark.
- **No spinner.** A skeleton shows the shape of the content that comes.
- **No support for a vertical writing mode.**

## Choices

### Segmented or tabs?

Ask what is behind the choice. If a choice shows a different block of content, that content is a
panel. Use `Tabs`. It draws the panels, and a screen reader says "tab, 1 of 3". If a choice only
narrows a list, flips a unit or sets a preference, there is no panel. Use `Segmented`. A screen
reader says "pressed" for it. Both give one Tab stop, and both need a name in `label`.

### SuccessPanel or Success?

Ask how much of the screen the confirmation owns. After a form submit, or in a card on a page where
the user stays, use `SuccessPanel` with `title` and `sub`. When the confirmation is the whole screen
and the user needs somewhere to go next, use `Success`. It chooses a layout, holds the next-step
buttons and can count down to a redirect. The two use different classes, so a style change to one
does not change the other.

---

Install, use and publish are in the [top-level README](../README.md).
