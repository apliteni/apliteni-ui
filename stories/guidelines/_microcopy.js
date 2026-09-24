import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('microcopy.md', new URL('../../guidelines/microcopy.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button, switchToggle } from '../../src/components/index.js';

const stage = (html) => `<div class="gl-stage">${html}</div>`;

// Print each accessible name so the difference is visible without a screen reader.
export const stateDo = () => stage('<p>Accessible name: In-app notifications, on</p>' + switchToggle({
  checked: true, label: 'In-app notifications, on',
}));
export const stateDont = () => stage('<p>Accessible name: Turn off in-app notifications</p>' + switchToggle({
  checked: true, label: 'Turn off in-app notifications',
}));

export const namedDo = () => stage('<p>Accessible name: Dismiss</p>' + button({ label: 'Dismiss', icon: 'x', iconOnly: true }));
export const namedDont = () => stage('<p>Accessible name: none</p>' + button({ label: '', icon: 'x', iconOnly: true }));

export const RULES = withSpecimens(content.rules, [
{ id: 'state-not-destination', doHtml: stateDo, dontHtml: stateDont },
{ id: 'never-nameless', doHtml: namedDo, dontHtml: namedDont },
]);
