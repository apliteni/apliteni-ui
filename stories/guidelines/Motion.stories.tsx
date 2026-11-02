// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { Fragment, type CSSProperties } from 'react';
import { GuidelinePage } from '../_guideline';
import { Snippet } from '../../react/src/Snippet';
import { Switch } from '../../react/src/Switch';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_motion.js';

const content = await loadGuideline('motion.md', new URL('../../guidelines/motion.md', import.meta.url));

// One frame of a drawer opening over a page: `at` is how far the panel has come, 0 to 1.
const Shot = ({ ms, at }: { ms: number; at: number }) => <li className="gm-shot">
  <div className="gm-frame" aria-hidden="true"
    style={{ '--gm-at': `${Math.round((1 - at) * 100)}%`, '--gm-shade': at } as CSSProperties}>
    <div className="gm-page">{Array.from({ length: 6 }, (_, i) => <div key={i} className="gm-ln" />)}</div>
    <div className="gm-scrim" />
    <div className="gm-panel"><div className="gm-panel__title" />{Array.from({ length: 4 }, (_, i) => <div key={i} className="gm-ln" />)}</div>
  </div>
  <span className="gm-time">{`${ms} ms`}</span>
</li>;
const Strip = ({ frames }: { frames: [number, number][] }) =>
  <ul className="gm-strip" style={{ '--gm-frames': frames.length } as CSSProperties} aria-label="A drawer opening, frame by frame">
    {frames.map(([ms, at]) => <Shot key={ms} ms={ms} at={at} />)}
  </ul>;
// The kit's 250ms drawer, and the same drawer arriving in the next frame.
const SLIDES: [number, number][] = [[0, 0], [125, 0.78], [250, 1]];
const JUMPS: [number, number][] = [[0, 0], [16, 1], [250, 1]];

const DURATIONS: [string, string, number][] = [['Button press', '--dur-instant', 80], ['Switch', '--dur-fast', 150],
  ['Drawer', '--dur-med', 250], ['Toast arriving', '--dur-slow', 400]];
const Durations = ({ off = false }: { off?: boolean }) => <div className="gl-stage"><div className="gm-dur">
  {DURATIONS.map(([name, token, ms]) => {
    const odd = off && name === 'Drawer';
    return <Fragment key={name}>
      <span>{name}</span><code>{odd ? '—' : token}</code><span className="gm-dur__ms">{`${odd ? 300 : ms} ms`}</span>
    </Fragment>;
  })}
</div></div>;

const curve = (ease: string, visibility: string) =>
  `.drawer-panel {\n  transition-property:\n    transform, visibility;\n  transition-duration:\n    var(--dur-med);\n  transition-timing-function:\n    ${ease}, ${visibility};\n}`;

const Reduced = ({ frames }: { frames: [number, number][] }) => <div className="gl-stage"><div className="gm-stack">
  <Switch defaultChecked label="Reduce motion" />
  <Strip frames={frames} />
</div></div>;

const specimens = [
  { id: 'after-load', do: () => <div className="gl-stage"><Strip frames={SLIDES} /></div>,
    dont: () => <div className="gl-stage"><Strip frames={JUMPS} /></div> },
  { id: 'durations', do: () => <Durations />, dont: () => <Durations off /> },
  { id: 'easing', do: () => <div className="gl-stage"><Snippet label="CSS" copy={false} code={curve('var(--ease)', 'linear')} /></div>,
    dont: () => <div className="gl-stage"><Snippet label="CSS" copy={false} code={curve('ease', 'ease')} /></div> },
  { id: 'reduced', do: () => <Reduced frames={[[0, 0], [16, 1]]} />, dont: () => <Reduced frames={SLIDES} /> },
];

const meta: Meta = { title: 'Guidelines/Motion', parameters: { layout: 'fullscreen' } };
export default meta;

export const Motion: StoryObj = {
  name: 'Motion',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
