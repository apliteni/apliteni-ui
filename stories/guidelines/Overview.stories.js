// The index: one row per page. Every title, blurb, count, gap and link comes
// from _overview.js — nothing on this page is typed twice.
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { pad } from '../_gallery.js';
import { INTRO, TITLE, LINKS } from './_overview.js';

const CSS = `<style>
  .gi { max-width: var(--measure); }
  .gi h1 { font: 700 27px/1.2 var(--font-display); color: var(--strong); }
  .gi-intro, .gi-list { font: 400 15px/1.7 var(--font-sans); color: var(--text); }
  .gi-list { padding-left: var(--space-5); }
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
      <ul class="gi-list">${LINKS.map(link => `<li><a href="${link.href}" target="_top">${link.title}</a></li>`).join('')}</ul>
    </div>`)}`,
};
