// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { callout, field, input } from '../../src/components/index.js';

export const TITLE = 'Colour and theming';

export const BLURB = 'Where a colour comes from, and which colours may move when the accent does.';

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

export const RULES = [
  {
    id: 'tokens',
    imperative: 'Take colour from a semantic token; add a token before you write a literal.',
    why: 'A literal is the one value that cannot follow the theme or the accent.',
    except: 'The ramp in src/tokens is not scanned, and a #000 inside mask is an alpha channel, not a colour.',
    doCaption: 'Ground and ink from tokens.',
    dontCaption: 'Frozen at the dark theme’s values.',
    doHtml: tokensDo,
    dontHtml: tokensDont,
    kit: [
      { ref: 'stories/colour-tokens.test.js:1', pattern: 'Rule: colour comes from a semantic token, never a literal.' },
      { ref: 'stories/colour-tokens.test.js:9', pattern: 'Literals belong in src/tokens/*.css' },
      { ref: 'stories/colour-tokens.test.js:4', pattern: 'mask stencils out on their own merit' },
    ],
  },
  {
    id: 'signals',
    imperative: 'Let the accent move with a sub-theme; --pink and --green stay where they are.',
    why: 'A danger colour that followed the accent would paint revoke and go the same.',
    except: 'Signals do move across data-theme: light deepens --pink from #e97ca5 to #b63361 so it reads as ink on white.',
    doCaption: 'The error keeps --pink under every accent.',
    dontCaption: '--pink re-pointed at the accent.',
    doHtml: signalsDo,
    dontHtml: signalsDont,
    kit: [
      { ref: 'src/tokens/accents.css:7', pattern: 'Each sub-theme only re-points the accent family' },
      { ref: 'src/tokens/accents.css:9', pattern: 'live, pink = danger) stay put' },
      { ref: 'stories/danger-colour.test.js:6', pattern: 'Under Phoenix the accent is ember and under Nebula' },
    ],
  },
  {
    id: 'accent-strong',
    // No specimen: the honest don't is white on --accent at 3.87:1 in dark
    // Nebula, and stories/contrast.test.js walks this page. Drawing it is a red
    // build. See docs/guidelines.md.
    imperative: 'Paint an accent ground with --accent-strong and accent ink with --accent.',
    why: '--accent is chosen to read as text on the canvas; --accent-strong is the darker sibling white clears AA on.',
    except: 'Under Phoenix, Ocean and Emerald the two are one token, so the distinction only bites on Nebula.',
    kit: [
      { ref: 'src/tokens/tokens.css:176', pattern: '--accent-strong: #7c3aed;' },
      { ref: 'src/styles/button.css:44', pattern: 'background: var(--accent-strong);' },
      { ref: 'src/tokens/accents.css:28', pattern: '--accent-strong: var(--accent);' },
    ],
  },
  {
    id: 'both-themes',
    imperative: 'Check dark and light, and at least two accents, before you open a PR.',
    why: 'A pair that clears AA in dark can fail in light over a card’s wash.',
    except: '--surface-3 is not measured: nothing paints the accent wash on a raised surface any more.',
    unmet: {
      issue: 131,
      note: 'Nothing under react/ measures contrast at all, and a warn toast’s action ink — '
        + 'never rendered anywhere — measures about 3.9:1 in light.',
    },
    kit: [
      { ref: 'stories/accent-contrast.test.js:1', pattern: '--accent clears WCAG AA as text on every ground the kit paints under it' },
      { ref: 'stories/accent-contrast.test.js:2', pattern: 'in all eight theme × accent cells' },
      { ref: 'react/src/a11y.test.tsx:36', pattern: "'color-contrast': { enabled: false }" },
    ],
  },
];
