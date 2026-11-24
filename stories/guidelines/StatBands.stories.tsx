// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GuidelinePage, Raw, TipPicture } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { Card } from '../../react/src/primitives/Card';
import { StatBand, type StatBandProps } from '../../react/src/primitives/StatBand';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_stat-bands.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { sparkline } from '../lib/sparkline.js';

const content = await loadGuideline('stat-bands.md', new URL('../../guidelines/stat-bands.md', import.meta.url));

// Every specimen is figures from the finance portal's Company Overview, so the
// halves of a pair differ in one decision and not in their data.
const Stage = ({ children }: { children: ReactNode }) => <div className="gs-stage">{children}</div>;
const BASIS = 'vs. previous 12 months';
// A change with a basis of its own keeps it, and takes no tooltip.
const Band = ({ id, stats, children }: { id: string; stats: StatBandProps['stats']; children?: ReactNode }) => <Stage>
  <p className="ui-sr" id={`${id}-basis`}>{BASIS}</p>
  <StatBand id={id} basisId={`${id}-basis`} stats={stats.map(figure => (
    figure.delta && !figure.delta.basis ? { ...figure, delta: { tooltip: BASIS, ...figure.delta } } : figure))} />
  {children}
</Stage>;
// The first change's tooltip, held open where its wiring puts it: centred over the change and
// kept inside the stage, as the wiring keeps it inside the view. Placed again when a width moves it.
const OpenTip = ({ label }: { label: string }) => {
  const box = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const stage = box.current?.closest('.gs-stage');
    const mark = stage?.querySelector('.ui-stat__delta .ui-tip-host > .ui-focusable');
    if (!stage || !mark) return;
    const place = () => {
      const s = stage.getBoundingClientRect(), m = mark.getBoundingClientRect();
      const half = (box.current?.querySelector<HTMLElement>('.ui-tip')?.offsetWidth ?? 0) / 2;
      const centre = m.left + m.width / 2 - s.left - stage.clientLeft;
      setAt({ x: Math.max(half, Math.min(centre, stage.clientWidth - half)), y: m.top - s.top - stage.clientTop });
    };
    place();
    if (typeof ResizeObserver !== 'function') return;
    const seen = new ResizeObserver(place);
    [stage, mark].forEach(el => seen.observe(el));
    return () => seen.disconnect();
  }, []);
  return <span ref={box}>{at && <TipPicture label={label} x={at.x} y={at.y} />}</span>;
};
const INCOME = [412, 455, 430, 498, 520, 505, 560, 548, 590, 610, 587, 640];
type Tone = 'good' | 'bad';
const toned = (id: string, tones: (Tone | undefined)[]) => <Band id={id} stats={[
  { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: tones[0] } },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: tones[1] } },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%', tone: tones[2] } },
  { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: tones[3] } },
]} />;

const specimens = [
  { id: 'a-band-not-a-card',
    do: () => <Band id="gs-band-do" stats={[
      { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' },
        trend: <Raw html={sparkline(INCOME, 'Income, last 12 months')} /> },
      { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
    ]} />,
    dont: () => <Stage><Card>
      <div className="ui-eyebrow">Income</div><div className="ui-card__title">€ 6,459,401</div><Badge>+47.1%</Badge>
    </Card></Stage> },
  { id: 'tone-not-direction',
    do: () => toned('gs-tone-do', ['good', 'bad', undefined, 'good']),
    dont: () => toned('gs-tone-dont', ['good', 'good', 'good', 'bad']) },
  { id: 'say-the-basis',
    do: () => <Band id="gs-basis-do" stats={[
      { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' } },
      { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
      { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', basis: 'against plan' } },
    ]}><OpenTip label={BASIS} /></Band>,
    dont: () => <Stage><StatBand id="gs-basis-dont" stats={[
      { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' } },
      { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
      { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%' } },
    ]} /></Stage> },
];

const meta: Meta = { title: 'Guidelines/Stat bands', parameters: { layout: 'fullscreen' } };
export default meta;

export const StatBands: StoryObj = {
  name: 'Stat bands',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
