/* The accent sub-theme table, shared by the Sub-themes story and the accent
 * contrast gate. A plain module, because the gate runs in Node and cannot import
 * a TSX story. */

// The real token values, mirrored so each preview panel is self-contained via
// inline CSS variables. Only the accent family is pinned per panel: `a`
// --accent, `as` --accent-strong, `ac` --accent-contrast, `p` --purple, `pl`
// --purple-light, `pm` --purple-mid, `g` --glow-purple, `gf`/`gt` the gradient
// stops. There is no ring key — --ring is var(--accent) declared once for every
// accent, so a panel pinning its own would paint a ring the kit no longer has.
//
// A HAND-COPIED MIRROR GOES STALE, and this one twice did. So it is no longer
// trusted: stories/accent-contrast.test.js resolves accentVars() below against
// the two token files, property by property, and fails on the first value that
// has drifted. Move a token, and fix the row the failure names.
export const ACCENT = {
  Nebula: {
    dark: { a: '#b479ff', as: '#7c3aed', ac: '#fff', p: '#6a2dcc', pl: '#b479ff', pm: '#bd8cff', g: 'rgba(180,121,255,.12)', gf: '#9b5dff', gt: '#20dcf5' },
    light: { a: '#6a2dcc', as: '#6a2dcc', ac: '#fff', p: '#6a2dcc', pl: '#6a2dcc', pm: '#7a3be0', g: 'rgba(106,45,204,.09)', gf: '#6a2dcc', gt: '#0c8fa8' },
  },
  Phoenix: {
    dark: { a: '#ff6a3d', as: '#ff6a3d', ac: '#241006', p: '#e0531f', pl: '#ff8a5c', pm: '#ffa273', g: 'rgba(255,106,61,.15)', gf: '#ff7a45', gt: '#ffcf6a' },
    light: { a: '#a8370c', as: '#a8370c', ac: '#fff', p: '#c2400f', pl: '#d64a12', pm: '#b8420f', g: 'rgba(214,74,18,.1)', gf: '#d64a12', gt: '#e8992a' },
  },
  Ocean: {
    dark: { a: '#3b9dff', as: '#3b9dff', ac: '#04121f', p: '#1f7fe0', pl: '#5ab0ff', pm: '#7cc0ff', g: 'rgba(59,157,255,.15)', gf: '#3b9dff', gt: '#20dcf5' },
    light: { a: '#005ab4', as: '#005ab4', ac: '#fff', p: '#1156b8', pl: '#1568d6', pm: '#1560c8', g: 'rgba(21,104,214,.1)', gf: '#1568d6', gt: '#17a2c0' },
  },
  Emerald: {
    dark: { a: '#16c98a', as: '#16c98a', ac: '#04180f', p: '#0fa876', pl: '#3ad9a0', pm: '#5fe3b4', g: 'rgba(22,201,138,.18)', gf: '#16c98a', gt: '#20dcf5' },
    light: { a: '#076c48', as: '#076c48', ac: '#fff', p: '#0a865a', pl: '#0b9c68', pm: '#0a9060', g: 'rgba(11,156,104,.08)', gf: '#0b9c68', gt: '#12b0a0' },
  },
};

export const accentVars = (ac) =>
  `--accent:${ac.a};--accent-strong:${ac.as};--accent-contrast:${ac.ac};--purple:${ac.p};--purple-light:${ac.pl};--purple-mid:${ac.pm};--glow-purple:${ac.g};--grad-from:${ac.gf};--grad-to:${ac.gt}`;
