// What a drawer panel draws inside itself: separators between groups and no borders
// around content. Shared by the vanilla gate (stories/drawer-rules.test.js) and the React
// one (react/src/drawer-rules.test.tsx), which walk their own stories.
import { selectorPath } from './contrast.js';

export const drawn = (cs, side) => parseFloat(cs.getPropertyValue(`border-${side}-width`)) > 0
  && cs.getPropertyValue(`border-${side}-style`) !== 'none'
  && !/^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\))$/.test(cs.getPropertyValue(`border-${side}-color`).trim());

export const isRule = (cs) => (drawn(cs, 'top') || drawn(cs, 'bottom')) && !(drawn(cs, 'left') && drawn(cs, 'right'));
export const fourSided = (cs) => ['top', 'bottom', 'left', 'right'].every((side) => drawn(cs, side));

/* -- Logical borders, as jsdom cannot read them -------------------------------- */

export const SIDE = { 'block-start': 'top', 'block-end': 'bottom', 'inline-start': 'left', 'inline-end': 'right' };
export const AXIS = { block: ['top', 'bottom'], inline: ['left', 'right'] };

/** Split a value on whitespace outside brackets: `1px rgb(0 0 0)` is two words. */
export const words = (value) => {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (depth === 0 && /\s/.test(ch)) { if (buf) out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
};

/**
 * Every logical border declaration, in a sheet or a style attribute, rewritten as
 * the physical ones it is in horizontal, left-to-right writing. `border-block-width:
 * 1px 2px` is start then end; the `border-block` shorthand sets both sides alike.
 */
export const physical = (css) => css.replace(
  /(?<![\w-])border-(block|inline)(-start|-end)?(-width|-style|-color)?\s*:\s*([^;}"']*)/gi,
  (whole, axis, end = '', part = '', raw) => {
    const important = /!\s*important\s*$/i.test(raw) ? ' !important' : '';
    const value = raw.replace(/!\s*important\s*$/i, '').trim();
    const sides = end ? [SIDE[`${axis}${end}`.toLowerCase()]] : AXIS[axis.toLowerCase()];
    const values = !end && part ? words(value) : [value];
    return sides
      .map((side, i) => `border-${side}${part.toLowerCase()}: ${values[Math.min(i, values.length - 1)]}${important}`)
      .join('; ');
  },
);

/* -- One panel ----------------------------------------------------------------- */

export const CONTROL = 'input, select, textarea, button, a[href], [role="button"], [role="switch"], [role="checkbox"], '
  + '[role="radio"], [role="textbox"], [role="combobox"], [contenteditable]';
// A popup menu and a caret drawn with two borders are paint of a control, not a box or a rule.
export const POPUP = '.ui-dropdown__panel, .ui-dropdown__chevron';
export const SLOT = '.ui-drawer__header, .ui-drawer__body, .ui-drawer__footer';

/** A group that follows another group: the one element inside the body allowed a line. */
export const follows = (el) => el.classList.contains('ui-drawer__section')
  && !!el.previousElementSibling?.classList?.contains('ui-drawer__section');

/** What one panel draws inside itself, and what it fails to draw, as plain data. */
export function measure(win, panel, where) {
  const style = (el) => win.getComputedStyle(el);
  const inside = [...panel.querySelectorAll('*')].filter((el) => !el.matches(SLOT));
  const hr = (el) => el.tagName === 'HR' && style(el).display !== 'none';
  const edge = (sel, side, said) => [...panel.querySelectorAll(sel)].filter((el) => drawn(style(el), side)).map(() => said);
  const lacks = (sel, side, said) => [...panel.querySelectorAll(sel)].filter((el) => !drawn(style(el), side)).map(() => said);
  // A group separator is a line on the top edge and nothing else. A group that draws
  // its bottom edge too puts two lines in one gap, so it stays a ruled row.
  const separator = (el) => follows(el) && drawn(style(el), 'top') && !drawn(style(el), 'bottom');
  return {
    where,
    footerCount: panel.querySelectorAll('.ui-drawer__footer').length,
    footerFills: [...panel.querySelectorAll('.ui-drawer__footer')]
      .filter((el) => !['transparent', 'rgba(0, 0, 0, 0)', style(panel).backgroundColor].includes(style(el).backgroundColor))
      .map((el) => selectorPath(el)),
    cards: inside
      .filter((el) => el.classList.contains('ui-card') || (!hr(el) && !el.closest(CONTROL) && !el.closest(POPUP) && fourSided(style(el))))
      .map((el) => selectorPath(el)),
    ruledRows: inside
      .filter((el) => hr(el) || (isRule(style(el)) && !separator(el) && !el.closest(POPUP)))
      .map((el) => selectorPath(el)),
    strayEdges: [
      ...edge('.ui-drawer__body', 'top', 'a line on the body\'s top edge, under the header\'s own'),
      ...edge('.ui-drawer__body', 'bottom', 'a line on the body\'s bottom edge, before the unruled footer'),
    ],
    unframed: [
      ...lacks('.ui-drawer__header', 'bottom', 'a header with no line under it'),
      ...edge('.ui-drawer__footer', 'top', 'a rule above the footer'),
    ],
    unparted: inside.filter((el) => follows(el) && !drawn(style(el), 'top')).map((el) => selectorPath(el)),
  };
}

// Two groups, the shape the separator is about, for the faults that need one.
export const GROUPS = '<section class="ui-drawer__section"><h3 class="ui-drawer__section-title">One</h3>'
  + '<dl class="ui-drawer__rows"><div class="ui-drawer__row"><dt>Amount</dt><dd>12.00</dd></div></dl></section>'
  + '<section class="ui-drawer__section"><h3 class="ui-drawer__section-title">Two</h3>'
  + '<dl class="ui-drawer__rows"><div class="ui-drawer__row"><dt>Source</dt><dd>Bank feed</dd></div></dl></section>';

// Each fault written on purpose, so a pass reads "looked, and found none" rather than
// "could not see". Drawn the way a page would draw it by hand, one per panel. The
// faults include removing required header and group lines and adding a footer rule.
export const FAULTS = [
  { fault: 'a different footer fill', kind: 'footerFills', css: '.zz-fault .ui-drawer__footer { background: red; }' },
  { fault: 'a line on the body\'s top edge', kind: 'strayEdges', css: '.zz-fault .ui-drawer__body { border-top: 1px solid var(--border); }' },
  { fault: 'a rule under every row', kind: 'ruledRows', body: GROUPS, css: '.zz-fault .ui-drawer__row dt, .zz-fault .ui-drawer__row dd { border-bottom: 1px solid var(--border); }' },
  { fault: 'a logical rule under a group', kind: 'ruledRows', body: GROUPS, css: '.zz-fault .ui-drawer__section { border-block-end: 1px solid var(--border); }' },
  { fault: 'a rule over the first group, where there is nothing to part it from', kind: 'ruledRows', body: GROUPS, css: '.zz-fault .ui-drawer__section { border-top: 1px solid var(--border); }' },
  { fault: 'a ruled title', kind: 'ruledRows', css: '.zz-fault .ui-drawer__title { border-bottom: 1px solid var(--border); }' },
  { fault: 'an <hr> in the body', kind: 'ruledRows', body: '<p>Above</p><hr><p>Below</p>' },
  { fault: 'a box drawn by hand', kind: 'cards', body: '<div style="border: 1px solid var(--border); padding: 12px">Boxed</div>' },
  { fault: 'the header\'s line taken away', kind: 'unframed', css: '.zz-fault .ui-drawer__header { border-bottom: 0; }' },
  { fault: 'a rule above the footer', kind: 'unframed', css: '.zz-fault .ui-drawer__footer { border-top: 1px solid var(--border); }' },
  { fault: 'the line between the groups taken away', kind: 'unparted', body: GROUPS, css: '.zz-fault .ui-drawer__section + .ui-drawer__section { border-top: 0; }' },
];

