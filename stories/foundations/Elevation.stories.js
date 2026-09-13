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
    ${p('Nothing in the kit casts a shadow. A surface says how high it is with two things — its step on a ladder of lightness, and the hairline around it.')}
    ${p('Dark runs the ladder upwards: the page is the darkest thing on screen and every step above it is lighter. Light cannot, because nothing is brighter than the white a card already was, so light runs the same rule downwards — the page comes off white, the card comes off white behind it, and white is kept for the top. On a light screen a floating panel is the only pure white.')}

    ${h3('The ladder, bottom to top')}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:22px">${LADDER.map(step).join('')}</div>

    ${h3('The line and the step do different jobs')}
    ${p('A step of lightness is a contrast of about 1.1: enough to read as a change of surface, not enough to draw an edge. The line draws the edge; the step says which way is up. So every floating surface keeps the kit hairline, and the card carries one in both themes — not only in light, as it did before.')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;max-width:820px">
      <div style="padding:22px;border-radius:16px;background:var(--surface)">
        <div style="height:84px;border-radius:12px;background:var(--bg-elevated);border:1px solid var(--border)"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:12px">Step and line</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">A panel over a card, as the kit draws it.</div>
      </div>
      <div style="padding:22px;border-radius:16px;background:var(--surface)">
        <div style="height:84px;border-radius:12px;background:var(--bg-elevated)"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:12px">Step alone</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">The same two surfaces with the line taken off.</div>
      </div>
    </div>

    ${h3('The shadow tokens')}
    ${p('<code style="font-family:var(--font-mono);color:var(--accent)">--shadow-sm</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-md</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-lg</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-seg</code> and <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-card</code> are deprecated and resolve to the transparent shadow <code style="font-family:var(--font-mono);color:var(--accent)">0 0 #0000</code> in both themes. They stay published so a consumer reading one does not break; nothing in the kit reads them. Transparent rather than <code style="font-family:var(--font-mono);color:var(--accent)">none</code>, because a shadow token is read in a list — <code style="font-family:var(--font-mono);color:var(--accent)">none</code> there invalidates the declaration and takes the focus ring composed beside it. <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-ink</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--sheen</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--ring</code> and <code style="font-family:var(--font-mono);color:var(--accent)">--scrim</code> are untouched — none of them is a cast shadow.')}

    ${h3('Ambient glow')}
    ${p('The deck’s signature depth is a light source behind the page, not a shadow in front of it, so it is unaffected by the rule above.')}
    <div style="position:relative;height:200px;background:var(--bg);border-radius:18px;overflow:hidden;border:1px solid var(--border)">
      <span class="ui-glow ui-glow--purple" style="top:-60px;left:20%"></span>
      <span class="ui-glow ui-glow--cyan" style="bottom:-80px;right:10%;width:300px;height:300px"></span>
      <div style="position:relative;z-index:1;display:grid;place-items:center;height:100%;color:var(--dim);font:500 14px var(--font-sans)">The deck's signature background depth</div>
    </div>
  `),
};
