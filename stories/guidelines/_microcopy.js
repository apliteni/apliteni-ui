import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('microcopy.md', new URL('../../guidelines/microcopy.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button, switchToggle } from '../../src/components/index.js';

const stage = (html) => `<div class="gl-stage">${html}</div>`;

// This pair renders identical pixels on purpose — `label` is the accessible
// name and nothing else — so the captions are what carry the difference.
export const stateDo = () => stage(switchToggle({
  checked: true, label: 'In-app notifications, on',
}));
export const stateDont = () => stage(switchToggle({
  checked: true, label: 'Turn off in-app notifications',
}));

export const namedDo = () => stage(button({ label: 'Dismiss', icon: 'x', iconOnly: true }));
export const namedDont = () => stage(button({ label: '', icon: 'x', iconOnly: true }));

export const RULES = withSpecimens(content.rules, [
{ id: 'state-not-destination', doHtml: stateDo, dontHtml: stateDont, kit: [
      { ref: 'src/components/topbar.js:11', pattern: 'reports the state it is IN' },
      { ref: 'src/components/topbar.js:23', pattern: 'rewritten by applyTheme on every flip' },
      { ref: 'src/components/topbar.test.js:59', pattern: 'announces the theme it is in' },
    ] },
{ id: 'never-nameless', doHtml: namedDo, dontHtml: namedDont, kit: [
      { ref: 'src/components/index.js:15', pattern: 'kit glyphs are aria-hidden' },
      { ref: 'src/components/index.js:17', pattern: 'an empty label falls back to the icon' },
      { ref: 'src/components/index.js:81', pattern: 'not an accessible name' },
    ] },
]);
