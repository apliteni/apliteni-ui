// ---------------------------------------------------------------------------
// Foundations — Signal contrast.
//
// The record of why the signal tokens hold the values they hold. In the light
// theme --pink, --cyan and --green all missed WCAG AA for normal text, worst of
// all on the surface the kit puts them on deliberately: a 10% wash of the same
// colour. Dark --pink missed it too. This page is what was decided and what it
// measures, kept beside the values it replaced.
//
// Every ratio here is COMPUTED at render time by the WCAG 2.x formula below,
// and every background is painted with the exact colour that ratio was measured
// against. Number and pixel cannot drift apart.
//
// Colour literals. Golden rule 1 says tokens, never literals — and every piece
// of page chrome here obeys it. The literals below are the subject matter: a
// token value as src/tokens/tokens.css holds it today, a composited wash, or a
// value that used to be in the file and is kept for the comparison. Each block
// is marked with where its value comes from. The gate in
// stories/signal-contrast.test.js reads the same tokens out of the stylesheets,
// so a token that moves without this page moving turns that test red.
//
// Themes. Section 1 shows live kit components, so it follows the toolbar theme
// and carries both themes' measurements as labels. Sections 2-6 are painted
// with fixed light- or dark-theme literals and read the same in either theme —
// the point is to compare light against dark without toggling.
// ---------------------------------------------------------------------------
import { pad } from '../_gallery.js';
import { badge, pill, field, input } from '../../src/components/index.js';
import { sidebarNav } from '../../src/components/nav.js';

export default {
  title: 'Foundations/Signal contrast',
  parameters: { layout: 'fullscreen' },
};

// ---- WCAG 2.x maths -------------------------------------------------------
// Relative luminance and contrast ratio, straight from the spec. Nothing on
// this page hardcodes a ratio; they are all produced here.
const rgb = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const hexOf = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const relLum = ([r, g, b]) => {
  const f = (c) => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [x, y] = [relLum(rgb(a)), relLum(rgb(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// Source-over compositing of a wash on an opaque base, rounded to the hex the
// cell is then painted with — so the measured pair IS the drawn pair, exactly.
//
// A live component draws the wash as rgba() and lets the compositor blend it,
// which quantises alpha to 8 bits and can land one step off this value per
// channel. Measured against Chrome's own blend, that is worth at most 0.05 of a
// ratio and flips nothing on this page. The exact composite is the number to
// decide on; the compositor's rounding is a rendering detail.
const washed = (inkRgb, alpha, baseHex) =>
  hexOf(inkRgb.map((c, i) => alpha * c + (1 - alpha) * rgb(baseHex)[i]));

const AA = 4.5;            // WCAG 2.2 §1.4.3, normal text. Nothing here is large text:
                           // the biggest specimen is 14.5px, the smallest 10px.
const GRAPHIC = 3;         // WCAG 2.2 §1.4.11, non-text contrast — the bar for a glyph.
const SCALE = [3, 6.5];    // ratio axis of every bar on this page
const pctOf = (r) => Math.max(0, Math.min(100, ((r - SCALE[0]) / (SCALE[1] - SCALE[0])) * 100));
const AA_PCT = pctOf(AA).toFixed(3);
const n2 = (r) => r.toFixed(2);

// ---- Palette under test ---------------------------------------------------
// LIGHT — copied from :root[data-theme="light"] in src/tokens/tokens.css.
const LIGHT = {
  surface: '#ffffff',   // --bg / --surface
  surface2: '#f5f6f9',  // --surface-2
};
// DARK — copied from :root[data-theme="dark"] in the same file.
const DARK = {
  bg: '#16151f',        // --bg
  surface: '#221f2e',   // --surface
};

const FAMILIES = [
  {
    key: 'pink',
    token: '--pink',
    role: 'danger / revoke',
    // The one family whose token moved. `light`/`dark` are what the kit holds
    // now; `was`/`darkWas` are what they replaced. Both glows were re-tinted
    // from the new value, so each stays its own signal at its own alpha.
    light: '#b63361',
    was: '#d63c72',
    // --glow-pink: rgba(182, 51, 97, 0.1) — the same rgb as --pink.
    glow: { rgb: [182, 51, 97], a: 0.1, sameAsToken: true },
    glowWas: { rgb: [214, 60, 114], a: 0.1 },
    dark: '#e97ca5',
    darkWas: '#e35b8f',
    darkGlow: { rgb: [233, 124, 165], a: 0.16 },
    darkGlowWas: { rgb: [227, 91, 143], a: 0.16 },
    short: 'Revoke',
    // The nav row has no type-only class to borrow; these three values are
    // .ui-nav__item's own (src/styles/nav.css:40-42).
    cls: '',
    type: 'font:400 14.5px/1.2 var(--font-sans)',
    setAt: '14.5px — the nav row label',
  },
  {
    key: 'cyan',
    token: '--cyan',
    role: 'link / info flag',
    light: '#0c8fa8',
    // --glow-cyan: rgba(12, 143, 168, 0.1) — the same rgb as --cyan.
    glow: { rgb: [12, 143, 168], a: 0.1, sameAsToken: true },
    dark: '#20dcf5',
    darkGlow: { rgb: [32, 220, 245], a: 0.14 },
    short: 'Preview',
    // Borrow .ui-badge's own type rather than restate it; only its paint is
    // stripped, so the specimen follows src/styles/badge.css if that moves.
    cls: 'ui-badge',
    type: 'background:transparent;padding:0',
    setAt: '10px uppercase — the badge',
  },
  {
    key: 'green',
    token: '--green',
    role: 'live / success',
    light: '#1c8a2c',
    // --glow-green: rgba(28, 138, 44, 0.1) — the same rgb as --green, since #131
    // re-tinted it. It used to be rgb(30, 150, 50); section 6 records that move.
    glow: { rgb: [28, 138, 44], a: 0.1, sameAsToken: true },
    dark: '#98ff8f',
    darkGlow: { rgb: [152, 255, 143], a: 0.16 },
    short: 'Live',
    cls: 'ui-pill',
    type: 'background:transparent;padding:0',
    setAt: '11px uppercase — the pill',
  },
];

const byKey = Object.fromEntries(FAMILIES.map((f) => [f.key, f]));
const glowHex = (f) => washed(f.glow.rgb, f.glow.a, LIGHT.surface);
const dGlow = (f) => washed(f.darkGlow.rgb, f.darkGlow.a, DARK.surface);

// The light chip pairs, copied from :root[data-theme="light"] in
// src/tokens/tokens.css. All four exist; --chip-info-* was the one written for
// this work, when the info badge was repointed at it.
const CHIPS = [
  { key: 'danger', name: '--chip-danger-*', ink: '#b7295f', fill: '#fbe0ea', label: 'Revoked' },
  { key: 'warn', name: '--chip-warn-*', ink: '#8a5e00', fill: '#fbedd2', label: 'Pending' },
  { key: 'success', name: '--chip-success-*', ink: '#1f7a38', fill: '#dff3e4', label: 'Live' },
  { key: 'info', name: '--chip-info-*', ink: '#0a7286', fill: '#ddeff3', label: 'Preview' },
];
const CHIP = Object.fromEntries(CHIPS.map((c) => [c.key, c]));

// Solid-fill paint, from the same two theme blocks. A solid fill and its ink
// are one pair: --signal-solid-<status> with the theme's single
// --signal-solid-ink. Dark fills are the bright signals and take near-black;
// light fills are the deepened chip inks and take white.
const NEAR_BLACK = '#0c0c0c';   // --signal-contrast, both themes
const WHITE = '#ffffff';
const SOLID = {
  dark: { ink: NEAR_BLACK, success: '#98ff8f', danger: '#e97ca5', warn: '#ffcf6a', info: '#20dcf5', neutral: '#948fa8' },
  light: { ink: WHITE, success: '#1f7a38', danger: '#b7295f', warn: '#8a5e00', info: '#0a7286', neutral: '#5c6270' },
};

// ---- Page chrome ----------------------------------------------------------
// Everything in this block is tokens only.
const CSS = `
  <style>
    .sc { max-width: 1060px; font-family: var(--font-sans); }
    .sc h1 { font: 700 27px/1.2 var(--font-sans); letter-spacing: -.02em; color: var(--strong);
      margin: 0 0 var(--space-3); }
    .sc h2 { font: 600 16px/1.4 var(--font-sans); color: var(--strong); margin: 0 0 var(--space-2); }
    .sc h3 { font: 600 13px/1.4 var(--font-sans); color: var(--strong); margin: 0; }
    .sc p { font: 400 13.5px/1.65 var(--font-sans); color: var(--dim); margin: 0; max-width: 74ch; }
    .sc-lede { font-size: 15px !important; color: var(--text) !important; }

    .sc-sec + .sc-sec { margin-top: var(--space-12); padding-top: var(--space-8);
      border-top: 1px solid var(--border); }
    .sc-sec__head { display: flex; flex-direction: column; gap: var(--space-2);
      margin-bottom: var(--space-6); }
    /* Sentence case, no tracking. The number is load-bearing — the prose refers
       to sections by it — so it stays; the eyebrow treatment does not. */
    .sc-kicker { font: 600 11.5px/1.6 var(--font-sans); color: var(--muted); }
    .sc-code { font: 400 .92em/1.4 var(--font-mono); color: var(--text);
      background: var(--surface-2); border-radius: var(--radius-xs); padding: 1px 5px; }

    /* --- the measured cell: swatch, name, ratio, bar ---------------------- */
    .sc-cell { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
    .sc-swatch { border-radius: var(--radius-sm); padding: 11px 12px; min-height: 44px;
      display: flex; align-items: center; overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(128, 128, 128, .18); }
    .sc-swatch > * { min-width: 0; overflow-wrap: anywhere; }
    /* Two lines are reserved whether the label needs them or not, so the bars —
       and with them the AA line — stay on one rule across a whole row. */
    .sc-meta { display: flex; align-items: baseline; justify-content: space-between;
      gap: var(--space-2); min-height: 31px;
      font: 400 11px/1.4 var(--font-sans); color: var(--muted); }
    .sc-meta b { font: 600 13px/1.3 var(--font-sans); color: var(--strong);
      font-variant-numeric: tabular-nums; }
    .sc-name { min-width: 0; overflow-wrap: anywhere; }

    /* One AA line, drawn once, inherited by every bar on the page. Pass and
       fail are the fill crossing it — no colour is spent on the verdict. Only
       cells held to 4.5 get a bar; the glyph cells in section 4 are held to 3
       and state their number without one, so one line never means two bars. */
    .sc-bar { position: relative; height: 6px; border-radius: 3px;
      background: var(--surface-3); overflow: hidden; }
    .sc-bar::after { content: ''; position: absolute; top: -1px; bottom: -1px;
      left: ${AA_PCT}%; width: 2px; background: var(--strong); }
    /* A failing fill is --muted and a passing one is --strong, so the bar reads
       in both themes; the verdict is still where it stops against the line. */
    .sc-bar__fill { position: absolute; inset: 0 auto 0 0; border-radius: 3px;
      background: var(--muted); }
    .sc-bar.is-pass .sc-bar__fill { background: var(--strong); }
    .sc-verdict { font: 600 11px/1.4 var(--font-sans); color: var(--muted); }
    .sc-verdict.is-pass { color: var(--strong); }

    /* --- grids ------------------------------------------------------------ */
    .sc-panel { border: 1px solid var(--border); border-radius: var(--radius-lg);
      padding: var(--space-5); }
    .sc-panel + .sc-panel { margin-top: var(--space-4); }
    .sc-panel__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-3);
      margin-bottom: var(--space-4); }
    .sc-panel__head p { font-size: 12.5px !important; }

    .sc-ramp { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: var(--space-3); }
    .sc-surfaces { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-3); }
    .sc-row { display: grid; grid-template-columns: 128px 1fr; gap: var(--space-4);
      align-items: start; }
    .sc-row + .sc-row { margin-top: var(--space-4); padding-top: var(--space-4);
      border-top: 1px dashed var(--border); }
    .sc-row__label { font: 600 12.5px/1.45 var(--font-sans); color: var(--strong); }
    .sc-row__label span { display: block; font: 400 11px/1.5 var(--font-sans); color: var(--muted);
      margin-top: 2px; }

    .sc-live { display: grid; grid-template-columns: repeat(auto-fit, minmax(248px, 1fr));
      gap: var(--space-5); }
    /* Four rows, so the stage stretches to the tallest specimen and the three
       label rows under it line up across all four columns. */
    .sc-live__cell { display: grid; grid-template-rows: 1fr auto auto auto; gap: var(--space-2);
      min-width: 0; }
    .sc-live__stage { background: var(--surface-2); border-radius: var(--radius-md);
      padding: var(--space-4); display: flex; align-items: center; gap: var(--space-3);
      min-height: 96px; }
    /* Three lines reserved, so every stage gets the same 1fr and the four
       specimen titles land on one line. Same trick as .sc-meta. */
    .sc-live__cap { font: 400 12px/1.6 var(--font-sans); color: var(--muted); min-height: 58px; }
    .sc-live__nums { display: flex; flex-wrap: wrap; gap: var(--space-4);
      font: 400 12px/1.5 var(--font-sans); color: var(--muted); }
    .sc-live__nums b { font-weight: 600; color: var(--strong); font-variant-numeric: tabular-nums; }

    /* The nav row's danger paint only exists on :hover (src/styles/nav.css:81).
       A specimen cannot be hovered, so the same two declarations are restated
       here — tokens, identical values — to hold the row in its hover state. */
    .sc-hover .ui-nav__item.is-danger { background: var(--glow-pink); color: var(--pink); }

    /* The chip specimens are real .ui-badge elements — shape, size and tracking
       come from src/styles/badge.css, and only the two colours under test are
       written here. Nothing about badge typography is restated in this file. */
    .sc-chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: var(--space-4); }
    .sc-chips .ui-badge { align-self: flex-start; }

    /* A solid fill with its ink on it, and the status circle with its glyph.
       Sized like the things they stand for, not like a colour chip. */
    .sc-fills { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--space-3); }
    .sc-fill { border-radius: var(--radius-md); padding: 10px 12px; min-width: 0;
      font: 500 13px/1.4 var(--font-sans); display: flex; align-items: center;
      justify-content: space-between; gap: var(--space-2); }
    .sc-fill b { font-variant-numeric: tabular-nums; font-weight: 600; }
    .sc-dots { display: flex; flex-wrap: wrap; gap: var(--space-3); }
    .sc-dot { display: flex; align-items: center; gap: var(--space-2); min-width: 0;
      font: 400 12px/1.4 var(--font-sans); color: var(--muted); }
    .sc-dot i { width: 22px; height: 22px; flex: none; border-radius: 50%;
      display: grid; place-items: center; font: 700 12px/1 var(--font-sans); font-style: normal; }
    .sc-dot b { font: 600 12px/1.4 var(--font-sans); color: var(--strong);
      font-variant-numeric: tabular-nums; }

    .sc-notes { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-4); }
    .sc-note { font: 400 12.5px/1.65 var(--font-sans); color: var(--text);
      padding-left: var(--space-3); box-shadow: inset 2px 0 0 var(--border-strong); max-width: 78ch; }

    @media (max-width: 900px) {
      .sc-ramp { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .sc-row { grid-template-columns: 1fr; gap: var(--space-3); }
    }
    @media (max-width: 560px) {
      .sc-surfaces { grid-template-columns: 1fr; }
      .sc-ramp { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>`;

const code = (s) => `<span class="sc-code">${s}</span>`;

// One measured cell. `bg` is painted, `ink` is set on it, and the ratio shown
// is contrast(ink, bg) — the same two values, never a stored number.
const cell = (name, ink, bg, fam) => {
  const r = contrast(ink, bg);
  const pass = r >= AA;
  return `
    <div class="sc-cell">
      <div class="sc-swatch" style="background:${bg}">
        <span class="${fam.cls}" style="color:${ink};${fam.type}">${fam.short}</span>
      </div>
      <div class="sc-meta"><span class="sc-name">${name}</span><b>${n2(r)}</b></div>
      <div class="sc-bar${pass ? ' is-pass' : ''}"><span class="sc-bar__fill" style="width:${pctOf(r).toFixed(2)}%"></span></div>
      <div class="sc-verdict${pass ? ' is-pass' : ''}">${pass ? 'passes AA' : 'fails AA'}</div>
    </div>`;
};

// ===========================================================================
// 1 — Where it lands: the live kit
// ===========================================================================
const liveSpecimen = (title, stage, caption, pairs) => `
  <div class="sc-live__cell">
    <div class="sc-live__stage">${stage}</div>
    <h3>${title}</h3>
    <div class="sc-live__cap">${caption}</div>
    <div class="sc-live__nums">${pairs
      .map(([k, v, ok]) => `<span>${k} <b>${v}</b> ${ok ? 'passes AA' : 'fails AA'}</span>`)
      .join('')}</div>
  </div>`;

const sectionLive = () => {
  const num = (ink, bg) => {
    const r = contrast(ink, bg);
    return [n2(r), r >= AA];
  };
  const pair = (lInk, lBg, dInk, dBg) => {
    const [lr, lp] = num(lInk, lBg);
    const [dr, dp] = num(dInk, dBg);
    return [['light', lr, lp], ['dark', dr, dp]];
  };
  const both = (f, lightBg, darkBg) => pair(f.light, lightBg, f.dark, darkBg);
  // The two success/info chips route through --chip-*-ink / --chip-*-fill, which
  // is a solid pair in light and an alias to the signal + its glow in dark. So
  // light reads the pair's own hexes and dark still reads the signal on its wash.
  const chip = (name, f) => pair(CHIP[name].ink, CHIP[name].fill, f.dark, dGlow(f));

  return `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">1 — Where it lands</div>
      <h2>The four places that failed, as the kit draws them now</h2>
      <p>Live components, following the toolbar theme. Switch to light to see the surfaces the
      work was about. Each pair used to miss AA and clears it now, by one of two routes: the
      pill and the badge were repointed at a chip pair, while the nav row and the field follow
      ${code('--pink')}, which moved. The numbers beside each are measurements of both themes'
      token values.</p>
    </div>
    <div class="sc-live sc-hover">
      ${liveSpecimen(
        'Destructive nav row, hovered',
        sidebarNav({
          items: [
            { id: 'keys', label: 'API keys', icon: 'key' },
            { id: 'revoke', label: 'Revoke access', icon: 'alert', danger: true },
          ],
          active: 'keys',
          ariaLabel: 'Account settings',
        }),
        `${code('--pink')} on ${code('--glow-pink')} — ${code('src/styles/nav.css:81')}`,
        both(byKey.pink, glowHex(byKey.pink), dGlow(byKey.pink)),
      )}
      ${liveSpecimen(
        'Live pill',
        pill('Live', 'live'),
        `now ${code('--chip-success-*')} — ${code('src/styles/badge.css:60')}`,
        chip('success', byKey.green),
      )}
      ${liveSpecimen(
        'Info badge',
        badge('Preview', 'info'),
        `now ${code('--chip-info-*')} — ${code('src/styles/badge.css:27')}`,
        chip('info', byKey.cyan),
      )}
      ${liveSpecimen(
        'Required marker and field error',
        `<div style="width:100%">${field({
          label: 'Workspace name',
          required: true,
          error: 'A workspace with this name already exists.',
          control: input({ value: 'apliteni-core' }),
        })}</div>`,
        `${code('--pink')} on plain ${code('--surface')}, no wash involved —
         ${code('src/styles/input.css:15')} and ${code('src/styles/input.css:17')}`,
        both(byKey.pink, LIGHT.surface, DARK.surface),
      )}
    </div>
    <div class="sc-notes">
      <div class="sc-note">The field is why pink could not be fixed by repointing its consumers.
        Its ${code('--pink')} sits on plain white with nothing washed under it, and it missed AA
        there too — ${n2(contrast(byKey.pink.was, LIGHT.surface))} on white alone. The wash was
        never the whole problem, only the part that turned a near miss into a clear one, so the
        token itself had to move.</div>
    </div>
  </section>`;
};

// ===========================================================================
// 2 — Why the wash binds and not white
// ===========================================================================
// Six cells per family, ordered by how dark the background is. The kit's own
// grey inset surface is dropped into the sequence at the point its contrast
// puts it: between the 0% and 5% wash, every time. Reading left to right is
// reading the mechanism. This argument holds whatever the tokens are, which is
// why it stays on the page now the values are settled.
const RAMP = [0, 5, 10, 15, 20];

const sectionWhy = () => `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">2 — The mechanism</div>
      <h2>Put more of the ink into the background and the ink gets harder to read</h2>
      <p>Each row is one signal colour set on backgrounds made of increasing amounts of
      itself over white. Nothing changes across a row except how much of the ink is in the
      background. ${code('--surface-2')}, the kit's grey inset, is dropped in at the position
      its own contrast earns, and the glow wash is worth roughly twice its darkening. This is the
      part of the page that does not depend on which values shipped: it is why a signal on its
      own tint is the surface to design against, and it stays true of whatever the tokens hold
      next.</p>
    </div>
    ${FAMILIES.map((f) => {
      const cells = [];
      for (const p of RAMP) {
        const bg = washed(f.glow.rgb, p / 100, LIGHT.surface);
        const label = p === 0 ? `white — ${code('--surface')}`
          : p === 10 ? `10% — ${code(f.token.replace('--', '--glow-'))}`
            : `${p}% wash`;
        cells.push({ order: contrast(f.light, bg), html: cell(label, f.light, bg, f) });
        if (p === 0) {
          cells.push({
            order: contrast(f.light, LIGHT.surface2),
            html: cell(`${code('--surface-2')}`, f.light, LIGHT.surface2, f),
          });
        }
      }
      cells.sort((a, b) => b.order - a.order);
      return `
      <div class="sc-panel">
        <div class="sc-panel__head">
          <h3>${f.token} <span style="font-weight:400;color:var(--muted)">${f.role}</span></h3>
          <p>${f.light}, set at ${f.setAt}.${f.glow.sameAsToken
            ? ''
            : ` Its wash is a tint of rgb(${f.glow.rgb.join(', ')}), which is not what ${f.token} is — see section 6.`}</p>
        </div>
        <div class="sc-ramp">${cells.map((c) => c.html).join('')}</div>
      </div>`;
    }).join('')}
    <div class="sc-notes">
      <div class="sc-note">The AA line sits above every cell in every row, including the
        leftmost. All three colours are already short on plain white; the wash is what turns
        a near miss into a clear one.</div>
    </div>
  </section>`;

// ===========================================================================
// 3 — the families that kept their tokens
// ===========================================================================
const chipCell = (c) => {
  const r = contrast(c.ink, c.fill);
  const pass = r >= AA;
  return `
    <div class="sc-cell">
      <span class="ui-badge" style="color:${c.ink};background:${c.fill}">${c.label}</span>
      <div class="sc-meta"><span class="sc-name">${code(c.name)}</span><b>${n2(r)}</b></div>
      <div class="sc-bar${pass ? ' is-pass' : ''}"><span class="sc-bar__fill" style="width:${pctOf(r).toFixed(2)}%"></span></div>
      <div class="sc-verdict${pass ? ' is-pass' : ''}">${pass ? 'clears AA' : 'misses AA'}</div>
    </div>`;
};

const sectionChips = () => {
  const green = byKey.green;
  const cyan = byKey.cyan;
  const band = CHIPS.map((c) => contrast(c.ink, c.fill));
  return `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">3 — Green and cyan</div>
      <h2>Neither token moved; the chips that failed were repointed</h2>
      <p>A chip pair is a solid ink on a solid fill, with no wash and nothing composited, so a chip
      that reads its pair instead of a raw signal is fixed without moving a colour anyone else
      uses. Every green and cyan failure was a chip, so every one of them took this route and
      ${code('--green')} and ${code('--cyan')} still hold the values they always held.</p>
    </div>
    <div class="sc-panel">
      <div class="sc-chips">${CHIPS.map(chipCell).join('')}</div>
    </div>
    <div class="sc-notes">
      <div class="sc-note"><strong>Green needed no new token.</strong> Six rules wrote
        ${code('var(--green)')} on ${code('var(--glow-green)')} and landed at 3.97, next to
        ${code('.ui-badge--live')}, which had used the pair all along and passed at
        ${n2(contrast(CHIP.success.ink, CHIP.success.fill))}. Each was a one-line repoint at a
        pair that already existed. (3.97 is what those rules measured at the time; re-tinting
        ${code('--glow-green')} from ${code('--green')} later moved it to 3.91.)</div>
      <div class="sc-note"><strong>Cyan needed the pair nobody had written.</strong>
        ${code('.ui-badge--info')} was the last chip variant still painting with a raw signal
        token, at ${n2(contrast(cyan.light, glowHex(cyan)))} on its own glow.
        ${code('--chip-info-*')} was added as ${CHIP.info.ink} on ${CHIP.info.fill} —
        ${n2(contrast(CHIP.info.ink, CHIP.info.fill))}, inside the
        ${n2(Math.min(...band))}–${n2(Math.max(...band))} band the other three pairs already
        occupied.</div>
      <div class="sc-note">The same route was available to danger and would have measured
        fine. ${code('--chip-danger-ink')} is ${n2(contrast(CHIP.danger.ink, LIGHT.surface))}
        on white. It was not taken because the failing danger consumers are not chips: a nav row
        on hover and two pieces of form text cannot borrow a chip token without giving it a
        second job its own comment disclaims. That is what section 4 is about.</div>
    </div>
  </section>`;
};

// ===========================================================================
// 4 — --pink moved, and the two themes moved opposite ways
// ===========================================================================
const pinkRows = () => {
  const f = byKey.pink;
  return [
    {
      hex: f.was, label: 'light, before', note: `${f.token} until issue #131`,
      surfaces: [
        [`on white — ${code('--surface')}`, LIGHT.surface],
        [`on ${code('--surface-2')}`, LIGHT.surface2],
        ['on its glow then', washed(f.glowWas.rgb, f.glowWas.a, LIGHT.surface)],
      ],
    },
    {
      hex: f.light, label: 'light, now', note: `${f.token} as the kit resolves it`,
      surfaces: [
        [`on white — ${code('--surface')}`, LIGHT.surface],
        [`on ${code('--surface-2')}`, LIGHT.surface2],
        [`on ${code('--glow-pink')}`, glowHex(f)],
      ],
    },
    {
      hex: f.darkWas, label: 'dark, before', note: `${f.token} until issue #131`,
      surfaces: [
        [`on ${code('--bg')}`, DARK.bg],
        ['on its glow then, over the page', washed(f.darkGlowWas.rgb, f.darkGlowWas.a, DARK.bg)],
        ['on its glow then, over a card', washed(f.darkGlowWas.rgb, f.darkGlowWas.a, DARK.surface)],
      ],
    },
    {
      hex: f.dark, label: 'dark, now', note: `${f.token} as the kit resolves it`,
      surfaces: [
        [`on ${code('--bg')}`, DARK.bg],
        [`on ${code('--glow-pink')}, over the page`, washed(f.darkGlow.rgb, f.darkGlow.a, DARK.bg)],
        [`on ${code('--glow-pink')}, over a card`, dGlow(f)],
      ],
    },
  ];
};

const sectionPink = () => {
  const f = byKey.pink;
  // What the new pink would have measured on the wash it would have inherited,
  // against the wash it actually got, once --glow-pink was re-tinted.
  const lightKept = contrast(f.light, washed(f.glowWas.rgb, f.glowWas.a, LIGHT.surface));
  const lightGot = contrast(f.light, glowHex(f));
  const darkKept = contrast(f.dark, washed(f.darkGlowWas.rgb, f.darkGlowWas.a, DARK.surface));
  const darkGot = contrast(f.dark, dGlow(f));
  return `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">4 — The one token that moved</div>
      <h2>${code('--pink')} went darker in light and lighter in dark</h2>
      <p>Danger is read mostly on its own wash, and a wash pulls the ground toward the ink from
      whichever side the page starts on. In light the ground is white, so the wash lightens
      nothing and the ink has to come down to meet it: ${f.was} → ${f.light}. In dark the ground
      is near-black and the wash lifts it faster than the hue lifts the ink, so danger had to
      move away from the canvas: ${f.darkWas} → ${f.dark}. Two directions, one reason. The rows
      below are the same four surfaces before and after, in both themes.</p>
    </div>
    <div class="sc-panel">
      ${pinkRows().map((r) => `
        <div class="sc-row">
          <div class="sc-row__label">${r.hex}<span>${r.label} — ${r.note}</span></div>
          <div class="sc-surfaces">
            ${r.surfaces.map(([name, bg]) => cell(name, r.hex, bg, f)).join('')}
          </div>
        </div>`).join('')}
    </div>
    <div class="sc-notes">
      <div class="sc-note"><strong>The wash moved with the token.</strong>
        ${code('--glow-pink')} holds a literal <code class="sc-code">rgba()</code>, so moving
        ${code('--pink')} would have left the wash behind. It was re-tinted by hand for a
        second reason as well: ${code('.ui-btn--danger:hover')} mixes ${code('--pink')} at 10%
        itself, so a frozen ${code('--glow-pink')} would have put two different pink washes
        side by side in the same app. The re-tint costs almost nothing and flips no verdict —
        light ${n2(lightKept)} → ${n2(lightGot)}, dark over a card ${n2(darkKept)} →
        ${n2(darkGot)}.</div>
      <div class="sc-note">${code('--surface-2')} is a reference column, not a live failure: no
        kit rule sets signal-coloured <em>text</em> on it. ${code('.ui-input.is-invalid')} puts
        ${code('--pink')} on it as a border, and a border is held to ${GRAPHIC}:1, which it
        clears.</div>
    </div>
  </section>`;
};

// ===========================================================================
// 5 — When a signal stops being ink
// ===========================================================================
const fillCell = (label, fill, ink, bar) => {
  const r = contrast(ink, fill);
  const pass = r >= bar;
  return `
    <div class="sc-cell">
      <div class="sc-fill" style="background:${fill};color:${ink}">
        <span>${label}</span><b>${n2(r)}</b>
      </div>
      <div class="sc-verdict${pass ? ' is-pass' : ''}">${pass ? 'clears' : 'misses'} ${bar}:1</div>
    </div>`;
};

const dot = (label, circle, glyph) => {
  const r = contrast(glyph, circle);
  return `<span class="sc-dot"><i style="background:${circle};color:${glyph}">✕</i>
    ${label} <b>${n2(r)}</b></span>`;
};

const sectionFills = () => {
  const p = byKey.pink;
  const statuses = ['success', 'danger', 'warn', 'info', 'neutral'];
  const fills = (theme) => `<div class="sc-fills">${statuses
    .map((s) => fillCell(s, SOLID[theme][s], SOLID[theme].ink, AA)).join('')}</div>`;
  return `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">5 — When a signal stops being ink</div>
      <h2>A fill and the ink on it are one choice, not two</h2>
      <p>Everything above paints a signal as ink. A solid toast inverts that: the signal becomes
      the background, and something else has to read on top of it. The kit used to pick the fill
      from the status and the ink from a global, on separate axes, so nothing made a status's
      fill and its own ink clear each other — and four of the ten status × theme combinations
      did not. Light ${code('--green')} is the case that settles the argument: as a solid fill
      it measures ${n2(contrast(NEAR_BLACK, '#1c8a2c'))} against near-black and
      ${n2(contrast(WHITE, '#1c8a2c'))} against white, so no ink rescues it and the
      <em>fill</em> is what has to move.</p>
    </div>
    <div class="sc-panel">
      <div class="sc-panel__head">
        <h3>Dark <span style="font-weight:400;color:var(--muted)">the bright signals, inked near-black</span></h3>
        <p>${code('--signal-solid-ink')} is ${NEAR_BLACK} here, and it clears all five.</p>
      </div>
      ${fills('dark')}
    </div>
    <div class="sc-panel">
      <div class="sc-panel__head">
        <h3>Light <span style="font-weight:400;color:var(--muted)">the deepened chip inks, inked white</span></h3>
        <p>The signals are mid-tone in light, so the fills drop to the values the chip pairs
        already carry and ${code('--signal-solid-ink')} is white.</p>
      </div>
      ${fills('light')}
    </div>
    <div class="sc-notes">
      <div class="sc-note"><strong>The rule.</strong> A solid fill is the status at its theme's
        extreme, and the ink is the pole opposite it, so one ink per theme clears all five. A
        new status supplies one ${code('--signal-solid-&lt;status&gt;')} on the correct side of its
        theme's midline and inherits the ink; there is no per-status ink decision left to get
        wrong. The quieter of the two inks is diluted to 90% rather than given an
        ${code('opacity')}, because the dilution used to spend exactly the contrast the pair
        was picked for.</div>
      <div class="sc-note"><strong>The status circle takes the ink half of that rule and not
        the fill half.</strong> A soft or outline toast draws its glyph on a 22px
        ${code('--toast-accent')} circle, and that circle cannot move to the theme's extreme:
        the 3px left marker and the outline border are the same token, so a circle that left
        the accent would put two pinks in one toast. Only the ink is free, and the bar for a
        glyph is ${GRAPHIC}:1 rather than ${AA}:1. In dark one ink still does it, because the
        five dark accents are the same five bright hues the solid fills take. In light it
        cannot: the accents there are deepened to read as ink on white, which parks them
        mid-luminance where neither pole dominates, so light keeps a per-status ink.</div>
      <div class="sc-note"><strong>Dark danger was the combination that broke.</strong> Its
        glyph was white, which was right while dark ${code('--pink')} was ${p.darkWas}. Section
        4 lightened it to ${p.dark} for the wash, and that carried the circle past the point
        where white could read on it —
        ${n2(contrast(WHITE, p.dark))} against the ${GRAPHIC}:1 bar. Dark
        ${code('--danger-contrast')} is now ${code('--signal-contrast')}, which is to say dark
        danger stopped being the exception:
        <span class="sc-dots" style="margin-top:var(--space-2)">
          ${dot('white on the old circle', p.darkWas, WHITE)}
          ${dot('white on the circle today', p.dark, WHITE)}
          ${dot('near-black on the circle today', p.dark, NEAR_BLACK)}
        </span></div>
      <div class="sc-note">Light danger keeps its white glyph, at
        ${n2(contrast(WHITE, p.light))} — near-black
        would measure ${n2(contrast(NEAR_BLACK, p.light))} there, so the token stays split by
        theme. All ten solid pairs and all ten glyph pairs are gated in
        ${code('stories/signal-contrast.test.js')}.</div>
    </div>
  </section>`;
};

// ===========================================================================
// 6 — The last glow that was not a tint of its own token
// ===========================================================================
const sectionOpen = () => {
  const g = byKey.green;
  const oldWash = washed([30, 150, 50], 0.1, LIGHT.surface);
  return `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">6 — Re-tinted</div>
      <h2>${code('--glow-green')} is a tint of ${code('--green')} now</h2>
      <p>A wash is its own colour at low alpha and nothing else. Green's was not: it read
      <code class="sc-code">rgba(30, 150, 50, 0.1)</code> while ${code('--green')} is ${g.light} —
      rgb(${rgb(g.light).join(', ')}) — and the two had been apart since the initial commit.
      rgb(30, 150, 50) was not a token, not a step in any ramp and not the dark green, so it
      was a leftover from a hand-authored palette rather than a decision anyone made. It is
      now <code class="sc-code">rgba(${g.glow.rgb.join(', ')}, 0.1)</code>, which is
      ${code('--green')} at the alpha the other three light glows already use.</p>
    </div>
    <div class="sc-panel">
      <div class="sc-surfaces">
        ${cell(`the old wash — ${oldWash}`, g.light, oldWash, g)}
        ${cell(`${code('--glow-green')} today — ${glowHex(g)}`, g.light, glowHex(g), g)}
        ${cell(`white — ${code('--surface')}`, g.light, LIGHT.surface, g)}
      </div>
    </div>
    <div class="sc-notes">
      <div class="sc-note"><strong>It moves almost nothing, and that was the test.</strong>
        The wash over white goes ${oldWash} to ${glowHex(g)} — two levels on one channel —
        worth ${n2(Math.abs(contrast(g.light, glowHex(g)) - contrast(g.light, oldWash)))} of a
        ratio. Every surface that reads ${code('--glow-green')} keeps the verdict it had:
        the success callout, the soft success toast, the success panel and the feedback
        confirmation all carry body copy at 9.29 before and 9.15 after, well clear of AA.
        The first two cells still fail AA against ${code('--green')} itself, exactly as they
        did — the drift was never what made them fail.</div>
      <div class="sc-note"><strong>No chip moved.</strong> The success chips stopped reading
        ${code('--green')} on ${code('--glow-green')} back in section 3; they read
        ${code('--chip-success-ink')} on ${code('--chip-success-fill')}, at
        ${n2(contrast(CHIP.success.ink, CHIP.success.fill))}, and in light that fill is the
        solid ${CHIP.success.fill} rather than a wash. Dark's ${code('--glow-green')} was
        already an exact tint of its own ${code('--green')} and did not change.
        All four glows are now gated in both themes, in
        ${code('stories/signal-contrast.test.js')}.</div>
    </div>
  </section>`;
};

// ===========================================================================
export const Diagnosis = {
  name: 'Signal contrast on the glow washes',
  render: () => pad(`
    ${CSS}
    <div class="sc">
      <h1>Signal contrast on the glow washes</h1>
      <p class="sc-lede">In the light theme ${code('--pink')}, ${code('--cyan')} and
        ${code('--green')} all missed WCAG AA for normal text, and they missed it by the most
        on the surface the kit puts them on deliberately: a 10% wash of the same colour. Dark
        ${code('--pink')} missed it too. Cyan and green were fixed by repointing their chips at
        the deepened chip pairs, so neither token moved; ${code('--pink')} moved, in both
        themes and in opposite directions. Then the same rule had to be written a second time
        for the surfaces where a signal is the fill rather than the ink. This page is the
        record of those choices, measured.</p>
      <p style="margin-top:var(--space-3)">The bar under each specimen runs from
        ${SCALE[0].toFixed(1)} to ${SCALE[1].toFixed(1)}; the vertical line on it is
        ${AA.toFixed(1)}, the AA threshold for text under 18.66px bold or 24px regular.
        Nothing measured against that line is large text. Cells held to the ${GRAPHIC}:1 of
        non-text contrast state their number without a bar, so one line never stands for two
        thresholds. Every ratio is computed from the two colours actually painted in that cell:
        a wash is drawn as the flat colour it composites to. A live component blends the wash
        itself and can round a channel one step further, worth at most 0.05 either way.</p>
      ${sectionLive()}
      ${sectionWhy()}
      ${sectionChips()}
      ${sectionPink()}
      ${sectionFills()}
      ${sectionOpen()}
    </div>
  `),
};
