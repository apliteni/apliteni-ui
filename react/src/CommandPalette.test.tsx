// Class-name parity and behaviour gate for <CommandPalette>.
// why: CONTRIBUTING.md#react-components-react
//
// The vanilla commandPalette() is the source of truth. The first half below
// renders both and compares the shape read off each DOM — the panel's classes,
// every row's classes, the roles and the ids the combobox points at. The second
// half presses keys, which the vanilla gate does next door in
// stories/palette-keyboard.test.js: focus opens in the text box and goes back to
// the opener, the arrows move the active row while the caret stays put, and a
// destructive row with nothing to ask cannot be run.
//
// What this does NOT compare: the id seeds. React's come from useId(), so two
// palettes on one page cannot collide the way a fixed prefix would.
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { commandPalette } from '@apliteni/apliteni-ui';
import { CommandPalette, type CommandGroup } from './CommandPalette';
import { Modal } from './Modal';
import { classesOfEl } from './test/classlist';

afterEach(cleanup);

const GROUPS: CommandGroup[] = [
  {
    label: 'Actions',
    items: [
      { id: 'new-invoice', label: 'New invoice', description: 'Draft one for a client', icon: 'plus', shortcut: ['n'] },
      { id: 'invite', label: 'Invite a teammate', description: 'They get a read-only seat', icon: 'user' },
    ],
  },
  {
    label: 'Go to',
    items: [
      { id: 'reports', label: 'Reports', description: 'Revenue, payouts and fees', icon: 'chart', href: '#reports' },
      { id: 'settings', label: 'Settings', description: 'Billing, members, API keys', icon: 'gear', keywords: ['preferences'], href: '#settings' },
    ],
  },
];

/** The vanilla factory's output as a DOM root. */
function vanilla(opts: Record<string, unknown>): Element {
  const host = document.createElement('div');
  host.innerHTML = commandPalette({ groups: GROUPS, open: true, ...opts });
  return host.firstElementChild as Element;
}

/** What both implementations have to agree on, read off a rendered palette. */
function shape(root: Element) {
  const input = root.querySelector('.ui-cmdk__input') as HTMLInputElement;
  const list = root.querySelector('.ui-cmdk__list') as Element;
  return {
    classes: classesOfEl(root),
    panelRole: root.querySelector('.ui-cmdk__panel')?.getAttribute('role'),
    modal: root.querySelector('.ui-cmdk__panel')?.getAttribute('aria-modal'),
    inputRole: input.getAttribute('role'),
    autocomplete: input.getAttribute('aria-autocomplete'),
    expanded: input.getAttribute('aria-expanded'),
    // The id itself differs by construction; that it POINTS at the list does not.
    controlsList: input.getAttribute('aria-controls') === list.id,
    listRole: list.getAttribute('role'),
    groups: [...list.querySelectorAll('.ui-cmdk__group')].map((g) => ({
      role: g.getAttribute('role'),
      head: g.querySelector('.ui-cmdk__group-head')?.textContent,
      named: g.getAttribute('aria-labelledby') === g.querySelector('.ui-cmdk__group-head')?.id,
    })),
    rows: [...list.querySelectorAll('.ui-cmdk__item')].map((r) => ({
      classes: classesOfEl(r),
      role: r.getAttribute('role'),
      tabindex: r.getAttribute('tabindex'),
      disabled: r.getAttribute('aria-disabled'),
      haspopup: r.getAttribute('aria-haspopup'),
      label: r.querySelector('.ui-cmdk__label')?.textContent,
      desc: r.querySelector('.ui-cmdk__desc')?.textContent,
      keys: [...r.querySelectorAll('.ui-cmdk__key')].map((k) => k.textContent),
    })),
    empty: root.querySelector('.ui-cmdk__empty')?.textContent ?? null,
    foot: !!root.querySelector('.ui-cmdk__foot'),
  };
}

const mounted = () => document.querySelector('.ui-cmdk') as Element;

describe('parity with the vanilla factory', () => {
  it('renders the same palette, group for group and row for row', () => {
    render(<CommandPalette open groups={GROUPS} onClose={() => {}} />);
    expect(shape(mounted())).toEqual(shape(vanilla({})));
  });

  it('agrees on the roomy density and on a palette with no key legend', () => {
    render(<CommandPalette open density="roomy" hint={false} groups={GROUPS} onClose={() => {}} />);
    expect(shape(mounted())).toEqual(shape(vanilla({ density: 'roomy', hint: false })));
  });

  it('agrees on a destructive row that asks, and one that cannot', () => {
    const items = [
      { id: 'del', label: 'Delete workspace…', description: 'Nebula · 42 API keys', icon: 'trash', danger: true },
      { id: 'revoke', label: 'Revoke every API key', description: 'They stop working at once', icon: 'key', danger: true },
    ];
    render(
      <CommandPalette
        open
        groups={[{ label: 'Danger zone', items: [{ ...items[0], onConfirm: () => {} }, items[1]] }]}
        onClose={() => {}}
      />,
    );
    const react = shape(mounted()).rows;
    const kit = shape(vanilla({
      groups: [{ label: 'Danger zone', items: [{ ...items[0], confirm: 'x' }, items[1]] }],
    })).rows;
    expect(react).toEqual(kit);
  });

  it('ranks with the kit, so a server render and a keystroke agree', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open groups={GROUPS} onClose={() => {}} />);
    await user.type(screen.getByRole('combobox'), 'set');

    const rows = [...mounted().querySelectorAll('.ui-cmdk__label')].map((l) => l.textContent);
    const kitRows = [...vanilla({ query: 'set' }).querySelectorAll('.ui-cmdk__label')]
      .map((l) => l.textContent);
    expect(rows).toEqual(kitRows);
    expect(rows).toEqual(['Settings']);
  });
});

describe('the keyboard and the focus', () => {
  it('opens focus in the text box and hands it back to the opener', async () => {
    const user = userEvent.setup();
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Search</button>
          <CommandPalette open={open} groups={GROUPS} onClose={() => setOpen(false)} />
        </>
      );
    }
    render(<Host />);
    const opener = screen.getByRole('button', { name: 'Search' });
    await user.click(opener);

    expect(document.activeElement).toBe(screen.getByRole('combobox'));
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(opener);
  });

  it('moves the active row with the arrows, and never moves the caret', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open groups={GROUPS} onClose={() => {}} />);
    const input = screen.getByRole('combobox');
    const active = () => mounted().querySelector('.ui-cmdk__item.is-active');

    expect(within(active() as HTMLElement).getByText('New invoice')).toBeTruthy();
    await user.keyboard('{ArrowDown}');
    expect(within(active() as HTMLElement).getByText('Invite a teammate')).toBeTruthy();
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-activedescendant')).toBe((active() as Element).id);
    expect((active() as Element).getAttribute('aria-selected')).toBe('true');
  });

  it('wraps at both ends', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open groups={GROUPS} onClose={() => {}} />);
    const label = () => mounted().querySelector('.ui-cmdk__item.is-active .ui-cmdk__label')?.textContent;

    await user.keyboard('{ArrowUp}');
    expect(label()).toBe('Settings');
    await user.keyboard('{ArrowDown}');
    expect(label()).toBe('New invoice');
  });

  it('runs the active row on Enter and closes', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<CommandPalette open groups={GROUPS} onClose={onClose} onSelect={onSelect} />);

    await user.type(screen.getByRole('combobox'), 'invite');
    await user.keyboard('{Enter}');

    expect(onSelect.mock.calls[0][0].id).toBe('invite');
    expect(onClose).toHaveBeenCalled();
  });

  it('a destructive row asks its question and leaves the palette standing', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        open
        groups={[{ items: [{ id: 'del', label: 'Delete workspace…', danger: true, onConfirm }] }]}
        onClose={onClose}
      />,
    );
    await user.keyboard('{Enter}');

    expect(onConfirm).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a destructive row with nothing to ask cannot be run at all', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CommandPalette
        open
        groups={[{ items: [{ id: 'del', label: 'Delete workspace', danger: true }] }]}
        onClose={() => {}}
        onSelect={onSelect}
      />,
    );
    const row = mounted().querySelector('.ui-cmdk__item') as HTMLElement;
    expect(row.getAttribute('aria-disabled')).toBe('true');

    await user.keyboard('{Enter}');
    await user.click(row);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('says how many results there are, and never reads the rows out', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open groups={GROUPS} onClose={() => {}} />);
    const status = mounted().querySelector('[role="status"]') as HTMLElement;

    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.className).toBe('ui-sr');
    expect(status.textContent).toBe('4 results');

    await user.type(screen.getByRole('combobox'), 'set');
    expect(status.textContent).toBe('1 result');
    await user.clear(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'zzzz');
    expect(status.textContent).toBe('No results');
    expect(screen.getByText('No matches')).toBeTruthy();
  });

  it('one Escape closes the confirm a destructive row opened, and leaves the palette', async () => {
    // The palette and the Modal are two dialogs on one stack, and only the top of
    // it answers the keyboard. Before #274 sat on #272's dialog.ts they each kept
    // their own document listener, and one press ran both.
    const user = userEvent.setup();
    function Host() {
      const [open, setOpen] = useState(true);
      const [asking, setAsking] = useState(false);
      const groups: CommandGroup[] = [{
        label: 'Danger',
        items: [{ id: 'delete', label: 'Delete workspace', danger: true, onConfirm: () => setAsking(true) }],
      }];
      return (
        <>
          <CommandPalette open={open} groups={groups} onClose={() => setOpen(false)} />
          <Modal open={asking} title="Delete workspace?" onClose={() => setAsking(false)}>
            <button type="button">Delete</button>
          </Modal>
        </>
      );
    }
    render(<Host />);

    await user.click(screen.getByText('Delete workspace'));
    expect(screen.getByRole('dialog', { name: 'Delete workspace?' })).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Delete workspace?' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeTruthy();

    // And the second press reaches the palette, now that it is the top again.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).toBeNull();
  });

  it('hides the page behind it, and hands it back on the way out', () => {
    const page = document.createElement('div');
    document.body.appendChild(page);
    const { unmount } = render(<CommandPalette open groups={GROUPS} onClose={() => {}} />);

    expect(page.hasAttribute('inert')).toBe(true);
    unmount();
    expect(page.hasAttribute('inert')).toBe(false);
    page.remove();
  });

  it('a palette the caller ranks keeps the order it was handed', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(
      <CommandPalette open rank={false} groups={GROUPS} onClose={() => {}} onQueryChange={onQueryChange} />,
    );
    await user.type(screen.getByRole('combobox'), 'set');

    expect(onQueryChange).toHaveBeenLastCalledWith('set');
    expect([...mounted().querySelectorAll('.ui-cmdk__label')].map((l) => l.textContent))
      .toEqual(['New invoice', 'Invite a teammate', 'Reports', 'Settings']);
  });
});
