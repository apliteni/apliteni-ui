import { button, badge, segmented } from '../../src/components/index.js';
import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Sub-themes',
  parameters: { layout: 'fullscreen' },
  // ACCENT and accentVars are the table and its renderer, exported so the gate
  // in stories/accent-contrast.test.js can measure what this page paints. They
  // are not stories; Storybook would otherwise index them as two.
  excludeStories: ['ACCENT', 'accentVars'],
};

// The accent table lives in ./sub-themes.js, shared with the React story and the gate.
import { ACCENT, accentVars } from './sub-themes.js';
export { ACCENT, accentVars };

// The badge shows the theme, and a theme key is not a label. The kit writes the
// word for a key rather than styling the key into one — the same move
// versionSwitcher() makes for `live`. why: docs/foundations.md#labels-and-titles
const THEME_WORD = { dark: 'Dark', light: 'Light' };

// This wall's button row is the shape the Accessibility minimums page warns
// about: small controls packed closer than their tap zones need. It follows
// that page's own rule rather than demonstrating the mistake — at the phone
// step, to a finger, the row opens to --tap-gap so both zones fit.
// why: guidelines/accessibility-floor.md, "Space between small targets"
const ROW_CSS = `<style>
  .sub__row { display: flex; gap: 8px; flex-wrap: wrap; }
  @media (max-width: 560px) and (pointer: coarse) { .sub__row { gap: var(--tap-gap); } }
</style>`;

const panel = (name, theme) => {
  const ac = ACCENT[name][theme];
  return `<div style="${accentVars(ac)};background:var(--bg);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:16px;box-shadow:inset 0 0 0 1px var(--border)">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span style="font:700 20px/1 var(--font-display);letter-spacing:-.01em"><span style="background:linear-gradient(120deg,var(--grad-from),var(--grad-to));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">${name}</span></span>
      <span style="display:flex;gap:6px">${badge(THEME_WORD[theme], 'archive')}${badge('Live', 'live')}</span>
    </div>
    <div class="ui-card" style="padding:16px 18px;display:flex;flex-direction:column;align-items:flex-start;gap:13px">
      <div class="sub__row">${button({ label: 'Primary', variant: 'primary', size: 'sm' })}${button({ label: 'Secondary', variant: 'secondary', size: 'sm' })}${button({ label: 'Ghost', variant: 'ghost', size: 'sm' })}</div>
      ${segmented({ options: ['Deck', 'Text'], active: 0, size: 'sm', ariaLabel: 'View' })}
      <div style="display:flex;align-items:center;gap:10px">
        <label class="ui-switch"><input type="checkbox" checked aria-label="Accent drives every control"><span class="ui-switch__track"></span></label>
        <span style="color:var(--dim);font:400 13px var(--font-sans)">Accent drives every control</span>
      </div>
    </div>
  </div>`;
};

const wall = (theme) => `${ROW_CSS}
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px">
    ${Object.keys(ACCENT).map((n) => panel(n, theme)).join('')}
  </div>`;

export const Overview = {
  render: (_args, ctx) => {
    const theme = ctx && ctx.globals && ctx.globals.theme === 'light' ? 'light' : 'dark';
    return pad(`
    <h1 style="font:700 30px/1.1 var(--font-display);color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Accent sub-themes</h1>
    <p style="color:var(--dim);margin-bottom:32px;max-width:64ch">One orthogonal <code style="font-family:var(--font-mono)">data-accent</code> dimension, on top of dark/light. All four accents at once — only the accent family moves; surfaces, text and signal colours (green = live) stay put. Flip <b>Theme</b> in the toolbar to see them in light or dark.</p>
    ${wall(theme)}
  `);
  },
};
