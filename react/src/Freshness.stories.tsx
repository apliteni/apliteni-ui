import { fn } from 'storybook/test';
import { Badge } from './primitives/Badge';
import { Button } from './primitives/Button';
import { Icon } from './primitives/Icon';

export default {
  title: 'Showcases/Source freshness',
  id: 'showcases-source-freshness',
  parameters: { layout: 'fullscreen' },
};

const tones = {
  fresh: { variant: 'success', icon: 'circleCheck' },
  late: { variant: 'warn', icon: 'circleAlert' },
  failing: { variant: 'danger', icon: 'circleX' },
};

// The product supplies the source order, delivery dates and freshness judgement.
const sources = [
  { name: 'Bank feed', tone: 'fresh', date: '2026-09-26', label: '26 Sep 2026' },
  { name: 'Invoices', tone: 'late', date: '2026-09-24', label: '24 Sep 2026' },
  { name: 'Payroll', tone: 'failing', date: '2026-08-31', label: '31 Aug 2026' },
] as const;

export const Sources = {
  args: { onReconnect: fn() },
  render: ({ onReconnect }: { onReconnect: () => void }) => (
    <main style={{ padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-4)', justifyItems: 'start' }}>
      <p>Fictional data. Current at 26 Sep 2026, 09:00 UTC.</p>
      <ul aria-label="Data sources" role="list" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'start', gap: 'var(--space-6)', margin: 0, padding: 0, listStyle: 'none' }}>
        {sources.map(source => (
          <li key={source.name} style={{ display: 'grid', gap: 'var(--space-3)', justifyItems: 'start' }}>
            <Badge variant={tones[source.tone].variant}>
              <Icon name={tones[source.tone].icon} />
              <span>{source.name} — {source.tone}, last delivered <time dateTime={source.date}>{source.label}</time></span>
            </Badge>
            {source.tone === 'failing' && <Button size="sm" onClick={onReconnect}>
              Reconnect Payroll
            </Button>}
          </li>
        ))}
      </ul>
    </main>
  ),
};
