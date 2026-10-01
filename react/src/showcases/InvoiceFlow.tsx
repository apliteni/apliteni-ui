import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppShell } from '../AppShell';
import { DataTable } from '../DataTable';
import { EmptyState } from '../EmptyState';
import { TextField } from '../Field';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import './InvoiceFlow.css';

type Status = 'Uploading' | 'Parsing' | 'Needs review' | 'Ready';
type Fields = { supplier: string; reference: string; date: string; total: string };
type Line = { description: string; quantity: string; amount: string };
/* The document, held apart from the fields the parser produced from it. Two separate
   objects on purpose: a preview built from `fields` can never disagree with the form
   beside it, and disagreeing is the only thing the comparison is for. */
type Paper = { supplier: string; address: string; reference: string; issued: string; due: string; lines: Line[]; subtotal: string; vat: string; total: string };
type Invoice = { name: string; filename: string; status: Status; fields: Fields; original: Fields; paper?: Paper; previous?: Fields; file?: File };
export type InvoiceState = 'empty' | 'table' | 'uploading' | 'parsing' | 'review' | 'editing' | 'ready' | 'error';

const BILL_TO = 'Example Company, 5 Quay Road, Riverton';
const TERMS = 'Payment due within 14 days. Quote the invoice number with payment.';
const line = (description: string, quantity: string, amount: string): Line => ({ description, quantity, amount });
/* Fabricated demo invoices. cedar's document totals 1,704.00 while its parsed total reads
   1,740.00 — a transposition of the kind extraction makes, left in so that checking the
   data against the document has something to find. The other three agree. */
const SAMPLES: { name: string; filename: string; status: Status; parsed: Fields; paper: Paper }[] = [
  {
    name: 'cedar', filename: 'cedar-1042.pdf', status: 'Needs review',
    parsed: { supplier: 'Cedar Studio', reference: 'INV-1042', date: '2026-09-18', total: '1740.00' },
    paper: {
      supplier: 'Cedar Studio', address: '14 Alder Lane, Riverton', reference: 'INV-1042',
      issued: '18 September 2026', due: '2 October 2026',
      lines: [line('Brand identity refresh', '1', '980.00'), line('Print artwork, per sheet', '4', '440.00')],
      subtotal: '1420.00', vat: '284.00', total: '1704.00',
    },
  },
  {
    name: 'birch', filename: 'birch-208.pdf', status: 'Ready',
    parsed: { supplier: 'Birch Workshop', reference: 'INV-208', date: '2026-09-19', total: '816.00' },
    paper: {
      supplier: 'Birch Workshop', address: '3 Kiln Row, Riverton', reference: 'INV-208',
      issued: '19 September 2026', due: '3 October 2026',
      lines: [line('Facilitated workshop day', '2', '680.00')],
      subtotal: '680.00', vat: '136.00', total: '816.00',
    },
  },
  {
    name: 'maple', filename: 'maple-315.pdf', status: 'Parsing',
    parsed: { supplier: 'Maple Press', reference: 'INV-315', date: '2026-09-22', total: '378.00' },
    paper: {
      supplier: 'Maple Press', address: '8 Foundry Yard, Riverton', reference: 'INV-315',
      issued: '22 September 2026', due: '6 October 2026',
      lines: [line('Poster print run, per 100', '3', '315.00')],
      subtotal: '315.00', vat: '63.00', total: '378.00',
    },
  },
  {
    name: 'elm', filename: 'elm-116.pdf', status: 'Uploading',
    parsed: { supplier: 'Elm Logistics', reference: 'INV-116', date: '2026-09-23', total: '139.68' },
    paper: {
      supplier: 'Elm Logistics', address: '21 Wharf Street, Riverton', reference: 'INV-116',
      issued: '23 September 2026', due: '7 October 2026',
      lines: [line('Courier collection', '8', '116.40')],
      subtotal: '116.40', vat: '23.28', total: '139.68',
    },
  },
];
const sampleFields: Fields = { ...SAMPLES[0].parsed };
const samples = (): Invoice[] => SAMPLES.map(({ parsed, ...rest }) => ({ ...rest, fields: { ...parsed }, original: { ...parsed } }));
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

  const pick = () => input.current?.click();
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
    if (!draft.supplier.trim() || !draft.reference.trim() || !validDate(draft.date) || !Number.isFinite(Number(draft.total)) || Number(draft.total) <= 0) {
      // A rejected save saved nothing, so the success line goes with it.
      setInvalid(true); setMessage(''); return;
    }
    setInvoices(rows => rows.map(row => row.name === invoice.name ? { ...row, previous: row.fields, fields: { ...draft }, status: 'Ready' } : row));
    setInvalid(false); setMessage('Saved for this session.');
  };
  const undo = () => {
    if (!invoice) return;
    const restored = dirty ? invoice.fields : invoice.previous ?? invoice.fields;
    setDrafts(values => ({ ...values, [invoice.name]: { ...restored } }));
    if (!dirty && invoice.previous) setInvoices(rows => rows.map(row => row.name === invoice.name ? { ...row, fields: { ...restored }, previous: undefined, status: 'Needs review' } : row));
    setInvalid(false); setMessage(dirty ? 'Edits discarded.' : 'Last save undone.');
  };
  const chip = (glyph: string, label: string) => <span className="invoice-flow__status"><Icon name={glyph} />{label}</span>;
  /* An accent bar marks a value the reader has not touched since extraction — the ones
     still to check against the document. Editing one clears it. */
  const asParsed = (key: keyof Fields) => !!invoice && draft[key] === invoice.original[key];
  const marked = (key: keyof Fields, control: ReactNode) => <div className="invoice-flow__field" data-parsed={asParsed(key) || undefined}>{control}</div>;
  const edit = (key: keyof Fields) => (event: { target: { value: string } }) => setDrafts(values => ({ ...values, [invoice!.name]: { ...draft, [key]: event.target.value } }));
  const provenance = (key: keyof Fields) => asParsed(key) ? 'As parsed' : 'Edited';

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
      <p className="invoice-flow__note">Parsing uses sample data. Files and edits stay in this tab until reload.</p>
      <p className="invoice-flow__announcement" role="status">{message}</p>
      {invoice ? <>
        <div className="invoice-flow__summary" role="status">{dirty || invalid ? chip('circleAlert', 'Unsaved changes') : chip(statusIcon(invoice.status), invoice.status)}</div>
        <div className="invoice-flow__columns">
          <section className="invoice-flow__data" data-live={simulate || undefined} aria-labelledby="parsed-title" aria-busy={pending || undefined}>
            <h2 id="parsed-title">Invoice data</h2>
            {pending ? <EmptyState icon="clock" title={invoice.status === 'Uploading' ? 'Adding invoice…' : 'Reading invoice…'} sub="The sample fields will appear here when parsing finishes."
              actions={!simulate && <Button onClick={() => setInvoices(rows => rows.map(row => row.name === invoice.name ? { ...row, status: 'Needs review' } : row))}>Finish demo parsing</Button>} /> : <form noValidate onSubmit={event => { event.preventDefault(); save(); }}>
              <p>An accent bar marks a value still exactly as the parser read it. Check each one against the document, then save.</p>
              <div className="invoice-flow__fields">
                {marked('supplier', <TextField label="Supplier" required value={draft.supplier} hint={provenance('supplier')} error={invalid && !draft.supplier.trim() ? 'Enter the supplier.' : undefined} onChange={edit('supplier')} />)}
                {marked('reference', <TextField label="Invoice number" required value={draft.reference} hint={provenance('reference')} error={invalid && !draft.reference.trim() ? 'Enter the invoice number.' : undefined} onChange={edit('reference')} />)}
                {marked('date', <TextField label="Invoice date" required hint={`${provenance('date')} · YYYY-MM-DD`} value={draft.date} error={invalid && !validDate(draft.date) ? 'Enter a valid date as YYYY-MM-DD.' : undefined} onChange={edit('date')} />)}
                {marked('total', <TextField label="Total (EUR)" required type="number" min="0.01" step="0.01" hint={provenance('total')} value={draft.total} error={invalid && (!Number.isFinite(Number(draft.total)) || Number(draft.total) <= 0) ? 'Enter an amount greater than zero.' : undefined} onChange={edit('total')} />)}
              </div>
              {invalid && <p role="alert">Check the highlighted fields before saving.</p>}
              <div className="invoice-flow__actions"><Button variant="primary" type="submit">Save invoice</Button><Button variant="ghost" disabled={!dirty && !invoice.previous} onClick={undo}>{dirty ? 'Discard edits' : 'Undo last save'}</Button></div>
            </form>}
          </section>
          <section className="invoice-flow__preview" aria-labelledby="document-title">
            <h2 id="document-title">Document</h2>
            {preview ? invoice.file?.type.startsWith('image/') ? <img src={preview} alt={`Invoice document: ${invoice.filename}`} /> : <iframe src={preview} title={`Invoice document: ${invoice.filename}`} />
              : invoice.paper ? <article className="invoice-flow__paper" aria-label={`Invoice document: ${invoice.filename}`}>
                <h3>{invoice.paper.supplier}</h3>
                <p className="invoice-flow__paper-line">{invoice.paper.address}</p>
                <p className="invoice-flow__paper-line">Invoice {invoice.paper.reference}</p>
                <dl>
                  <div><dt>Issued</dt><dd>{invoice.paper.issued}</dd></div>
                  <div><dt>Payment due</dt><dd>{invoice.paper.due}</dd></div>
                  <div><dt>Bill to</dt><dd>{BILL_TO}</dd></div>
                </dl>
                <table>
                  <thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">Amount</th></tr></thead>
                  <tbody>{invoice.paper.lines.map(row => <tr key={row.description}><td>{row.description}</td><td>{row.quantity}</td><td>{money(row.amount)}</td></tr>)}</tbody>
                </table>
                <dl className="invoice-flow__paper-sums">
                  <div><dt>Subtotal</dt><dd>{money(invoice.paper.subtotal)}</dd></div>
                  <div><dt>VAT (20%)</dt><dd>{money(invoice.paper.vat)}</dd></div>
                  <div><dt>Total due</dt><dd>{money(invoice.paper.total)}</dd></div>
                </dl>
                <p className="invoice-flow__paper-line">{TERMS}</p>
              </article>
                : <p>This prototype shows the file you added. Your browser offers no preview for {invoice.filename}.</p>}
          </section>
        </div>
      </> : <>
        {!!invoices.length && <div className="invoice-flow__actions"><Button variant="primary" icon="plus" onClick={pick}>Add invoices</Button><span>{invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}</span></div>}
        <input ref={input} className="ui-sr" tabIndex={-1} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" aria-label="Select invoices" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        {/* The box the copy calls clickable is the control: pointer, Enter and Space all open the
            picker, and it carries ui-focusable so the kit ring is the one that draws. */}
        <div className={`invoice-flow__drop ui-focusable${dragging ? ' is-dragging' : ''}`} role="button" tabIndex={0}
          onClick={pick}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(); } }}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
          onDrop={event => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}>
          {!invoices.length ? <EmptyState icon="upload" title="Add your first invoices" sub="Drop PDF, PNG or JPEG files anywhere in this box, or click it to select several at once." />
            : <p>Drop more invoices here, or click this box to select them.</p>}
        </div>
        {error && <p role="alert" className="invoice-flow__error"><Icon name="circleAlert" />{error}</p>}
        {!!invoices.length && <DataTable selectable={false} pager={false} stickyHeader pinnedIdentity scrollLabel="Invoices" rows={invoices} columns={[
          { key: 'filename', label: 'Invoice', render: row => <Button variant="ghost" onClick={() => open(row.name)}>{row.filename}</Button> },
          { key: 'status', label: 'Status', render: row => chip(statusIcon(row.status), row.status) },
          { key: 'fields', label: 'Total (EUR)', num: true, render: row => row.status === 'Uploading' || row.status === 'Parsing' ? '—' : money(row.fields.total) },
        ]} />}
      </>}
    </AppShell>
  </div>;
}
