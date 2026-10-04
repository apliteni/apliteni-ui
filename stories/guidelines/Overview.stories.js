// The index: one row per page. Every title, count, gap and link comes from
// _overview.js — nothing on this page is typed twice.
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card } from '../../src/components/index.js';
import { pad } from '../_gallery.js';
import { TITLE, LINKS } from './_overview.js';

// The list is reading, so it stands on the card. Light spends its white on the
// surface you read on (src/tokens/tokens.css), and twenty-two rows of link text
// straight on --bg is the page ground doing a card's job.
// why: guidelines/colour-and-theming.md#keep-text-off-grey-fills
const CSS = `<style>
  .gi { max-width: var(--measure); }
  .gi h1 { font: 700 27px/1.2 var(--font-display); color: var(--strong); margin-bottom: var(--space-5); }
  .gi-list { font: 400 15px/1.7 var(--font-sans); color: var(--text); margin: 0; padding-left: var(--space-5); }
  .gi-list li + li { margin-top: var(--space-2); }
  .gi-list a { color: var(--text); }
</style>`;

export default {
  title: 'Guidelines/Overview',
  parameters: { layout: 'fullscreen' },
};

export const Overview = {
  name: 'Overview',
  render: () => `${CSS}${pad(`<div class="gi">
      <h1>${TITLE}</h1>
      ${card({ body: `<ul class="gi-list">${LINKS.map(link => `<li><a href="${link.href}" target="_top">${link.title}</a></li>`).join('')}</ul>` })}
    </div>`)}`,
};
