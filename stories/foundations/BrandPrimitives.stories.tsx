import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pad, Title } from '../_page';

// The Apliteni umbrella-brand palette — the `--color-apliteni-*` primitives
// synced from apliteni/design-system (style.apliteni.com) into
// src/tokens/brand.generated.css. Rendered straight from the CSS variables, so
// this page updates itself whenever the sync PR lands.
const meta: Meta = { title: 'Foundations/Brand primitives', parameters: { layout: 'fullscreen' } };
export default meta;

const INSET = 'inset 0 0 0 1px rgba(128,128,128,.18)';
const mono = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' };
const code12 = { fontFamily: 'var(--font-mono)', fontSize: 12 };
const strong = { color: 'var(--strong)' };

const H3 = ({ children }: { children: ReactNode }) =>
  <h3 style={{ font: '600 13px/1 var(--font-display)', color: 'var(--muted)', margin: '0 0 16px' }}>{children}</h3>;

// A single named primitive as a tall swatch + its token name.
const Chip = ({ token, label }: { token: string; label: string }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
  <div style={{ height: 72, borderRadius: 14, background: `var(${token})`, boxShadow: INSET }} />
  <div>
    <div style={{ font: '600 12.5px/1.3 var(--font-sans)', color: 'var(--strong)' }}>{label}</div>
    <code style={mono}>{token}</code>
  </div>
</div>;

const Grid = ({ chips }: { chips: [string, string][] }) =>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 18, marginBottom: 40 }}>
    {chips.map(([token, label]) => <Chip key={token} token={token} label={label} />)}
  </div>;

// The hue key names a token; the label a reader sees is written in sentence case.
const hueLabel = (hue: string) => hue[0].toUpperCase() + hue.slice(1);

// An 8-step hue ramp: one strip, light step numbers underneath.
const Ramp = ({ hue, steps = 8 }: { hue: string; steps?: number }) => <div style={{ marginBottom: 26 }}>
  <div style={{ font: '600 12.5px/1 var(--font-sans)', color: 'var(--strong)', marginBottom: 10 }}>{hueLabel(hue)}</div>
  <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', boxShadow: INSET }}>
    {Array.from({ length: steps }, (_, i) => i + 1).map(s => <div key={s} style={{
      flex: 1, height: 56, background: `var(--color-apliteni-${hue}-${s})`,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 5,
    }}><span style={{ font: '600 10px/1 var(--font-mono)', color: 'rgba(0,0,0,.45)' }}>{s}</span></div>)}
  </div>
</div>;

const Section = ({ children }: { children: ReactNode }) => <section style={{ marginBottom: 16 }}>{children}</section>;

const Accent = ({ caption, fill, value, token }: { caption: string; fill: string; value: string; token: string }) =>
  <div style={{ flex: 1, minWidth: 200 }}>
    <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--muted)', marginBottom: 12 }}>{caption}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 11, background: fill, boxShadow: INSET }} />
      <div><div style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--strong)' }}>{value}</div><code style={mono}>{token}</code></div>
    </div>
  </div>;

export const Palette: StoryObj = {
  name: 'Palette',
  render: () => <Pad>
    <Title gap={8}>Brand primitives</Title>
    <p style={{ color: 'var(--dim)', maxWidth: '64ch', marginBottom: 14 }}>The Apliteni umbrella-brand palette, synced from <code style={code12}>apliteni/design-system</code> (<a href="https://style.apliteni.com" style={{ color: 'var(--accent)' }}>style.apliteni.com</a>) into <code style={code12}>brand.generated.css</code>. Edit these upstream, never here.</p>
    <p style={{ color: 'var(--dim)', maxWidth: '64ch', marginBottom: 40 }}>These are the brand <b style={strong}>source of truth</b>. This kit&apos;s deck theme maps its own semantic tokens on top of them (see <b style={strong}>Colors</b>) — where the two diverge is a deliberate product choice, not a bug.</p>

    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'stretch', marginBottom: 44, padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
      <Accent caption="Brand accent" fill="var(--color-apliteni-primary-violet)" value="#914dff" token="--color-apliteni-primary-violet" />
      <div style={{ width: 1, background: 'var(--border)' }} />
      <Accent caption="Kit accent (deck)" fill="var(--accent)" value="var(--accent)" token="drifts — run npm run tokens:drift" />
    </div>

    <Section><H3>Primary</H3><Grid chips={[
      ['--color-apliteni-primary-violet', 'Violet'], ['--color-apliteni-primary-black', 'Black'], ['--color-apliteni-primary-white', 'White'],
    ]} /></Section>
    <Section><H3>Supporting</H3><Grid chips={[
      ['--color-apliteni-supporting-red', 'Red'], ['--color-apliteni-supporting-orange', 'Orange'], ['--color-apliteni-supporting-yellow', 'Yellow'],
      ['--color-apliteni-supporting-green', 'Green'], ['--color-apliteni-supporting-blue', 'Blue'], ['--color-apliteni-supporting-pink', 'Pink'],
    ]} /></Section>
    <Section><H3>Neutral ramp</H3><Ramp hue="neutral" steps={9} /></Section>
    <Section><H3>Hue ramps</H3>
      {['violet', 'red', 'orange', 'yellow', 'green', 'blue', 'pink'].map(hue => <Ramp key={hue} hue={hue} />)}
    </Section>
  </Pad>,
};
