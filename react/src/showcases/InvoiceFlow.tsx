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
type Line = { description: string; quantity: string; amount: string };
/* The document, held apart from the fields the parser produced from it. Two separate
   objects on purpose: a preview built from `fields` can never disagree with the form
   beside it, and disagreeing is the only thing the comparison is for. */
type Paper = { supplier: string; address: string; reference: string; issued: string; due: string; lines: Line[]; subtotal: string; vat: string; total: string };
/* `previous` is the whole record a save replaced, status included: restoring the fields
   alone put a Ready invoice back as Needs review. */
type Invoice = { name: string; filename: string; status: Status; fields: Fields; paper?: Paper; previous?: { fields: Fields; status: Status }; file?: File };
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
const samples = (): Invoice[] => SAMPLES.map(({ parsed, ...rest }) => ({ ...rest, fields: { ...parsed } }));
const statusIcon = (status: Status) => status === 'Ready' ? 'circleCheck' : status === 'Needs review' ? 'circleAlert' : 'clock';
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
/* The field declares min 0.01 and step 0.01, and the save path has to mean it: 0.001 is
   finite and above zero, which is all a "greater than zero" test asks, so it saved and
   then arrived in the list as Ready at EUR 0.00 — the list writes the amount to the cent.
   Cents are counted off the written digits rather than off amount * 100, whose error grows
   with the amount: that product is 7.000000000000001 for 0.07 and misses a whole cent by
   1.9e-9 for 131072.02, so a fixed tolerance is a guess about how large an invoice gets.
   Limit: an amount in exponent notation is refused rather than converted. */
const MIN_CENTS = 1;
const MIN_TOTAL = (MIN_CENTS / 100).toFixed(2);
/** The written amount as a whole number of cents, or null below the cent. */
const centsOf = (value: string) => {
  const written = /^(\d*)(?:\.(\d*))?$/.exec(value.trim());
  if (!written) return null;
  const [, whole, fraction = ''] = written;
  if (!whole && !fraction) return null;
  if (/[1-9]/.test(fraction.slice(2))) return null;
  return Number((whole || '0') + fraction.slice(0, 2).padEnd(2, '0'));
};
const validTotal = (value: string) => {
  const cents = centsOf(value);
  return cents !== null && cents >= MIN_CENTS;
};
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
  /* The control that opens the picker, in both states of the box. stopPropagation keeps the
     box's own click — a pointer shortcut, as dragging is — from opening the picker twice. */
  const picker = <Button variant="primary" onClick={event => { event.stopPropagation(); pick(); }}>Select files</Button>;
  const addFiles = (files: File[]) => {
    if (!files.length) return;
    if (files.some(file => !/\.(pdf|png|jpe?g)$/i.test(file.name))) {
      setError('Choose PDF, PNG or JPEG files. No files were added.'); return;
    }
    const added = files.map(file => ({ name: `upload-${++sequence.current}`, filename: file.name, file, status: 'Uploading' as Status, fields: { ...sampleFields } }));
    setNavigated(true); setInvoices(rows => [...rows, ...added]); setSelected(null); setError('');
    setMessage(`${files.length} ${files.length === 1 ? 'invoice added' : 'invoices added'}. Upload and parsing are simulated.`);
  };
  const open = (name: string) => { setNavigated(true); setSelected(name); setInvalid(false); setMessage(''); };
  const save = () => {
    if (!invoice) return;
    if (!draft.supplier.trim() || !draft.reference.trim() || !validDate(draft.date) || !validTotal(draft.total)) {
      // A rejected save saved nothing, so the success line goes with it.
      setInvalid(true); setMessage(''); return;
    }
    setInvoices(rows => rows.map(row => {
      if (row.name !== invoice.name) return row;
      // A save that changes nothing keeps the snapshot the previous one made, so pressing
      // Save twice does not erase what Undo would restore.
      const changes = JSON.stringify(draft) !== JSON.stringify(row.fields) || row.status !== 'Ready';
      return { ...row, previous: changes ? { fields: row.fields, status: row.status } : row.previous, fields: { ...draft }, status: 'Ready' };
    }));
    setInvalid(false); setMessage('Saved for this session.');
  };
  const undo = () => {
    if (!invoice) return;
    const restored = dirty ? invoice.fields : invoice.previous?.fields ?? invoice.fields;
    const status = invoice.previous?.status;
    setDrafts(values => ({ ...values, [invoice.name]: { ...restored } }));
    if (!dirty && status) setInvoices(rows => rows.map(row => row.name === invoice.name ? { ...row, fields: { ...restored }, previous: undefined, status } : row));
    setInvalid(false); setMessage(dirty ? 'Edits discarded.' : 'Last save undone.');
  };
  const chip = (glyph: string, label: string) => <span className="invoice-flow__status"><Icon name={glyph} />{label}</span>;
  /* The line speaks for the values on screen, so the edit that changes them is what withdraws
     it. Leaving it to the next save left "Saved for this session." standing over a changed
     form. The field errors are not touched: they belong to the save that was rejected. */
  const edit = (key: keyof Fields) => (event: { target: { value: string } }) => {
    setMessage('');
    setDrafts(values => ({ ...values, [invoice!.name]: { ...draft, [key]: event.target.value } }));
  };

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
        {/* Both panes wear the kit's card rather than calling <Card>: that component renders a
            plain div, and these two have to stay labelled regions — the data pane also goes
            aria-busy while the parser runs, which a div cannot say. The classes are the card's
            own, so the paint, the edge and the ring gap are the kit's.
            why: react/src/field-ground.test.tsx — a field is shown on a painted surface, never
            on the page ground, which in dark is what --table-bg resolves to. */}
        <div className="invoice-flow__columns">
          <section className="invoice-flow__data ui-card" data-live={simulate || undefined} aria-labelledby="parsed-title" aria-busy={pending || undefined}>
            <h2 id="parsed-title" className="ui-card__title">Invoice data</h2>
            {pending ? <EmptyState icon="clock" title={invoice.status === 'Uploading' ? 'Adding invoice…' : 'Reading invoice…'} sub="The sample fields will appear here when parsing finishes."
              actions={!simulate && <Button onClick={() => setInvoices(rows => rows.map(row => row.name === invoice.name ? { ...row, status: 'Needs review' } : row))}>Finish demo parsing</Button>} /> : <form noValidate onSubmit={event => { event.preventDefault(); save(); }}>
              <div className="invoice-flow__fields">
                <TextField label="Supplier" required value={draft.supplier} error={invalid && !draft.supplier.trim() ? 'Enter the supplier.' : undefined} onChange={edit('supplier')} />
                <TextField label="Invoice number" required value={draft.reference} error={invalid && !draft.reference.trim() ? 'Enter the invoice number.' : undefined} onChange={edit('reference')} />
                <TextField label="Invoice date" required value={draft.date} error={invalid && !validDate(draft.date) ? 'Enter a valid date as YYYY-MM-DD.' : undefined} onChange={edit('date')} />
                <TextField label="Total (EUR)" required type="number" min={MIN_TOTAL} step="0.01" value={draft.total} error={invalid && !validTotal(draft.total) ? `Enter an amount of ${MIN_TOTAL} or more, written to the cent.` : undefined} onChange={edit('total')} />
              </div>
              {invalid && <p role="alert" className="invoice-flow__summary">Check the highlighted fields before saving.</p>}
              <div className="invoice-flow__actions"><Button variant="primary" type="submit">Save invoice</Button><Button variant="secondary" disabled={!dirty && !invoice.previous} onClick={undo}>{dirty ? 'Discard edits' : 'Undo last save'}</Button></div>
            </form>}
          </section>
          <section className="invoice-flow__preview ui-card" aria-labelledby="document-title">
            <h2 id="document-title" className="ui-card__title">Document</h2>
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
        <input ref={input} className="ui-sr" tabIndex={-1} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" aria-label="Select invoices" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        {/* The box catches the drag and the button inside it opens the picker, which is how the
            kit's own FileDrop splits the two: a region that claims role="button" has
            presentational children, so conforming assistive technology drops the role of any
            button standing in it, and a focusable box beside that button is the same action
            twice in the tab order. The box keeps its paint, its drop handlers and its pointer
            click; the keyboard path is the button's.
            why: react/src/FileDrop.tsx, guidelines/file-drop.md#button-path */}
        <div className={`invoice-flow__drop${dragging ? ' is-dragging' : ''}`}
          onClick={pick}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
          onDrop={event => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}>
          {!invoices.length ? <EmptyState icon="upload" title="Add your first invoices" sub="PDF, PNG or JPEG." actions={picker} />
            : <div className="invoice-flow__drop-row">{picker}<p>PDF, PNG or JPEG.</p></div>}
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
