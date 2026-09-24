import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline(new URL('../../guidelines/colour-and-theming.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { callout, field, input } from '../../src/components/index.js';





// The frozen hexes below are the specimen's subject, not a slip: `.gl-literal`
// writes out what the dark theme composites, so the pair is one picture in dark
// and the flip to light is what separates them. stories/colour-tokens.test.js
// scans src/styles only, so it never sees them.
export const SPEC_CSS = `
  <style>
    .gl-literal .ui-callout { background: #22394a; color: #c6c2d6; }
    .gl-literal .ui-callout__icon { color: #20dcf5; }
    .gl-drift { --pink: var(--accent); }
  </style>`;

const stage = (html, mod = '') => `<div class="gl-stage ${mod}">${html}</div>`;

const NOTE = 'Rotating this token invalidates every client using it.';

export const tokensDo = () => stage(callout({ variant: 'info', body: NOTE }));
export const tokensDont = () => stage(callout({ variant: 'info', body: NOTE }), 'gl-literal');

const bouncedEmail = () => field({
  label: 'Billing email',
  error: 'That address bounced twice this week.',
  control: input({ value: 'ops@acme.io', invalid: true }),
});

export const signalsDo = () => stage(bouncedEmail());
export const signalsDont = () => stage(bouncedEmail(), 'gl-drift');

export const RULES = withSpecimens(content.rules, [
{ id: 'tokens', doHtml: tokensDo, dontHtml: tokensDont, kit: [
      { ref: 'stories/colour-tokens.test.js:1', pattern: 'Rule: colour comes from a semantic token, never a literal.' },
      { ref: 'stories/colour-tokens.test.js:9', pattern: 'Literals belong in src/tokens/*.css' },
      { ref: 'stories/colour-tokens.test.js:4', pattern: 'mask stencils out on their own merit' },
    ] },
{ id: 'signals', doHtml: signalsDo, dontHtml: signalsDont, kit: [
      { ref: 'src/tokens/accents.css:7', pattern: 'Each sub-theme only re-points the accent family' },
      { ref: 'src/tokens/accents.css:8', pattern: 'live, pink = danger) stay put' },
      { ref: 'stories/danger-colour.test.js:5', pattern: 'Under Phoenix the accent is ember and under Nebula' },
    ] },
{ id: 'accent-strong', kit: [
      { ref: 'src/tokens/tokens.css:179', pattern: '--accent-strong: #7c3aed;' },
      { ref: 'src/styles/button.css:44', pattern: 'background: var(--accent-strong);' },
      { ref: 'src/tokens/accents.css:37', pattern: '--accent-strong: var(--accent);' },
    ] },
{ id: 'both-themes', kit: [
      { ref: 'stories/accent-contrast.test.js:1', pattern: '--accent clears WCAG AA as text on every ground the kit paints under it' },
      { ref: 'stories/accent-contrast.test.js:2', pattern: 'theme × accent cells' },
      { ref: 'react/src/a11y.test.tsx:23', pattern: "'color-contrast': { enabled: false }" },
    ] }
]);
