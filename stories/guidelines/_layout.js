// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { badge } from '../../src/components/index.js';
import { pad } from '../_gallery.js';

// Render inline code and token names without interpreting prose as HTML.
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export const mono = (text) => String(text).split(/(`[^`]+`|\[[^\]]+\]\(https:\/\/[^\s"<>]+\))/g).map(part => {
  if (part.startsWith('`')) return `<code>${escape(part.slice(1, -1))}</code>`;
  const link = /^\[([^\]]+)\]\((https:\/\/[^\s"<>]+)\)$/.exec(part);
  if (link) return `<a href="${escape(link[2])}">${escape(link[1])}</a>`;
  return escape(part).replace(
    /var\(--[a-z0-9-]+\)|--[a-z0-9-]+|\.[A-Za-z][\w-]*(?:__[\w-]+)?(?:\.[\w-]+)*(?::[a-z-]+)?/g,
    (match) => `<code>${match}</code>`,
  );
}).join('');

// The specimen width is not this page's number and no longer the confirm's
// private one either: both read --panel-md now, so the copy #198 recorded here
// is gone. It is stated rather than inherited because a custom property does
// not travel from a descendant to its ancestor, and
// stories/guidelines/destructive-actions.test.js still holds the two in step.
// --measure does NOT replace it — this grid sizes to its widest SPECIMEN, not
// to a page.
// why: docs/specification.md#boxes-below-the-page
const SPEC_CSS = `
  <style>
    .gl { --gl-specimen: var(--panel-md);
          --gl-cell: calc(var(--gl-specimen) + var(--space-5) * 2);
          --gl-page: calc(var(--gl-cell) * 2 + var(--space-4)); }
    .gl code { font-family: var(--font-mono); font-size: .88em; color: var(--text);
      background: color-mix(in srgb, var(--accent) 12%, transparent); border-radius: 6px; padding: 2px 6px; }
    .gl-stage { background: var(--surface); border-radius: var(--radius-lg);
      box-shadow: inset 0 0 0 1px var(--border); padding: var(--space-5); }
    .gl-cursor { display: inline-flex; align-items: center; gap: 7px; margin-top: var(--space-3);
      font: 500 11px/1 var(--font-sans); color:var(--text); }
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
    .gc > h1 { font: 700 27px/1.2 var(--font-display); letter-spacing: -.02em; color: var(--strong); margin-bottom: var(--space-6); }
    /* By name, not ".gc h2": that also matched .ui-confirm__title and outranked it. */
    .gc-imperative { font: 600 16px/1.45 var(--font-display); color: var(--strong); margin: 0 0 var(--space-3); }

    .gc .gc-intro { margin-bottom: var(--space-6); }
    .gc-rule + .gc-rule { margin-top: var(--space-8); padding-top: var(--space-8);
      border-top: 1px solid var(--border); }

    /* min() drops the pair single-file only once a cell stops fitting. */
    .gc-pair { display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(var(--gl-cell), 100%), 1fr));
      gap: var(--space-4); }
    .gc-cell { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
    .gc-cell__cap { font: 400 12px/1.55 var(--font-sans); color:var(--text); }

    .gc-why { font: 400 13px/1.65 var(--font-sans); color:var(--text); margin: 0 0 var(--space-3); max-width: var(--prose-dense); }

    /* Keep the exception label in body ink; amber marks the boundary. */
    .gc-except { margin: var(--space-2) 0 0; padding-left: var(--space-3);
      box-shadow: inset 2px 0 0 var(--amber);
      font: 400 12.5px/1.65 var(--font-sans); color: var(--text); max-width: var(--prose-dense); }
    .gc-except__label { font: 600 10.5px/1.7 var(--font-sans); color:var(--text);
      margin-right: var(--space-2); }

    /* Legible and nothing more. What a rule the kit does not meet should look
       like is decided separately, and replaces this rule and unmetLine(). */
    .gc-unmet { margin: var(--space-2) 0 0; font: 400 12.5px/1.65 var(--font-sans); color: var(--text);
      max-width: var(--prose-dense); }
  </style>`;

const doBadge = () => badge('Do', 'live');
const dontBadge = () => badge('Don’t', 'danger');

// data-specimen names which half a cell is, so a gate that measures specimens
// can leave the don'ts out: stories/drawer-rules.test.js reads it.
const cell = (kind, badgeHtml, caption, html) => `
  <div class="gc-cell" data-specimen="${kind}">
    <div>${badgeHtml}</div>
    ${html}
    <div class="gc-cell__cap">${mono(caption)}</div>
  </div>`;

// A rule's `why` renders whether or not it has a specimen pair. It used not to:
// the pair and the why were alternatives, so a rule that set both showed only
// the pair and its reasoning reached nobody. Twenty of them were in that state,
// written and reviewed and invisible — found in #219, whose own why would have
// been the twenty-first.
const whyLine = (rule) => (rule.why ? `
  <p class="gc-why">${mono(rule.why)}</p>` : '');

const figure = (rule) => (rule.doCaption ? `
  <div class="gc-pair">
    ${cell('do', doBadge(), rule.doCaption, rule.doHtml?.() || '')}
    ${cell('dont', dontBadge(), rule.dontCaption, rule.dontHtml?.() || '')}
  </div>
  ` : '');

// Guarded because an unguarded version rendered "Except undefined", and two
// page authors met that and invented a boundary to get rid of it.
const exceptLine = (rule) => (rule.except ? `
  <p class="gc-except"><span class="gc-except__label">Except</span>${mono(rule.except)}</p>` : '');

const unmetLine = (rule) => (rule.unmet ? `
  <p class="gc-unmet">${mono(rule.unmet.note)} #${rule.unmet.issue}</p>` : '');

const ruleBlock = (rule) => `
  <section class="gc-rule">
    <h2 class="gc-imperative">${mono(rule.imperative)}</h2>
    ${rule.instruction ? `<p class="gc-why">${mono(rule.instruction)}</p>` : ''}
    ${whyLine(rule)}
    ${figure(rule)}
    ${unmetLine(rule)}
    ${exceptLine(rule)}
  </section>`;

export const guidelinePage = ({ title, blurb, rules, css = '' }) => `${SPEC_CSS}${PAGE_CSS}${css}${pad(`<div class="gl gc">
    <h1>${mono(title)}</h1>
    ${rules.map(ruleBlock).join('')}
  </div>`)}`;
