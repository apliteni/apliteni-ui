import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FreshnessChip, FreshnessRow } from './FreshnessChip';

const source = { source: 'Ledger', date: '26 Sep 2026', dateTime: '2026-09-26', detail: 'Daily. Last run succeeded.' };

describe('FreshnessChip', () => {
  it.each(['fresh', 'late', 'failing'] as const)('names the source, last delivery and %s tone', (tone) => {
    render(<FreshnessChip {...source} tone={tone} />);
    const chip = screen.getByLabelText(`Ledger, ${tone}, as of 26 Sep 2026`);
    expect(chip).toHaveAttribute('tabindex', '0');
    expect(chip.querySelector('time')).toHaveAttribute('datetime', '2026-09-26');
    expect(document.getElementById(chip.getAttribute('aria-describedby')!)).toHaveTextContent(source.detail);
  });

  it('opens on focus and hover, dismisses with Escape and closes after leaving', async () => {
    const user = userEvent.setup();
    render(<FreshnessChip {...source} tone="fresh" />);
    const chip = screen.getByLabelText('Ledger, fresh, as of 26 Sep 2026');
    const tip = document.getElementById(chip.getAttribute('aria-describedby')!)!;
    expect(tip).not.toHaveClass('is-open');
    await user.tab();
    expect(chip).toHaveFocus();
    expect(tip).toHaveClass('is-open');
    await user.keyboard('{Escape}');
    expect(tip).not.toHaveClass('is-open');
    await user.tab();
    fireEvent.mouseEnter(chip.parentElement!);
    expect(tip).toHaveClass('is-open');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(tip).not.toHaveClass('is-open');
    fireEvent.mouseLeave(chip.parentElement!);
    expect(tip).not.toHaveClass('is-open');
  });

  it('keeps the tooltip open when the pointer enters the detail', () => {
    render(<FreshnessChip {...source} tone="late" />);
    const chip = screen.getByLabelText('Ledger, late, as of 26 Sep 2026');
    fireEvent.mouseEnter(chip.parentElement!);
    fireEvent.mouseEnter(screen.getByRole('tooltip'));
    expect(screen.getByRole('tooltip')).toHaveClass('is-open');
  });

  it('renders an optional source link and unique descriptions', () => {
    render(<><FreshnessChip {...source} tone="fresh" href="/sources/ledger" /><FreshnessChip {...source} tone="late" /></>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/sources/ledger');
    const ids = [...document.querySelectorAll('[aria-describedby]')].map(el => el.getAttribute('aria-describedby'));
    expect(new Set(ids).size).toBe(2);
  });
});

describe('FreshnessRow', () => {
  it('is a named list that preserves the caller’s scoped source order', () => {
    render(<FreshnessRow label="Report sources" sources={[
      { ...source, id: 'ledger', tone: 'fresh' },
      { ...source, id: 'bank', source: 'Bank feed', tone: 'late' },
    ]} />);
    expect(screen.getByRole('list', { name: 'Report sources' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual([
      expect.stringContaining('Ledger'), expect.stringContaining('Bank feed'),
    ]);
  });
});
