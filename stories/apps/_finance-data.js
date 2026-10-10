import { sparkline } from '../lib/sparkline.js';

// Fabricated monthly cashflow, July 2024 through June 2026, in EUR.
const MONTHS = [
  [36000, 25000], [39000, 27000], [38000, 28000], [42000, 26000],
  [45000, 29000], [44000, 28000], [47000, 30000], [48000, 31000],
  [50000, 29000], [51000, 31000], [53000, 32000], [55000, 30000],
  [41200, 29800], [45500, 30400], [43000, 31200], [49800, 30900],
  [52000, 32100], [50500, 31700], [56000, 32900], [54800, 33400],
  [59000, 32700], [61000, 33900], [58700, 34100], [64000, 31800],
];
export const PERIODS = ['3M', '6M', '1Y', 'All'];
const lengths = { '3M': 3, '6M': 6, '1Y': 12, All: 24 };
export const money = value => `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('en-US')} €`;
const total = rows => rows.reduce((sum, row) => sum.map((n, i) => n + row[i]), [0, 0]);

export function cashflowStats(period = '1Y', trends = false) {
  const length = lengths[period];
  const rows = MONTHS.slice(-length);
  const previous = MONTHS.slice(-length * 2, -length);
  const [income, expense] = total(rows);
  const [oldIncome, oldExpense] = total(previous);
  return [
    ['Money in', income, oldIncome, 0],
    ['Money out', expense, oldExpense, 1],
    ['Net result', income - expense, oldIncome - oldExpense, 'net'],
  ].map(([label, value, old, column]) => {
    const change = old ? (value - old) / Math.abs(old) * 100 : 0;
    // Net's own trend is each month's income less its expense, not a column of
    // the table: it has none, and leaving it untraced left its tile 48px short
    // of the two beside it. why: PR #552 design re-review, finding D
    const trendValues = column === 'net' ? rows.map(row => row[0] - row[1]) : rows.map(row => row[column]);
    return { label, value: money(value),
      ...(trends && previous.length === length ? {
        delta: { value: `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)}%`,
          tone: label === 'Net result' ? 'neutral' : (column === 0 ? change >= 0 : change <= 0) ? 'good' : 'bad' },
      } : {}),
      ...(trends ? {
        trend: sparkline(trendValues, `${label}, last ${length} months`),
      } : {}),
    };
  });
}

export const periodBasis = period => period === 'All'
  ? 'All available months, July 2024 through June 2026.'
  : `Each change is measured against the ${lengths[period]} months before the selected period.`;
export const periodStart = period => ({ '3M': '2026-04-01', '6M': '2026-01-01', '1Y': '2025-07-01', All: '2024-07-01' })[period];
