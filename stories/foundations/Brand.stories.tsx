import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { seedling, prism, brand } from '../../src/assets/brand.js';
import { apliteniLogo, apliteniLogoDark, apliteniMark } from '../../src/assets/brand.generated/index.js';
import { Pad, Prose, Title } from '../_page';

const meta: Meta = { title: 'Foundations/Brand', parameters: { layout: 'fullscreen' } };
export default meta;

const H3 = ({ children }: { children: ReactNode }) =>
  <h3 style={{ font: '600 13px/1 var(--font-display)', color: 'var(--muted)', margin: '0 0 18px' }}>{children}</h3>;
const strong = { color: 'var(--strong)' };
const mono12 = { fontFamily: 'var(--font-mono)', fontSize: 12 };
/** A kept brand helper returns markup; this places it. */
const Mark = ({ html }: { html: string }) => <Prose as="span" html={html} style={{ display: 'contents' }} />;

// A size ramp for a mark: the mark rendered at each px size with a caption.
const Ramp = ({ mark, prefix, sizes }: { mark: (id: string, size: number) => string; prefix: string; sizes: number[] }) =>
  <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 26 }}>
    {sizes.map(s => <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <Mark html={mark(prefix + s, s)} /><code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{s}px</code>
    </div>)}
  </div>;

const Lockup = ({ children }: { children: ReactNode }) =>
  <div style={{ display: 'inline-flex', padding: '20px 26px', background: 'var(--surface)', borderRadius: 14 }}>{children}</div>;

// Raw brand SVGs ship with fixed width/height attrs. Rewrite ONLY the opening
// <svg> tag (leave inner width/height, e.g. clipPath rects, untouched) so the
// mark scales to its box via viewBox. `h` sets a fixed height, width auto.
const fitH = (svg: string, h: string) => svg.replace(/<svg\b([^>]*)>/, (_m, a: string) =>
  `<svg${a.replace(/\s(width|height)="[^"]*"/g, '')} style="height:${h};width:auto;display:block">`);
const fitBox = (svg: string) => svg.replace(/<svg\b([^>]*)>/, (_m, a: string) =>
  `<svg${a.replace(/\s(width|height)="[^"]*"/g, '')} style="width:100%;height:100%;display:block">`);

// Suffix internal ids (clip/gradient) so multiple copies of one SVG on a page
// don't collide: collisions break rendering and trip the axe duplicate-id gate.
let uid = 0;
const uniq = (svg: string) => {
  const n = ++uid;
  return svg.replace(/\b(id|xlink:href|href)="#?([\w-]+)"/g, (_m, attr: string, id: string) =>
    `${attr}="${attr === 'id' ? '' : '#'}${id}-u${n}"`)
    .replace(/url\(#([\w-]+)\)/g, (_m, id: string) => `url(#${id}-u${n})`);
};

export const Marks: StoryObj = {
  name: 'Marks',
  render: () => <Pad>
    <Title>Brand</Title>
    <p style={{ color: 'var(--dim)', maxWidth: '60ch', marginBottom: 44 }}>Two marks, two jobs. The <b style={strong}>seedling</b> is Apliteni — the company. The <b style={strong}>prism</b> is apliteni-ui — this kit. Don&apos;t swap them: products carry the Apliteni seedling, the kit carries the prism.</p>

    <section style={{ marginBottom: 52 }}>
      <H3>Apliteni — the company</H3>
      <p style={{ color: 'var(--dim)', maxWidth: '56ch', margin: '-6px 0 22px' }}>The seedling. Growth, green, the parent brand every product ships under.</p>
      <Ramp mark={seedling} prefix="ap" sizes={[64, 40, 28, 20]} />
      <Lockup><span className="brand"><Mark html={seedling('apl', 28)} /><span style={{ fontSize: 16 }}>Apliteni</span></span></Lockup>
    </section>

    <section>
      <H3>apliteni-ui — the kit</H3>
      <p style={{ color: 'var(--dim)', maxWidth: '56ch', margin: '-6px 0 22px' }}>The prism — four accent sub-themes in one rounded mark. It stands for the kit, not for the products built with it.</p>
      <Ramp mark={prism} prefix="pr" sizes={[64, 40, 28, 20]} />
      <Lockup><Mark html={brand({ p: 'b1', word: 'apliteni-ui' })} /></Lockup>
    </section>
  </Pad>,
};

// The canonical umbrella-brand assets, synced from apliteni/design-system. These
// are the source of truth for the Apliteni wordmark + mark; the inline seedling()
// above is the same design. Edit these upstream, never here.
export const Umbrella: StoryObj = {
  name: 'Umbrella (synced)',
  render: () => <Pad>
    <Title>Umbrella brand</Title>
    <p style={{ color: 'var(--dim)', maxWidth: '60ch', marginBottom: 8 }}>The canonical Apliteni wordmark + mark, synced from <code style={mono12}>apliteni/design-system</code> into <code style={mono12}>src/assets/brand.generated/</code>. Use these for anything that represents <b style={strong}>Apliteni the company</b> — the kit&apos;s own <b style={strong}>prism</b> (see Marks) is separate.</p>
    <p style={{ color: 'var(--muted)', maxWidth: '60ch', marginBottom: 40, font: '400 13px/1.5 var(--font-sans)' }}>Generated — edit upstream, never here.</p>

    <section style={{ marginBottom: 40 }}>
      <H3>Wordmark</H3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
        <div style={{ background: '#121212', borderRadius: 16, padding: 40, display: 'flex', justifyContent: 'center' }}><Mark html={uniq(fitH(apliteniLogo, '34px'))} /></div>
        <div style={{ background: '#f1efed', borderRadius: 16, padding: 40, display: 'flex', justifyContent: 'center' }}><Mark html={uniq(fitH(apliteniLogoDark, '34px'))} /></div>
      </div>
    </section>

    <section>
      <H3>Mark</H3>
      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {[72, 48, 32, 24].map(s => <div key={s} style={{ width: s, height: s }}><Mark html={uniq(fitBox(apliteniMark))} /></div>)}
      </div>
    </section>
  </Pad>,
};
