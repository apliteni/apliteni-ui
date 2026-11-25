import type { Meta, StoryObj } from '@storybook/react';
import { ThreeColumnPage } from './ThreeColumnPage';
import { Library } from './showcases/Library';
import { MonthClose } from './showcases/MonthClose';

const meta: Meta<typeof ThreeColumnPage> = {
  title: 'React/Three-column page', component: ThreeColumnPage, id: 'react-three-column-page',
  parameters: { layout: 'fullscreen' },
};
export default meta;

// A column browser with neutral data: the folders, the files of the selected folder, and the open file.
export const Folders: StoryObj = { render: () => <Library /> };
// The files column's title opens a menu with the count, sorting, export and quick filters.
export const TitleMenu: StoryObj = { render: () => <Library menu /> };
// A folder with no files: the files column takes the open file's space.
export const EmptyFolder: StoryObj = { render: () => <Library folder="Templates" depth={2} /> };
export const Loading: StoryObj = { render: () => <Library loading /> };
// The Month close showcase: the Wizard stands in column 2.
export const MonthChecks: StoryObj = { render: () => <MonthClose /> };
export const BlockedStep: StoryObj = { render: () => <MonthClose stage="blocked" /> };
// On a tablet or a phone, the depth sets the columns on show.
export const MonthsView: StoryObj = { render: () => <MonthClose depth={1} /> };
export const RowsView: StoryObj = { render: () => <MonthClose stage="rates" depth={3} /> };
