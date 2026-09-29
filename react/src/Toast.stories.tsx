import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { Toast, useToast } from './Toast';
import { Button } from './primitives/Button';

const meta: Meta = { title: 'React/Toast', id: 'react-toast' };
export default meta;
const tones = ['success', 'danger', 'warn', 'info', 'neutral'] as const;

function Demo({ action = false, all = false }: { action?: boolean; all?: boolean }) {
  const push = useToast();
  const show = () => (all ? tones : ['success'] as const).forEach(tone => push({
    tone, title: action ? 'Draft removed' : 'Changes saved',
    text: action ? 'You can restore this draft.' : 'Your changes are ready.',
    ...(action ? { action: { label: 'Undo', onClick() {} } } : {}),
  }));
  return <Button onClick={show}>Show {all ? 'all tones' : 'toast'}</Button>;
}
function Preview() {
  const push = useToast();
  useEffect(() => {
    tones.forEach(tone => push({ tone, title: `${tone[0].toUpperCase()}${tone.slice(1)} notice`,
      text: 'The draft was updated.', action: { label: 'Undo', onClick() {} } }));
  }, [push]);
  return null;
}
export const Tones: StoryObj = { render: () => <Toast><Preview /></Toast> };
export const Entering: StoryObj = { render: () => <Toast><Demo all /></Toast> };
export const Running: StoryObj = { render: () => <Toast><Demo /></Toast> };
export const Leaving: StoryObj = { render: () => <Toast><Demo action /></Toast> };
export const ReducedMotion: StoryObj = {
  parameters: { docs: { description: { story: 'Enable reduced motion in your browser, then show or dismiss a toast.' } } },
  render: () => <Toast><Demo /></Toast>,
};

const statuses = [
  { tone: 'success', title: 'Deployment live', text: 'phoenix-web is serving traffic.' },
  { tone: 'info', title: 'Sync scheduled', text: 'Next run in about 5 minutes.' },
  { tone: 'warn', title: 'Token expires soon', text: 'Rotate it before Friday to avoid downtime.' },
  { tone: 'danger', title: 'Build failed', text: 'Step “test” exited with code 1.' },
  { tone: 'neutral', title: 'Draft saved', text: 'Autosaved just now.' },
] as const;
const actions = { success: 'Undo', info: 'Reload', warn: 'Rotate', danger: 'Retry', neutral: 'Open' };

function Presentations({ compact = false, dismissible = true, action = false }: {
  compact?: boolean; dismissible?: boolean; action?: boolean;
}) {
  const push = useToast();
  const show = () => statuses.forEach(notice => push({ ...notice, compact, dismissible,
    ...(action ? { action: { label: actions[notice.tone], onClick() {} } } : {}),
  }));
  return <Button onClick={show}>Show toasts</Button>;
}
export const PresentationsGallery: StoryObj = {
  args: { compact: false, dismissible: true, action: false },
  argTypes: {
    compact: { control: 'boolean' }, dismissible: { control: 'boolean' }, action: { control: 'boolean' },
  },
  parameters: { docs: { description: { story: 'The five notices from Components/Callout & Toast. Turn on the compact layout, hide the close button, or add an action, then show the notices.' } } },
  // Remounting the provider on an args change clears any notices still on screen.
  render: args => <Toast key={JSON.stringify(args)}><Presentations {...args} /></Toast>,
};
