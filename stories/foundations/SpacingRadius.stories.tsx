import type { Meta, StoryObj } from '@storybook/react';
import { Pad, PageHead } from '../_page';

const meta: Meta = { title: 'Foundations/Spacing & Radius', parameters: { layout: 'fullscreen' } };
export default meta;

const SPACES = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16'];
const RADII = [['xs', '--radius-xs'], ['sm', '--radius-sm'], ['md', '--radius-md'], ['lg', '--radius-lg'], ['xl', '--radius-xl'], ['2xl', '--radius-2xl'], ['pill', '--radius-pill']];
const token = { fontFamily: 'var(--font-mono)', color: 'var(--muted)' };

export const Spacing: StoryObj = {
  render: () => <Pad>
    <PageHead title="Spacing" lead="A 4px base scale. Reach for a token, not a magic number." />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
      {SPACES.map(s => <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <code style={{ ...token, fontSize: 13, width: 130 }}>{`--space-${s}`}</code>
        <div style={{ height: 18, width: `var(--space-${s})`, background: 'var(--accent)', borderRadius: 4 }} />
      </div>)}
    </div>
  </Pad>,
};

export const Radius: StoryObj = {
  render: () => <Pad>
    <PageHead title="Radius" lead="Soft, generous corners — the deck rarely uses a sharp edge." />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 22, maxWidth: 820 }}>
      {RADII.map(([name, v]) => <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: '100%', height: 84, background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)', borderRadius: `var(${v})` }} />
        <div><div style={{ font: '600 12.5px/1 var(--font-sans)', color: 'var(--strong)' }}>{name}</div><code style={{ ...token, fontSize: 11 }}>{v}</code></div>
      </div>)}
    </div>
  </Pad>,
};
