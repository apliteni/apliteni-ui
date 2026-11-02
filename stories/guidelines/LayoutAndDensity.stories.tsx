// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_layout-and-density.js';

const content = await loadGuideline('layout-and-density.md', new URL('../../guidelines/layout-and-density.md', import.meta.url));

// Rows in a card, because density is a rhythm and a rhythm needs more than one row
// to be visible. `.gl-rows--hand` is the don't: its gaps are picked by hand.
const ROWS = [['Requests', '1,284,902'], ['Unique visitors', '96,417'], ['Conversion', '3.42%'], ['Revenue', '$18,204.60']];
const Rows = ({ mod = '' }: { mod?: string }) => <div className={`gl-rows ${mod}`}>{ROWS.map(([k, v]) =>
  <div key={k} className="gl-row"><span className="gl-row__k">{k}</span><span className="gl-row__v">{v}</span></div>)}</div>;
const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;

// Drawn to scale against the same reference so the two bars are comparable:
// --container is the full cell, --measure is 860/1120 of it.
const Bar = ({ label, pct, tok = false }: { label: string; pct: number; tok?: boolean }) => <div className="gl-bar">
  <span className={`gl-bar__fill${tok ? ' gl-bar__fill--tok' : ''}`} style={{ width: `${pct}%` }} />
  <span className="gl-bar__t">{label}</span>
</div>;

// A page drawn to scale: the frame is --container, the sidebar 260/1120 of it.
const Lines = ({ n = 4 }: { n?: number }) => <div className="gl-lines">{Array.from({ length: n }, (_, i) => <span key={i} />)}</div>;
const PageFrame = ({ label, pct = 100, side = false }: { label: string; pct?: number; side?: boolean }) =>
  <div className="gl-scale"><span className="gl-bar__t">{label}</span>
    <div className={`gl-frame${side ? ' gl-frame--side' : ''}`} style={{ width: `${pct}%` }}>
      {side && <span className="gl-frame__side" />}<Lines /></div></div>;

// A mini page at two viewport widths. `stack` is what the query does at the narrow one.
const Viewports = ({ query, stack }: { query: string; stack: boolean }) => <Stage>
  <div className="gl-views">
    {[['1280px', false], ['390px', stack]].map(([w, s]) => <div key={String(w)} className="gl-scale">
      <span className="gl-bar__t">{w}</span>
      <div className={`gl-frame gl-frame--two${s ? ' gl-frame--stack' : ''}`}><Lines n={3} /><Lines n={3} /></div>
    </div>)}
  </div>
  <div className="gl-scale gl-views__q"><span className="gl-bar__t">{query}</span></div>
</Stage>;

const specimens = [
  { id: 'container',
    do: () => <Stage><div className="gl-scale"><Bar label="--container" pct={100} tok /><Bar label="--measure" pct={76.8} tok /></div></Stage>,
    dont: () => <Stage><div className="gl-scale"><Bar label="1180px" pct={100} /><Bar label="1120px" pct={94.9} />
      <Bar label="1080px" pct={91.5} /><Bar label="860px" pct={72.9} /></div></Stage> },
  { id: 'measure',
    do: () => <Stage><PageFrame label="--container, with --measure beside the sidebar" side /></Stage>,
    dont: () => <Stage><div className="gl-scale gl-scale--wide"><PageFrame label="page at --container" />
      <PageFrame label="page at --measure" pct={76.8} /></div></Stage> },
  { id: 'density',
    do: () => <Stage><Card title="Last 7 days"><Rows /></Card></Stage>,
    dont: () => <Stage><Card title="Last 7 days"><Rows mod="gl-rows--hand" /></Card></Stage> },
  { id: 'below-the-page',
    do: () => <Stage><div className="gl-scale"><Bar label="--panel-sm" pct={57.1} tok /><Bar label="--panel-md" pct={75} tok />
      <Bar label="--panel-lg" pct={100} tok /></div>
      <p className="gl-prose">A caption line stops at 44 characters of its own type.</p>
      <span className="gl-bar__t">--prose-caption</span></Stage>,
    dont: () => <Stage><div className="gl-scale"><Bar label="--prose-md" pct={75} /></div>
      <div className="gl-prose gl-prose--wrapper"><h3>Quarterly revenue by region</h3>
        <p>One ch width on the wrapper, two font sizes inside it.</p></div>
      <span className="gl-bar__t">62ch on the wrapper</span></Stage> },
  { id: 'breakpoints',
    do: () => <Viewports query="@media (max-width: 860px)" stack />,
    dont: () => <Viewports query="@media (max-width: var(--panel-lg))" stack={false} /> },
];

const meta: Meta = { title: 'Guidelines/Layout and density', parameters: { layout: 'fullscreen' } };
export default meta;

export const LayoutAndDensity: StoryObj = {
  name: 'Layout and density',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
