// Back link — the control that takes a reader from a page up to the page it sits
// under, as an HTML string.
//
// It is a link to an address the caller names, never a script that walks the
// browser's history. A page opened in a new tab, from a bookmark or from a shared
// address has no history to walk, and the browser's own Back button already does
// that job; an <a href> is also the one shape a reader can open in a new tab.
// why: docs/specification.md#the-back-link
import { esc, icon } from './index.js';

// "Back" names a direction rather than a place. It is what a caller who names no
// destination gets, and the one label that is not spelled out as "Back to …".
const BARE = 'Back';

// A `javascript:` address is the history walk this component replaces, arriving
// through the one parameter it has. The browser strips leading whitespace and
// control characters before it reads a scheme, so the check strips them too.
const SCRIPTED = /^javascript:/i;
const LEADING = /^[\u0000-\u0020]+/;

const text = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');

/**
 * backLink({ href, label }) → the link a page under another page puts above its
 * title.
 *
 * `label` is the destination's name, spelled the way the sidebar or the trail
 * spells it. The arrow says "back" on screen and is aria-hidden, so the link's
 * accessible name says it in words: "Back to Invoices". That name still contains
 * the visible text, which is what WCAG 2.5.3 asks of a named control.
 *
 * No address, no link: a back control with nowhere to go renders nothing.
 */
export function backLink({ href, label } = {}) {
  const to = text(href);
  if (!to || SCRIPTED.test(to.replace(LEADING, ''))) return '';
  const name = text(label);
  const bare = !name || name.toLowerCase() === BARE.toLowerCase();
  const shown = bare ? BARE : name;
  const named = bare ? '' : ` aria-label="${esc(`${BARE} to ${name}`)}"`;
  return `<a class="ui-back" href="${esc(to)}"${named}>${icon('chevronLeft')}`
    + `<span class="ui-back__label">${esc(shown)}</span></a>`;
}
