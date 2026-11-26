import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { Default as Today } from '../../react/src/DocumentReview.stories';
import { AppShell } from '../../react/src/AppShell';
import { BackLink } from '../../react/src/BackLink';
import { Button } from '../../react/src/primitives/Button';
import { KeyValueList } from '../../react/src/KeyValueList';
import { EmptyState } from '../../react/src/EmptyState';
import { Skeleton } from '../../react/src/Loading';
import './prototype.css';

type Zoom = 'fit' | 50 | 100 | 150 | 200;
type PreviewState = 'ready' | 'loading' | 'unavailable';
type SplitLayoutProps = {
  primary: ReactNode;
  preview: { title: string; children: ReactNode; state: PreviewState; onRetry: () => void };
  actions: ReactNode;
  zoom: Zoom;
  onZoomChange: (zoom: Zoom) => void;
};

// This specimen is a proposed component contract, not a package export.
function SplitLayout({ primary, preview, actions, zoom, onZoomChange }: SplitLayoutProps) {
  const stage = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const box = stage.current;
    const page = sheet.current;
    if (!box || !page) return;
    const measure = () => {
      const css = getComputedStyle(box);
      const width = box.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
      const height = box.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
      setFit(Math.min(1, width / page.offsetWidth, height / page.offsetHeight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(page);
    return () => observer.disconnect();
  }, [preview.state]);
  const scale = zoom === 'fit' ? fit : zoom / 100;
  const steps = [50, 100, 150, 200] as const;
  const down = [...steps].reverse().find(value => value < scale * 100 - 1);
  const up = steps.find(value => value > scale * 100 + 1);
  const ready = preview.state === 'ready';
  return <div className="split-layout">
    <section className="split-primary" aria-label="Saved values" tabIndex={0}>{primary}</section>
    <section className="split-preview ui-document-ground" aria-labelledby="preview-title">
      <div className="preview-controls"><header className="preview-head">
        <h2 id="preview-title" className="ui-card__title">{preview.title}</h2>
        <span>Page 1 of 1</span>
      </header>
      <div className="preview-tools" role="group" aria-label="Preview zoom">
        <Button variant="ghost" iconOnly icon="minus" aria-label="Zoom out" disabled={!ready || down == null}
          onClick={() => onZoomChange(down!)} />
        <output className="preview-scale" aria-live="polite">{ready ? `${Math.round(scale * 100)}%` : ''}</output>
        <Button variant="ghost" iconOnly icon="plus" aria-label="Zoom in" disabled={!ready || up == null}
          onClick={() => onZoomChange(up!)} />
        <Button variant="ghost" aria-pressed={zoom === 'fit'} disabled={!ready} onClick={() => onZoomChange('fit')}>Fit</Button>
      </div>
      </div>
      <div ref={stage} className="preview-stage" role="region" aria-label="Document sheet" tabIndex={0} aria-busy={preview.state === 'loading'}>
        {preview.state === 'unavailable'
          ? <div className="preview-error"><EmptyState title="Preview unavailable" sub="" icon=""
              actions={<Button onClick={preview.onRetry}>Try again</Button>} /></div>
          : <div ref={sheet} className="ui-card__page document-sheet" style={{ zoom: scale }}>
            {preview.state === 'loading' ? <><span className="ui-sr" role="status">Loading preview</span><Skeleton lines={8} /></> : preview.children}
          </div>}
      </div>
    </section>
    <footer className="split-actions"><div className="actions-content">{actions}</div></footer>
  </div>;
}
const identity = [
  { label: 'Supplier', value: 'Sample Studio' },
  { label: 'Invoice', value: 'DEMO-1042' },
  { label: 'Issued', value: '14 September 2026' },
  { label: 'Due', value: '28 September 2026' },
  { label: 'Currency', value: 'EUR' },
];
const totals = [['Subtotal', '1,200.00'], ['VAT (20%)', '240.00'], ['Total', '1,440.00']];
const lines = [['Interface design', 6, '450.00'], ['Prototype review', 4, '300.00'],
  ['Design revisions', 4, '300.00'], ['Developer handoff', 2, '150.00']];

function Amounts({ source = false }: { source?: boolean }) {
  return <table className="ui-table ui-table--dense">
    <caption className="ui-sr">{source ? 'Services on this invoice' : 'Amounts read from the invoice'}, in EUR</caption>
    <thead><tr><th>{source ? 'Service' : <span className="ui-sr">Amount</span>}</th>
      {source && <th className="ui-table__num">Hours</th>}<th className="ui-table__num">Amount (EUR)</th></tr></thead>
    <tbody>{source ? lines.map(([label, hours, value]) => <tr key={label}><td className="ui-table__title">{label}</td>
      <td className="ui-table__num">{hours}</td><td className="ui-table__num">{value}</td></tr>)
      : totals.slice(0, 2).map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td className="ui-table__num">{value}</td></tr>)}</tbody>
    <tfoot>{(source ? totals : totals.slice(2)).map(([label, value]) => <tr key={label}>
      <th scope="row" colSpan={source ? 2 : 1} className={label === 'Total' ? 'ui-table__num--strong' : undefined}>{label}</th>
      <td className={`ui-table__num ${label === 'Total' ? 'ui-table__num--strong' : ''}`}>{value}</td></tr>)}</tfoot>
  </table>;
}

function Proposed({ state }: { state: PreviewState }) {
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [preview, setPreview] = useState(state);
  const [step, setStep] = useState('review');
  useEffect(() => setPreview(state), [state]);
  return <AppShell word="Workspace" width="full"
    sections={[{ href: '#invoices', label: 'Invoices', icon: 'doc' }, { href: '#reports', label: 'Reports', icon: 'chart' }]}
    pathname="#invoices" account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}>
    {step === 'review' ? <SplitLayout zoom={zoom} onZoomChange={setZoom}
      primary={<div className="primary-content">
        <BackLink href="#invoices" label="Invoices" />
        <h1>Review invoice DEMO-1042</h1>
        <h2 className="ui-card__title saved-title">Extracted fields</h2>
        <KeyValueList rows={identity} />
        <Amounts />
      </div>}
      preview={{ title: 'Document preview', state: preview, onRetry: () => setPreview('ready'), children: <>
        <h3>Sample Studio</h3><p>Invoice DEMO-1042</p><p>€75.00 per hour</p>
        <p>Issued 14 September 2026</p><p>Due 28 September 2026</p><Amounts source />
      </> }}
      actions={<Button variant="primary" disabled={preview === 'loading'} onClick={() => setStep('confirm')}>Continue to approval</Button>} />
      : <section className="review-confirm"><h1>Confirm approval</h1><p>Approve €1,440.00 for Sample Studio.</p>
          <p>This prototype saves nothing.</p><Button onClick={() => setStep('review')}>Back to review</Button></section>}
  </AppShell>;
}

const params = new URLSearchParams(location.search);
const capture = params.get('capture') === '1';
const Before = Today.render as React.ComponentType<{ step: 'review'; preview: PreviewState }>;
function Prototype() {
  const [view, setView] = useState(params.get('view') === 'today' ? 'today' : 'split');
  const [theme, setTheme] = useState(params.get('theme') === 'dark' ? 'dark' : 'light');
  const [state, setState] = useState<PreviewState>((params.get('state') as PreviewState) || 'ready');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return <div className={capture ? 'review-root review-root--capture' : 'review-root'}>
    {!capture && <div className="review-tools" role="region" aria-label="Prototype controls">
      <label>View<select className="ui-select" value={view} onChange={e => setView(e.target.value)}>
        <option value="split">Full-height split</option><option value="today">Today on main</option>
      </select></label>
      <Button variant="ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark' : 'Light'}</Button>
      <label>Preview<select className="ui-select" value={state} onChange={e => setState(e.target.value as PreviewState)}>
        <option value="ready">Ready</option><option value="loading">Loading</option><option value="unavailable">Unavailable</option>
      </select></label>
    </div>}
    <div className={`review-canvas review-canvas--${view}`}>
      {view === 'today' ? <Before step="review" preview={state} /> : <Proposed state={state} />}
    </div>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Prototype />);
