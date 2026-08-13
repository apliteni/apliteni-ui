// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button, toast } from '../../src/components/index.js';
import { icon, iconOnlyAllowed, iconMeanings } from '../../src/assets/icons.js';

export const TITLE = 'Iconography';

export const BLURB = 'When a control may go wordless, what a glyph means, and what adding one costs.';

export const SPEC_CSS = `
  <style>
    .gl-stage--row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    /* The meaning pairs read as a table, so they get one. */
    .gl-mean { border-collapse: collapse; font-size: var(--text-sm); }
    .gl-mean td { padding: var(--space-2) var(--space-3); vertical-align: middle; }
    .gl-mean td:first-child { line-height: 0; }
    .gl-mean code { font-family: var(--font-mono); font-size: .9em; }
    .gl-mean .gl-mean__what { color: var(--muted); }
  </style>`;

const row = (...html) => `<div class="gl-stage gl-stage--row">${html.join('')}</div>`;

// The do/don't pair for the closed list. Both halves are ordinary secondary
// buttons, so neither half is also a specimen of a contrast fault.
export const listDo = () => row(
  button({ label: 'More actions', icon: 'moreHorizontal', iconOnly: true, variant: 'secondary' }),
  button({ label: 'Settings', icon: 'gear', variant: 'secondary' }),
);
export const listDont = () => row(
  button({ label: 'More actions', icon: 'moreHorizontal', iconOnly: true, variant: 'secondary' }),
  button({ label: 'Settings', icon: 'gear', iconOnly: true, variant: 'secondary' }),
);

// The meaning pair. The don't is the danger toast as it shipped before #199:
// the same bare `x` as both the status and the close.
export const meaningDo = () => `<div class="gl-stage">${toast({
  variant: 'danger', title: 'Upload failed', body: 'The file exceeded 25 MB.',
})}</div>`;
export const meaningDont = () => `<div class="gl-stage">${toast({
  variant: 'danger', icon: 'x', title: 'Upload failed', body: 'The file exceeded 25 MB.',
})}</div>`;

const meaningTable = () => `
  <table class="gl-mean"><tbody>${Object.entries(iconMeanings).map(([glyph, means]) => `
    <tr><td>${icon(glyph)}</td><td><code>${glyph}</code></td><td class="gl-mean__what">${means}</td></tr>`).join('')}
  </tbody></table>`;

export const meaningsAll = () => `<div class="gl-stage">${meaningTable()}</div>`;

export const RULES = [
  {
    id: 'icon-only',
    imperative: 'Drop a control’s label only for an action on the closed list.',
    why: 'Every other glyph is met one at a time, and a toolbar is not a legend.',
    except: `The list itself grows by decision, not by argument in review — today it is ${
      Object.entries(iconOnlyAllowed).map(([g, what]) => `${g} (${what})`).join(', ')}.`,
    doCaption: 'An overflow menu goes wordless; settings keeps its word.',
    dontCaption: 'A cog with a perfect aria-label is still a cog.',
    doHtml: listDo,
    dontHtml: listDont,
    kit: [
      { ref: 'src/assets/icons.js:174', pattern: 'export const iconOnlyAllowed' },
      { ref: 'stories/guidelines/iconography.test.js:105', pattern: 'every icon-only control is one the closed list allows' },
      { ref: 'src/components/index.js:39', pattern: 'const named = iconOnly' },
    ],
  },
  {
    id: 'meaning',
    imperative: 'A circled glyph is a state; a bare glyph is an action.',
    why: 'A shape that means two things makes the reader work out which one from context every time.',
    except: 'Most of the set depicts a thing rather than a state or an action — `globe`, `database`, '
      + '`layers`. The split governs the glyphs a component picks on the reader’s behalf, not the catalogue.',
    doCaption: 'circleX reports the failure; the bare x closes the toast.',
    dontCaption: 'The same x, twice, meaning two different things.',
    doHtml: meaningDo,
    dontHtml: meaningDont,
    kit: [
      { ref: 'src/assets/icons.js:195', pattern: 'export const iconMeanings' },
      { ref: 'src/components/index.js:233', pattern: 'const TOAST_ICON = {' },
    ],
  },
  {
    id: 'one-group',
    imperative: 'Declare a glyph once, in the group that matches what it depicts.',
    why: 'A name declared twice still resolves — the flat map takes the last one — so nothing breaks '
      + 'loudly. What happens instead is that the catalogue files one glyph under two headings, and the '
      + 'file grows lines no reader can tell from a real glyph. `card`, `chart` and `doc` sat like that '
      + 'until #199.',
    except: 'A glyph is grouped by what it draws, not by who calls it: `chart` is data even when a '
      + 'comms panel renders it.',
    kit: [
      { ref: 'src/assets/icons.test.js:41', pattern: "test('no glyph is declared in more than one group'" },
      { ref: 'src/assets/icons.test.js:59', pattern: "test('the groups declare exactly as many glyphs as the kit ships'" },
    ],
  },
  {
    id: 'provenance',
    imperative: 'Take the path from Lucide unmodified, and say so when the names differ.',
    why: 'The set looks like one hand because every path came from the same one. A traced glyph and a '
      + 'copied one are indistinguishable by eye a year later, so the commit is the only place the '
      + 'difference survives.',
    except: 'A brand mark has no Lucide original — `github` and `linkedin` are the vendor’s own, and '
      + 'live in BRAND for that reason.',
    kit: [
      { ref: 'src/assets/icons.js:158', pattern: 'stroke-width="1.7"' },
      { ref: 'src/assets/icons.test.js:72', pattern: "test('the emitter ships the numbers its header argues for'" },
    ],
  },
];
