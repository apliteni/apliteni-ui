import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './primitives/Avatar';
import { Card } from './primitives/Card';

const meta: Meta = { title: 'React/Avatar', parameters: { layout: 'fullscreen' } };
export default meta;

const NAMES = ['Avery Example', 'Jordan Okafor', 'Mia Chen', 'Noor Haddad', 'Sam Rivera', 'Lena Novak', 'Omar Reyes', 'Priya Nair'];

export const Hues: StoryObj = {
  render: () => <Card>
    <p>
      {NAMES.map((name, i) => <Avatar key={name} personKey={`user_${i}`} name={name} />)}
    </p>
    <p>
      {NAMES.map((name, i) => <Avatar key={name} personKey={`user_${i}`} name={name} size={32} />)}
    </p>
  </Card>,
};

export const Fallbacks: StoryObj = {
  render: () => <Card>
    <p>
      <Avatar personKey="user_1" name="Mia" />
      <Avatar personKey="user_2" name="" />
      <Avatar empty />
      <Avatar personKey="user_3" name="Jordan Okafor" src="demo-assets/demo-logo.svg" />
    </p>
  </Card>,
};
