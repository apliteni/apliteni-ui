import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from '../AppShell';
import { Button } from '../primitives/Button';
import { KeyValueList } from '../KeyValueList';
import './SplitLayout.css';

// A general split layout: the task (title, fields, Approve and Request changes) on the
// page ground, beside a document on its own full-bleed ground. The document ground is
// the proposed token --ui-document-ground (var(--surface-2) today), named in the PR.
// why: #850 round 31, split-c
const fields = [
  { label: 'Prepared by', value: 'Cedar Studio' },
  { label: 'Document', value: 'DEMO-1042' },
  { label: 'Issued', value: '18 September 2026' },
  { label: 'Due', value: '28 September 2026' },
  { label: 'Total', value: 'EUR 1,440.00' },
];

const meta: Meta = {
  title: 'Showcases/Split layout',
  id: 'apps-split-layout',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj = {
  render: () => (
    <AppShell
      word="Workspace"
      width="wide"
      sections={[
        { href: '#documents', label: 'Documents', icon: 'doc' },
        { href: '#settings', label: 'Settings', icon: 'gear' },
      ]}
      pathname="#documents"
      account={{ name: 'Demo Reviewer', email: 'demo@example.com' }}
      onSignOut={() => {}}
    >
      <div className="split-layout">
        <div className="split-layout__task">
          {/* The page owns its heading here, so the shell is given no title. One h1,
              one reading order: title, fields, actions, then the document. */}
          <h1>Approve document</h1>
          <p className="ui-app__sub">Check the details read from the document, then approve it or ask for changes.</p>
          <KeyValueList rows={fields} />
          <div className="split-layout__actions">
            <Button variant="primary">Approve</Button>
            <Button variant="ghost">Request changes</Button>
          </div>
        </div>
        <div className="split-layout__document">
          {/* The document page sits at document size on the full-bleed ground. */}
          <article className="ui-card__page split-layout__sheet" aria-label="Document">
            <h2>Service agreement</h2>
            <p>Cedar Studio prepares the brand refresh for the Workspace.</p>
            <p>Reference DEMO-1042, issued 18 September 2026 and due 28 September 2026.</p>
            <p>The work covers interface design, prototype review and developer handoff.</p>
            <p><strong>Total: EUR 1,440.00</strong></p>
          </article>
        </div>
      </div>
    </AppShell>
  ),
};
