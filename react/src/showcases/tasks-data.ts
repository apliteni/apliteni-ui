// Fabricated demo data for the Tasks showcase and the task mails. No person, task or
// address here is real.
import type { QueryKey, QueryState } from '../query';

export type Status = 'todo' | 'doing' | 'done';
export type Person = { id: string; name: string };
// `name` is the row key that the kit table needs. It holds the task id.
export type Task = { name: string; title: string; assignee: string; status: Status; due: string; act?: never };

export const TODAY = '2026-11-26';
export const TASK_URL = 'https://finance.example.com/tasks/';
export const SETTINGS_URL = 'https://finance.example.com/settings/notifications';

export const STATUSES: { id: Status; label: string; badge: 'neutral' | 'info' | 'success' }[] = [
  { id: 'todo', label: 'To do', badge: 'neutral' },
  { id: 'doing', label: 'In progress', badge: 'info' },
  { id: 'done', label: 'Done', badge: 'success' },
];

export const PEOPLE: Person[] = [
  { id: 'p1', name: 'Ada Lovelace' },
  { id: 'p2', name: 'Mara Lindqvist' },
  { id: 'p3', name: 'Tomás Reyes' },
  { id: 'p4', name: 'Ines Kovač' },
  { id: 'p5', name: 'Jon Okafor' },
  { id: 'p6', name: 'Lea Brandt' },
];
/** The person who reads the page. */
export const ME = PEOPLE[0];

export const TASKS: Task[] = [
  { name: 'T-118', title: 'Match the October bank statement', assignee: 'p1', status: 'todo', due: '2026-11-23' },
  { name: 'T-121', title: 'Send the Q3 report to the board', assignee: 'p1', status: 'todo', due: '2026-11-26' },
  { name: 'T-124', title: 'Check the supplier contract renewal terms before the notice period ends in December', assignee: 'p3', status: 'todo', due: '2026-11-27' },
  { name: 'T-127', title: 'Add the new cost centre', assignee: 'p4', status: 'todo', due: '2026-12-02' },
  { name: 'T-112', title: 'Collect receipts for the travel claim', assignee: 'p1', status: 'doing', due: '2026-11-24' },
  { name: 'T-115', title: 'Review the payroll run', assignee: 'p2', status: 'doing', due: '2026-11-26' },
  { name: 'T-119', title: 'Update the vendor list', assignee: 'p6', status: 'doing', due: '2026-11-30' },
  { name: 'T-122', title: 'Close the November books', assignee: 'p1', status: 'doing', due: '2026-12-04' },
  { name: 'T-125', title: 'Prepare the audit folder', assignee: 'p3', status: 'doing', due: '2026-12-09' },
  { name: 'T-101', title: 'Approve the office lease invoice', assignee: 'p4', status: 'done', due: '2026-11-18' },
  { name: 'T-104', title: 'File the VAT return', assignee: 'p1', status: 'done', due: '2026-11-20' },
  { name: 'T-107', title: 'Set the 2027 budget draft', assignee: 'p6', status: 'done', due: '2026-11-21' },
];

export const person = (id: string) => PEOPLE.find((p) => p.id === id)!;
export const status = (id: Status) => STATUSES.find((s) => s.id === id)!;

const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** A date as the page prints it: 9 Dec. */
export const shortDate = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
/** What the Due cell says: a late count for an open late task, Today, or the date. */
export function due(task: Task): { text: string; late: boolean } {
  const days = Math.round((Date.parse(task.due) - Date.parse(TODAY)) / DAY);
  if (task.status !== 'done' && days < 0) return { text: `${-days} ${days === -1 ? 'day' : 'days'} late`, late: true };
  if (task.status !== 'done' && days === 0) return { text: 'Today', late: false };
  return { text: shortDate(task.due), late: false };
}

/** The keys of the task search. `state:open` is To do and In progress. */
export const TASK_KEYS: QueryKey[] = [
  { key: 'state', label: 'State', hint: 'Open, closed, or a task status', aliases: ['is'], values: [
    { value: 'open', label: 'Open', hint: 'To do and In progress' },
    { value: 'closed', label: 'Closed', hint: 'Done' },
    { value: 'todo', label: 'To do' },
    { value: 'doing', label: 'In progress' },
    { value: 'done', label: 'Done' },
  ] },
  { key: 'assignee', label: 'Assignee', hint: 'Me or a named person', kind: 'person',
    self: { value: 'me', label: 'Me', hint: ME.name }, values: PEOPLE.map((p) => ({ value: p.id, label: p.name })) },
];

/** Does a task meet one key and value of the search? */
export const taskField = (task: Task) => (key: string, value: string) => key === 'state'
  ? (value === 'open' ? task.status !== 'done' : value === 'closed' ? task.status === 'done' : task.status === value)
  : task.assignee === (value === 'me' ? ME.id : value);
export const taskText = (task: Task) => (words: string) => task.title.toLowerCase().includes(words.toLowerCase());

/** One search state of states.md: the chips, the field's text, an open panel and a request. */
export type SearchFixture = QueryState & { open?: boolean; active?: number; checked?: boolean; request?: 'loading' | 'error' | 'people-loading' | 'people-error' };
export const SEARCH_STATES = {
  idle: { chips: [], draft: '' },
  'key-menu': { chips: [], draft: 'sta', open: true },
  'value-menu': { chips: [], draft: 'state:', open: true },
  'assignee-menu': { chips: ['state:open'], draft: 'assignee:', open: true },
  'people-menu': { chips: [], draft: '@ma', open: true },
  'filter-chip': { chips: ['assignee:p2'], draft: '' },
  'table-results': { chips: ['state:open', 'assignee:me'], draft: '' },
  'board-results': { chips: ['state:open', 'assignee:me'], draft: '' },
  'nested-query': { chips: ['(state:todo OR state:doing) AND assignee:me'], draft: '' },
  'no-people': { chips: [], draft: '@zz', open: true },
  'no-results': { chips: ['assignee:p2'], draft: 'tax office' },
  'invalid-query': { chips: [], draft: '(state:open OR)', checked: true },
  loading: { chips: ['state:open'], draft: '', request: 'loading' },
  error: { chips: ['state:open'], draft: '', request: 'error' },
  'people-loading': { chips: [], draft: '@ma', open: true, request: 'people-loading' },
  'people-error': { chips: [], draft: '@ma', open: true, request: 'people-error' },
  'unknown-key': { chips: [], draft: 'priority:urgent', checked: true },
  'no-values': { chips: [], draft: 'state:zzz', open: true },
  'invalid-value': { chips: [], draft: 'state:zzz', checked: true },
  'free-text': { chips: [], draft: 'supplier' },
  'pasted-query': { chips: ['state:open', 'assignee:me', 'report'], draft: '' },
  'long-query': { chips: ['state:open', 'assignee:me'], draft: 'Check the supplier contract renewal terms before the notice period ends in December' },
  hover: { chips: [], draft: 'state:', open: true, active: 0 },
  'keyboard-focus': { chips: [], draft: 'state:', open: true, active: 0 },
  pressed: { chips: [], draft: 'state:', open: true, active: 0 },
  'chip-focus': { chips: ['assignee:p2'], draft: '' },
} satisfies Record<string, SearchFixture>;
export type SearchState = keyof typeof SEARCH_STATES;
