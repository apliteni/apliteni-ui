import { useState } from 'react';
import { AppShell } from '../AppShell';
import { EmptyState } from '../EmptyState';
import { KeyValueList } from '../KeyValueList';
import { BusyRegion, Skeleton } from '../Loading';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { ThreeColumnPage, type ThreeColumnDepth, type ThreeColumnMenu } from '../ThreeColumnPage';

/* A library of folders and files, with fabricated data: the folders, the files of the
   selected folder, and the open file. */
type File = { name: string; day: string; owner: string; size: string; text: string[] };
type Folder = { name: string; files: File[] };
const f = (name: string, day: string, owner: string, size: string, ...text: string[]): File => ({ name, day, owner, size, text });
export const FOLDERS: Folder[] = [
  { name: 'Projects', files: [
    f('Brief', '22 Nov', 'Alex Example', '18 KB', 'The brief names the goal, the people and the dates.', 'Read it before you start a new task.'),
    f('Plan', '24 Nov', 'Sam Sample', '42 KB', 'The plan has three stages: draft, review and release.', 'Each stage has one owner and one date.'),
    f('Notes', '23 Nov', 'Alex Example', '6 KB', 'Short notes from the weekly meeting.', 'The next meeting is on Monday.'),
    f('Report', '17 Nov', 'Sam Sample', '120 KB', 'The report gives the result of each stage.', 'It has no open items.'),
    f('Budget', '14 Nov', 'Alex Example', '31 KB', 'The budget lists the planned cost of each stage.'),
    f('Risks', '11 Nov', 'Sam Sample', '9 KB', 'The risk list has one owner for each risk.'),
  ] },
  { name: 'Archive', files: [
    f('Old plan', '2 Dec', 'Alex Example', '38 KB', 'The first plan, before the review.', 'Keep it for reference only.'),
    f('Minutes', '28 Oct', 'Sam Sample', '5 KB', 'The minutes of the first meeting.'),
  ] },
  { name: 'Shared', files: [
    f('Guide', '21 Nov', 'Sam Sample', '64 KB', 'A guide for new team members.', 'It lists the tools and the first steps.'),
    f('Contacts', '24 Nov', 'Alex Example', '3 KB', 'A list of demo names: Alex Example and Sam Sample.'),
    f('Glossary', '26 Oct', 'Sam Sample', '11 KB', 'The words that the team uses, each with one meaning.'),
  ] },
  { name: 'Drafts', files: [f('Idea', '24 Nov', 'Alex Example', '2 KB', 'A first idea, not yet reviewed.')] },
  { name: 'Templates', files: [] },
];

type Row = { name: string; icon: string; end: string; endLabel?: string; selected: boolean; opens: boolean; onOpen: () => void };
/** A column's list: the kit's nav rows, each with a glyph, a name, an end value and, on a parent row, a chevron. */
const Rows = ({ label, rows }: { label: string; rows: Row[] }) => <nav className="ui-nav ui-columns__list" aria-label={label}>
  <ul className="ui-nav__list">{rows.map(row => <li key={row.name}><button type="button" aria-pressed={row.selected}
    className={`ui-nav__item${row.selected ? ' is-active' : ''}`} onClick={row.onOpen}>
    <span className="ui-nav__ic"><Icon name={row.icon} /></span>
    <span className="ui-nav__label">{row.name}</span>{' '}
    {row.endLabel ? <><span className="ui-columns__end" aria-hidden="true">{row.end}</span>{' '}<span className="ui-sr">{row.endLabel}</span></>
      : <span className="ui-columns__end">{row.end}</span>}
    {row.opens && <span className="ui-nav__ic ui-columns__into"><Icon name="chevronRight" /></span>}
  </button></li>)}</ul>
</nav>;

const Pending = ({ label, lines }: { label: string; lines: number }) => <div className="ui-columns__body">
  <BusyRegion busy label={label} placeholder={<Skeleton lines={lines} />}>{null}</BusyRegion></div>;

export type LibraryProps = {
  depth?: ThreeColumnDepth;
  folder?: string;
  /** The files column's title opens a menu with the count, sorting, the view and quick filters. */
  menu?: boolean;
  /** The files and the open file are on the way. */
  loading?: boolean;
};

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** A day such as "22 Nov" as a number that sorts: the month, then the day. */
const dayKey = (day: string) => { const [d, m] = day.split(' '); return MONTH.indexOf(m) * 100 + Number(d); };
const files = (n: number) => `${n} ${n === 1 ? 'file' : 'files'}`;
/** Each depth has its own address, so the back link goes to the parent's address. */
const libraryHref = (folder: string, file?: string) => (depth: ThreeColumnDepth) =>
  ['#/library', depth > 1 ? `/${folder}` : '', depth > 2 && file ? `/${file}` : ''].join('');

export function Library({ depth: startDepth = 3, folder: startFolder = 'Shared', menu = false, loading = false }: LibraryProps) {
  const [depth, setDepth] = useState(startDepth);
  const [folderName, setFolderName] = useState(startFolder);
  const folder = FOLDERS.find(item => item.name === folderName) ?? FOLDERS[0];
  const [fileName, setFileName] = useState(folder.files[1]?.name ?? folder.files[0]?.name);
  const [sort, setSort] = useState('date');
  const [show, setShow] = useState('all');
  // The rows on show: the quick filter keeps the files edited in November. Date is newest first.
  const shown = folder.files.filter(item => show === 'all' || item.day.endsWith('Nov'))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : dayKey(b.day) - dayKey(a.day));
  // The open file is a row on show. When the filter hides it, the first row on show opens.
  const file = shown.find(item => item.name === fileName) ?? shown[0];
  const filtered = shown.length < folder.files.length;
  // A new folder replaces the files and the open file.
  const openFolder = (item: Folder) => { setFolderName(item.name); setFileName(item.files[0]?.name); setDepth(2); };
  const titleMenu: ThreeColumnMenu = {
    onSelect: value => { if (value === 'name' || value === 'date') setSort(value); else if (value === 'all' || value === 'november') setShow(value); },
    // The menu holds every row, so it needs no scroll at the kit's 300px cap.
    scroll: 400,
    sections: [
      { items: [{ label: 'Export', value: 'export', icon: 'download' }] },
      { label: 'Sort by', items: [{ label: 'Name', value: 'name', selected: sort === 'name' }, { label: 'Date', value: 'date', selected: sort === 'date' }] },
      { label: 'Show', items: [{ label: 'All files', value: 'all', selected: show === 'all' }, { label: 'Edited in November', value: 'november', selected: show === 'november' }] },
    ],
  };
  return <AppShell word="Example" width="full" title="Library" pathname="/library"
    sections={[{ href: '/library', label: 'Library', icon: 'doc' }, { href: '/settings', label: 'Settings', icon: 'gear' }]}
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}>
    <ThreeColumnPage depth={depth} onDepthChange={setDepth} depthHref={libraryHref(folder.name, file?.name)} columns={[
      { title: 'Folders', count: FOLDERS.length, countLabel: `${FOLDERS.length} folders`, children: <Rows label="Folders"
        rows={FOLDERS.map(item => ({ name: item.name, icon: 'folder', end: String(item.files.length), endLabel: files(item.files.length),
          selected: item === folder, opens: true, onOpen: () => openFolder(item) }))} /> },
      // With a filter on, the count says how many of the folder's files show, so the filter shows with the menu closed.
      { title: folder.name, count: loading ? undefined : filtered ? `${shown.length} of ${folder.files.length}` : shown.length,
        countLabel: filtered ? `${shown.length} of ${files(folder.files.length)}` : files(shown.length),
        menu: menu ? titleMenu : undefined,
        children: loading ? <Pending label="Loading the files" lines={6} />
          : shown.length ? <Rows label={`Files in ${folder.name}`} rows={shown.map(item => ({ name: item.name, icon: 'doc', end: item.day,
            selected: item === file, opens: false, onOpen: () => { setFileName(item.name); setDepth(3); } }))} />
          : filtered ? <div className="ui-columns__body"><EmptyState variant="no-matches" level={3} title="No files edited in November"
            sub="Show all files to see the others." actions={<Button onClick={() => setShow('all')}>Show all files</Button>} /></div>
          : <div className="ui-columns__body"><EmptyState level={3} icon="folder" title={`No files in ${folder.name}`}
            sub="Upload a file, or open another folder." actions={<Button variant="secondary" icon="upload">Upload file</Button>} /></div> },
      // The loading column keeps a title, so its region has a name and its header row its height.
      loading ? { title: 'File', children: <Pending label="Loading the file" lines={4} /> }
        : file ? { title: file.name, children: <div className="ui-columns__body">
          <KeyValueList rows={[{ label: 'Folder', value: folder.name }, { label: 'Edited', value: `${file.day} 2026` },
            { label: 'Owner', value: file.owner }, { label: 'Size', value: file.size }]} />
          {file.text.map(line => <p key={line}>{line}</p>)}
        </div> } : undefined,
    ]} />
  </AppShell>;
}
