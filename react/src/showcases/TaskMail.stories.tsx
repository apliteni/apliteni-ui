import type { Meta, StoryObj } from '@storybook/react';
import { TaskMail } from './TaskMail';

const meta = {
  title: 'Showcases/Task mail', id: 'showcases-task-mail', component: TaskMail, render: (args) => <TaskMail {...args} />,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The two task mails, each in plain text and in simple HTML. The new task mail names the person who assigned the task and links to it. The daily digest lists the late tasks and the tasks due today, with a link to each. Both end with a line that says why the reader gets the mail and an Email settings link. All data is sample data.' } },
  },
} satisfies Meta<typeof TaskMail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NewTask: Story = { args: { mail: 'new' } };
export const Digest: Story = { args: { mail: 'digest' } };
