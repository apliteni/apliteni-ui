// ---------------------------------------------------------------------------
// Density variant — "Index first".
//
// Theory: nothing on the page is wrong, it is all just open at once. A reader
// arrives knowing which of the three rules they are stuck on, and pays for the
// other two in scrolling. So the page at rest is its own table of contents —
// one line per rule — and every word, specimen, boundary and citation the
// baseline carries is still here, one click away.
//
// Nothing is cut. The page-level why about --pink moves inside the colour rule,
// where it belongs; that is the only content that moves at all.
//
// The cost is real and it is not length: a rule that is closed is a rule nobody
// read, the three cannot be compared side by side any more, and a screenshot or
// a printout of this page shows three sentences.
// ---------------------------------------------------------------------------
import { pad } from '../_gallery.js';
import { TITLE, DECK, WHY, RULES, SPEC_CSS, mono, doBadge, dontBadge } from './_content.js';

export default {
  title: 'Guidelines/Density/Index first',
  parameters: { layout: 'fullscreen' },
};

const CSS = `
  <style>
    .ix { max-width: 1120px; }
    .ix h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin-bottom: 10px; }
    .ix-deck { font: 300 15.5px/1.6 Poppins; color: var(--dim); max-width: 68ch; margin-bottom: 26px; }

    .ix-list { border-top: 1px solid var(--border); }
    .ix-row { border-bottom: 1px solid var(--border); }

    /* The summary is the whole page at rest, so it gets the row's full click
       target and the only affordance on it: a chevron that turns when open. */
    .ix-sum { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 12px;
      padding: 15px 2px; font: 600 15px/1.45 Poppins; color: var(--strong); }
    .ix-sum::-webkit-details-marker { display: none; }
    .ix-sum:hover { color: var(--accent); }
    .ix-sum:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: var(--radius-sm); }
    .ix-chev { flex: none; width: 8px; height: 8px; border-right: 1.5px solid var(--muted);
      border-bottom: 1.5px solid var(--muted); transform: rotate(-45deg); margin-left: 2px;
      transition: transform .16s ease; }
    .ix-row[open] > .ix-sum .ix-chev { transform: rotate(45deg); }
    .ix-row[open] > .ix-sum { color: var(--strong); }

    .ix-body { padding: 4px 0 26px 22px; }
    .ix-why { font: 400 13px/1.65 Poppins; color: var(--dim); margin: 0 0 6px; max-width: 72ch; }
    .ix-why:last-of-type { margin-bottom: 18px; }

    .ix-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 16px; }
    .ix-cell { display: flex; flex-direction: column; gap: 9px; }
    .ix-cell__cap { font: 400 12px/1.55 Poppins; color: var(--muted); }

    .ix-except { display: flex; align-items: baseline; gap: 12px; margin-top: 18px;
      padding: 11px 14px 11px 17px; border-radius: var(--radius-md);
      background: var(--surface-2); box-shadow: inset 3px 0 0 var(--amber), inset 0 0 0 1px var(--border); }
    .ix-except__label { flex: none; font: 600 10.5px/1.7 Poppins; letter-spacing: .12em;
      text-transform: uppercase; color: var(--muted); }
    .ix-except__text { font: 400 12.5px/1.65 Poppins; color: var(--text); }

    .ix-copy { margin-top: 16px; }
    .ix-copy__label { font: 600 10.5px/1 Poppins; letter-spacing: .12em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 9px; }
    .ix-ref { padding: 3px 0; font: 400 12.5px/1.6 Poppins; color: var(--text); }
  </style>`;

const cell = (badgeHtml, caption, html) => `
  <div class="ix-cell">
    <div>${badgeHtml}</div>
    ${html}
    <div class="ix-cell__cap">${mono(caption)}</div>
  </div>`;

const copyBlock = (rule) => (rule.kit?.length ? `
  <div class="ix-copy">
    <div class="ix-copy__label">Copy from</div>
    ${rule.kit.map((k) => `<div class="ix-ref">${mono(k.ref)} ${mono(k.note)}</div>`).join('')}
  </div>` : '');

// The page-level note about --pink is a fact about the colour rule, so in a
// page with no standing preamble it rides inside that rule.
const extraWhy = (rule) => (rule.id === 'colour' ? `<p class="ix-why">${mono(WHY)}</p>` : '');

const ruleRow = (rule) => `
  <details class="ix-row">
    <summary class="ix-sum"><span class="ix-chev"></span>${mono(rule.imperative)}</summary>
    <div class="ix-body">
      <p class="ix-why">${mono(rule.why)}</p>
      ${extraWhy(rule)}
      <div class="ix-pair">
        ${cell(doBadge(), rule.doCaption, rule.doHtml())}
        ${cell(dontBadge(), rule.dontCaption, rule.dontHtml())}
      </div>
      <div class="ix-except">
        <span class="ix-except__label">Except</span>
        <span class="ix-except__text">${mono(rule.except)}</span>
      </div>
      ${copyBlock(rule)}
    </div>
  </details>`;

export const Page = {
  name: 'Index first',
  render: () => `${SPEC_CSS}${CSS}${pad(`<div class="gl ix">
    <h1>${TITLE}</h1>
    <p class="ix-deck">${DECK}</p>
    <div class="ix-list">${RULES.map(ruleRow).join('')}</div>
  </div>`)}`,
};
