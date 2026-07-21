import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
};

const specimenRow = (size, weight, label, sample) => `
  <div style="display:flex;align-items:baseline;gap:24px;padding:16px 0;border-bottom:1px solid var(--border)">
    <div style="flex:none;width:150px;font:400 12px/1.4 Poppins;color:var(--muted)">${label}<br><span style="color:var(--dim)">${size} / ${weight}</span></div>
    <div style="font-family:Poppins;font-size:${size};font-weight:${weight};color:var(--strong);letter-spacing:-.01em;line-height:1.1">${sample}</div>
  </div>`;

export const Scale = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Typography</h1>
    <p style="color:var(--dim);margin-bottom:30px">Poppins across the board — the deck's voice. One family, weights 300–700.</p>
    <div style="max-width:820px">
      ${specimenRow('56px', 700, 'Hero', 'Product units')}
      ${specimenRow('40px', 700, 'Display / h1', 'One strategy, many agents')}
      ${specimenRow('30px', 600, 'Page title', 'Access &amp; agents')}
      ${specimenRow('22px', 600, 'Section', 'Connect over MCP')}
      ${specimenRow('18px', 600, 'Card title', 'Appearance')}
      ${specimenRow('15.5px', 400, 'Body large', 'The readable long-form version of the strategy.')}
      ${specimenRow('14.5px', 400, 'Body', 'Personal tokens agents use to read the strategy.')}
      ${specimenRow('13px', 500, 'Small / label', 'Last used')}
      ${specimenRow('11px', 600, 'Caption / eyebrow', 'PRODUCT UNITS')}
    </div>
    <div style="margin-top:36px;max-width:820px">
      <h3 style="font:600 13px/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Monospace — <code style="font-family:var(--font-mono)">--font-mono</code></h3>
      <pre style="font-family:var(--font-mono);font-size:14px;color:var(--text);background:var(--surface-2);padding:16px;border-radius:12px;margin:0">claude mcp add strategy --url https://strategy.apli.tech/mcp</pre>
    </div>
  `),
};
