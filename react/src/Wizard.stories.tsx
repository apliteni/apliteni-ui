import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Wizard } from './Wizard';
import { MonthCloseChecks, type MonthCloseStage } from './showcases/MonthClose';

const meta: Meta<typeof Wizard> = { title: 'React/Wizard', component: Wizard, id: 'react-wizard' };
export default meta;

// Each action moves the close one step on, so the story walks every state.
const Walk = ({ start }: { start: MonthCloseStage }) => {
  const [stage, setStage] = useState(start);
  return <MonthCloseChecks stage={stage} onStage={setStage} />;
};

export const FirstStep: StoryObj = { render: () => <Walk start="sources" /> };
export const Blocked: StoryObj = { render: () => <Walk start="blocked" /> };
export const ReadyToFinish: StoryObj = { render: () => <Walk start="ready" /> };
export const Finished: StoryObj = { render: () => <Walk start="closed" /> };
