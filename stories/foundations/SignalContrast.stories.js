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
    // Pink is the family that took Option A: the token itself moved, in both
    // themes and in opposite directions. `light`/`dark` are the SHIPPED values;
    // `was` and `darkWas` are what they replaced, kept so the two sit side by
    // side. Both glows were re-tinted from the new value, so they stay the
    // signal at its own alpha.
    light: '#b63361',
    was: '#d63c72',
    // --glow-pink: rgba(182, 51, 97, 0.1) — the same rgb as --pink.
    glow: { rgb: [182, 51, 97], a: 0.1, sameAsToken: true },
    glowWas: { rgb: [214, 60, 114], a: 0.1 },
    // No candidates left to weigh: the 15% step is the shipped value, and the
    // 10% step (#c13667, 4.35 on its own glow) lost because it stayed under AA.
    steps: [],
    dark: '#e97ca5',
    darkWas: '#e35b8f',
    darkGlow: { rgb: [233, 124, 165], a: 0.16 },
    darkGlowWas: { rgb: [227, 91, 143], a: 0.16 },
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
  const dGlow = (f) => washed(f.darkGlow.rgb, f.darkGlow.a, DARK.surface);

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
      <p>These are live components: they follow the toolbar theme, so switch to light to see
      what the fix does. Each pair used to miss AA and now clears it, by one of the two routes
      below — the pill and the badge were repointed at a chip pair, the nav row and the field
      follow ${code('--pink')}, which moved. The numbers beside each are fixed measurements of
      both themes' token values.</p>
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
      <div class="sc-note">The field is the control case, and it is why pink could not be
        fixed by repointing consumers. Its ${code('--pink')} sits on plain white with nothing
        washed under it, and it missed AA there too — ${n2(contrast(byKey.pink.was, LIGHT.surface))}
        on white alone. The wash was never the whole problem, only the part that turned a near
        miss into a clear one, so the token itself had to move.</div>
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
// A family that shipped a move gets two rows — what it was, then what it is —
// each measured against ITS OWN glow, because the glow moved with it. A family
// that did not move keeps one row plus its untaken candidates, all measured
// against the one glow that is still in the kit.
const lightRows = (f) => {
  const gh = glowHex(f);
  const before = f.was
    ? [{
      label: 'before this branch', hex: f.was, note: `${f.token} until issue #131`,
      glow: washed(f.glowWas.rgb, f.glowWas.a, LIGHT.surface), glowLabel: 'its glow then',
    }]
    : [];
  return before
    .concat([{
      label: f.was ? 'shipped' : 'today', hex: f.light, note: `${f.token} as the kit resolves it`,
      glow: gh, glowLabel: f.was ? 'its glow now' : "today's glow",
    }])
    .concat(f.steps.map((s) => ({
      label: s.label, hex: s.hex, note: 'candidate, not taken',
      glow: gh, glowLabel: "today's glow",
    })));
};

const sectionCandidates = () => `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">3 — Option A: move the signal token — light</div>
      <h2>What pink was, what it is now, and the steps cyan and green did not take</h2>
      <p>Each row is one value for a light-theme token; each column is a surface the kit draws
      it on. Same specimen, same size, same AA line. Pink is the family that took this route,
      so it has a before row and a shipped row, each on its own glow — read it against the
      matching pair in section 5, where dark moved the opposite way. Cyan and green kept their
      tokens; their darker steps stay here as the option that was weighed.</p>
    </div>
    ${FAMILIES.map((f) => {
      const rows = lightRows(f);
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
              ${cell(`on ${r.glowLabel} — ${r.glow}`, r.hex, r.glow, f)}
            </div>
          </div>`).join('')}
      </div>`;
    }).join('')}
    <div class="sc-notes">
      <div class="sc-note">${code('--surface-2')} is a reference column, not a live failure:
        no kit rule sets signal-coloured <em>text</em> on it. ${code('.ui-input.is-invalid')}
        puts ${code('--pink')} on it as a border, and a border is held to 3:1, which it clears.</div>
      <div class="sc-note">Cyan and green kept their tokens: their candidate rows are here as
        the option that was weighed and not taken. Cyan is the awkward one — its 15% step still
        lands under the line on its own glow, so 20% was the first step that would have worked,
        and that hex became ${code('--chip-info-ink')} in section 4 instead.</div>
      <div class="sc-note">${retintNote()}</div>
    </div>
  </section>`;

// The glow tokens hold literal rgba() of their signal, so moving a signal token
// leaves its wash behind unless the wash is re-tinted too. Pink's was, and this
// prices that second decision from the values actually in the kit.
const retintNote = () => {
  const p = byKey.pink;
  // Ratio of the new pink against the wash it would have inherited (old rgb)
  // versus the wash it actually got (new rgb).
  const kept = (glowRgb, a, base) => contrast(p.light, washed(glowRgb, a, base));
  const lightKept = kept(p.glowWas.rgb, p.glowWas.a, LIGHT.surface);
  const lightGot = kept(p.glow.rgb, p.glow.a, LIGHT.surface);
  const dKept = contrast(p.dark, washed(p.darkGlowWas.rgb, p.darkGlowWas.a, DARK.surface));
  const dGot = contrast(p.dark, washed(p.darkGlow.rgb, p.darkGlow.a, DARK.surface));
  return `<strong>The wash moved with the token.</strong> ${code('--glow-pink')} holds a literal
    <code class="sc-code">rgba()</code>, so it had to be re-tinted by hand or pink would have
    become the second family — after green — whose wash is a tint of a different colour from
    the ink laid on it. It also keeps ${code('.ui-btn--danger:hover')} honest: that rule mixes
    ${code('--pink')} at 10% itself, so a frozen ${code('--glow-pink')} would have put two
    different pink washes side by side in the same app. The cost is small and flips no verdict:
    light goes ${n2(lightKept)} → ${n2(lightGot)}, dark over a card ${n2(dKept)} → ${n2(dGot)}.`;
};

// ===========================================================================
// 4 — Option B: the chip inks
// ===========================================================================
// The light chip pairs, copied from :root[data-theme="light"] in
// src/tokens/tokens.css. All four now exist — info was written when the info
// badge was repointed at it.
const CHIPS = [
  { key: 'danger', name: '--chip-danger-*', ink: '#b7295f', fill: '#fbe0ea', label: 'Revoked' },
  { key: 'warn', name: '--chip-warn-*', ink: '#8a5e00', fill: '#fbedd2', label: 'Pending' },
  { key: 'success', name: '--chip-success-*', ink: '#1f7a38', fill: '#dff3e4', label: 'Live' },
  { key: 'info', name: '--chip-info-*', ink: '#0a7286', fill: '#ddeff3', label: 'Preview' },
];
const CHIP = Object.fromEntries(CHIPS.map((c) => [c.key, c]));

const chipCell = (c) => {
  const r = contrast(c.ink, c.fill);
  const pass = r >= AA;
  return `
    <div class="sc-cell">
      <span class="ui-badge" style="color:${c.ink};background:${c.fill}">${c.label}</span>
      <div class="sc-meta"><span class="sc-name">${code(c.name)}</span><b>${n2(r)}</b></div>
      <div class="sc-bar${pass ? ' is-pass' : ''}"><span class="sc-bar__fill" style="width:${pctOf(r).toFixed(2)}%"></span></div>
      <div class="sc-verdict${pass ? ' is-pass' : ''}">In the kit today, and it ${pass ? 'clears AA' : 'misses AA'}</div>
    </div>`;
};

const sectionChips = () => {
  const cyan = byKey.cyan;
  const green = byKey.green;
  return `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">4 — Option B: leave the signal tokens alone</div>
      <h2>The light theme carries deepened inks for chips. All four now exist, and green and
      cyan were fixed here rather than by moving a token.</h2>
      <p>A chip pair is a solid ink on a solid fill — no wash, nothing composited. Routing a
      failing chip through this set moves no signal colour, so nothing outside a status chip
      changes appearance. That is why every green and cyan failure took this route and neither
      token moved.</p>
    </div>
    <div class="sc-panel">
      <div class="sc-chips">${CHIPS.map(chipCell).join('')}</div>
    </div>
    <div class="sc-notes">
      <div class="sc-note"><strong>Green needed no new token.</strong> Six rules wrote
        ${code('var(--green)')} on ${code('var(--glow-green)')} and landed at
        ${n2(contrast(green.light, glowHex(green)))} — ${code('.ui-pill--live')},
        ${code('.ui-nav__badge.is-live')}, ${code('.ui-dropdown__badge.is-live')},
        ${code('.vbadge.live')} and ${code('.tag--added')} on the changelog page, next to
        ${code('.ui-badge--live')}, which had used the pair all along and passed at
        ${n2(contrast(CHIP.success.ink, CHIP.success.fill))}. Each was a one-line repoint at
        the pair that already existed.</div>
      <div class="sc-note"><strong>Cyan needed the pair that was never written.</strong>
        ${code('.ui-badge--info')} at ${code('src/styles/badge.css:27')} was the last chip
        variant painting with a raw signal token. ${code('--chip-info-*')} is
        ${code(CHIP.info.ink)} on ${code(CHIP.info.fill)} at
        ${n2(contrast(CHIP.info.ink, CHIP.info.fill))} — inside the band the other three pairs
        occupy (${n2(contrast(CHIP.success.ink, CHIP.success.fill))}–${n2(contrast(CHIP.warn.ink, CHIP.warn.fill))}).
        The ink is the same hex as cyan's 20% step in section 3.</div>
      <div class="sc-note"><strong>Pink is where the two options stopped being equivalent, and
        why it took the other one.</strong> ${code('--chip-danger-ink')} clears everything —
        ${n2(contrast(CHIP.danger.ink, LIGHT.surface))} on white,
        ${n2(contrast(CHIP.danger.ink, glowHex(byKey.pink)))} on the pink glow — but the failing
        pink consumers are not chips. ${code('.ui-nav__item.is-danger:hover')} is a hover state
        and ${code('.ui-field__req')} and ${code('.ui-field__error')} are form text. Routing
        those through a chip token would give a chip token a second job its own comment
        disclaims, so ${code('--pink')} moved instead — section 3 for light, section 5 for
        dark.</div>
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
// Same two-row shape as section 3, on the three dark surfaces.
const darkRows = (f) => {
  const before = f.darkWas
    ? [{ label: 'before this branch', hex: f.darkWas, note: `${f.token} until issue #131`, glow: f.darkGlowWas }]
    : [];
  return before.concat([{
    label: f.darkWas ? 'shipped' : 'today', hex: f.dark,
    note: `${f.token} as the kit resolves it`, glow: f.darkGlow,
  }]);
};

const sectionDark = () => {
  const p = byKey.pink;
  const pinkOn = (hex, glow, base) => n2(contrast(hex, washed(glow.rgb, glow.a, base)));
  return `
  <section class="sc-sec">
    <div class="sc-sec__head">
      <div class="sc-kicker">5 — Dark theme</div>
      <h2>Cyan and green were always far clear in dark. Pink was not, and moved the other way.</h2>
      <p>The dark signal values are declared in a separate block of
      ${code('src/tokens/tokens.css')}, so cyan and green — which took Option B — read here
      exactly as they always did. Pink took Option A in both themes, so it gets the same
      before-and-after pair of rows section 3 gives it, and the two are meant to be read
      together. Painted with the dark literals, so this reads the same whichever theme the
      toolbar is in.</p>
    </div>
    ${FAMILIES.map((f) => `
      <div class="sc-panel">
        <div class="sc-panel__head">
          <h3>${f.token} <span style="font-weight:400;color:var(--muted)">${f.role}</span></h3>
          <p>wash at ${Math.round(f.darkGlow.a * 100)}%, over the page and over a card</p>
        </div>
        ${darkRows(f).map((r) => {
          const gBg = washed(r.glow.rgb, r.glow.a, DARK.bg);
          const gSurf = washed(r.glow.rgb, r.glow.a, DARK.surface);
          return `
          <div class="sc-row">
            <div class="sc-row__label">${r.hex}<span>${r.label} — ${r.note}</span></div>
            <div class="sc-surfaces">
              ${cell(`on ${code('--bg')}`, r.hex, DARK.bg, f)}
              ${cell(`on its own glow over ${code('--bg')} — ${gBg}`, r.hex, gBg, f)}
              ${cell(`on its own glow over ${code('--surface')} — ${gSurf}`, r.hex, gSurf, f)}
            </div>
          </div>`;
        }).join('')}
      </div>`).join('')}
    <div class="sc-notes">
      <div class="sc-note">Dark cyan and dark green clear AA with room to spare on every
        surface, which is why neither needed a token move in either theme.</div>
      <div class="sc-note"><strong>The two themes moved in opposite directions.</strong>
        Dark ${code('--pink')} was ${pinkOn(p.darkWas, p.darkGlowWas, DARK.surface)} on its
        own glow over a card and ${pinkOn(p.darkWas, p.darkGlowWas, DARK.bg)} over the page —
        the same failure as light, less severe. The fix is to go
        <em>lighter</em>, to ${p.dark}, because the ground under the ink here is near-black:
        ${pinkOn(p.dark, p.darkGlow, DARK.surface)} over a card,
        ${pinkOn(p.dark, p.darkGlow, DARK.bg)} over the page. Light went darker, to ${p.light},
        because there the ground is white.</div>
      <div class="sc-note"><strong>What the dark move costs.</strong> A solid danger fill takes
        ${code('--danger-contrast')} (white) as its ink — ${code('.ui-toast--danger.ui-toast--solid')}
        at ${code('src/styles/callout.css:87')}. White on the old dark pink was
        ${n2(contrast('#ffffff', p.darkWas))}, already under AA; on ${p.dark} it is
        ${n2(contrast('#ffffff', p.dark))}. The two constraints pull opposite ways — ink on the
        wash wants pink lighter, white on the fill wants it darker — so no single dark pink
        satisfies both. Dark needs its own ${code('--danger-contrast')} or its own deepened
        chip pair, and that is a separate token decision this branch did not take.</div>
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
        ${code('--pink')} missed it too. Cyan and green were fixed by routing their chips at
        the deepened chip pairs; pink had to move the token, in both themes and in opposite
        directions. This page measures every pair it draws, at the size the kit sets it, and
        keeps the before values beside the shipped ones.</p>
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
