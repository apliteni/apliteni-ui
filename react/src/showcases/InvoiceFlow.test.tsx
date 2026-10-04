import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InvoiceFlow } from './InvoiceFlow';
// stories/lib is plain JS outside this workspace's tsconfig, shared the way DocumentReview's
// gate shares it: one calculation, a coverage check per workspace. why: AGENTS.md
// @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
import { accentLines, accentOffences } from '../../../stories/lib/accent-paint.js';

/* The showcase's sheet, read as text: vitest does not apply imported CSS in jsdom, so a
 * rule living there is held as the declaration it is. */
// Resolved from the workspace root, the way DocumentReview's gate resolves its own: this
// suite runs as `npm test -w react`, which puts the cwd there.
const SHEET = readFileSync(path.join(process.cwd(), 'src/showcases/InvoiceFlow.css'), 'utf8');

// Interaction tests cover in-memory state, not PDF rendering or real extraction.

/* The form's own summary, named by its text rather than by role. Each invalid field
 * carries its own `role="alert"` too (#388), so a rejected save leaves several alerts
 * on the page and the role alone no longer picks one out. */
const summaryAlert = () => {
  const summary = screen.getByText(/Check the highlighted fields/);
  expect(summary).toHaveAttribute('role', 'alert');
  return summary;
};

/* The detail screen carries no status badge (#459 r33), so a status assertion goes to the
 * list's Status column — the one place the record's state is written. */
const backToList = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('link', { name: 'Back to Invoices' }));
const rowStatus = (filename: string) => {
  const row = screen.getByRole('button', { name: filename }).closest('tr')!;
  return within(row).getByText(/^(Uploading|Parsing|Needs review|Ready)$/).textContent;
};

describe('invoice flow prototype', () => {
  it('adds multiple selected files, including repeated filenames, without replacing rows', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow />);
    const input = screen.getByLabelText('Select invoices');
    await user.upload(input, [new File(['a'], 'one.pdf', { type: 'application/pdf' }), new File(['b'], 'two.pdf', { type: 'application/pdf' })]);
    expect(screen.getAllByText('Uploading')).toHaveLength(2);
    await user.upload(input, new File(['c'], 'one.pdf', { type: 'application/pdf' }));
    expect(screen.getAllByText('Uploading')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'one.pdf' })).toHaveLength(2);
  });
  it('opens the picker from the drop box by pointer, Enter and Space', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow />);
    // The copy calls the box clickable, so every activation route has to reach the input.
    const input = screen.getByLabelText<HTMLInputElement>('Select invoices');
    const opened = vi.spyOn(input, 'click').mockImplementation(() => {});
    const box = screen.getByRole('button', { name: /Drop PDF, PNG or JPEG files anywhere in this box/ });
    await user.click(box);
    expect(opened).toHaveBeenCalledTimes(1);
    box.focus();
    expect(box).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(opened).toHaveBeenCalledTimes(2);
    await user.keyboard(' ');
    expect(opened).toHaveBeenCalledTimes(3);
    opened.mockRestore();
  });
  it('rejects an unsupported drop and recovers with a valid batch', () => {
    const { container } = render(<InvoiceFlow />);
    const zone = container.querySelector('.invoice-flow__drop')!;
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['bad'], 'notes.txt')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('No files were added');
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['a'], 'one.pdf'), new File(['b'], 'two.png')] } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByText('Uploading')).toHaveLength(2);
  });
  it('opens a record, preserves a draft across the list and saves and undoes it', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('button', { name: 'cedar-1042.pdf' }));
    const supplier = screen.getByRole('textbox', { name: 'Supplier' });
    await user.clear(supplier); await user.type(supplier, 'Cedar Design Studio');
    await user.click(screen.getByRole('link', { name: 'Back to Invoices' }));
    await user.click(screen.getByRole('button', { name: 'cedar-1042.pdf' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Design Studio');
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    expect(within(screen.getByRole('article')).getByText('Cedar Studio')).toBeInTheDocument();
    await backToList(user);
    expect(rowStatus('cedar-1042.pdf')).toBe('Ready');
    await user.click(screen.getByRole('button', { name: 'cedar-1042.pdf' }));
    await user.click(screen.getByRole('button', { name: 'Undo last save' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Studio');
    await backToList(user);
    expect(rowStatus('cedar-1042.pdf')).toBe('Needs review');
  });
  it('undoes a save on a Ready invoice back to Ready, not to Needs review', async () => {
    // The record birch-208.pdf was Ready before the save, so undoing that save owes the
    // reader the status it had as well as the values.
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    expect(rowStatus('birch-208.pdf')).toBe('Ready');
    await user.click(screen.getByRole('button', { name: 'birch-208.pdf' }));
    const supplier = screen.getByRole('textbox', { name: 'Supplier' });
    await user.clear(supplier); await user.type(supplier, 'Birch Joinery');
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo last save' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Birch Workshop');
    await backToList(user);
    expect(rowStatus('birch-208.pdf')).toBe('Ready');
  });
  it('keeps the undo snapshot when a second save changes nothing', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('button', { name: 'birch-208.pdf' }));
    await user.type(screen.getByRole('textbox', { name: 'Supplier' }), ' Ltd');
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    await user.click(screen.getByRole('button', { name: 'Undo last save' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Birch Workshop');
    await backToList(user);
    expect(rowStatus('birch-208.pdf')).toBe('Ready');
  });
  it('undoes unsaved edits and validates required fields and positive totals', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="editing" />);
    await user.click(screen.getByRole('button', { name: 'Discard edits' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Studio');
    await user.clear(screen.getByRole('textbox', { name: 'Supplier' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'Total (EUR)' }));
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Total (EUR)' })).toHaveAttribute('aria-invalid', 'true');
    expect(summaryAlert()).toHaveTextContent('Check the highlighted fields');
  });
  it('withdraws the saved line when the next save is rejected', async () => {
    /* A save line is the one thing a reviewer trusts; it may not report a save that failed.
     * With the status badge gone, the standing edits show in the action the row offers:
     * Discard edits, not Undo last save. */
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('button', { name: 'cedar-1042.pdf' }));
    await user.type(screen.getByRole('textbox', { name: 'Supplier' }), ' Ltd');
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo last save' })).toBeEnabled();
    await user.clear(screen.getByRole('textbox', { name: 'Supplier' }));
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    expect(screen.queryByText('Saved for this session.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard edits' })).toBeEnabled();
    expect(summaryAlert()).toHaveTextContent('Check the highlighted fields');
  });
  it('leaves the review screen without a per-field provenance tier or a status badge', () => {
    /* Artur refused all five in round r32: the accent bar over every field, the "As parsed"
     * sub-line under every value, the sentence explaining the bar, the "Needs review" badge
     * and Undo drawn as a text link. The fields carry labels, values and errors only, and
     * the record's status is written once, in the list. */
    const { container } = render(<InvoiceFlow initialState="review" />);
    expect(container.querySelector('.invoice-flow__field')).toBeNull();
    expect(container.querySelector('[data-parsed]')).toBeNull();
    expect(screen.queryByText('As parsed')).not.toBeInTheDocument();
    expect(screen.queryByText(/accent bar/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo last save' })).toHaveClass('ui-btn--secondary');
    // The kit's hint slot is what carried "As parsed"; no field may reclaim it.
    expect(container.querySelectorAll('.ui-field__hint')).toHaveLength(0);
  });

  /* The other half of that removal, held in the sheet rather than the markup. The bars were
   * accent LINES, which is the one thing the kit's shared accent judgement forbids, and no
   * gate reached this file to say so. This is that gate, and it also holds the accent that
   * replaced them: ink on the saved pane's own name, which is where
   * guidelines/density-and-accents.md#follow-the-consequence puts the accent of a pair that
   * shows a source beside the values a save writes. */
  it('paints the accent as ink on the saved pane\u2019s name, never as a line', () => {
    expect(SHEET, 'the showcase ships a sheet beside the story').toContain('.invoice-flow');
    /* One accent line is allowed, and only one: the drop box while a file is over it. The
     * kit draws its own drop target the same way — `.ui-drop__target` in
     * src/styles/file-drop.css and `.ui-file.is-dragging` in Field.css both take a dashed
     * or solid accent edge — so echoing it is the kit's pattern, not an offence. Naming it
     * here is what stops a second line hiding behind the exception. */
    expect(accentLines(SHEET), 'the drag state is the only line drawn from the accent')
      .toEqual([{ property: 'border-color', value: 'var(--accent)' }]);
    expect(SHEET).toMatch(/\.invoice-flow__drop\.is-dragging\s*\{\s*border-color:\s*var\(--accent\)/);
    const withoutDragState = SHEET.replace(/\.invoice-flow__drop\.is-dragging\s*\{[^}]*\}/g, '');
    expect(accentOffences(withoutDragState, 'InvoiceFlow.css')).toEqual([]);
    // The saved pane leads and is the wider column; the source gets neither, nor the accent.
    expect(SHEET).toMatch(/\.invoice-flow__data\s*>\s*\.ui-card__title\s*\{[^}]*color:\s*var\(--accent\)/);
    expect(SHEET).not.toMatch(/\.invoice-flow__preview[^{]*\{[^}]*var\(--accent/);
    expect(SHEET).toMatch(/grid-template-columns:\s*minmax\(0, 3fr\) minmax\(0, 2fr\)/);
  });
  it('shows a document that can disagree with the parsed data', () => {
    // The whole point of the two columns: the preview is the document, not the form again.
    render(<InvoiceFlow initialState="review" />);
    const paper = screen.getByRole('article');
    expect(within(paper).getByText('Total due')).toBeInTheDocument();
    expect(within(paper).getByText('€1,704.00')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Total (EUR)' })).toHaveValue(1740);
    expect(within(paper).queryByText('€1,740.00')).not.toBeInTheDocument();
  });
  it('keeps drafts separate between invoices', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="editing" />);
    await user.click(screen.getByRole('link', { name: 'Back to Invoices' }));
    await user.click(screen.getByRole('button', { name: 'birch-208.pdf' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Birch Workshop');
  });
  it('announces simulated parsing, then makes the data editable', async () => {
    render(<InvoiceFlow initialState="uploading" simulate />);
    expect(screen.getByRole('region', { name: 'Invoice data' })).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(screen.getByText('Reading invoice…')).toBeInTheDocument(), { timeout: 2500 });
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Supplier' })).toBeInTheDocument(), { timeout: 2500 });
  });
  it('shows the document while the data is still being read', () => {
    // The loading state is only honest if the right column has something the left has not.
    render(<InvoiceFlow initialState="parsing" />);
    expect(screen.getByText('Reading invoice…')).toBeInTheDocument();
    expect(within(screen.getByRole('article')).getByText('Cedar Studio')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Supplier' })).not.toBeInTheDocument();
  });
});
