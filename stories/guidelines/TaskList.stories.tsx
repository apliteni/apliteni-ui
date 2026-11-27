// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage, noop } from '../_guideline';
import { Dropdown } from '../../react/src/Dropdown';
import { MovableCard } from '../../react/src/MovableCard';
import { QuerySearch } from '../../react/src/QuerySearch';
import { Segmented } from '../../react/src/Segmented';
import { SearchField } from '../../react/src/SearchField';
import { Button } from '../../react/src/primitives/Button';
import { Icon } from '../../react/src/primitives/Icon';
import { TASK_KEYS } from '../../react/src/showcases/tasks-data';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_task-list.js';

const content = await loadGuideline('task-list.md', new URL('../../guidelines/task-list.md', import.meta.url));

// Fabricated tasks, one column each.
const COLUMNS = [['To do', 'Match the October bank statement'], ['In progress', 'Review the payroll run'], ['Done', 'File the VAT return']];

/** The do has a menu on each card with the Move to rows. The don't has a card a drag alone moves. */
const Board = ({ wrapped = false }: { wrapped?: boolean }) =>
  <div className={`gl-stage ui-card-board gl-board${wrapped ? ' gl-board--wrapped' : ''}`} role="region" aria-label="Task board" tabIndex={0}>
    <div className="gl-board__track">
      {COLUMNS.map(([column, task]) => <section key={column} aria-label={`${column}, 1 task`}>
        <div className="gl-board__head"><h3 className="ui-card__title">{column}</h3><span>1</span></div>
        <div className="gl-board__stack">
          <MovableCard title={task} label={task} level={4} action={wrapped ? undefined : <Dropdown variant="menu" align="end" chevron={false}
            ariaLabel={`Actions for ${task}`} triggerClass="ui-btn ui-btn--sm ui-btn--icon ui-btn--ghost" triggerContent={<Icon name="moreHorizontal" />}
            sections={[{ items: [{ label: 'Open', value: 'open' }] }, { label: 'Move to', items: COLUMNS.filter(([c]) => c !== column).map(([c]) => ({ label: c, value: c })) }]}
            onSelect={noop} />} />
        </div>
      </section>)}
    </div>
  </div>;

const View = () => <Segmented label="View" size="sm" value="board" onChange={noop} options={[
  { label: 'Table', value: 'table', icon: 'table', iconOnly: true }, { label: 'Board', value: 'board', icon: 'grid', iconOnly: true }]} />;

/** The do ends the title row with New task, and one toolbar holds the search, Group by and View. */
const Head = () => <div className="gl-stage gl-head">
  <div className="gl-head__row"><h3>Tasks</h3><Button variant="primary" icon="plus">New task</Button></div>
  <div className="ui-toolbar">
    <QuerySearch keys={TASK_KEYS} value={{ chips: [], draft: '' }} onChange={noop} ariaLabel="Search tasks" size="sm" placeholder="Search tasks, state: or @name" />
    <Dropdown ariaLabel="Group by" variant="select" size="sm" value="Status" selectedValue="status" items={[{ label: 'Status', value: 'status' }, { label: 'Assignee', value: 'assignee' }]} onSelect={noop} />
    <View />
  </div>
</div>;
/** The don't gives New task its own row and the board a search of its own, apart from the view switch. */
const Scattered = () => <div className="gl-stage gl-head">
  <h3>Tasks</h3>
  <div className="ui-toolbar"><Button variant="primary" icon="plus">New task</Button></div>
  <div className="ui-toolbar"><View /></div>
  <div className="ui-toolbar"><SearchField ariaLabel="Search the board" size="sm" placeholder="Search the board" /></div>
</div>;

const specimens = [
  { id: 'task-board', do: () => <Board />, dont: () => <Board wrapped /> },
  { id: 'task-head', do: () => <Head />, dont: () => <Scattered /> },
];

const meta: Meta = { title: 'Guidelines/Task list', parameters: { layout: 'fullscreen' } };
export default meta;

export const TaskListPage: StoryObj = {
  name: 'Task list',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
