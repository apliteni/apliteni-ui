// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Callout } from '../../react/src/primitives/Callout';
import { TextField } from '../../react/src/Field';
import { NavTabs } from '../../react/src/NavTabs';
import { Button } from '../../react/src/primitives/Button';
import { Snippet } from '../../react/src/Snippet';
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

// A failing pair, a second theme and forced colours cannot be drawn live on this
// page without failing it, so those halves show the code in the kit's Snippet.
const Code = ({ label = 'CSS', code }: { label?: string; code: string }) => <Snippet label={label} code={code} copy={false} />;
const GROUND_DONT = '.publish {\n  background: var(--accent);\n  color: #fff;\n}';
const CHECKS_DO = 'dark, Nebula\ndark, Ocean\nlight, Nebula\nlight, Ocean';
const CHECKS_DONT = 'dark, Nebula';
const FIELD_DONT = '.ui-input {\n  background: var(--surface-2);\n  border-color: transparent;\n}';
const FORCED_DO = '@media (forced-colors: active) {\n  .ui-seg button[aria-pressed="true"] {\n    forced-color-adjust: none;\n    background: Highlight;\n    color: HighlightText;\n    --ring: var(--ring-width) solid CanvasText;\n  }\n}';
const FORCED_DONT = '@media (forced-colors: active) {\n  .ui-seg button[aria-pressed="true"] {\n    outline: 2px solid Highlight;\n  }\n}';

// The frozen hexes in SPEC_CSS are the specimen's subject, not a slip: `.gl-literal`
// writes out what the dark theme composites, so the pair is one picture in dark
// and the flip to light is what separates them.
const specimens = [
  { id: 'tokens', do: () => <Stage><Note /></Stage>, dont: () => <Stage mod="gl-literal"><Note /></Stage> },
  { id: 'signals', do: () => <Stage><BouncedEmail /></Stage>, dont: () => <Stage mod="gl-drift"><BouncedEmail /></Stage> },
  { id: 'accent-strong', do: () => <Stage><Button variant="primary">Publish</Button></Stage>, dont: () => <Code code={GROUND_DONT} /> },
  { id: 'selection-accent', do: () => <SelectionTabs />, dont: () => <SelectionTabs badge={{ text: '3', tone: 'accent' }} /> },
  { id: 'both-themes', do: () => <Code label="Checks" code={CHECKS_DO} />, dont: () => <Code label="Checks" code={CHECKS_DONT} /> },
  { id: 'text-surface', do: () => <Stage><TextField label="Search" defaultValue="Spring launch" /></Stage>, dont: () => <Code code={FIELD_DONT} /> },
  { id: 'selected-forced-colours', do: () => <Code code={FORCED_DO} />, dont: () => <Code code={FORCED_DONT} /> },
];

const meta: Meta = { title: 'Guidelines/Colour and theming', parameters: { layout: 'fullscreen' } };
export default meta;

export const ColourAndTheming: StoryObj = {
  name: 'Colour and theming',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
