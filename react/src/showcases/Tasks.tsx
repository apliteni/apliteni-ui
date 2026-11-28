// The Tasks showcase (#866): one list of tasks in a Table view and a Board view, with one
// shared query search, grouping on the Board, the row and card menu, and the empty,
// no-match, loading and error states. Kit parts only. All data is fabricated.
import { Fragment, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { flushSync } from 'react-dom';
// One import of the kit, as an app imports the package.
import {
  AppShell, Avatar, Badge, BusyRegion, Button, Callout, Card, CardSlot, DataTable, Dropdown, EmptyState, Field, Icon,
  KeyValueList, Modal, MovableCard, QuerySearch, Segmented, Skeleton, SkeletonTable, Toast, matchQuery, readQuery, useToast,
  type Column, type DropdownEntry, type QueryState, type TableSort,
} from '../index';
import {
  PEOPLE, SEARCH_STATES, STATUSES, TASKS, TASK_KEYS, TASK_URL, due, person, shortDate, status, taskField, taskText,
  type SearchState, type Status, type Task,
} from './tasks-data';
import './Tasks.css';

export type TaskView = 'table' | 'board';
export type TaskGroup = 'status' | 'assignee' | 'due';
export type TaskLoad = 'ready' | 'empty' | 'loading' | 'error';
export type TasksProps = {
  view?: TaskView;
  group?: TaskGroup;
  /** The list's request: `empty` is a list with no task at all. */
  load?: TaskLoad;
  /** One search state of the task search, such as `key-menu`. */
  search?: SearchState;
  /** Opens the first row's or card's menu. */
  menuOpen?: boolean;
  /** Opens the Reassign dialog for the first task. */
  reassign?: boolean;
};

const NAV = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/tasks', label: 'Tasks', icon: 'circleCheck' },
  { href: '/invoices', label: 'Invoices', icon: 'doc' },
  { href: '/reports', label: 'Reports', icon: 'chart' },
  { href: '/people', label: 'People', icon: 'user' },
];
const GROUPS: { value: TaskGroup; label: string }[] = [
  { value: 'status', label: 'Status' }, { value: 'assignee', label: 'Assignee' }, { value: 'due', label: 'Due date' },
];

const Who = ({ id }: { id: string }) => <span className="tasks-who"><Avatar personKey={id} name={person(id).name} size={24} />{person(id).name}</span>;
const Due = ({ task }: { task: Task }) => { const d = due(task); return <span className={d.late ? 'ui-status--warn' : undefined}>{d.text}</span>; };
const byDue = (a: Task, b: Task) => a.due.localeCompare(b.due) || a.name.localeCompare(b.name);

/** The row menu: Open, Reassign and Copy link. A card adds Due date and the Move to rows. */
function TaskMenu({ task, card, open, onPick }: { task: Task; card: boolean; open?: boolean; onPick: (what: string, task: Task) => void }) {
  const actions: DropdownEntry[] = [
    { label: 'Open', value: 'open' },
    { label: 'Reassign', value: 'reassign' },
    { label: 'Copy link', value: 'copy' },
    ...(card ? [{ label: 'Due date', value: 'due' }] : []),
  ];
  const moves = STATUSES.filter((s) => s.id !== task.status).map((s) => ({ label: s.label, value: `move:${s.id}` }));
  return <Dropdown variant="menu" align="end" chevron={false} defaultOpen={open}
    ariaLabel={`Actions for ${task.title}`} title="Actions"
    triggerClass={`ui-btn ui-btn--sm ui-btn--icon${card ? ' ui-btn--ghost' : ''}`} triggerContent={<Icon name="moreHorizontal" />}
    {...(card ? { sections: [{ items: actions }, { label: 'Move to', items: moves }] } : { items: actions })}
    onSelect={(value) => onPick(String(value), task)} />;
}

function TaskTable({ rows, menu, onOpen }: { rows: Task[]; menu: (task: Task) => ReactNode; onOpen: (task: Task) => void }) {
  // The table opens with the task that is due first at the top.
  const [sort, setSort] = useState<TableSort<Task>>({ key: 'due', dir: 1 });
  const columns: Column<Task>[] = [
    { key: 'title', label: 'Task', sortable: true, rowHeader: true, cell: 'title', linked: true,
      render: (t) => <a href={`#${t.name}`} onClick={(e) => { e.preventDefault(); onOpen(t); }}>{t.title}</a> },
    { key: 'assignee', label: 'Assignee', render: (t) => <Who id={t.assignee} /> },
    { key: 'status', label: 'Status', render: (t) => <Badge variant={status(t.status).badge}>{status(t.status).label}</Badge> },
    { key: 'due', label: 'Due', sortable: true, render: (t) => <Due task={t} /> },
    { key: 'act', label: <span className="ui-sr">Actions</span>, cell: 'act', render: (t) => menu(t) },
  ];
  return <Card><DataTable columns={columns} rows={rows} sort={sort} onSortChange={setSort} selectable={false} stickyHeader
    pinnedIdentity caption="Tasks" scrollLabel="Tasks, scroll for more columns" /></Card>;
}

type Drag = { id: string; x: number; y: number; over: string | null; touch: boolean };
type Board = { rows: Task[]; group: TaskGroup; onMove: (task: Task, to: string, group: TaskGroup) => void };

// The lifted copy of a card and the drag state. A drag reads the latest rows from `current`.
function useBoardDrag(frame: RefObject<HTMLDivElement | null>, current: RefObject<Board>) {
  const active = useRef<Drag | null>(null);
  const preview = useRef<HTMLElement | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const suppress = useRef(false);
  const [held, setHeld] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [cardHeight, setCardHeight] = useState(0);

  const place = (x: number, y: number) => {
    if (!preview.current) return;
    preview.current.style.left = `${x - offset.current.x}px`;
    preview.current.style.top = `${y - offset.current.y}px`;
  };
  const locate = (x: number, y: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || x < box.left || x > box.right || y < box.top || y > box.bottom) return null;
    return document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-group]')?.dataset.group ?? null;
  };
  // The copy is the card itself, so it keeps the text, the size, the fill, the edge,
  // the corner and the shadow. It is hidden from assistive technology.
  const begin = (card: HTMLElement, x: number, y: number, touch: boolean) => {
    const rect = card.getBoundingClientRect();
    const copy = card.cloneNode(true) as HTMLElement;
    for (const name of ['data-task', 'tabindex', 'draggable', 'role', 'aria-label']) copy.removeAttribute(name);
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    copy.classList.add('ui-card--lifted');
    copy.style.width = `${rect.width}px`;
    copy.style.height = `${rect.height}px`;
    offset.current = { x: x - rect.left, y: y - rect.top };
    frame.current!.append(copy);
    preview.current = copy;
    place(x, y);
    active.current = { id: card.dataset.task!, x, y, over: locate(x, y), touch };
    setCardHeight(rect.height);
    setHeld(card.dataset.task!);
    suppress.current = true;
  };
  const finish = (commit: boolean) => {
    const drag = active.current;
    if (commit && drag?.over) {
      const { rows: all, group: by, onMove: move } = current.current;
      const task = all.find((t) => t.name === drag.id);
      if (task && task[by] !== drag.over) move(task, drag.over, by);
    }
    active.current = null;
    preview.current?.remove();
    preview.current = null;
    setHeld(null);
    setOver(null);
  };
  return { active, preview, suppress, held, over, setOver, cardHeight, place, locate, begin, finish };
}

// A long press and drag on touch, the scroll near the region's sides, and Escape.
function useTouchDrag(frame: RefObject<HTMLDivElement | null>, drag: ReturnType<typeof useBoardDrag>) {
  const { active, preview, setOver, place, locate, begin, finish } = drag;
  useEffect(() => {
    const box = frame.current!;
    const css = getComputedStyle(box);
    // A drag starts after a long press of --dur-slow, and a move of --space-2 first is a swipe.
    const threshold = parseFloat(css.getPropertyValue('--space-2')) || 8;
    const slow = css.getPropertyValue('--dur-slow').trim();
    const delay = (parseFloat(slow) || 400) * (slow.endsWith('ms') || !slow ? 1 : 1000);
    const edge = parseFloat(css.getPropertyValue('--space-12')) || 48;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start: { x: number; y: number } | null = null;
    let frameId = 0;
    const stopTimer = () => { clearTimeout(timer); start = null; };
    // Near the region's side the track scrolls, so a card reaches a column out of view.
    const tick = () => {
      const drag = active.current;
      if (drag) {
        const r = box.getBoundingClientRect();
        if (drag.x > r.right - edge) box.scrollLeft += threshold;
        else if (drag.x < r.left + edge) box.scrollLeft -= threshold;
        drag.over = locate(drag.x, drag.y);
        setOver(drag.over);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    const down = (e: TouchEvent) => {
      if (e.touches.length !== 1 || (e.target as Element).closest('button')) return;
      const card = (e.target as Element).closest<HTMLElement>('[data-task]');
      if (!card) return;
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      timer = setTimeout(() => { if (start) begin(card, start.x, start.y, true); }, delay);
    };
    const move = (e: TouchEvent) => {
      if (e.touches.length !== 1) { stopTimer(); finish(false); return; }
      const t = e.touches[0];
      if (active.current?.touch) {
        e.preventDefault();
        active.current.x = t.clientX;
        active.current.y = t.clientY;
        place(t.clientX, t.clientY);
      } else if (start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > threshold) stopTimer();
    };
    const up = (e: TouchEvent) => { stopTimer(); if (active.current?.touch) { e.preventDefault(); finish(true); } };
    const cancel = () => { stopTimer(); finish(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && active.current) cancel(); };
    const context = (e: Event) => { if (start || active.current) e.preventDefault(); };
    box.addEventListener('touchstart', down, { passive: true });
    box.addEventListener('touchmove', move, { passive: false });
    box.addEventListener('touchend', up, { passive: false });
    box.addEventListener('touchcancel', cancel);
    box.addEventListener('contextmenu', context);
    document.addEventListener('keydown', key);
    return () => {
      preview.current?.remove();
      stopTimer();
      cancelAnimationFrame(frameId);
      box.removeEventListener('touchstart', down);
      box.removeEventListener('touchmove', move);
      box.removeEventListener('touchend', up);
      box.removeEventListener('touchcancel', cancel);
      box.removeEventListener('contextmenu', context);
      document.removeEventListener('keydown', key);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

type BoardGroup = { id: string; label: string };

function BoardColumn({ g, rows, group, target, moving, drag, menu, onOpen }: {
  g: BoardGroup; rows: Task[]; group: TaskGroup; target?: BoardGroup; moving?: Task;
  drag: ReturnType<typeof useBoardDrag>; menu: (task: Task) => ReactNode; onOpen: (task: Task) => void;
}) {
  const { held, cardHeight, begin, finish } = drag;
  const tasks = rows.filter((t) => t[group] === g.id).sort(byDue);
  const landing = target?.id === g.id && moving;
  const candidate = landing ? { ...moving, due: group === 'due' ? g.id : moving.due } : null;
  const before = candidate ? tasks.find((t) => byDue(candidate, t) <= 0)?.name : undefined;
  const slot = <CardSlot height={cardHeight} />;
  return <section className="tasks-column" data-group={g.id} aria-label={`${g.label}, ${tasks.length} tasks`}>
    <div className="ui-card__head tasks-column__head"><h2 className="ui-card__title">{g.label}</h2><span>{tasks.length}</span></div>
    <div className="tasks-column__stack">
      {tasks.map((t) => <Fragment key={t.name}>
        {landing && before === t.name && slot}
        <MovableCard data-task={t.name} label={t.title} held={held === t.name}
          title={<a draggable={false} className="ui-link--quiet" href={`#${t.name}`} onClick={(e) => { e.preventDefault(); onOpen(t); }}>{t.title}</a>}
          action={menu(t)}
          onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') onOpen(t); }}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', t.name);
            e.dataTransfer.effectAllowed = 'move';
            // The browser's own drag picture is replaced by the card itself.
            const blank = document.createElement('canvas');
            blank.width = 1; blank.height = 1;
            e.dataTransfer.setDragImage(blank, 0, 0);
            const card = e.currentTarget;
            flushSync(() => begin(card, e.clientX, e.clientY, false));
          }}
          onDragEnd={() => finish(false)}>
          <div className="tasks-facts"><Who id={t.assignee} /><Due task={t} /></div>
          {group !== 'status' && <Badge variant={status(t.status).badge}>{status(t.status).label}</Badge>}
        </MovableCard>
      </Fragment>)}
      {landing && !before && slot}
      {!tasks.length && !landing && <p>No tasks</p>}
    </div>
  </section>;
}

/**
 * The board: one column for each group, side by side in one sideways scroll region. A card
 * moves by mouse drag, by a long press and drag on touch, and by its menu with the keyboard.
 * The exact card follows the pointer, its own place shows the source slot, and the target
 * slot marks where it lands in due date order. A live region says the target.
 */
function TaskBoard({ rows, group, menu, onMove, onOpen }: Board & { menu: (task: Task) => ReactNode; onOpen: (task: Task) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const current = useRef({ rows, group, onMove });
  current.current = { rows, group, onMove };
  const drag = useBoardDrag(frame, current);
  useTouchDrag(frame, drag);
  const { active, suppress, held, over, place, locate, finish } = drag;
  const groups = group === 'status' ? STATUSES.map((s) => ({ id: s.id as string, label: s.label }))
    : group === 'assignee' ? PEOPLE.map((p) => ({ id: p.id, label: p.name }))
      : [...new Set(rows.map((t) => t.due))].sort().map((date) => ({ id: date, label: shortDate(date) }));

  const moving = rows.find((t) => t.name === held);
  const target = moving && over && moving[group] !== over ? groups.find((g) => g.id === over) : undefined;
  return <>
    <div ref={frame} className="ui-card-board" role="region" aria-label="Task board, scroll for more groups" tabIndex={0}
      onPointerDownCapture={() => { suppress.current = false; }}
      onClickCapture={(e) => { if (suppress.current) { e.preventDefault(); e.stopPropagation(); suppress.current = false; } }}
      // The region takes the mouse drag, gaps included, so the side of the region scrolls the
      // track wherever the pointer is. The frame loop finds the column under the pointer.
      onDragEnter={(e) => { if (active.current) e.preventDefault(); }}
      onDragOver={(e) => {
        if (!active.current) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        Object.assign(active.current, { x: e.clientX, y: e.clientY });
        place(e.clientX, e.clientY);
      }}
      onDrop={(e) => { e.preventDefault(); if (active.current) active.current.over = locate(e.clientX, e.clientY); finish(true); }}>
      <div className="tasks-board__track">
        {groups.map((g) => <BoardColumn key={g.id} g={g} rows={rows} group={group} target={target} moving={moving} drag={drag} menu={menu} onOpen={onOpen} />)}
      </div>
    </div>
    <span className="ui-sr" role="status">{moving && target ? `${moving.title} will move to ${target.label}, in due date order.` : ''}</span>
  </>;
}

const BoardSkeleton = () => <div className="ui-card-board" role="region" aria-label="Task board loading" tabIndex={0}>
  <div className="tasks-board__track">{STATUSES.map((s) => <section className="tasks-column" key={s.id} aria-label={s.label}>
    <div className="ui-card__head tasks-column__head"><h2 className="ui-card__title">{s.label}</h2></div>
    <div className="tasks-column__stack">{[0, 1, 2].map((i) => <div className="ui-card ui-card--movable" key={i}><Skeleton lines={['72%', '44%']} /></div>)}</div>
  </section>)}</div>
</div>;

function Reassign({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (task: Task, to: string) => void }) {
  const [to, setTo] = useState(task.assignee);
  return <Modal open size="sm" title="Reassign task" onClose={onClose}
    footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={to === task.assignee} onClick={() => onSave(task, to)}>Reassign</Button></>}>
    <p>{task.title}</p>
    <Field label="Assignee">{(control) => <Dropdown {...control} variant="select" search={{ placeholder: 'Search people', noun: 'people' }}
      selectedValue={to} value={person(to).name}
      items={PEOPLE.map((p) => ({ label: p.name, value: p.id, avatar: { key: p.id, name: p.name } }))}
      onSelect={(value) => setTo(String(value))} />}</Field>
  </Modal>;
}

/** The page's place in the URL hash: the view, the grouping, each chip and the draft. A reload restores them. */
const readHash = () => {
  const p = new URLSearchParams(window.location.hash.slice(1));
  return { view: p.get('view') as TaskView | null, group: p.get('group') as TaskGroup | null, chips: p.getAll('q'), draft: p.get('draft') ?? '' };
};
const writeHash = (view: TaskView, group: TaskGroup, { chips, draft }: QueryState) => {
  const p = new URLSearchParams([['view', view], ['group', group], ...chips.map((c) => ['q', c]), ...(draft ? [['draft', draft]] : [])]);
  window.history.replaceState(window.history.state, '', `#${p}`);
};

type Fixture = { open?: boolean; active?: number; checked?: boolean; request?: string } & QueryState;

// A story names its state. With none named, the URL hash gives the page its place.
function startState({ view = 'table', group = 'status', load = 'ready', search = 'idle' }: TasksProps) {
  const fixture: Fixture = SEARCH_STATES[search];
  const url = search === 'idle' ? readHash() : null;
  return {
    view: url?.view === 'board' || url?.view === 'table' ? url.view : view,
    group: url?.group && GROUPS.some((g) => g.value === url.group) ? url.group : group,
    query: url && (url.chips.length || url.draft) ? { chips: url.chips, draft: url.draft } : { chips: fixture.chips, draft: fixture.draft },
    request: load === 'loading' || load === 'error' ? load : fixture.request ?? 'ready',
  };
}

function TaskToolbar({ toolbarRef, fixture, query, onQuery, request, onRetry, view, setView, group, setGroup }: {
  toolbarRef: RefObject<HTMLDivElement | null>; fixture: Fixture; query: QueryState; onQuery: (next: QueryState) => void;
  request: string; onRetry: () => void; view: TaskView; setView: (view: TaskView) => void; group: TaskGroup; setGroup: (group: TaskGroup) => void;
}) {
  return <div className="ui-toolbar" ref={toolbarRef}>
    <QuerySearch keys={TASK_KEYS} value={query} onChange={onQuery}
      ariaLabel="Search tasks" size="sm" placeholder="Search tasks, state: or @name" chipsLabel="Active task filters"
      peopleStatus={request === 'people-loading' ? 'loading' : request === 'people-error' ? 'error' : undefined}
      onRetryPeople={onRetry}
      defaultOpen={fixture.open} defaultActive={fixture.active} defaultChecked={fixture.checked} />
    {view === 'board' && <Dropdown ariaLabel="Group by" variant="select" size="sm" value={GROUPS.find((g) => g.value === group)!.label} selectedValue={group}
      items={GROUPS} onSelect={(value) => setGroup(value as TaskGroup)} />}
    <Segmented label="View" size="sm" value={view} onChange={(next) => setView(next as TaskView)} options={[
      { label: 'Table', value: 'table', icon: 'table', iconOnly: true },
      { label: 'Board', value: 'board', icon: 'grid', iconOnly: true },
    ]} />
  </div>;
}

function TaskList({ request, onRetry, shown, view, group, menu, move, onOpen, clear }: {
  request: string; onRetry: () => void; shown: Task[]; view: TaskView; group: TaskGroup; menu: (task: Task) => ReactNode;
  move: (task: Task, to: string, by: TaskGroup) => void; onOpen: (task: Task) => void; clear: () => void;
}) {
  if (request === 'error') return <Callout variant="danger" actions={<Button size="sm" onClick={onRetry}>Retry</Button>}>The tasks did not load.</Callout>;
  return <BusyRegion busy={request === 'loading'} label="Loading tasks…" message={`${shown.length} tasks`}
    placeholder={view === 'table' ? <Card><SkeletonTable rows={6} cols={4} /></Card> : <BoardSkeleton />}>
    {shown.length === 0
      ? <EmptyState className="ui-empty--edge" variant="no-matches" level={2} icon="" title="No matching tasks" sub="Change the search or clear the filters."
        actions={<Button onClick={clear}>Clear</Button>} />
      : view === 'table'
        ? <TaskTable rows={shown} menu={menu} onOpen={onOpen} />
        : <TaskBoard key={group} rows={shown} group={group} menu={menu} onMove={move} onOpen={onOpen} />}
  </BusyRegion>;
}

function OpenTask({ task, onClose }: { task: Task; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return <Modal open size="sm" initialFocusRef={closeRef} title={task.title} onClose={onClose}
    footer={<Button ref={closeRef} onClick={onClose}>Close</Button>}>
    <KeyValueList rows={[
      { label: 'Assignee', value: <Who id={task.assignee} /> },
      { label: 'Status', value: status(task.status).label },
      { label: 'Due', value: shortDate(task.due) },
    ]} />
  </Modal>;
}

function DueDate({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (task: Task, date: string) => void }) {
  const [newDate, setNewDate] = useState(task.due);
  return <Modal open size="sm" title="Due date" onClose={onClose}
    footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant="primary" disabled={!newDate || newDate === task.due} onClick={() => { onSave(task, newDate); onClose(); }}>Save</Button></>}>
    <Field label="Due date">{(control) => <input {...control} className="ui-input" type="date" value={newDate} onChange={(e) => setNewDate(e.currentTarget.value)} />}</Field>
  </Modal>;
}

function TasksBody(props: TasksProps) {
  const { load = 'ready', search = 'idle', menuOpen = false, reassign: reassignOpen = false } = props;
  const push = useToast();
  const fixture: Fixture = SEARCH_STATES[search];
  const [start] = useState(() => startState(props));
  const [view, setView] = useState<TaskView>(start.view);
  const [group, setGroup] = useState<TaskGroup>(start.group);
  const [tasks, setTasks] = useState<Task[]>(load === 'empty' ? [] : TASKS);
  const [query, setQuery] = useState<QueryState>(start.query);
  useEffect(() => writeHash(view, group, query), [view, group, query]);
  const [request, setRequest] = useState<string>(start.request);
  const [opened, setOpened] = useState<Task | null>(null);
  const [reassign, setReassign] = useState<Task | null>(reassignOpen ? TASKS[0] : null);
  const [dateTask, setDateTask] = useState<Task | null>(null);
  // A move from a card's menu unmounts the card in its old column. Its new menu button takes the focus.
  // When the search hides the moved card, the board region takes the focus. With no card left,
  // Clear of the empty state takes it. Neither opens a panel, and the toast says where the card went.
  const [refocus, setRefocus] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!refocus) return;
    const page = toolbarRef.current?.parentElement;
    (page?.querySelector<HTMLElement>(`[data-task="${refocus}"] .ui-card__action .ui-dropdown__trigger`)
      ?? page?.querySelector<HTMLElement>('.ui-card-board')
      ?? page?.querySelector<HTMLElement>('.ui-empty button'))?.focus();
    setRefocus(null);
  }, [refocus]);

  const { nodes } = readQuery(query, TASK_KEYS);
  const shown = tasks.filter((t) => matchQuery(nodes, taskField(t), taskText(t)));
  const first = [...shown].sort(byDue)[0]?.name;

  const change = (task: Task, by: TaskGroup, to: string, title: string) => {
    const field = by === 'status' ? 'status' : by;
    const from = task[field];
    setTasks((all) => all.map((t) => t.name === task.name ? { ...t, [field]: to } : t));
    push({ tone: 'success', title, action: { label: 'Undo', onClick: () => setTasks((all) => all.map((t) => t.name === task.name ? { ...t, [field]: from } : t)) } });
  };
  const move = (task: Task, to: string, by: TaskGroup) => change(task, by, to,
    by === 'status' ? `Moved to ${status(to as Status).label}` : by === 'assignee' ? `Reassigned to ${person(to).name}` : `Due date changed to ${shortDate(to)}`);
  const pick = async (what: string, task: Task) => {
    if (what === 'open') setOpened(task);
    if (what === 'reassign') setReassign(task);
    if (what === 'due') setDateTask(task);
    if (what.startsWith('move:')) { move(task, what.slice(5), 'status'); setRefocus(task.name); }
    if (what === 'copy') {
      try {
        await navigator.clipboard.writeText(`${TASK_URL}${task.name}`);
        push({ tone: 'success', title: 'Link copied' });
      } catch {
        push({ tone: 'danger', title: 'The link could not be copied', timer: false });
      }
    }
  };
  // The table's first row is the task due first; a board's first card is the first in To do.
  const menu = (task: Task) => <TaskMenu task={task} card={view === 'board'} onPick={pick} open={menuOpen && task.name === first} />;
  const clear = () => { setQuery({ chips: [], draft: '' }); setRequest('ready'); };
  const onQuery = (next: QueryState) => { setQuery(next); if (request === 'people-loading' || request === 'people-error') return; setRequest('ready'); };

  if (load === 'empty') return <EmptyState art="inbox" level={2} title="No tasks yet" sub="A task that you create or that is assigned to you shows here."
    actions={<Button variant="primary" icon="plus">New task</Button>} />;

  return <>
    <TaskToolbar toolbarRef={toolbarRef} fixture={fixture} query={query} onQuery={onQuery} request={request} onRetry={() => setRequest('ready')}
      view={view} setView={setView} group={group} setGroup={setGroup} />
    <TaskList request={request} onRetry={() => setRequest('ready')} shown={shown} view={view} group={group} menu={menu} move={move} onOpen={setOpened} clear={clear} />
    {opened && <OpenTask task={opened} onClose={() => setOpened(null)} />}
    {dateTask && <DueDate task={dateTask} onClose={() => setDateTask(null)} onSave={(task, date) => move(task, date, 'due')} />}
    {reassign && <Reassign task={reassign} onClose={() => setReassign(null)}
      onSave={(task, to) => { setReassign(null); move(task, to, 'assignee'); }} />}
  </>;
}

/** The Tasks page: the compact head with New task, then the toolbar and the tasks. */
export function Tasks(props: TasksProps) {
  return <Toast>
    <AppShell layout="topbar" width="wide" title="Tasks" pathname="/tasks" sections={NAV} head="compact"
      actions={props.load === 'empty' ? undefined : <Button variant="primary" icon="plus">New task</Button>}
      account={{ name: 'Ada Lovelace', email: 'ada@example.com' }} onSignOut={() => {}}
      renderLink={(_, linkProps) => <a {...linkProps} href="#" />}>
      <TasksBody {...props} />
    </AppShell>
  </Toast>;
}
