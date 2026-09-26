import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { DocumentViewer, type DocumentZoom } from './DocumentViewer';
import { KeyValueList } from './KeyValueList';
import { Button } from './primitives/Button';

const meta: Meta<typeof DocumentViewer> = { title: 'React/DocumentViewer', component: DocumentViewer };
export default meta;

const file = { name: 'sample-invoice.svg', size: '1 KB', href: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><text x="40" y="70" font-family="sans-serif" font-size="28">Sample invoice</text><text x="40" y="130" font-family="sans-serif" font-size="20">DEMO-001</text><text x="40" y="170" font-family="sans-serif" font-size="20">Amount: EUR 120.00</text><text x="40" y="740" font-family="sans-serif" font-size="16">Fictional document for this example.</text></svg>')}` };

function renderDocument({ page, zoom }: { page: number; zoom: DocumentZoom }) {
  const style: CSSProperties = zoom === 'fit-width'
    ? { display: 'block', width: '100%', maxWidth: 'none' }
    : zoom === 'fit-page'
      ? { display: 'block', width: '100%', height: '100%', maxWidth: '100%', objectFit: 'contain', margin: 'auto' }
      : { display: 'block', width: 600 * zoom, maxWidth: 'none' };
  return <img src={file.href} alt={`Sample invoice, page ${page}. Reference DEMO-001, amount EUR 120.00.`} style={style} />;
}
const fields = <KeyValueList rows={[{ label: 'Reference', value: 'DEMO-001' }, { label: 'Amount', value: 'EUR 120.00' }]} />;
const base = { file, pageCount: 3, renderDocument, children: fields };

export const ReadOnly: StoryObj = { render: () => <DocumentViewer {...base} /> };
export const Review: StoryObj = {
  render: () => <DocumentViewer {...base} footer={<><Button variant="primary">Accept</Button><Button variant="danger">Reject</Button></>}>
    <label className="ui-field"><span className="ui-field__label">Reference</span><input className="ui-input" defaultValue="DEMO-001" /></label>
    <label className="ui-field"><span className="ui-field__label">Amount (EUR)</span><input className="ui-input" defaultValue="120.00" inputMode="decimal" /></label>
  </DocumentViewer>,
};
export const Image: StoryObj = { render: () => <DocumentViewer {...base} kind="image" /> };
export const Loading: StoryObj = { render: () => <DocumentViewer {...base} state="loading" /> };
export const CannotRender: StoryObj = { render: () => <DocumentViewer {...base} state="error" /> };
export const Zoomed: StoryObj = { render: () => <DocumentViewer {...base} defaultZoom={2} /> };
