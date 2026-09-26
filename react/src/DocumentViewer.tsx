import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Button } from './primitives/Button';
import { BusyRegion, Skeleton } from './Loading';
import './DocumentViewer.css';

export type DocumentZoom = 'fit-width' | 'fit-page' | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
export type DocumentViewerProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  file: { name: string; size: string; href: string };
  kind?: 'pdf' | 'image';
  pageCount?: number;
  state?: 'loading' | 'ready' | 'error';
  defaultZoom?: DocumentZoom;
  renderDocument: (view: { page: number; zoom: DocumentZoom }) => ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export function DocumentViewer({
  file, kind = 'pdf', pageCount = 1, state = 'ready', defaultZoom = 'fit-width',
  renderDocument, children, footer, className, ...rest
}: DocumentViewerProps) {
  const [requestedPage, setPage] = useState(1);
  const [zoom, setZoom] = useState<DocumentZoom>(defaultZoom);
  const count = Number.isFinite(pageCount) ? Math.max(1, Math.floor(pageCount)) : 1;
  const page = Math.min(requestedPage, count);
  const zoomIndex = ZOOM_STEPS.indexOf(typeof zoom === 'number' ? zoom : 1);
  const unavailable = state !== 'ready';
  const move = (delta: number) => setPage(Math.max(1, Math.min(count, page + delta)));
  const download = (label: string) => <a className="ui-btn ui-btn--secondary ui-btn--sm" href={file.href} download={file.name}>{label}</a>;

  return (
    <div {...rest} className={['ui-card', 'ui-document-viewer', className].filter(Boolean).join(' ')}>
      <div className="ui-document-viewer__preview">
        <div className="ui-document-viewer__toolbar" role="group" aria-label="Document controls">
          {kind === 'pdf' && <div className="ui-document-viewer__controls">
            <Button size="sm" aria-label="Previous page" disabled={unavailable || page === 1} onClick={() => move(-1)}>Previous</Button>
            <span aria-live="polite" aria-atomic="true">{page} of {count}</span>
            <Button size="sm" aria-label="Next page" disabled={unavailable || page === count} onClick={() => move(1)}>Next</Button>
          </div>}
          <div className="ui-document-viewer__controls">
            <Button size="sm" disabled={unavailable} aria-pressed={zoom === 'fit-width'} onClick={() => setZoom('fit-width')}>Fit width</Button>
            <Button size="sm" disabled={unavailable} aria-pressed={zoom === 'fit-page'} onClick={() => setZoom('fit-page')}>Fit page</Button>
            <Button size="sm" aria-label="Zoom out" disabled={unavailable || zoomIndex === 0} onClick={() => setZoom(ZOOM_STEPS[zoomIndex - 1])}>−</Button>
            <Button size="sm" aria-label="Zoom in" disabled={unavailable || zoomIndex === ZOOM_STEPS.length - 1} onClick={() => setZoom(ZOOM_STEPS[zoomIndex + 1])}>+</Button>
            <span className="ui-sr" aria-live="polite">{typeof zoom === 'number' ? `${zoom * 100}%` : zoom === 'fit-width' ? 'Fit width' : 'Fit page'}</span>
          </div>
          {download('Download')}
        </div>
        <div className="ui-document-viewer__scroll" role="region" aria-label={file.name} tabIndex={0}
          onKeyDown={event => {
            if (event.target !== event.currentTarget || kind !== 'pdf' || unavailable || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (event.key === 'PageDown' || event.key === 'PageUp') {
              event.preventDefault();
              move(event.key === 'PageDown' ? 1 : -1);
            }
          }}>
          <BusyRegion busy={state === 'loading'} label="Loading document" message={state === 'error' ? 'Document preview unavailable' : 'Document ready'}
            placeholder={<Skeleton lines={1} height="36rem" />}>
            {state === 'error' ? <div className="ui-empty">
              <p className="ui-empty__title">Cannot preview this document</p>
              <p className="ui-empty__sub">{file.name} · {file.size}</p>
              <div className="ui-empty__actions">{download('Download document')}</div>
            </div> : <div role="document" aria-label={file.name}>{state === 'ready' && renderDocument({ page, zoom })}</div>}
          </BusyRegion>
        </div>
      </div>
      <div className="ui-document-viewer__details">
        <div className="ui-document-viewer__fields" role="region" aria-label="Document fields" tabIndex={0}>{children}</div>
        {footer != null && <div className="ui-document-viewer__footer">{footer}</div>}
      </div>
    </div>
  );
}
