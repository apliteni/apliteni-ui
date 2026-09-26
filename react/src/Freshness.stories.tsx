import { Badge } from './primitives/Badge';
import { Button } from './primitives/Button';
import { Icon } from './primitives/Icon';

export default {
  title: 'Showcases/Source freshness',
  id: 'showcases-source-freshness',
};

// The product supplies the source order, delivery dates and freshness judgement.
const sources = [
  { name: 'Bank feed', status: 'Fresh', variant: 'success', icon: 'check', date: '2026-09-26', label: '26 Sep 2026', detail: 'Daily. Last delivery: 08:00 UTC.' },
  { name: 'Invoices', status: 'Late', variant: 'warn', icon: 'clock', date: '2026-09-24', label: '24 Sep 2026', detail: 'Daily. Two deliveries are overdue.' },
  { name: 'Payroll', status: 'Failing', variant: 'danger', icon: 'alert', date: '2026-08-31', label: '31 Aug 2026', detail: 'Monthly. Access has expired; reconnect the source.' },
];

export const Sources = {
  render: () => (
    <main>
      <h1>Data freshness</h1>
      <p>Demo data as of 26 Sep 2026, 09:00 UTC.</p>
      <Button size="sm" onClick={() => {
        const root = document.documentElement;
        root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
      }}>Change theme</Button>
      <ul aria-label="Data sources" role="list" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', padding: 0, listStyle: 'none' }}>
        {sources.map(source => (
          <li key={source.name}>
            <Badge variant={source.variant}>
              <Icon name={source.icon} />
              <span>{source.name}: {source.status}, as of <time dateTime={source.date}>{source.label}</time></span>
            </Badge>
            <p>{source.detail}</p>
          </li>
        ))}
      </ul>
    </main>
  ),
};
