// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Checkbox } from '../../react/src/Checkbox';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { TextField } from '../../react/src/Field';
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

// The pointer cannot be switched in a page, so both halves are drawn as a coarse
// pointer computes them. The Don't is inert: the zoom gate walks every real field.
const Amount = ({ scaled }: { scaled: boolean }) => <div className="gl-stage gl-zoom">
  {scaled
    ? <div className="ui-field" aria-hidden="true"><span className="ui-field__label">Amount</span>
      <span className="ui-input gl-zoom__scaled">240.00</span></div>
    : <TextField label="Amount" defaultValue="240.00" />}
  <div className="gl-cursor">{scaled ? 'Coarse pointer: computed 16px, drawn at 13px' : 'Coarse pointer: computed 16px, drawn at 16px'}</div>
</div>;

// The pale half has no words, so this page does not break the rule it shows:
// lines stand in for the text and the readout carries the ratio.
const Reading = ({ pale }: { pale: boolean }) => <div className="gl-stage">
  {pale
    ? <div className="gl-pale" aria-hidden="true"><span className="gl-pale__h" /><span /><span /><span className="gl-pale__s" /></div>
    : <div className="gl-body"><h3>Refund policy</h3><p>A refund is deducted from the month it was issued in.</p>
      <p className="gl-body__s">Updated 4 March</p></div>}
  <div className="gl-cursor">{pale ? '--muted on --surface: 6.24:1 dark, 6.11:1 light' : '--text on --surface: 13.32:1 dark, 16.68:1 light'}</div>
</div>;

// The Do pins the band on the first stop. The Don't is pointer-only markup with
// its hover paint pinned: inert, because Tab never reaches it.
const Keyboard = ({ pointerFirst }: { pointerFirst: boolean }) => <div className="gl-stage">
  {pointerFirst
    ? <div className="gl-stage--row" aria-hidden="true"><span className="ui-btn ui-btn--primary">Publish</span>
      <span className="ui-btn gl-hover">Discard</span></div>
    : <div className="gl-stage--row"><span className="gl-ring gl-ring--one"><Button variant="primary">Publish</Button></span>
      <Button>Discard</Button></div>}
  <div className="gl-cursor">{pointerFirst ? 'Pointer on Discard. Tab: nothing receives focus' : 'Tab: Publish, then Discard'}</div>
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
  { id: 'touch-field-size', do: () => <Amount scaled={false} />, dont: () => <Amount scaled /> },
  { id: 'body-contrast', do: () => <Reading pale={false} />, dont: () => <Reading pale /> },
  { id: 'status-label',
    do: () => <Row><Badge variant="warn">Paused</Badge><Badge variant="live">Live</Badge></Row>,
    // A word is what this chip is missing, so the Don't cannot carry one.
    dont: () => <Row><span className="ui-badge ui-badge--live" aria-hidden="true"><span className="gl-status__gap" /></span></Row> },
  { id: 'measurable-pair',
    do: () => <Row><p className="gl-measure">{MEASURED}</p></Row>,
    dont: () => <Row><p className="gl-measure gl-measure--gradient">{MEASURED}</p></Row> },
  { id: 'keyboard-first', do: () => <Keyboard pointerFirst={false} />, dont: () => <Keyboard pointerFirst /> },
];

// The id is the page's first name, kept so its old links still open it.
const meta: Meta = { id: 'guidelines-the-accessibility-floor', title: 'Guidelines/Accessibility minimums', parameters: { layout: 'fullscreen' } };
export default meta;

export const AccessibilityFloor: StoryObj = {
  name: 'Accessibility minimums',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
