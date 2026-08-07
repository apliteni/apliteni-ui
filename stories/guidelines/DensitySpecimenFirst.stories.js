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
    .sf { max-width: 1120px; }
    .sf h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin-bottom: 26px; }
    .sf h2 { font: 600 16px/1.45 Poppins; color: var(--strong); margin: 0 0 14px; }

    /* No card. A hairline is enough to say "next rule", and it costs 1px where
       a card costs its padding twice over. */
    .sf-rule + .sf-rule { margin-top: 30px; padding-top: 30px; border-top: 1px solid var(--border); }

    .sf-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 16px; }
    .sf-cell { display: flex; flex-direction: column; gap: 9px; }
    .sf-cell__cap { font: 400 12px/1.55 Poppins; color: var(--muted); }

    /* The citations, stripped to addresses and set on one line. Three lines of
       "hovers to --pink" said the same thing three times. */
    .sf-refs { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px;
      font: 400 12px/1.6 Poppins; color: var(--muted); }
  </style>`;

const cell = (badgeHtml, caption, html) => `
  <div class="sf-cell">
    <div>${badgeHtml}</div>
    ${html}
    <div class="sf-cell__cap">${mono(caption)}</div>
  </div>`;

const refs = (rule) => (rule.kit?.length ? `
  <div class="sf-refs">${rule.kit.map((k) => mono(k.ref)).join('')}</div>` : '');

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
