// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { callout, card, segmented, successPanel, toast } from '../../src/components/index.js';
import { confirm } from '../../src/components/confirm.js';
import { dropdown } from '../../src/components/dropdown.js';
import { success } from '../../src/components/success.js';
import { tabs } from '../../src/components/tabs.js';
import { currencyItems } from '../_currencies.js';

export const TITLE = 'Component choice';

export const BLURB = 'Five choices between components that look interchangeable, and the line between them.';

const stage = (html, mod = '') => `<div class="gl-stage${mod ? ` ${mod}` : ''}">${html}</div>`;

// `specimen: true` keeps the dialog open and inert — no aria-modal, no hook, so
// the page does not claim a modal owns it.
export const interruptDo = () => stage(confirm({
  title: 'Rotate this token?',
  body: 'The current token stops working the moment you do.',
  cancelLabel: 'Keep token',
  confirmLabel: 'Rotate token',
  specimen: true,
}), 'gl-stage--confirm');
export const interruptDont = () => stage(callout({
  variant: 'info',
  body: 'Rotate this token? The current one stops working the moment you do.',
}));

export const transientDo = () => stage(callout({
  variant: 'warn',
  icon: 'alert',
  body: 'This token is shown once. Copy it now — you won’t see it again.',
}));
// No `action` here on purpose: a warn toast carrying one paints --amber ink
// that misses AA in light (#131), and stories/contrast.test.js walks this page.
export const transientDont = () => stage(toast({
  variant: 'warn',
  style: 'soft',
  title: 'This token is shown once',
  body: 'Copy it now — you won’t see it again.',
}));

const FILTERS = ['Any', 'Verified', 'Pending'];

export const panelsDo = () => stage(segmented({
  ariaLabel: 'Status filter', options: FILTERS, active: 2,
}));
export const panelsDont = () => stage(tabs({
  name: 'gl-status', ariaLabel: 'Status filter', active: 2,
  items: FILTERS.map((label) => ({ label })),
}));

export const scaleDo = () => stage(card({
  body: successPanel({ title: 'Feedback sent', sub: 'It goes straight to the strategy owner.' }),
}));
export const scaleDont = () => stage(card({
  body: success({ layout: 'hero', backdrop: 'aurora', title: 'Feedback sent' }),
}));

// Both halves render open, so the stage keeps room below the trigger for the
// panel it drops.
const CURRENCY = { label: 'currency:', ariaLabel: 'Currency', items: currencyItems('EUR'), open: true };
const room = (html) => stage(`<div style="min-height:400px">${html}</div>`);
export const searchDo = () => room(dropdown({
  ...CURRENCY, search: { placeholder: 'Search currencies', query: 'dollar' },
}));
export const searchDont = () => room(dropdown({ ...CURRENCY, scroll: true }));

export const RULES = [
  {
    id: 'interrupt',
    imperative: 'Stop the page for a question; leave a statement in the page.',
    why: 'A confirm owns the keyboard until it is answered; a callout costs the reader nothing.',
    except: 'A drawer also stops the page, and is right when the answer needs a form, not two buttons.',
    doCaption: 'The question stops the page.',
    dontCaption: 'The same question, with nothing to answer.',
    doHtml: interruptDo,
    dontHtml: interruptDont,
    kit: [
      { ref: 'src/components/confirm.js:1', pattern: 'a question the page stops for' },
      { ref: 'src/components/index.js:220', pattern: 'export function callout(' },
      { ref: 'src/components/drawer.js:10', pattern: 'content over a scrim, focus-trapped, Esc-dismissable' },
    ],
  },
  {
    id: 'transient',
    imperative: 'Use a toast for what happened, a callout for what is still true.',
    why: 'A toast dismisses itself, so a standing condition put in one leaves while it still applies.',
    except: 'A toast with an action outlives its message — something that happened and can still be answered.',
    doCaption: 'A standing warning stays in the page.',
    dontCaption: 'The same warning dismisses itself.',
    doHtml: transientDo,
    dontHtml: transientDont,
    kit: [
      { ref: 'src/styles/callout.css:2', pattern: 'inline messages & transient notifications' },
      { ref: 'src/styles/callout.css:30', pattern: 'a floating, dismissible notification' },
      { ref: 'src/components/index.js:246', pattern: 'class="ui-toast__action"' },
    ],
  },
  {
    id: 'panels',
    imperative: 'Reach for tabs() when the control owns a panel, segmented() when it owns nothing.',
    why: 'A tablist promises a panel and arrow keys; a strip with neither passes axe and fails a reader.',
    except: 'Links between locations are neither — the kit’s nav renders aria-current, not a tablist.',
    doCaption: 'A filter strip that owns no panel.',
    dontCaption: 'A tablist over panels holding nothing.',
    doHtml: panelsDo,
    dontHtml: panelsDont,
    kit: [
      { ref: 'src/components/index.js:73', pattern: 'It is NOT a tablist: it controls no panel' },
      { ref: 'src/components/index.js:78', pattern: 'that one owns panels and earns the tab announcement' },
      { ref: 'src/components/nav.js:7', pattern: 'not role="tablist"' },
    ],
  },
  {
    id: 'scale',
    imperative: 'Pick the confirmation by how much of the screen it owns.',
    why: 'successPanel() is a block inside a page; success() is the page, and carries where to go next.',
    except: 'A block that needs somewhere to go next still reaches for success() — successPanel() takes two strings.',
    doCaption: 'A block confirmation inside the page.',
    dontCaption: 'The page-sized one, crammed into a card.',
    doHtml: scaleDo,
    dontHtml: scaleDont,
    kit: [
      { ref: 'src/components/index.js:263', pattern: 'Pick by how much of the screen the confirmation owns' },
      { ref: 'src/components/index.js:265', pattern: 'export function successPanel(' },
      { ref: 'src/components/success.js:55', pattern: 'The page-sized confirmation' },
    ],
  },
  {
    id: 'dropdown-search',
    imperative: 'Give a dropdown a search field once it has ten options, or whenever its options come from data.',
    why: 'Settled on #283: ten is the number, and it is the rule rather than a recommendation. The panel stops '
      + 'growing at 300px, which shows five rows that carry a description and seven that do not, so '
      + 'at ten even the shortest rows no longer fit and the reader scrolls for a word they could '
      + 'have typed. The US Veterans Affairs design system moves from a select to a combo box at 16 '
      + 'options, but a native select shows about twenty rows before it scrolls, and this panel '
      + 'shows under half that. A list fed by a query, such as merchants, accounts or people, gets '
      + 'the field whatever its count today, because the count is not the author’s to know. The '
      + 'field matches anywhere in the label, not only at its start: that finds every row a start '
      + 'match would, and the rows a reader remembers by a later word as well.',
    except: 'Under six options a field only puts one more stop between the trigger and the rows. '
      + 'From six to nine it is the author’s call: add one when the rows carry descriptions, '
      + 'because those scroll from the sixth.',
    doCaption: 'Twenty-nine currencies, and the reader types “dollar” instead of scrolling for it.',
    dontCaption: 'The same twenty-nine with no field. The panel shows seven at a time, and the '
      + 'dollars are spread across the whole list.',
    doHtml: searchDo,
    dontHtml: searchDont,
    kit: [
      { ref: 'src/components/dropdown.js:97', pattern: 'export const dropdownMatch' },
      { ref: 'src/styles/dropdown.css:240', pattern: '.ui-dropdown__panel--search' },
      { ref: 'src/styles/dropdown.css:291', pattern: '.ui-dropdown__none {' },
    ],
  },
];
