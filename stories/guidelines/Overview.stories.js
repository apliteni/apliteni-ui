// The index: one row per page. Every title, count, gap and link comes from
// _overview.js — nothing on this page is typed twice.
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { GROUND_CSS, ground } from './_layout.js';
import { TITLE, LINKS } from './_overview.js';

// The index stands on the same ground as the pages it links to: the reading
// surface, from the shared layout. #514's card was there to lift the list off
// --bg; the page is that surface now, so the card is a box around nothing.
// .gi-index keeps the box it gave — a --space-6 pad and the hairline's 1px, on
// all four sides — so dropping the paint moved no line.
// why: guidelines/colour-and-theming.md#keep-text-off-grey-fills
const CSS = `<style>
  .gi { max-width: var(--measure); }
  .gi h1 { font: 700 27px/1.2 var(--font-display); color: var(--strong); margin-bottom: var(--space-5); }
  .gi-index { padding: calc(var(--space-6) + 1px); }
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
  render: () => `${GROUND_CSS}${CSS}${ground(`<div class="gi">
      <h1>${TITLE}</h1>
      <div class="gi-index">
        <ul class="gi-list">${LINKS.map(link => `<li><a href="${link.href}" target="_top">${link.title}</a></li>`).join('')}</ul>
      </div>
    </div>`)}`,
};
