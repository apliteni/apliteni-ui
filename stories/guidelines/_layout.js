// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { badge } from '../../src/components/index.js';
import { pad } from '../_gallery.js';

// Rule text is stored as plain prose; this is what wraps its file references,
// token names and selectors in <code> at render time.
export const mono = (s) => String(s).replace(
  /(?:[\w/-]+(?:\.[\w-]+)*\.(?:css|js)(?::\d+)?|var\(--[a-z0-9-]+\)|--[a-z0-9-]+|\.[A-Za-z][\w-]*(?:__[\w-]+)?(?:\.[\w-]+)*(?::[a-z-]+)?)/g,
  (m) => `<code>${m}</code>`,
);

// The 420px below is not this page's number: it is the confirm's own
// `--confirm-w` (src/styles/confirm.css), written out because a custom property
// does not travel from a descendant to its ancestor. Change either and
// stories/guidelines/destructive-actions.test.js fails, naming both files.
// The measure tokens #198 added do NOT replace it — this grid sizes to its
// widest SPECIMEN, not to a page. Removed by #208.
// why: docs/adr/0009-a-page-has-two-widths-and-the-site-owns-the-container.md
const SPEC_CSS = `
  <style>
    .gl { --gl-specimen: 420px;
          --gl-cell: calc(var(--gl-specimen) + var(--space-5) * 2);
          --gl-page: calc(var(--gl-cell) * 2 + var(--space-4)); }
    .gl code { font-family: var(--font-mono); font-size: .88em; color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent); border-radius: 6px; padding: 2px 6px; }
    .gl-stage { background: var(--surface); border-radius: var(--radius-lg);
      box-shadow: inset 0 0 0 1px var(--border); padding: var(--space-5); }
    .gl-cursor { display: inline-flex; align-items: center; gap: 7px; margin-top: var(--space-3);
      font: 500 11px/1 Poppins; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
    .gl-cursor::before { content: ""; width: 7px; height: 7px; border-radius: 50%; flex: none;
      background: var(--muted); box-shadow: 0 0 0 4px color-mix(in srgb, var(--muted) 22%, transparent); }
    /* A specimen confirm joins the flow; its scrim would else cover the page. */
    .gl-stage--confirm .ui-confirm { position: static; }
    .gl-stage--confirm .ui-confirm__scrim { display: none; }
    .gl-stage--confirm .ui-confirm__panel { position: static; translate: none; width: auto; }
  </style>`;

const PAGE_CSS = `
  <style>
    .gc { max-width: var(--gl-page); }
    .gc h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin-bottom: var(--space-6); }
    /* By name, not ".gc h2": that also matched .ui-confirm__title and outranked it. */
    .gc-imperative { font: 600 16px/1.45 Poppins; color: var(--strong); margin: 0 0 var(--space-3); }

    .gc-rule + .gc-rule { margin-top: var(--space-8); padding-top: var(--space-8);
      border-top: 1px solid var(--border); }

    /* min() drops the pair single-file only once a cell stops fitting. */
    .gc-pair { display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(var(--gl-cell), 100%), 1fr));
      gap: var(--space-4); }
    .gc-cell { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
    .gc-cell__cap { font: 400 12px/1.55 Poppins; color: var(--muted); }

    .gc-why { font: 400 13px/1.65 Poppins; color: var(--dim); margin: 0; max-width: 72ch; }

    /* Label stays --muted: --amber as text misses AA on this page. */
    .gc-except { margin: var(--space-2) 0 0; padding-left: var(--space-3);
      box-shadow: inset 2px 0 0 var(--amber);
      font: 400 12.5px/1.65 Poppins; color: var(--text); max-width: 72ch; }
    .gc-except__label { font: 600 10.5px/1.7 Poppins; letter-spacing: .12em;
      text-transform: uppercase; color: var(--muted); margin-right: var(--space-2); }

    /* The citations, stripped to addresses and set on one line. Three lines of
       "hovers to --pink" said the same thing three times. */
    .gc-refs { margin-top: var(--space-3); display: flex; flex-wrap: wrap; gap: var(--space-2);
      font: 400 12px/1.6 Poppins; color: var(--muted); }

    /* Legible and nothing more. What a rule the kit does not meet should look
       like is decided separately, and replaces this rule and unmetLine(). */
    .gc-unmet { margin: var(--space-2) 0 0; font: 400 12.5px/1.65 Poppins; color: var(--text);
      max-width: 72ch; }
  </style>`;

const doBadge = () => badge('Do', 'live');
const dontBadge = () => badge('Don’t', 'danger');

const cell = (badgeHtml, caption, html) => `
  <div class="gc-cell">
    <div>${badgeHtml}</div>
    ${html}
    <div class="gc-cell__cap">${mono(caption)}</div>
  </div>`;

const figure = (rule) => (rule.doHtml ? `
  <div class="gc-pair">
    ${cell(doBadge(), rule.doCaption, rule.doHtml())}
    ${cell(dontBadge(), rule.dontCaption, rule.dontHtml())}
  </div>` : `
  <p class="gc-why">${mono(rule.why)}</p>`);

// Guarded because an unguarded version rendered "Except undefined", and two
// page authors met that and invented a boundary to get rid of it.
const exceptLine = (rule) => (rule.except ? `
  <p class="gc-except"><span class="gc-except__label">Except</span>${mono(rule.except)}</p>` : '');

const unmetLine = (rule) => (rule.unmet ? `
  <p class="gc-unmet">${mono(rule.unmet.note)} #${rule.unmet.issue}</p>` : '');

const refs = (rule) => (rule.kit?.length ? `
  <div class="gc-refs">${rule.kit.map((k) => mono(k.ref)).join(' ')}</div>` : '');

const ruleBlock = (rule) => `
  <section class="gc-rule">
    <h2 class="gc-imperative">${mono(rule.imperative)}</h2>
    ${figure(rule)}
    ${unmetLine(rule)}
    ${exceptLine(rule)}
    ${refs(rule)}
  </section>`;

export const guidelinePage = ({ title, rules, css = '' }) => `${SPEC_CSS}${PAGE_CSS}${css}${pad(`<div class="gl gc">
    <h1>${title}</h1>
    ${rules.map(ruleBlock).join('')}
  </div>`)}`;
