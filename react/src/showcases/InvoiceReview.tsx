import { useEffect, useState, type ReactNode } from 'react';
import { AppShell } from '../AppShell';
import { Drawer } from '../Drawer';
import { TextField } from '../Field';
import { KeyValueList, type KeyValueRow } from '../KeyValueList';
import { Button } from '../primitives/Button';
import { Callout } from '../primitives/Callout';
import { Card } from '../primitives/Card';
import { CheckList, Checkbox } from '../Checkbox';
import './InvoiceReview.css';

/* The invoice review showcase: one uploaded invoice read against its document, with
   the four fields matched, the total checked, and the summary confirmed. The document
   sits beside the fields on a laptop and opens in a bottom sheet on a phone or tablet. #850 */

export type InvoiceReviewState = 'start' | 'unreadable' | 'supplier' | 'choose-supplier'
  | 'add-supplier' | 'supplier-added' | 'mismatch' | 'manual-total' | 'total-error'
  | 'matched' | 'edit' | 'edit-cancelled' | 'edit-saved' | 'document' | 'finish' | 'done';

const ALL_STATES: readonly string[] = ['start', 'unreadable', 'supplier', 'choose-supplier',
  'add-supplier', 'supplier-added', 'mismatch', 'manual-total', 'total-error', 'matched',
  'edit', 'edit-cancelled', 'edit-saved', 'document', 'finish', 'done'];

const TITLES: Record<InvoiceReviewState, string> = {
  start: 'Review the invoice', unreadable: 'Check the document', supplier: 'Match the supplier',
  'choose-supplier': 'Choose a supplier', 'add-supplier': 'Add a supplier', 'supplier-added': 'Match the supplier',
  mismatch: 'Check the total', 'manual-total': 'Edit the total', 'total-error': 'Edit the total',
  matched: 'Check the fields', edit: 'Edit the fields', 'edit-cancelled': 'Check the fields',
  'edit-saved': 'Check the fields', document: 'Check the total', finish: 'Confirm the invoice',
  done: 'Invoice confirmed',
};
const STEPS: Partial<Record<InvoiceReviewState, 'Supplier' | 'Total' | 'Finish'>> = {
  supplier: 'Supplier', 'choose-supplier': 'Supplier', 'add-supplier': 'Supplier', 'supplier-added': 'Supplier',
  mismatch: 'Total', 'manual-total': 'Total', 'total-error': 'Total', matched: 'Total', edit: 'Total',
  'edit-cancelled': 'Total', 'edit-saved': 'Total', document: 'Total', finish: 'Finish',
};

const SUPPLIERS = ['Cedar Studio', 'Cedar Works', 'Linden Office'];
const DOCUMENT = { number: 'INV-1042', issued: '18 Sep 2026', total: 'EUR 1,704.00' };
const money = (value: string) => `EUR ${Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateOf = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

type Invoice = { supplier: string; number: string; date: string; total: string };

/* The document is held apart from the fields: it is what the four fields are checked
   against, and its total disagrees with the read total on purpose. */
const Paper = () => <Card title="INVOICE" sub="Cedar Studio">
  <KeyValueList rows={[
    { label: 'Invoice', value: DOCUMENT.number },
    { label: 'Issued', value: DOCUMENT.issued },
  ]} />
  <table className="ui-table ui-table--dense">
    <thead><tr><th scope="col">Description</th><th scope="col" className="ui-table__num">Amount</th></tr></thead>
    <tbody>
      <tr><td>Design services</td><td className="ui-table__num">1,420.00</td></tr>
      <tr><td>VAT (20%)</td><td className="ui-table__num">284.00</td></tr>
    </tbody>
    <tfoot><tr><th scope="row">Total due</th><td className="ui-table__num ui-table__num--strong">{DOCUMENT.total}</td></tr></tfoot>
  </table>
</Card>;

const Steps = ({ step }: { step?: 'Supplier' | 'Total' | 'Finish' }) => step ? <div className="invoice-review__steps" aria-label="Invoice review progress" role="list">
  {(['Supplier', 'Total', 'Finish'] as const).map((name) => <span key={name} role="listitem">{name === step ? <strong>{name}</strong> : name}</span>)}
</div> : null;

/* A painted surface for the reader's data, the kit's card used as a region so the
   fields stand on a surface, never on the page ground. why: react/src/field-ground.test.tsx */
const Panel = ({ title, children }: { title: string; children: ReactNode }) => <section className="ui-card">
  <h2 className="ui-card__title">{title}</h2>
  {children}
</section>;

export function InvoiceReview({ initialState = 'start' }: { initialState?: InvoiceReviewState }) {
  const [screen, setScreen] = useState<InvoiceReviewState>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    return (ALL_STATES.includes(hash) ? hash : initialState) as InvoiceReviewState;
  });
  const [invoice, setInvoice] = useState<Invoice>({ supplier: 'Cedar Studio', number: 'INV-1042', date: '2026-09-18', total: '1740.00' });
  const [picked, setPicked] = useState('Cedar Studio');
  const [suppliers, setSuppliers] = useState(SUPPLIERS);
  const [draft, setDraft] = useState<Invoice>({ supplier: 'Cedar Studio', number: 'INV-1042', date: '2026-09-18', total: '1740.00' });
  const [newSupplier, setNewSupplier] = useState('');
  const [total, setTotal] = useState('1740.00');
  const [origin, setOrigin] = useState<InvoiceReviewState>('mismatch');

  const navigate = (next: InvoiceReviewState) => {
    setScreen(next);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${next}`);
  };
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (ALL_STATES.includes(hash)) setScreen(hash as InvoiceReviewState);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* The field values a state writes: matched uses the document total once the total is
     resolved, and edit-saved carries the reader's four changes. The states stay in memory,
     as the prototype does, so a fresh load restores the fabricated start values. */
  const shown = screen === 'edit' ? draft : screen === 'edit-saved'
    ? { supplier: draft.supplier, number: 'INV-1042-A', date: draft.date, total: '1704.00' }
    : screen === 'matched' || screen === 'edit-cancelled' || screen === 'finish' || screen === 'done'
      ? { ...invoice, total: '1704.00' }
      : invoice;

  const rows = (withTotal: boolean): KeyValueRow[] => [
    { label: 'Supplier', value: shown.supplier },
    { label: 'Invoice', value: shown.number },
    { label: 'Date', value: dateOf(shown.date) },
    ...(withTotal ? [{ label: 'Total', value: money(shown.total) }] : []),
  ];
  const facts = (withTotal: boolean) => <Panel title="Fields"><KeyValueList rows={rows(withTotal)} /></Panel>;

  const openDocument = <Button variant="ghost" icon="image" className="invoice-review__document-button" onClick={() => { setOrigin(screen); navigate('document'); }}>Open document</Button>;

  const task = (body: ReactNode, actions: ReactNode, showDocument = true) => <section className="invoice-review__task">
    <Steps step={STEPS[screen]} />
    <div className="ui-card-stack">{body}{showDocument && openDocument}</div>
    <div className="ui-toolbar">{actions}</div>
  </section>;

  let body: ReactNode;
  let actions: ReactNode;
  let showDocument = true;

  if (screen === 'start') {
    body = <><p>INV-1042.pdf uploaded.</p>{facts(true)}</>;
    actions = <><Button variant="secondary" onClick={() => { setDraft(invoice); navigate('edit'); }}>Edit fields</Button>
      <Button variant="primary" onClick={() => navigate('supplier')}>Review invoice</Button></>;
  } else if (screen === 'unreadable') {
    body = <><p>INV-1042.pdf</p><Callout variant="danger">The document cannot be read.</Callout>
      <p>Replace the file or enter its fields.</p></>;
    actions = <><Button variant="secondary" onClick={() => navigate('start')}>Replace file</Button>
      <Button variant="primary" onClick={() => { setDraft({ supplier: '', number: '', date: '', total: '' }); navigate('edit'); }}>Enter fields</Button></>;
    showDocument = false;
  } else if (screen === 'supplier' || screen === 'supplier-added') {
    const name = screen === 'supplier-added' && invoice.supplier === 'Cedar Studio' ? 'Cedar Studio Europe' : invoice.supplier;
    body = <><Panel title="Supplier"><KeyValueList rows={[{ label: 'Read name', value: 'Cedar Studio' }, { label: 'Supplier', value: name }]} /></Panel>
      <p role="status">{screen === 'supplier-added' ? 'Supplier added (sample).' : 'Suggested match.'}</p></>;
    actions = <><Button variant="ghost" onClick={() => navigate('start')}>Read result</Button>
      <Button variant="ghost" onClick={() => navigate('choose-supplier')}>Choose another</Button>
      <Button variant="primary" onClick={() => navigate('mismatch')}>Use this supplier</Button></>;
  } else if (screen === 'choose-supplier') {
    body = <Panel title="Supplier"><CheckList legend="Pick one">
      {suppliers.map((name) => <Checkbox key={name} type="radio" name="supplier-choice" label={name} value={name}
        checked={name === picked} onChange={() => setPicked(name)} />)}
    </CheckList></Panel>;
    actions = <><Button variant="ghost" onClick={() => navigate('supplier')}>Cancel</Button>
      <Button variant="ghost" onClick={() => navigate('add-supplier')}>Add supplier</Button>
      <Button variant="primary" onClick={() => { setInvoice((i) => ({ ...i, supplier: picked })); navigate('mismatch'); }}>Use supplier</Button></>;
  } else if (screen === 'add-supplier') {
    body = <Panel title="Supplier"><TextField label="Supplier name" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} autoComplete="off" /></Panel>;
    actions = <><Button variant="ghost" onClick={() => navigate('choose-supplier')}>Cancel</Button>
      <Button variant="primary" onClick={() => {
        const name = newSupplier.trim();
        if (!name) return;
        setInvoice((i) => ({ ...i, supplier: name })); setPicked(name);
        if (!suppliers.includes(name)) setSuppliers((s) => [...s, name]);
        navigate('supplier-added');
      }}>Save supplier</Button></>;
  } else if (screen === 'mismatch') {
    body = <>
      <Panel title="Fields"><KeyValueList rows={[
        { label: 'Supplier', value: invoice.supplier }, { label: 'Invoice', value: invoice.number },
        { label: 'Date', value: dateOf(invoice.date) },
      ]} /></Panel>
      <Panel title="Total"><KeyValueList rows={[{ label: 'Read total', value: money(invoice.total) }, { label: 'Document', value: DOCUMENT.total }]} /></Panel>
      <Callout variant="danger">The totals do not match.</Callout>
    </>;
    actions = <><Button variant="ghost" onClick={() => navigate('supplier')}>Supplier</Button>
      <Button variant="secondary" onClick={() => navigate('manual-total')}>Edit total</Button>
      <Button variant="primary" onClick={() => { setInvoice((i) => ({ ...i, total: '1704.00' })); navigate('matched'); }}>Use document total</Button></>;
  } else if (screen === 'manual-total' || screen === 'total-error') {
    body = <Panel title="Total">
      <TextField label="Total (EUR)" value={total} inputMode="decimal"
        error={screen === 'total-error' ? 'Enter a total of zero or more.' : undefined}
        onChange={(e) => setTotal(e.target.value)} />
      <p className="ui-field__hint">Document total: {DOCUMENT.total}.</p>
    </Panel>;
    actions = <><Button variant="ghost" onClick={() => navigate('mismatch')}>Cancel</Button>
      <Button variant="primary" onClick={() => {
        const value = total.trim();
        if (!value || !Number.isFinite(Number(value)) || Number(value) < 0) { navigate('total-error'); return; }
        const fixed = Number(value).toFixed(2);
        setInvoice((i) => ({ ...i, total: fixed }));
        if (fixed === '1704.00') navigate('matched'); else { setDraft({ ...invoice, total: fixed }); navigate('edit-saved'); }
      }}>Save total</Button></>;
  } else if (screen === 'matched' || screen === 'edit-cancelled' || screen === 'edit-saved') {
    const notice = screen === 'edit-cancelled' ? 'Edits cancelled. The saved fields stay unchanged.'
      : screen === 'edit-saved' ? 'Changes saved (sample).'
        : (invoice.supplier === 'Cedar Studio' && invoice.number === 'INV-1042' && invoice.date === '2026-09-18' && invoice.total === '1704.00' ? 'All fields match.' : 'Fields checked.');
    body = <>{facts(true)}<p role="status">{notice}</p></>;
    actions = <><Button variant="secondary" onClick={() => { setDraft(invoice); navigate('edit'); }}>Edit fields</Button>
      <Button variant="primary" onClick={() => navigate('finish')}>Review summary</Button></>;
  } else if (screen === 'edit') {
    body = <Panel title="Fields"><div className="invoice-review__fields">
      <TextField label="Supplier" value={draft.supplier} onChange={(e) => setDraft((d) => ({ ...d, supplier: e.target.value }))} />
      <TextField label="Invoice number" value={draft.number} onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))} />
      <TextField label="Date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
      <TextField label="Total (EUR)" inputMode="decimal" value={draft.total} onChange={(e) => setDraft((d) => ({ ...d, total: e.target.value }))} />
    </div></Panel>;
    actions = <><Button variant="secondary" onClick={() => navigate(origin === 'matched' ? 'edit-cancelled' : origin)}>Cancel</Button>
      <Button variant="primary" onClick={() => {
        if (!draft.supplier.trim() || !draft.number.trim() || !draft.date || !Number.isFinite(Number(draft.total)) || Number(draft.total) < 0) return;
        setInvoice({ ...draft, total: Number(draft.total).toFixed(2) });
        navigate('edit-saved');
      }}>Save</Button></>;
    showDocument = false;
  } else if (screen === 'document') {
    body = <>
      <Panel title="Fields"><KeyValueList rows={[
        { label: 'Supplier', value: invoice.supplier }, { label: 'Invoice', value: invoice.number },
        { label: 'Date', value: dateOf(invoice.date) },
      ]} /></Panel>
      <Panel title="Total"><KeyValueList rows={[{ label: 'Read total', value: money(invoice.total) }, { label: 'Document', value: DOCUMENT.total }]} /></Panel>
      <Callout variant="danger">The totals do not match.</Callout>
    </>;
    actions = <><Button variant="ghost" onClick={() => navigate('supplier')}>Supplier</Button>
      <Button variant="secondary" onClick={() => navigate('manual-total')}>Edit total</Button></>;
  } else if (screen === 'finish') {
    body = facts(true);
    actions = <><Button variant="secondary" onClick={() => { setDraft(invoice); navigate('edit'); }}>Edit fields</Button>
      <Button variant="primary" icon="check" onClick={() => navigate('done')}>Confirm</Button></>;
  } else {
    // done
    body = <>{facts(true)}<p role="status">Review saved (sample).</p></>;
    actions = <Button variant="secondary" onClick={() => { setDraft(invoice); navigate('edit'); }}>Edit fields</Button>;
    showDocument = false;
  }

  return <AppShell word="Invoices" sections={[{ href: '#start', label: 'Invoices', icon: 'doc' }]} pathname="#start"
      title={TITLES[screen]} width="wide"
      account={{ name: 'Demo reviewer', email: 'demo@example.com' }} onSignOut={() => {}}
      renderLink={(section, props) => <a {...props} aria-current="page" href={section.href} />}>
      <div className="invoice-review__layout">
        {task(body, actions, showDocument)}
        {showDocument && <aside className="invoice-review__document" aria-label="Document">
          <div className="ui-toolbar ui-toolbar--split"><strong>INV-1042.pdf</strong><span>1 / 1</span></div>
          <Paper />
        </aside>}
      </div>
    <Drawer open={screen === 'document'} title="INV-1042.pdf" side="bottom" onClose={() => navigate(origin)}>
      <Paper />
    </Drawer>
  </AppShell>;
}
