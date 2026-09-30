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

// The pile: several notices rest as one, newest in front, and fan out under the
// pointer or once focus reaches a control inside them. The count above the pile
// is what collapsing hides — how much is still waiting behind the front card.
function Pile() {
  const push = useToast();
  // Each notice carries its action, so the pile stays put while it is read
  // rather than expiring under the reader five seconds in.
  const add = (notice: typeof statuses[number]) =>
    push({ ...notice, action: { label: actions[notice.tone], onClick() {} } });
  const show = () => statuses.forEach(add);
  useEffect(() => { statuses.slice(0, 3).forEach(add); }, [push]);
  return <Button onClick={show}>Add five more</Button>;
}
export const CollapsedStack: StoryObj = {
  parameters: { docs: { description: { story: 'Hover the pile, or press Tab into it, to fan it out. It collapses again when you leave. One notice is never collapsed: there would be nothing behind it.' } } },
  render: () => <Toast collapse><Pile /></Toast>,
};

// The elapsing-time line. It spends the notice's own five seconds, stops while
// the notice is hovered or holds focus, and is left out under reduced motion —
// a line that cannot move would read as time not yet spent.
function Progress({ progress = true }: { progress?: boolean }) {
  const push = useToast();
  return <Button onClick={() => push({
    tone: 'info', title: 'Uploading report.csv', text: 'This dismisses on its own.', progress,
  })}>Show notice</Button>;
}
export const ElapsingTime: StoryObj = {
  args: { progress: true },
  argTypes: { progress: { control: 'boolean' } },
  parameters: { docs: { description: { story: 'Show the notice, then hover it or Tab to its close button: the line and the countdown stop together. Turn progress off to keep the timing without the line.' } } },
  render: (args: { progress?: boolean }) => <Toast><Progress {...args} /></Toast>,
};
