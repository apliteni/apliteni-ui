import { useEffect, useRef, useState } from 'react';
import { AppShell } from '../AppShell';
import { DataTable } from '../DataTable';
import { EmptyState } from '../EmptyState';
import { TextField } from '../Field';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import './InvoiceFlow.css';

type Status = 'Uploading' | 'Parsing' | 'Needs review' | 'Ready';
type Fields = { supplier: string; reference: string; date: string; total: string };
type Invoice = { name: string; filename: string; status: Status; fields: Fields; original: Fields; previous?: Fields; file?: File };
export type InvoiceState = 'empty' | 'table' | 'uploading' | 'parsing' | 'review' | 'editing' | 'ready' | 'error';
const sampleFields: Fields = { supplier: 'Cedar Studio', reference: 'INV-1042', date: '2026-09-18', total: '1240.00' };
const samples = (): Invoice[] => [
  { name: 'cedar', filename: 'cedar-1042.pdf', status: 'Needs review', fields: { ...sampleFields }, original: { ...sampleFields } },
  { name: 'birch', filename: 'birch-208.pdf', status: 'Ready', fields: { supplier: 'Birch Workshop', reference: 'INV-208', date: '2026-09-19', total: '680.00' }, original: { supplier: 'Birch Workshop', reference: 'INV-208', date: '2026-09-19', total: '680.00' } },
  { name: 'maple', filename: 'maple-315.pdf', status: 'Parsing', fields: { ...sampleFields }, original: { ...sampleFields } },
  { name: 'elm', filename: 'elm-116.pdf', status: 'Uploading', fields: { ...sampleFields }, original: { ...sampleFields } },
];
const statusIcon = (status: Status) => status === 'Ready' ? 'circleCheck' : status === 'Needs review' ? 'circleAlert' : 'clock';
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const money = (value: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(Number(value));

// Showcase state stays in memory; uploads and extraction never leave the browser.
export function InvoiceFlow({ initialState = 'empty', simulate = false }: { initialState?: InvoiceState; simulate?: boolean }) {
  const detail = ['uploading', 'parsing', 'review', 'editing', 'ready'].includes(initialState);
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    if (initialState === 'empty' || initialState === 'error') return [];
    const rows = samples();
    if (initialState === 'uploading') rows[0].status = 'Uploading';
    if (initialState === 'parsing') rows[0].status = 'Parsing';
    if (initialState === 'ready') rows[0].status = 'Ready';
    return rows;
  });
  const [selected, setSelected] = useState<string | null>(typeof window !== 'undefined' && window.location.hash === '#invoices' ? null : detail ? 'cedar' : null);
  const [drafts, setDrafts] = useState<Record<string, Fields>>(initialState === 'editing' ? { cedar: { ...sampleFields, supplier: 'Cedar Design Studio' } } : {});
  const [error, setError] = useState(initialState === 'error' ? 'Choose PDF, PNG or JPEG files. No files were added.' : '');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  const mounted = useRef(false);
  const [navigated, setNavigated] = useState(false);
  const invoice = invoices.find(row => row.name === selected);
  const draft = invoice ? drafts[invoice.name] ?? invoice.fields : sampleFields;
  const dirty = !!invoice && JSON.stringify(draft) !== JSON.stringify(invoice.fields);
  const pending = invoice?.status === 'Uploading' || invoice?.status === 'Parsing';
  const [preview, setPreview] = useState<string>();

  useEffect(() => {
    if (!invoice?.file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(invoice.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [invoice?.file]);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const heading = root.current?.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  }, [selected]);
  useEffect(() => {
    if (!simulate || !invoices.some(row => row.status === 'Uploading' || row.status === 'Parsing')) return;
    const timer = setTimeout(() => setInvoices(rows => rows.map(row => ({ ...row, status: row.status === 'Uploading' ? 'Parsing' : row.status === 'Parsing' ? 'Needs review' : row.status }))), 1800);
    return () => clearTimeout(timer);
  }, [invoices, simulate]);

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    if (files.some(file => !/\.(pdf|png|jpe?g)$/i.test(file.name))) {
      setError('Choose PDF, PNG or JPEG files. No files were added.'); return;
    }
    const added = files.map(file => ({ name: `upload-${++sequence.current}`, filename: file.name, file, status: 'Uploading' as Status, fields: { ...sampleFields }, original: { ...sampleFields } }));
    setNavigated(true); setInvoices(rows => [...rows, ...added]); setSelected(null); setError('');
    setMessage(`${files.length} ${files.length === 1 ? 'invoice added' : 'invoices added'}. Upload and parsing are simulated.`);
  };
  const open = (name: string) => { setNavigated(true); setSelected(name); setInvalid(false); setMessage(''); };
  const save = () => {
    if (!invoice) return;
    if (!draft.supplier.trim() || !draft.reference.trim() || !validDate(draft.date) || !Number.isFinite(Number(draft.total)) || Number(draft.total) <= 0) { setInvalid(true); return; }
    setInvoices(rows => rows.map(row => row.name === invoice.name ? { ...row, previous: row.fields, fields: { ...draft }, status: 'Ready' } : row));
    setInvalid(false); setMessage('Saved for this session.');
  };
  const undo = () => {
    if (!invoice) return;
    const restored = dirty ? invoice.fields : invoice.previous ?? invoice.fields;
    setDrafts(values => ({ ...values, [invoice.name]: { ...restored } }));
    if (!dirty && invoice.previous) setInvoices(rows => rows.map(row => row.name === invoice.name ? { ...row, fields: { ...restored }, previous: undefined, status: 'Needs review' } : row));
    setInvalid(false); setMessage('Changes undone.');
  };
  const status = (value: Status) => <span className="invoice-flow__status"><Icon name={statusIcon(value)} />{value}</span>;

  return <div className={`invoice-flow${navigated ? ' invoice-flow--navigated' : ''}`} ref={root} onClick={event => {
    const link = (event.target as HTMLElement).closest('a[href="#invoices"]');
    if (link) { event.preventDefault(); setNavigated(true); setSelected(null); setMessage(''); }
  }}>
    <AppShell word="Invoices" brandHref="#invoices" sections={[{ href: '#invoices', label: 'Invoices', icon: 'doc' }]}
      renderLink={(section, props) => <a {...props} aria-current={selected ? 'true' : 'page'} />}
      pathname="#invoices" title={invoice ? invoice.filename : 'Invoices'} width="wide"
      back={invoice ? { href: '#invoices', label: 'Invoices' } : undefined}
      account={{ name: 'Demo reviewer', email: 'demo@example.com' }} onSignOut={() => setMessage('This prototype has no account to sign out of.')}
      palette={{ groups: [{ label: 'Invoices', items: invoices.filter(row => row.name !== selected).map(row => ({ id: row.name, label: row.filename })) }], onSelect: item => open(item.id) }}>
      <p className="invoice-flow__note">Prototype · Parsing uses sample data. Files and edits stay in this tab until reload.</p>
      <p className="invoice-flow__announcement" role="status">{message}</p>
      {invoice ? <>
        <div className="invoice-flow__summary" role="status">{status(invoice.status)}<span>{dirty ? 'Unsaved changes' : 'EUR'}</span></div>
        <div className="invoice-flow__columns">
          <section className="invoice-flow__data" data-live={simulate || undefined} aria-labelledby="parsed-title" aria-busy={pending || undefined}>
            <h2 id="parsed-title">Invoice data</h2>
            {pending ? <EmptyState icon="clock" title={invoice.status === 'Uploading' ? 'Adding invoice…' : 'Reading invoice…'} sub="The sample fields will appear here when parsing finishes."
              actions={!simulate && <Button onClick={() => setInvoices(rows => rows.map(row => row.name === invoice.name ? { ...row, status: 'Needs review' } : row))}>Finish demo parsing</Button>} /> : <form noValidate onSubmit={event => { event.preventDefault(); save(); }}>
              <p>Check the fields against the document, then save.</p>
              <div className="invoice-flow__fields">
                <TextField label="Supplier" required value={draft.supplier} error={invalid && !draft.supplier.trim() ? 'Enter the supplier.' : undefined} onChange={event => setDrafts(values => ({ ...values, [invoice.name]: { ...draft, supplier: event.target.value } }))} />
                <TextField label="Invoice number" required value={draft.reference} error={invalid && !draft.reference.trim() ? 'Enter the invoice number.' : undefined} onChange={event => setDrafts(values => ({ ...values, [invoice.name]: { ...draft, reference: event.target.value } }))} />
                <TextField label="Invoice date" required hint="YYYY-MM-DD" value={draft.date} error={invalid && !validDate(draft.date) ? 'Enter a valid date as YYYY-MM-DD.' : undefined} onChange={event => setDrafts(values => ({ ...values, [invoice.name]: { ...draft, date: event.target.value } }))} />
                <TextField label="Total (EUR)" required type="number" min="0.01" step="0.01" value={draft.total} error={invalid && (!Number.isFinite(Number(draft.total)) || Number(draft.total) <= 0) ? 'Enter an amount greater than zero.' : undefined} onChange={event => setDrafts(values => ({ ...values, [invoice.name]: { ...draft, total: event.target.value } }))} />
              </div>
              {invalid && <p role="alert">Check the highlighted fields before saving.</p>}
              <div className="invoice-flow__actions"><Button variant="primary" type="submit">Save invoice</Button><Button variant="ghost" disabled={!dirty && !invoice.previous} onClick={undo}>Undo changes</Button></div>
            </form>}
          </section>
          <section className="invoice-flow__preview" aria-labelledby="document-title">
            <h2 id="document-title">Document preview</h2>
            {preview ? invoice.file?.type.startsWith('image/') ? <img src={preview} alt={`Original invoice: ${invoice.filename}`} /> : <iframe src={preview} title={`Original invoice: ${invoice.filename}`} /> : <article className="invoice-flow__paper" aria-label="Sample invoice document">
              <h3>{invoice.original.supplier}</h3><p>Invoice {invoice.original.reference}</p>
              <dl><div><dt>Issued</dt><dd>{invoice.original.date}</dd></div><div><dt>Bill to</dt><dd>Example Company</dd></div></dl>
              <p>Design services</p><dl><div><dt>Total due</dt><dd>{money(invoice.original.total)}</dd></div></dl>
              <p>Sample document</p>
            </article>}
          </section>
        </div>
      </> : <>
        {!!invoices.length && <div className="invoice-flow__actions"><Button variant="primary" icon="plus" onClick={() => input.current?.click()}>Add invoices</Button><span>{invoices.length} invoices</span></div>}
        <input ref={input} className="ui-sr" tabIndex={-1} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" aria-label="Select invoices" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        <div className={`invoice-flow__drop${dragging ? ' is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}>
          {!invoices.length ? <EmptyState icon="upload" title="Add your first invoices" sub="Drop PDF, PNG or JPEG files here, or click to select several at once." actions={<><Button variant="primary" onClick={() => input.current?.click()}>Select invoices</Button><Button variant="ghost" onClick={() => { setNavigated(true); setInvoices(samples()); setError(''); }}>Try sample invoices</Button></>} /> : <p>Drop more invoices here, or use Add invoices.</p>}
        </div>
        {error && <p role="alert" className="invoice-flow__error"><Icon name="circleAlert" />{error}</p>}
        {!!invoices.length && <DataTable selectable={false} pager={false} stickyHeader pinnedIdentity scrollLabel="Invoices" rows={invoices} columns={[
          { key: 'filename', label: 'Invoice', render: row => <Button variant="ghost" onClick={() => open(row.name)}>{row.filename}</Button> },
          { key: 'status', label: 'Status', render: row => status(row.status) },
          { key: 'fields', label: 'Total (EUR)', num: true, render: row => row.status === 'Uploading' || row.status === 'Parsing' ? '—' : money(row.fields.total) },
        ]} />}
      </>}
    </AppShell>
  </div>;
}
