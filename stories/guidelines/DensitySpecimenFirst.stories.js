// ---------------------------------------------------------------------------
// Density variant — "Specimen first".
//
// Theory: the rule is the picture. A reader who can see the difference between
// the do and the don't has already learned the rule; the sentences around the
// picture are a caption, and everything past a caption is commentary.
//
// So this page keeps all six specimens at full size and drops every block that
// only talks about them: the deck, the page-level why, the per-rule why, the
// boundary, and the sentence attached to each citation. What remains per rule is
// an imperative, the pair, one line under each half, and the bare file:line
// addresses — a reader who wants the reasoning reads the code.
//
// Deliberately NOT changed: the specimens themselves. They render from the same
// _content.js the baseline uses, at the same 1120px container, so the only
// variable between this page and the baseline is what was written around them.
// ---------------------------------------------------------------------------
import { pad } from '../_gallery.js';
import { TITLE, RULES, SPEC_CSS, mono, doBadge, dontBadge } from './_content.js';

export default {
  title: 'Guidelines/Density/Specimen first',
  parameters: { layout: 'fullscreen' },
};

const CSS = `
  <style>
    /* Two specimen cells wide, and nothing on this page is wider than a specimen. */
    .sf { max-width: var(--gl-page); }
    .sf h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin-bottom: var(--space-6); }
    .sf h2 { font: 600 16px/1.45 Poppins; color: var(--strong); margin: 0 0 var(--space-3); }

    /* No card. A hairline is enough to say "next rule", and it costs 1px where
       a card costs its padding twice over. */
    .sf-rule + .sf-rule { margin-top: var(--space-8); padding-top: var(--space-8);
      border-top: 1px solid var(--border); }

    /* 290px floors the cell at the menu panel's own min-width plus the stage
       padding (src/styles/dropdown.css); below it the pair goes single-file. */
    .sf-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: var(--space-4); }
    .sf-cell { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
    .sf-cell__cap { font: 400 12px/1.55 Poppins; color: var(--muted); }

    /* The citations, stripped to addresses and set on one line. Three lines of
       "hovers to --pink" said the same thing three times. */
    .sf-refs { margin-top: var(--space-3); display: flex; flex-wrap: wrap; gap: var(--space-2);
      font: 400 12px/1.6 Poppins; color: var(--muted); }
  </style>`;

const cell = (badgeHtml, caption, html) => `
  <div class="sf-cell">
    <div>${badgeHtml}</div>
    ${html}
    <div class="sf-cell__cap">${mono(caption)}</div>
  </div>`;

const refs = (rule) => (rule.kit?.length ? `
  <div class="sf-refs">${rule.kit.map((k) => mono(k.ref)).join(' ')}</div>` : '');

const ruleBlock = (rule) => `
  <section class="sf-rule">
    <h2>${mono(rule.imperative)}</h2>
    <div class="sf-pair">
      ${cell(doBadge(), rule.doCaption, rule.doHtml())}
      ${cell(dontBadge(), rule.dontCaption, rule.dontHtml())}
    </div>
    ${refs(rule)}
  </section>`;

export const Page = {
  name: 'Specimen first',
  render: () => `${SPEC_CSS}${CSS}${pad(`<div class="gl sf">
    <h1>${TITLE}</h1>
    ${RULES.map(ruleBlock).join('')}
  </div>`)}`,
};
