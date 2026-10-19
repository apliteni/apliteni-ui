/* The measurement behind stories/button-chrome.test.js: one kit class, in one theme, in the ancestry
 * a story gives it, beside the same markup with the browser's button chrome and without it.
 * The gate deals one subject to a thread of stories/lib/job-pool.js, and a thread reads the
 * stylesheet for its own subjects, so nothing is shared between threads.
 * why: #251, #562
 */
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import { kitCssFor } from './contrast.js';

export const PROBE = 'data-chrome-probe';

// Compare explicit button defaults with their reset values.
export const CHROME = {
  appearance: 'auto',
  'background-color': 'rgb(107, 107, 107)',
  border: '2px outset rgb(118, 118, 118)',
  'font-family': 'Arial',
  'font-size': '13.3333px',
  'line-height': 'normal',
  'text-align': 'center',
  width: 'fit-content',
};
export const BARE = {
  appearance: 'none',
  'background-color': 'rgba(0, 0, 0, 0)',
  'border-width': '0',
  'border-style': 'none',
  'font-family': 'inherit',
  'font-size': 'inherit',
  'line-height': 'inherit',
  'text-align': 'start',
  width: 'auto',
};
const decls = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';');
// Both stand-ins are attribute selectors, (0,1,0), and both are emitted BEFORE
// the kit — so a kit rule of the same weight wins on order, exactly as the
// browser's UA origin loses to any author rule. They are also mounted on a <div>
// rather than a <button>: jsdom scores a selector list by its widest member
// (Specificity.max over the whole list, living/css/helpers/computed-style.js),
// so its own `input:is([type=button i], …), button { text-align: center }` is a
// (0,1,1) rule that `.ui-nav__item` at (0,1,0) cannot beat. Mount a real button
// and text-align reads `center` for every subject, the correct ones included.
export const STANDIN = `[data-ua-chrome]{${decls(CHROME)}}\n[data-ua-bare]{${decls(BARE)}}\n`;

// A border whose style is `none` paints nothing at any width, so that is the
// comparison — not the raw width, which jsdom reports as `16px` for an element
// with no border rule at all and would fail every class that writes `border: 0`.
const edge = (cs, side) => (cs[`border${side}Style`] === 'none'
  ? 'none'
  : `${cs[`border${side}Width`]} ${cs[`border${side}Style`]}`);
const BLOCK_LEVEL = new Set(['block', 'flex', 'grid', 'flow-root', 'list-item', 'table']);
const FLEXED = new Set(['flex', 'inline-flex', 'grid', 'inline-grid']);
// Every keyword that means "shrink to your content". A block-level row that
// resolves to one of these is the chrome, however it got there.
const SHRINK_TO_FIT = new Set([
  'auto', 'fit-content', 'max-content', 'min-content',
  '-webkit-fit-content', '-moz-fit-content', '-webkit-max-content', '-webkit-min-content',
]);

export const FACETS = [
  {
    name: 'background',
    read: (cs) => cs.backgroundColor,
    // appearance: none is the browser's own off-switch for the fill and the
    // frame; a class that writes it has cancelled both without naming them.
    exempt: (cs) => cs.appearance === 'none',
    hint: 'add `background: none` to the rule',
  },
  {
    name: 'border',
    read: (cs) => ['Top', 'Right', 'Bottom', 'Left'].map((s) => edge(cs, s)).join(' / '),
    exempt: (cs) => cs.appearance === 'none',
    hint: 'add `border: 0` to the rule',
  },
  // The three the `font` shorthand carries, read separately and repaired
  // together: `font: inherit` answers all three at once, and is the only answer
  // that does. Any font longhand the rule means to keep has to be written AFTER
  // it — src/styles/callout.css:68 `.ui-toast__action` is the shape. Three rules in
  // the kit have a longhand to keep: that one keeps its weight, `.avatar` keeps its
  // weight and size, and `.ui-fbpill` keeps the family, the size and the weight.
  { name: 'font-family', read: (cs) => cs.fontFamily, hint: 'add `font: inherit` to the rule' },
  { name: 'font-size', read: (cs) => cs.fontSize, hint: 'add `font: inherit` to the rule (before any font longhand it keeps)' },
  { name: 'line-height', read: (cs) => cs.lineHeight, hint: 'add `font: inherit` to the rule (before any font longhand it keeps)' },
  // The only facet with a choice in it: a row of labels wants `left`, a control
  // whose content is one centred glyph wants `center`. Either is a repair; what
  // the kit cannot do is leave it to the element, which is what this reports.
  { name: 'text-align', read: (cs) => cs.textAlign, hint: 'declare `text-align` on the rule' },
  {
    name: 'width',
    read: (cs) => cs.width,
    // Shrink-to-fit is only a difference where the row would otherwise fill its
    // line. An inline-level box is shrink-to-fit whichever element it is, and so
    // is a flex or grid item — a control and a div agree in both places, and the
    // reader sees nothing. Only a block-level box in normal flow loses its width.
    exempt: (cs) => !BLOCK_LEVEL.has(cs.display) || FLEXED.has(cs.parentDisplay),
    // The one facet where equal readings are not a repair. Both stand-ins are
    // (0,1,0) and emitted before the kit, so ANY width declaration beats both and
    // the twins agree — including `width: auto` and `width: fit-content`, which
    // are the chrome written out by hand rather than an answer to it. Measured on
    // this branch: with `.ui-dropdown__item { width: fit-content }`, #251's own
    // symptom, the twins matched and the gate went green at exit 0. So the value
    // is read as well as compared, and a shrink-to-fit `without` reading fails
    // whether or not the two agree.
    bad: (value) => SHRINK_TO_FIT.has(value),
    hint: 'add `width: 100%` to the rule',
  },
];


export const capture = (el, win) => {
  const cs = win.getComputedStyle(el);
  const out = {
    appearance: cs.appearance,
    display: cs.display,
    cursor: cs.cursor,
    parentDisplay: el.parentElement ? win.getComputedStyle(el.parentElement).display : 'block',
  };
  for (const f of FACETS) out[f.name] = f.read(cs);
  return out;
};


// One window per subject, closed when the subject is done.
function windowFor(theme, html) {
  const { css } = kitCssFor(theme);
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const w = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${STANDIN}${css}</style></head>`
    + `<body>${html}</body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  ).window;
  return w;
}

/** The same class, in the same place, with the chrome and without it. */
function twinsIn(w, subject) {
  const anchor = w.document.querySelector(`[${PROBE}]`);
  assert.ok(anchor, `.${subject.cls}: the probe did not survive into the measured document (${subject.where})`);
  const make = (flag) => {
    const el = w.document.createElement('div');
    for (const { name, value } of anchor.attributes) if (name !== PROBE) el.setAttribute(name, value);
    el.setAttribute(flag, '');
    el.innerHTML = anchor.innerHTML;
    return el;
  };
  // Replaced in place and one at a time, never inserted beside each other: a
  // sibling combinator would otherwise reach one twin and not the other, and the
  // difference would read as chrome.
  const chrome = make('data-ua-chrome');
  const bare = make('data-ua-bare');
  anchor.replaceWith(chrome);
  const withChrome = capture(chrome, w);
  chrome.replaceWith(bare);
  const without = capture(bare, w);
  bare.replaceWith(anchor);
  return { withChrome, without };
}


/** Every facet of one subject, in one theme. */
export function measureSubject(theme, scope, subject) {
  const w = windowFor(theme, subject.html);
  const found = [];
  let checks = 0;
  try {
    const { withChrome, without } = twinsIn(w, subject);
    for (const facet of FACETS) {
      checks += 1;
      if (facet.exempt && facet.exempt(withChrome)) continue;
      const differs = withChrome[facet.name] !== without[facet.name];
      // Two ways to fail, and the second is not a comparison: a value that IS
      // the chrome fails even where both twins report it, because both twins
      // are reporting the same defect.
      const kept = Boolean(facet.bad && facet.bad(without[facet.name]));
      if (!differs && !kept) continue;
      found.push({
        scope, facet: facet.name, ...subject, kind: differs ? 'differs' : 'kept',
        was: withChrome[facet.name], is: without[facet.name], hint: facet.hint,
      });
    }
  } finally {
    w.close();
  }
  return { checks, found };
}
