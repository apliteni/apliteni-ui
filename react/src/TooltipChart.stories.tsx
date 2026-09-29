import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TooltipHost } from './Tooltip';
import { Card } from './primitives/Card';
import './TooltipChart.css';

// The same fabricated series as the vanilla Tooltip showcase.
const months = ['Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025',
  'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025'];
const revenue = [38240, 40110, 39420, 42810, 41030, 44620, 46210, 45140, 47930, 46820, 49300, 48210];
const expenses = [29870, 30410, 31220, 30980, 32140, 31760, 32900, 33410, 32780, 33950, 34120, 31870];
const net = revenue.map((amount, i) => amount - expenses[i]);
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

function Series({ values = revenue, width = 720, height = 200, line = false, label, fluid = true }: {
  values?: number[]; width?: number; height?: number; line?: boolean; label: string; fluid?: boolean;
}) {
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  const step = (width - 12) / (values.length - 1);
  const points = values.map((value, i) => ({ x: rounded(6 + i * step), y: rounded(6 + (hi - value) / (hi - lo || 1) * (height - 12)) }));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const slot = width / values.length;
  const barWidth = rounded(slot * 0.62);
  return <svg className={`ch-chart${fluid ? ' ch-chart--fluid' : ''}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img"
    aria-label={`${label}: ${values.map((v, i) => `${months[i]} ${eur(v)}`).join(', ')}`}>
    {line && <><path className="ch-area" d={`${path} L${points[points.length - 1].x} ${height} L${points[0].x} ${height} Z`} /><path className="ch-line" d={path} /></>}
    {values.map((value, i) => {
      const x = rounded(i * slot + (slot - barWidth) / 2);
      const top = rounded(height - value / hi * (height - 2));
      return <g key={months[i]} {...content(values, i)}>
        <rect className="ch-hit" x={line ? rounded(points[i].x - step / 2) : rounded(i * slot)} y={0} width={line ? rounded(step) : rounded(slot)} height={height} />
        {line ? <circle className="ch-dot" data-tip-anchor="" cx={points[i].x} cy={points[i].y} r={3.5} /> : <>
          <rect className="ch-bar" x={x} y={top} width={barWidth} height={rounded(height - top)} rx={2} />
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

function PlacementExample({ below = false }: { below?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    host.current!.querySelectorAll('[data-tip-value]')[10].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }, []);
  return <div className="tt-room"><div className={below ? 'tt-clip' : undefined}>
    <TooltipHost ref={host} style={{ width: 'max-content' }}>
      <Series width={260} height={110} fluid={false} label="Revenue by month" />
    </TooltipHost>
  </div></div>;
}

const meta: Meta<typeof TooltipHost> = { title: 'React/Tooltip readout', component: TooltipHost, parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof TooltipHost>;
export const Chart: Story = { render: () => <ReadoutChart /> };
export const Playground: Story = { render: () => <div className="tooltip-gallery"><PlacementExample /></div> };
export const Placement: Story = { render: () => <div className="tooltip-gallery tooltip-placement">
  <div><p>Above the mark — the default</p><PlacementExample /></div>
  <div><p>Below — where above is clipped</p><PlacementExample below /></div>
</div> };
