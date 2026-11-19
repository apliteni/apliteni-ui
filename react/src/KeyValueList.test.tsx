import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { Drawer } from './Drawer';
import { Modal } from './Modal';
// @ts-expect-error -- shared CSS token resolver is JavaScript.
import { tokensFor, substitute, kitCssFor, parseColour, ratio, desugar } from '../../stories/lib/contrast.js';
// @ts-expect-error -- shared cascade reader is JavaScript.
import { specificity, selectorList, sheetText } from '../../stories/lib/focus-walk.js';
import { KeyValueList, DrawerSection } from './KeyValueList';
import { WideDrawer, CopyIdentifier } from './KeyValueList.stories';
import type { ReactElement } from 'react';
import { Dropdown } from './Dropdown';
import { SelectField, TextField } from './Field';

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('style[data-kv-test]').forEach(style => style.remove());
  delete document.documentElement.dataset.theme;
});

it('groups each term and definition without a drawer list class', () => {
  const { container } = render(<DrawerSection title="Details"><KeyValueList rows={[
    { label: 'Reference', value: 'INV-1001' }, { label: 'Amount', value: '€ 120' },
  ]} /></DrawerSection>);
  expect(container.querySelector('section.ui-drawer__section > h3.ui-drawer__section-title')).toHaveTextContent('Details');
  expect(container.querySelectorAll('dl.ui-kv > div.ui-drawer__row')).toHaveLength(2);
  expect(container.querySelector('dl')).not.toHaveClass('ui-drawer__rows');
  expect([...container.querySelectorAll('dt, dd')].map(el => el.textContent)).toEqual(['Reference', 'INV-1001', 'Amount', '€ 120']);
});

it('shows a dash only for null and undefined values', () => {
  const { container } = render(<KeyValueList rows={[
    { label: 'Null', value: null }, { label: 'Absent' }, { label: 'Undefined', value: undefined },
    { label: 'Empty', value: '' }, { label: 'Spaces', value: '  ' },
  ]} />);
  expect([...container.querySelectorAll('dd')].map(el => el.textContent)).toEqual(['—', '—', '—', '', '  ']);
});

it('renders false, true and zero as plain text', () => {
  const { container } = render(<KeyValueList rows={[
    { label: 'Inactive', value: false }, { label: 'Active', value: true }, { label: 'Zero', value: 0 },
  ]} />);
  expect([...container.querySelectorAll('dd')].map(el => el.textContent)).toEqual(['false', 'true', '0']);
});

it('redacts the value without putting it in the DOM', () => {
  const { container } = render(<KeyValueList rows={[{ label: 'Account', value: 'secret-value', redacted: true }]} />);
  expect(screen.getByText('Hidden')).toBeVisible();
  expect(container.innerHTML).not.toContain('secret-value');
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

it('keeps rich values and native link keyboard behavior', async () => {
  const user = userEvent.setup();
  render(<KeyValueList columns={2} rows={[
    { label: 'Status', value: <span className="ui-badge">Posted</span> },
    { label: 'Invoice', value: <a href="#invoice">INV-1001</a> },
  ]} />);
  await user.tab();
  expect(screen.getByRole('link', { name: 'INV-1001' })).toHaveFocus();
  expect(screen.getByText('Posted')).toHaveClass('ui-badge');
});

it('passes native attributes and keeps caller classes', () => {
  const { container } = render(<DrawerSection title="Details" headingLevel={2} id="details" className="custom-section">
    <KeyValueList rows={[]} columns={2} className="custom-list" aria-label="Facts" />
  </DrawerSection>);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Details');
  expect(container.querySelector('section')).toHaveClass('ui-drawer__section', 'custom-section');
  expect(container.querySelector('dl')).toHaveClass('ui-kv--two-columns', 'custom-list');
  expect(container.querySelector('dl')).toHaveAttribute('aria-label', 'Facts');
});

it('has no axe violations for sections, missing and redacted values', async () => {
  const { container } = render(<main><DrawerSection title="Details"><KeyValueList rows={[
    { label: 'Amount', value: '€ 120' }, { label: 'Account', redacted: true }, { label: 'Note' },
    { label: 'Invoice', value: <a href="#invoice">INV-1001</a> },
  ]} /></DrawerSection></main>);
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});

// jsdom checks the resolved margins and grid declarations, not pixel layout.
// The InDrawer/InModal stories provide browser gap and alignment measurements.
it.each(['light', 'dark'])('keeps drawer spacing local in %s', theme => {
  const style = document.createElement('style');
  style.dataset.kvTest = '';
  style.textContent = substitute([
    '../../src/styles/drawer.css', './KeyValueList.css', './Modal.css',
  ].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n'), tokensFor(theme));
  document.head.appendChild(style);
  const rows = [{ label: 'Reference', value: 'INV-1001' }];
  render(<>
    <Drawer open title="Drawer" onClose={() => {}}>
      <DrawerSection title="Details"><KeyValueList rows={rows} /><div data-testid="drawer-next">Saved</div></DrawerSection>
    </Drawer>
    <Modal open title="Modal" onClose={() => {}}>
      <KeyValueList rows={rows} /><div data-testid="modal-next">Saved</div>
    </Modal>
    <main><KeyValueList rows={rows} /><div data-testid="plain-next">Saved</div></main>
  </>);
  expect(getComputedStyle(screen.getByTestId('drawer-next')).marginTop).toBe('12px');
  for (const name of ['modal-next', 'plain-next']) {
    expect(parseFloat(getComputedStyle(screen.getByTestId(name)).marginTop) || 0).toBe(0);
  }
  expect(getComputedStyle(document.querySelector('.rx-modal__body')!).gap).toBe('16px');
  const lists = document.querySelectorAll('dl.ui-kv');
  expect(lists).toHaveLength(3);
  for (const list of lists) {
    expect(getComputedStyle(list).display).toBe('grid');
    expect(getComputedStyle(list).marginTop).toBe('0px');
    expect(getComputedStyle(list).columnGap).toBe('16px');
  }
});

// jsdom resolves the declared alignment; the browser captures measure the lines.
const controlRows = [
  { label: 'Reference', value: 'INV-1001' },
  { label: 'Status', value: <Dropdown label="Status" items={[{ label: 'Open', value: 'open' }]} /> },
  { label: 'Currency', value: <SelectField label="Currency"><option>EUR</option></SelectField> },
  { label: 'Note', value: <TextField label="Note" defaultValue="Paid by wire" /> },
];
const drawerSheet = () => ['../../src/styles/drawer.css', './KeyValueList.css']
  .map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const alignments = (css: string, theme: string) => {
  const style = document.createElement('style');
  style.dataset.kvTest = '';
  style.textContent = substitute(css, tokensFor(theme));
  document.head.appendChild(style);
  const { container } = render(<KeyValueList rows={controlRows} />);
  return [...container.querySelectorAll('.ui-drawer__row')]
    .map(row => [...row.querySelectorAll(':scope > dt, :scope > dd')].map(cell => getComputedStyle(cell).alignSelf));
};

it.each(['light', 'dark'])('aligns a label with a field or dropdown value by itself, and leaves text rows alone, in %s', theme => {
  const [text, ...controls] = alignments(drawerSheet(), theme);
  expect(text).not.toContain('baseline');
  expect(controls).toHaveLength(3);
  for (const cells of controls) expect(cells).toEqual(['baseline', 'baseline']);
});

it('the alignment check rejects a sheet without the control row rule', () => {
  const without = drawerSheet().replace(/\.ui-drawer__row:has\([^{]*\{[^}]*\}/, '');
  expect(without).not.toBe(drawerSheet());
  expect(alignments(without, 'light').flat()).not.toContain('baseline');
});

it.each(['light', 'dark'])('keeps each field label visible when a drawer value holds two fields in %s', theme => {
  const style = document.createElement('style');
  style.dataset.kvTest = '';
  style.textContent = substitute(drawerSheet(), tokensFor(theme));
  document.head.appendChild(style);
  const { container } = render(<KeyValueList rows={[
    { label: 'Date range', value: <><TextField label="From" /><TextField label="To" /></> },
    { label: 'Note', value: <TextField label="Note" /> },
  ]} />);
  const labels = [...container.querySelectorAll('.ui-field__label')];
  expect(labels.map(label => label.textContent)).toEqual(['From', 'To', 'Note']);
  expect(labels.map(label => getComputedStyle(label).position)).toEqual(['static', 'static', 'absolute']);
});

// A path in a variable: Vite rewrites `new URL('<literal>', import.meta.url)` to a served URL.
const KV_CSS = './KeyValueList.css';
const kvSheet = () => readFileSync(new URL(KV_CSS, import.meta.url), 'utf8');
// The invoice drawer of the Wide Drawer story, read in jsdom with the whole kit sheet: what
// parts the groups, the lead figure's type, and the table's type, lines and ground. Where
// each part lands in pixels is the browser capture's to show.
const drawerAt = (theme: string) => {
  const palette = tokensFor(theme);
  // The light theme's own overrides key on the root's theme, as in the browser.
  document.documentElement.dataset.theme = theme;
  const style = document.createElement('style');
  style.dataset.kvTest = '';
  style.textContent = `${kitCssFor(theme).css}\n${substitute(kvSheet(), palette)}`;
  document.head.appendChild(style);
  const rows = [{ label: 'Number', redacted: true }, { label: 'Note' }];
  const { container } = render(<div className="ui-drawer ui-drawer--right ui-drawer--lg is-open"><div className="ui-drawer__panel"><div className="ui-drawer__body">
    <DrawerSection><dl className="ui-drawer__figure"><dt>Total</dt><dd><span className="ui-drawer__figure-value">€ 1,240.00</span><span className="ui-badge">Posted</span></dd></dl></DrawerSection>
    <DrawerSection><table className="ui-table"><thead><tr><th>Item</th></tr></thead><tbody><tr><td>Fee</td></tr><tr><td>Tax</td></tr></tbody></table></DrawerSection>
    <DrawerSection title="Account"><KeyValueList rows={rows} columns={2} /></DrawerSection>
    <DrawerSection><table className="ui-table ui-table--hover"><tbody>
      <tr><td>Fee</td><td className="ui-table__selection"><input type="checkbox" aria-label="Select Fee" /></td></tr>
      <tr><td>Tax</td><td className="ui-table__selection"><input type="checkbox" aria-label="Select Tax" defaultChecked /></td></tr>
    </tbody></table></DrawerSection>
  </div></div></div>);
  const ink = (name: string) => {
    const probe = document.createElement('i');
    probe.style.color = substitute(`var(${name})`, palette);
    container.appendChild(probe);
    return getComputedStyle(probe).color;
  };
  const panel = container.querySelector('.ui-drawer__panel')!;
  const line = (el: Element, side: 'Top' | 'Bottom') => {
    const cs = getComputedStyle(el);
    return cs[`border${side}Style`] === 'solid' && parseFloat(cs[`border${side}Width`]) > 0
      && `${cs[`border${side}Width`]} ${cs[`border${side}Color`] === ink('--border') ? 'hairline' : cs[`border${side}Color`]}`;
  };
  const cs = (selector: string) => getComputedStyle(container.querySelector(selector)!);
  const [table, hover] = [...container.querySelectorAll('.ui-table')];
  return {
    groups: [...container.querySelectorAll('.ui-drawer__section')].map(section => ({ gap: getComputedStyle(section).marginTop || '0px', line: line(section, 'Top') })),
    heading: { line: line(container.querySelector('.ui-drawer__section-title')!, 'Bottom'), pad: cs('.ui-drawer__section-title').paddingBottom },
    figure: {
      label: [cs('.ui-drawer__figure > dt').fontSize, cs('.ui-drawer__figure > dt').color === ink('--text')],
      value: [cs('.ui-drawer__figure-value').fontSize, cs('.ui-drawer__figure-value').fontWeight, cs('.ui-drawer__figure-value').whiteSpace, cs('.ui-drawer__figure-value').color === ink('--strong')],
      row: [cs('.ui-drawer__figure > dd').display, cs('.ui-drawer__figure > dd').alignItems],
    },
    table: {
      head: [line(table.querySelector('th')!, 'Bottom'), cs('.ui-table th').fontSize, cs('.ui-table th').fontWeight, cs('.ui-table th').color === ink('--strong')],
      cells: [...table.querySelectorAll('td')].map(td => [getComputedStyle(td).fontSize, getComputedStyle(td).paddingTop, getComputedStyle(td).paddingBottom, line(td, 'Bottom')]),
      ground: [table, hover].map(t => getComputedStyle(t).backgroundColor === getComputedStyle(panel).backgroundColor),
    },
    // A hover table keeps its row floor, and hangs out by its end-cell inset.
    hover: { cell: [getComputedStyle(hover.querySelector('td')!).fontSize, line(hover.querySelector('td')!, 'Bottom')], hang: hangOf(hover, style), hoverStep: hoverStep(hover, panel) },
    selected: selectedFill(hover.querySelectorAll('tbody tr')[1] as HTMLElement),
  };
};
// The sheet is desugared, so a state attribute stands for :hover. 1.1:1 is the floor: a
// card's hovered row steps 1.17:1 from the card in dark, and --surface-3 on the drawer 1.04:1.
const hoverStep = (table: Element, panel: Element) => {
  const row = table.querySelector('tbody tr') as HTMLElement;
  row.dataset.uiState = 'hover';
  const step = ratio(parseColour(getComputedStyle(row.querySelector('td')!).backgroundColor)!, parseColour(getComputedStyle(panel).backgroundColor)!);
  delete row.dataset.uiState;
  return step >= 1.1;
};
type Fill = { one: string; fill: string };
// A checked row keeps its accent wash at rest and takes the stronger wash under the pointer.
// JSDOM ranks a `:has()` rule above an equal one, so the winner is ranked here, by specificity
// and then by order in the table sheet. LIMIT: table.css only, with each at-rule's condition
// taken as true, and `background` and `background-color` read as one property.
const selectedFill = (row: HTMLElement) => {
  const sheet = sheetText(desugar(readFileSync(new URL(TABLE_CSS, import.meta.url), 'utf8')));
  const rules: Fill[] = [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, selector, body]: string[]) => {
    const fill = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(body);
    return fill ? selectorList(selector).map((one: string) => ({ one: one.trim(), fill: fill[1].trim() })) : [];
  });
  const cell = row.querySelector('td')!;
  const winner = () => rules.filter(({ one }) => cell.matches(one)).reduce((best: Fill | null, rule) => {
    if (!best) return rule;
    const [a, b]: number[][] = [specificity(rule.one), specificity(best.one)];
    const at = a.findIndex((n, i) => n !== b[i]);
    return at === -1 || a[at] > b[at] ? rule : best;
  }, null)?.fill;
  const rest = winner();
  row.dataset.uiState = 'hover';
  const hovered = winner();
  delete row.dataset.uiState;
  return { rest, hovered };
};
// The contrast resolver gives a variable one value per element context, so it misreads a
// variable that a table declares and uses on itself. Here the end-cell inset is one marked
// length, so the table must hang out by the length that pads its first cell.
const TABLE_CSS = '../../src/styles/table.css';
const hangOf = (table: Element, style: HTMLStyleElement) => {
  const resolved = style.textContent;
  style.textContent = readFileSync(new URL(TABLE_CSS, import.meta.url), 'utf8').replaceAll('var(--cell-edge)', '7px');
  const hang = [getComputedStyle(table).marginLeft, getComputedStyle(table.querySelector('td')!).paddingLeft];
  style.textContent = resolved;
  return hang;
};

it.each(['light', 'dark'])('parts drawer groups by space, stands a heading on a hairline, and sets a table in the drawer text, in %s', theme => {
  expect(drawerAt(theme)).toEqual({
    groups: [{ gap: '0px', line: false }, { gap: '32px', line: false }, { gap: '32px', line: false }, { gap: '32px', line: false }],
    heading: { line: '1px hairline', pad: '8px' },
    figure: { label: ['13px', true], value: ['22px', '600', 'nowrap', true], row: ['flex', 'center'] },
    table: {
      head: ['1px hairline', '13px', '600', true],
      cells: [['13px', '12px', '8px', false], ['13px', '8px', '8px', false]],
      ground: [true, true],
    },
    hover: { cell: ['13px', false], hang: ['-7px', '7px'], hoverStep: true },
    selected: {
      rest: 'color-mix(in srgb, var(--accent) var(--card-tint), var(--table-bg))',
      hovered: 'color-mix(in srgb, var(--accent) var(--card-tint-hover), var(--table-bg))',
    },
  });
});

// The invoice drawer the owner chose: the reference in the title, a header button, the total
// first, the lines with no heading of their own, then the account in two pairs to a row.
// Keep units readable, on the Dense tables page: the unit stands once, smaller, in the
// column heading, and each figure is the number alone.
it('builds the wide drawer story as the invoice statement', () => {
  const Story = (WideDrawer as { render: () => ReactElement }).render;
  render(<Story />);
  const drawer = screen.getByRole('dialog', { name: 'Invoice INV-1001' });
  expect(within(drawer).getByRole('link', { name: 'View invoice' }).closest('.ui-drawer__actions')).not.toBeNull();
  expect([...drawer.querySelectorAll('.ui-drawer__section')].map(section => section.querySelector('.ui-drawer__figure, .ui-table, .ui-kv')!.className.split(' ')[0])).toEqual(['ui-drawer__figure', 'ui-table', 'ui-kv']);
  expect(within(drawer).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Account']);
  // The lines have no heading on screen, so a screen reader takes their name from a hidden caption.
  expect(within(drawer).getByRole('table', { name: 'Lines' }).querySelector('caption')).toHaveClass('ui-sr');
  expect(drawer.querySelector('.ui-drawer__figure-value')).toHaveTextContent('€ 1,240.00');
  expect(drawer.querySelector('.ui-kv')).toHaveClass('ui-kv--two-columns');
  expect(screen.getByRole('columnheader', { name: /Amount/ }).querySelector('.ui-value__unit')).toHaveTextContent('EUR');
  expect([...document.querySelectorAll('tbody td.ui-table__num')].map(cell => cell.textContent)).toEqual(['1,000.00', '240.00']);
});

it.each(['light', 'dark'])('sets the modal title in semibold strong ink in %s', theme => {
  const style = document.createElement('style');
  style.dataset.kvTest = '';
  const tokens = tokensFor(theme);
  style.textContent = substitute(['./Modal.css'].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n'), tokens);
  document.head.appendChild(style);
  render(<Modal open title="Invoice details" onClose={() => {}}>body</Modal>);
  const title = document.querySelector('.rx-modal__title')!;
  expect(getComputedStyle(title).fontWeight).toBe('600');
  const probe = document.createElement('i');
  probe.style.color = substitute('var(--strong)', tokens);
  document.body.appendChild(probe);
  expect(getComputedStyle(title).color).toBe(getComputedStyle(probe).color);
  expect(getComputedStyle(title).color).not.toBe('');
});

// The story is the example a consumer copies, so its copy button must write before it confirms. #832
async function pressCopy(writeText: () => Promise<void>) {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  render((CopyIdentifier.render as () => ReactElement)());
  const button = screen.getByRole('button', { name: 'Copy INV-1162' });
  const idle = button.innerHTML;
  await userEvent.click(button);
  return { button, idle };
}

it('writes the identifier, then swaps the glyph and says Copied', async () => {
  const write = vi.fn().mockResolvedValue(undefined);
  const { button, idle } = await pressCopy(write);
  expect(write).toHaveBeenCalledWith('INV-1162');
  expect(await screen.findByRole('status')).toHaveTextContent('Copied');
  expect(button.innerHTML).not.toBe(idle);
  vi.unstubAllGlobals();
});

it('shows the alert glyph and says Copy failed when the write fails', async () => {
  const { button, idle } = await pressCopy(vi.fn().mockRejectedValue(new Error('denied')));
  expect(await screen.findByRole('status')).toHaveTextContent('Copy failed');
  expect(button.innerHTML).not.toBe(idle);
  vi.unstubAllGlobals();
});

it('shows a failure and a success with different glyphs', async () => {
  const write = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(undefined);
  const { button } = await pressCopy(write);
  const failed = button.innerHTML;
  await userEvent.click(button);
  expect(await screen.findByRole('status')).toHaveTextContent('Copied');
  expect(button.innerHTML).not.toBe(failed);
  vi.unstubAllGlobals();
});

it('restarts the glyph timer at each press, so a second press keeps the check for its full time', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  render((CopyIdentifier.render as () => ReactElement)());
  const button = screen.getByRole('button', { name: 'Copy INV-1162' });
  const idle = button.innerHTML;
  await act(async () => { fireEvent.click(button); });
  await act(async () => { vi.advanceTimersByTime(1000); });
  await act(async () => { fireEvent.click(button); });
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(button.innerHTML).not.toBe(idle);
  await act(async () => { vi.advanceTimersByTime(600); });
  expect(button.innerHTML).toBe(idle);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
