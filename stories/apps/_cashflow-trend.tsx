// A cashflow figure's trend, drawn by the kit spark Chart from cashflowStats' data.
import { Chart } from '../../react/src/Chart';

export type Trend = { title: string; name: string; labels: string[]; values: number[] };

const eur = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')} €`;

export const CashflowTrend = ({ trend }: { trend: Trend }) => <Chart variant="spark" title={trend.title}
  periods={trend.labels.map(label => ({ label }))} format={eur}
  series={[{ id: 'trend', name: trend.name, values: trend.values, shape: 'line', tone: 'accent' }]} />;
