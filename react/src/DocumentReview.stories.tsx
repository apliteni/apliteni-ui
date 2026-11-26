import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from './AppShell';
import { BackLink } from './BackLink';
import { Button } from './primitives/Button';
import { Callout } from './primitives/Callout';
import { StatBand } from './primitives/StatBand';
import { BusyRegion, Skeleton } from './Loading';
import { KeyValueList } from './KeyValueList';
import { SplitLayout, type SplitLayoutPreviewState, type SplitLayoutZoom } from './SplitLayout';
import { Success } from './Success';

// Three screens, in order: read the document, commit to the approval, see what was
// recorded. The middle screen exists to separate inspecting from committing, so it
// shows what the approval commits to and nothing the reader has already read.
// Decided in #385 after Artur's request on PR #437. The review screen is a SplitLayout
// from #903: the extracted fields and the action first, the document on its own ground.
// The showcase writes no CSS of its own.
type Step = 'review' | 'confirm' | 'error' | 'approved';
type Args = { step: Step; preview: SplitLayoutPreviewState };

const RATE = '€75.00';
const DOCUMENT = {
  supplier: 'Sample Studio',
  number: 'DEMO-1042',
  issued: '14 September 2026',
  due: '28 September 2026',
};
// The one figure the approval commits to. Written with its symbol because it stands
// alone; inside a table the unit is in the column header and the figures stay plain,
// so both sides of the comparison read the same way.
const TOTAL_DUE = '€1,440.00';
const APPROVED_AT = '30 September 2026 at 14:32 CET';
const APPROVER = 'Demo User';

const lines = [
  { service: 'Interface design', hours: 6, amount: '450.00' },
  { service: 'Usability testing', hours: 4, amount: '300.00' },
  { service: 'Design revisions', hours: 4, amount: '300.00' },
  { service: 'Developer handoff', hours: 2, amount: '150.00' },
];

const totals = [
  { label: 'Subtotal', value: '1,200.00' },
  { label: 'VAT (20%)', value: '240.00' },
  { label: 'Total', value: '1,440.00' },
];

// What the parser read, split the way the reader checks it: the identity fields beside
// their labels, and the figures in a table of their own so they share a right edge and
// a format with the document's. why: guidelines/drawer.md#spaced-label-rows (the Except)
const identity = [
  { label: 'Supplier', value: DOCUMENT.supplier },
  { label: 'Invoice', value: DOCUMENT.number },
  { label: 'Issued', value: DOCUMENT.issued },
  { label: 'Due', value: DOCUMENT.due },
  { label: 'Currency', value: 'EUR' },
];

const meta: Meta<Args> = {
  title: 'Showcases/Document review',
  id: 'apps-document-review',
  parameters: { layout: 'fullscreen' },
  args: { step: 'review', preview: 'ready' },
  argTypes: {
    step: { control: 'inline-radio', options: ['review', 'confirm', 'error', 'approved'] },
    preview: { control: 'inline-radio', options: ['ready', 'loading', 'unavailable'] },
  },
};
export default meta;

export const Default: StoryObj<Args> = {
  render: function DocumentReview({ step: fromArgs, preview }) {
    const [step, setStep] = useState<Step>(fromArgs);
    const [state, setState] = useState<SplitLayoutPreviewState>(preview);
    const [zoom, setZoom] = useState<SplitLayoutZoom>('fit');
    // One flag for the whole approval: it disables the button, marks the step busy and
    // drives the announcement, so the screen cannot report three different waits.
    // why: guidelines/state-set.md#busy-controls, guidelines/state-set.md#screen-loading
    const [sending, setSending] = useState(false);
    const approveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => setStep(fromArgs), [fromArgs]);
    // A step change removes the pressed button, so the focus goes to the new step's title.
    const shown = useRef(step);
    useEffect(() => {
      if (shown.current === step) return;
      shown.current = step;
      const title = document.querySelector<HTMLElement>('main h1');
      if (title) { title.tabIndex = -1; title.focus(); }
    }, [step]);
    useEffect(() => setState(preview), [preview]);
    useEffect(() => () => {
      clearTimeout(approveTimer.current);
      clearTimeout(retryTimer.current);
    }, []);

    const loading = state === 'loading';
    // The fields load with the document. A retry reloads the preview alone, so the fields
    // that are ready stay in place.
    const fieldsLoading = loading && preview === 'loading';
    const failed = step === 'error';
    const onConfirm = failed || step === 'confirm';
    const retryPreview = () => {
      setState('loading');
      retryTimer.current = setTimeout(() => setState('ready'), 1200);
    };
    // The approval service is simulated and always accepts. Its refusal is a state of
    // the flow, reached through the `step` control, so the failure screen can be read
    // and captured without a fixture that fails on a timer.
    const approve = () => {
      setSending(true);
      approveTimer.current = setTimeout(() => { setSending(false); setStep('approved'); }, 900);
    };

    const sheet = <>
      <h3>{DOCUMENT.supplier}</h3>
      <p>Invoice {DOCUMENT.number}</p>
      <p>{RATE} per hour</p>
      <p>Issued {DOCUMENT.issued}</p>
      <p>Due {DOCUMENT.due}</p>
      {/* No filter bar: the reviewer checks every line of the one document. why: guidelines/dense-tables.md#give-a-long-table-its-filter-bar */}
      <table className="ui-table ui-table--dense">
        <caption className="ui-sr">Services on this invoice, with subtotal, VAT and total.</caption>
        <thead>
          <tr>
            <th>Service</th>
            <th className="ui-table__num">Hours</th>
            <th className="ui-table__num">Amount (EUR)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(({ service, hours, amount }) => (
            <tr key={service}>
              <td className="ui-table__title">{service}</td>
              <td className="ui-table__num">{hours}</td>
              <td className="ui-table__num">{amount}</td>
            </tr>
          ))}
        </tbody>
        {/* The footer is what separates totals from line items; the kit opens it
            with the strong rule and sits each label against its figure. */}
        <tfoot>
          {totals.map(({ label, value }) => {
            const strong = label === 'Total' ? 'ui-table__num--strong' : undefined;
            return (
              <tr key={label}>
                <th scope="row" colSpan={2} className={strong}>{label}</th>
                <td className={['ui-table__num', strong].filter(Boolean).join(' ')}>{value}</td>
              </tr>
            );
          })}
        </tfoot>
      </table>
    </>;

    // The extracted fields come first and take the wider pane: they are what the approval
    // writes to the record, and the document beside them is the source they are checked
    // against. why: guidelines/density-and-accents.md#follow-the-consequence
    const fields = <>
      <BackLink href="#invoices" label="Invoices" />
      <h1>Review invoice {DOCUMENT.number}</h1>
      <p className="ui-app__sub">
        Check the fields read from the document against the document itself. Approval saves them to the record.
      </p>
      {fieldsLoading ? <Skeleton lines={8} /> : <>
        <KeyValueList rows={identity} />
        {/* Figures the reader compares belong in a right-aligned table, in the document's
            own format. why: guidelines/dense-tables.md#align-numeric-values */}
        {/* No filter bar: every amount is checked against the document. why: guidelines/dense-tables.md#give-a-long-table-its-filter-bar */}
        <table className="ui-table ui-table--dense">
          <caption className="ui-sr">Amounts read from the invoice, in EUR.</caption>
          {/* The left column holds the names of the amounts, so it takes no visible header.
              why: guidelines/dense-tables.md#keep-units-readable */}
          <thead>
            <tr>
              <th><span className="ui-sr">Amount read from the invoice</span></th>
              <th className="ui-table__num">Amount (EUR)</th>
            </tr>
          </thead>
          {/* All three rows are body rows, so their labels share the left edge. The kit's
              footer sets a label against its figure, and here the label owns a column. */}
          <tbody>
            {totals.map(({ label, value }) => {
              const strong = label === 'Total' ? 'ui-table__num--strong' : undefined;
              return (
                <tr key={label}>
                  <th scope="row" className={strong}>{label}</th>
                  <td className={['ui-table__num', strong].filter(Boolean).join(' ')}>{value}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>}
    </>;

    // The committing action first, then the quiet ones, so the button that commits never
    // lands beside a way out. why: guidelines/component-choice.md#make-the-committing-action-stand-out
    const review = (
      <SplitLayout
        primary={fields}
        primaryLabel="Extracted fields"
        preview={{ title: 'Document preview', children: sheet, state, onRetry: retryPreview }}
        zoom={zoom}
        onZoomChange={setZoom}
        actions={<Button variant="primary" onClick={() => setStep('confirm')} disabled={loading}>Continue to approval</Button>}
      />
    );

    const confirm = <>
      {/* A standing condition, so a callout rather than a toast, and a danger callout
          carries role="alert" so its appearance is announced.
          why: guidelines/component-choice.md#show-lasting-conditions, guidelines/state-set.md#marked-errors */}
      {failed && (
        <Callout variant="danger">
          Approval was not saved: the approval service refused the request. Nothing about
          the document changed, and no one has been notified.
        </Callout>
      )}
      {/* The figure the approval commits to, at the rank the kit gives a key figure.
          why: guidelines/stat-bands.md#use-a-stat-band */}
      <StatBand variant="tiles" stats={[{ label: 'Total to approve', value: TOTAL_DUE }]} />
      {/* What approval means, beside the button that does it.
          why: guidelines/text-length.md#explain-consequences-in-callouts */}
      <Callout variant="info">
        Approval marks this document as reviewed. It does not send a payment.
      </Callout>
      <div className="ui-toolbar">
        <Button variant="primary" busy={sending} onClick={approve}>
          {failed ? 'Try approval again' : 'Approve document'}
        </Button>
        <Button onClick={() => setStep('review')} disabled={sending}>Back to review</Button>
      </div>
    </>;

    // The result is the page and says where to go next, at h2 under the page title, with
    // no back link above it. why: guidelines/component-choice.md#match-confirmation-scale
    const approved = (
      <Success
        layout="hero"
        level={2}
        title="Nothing else is needed"
        body={`No payment was sent. Approved on ${APPROVED_AT} by ${APPROVER}.`}
        actions={<>
          <Button variant="primary" href="#invoices">Return to invoices</Button>
          <Button href="#document-review">{`Open ${DOCUMENT.number}`}</Button>
        </>}
      />
    );

    const head = step === 'approved'
      ? { title: `Invoice ${DOCUMENT.number} is marked as reviewed`, lede: undefined }
      : { title: 'Confirm approval', lede: `Invoice ${DOCUMENT.number} from ${DOCUMENT.supplier}, due ${DOCUMENT.due}.` };
    const inReview = !onConfirm && step !== 'approved';

    return (
      <AppShell
        word="Workspace"
        // The review screen splits from the band to the foot, so it takes the full width
        // and holds its own title. The other two steps are reading pages.
        width={inReview ? 'full' : 'centered'}
        title={inReview ? undefined : head.title}
        lede={inReview ? undefined : head.lede}
        // The result screen is where the flow ends, so nothing sits above its title.
        // why: guidelines/going-back.md#link-only-for-child-pages
        back={onConfirm ? { href: '#invoices', label: 'Invoices' } : undefined}
        sections={[{ href: '/invoices', label: 'Invoices', icon: 'doc' }, { href: '/reports', label: 'Reports', icon: 'chart' }]}
        // The invoice is a child page of Invoices, so the section row is its parent.
        pathname={`/invoices/${DOCUMENT.number}`}
        account={{ name: APPROVER, email: 'demo@example.com' }}
        onSignOut={() => {}}
      >
        <div id="document-review" aria-busy={sending}>
          {/* One live region for the screen, holding no controls. The result screen says
              nothing here because success() brings its own live region. The preview
              announces its own loading. why: guidelines/state-set.md#screen-loading */}
          <BusyRegion
            busy={sending}
            placeholder={<></>}
            label="Recording the approval"
            message={
              step === 'approved' ? ''
                : failed ? 'Approval was not saved'
                  : state === 'unavailable' && inReview ? 'Preview unavailable. Extracted fields are ready.'
                    : onConfirm ? 'Ready to approve' : 'Invoice ready'
            }
          />
          {step === 'approved' ? approved : onConfirm ? <div className="ui-card-stack">{confirm}</div> : review}
        </div>
      </AppShell>
    );
  },
};
