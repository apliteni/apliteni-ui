import type { Meta, StoryObj } from '@storybook/react';
import { ThreeColumnPage } from './ThreeColumnPage';
import { MonthClose } from './showcases/MonthClose';

const meta: Meta<typeof ThreeColumnPage> = {
  title: 'React/Three-column page', component: ThreeColumnPage, id: 'react-three-column-page',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const MonthChecks: StoryObj = { render: () => <MonthClose /> };
export const BlockedStep: StoryObj = { render: () => <MonthClose stage="blocked" /> };
// On a tablet or a phone, the links open each area.
export const MonthsView: StoryObj = { render: () => <MonthClose view="nav" /> };
export const RowsView: StoryObj = { render: () => <MonthClose stage="rates" view="work" /> };
