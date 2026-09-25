import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import axe from 'axe-core';
import { drawerSection } from '@apliteni/apliteni-ui';
import { KeyValueList, DrawerSection } from './KeyValueList';

afterEach(cleanup);

it('groups each term and definition using the drawer classes', () => {
  const { container } = render(<DrawerSection title="Details"><KeyValueList rows={[
    { label: 'Reference', value: 'INV-1001' }, { label: 'Amount', value: '€ 120' },
  ]} /></DrawerSection>);
  expect(container.querySelector('section.ui-drawer__section > h3.ui-drawer__section-title')).toHaveTextContent('Details');
  expect(container.querySelectorAll('dl.ui-drawer__rows > div.ui-drawer__row')).toHaveLength(2);
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

it('matches the vanilla section markup apart from the responsive list class', () => {
  const { container } = render(<DrawerSection title="Details"><KeyValueList rows={[
    { label: 'Reference', value: 'INV-1001' }, { label: 'Amount', value: '€ 120' },
  ]} /><p>Saved</p></DrawerSection>);
  container.querySelector('dl')!.classList.remove('ui-kv');
  expect(container.innerHTML).toBe(drawerSection({ title: 'Details', rows: [['Reference', 'INV-1001'], ['Amount', '€ 120']], body: '<p>Saved</p>' }));
});
