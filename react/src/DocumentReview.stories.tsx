import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { success } from '@apliteni/apliteni-ui';
import { AppShell } from './AppShell';
import { Card } from './primitives/Card';
import { Button } from './primitives/Button';
import { Callout } from './primitives/Callout';
import { StatBand } from './primitives/StatBand';
import { Segmented } from './Segmented';
import { BusyRegion, Skeleton, SkeletonTable } from './Loading';
import { EmptyState } from './EmptyState';
import { KeyValueList } from './KeyValueList';
import './DocumentReview.css';

// Three screens, in order: read the document, commit to the approval, see what was
// recorded. The middle screen exists to separate inspecting from committing, so it
// shows what the approval commits to and nothing the reader has already read — a
// screen that reprints the first one costs a click and guards nothing.
// Decided in #385 after Artur's request on PR #437; no Stepper component, because two
// stages are named by their titles and a third product has not asked for one.
type Step = 'review' | 'confirm' | 'error' | 'approved';
// The document preview's own states, from #385: rendered, fetching, cannot render.
type Preview = 'ready' | 'loading' | 'unavailable';
type Args = { step: Step; preview: Preview };

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
  { service: 'Prototype review', hours: 4, amount: '300.00' },
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

// Four presets rather than a stepper pair: the choice owns no panel, so the kit
// names segmented() for it. why: guidelines/component-choice.md#match-controls-to-panels
// Fit shows the whole document; percentage presets magnify the same page.
const ZOOMS = [50, 'fit', 150, 200] as const;

// A scroll region earns a tab stop only while it has something to scroll. A
// permanent one is a stop that lands the reader nowhere, and the element that
// does overflow is then the one without it.
// why: guidelines/accessibility-floor.md#keyboard-first
function useOverflows(ref: { current: HTMLElement | null }, watch: unknown) {
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const read = () => setOverflows(
      box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1,
    );
    read();
    const observer = new ResizeObserver(read);
    observer.observe(box);
    for (const child of box.children) observer.observe(child);
    return () => observer.disconnect();
  }, [ref, watch]);
  return overflows;
}

// The showcase's own class names, declared once outside the render.
//
// Every step is the shell's wide main, so the back link, the title and the text edge
// stand at the same x from Review to Approved; the reading steps cap their own measure
// instead of moving the column. Rhythm is the shell body's own gap, repeated once here
// because these steps hand the shell a single child.
// why: guidelines/the-page.md#choose-content-width, guidelines/layout-and-density.md#use-the-spacing-scale
//
// No max-height on the document: capping it put the invoice total under the fold at
// 1280x560 and left two scrollers nested inside one card. The page scrolls;
// .ui-table-scroll carries columns sideways only.
const CSS = `
  .doc-flow { display: flex; flex-direction: column; gap: var(--space-5); }
  .doc-flow--measure { max-width: var(--measure); }
  /* The extracted fields lead and take the flexible track; the document sits beside
     them in a fixed panel. The fields are what approval writes, so they get the first
     position and the wider column at every width, stacked as well as side by side.
     why: guidelines/density-and-accents.md#follow-the-consequence, guidelines/layout-and-density.md#use-the-three-breakpoints */
  .doc-flow__panes { display: grid; align-items: start; gap: var(--space-6);
    grid-template-columns: minmax(0, 1fr) var(--panel-md); }
  .doc-flow .ui-table-scroll { --ui-table-height: none; padding: 0; }
  .doc-flow__scroll-hint { margin: 0 0 var(--space-3); }
  .doc-flow__pinned-text { position: sticky; left: var(--space-3); }
  /* The page is at least panel-md wide; Fit scales it to its viewport. The panel it
     sits in is panel-md too, so Fit lands at about 88% rather than scaling a 560px page
     into a 420px box — a preview that is smaller, not one that is faded.
     It draws no ground, border or radius of its own: the "Source document" card is the
     sheet, and a bordered box on its parent's own fill is a card inside a card — white
     on white in light, and one hairline apart in dark.
     why: guidelines/layout-and-density.md#use-panel-and-prose-units, guidelines/the-page.md#limit-card-stacks */
  .doc-flow__sheet { width: var(--panel-md); transition: zoom var(--dur-med) var(--ease-out); }
  .doc-flow__sheet .ui-skel + .ui-skel { margin-top: var(--space-5); }
  .doc-flow__meta { margin: 0 0 var(--space-2); }
  .doc-flow__meta:last-of-type { margin-bottom: var(--space-4); }
  .doc-flow__toolbar { display: flex; flex-wrap: wrap; align-items: center;
    gap: var(--space-4); margin-bottom: var(--space-4); }
  .doc-flow__amounts { margin-top: var(--space-5); }
  /* The zoom control sits in the reference pane, so its selected pill marks itself with
     the kit's strong edge instead of the accent. Between the two panes the accent names
     the data that gets saved, and a reference cannot hold the step's only colour. The
     focus state is left alone: :not(:focus-visible) keeps the ring's own transparent
     outline off this rule. why: guidelines/density-and-accents.md#follow-the-consequence */
  .doc-flow__toolbar .ui-seg button[aria-pressed="true"]:not(:focus-visible) {
    outline-color: var(--border-strong);
  }
  /* The values the approval writes carry the weight; their labels keep theirs. Rank
     here is weight, not ink: the rule asks for size, weight and spacing, and a colour
     written in a story's own style block is one the contrast walk cannot resolve, so it
     would judge these rows as nothing at all.
     why: guidelines/labels-and-titles.md#use-body-ink, guidelines/density-and-accents.md#follow-the-consequence */
  /* The pane's name carries the step's accent, and it is declared in
     DocumentReview.css so the contrast walk can judge it. Both cards keep the kit's own
     hairline, and the figures stay neutral: this step exists to compare two readings of
     the same numbers, and colouring one side's Total says the two differ.
     why: guidelines/density-and-accents.md#follow-the-consequence,
     guidelines/density-and-accents.md#give-accents-a-job */
  .doc-flow__saved .ui-drawer__row dt { font-weight: var(--weight-normal); }
  .doc-flow__saved .ui-drawer__row dd { font-weight: var(--weight-medium); }
  /* One alignment for one column, and the header on the same side as its values. This
     column holds text, so it stays left; only the figures share a right edge. The kit
     right-aligns a footer label because it usually spans to sit against its figure —
     here it owns a column, so it stays with the labels above it.
     why: guidelines/dense-tables.md#align-numeric-values */
  .ui-table.doc-flow__amounts :is(tbody, tfoot) th { text-align: left; }
  /* …and the same ranking the rows above use. The kit's own th rule carries a weight, so
     in this pane each label came out a step heavier than the figure beside it — the
     inversion of the rule this showcase exists to show. Labels drop to the body weight
     and figures take the step above, Total included.
     why: guidelines/density-and-accents.md#follow-the-consequence */
  .ui-table.doc-flow__amounts :is(tbody, tfoot) th { font-weight: var(--weight-normal); }
  .ui-table.doc-flow__amounts :is(tbody, tfoot) td { font-weight: var(--weight-medium); }
  .ui-table.doc-flow__amounts tfoot th.ui-table__num--strong { font-weight: var(--weight-medium); }
  .ui-table.doc-flow__amounts tfoot td.ui-table__num--strong { font-weight: var(--weight-semibold); }
  /* One order on every step and every width: the committing action first, then the
     quiet ones, so the button that commits never lands beside a way out.
     why: guidelines/component-choice.md#make-the-committing-action-stand-out */
  .doc-flow__actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
  @media (max-width: 860px) {
    .doc-flow__panes { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 560px) {
    /* The document is taller than the phone, so the step's action would sit a screen
       and a half down. The row rides the bottom of the viewport on the page's own
       ground, clear of the shell's bottom nav — a 48px row inside space-2 padding. */
    .doc-flow__actions {
      position: sticky;
      bottom: calc(var(--space-16) + env(safe-area-inset-bottom));
      margin-inline: calc(-1 * var(--space-4));
      padding: var(--space-3) var(--space-4);
      background: var(--bg);
      border-top: 1px solid var(--border);
    }
  }
`;

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
    const [state, setState] = useState<Preview>(preview);
    const [zoom, setZoom] = useState<string>('fit');
    const [pageSize, setPageSize] = useState({ width: 0, fit: 1 });
    // One flag for the whole approval: it disables the button, marks the step busy and
    // drives the announcement, so the screen cannot report three different waits.
    // why: guidelines/state-set.md#busy-controls, guidelines/state-set.md#screen-loading
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const columnsScroll = useOverflows(scrollRef, `${state}:${zoom}:${step}`);
    const approveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
      const box = scrollRef.current;
      if (!box) return;
      const read = () => {
        const minimum = parseFloat(getComputedStyle(box).getPropertyValue('--panel-md'));
        const width = Math.max(minimum, box.clientWidth);
        setPageSize({ width, fit: box.clientWidth / width });
      };
      read();
      const observer = new ResizeObserver(read);
      observer.observe(box);
      return () => observer.disconnect();
    }, [state, step]);

    useEffect(() => setStep(fromArgs), [fromArgs]);
    useEffect(() => setState(preview), [preview]);
    useEffect(() => () => {
      clearTimeout(approveTimer.current);
      clearTimeout(retryTimer.current);
    }, []);

    // Content already on screen at load stays still; only what replaces the skeleton
    // is animated. why: guidelines/motion.md#move-after-load
    const before = useRef<Preview>(preview);
    const arriving = before.current === 'loading' && state !== 'loading' ? 'm-fade-in' : undefined;
    useEffect(() => { before.current = state; });

    const loading = state === 'loading';
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

    const sheet = (
      <div
        className="ui-table-scroll"
        ref={scrollRef}
        {...(columnsScroll && { tabIndex: 0, role: 'region', 'aria-label': 'Invoice document' })}
      >
        <div
          className={['doc-flow__sheet', arriving].filter(Boolean).join(' ')}
          style={{ width: pageSize.width || undefined, zoom: zoom === 'fit' ? pageSize.fit : Number(zoom) / 100 }}
        >
          <h3>{DOCUMENT.supplier}</h3>
          <p className="doc-flow__meta">Invoice {DOCUMENT.number} · {RATE} per hour</p>
          <p className="doc-flow__meta">Issued {DOCUMENT.issued} · Due {DOCUMENT.due}</p>
          <table className="ui-table ui-table--dense">
            <caption className="ui-sr">Services on this invoice, with subtotal, VAT and total.</caption>
            <thead>
              <tr>
                <th><span className="doc-flow__pinned-text">Service</span></th>
                <th className="ui-table__num">Hours</th>
                <th className="ui-table__num">Amount (EUR)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(({ service, hours, amount }) => (
                <tr key={service}>
                  <td className="ui-table__title"><span className="doc-flow__pinned-text">{service}</span></td>
                  <td className="ui-table__num">{hours}</td>
                  <td className="ui-table__num">{amount}</td>
                </tr>
              ))}
            </tbody>
            {/* The footer is what separates totals from line items; the kit opens it
                with the strong rule and sits each label against its figure. */}
            <tfoot>
              {totals.map(({ label, value }) => {
                // The row carries the weight, not the number alone: a bold figure
                // beside a body-weight label reads as two different rows.
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
        </div>
      </div>
    );

    // Bar widths are fixed, not traced over the hidden text: placeholders drawn
    // to the width of the glyphs they hide render single digits as 8px specks.
    const sheetPlaceholder = (
      <div className="ui-table-scroll" ref={scrollRef}>
        <div className="doc-flow__sheet" style={{ width: pageSize.width || undefined, zoom: pageSize.fit }}>
          <Skeleton lines={['38%', '46%', '42%']} />
          <SkeletonTable rows={4} cols={3} />
        </div>
      </div>
    );

    // The extracted fields come first, take the wider column and carry the step's accent
    // on their own name: they are what the approval writes to the record, and the
    // document beside them is the source they are checked against. The preview is quieter
    // by being second, narrower and uncoloured — never by being faded, and it holds no
    // accent of its own. why: guidelines/density-and-accents.md#follow-the-consequence
    const fields = (
      <Card title="Extracted fields" sub="Saved to the record when you approve." className="doc-flow__saved-pane">
        {loading ? <Skeleton lines={8} /> : <>
          <KeyValueList className={['doc-flow__saved', arriving].filter(Boolean).join(' ')} rows={identity} />
          {/* Figures the reader compares belong in a right-aligned table, in the
              document's own format, so the two columns of numbers share an edge
              instead of being read character by character.
              why: guidelines/dense-tables.md#align-numeric-values */}
          <table className={['ui-table', 'ui-table--dense', 'doc-flow__amounts', arriving].filter(Boolean).join(' ')}>
            <caption className="ui-sr">Amounts read from the invoice, in EUR.</caption>
            {/* The left column holds the names of the amounts, not amounts, so it takes
                no visible header; the figures carry the header the document's own table
                gives them, which is what lets the two readings be compared word for word.
                why: guidelines/dense-tables.md#keep-units-readable */}
            <thead>
              <tr>
                <th><span className="ui-sr">Amount read from the invoice</span></th>
                <th className="ui-table__num">Amount (EUR)</th>
              </tr>
            </thead>
            <tbody>
              {totals.slice(0, -1).map(({ label, value }) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td className="ui-table__num">{value}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="ui-table__num--strong">Total</th>
                <td className="ui-table__num ui-table__num--strong">{totals[totals.length - 1].value}</td>
              </tr>
            </tfoot>
          </table>
        </>}
      </Card>
    );

    const source = (
      <Card title="Source document">
        {/* The toolbar stays in every state and disables what cannot act, so the
            card header keeps its height and no control moves between states. */}
        <div className="doc-flow__toolbar">
          <Segmented
            label="Zoom"
            value={zoom}
            onChange={setZoom}
            disabled={state !== 'ready'}
            options={ZOOMS.map((s) => ({ label: s === 'fit' ? 'Fit' : `${s}%`, value: String(s) }))}
          />
        </div>
        {loading ? sheetPlaceholder : state === 'unavailable' ? (
          <EmptyState
            art="invoices"
            title="We couldn’t render this file"
            sub="The extracted fields were read from it and are complete."
            actions={<Button onClick={retryPreview}>Try again</Button>}
          />
        ) : <>
          {columnsScroll && <p className="doc-flow__scroll-hint">Scroll left or right to see all amounts.</p>}
          {sheet}
        </>}
      </Card>
    );

    const review = (
      <div className="doc-flow">
        <div className="doc-flow__panes">
          {fields}
          {source}
        </div>
        <div className="doc-flow__actions">
          <Button variant="primary" onClick={() => setStep('confirm')} disabled={loading}>
            Continue to approval
          </Button>
        </div>
      </div>
    );

    const confirm = (
      <div className="doc-flow doc-flow--measure">
        {/* A standing condition, so a callout rather than a toast, and a danger callout
            carries role="alert" so its appearance is announced.
            why: guidelines/component-choice.md#show-lasting-conditions, guidelines/state-set.md#marked-errors */}
        {failed && (
          <Callout variant="danger">
            Approval was not saved: the approval service refused the request. Nothing about
            the document changed, and no one has been notified.
          </Callout>
        )}
        {/* The figure the approval commits to, at the rank the kit gives a key figure —
            not one of eight equal rows. why: guidelines/stat-bands.md#use-a-stat-band */}
        <StatBand variant="tiles" stats={[{ label: 'Total to approve', value: TOTAL_DUE }]} />
        {/* What approval means, beside the button that does it rather than at the top of
            the page. why: guidelines/text-length.md#explain-consequences-in-callouts */}
        <Callout variant="info">
          Approval marks this document as reviewed. It does not send a payment.
        </Callout>
        <div className="doc-flow__actions">
          <Button variant="primary" busy={sending} onClick={approve}>
            {failed ? 'Try approval again' : 'Approve document'}
          </Button>
          <Button onClick={() => setStep('review')} disabled={sending}>Back to review</Button>
        </div>
      </div>
    );

    // The result is the page and says where to go next, so it is success() rather than
    // successPanel(), at h2 under the page title, with no back link above it competing
    // for the same destination. The page title states the outcome, so this heading says
    // what is left to do instead of titling the same event a second time.
    // why: guidelines/component-choice.md#match-confirmation-scale, guidelines/the-page.md#order-page-headings
    const approved = (
      <div className="doc-flow doc-flow--measure" dangerouslySetInnerHTML={{
        __html: success({
          layout: 'hero',
          level: 2,
          backdrop: 'flat',
          title: 'Nothing else is needed',
          body: `No payment was sent. Approved on ${APPROVED_AT} by ${APPROVER}.`,
          actions: [
            { label: 'Return to invoices', variant: 'primary', href: '#invoices' },
            { label: `Open ${DOCUMENT.number}`, href: '#document-review' },
          ],
        }),
      }} />
    );

    const head = {
      review: {
        title: `Review invoice ${DOCUMENT.number}`,
        lede: 'Check the fields read from the document against the document itself.',
      },
      confirm: {
        title: 'Confirm approval',
        lede: `Invoice ${DOCUMENT.number} from ${DOCUMENT.supplier}, due ${DOCUMENT.due}.`,
      },
      approved: { title: `Invoice ${DOCUMENT.number} is marked as reviewed`, lede: undefined },
    }[onConfirm ? 'confirm' : step === 'approved' ? 'approved' : 'review'];

    return (
      <AppShell
        word="Workspace"
        width="wide"
        title={head.title}
        lede={head.lede}
        // The result screen is where the flow ends, so nothing sits above its title.
        // why: guidelines/going-back.md#link-only-for-child-pages
        back={step === 'approved' ? undefined : { href: '#invoices', label: 'Invoices' }}
        sections={[{ href: '#invoices', label: 'Invoices', icon: 'doc' }]}
        pathname="#invoices"
        account={{ name: APPROVER, email: 'demo@example.com' }}
        onSignOut={() => {}}
      >
        <style>{CSS}</style>

        {/* One live region for the screen, holding no controls: a status is not a place
            for a button. It stays mounted across every step, which is what makes each
            change announce once. The result screen says nothing here because success()
            brings its own live region, and two regions over one event is how a screen
            says a thing twice. why: guidelines/state-set.md#screen-loading */}
        <BusyRegion
          busy={loading || sending}
          placeholder={<></>}
          label={sending ? 'Recording the approval' : 'Loading the invoice'}
          message={
            step === 'approved' ? ''
              : failed ? 'Approval was not saved'
                : state === 'unavailable' ? 'Preview unavailable. Extracted fields are ready.'
                  : onConfirm ? 'Ready to approve' : 'Invoice ready'
          }
        />

        <div id="document-review" aria-busy={loading || sending}>
          {step === 'approved' ? approved : onConfirm ? confirm : review}
        </div>
      </AppShell>
    );
  },
};
