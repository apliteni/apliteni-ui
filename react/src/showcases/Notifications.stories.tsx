import type { Meta, StoryObj } from '@storybook/react';
import { Notifications } from './Notifications';
const meta = { title: 'Apps/Notifications', id: 'apps-notifications', component: Notifications, render: args => <Notifications {...args} />, parameters: { layout: 'fullscreen',
  viewport: { options: { phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' } } },
  docs: { description: { component: 'A notifications bell with its unread count opens a panel of the latest notifications. Its All notifications button opens the notifications page. A row opens its record\'s own page, with a back link to its section, and marks the notification read. Mark all read shows a toast with Undo. All data is sample data. Mark all read, Undo and Retry change only this tab. Sign out is inactive. Sections other than Campaigns show a placeholder.' } } } } satisfies Meta<typeof Notifications>;
export default meta;
type Story = StoryObj<typeof meta>;
const phone = { viewport: { value: 'phone', isRotated: false } };
export const SideNavPanel: Story = { args: { defaultOpen: true } };
export const SideNavZero: Story = { args: { initialLoad: 'read' } };
export const SideNavPanelEmpty: Story = { args: { defaultOpen: true, initialLoad: 'empty' } };
export const SideNavPanelError: Story = { args: { defaultOpen: true, initialLoad: 'error' } };
export const SideNavPage: Story = { args: { initialPage: 'notifications' } };
export const SideNavPageAllRead: Story = { args: { initialPage: 'notifications', markedAllRead: true } };
export const SideNavPageEmpty: Story = { args: { initialPage: 'notifications', initialLoad: 'empty' } };
export const SideNavPageLoading: Story = { args: { initialPage: 'notifications', initialLoad: 'loading' } };
export const SideNavPageError: Story = { args: { initialPage: 'notifications', initialLoad: 'error' } };
export const SideNavRecord: Story = { args: { initialPage: 'record' } };
export const TopBarPanel: Story = { args: { layout: 'top', defaultOpen: true } };
export const TopBarZero: Story = { args: { layout: 'top', initialLoad: 'read' } };
export const TopBarPage: Story = { args: { layout: 'top', initialPage: 'notifications' } };
export const PhonePanel: Story = { args: { layout: 'top', defaultOpen: true }, globals: phone };
export const PhonePanelError: Story = { args: { layout: 'top', defaultOpen: true, initialLoad: 'error' }, globals: phone };
export const PhonePage: Story = { args: { layout: 'top', initialPage: 'notifications' }, globals: phone };
export const PhoneSideNav: Story = { args: { initialPage: 'notifications' }, globals: phone };
export const PhoneRecord: Story = { args: { layout: 'top', initialPage: 'record' }, globals: phone };
