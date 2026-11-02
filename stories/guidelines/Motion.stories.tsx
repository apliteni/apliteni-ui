// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { Fragment, type CSSProperties } from 'react';
import { GuidelinePage } from '../_guideline';
import { Switch } from '../../react/src/Switch';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_motion.js';

const content = await loadGuideline('motion.md', new URL('../../guidelines/motion.md', import.meta.url));

// One frame of a drawer opening over a page: `at` is how far the panel has come, 0 to 1.
// `vis`, when given, is the drawer's visibility at that time, 0 to 1, drawn as a bar under the frame.
const Shot = ({ ms, at, vis }: { ms: number; at: number; vis?: number }) => <li className="gm-shot">
  <div className="gm-frame" aria-hidden="true"
    style={{ '--gm-at': `${Math.round((1 - at) * 100)}%`, '--gm-shade': at } as CSSProperties}>
    <div className="gm-page">{Array.from({ length: 6 }, (_, i) => <div key={i} className="gm-ln" />)}</div>
    <div className="gm-scrim" />
    <div className="gm-panel"><div className="gm-panel__title" />{Array.from({ length: 4 }, (_, i) => <div key={i} className="gm-ln" />)}</div>
  </div>
  {vis === undefined ? null : <div className="gm-vis" aria-hidden="true" style={{ '--gm-vis': vis } as CSSProperties} />}
  <span className="gm-time">{`${ms} ms`}</span>
</li>;
const Strip = ({ frames, ghost = false }: { frames: [number, number, number?][]; ghost?: boolean }) =>
  <ul className={ghost ? 'gm-strip gm-ghost' : 'gm-strip'} style={{ '--gm-frames': frames.length } as CSSProperties}
    aria-label="A drawer opening, frame by frame">
    {frames.map(([ms, at, vis]) => <Shot key={ms} ms={ms} at={at} vis={vis} />)}
  </ul>;
// The kit's 250ms drawer, and the same drawer arriving in the next frame.
const SLIDES: [number, number][] = [[0, 0], [125, 0.78], [250, 1]];
const JUMPS: [number, number][] = [[0, 0], [16, 1], [250, 1]];

// The kit's durations as bars to scale, with a tick at each step: the press, the checkbox,
// the drawer and the scroll reveal each take their token. The off drawer is 300ms.
const DURATIONS: [string, string, number][] = [['Button press', '--dur-instant', 80], ['Checkbox', '--dur-fast', 150],
  ['Drawer', '--dur-med', 250], ['Scroll reveal', '--dur-slow', 400]];
const LONGEST = 400;
const pct = (ms: number) => `${(ms / LONGEST) * 100}%`;
const Durations = ({ off = false }: { off?: boolean }) => <div className="gl-stage"><div className="gm-dur">
  {DURATIONS.map(([name, token, ms]) => {
    const odd = off && name === 'Drawer';
    const len = odd ? 300 : ms;
    return <Fragment key={name}>
      <span className="gm-dur__name"><span>{name}</span>{odd ? null : <span className="gm-dur__token">{token}</span>}</span>
      <span className="gm-dur__track" aria-hidden="true">
        {DURATIONS.map(([, , step]) => <span key={step} className="gm-dur__tick" style={{ '--gm-tick': pct(step) } as CSSProperties} />)}
        <span className="gm-dur__bar" style={{ '--gm-len': pct(len) } as CSSProperties} />
      </span>
      <span className="gm-dur__ms">{`${len} ms`}</span>
    </Fragment>;
  })}
</div></div>;

// A curve's plot in a 100 by 100 box, time to the right and progress up.
const Plot = ({ name, role, bezier }: { name: string; role: string; bezier?: [number, number, number, number] }) => {
  const d = bezier
    ? `M0 100 C${bezier[0] * 100} ${100 - bezier[1] * 100} ${bezier[2] * 100} ${100 - bezier[3] * 100} 100 0`
    : 'M0 100 L100 0';
  return <li className="gm-plot">
    <span className="gm-plot__axis" aria-hidden="true">progress</span>
    <div className="gm-plot__box">
      <svg viewBox="-6 -6 112 112" role="img" aria-label={`${name}: progress over time`}><path d={d} /></svg>
      <span className="gm-plot__axis gm-plot__axis--x" aria-hidden="true">time</span>
    </div>
    <span className="gm-plot__name">{name}</span>
    <span className="gm-plot__role">{role}</span>
  </li>;
};
// The kit's --ease and --ease-out, and CSS ease, as cubic-bezier points.
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const EASE_OUT: [number, number, number, number] = [0, 0, 0.2, 1];
const CSS_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
// The 250ms drawer at four moments, with its visibility. A frame's offset is the curve at that time.
const KIT_FRAMES: [number, number, number][] = [[0, 0, 0], [83, 0.46, 1], [167, 0.92, 1], [250, 1, 1]];
const EASED_FRAMES: [number, number, number][] = [[0, 0, 0], [83, 0.58, 0.58], [167, 0.92, 0.92], [250, 1, 1]];
const Curves = ({ off = false }: { off?: boolean }) => <div className="gl-stage"><div className="gm-stack">
  <ul className="gm-plots" style={{ '--gm-plots': 3 } as CSSProperties} aria-label="Easing curves">
    {off
      ? <><Plot name="ease" role="Drawer" bezier={CSS_EASE} /><Plot name="ease" role="Visibility" bezier={CSS_EASE} /></>
      : <><Plot name="--ease" role="Drawer" bezier={EASE} /><Plot name="--ease-out" role="Content" bezier={EASE_OUT} />
        <Plot name="linear" role="Visibility" /></>}
  </ul>
  <Strip frames={off ? EASED_FRAMES : KIT_FRAMES} ghost={off} />
</div></div>;

const Reduced = ({ frames }: { frames: [number, number][] }) => <div className="gl-stage"><div className="gm-stack">
  <Switch defaultChecked label="Reduce motion" />
  <Strip frames={frames} />
</div></div>;

const specimens = [
  { id: 'after-load', do: () => <div className="gl-stage"><Strip frames={SLIDES} /></div>,
    dont: () => <div className="gl-stage"><Strip frames={JUMPS} /></div> },
  { id: 'durations', do: () => <Durations />, dont: () => <Durations off /> },
  { id: 'easing', do: () => <Curves />, dont: () => <Curves off /> },
  { id: 'reduced', do: () => <Reduced frames={[[0, 0], [16, 1]]} />, dont: () => <Reduced frames={SLIDES} /> },
];

const meta: Meta = { title: 'Guidelines/Motion', parameters: { layout: 'fullscreen' } };
export default meta;

export const Motion: StoryObj = {
  name: 'Motion',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
