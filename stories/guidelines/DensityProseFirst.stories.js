// ---------------------------------------------------------------------------
// Density variant — "Prose first".
//
// Theory: the sentence is the rule, and a specimen is the most expensive way to
// say anything. Two of the three rules are legible as text — "Revoke access"
// beats "OK" on the page as surely as it does in a screenshot, and "confirm or
// undo, never both" is a decision, not an appearance. Only the first rule turns
// on something a sentence cannot carry: what a colour does under the pointer.
//
// So the page keeps every word — deck, why, boundary, the note on each citation
// — and spends its one specimen pair on the colour rule, at the top, where it
// reads as the figure for the whole guideline. The other four specimens become
// the addresses of the code that implements them.
//
// The undo rule has no kit citation, so dropping its specimen leaves it with
// nothing concrete to point at. That is the cost of this theory, not an
// oversight, and no filler is added to hide it.
// ---------------------------------------------------------------------------
import { pad } from '../_gallery.js';
import { TITLE, DECK, WHY, RULES, SPEC_CSS, mono, doBadge, dontBadge } from './_content.js';

export default {
  title: 'Guidelines/Density/Prose first',
  parameters: { layout: 'fullscreen' },
};

const CSS = `
  <style>
    /* One measure for the whole page: the figure is as wide as the text it
       serves, so the eye never travels further than a line of prose. */
    .pf { max-width: 760px; }
    .pf h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin-bottom: 10px; }
    .pf-deck { font: 300 15.5px/1.6 Poppins; color: var(--dim); margin-bottom: 8px; }
    .pf-why { font: 400 13.5px/1.7 Poppins; color: var(--muted); margin-bottom: 24px; }

    /* The one figure is as wide as the two specimens in it, not as wide as the
       text column — max-content tracks, floored at the menu panel's own
       min-width plus the stage padding (src/styles/dropdown.css) so the panel
       can never push through its frame, and single-file below that. */
    .pf-fig { margin: 0 0 var(--space-8); }
    .pf-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, max-content));
      gap: var(--space-4); justify-content: start; }
    .pf-cell { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
    .pf-cell__cap { font: 400 12px/1.55 Poppins; color: var(--muted); }

    .pf-rule + .pf-rule { margin-top: var(--space-5); padding-top: var(--space-5);
      border-top: 1px solid var(--border); }
    .pf-imp { font: 600 15px/1.5 Poppins; color: var(--strong); margin: 0 0 5px; }
    .pf-line { font: 400 13px/1.65 Poppins; color: var(--dim); margin: 0; }

    /* The boundary keeps its amber edge — the one marker that says "this is
       where the rule stops" — but rides on the text column instead of a panel. */
    .pf-except { margin: 9px 0 0; padding-left: 13px; box-shadow: inset 2px 0 0 var(--amber);
      font: 400 12.5px/1.65 Poppins; color: var(--text); }
    .pf-except__label { font: 600 10.5px/1.7 Poppins; letter-spacing: .12em;
      text-transform: uppercase; color: var(--muted); margin-right: 8px; }

    /* One sentence about the group, then the addresses beside it on the same
       line — three sentences that each said "hovers to --pink" were one fact
       with three addresses, and the addresses were the part worth reading. */
    .pf-refs { margin: var(--space-2) 0 0; font: 400 12.5px/1.9 Poppins; color: var(--muted); }
  </style>`;

const cell = (badgeHtml, caption, html) => `
  <div class="pf-cell">
    <div>${badgeHtml}</div>
    ${html}
    <div class="pf-cell__cap">${mono(caption)}</div>
  </div>`;

// The page's one figure: the rule whose difference is a colour under the
// pointer, which is the one thing on this page prose genuinely cannot carry.
const FIGURE = RULES[0];

const refLines = (rule) => (rule.kit?.length ? `
  <p class="pf-refs">${mono(rule.kitNote)} ${rule.kit.map((k) => mono(k.ref)).join(' ')}</p>` : '');

const ruleRow = (rule) => `
  <section class="pf-rule">
    <p class="pf-imp">${mono(rule.imperative)}</p>
    <p class="pf-line">${mono(rule.why)}</p>
    <p class="pf-except"><span class="pf-except__label">Except</span>${mono(rule.except)}</p>
    ${refLines(rule)}
  </section>`;

export const Page = {
  name: 'Prose first',
  render: () => `${SPEC_CSS}${CSS}${pad(`<div class="gl pf">
    <h1>${TITLE}</h1>
    <p class="pf-deck">${DECK}</p>
    <p class="pf-why">${mono(WHY)}</p>

    <figure class="pf-fig">
      <div class="pf-pair">
        ${cell(doBadge(), FIGURE.doCaption, FIGURE.doHtml())}
        ${cell(dontBadge(), FIGURE.dontCaption, FIGURE.dontHtml())}
      </div>
    </figure>

    ${RULES.map(ruleRow).join('')}
  </div>`)}`,
};
