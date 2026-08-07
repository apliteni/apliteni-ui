// ---------------------------------------------------------------------------
// Guidelines — Destructive actions.
//
// Dense and scannable. The page is a stack of self-contained cards, one per
// rule: the rule as a single imperative sentence, a one-line why, a live
// do/don't pair inline, the boundary where the rule stops, and pointers into
// kit code that already applies it. Nothing depends on what came before it, so
// a reader can drop into the one card that applies to them and leave — and a
// page can carry twenty rules without becoming an essay.
// ---------------------------------------------------------------------------
import { pad } from '../_gallery.js';
import { card } from '../../src/components/index.js';
import {
  TITLE, DECK, WHY, RULES,
  SPEC_CSS, mono, doBadge, dontBadge,
} from './_content.js';

export default {
  title: 'Guidelines/Destructive actions',
  parameters: { layout: 'fullscreen' },
};

const CSS = `
  <style>
    /* The page is two specimen cells wide and no wider — --gl-page, plus the
       card's own horizontal padding, which the card sets in px (src/styles/card.css)
       and is therefore repeated here rather than guessed at. */
    .gc { --gc-card-pad: 26px; max-width: calc(var(--gl-page) + var(--gc-card-pad) * 2); }
    .gc h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin-bottom: 10px; }
    .gc .gc-deck { font: 300 15.5px/1.6 Poppins; color: var(--dim); max-width: 68ch; margin-bottom: 12px; }
    .gc .gc-why { font: 400 13.5px/1.7 Poppins; color: var(--muted); max-width: 74ch; margin-bottom: var(--space-6); }

    /* A card is --surface, so a specimen sitting on one needs the inset well. */
    .gc .ui-card .gl-stage { background: var(--surface-2); }
    .gc .ui-card__title { align-items: flex-start; }

    .gc-head__rule { font: 600 16px/1.45 Poppins; color: var(--strong); flex: 1 1 auto; }
    .gc-why-line { font: 400 13px/1.65 Poppins; color: var(--dim); margin: 0 0 var(--space-4); max-width: 72ch; }

    /* 290px is not a taste: the menu panel is min-width 240px (src/styles/dropdown.css)
       and the stage adds --space-5 twice, so a cell narrower than 280px would
       push the panel through its own frame. Below that the pair goes single-file. */
    .gc-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: var(--space-4); }
    .gc-cell { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
    .gc-cell__cap { font: 400 12px/1.55 Poppins; color: var(--muted); }

    /* The boundary of the rule, set apart from both the why and the captions.
       The amber edge is the marker; the label itself stays --muted, which clears
       AA against --surface-2 in both themes (--amber on --surface-2 does not). */
    .gc-except { display: flex; align-items: baseline; gap: var(--space-3); margin-top: var(--space-4);
      padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
      background: var(--surface-2);
      box-shadow: inset 3px 0 0 var(--amber), inset 0 0 0 1px var(--border); }
    .gc-except__label { flex: none; font: 600 10.5px/1.7 Poppins; letter-spacing: .12em;
      text-transform: uppercase; color: var(--muted); }
    .gc-except__text { font: 400 12.5px/1.65 Poppins; color: var(--text); }

    /* One line of prose about the group, then the addresses on the line under
       it. Each address used to carry its own sentence, stacked two lines deep. */
    .gc-copy { margin-top: var(--space-4); padding-top: var(--space-3);
      border-top: 1px solid var(--border); }
    .gc-copy__note { margin: 0; font: 400 12.5px/1.7 Poppins; color: var(--text); }
    .gc-copy__label { font: 600 10.5px/1.7 Poppins; letter-spacing: .12em; text-transform: uppercase;
      color: var(--muted); margin-right: var(--space-2); }
    .gc-refs { margin: var(--space-1) 0 0; display: flex; flex-wrap: wrap;
      gap: var(--space-1) var(--space-3); font: 400 12.5px/1.6 Poppins; }
  </style>`;

const cell = (badgeHtml, caption, html) => `
  <div class="gc-cell">
    <div>${badgeHtml}</div>
    ${html}
    <div class="gc-cell__cap">${mono(caption)}</div>
  </div>`;

const exceptBlock = (rule) => `
  <div class="gc-except">
    <span class="gc-except__label">Except</span>
    <span class="gc-except__text">${mono(rule.except)}</span>
  </div>`;

// Rules with nothing in the kit to copy from yet carry no block at all.
const copyBlock = (rule) => (rule.kit?.length ? `
  <div class="gc-copy">
    <p class="gc-copy__note"><span class="gc-copy__label">Copy from</span> ${mono(rule.kitNote)}</p>
    <p class="gc-refs">${rule.kit.map((k) => mono(k.ref)).join(' ')}</p>
  </div>` : '');

const ruleCard = (rule) => card({
  title: `<span class="gc-head__rule">${mono(rule.imperative)}</span>`,
  body: `
    <p class="gc-why-line">${mono(rule.why)}</p>
    <div class="gc-pair">
      ${cell(doBadge(), rule.doCaption, rule.doHtml())}
      ${cell(dontBadge(), rule.dontCaption, rule.dontHtml())}
    </div>
    ${exceptBlock(rule)}
    ${copyBlock(rule)}`,
});

export const DestructiveActions = {
  name: 'Destructive actions',
  render: () => `${SPEC_CSS}${CSS}${pad(`<div class="gl gc">
    <h1>${TITLE}</h1>
    <p class="gc-deck">${DECK}</p>
    <p class="gc-why">${mono(WHY)}</p>

    <div class="ui-card-stack">${RULES.map(ruleCard).join('')}</div>
  </div>`)}`,
};
