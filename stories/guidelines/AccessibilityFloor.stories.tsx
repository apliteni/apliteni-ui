// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Checkbox } from '../../react/src/Checkbox';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import { Snippet } from '../../react/src/Snippet';
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

// A pointer, a keyboard and a touch screen are states a still page cannot set,
// so those halves show the code that decides them, in the kit's Snippet.
const Code = ({ label = 'CSS', code }: { label?: string; code: string }) => <Snippet label={label} code={code} copy={false} />;
const TOUCH_DO = '@media (pointer: coarse) {\n  input, select, textarea { font-size: 16px; }\n}';
const TOUCH_DONT = '@media (pointer: coarse) {\n  input { font-size: 16px; transform: scale(0.875); }\n}';

// The Don't is the kit's own muted card title: pale ink at the card-title size.
const Cashflow = ({ pale }: { pale?: boolean }) => <div className="gl-stage">{pale
  ? <div className="ui-card"><h2 className="ui-card__title ui-card__title--muted">Monthly cashflow</h2>
    <div className="ui-card__sub">Income and expenses by month.</div></div>
  : <Card title="Monthly cashflow" sub="Income and expenses by month." />}</div>;

// Finished, both halves look the same, so each half draws the order of work.
const KEYS_DO = '1. <button>Publish</button> <button>Discard</button>\n   Tab reaches Publish, then Discard. Enter publishes.\n2. Add the ui-btn classes.';
const KEYS_DONT = '1. <div class="ui-btn" onclick="publish()">Publish</div>\n2. Add tabindex and a keydown handler afterwards.';

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
  { id: 'touch-field-size', do: () => <Code code={TOUCH_DO} />, dont: () => <Code code={TOUCH_DONT} /> },
  { id: 'body-contrast', do: () => <Cashflow />, dont: () => <Cashflow pale /> },
  { id: 'status-label',
    do: () => <Row><Badge variant="warn">Paused</Badge><Badge variant="live">Live</Badge></Row>,
    // A word is what this chip is missing, so the Don't cannot carry one.
    dont: () => <Row><span className="ui-badge ui-badge--live" aria-hidden="true"><span className="gl-status__gap" /></span></Row> },
  { id: 'measurable-pair',
    do: () => <Row><p className="gl-measure">{MEASURED}</p></Row>,
    dont: () => <Row><p className="gl-measure gl-measure--gradient">{MEASURED}</p></Row> },
  { id: 'keyboard-first',
    do: () => <Code label="Order of work" code={KEYS_DO} />,
    dont: () => <Code label="Order of work" code={KEYS_DONT} /> },
];

// The id is the page's first name, kept so its old links still open it.
const meta: Meta = { id: 'guidelines-the-accessibility-floor', title: 'Guidelines/Accessibility minimums', parameters: { layout: 'fullscreen' } };
export default meta;

export const AccessibilityFloor: StoryObj = {
  name: 'Accessibility minimums',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
