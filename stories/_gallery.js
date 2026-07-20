// Shared helpers for gallery-style stories (padded, labelled specimen grids).
export const row = (...items) =>
  `<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center">${items.join('')}</div>`;

export const stack = (...items) =>
  `<div style="display:flex;flex-direction:column;gap:18px;max-width:640px">${items.join('')}</div>`;

export const specimen = (label, html) =>
  `<div style="display:flex;flex-direction:column;gap:10px">
     <div style="font:600 11px/1 Poppins;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">${label}</div>
     ${html}
   </div>`;

export const grid = (cols, ...items) =>
  `<div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:22px">${items.join('')}</div>`;

// Standard padded canvas for galleries.
export const padded = { layout: 'fullscreen' };
export const pad = (html) => `<div style="padding:40px;min-height:100vh">${html}</div>`;
