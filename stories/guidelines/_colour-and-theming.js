import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('colour-and-theming.md', new URL('../../guidelines/colour-and-theming.md', import.meta.url));
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
{ id: 'tokens', doHtml: tokensDo, dontHtml: tokensDont },
{ id: 'signals', doHtml: signalsDo, dontHtml: signalsDont },
{ id: 'accent-strong' },
{ id: 'both-themes' }
]);
