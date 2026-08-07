// ---------------------------------------------------------------------------
// Foundations — Signal contrast.
//
// A diagnostic page, not a gallery. Three light-mode signal colours (--pink,
// --cyan, --green) miss WCAG AA on the surfaces the kit actually draws them on,
// and the worst surface is each colour's own 10% glow wash. A table of numbers
// did not settle which way to fix it, so this page sets the same numbers as
// specimens: every ratio here is COMPUTED at render time by the WCAG 2.x
// formula below, and every background is painted with the exact colour that
// ratio was measured against. Number and pixel cannot drift apart.
//
// Colour literals. Golden rule 1 says tokens, never literals — and every piece
// of page chrome here obeys it. The literals below are the subject matter: a
// measured token value, a composited wash, or a CANDIDATE that deliberately
// does not exist in src/tokens/tokens.css yet. This page PROPOSES; it changes
// no token. Each block is marked with where its value comes from.
//
// Themes. Section 1 shows live kit components, so it follows the toolbar theme
// and carries both themes' measurements as labels. Sections 2-5 are painted
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
    light: '#d63c72',
    // --glow-pink: rgba(214, 60, 114, 0.1) — the same rgb as --pink.
    glow: { rgb: [214, 60, 114], a: 0.1, sameAsToken: true },
    // CANDIDATES — proposed replacements for the light --pink. Not in the kit.
    steps: [{ label: '10% darker', hex: '#c13667' }, { label: '15% darker', hex: '#b63361' }],
    dark: '#e35b8f',
    darkGlow: { rgb: [227, 91, 143], a: 0.16 },
    specimen: 'Revoke access',
    short: 'Revoke',
    // The nav row has no type-only class to borrow; these three values are
    // .ui-nav__item's own (src/styles/nav.css:40-42).
    cls: '',
    type: 'font:400 14.5px/1.2 var(--font-sans)',
    setAt: '14.5px — the nav row label',
    refs: 16, files: 9,
  },
  {
    key: 'cyan',
    token: '--cyan',
    role: 'link / info flag',
    light: '#0c8fa8',
    // --glow-cyan: rgba(12, 143, 168, 0.1) — the same rgb as --cyan.
    glow: { rgb: [12, 143, 168], a: 0.1, sameAsToken: true },
    steps: [
      { label: '10% darker', hex: '#0b8197' },
      { label: '15% darker', hex: '#0a7a8f' },
      { label: '20% darker', hex: '#0a7286' },
    ],
    dark: '#20dcf5',
    darkGlow: { rgb: [32, 220, 245], a: 0.14 },
    specimen: 'Preview',
    short: 'Preview',
    // Borrow .ui-badge's own type rather than restate it; only its paint is
    // stripped, so the specimen follows src/styles/badge.css if that moves.
    cls: 'ui-badge',
    type: 'background:transparent;padding:0',
    setAt: '10px uppercase — the badge',
    refs: 7, files: 5,
  },
  {
    key: 'green',
    token: '--green',
    role: 'live / success',
    light: '#1c8a2c',
    // --glow-green: rgba(30, 150, 50, 0.1). NOTE the rgb is NOT --green
    // (#1c8a2c = 28,138,44). Green is the one family whose wash is a tint of a
    // slightly different, lighter green than the ink laid on it.
    glow: { rgb: [30, 150, 50], a: 0.1, sameAsToken: false },
    steps: [{ label: '10% darker', hex: '#197c28' }, { label: '15% darker', hex: '#187525' }],
    dark: '#98ff8f',
    darkGlow: { rgb: [152, 255, 143], a: 0.16 },
    specimen: 'Live',
    short: 'Live',
    cls: 'ui-pill',
    type: 'background:transparent;padding:0',
    setAt: '11px uppercase — the pill',
    refs: 27, files: 11,
  },
];

const byKey = Object.fromEntries(FAMILIES.map((f) => [f.key, f]));
const glowHex = (f) => washed(f.glow.rgb, f.glow.a, LIGHT.surface);

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
       fail are the fill crossing it — no colour is spent on the verdict. */
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
  const pinkGlow = glowHex(byKey.pink);
  const cyanGlow = glowHex(byKey.cyan);
  const greenGlow = glowHex(byKey.green);
  const dGlow = (f) => washed(f.darkGlow.rgb, f.darkGlow.a, DARK.surface);

  const num = (ink, bg) => {
    const r = contrast(ink, bg);
    return [n2(r), r >= AA];
  };
  const both = (f, lightBg, darkBg) => {
    const [lr, lp] = num(f.light, lightBg);
    const [dr, dp] = num(f.dark, darkBg);
    return [['light', lr, lp], ['dark', dr, dp]];
  };

  return `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">1 — Where it lands</div>
      <h2>Four places the kit puts a signal colour on a wash of itself</h2>
      <p>These are live components: they follow the toolbar theme, so switch to light to see
      the failing pairs as drawn. The numbers beside each are fixed measurements of both
      themes' token values.</p>
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
        both(byKey.pink, pinkGlow, dGlow(byKey.pink)),
      )}
      ${liveSpecimen(
        'Live pill',
        pill('Live', 'live'),
        `${code('--green')} on ${code('--glow-green')} — ${code('src/styles/badge.css:57')}`,
        both(byKey.green, greenGlow, dGlow(byKey.green)),
      )}
      ${liveSpecimen(
        'Info badge',
        badge('Preview', 'info'),
        `${code('--cyan')} on ${code('--glow-cyan')} — ${code('src/styles/badge.css:27')}`,
        both(byKey.cyan, cyanGlow, dGlow(byKey.cyan)),
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
      <div class="sc-note">The field is the control case. Its ${code('--pink')} sits on plain white,
        with nothing washed under it, and it still misses AA — so the wash is not the whole
        problem, only the part that makes a near miss a clear one.</div>
    </div>
  </section>`;
};

// ===========================================================================
// 2 — Why the wash binds and not white
// ===========================================================================
// Six cells per family, ordered by how dark the background is. The kit's own
// grey inset surface is dropped into the sequence at the point its contrast
// puts it: between the 0% and 5% wash, every time. Reading left to right is
// reading the mechanism.
const RAMP = [0, 5, 10, 15, 20];

const sectionWhy = () => `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">2 — The mechanism</div>
      <h2>Put more of the ink into the background and the ink gets harder to read</h2>
      <p>Each row is one signal colour set on backgrounds made of increasing amounts of
      itself over white. Nothing changes across a row except how much of the ink is in the
      background. ${code('--surface-2')}, the kit's grey inset, is dropped in at the position
      its own contrast earns — the glow wash is worth roughly twice its darkening.</p>
    </div>
    ${FAMILIES.map((f) => {
      const cells = [];
      for (const p of RAMP) {
        const bg = washed(f.glow.rgb, p / 100, LIGHT.surface);
        const label = p === 0 ? `white — ${code('--surface')}`
          : p === 10 ? `10% — today's ${code(f.token.replace('--', '--glow-'))}`
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
            : ` Its wash is a tint of rgb(${f.glow.rgb.join(', ')}), which is not what ${f.token} is — green is the one family washed with a slightly different colour from the ink laid on it.`}</p>
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
// 3 — The candidates
// ===========================================================================
const sectionCandidates = () => `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">3 — Option A: move the signal token</div>
      <h2>Today's value and the darker steps, on all three surfaces</h2>
      <p>Each row is one candidate for the light-theme token; each column is a surface the
      kit draws it on. Same specimen, same size, same AA line. Changing the token changes
      every consumer of it.</p>
    </div>
    ${FAMILIES.map((f) => {
      const gh = glowHex(f);
      const rows = [{ label: 'today', hex: f.light, note: `${f.token} as shipped` }]
        .concat(f.steps.map((s) => ({ label: s.label, hex: s.hex, note: 'candidate' })));
      return `
      <div class="sc-panel">
        <div class="sc-panel__head">
          <h3>${f.token} <span style="font-weight:400;color:var(--muted)">${f.role}</span></h3>
          <p>${f.refs} references across ${f.files} files in ${code('src/styles')} follow this token.</p>
        </div>
        ${rows.map((r) => `
          <div class="sc-row">
            <div class="sc-row__label">${r.hex}<span>${r.label} — ${r.note}</span></div>
            <div class="sc-surfaces">
              ${cell(`on white — ${code('--surface')}`, r.hex, LIGHT.surface, f)}
              ${cell(`on ${code('--surface-2')}`, r.hex, LIGHT.surface2, f)}
              ${cell(`on today's glow — ${gh}`, r.hex, gh, f)}
            </div>
          </div>`).join('')}
      </div>`;
    }).join('')}
    <div class="sc-notes">
      <div class="sc-note">${code('--surface-2')} is a reference column, not a live failure:
        no kit rule sets signal-coloured <em>text</em> on it. ${code('.ui-input.is-invalid')}
        puts ${code('--pink')} on it as a border, and a border is held to 3:1, which it clears.</div>
      <div class="sc-note">Cyan is the awkward one. Its 15% step still lands under the line on
        its own glow, so it is the only family where the step that works is 20%.</div>
      <div class="sc-note">${retintNote()}</div>
    </div>
  </section>`;

// The glow tokens are literal rgba() of today's signal values, so moving a
// signal token on its own leaves its wash exactly where it is — which is what
// the third column above measures. This works out what happens if the wash is
// re-tinted from the candidate as well, because that is a second decision and
// somebody will ask.
const retintNote = () => {
  const rows = FAMILIES.flatMap((f) => f.steps.map((s) => {
    const today = contrast(s.hex, glowHex(f));
    const moved = contrast(s.hex, washed(rgb(s.hex), f.glow.a, LIGHT.surface));
    return { today, moved, drop: today - moved };
  }));
  const passing = rows.filter((r) => r.today >= AA);
  const tightest = passing.reduce((a, b) => (b.moved < a.moved ? b : a));
  const drops = passing.map((r) => r.drop);
  return `The wash tokens hold literal <code class="sc-code">rgba()</code> of today's signal
    values, so moving a signal token on its own leaves its wash where it is — that is the
    third column above. Re-tinting the wash from the candidate too is a second decision, and
    it costs between ${Math.min(...drops).toFixed(2)} and ${Math.max(...drops).toFixed(2)}.
    It flips no verdict here: the tightest candidate would go from
    ${n2(tightest.today)} to ${n2(tightest.moved)}, still over the line.`;
};

// ===========================================================================
// 4 — Option B: the chip inks
// ===========================================================================
// Existing light chip pairs, copied from :root[data-theme="light"] in
// src/tokens/tokens.css. The info pair is the one that was never written; the
// value shown for it is a CANDIDATE.
const CHIPS = [
  { name: '--chip-danger-*', ink: '#b7295f', fill: '#fbe0ea', label: 'Revoked', state: 'exists' },
  { name: '--chip-warn-*', ink: '#8a5e00', fill: '#fbedd2', label: 'Pending', state: 'exists' },
  { name: '--chip-success-*', ink: '#1f7a38', fill: '#dff3e4', label: 'Live', state: 'exists' },
  { name: '--chip-info-*', ink: '#0a7286', fill: '#ddeff3', label: 'Preview', state: 'candidate' },
];

const chipCell = (c) => {
  const r = contrast(c.ink, c.fill);
  const pass = r >= AA;
  return `
    <div class="sc-cell">
      <span class="ui-badge" style="color:${c.ink};background:${c.fill}">${c.label}</span>
      <div class="sc-meta"><span class="sc-name">${code(c.name)}</span><b>${n2(r)}</b></div>
      <div class="sc-bar${pass ? ' is-pass' : ''}"><span class="sc-bar__fill" style="width:${pctOf(r).toFixed(2)}%"></span></div>
      <div class="sc-verdict${pass ? ' is-pass' : ''}">${c.state === 'exists' ? 'In the kit today, and it' : 'A candidate, and it would'} ${pass ? 'clears AA' : 'miss AA'}</div>
    </div>`;
};

const sectionChips = () => {
  const cyan = byKey.cyan;
  const green = byKey.green;
  return `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">4 — Option B: leave the signal tokens alone</div>
      <h2>The light theme already carries deepened inks for chips. Three of the four exist.</h2>
      <p>A chip pair is a solid ink on a solid fill — no wash, nothing composited. Danger,
      warning and success each have one and each clears AA. Info was never written. Routing
      the failing consumers through this set moves no signal colour, so nothing outside a
      status chip changes appearance.</p>
    </div>
    <div class="sc-panel">
      <div class="sc-chips">${CHIPS.map(chipCell).join('')}</div>
    </div>
    <div class="sc-notes">
      <div class="sc-note"><strong>Green needs no new token.</strong>
        ${code('.ui-badge--live')} already uses ${code('--chip-success-*')} and passes at
        ${n2(contrast('#1f7a38', '#dff3e4'))}. ${code('.ui-pill--live')} at
        ${code('src/styles/badge.css:57')} bypasses it and writes ${code('var(--green)')} on
        ${code('var(--glow-green)')} instead, which is why it lands at
        ${n2(contrast(green.light, glowHex(green)))}. Pointing it at the pair that already
        exists is a one-line change with no token added.</div>
      <div class="sc-note"><strong>Cyan needs the pair that was never written.</strong>
        ${code('.ui-badge--info')} at ${code('src/styles/badge.css:27')} is the only chip
        variant still painting with a raw signal token. The candidate above is
        ${code('#0a7286')} on ${code('#ddeff3')} at ${n2(contrast('#0a7286', '#ddeff3'))} —
        inside the band the other three pairs already occupy
        (${n2(contrast('#1f7a38', '#dff3e4'))}–${n2(contrast('#8a5e00', '#fbedd2'))}). The ink
        is the same hex as cyan's 20% step in section 3.</div>
      <div class="sc-note"><strong>Pink is where the two options stop being equivalent.</strong>
        ${code('--chip-danger-ink')} clears everything —
        ${n2(contrast('#b7295f', LIGHT.surface))} on white,
        ${n2(contrast('#b7295f', glowHex(byKey.pink)))} on the pink glow — but the failing pink
        consumers are not chips. ${code('.ui-nav__item.is-danger:hover')} is a hover state and
        ${code('.ui-field__req')} and ${code('.ui-field__error')} are form text. Routing those
        through a chip token means giving a chip token a second job.</div>
      <div class="sc-note">Nothing above touches ${code('--cyan')} at
        ${code('src/styles/callout.css:21')} or ${code('src/styles/code.css:52')}, or
        ${code('--pink')} at ${code('src/styles/button.css:69')} — those consumers keep
        today's values under Option B and take the new ones under Option A.</div>
    </div>
  </section>`;
};

// ===========================================================================
// 5 — Dark
// ===========================================================================
const sectionDark = () => `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">5 — Dark theme</div>
      <h2>Cyan and green are far clear in dark. Pink is not.</h2>
      <p>The dark signal values are declared in a separate block of
      ${code('src/tokens/tokens.css')}, so every candidate in sections 3 and 4 leaves them
      untouched. Painted here with the dark literals, so this reads the same whichever theme
      the toolbar is in.</p>
    </div>
    ${FAMILIES.map((f) => {
      const gBg = washed(f.darkGlow.rgb, f.darkGlow.a, DARK.bg);
      const gSurf = washed(f.darkGlow.rgb, f.darkGlow.a, DARK.surface);
      return `
      <div class="sc-panel">
        <div class="sc-panel__head">
          <h3>${f.token} <span style="font-weight:400;color:var(--muted)">${f.dark}</span></h3>
          <p>wash at ${Math.round(f.darkGlow.a * 100)}%, over the page and over a card</p>
        </div>
        <div class="sc-surfaces">
          ${cell(`on ${code('--bg')}`, f.dark, DARK.bg, f)}
          ${cell(`on its own glow over ${code('--bg')} — ${gBg}`, f.dark, gBg, f)}
          ${cell(`on its own glow over ${code('--surface')} — ${gSurf}`, f.dark, gSurf, f)}
        </div>
      </div>`;
    }).join('')}
    <div class="sc-notes">
      <div class="sc-note">Dark cyan and dark green clear AA with room to spare on every
        surface, so no candidate can hurt them.</div>
      <div class="sc-note">Dark ${code('--pink')} on ${code('--glow-pink')} misses AA too —
        ${n2(contrast(byKey.pink.dark, washed(byKey.pink.darkGlow.rgb, byKey.pink.darkGlow.a, DARK.surface)))}
        over a card and
        ${n2(contrast(byKey.pink.dark, washed(byKey.pink.darkGlow.rgb, byKey.pink.darkGlow.a, DARK.bg)))}
        over the page. It is the same failure as light, less severe, and it is a separate
        decision from anything on this page: none of the candidates here would move it.</div>
    </div>
  </section>`;

// ===========================================================================
export const Diagnosis = {
  name: 'Signal contrast on the glow washes',
  render: () => pad(`
    ${CSS}
    <div class="sc">
      <h1>Signal contrast on the glow washes</h1>
      <p class="sc-lede">In the light theme ${code('--pink')}, ${code('--cyan')} and
        ${code('--green')} all miss WCAG AA for normal text, and they miss it by the most on
        the surface the kit puts them on deliberately: a 10% wash of the same colour. This
        page measures every pair it draws, at the size the kit sets it.</p>
      <p style="margin-top:var(--space-3)">The bar under each specimen runs from
        ${SCALE[0].toFixed(1)} to ${SCALE[1].toFixed(1)}; the vertical line on it is
        ${AA.toFixed(1)}, the AA threshold for text under 18.66px bold or 24px regular.
        Nothing on this page is large text. Every ratio is computed from the two colours
        actually painted in that cell: a wash is drawn as the flat colour it composites to,
        so the number under a specimen is the contrast of the two colours in front of you.
        A live component blends the wash itself and can round a channel one step further,
        worth at most 0.05 either way.</p>
      ${sectionLive()}
      ${sectionWhy()}
      ${sectionCandidates()}
      ${sectionChips()}
      ${sectionDark()}
    </div>
  `),
};
