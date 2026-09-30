import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as stories from './DocumentReview.stories';

/* The three-step flow, driven through the story the showcase publishes, so the test and
 * the screen a reader sees cannot drift apart. jsdom has no layout, so what this covers
 * is structure, naming, order and state: which step is on screen, what each step offers,
 * and what is announced. Column geometry, the sticky action row at 560px, the sheet's
 * zoom and every contrast pair are checked in the browser captures on #385, not here. */

const { Default } = composeStories(stories);
afterEach(() => { cleanup(); document.cookie = 'apliteni-ui-rail=; Max-Age=0; path=/'; });

const actions = () => within(document.querySelector('.doc-flow__actions') as HTMLElement);
const status = () => document.querySelector('.ui-busy .ui-sr') as HTMLElement;

describe('document review flow', () => {
  it('walks review to approved, keeping the committing action first on every step', () => {
    render(<Default />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Review invoice DEMO-1042');
    // Fix 7: the committing action is the first control in the row, at every step.
    expect(actions().getAllByRole('button')[0]).toHaveTextContent('Continue to approval');

    fireEvent.click(screen.getByRole('button', { name: 'Continue to approval' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Confirm approval');
    const onConfirm = actions().getAllByRole('button');
    expect(onConfirm.map((b) => b.textContent)).toEqual(['Approve document', 'Back to review']);

    // Fix 3: the confirm step promotes the one figure the approval commits to and does
    // not reprint the review step's rows.
    expect(screen.getByText('Total to approve')).toBeInTheDocument();
    expect(screen.getByText('€1,440.00')).toBeInTheDocument();
    for (const gone of ['Issued', 'VAT (20%)', 'Subtotal', 'Interface design']) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
    // Fix 4: what approval means sits inside the same block as the button, not in the
    // page introduction above the content.
    const consequence = screen.getByText(/does not send a payment/);
    expect(consequence.closest('.ui-callout')).toBeInTheDocument();
    expect(document.querySelector('.ui-app__sub')).not.toContainElement(consequence);

    // Back keeps the flow, and returns to a step that still has its content.
    fireEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Review invoice DEMO-1042');
    expect(screen.getByText('Interface design')).toBeInTheDocument();
  });

  it('marks the whole screen busy from one flag and announces the result', () => {
    vi.useFakeTimers();
    try {
      render(<Default step="confirm" />);
      const approve = screen.getByRole('button', { name: 'Approve document' });
      fireEvent.click(approve);
      // Fix 18: one flag disables the control, marks the region busy and announces.
      expect(approve).toHaveAttribute('aria-busy', 'true');
      expect(approve).toHaveAttribute('aria-disabled', 'true');
      expect(document.getElementById('document-review')).toHaveAttribute('aria-busy', 'true');
      expect(status()).toHaveTextContent('Recording the approval');
      // A busy control does not submit twice.
      fireEvent.click(approve);
      act(() => { vi.advanceTimersByTime(900); });
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Document approved');
      expect(document.getElementById('document-review')).toHaveAttribute('aria-busy', 'false');
      // success() brings its own live region, so the screen's announcer falls silent
      // rather than reporting the same event a second time.
      expect(status()).toHaveTextContent('');
      expect(document.querySelector('.ui-sx')).toHaveAttribute('aria-live', 'polite');
    } finally { vi.useRealTimers(); }
  });

  it('reports a refused approval in an alert that names the cause and offers the retry first', () => {
    render(<Default step="error" />);
    // Fix 19: an alert, and a cause instead of "check the document".
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('the approval service refused the request');
    expect(alert).toHaveTextContent('Nothing about the document changed');
    expect(actions().getAllByRole('button').map((b) => b.textContent))
      .toEqual(['Try approval again', 'Back to review']);
    // The way out is a control in the same row, not something below the fold.
    expect(screen.getByRole('button', { name: 'Back to review' })).toBeInTheDocument();
  });

  it('gives the result a receipt and no second way to the same place', () => {
    render(<Default step="approved" />);
    // Fix 20: when it happened and who did it, plus a link to the document.
    const result = document.querySelector('.ui-sx') as HTMLElement;
    expect(result).toHaveTextContent('Approved on 30 September 2026 at 14:32 CET by Demo User');
    expect(result).toHaveTextContent('No payment was sent');
    expect(within(result).getByRole('link', { name: 'Open DEMO-1042' })).toBeInTheDocument();
    // Fix 9: success() is the page, so no back link competes with it.
    expect(document.querySelector('.ui-back')).toBeNull();
    // The result's title sits under the page title rather than adding a second one.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(result.querySelector('.ui-sx__title')?.tagName).toBe('H2');
    expect(within(result).getAllByRole('link')[0]).toHaveTextContent('Return to invoices');
  });

  it('keeps the back link and the parent section on the steps that sit under Invoices', () => {
    render(<Default />);
    const rail = within(screen.getByRole('navigation', { name: 'Sections' }));
    // The rail row is the parent of the page on screen, so "true", not "page".
    // why: guidelines/going-back.md#keep-the-section-active
    expect(rail.getByRole('link', { name: 'Invoices' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Back to Invoices' })).toHaveAttribute('href', '#invoices');
  });

  it('compares the two readings of the same figures in one format, right-aligned', () => {
    const { container } = render(<Default />);
    const [document_, extracted] = [...container.querySelectorAll('.ui-table')];
    // Fix 11: both sides write 1,440.00 with the unit in the header, and both put the
    // figure in a right-aligned numeric cell so the decimal points line up.
    for (const table of [document_, extracted]) {
      const total = [...table.querySelectorAll('tfoot tr')].at(-1) as HTMLElement;
      expect(total).toHaveTextContent('Total');
      const figure = total.querySelector('td') as HTMLElement;
      expect(figure).toHaveTextContent('1,440.00');
      expect(figure).toHaveClass('ui-table__num');
      expect(figure).toHaveClass('ui-table__num--strong');
    }
    expect(extracted.querySelector('thead th:last-child')).toHaveTextContent('EUR');
    expect(document_.querySelector('thead th:last-child')).toHaveTextContent('Amount (EUR)');
    // No € inside either table, so neither side is read character by character.
    expect(document_.textContent).not.toContain('€');
    expect(extracted.textContent).not.toContain('€');
  });

  it('offers no download and no zoom it cannot apply while the preview is missing', () => {
    const { rerender } = render(<Default preview="unavailable" />);
    // Artur removed "Download text" on PR #437: it wrote a summary, not the document.
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fit' })).toBeDisabled();
    // The fields the reader came to check stay usable without the preview.
    expect(screen.getByText('Sample Studio')).toBeInTheDocument();
    expect(status()).toHaveTextContent('Preview unavailable');

    rerender(<Default preview="loading" />);
    expect(status()).toHaveTextContent('Loading the invoice');
    expect(screen.getByRole('button', { name: 'Continue to approval' })).toBeDisabled();
  });
});
