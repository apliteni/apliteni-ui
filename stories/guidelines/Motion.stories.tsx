// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { DrawerPicture, GuidelinePage } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { KeyValueList } from '../../react/src/KeyValueList';
import { RestingFilters } from '../_table-filters';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_motion.js';

const content = await loadGuideline('motion.md', new URL('../../guidelines/motion.md', import.meta.url));

// A drawer opening, as still frames at the times printed above them. A closed
// drawer is hidden, so the first frame is the page alone. The half frame draws the
// panel and the scrim where --ease has them at that time.
type Step = 'closed' | 'half' | 'open';
const Page = () => <div className="ui-card-stack"><RestingFilters search="Search payouts" placeholder="ID" label="Payout filters" /><table className="ui-table">
  <thead><tr><th>ID</th><th className="ui-table__num">Net</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>1162</td><td className="ui-table__num">14,942.27</td><td><Badge variant="success">Paid</Badge></td></tr>
    <tr><td>1161</td><td className="ui-table__num">9,310.00</td><td><Badge variant="success">Paid</Badge></td></tr>
  </tbody>
</table></div>;
const Film = ({ frames }: { frames: [string, Step][] }) => <div className="gm-film">
  {frames.map(([time, step]) => [
    <p key={`${time}-t`}>{time}</p>,
    <div key={time} className={`gl-stage gm-frame${step === 'half' ? ' gm-frame--half' : ''}`}>
      <Page />
      {step !== 'closed' && <DrawerPicture title="Payout 1162">
        <KeyValueList rows={[{ label: 'Net', value: '14,942.27' }, { label: 'Status', value: 'Paid' }]} />
      </DrawerPicture>}
    </div>,
  ])}
</div>;
const SLIDE: [string, Step][] = [['0 ms', 'closed'], ['125 ms, 78% of the way', 'half'], ['250 ms', 'open']];
const JUMP: [string, Step][] = [['0 ms', 'closed'], ['16 ms, the next frame', 'open']];

// A count that changes in place: cross-faded over 150ms, or snapped in one frame.
const CountFilm = ({ fade }: { fade: boolean }) => {
  const frames: [string, string, number][] = fade
    ? [['0 ms', '14,941.27', 1], ['75 ms, both show', '14,942.27', 0.55], ['150 ms', '14,942.27', 1]]
    : [['0 ms', '14,941.27', 1], ['16 ms, the next frame', '14,942.27', 1]];
  return <div className="gm-film">
    {frames.map(([time, value, opacity]) => [
      <p key={`${time}-t`}>{time}</p>,
      <div key={time} className="gl-stage gm-frame">
        <div className="ui-stats ui-stats--open"><div className="ui-stats__list"><div className="ui-stat">
          <dt className="ui-stat__label">Paid this month</dt>
          <dd className="ui-stat__value" style={{ opacity }}>{value}</dd>
        </div></div></div>
      </div>,
    ])}
  </div>;
};

// What each motion is written with.
const Durations = ({ rows }: { rows: [string, string, string][] }) => <div className="gl-stage"><div className="ui-card-stack"><RestingFilters search="Search motions" placeholder="Motion" label="Motion filters" /><table className="ui-table">
  <thead><tr><th>Motion</th><th>Written as</th><th className="ui-table__num">Time</th></tr></thead>
  <tbody>{rows.map(([what, token, time]) =>
    <tr key={what}><td>{what}</td><td>{token}</td><td className="ui-table__num">{time}</td></tr>)}</tbody>
</table></div></div>;
// A curve's plot in a 100 by 100 box, time to the right and progress up.
type Bezier = [number, number, number, number];
const Plot = ({ name, role, bezier }: { name: string; role: string; bezier?: Bezier }) => {
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
const EASE: Bezier = [0.4, 0, 0.2, 1];
const EASE_OUT: Bezier = [0, 0, 0.2, 1];
const CSS_EASE: Bezier = [0.25, 0.1, 0.25, 1];

// A small drawer over a page at one time: `at` is how far the panel has come, 0 to 1.
// Visibility is discrete, so the caption under a frame only steps from hidden to visible.
const Shot = ({ ms, at, vis }: { ms: number; at: number; vis: boolean }) => <li className="gm-shot">
  <div className="gm-mini" aria-hidden="true"
    style={{ '--gm-at': `${Math.round((1 - at) * 100)}%`, '--gm-shade': at } as CSSProperties}>
    <div className="gm-mini__page">{Array.from({ length: 6 }, (_, i) => <div key={i} className="gm-ln" />)}</div>
    <div className="gm-mini__scrim" />
    <div className="gm-mini__panel"><div className="gm-mini__title" />{Array.from({ length: 4 }, (_, i) => <div key={i} className="gm-ln" />)}</div>
  </div>
  <span className="gm-time">{`${ms} ms`}</span>
  <span className="gm-time">{vis ? 'visible' : 'hidden'}</span>
</li>;
// The 250ms drawer at four moments. A frame's offset is the curve at that time:
// --ease is at 45% and 92% after a third and two thirds, CSS ease at 57% and 93%.
const KIT_FRAMES: [number, number, boolean][] = [[0, 0, false], [83, 0.45, true], [167, 0.92, true], [250, 1, true]];
const EASED_FRAMES: [number, number, boolean][] = [[0, 0, false], [83, 0.57, true], [167, 0.93, true], [250, 1, true]];
const Curves = ({ off = false }: { off?: boolean }) => <div className="gl-stage"><div className="gm-curves">
  <ul className="gm-plots" aria-label="Easing curves">
    {off
      ? <><Plot name="ease" role="Drawer" bezier={CSS_EASE} /><Plot name="ease" role="Visibility" bezier={CSS_EASE} /></>
      : <><Plot name="--ease" role="Drawer" bezier={EASE} /><Plot name="--ease-out" role="Content" bezier={EASE_OUT} />
        <Plot name="linear" role="Visibility" /></>}
  </ul>
  <ul className="gm-strip" aria-label="A drawer opening, frame by frame">
    {(off ? EASED_FRAMES : KIT_FRAMES).map(([ms, at, vis]) => <Shot key={ms} ms={ms} at={at} vis={vis} />)}
  </ul>
</div></div>;

const specimens = [
  { id: 'after-load', do: () => <Film frames={SLIDE} />, dont: () => <Film frames={JUMP} /> },
  { id: 'every-change', do: () => <CountFilm fade />, dont: () => <CountFilm fade={false} /> },
  { id: 'durations',
    do: () => <Durations rows={[['Button hover', '--dur-fast', '150 ms'], ['Drawer slide', '--dur-med', '250 ms'],
      ['Entrance', '--dur-slow', '400 ms'], ['Button press', '--dur-instant', '80 ms']]} />,
    dont: () => <Durations rows={[['Button hover', '--dur-fast', '150 ms'], ['Drawer slide', '300ms', '300 ms'],
      ['Entrance', '--dur-slow', '400 ms'], ['Button press', '--dur-instant', '80 ms']]} /> },
  { id: 'easing', do: () => <Curves />, dont: () => <Curves off /> },
  { id: 'reduced',
    do: () => <><p>Reduced motion requested</p><Film frames={JUMP} /></>,
    dont: () => <><p>Reduced motion requested</p><Film frames={SLIDE} /></> },
];

const meta: Meta = { title: 'Guidelines/Motion', parameters: { layout: 'fullscreen' } };
export default meta;

export const Motion: StoryObj = {
  name: 'Motion',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
