// <Drawer>: class-name parity with the vanilla drawer(), and the dialog behaviour it
// shares with Modal through ./dialog.
// why: CONTRIBUTING.md#react-components-react
import { act, cleanup, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, vi } from 'vitest';
import { drawer } from '@apliteni/apliteni-ui';
import { Drawer, type DrawerProps } from './Drawer';
import { Modal } from './Modal';
import { classesOf, classesOfEl } from './test/classlist';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.head.querySelectorAll('style[data-fixture]').forEach((s) => s.remove());
});

// jsdom runs no transition and computes only the longhands, never the `transition`
// shorthand drawer.css writes — so the tests state the panel's timing themselves.
function panelTiming(css: string) {
  const style = document.createElement('style');
  style.dataset.fixture = '';
  style.textContent = `.ui-drawer__panel { ${css} }`;
  document.head.appendChild(style);
}

const root = () => document.querySelector('.ui-drawer');
const panel = () => document.querySelector('.ui-drawer__panel')!;
const noop = () => {};

// ---- parity ----------------------------------------------------------------

/** The vanilla factory's output as a DOM root. */
function vanillaRoot(opts: Record<string, unknown>): Element {
  const host = document.createElement('div');
  host.innerHTML = drawer(opts);
  return host.firstElementChild!;
}

/** Every drawer element, in order, with what makes it that element. */
function shape(el: Element) {
  const title = el.querySelector('.ui-drawer__title');
  return [el, ...el.querySelectorAll('[class*="ui-drawer"]')].map((n) => ({
    tag: n.tagName,
    cls: classesOfEl(n).join(' '),
    role: n.getAttribute('role'),
    modal: n.getAttribute('aria-modal'),
    tabindex: n.getAttribute('tabindex'),
    label: n.getAttribute('aria-label'),
    text: n === title ? n.textContent : null,
    // The ids differ (a module counter there, useId here); what has to agree is that
    // the dialog is named by its title.
    namedByTitle: n.hasAttribute('aria-labelledby')
      ? n.getAttribute('aria-labelledby') === title?.id : null,
  }));
}

const SIDES = ['right', 'left', 'top', 'bottom'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;

describe('class-name parity with the vanilla drawer()', () => {
  for (const side of SIDES) {
    for (const size of SIZES) {
      for (const withFooter of [false, true]) {
        it(`${side} ${size}${withFooter ? ' with a footer' : ''}`, () => {
          const props = { side, size, title: 'Filters', closeLabel: 'Close filters' };
          render(
            <Drawer open onClose={noop} {...props}
              footer={withFooter ? <button type="button">Apply</button> : undefined}>
              body
            </Drawer>,
          );
          const opts = { ...props, open: true, footer: withFooter ? '<button type="button">Apply</button>' : '' };
          expect(classesOfEl(root()!), 'root class list').toEqual(classesOf(drawer(opts)));
          expect(shape(root()!)).toEqual(shape(vanillaRoot(opts)));
        });
      }
    }
  }

  it('the defaults are the factory\'s: right, md, "Close"', () => {
    render(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
    const opts = { title: 'Filters', open: true };
    expect(classesOfEl(root()!)).toEqual(classesOf(drawer(opts)));
    expect(shape(root()!)).toEqual(shape(vanillaRoot(opts)));
  });

  it('while it leaves, the root is the factory\'s closed drawer', () => {
    panelTiming('transition-duration: 10s;');
    const { rerender } = render(<Drawer open side="left" size="lg" title="Filters" onClose={noop} />);
    rerender(<Drawer open={false} side="left" size="lg" title="Filters" onClose={noop} />);
    expect(classesOfEl(root()!)).toEqual(classesOf(drawer({ side: 'left', size: 'lg', title: 'Filters' })));
  });
});

// ---- behaviour -------------------------------------------------------------

it('renders nothing when closed', () => {
  render(<Drawer open={false} title="Filters" onClose={noop}>body</Drawer>);
  expect(root()).toBeNull();
});

it('opens as a modal dialog named by its title, portalled to the body', () => {
  const { container } = render(<Drawer open title="Transaction" onClose={noop}>body</Drawer>);
  const dialog = screen.getByRole('dialog', { name: 'Transaction' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(container.contains(dialog)).toBe(false);
  expect(root()!.parentElement).toBe(document.body);
});

// The slide runs only if the panel has been styled in its start state before `is-open`
// lands. Mounting with the class, or adding it before anything read the panel, puts the
// panel at its end state in one frame.
it('styles the panel without is-open before it adds is-open', () => {
  const seen: (string | undefined)[] = [];
  const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('ui-drawer__panel')) seen.push(root()?.className);
    return new DOMRect();
  });
  render(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
  spy.mockRestore();
  expect(seen).toEqual(['ui-drawer ui-drawer--right ui-drawer--md']);
  expect(root()).toHaveClass('is-open');
});

it('on close drops is-open and stays mounted until the panel\'s transitionend', () => {
  panelTiming('transition-duration: 10s;');
  const { rerender } = render(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
  rerender(<Drawer open={false} title="Filters" onClose={noop}>body</Drawer>);
  expect(root()).not.toBeNull();
  expect(root()).not.toHaveClass('is-open');
  // Leaving, it takes no second click and no Tab, and assistive tech no longer sees it.
  expect(root()).toHaveAttribute('inert');
  expect(root()).toHaveAttribute('aria-hidden', 'true');

  // A child's transition bubbles through the panel and is not the panel's.
  fireEvent.transitionEnd(screen.getByRole('button', { name: 'Close', hidden: true }));
  expect(root()).not.toBeNull();

  fireEvent.transitionEnd(panel());
  expect(root()).toBeNull();
});

it('unmounts on a timer sized from the computed transition when transitionend never comes', () => {
  vi.useFakeTimers();
  // The longest duration + delay: 200 + 100, and 50ms of slack.
  panelTiming('transition-duration: 200ms, 0.15s; transition-delay: 100ms;');
  const { rerender } = render(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
  rerender(<Drawer open={false} title="Filters" onClose={noop}>body</Drawer>);
  act(() => { vi.advanceTimersByTime(349); });
  expect(root()).not.toBeNull();
  act(() => { vi.advanceTimersByTime(1); });
  expect(root()).toBeNull();
});

// src/styles/reduced-motion.css sets every transition-duration to 0.01ms.
it('closes under the reduced-motion net\'s 0.01ms', async () => {
  panelTiming('transition-duration: 0.01ms !important;');
  const { rerender } = render(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
  rerender(<Drawer open={false} title="Filters" onClose={noop}>body</Drawer>);
  await waitFor(() => expect(root()).toBeNull());
});

it('re-opened mid-exit, it stays open', () => {
  vi.useFakeTimers();
  panelTiming('transition-duration: 250ms;');
  const { rerender } = render(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
  rerender(<Drawer open={false} title="Filters" onClose={noop}>body</Drawer>);
  act(() => { vi.advanceTimersByTime(100); });
  rerender(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
  expect(root()).toHaveClass('is-open');
  // The abandoned exit's transitionend and its timer both arrive, and neither counts.
  // The end state alone would not show it if one did: the drawer re-enters on its own,
  // so what is asserted is that the root never changes again — no is-open dropped, no
  // inert set, no slide restarted from the edge.
  const changes: MutationRecord[] = [];
  const watch = new MutationObserver((records) => changes.push(...records));
  watch.observe(root()!, { attributes: true, attributeFilter: ['class', 'inert'], attributeOldValue: true });
  fireEvent.transitionEnd(panel());
  act(() => { vi.advanceTimersByTime(1000); });
  changes.push(...watch.takeRecords());
  watch.disconnect();
  expect(changes.map((r) => `${r.attributeName} was ${r.oldValue}`)).toEqual([]);
  expect(root()).not.toHaveAttribute('inert');
});

it.each([
  ['Escape', async () => { await userEvent.keyboard('{Escape}'); }],
  ['the close button', async () => { await userEvent.click(screen.getByRole('button', { name: 'Close filters' })); }],
  ['the scrim', async () => { fireEvent.mouseDown(document.querySelector('.ui-drawer__scrim')!); }],
] as const)('%s calls onClose', async (_, act_) => {
  const onClose = vi.fn();
  render(<Drawer open title="Filters" closeLabel="Close filters" onClose={onClose}>body</Drawer>);
  await act_();
  expect(onClose).toHaveBeenCalledTimes(1);
});

// As Modal's: cancelled, so the opener keeps the focus the drawer hands back.
it('cancels the scrim mousedown it dismisses on, and leaves one inside the panel alone', () => {
  const onClose = vi.fn();
  render(<Drawer open title="Filters" onClose={onClose}>body</Drawer>);
  const scrim = document.querySelector('.ui-drawer__scrim')!;
  const outside = createEvent.mouseDown(scrim);
  fireEvent(scrim, outside);
  const inside = createEvent.mouseDown(panel());
  fireEvent(panel(), inside);
  expect([onClose.mock.calls.length, outside.defaultPrevented, inside.defaultPrevented]).toEqual([1, true, false]);
});

it('focuses the first field in the body on open, not the header close button', async () => {
  render(<Drawer open title="Filters" onClose={noop}><input aria-label="Amount" /></Drawer>);
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Amount')));
});

it('traps Tab inside the panel, wrapping both ways', async () => {
  render(
    <Drawer open title="Filters" onClose={noop} footer={<button type="button">Apply</button>}>
      <input aria-label="Amount" />
    </Drawer>,
  );
  const close = screen.getByRole('button', { name: 'Close' });
  const apply = screen.getByRole('button', { name: 'Apply' });
  apply.focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(close);
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(apply);
});

it('hides the page behind it and gives focus back to the opener on close', async () => {
  function Harness(props: Partial<DrawerProps>) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Open</button>
        <Drawer {...props} open={open} title="Filters" onClose={() => setOpen(false)}>
          <input aria-label="Amount" />
        </Drawer>
      </>
    );
  }
  const { container } = render(<Harness />);
  const opener = screen.getByRole('button', { name: 'Open' });
  opener.focus();
  await userEvent.click(opener);
  await waitFor(() => expect(container).toHaveAttribute('inert'));
  expect(document.activeElement).toBe(screen.getByLabelText('Amount'));

  await userEvent.keyboard('{Escape}');
  await waitFor(() => {
    expect(container).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(opener);
  });
  await waitFor(() => expect(root()).toBeNull());
});

// ---- a Modal over a Drawer -------------------------------------------------
// Two React dialogs, one page, one stack in ./dialog. Only the top one answers the
// keyboard, and what is inert follows the stack rather than either dialog's snapshot.

it('Escape in a Modal opened over a Drawer closes only the Modal', async () => {
  const closeDrawer = vi.fn();
  const closeModal = vi.fn();
  render(
    <Drawer open title="Record" onClose={closeDrawer}>
      <input aria-label="Note" />
      <Modal open title="Confirm" onClose={closeModal}><input aria-label="A" /><input aria-label="B" /></Modal>
    </Drawer>,
  );
  await userEvent.keyboard('{Escape}');
  expect({ modal: closeModal.mock.calls.length, drawer: closeDrawer.mock.calls.length }).toEqual({ modal: 1, drawer: 0 });
});

it('Tab moves between the fields of a Modal opened over a Drawer, and wraps inside it', async () => {
  render(
    <Drawer open title="Record" onClose={noop}>
      <input aria-label="Note" />
      <Modal open title="Confirm" onClose={noop}><input aria-label="A" /><input aria-label="B" /><button type="button">OK</button></Modal>
    </Drawer>,
  );
  const modal = within(screen.getByRole('dialog', { name: 'Confirm' }));
  screen.getByLabelText('A').focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByLabelText('B'));
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'OK' }));
  await userEvent.tab();
  expect(document.activeElement).toBe(modal.getByRole('button', { name: 'Close' }));
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'OK' }));
});

function RecordPage() {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open record</button>
      <Drawer open={open} title="Record" onClose={() => setOpen(false)}>
        <input aria-label="Note" />
        <button type="button" onClick={() => setAsking(true)}>Delete</button>
        <Modal open={asking} title="Delete record?" onClose={() => setAsking(false)}>
          <input aria-label="Reason" />
        </Modal>
      </Drawer>
    </>
  );
}

it('closing the Modal gives the Drawer back its keyboard, and the page waits for the Drawer', async () => {
  // Both leave slowly, so a leaving root can be looked at before it unmounts.
  const style = document.createElement('style');
  style.dataset.fixture = '';
  style.textContent = '.rx-modal, .ui-drawer__panel { transition-duration: 10s; }';
  document.head.appendChild(style);

  const { container } = render(<RecordPage />);
  const opener = screen.getByRole('button', { name: 'Open record' });
  await userEvent.click(opener);
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Note')));
  const del = screen.getByRole('button', { name: 'Delete' });
  await userEvent.click(del);
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Reason')));
  const drawerRoot = root()!;
  const modalRoot = document.querySelector('.rx-scrim')!;
  // Everything outside the top dialog is inert, the Drawer beneath it included.
  expect(container).toHaveAttribute('inert');
  expect(drawerRoot).toHaveAttribute('inert');

  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(document.activeElement).toBe(del));
  expect(drawerRoot).toHaveClass('is-open');
  expect(drawerRoot).not.toHaveAttribute('inert');
  expect(modalRoot).not.toHaveClass('is-open');
  expect(modalRoot).toHaveAttribute('inert');
  expect(modalRoot).toHaveAttribute('aria-hidden', 'true');
  expect(container).toHaveAttribute('inert');
  // The Drawer's trap answers Tab now: back from its first control wraps to its last.
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(screen.getByLabelText('Note'));
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(within(drawerRoot as HTMLElement).getByRole('button', { name: 'Close' }));
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(del);

  fireEvent.transitionEnd(document.querySelector('.rx-modal')!);
  expect(document.querySelector('.rx-scrim')).toBeNull();
  expect(container).toHaveAttribute('inert');

  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(document.activeElement).toBe(opener));
  expect(container).not.toHaveAttribute('inert');
  expect(drawerRoot).toHaveAttribute('aria-hidden', 'true');
});
