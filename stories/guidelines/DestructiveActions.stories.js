// ---------------------------------------------------------------------------
// Guidelines — Destructive actions.
//
// The rule is the picture. A reader who can see the difference between the do
// and the don't has already learned the rule, so the page spends its height on
// specimens and almost nothing on talking about them: no deck, no page-level
// why, no sentence attached to the citations. What remains per rule is an
// imperative, the pair, one line under each half, the boundary, and the bare
// file:line addresses of code that already does it.
//
// Two places where the picture can't carry the load:
//
// * The boundary. "Except" is where the rule stops applying, and a specimen of
//   a rule not applying is not a picture anyone can read. It stays as a hanging
//   amber rule on the text — the marker without the panel, which costs an
//   eighth of what a bordered, padded block costs across three rules.
// * A rule with no specimen. Every rule on the page has a pair today, but one
//   can arrive before the kit has anything to photograph — `undo` did, and
//   stood on its one sentence until confirm() shipped. Any rule without a
//   picture gets its sentence in place of the pair.
// ---------------------------------------------------------------------------
import { pad } from '../_gallery.js';
import { TITLE, RULES, SPEC_CSS, mono, doBadge, dontBadge } from './_destructive-actions.js';

export default {
  title: 'Guidelines/Destructive actions',
  parameters: { layout: 'fullscreen' },
};

const CSS = `
  <style>
    /* Two specimen cells wide, and nothing on this page is wider than a specimen. */
    .gc { max-width: var(--gl-page); }
    .gc h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin-bottom: var(--space-6); }
    .gc h2 { font: 600 16px/1.45 Poppins; color: var(--strong); margin: 0 0 var(--space-3); }

    /* No card. A hairline is enough to say "next rule", and it costs 1px where
       a card costs its padding twice over. */
    .gc-rule + .gc-rule { margin-top: var(--space-8); padding-top: var(--space-8);
      border-top: 1px solid var(--border); }

    /* 290px floors the cell at the menu panel's own min-width plus the stage
       padding (src/styles/dropdown.css); below it the pair goes single-file. */
    .gc-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
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
  </style>`;

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

const exceptLine = (rule) => `
  <p class="gc-except"><span class="gc-except__label">Except</span>${mono(rule.except)}</p>`;

// Rules with nothing in the kit to copy from yet carry no addresses at all.
const refs = (rule) => (rule.kit?.length ? `
  <div class="gc-refs">${rule.kit.map((k) => mono(k.ref)).join(' ')}</div>` : '');

const ruleBlock = (rule) => `
  <section class="gc-rule">
    <h2>${mono(rule.imperative)}</h2>
    ${figure(rule)}
    ${exceptLine(rule)}
    ${refs(rule)}
  </section>`;

export const DestructiveActions = {
  name: 'Destructive actions',
  render: () => `${SPEC_CSS}${CSS}${pad(`<div class="gl gc">
    <h1>${TITLE}</h1>
    ${RULES.map(ruleBlock).join('')}
  </div>`)}`,
};
