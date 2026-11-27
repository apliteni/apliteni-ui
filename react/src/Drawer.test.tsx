// <Drawer>: the class names and structure the vanilla drawer() agreed on, and the
// dialog behaviour it shares with Modal through ./dialog. Each shape case was compared
// with drawer() until #429 removed it; the shape both agreed on is stored as a snapshot,
// written in the commit where the comparison last passed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { act, cleanup, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { useState, type ReactElement } from 'react';
import { afterEach, vi } from 'vitest';
import { Drawer, type DrawerProps } from './Drawer';
import { LongForm } from './Drawer.stories';
import { Modal } from './Modal';
import { Tooltip } from './Tooltip';
import { classesOfEl } from './test/classlist';
import { stubPopover } from './test/popover';

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

// ---- shape -----------------------------------------------------------------

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
    // The id is React's own; what is held is that the dialog is named by its title.
    namedByTitle: n.hasAttribute('aria-labelledby')
      ? n.getAttribute('aria-labelledby') === title?.id : null,
  }));
}

const SIDES = ['right', 'left', 'top', 'bottom'] as const;
const CLOSED_LEFT_LG = ['ui-drawer', 'ui-drawer--left', 'ui-drawer--lg'];
const SIZES = ['sm', 'md', 'lg'] as const;

describe('the shape the vanilla drawer() agreed on', () => {
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
          expect(shape(root()!)).toMatchSnapshot();
        });
      }
    }
  }

  it('the defaults are the factory\'s: right, md, "Close"', () => {
    render(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
    expect(shape(root()!)).toMatchSnapshot();
  });

  it('while it leaves, the root is the factory\'s closed drawer', () => {
    panelTiming('transition-duration: 10s;');
    const { rerender } = render(<Drawer open side="left" size="lg" title="Filters" onClose={noop} />);
    rerender(<Drawer open={false} side="left" size="lg" title="Filters" onClose={noop} />);
    // The class list the vanilla drawer() wrote for a closed drawer.
    expect(classesOfEl(root()!)).toEqual(CLOSED_LEFT_LG);
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

// #868: the record's state stands directly after the title, and a long title ends in an
// ellipsis before it. A cut title is a Tab stop whose readout shows the whole title.
// Limits: jsdom lays nothing out, so the cut is stubbed through scrollWidth and clientWidth,
// and the cascade is read, not the widths. stories/drawer-footer.test.js measures the
// header in Chromium.
describe('the status after the title', () => {
  const LONG = 'Northwind Supply EUR operating account, daily bank statement';
  const rel = '../../src/styles/drawer.css';
  const CSS = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  const css = () => {
    const style = document.createElement('style');
    style.dataset.fixture = '';
    style.textContent = CSS;
    document.head.appendChild(style);
  };
  const source = (title: string) => render(
    <Drawer open title={title} onClose={noop} status={<span className="ui-badge ui-badge--warn">Late</span>}
      headerActions={<button type="button">View imports</button>}>body</Drawer>,
  );
  // ResizeObservers that each read when `resize` is called, and a title that is wider than
  // its box while `layout.cut` is true.
  const layout = { cut: false, reads: new Set<() => void>(), resize: () => layout.reads.forEach((read) => read()) };
  const stubLayout = (cut: boolean) => {
    layout.cut = cut;
    layout.reads.clear();
    vi.stubGlobal('ResizeObserver', class {
      constructor(private read: () => void) {}
      observe() { layout.reads.add(this.read); }
      disconnect() { layout.reads.delete(this.read); }
    });
    const proto = HTMLElement.prototype;
    Object.defineProperty(proto, 'scrollWidth', { configurable: true, get() { return layout.cut && this.localName === 'h2' ? 600 : 0; } });
    Object.defineProperty(proto, 'clientWidth', { configurable: true, get() { return 0; } });
    return () => {
      vi.unstubAllGlobals();
      Reflect.deleteProperty(proto, 'scrollWidth');
      Reflect.deleteProperty(proto, 'clientWidth');
    };
  };
  const title = () => document.querySelector('.ui-drawer__title') as HTMLElement;

  it('stands after the title on the title\'s line, before the actions and Close', () => {
    css();
    source('Northwind Bank');
    const header = document.querySelector('.ui-drawer__header')!;
    expect([...header.querySelectorAll('h2, .ui-drawer__status, .ui-drawer__actions, .ui-drawer__close')]
      .map((n) => n.className)).toEqual(['ui-drawer__title', 'ui-drawer__status', 'ui-drawer__actions', 'ui-drawer__close']);
    const lead = title().parentElement!;
    expect(lead).toHaveClass('ui-drawer__lead');
    expect(lead.querySelector('.ui-drawer__status')).toHaveTextContent('Late');
    expect(getComputedStyle(lead).display).toBe('flex');
    expect(getComputedStyle(lead).flexWrap).not.toBe('wrap');
    // The title gives up its room and ends in an ellipsis. The status and the actions keep theirs.
    const t = getComputedStyle(title());
    expect([t.minWidth, t.overflow, t.textOverflow, t.whiteSpace]).toEqual(['0px', 'hidden', 'ellipsis', 'nowrap']);
    expect(getComputedStyle(document.querySelector('.ui-drawer__status')!).flexShrink).toBe('0');
    expect(getComputedStyle(document.querySelector('.ui-drawer__actions')!).flexShrink).toBe('0');
    expect(screen.getByRole('dialog', { name: 'Northwind Bank' })).toBeInTheDocument();
    cleanup();
    // Without a status, the lead holds the title alone.
    render(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
    expect(title().parentElement).toHaveClass('ui-drawer__lead');
    expect(document.querySelector('.ui-drawer__status')).toBeNull();
    expect(document.querySelector('.ui-drawer__mark')).toBeNull();
  });

  it('a mark stands before the title, keeps its size and is hidden from screen readers', () => {
    css();
    render(<Drawer open title="Finance" mark={<i className="logo" />} onClose={noop}>body</Drawer>);
    const lead = title().parentElement!;
    expect([...lead.children].map((n) => n.className)).toEqual(['ui-drawer__mark', 'ui-drawer__title']);
    const mark = lead.querySelector('.ui-drawer__mark')!;
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark.querySelector('.logo')).not.toBeNull();
    expect(getComputedStyle(mark).flexShrink).toBe('0');
    expect(screen.getByRole('dialog', { name: 'Finance' })).toBeInTheDocument();
  });

  it('a cut title is a Tab stop, its readout shows the whole title, Escape closes only the readout, and the focus stays in the drawer when the title fits', async () => {
    // A title that fits is no Tab stop and has no readout.
    let restore = stubLayout(false);
    try {
      source('Northwind Bank');
      expect(title()).not.toHaveAttribute('tabindex');
      expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull();
    } finally {
      restore();
      cleanup();
    }
    restore = stubLayout(true);
    const layer = stubPopover();
    try {
      const closeDrawer = vi.fn();
      render(<Drawer open title={LONG} onClose={closeDrawer} status={<span className="ui-badge">Late</span>}>body</Drawer>);
      expect(title()).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('dialog', { name: LONG })).toBeInTheDocument();
      const tip = screen.getByRole('tooltip', { hidden: true });
      expect(tip).toHaveTextContent(LONG);
      await userEvent.tab();
      expect(title()).toHaveFocus();
      await waitFor(() => expect(tip).toHaveClass('is-open'));
      await userEvent.keyboard('{Escape}');
      expect(tip).not.toHaveClass('is-open');
      expect(closeDrawer).not.toHaveBeenCalled();
      expect(title()).toHaveFocus();
      // The drawer widens and the title fits. React replaces the focused heading, and the
      // focus stays in the drawer, on its panel.
      layout.cut = false;
      act(() => layout.resize());
      expect(title()).not.toHaveAttribute('tabindex');
      expect(screen.getByRole('dialog')).toHaveFocus();
    } finally {
      layer.restore();
      restore();
    }
  });
});

// A short drawer's footer stands directly under the last group, next to the form its Save
// saves (#887): the body takes its content height and gives up space only to scroll. The
// shell's menu keeps its account at the panel's foot, so its body fills the panel.
// Limits: jsdom resolves the cascade, not layout, so this proves the flex values reach the
// body on every side and size. stories/drawer-footer.test.js measures the footer in Chromium.
describe('the footer follows the body', () => {
  const sheet = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  const kit = (css: string) => {
    const style = document.createElement('style');
    style.dataset.fixture = '';
    style.textContent = css;
    document.head.appendChild(style);
  };
  const flex = () => {
    const body = getComputedStyle(document.querySelector('.ui-drawer__body')!);
    const foot = getComputedStyle(document.querySelector('.ui-drawer__footer')!);
    return { body: [body.flexGrow, body.flexShrink, body.minHeight, body.overflowY], foot: [foot.flexGrow, foot.flexShrink] };
  };
  const CSS = sheet('../../src/styles/drawer.css') + sheet('./AppShell.css');

  for (const side of SIDES) {
    for (const size of SIZES) {
      it(`${side} ${size}: the body takes its content height and scrolls when it is long`, () => {
        kit(CSS);
        render(<Drawer open side={side} size={size} title="Transaction" onClose={noop} footer={<button type="button">Save</button>}>
          <section className="ui-drawer__section">form</section>
        </Drawer>);
        expect(getComputedStyle(panel()).flexDirection).toBe('column');
        expect(flex()).toEqual({ body: ['0', '1', '0px', 'auto'], foot: ['0', '0'] });
      });
    }
  }

  // The Long Form story spaces its fields by the kit's stack, so a label reads with its own field.
  // jsdom does not resolve var() to a computed margin, so this reads which kit rule matches.
  it('the long form puts the kit gap between its fields', () => {
    kit(sheet('../../src/styles/base.css'));
    const Story = (LongForm as { render: () => ReactElement }).render;
    render(<Story />);
    const gaps = [...document.styleSheets].flatMap((s) => [...s.cssRules])
      .filter((r): r is CSSStyleRule => r instanceof CSSStyleRule && r.style.marginTop === 'var(--space-4)');
    const fields = [...document.querySelectorAll('.ui-drawer__body .ui-field')];
    expect(fields).toHaveLength(20);
    expect(fields.slice(1).filter((f) => !gaps.some((r) => f.matches(r.selectorText)))).toEqual([]);
  });

  it('the shell menu keeps its account at the foot', () => {
    kit(CSS);
    render(<Drawer open title="Menu" onClose={noop} footer={<div className="ui-app__drawer">Account</div>}>rows</Drawer>);
    expect(flex().body).toEqual(['1', '1', '0px', 'auto']);
  });
});

// The panel must be a plain div: an <aside> owns the complementary role and cannot
// take role="dialog" over it, so axe's aria-allowed-role fails on an <aside> panel.
it('the open drawer has no aria-allowed-role violation', async () => {
  render(<Drawer open title="Filters" onClose={noop}>body</Drawer>);
  const result = await axe.run(document.body, {
    runOnly: { type: 'rule', values: ['aria-allowed-role'] },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
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

// #814: a Tooltip is not a dialog, but its Escape is handled first and marked, so the
// dialog stack lets it pass and only the next Escape reaches the Drawer.
// The readout sits in the top layer, over the Drawer: the stand-in shows it is shown and
// hidden there, which jsdom cannot.
it('Escape with a Tooltip open closes only the Tooltip', async () => {
  const layer = stubPopover();
  try {
    const closeDrawer = vi.fn();
    render(
      <Drawer open title="Record" onClose={closeDrawer}>
        <Tooltip text="Updated daily">Balance</Tooltip>
      </Drawer>,
    );
    const tip = screen.getByRole('tooltip', { hidden: true });
    await waitFor(() => expect(tip).toHaveClass('is-open'));
    expect(tip.matches(':popover-open')).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(tip).not.toHaveClass('is-open');
    expect(tip.matches(':popover-open')).toBe(false);
    expect(closeDrawer).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(closeDrawer).toHaveBeenCalledTimes(1);
  } finally {
    layer.restore();
  }
});

// #814 review round 1: the readout's document keydown registered when the Tooltip
// mounted. A Tooltip mounted after an already-open Drawer registered after the dialog
// stack's bubble listener, so the Drawer closed before the readout marked the Escape.
// The readout's keydown now listens in the capture phase, ahead of the stack whatever
// the mount order.
it('Escape closes only a Tooltip that mounted after its open Drawer', async () => {
  const closeDrawer = vi.fn();
  const view = render(<Drawer open title="Record" onClose={closeDrawer} />);
  view.rerender(
    <Drawer open title="Record" onClose={closeDrawer}>
      <Tooltip text="Updated daily">Balance</Tooltip>
    </Drawer>,
  );
  const tip = screen.getByRole('tooltip', { hidden: true });
  act(() => screen.getByText('Balance').focus());
  expect(tip).toHaveClass('is-open');
  await userEvent.keyboard('{Escape}');
  expect(tip).not.toHaveClass('is-open');
  expect(closeDrawer).not.toHaveBeenCalled();
  await userEvent.keyboard('{Escape}');
  expect(closeDrawer).toHaveBeenCalledTimes(1);
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
