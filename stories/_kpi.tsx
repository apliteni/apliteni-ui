// A stat band whose figures follow their trend: hover or step a point and its
// figure shows that point's value and period, then the total again on leave.
// The chart draws a dot on the point and no readout, so nothing covers the card.
// Give each figure a delta: the period takes its row, so the band keeps its height.
import { useState } from 'react';
import { Chart, type ChartActivePoint, type ChartTone } from '../react/src/Chart';
import { StatBand, type StatBandProps, type StatFigure } from '../react/src/primitives/StatBand';

export type KpiTrend = { title: string; name: string; labels: string[]; values: number[]; tone?: ChartTone };
export type KpiFigure = Omit<StatFigure, 'trend'> & { trend?: KpiTrend };

type Props = Omit<StatBandProps, 'stats'> & { stats: KpiFigure[]; format: (value: number) => string };

export function KpiBand({ stats, format, ...band }: Props) {
  const [active, setActive] = useState<{ at: number; point: ChartActivePoint } | null>(null);
  return <StatBand {...band} stats={stats.map(({ trend, ...figure }, i) => {
    const point = active?.at === i ? active.point : null;
    // A null from one chart clears only its own point, never a sibling's.
    const onActive = (next: ChartActivePoint | null) =>
      setActive(cur => (next ? { at: i, point: next } : cur?.at === i ? null : cur));
    return {
      ...figure,
      ...(point && { value: format(point.value), caption: point.period, delta: undefined }),
      trend: trend && <Chart variant="spark" title={trend.title} format={format} onActive={onActive}
        periods={trend.labels.map(label => ({ label }))}
        series={[{ id: 'trend', name: trend.name, values: trend.values, shape: 'line', tone: trend.tone ?? 'accent' }]} />,
    };
  })} />;
}
