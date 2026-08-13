// ---------------------------------------------------------------------------
// Content for the "Guidelines / Colour and theming" page: where a colour comes
// from, which colours are allowed to move when the accent does, and the two
// checks a colour change owes before it ships.
//
// Same contract as _destructive-actions.js: every specimen is a real kit
// factory rendered live, the wrongness on show is colour and never broken
// markup, and every `kit` entry carries the literal `pattern` that must be on
// the line it cites (stories/guidelines/refs.test.js resolves them all).
//
// One rule here carries `unmet`: the kit does not fully do what it asks, and
// says so with the issue it is tracked under rather than quietly overclaiming.
// ---------------------------------------------------------------------------
import { callout, field, input } from '../../src/components/index.js';

// ---- The page -------------------------------------------------------------
export const TITLE = 'Colour and theming';

// One line for an index that lists this page beside the other four. Same
// register as the imperatives, and short enough to sit on one line in a card.
export const BLURB = 'Where a colour comes from, and which colours may move when the accent does.';

// ---- Specimen CSS ---------------------------------------------------------
// A literal can only be shown the way a literal behaves: frozen. `.gl-literal`
// writes out the exact colours the dark theme composites — rgba(32, 220, 245,
// .14) over --surface is #22394a, and the body ink is dark --dim — so the two
// cells are the same picture in dark, and the flip to light is what separates
// them. Nothing here is scanned by stories/colour-tokens.test.js, which gates
// src/styles only; these hexes are the subject, not a slip.
//
// `.gl-drift` re-points --pink at the accent — the one move the accent files
// forbid. A custom property inherits, so declaring it on the stage repaints
// every consumer inside it in both themes.
export const SPEC_CSS = `
  <style>
    .gl-literal .ui-callout { background: #22394a; color: #c6c2d6; }
    .gl-literal .ui-callout__icon { color: #20dcf5; }
    .gl-drift { --pink: var(--accent); }
  </style>`;

// ---- Live specimens -------------------------------------------------------
const stage = (html, mod = '') => `<div class="gl-stage ${mod}">${html}</div>`;

const NOTE = 'Rotating this token invalidates every client using it.';

/** An info callout painted from --glow-cyan and --dim. */
export const tokensDo = () => stage(callout({ variant: 'info', body: NOTE }));
/** The same callout with its ground and its ink written out as hex. */
export const tokensDont = () => stage(callout({ variant: 'info', body: NOTE }), 'gl-literal');

// .ui-field__error and .ui-input.is-invalid both read --pink directly
// (src/styles/input.css), so the danger signal is visible at rest in either
// theme — no hover to pin, and nothing that changes shape between themes.
const bouncedEmail = () => field({
  label: 'Billing email',
  error: 'That address bounced twice this week.',
  control: input({ value: 'ops@acme.io', invalid: true }),
});

/** The error keeps the danger signal. */
export const signalsDo = () => stage(bouncedEmail());
/** The same error with --pink following the accent. */
export const signalsDont = () => stage(bouncedEmail(), 'gl-drift');

// ---- The rules ------------------------------------------------------------
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
    // No specimen. The don't here is a real AA failure — white on --accent
    // measures 3.87:1 in dark Nebula — and stories/contrast.test.js walks this
    // page, so rendering it would be the kit gating itself red to make a point.
    imperative: 'Paint an accent ground with --accent-strong and accent ink with --accent.',
    why: '--accent is chosen to read as text on the canvas; --accent-strong is the darker sibling white clears AA on.',
    except: 'Under Phoenix, Ocean and Emerald the two are one token, so the distinction only bites on Nebula.',
    kit: [
      { ref: 'src/tokens/tokens.css:153', pattern: '--accent-strong: #7c3aed;' },
      { ref: 'src/styles/button.css:44', pattern: 'background: var(--accent-strong);' },
      { ref: 'src/tokens/accents.css:22', pattern: '--accent-strong: var(--accent);' },
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
      { ref: 'react/src/a11y.test.tsx:39', pattern: "'color-contrast': { enabled: false }" },
    ],
  },
];
