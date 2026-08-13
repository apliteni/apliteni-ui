// ---------------------------------------------------------------------------
// The shared shell every guideline page is rendered through: the furniture a
// specimen sits on, the page layout around the rules, and the one renderer that
// turns a content module's TITLE and RULES into a story.
//
// A page brings its own TITLE, its own RULES and — optionally — its own
// specimen CSS, which is appended after the CSS here so a page can still style
// the stage its own specimens need.
// ---------------------------------------------------------------------------
import { badge } from '../../src/components/index.js';
import { pad } from '../_gallery.js';

// Wrap the technical fragments of a plain-text sentence — file references,
// token names, selectors — in <code>. Keeping the data plain text means the
// layout can style those fragments however it wants.
export const mono = (s) => String(s).replace(
  /(?:[\w/-]+(?:\.[\w-]+)*\.(?:css|js)(?::\d+)?|var\(--[a-z0-9-]+\)|--[a-z0-9-]+|\.[A-Za-z][\w-]*(?:__[\w-]+)?(?:\.[\w-]+)*(?::[a-z-]+)?)/g,
  (m) => `<code>${m}</code>`,
);

// ---- Specimen CSS ---------------------------------------------------------
// `.gl-stage` is the neutral surface every specimen sits on.
//
// `--gl-specimen` is the page's declared measure. The page does not re-measure
// its own copy for it — it takes the confirm's own `--confirm-w`
// (src/styles/confirm.css), so a specimen is the width the product renders it
// at, and a copy edit to a title or a button label cannot quietly invalidate
// the number. A cell is that measure plus the stage's padding, and a page is
// two cells and the gap between them, which is what keeps a cell close to what
// it holds.
//
// The width is written out here because a custom property does not travel from
// a descendant to its ancestor: `--confirm-w` lives on `.ui-confirm`, inside
// the element that lays the grid out. stories/guidelines/destructive-actions.test.js
// holds the two in step. The 240px menu panel then sits in the measure with
// slack beside it, which is what showing one component at its real width costs.
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
    /* A confirm is fixed to the viewport, so left alone its scrim leaves the
       cell and covers the whole page. In a specimen the panel is the subject
       rather than something laid over a page, so it joins the flow and the
       scrim goes with the fixed positioning it belonged to. Two pages show a
       confirm in a cell now — Destructive actions and Component choice — which
       is what makes this stage furniture rather than one page's business. */
    .gl-stage--confirm .ui-confirm { position: static; }
    .gl-stage--confirm .ui-confirm__scrim { display: none; }
    .gl-stage--confirm .ui-confirm__panel { position: static; translate: none; width: auto; }
  </style>`;

// ---- Page CSS -------------------------------------------------------------
const PAGE_CSS = `
  <style>
    /* Two specimen cells wide, and nothing on this page is wider than a specimen. */
    .gc { max-width: var(--gl-page); }
    .gc h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin-bottom: var(--space-6); }
    /* The page styles its own heading by name. A bare ".gc h2" also matched
       .ui-confirm__title — a confirm's question is an h2 — and beat the
       component's own rule on specificity, so the specimen wore the page's
       type instead of the kit's. */
    .gc-imperative { font: 600 16px/1.45 Poppins; color: var(--strong); margin: 0 0 var(--space-3); }

    /* No card. A hairline is enough to say "next rule", and it costs 1px where
       a card costs its padding twice over. */
    .gc-rule + .gc-rule { margin-top: var(--space-8); padding-top: var(--space-8);
      border-top: 1px solid var(--border); }

    /* A squeezed cell deforms the specimen inside it, so the pair goes
       single-file at exactly the width where a cell stops fitting rather than
       at a number guessed in advance: min() lets a column shrink below the
       measure only once the measure is wider than the row itself. */
    .gc-pair { display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(var(--gl-cell), 100%), 1fr));
      gap: var(--space-4); }
    .gc-cell { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
    .gc-cell__cap { font: 400 12px/1.55 Poppins; color: var(--muted); }

    /* The sentence a rule gets when it has no specimen to look at. */
    .gc-why { font: 400 13px/1.65 Poppins; color: var(--dim); margin: 0; max-width: 72ch; }

    /* The boundary of the rule. The amber edge is the marker that says "this is
       where the rule stops"; it rides on the text instead of a panel, so it
       costs its own line height and nothing else. The label stays --muted,
       which clears AA in both themes where --amber on the page does not. */
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

// ---- Small shared atoms ---------------------------------------------------
const doBadge = () => badge('Do', 'live');
const dontBadge = () => badge('Don’t', 'danger');

const cell = (badgeHtml, caption, html) => `
  <div class="gc-cell">
    <div>${badgeHtml}</div>
    ${html}
    <div class="gc-cell__cap">${mono(caption)}</div>
  </div>`;

// A rule shows either its pair or its sentence, never both: the pair says what
// the sentence would have said, and says it faster.
const figure = (rule) => (rule.doHtml ? `
  <div class="gc-pair">
    ${cell(doBadge(), rule.doCaption, rule.doHtml())}
    ${cell(dontBadge(), rule.dontCaption, rule.dontHtml())}
  </div>` : `
  <p class="gc-why">${mono(rule.why)}</p>`);

// Not every rule has a boundary, and a rule that has none used to render the
// words "Except undefined". Two page authors met that and both went looking for
// a boundary to invent, which is the one thing this field must never invite.
const exceptLine = (rule) => (rule.except ? `
  <p class="gc-except"><span class="gc-except__label">Except</span>${mono(rule.except)}</p>` : '');

// A rule the kit does not meet yet is still a rule, and says so: the sentence
// and the issue it is tracked under. stories/guidelines/refs.test.js checks the
// shape. Plain on purpose — the treatment it will wear is not decided here.
const unmetLine = (rule) => (rule.unmet ? `
  <p class="gc-unmet">${mono(rule.unmet.note)} #${rule.unmet.issue}</p>` : '');

// Rules with nothing in the kit to copy from yet carry no addresses at all.
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

/**
 * The whole story string for one guideline page.
 * `css` is the page's own specimen CSS, appended after the shared CSS.
 */
export const guidelinePage = ({ title, rules, css = '' }) => `${SPEC_CSS}${PAGE_CSS}${css}${pad(`<div class="gl gc">
    <h1>${title}</h1>
    ${rules.map(ruleBlock).join('')}
  </div>`)}`;
