import type { Meta, StoryObj } from '@storybook/react';
import { Tasks } from './Tasks';
import { SEARCH_STATES } from './tasks-data';

// The page restores its state from the URL hash. Storybook keeps one frame and its hash between stories.
// A change to another story clears the hash that the story before it wrote. A reload keeps the hash.
let shownId = new URLSearchParams(window.location.search).get('id');
const fresh = (id: string) => {
  if (id !== shownId) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  shownId = id;
};

const meta = {
  title: 'Showcases/Tasks', id: 'showcases-tasks', component: Tasks, render: (args, { id }) => { fresh(id); return <Tasks {...args} />; },
  argTypes: { search: { control: 'select', options: Object.keys(SEARCH_STATES) } },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'A page of tasks assigned to people. Table and Board show the same tasks. One search with typed filters, such as state:open and @name, stays when the view changes. Board groups the tasks by Status, Assignee or Due date. A card moves by mouse drag, by a long press on touch, or by Move to in its menu. All data is sample data. New task and the links change nothing.' } },
  },
} satisfies Meta<typeof Tasks>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Table: Story = { args: { view: 'table' } };
export const Board: Story = { args: { view: 'board' } };
export const BoardByAssignee: Story = { args: { view: 'board', group: 'assignee' } };
export const BoardByDueDate: Story = { args: { view: 'board', group: 'due' } };
export const RowMenu: Story = { args: { view: 'table', menuOpen: true } };
export const CardMenu: Story = { args: { view: 'board', menuOpen: true } };
export const Reassign: Story = { args: { view: 'table', reassign: true } };
export const Empty: Story = { args: { view: 'table', load: 'empty' } };
export const NoMatch: Story = { args: { view: 'table', search: 'no-results' } };
export const TableLoading: Story = { args: { view: 'table', load: 'loading' } };
export const BoardLoading: Story = { args: { view: 'board', load: 'loading' } };
export const LoadError: Story = { args: { view: 'table', load: 'error' } };
export const SearchKeys: Story = { args: { view: 'table', search: 'key-menu' } };
export const SearchValues: Story = { args: { view: 'table', search: 'value-menu' } };
export const SearchAssignee: Story = { args: { view: 'table', search: 'assignee-menu' } };
export const SearchPeople: Story = { args: { view: 'board', search: 'people-menu' } };
export const SearchChips: Story = { args: { view: 'board', search: 'table-results' } };
export const SearchGrouped: Story = { args: { view: 'table', search: 'nested-query' } };
export const SearchInvalid: Story = { args: { view: 'table', search: 'invalid-query' } };
export const SearchPeopleError: Story = { args: { view: 'table', search: 'people-error' } };
export const SearchLongQuery: Story = { args: { view: 'board', search: 'long-query' } };
