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
