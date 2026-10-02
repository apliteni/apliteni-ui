// Shape parity gate for <Dropdown>, and the keyboard model under real key presses.
// React components must match the vanilla class names.
//
// dropdown() is the source of truth: every case renders both and compares the
// container's class list plus the shape read off each DOM. The one thing not
// compared is `data-dropdown` on the container, which is deliberate — see the test
// that asserts its absence, at the foot of the parity block.
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, vi } from 'vitest';
import { dropdown, wireDropdown, dropdownMatch, filterPanelFit } from '@apliteni/apliteni-ui';
import { Dropdown, type DropdownProps, type DropdownEntry } from './Dropdown';
import { classesOf, classesOfEl } from './test/classlist';

afterEach(cleanup);
/* The ResizeObserver chipRow({ observer: true }) installs is global, so a later test
 * would otherwise take the observed path by accident. */
afterEach(() => { delete (window as unknown as { ResizeObserver?: unknown }).ResizeObserver; });

/* jsdom has no ResizeObserver, which is why the `resize` cases below reach the
 * fallback path at all. This one reports on demand, so the path a browser actually
 * takes can be driven: observe() hands back the current box at once, as the real one
 * does, and the harness's settleRow() is the row changing afterwards — the shell's
 * rail finishing its 250ms. */
class FakeObserver {
  targets: Element[] = [];

  constructor(readonly cb: (entries: { target: Element }[], self: FakeObserver) => void) {
    FakeObserver.live.push(this);
  }

  observe(target: Element) { this.targets.push(target); this.cb([{ target }], this); }

  unobserve() { /* the component disconnects instead */ }

  disconnect() { this.targets.length = 0; }

  static live: FakeObserver[] = [];
}

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
  // Check class parity separately so failures name the mismatch.
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

// ---- A filter chip's menu -----------------------------------------------------
// Inside `.ui-filter-bar__chip` an open menu takes the kit's menu floor and slides
// back along the row. The arithmetic is the kit's, held by
// src/components/filter-panel-fit.test.js; what this half owns is writing the
// numbers the stylesheet reads, writing them again when the viewport moves, and
// giving a search panel's inline pin back on close. Each of the three was a defect
// this component shipped while the vanilla wiring did not.
// why: docs/specification.md#a-filter-row-holds-its-panels
//
// LIMITS: JSDOM lays nothing out, so the row and the dropdown are given rects and
// the panel the width a browser would have bounded it to. That a rendered menu
// obeys the properties is scripts/evidence/filter-bar-fit.mjs's measurement.
// Left-to-right rows only.

const PANEL_PROPS = ['room', 'shift', 'floor'];
const SECTORS: DropdownEntry[] = [
  { label: 'All', value: 'All', selected: true },
  { label: 'Consumer Discretionary', value: 'cons' },
];

/** One <Dropdown> in a filter row, with the two rects filterPanelFit() reads and
 *  the width the stylesheet would have left the panel at. `resize()` moves the row
 *  the way a rotation does: new numbers, then the event. */
function chipRow({ rowWidth = 1200, left = 146, search = false, panelWidth = 240,
  observer = false } = {}) {
  // Installed before the render, because the open effect reads it. Taken off in afterEach.
  FakeObserver.live = [];
  if (observer) (window as unknown as { ResizeObserver?: unknown }).ResizeObserver = FakeObserver;
  const observers = FakeObserver.live;
  const { container } = render(
    <fieldset className="ui-filter-bar" data-filter-bar="">
      <legend className="ui-filter-bar__legend">Filters</legend>
      <fieldset className="ui-filter-bar__chip" data-filter-id="sector">
        <legend className="ui-filter-bar__legend">Sector</legend>
        <Dropdown variant="select" ariaLabel="Sector" items={SECTORS} search={search || undefined} />
      </fieldset>
    </fieldset>);
  const bar = container.querySelector('.ui-filter-bar')!;
  const dd = container.querySelector('.ui-dropdown')!;
  const panel = dd.querySelector('.ui-dropdown__panel') as HTMLElement;
  const at = { rowWidth, left, panelWidth };
  vi.spyOn(bar, 'getBoundingClientRect').mockImplementation(
    () => ({ left: 0, right: at.rowWidth, width: at.rowWidth }) as DOMRect);
  vi.spyOn(dd, 'getBoundingClientRect').mockImplementation(
    () => ({ left: at.left, right: at.left + 60, width: 60 }) as DOMRect);
  vi.spyOn(panel, 'offsetWidth', 'get').mockImplementation(() => at.panelWidth);
  return {
    user: userEvent.setup(), dd, panel, bar, observers,
    trigger: dd.querySelector('.ui-dropdown__trigger') as HTMLElement,
    fit: () => PANEL_PROPS.map((p) => panel.style.getPropertyValue(`--ui-filter-panel-${p}`)),
    resize: (next: Partial<typeof at>) => {
      Object.assign(at, next);
      window.dispatchEvent(new Event('resize'));
    },
    /** The row's own box changing, which is what a ResizeObserver reports. */
    settleRow: (next: Partial<typeof at>) => {
      Object.assign(at, next);
      for (const ro of observers) for (const target of ro.targets) ro.cb([{ target }], ro);
    },
    /** The panel's fade reaching its end. */
    endFade: () => {
      const e = new Event('transitionend') as TransitionEvent & { propertyName: string };
      e.propertyName = 'opacity';
      panel.dispatchEvent(e);
    },
  };
}

it('an open chip menu carries every number the kit measured', async () => {
  // Derived from the fit rather than listed, so a number the kit starts returning
  // and this component does not write fails here. React wrote two of the three,
  // which left the published `floor` argument unable to change a rendered width.
  const row = chipRow();
  await row.user.click(row.trigger);
  const fit = filterPanelFit(row.dd)!;
  const numbers = Object.entries(fit).filter(([, value]) => typeof value === 'number');
  expect(numbers).toHaveLength(3);
  for (const [key, value] of numbers) {
    expect(row.panel.style.getPropertyValue(`--ui-filter-panel-${key}`), key).toBe(`${value}px`);
  }
  expect(row.fit()).toEqual(['1054px', '0px', '240px']);
});

it('a viewport change re-measures a menu that is still open', async () => {
  // Opened in a 1200px row and left open in a 358px one — a rotation. Holding the
  // room it was fitted to put the menu 14px off the page.
  const row = chipRow();
  await row.user.click(row.trigger);
  expect(row.fit()).toEqual(['1054px', '0px', '240px']);
  row.resize({ rowWidth: 358 });
  expect(row.fit()).toEqual(['240px', '28px', '240px']);
});

it('a shut menu is given no numbers, and a resize does not start measuring', () => {
  // Shut, the panel keeps the trigger's width from the stylesheet alone, which is
  // what holds #467 on a page where nothing ran.
  const row = chipRow();
  expect(row.fit()).toEqual(['', '', '']);
  row.resize({ rowWidth: 358 });
  expect(row.fit()).toEqual(['', '', '']);
});

it('a searchable chip gives its pinned width back when its fade ends', async () => {
  /* The panel holds the width the whole list needed as an inline `min-width`, and
   * inline beats the sheet that holds a shut panel to its trigger. Left behind,
   * that is #467 at the menu floor's width: a shut 240px panel made a 476px page
   * on a 390px view. Given back at the END of the fade, because the pin is part of
   * the open geometry and the panel is still being painted. */
  const row = chipRow({ search: true });
  await row.user.click(row.trigger);
  expect(row.panel.style.minWidth).toBe('240px');
  await row.user.keyboard('{Escape}');
  expect(row.dd.classList.contains('open')).toBe(false);
  expect(row.panel.style.minWidth).toBe('240px');
  row.endFade();
  expect(row.panel.style.minWidth).toBe('');
});

it('the row an open menu is fitted to is the box that is watched', async () => {
  /* Not the viewport. `resize` fires before a row whose width is animating has
   * settled — the shell's rail transitions over --dur-med — so the handler read a
   * row 70px narrower than it ends up and the menu kept that number. */
  const row = chipRow({ observer: true });
  await row.user.click(row.trigger);
  expect(row.observers).toHaveLength(1);
  expect(row.observers[0].targets).toEqual([row.bar]);
});

it('a row that settles after the event is measured again', async () => {
  // The screener: opened at 1280, narrowed, and the rail still widening the column
  // under the menu. The menu has to end up at the row it settles at.
  const row = chipRow({ observer: true });
  await row.user.click(row.trigger);
  expect(row.fit()).toEqual(['1054px', '0px', '240px']);
  row.settleRow({ rowWidth: 143.625, left: 5 });
  expect(row.fit()).toEqual(['143.625px', '5px', '143.625px']);
  row.settleRow({ rowWidth: 214, left: 5 });
  expect(row.fit()).toEqual(['214px', '5px', '214px']);
});

it('the row is let go when the menu closes', async () => {
  const row = chipRow({ observer: true });
  await row.user.click(row.trigger);
  await row.user.keyboard('{Escape}');
  expect(row.observers[0].targets).toEqual([]);
});

it('where a row is watched, a resize does not measure as well', async () => {
  /* Two answers to one change, and the worse of them arrives second: the `resize`
   * handler reads the row mid-animation. It is the fallback for a view with no
   * ResizeObserver, not a second opinion. */
  const row = chipRow({ observer: true });
  await row.user.click(row.trigger);
  row.settleRow({ rowWidth: 214, left: 5 });
  expect(row.fit()).toEqual(['214px', '5px', '214px']);
  row.resize({ rowWidth: 143.625, left: 5 });
  expect(row.fit()).toEqual(['214px', '5px', '214px']);
});

it('a closing chip menu keeps its open geometry until the fade ends', async () => {
  /* `.ui-dropdown.open` stops matching in the frame the menu closes; the panel goes
   * on being painted for --dur-med. Dropping the fit there collapsed an opaque 240px
   * menu to its 48px trigger and jumped it 67px sideways — #549, on the way out. */
  const row = chipRow();
  await row.user.click(row.trigger);
  expect(row.fit()).toEqual(['1054px', '0px', '240px']);
  await row.user.keyboard('{Escape}');
  expect(row.dd.classList.contains('open')).toBe(false);
  expect(row.panel.classList.contains('is-closing')).toBe(true);
  expect(row.fit()).toEqual(['1054px', '0px', '240px']);
  row.endFade();
  expect(row.panel.classList.contains('is-closing')).toBe(false);
  expect(row.fit()).toEqual(['', '', '']);
});

it('only the panel\'s own fade ends the hold', async () => {
  // A row's background transition bubbles to the panel too, and it finishes first.
  const row = chipRow();
  await row.user.click(row.trigger);
  await row.user.keyboard('{Escape}');
  const other = new Event('transitionend', { bubbles: true }) as TransitionEvent & { propertyName: string };
  other.propertyName = 'background';
  row.dd.querySelector('.ui-dropdown__item')!.dispatchEvent(other);
  expect(row.panel.classList.contains('is-closing')).toBe(true);
  row.endFade();
  expect(row.panel.classList.contains('is-closing')).toBe(false);
});

it('the hold is released on a timer when transitionend never comes', async () => {
  // A fade that did not run fires nothing — and jsdom fires nothing at all, which is
  // the case this timer is written for. The length comes from the sheet.
  const row = chipRow();
  await row.user.click(row.trigger);
  await row.user.keyboard('{Escape}');
  expect(row.panel.classList.contains('is-closing')).toBe(true);
  await new Promise((done) => { setTimeout(done, 120); });
  expect(row.panel.classList.contains('is-closing')).toBe(false);
  expect(row.fit()).toEqual(['', '', '']);
});

it('re-opening mid-fade keeps the new fit and drops the hold', async () => {
  /* The abandoned wait must not fire late: it would clear the geometry the new open
   * has just written, leaving an OPEN menu at its trigger's width. */
  const row = chipRow();
  await row.user.click(row.trigger);
  await row.user.keyboard('{Escape}');
  expect(row.panel.classList.contains('is-closing')).toBe(true);
  await row.user.click(row.trigger);
  expect(row.dd.classList.contains('open')).toBe(true);
  expect(row.panel.classList.contains('is-closing')).toBe(false);
  expect(row.fit()).toEqual(['1054px', '0px', '240px']);
  await new Promise((done) => { setTimeout(done, 120); });
  expect(row.fit()).toEqual(['1054px', '0px', '240px']);
});

it('a chip menu that was never opened is given no geometry to hold', async () => {
  /* The close effect runs on first render too. Giving a never-opened panel the open
   * width is #467 exactly: a hidden box wider than its trigger widens the page. */
  const row = chipRow();
  expect(row.panel.classList.contains('is-closing')).toBe(false);
  expect(row.fit()).toEqual(['', '', '']);
  await new Promise((done) => { setTimeout(done, 120); });
  expect(row.panel.classList.contains('is-closing')).toBe(false);
});

it('a searchable chip reads its pin again at the new width', async () => {
  // Re-fitting the properties alone leaves the pin from the old row, and a pin
  // wider than the row outranks every bound in the sheet.
  const row = chipRow({ search: true });
  await row.user.click(row.trigger);
  expect(row.panel.style.minWidth).toBe('240px');
  row.resize({ rowWidth: 200, panelWidth: 200 });
  expect(row.fit()).toEqual(['200px', '146px', '200px']);
  expect(row.panel.style.minWidth).toBe('200px');
});

/** The add control's menu in the same row (#496). Not a chip's, so what makes it a
 *  subject is the width it asks for; JSDOM loads no stylesheet, so the ask is set on
 *  the panel the way src/styles/filter-bar.css sets it. */
function addRow({ rowWidth = 1200, left = 146, panelWidth = 320 } = {}) {
  const { container } = render(
    <fieldset className="ui-filter-bar" data-filter-bar="">
      <legend className="ui-filter-bar__legend">Filters</legend>
      <div data-filter-add="">
        <Dropdown variant="menu" label="Add filter" ariaLabel="Add filter" items={SECTORS} />
      </div>
    </fieldset>);
  const bar = container.querySelector('.ui-filter-bar')!;
  const dd = container.querySelector('.ui-dropdown')!;
  const panel = dd.querySelector('.ui-dropdown__panel') as HTMLElement;
  panel.style.setProperty('--ui-filter-panel-ask', '320px');
  const at = { rowWidth, left, panelWidth };
  vi.spyOn(bar, 'getBoundingClientRect').mockImplementation(
    () => ({ left: 0, right: at.rowWidth, width: at.rowWidth }) as DOMRect);
  vi.spyOn(dd, 'getBoundingClientRect').mockImplementation(
    () => ({ left: at.left, right: at.left + 99, width: 99 }) as DOMRect);
  vi.spyOn(panel, 'offsetWidth', 'get').mockImplementation(() => at.panelWidth);
  return {
    user: userEvent.setup(), dd, panel,
    trigger: dd.querySelector('.ui-dropdown__trigger') as HTMLElement,
    fit: () => PANEL_PROPS.map((p) => panel.style.getPropertyValue(`--ui-filter-panel-${p}`)),
    resize: (next: Partial<typeof at>) => {
      Object.assign(at, next);
      window.dispatchEvent(new Event('resize'));
    },
  };
}

it("an open add menu carries the width it asks for, not a chip's floor", async () => {
  // 320, not 240: a catalogue with a field over it reads "Searc" at a chip's floor.
  const row = addRow();
  await row.user.click(row.trigger);
  expect(row.fit()).toEqual(['1054px', '0px', '320px']);
});

it('a viewport change re-measures an add menu that is still open', async () => {
  /* The add menu asks for 320px where a chip asks for 240px, so it is the first menu
   * in the row whose stale fit shows on a phone: 240 fits a 288px row and 320 does
   * not. Opened in a 1200px row, then the row a 390px view gives it, then a 320px
   * one — the panel slides back where there is room behind it and takes the row's
   * own width where there is not. */
  const row = addRow();
  await row.user.click(row.trigger);
  expect(row.fit()).toEqual(['1054px', '0px', '320px']);
  row.resize({ rowWidth: 358, left: 250 });
  expect(row.fit(), 'a 358px row still holds the 320px ask').toEqual(['320px', '212px', '320px']);
  row.resize({ rowWidth: 288, left: 16, panelWidth: 288 });
  expect(row.fit(), 'a 288px row decides instead').toEqual(['288px', '16px', '288px']);
});

it('a dropdown outside a filter row is given no numbers at all', async () => {
  const user = userEvent.setup();
  const { container } = render(<Dropdown ariaLabel="Actions" items={SECTORS} />);
  const panel = container.querySelector('.ui-dropdown__panel') as HTMLElement;
  await user.click(container.querySelector('.ui-dropdown__trigger')!);
  window.dispatchEvent(new Event('resize'));
  expect(PANEL_PROPS.map((p) => panel.style.getPropertyValue(`--ui-filter-panel-${p}`))).toEqual(['', '', '']);
});
