import { renderToStaticMarkup } from 'react-dom/server';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../../react/src/primitives/Badge';
import { Pill } from '../../react/src/primitives/Pill';
import { SidebarNav } from '../../react/src/SidebarNav';
import { TextField } from '../../react/src/Field';
import { Prose } from '../_page';
import { diagnosisPage } from './signal-contrast-page.js';

const meta: Meta = { title: 'Foundations/Signal contrast', parameters: { layout: 'fullscreen' } };
export default meta;

// The measurements and the page markup live in signal-contrast-page.js, unchanged
// from the vanilla page. The four live specimens are the React components.
const kit = () => ({
  dangerNav: renderToStaticMarkup(<SidebarNav active="keys" aria-label="Account settings" items={[
    { id: 'keys', label: 'API keys', icon: 'key' },
    { id: 'revoke', label: 'Revoke access', icon: 'alert', danger: true },
  ]} />),
  livePill: renderToStaticMarkup(<Pill variant="live">Live</Pill>),
  infoBadge: renderToStaticMarkup(<Badge variant="info">Preview</Badge>),
  workspaceField: renderToStaticMarkup(<TextField label="Workspace name" required error="A workspace with this name already exists." defaultValue="apliteni-core" />),
});

export const Diagnosis: StoryObj = {
  name: 'Signal contrast on the glow washes',
  render: () => <Prose as="div" html={diagnosisPage(kit())} />,
};
