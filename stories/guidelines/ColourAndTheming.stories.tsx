// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Callout } from '../../react/src/primitives/Callout';
import { TextField } from '../../react/src/Field';
import { NavTabs } from '../../react/src/NavTabs';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_colour-and-theming.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { ACCENT } from '../foundations/sub-themes.js';

const content = await loadGuideline('colour-and-theming.md', new URL('../../guidelines/colour-and-theming.md', import.meta.url));

const Stage = ({ mod = '', children }: { mod?: string; children: ReactNode }) => <div className={`gl-stage ${mod}`}>{children}</div>;
const Note = () => <Callout variant="info">Rotating this token invalidates every client using it.</Callout>;
const BouncedEmail = () => <TextField label="Billing email" error="That address bounced twice this week." defaultValue="ops@acme.io" />;
const SelectionTabs = ({ badge }: { badge?: { text: string; tone: 'accent' } }) => <Stage>
  <NavTabs aria-label="Example views" active="activity" items={[
    { id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity', badge }]} />
</Stage>;

// The failing ground is a swatch with no words on it: white on --accent would fail
// AA in front of the reader, so the readout carries the ratio instead.
const Ratio = ({ children }: { children: ReactNode }) => <div className="gl-cursor">{children}</div>;

// Each cell pins one theme and one accent in literal values, because a theme's
// tokens exist only on the root. `checked` is how many cells were looked at.
const THEME = { dark: { bg: '#0e0d14', ink: '#e9e7f0' }, light: { bg: '#f2f3f6', ink: '#1a1e27' } };
const CELLS = [['dark', 'Nebula'], ['dark', 'Ocean'], ['light', 'Nebula'], ['light', 'Ocean']] as const;
const Themes = ({ checked }: { checked: number }) => <Stage><div className="gl-themes">{CELLS.map(([t, a], i) => {
  const ac = ACCENT[a][t];
  return <div key={t + a} className="gl-theme" style={{ background: THEME[t].bg, color: THEME[t].ink }}>
    <span className="gl-theme__t">{`${t === 'dark' ? 'Dark' : 'Light'}, ${a}`}</span>
    <span className="gl-theme__btn" style={{ background: ac.as, color: ac.ac }}>Save</span>
    <span className={i < checked ? 'gl-theme__on' : ''}>{i < checked ? 'Checked' : 'Not checked'}</span>
  </div>;
})}</div></Stage>;

// An edged field beside the two grey fills that carry no words.
const Surfaces = () => <Stage><TextField label="Invoice number" defaultValue="INV-2041" />
  <div className="gl-tracks"><span className="gl-track" /><hr className="gl-divider" /></div></Stage>;
const GreyFills = () => <Stage><TextField label="Invoice number" defaultValue="INV-2041" className="gl-grey" />
  <div className="gl-tracks"><span className="gl-chip">Draft</span></div></Stage>;

// Forced colours drawn in the High Contrast Black values, because a page cannot
// switch the mode on. Canvas, CanvasText, Highlight and HighlightText.
const Forced = ({ fill, focused }: { fill: boolean; focused: string }) => <Stage>
  <div className="gl-hc">{['Overview', 'Activity', 'Settings'].map(l => <span key={l} className={[
    'gl-hc__row', l === 'Activity' && (fill ? 'is-fill' : 'is-outline'), l === focused && 'is-focus'].filter(Boolean).join(' ')}>{l}</span>)}
  </div>
  <Ratio>{`Selected: Activity. Focused: ${focused}.`}</Ratio>
</Stage>;

// The accent pair pinned to dark Nebula in literal values, so the picture matches
// its ratios in both themes. In light, --accent and --accent-strong are one colour.
const NEBULA = ACCENT.Nebula.dark;
const DarkNebula = ({ children }: { children: ReactNode }) => <div className="gl-pin" style={{ background: THEME.dark.bg,
  '--accent': NEBULA.a, '--accent-strong': NEBULA.as, '--accent-contrast': NEBULA.ac } as CSSProperties}>{children}</div>;

// The frozen hexes in SPEC_CSS are the specimen's subject, not a slip: `.gl-literal`
// writes out what the dark theme composites, so the pair is one picture in dark
// and the flip to light is what separates them.
const specimens = [
  { id: 'tokens', do: () => <Stage><Note /></Stage>, dont: () => <Stage mod="gl-literal"><Note /></Stage> },
  { id: 'signals', do: () => <Stage><BouncedEmail /></Stage>, dont: () => <Stage mod="gl-drift"><BouncedEmail /></Stage> },
  { id: 'accent-strong',
    do: () => <Stage><DarkNebula><span className="gl-swatch gl-swatch--strong">Save</span></DarkNebula><Ratio>Dark, Nebula: white on --accent-strong is 5.70:1</Ratio></Stage>,
    dont: () => <Stage><DarkNebula><span className="gl-swatch" /></DarkNebula><Ratio>Dark, Nebula: white on --accent is 2.95:1, needs 4.5:1</Ratio></Stage> },
  { id: 'selection-accent', do: () => <SelectionTabs />, dont: () => <SelectionTabs badge={{ text: '3', tone: 'accent' }} /> },
  { id: 'both-themes', do: () => <Themes checked={4} />, dont: () => <Themes checked={1} /> },
  { id: 'text-surface', do: () => <Surfaces />, dont: () => <GreyFills /> },
  { id: 'selected-forced-colours', do: () => <Forced fill focused="Activity" />, dont: () => <Forced fill={false} focused="Overview" /> },
];

const meta: Meta = { title: 'Guidelines/Colour and theming', parameters: { layout: 'fullscreen' } };
export default meta;

export const ColourAndTheming: StoryObj = {
  name: 'Colour and theming',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
