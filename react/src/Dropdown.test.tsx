// Shape parity gate for <Dropdown>, and the keyboard model under real key presses.
// why: CONTRIBUTING.md#react-components-react
//
// The vanilla dropdown() is the source of truth. Every case below renders both and
// compares the container's class list — the rule CONTRIBUTING states — plus the shape
// read back off each DOM: the trigger, the panel, and every row's tag, classes, role,
// aria attributes, value and text. A React rule that disagrees with the factory fails
// here, and the fix is this component rather than the factory.
//
// What this does NOT compare, and why:
//
//   `data-dropdown` on the container. It is what wireDropdown() looks for, and a
//   vanilla wiring pass over a page must not adopt a dropdown React owns — the same
//   decision <Drawer> makes about `data-drawer`. The row and panel hooks stay, because
//   they are the row contract docs/library.md publishes and nothing queries them
//   outside a wired container.
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach } from 'vitest';
import { dropdown } from '@apliteni/apliteni-ui';
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
      label: el.querySelector('.ui-dropdown__label')?.textContent ?? null,
      desc: el.querySelector('.ui-dropdown__desc')?.textContent ?? null,
      badge: el.querySelector('.ui-dropdown__badge')?.textContent ?? null,
      badgeCls: classesOfEl(el.querySelector('.ui-dropdown__badge') ?? el).join(' '),
      icons: [...el.querySelectorAll('.ui-dropdown__ic svg, .ui-dropdown__tick svg')]
        .map((svg) => (svg.parentElement as HTMLElement).className),
    })),
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
