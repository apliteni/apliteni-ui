import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { Badge } from './primitives/Badge';
import { Pill } from './primitives/Pill';
import { StatusDot } from './primitives/StatusDot';

const meta: Meta = {
  title: 'React/Badge & Status',
  parameters: { layout: 'fullscreen' },
};
export default meta;

// Preserve the vanilla gallery's spacing for the migration comparison.
const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' };
function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ font: '600 11px/1 var(--font-sans)' }}>{label}</div>
    {children}
  </div>;
}

export const Badges: StoryObj = {
  render: () => <div style={{ padding: 40, minHeight: '100vh' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>
      <Specimen label="Status badges"><div style={row}>
        <Badge variant="live">Live</Badge><Badge variant="soon">Soon</Badge><Badge variant="info">Info</Badge>
        <Badge variant="warn">Beta</Badge><Badge variant="danger">Revoked</Badge><Badge variant="archive">Archive</Badge>
        <Badge>Neutral</Badge>
      </div></Specimen>
      <Specimen label="Record status (data tables)"><div style={row}>
        <Badge variant="success">Paid</Badge><Badge variant="success">Verified</Badge>
        <Badge variant="pending">Pending</Badge><Badge variant="danger">Failed</Badge><Badge>Dismissed</Badge>
      </div></Specimen>
      <Specimen label="Metadata pills"><div style={row}>
        <Pill>Product units</Pill><Pill variant="live">Live</Pill><Pill variant="soon">Coming soon</Pill>
      </div></Specimen>
      <Specimen label="Status dots"><div style={{ display: 'flex', gap: 26, alignItems: 'center', fontSize: 14 }}>
        <span style={{ display: 'inline-flex', gap: 9, alignItems: 'center' }}><StatusDot live /> API online</span>
        <span style={{ display: 'inline-flex', gap: 9, alignItems: 'center' }}><StatusDot /> Idle</span>
      </div></Specimen>
    </div>
  </div>,
};

export const InContext: StoryObj = {
  render: () => <div style={{ padding: 40, minHeight: '100vh' }}>
    <div className="ui-card" style={{ maxWidth: 460 }}>
      <h2 className="ui-card__title">phoenix.2026.002 <Badge variant="live">Live</Badge></h2>
      <div className="ui-card__sub">Product units, animated deck. The current strategy version, served at the clean root.</div>
      <div style={{ display: 'flex', gap: 8 }}><Pill variant="live">2 agents</Pill><Pill variant="soon">MCP enabled</Pill></div>
    </div>
  </div>,
};

export const LabelledDot: StoryObj = {
  render: () => <div style={{ padding: 40, minHeight: '100vh' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <StatusDot live aria-labelledby="connection-status" /><span id="connection-status">API online</span>
    </span>
  </div>,
};
