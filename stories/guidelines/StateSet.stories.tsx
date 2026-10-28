// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Card } from '../../react/src/primitives/Card';
import { TextField } from '../../react/src/Field';
import { BusyRegion, SkeletonTable } from '../../react/src/Loading';
import { RestingFilters } from '../_table-filters';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_state-set.js';

const content = await loadGuideline('state-set.md', new URL('../../guidelines/state-set.md', import.meta.url));

const Stage = ({ mod = '', children }: { mod?: string; children: ReactNode }) => <div className={`gl-stage ${mod}`}>{children}</div>;

// `.gl-ring` pins what :focus-visible paints (src/styles/base.css), because a
// focus band exists only under a live keyboard and cannot be screenshotted.
const Ringed = ({ mod = '' }: { mod?: string }) => <div className={`gl-stage gl-ring ${mod}`}>
  <div className="gl-row">
    <Button variant="primary">Save changes</Button>
    <input className="ui-input" type="text" defaultValue="acme.io/hooks" aria-label="Webhook URL" />
  </div>
  <div className="gl-cursor">Both reached by Tab</div>
</div>;

const WHY_INVALID = 'Must start with https://';
// The don't marks the control invalid and says why somewhere else, so its field has no error to wire.
const Url = ({ error }: { error?: string }) =>
  <TextField label="Webhook URL" error={error} defaultValue="acme.io/hooks" className={error ? '' : 'is-invalid'} />;

// The pending pair. Same screen, same in-flight moment, twice: on the left the
// region draws the shape that is coming and says so through the live region;
// on the right the button is the only thing that knows. The table's filter bar
// stays above it while its rows load.
const Pending = ({ children }: { children: ReactNode }) => <Stage><div className="ui-card-stack">
  <RestingFilters search="Search payouts" placeholder="ID" label="Payout filters" />
  <Card title="Payouts">
    {children}
    <div className="gl-row" style={{ marginTop: 'var(--space-3)' }}><Button busy>Refresh</Button></div>
  </Card>
</div></Stage>;

const specimens = [
  { id: 'focus-visible', do: () => <Ringed />, dont: () => <Ringed mod="gl-ring--adhoc" /> },
  { id: 'busy', do: () => <Stage><Button variant="primary" busy>Saving…</Button></Stage>,
    dont: () => <Stage><Button variant="primary">Saving…</Button></Stage> },
  { id: 'error-in-markup', do: () => <Stage><Url error={WHY_INVALID} /></Stage>,
    dont: () => <div className="gl-stage gl-stack"><Url /><Callout variant="danger">{WHY_INVALID}</Callout></div> },
  { id: 'loading',
    do: () => <Pending><BusyRegion busy label="Loading 3 payouts…" placeholder={<SkeletonTable rows={3} cols={3} />} /></Pending>,
    dont: () => <Pending><p style={{ color: 'var(--text)', margin: 0 }}>Nothing here.</p></Pending> },
];

const meta: Meta = { title: 'Guidelines/The full state set', parameters: { layout: 'fullscreen' } };
export default meta;

export const StateSet: StoryObj = {
  name: 'The full state set',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
