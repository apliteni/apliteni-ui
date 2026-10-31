import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import { Pad, Prose, Title } from '../_page';

const meta: Meta = { title: 'Foundations/Backgrounds', parameters: { layout: 'fullscreen' } };
export default meta;

// The elevation ladder, bottom to top: the order is the rule, not a list.
// why: docs/foundations.md#elevation
const SURFACES = [
  ['--bg', 'Page', 'The base canvas behind everything.'],
  ['--surface-2', 'Sunken', 'Sunken table rows, tracks, disabled boxes.'],
  ['--surface', 'Card', 'Cards, panels that do not float, and an inline code chip written on the page.'],
  ['--bg-elevated', 'Floating', 'Menus, dropdown panels, the drawer, modals, toasts.'],
  ['--surface-3', 'Top', 'The hover readout, chips, the rail’s hover row.'],
];

const Swatch = ({ token, name, use }: { token: string; name: string; use: string }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
  <div style={{ height: 88, background: `var(${token})`, borderRadius: 14, boxShadow: 'inset 0 0 0 1px var(--border)' }} />
  <div>
    <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--strong)' }}>{name}</div>
    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{token}</code>
    <div style={{ font: '400 12px/1.45 var(--font-sans)', color: 'var(--muted)', marginTop: 5 }}>{use}</div>
  </div>
</div>;

const GlowSpan = ({ tone, style }: { tone: 'purple' | 'cyan' | 'green'; style: CSSProperties }) => <span className={`ui-glow ui-glow--${tone}`} style={style} />;
const centred: CSSProperties = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };

const GlowPanel = ({ label, children }: { label: string; children: ReactNode }) =>
  <div style={{ position: 'relative', height: 190, background: 'var(--bg)', borderRadius: 16, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
    {children}
    <div style={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center', height: '100%', font: '500 13px var(--font-sans)', color: 'var(--dim)' }}>{label}</div>
  </div>;

const BgPanel = ({ cls, name, desc }: { cls: string; name: string; desc: string }) =>
  <div className={cls} style={{ height: 190, background: 'var(--bg)', borderRadius: 16, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--border)', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 18 }}>
    <div>
      <div style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--strong)', marginBottom: 9 }}>{name}</div>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--accent)', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', borderRadius: 6, padding: '4px 9px' }}>{`.${cls}`}</code>
      <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted)', marginTop: 11, maxWidth: '32ch' }}>{desc}</div>
    </div>
  </div>;

const H3 = ({ children }: { children: string }) => <h3 style={{ font: '600 13px/1 var(--font-display)', color: 'var(--muted)', margin: '52px 0 20px' }}>{children}</h3>;
const Tiles = ({ min, children }: { min: string; children: ReactNode }) =>
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${min},1fr))`, gap: 22 }}>{children}</div>;

export const Default: StoryObj = {
  render: () => <Pad>
    <Title>Backgrounds</Title>
    <p style={{ color: 'var(--dim)', maxWidth: '60ch' }}>Every backdrop in the kit: the surface ladder, the ambient glow and four backdrop classes. Each one reads the accent tokens, so it follows the sub-theme in dark and light.</p>

    <H3>The elevation ladder</H3>
    <p style={{ color: 'var(--dim)', maxWidth: '60ch', marginBottom: 20 }}>Bottom to top. A surface says how high it is with its step and a line. Light adds a faint short shadow. Dark draws the line only. A surface that floats — one whose job is to be temporarily above something else — takes the strongest drop, and the hover readout on the top step is one of them. The thin ring on each swatch below is this page&apos;s own, so a colour is visible on its own ground. See Foundations → Elevation.</p>
    <Tiles min="180px">{SURFACES.map(([token, name, use]) => <Swatch key={token} token={token} name={name} use={use} />)}</Tiles>

    <H3>Ambient glow</H3>
    <Tiles min="260px">
      <GlowPanel label="Signature depth — purple + cyan"><GlowSpan tone="purple" style={{ top: -70, left: '16%' }} /><GlowSpan tone="cyan" style={{ bottom: -90, right: '6%', width: 280, height: 280 }} /></GlowPanel>
      <GlowPanel label=".ui-glow--purple"><GlowSpan tone="purple" style={centred} /></GlowPanel>
      <GlowPanel label=".ui-glow--cyan"><GlowSpan tone="cyan" style={{ ...centred, width: 300, height: 300 }} /></GlowPanel>
      <GlowPanel label=".ui-glow--green"><GlowSpan tone="green" style={{ ...centred, width: 300, height: 300 }} /></GlowPanel>
    </Tiles>

    <H3>Backdrop treatments</H3>
    <Tiles min="260px">
      <BgPanel cls="ui-bg-spotlight" name="Spotlight" desc="A soft radial from the top. Auth cards and focused heroes." />
      <BgPanel cls="ui-bg-wash" name="Accent wash" desc="A gentle top-down tint in the current accent." />
      <BgPanel cls="ui-bg-grid" name="Grid" desc="A faint token grid, masked to fade at the edges." />
      <BgPanel cls="ui-bg-dots" name="Dots" desc="A subtle dot field for dashboards and technical surfaces." />
    </Tiles>
  </Pad>,
};

// Full-bleed stories: one per background, so each can be judged at real scale with
// the sub-theme and light/dark toggles applying live. A relative 100vh wrapper with
// overflow hidden holds the layer in flow, because a fixed z-index:-1 layer would
// sit behind Storybook's opaque root. Decorative layers are aria-hidden.
const FullBleed = ({ bgClass = '', layer, eyebrow, title, body }: { bgClass?: string; layer?: ReactNode; eyebrow: string; title: string; body: string }) =>
  <div className={bgClass} style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
    {layer && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{layer}</div>}
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 40 }}>
      <div style={{ maxWidth: '46ch', textAlign: 'center' }}>
        <div className="ui-eyebrow" style={{ justifyContent: 'center', marginBottom: 14 }}>{eyebrow}</div>
        <h1 style={{ font: '700 clamp(30px,5vw,50px)/1.05 var(--font-display)', color: 'var(--strong)', letterSpacing: '-.025em', marginBottom: 16 }}>{title}</h1>
        <Prose html={body} style={{ font: '400 16px/1.6 var(--font-sans)', color: 'var(--dim)', marginBottom: 28 }} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
          <Button variant="primary">Get started</Button>
          <Button variant="secondary">View tokens</Button>
        </div>
        <div style={{ maxWidth: 340, margin: '0 auto', textAlign: 'left' }}>
          <Card title="Card on a backdrop" sub="A card keeps its own surface"><p style={{ color: 'var(--dim)', font: '400 13px/1.5 var(--font-sans)', margin: 0 }}>Content sits above the backdrop in a normal stacking context.</p></Card>
        </div>
      </div>
    </div>
  </div>;

const code = (cls: string) => `<code style="font-family:var(--font-mono);color:var(--accent)">${cls}</code>`;

export const Glow: StoryObj = {
  name: 'Glow (full-bleed)',
  render: () => <FullBleed layer={<>
    <GlowSpan tone="purple" style={{ top: -140, left: '8%', width: 560, height: 560 }} />
    <GlowSpan tone="cyan" style={{ bottom: -180, right: '4%', width: 520, height: 520 }} />
  </>} eyebrow="Ambient glow" title="Two glows from the corners"
  body={`Two blurred ${code('.ui-glow')} blobs light the page from the corners. They read the accent glow tokens, so they follow the sub-theme in dark and light.`} />,
};

export const Spotlight: StoryObj = {
  name: 'Spotlight (full-bleed)',
  render: () => <FullBleed bgClass="ui-bg-spotlight" eyebrow="Backdrop — Spotlight" title="One radial from the top"
    body={`One soft radial from the top lights the middle of the page. Use ${code('.ui-bg-spotlight')} behind a sign-in card or a hero with one action.`} />,
};

export const Wash: StoryObj = {
  name: 'Accent wash (full-bleed)',
  render: () => <FullBleed bgClass="ui-bg-wash" eyebrow="Backdrop — Accent wash" title="An accent tint from the top"
    body={`A top-down gradient in the current accent fades to the page by mid-fold. Use ${code('.ui-bg-wash')} to tint one section.`} />,
};

export const Grid: StoryObj = {
  name: 'Grid (full-bleed)',
  render: () => <FullBleed bgClass="ui-bg-grid" eyebrow="Backdrop — Grid" title="A faint grid"
    body={`A faint token-coloured grid, radially masked so it fades out at the edges. Use ${code('.ui-bg-grid')} behind dashboards and docs.`} />,
};

export const Dots: StoryObj = {
  name: 'Dots (full-bleed)',
  render: () => <FullBleed bgClass="ui-bg-dots" eyebrow="Backdrop — Dots" title="A faint dot field"
    body={`A faint dot field, masked to fade at the edges. ${code('.ui-bg-dots')} is lighter than the grid, so use it behind dense dashboards and data tables.`} />,
};
