import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, vi } from 'vitest';
import { Modal } from './Modal';

afterEach(() => {
  vi.useRealTimers();
  document.head.querySelectorAll('style[data-fixture]').forEach((s) => s.remove());
});

it('renders nothing when closed', () => {
  const { container } = render(<Modal open={false} title="X" onClose={() => {}} />);
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});

// ---- motion ------------------------------------------------------------------
// Modal.css fades the scrim and raises the panel on `is-open`. jsdom runs no
// transition and computes only the longhands, never the shorthand the sheet writes,
// so these tests state the panel's timing themselves.
function panelTiming(css: string) {
  const style = document.createElement('style');
  style.dataset.fixture = '';
  style.textContent = `.rx-modal { ${css} }`;
  document.head.appendChild(style);
}
const scrim = () => document.querySelector('.rx-scrim');

it('styles the panel without is-open before it adds is-open', () => {
  const seen: (string | undefined)[] = [];
  const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('rx-modal')) seen.push(scrim()?.className);
    return new DOMRect();
  });
  render(<Modal open title="New campaign" onClose={() => {}}>body</Modal>);
  spy.mockRestore();
  expect(seen).toEqual(['rx-scrim']);
  expect(scrim()).toHaveClass('is-open');
});

it('on close drops is-open and stays mounted until the panel\'s transitionend', () => {
  panelTiming('transition-duration: 10s;');
  const { rerender } = render(<Modal open title="New campaign" onClose={() => {}}>body</Modal>);
  rerender(<Modal open={false} title="New campaign" onClose={() => {}}>body</Modal>);
  expect(scrim()).not.toBeNull();
  expect(scrim()).not.toHaveClass('is-open');
  expect(scrim()).toHaveAttribute('inert');
  fireEvent.transitionEnd(document.querySelector('.rx-modal')!);
  expect(scrim()).toBeNull();
});

it('unmounts on a timer sized from the computed transition when transitionend never comes', () => {
  vi.useFakeTimers();
  panelTiming('transition-duration: 250ms;');
  const { rerender } = render(<Modal open title="New campaign" onClose={() => {}}>body</Modal>);
  rerender(<Modal open={false} title="New campaign" onClose={() => {}}>body</Modal>);
  act(() => { vi.advanceTimersByTime(249); });
  expect(scrim()).not.toBeNull();
  act(() => { vi.advanceTimersByTime(1); });
  expect(scrim()).toBeNull();
});

it('closes under the reduced-motion net\'s 0.01ms', async () => {
  panelTiming('transition-duration: 0.01ms !important;');
  const { rerender } = render(<Modal open title="New campaign" onClose={() => {}}>body</Modal>);
  rerender(<Modal open={false} title="New campaign" onClose={() => {}}>body</Modal>);
  await waitFor(() => expect(scrim()).toBeNull());
});

it('re-opened mid-exit, it stays open and takes the keyboard back', async () => {
  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Open</button>
        <Modal open={open} title="New campaign" onClose={() => setOpen(false)}>
          <input aria-label="Name" />
        </Modal>
      </>
    );
  }
  panelTiming('transition-duration: 10s;');
  render(<Harness />);
  await userEvent.keyboard('{Escape}');
  expect(scrim()).not.toHaveClass('is-open');
  await userEvent.click(screen.getByRole('button', { name: 'Open' }));
  expect(scrim()).toHaveClass('is-open');
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Name')));
  // The abandoned exit's transitionend arrives, and does not count. The end state alone
  // would not show it if it did — the Modal re-enters on its own — so what is asserted is
  // that nothing changes: no is-open dropped, no inert set, focus never sent to the opener.
  const changes: MutationRecord[] = [];
  const watch = new MutationObserver((records) => changes.push(...records));
  watch.observe(scrim()!, { attributes: true, attributeFilter: ['class', 'inert'], attributeOldValue: true });
  fireEvent.transitionEnd(document.querySelector('.rx-modal')!);
  changes.push(...watch.takeRecords());
  watch.disconnect();
  expect(changes.map((r) => `${r.attributeName} was ${r.oldValue}`)).toEqual([]);
  expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  await userEvent.keyboard('{Escape}');
  expect(scrim()).not.toHaveClass('is-open');
});

it('closes on Escape', async () => {
  let closed = 0;
  render(<Modal open title="New campaign" onClose={() => { closed++; }}>body</Modal>);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  expect(closed).toBe(1);
});

it('focuses the first field in the body on open, not the header Close button', async () => {
  render(
    <Modal open title="New campaign" onClose={() => {}}>
      <input aria-label="Name" />
    </Modal>,
  );
  await waitFor(() => {
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });
});

// A dialog that lets Tab wander into the page behind it is a dialog only in looks.
it('traps Tab inside the panel, wrapping both ways', async () => {
  render(
    <Modal open title="New campaign" onClose={() => {}}
      footer={<button type="button">Create</button>}>
      <input aria-label="Name" />
    </Modal>,
  );
  const close = screen.getByRole('button', { name: 'Close' });
  const create = screen.getByRole('button', { name: 'Create' });
  create.focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(close);
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(create);
});

it('hides the page behind it and gives focus back to the opener on close', async () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Open</button>
        <Modal open={open} title="New campaign" onClose={() => setOpen(false)}>
          <input aria-label="Name" />
        </Modal>
      </>
    );
  }
  const { container } = render(<Harness />);
  const opener = screen.getByRole('button', { name: 'Open' });
  opener.focus();
  await userEvent.click(opener);
  await waitFor(() => expect(container).toHaveAttribute('inert'));

  await userEvent.keyboard('{Escape}');
  await waitFor(() => {
    expect(container).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(opener);
  });
});

// #262. A dialog whose body folds its fields inside a closed <details> opened with the
// reader left on <body>: focus() on a control the browser is not rendering is a silent
// no-op, and the trap counted the same unreachable controls when it looked for its ends.
// jsdom has no layout, so what it holds is the structural half — a closed disclosure, a
// `hidden` subtree, a disabled control. The visibility half is a browser's answer and is
// verified there.
function Folded({ link = false }: { link?: boolean }) {
  return (
    <>
      {link && <a href="#full">Open full page</a>}
      <details>
        <summary>Advanced options</summary>
        <label>Channel<select /></label>
      </details>
    </>
  );
}

const disclosure = () => screen.getByText('Advanced options');

it('opens onto the disclosure when the body folds its fields inside a closed <details>', async () => {
  render(<Modal open title="Item settings" onClose={() => {}}><Folded /></Modal>);
  await waitFor(() => expect(document.activeElement).toBe(disclosure()));
});

it('opens onto a visible link that sits before the folded fields', async () => {
  render(<Modal open title="Item settings" onClose={() => {}}><Folded link /></Modal>);
  await waitFor(() => {
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Open full page' }));
  });
});

it('leaves folded fields out of the Tab cycle and takes them back when it opens', async () => {
  render(<Modal open title="Item settings" onClose={() => {}}><Folded /></Modal>);
  const close = screen.getByRole('button', { name: 'Close' });
  disclosure().focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(close);

  disclosure().closest('details')!.open = true;
  disclosure().focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('combobox'));
});

it('cycles neither a disabled nor a hidden control', async () => {
  render(
    <Modal open title="Item settings" onClose={() => {}}>
      <input aria-label="Name" />
      <input aria-label="Legacy id" disabled />
      <input aria-label="Note" hidden />
    </Modal>,
  );
  screen.getByLabelText('Name').focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
});

it('falls back to the dialog itself, and Shift+Tab still wraps from there', async () => {
  render(
    <Modal open title="Item settings" onClose={() => {}}>
      <input aria-label="Note" hidden />
    </Modal>,
  );
  const dialog = screen.getByRole('dialog');
  await waitFor(() => expect(document.activeElement).toBe(dialog));
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
});

// The scrim's mousedown is cancelled, and that is what lets the opener keep the focus
// the dialog hands back: the default action of mousedown moves focus to the nearest
// focusable ancestor of what was hit, and it runs after this handler has closed the
// dialog. jsdom runs no such default action, so it holds the cancellation; the focus it
// protects is proven in a browser.
it('cancels the scrim mousedown it dismisses on, and leaves one inside the panel alone', () => {
  let closed = 0;
  render(<Modal open title="Item settings" onClose={() => { closed++; }}>body</Modal>);
  const scrim = document.querySelector('.rx-scrim')!;
  const outside = createEvent.mouseDown(scrim);
  fireEvent(scrim, outside);
  expect([closed, outside.defaultPrevented]).toEqual([1, true]);

  const inside = createEvent.mouseDown(screen.getByRole('dialog'));
  fireEvent(screen.getByRole('dialog'), inside);
  expect([closed, inside.defaultPrevented]).toEqual([1, false]);
});

// The same list decides where the dialog opens and where the trap wraps, and Tab is the
// stricter of the two questions: a control with a negative tabindex answers focus() and is
// skipped by Tab, and one a disabled fieldset locks answers neither — outside that
// fieldset's first legend, which stays enabled.
it('steps over a control a disabled fieldset locks and keeps the first legend own', async () => {
  render(
    <Modal open title="Item settings" onClose={() => {}}>
      <fieldset disabled>
        <legend><label>Override <input /></label></legend>
        <label>Locked <input /></label>
      </fieldset>
    </Modal>,
  );
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Override')));
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
});

it('opens past a control only a script can focus', async () => {
  render(
    <Modal open title="Item settings" onClose={() => {}}>
      <a href="#full" tabIndex={-1}>Script only</a>
      <input aria-label="Name" />
    </Modal>,
  );
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Name')));
});

// Any negative value, not the literal -1: `[tabindex]:not([tabindex="-1"])` matches a
// `tabindex="-2"` the browser's own cycle skips.
it('never wraps onto a control only a script can focus', async () => {
  render(
    <Modal open title="Item settings" onClose={() => {}}>
      <input aria-label="Name" />
      <a href="#full" tabIndex={-2}>Script only</a>
    </Modal>,
  );
  screen.getByLabelText('Name').focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
});
