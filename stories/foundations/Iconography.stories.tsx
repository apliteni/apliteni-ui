import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { icon, iconCategories, iconNames } from '../../src/assets/icons.js';
import { Segmented } from '../../react/src/Segmented';

const meta: Meta = { title: 'Foundations/Iconography', parameters: { layout: 'fullscreen' } };
export default meta;

const STYLE = `
  .ic-wrap { padding: 40px 44px 90px; max-width: 1000px; margin: 0 auto; --ic-size: 24px; }
  .ic-head h1 { font: 700 30px/1.1 var(--font-display); color: var(--strong); letter-spacing: -.02em; margin-bottom: 6px; }
  .ic-head p { color: var(--dim); margin-bottom: 20px; max-width: 60ch; line-height: 1.55; }
  .ic-head code { font-family: var(--font-mono); font-size: .9em; color: var(--text); }
  .ic-controls { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  .ic-search { flex: 1; min-width: 220px; height: 40px; padding: 0 15px; border-radius: 12px;
    border: 1px solid var(--surface-2); background: var(--surface); color: var(--text); font: inherit; font-size: 14px; }
  .ic-search:focus-visible { outline: var(--ring); outline-offset: var(--ring-offset); }
  .ic-cat { margin-top: 34px; }
  .ic-cat__h { font: 600 12px/1 var(--font-display); color: var(--muted);
    margin-bottom: 14px; display: flex; align-items: center; gap: 9px; }
  .ic-cat__n { color: var(--dim); font-weight: 500; }
  .ic-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 12px; }
  .ic-tile { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 8px 13px;
    background: var(--surface); border: 1px solid transparent; border-radius: 14px; cursor: pointer; font: inherit;
    position: relative; transition: border-color .15s, background .15s, transform .1s; }
  .ic-tile:hover { border-color: var(--accent); background: var(--surface-2); }
  .ic-tile:active { transform: translateY(1px); }
  .ic-tile:focus-visible { outline: var(--ring); outline-offset: var(--ring-offset); }
  .ic-glyph { color: var(--accent); display: grid; place-items: center; height: 28px; }
  .ic-glyph svg { width: var(--ic-size); height: var(--ic-size); }
  .ic-name { font-family: var(--font-mono); font-size: 11.5px; color: var(--muted); text-align: center; word-break: break-word; }
  .ic-copied { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 14px;
    background: var(--surface-2); color: var(--green); font-size: 12px; font-weight: 600; opacity: 0; pointer-events: none; transition: opacity .12s; }
  .ic-tile.is-copied .ic-copied { opacity: 1; }
  .ic-empty { color: var(--dim); padding: 34px 2px; }
`;

function Tile({ name, hidden }: { name: string; hidden: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Clipboard may be blocked inside the preview iframe: flash "Copied" either way
  // so the interaction always reads.
  const copy = () => {
    navigator.clipboard?.writeText(`icon('${name}')`).catch(() => {});
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 900);
  };
  return <button className={`ic-tile${copied ? ' is-copied' : ''}`} type="button" data-ic-name={name} title={`Copy icon('${name}')`} hidden={hidden} onClick={copy}>
    <span className="ic-glyph" dangerouslySetInnerHTML={{ __html: icon(name) }} />
    <code className="ic-name">{name}</code>
    <span className="ic-copied">Copied ✓</span>
  </button>;
}

function IconSet() {
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('24');
  const q = query.trim().toLowerCase();
  const shown = iconCategories.map(c => ({ ...c, names: c.names.filter(n => !q || n.toLowerCase().includes(q)) }));
  const any = shown.some(c => c.names.length);
  return <>
    <style>{STYLE}</style>
    <div className="ic-wrap" style={{ ['--ic-size' as string]: `${size}px` }}>
      <div className="ic-head">
        <h1>Iconography</h1>
        <p>{'One line set — 24×24, 1.7 stroke, '}<code>currentColor</code>{'. Feather / Lucide house style, shipped as inline SVG. Call '}<code>icon('name')</code>; click any glyph to copy that call.</p>
        <div className="ic-controls">
          <input className="ic-search" type="search" placeholder={`Search ${iconNames.length} icons…`} aria-label="Search icons" value={query} onChange={e => setQuery(e.target.value)} />
          <Segmented options={['16', '20', '24'].map(v => ({ value: v, label: v }))} value={size} onChange={setSize} size="sm" label="Icon size" />
        </div>
      </div>
      <div className="ic-empty" hidden={any}>No icons match “<b>{q}</b>”.</div>
      {iconCategories.map((c, i) => <section key={c.name} className="ic-cat" data-ic-cat hidden={!shown[i].names.length}>
        <h2 className="ic-cat__h">{c.name} <span className="ic-cat__n">{c.names.length}</span></h2>
        <div className="ic-grid">{c.names.map(n => <Tile key={n} name={n} hidden={!shown[i].names.includes(n)} />)}</div>
      </section>)}
    </div>
  </>;
}

export const Set: StoryObj = { render: () => <IconSet /> };
