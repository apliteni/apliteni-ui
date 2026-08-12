// ---------------------------------------------------------------------------
// Content for the "Guidelines / Component choice" page: four places where two
// of the kit's components look interchangeable and are not, and the line the
// kit's own code already draws between them.
//
// Same shape as _destructive-actions.js: every specimen is a real factory
// rendered live, the don'ts included, so what is wrong on show is the choice of
// component and never the markup — and stories/a11y.test.js stays green on both
// halves of every pair.
//
// Every `kit` entry carries a `pattern` that must appear on the cited line;
// stories/guidelines/refs.test.js resolves them all.
// ---------------------------------------------------------------------------
import { callout, card, segmented, successPanel, toast } from '../../src/components/index.js';
import { confirm } from '../../src/components/confirm.js';
import { success } from '../../src/components/success.js';
import { tabs } from '../../src/components/tabs.js';

// ---- The rule -------------------------------------------------------------
export const TITLE = 'Component choice';

// ---- Live specimens -------------------------------------------------------
// Each returns a string of real component markup. The stage furniture — and the
// containment an overlay needs to sit in the flow of a cell rather than over the
// page — comes from _layout.js, so this page adds no CSS of its own.

const stage = (html, mod = '') => `<div class="gl-stage${mod ? ` ${mod}` : ''}">${html}</div>`;

// `specimen: true` renders the dialog open and inert: a picture of one, with no
// data-confirm hook and no aria-modal, so the page does not claim a modal owns it.
/** The ask that stops the page, because it has an answer. */
export const interruptDo = () => stage(confirm({
  title: 'Rotate this token?',
  body: 'The current token stops working the moment you do.',
  cancelLabel: 'Keep token',
  confirmLabel: 'Rotate token',
  specimen: true,
}), 'gl-stage--confirm');
/** The same ask put in the page, where there is nothing to answer it with. */
export const interruptDont = () => stage(callout({
  variant: 'info',
  body: 'Rotate this token? The current one stops working the moment you do.',
}));

/** A condition that is still true, in something that stays. */
export const transientDo = () => stage(callout({
  variant: 'warn',
  icon: 'alert',
  body: 'This token is shown once. Copy it now — you won’t see it again.',
}));
/** The same condition in something that leaves. No `action`: a warn toast that
 *  carries one paints --amber ink that misses AA in light (#131), and a
 *  specimen of a rule must not be a specimen of a second, unrelated fault. */
export const transientDont = () => stage(toast({
  variant: 'warn',
  style: 'soft',
  title: 'This token is shown once',
  body: 'Copy it now — you won’t see it again.',
}));

const FILTERS = ['Any', 'Verified', 'Pending'];

/** A filter strip: `role="toolbar"`, one Tab stop, no panel promised. */
export const panelsDo = () => stage(segmented({
  ariaLabel: 'Status filter', options: FILTERS, active: 2,
}));
/** The same three filters as a tablist, over panels that hold nothing. */
export const panelsDont = () => stage(tabs({
  name: 'gl-status', ariaLabel: 'Status filter', active: 2,
  items: FILTERS.map((label) => ({ label })),
}));

/** The block-sized confirmation, in the page the reader is already on. */
export const scaleDo = () => stage(card({
  body: successPanel({ title: 'Feedback sent', sub: 'It goes straight to the strategy owner.' }),
}));
/** The page-sized one in the same slot, with no page to fill. */
export const scaleDont = () => stage(card({
  body: success({ layout: 'hero', backdrop: 'aurora', title: 'Feedback sent' }),
}));

// ---- The four sub-rules ---------------------------------------------------
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
      { ref: 'src/components/index.js:211', pattern: 'export function callout(' },
      { ref: 'src/components/drawer.js:14', pattern: 'content over a scrim, focus-trapped, Esc-dismissable' },
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
      { ref: 'src/components/index.js:227', pattern: 'class="ui-toast__action"' },
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
      { ref: 'src/components/index.js:66', pattern: 'It is NOT a tablist: it controls no panel' },
      { ref: 'src/components/index.js:74', pattern: 'that one owns panels and earns the tab announcement' },
      { ref: 'src/components/nav.js:19', pattern: 'not role="tablist"' },
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
      { ref: 'src/components/index.js:244', pattern: 'Pick by how much of the screen the confirmation owns' },
      { ref: 'src/components/index.js:246', pattern: 'export function successPanel(' },
      { ref: 'src/components/success.js:64', pattern: 'The page-sized confirmation' },
    ],
  },
];
