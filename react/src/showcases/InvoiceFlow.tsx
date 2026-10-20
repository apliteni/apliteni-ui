import { useEffect, useRef, useState } from 'react';
import { AppShell } from '../AppShell';
import { DataTable } from '../DataTable';
import { EmptyState } from '../EmptyState';
import { FileDrop } from '../FileDrop';
import { TextField } from '../Field';
import { DrawerSection, KeyValueList } from '../KeyValueList';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Callout } from '../primitives/Callout';
import { Toast, useToast } from '../Toast';
import './InvoiceFlow.css';

type Status = 'Uploading' | 'Parsing' | 'Needs review' | 'Ready';
type Fields = { supplier: string; reference: string; date: string; total: string };
type Line = { description: string; quantity: string; amount: string };
/* The document, held apart from the fields the parser produced from it. Two separate
   objects on purpose: a preview built from `fields` can never disagree with the form
   beside it, and disagreeing is the only thing the comparison is for. */
type Paper = { supplier: string; address: string; reference: string; issued: string; lines: Line[]; subtotal: string; vat: string; total: string };
type Invoice = { name: string; filename: string; status: Status; fields: Fields; paper?: Paper; file?: File };
export type InvoiceState = 'empty' | 'table' | 'uploading' | 'parsing' | 'review' | 'editing' | 'ready' | 'error';

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
      issued: '18 September 2026',
      lines: [line('Brand identity refresh', '1', '980.00'), line('Print artwork, per sheet', '4', '440.00')],
      subtotal: '1420.00', vat: '284.00', total: '1704.00',
    },
  },
  {
    name: 'birch', filename: 'birch-208.pdf', status: 'Ready',
    parsed: { supplier: 'Birch Workshop', reference: 'INV-208', date: '2026-09-19', total: '816.00' },
    paper: {
      supplier: 'Birch Workshop', address: '3 Kiln Row, Riverton', reference: 'INV-208',
      issued: '19 September 2026',
      lines: [line('Facilitated workshop day', '2', '680.00')],
      subtotal: '680.00', vat: '136.00', total: '816.00',
    },
  },
  {
    name: 'maple', filename: 'maple-315.pdf', status: 'Parsing',
    parsed: { supplier: 'Maple Press', reference: 'INV-315', date: '2026-09-22', total: '378.00' },
    paper: {
      supplier: 'Maple Press', address: '8 Foundry Yard, Riverton', reference: 'INV-315',
      issued: '22 September 2026',
      lines: [line('Poster print run, per 100', '3', '315.00')],
      subtotal: '315.00', vat: '63.00', total: '378.00',
    },
  },
  {
    name: 'elm', filename: 'elm-116.pdf', status: 'Uploading',
    parsed: { supplier: 'Elm Logistics', reference: 'INV-116', date: '2026-09-23', total: '139.68' },
    paper: {
      supplier: 'Elm Logistics', address: '21 Wharf Street, Riverton', reference: 'INV-116',
      issued: '23 September 2026',
      lines: [line('Courier collection', '8', '116.40')],
      subtotal: '116.40', vat: '23.28', total: '139.68',
    },
  },
];
const sampleFields: Fields = { ...SAMPLES[0].parsed };
const samples = (): Invoice[] => SAMPLES.map(({ parsed, ...rest }) => ({ ...rest, fields: { ...parsed } }));
/* The kit's own DataTable story writes a record's state as a <Badge> in the Status column, so
   that is what carries it here. The two in-flight states share the neutral chip: nothing is
   being asked of the reader while a file uploads or parses, and the tone carries no signal
   hue for that reason — it is still a chip, which is what #459 fixed in the kit.
   why: react/src/DataTable.stories.tsx, src/styles/badge.css */
const TONE: Record<Status, string> = { Uploading: 'neutral', Parsing: 'neutral', 'Needs review': 'pending', Ready: 'success' };
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
/* The drag logic of the list page's drop layer. A file dragged over the window shows the layer,
   and a file dropped anywhere is added. Behaviour only: the layer's paint is the kit's
   `ui-drop--page`. Text and links carry no file, so they show nothing. `enabled` is false on a
   record, where there is nothing to add to. Escape ends it too, because the browser sends the
   page no event when a drag is cancelled that way. */
function useWindowFileDrag(enabled: boolean, onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  const take = useRef(onFiles);
  take.current = onFiles;
  useEffect(() => {
    if (!enabled) { setOver(false); return; }
    const carriesFiles = (event: DragEvent) => !!event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files');
    const aim = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      // preventDefault() is how the page says "drop here"; without it the browser opens the file.
      event.preventDefault();
      setOver(true);
    };
    // Leaving the window reports no element entered; moving between elements does.
    const leave = (event: DragEvent) => { if (event.relatedTarget === null) setOver(false); };
    const drop = (event: DragEvent) => {
      setOver(false);
      if (event.defaultPrevented || !carriesFiles(event)) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer!.files);
      if (files.length) take.current(files);
    };
    const end = () => setOver(false);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOver(false); };
    window.addEventListener('dragenter', aim);
    window.addEventListener('dragover', aim);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    window.addEventListener('dragend', end);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('dragenter', aim);
      window.removeEventListener('dragover', aim);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
      window.removeEventListener('dragend', end);
      window.removeEventListener('keydown', escape);
    };
  }, [enabled]);
  return enabled && over;
}

const money = (value: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(Number(value));

// Showcase state stays in memory; uploads and extraction never leave the browser.
export function InvoiceFlow(props: { initialState?: InvoiceState; simulate?: boolean }) {
  return <Toast><InvoiceScreen {...props} /></Toast>;
}

function InvoiceScreen({ initialState = 'empty', simulate = false }: { initialState?: InvoiceState; simulate?: boolean }) {
  const toast = useToast();
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
  const [error, setError] = useState(initialState === 'error' ? 'Unsupported file type. No files were added.' : '');
  const [message, setMessage] = useState('');
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
  const dropping = useWindowFileDrag(!invoice && invoices.length > 0, files => addFiles(files));
  /* The live region speaks for what is not on screen as text: a pane that is still loading
     and the effect of an action whose result is already visible. It is read, not seen, so it
     holds no space and nothing under it moves. */
  const status = message || (invoice && pending ? `${invoice.status === 'Uploading' ? 'Adding' : 'Reading'} invoice ${invoice.filename}.` : '');

  useEffect(() => {
    if (!invoice?.file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(invoice.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [invoice?.file]);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const heading = root.current?.querySelector('h1');
    /* The screen changed without a page load, so the new title is what a reader is sent to.
       `ui-focusable` is the kit's own ring class, and it draws on :focus-visible only — so a
       pointer-driven arrival shows nothing and a keyboard-driven one shows the kit ring,
       instead of the sheet suppressing the outline for both.
       why: src/styles/base.css, guidelines/state-set.md#focus-rings */
    heading?.setAttribute('tabindex', '-1');
    heading?.classList.add('ui-focusable');
    heading?.focus();
  }, [selected]);
  useEffect(() => {
    if (!simulate || !invoices.some(row => row.status === 'Uploading' || row.status === 'Parsing')) return;
    const timer = setTimeout(() => setInvoices(rows => rows.map(row => ({ ...row, status: row.status === 'Uploading' ? 'Parsing' : row.status === 'Parsing' ? 'Needs review' : row.status }))), 1800);
    return () => clearTimeout(timer);
  }, [invoices, simulate]);

  /* The list page's control that opens the picker. The keyboard path to adding files:
     a drag over the page is only the pointer's shortcut to the same thing. */
  const picker = <Button variant="secondary" size="sm" icon="upload" onClick={() => input.current?.click()}>Upload</Button>;
  const addFiles = (files: File[]) => {
    if (!files.length) return;
    if (files.some(file => !/\.(pdf|png|jpe?g)$/i.test(file.name))) {
      setError('Unsupported file type. No files were added.'); return;
    }
    const added = files.map(file => ({ name: `upload-${++sequence.current}`, filename: file.name, file, status: 'Uploading' as Status, fields: { ...sampleFields } }));
    setNavigated(true); setInvoices(rows => [...rows, ...added]); setSelected(null); setError('');
    setMessage(`${files.length} ${files.length === 1 ? 'invoice added' : 'invoices added'}.`);
  };
  const open = (name: string) => { setNavigated(true); setSelected(name); setInvalid(false); setMessage(''); };
  const save = () => {
    if (!invoice) return;
    if (!draft.supplier.trim() || !draft.reference.trim() || !validDate(draft.date) || !validTotal(draft.total)) {
      // A rejected save saved nothing, so the success line goes with it.
      setInvalid(true); setMessage(''); return;
    }
    const saved = { ...draft };
    setInvoices(rows => rows.map(row => row.name === invoice.name ? { ...row, fields: saved, status: 'Ready' } : row));
    setInvalid(false); setMessage('');
    /* What happened goes in a toast, which floats over the page: a line in the flow moved the
       form under the pointer that pressed Save. The toast reads its own text aloud. A save is
       not destructive, so the toast offers no action. */
    toast({ title: 'Saved' });
  };
  const discard = () => {
    if (!invoice) return;
    setDrafts(values => ({ ...values, [invoice.name]: { ...invoice.fields } }));
    setInvalid(false); setMessage('Edits discarded.');
  };
  /* The line speaks for the values on screen, so the edit that changes them is what withdraws
     it. Leaving it to the next save left "Saved." standing over a changed
     form. The field errors are not touched: they belong to the save that was rejected. */
  const edit = (key: keyof Fields) => (event: { target: { value: string } }) => {
    setMessage('');
    setDrafts(values => ({ ...values, [invoice!.name]: { ...draft, [key]: event.target.value } }));
  };

  /* One handler for every in-page link on the screen: the shell's brand, its rail link and
     its back link all point at #invoices, and the list writes each record as a link too. A
     href this prototype does not own is left to the browser. */
  return <div className="invoice-flow" ref={root} onClick={event => {
    const href = (event.target as HTMLElement).closest('a[href^="#"]')?.getAttribute('href')?.slice(1);
    if (href === undefined) return;
    if (href === 'invoices') { event.preventDefault(); setNavigated(true); setSelected(null); setMessage(''); return; }
    if (invoices.some(row => row.name === href)) { event.preventDefault(); open(href); }
  }}>
    <AppShell word="Invoices" brandHref="#invoices" sections={[{ href: '#invoices', label: 'Invoices', icon: 'doc' }]}
      renderLink={(section, props) => <a {...props} aria-current={selected ? 'true' : 'page'} />}
      pathname="#invoices" title={invoice ? invoice.filename : 'Invoices'} width="wide"
      back={invoice ? { href: '#invoices', label: 'Invoices' } : undefined}
      account={{ name: 'Demo reviewer', email: 'demo@example.com' }} onSignOut={() => {}}
      palette={{ groups: [{ label: 'Invoices', items: invoices.filter(row => row.name !== selected).map(row => ({ id: row.name, label: row.filename })) }], onSelect: item => open(item.id) }}>
      <p className="ui-sr" role="status">{status}</p>
      {invoice ? <>
        {/* Both panes wear the kit's card rather than calling <Card>: that component renders a
            plain div, and these two have to stay labelled regions — the data pane also goes
            aria-busy while the parser runs, which a div cannot say. The classes are the card's
            own, so the paint, the edge and the ring gap are all the kit's and this sheet
            declares none of them.
            why: react/src/field-ground.test.tsx — a field is shown on a painted surface,
            never on the page ground. */}
        <div className={`invoice-flow__columns${navigated ? ' m-slide-up' : ''}`}>
          <section className="invoice-flow__data ui-card" aria-labelledby="parsed-title" aria-busy={pending || undefined}>
            <h2 id="parsed-title" className="ui-card__title">Invoice data</h2>
            {/* sub="" because an absent sub falls back to the preset's sentence, which says new
                items will appear when they need attention — not true of a file being read. */}
            {pending ? <EmptyState icon="clock" title={invoice.status === 'Uploading' ? 'Adding invoice…' : 'Reading invoice…'} sub="" /> : <form className={simulate ? 'm-slide-up' : undefined} noValidate onSubmit={event => { event.preventDefault(); save(); }}>
              <div className="invoice-flow__fields">
                <TextField label="Supplier" required value={draft.supplier} error={invalid && !draft.supplier.trim() ? 'Enter the supplier.' : undefined} onChange={edit('supplier')} />
                <TextField label="Invoice number" required value={draft.reference} error={invalid && !draft.reference.trim() ? 'Enter the invoice number.' : undefined} onChange={edit('reference')} />
                <TextField label="Invoice date" required value={draft.date} error={invalid && !validDate(draft.date) ? 'Enter a valid date as YYYY-MM-DD.' : undefined} onChange={edit('date')} />
                <TextField label="Total (EUR)" required type="number" min={MIN_TOTAL} step="0.01" value={draft.total} error={invalid && !validTotal(draft.total) ? `Enter an amount of ${MIN_TOTAL} or more, written to the cent.` : undefined} onChange={edit('total')} />
              </div>
              {invalid && <p role="alert" className="invoice-flow__summary">Check the highlighted fields before saving.</p>}
              <div className="invoice-flow__actions"><Button variant="primary" type="submit">Save</Button><Button variant="secondary" disabled={!dirty} onClick={discard}>Discard</Button></div>
            </form>}
          </section>
          <section className="invoice-flow__preview ui-card" aria-labelledby="document-title">
            <h2 id="document-title" className="ui-card__title ui-card__title--muted">Document</h2>
            {preview ? invoice.file?.type.startsWith('image/') ? <img src={preview} alt={`Invoice document: ${invoice.filename}`} /> : <iframe src={preview} title={`Invoice document: ${invoice.filename}`} />
              /* The reference, on kit parts: DrawerSection's heading rank, KeyValueList for
                 the header block, and .ui-table--dense for the lines — its <tfoot> draws the
                 totals rule this sheet used to draw itself. It carries only what the four
                 fields are checked against; the payment terms and the two rows no field
                 answers went at r37, which is also what stops it outweighing this pane.
                 why: react/src/DocumentReview.stories.tsx, #459 r36 */
              : invoice.paper ? <article className="ui-card-stack" aria-label={`Invoice document: ${invoice.filename}`}>
                <DrawerSection title={invoice.paper.supplier}>
                  <KeyValueList rows={[
                    { label: 'Address', value: invoice.paper.address },
                    { label: 'Invoice', value: invoice.paper.reference },
                    { label: 'Issued', value: invoice.paper.issued },
                  ]} />
                </DrawerSection>
                <table className="ui-table ui-table--dense">
                  <thead><tr><th scope="col">Description</th><th scope="col" className="ui-table__num">Qty</th><th scope="col" className="ui-table__num">Amount</th></tr></thead>
                  <tbody>{invoice.paper.lines.map(row => <tr key={row.description}>
                    <td>{row.description}</td>
                    <td className="ui-table__num">{row.quantity}</td>
                    <td className="ui-table__num">{money(row.amount)}</td>
                  </tr>)}</tbody>
                  <tfoot>
                    <tr><th scope="row" colSpan={2}>Subtotal</th><td className="ui-table__num">{money(invoice.paper.subtotal)}</td></tr>
                    <tr><th scope="row" colSpan={2}>VAT (20%)</th><td className="ui-table__num">{money(invoice.paper.vat)}</td></tr>
                    <tr><th scope="row" colSpan={2}>Total due</th><td className="ui-table__num">{money(invoice.paper.total)}</td></tr>
                  </tfoot>
                </table>
              </article>
                : <p>No preview is available for {invoice.filename}.</p>}
          </section>
        </div>
      </> : <>
        {invoices.length ? <>
          <input ref={input} className="ui-sr" tabIndex={-1} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" aria-label="Select invoices" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
          <div className="ui-drop"><div className="ui-drop__row">{picker}<p className="ui-drop__note">PDF, PNG or JPEG.</p></div></div>
          {/* A file dragged anywhere over the list covers the page content with the empty page's drop
              area, enlarged. Its ground is opaque, so no row reads across the words. */}
          {dropping && <div className="ui-drop ui-drop--area ui-drop--page is-dragging" aria-hidden="true">
            <EmptyState icon="upload" title="Drop files to upload" sub="PDF, PNG or JPEG." />
          </div>}
        </> : <FileDrop title="Add your first invoices" note="PDF, PNG or JPEG." accept=".pdf,.png,.jpg,.jpeg" multiple onFiles={addFiles} />}
        {/* The kit's own inline message, which sets role="alert" for its danger tone and
            carries the glyph and the paint the kit gives a refusal. */}
        {error && <Callout variant="danger">{error}</Callout>}
        {/* The identity cell is a link, which is what the kit's own DataTable story puts
            there; a ghost button in it carried the control's inset and had to be pulled back
            by a negative margin to share the column's edge.
            why: react/src/DataTable.stories.tsx */}
        {!!invoices.length && <div className={navigated ? 'm-slide-up' : undefined}>
          <DataTable selectable={false} pager={false} stickyHeader pinnedIdentity scrollLabel="Invoices" rows={invoices} columns={[
            { key: 'filename', label: 'Invoice', render: row => <a href={`#${row.name}`}>{row.filename}</a> },
            { key: 'status', label: 'Status', render: row => <Badge variant={TONE[row.status]}>{row.status}</Badge> },
            { key: 'fields', label: 'Total (EUR)', num: true, render: row => row.status === 'Uploading' || row.status === 'Parsing' ? '—' : money(row.fields.total) },
          ]} />
        </div>}
      </>}
    </AppShell>
  </div>;
}
