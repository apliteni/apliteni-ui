// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { DrawerPicture, GuidelinePage } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { KeyValueList } from '../../react/src/KeyValueList';
import { Snippet } from '../../react/src/Snippet';
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

// What each motion is written with.
const Durations = ({ rows }: { rows: [string, string, string][] }) => <div className="gl-stage"><div className="ui-card-stack"><RestingFilters search="Search motions" placeholder="Motion" label="Motion filters" /><table className="ui-table">
  <thead><tr><th>Motion</th><th>Written as</th><th className="ui-table__num">Time</th></tr></thead>
  <tbody>{rows.map(([what, token, time]) =>
    <tr key={what}><td>{what}</td><td>{token}</td><td className="ui-table__num">{time}</td></tr>)}</tbody>
</table></div></div>;
const Css = ({ code }: { code: string }) => <div className="gl-stage"><Snippet label="CSS" code={code} copy={false} /></div>;

const specimens = [
  { id: 'after-load', do: () => <Film frames={SLIDE} />, dont: () => <Film frames={JUMP} /> },
  { id: 'durations',
    do: () => <Durations rows={[['Button hover', '--dur-fast', '150 ms'], ['Drawer slide', '--dur-med', '250 ms'],
      ['Entrance', '--dur-slow', '400 ms'], ['Button press', '--dur-instant', '80 ms']]} />,
    dont: () => <Durations rows={[['Button hover', '--dur-fast', '150 ms'], ['Drawer slide', '300ms', '300 ms'],
      ['Entrance', '--dur-slow', '400 ms'], ['Button press', '--dur-instant', '80 ms']]} /> },
  { id: 'easing',
    do: () => <Css code={'.drawer__panel {\n  transition: transform\n    var(--dur-med)\n    var(--ease);\n}\n.drawer {\n  transition: visibility\n    var(--dur-med)\n    linear;\n}'} />,
    dont: () => <Css code={'.drawer__panel {\n  transition: transform\n    var(--dur-med)\n    ease;\n}\n.drawer {\n  transition: visibility\n    var(--dur-med)\n    ease;\n}'} /> },
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
