import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Elevation',
  parameters: { layout: 'fullscreen' },
};

// Bottom to top. `note` is what the step is for; `on` is the step it sits on, so
// the specimen can draw each one over its own ground rather than over the page.
// `mark` is how that step is MARKED in the kit, and the swatch draws it live rather
// than drawing a line of its own: two of these rungs are levels and carry a real
// treatment, and the other three are grounds and fills that carry none. Without
// this the page showed five crisp hairlines in light, where the kit draws none.
// why: docs/foundations.md#elevation
const SWATCH = 'border:1px solid var(--border)';
const CARD = 'border:1px solid var(--card-edge);box-shadow:var(--elev-rest)';
const FLOATING = 'border:1px solid var(--float-edge);'
  + 'box-shadow:inset 0 0 0 1px var(--elev-edge, var(--float-edge-inner)), var(--elev-drop)';

const LADDER = [
  ['--bg', 'Page', 'The base canvas. Nothing is below it.', null, SWATCH],
  ['--surface-2', 'Sunken', 'Non-text marks and tracks.', '--bg', SWATCH],
  ['--surface', 'Card', 'A card, a panel that does not float.', '--bg', CARD],
  ['--bg-elevated', 'Floating', 'A menu, a dropdown panel, the drawer, a modal, a toast.', '--surface', FLOATING],
  ['--surface-3', 'Top', 'Non-text quiet fills.', '--bg-elevated', SWATCH],
];

const step = ([token, name, note, on, mark]) => `
  <div style="display:flex;flex-direction:column;gap:11px">
    <div style="padding:18px;border-radius:16px;background:var(${on || token})">
      <div style="height:74px;border-radius:12px;background:var(${token});${mark}"></div>
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
    ${p('A surface casts a shadow only to say it is <em>higher</em>, and each theme says it its own way. A level — a card, the shell\'s rail, a floating surface — keeps its step on this ladder in both themes; what marks its edge is the theme\'s. <strong>Dark draws the kit hairline. Light casts a soft drop and draws no neutral line at all.</strong>')}
    ${p('A line that divides two regions of <em>one</em> surface is not a level and stays a line in both themes: a card\'s rows, a table\'s rules, the rail\'s head band, the topbar. A field is not a level either — its edge is what says "type here". Every specimen of a <em>level</em> on this page draws the live tokens, so each one shows whichever answer the theme you are reading in gives.')}

    ${h3('Surface tokens')}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:22px">${LADDER.map(step).join('')}</div>
    ${p('Two of those five are levels and carry a real treatment above: <strong>Card</strong> draws <code style="font-family:var(--font-mono);color:var(--accent)">--card-edge</code> with <code style="font-family:var(--font-mono);color:var(--accent)">--elev-rest</code>, and <strong>Floating</strong> draws the full floating treatment. The outline on the other three is this page\'s own, so a ground or a fill is visible on its own colour — the kit does not draw it.')}
    ${p('Grey inset and quiet fills are for non-text marks. Fields, chips and rows keep text on a reading surface; their edges and meaningful accents show state.')}

    ${h3('The step on its own is not an edge')}
    ${p('A step of lightness is a contrast of about 1.1: enough to read as a change of surface, not enough to draw an edge. Something has to draw it, and a level draws a line <em>or</em> casts a drop — never neither. In light a card sits 1.110 above the page and casts <code style="font-family:var(--font-mono);color:var(--accent)">--elev-rest</code>; in dark it keeps <code style="font-family:var(--font-mono);color:var(--accent)">--border</code> and casts nothing. Both are <code style="font-family:var(--font-mono);color:var(--accent)">--card-edge</code> and one rung, so a sheet never asks which theme it is in.')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;max-width:820px">
      <div style="padding:22px;border-radius:16px;background:var(--bg)">
        <div style="height:84px;border-radius:12px;background:var(--surface);${CARD}"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:12px">A card on the page</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">As the kit draws one: the step, and whichever mark the theme gives it.</div>
      </div>
      <div style="padding:22px;border-radius:16px;background:var(--bg)">
        <div style="height:84px;border-radius:12px;background:var(--surface)"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:12px">The step alone</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">The same card with its edge and its rung taken off — the flat card this rule exists to prevent.</div>
      </div>
    </div>

    ${h3('The floating step, and the one place light has no step at all')}
    ${p('A floating surface writes its edge twice and then casts, in one declaration: <code style="font-family:var(--font-mono);color:var(--accent)">--float-edge</code> on the border, <code style="font-family:var(--font-mono);color:var(--accent)">--float-edge-inner</code> as a one-pixel inset line within it, then the drop. In <strong>dark</strong> those resolve to <code style="font-family:var(--font-mono);color:var(--accent)">--border-strong</code> and <code style="font-family:var(--font-mono);color:var(--accent)">--border</code> — an outer line against what is behind, an inner one against the panel. One line measured 1.27 against the card; two measure 1.64.')}
    ${p('In <strong>light</strong> both resolve to <code style="font-family:var(--font-mono);color:var(--accent)">transparent</code>, and the drop carries all of it. It has to: <code style="font-family:var(--font-mono);color:var(--accent)">--surface</code> and <code style="font-family:var(--font-mono);color:var(--accent)">--bg-elevated</code> are both white, so a panel over a card has a step of <strong>1.000</strong> — nothing. The right-hand specimen below is that panel with its rung taken off, and in light there is nothing there to see. That is the point.')}
    ${p('The drops live in one token, <code style="font-family:var(--font-mono);color:var(--accent)">--elev-drop</code>, and the line is written on the floating rule itself, in front of them — a <code style="font-family:var(--font-mono);color:var(--accent)">var()</code> inside a custom property resolves where that property is declared, so an <code style="font-family:var(--font-mono);color:var(--accent)">--elev-edge</code> read at <code style="font-family:var(--font-mono);color:var(--accent)">:root</code> could never be re-pointed by the toast that needs it. The drop is spent differently per theme, because it is not worth the same in each: near-black ink on a near-black page reaches 1.20 at its core and dark is carried by the edge, while light spends 22% and reaches 1.57 — raised from the 18% <a class="ui-focusable" href="https://github.com/apliteni/apliteni-ui/issues/309" style="color:var(--accent)">#309</a> shipped, because the two lines it used to sit behind are gone and the gate\'s floor for light rose with it to 1.50. Decided on #309, split by theme on <a href="https://github.com/apliteni/apliteni-ui/issues/490" style="color:var(--accent)">#490</a>.')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;max-width:820px">
      <div style="padding:30px;border-radius:16px;background:var(--surface)">
        <div style="height:84px;border-radius:12px;background:var(--bg-elevated);${FLOATING}"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:16px">The floating treatment</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">A panel over a card, as the kit draws one.</div>
      </div>
      <div style="padding:30px;border-radius:16px;background:var(--surface)">
        <div style="height:84px;border-radius:12px;background:var(--bg-elevated)"></div>
        <div style="font:600 12.5px/1.5 var(--font-sans);color:var(--strong);margin-top:16px">The step alone</div>
        <div style="font:400 12px/1.45 var(--font-sans);color:var(--muted)">The same two surfaces with the treatment taken off. In light they are both white.</div>
      </div>
    </div>

    ${h3('The shadow tokens')}
    ${p('<code style="font-family:var(--font-mono);color:var(--accent)">--shadow-sm</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-md</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-lg</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-seg</code> and <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-card</code> are deprecated and resolve to the transparent shadow <code style="font-family:var(--font-mono);color:var(--accent)">0 0 #0000</code> in both themes. They stay published so a consumer reading one does not break; nothing in the kit reads them. The shadows it does paint are the three rungs of the ladder — <code style="font-family:var(--font-mono);color:var(--accent)">--elev-rest</code> under a card, <code style="font-family:var(--font-mono);color:var(--accent)">--elev-rail</code> cast sideways off the shell\'s rail, and <code style="font-family:var(--font-mono);color:var(--accent)">--elev-drop</code> under a floating surface — and in dark all three but the last are the transparent shadow too. Transparent rather than <code style="font-family:var(--font-mono);color:var(--accent)">none</code>, because a shadow token is read in a list — <code style="font-family:var(--font-mono);color:var(--accent)">none</code> there invalidates the declaration and takes the focus ring composed beside it. <code style="font-family:var(--font-mono);color:var(--accent)">--shadow-ink</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--sheen</code>, <code style="font-family:var(--font-mono);color:var(--accent)">--ring</code> and <code style="font-family:var(--font-mono);color:var(--accent)">--scrim</code> are untouched — none of them is a cast shadow.')}

    ${h3('Ambient glow')}
    ${p('The deck’s signature depth is a light source behind the page, not a shadow in front of it, so it is unaffected by the rule above.')}
    <div style="position:relative;height:200px;background:var(--bg);border-radius:18px;overflow:hidden;border:1px solid var(--border)">
      <span class="ui-glow ui-glow--purple" style="top:-60px;left:20%"></span>
      <span class="ui-glow ui-glow--cyan" style="bottom:-80px;right:10%;width:300px;height:300px"></span>
      <div style="position:relative;z-index:1;display:grid;place-items:center;height:100%;color:var(--dim);font:500 14px var(--font-sans)">The deck's signature background depth</div>
    </div>
  `),
};
