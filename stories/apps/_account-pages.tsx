// The shell around the two account pages (#845): the product's own sections with none
// lit, because Profile and Preferences open from the account menu, not from the sidebar.
// One page in the well, and no second column of names beside the rail.
import type { ReactNode } from 'react';
import type { StoryObj } from '@storybook/react';
import { DemoShell, type DemoNavItem } from './_demo-shell';
import { previewHref } from '../lib/story-link.js';

const NAV: DemoNavItem[] = [
  { id: 'overview', icon: 'chart', label: 'Overview' },
  { id: 'campaigns', icon: 'card', label: 'Campaigns' },
  { id: 'reports', icon: 'table', label: 'Reports' },
];
// Each page opens the other's story, and the preview's link wiring keeps the theme.
// Support has no page in the kit, so it stays inert.
export const PROFILE_STORY = 'apps-profile--default';
export const PREFERENCES_STORY = 'apps-preferences--default';
const ACCOUNT_ITEMS = [
  { label: 'Profile', icon: 'user', href: previewHref(PROFILE_STORY) },
  { label: 'Preferences', icon: 'gear', href: previewHref(PREFERENCES_STORY) },
  { label: 'Support', icon: 'chat', href: '#support' },
];

export const AccountPage = ({ title, children }: { title: string; children: ReactNode }) =>
  <DemoShell layout="rail" nav={NAV} active="" title={title} accountItems={ACCOUNT_ITEMS}>{children}</DemoShell>;

export const VIEWPORTS = { viewport: { options: {
  desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
  phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' },
} } };

// Each page at both widths in both themes. Default keeps the id the page had before.
const at = (viewport: 'desktop' | 'phone', theme?: 'light') =>
  ({ viewport: { value: viewport, isRotated: false }, ...(theme && { theme }) });
export const fourWays = (render: () => ReactNode): Record<'Default' | 'Light' | 'Phone' | 'PhoneLight', StoryObj> => ({
  Default: { globals: at('desktop'), render },
  Light: { globals: at('desktop', 'light'), render },
  Phone: { globals: at('phone'), render },
  PhoneLight: { globals: at('phone', 'light'), render },
});
