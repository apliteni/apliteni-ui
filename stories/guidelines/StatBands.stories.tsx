// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, Raw } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { Card } from '../../react/src/primitives/Card';
import { StatBand } from '../../react/src/primitives/StatBand';
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
const BASIS = 'Change against the previous 12 months';
const INCOME = [412, 455, 430, 498, 520, 505, 560, 548, 590, 610, 587, 640];
type Tone = 'good' | 'bad';
const toned = (id: string, tones: (Tone | undefined)[]) => <Stage><StatBand id={id} basis={BASIS} stats={[
  { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: tones[0] } },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: tones[1] } },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%', tone: tones[2] } },
  { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: tones[3] } },
]} /></Stage>;

const specimens = [
  { id: 'a-band-not-a-card',
    do: () => <Stage><StatBand id="gs-band-do" basis={BASIS} stats={[
      { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' },
        trend: <Raw html={sparkline(INCOME, 'Income, last 12 months')} /> },
      { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
    ]} /></Stage>,
    dont: () => <Stage><Card>
      <div className="ui-eyebrow">Income</div><div className="ui-card__title">€ 6,459,401</div><Badge>+47.1%</Badge>
    </Card></Stage> },
  { id: 'tone-not-direction',
    do: () => toned('gs-tone-do', ['good', 'bad', undefined, 'good']),
    dont: () => toned('gs-tone-dont', ['good', 'good', 'good', 'bad']) },
  { id: 'say-the-basis' },
];

const meta: Meta = { title: 'Guidelines/Stat bands', parameters: { layout: 'fullscreen' } };
export default meta;

export const StatBands: StoryObj = {
  name: 'Stat bands',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
