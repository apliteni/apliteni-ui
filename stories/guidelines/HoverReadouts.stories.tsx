// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, Raw, TipPicture } from '../_guideline';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_hover-readouts.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { EXPENSES, REVENUE, bars, eur, pointOf, sparkline } from '../_chart.js';

const content = await loadGuideline('hover-readouts.md', new URL('../../guidelines/hover-readouts.md', import.meta.url));

// Every readout below is drawn open, at the anchor the wiring would have measured,
// so the gates can read it. The charts are fixed-size for the same reason: a
// readout placed in pixels has to sit on a chart drawn in pixels.
const HOT = 10;
type Text = { label: string; value: string; detail: string };
const Host = ({ children }: { children: ReactNode }) => <div className="ui-tip-host" style={{ width: 'max-content' }}>{children}</div>;

// The KPI card from the finance portal's overview, and the card under it: the
// one that moves when a readout is written into the first.
const Kpis = ({ chart }: { chart: ReactNode }) => <div className="gh-stack">
  <Card title="Revenue" sub="Last 12 months"><p className="gh-figure">{eur(REVENUE[REVENUE.length - 1])}</p>{chart}</Card>
  <Card title="Expenses" sub="Last 12 months"><p className="gh-figure">{eur(EXPENSES[EXPENSES.length - 1])}</p></Card>
</div>;

const OverlayDo = () => {
  const s = sparkline({ hot: HOT });
  const p = s.at(HOT);
  return <Kpis chart={<Host><Raw html={s.svg} /><TipPicture {...pointOf(REVENUE, HOT)} x={p.x} y={p.top} /></Host>} />;
};
const OverlayDont = () => {
  const { label, value, detail }: Text = pointOf(REVENUE, HOT);
  return <Kpis chart={<><Raw html={sparkline({ hot: HOT }).svg} /><p className="gh-inline">{`${label}: ${value}, ${detail}`}</p></>} />;
};

const BarsOpen = ({ text = pointOf(REVENUE, HOT) }: { text?: Text }) => {
  const b = bars({ values: REVENUE, hot: HOT });
  const p = b.at(HOT);
  return <div className="gh-room gh-room--tall"><Host><Raw html={b.svg} /><TipPicture {...text} x={p.x} y={p.top} /></Host></div>;
};
const Clipped = ({ placement }: { placement: 'top' | 'bottom' }) => {
  const b = bars({ hot: HOT });
  const p = b.at(HOT);
  return <div className="gh-clip"><Host><Raw html={b.svg} />
    <TipPicture {...pointOf(REVENUE, HOT)} placement={placement} x={p.x} y={p.top} /></Host></div>;
};

const specimens = [
  { id: 'overlay', do: () => <OverlayDo />, dont: () => <OverlayDont /> },
  { id: 'above-the-mark', do: () => <Clipped placement="bottom" />, dont: () => <Clipped placement="top" /> },
  { id: 'contents', do: () => <BarsOpen />, dont: () => <BarsOpen text={{
    label: 'Revenue, all entities, EUR, including pending settlements, October 2025',
    value: '€49,300',
    detail: '+5.3% on September and +12.1% on October 2024, with 3 invoices pending. '
      + 'Click the bar to open the transactions.',
  }} /> },
  { id: 'on-touch' },
  { id: 'not-only-hover' },
];

const meta: Meta = { title: 'Guidelines/Hover readouts', parameters: { layout: 'fullscreen' } };
export default meta;

export const HoverReadouts: StoryObj = {
  name: 'Hover readouts',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
