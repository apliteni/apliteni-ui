import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { Default as Today } from '../../react/src/DocumentReview.stories';
import { AppShell } from '../../react/src/AppShell';
import { Card } from '../../react/src/primitives/Card';
import { Button } from '../../react/src/primitives/Button';
import { KeyValueList } from '../../react/src/KeyValueList';
import { EmptyState } from '../../react/src/EmptyState';
import { Skeleton } from '../../react/src/Loading';
import './prototype.css';

// Design specimen only. This component is not part of the package.
type Zoom = 'fit' | 50 | 100 | 150 | 200;
type Pane = { title: string; children: ReactNode };
type SplitLayoutProps = {
  primary: Pane;
  preview: Pane & { page?: { current: number; total: number }; state?: 'ready' | 'loading' | 'unavailable'; onRetry?: () => void };
  actions?: ReactNode;
  zoom: Zoom;
  onZoomChange: (zoom: Zoom) => void;
};

function SplitLayout({ primary, preview, actions, zoom, onZoomChange }: SplitLayoutProps) {
  const stage = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, fit: 1 });
  const [overflows, setOverflows] = useState(false);
  const ready = !preview.state || preview.state === 'ready';
  useEffect(() => {
    const box = stage.current;
    if (!box) return;
    const measure = () => {
      const style = getComputedStyle(box);
      const room = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const width = Math.max(parseFloat(style.getPropertyValue('--panel-md')), room);
      setSize({ width, fit: room / width });
      setOverflows(box.scrollWidth > box.clientWidth + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    if (sheet.current) observer.observe(sheet.current);
    return () => observer.disconnect();
  }, [zoom, preview.state]);
  const scale = zoom === 'fit' ? size.fit : zoom / 100;
  const steps = [50, 100, 150, 200] as const;
  const down = [...steps].reverse().find(value => value < scale * 100 - 1);
  const up = steps.find(value => value > scale * 100 + 1);
  return <div className="split-layout">
    <div className="split-layout__panes">
      <Card title={primary.title} className="split-layout__primary">{primary.children}</Card>
      <Card title={preview.title} tools={preview.page ? <span>Page {preview.page.current} of {preview.page.total}</span> : undefined}>
        <div className="ui-card__viewer">
          <div className="ui-toolbar split-layout__tools" role="group" aria-label="Preview zoom">
            <div className="split-layout__zoom">
              <Button size="sm" variant="ghost"
                disabled={!ready || down == null} onClick={() => onZoomChange(down!)}>Zoom out</Button>
              <span className="split-layout__scale" aria-live="polite">{ready ? `${Math.round(scale * 100)}%` : ''}</span>
              <Button size="sm" variant="ghost"
                disabled={!ready || up == null} onClick={() => onZoomChange(up!)}>Zoom in</Button>
              <Button size="sm" variant="ghost" disabled={!ready}
                onClick={() => onZoomChange('fit')}>Fit</Button>
            </div>
          </div>
          <span className="ui-sr" role="status">{preview.state === 'loading' ? 'Loading preview' : ''}</span>
          <div ref={stage} className={preview.state === 'unavailable' ? undefined : 'ui-table-scroll'} tabIndex={overflows ? 0 : undefined}
            role="region" aria-label={preview.title} aria-busy={preview.state === 'loading'}>
            {preview.state === 'unavailable' ? <EmptyState title="Preview unavailable" sub="" icon="" actions={<Button onClick={preview.onRetry}>Try again</Button>} />
              : <div ref={sheet} className="ui-card__page split-layout__sheet" style={{ width: size.width || undefined, zoom: scale }}>
                {preview.state === 'loading' ? <Skeleton lines={8} /> : preview.children}
              </div>}
          </div>
        </div>
      </Card>
    </div>
    <div className="split-layout__actions">{actions}</div>
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

function Proposed({ state }: { state: 'ready' | 'loading' | 'unavailable' }) {
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [preview, setPreview] = useState(state);
  const [step, setStep] = useState('review');
  useEffect(() => setPreview(state), [state]);
  return <AppShell word="Workspace" width="wide"
    title={step === 'review' ? 'Review invoice DEMO-1042' : 'Confirm approval'}
    lede={step === 'review' ? 'Check the fields read from the document against the document itself.' : undefined}
    back={{ href: '#invoices', label: 'Invoices' }} sections={[{ href: '#invoices', label: 'Invoices', icon: 'doc' }]}
    pathname="#invoices" account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}>
    {step === 'review' ? <SplitLayout zoom={zoom} onZoomChange={setZoom}
      primary={{ title: 'Extracted fields', children: <><KeyValueList rows={identity} /><Amounts /></> }}
      preview={{ title: 'Document preview', page: { current: 1, total: 1 }, state: preview, onRetry: () => setPreview('ready'), children: <>
        <h3>Sample Studio</h3><p>Invoice DEMO-1042</p><p>€75.00 per hour</p>
        <p>Issued 14 September 2026</p><p>Due 28 September 2026</p><Amounts source />
      </> }} actions={<Button variant="primary" disabled={preview === 'loading'} onClick={() => setStep('confirm')}>Continue to approval</Button>} />
      : <div className="review-confirm"><p>Approve €1,440.00 for Sample Studio.</p>
        <p>This prototype saves nothing.</p><Button onClick={() => setStep('review')}>Back to review</Button></div>}
  </AppShell>;
}

const params = new URLSearchParams(location.search);
const capture = params.get('capture') === '1';
const Before = Today.render as React.ComponentType<{step: 'review'; preview: 'ready' | 'loading' | 'unavailable'}>;
function Prototype() {
  const [view, setView] = useState(params.get('view') === 'today' ? 'today' : 'split');
  const [theme, setTheme] = useState(params.get('theme') || 'light');
  const [state, setState] = useState<'ready' | 'loading' | 'unavailable'>('ready');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  return <>
    {!capture && <div className="review-tools" role="region" aria-label="Prototype controls">
      <div className="review-tools__choice" role="group" aria-label="Screen">
        <Button size="sm" variant="ghost" aria-pressed={view === 'today'} onClick={() => setView('today')}>Today</Button>
        <Button size="sm" variant="ghost" aria-pressed={view === 'split'} onClick={() => setView('split')}>Split layout</Button>
      </div>
      <Button size="sm" variant="ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark' : 'Light'}</Button>
      <label className="review-state">Preview<select className="ui-select" value={state} onChange={e => setState(e.target.value as typeof state)}>
        <option value="ready">Ready</option><option value="loading">Loading</option><option value="unavailable">Unavailable</option></select></label>
    </div>}
    <div className={capture ? '' : 'review-canvas'} data-screen={view}>
      {view === 'today' ? <Before step="review" preview={state} /> : <Proposed state={state} />}
    </div>
  </>;
}
createRoot(document.getElementById('root')!).render(<Prototype />);
