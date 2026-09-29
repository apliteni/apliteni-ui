import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { Drawer } from './Drawer';
import { Modal } from './Modal';
// @ts-expect-error -- shared CSS token resolver is JavaScript.
import { tokensFor, substitute } from '../../stories/lib/contrast.js';
import { KeyValueList, DrawerSection } from './KeyValueList';

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('style[data-kv-test]').forEach(style => style.remove());
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
