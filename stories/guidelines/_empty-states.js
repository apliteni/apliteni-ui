import { loadGuideline, withSpecimens } from './_markdown.js';
import { emptyState, button } from '../../src/components/index.js';

const content = await loadGuideline('empty-states.md', new URL('../../guidelines/empty-states.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;

const stage = (html) => `<div class="gl-stage">${html}</div>`;

export const RULES = withSpecimens(content.rules, [{
  id: 'next-action',
  doHtml: () => stage(emptyState({
    art: 'inbox',
    title: 'No projects yet',
    actions: button({ label: 'Create project', variant: 'primary' }),
  })),
  dontHtml: () => stage(emptyState({ title: 'Nothing here' })),
}]);
