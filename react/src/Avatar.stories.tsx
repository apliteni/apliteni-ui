import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { Avatar } from './primitives/Avatar';
import { Card } from './primitives/Card';
import person from '../../stories/assets/demo-person.png';

const meta: Meta = { title: 'React/Avatar', parameters: { layout: 'fullscreen' } };
export default meta;

const NAMES = ['Avery Example', 'Jordan Okafor', 'Mia Chen', 'Noor Haddad', 'Sam Rivera', 'Lena Novak', 'Omar Reyes', 'Priya Nair'];

const Row = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>{children}</div>
);
const Rows = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
);

export const Hues: StoryObj = {
  render: () => <Card><Rows>
    <Row>{NAMES.map((name, i) => <Avatar key={name} personKey={`user_${i}`} name={name} />)}</Row>
    <Row>{NAMES.map((name, i) => <Avatar key={name} personKey={`user_${i}`} name={name} size={32} />)}</Row>
  </Rows></Card>,
};

export const Fallbacks: StoryObj = {
  render: () => <Card><Rows>
    <Row>
      <Avatar personKey="user_1" name="Mia" />
      <Avatar personKey="user_2" name="" />
      <Avatar empty />
    </Row>
    <Row>
      <Avatar personKey="user_3" name="Jordan Okafor" src={person} />
      <Avatar personKey="user_3" name="Jordan Okafor" src={person} size={32} />
    </Row>
    <Row>
      <Avatar personKey="user_4" name="Mia Chen" src="photo-not-found.png" />
      <Avatar personKey="user_4" name="Mia Chen" src="photo-not-found.png" size={32} />
    </Row>
  </Rows></Card>,
};
