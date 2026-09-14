import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
};

const specimenRow = (size, weight, label, sample, role) => `
  <div style="display:flex;align-items:baseline;gap:24px;padding:16px 0;border-bottom:1px solid var(--border)">
    <div style="flex:none;width:150px;font:400 12px/1.4 var(--font-sans);color:var(--muted)">${label}<br><span style="color:var(--dim)">${size} / ${weight}</span></div>
    <div style="font-family:var(--font-${role});font-size:${size};font-weight:${weight};color:var(--strong);letter-spacing:-.01em;line-height:1.1">${sample}</div>
  </div>`;

const h3 = (t, note) => `
  <h3 style="font:600 13px/1 var(--font-display);color:var(--muted);margin:44px 0 6px">${t}</h3>
  <p style="font:400 13px/1.6 var(--font-sans);color:var(--dim);max-width:64ch;margin-bottom:18px">${note}</p>`;

/* The same paragraph twice, one face each, at the size the complaint is about.
   Cyrillic on purpose: it is where the two faces differ most, and it is most of
   what the kit renders. why: docs/specification.md#typefaces */
const SAMPLE = 'Отчёт за неделю: расход вырос на 12%, конверсия держится. '
  + 'The row you are reading is set at 13px, which is what a table cell, a form '
  + 'field and a chat bubble are set at — <b>and this is bold</b>.';

const compareCell = (role, name, verdict) => `
  <div style="flex:1 1 0;min-width:0;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px">
    <div style="font:600 11px/1 var(--font-sans);color:var(--muted);margin-bottom:4px">${name}</div>
    <code style="font-family:var(--font-mono);font-size:11px;color:var(--accent)">--font-${role}</code>
    <p style="font-family:var(--font-${role});font-size:13px;line-height:1.6;color:var(--text);margin:14px 0 12px">${SAMPLE}</p>
    <div style="font:400 12px/1.5 var(--font-sans);color:var(--muted)">${verdict}</div>
  </div>`;

export const Scale = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 var(--font-display);color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Typography</h1>
    <p style="color:var(--dim);margin-bottom:8px;max-width:70ch">Two roles, not one family. <b>Poppins</b> is the deck's voice and stays on headings, brand marks and large readouts. <b>IBM Plex Sans</b> is what an application is actually made of — tables, fields, paragraphs, chat.</p>
    <p style="color:var(--muted);margin-bottom:30px;max-width:70ch;font-size:13px">The element decides, never the size: <code style="font-family:var(--font-mono);font-size:12px">h1</code>–<code style="font-family:var(--font-mono);font-size:12px">h6</code> take the display face, everything else takes the text face. A size threshold would change a heading's typeface halfway through a resize.</p>

    <div style="max-width:820px">
      ${h3('Display — <code style="font-family:var(--font-mono);font-size:.85em">--font-display</code>', 'Poppins. Geometric, wide, low stroke contrast — it holds its character where a line is short and the size is large.')}
      ${specimenRow('56px', 700, 'Hero', 'Product units', 'display')}
      ${specimenRow('40px', 700, 'Display', 'One strategy, many agents', 'display')}
      ${specimenRow('30px', 700, 'Page title, h1', 'Access &amp; agents', 'display')}
      ${specimenRow('22px', 600, 'Section', 'Connect over MCP', 'display')}

      ${h3('Text — <code style="font-family:var(--font-mono);font-size:.85em">--font-sans</code>', 'IBM Plex Sans. Humanist and narrower, with Cyrillic drawn by the same team as its Latin. This is the face the reading happens in. Page title, card title, body, label, caption and chip are the six ranks in docs/specification.md#labels-and-titles.')}
      ${specimenRow('18px', 600, 'Card title, h2', 'Appearance', 'sans')}
      ${specimenRow('15.5px', 400, 'Body large', 'The readable long-form version of the strategy.', 'sans')}
      ${specimenRow('14.5px', 400, 'Body', 'Personal tokens agents use to read the strategy.', 'sans')}
      ${specimenRow('13px', 500, 'Label', 'Last 30 days', 'sans')}
      ${specimenRow('11px', 600, 'Chip', 'Live', 'sans')}
    </div>

    <div style="max-width:820px">
      ${h3('Why the split', 'The same paragraph at 13px, one face each. Poppins is not worse — it is doing a job it was not drawn for, and the wide round counters cost a line every few rows.')}
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        ${compareCell('display', 'Poppins', 'Wide counters, single-storey a. Measured on one dense table: mean row 62.27px, because three of twelve titles wrapped to a second line.')}
        ${compareCell('sans', 'IBM Plex Sans', 'Narrower and quieter at this size. Same table, same markup: mean row 56.40px, nothing wrapped.')}
      </div>
      <p style="font:400 12.5px/1.6 var(--font-sans);color:var(--muted);margin-top:14px;max-width:70ch">Bold in both samples is <code style="font-family:var(--font-mono);font-size:11.5px">--weight-semibold</code>, not the browser's 700: at 13px the bold step reads as a filled-in shape rather than as emphasis. 700 is still there for anything that asks for it by name.</p>
    </div>

    <div style="margin-top:36px;max-width:820px">
      <h3 style="font:600 13px/1 var(--font-display);color:var(--muted);margin-bottom:16px">Monospace — <code style="font-family:var(--font-mono)">--font-mono</code></h3>
      <pre style="font-family:var(--font-mono);font-size:14px;color:var(--text);background:var(--surface-2);padding:16px;border-radius:12px;margin:0">claude mcp add strategy --url https://strategy.apli.tech/mcp</pre>
    </div>
  `),
};
