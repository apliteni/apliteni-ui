// The shape of a rule: AGENTS.md#the-guidelines-collection

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
// why: docs/foundations.md#boxes-below-the-page
export const SPEC_CSS = `
  <style>
    .gl { --gl-specimen: var(--panel-md);
          --gl-cell: calc(var(--gl-specimen) + var(--space-5) * 2);
          --gl-page: calc(var(--gl-cell) * 2 + var(--space-4)); }
    .gl code { font-family: var(--font-mono); font-size: .88em; color: var(--text);
      background: color-mix(in srgb, var(--accent) 12%, transparent); border-radius: 6px; padding: 2px 6px; }
    /* Flush with the reading surface since the page took it: the hairline is what
       frames a specimen now, and the fill is kept so a stage is still a stage
       wherever one is rendered outside this layout. */
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

/* A guideline page is reading, so the page IS the reading surface rather than a
 * grey ground with reading on it. Light spends its white here
 * (src/tokens/tokens.css), and twenty-four pages of rules, reasons and captions
 * straight on --bg is the page ground doing a surface's job.
 *
 * A surface and not a card: ten of these pages draw a card as a SPECIMEN, and a
 * card sheet would put all forty-eight of them inside another card — the one
 * thing guidelines/the-page.md says never to do.
 *
 * Exported because the Overview is a guideline page too and is not drawn by
 * GuidelinePage(). It is the ground, not a layout: what stands on it is the
 * caller's.
 *
 * Held by stories/guidelines/reading-surface.test.js.
 * why: guidelines/colour-and-theming.md#keep-text-off-grey-fills */
export const GROUND_CSS = `
  <style>
    .gl-page { background: var(--surface);
      padding: var(--space-10); min-height: 100vh; }
  </style>`;
export const ground = (html) => `<div class="gl-page">${html}</div>`;

export const PAGE_CSS = `
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

    .gc-except { margin: var(--space-2) 0 0;
      font: 400 12.5px/1.65 var(--font-sans); color: var(--text); max-width: var(--prose-dense); }
    .gc-except__label { font: 600 10.5px/1.7 var(--font-sans); color:var(--text);
      margin-right: var(--space-2); }

    /* Legible and nothing more. What a rule the kit does not meet should look
       like is decided separately, and replaces this rule and unmetLine(). */
    .gc-unmet { margin: var(--space-2) 0 0; font: 400 12.5px/1.65 var(--font-sans); color: var(--text);
      max-width: var(--prose-dense); }
  </style>`;
