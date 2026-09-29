import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceFlow } from './InvoiceFlow';

// Interaction tests cover in-memory state, not PDF rendering or real extraction.
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
    await user.click(screen.getByRole('button', { name: 'Undo changes' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Studio');
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });
  it('undoes unsaved edits and validates required fields and positive totals', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="editing" />);
    await user.click(screen.getByRole('button', { name: 'Undo changes' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Studio');
    await user.clear(screen.getByRole('textbox', { name: 'Supplier' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'Total (EUR)' }));
    await user.click(screen.getByRole('button', { name: 'Save invoice' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Total (EUR)' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Check the highlighted fields');
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
});
