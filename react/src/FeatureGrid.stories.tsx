import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './primitives/Icon';

const meta: Meta = {
  title: 'Components/Feature Grid',
  id: 'components-feature-grid',
  parameters: { layout: 'fullscreen' },
};
export default meta;

const feature = (glyph: string, title: string, body: string) => <div className="ui-feature">
  <div className="ui-feature__icon"><Icon name={glyph} /></div>
  <h3>{title}</h3>
  <p>{body}</p>
</div>;

export const Default: StoryObj = {
  name: 'Feature band',
  render: () => <div style={{ paddingBlock: 'var(--space-10)' }}>
    <div className="ui-section-head">
      <h2>What the kit gives you</h2>
    </div>
    <div className="ui-features">
      {feature('layers', 'One deck, many surfaces', 'The same content appears as a deck, as text, and over MCP.')}
      {feature('key', 'Scoped access', 'An agent reads only the strategy its grant permits.')}
      {feature('compass', 'Findable by design', 'Each page carries navigation for its section.')}
    </div>
  </div>,
};
