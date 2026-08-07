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
    /* Two specimen cells wide, plus the indent the open body sits at. */
    .ix { max-width: calc(var(--gl-page) + var(--space-5)); }
    .ix h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin-bottom: 10px; }
    .ix-deck { font: 300 15.5px/1.6 Poppins; color: var(--dim); max-width: 68ch; margin-bottom: var(--space-6); }

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

    .ix-body { padding: var(--space-1) 0 var(--space-6) var(--space-5); }
    .ix-why { font: 400 13px/1.65 Poppins; color: var(--dim); margin: 0 0 6px; max-width: 72ch; }
    .ix-why:last-of-type { margin-bottom: var(--space-4); }

    /* 290px floors the cell at the menu panel's own min-width plus the stage
       padding (src/styles/dropdown.css); below it the pair goes single-file. */
    .ix-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: var(--space-4); }
    .ix-cell { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
    .ix-cell__cap { font: 400 12px/1.55 Poppins; color: var(--muted); }

    .ix-except { display: flex; align-items: baseline; gap: var(--space-3); margin-top: var(--space-4);
      padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
      background: var(--surface-2); box-shadow: inset 3px 0 0 var(--amber), inset 0 0 0 1px var(--border); }
    .ix-except__label { flex: none; font: 600 10.5px/1.7 Poppins; letter-spacing: .12em;
      text-transform: uppercase; color: var(--muted); }
    .ix-except__text { font: 400 12.5px/1.65 Poppins; color: var(--text); }

    /* One sentence about the group, then the addresses on the line under it. */
    .ix-copy { margin-top: var(--space-4); }
    .ix-copy__note { margin: 0; font: 400 12.5px/1.7 Poppins; color: var(--text); }
    .ix-copy__label { font: 600 10.5px/1.7 Poppins; letter-spacing: .12em; text-transform: uppercase;
      color: var(--muted); margin-right: var(--space-2); }
    .ix-refs { margin: var(--space-1) 0 0; display: flex; flex-wrap: wrap;
      gap: var(--space-1) var(--space-3); font: 400 12.5px/1.6 Poppins; }
  </style>`;

const cell = (badgeHtml, caption, html) => `
  <div class="ix-cell">
    <div>${badgeHtml}</div>
    ${html}
    <div class="ix-cell__cap">${mono(caption)}</div>
  </div>`;

const copyBlock = (rule) => (rule.kit?.length ? `
  <div class="ix-copy">
    <p class="ix-copy__note"><span class="ix-copy__label">Copy from</span> ${mono(rule.kitNote)}</p>
    <p class="ix-refs">${rule.kit.map((k) => mono(k.ref)).join(' ')}</p>
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
