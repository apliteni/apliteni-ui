// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { StatBand } from '../../react/src/primitives/StatBand';
import { DrawerSection, KeyValueList } from '../../react/src/KeyValueList';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_density-and-accents.js';

const content = await loadGuideline('density-and-accents.md', new URL('../../guidelines/density-and-accents.md', import.meta.url));

const Stage = ({ mod = '', children }: { mod?: string; children: ReactNode }) => <div className={`gda-stage ${mod}`}>{children}</div>;
const rows = (pairs: [string, string][]) => pairs.map(([label, value]) => ({ label, value }));
const Section = ({ title, pairs }: { title?: string; pairs: [string, string][] }) =>
  <DrawerSection title={title}><KeyValueList rows={rows(pairs)} /></DrawerSection>;

const FACTS: [string, string][] = [['Amount', '€ 1,240.00'], ['Arrival', '30 Sep 2026'], ['Source', 'Bank feed']];
const Preview = ({ bad = false, colourful = false }: { bad?: boolean; colourful?: boolean }) =>
  <div className={`ui-card ui-card--pad-sm ${colourful ? 'gda-coloured' : ''}`}>
    <h3 className="ui-card__title">Payout 1162</h3>
    <Badge variant="pending">In transit</Badge>
    <Section pairs={FACTS} />
    {bad && <>
      <Section title="Payout details" pairs={[['Payout reference', 'Payout 1162'], ['Payout status', 'In transit'], ['Payout amount', '€ 1,240.00']]} />
      <Section title="History" pairs={[['28 Sep, 09:00', 'Created'], ['28 Sep, 09:02', 'Approved'], ['29 Sep, 08:00', 'Sent to bank']]} />
    </>}
    <div className="gda-actions">
      <Button variant="primary" size="sm">Open payout</Button>
      <Button variant={colourful ? 'primary' : 'secondary'} size="sm">Copy reference</Button>
    </div>
  </div>;

// The ledger sits in a card, as the preview under it does, and the card ends where
// the table does (--fit), so the two halves are compared on their content.
const PAYOUTS: [string, string, ReactNode][] = [
  ['1162', '1,240.00', <Badge variant="pending">In transit</Badge>],
  ['1161', '860.00', <Badge variant="success">Paid</Badge>],
  ['1160', '2,100.00', <Badge variant="success">Paid</Badge>],
];
const Payouts = () => <div className="gda-table"><div className="ui-card ui-card--pad-sm ui-card--fit">
  <table className="ui-table ui-table--dense ui-table--zebra">
    <caption>Payouts · EUR</caption>
    <thead><tr><th>Reference</th><th className="ui-table__num">Amount</th><th>Status</th></tr></thead>
    <tbody>{PAYOUTS.map(([reference, amount, status]) =>
      <tr key={reference}><td>{reference}</td><td className="ui-table__num">{amount}</td><td>{status}</td></tr>)}</tbody>
  </table>
</div></div>;
const Figures = () => <StatBand variant="tiles" basis="Payouts · September"
  stats={[{ label: 'Paid', value: '€ 8,640' }, { label: 'In transit', value: '€ 1,240' }]} />;

// A document preview beside the fields a parser read from it. Both panels print the
// same two cards, so what a reader compares is the width, the value weight and
// which card's name carries the accent.
const SavedPane = ({ lead }: { lead: boolean }) => <div className={`ui-card ui-card--pad-sm${lead ? ' gda-pane--accent' : ''}`}>
  <h3 className="ui-card__title">Extracted fields</h3>
  <p className="gda-pane__label">Supplier</p>
  <p className={`gda-pane__value${lead ? ' gda-pane__value--strong' : ''}`}>Sample Studio</p>
  <p className="gda-pane__label">Total</p>
  <p className={`gda-pane__value${lead ? ' gda-pane__value--strong' : ''}`}>1,440.00</p>
</div>;
const SourcePane = ({ lead }: { lead: boolean }) => <div className={`ui-card ui-card--pad-sm${lead ? ' gda-pane--accent' : ''}`}>
  <h3 className="ui-card__title">Document preview</h3>
  {['Invoice', 'DEMO-1042', 'Total', '1,440.00'].map(line => <p key={line} className="gda-pane__line">{line}</p>)}
</div>;
const Consequence = ({ savedLeads }: { savedLeads: boolean }) => <Stage>
  <div className={`gda-panes gda-panes--${savedLeads ? 'saved' : 'source'}-wide`}>
    <SavedPane lead={savedLeads} /><SourcePane lead={!savedLeads} />
  </div>
</Stage>;

const specimens = [
  { id: 'check-density', do: () => <Stage mod="gda-band"><Figures /></Stage>, dont: () => <Stage mod="gda-band gda-forced"><Figures /></Stage> },
  { id: 'reduce-density', do: () => <Stage><Payouts /><Preview /></Stage>, dont: () => <Stage><Payouts /><Preview bad /></Stage> },
  { id: 'purposeful-accent', do: () => <Stage><Preview /></Stage>, dont: () => <Stage><Preview colourful /></Stage> },
  { id: 'follow-the-consequence', do: () => <Consequence savedLeads />, dont: () => <Consequence savedLeads={false} /> },
];

const meta: Meta = { title: 'Guidelines/Density and accents', parameters: { layout: 'fullscreen' } };
export default meta;

export const DensityAndAccents: StoryObj = {
  name: 'Density and accents',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} pageClass="gda-page" />,
};
