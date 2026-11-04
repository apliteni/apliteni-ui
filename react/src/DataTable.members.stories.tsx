import { DataTable, type Column } from './DataTable';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';
import { Tooltip } from './Tooltip';
import { useTableFilters } from '../../stories/_table-filters';

// The members table from #770: a row table in a card under its filter bar, the email
// under the name, and icon row actions that each show their word on hover.
export default { title: 'React/DataTable members' };

type Member = { name: string; email: string; role: string; home: string; act?: never };
const MEMBERS: Member[] = [
  ['Mara Lindqvist', 'mara@example.com', 'Admin, owner', 'Individual CEO'],
  ['Tomás Reyes', 'tomas@example.com', 'Operator', 'Company overhead'],
  ['Ines Kovač', 'ines@example.com', 'Member', 'Orbit Notes'],
  ['Jon Okafor', 'jon@example.com', 'Member', 'Tally Scan'],
  ['Lea Brandt', 'lea@example.com', 'Member', 'Individual contractor'],
].map(([name, email, role, home]) => ({ name, email, role, home }));

const action = (icon: string, word: string, r: Member) => (
  <Tooltip text={word} control>
    <Button variant="ghost" size="sm" icon={icon} iconOnly aria-label={`${word} ${r.name}`}>{word}</Button>
  </Tooltip>
);

const columns: Column<Member>[] = [
  { key: 'name', label: 'Name', render: (r) => <>{r.name}<span className="ui-table__sub">{r.email}</span></> },
  { key: 'role', label: 'Role' },
  { key: 'home', label: 'Pay home' },
  { key: 'act', label: <span className="ui-sr">Actions</span>, cell: 'act', render: (r) => <>{action('edit', 'Edit', r)}{action('trash', 'Remove', r)}</> },
];

type Density = 'default' | 'compact' | 'comfortable';
function Members({ density, selected }: { density: Density; selected?: Set<string> }) {
  const { bar, shown } = useTableFilters(MEMBERS, {
    search: 'Search members', placeholder: 'Name or email', label: 'Member filters', text: (r) => `${r.name} ${r.email}`,
    facets: [{ id: 'role', label: 'Role', any: 'Any role', of: (r) => r.role }],
  });
  return (
    <div style={{ maxWidth: 760 }}>
      <div className="ui-stack">
        <Card pad="sm">{bar}</Card>
        <Card>
          <DataTable columns={columns} rows={shown} density={density} stickyHeader pager={false} empty="No members match"
            {...(selected ? { selected, onToggle: () => {}, onTogglePage: () => {} } : { selectable: false as const })}
            scrollLabel="Members, scroll for more columns" />
        </Card>
      </div>
    </div>
  );
}

export const Default = { parameters: { layout: 'padded' }, render: () => <Members density="default" /> };
export const Compact = { parameters: { layout: 'padded' }, render: () => <Members density="compact" /> };
export const Comfortable = { parameters: { layout: 'padded' }, render: () => <Members density="comfortable" /> };
export const Selected = { parameters: { layout: 'padded' }, render: () => <Members density="default" selected={new Set(['Jon Okafor', 'Lea Brandt'])} /> };
