import { useLayoutEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { ThemeToggle } from './ThemeToggle';

function Preview({ theme, labelled = false }: { theme: 'dark' | 'light' | 'auto'; labelled?: boolean }) {
  useLayoutEffect(() => {
    const key = 'apliteni-strategy-theme';
    const previous = localStorage.getItem(key);
    const previousTheme = document.documentElement.getAttribute('data-theme');
    localStorage.setItem(key, theme);
    document.documentElement.setAttribute('data-theme', theme === 'auto' ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme);
    window.dispatchEvent(new StorageEvent('storage', { key }));
    return () => {
      if (previous === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous);
      if (previousTheme === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', previousTheme);
    };
  }, [theme]);
  return <div><p>Appearance</p><ThemeToggle labelled={labelled} /></div>;
}

const meta: Meta<typeof ThemeToggle> = {
  title: 'React/ThemeToggle',
  component: ThemeToggle,
  render: args => <Preview theme="dark" {...args} />,
};
export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Dark: Story = {};
export const Light: Story = { render: args => <Preview theme="light" {...args} /> };
export const Auto: Story = { render: args => <Preview theme="auto" {...args} /> };
export const Labelled: Story = { args: { labelled: true } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Theme: Dark. Switch to light.' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(button).toHaveAccessibleName('Theme: Light. Switch to auto.');
    await expect(button).toHaveFocus();
  },
};
