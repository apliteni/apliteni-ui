import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceFlow } from './InvoiceFlow';

// Interaction tests cover in-memory state, not PDF rendering or real extraction.

/* The form's own summary, named by its text rather than by role. Each invalid field
 * carries its own `role="alert"` too (#388), so a rejected save leaves several alerts
 * on the page and the role alone no longer picks one out. */
const summaryAlert = () => {
  const summary = screen.getByText(/Check the highlighted fields/);
  expect(summary).toHaveAttribute('role', 'alert');
  return summary;
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
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    expect(within(screen.getByRole('article')).getByText('Cedar Studio')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo last save' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Studio');
    expect(screen.getByText('Needs review')).toBeInTheDocument();
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
  it('withdraws Saved and Ready when the next save is rejected', async () => {
    // The status line is the one thing a reviewer trusts; it may not report a save that failed.
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('button', { name: 'cedar-1042.pdf' }));
    await user.type(screen.getByRole('textbox', { name: 'Supplier' }), ' Ltd');
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Supplier' }));
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    expect(screen.queryByText('Saved for this session.')).not.toBeInTheDocument();
    expect(screen.queryByText('Ready')).not.toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(summaryAlert()).toHaveTextContent('Check the highlighted fields');
  });
  it('marks every field the parser filled and clears the mark on the one edited', async () => {
    const user = userEvent.setup();
    const { container } = render(<InvoiceFlow initialState="review" />);
    const marks = () => [...container.querySelectorAll('.invoice-flow__field')].map(node => node.hasAttribute('data-parsed'));
    expect(marks()).toEqual([true, true, true, true]);
    await user.type(screen.getByRole('textbox', { name: 'Supplier' }), ' Ltd');
    expect(marks()).toEqual([false, true, true, true]);
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
