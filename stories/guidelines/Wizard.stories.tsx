// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, noop } from '../_guideline';
import { Wizard, type WizardStep } from '../../react/src/Wizard';
import { Button } from '../../react/src/primitives/Button';
import { monthChecks, type MonthCloseStage } from '../../react/src/showcases/MonthClose';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';

const content = await loadGuideline('wizard.md', new URL('../../guidelines/wizard.md', import.meta.url));
const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;
const reason = 'Complete all four checks to close this month.';
const Checks = ({ stage, steps }: { stage?: MonthCloseStage; steps?: WizardStep[] }) => <Stage>
  <Wizard label="Month checks" steps={steps ?? monthChecks(stage ?? 'sources', noop)}
    final={{ label: 'Finish', action: 'Close month', onAction: noop, reason }} />
</Stage>;

/* The don'ts draw what the Wizard refuses to draw: rows with the wizard's own classes. */
const Rows = ({ rows, final = true }: { rows: { label: string; mark: string; word?: string; open?: ReactNode }[]; final?: boolean }) =>
  <Stage><ol className="ui-wizard" aria-label="Month checks">
    {rows.map((row, i) => <li key={row.label}>
      <button type="button" className={`ui-nav__item ui-wizard__step${row.open ? ' is-active' : ''}`}>
        <span aria-hidden="true" className={`ui-wizard__mark ui-wizard__mark--${row.mark}`} />
        <span className="ui-wizard__text"><span>{i + 1}. {row.label}</span>
          {row.word && <span className="ui-wizard__state">{row.word}</span>}</span>
      </button>
      {row.open && <div className="ui-wizard__panel">{row.open}</div>}
    </li>)}
    {final && <li><div className="ui-wizard__final"><p className="ui-wizard__reason">{reason}</p>
      <Button variant="outline" disabled>Close month</Button></div></li>}
  </ol></Stage>;
const LABELS = ['Sources', 'Unclassified rows', 'Documents', 'Exchange rates'];

const specimens = [
  { id: 'step-states', do: () => <Checks stage="blocked" />,
    dont: () => <Rows rows={LABELS.map((label, i) => ({ label, mark: ['done', 'done', 'current', 'todo'][i] }))} /> },
  { id: 'one-open', do: () => <Checks stage="rows" />,
    dont: () => <Rows rows={LABELS.map((label, i) => ({ label, mark: i ? 'todo' : 'current', word: i ? 'To do' : 'Current',
      open: <p>{i ? 'Finish the earlier checks first.' : 'Bank and card statements are ready.'}</p> }))} /> },
  { id: 'final-action', do: () => <Checks stage="rates" />,
    dont: () => <Rows final={false} rows={LABELS.map((label, i) => ({ label, mark: i < 3 ? 'done' : 'current', word: i < 3 ? 'Done' : 'Current' }))} /> },
  { id: 'blocked-reason', do: () => <Checks stage="blocked" />,
    dont: () => <Checks steps={monthChecks('blocked', noop).map(step => step.state === 'blocked' ? { ...step, content: undefined } : step)} /> },
];

const meta: Meta = { title: 'Guidelines/Wizard', parameters: { layout: 'fullscreen' } };
export default meta;

export const WizardPage: StoryObj = {
  name: 'Wizard',
  render: () => <GuidelinePage content={content} specimens={specimens} />,
};
