import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pad, Prose, Title } from '../_page';

const meta: Meta = { title: 'Foundations/Elevation', parameters: { layout: 'fullscreen' } };
export default meta;

// Bottom to top. `note` is what the step is for; `on` is the step it sits on, so
// the specimen can draw each one over its own ground rather than over the page.
// `mark` is how that step is MARKED in the kit, and the swatch draws it live rather
// than drawing a line of its own: two of these rungs are levels and carry a real
// treatment, and the other three are grounds and fills that carry none.
// why: docs/foundations.md#elevation
const SWATCH: CSSProperties = { border: '1px solid var(--border)' };
const CARD: CSSProperties = { border: '1px solid var(--card-edge)', boxShadow: 'var(--elev-rest)' };
const FLOATING: CSSProperties = {
  border: '1px solid var(--float-edge)',
  boxShadow: 'inset 0 0 0 1px var(--elev-edge, var(--float-edge-inner)), var(--elev-drop)',
};

const LADDER: [string, string, string, string | null, CSSProperties][] = [
  ['--bg', 'Page', 'The base canvas. Nothing is below it.', null, SWATCH],
  ['--surface-2', 'Sunken', 'Non-text marks and tracks.', '--bg', SWATCH],
  ['--surface', 'Card', 'A card, a panel that does not float.', '--bg', CARD],
  ['--bg-elevated', 'Floating', 'A menu, a dropdown panel, the drawer, a modal, a toast.', '--surface', FLOATING],
  ['--surface-3', 'Top', 'Non-text quiet fills.', '--bg-elevated', SWATCH],
];

const PARA: CSSProperties = { color: 'var(--dim)', maxWidth: '66ch', lineHeight: 1.6, marginBottom: 14 };
const P = ({ html }: { html: string }) => <Prose html={html} style={PARA} />;
const H3 = ({ children }: { children: string }) =>
  <h3 style={{ font: '600 13px/1 var(--font-display)', color: 'var(--muted)', margin: '52px 0 20px' }}>{children}</h3>;
const caption = { name: { font: '600 12.5px/1.5 var(--font-sans)', color: 'var(--strong)' }, note: { font: '400 12px/1.45 var(--font-sans)', color: 'var(--muted)' } };
const Pair = ({ ground, pad, gap, surface, mark, items }: {
  ground: string; pad: number; gap: number; surface: string; mark: CSSProperties; items: [string, string][];
}) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 22, maxWidth: 820 }}>
  {items.map(([name, note], i) => <div key={name} style={{ padding: pad, borderRadius: 16, background: `var(${ground})` }}>
    <div style={{ height: 84, borderRadius: 12, background: `var(${surface})`, ...(i === 0 ? mark : {}) }} />
    <div style={{ ...caption.name, marginTop: gap }}>{name}</div>
    <div style={caption.note}>{note}</div>
  </div>)}
</div>;

export const Ladder: StoryObj = {
  render: () => <Pad>
    <Title>Elevation</Title>
    <P html={"A surface casts a shadow only to say it is <em>higher</em>, and each theme says it its own way. A level — a card, the shell's rail, a floating surface — keeps its step on this ladder in both themes; what marks its edge is the theme's. <strong>Each raised level draws a line. Light adds a faint short shadow. Dark draws the line only.</strong>"} />
    <P html={"A line that divides two regions of <em>one</em> surface is not a level and stays a line in both themes: a card's rows, a table's rules, the rail's head band, the topbar. A field is not a level either — its edge is what says \"type here\". Every specimen of a <em>level</em> on this page draws the live tokens, so each one shows whichever answer the theme you are reading in gives."} />

    <H3>Surface tokens</H3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 22 }}>
      {LADDER.map(([token, name, note, on, mark]) => <div key={token} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ padding: 18, borderRadius: 16, background: `var(${on || token})` }}>
          <div style={{ height: 74, borderRadius: 12, background: `var(${token})`, ...mark }} />
        </div>
        <div>
          <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--strong)' }}>{name}</div>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{token}</code>
          <div style={{ font: '400 12px/1.45 var(--font-sans)', color: 'var(--muted)', marginTop: 5 }}>{note}</div>
        </div>
      </div>)}
    </div>
    <P html={"Two of those five are levels and carry a real treatment above: <strong>Card</strong> draws <code style=\"font-family:var(--font-mono);color:var(--accent)\">--card-edge</code> with <code style=\"font-family:var(--font-mono);color:var(--accent)\">--elev-rest</code>, and <strong>Floating</strong> draws the full floating treatment. The outline on the other three is this page's own, so a ground or a fill is visible on its own colour — the kit does not draw it."} />
    <P html={"Grey inset and quiet fills are for non-text marks. Fields, chips and rows keep text on a reading surface; their edges and meaningful accents show state."} />

    <H3>The step on its own is not an edge</H3>
    <P html={"A step of lightness is a contrast of about 1.1: enough to read as a change of surface, not enough to draw an edge. Something has to draw it, so every level draws a line. In light a card sits 1.110 above the page, draws <code style=\"font-family:var(--font-mono);color:var(--accent)\">--level-line</code> and casts a faint <code style=\"font-family:var(--font-mono);color:var(--accent)\">--elev-rest</code>; in dark it keeps <code style=\"font-family:var(--font-mono);color:var(--accent)\">--border</code> and casts nothing. Both are <code style=\"font-family:var(--font-mono);color:var(--accent)\">--card-edge</code> and one rung, so a sheet never asks which theme it is in."} />
    <Pair ground="--bg" pad={22} gap={12} surface="--surface" mark={CARD} items={[
      ['A card on the page', 'As the kit draws one: the step, and whichever mark the theme gives it.'],
      ['The step alone', 'The same card with its edge and its rung taken off — the flat card this rule exists to prevent.'],
    ]} />

    <H3>The floating step, and the one place light has no step at all</H3>
    <P html={"A floating surface writes its edge twice and then casts, in one declaration: <code style=\"font-family:var(--font-mono);color:var(--accent)\">--float-edge</code> on the border, <code style=\"font-family:var(--font-mono);color:var(--accent)\">--float-edge-inner</code> as a one-pixel inset line within it, then the drop. In <strong>dark</strong> those resolve to <code style=\"font-family:var(--font-mono);color:var(--accent)\">--border-strong</code> and <code style=\"font-family:var(--font-mono);color:var(--accent)\">--border</code> — an outer line against what is behind, an inner one against the panel. One line measured 1.27 against the card; two measure 1.64."} />
    <P html={"In <strong>light</strong> the outer line is <code style=\"font-family:var(--font-mono);color:var(--accent)\">--level-line</code> and the inner line is <code style=\"font-family:var(--font-mono);color:var(--accent)\">transparent</code>, so the panel draws one line and the drop adds lift. It needs both: <code style=\"font-family:var(--font-mono);color:var(--accent)\">--surface</code> and <code style=\"font-family:var(--font-mono);color:var(--accent)\">--bg-elevated</code> are both white, so a panel over a card has a step of <strong>1.000</strong> — nothing. The right-hand specimen below is that panel with its treatment taken off, and in light there is nothing there to see. That is the point."} />
    <P html={"The drops live in one token, <code style=\"font-family:var(--font-mono);color:var(--accent)\">--elev-drop</code>, and the line is written on the floating rule itself, in front of them — a <code style=\"font-family:var(--font-mono);color:var(--accent)\">var()</code> inside a custom property resolves where that property is declared, so an <code style=\"font-family:var(--font-mono);color:var(--accent)\">--elev-edge</code> read at <code style=\"font-family:var(--font-mono);color:var(--accent)\">:root</code> could never be re-pointed by the toast that needs it. The drop is spent differently per theme, because it is not worth the same in each: near-black ink on a near-black page reaches 1.20 at its core and dark is carried by the edge, while light spends 16% and reaches 1.38 beside its line. Decided on #309, split by theme on <a href=\"https://github.com/apliteni/apliteni-ui/issues/490\" style=\"color:var(--accent)\">#490</a>, and made lighter on <a href=\"https://github.com/apliteni/apliteni-ui/issues/730\" style=\"color:var(--accent)\">#730</a>."} />
    <Pair ground="--surface" pad={30} gap={16} surface="--bg-elevated" mark={FLOATING} items={[
      ['The floating treatment', 'A panel over a card, as the kit draws one.'],
      ['The step alone', 'The same two surfaces with the treatment taken off. In light they are both white.'],
    ]} />

    <H3>The shadow tokens</H3>
    <P html={"<code style=\"font-family:var(--font-mono);color:var(--accent)\">--shadow-sm</code>, <code style=\"font-family:var(--font-mono);color:var(--accent)\">--shadow-md</code>, <code style=\"font-family:var(--font-mono);color:var(--accent)\">--shadow-lg</code>, <code style=\"font-family:var(--font-mono);color:var(--accent)\">--shadow-seg</code> and <code style=\"font-family:var(--font-mono);color:var(--accent)\">--shadow-card</code> are deprecated and resolve to the transparent shadow <code style=\"font-family:var(--font-mono);color:var(--accent)\">0 0 #0000</code> in both themes. They stay published so a consumer reading one does not break; nothing in the kit reads them. The shadows it does paint are the three rungs of the ladder — <code style=\"font-family:var(--font-mono);color:var(--accent)\">--elev-rest</code> under a card, <code style=\"font-family:var(--font-mono);color:var(--accent)\">--elev-rail</code> cast sideways off the shell's rail, and <code style=\"font-family:var(--font-mono);color:var(--accent)\">--elev-drop</code> under a floating surface — and in dark all three but the last are the transparent shadow too. Transparent rather than <code style=\"font-family:var(--font-mono);color:var(--accent)\">none</code>, because a shadow token is read in a list — <code style=\"font-family:var(--font-mono);color:var(--accent)\">none</code> there invalidates the declaration and takes the focus ring composed beside it. <code style=\"font-family:var(--font-mono);color:var(--accent)\">--shadow-ink</code>, <code style=\"font-family:var(--font-mono);color:var(--accent)\">--sheen</code>, <code style=\"font-family:var(--font-mono);color:var(--accent)\">--ring</code> and <code style=\"font-family:var(--font-mono);color:var(--accent)\">--scrim</code> are untouched — none of them is a cast shadow."} />

    <H3>Ambient glow</H3>
    <P html={"The deck’s signature depth is a light source behind the page, not a shadow in front of it, so it is unaffected by the rule above."} />
    <div style={{ position: 'relative', height: 200, background: 'var(--bg)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <span className="ui-glow ui-glow--purple" style={{ top: -60, left: '20%' }} />
      <span className="ui-glow ui-glow--cyan" style={{ bottom: -80, right: '10%', width: 300, height: 300 }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center', height: '100%', color: 'var(--dim)', font: '500 14px var(--font-sans)' }}>The deck&apos;s signature background depth</div>
    </div>
  </Pad>,
};
