// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, Raw, TipPicture } from '../_guideline';
import { KeyValueList } from '../../react/src/KeyValueList';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_hover-readouts.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { EXPENSES, MONTHS, REVENUE, bars, eur, pointOf, sparkline } from '../_chart.js';

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
  <Card title="Revenue"><p className="gh-figure">{eur(REVENUE[REVENUE.length - 1])}</p>{chart}</Card>
  <Card title="Expenses"><p className="gh-figure">{eur(EXPENSES[EXPENSES.length - 1])}</p></Card>
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

// A touch screen has no hover: the do half opens on the tap, the don't half waits
// for a hover that never comes.
const Tapped = ({ open }: { open: boolean }) => {
  const b = bars({ values: REVENUE, hot: open ? HOT : -1 });
  const p = b.at(HOT);
  return <div className="gh-room gh-room--tall"><Host><Raw html={b.svg} />
    {open && <TipPicture {...pointOf(REVENUE, HOT)} x={p.x} y={p.top} />}</Host>
    <div className="gl-cursor">{open ? 'Finger tapped October, tap again to close' : 'Finger tapped October, nothing opens'}</div></div>;
};

// A year of made-up daily revenue, drawn as one line with no figure beside it.
const DAILY = Array.from({ length: 365 }, (_, i) => 1300 + 220 * Math.sin(i / 9) + 160 * Math.sin(i / 2.3) + i * 0.8);
const dailyLine = () => {
  const w = 260, h = 64, lo = Math.min(...DAILY), hi = Math.max(...DAILY);
  const pts = DAILY.map((v, i) => `${(i * w / (DAILY.length - 1)).toFixed(1)} ${(4 + (hi - v) / (hi - lo) * (h - 8)).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  return `<svg class="ch-chart" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Revenue per day, last 365 days">`
    + `<path class="ch-area" d="${line} L${w} ${h} L0 ${h} Z"></path><path class="ch-line" d="${line}"></path></svg>`;
};
const top = REVENUE.indexOf(Math.max(...REVENUE));
const low = REVENUE.indexOf(Math.min(...REVENUE));
const Reachable = () => {
  const b = bars({ values: REVENUE, hot: HOT });
  const p = b.at(HOT);
  return <Card title="Revenue"><p className="gh-figure">{eur(REVENUE[REVENUE.length - 1])}</p>
    <div className="gh-room"><Host><Raw html={b.svg} /><TipPicture {...pointOf(REVENUE, HOT)} x={p.x} y={p.top} /></Host></div>
    <KeyValueList rows={[
      { label: 'Highest', value: `${eur(REVENUE[top])} in ${MONTHS[top]}` },
      { label: 'Lowest', value: `${eur(REVENUE[low])} in ${MONTHS[low]}` },
    ]} />
    <div className="gl-cursor">Finger tapped October</div></Card>;
};
const HoverOnly = () => <Card title="Revenue"><Raw html={dailyLine()} />
  <div className="gl-cursor">Each day’s value only under the pointer</div></Card>;

const specimens = [
  { id: 'overlay', do: () => <OverlayDo />, dont: () => <OverlayDont /> },
  { id: 'above-the-mark', do: () => <Clipped placement="bottom" />, dont: () => <Clipped placement="top" /> },
  { id: 'contents', do: () => <BarsOpen />, dont: () => <BarsOpen text={{
    label: 'Revenue, all entities, EUR, including pending settlements, October 2025',
    value: '€49,300',
    detail: '+5.3% on September and +12.1% on October 2024, with 3 invoices pending. '
      + 'Click the bar to open the transactions.',
  }} /> },
  { id: 'on-touch', do: () => <Tapped open />, dont: () => <Tapped open={false} /> },
  { id: 'not-only-hover', do: () => <Reachable />, dont: () => <HoverOnly /> },
];

const meta: Meta = { title: 'Guidelines/Hover readouts', parameters: { layout: 'fullscreen' } };
export default meta;

export const HoverReadouts: StoryObj = {
  name: 'Hover readouts',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
