import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Elevation',
  parameters: { layout: 'fullscreen' },
};

// Bottom to top. `note` is what the step is for; `on` is the step it sits on, so
// the specimen can draw each one over its own ground rather than over the page.
// why: docs/specification.md#elevation
const LADDER = [
  ['--bg', 'Page', 'The base canvas. Nothing is below it.', null],
  ['--surface-2', 'Sunken', 'A field, a track, a disabled box, a code block.', '--bg'],
  ['--surface', 'Card', 'A card, a panel that does not float.', '--bg'],
  ['--bg-elevated', 'Floating', 'A menu, a dropdown panel, the drawer, a modal, a toast.', '--surface'],
  ['--surface-3', 'Top', 'The hover readout, a chip, the rail’s hover row.', '--bg-elevated'],
];

const step = ([token, name, note, on]) => `
  <div style="display:flex;flex-direction:column;gap:11px">
    <div style="padding:18px;border-radius:16px;background:var(${on || token})">
      <div style="height:74px;border-radius:12px;background:var(${token});border:1px solid var(--border)"></div>
    </div>
    <div>
      <div style="font:600 13px/1 var(--font-sans);color:var(--strong)">${name}</div>
      <code style="font-family:var(--font-mono);font-size:11px;color:var(--muted)">${token}</code>
      <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted);margin-top:5px">${note}</div>
    </div>
  </div>`;

const p = (html) => `<p style="color:var(--dim);max-width:66ch;line-height:1.6;margin-bottom:14px">${html}</p>`;
const h3 = (t) => `<h3 style="font:600 13px/1 var(--font-display);color:var(--muted);margin:52px 0 20px">${t}</h3>`;

export const Ladder = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 var(--font-display);color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Elevation</h1>
    ${p('Nothing in the kit casts a shadow except a surface that floats. A card, a field, a chip and a row say how high they are with two things — their step on a ladder of lightness, and the hairline around them. A menu, a panel, the drawer, a modal and a toast keep both, draw the hairline twice, and add one soft drop.')}
    ${p('Dark runs the ladder upwards: the page is the darkest thing on screen, and every step above it is lighter than the one under it. Light cannot, because nothing is brighter than the white a card already was — so the page comes off white, the card comes off white behind it, and white is kept for the top. On a light screen a floating panel is the only pure white.')}

    ${h3('The ladder, bottom to top')}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:22px">${LADDER.map(step).join('')}</div>

    ${p('<strong style="color:var(--strong)">In light the top step is the exception.</strong> Switch the theme on this page and the last swatch goes the other way: <code style="font-family:var(--font-mono);color:var(--accent)">--surface-3</code> is <code style="font-family:var(--font-mono);color:var(--accent)">#e7eaf1</code>, below the page and a hair above the sunken step, because it cannot be above a floating panel that is already white. In light it means the quiet fill — a chip, a hovered row, the readout’s panel — and the readout reads as recessed rather than raised. Open on <a href="https://github.com/apliteni/apliteni-ui/issues/295" style="color:var(--accent)">#295</a>.')}

    ${h3('A row inside a raised panel lifts')}
    ${p('A hovered row, an active row, a chip and a key cap inside a floating panel take the step above the panel, never <code style="font-family:var(--font-mono);color:var(--accent)">--surface</code> — which is the card step and sits below <code style="font-family:var(--font-mono);color:var(--accent)">--bg-elevated</code> in dark, so a hover drawn with it sank while the panel floated. A field inside a panel goes the other way: it is the sunken step.')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;max-width:820px">
      <div style="padding:14px;border-radius:14px;background:var(--bg-elevated);border:1px solid var(--border)">
        <div style="padding:9px 11px;border-radius:8px;background:var(--surface-3);font:500 12.5px/1.4 var(--font-sans);color:var(--text)">A hovered row — the step above</div>
        <div style="padding:9px 11px;border-radius:8px;font:500 12.5px/1.4 var(--font-sans);color:var(--muted)">A resting row</div>
      </div>
      <div style="padding:14px;border-radius:14px;background:var(--bg-elevated);border:1px solid var(--border)">
        <div style="padding:9px 11px;border-radius:8px;background:var(--surface);font:500 12.5px/1.4 var(--font-sans);color:var(--text)">The card step, as it was — it sinks</div>
        <div style="padding:9px 11px;border-radius:8px;font:500 12.5px/1.4 var(--font-sans);color:var(--muted)">A resting row</div>
      </div>
    </div>

    ${h3('The line and the step do different jobs')}
    ${p('A step of lightness is a contrast of about 1.1: enough to read as a change of surface, not enough to draw an edge. The line draws the edge; the step says which way is up. So every floating surface keeps the kit hairline, and the card carries one in both themes — not only in light, as it did before.')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;max-width:820px">
      <div style="padding:22px;border-radius:16px;background:var(--surface)">
        <div style="height:84px;border-radius:12px;background:var(--bg-elevated);border:1px solid var(--border)"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:12px">Step and line</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">A panel over a card, with the one line a card takes too.</div>
      </div>
      <div style="padding:22px;border-radius:16px;background:var(--surface)">
        <div style="height:84px;border-radius:12px;background:var(--bg-elevated)"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:12px">Step alone</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">The same two surfaces with the line taken off.</div>
      </div>
    </div>

    ${h3('The floating step draws its edge twice, and then casts')}
    ${p('A floating surface takes <code style="font-family:var(--font-mono);color:var(--accent)">--border-strong</code> on its border and <code style="font-family:var(--font-mono);color:var(--accent)">--border</code> as a one-pixel line inside it — an outer line against what is behind, an inner one against the panel. One line measured 1.27 in dark and 1.18 in light against the card; two measure 1.64 and 1.44. The drop comes after both, in the same declaration: broad and faint, so it separates the panel from what it covers rather than drawing its edge.')}
    ${p('The drops live in one token, <code style="font-family:var(--font-mono);color:var(--accent)">--elev-drop</code>, and the line is written on the floating rule itself, in front of them — a <code style="font-family:var(--font-mono);color:var(--accent)">var()</code> inside a custom property resolves where that property is declared, so an <code style="font-family:var(--font-mono);color:var(--accent)">--elev-edge</code> read at <code style="font-family:var(--font-mono);color:var(--accent)">:root</code> could never be re-pointed by the toast that needs it. The drop is spent differently per theme, because it is not worth the same in each: near-black ink on a near-black page reaches 1.20 at its core and dark is carried by the edge, while light reaches 1.44 and gets the stronger reading of the two. Decided on <a href="https://github.com/apliteni/apliteni-ui/issues/309" style="color:var(--accent)">#309</a>.')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;max-width:820px">
      <div style="padding:30px;border-radius:16px;background:var(--surface)">
        <div style="height:84px;border-radius:12px;background:var(--bg-elevated);border:1px solid var(--border-strong);box-shadow:inset 0 0 0 1px var(--elev-edge, var(--border)), var(--elev-drop)"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:16px">The floating treatment</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">A panel over a card, as the kit draws one now.</div>
      </div>
      <div style="padding:30px;border-radius:16px;background:var(--surface)">
        <div style="height:84px;border-radius:12px;background:var(--bg-elevated);border:1px solid var(--border)"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:16px">The step and one line</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">The same two surfaces as the kit drew them before #309.</div>
      </div>
    </div>

    ${h3('The shadow tokens')}
    ${p('<code style="font-family:var(--font-mono);color:var(--accent)">--shadow-sm</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-md</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-lg</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-seg</code> and <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-card</code> are deprecated and resolve to the transparent shadow <code style="font-family:var(--font-mono);color:var(--accent)">0 0 #0000</code> in both themes. They stay published so a consumer reading one does not break; nothing in the kit reads them — the one shadow it paints is <code style="font-family:var(--font-mono);color:var(--accent)">--elev-drop</code>, above. Transparent rather than <code style="font-family:var(--font-mono);color:var(--accent)">none</code>, because a shadow token is read in a list — <code style="font-family:var(--font-mono);color:var(--accent)">none</code> there invalidates the declaration and takes the focus ring composed beside it. <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-ink</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--sheen</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--ring</code> and <code style="font-family:var(--font-mono);color:var(--accent)">--scrim</code> are untouched — none of them is a cast shadow.')}

    ${h3('Ambient glow')}
    ${p('The deck’s signature depth is a light source behind the page, not a shadow in front of it, so it is unaffected by the rule above.')}
    <div style="position:relative;height:200px;background:var(--bg);border-radius:18px;overflow:hidden;border:1px solid var(--border)">
      <span class="ui-glow ui-glow--purple" style="top:-60px;left:20%"></span>
      <span class="ui-glow ui-glow--cyan" style="bottom:-80px;right:10%;width:300px;height:300px"></span>
      <div style="position:relative;z-index:1;display:grid;place-items:center;height:100%;color:var(--dim);font:500 14px var(--font-sans)">The deck's signature background depth</div>
    </div>
  `),
};
