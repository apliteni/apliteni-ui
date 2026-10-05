import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TooltipHost, TooltipPicture } from './Tooltip';
import { Card } from './primitives/Card';
import './TooltipChart.css';

// The readout over two kinds of chart. Chart is live — every point and bar there
// answers a real pointer. Playground and Placement are rendered open, which is
// what the a11y and contrast gates can see; their hosts leave off
// [data-tip-host], so no wiring reaches them and a passing pointer cannot take
// the readout down. Tooltip.specimens.test.tsx holds that.

// The same fabricated series as the vanilla Tooltip showcase.
const months = ['Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025',
  'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025'];
const revenue = [38240, 40110, 39420, 42810, 41030, 44620, 46210, 45140, 47930, 46820, 49300, 48210];
const expenses = [29870, 30410, 31220, 30980, 32140, 31760, 32900, 33410, 32780, 33950, 34120, 31870];
const net = revenue.map((amount, i) => amount - expenses[i]);
const HOT = 10;
const eur = (amount: number) => `${amount < 0 ? '−' : ''}€${Math.abs(amount).toLocaleString('en-US')}`;
const rounded = (amount: number) => Math.round(amount * 10) / 10;
function content(values: number[], i: number) {
  const delta = i ? (values[i] - values[i - 1]) / Math.abs(values[i - 1]) * 100 : 0;
  return {
    'data-tip-label': months[i],
    'data-tip-value': eur(values[i]),
    'data-tip-detail': i ? `${delta < 0 ? '−' : '+'}${Math.abs(delta).toFixed(1)}% on ${months[i - 1].split(' ')[0]}` : undefined,
  };
}
// What a mark says, as the readout's own props rather than the mark's attributes.
function pointOf(values: number[], i: number) {
  const parts = content(values, i);
  return { label: parts['data-tip-label'], value: parts['data-tip-value'], detail: parts['data-tip-detail'] ?? '' };
}

// Bar geometry, shared by the chart and by the picture that places a readout on
// one of its bars. A bar's anchor is its top edge, so a readout flipping below
// opens over the bar rather than under the axis.
const slotOf = (values: number[], width: number) => width / values.length;
function barAt(values: number[], width: number, height: number, i: number) {
  const slot = slotOf(values, width);
  return { x: rounded(i * slot + slot / 2), top: rounded(height - values[i] / Math.max(...values) * (height - 2)) };
}

function Series({ values = revenue, width = 720, height = 200, line = false, label, fluid = true, hot = -1 }: {
  values?: number[]; width?: number; height?: number; line?: boolean; label: string; fluid?: boolean; hot?: number;
}) {
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  const step = (width - 12) / (values.length - 1);
  const points = values.map((value, i) => ({ x: rounded(6 + i * step), y: rounded(6 + (hi - value) / (hi - lo || 1) * (height - 12)) }));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const slot = slotOf(values, width);
  const barWidth = rounded(slot * 0.62);
  return <svg className={`ch-chart${fluid ? ' ch-chart--fluid' : ''}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img"
    aria-label={`${label}: ${values.map((v, i) => `${months[i]} ${eur(v)}`).join(', ')}`}>
    {line && <><path className="ch-area" d={`${path} L${points[points.length - 1].x} ${height} L${points[0].x} ${height} Z`} /><path className="ch-line" d={path} /></>}
    {values.map((value, i) => {
      const x = rounded(i * slot + (slot - barWidth) / 2);
      const top = barAt(values, width, height, i).top;
      const on = i === hot ? ' is-on' : '';
      return <g key={months[i]} {...content(values, i)}>
        <rect className="ch-hit" x={line ? rounded(points[i].x - step / 2) : rounded(i * slot)} y={0} width={line ? rounded(step) : rounded(slot)} height={height} />
        {line ? <circle className={`ch-dot${on}`} data-tip-anchor="" cx={points[i].x} cy={points[i].y} r={3.5} /> : <>
          <rect className={`ch-bar${on}`} x={x} y={top} width={barWidth} height={rounded(height - top)} rx={2} />
          <rect className="ch-cap" data-tip-anchor="" x={x} y={top} width={barWidth} height={0} />
        </>}
      </g>;
    })}
  </svg>;
}

function ReadoutChart() {
  return <div className="tooltip-gallery"><div className="tt-page">
    <div className="tt-kpis">{[['Revenue', revenue], ['Expenses', expenses], ['Net', net]].map(([title, values]) =>
      <Card key={title as string} title={title as string} sub="Last 12 months">
        <p className="tt-figure">{eur((values as number[])[11])}</p>
        <TooltipHost><Series values={values as number[]} line width={240} height={56} label={`${title}, last 12 months`} /></TooltipHost>
      </Card>)}</div>
    <Card title="Revenue by month" sub="Hover a bar. The first and last slide inward rather than leave the card.">
      <TooltipHost><Series label="Revenue by month, last 12 months" /></TooltipHost>
    </Card>
    <Card title="Below the charts"><p className="tt-note">This card does not move when a readout opens above it. Nothing on the page does.</p></Card>
  </div></div>;
}

// A picture of the readout on the October bar: the bar carries the accent so the
// readout visibly belongs to it, and no wiring reaches the host. `clip` is the box
// that hides its overflow, which is what sends the readout below the mark; it sits
// inside .tt-room so the room above the chart is outside the clip, as the vanilla
// showcase does it.
function Picture({ placement = 'top', clip = false, ...parts }: {
  placement?: 'top' | 'bottom'; clip?: boolean; label?: string; value?: string; detail?: string;
}) {
  const width = 260;
  const height = 110;
  const mark = barAt(revenue, width, height, HOT);
  const picture = <TooltipPicture x={mark.x} y={mark.top} placement={placement} {...parts} style={{ width: 'max-content' }}>
    <Series width={width} height={height} fluid={false} hot={HOT} label="Revenue by month" />
  </TooltipPicture>;
  return <div className="tt-room">{clip ? <div className="tt-clip">{picture}</div> : picture}</div>;
}

const Specimen = ({ label, children }: { label: string; children: ReactNode }) =>
  <div className="tt-specimen"><div className="tt-specimen__label">{label}</div>{children}</div>;

type PlaygroundArgs = { label: string; value: string; detail: string; placement: 'top' | 'bottom' };

const meta: Meta<PlaygroundArgs> = {
  title: 'React/Tooltip readout',
  parameters: { layout: 'fullscreen' },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    detail: { control: 'text' },
    placement: { control: 'inline-radio', options: ['top', 'bottom'] },
  },
  args: { ...pointOf(revenue, HOT), placement: 'top' },
  render: (args) => <div className="tooltip-gallery"><Picture {...args} /></div>,
};
export default meta;
type Story = StoryObj<PlaygroundArgs>;

export const Playground: Story = {};

// The case #282 was reported against: KPI cards with sparklines above a bar
// chart. Hover any point or bar — the readout opens over the page, and the card
// under the charts stays exactly where it was.
export const Chart: Story = { render: () => <ReadoutChart /> };

// The two sides, rendered open. Below is what the wiring picks when the side
// above would be clipped — here by a box that hides its overflow.
export const Placement: Story = {
  // Two elements, as the vanilla gallery has them: pad() is the canvas that fills
  // the viewport, row() is a content-height flex row. On one element the row's
  // min-height is the viewport's, and at a phone width its two wrapped lines are
  // stretched a screen apart.
  render: () => <div className="tooltip-gallery">
    <div className="tooltip-placement">
      <Specimen label="Above the mark — the default"><Picture {...pointOf(revenue, HOT)} /></Specimen>
      <Specimen label="Below — where above is clipped">
        <Picture {...pointOf(revenue, HOT)} placement="bottom" clip />
      </Specimen>
    </div>
  </div>,
};
