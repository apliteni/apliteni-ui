// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Callout } from '../../react/src/primitives/Callout';
import { TextField } from '../../react/src/Field';
import { NavTabs } from '../../react/src/NavTabs';
import { Button } from '../../react/src/primitives/Button';
import { Snippet } from '../../react/src/Snippet';
import { Segmented } from '../../react/src/Segmented';
import { Card } from '../../react/src/primitives/Card';
import { Badge } from '../../react/src/primitives/Badge';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_colour-and-theming.js';

const content = await loadGuideline('colour-and-theming.md', new URL('../../guidelines/colour-and-theming.md', import.meta.url));

const Stage = ({ mod = '', children }: { mod?: string; children: ReactNode }) => <div className={`gl-stage ${mod}`}>{children}</div>;
const Note = () => <Callout variant="info">Rotating this token invalidates every client using it.</Callout>;
const BouncedEmail = () => <TextField label="Billing email" error="That address bounced twice this week." defaultValue="ops@acme.io" />;
const SelectionTabs = ({ badge }: { badge?: { text: string; tone: 'accent' } }) => <Stage>
  <NavTabs aria-label="Example views" active="activity" items={[
    { id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity', badge }]} />
</Stage>;

// A failing accent ground cannot be drawn live on this page without failing
// the contrast walk, so that half shows the code in the kit's Snippet.
const Code = ({ label = 'CSS', code }: { label?: string; code: string }) => <Snippet label={label} code={code} copy={false} />;
const GROUND_DONT = '.publish {\n  background: var(--accent);\n  color: #fff;\n}';
const CELLS = [['Dark', 'Nebula'], ['Dark', 'Ocean'], ['Light', 'Nebula'], ['Light', 'Ocean']];
const Checks = ({ checked }: { checked: number }) => <Card title="Theme checks">
  <table className="ui-table ui-table--dense">
    <thead><tr><th>Theme</th><th>Accent</th><th>Result</th></tr></thead>
    <tbody>{CELLS.map(([theme, accent], i) => <tr key={theme + accent}><td>{theme}</td><td>{accent}</td>
      <td>{i < checked ? <Badge variant="success">Checked</Badge> : <Badge variant="warn">Not checked</Badge>}</td></tr>)}</tbody>
  </table>
</Card>;
const SearchField = () => <TextField label="Search" defaultValue="Spring launch" />;
// `.gl-forced` paints the system colours that forced colours hands the page.
const ForcedSeg = ({ mod }: { mod: string }) => <Stage mod={`gl-forced ${mod}`}>
  <Segmented label="Period" value="week" onChange={() => {}} options={[
    { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
</Stage>;

// The frozen hexes in SPEC_CSS are the specimen's subject, not a slip: `.gl-literal`
// writes out what the dark theme composites, so the pair is one picture in dark
// and the flip to light is what separates them.
const specimens = [
  { id: 'tokens', do: () => <Stage><Note /></Stage>, dont: () => <Stage mod="gl-literal"><Note /></Stage> },
  { id: 'signals', do: () => <Stage><BouncedEmail /></Stage>, dont: () => <Stage mod="gl-drift"><BouncedEmail /></Stage> },
  { id: 'accent-strong', do: () => <Stage><Button variant="primary">Publish</Button></Stage>, dont: () => <Code code={GROUND_DONT} /> },
  { id: 'selection-accent', do: () => <SelectionTabs />, dont: () => <SelectionTabs badge={{ text: '3', tone: 'accent' }} /> },
  { id: 'both-themes', do: () => <Checks checked={4} />, dont: () => <Checks checked={1} /> },
  { id: 'text-surface', do: () => <Stage><SearchField /></Stage>, dont: () => <Stage mod="gl-grey"><SearchField /></Stage> },
  { id: 'selected-forced-colours', do: () => <ForcedSeg mod="gl-forced--fill" />, dont: () => <ForcedSeg mod="gl-forced--outline" /> },
];

const meta: Meta = { title: 'Guidelines/Colour and theming', parameters: { layout: 'fullscreen' } };
export default meta;

export const ColourAndTheming: StoryObj = {
  name: 'Colour and theming',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
