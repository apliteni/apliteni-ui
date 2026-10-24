// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Checkbox } from '../../react/src/Checkbox';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_accessibility-floor.js';

const content = await loadGuideline('accessibility-floor.md', new URL('../../guidelines/accessibility-floor.md', import.meta.url));

// The numbers each rule is held to (TARGET_MIN, TAP_MIN, RING_MIN and the rest)
// stay in _accessibility-floor.js, where the gates read them.
const Row = ({ mod = '', children }: { mod?: string; children: ReactNode }) =>
  <div className={`gl-stage gl-stage--row${mod ? ` ${mod}` : ''}`}>{children}</div>;
const Mark = ({ label, icon }: { label: string; icon: string }) =>
  <Button icon={icon} iconOnly variant="ghost" size="xs">{label}</Button>;

// A focus band exists only under a live keyboard, so `.gl-ring` pins what
// :focus-visible paints. The Don't takes the band out and leaves a glow.
const Ringed = ({ mod = '' }: { mod?: string }) => <div className={`gl-stage gl-ring ${mod}`}>
  <div className="gl-stage--row"><Button variant="primary">Publish</Button><Button>Discard</Button></div>
  <div className="gl-cursor">Both drawn focused</div>
</div>;

// The Do cell's unavailable button is the real state, which the disabled gate reads.
// The Don't keeps the live paint and leaves the state to a pointer readout, which
// IS the mistake, so only the Don't carries that readout.
const Revoking = ({ disabled }: { disabled: boolean }) => <div className="gl-stage">
  <div className="gl-stage--row"><Button variant="primary">Save changes</Button><Button disabled={disabled}>Revoke key</Button></div>
  {!disabled && <div className="gl-cursor">Revoke key is unavailable</div>}
</div>;

const MEASURED = 'A refund is deducted from the month it was issued in.';

// The Don't cells that cannot be live controls are inert ink: every story is
// walked by the target gate, so a real undersized control would fail the floor.
const specimens = [
  { id: 'target-size',
    do: () => <Row mod="gl-target"><Checkbox label="Revoke on expiry" defaultChecked /><Button variant="secondary" size="sm">Revoke</Button></Row>,
    dont: () => <Row mod="gl-target"><span className="gl-target__ink" aria-hidden="true" /></Row> },
  { id: 'tap-zone',
    do: () => <Row mod="gl-tap gl-tap--room"><Button variant="secondary" size="sm">Approve</Button><Button variant="secondary" size="sm">Hold</Button></Row>,
    dont: () => <Row mod="gl-tap gl-tap--room"><span className="gl-tap__fat" aria-hidden="true">Approve</span>
      <span className="gl-tap__fat" aria-hidden="true">Hold</span></Row> },
  { id: 'tap-spacing',
    do: () => <Row mod="gl-tap gl-tap--room"><Mark label="Copy" icon="copy" /><Mark label="More actions" icon="moreHorizontal" /></Row>,
    dont: () => <Row mod="gl-tap gl-tap--tight"><span className="gl-tap__ink" aria-hidden="true" /><span className="gl-tap__ink" aria-hidden="true" /></Row> },
  { id: 'ring-contrast', do: () => <Ringed />, dont: () => <Ringed mod="gl-ring--halo" /> },
  { id: 'disabled-legibility', do: () => <Revoking disabled />, dont: () => <Revoking disabled={false} /> },
  { id: 'touch-field-size' },
  { id: 'body-contrast' },
  { id: 'status-label',
    do: () => <Row><Badge variant="warn">Paused</Badge><Badge variant="live">Live</Badge></Row>,
    // A word is what this chip is missing, so the Don't cannot carry one.
    dont: () => <Row><span className="ui-badge ui-badge--live" aria-hidden="true"><span className="gl-status__gap" /></span></Row> },
  { id: 'measurable-pair',
    do: () => <Row><p className="gl-measure">{MEASURED}</p></Row>,
    dont: () => <Row><p className="gl-measure gl-measure--gradient">{MEASURED}</p></Row> },
  { id: 'keyboard-first' },
];

// The id is the page's first name, kept so its old links still open it.
const meta: Meta = { id: 'guidelines-the-accessibility-floor', title: 'Guidelines/Accessibility minimums', parameters: { layout: 'fullscreen' } };
export default meta;

export const AccessibilityFloor: StoryObj = {
  name: 'Accessibility minimums',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
