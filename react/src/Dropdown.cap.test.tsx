// The cap of an open <Dropdown> panel, split from Dropdown.test.tsx for the file limit.
import { render, screen, cleanup, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import { Dropdown, type DropdownEntry } from './Dropdown';

afterEach(cleanup);
/* phone() below spies on window.innerHeight and the trigger's own rect; restored
 * here rather than per test, so a later test cannot inherit either by accident. */
afterEach(() => { vi.restoreAllMocks(); });

const MENU: DropdownEntry[] = [
  { label: 'Rename', icon: 'edit' },
  { label: 'Duplicate' },
  '---',
  { label: 'Archive', disabled: true },
  { label: 'Delete', danger: true },
];

const rowsOf = (dd: Element) => [...dd.querySelectorAll<HTMLElement>('[data-dd-item]')];

// ---- The cap (#489) --------------------------------------------------------
// The sheet caps every panel at the room between its trigger and the viewport
// edge, and the room is a number the wiring has to measure. React has wiring of
// its own, so it measures it too — from the same dropdownHeightFit(), so the two
// cannot disagree about where a panel ends.
// why: docs/components.md#dropdown

/** A phone, with the trigger's own bottom `bottom` px down a `view`px-tall screen. */
function phone(bottom: number, view = 844) {
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(view);
  vi.spyOn(HTMLButtonElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: bottom - 31, bottom, left: 16, right: 176, width: 160, height: 31, x: 16, y: bottom - 31,
    toJSON: () => ({}),
  } as DOMRect);
}

const availOf = (c: Element) =>
  (c.querySelector('.ui-dropdown__panel') as HTMLElement).style.getPropertyValue('--ui-dropdown-avail');

it('an open panel is capped at the room between its trigger and the viewport edge', () => {
  phone(544); // 844 − 300 − 31 + 31, the trigger ending 300px above the bottom
  const { container } = render(<Dropdown value="Account" variant="menu" defaultOpen items={MENU} />);
  expect(availOf(container)).toBe(`${844 - 544 - 9 - 8}px`);
});

// Mocked rectangles verify effect wiring. Browser evidence verifies the layout.
/** A Modal body from 100px to 640px with a 30-row select in it, opened by a click. */
async function inBody() {
  const { container } = render(<div style={{ overflowY: 'auto' }}>
    <Dropdown items={Array.from({ length: 30 }, (_, i) => ({ label: `Project ${i + 1}` }))} />
  </div>);
  const body = container.firstElementChild as HTMLElement;
  body.getBoundingClientRect = () => ({ top: 100, bottom: 640 } as DOMRect);
  Object.defineProperty(body, 'clientHeight', { value: 540 });
  const panel = container.querySelector('.ui-dropdown__panel') as HTMLElement;
  Object.defineProperty(panel, 'offsetHeight', { value: 300 });
  await userEvent.setup().click(within(container).getByRole('button'));
  return { container, body, panel };
}

it('a panel in a scrolling body opens below its trigger, over the body, and the body does not scroll', async () => {
  phone(600);
  const { container, body, panel } = await inBody();
  expect(panel.getAttribute('data-dd-lifted')).toBe('down');
  expect(panel.style.top).toBe(`${600 + 9}px`);
  expect(body.scrollTop).toBe(0);
  expect((container.querySelector('.ui-dropdown') as HTMLElement).style.getPropertyValue('--ui-dropdown-reach')).toBe('');
  // Measured against the viewport, as a portalled panel is.
  expect(availOf(container)).toBe(`${844 - 600 - 9 - 8}px`);
});

it('a panel in a scrolling body opens above its trigger when the view has less than 120px below it', async () => {
  phone(844 - 9 - 119);
  const { body, panel } = await inBody();
  expect(panel.getAttribute('data-dd-lifted')).toBe('up');
  expect(panel.style.bottom).toBe(`${844 - (844 - 9 - 119 - 31) + 9}px`);
  expect(body.scrollTop).toBe(0);
});

// A font that arrives late moves the trigger, and no box resizes and nothing scrolls. The
// font set is a stand-in with only its event, so the test controls when the font lands. #924
it('a lifted panel follows its trigger when a late font moves it', async () => {
  const fonts = new EventTarget();
  Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
  try {
    phone(600);
    const { panel } = await inBody();
    expect(panel.style.top).toBe(`${600 + 9}px`);
    phone(615);
    fonts.dispatchEvent(new Event('loadingdone'));
    expect(panel.style.top).toBe(`${615 + 9}px`);
  } finally {
    delete (document as { fonts?: unknown }).fonts;
  }
});

// A panel in the page flow takes the rule a lifted panel takes: its own side, unless that
// side cannot hold the 120px floor and the other side has more room.
it('a panel in a page opens on the other side when its own side cannot hold it', async () => {
  const opened = async (bottom: number, direction: 'up' | 'down') => {
    phone(bottom);
    const { container, unmount } = render(<Dropdown items={MENU} ariaLabel="Row actions" direction={direction} />);
    const panel = container.querySelector('.ui-dropdown__panel') as HTMLElement;
    Object.defineProperty(panel, 'offsetHeight', { value: 200 });
    await userEvent.setup().click(within(container).getByRole('button'));
    const side = { up: panel.classList.contains('is-up'), avail: availOf(container) };
    unmount();
    return side;
  };
  // A bar near the top of the view: no room above, so the panel opens below.
  expect(await opened(42, 'up')).toEqual({ up: false, avail: `${844 - 42 - 9 - 8}px` });
  // A trigger near the bottom: no room below, so the panel opens above.
  expect(await opened(844 - 5, 'down')).toEqual({ up: true, avail: `${844 - 5 - 31 - 9 - 8}px` });
  // Room on its own side: the panel keeps it.
  expect((await opened(600, 'up')).up).toBe(true);
  // A trigger under the view, as a picture opened at load far down a page: no side to judge.
  expect((await opened(2000, 'down')).up).toBe(false);
});

it('a trigger in a page reserves the 8px edge under the open panel, so closing moves nothing and opening adds no scroll', () => {
  phone(600);
  const { container } = render(<Dropdown value="Account" variant="menu" defaultOpen items={MENU} />);
  expect((container.querySelector('.ui-dropdown') as HTMLElement).style.getPropertyValue('--ui-dropdown-reach')).toBe(`${9 + 0 + 8 - 1}px`);
});

it('a trigger with no room left is left uncapped, not pinned to a nought-pixel sliver', () => {
  phone(844 - 5); // the gap alone already reaches the edge
  const { container } = render(<Dropdown value="Account" variant="menu" defaultOpen items={MENU} />);
  expect(availOf(container)).toBe('');
});

it('a panel opened with too little room keeps one height while the page scrolls, and a resize decides again', () => {
  phone(844 - 5);
  const { container } = render(<Dropdown value="Account" variant="menu" defaultOpen items={MENU} />);
  const panel = container.querySelector('.ui-dropdown__panel') as HTMLElement;
  expect(availOf(container)).toBe('');
  // The reader wheels the page and the trigger rises: more room, but the panel stays as it opened.
  phone(300);
  act(() => { window.dispatchEvent(new Event('scroll')); });
  expect(availOf(container)).toBe('');
  expect(panel.classList.contains('is-unbounded')).toBe(true);
  act(() => { window.dispatchEvent(new Event('resize')); });
  expect(availOf(container)).toBe(`${844 - 300 - 9 - 8}px`);
  expect(panel.classList.contains('is-unbounded')).toBe(false);
});

it('a long list is cut at a whole row and a half, and a list that fits is left alone', () => {
  // JSDOM lays nothing out, so the rectangles are staged: rows 40px tall, the list n rows long.
  const sheet = document.createElement('style');
  sheet.textContent = '.ui-dropdown__panel { --ui-dropdown-max: 300px; }';
  document.head.append(sheet);
  const open = (n: number) => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const rows = Array.from(document.querySelectorAll('[data-dd-item]'));
      const at = rows.indexOf(this) * 40;
      const height = rows.includes(this) ? 40 : this.classList.contains('ui-dropdown__panel') ? Math.min(n * 40, 300) : 0;
      return { top: at, bottom: at + height, left: 0, right: 100, width: 100, height, x: 0, y: at, toJSON: () => ({}) } as DOMRect;
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => n * 40 });
    const items = Array.from({ length: n }, (_, i) => ({ label: `Row ${i + 1}` }));
    const { container } = render(<Dropdown value="Account" variant="menu" defaultOpen items={items} />);
    return container.querySelector('.ui-dropdown__panel') as HTMLElement;
  };
  try {
    // Seven rows and a half is 300px, so the cut is the last half row at or under the ceiling.
    expect(open(30).style.getPropertyValue('--ui-dropdown-fit')).toBe('300px');
    cleanup();
    expect(open(5).style.getPropertyValue('--ui-dropdown-fit')).toBe('');
  } finally {
    sheet.remove();
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
  }
});

it('a room too small for the floor even after spending the inset writes no avail (#641 review)', () => {
  // The trigger's bottom at 808 on a 390x844 phone, as the review measured: 27px
  // of room past the gap, short of the 120px floor even spending the whole inset.
  // Capping here drew a 27px sliver hiding 446px of rows — danger 1 in #641's
  // review — so the property is removed and the panel keeps its cap.
  phone(808);
  const { container } = render(<Dropdown value="Account" variant="menu" defaultOpen items={MENU} />);
  expect(availOf(container)).toBe('');
});

it('a panel the room cannot hold is marked unbounded, and keeps its cap', () => {
  phone(808);
  const { container } = render(<Dropdown value="Account" variant="menu" defaultOpen items={MENU} />);
  expect(container.querySelector('.ui-dropdown__panel')!.classList.contains('is-unbounded')).toBe(true);
});

it('a shut panel gives back its box once the fade is over, and an open panel has it', () => {
  vi.useFakeTimers();
  try {
    const { container } = render(<Dropdown items={MENU} value="Account" variant="menu" />);
    const panel = container.querySelector('.ui-dropdown__panel') as HTMLElement;
    const trigger = within(container).getByRole('button');
    vi.advanceTimersByTime(1000);
    expect(panel.hasAttribute('data-dd-shut')).toBe(true);
    fireEvent.click(trigger);
    expect(panel.hasAttribute('data-dd-shut')).toBe(false);
    fireEvent.click(trigger);
    expect(panel.hasAttribute('data-dd-shut')).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(panel.hasAttribute('data-dd-shut')).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

it('the room is measured when the panel opens and held while the page scrolls, and a resize measures again', () => {
  phone(231);
  const { container } = render(<Dropdown value="Account" variant="menu" defaultOpen items={MENU} />);
  expect(availOf(container)).toBe(`${844 - 231 - 9 - 8}px`);
  phone(631);
  act(() => { window.dispatchEvent(new Event('scroll')); });
  expect(availOf(container)).toBe(`${844 - 231 - 9 - 8}px`);
  act(() => { window.dispatchEvent(new Event('resize')); });
  expect(availOf(container)).toBe(`${844 - 631 - 9 - 8}px`);
});

it('a closed panel is not measured, so nothing is written until it opens', () => {
  phone(231);
  const { container } = render(<Dropdown value="Account" variant="menu" items={MENU} />);
  expect(availOf(container)).toBe('');
});

it('the `scroll` option asks for the cap property, never an inline height', () => {
  const { container } = render(<Dropdown value="Account" variant="menu" scroll={420} items={MENU} />);
  const panel = container.querySelector('.ui-dropdown__panel') as HTMLElement;
  expect(panel.style.getPropertyValue('--ui-dropdown-cap')).toBe('420px');
  expect(panel.style.maxHeight).toBe('');
});

it('a keyboard open sizes the panel before focusing a row (#502 review)', async () => {
  // Twelve rows, the last one selected: ArrowUp on the trigger lands focus on
  // that row. If the cap were applied after the focus effect, that row's own
  // focus() could run — and in a real browser, scroll the page — before the
  // cap had been measured, taking the trigger's position with it. Sizing first
  // means --ui-dropdown-avail is already written by the time any row is focused.
  phone(544);
  const TWELVE: DropdownEntry[] = Array.from({ length: 12 }, (_, i) => ({
    label: `Row ${i + 1}`, value: String(i + 1), selected: i === 11,
  }));
  const { container } = render(<Dropdown variant="select" items={TWELVE} />);
  const dd = container.querySelector('.ui-dropdown')!;
  const trigger = within(dd as HTMLElement).getByRole('button');

  let availAtFocus: string | null = null;
  const realFocus = HTMLElement.prototype.focus;
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement) {
    if (availAtFocus === null && this.matches('[data-dd-item]')) availAtFocus = availOf(container);
    return realFocus.call(this);
  });

  trigger.focus();
  await userEvent.setup().keyboard('{ArrowUp}');

  expect(document.activeElement).toBe(rowsOf(dd)[11]);
  expect(availAtFocus).toBe(`${844 - 544 - 9 - 8}px`);
});

