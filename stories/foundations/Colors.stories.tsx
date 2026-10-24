import type { Meta, StoryObj } from '@storybook/react';
import { Pad, PageHead } from '../_page';

const meta: Meta = { title: 'Foundations/Colors', parameters: { layout: 'fullscreen' } };
export default meta;

const Swatch = ({ name, note }: { name: string; note?: string }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
  <div style={{ height: 72, borderRadius: 14, background: `var(${name})`, boxShadow: 'inset 0 0 0 1px rgba(128,128,128,.16)' }} />
  <div>
    <div style={{ font: '600 12.5px/1.3 var(--font-sans)', color: 'var(--strong)' }}>{name}</div>
    {note && <div style={{ font: '400 11.5px/1.4 var(--font-sans)', color: 'var(--muted)' }}>{note}</div>}
  </div>
</div>;

const Group = ({ title, swatches }: { title: string; swatches: [string, string?][] }) => <section style={{ marginBottom: 40 }}>
  <h3 style={{ font: '600 13px/1 var(--font-display)', color: 'var(--muted)', marginBottom: 18 }}>{title}</h3>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 20 }}>
    {swatches.map(([name, note]) => <Swatch key={name} name={name} note={note} />)}
  </div>
</section>;

export const Semantic: StoryObj = {
  render: () => <Pad>
    <PageHead title="Semantic colours" titleGap={8} leadStyle={{ marginBottom: 36, maxWidth: '60ch' }}
      lead="Every component references these tokens — switch the theme (top toolbar) and watch them all follow. Raw hues live in the brand ramp; components never touch them directly." />
    <Group title="Brand & accent" swatches={[['--accent', 'primary action, focus'], ['--purple', 'brand purple'], ['--purple-light', 'accent light'], ['--purple-mid', 'accent mid']]} />
    <Group title="Signal" swatches={[['--green', 'live / success'], ['--cyan', 'link / flag'], ['--amber', 'warning'], ['--pink', 'danger / revoke']]} />
    <Group title="Surfaces" swatches={[['--bg', 'page background'], ['--bg-elevated', 'raised surface'], ['--surface', 'card'], ['--surface-2', 'inset / input'], ['--surface-3', 'track'], ['--border', 'hairline']]} />
    <Group title="Text" swatches={[['--strong', 'headings'], ['--text', 'body'], ['--dim', 'secondary'], ['--muted', 'tertiary / captions']]} />
    <Group title="Glows (tints)" swatches={[['--glow-purple'], ['--glow-green'], ['--glow-cyan'], ['--glow-pink']]} />
  </Pad>,
};
