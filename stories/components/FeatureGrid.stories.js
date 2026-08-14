// The kit's feature band: `.ui-features` in src/styles/layout.css, which had no
// specimen anywhere. It sizes and strokes a glyph (`.ui-feature__icon svg`), and
// stories/glyph-stroke.test.js measures glyphs by rendering them — so until this
// existed, that rule shipped to consumers with nothing holding its width.
import { icon } from '../../src/components/index.js';

export default {
  title: 'Components/Feature Grid',
  parameters: { layout: 'fullscreen' },
};

const feature = (ic, title, body) => `
  <div class="ui-feature">
    <div class="ui-feature__icon">${icon(ic)}</div>
    <h3>${title}</h3>
    <p>${body}</p>
  </div>`;

export const Default = {
  name: 'Feature band',
  render: () => `
    <div style="padding:56px 0">
      <div class="ui-section-head">
        <h2>What the kit gives you</h2>
        <p>Three cells of the band, each with the glyph slot the stylesheet sizes.</p>
      </div>
      <div class="ui-features">
        ${feature('layers', 'One deck, many surfaces', 'The same content renders as a deck, as long-form, and over MCP.')}
        ${feature('key', 'Scoped access', 'An agent reads exactly what its grant allows, and nothing beside it.')}
        ${feature('compass', 'Findable by design', 'Every page carries the nav its section owns.')}
      </div>
    </div>`,
};
