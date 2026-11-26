import type { Meta, StoryObj } from '@storybook/react';
import { SelectedRows } from './SelectedRows';

const meta = {
  title: 'Showcases/Selected rows', id: 'apps-selected-rows', component: SelectedRows,
  render: args => <SelectedRows {...args} />,
  parameters: {
    layout: 'fullscreen',
    viewport: { options: { phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' } } },
    docs: { description: { component: 'A table of documents with two selected rows, and the selection bar under it. Each pick changes the selected rows at once, and the rows stay selected. Delete asks first. All data is sample data.' } },
  },
} satisfies Meta<typeof SelectedRows>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Phone: Story = { globals: { viewport: { value: 'phone', isRotated: false } } };
