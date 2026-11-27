import { useLayoutEffect, useRef, useState } from 'react';
import { AppShell } from '../AppShell';
import { DataTable, type Column } from '../DataTable';
import { SelectionBar, type SelectionBarAction } from '../SelectionBar';
import { Toast, useToast } from '../Toast';

// Selected rows: a table of documents, and the selection bar under it. Each pick changes the
// selected rows at once, the rows stay selected, and a notice says what changed. Ten rows,
// so the table needs no filter bar. All data is sample data. #902
type Doc = { name: string; status: string; owner: string; tags: string; folder: string };
const DOCS: Doc[] = [
  ['Field guide', 'Draft', 'Avery', 'Guide', 'Library'],
  ['Release notes', 'Ready', 'Blair', 'Release', 'Library'],
  ['Access checklist', 'Draft', 'Casey', 'Review', 'Projects'],
  ['Content plan', 'Draft', 'Avery', 'Review', 'Projects'],
  ['Test plan', 'Ready', 'Blair', 'Guide', 'Library'],
  ['Research notes', 'Draft', 'Casey', 'Review', 'Projects'],
  ['Support guide', 'Ready', 'Avery', 'Guide', 'Library'],
  ['Archive guide', 'Draft', 'Blair', 'Guide', 'Library'],
  ['Style sheet', 'Ready', 'Casey', 'Release', 'Projects'],
  ['Onboarding steps', 'Draft', 'Avery', 'Guide', 'Library'],
].map(([name, status, owner, tags, folder]) => ({ name, status, owner, tags, folder }));

const values = (...labels: string[]) => labels.map(label => ({ label }));
const ACTIONS: SelectionBarAction[] = [
  { id: 'status', label: 'Status', items: values('Draft', 'Ready', 'Archived') },
  { id: 'owner', label: 'Owner', items: values('Avery', 'Blair', 'Casey', 'Research and development team') },
  { id: 'tags', label: 'Tags', items: values('Guide', 'Release', 'Review') },
  { id: 'folder', label: 'Move', items: values('Library', 'Projects', 'Shared') },
  { id: 'archive', label: 'Archive' },
];

const columns: Column<Doc>[] = [
  { key: 'name', label: 'Document', cell: 'title' },
  { key: 'status', label: 'Status' },
  { key: 'owner', label: 'Owner' },
  { key: 'tags', label: 'Tags' },
  { key: 'folder', label: 'Folder' },
];

export type SelectedRowsProps = { initialSelected?: string[] };

// The notices stand 16px above the bar while it shows.
export function SelectedRows(props: SelectedRowsProps) {
  const [offset, setOffset] = useState<number>();
  return <Toast bottomOffset={offset}><Documents {...props} onOffset={setOffset} /></Toast>;
}

function Documents({ initialSelected = ['Field guide', 'Release notes'], onOffset }: SelectedRowsProps & { onOffset: (px?: number) => void }) {
  const toast = useToast();
  const [rows, setRows] = useState(DOCS);
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const page = useRef<HTMLDivElement>(null);
  const change = (key: keyof Doc, value: string) =>
    setRows(current => current.map(row => (selected.has(row.name) ? { ...row, [key]: value } : row)));
  // Clear sends the focus to Select all, which is where the reader made the selection.
  const clear = () => {
    setSelected(new Set());
    page.current?.querySelector<HTMLInputElement>('thead input[type="checkbox"]')?.focus();
  };
  const updated = `${selected.size} ${selected.size === 1 ? 'document' : 'documents'}`;
  const act = (id: string, value?: string) => {
    if (id === 'archive') {
      change('status', 'Archived');
      toast({ title: `Archived ${updated}.` });
    } else if (value !== undefined) {
      change(id as keyof Doc, value);
      toast({ title: `${ACTIONS.find(action => action.id === id)?.label}: ${value}`, text: `Updated ${updated}.` });
    }
  };
  // The bar's room is the bar with 16px over and under it: the inset the notices stand on.
  const showing = selected.size > 0;
  useLayoutEffect(() => {
    const room = page.current?.querySelector<HTMLElement>('.ui-selection-room');
    if (!showing || !room) { onOffset(undefined); return; }
    const measure = () => onOffset(room.getBoundingClientRect().height);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(room);
    return () => watch.disconnect();
  }, [showing]);
  const toggle = (name: string) => setSelected(current => {
    const next = new Set(current);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  const togglePage = (names: string[]) => setSelected(current =>
    (names.every(name => current.has(name)) ? new Set([...current].filter(name => !names.includes(name))) : new Set([...current, ...names])));

  return <AppShell word="Workspace" title="Documents" width="wide" pathname="#documents"
    sections={[{ href: '#documents', label: 'Documents', icon: 'doc' }, { href: '#settings', label: 'Settings', icon: 'gear' }]}
    account={{ name: 'Demo Editor', email: 'editor@example.com' }} onSignOut={() => {}}>
    <div ref={page}>
      <DataTable columns={columns} rows={rows} pager={false} caption="Documents" scrollLabel="Documents" stickyHeader pinnedIdentity
        selected={selected} onToggle={toggle} onTogglePage={togglePage} />
      <SelectionBar count={selected.size} actions={ACTIONS} noun="documents" onAction={act} onClear={clear} />
    </div>
  </AppShell>;
}
