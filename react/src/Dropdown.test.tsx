// Shape parity gate for <Dropdown>, and the keyboard model under real key presses.
// why: CONTRIBUTING.md#react-components-react
//
// dropdown() is the source of truth: every case renders both and compares the
// container's class list plus the shape read off each DOM. The one thing not
// compared is `data-dropdown` on the container, which is deliberate — see the test
// that asserts its absence, at the foot of the parity block.
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach } from 'vitest';
import { dropdown, wireDropdown, dropdownMatch } from '@apliteni/apliteni-ui';
import { Dropdown, type DropdownProps, type DropdownEntry } from './Dropdown';
import { classesOf, classesOfEl } from './test/classlist';

afterEach(cleanup);

/** The vanilla factory's output as a DOM container. */
function vanilla(opts: DropdownProps): Element {
  const host = document.createElement('div');
  host.innerHTML = dropdown(opts as Record<string, unknown>);
  return host.firstElementChild!;
}

const ROWS = '.ui-dropdown__item, .ui-dropdown__sep';

/** What both implementations have to agree on, read off a rendered container. */
function shape(dd: Element) {
  const trigger = dd.querySelector('.ui-dropdown__trigger')!;
  const panel = dd.querySelector('.ui-dropdown__panel')!;
  return {
    classes: classesOfEl(dd),
    trigger: {
      tag: trigger.tagName,
      cls: classesOfEl(trigger).join(' '),
      type: trigger.getAttribute('type'),
      haspopup: trigger.getAttribute('aria-haspopup'),
      expanded: trigger.getAttribute('aria-expanded'),
      label: trigger.getAttribute('aria-label'),
      pre: trigger.querySelector('.ui-dropdown__pre')?.textContent ?? null,
      value: trigger.querySelector('.ui-dropdown__value')?.textContent ?? null,
      chevron: trigger.querySelectorAll('.ui-dropdown__chevron').length,
    },
    panel: {
      cls: classesOfEl(panel).join(' '),
      role: panel.getAttribute('role'),
      label: panel.getAttribute('aria-label'),
      maxHeight: (panel as HTMLElement).style.maxHeight || null,
    },
    sections: [...dd.querySelectorAll('.ui-dropdown__section')].map((s) => ({
      role: s.getAttribute('role'),
      hidden: (s as HTMLElement).hidden,
      label: s.getAttribute('aria-label'),
      head: s.querySelector('.ui-dropdown__group')?.textContent ?? null,
      headRole: s.querySelector('.ui-dropdown__group')?.getAttribute('role') ?? null,
      rows: s.querySelectorAll(ROWS).length,
    })),
    rows: [...dd.querySelectorAll(ROWS)].map((el) => ({
      // The tag is compared, not assumed: the factory renders an <a> for a menu row
      // carrying an href, and a shape that read only classes would call a strip of
      // <div>s identical to a list of links.
      tag: el.tagName,
      cls: classesOfEl(el).join(' '),
      role: el.getAttribute('role'),
      tabindex: el.getAttribute('tabindex'),
      value: el.getAttribute('data-value'),
      selected: el.getAttribute('aria-selected'),
      disabled: el.getAttribute('aria-disabled'),
      href: el.getAttribute('href'),
      target: el.getAttribute('target'),
      hook: el.hasAttribute('data-dd-item'),
      hidden: (el as HTMLElement).hidden,
      label: el.querySelector('.ui-dropdown__label')?.textContent ?? null,
      desc: el.querySelector('.ui-dropdown__desc')?.textContent ?? null,
      badge: el.querySelector('.ui-dropdown__badge')?.textContent ?? null,
      badgeCls: classesOfEl(el.querySelector('.ui-dropdown__badge') ?? el).join(' '),
      icons: [...el.querySelectorAll('.ui-dropdown__ic svg, .ui-dropdown__tick svg')]
        .map((svg) => (svg.parentElement as HTMLElement).className),
    })),
  };
}

/** The field, the list and the no-match region — the parts `search` adds. */
function searchShape(dd: Element) {
  const field = dd.querySelector('.ui-dropdown__search-input') as HTMLInputElement | null;
  const list = dd.querySelector('.ui-dropdown__list');
  const none = dd.querySelector('.ui-dropdown__none');
  const active = dd.querySelector('[data-dd-item].is-active');
  return {
    field: field && {
      role: field.getAttribute('role'),
      autocomplete: field.getAttribute('aria-autocomplete'),
      expanded: field.getAttribute('aria-expanded'),
      label: field.getAttribute('aria-label'),
      placeholder: field.placeholder,
      value: field.value,
      off: field.getAttribute('autocomplete'),
      spellcheck: field.getAttribute('spellcheck'),
      hook: field.hasAttribute('data-dd-search'),
      // The ids differ by seed, so what is compared is what they point AT.
      controlsTheList: field.getAttribute('aria-controls') === list?.id,
      namesTheActiveRow: (field.getAttribute('aria-activedescendant') ?? null) === (active?.id ?? null),
    },
    list: list && {
      role: list.getAttribute('role'),
      label: list.getAttribute('aria-label'),
      maxHeight: (list as HTMLElement).style.maxHeight || null,
    },
    glyph: dd.querySelectorAll('.ui-dropdown__search-ic svg').length,
    none: none && {
      role: none.getAttribute('role'),
      empty: none.getAttribute('data-dd-empty'),
      hint: none.getAttribute('data-dd-hint'),
      text: none.textContent,
    },
    // What the query did: which rows are left, and which one Enter would pick.
    showing: [...dd.querySelectorAll('[data-dd-item]')]
      .filter((el) => !(el as HTMLElement).hidden)
      .map((el) => el.querySelector('.ui-dropdown__label')?.textContent),
    active: active?.querySelector('.ui-dropdown__label')?.textContent ?? null,
    seps: [...dd.querySelectorAll('.ui-dropdown__sep')].map((el) => (el as HTMLElement).hidden),
    groups: [...dd.querySelectorAll('.ui-dropdown__section')]
      .filter((el) => !(el as HTMLElement).hidden)
      .map((el) => el.querySelector('.ui-dropdown__group')?.textContent),
    value: dd.querySelector('.ui-dropdown__value')?.textContent ?? null,
  };
}

function parity(name: string, opts: DropdownProps) {
  const factory = vanilla(opts);
  const { container } = render(<Dropdown {...opts} />);
  const react = container.querySelector('.ui-dropdown')!;
  // The rule CONTRIBUTING states, asserted on its own so a failure says so first.
  expect(classesOfEl(react), `${name}: container class list`)
    .toEqual(classesOf(dropdown(opts as Record<string, unknown>)));
  expect(shape(react), `${name}: rendered shape`).toEqual(shape(factory));
  expect(searchShape(react), `${name}: the search parts`).toEqual(searchShape(factory));
  return react;
}

const MENU: DropdownEntry[] = [
  { label: 'Rename', icon: 'edit' },
  { label: 'Duplicate' },
  '---',
  { label: 'Archive', disabled: true },
  { label: 'Delete', danger: true },
];

const SELECT: DropdownEntry[] = [
  { label: 'v1.2.0', value: '1.2.0', selected: true, badge: 'Live' },
  { label: 'v1.1.0', value: '1.1.0' },
  { label: 'v1.0.0', value: '1.0.0', description: 'Last year’s release', badge: { text: 'EOL', tone: 'warn' } },
];

// The list #283 was reported on, cut to seven: accents, a disabled row, a separator.
const CURRENCIES: DropdownEntry[] = [
  { label: 'US dollar (USD)', value: 'USD', selected: true },
  { label: 'Canadian dollar (CAD)', value: 'CAD' },
  { label: 'Euro (EUR)', value: 'EUR' },
  { label: 'Polish złoty (PLN)', value: 'PLN' },
  '---',
  { label: 'Australian dollar (AUD)', value: 'AUD' },
  { label: 'Swiss franc (CHF)', value: 'CHF', disabled: true },
  { label: 'Japanese yen (JPY)', value: 'JPY' },
];

const SECTIONS = [
  { label: 'This project', items: [{ label: 'Settings', href: '/settings' }, { label: 'Members', href: '/members' }] },
  { label: 'Account', items: [{ label: 'Billing', href: '/billing' }, { separator: true } as const, { label: 'Sign out', danger: true }] },
];

const CASES: [string, DropdownProps][] = [
  ['an empty dropdown', {}],
  ['a menu', { items: MENU, ariaLabel: 'Row actions' }],
  ['a menu, inferred from items carrying no value', { items: [{ label: 'Rename' }, { label: 'Delete', danger: true }] }],
  ['a menu with links', { items: [{ label: 'Docs', href: '/docs' }, { label: 'Support', href: 'https://x.test', target: '_blank' }] }],
  ['a select, inferred from a selected item', { items: SELECT }],
  ['a select, named as one', { variant: 'select', items: [{ label: 'One' }, { label: 'Two' }] }],
  ['a menu, named as one over items that carry values', { variant: 'menu', items: SELECT }],
  ['a select with a label and a value', { label: 'version:', value: '1.2.0', items: SELECT }],
  ['a select with a placeholder and nothing picked', { variant: 'select', items: [{ label: 'One' }, { label: 'Two' }], placeholder: 'Pick one…' }],
  ['a link row inside a select is a plain option', { variant: 'select', items: [{ label: 'Docs', href: '/docs' }] }],
  ['a disabled row carrying an href is not a link', { items: [{ label: 'Docs', href: '/docs', disabled: true }] }],
  ['sections', { sections: SECTIONS }],
  ['a section with no label', { sections: [{ items: [{ label: 'One' }] }] }],
  ['a separator written as the shorthand', { items: ['---', { label: 'One' }] }],
  ['badges: a live one, a named tone, a neutral one', {
    items: [{ label: 'A', badge: 'live' }, { label: 'B', badge: { text: 'Beta', tone: 'warn' } }, { label: 'C', badge: 'New' }],
  }],
  ['the end edge', { items: MENU, align: 'end' }],
  ['opening upward', { items: MENU, direction: 'up' }],
  ['a capped, scrolling panel', { items: MENU, scroll: true }],
  ['a capped panel with a height', { items: MENU, scroll: 240 }],
  ['a panel class of its own', { items: MENU, panelClass: 'app-menu' }],
  ['a trigger class of its own', { items: MENU, triggerClass: 'app-trigger' }],
  ['no chevron', { items: MENU, chevron: false }],
  ['an id of its own', { items: MENU, id: 'row-actions' }],
  ['a named panel', { items: MENU, ariaLabel: 'Row actions' }],
  ['an icon in a row', { items: [{ label: 'Rename', icon: 'edit' }] }],
  ['a description under a label', { items: [{ label: 'Rename', description: 'Give it another name' }] }],
  ['a numeric value', { variant: 'select', items: [{ label: '25 rows', value: 25 }] }],
  // ---- search: the static render, before anything is wired or typed ----------
  ['a search field', { items: CURRENCIES, search: true, label: 'currency:', ariaLabel: 'Currency' }],
  ['a search field on a menu, whose rows become options', { items: MENU, search: true, ariaLabel: 'Actions' }],
  ['a search field with every line reworded', {
    items: CURRENCIES,
    ariaLabel: 'Currency',
    search: { placeholder: 'Find a currency', label: 'Search currencies', empty: 'Nothing called “{q}”', hint: 'Try the code.' },
  }],
  ['a preset query, filtered before any wiring runs', { items: CURRENCIES, ariaLabel: 'Currency', search: { query: 'dollar' } }],
  ['a preset query nothing matches, showing the empty state', { items: CURRENCIES, ariaLabel: 'Currency', search: { query: 'xyzzy' } }],
  ['a preset query of spaces, which narrows nothing', { items: CURRENCIES, ariaLabel: 'Currency', search: { query: '   ' } }],
  ['a search field over sections', { sections: SECTIONS, ariaLabel: 'Go to', search: { query: 'bill' } }],
  ['a capped, scrolling search panel', { items: CURRENCIES, ariaLabel: 'Currency', search: true, scroll: 240 }],
  ['a search field on a select', { variant: 'select', items: SELECT, search: true, label: 'version:' }],
];

for (const [name, opts] of CASES) {
  it(`matches the vanilla dropdown: ${name}`, () => {
    parity(name, opts);
  });
}

it('renders open when it is told to, the way `open: true` does', () => {
  const opts: DropdownProps = { items: MENU, ariaLabel: 'Row actions' };
  const { container } = render(<Dropdown {...opts} defaultOpen />);
  const react = container.querySelector('.ui-dropdown')!;
  expect(classesOfEl(react)).toEqual(classesOf(dropdown({ ...opts, open: true })));
  expect(shape(react)).toEqual(shape(vanilla({ ...opts, open: true } as DropdownProps)));
});

it('leaves the container hook wireDropdown() looks for off, and keeps the row contract', () => {
  const { container } = render(<Dropdown items={MENU} />);
  const dd = container.querySelector('.ui-dropdown')!;
  expect(dd.hasAttribute('data-dropdown'), 'a vanilla wiring pass must not adopt this').toBe(false);
  expect(dd.querySelector('[data-dropdown-trigger]')).not.toBeNull();
  expect(dd.querySelector('[data-dropdown-panel]')).not.toBeNull();
  expect(dd.querySelectorAll('[data-dd-item]')).toHaveLength(4);
});

// ---- the keyboard and the pointer -------------------------------------------

const rowsOf = (dd: Element) => [...dd.querySelectorAll<HTMLElement>('[data-dd-item]')];
const openMenu = () => {
  const { container } = render(<Dropdown items={MENU} ariaLabel="Row actions" />);
  return container.querySelector('.ui-dropdown')!;
};

it('a click on the trigger opens and a second click closes', async () => {
  const user = userEvent.setup();
  const dd = openMenu();
  const trigger = within(dd as HTMLElement).getByRole('button');
  await user.click(trigger);
  expect(dd.classList.contains('open')).toBe(true);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await user.click(trigger);
  expect(dd.classList.contains('open')).toBe(false);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('ArrowDown on the trigger opens onto the first row, ArrowUp onto the selected one', async () => {
  const user = userEvent.setup();
  const { container } = render(<Dropdown variant="select" items={SELECT} />);
  const dd = container.querySelector('.ui-dropdown')!;
  const trigger = within(dd as HTMLElement).getByRole('button');
  trigger.focus();
  await user.keyboard('{ArrowDown}');
  expect(dd.classList.contains('open')).toBe(true);
  expect(document.activeElement).toBe(rowsOf(dd)[0]);
  await user.keyboard('{Escape}');
  expect(document.activeElement).toBe(trigger);
  await user.keyboard('{ArrowUp}');
  // v1.2.0 is the selected row here, and it is also the first; the case where the two
  // differ is the test below.
  expect(document.activeElement).toBe(rowsOf(dd)[0]);
});

it('ArrowUp on a closed select opens onto the row that is selected', async () => {
  const user = userEvent.setup();
  const { container } = render(<Dropdown variant="select" items={[
    { label: 'One', value: '1' }, { label: 'Two', value: '2', selected: true },
  ]} />);
  const dd = container.querySelector('.ui-dropdown')!;
  within(dd as HTMLElement).getByRole('button').focus();
  await user.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(rowsOf(dd)[1]);
});

it('the arrows walk the rows, wrap at both ends and step over a disabled row', async () => {
  const user = userEvent.setup();
  const dd = openMenu();
  within(dd as HTMLElement).getByRole('button').focus();
  await user.keyboard('{ArrowDown}');
  const rows = rowsOf(dd);
  const [rename, duplicate, archive, remove] = rows;
  expect(archive).toHaveAttribute('aria-disabled', 'true');
  expect(document.activeElement).toBe(rename);
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(duplicate);
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement, 'the disabled row is not in the ring').toBe(remove);
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement, 'and it wraps').toBe(rename);
  await user.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(remove);
});

it('Home and End go to the first and last rows', async () => {
  const user = userEvent.setup();
  const dd = openMenu();
  within(dd as HTMLElement).getByRole('button').focus();
  await user.keyboard('{ArrowDown}{End}');
  expect(document.activeElement).toBe(rowsOf(dd)[3]);
  await user.keyboard('{Home}');
  expect(document.activeElement).toBe(rowsOf(dd)[0]);
});

it('Enter and Space pick the row focus is on', async () => {
  const user = userEvent.setup();
  const picks: unknown[] = [];
  const { container } = render(
    <Dropdown variant="select" items={SELECT} onSelect={(v) => picks.push(v)} />);
  const dd = container.querySelector('.ui-dropdown')!;
  const trigger = within(dd as HTMLElement).getByRole('button');
  trigger.focus();
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
  expect(picks).toEqual(['1.1.0']);
  expect(dd.classList.contains('open'), 'picking closes the panel').toBe(false);
  expect(document.activeElement, 'and focus comes back to the trigger').toBe(trigger);
  await user.keyboard('{ArrowDown}{ }');
  expect(picks).toEqual(['1.1.0', '1.2.0']);
});

it('a pick writes itself into the trigger and moves the tick, the way selectOption() does', async () => {
  const user = userEvent.setup();
  const { container } = render(<Dropdown label="version:" variant="select" items={SELECT} />);
  const dd = container.querySelector('.ui-dropdown')!;
  expect(dd.querySelector('.ui-dropdown__value')!.textContent).toBe('v1.2.0');
  await user.click(within(dd as HTMLElement).getByRole('button'));
  await user.click(screen.getByText('v1.1.0'));
  expect(dd.querySelector('.ui-dropdown__value')!.textContent).toBe('v1.1.0');
  const rows = rowsOf(dd);
  expect(rows.map((el) => el.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
  expect(rows.map((el) => el.classList.contains('is-selected'))).toEqual([false, true, false]);
});

it('a pick survives a caller that rebuilds its items on every render', async () => {
  const user = userEvent.setup();
  // The ordinary call site: `items` is a fresh array of fresh objects each render, so
  // the row picked a moment ago is an equal object and not the same one.
  const Rebuilt = () => {
    const [n, setN] = useState(0);
    return (
      <>
        <button type="button" onClick={() => setN(n + 1)}>Re-render {n}</button>
        <Dropdown variant="select" ariaLabel="Version"
          items={['1.2.0', '1.1.0'].map((v) => ({ label: `v${v}`, value: v }))} />
      </>
    );
  };
  render(<Rebuilt />);
  const dd = document.querySelector('.ui-dropdown')!;
  await user.click(within(dd as HTMLElement).getByRole('button'));
  await user.click(screen.getByText('v1.1.0'));
  expect(rowsOf(dd).map((el) => el.getAttribute('aria-selected'))).toEqual(['false', 'true']);
  await user.click(screen.getByText(/Re-render/));
  expect(dd.querySelector('.ui-dropdown__value')!.textContent).toBe('v1.1.0');
  expect(rowsOf(dd).map((el) => el.getAttribute('aria-selected')),
    'the tick is on the row that was picked, not gone with the objects').toEqual(['false', 'true']);
});

it('two rows that share a label are told apart by their values', async () => {
  // A real list has these: two accounts called "Main", two regions called "Frankfurt"
  // under different providers. The pick is keyed on the value when there is one, so the
  // row that takes the tick is the row that was clicked and not its namesake.
  const user = userEvent.setup();
  const picks: unknown[] = [];
  const { container } = render(
    <Dropdown variant="select" ariaLabel="Account" onSelect={(v) => picks.push(v)} items={[
      { label: 'Main', value: 'eu-main' },
      { label: 'Main', value: 'us-main' },
      { label: 'Spare', value: 'spare' },
    ]} />);
  const dd = container.querySelector('.ui-dropdown')!;
  await user.click(within(dd as HTMLElement).getByRole('button'));
  await user.click(rowsOf(dd)[1]);
  expect(picks).toEqual(['us-main']);
  expect(rowsOf(dd).map((el) => el.getAttribute('aria-selected')),
    'the namesake above it keeps its own state').toEqual(['false', 'true', 'false']);
  expect(rowsOf(dd).map((el) => el.classList.contains('is-selected'))).toEqual([false, true, false]);
});

it('a caller that moves the selection itself takes the pick back', async () => {
  const user = userEvent.setup();
  const Held = () => {
    const [at, setAt] = useState('1.2.0');
    return (
      <>
        <button type="button" onClick={() => setAt('1.0.0')}>Elsewhere</button>
        <Dropdown variant="select" ariaLabel="Version"
          items={['1.2.0', '1.1.0', '1.0.0'].map((v) => ({ label: `v${v}`, value: v, selected: v === at }))} />
      </>
    );
  };
  render(<Held />);
  const dd = document.querySelector('.ui-dropdown')!;
  await user.click(within(dd as HTMLElement).getByRole('button'));
  await user.click(screen.getByText('v1.1.0'));
  expect(dd.querySelector('.ui-dropdown__value')!.textContent).toBe('v1.1.0');
  // The owner of the rows moves the selection for its own reasons — a refetch, another
  // control on the same query. What it says goes.
  await user.click(screen.getByText('Elsewhere'));
  expect(dd.querySelector('.ui-dropdown__value')!.textContent).toBe('v1.0.0');
  expect(rowsOf(dd).map((el) => el.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true']);
});

it('a pick the caller took back does not come back when the caller returns to where it was', async () => {
  // A pick is taken back by the caller moving its selection, and taken back for good: a
  // list that goes a → b → a is one refetch and one undo, not permission for a pick made
  // three renders ago to reappear over the caller's own answer — silently, because
  // nothing reports it. Comparing the pick against the caller's current selection is not
  // enough for that; the pick has to be dropped when the caller first moves.
  const user = userEvent.setup();
  const Held = () => {
    const [at, setAt] = useState('1.2.0');
    return (
      <>
        <button type="button" onClick={() => setAt('1.1.0')}>To v1.1.0</button>
        <button type="button" onClick={() => setAt('1.2.0')}>Back to v1.2.0</button>
        <Dropdown variant="select" ariaLabel="Version"
          items={['1.2.0', '1.1.0', '1.0.0'].map((v) => ({ label: `v${v}`, value: v, selected: v === at }))} />
      </>
    );
  };
  render(<Held />);
  const dd = document.querySelector('.ui-dropdown')!;
  const value = () => dd.querySelector('.ui-dropdown__value')!.textContent;
  await user.click(within(dd as HTMLElement).getByRole('button', { name: /v1\.2\.0/ }));
  await user.click(screen.getByText('v1.0.0'));
  expect(value(), 'the reader picked it').toBe('v1.0.0');
  await user.click(screen.getByText('To v1.1.0'));
  expect(value(), 'the caller moved, so the caller wins').toBe('v1.1.0');
  await user.click(screen.getByText('Back to v1.2.0'));
  expect(value(), 'and it stays the caller’s when the caller goes back').toBe('v1.2.0');
  expect(rowsOf(dd).map((el) => el.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
});

it('a menu row reports its pick and does not move a tick', async () => {
  const user = userEvent.setup();
  const picks: string[] = [];
  const { container } = render(
    <Dropdown items={[{ label: 'Rename' }, { label: 'Delete', danger: true }]}
      onSelect={(_v, item) => picks.push(item.label)} />);
  const dd = container.querySelector('.ui-dropdown')!;
  await user.click(within(dd as HTMLElement).getByRole('button'));
  await user.click(screen.getByText('Delete'));
  expect(picks).toEqual(['Delete']);
  expect(dd.querySelectorAll('.ui-dropdown__tick')).toHaveLength(0);
});

it('a disabled row picks nothing and leaves the panel open', async () => {
  const user = userEvent.setup();
  const picks: string[] = [];
  const { container } = render(
    <Dropdown items={MENU} onSelect={(_v, item) => picks.push(item.label)} defaultOpen />);
  const dd = container.querySelector('.ui-dropdown')!;
  await user.click(screen.getByText('Archive'));
  expect(picks).toEqual([]);
  expect(dd.classList.contains('open')).toBe(true);
});

it('Escape closes and returns focus to the trigger; Tab closes and does not', async () => {
  const user = userEvent.setup();
  const dd = openMenu();
  const trigger = within(dd as HTMLElement).getByRole('button');
  trigger.focus();
  await user.keyboard('{ArrowDown}{Escape}');
  expect(dd.classList.contains('open')).toBe(false);
  expect(document.activeElement).toBe(trigger);
  await user.keyboard('{ArrowDown}');
  expect(dd.classList.contains('open')).toBe(true);
  await user.tab();
  expect(dd.classList.contains('open')).toBe(false);
});

it('a click outside closes it, and a click inside the panel does not', async () => {
  const user = userEvent.setup();
  render(<><button type="button">Elsewhere</button><Dropdown items={MENU} defaultOpen /></>);
  const dd = document.querySelector('.ui-dropdown')!;
  await user.click(dd.querySelector('.ui-dropdown__panel')!);
  expect(dd.classList.contains('open')).toBe(true);
  await user.click(screen.getByText('Elsewhere'));
  expect(dd.classList.contains('open')).toBe(false);
});

it('opening one dropdown closes another, as closeAllDropdowns() does', async () => {
  const user = userEvent.setup();
  render(
    <>
      <Dropdown items={MENU} ariaLabel="First" triggerContent="First" />
      <Dropdown items={MENU} ariaLabel="Second" triggerContent="Second" />
    </>,
  );
  const [first, second] = [...document.querySelectorAll('.ui-dropdown')];
  await user.click(screen.getByText('First'));
  expect(first.classList.contains('open')).toBe(true);
  await user.click(screen.getByText('Second'));
  expect(second.classList.contains('open')).toBe(true);
  expect(first.classList.contains('open')).toBe(false);
});

// ---- controlled, and the row a consumer draws --------------------------------

it('a controlled `open` is the host’s, and every close reports through onOpenChange', async () => {
  const user = userEvent.setup();
  const seen: boolean[] = [];
  const Held = () => {
    const [open, setOpen] = useState(false);
    return (
      <Dropdown items={MENU} open={open} onOpenChange={(next) => { seen.push(next); setOpen(next); }} />
    );
  };
  render(<Held />);
  const dd = document.querySelector('.ui-dropdown')!;
  await user.click(within(dd as HTMLElement).getByRole('button'));
  expect(seen).toEqual([true]);
  await user.keyboard('{Escape}');
  expect(seen).toEqual([true, false]);
  expect(dd.classList.contains('open')).toBe(false);
});

it('a host that refuses the change keeps the panel open', async () => {
  const user = userEvent.setup();
  render(<Dropdown items={MENU} open onOpenChange={() => {}} />);
  const dd = document.querySelector('.ui-dropdown')!;
  await user.keyboard('{Escape}');
  expect(dd.classList.contains('open'), 'the prop decides, not the component').toBe(true);
});

it('a row drawn by the caller keeps the row’s classes, role, tab stop and keyboard', async () => {
  const user = userEvent.setup();
  const picks: string[] = [];
  // Standing in for a router <Link>: a plain <a> with a prop of its own.
  const Link = ({ to, ...rest }: { to: string } & React.ComponentPropsWithoutRef<'a'>) => (
    <a data-to={to} href={to} {...rest} />
  );
  const items: DropdownEntry[] = [
    { label: 'Settings', href: '/settings' },
    { label: 'Members', href: '/members' },
  ];
  const { container } = render(
    <Dropdown items={items} onSelect={(_v, item) => picks.push(item.label)}
      row={(item, props) => <Link to={item.href!} {...props} />} />);
  const dd = container.querySelector('.ui-dropdown')!;
  const rows = rowsOf(dd);
  expect(rows.map((el) => el.tagName)).toEqual(['A', 'A']);
  expect(rows.map((el) => el.getAttribute('data-to'))).toEqual(['/settings', '/members']);
  // The same shape the factory's own rows carry.
  expect(shape(dd).rows).toEqual(shape(vanilla({ items } as DropdownProps)).rows
    .map((r) => ({ ...r })));
  within(dd as HTMLElement).getByRole('button').focus();
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(rows[0]);
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement, 'the arrows still move').toBe(rows[1]);
  await user.keyboard('{Enter}');
  expect(picks).toEqual(['Members']);
});

// ---- search: the factory plus its wiring, against the component ---------------
//
// The strongest form of the parity rule this file exists for: the same items and the
// same query, typed into each with real key presses, must leave the same rows showing
// and the same row picked. The kit's own wireDropdown() drives one side; nothing here
// re-implements the match, because both sides call dropdownMatch().

/** Mount the factory's html, wire it, open it, type — then read the panel back. */
async function wired(opts: DropdownProps, query: string) {
  const user = userEvent.setup();
  const host = document.createElement('div');
  host.innerHTML = dropdown(opts as Record<string, unknown>);
  document.body.appendChild(host);
  wireDropdown(document);
  const dd = host.firstElementChild!;
  await user.click(dd.querySelector('.ui-dropdown__trigger')!);
  if (query) await user.type(dd.querySelector('.ui-dropdown__search-input')!, query);
  const read = searchShape(dd);
  host.remove();
  return read;
}

/** The same, through the component. */
async function typed(opts: DropdownProps, query: string) {
  const user = userEvent.setup();
  const { container, unmount } = render(<Dropdown {...opts} />);
  const dd = container.querySelector('.ui-dropdown')!;
  await user.click(dd.querySelector('.ui-dropdown__trigger')!);
  if (query) await user.type(dd.querySelector('.ui-dropdown__search-input')!, query);
  const read = searchShape(dd);
  unmount();
  return read;
}

const SEARCHABLE: DropdownProps = {
  label: 'currency:', ariaLabel: 'Currency', items: CURRENCIES, search: true,
};

const QUERIES: [string, string, DropdownProps][] = [
  ['nothing typed', '', SEARCHABLE],
  ['a word in the middle of the label', 'dollar', SEARCHABLE],
  ['the code at the end', 'usd', SEARCHABLE],
  ['a capital query against lowercase rows', 'DOLLAR', SEARCHABLE],
  ['a query that finds one row', 'yen', SEARCHABLE],
  ['an accent the row has and the query does not', 'zloty', SEARCHABLE],
  ['a query that finds the disabled row and nothing else', 'franc', SEARCHABLE],
  ['a query nothing matches', 'xyzzy', SEARCHABLE],
  ['a query of spaces, which narrows nothing', '   ', SEARCHABLE],
  ['one letter', 'a', SEARCHABLE],
  ['sections, where a whole group goes', 'bill', { sections: SECTIONS, ariaLabel: 'Go to', search: true }],
  ['sections, where both groups keep a row', 'e', { sections: SECTIONS, ariaLabel: 'Go to', search: true }],
];

for (const [name, query, opts] of QUERIES) {
  it(`hides what the kit's own wiring hides: ${name}`, async () => {
    const theirs = await wired(opts, query);
    cleanup();
    const mine = await typed(opts, query);
    expect(mine.showing, `${name}: the rows left showing`).toEqual(theirs.showing);
    expect(mine, `${name}: the panel after typing`).toEqual(theirs);
  });
}

it('the rows it leaves showing are the ones the published matcher keeps', async () => {
  // The gate above compares two implementations; this one compares the result against
  // the rule itself, so both agreeing on the wrong thing still fails.
  const mine = await typed(SEARCHABLE, 'dollar');
  const byRule = CURRENCIES.filter((it) => typeof it !== 'string' && !('separator' in it))
    .filter((it) => dropdownMatch((it as { label: string }).label, 'dollar'))
    .map((it) => (it as { label: string }).label);
  expect(mine.showing).toEqual(byRule);
  expect(byRule.length).toBe(3);
});

// ---- search: the keyboard ----------------------------------------------------

const openSearch = async (props: Partial<DropdownProps> = {}) => {
  const user = userEvent.setup();
  const { container } = render(<Dropdown {...SEARCHABLE} {...props} />);
  const dd = container.querySelector('.ui-dropdown')!;
  await user.click(dd.querySelector('.ui-dropdown__trigger')!);
  return { user, dd, field: dd.querySelector('.ui-dropdown__search-input') as HTMLInputElement };
};

it('opening puts focus in the field, on the selected row, however it was opened', async () => {
  const { dd, field } = await openSearch();
  expect(document.activeElement).toBe(field);
  expect(searchShape(dd).active).toBe('US dollar (USD)');
  expect(field.getAttribute('aria-activedescendant')).toBe(dd.querySelector('.is-active')!.id);
});

it('the arrows walk the rows still showing and leave focus in the field', async () => {
  const { user, dd, field } = await openSearch();
  await user.type(field, 'dollar');
  expect(searchShape(dd).showing).toHaveLength(3);
  expect(searchShape(dd).active, 'the first row still showing').toBe('US dollar (USD)');
  await user.keyboard('{ArrowDown}');
  expect(searchShape(dd).active).toBe('Canadian dollar (CAD)');
  expect(document.activeElement, 'focus never leaves the field').toBe(field);
  await user.keyboard('{ArrowDown}{ArrowDown}');
  expect(searchShape(dd).active, 'and it wraps at the end').toBe('US dollar (USD)');
  await user.keyboard('{ArrowUp}');
  expect(searchShape(dd).active).toBe('Australian dollar (AUD)');
});

it('a disabled row is never the row Enter would pick', async () => {
  const { user, dd, field } = await openSearch();
  await user.type(field, 'franc');
  expect(searchShape(dd).showing, 'it is shown').toEqual(['Swiss franc (CHF)']);
  expect(searchShape(dd).active, 'and it is not picked').toBe(null);
  await user.keyboard('{ArrowDown}');
  expect(searchShape(dd).active).toBe(null);
});

it('Enter picks the active row, writes it into the trigger and closes', async () => {
  const picks: unknown[] = [];
  const { user, dd, field } = await openSearch({ variant: 'select', onSelect: (v) => picks.push(v) });
  await user.type(field, 'yen');
  await user.keyboard('{Enter}');
  expect(picks).toEqual(['JPY']);
  expect(dd.classList.contains('open')).toBe(false);
  expect(dd.querySelector('.ui-dropdown__value')!.textContent).toBe('Japanese yen (JPY)');
});

it('Enter with nothing showing does nothing', async () => {
  const picks: unknown[] = [];
  const { user, dd, field } = await openSearch({ onSelect: (v) => picks.push(v) });
  await user.type(field, 'xyzzy');
  await user.keyboard('{Enter}');
  expect(picks).toEqual([]);
  expect(dd.classList.contains('open')).toBe(true);
});

it('Home and End belong to the caret, not to the list', async () => {
  const { user, dd, field } = await openSearch();
  await user.type(field, 'dollar');
  await user.keyboard('{ArrowDown}');
  const active = searchShape(dd).active;
  await user.keyboard('{Home}');
  expect(searchShape(dd).active, 'Home moved the caret and not the pick').toBe(active);
  await user.keyboard('{End}');
  expect(searchShape(dd).active).toBe(active);
  expect(document.activeElement).toBe(field);
  expect(dd.classList.contains('open')).toBe(true);
});

it('Escape closes and returns focus to the trigger; Tab closes', async () => {
  const { user, dd, field } = await openSearch();
  await user.type(field, 'euro');
  await user.keyboard('{Escape}');
  expect(dd.classList.contains('open')).toBe(false);
  expect(document.activeElement).toBe(dd.querySelector('.ui-dropdown__trigger'));
  await user.keyboard('{ArrowDown}');
  expect(dd.classList.contains('open')).toBe(true);
  await user.tab();
  expect(dd.classList.contains('open')).toBe(false);
});

it('every open starts from the whole list', async () => {
  const { user, dd, field } = await openSearch();
  await user.type(field, 'yen');
  expect(searchShape(dd).showing).toHaveLength(1);
  await user.keyboard('{Escape}');
  await user.click(dd.querySelector('.ui-dropdown__trigger')!);
  expect((dd.querySelector('.ui-dropdown__search-input') as HTMLInputElement).value).toBe('');
  expect(searchShape(dd).showing).toHaveLength(7);
});

it('the pointer moves the pick, so Enter never takes a row other than the one under it', async () => {
  const { user, dd } = await openSearch();
  const row = [...dd.querySelectorAll('[data-dd-item]')][2];
  await user.hover(row);
  expect(searchShape(dd).active).toBe('Euro (EUR)');
});

it('a search dropdown whose rows the caller draws is still filtered and still picked', async () => {
  // The case #304 reports: a search dropdown whose rows must be router links. A plain
  // <a> with a prop of its own stands in for the router's <Link>.
  const user = userEvent.setup();
  const picks: string[] = [];
  const Link = ({ to, ...rest }: { to: string } & React.ComponentPropsWithoutRef<'a'>) => (
    <a data-to={to} {...rest} />
  );
  const items: DropdownEntry[] = [
    { label: 'Invoices', value: 'inv', href: '/invoices' },
    { label: 'Payouts', value: 'pay', href: '/payouts' },
    { label: 'Customers', value: 'cus', href: '/customers' },
  ];
  const { container } = render(
    <Dropdown ariaLabel="Go to" triggerContent="Jump to…" items={items} search
      onSelect={(_v, item) => picks.push(item.label)}
      row={(item, props) => <Link to={item.href!} {...props} />} />);
  const dd = container.querySelector('.ui-dropdown')!;
  await user.click(dd.querySelector('.ui-dropdown__trigger')!);
  const field = dd.querySelector('.ui-dropdown__search-input') as HTMLInputElement;
  expect([...dd.querySelectorAll('[data-dd-item]')].map((el) => el.tagName)).toEqual(['A', 'A', 'A']);
  await user.type(field, 'pay');
  expect(searchShape(dd).showing).toEqual(['Payouts']);
  expect(searchShape(dd).active).toBe('Payouts');
  // Enter clicks the row itself, which is what makes a router link navigate.
  await user.keyboard('{Enter}');
  expect(picks).toEqual(['Payouts']);
});

test('state badge ink and generic metadata match the factory classification', () => {
  const cases: Array<[string | { text: string; tone: string }, string]> = [
    ['Off', 'state'], ['UNSET', 'state'], ['Disabled', 'state'], ['Archive', 'state'], ['Archived', 'state'],
    [{ text: 'Off', tone: 'neutral' }, 'neutral'], [{ text: 'Archivado', tone: 'state' }, 'state'],
    [{ text: 'Off', tone: 'accent' }, 'accent'], ['12 records', 'neutral'], ['Archive guide', 'neutral'], ['Live', 'live'],
  ];
  const { container } = render(<Dropdown items={cases.map(([badge], i) => ({ label: `Option ${i}`, badge }))} />);
  expect([...container.querySelectorAll('.ui-dropdown__badge')].map(el => el.className))
    .toEqual(cases.map(([, tone]) => `ui-dropdown__badge is-${tone}`));
});
