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
  render: () => <div style={{ paddingBlock: 56 }}>
    <div className="ui-section-head">
      <h2>What the kit gives you</h2>
      <p>Three cells of the band, each with the glyph slot the stylesheet sizes.</p>
    </div>
    <div className="ui-features">
      {feature('layers', 'One deck, many surfaces', 'The same content renders as a deck, as long-form, and over MCP.')}
      {feature('key', 'Scoped access', 'An agent reads exactly what its grant allows, and nothing beside it.')}
      {feature('compass', 'Findable by design', 'Every page carries the nav its section owns.')}
    </div>
  </div>,
};
