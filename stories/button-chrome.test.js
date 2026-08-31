/* Rule: a class the kit hands a clickable row must survive being written as a
 * <button>, because that is the element a consumer reaches for when the row has
 * to be operable from the keyboard.
 *
 * A browser paints a <button> before any author rule runs: a grey fill, a 2px
 * outset border, a box that shrinks to its content, centred text, and `font: 400
 * 13.3333px Arial` — one shorthand, so the face, the size and the leading are
 * three separate things to answer. src/styles/nav.css:30 `.ui-nav__item {` cancels
 * every one. src/styles/dropdown.css:110 `.ui-dropdown__item {` cancelled none, so
 * the same markup that gives the rail a row gave the menu a nineties push-button
 * — measured in Chromium and filed as #251, and repaired there in 0.25.1.
 *
 * WHAT FAILS HERE is a class the kit renders as a clickable thing and NEVER on a
 * <button>: `.vopt` as a `<div role tabindex>`, `.ui-card--interactive` as an
 * `<a href>`, `.ui-fbpill` as a bare `<div>`. Their
 * button rendering has been seen by nobody, which is how #251 reached a release.
 * `.ui-dropdown__item` was a fourth until 0.25.1 gave it the five declarations and
 * a story that renders it as a <button> (stories/components/Dropdown.stories.js
 * `RowTags`), which is what moves a class out of this half by the rule above; it is
 * measured in the LEDGER now and finds nothing, and the parity of its three tags is
 * held by stories/dropdown-tag-parity.test.js.
 * A class the kit does render on a button is measured under the same rule and
 * answered for in the LEDGER below instead — every story that renders it renders
 * a button, in both themes, under the a11y and contrast walks, so a wrong one
 * would have been seen years ago.
 *
 * NOT A SUBJECT, and this is the only exit: a class `cursor: pointer` reaches on
 * a form control the browser owns, or on decoration painted inside one — a
 * `<select>`, the `<label>` wrapping a checkbox, the `<span>` a switch paints its
 * track on. Rewriting one of those as a <button> changes what the element IS, so
 * the question never arises. Three classes, named in PINNED_OWNED with the
 * element each lands on, and the walk has to agree with the name.
 *
 * The ledger of what a green run here does NOT say:
 *  - Nothing about layout. JSDOM computes no boxes, so shrink-to-fit is modelled
 *    as a `width` declaration rather than measured, and a row that fills its line
 *    for some other reason reads as repaired.
 *    why: CONTRIBUTING.md#where-jsdom-stops-being-a-browser
 *  - Nothing about the chrome being current. The stand-in's values are Chromium's,
 *    measured on this branch and not re-measured after; a browser that restyles
 *    its buttons leaves the stand-in stale with nothing here to say so.
 *  - Nothing about weight or style. `font: inherit` resets those too, so a rule
 *    that keeps one has to write it after the shorthand, and no facet here reads
 *    whether it did. Chrome's own button weight is 400, the initial value.
 *  - Nothing about state. Every reading is taken at rest, so chrome that only
 *    shows under :hover or :active is unseen.
 *  - Nothing about accents. One theme pair, the default accent, because none of
 *    the facets is accent-scoped anywhere in the kit today.
 *  - Nothing about the rows in the LEDGER. They keep chrome the kit renders and
 *    is not repairing; the counts are pinned, the rows are not clean.
 *  - Nothing about the deferred half in every place it is rendered. A subject is
 *    measured in EVERY ancestry a story gives it; a deferred class is measured in
 *    one. At the time of writing that is 14 classes rendered 415 times across 232
 *    distinct ancestries, of which 14 are read — so 218 cascades under a ledgered
 *    row are unmeasured. Measuring them all is ~15x the windows this file already
 *    opens, and the half it would cover is the half that is counted rather than
 *    failed. Re-take the numbers by counting `anc(cls)` per deferred class.
 *  - Nothing about a class that stops being clickable. The sweep starts from
 *    `cursor: pointer`; a rule that moves it onto a wrapper or a `:hover` takes
 *    the class out of CANDIDATES entirely. PINNED_SUBJECTS is what catches that
 *    for the three that fail here, and nothing catches it for the rest.
 *
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
 * why: CONTRIBUTING.md#a-gate-carries-a-ledger-of-what-it-does-not-reach
 * why: CONTRIBUTING.md#where-jsdom-stops-being-a-browser
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { STYLE_FILES, kitCssFor, installDomGlobals, storyFiles } from './lib/contrast.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const RULE = /([^{}]+)\{([^{}]*)\}/g;
/** Blank a comment out without moving any line, so file:line stays honest. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const THEMES = ['dark', 'light'];

// ---- what a browser puts on a <button>, and what it puts on nothing --------
//
// jsdom ships the HTML spec's suggested rendering, which is not Chrome's UA
// sheet: there is no buttonface fill, no outset border and no Arial in it, so a
// bare <button> in jsdom computes the SAME transparent background as a <div>.
// `background: none` also computes to rgba(0, 0, 0, 0) — the initial value — so
// in jsdom "declared none" and "never declared" are one value and a gate that
// reads a mounted button decides nothing. Both baselines are therefore declared
// here, and every facet is read twice: once against the chrome, once against its
// absence. A class that cancels the chrome lands on the same value in both.
//
// The values are Chromium's, dark theme, taken by mounting the story's own
// <button class="ui-dropdown__item"> beside its <div class="ui-dropdown__item"> in
// Chrome 152 and reading getComputedStyle off both. Against the unrepaired rule
// the button gave rgb(107, 107, 107), 2px outset, Arial 13.3333px/normal, centred
// text and a box 81.39px wide where the div was 226.00px — the first four are the
// values #251 reports, the rest were taken for this gate. `width` is the one that
// is not a declaration in any browser: a form control with `width: auto` shrinks
// to its content whatever its `display` says, which is where that 81.39px comes
// from. jsdom models no layout, so shrink-to-fit is written here as the `width` it
// is equivalent to, and the only thing that beats it is an explicit width — which
// is what `width: 100%` is for.
//
// The family is three quarters of one declaration, not a declaration of its own:
// Chrome's UA sheet writes `font: 400 13.3333px Arial` on a button, a SHORTHAND,
// so the size and the leading are chrome exactly as the face is. They are read
// here beside it because a rule that answers with the `font-family` longhand
// restores the face and leaves the other two standing — measured on this branch
// at 13.3333px/normal against the row's own 14.5px/23.49px, a row 2.25px shorter
// in type 1.17px smaller, and invisible to a gate that reads the family alone.
const CHROME = {
  appearance: 'auto',
  'background-color': 'rgb(107, 107, 107)',
  border: '2px outset rgb(118, 118, 118)',
  'font-family': 'Arial',
  'font-size': '13.3333px',
  'line-height': 'normal',
  'text-align': 'center',
  width: 'fit-content',
};
const BARE = {
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
const STANDIN = `[data-ua-chrome]{${decls(CHROME)}}\n[data-ua-bare]{${decls(BARE)}}\n`;

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

const FACETS = [
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
  // it — src/styles/callout.css:83 `.ui-toast__action` is the shape. Three rules in
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

// ---- discovery, part 1: the rules that make something clickable -----------

/**
 * The rightmost compound of a selector — the element the rule is written for.
 *
 * Functional pseudo-classes are emptied before anything is split on, or the
 * space inside `:is(.a, .b)` reads as a descendant combinator and the key
 * compound comes back as the wrong half of the selector — silently, with no
 * count moving to say a class left the sweep.
 */
function keyCompound(selector) {
  let flat = selector.trim().replace(/::[\w-]+/g, '');
  for (let pass = 0; pass < 8 && flat.includes('('); pass += 1) {
    const next = flat.replace(/\([^()]*\)/g, '');
    if (next === flat) break;
    flat = next;
  }
  return flat.replace(/\s*[>+~]\s*/g, ' ').split(/\s+/).pop() || '';
}

/**
 * Every class the kit gives `cursor: pointer` in its own right.
 *
 * The class has to be the SUBJECT of the rule, and its compound has to name no
 * element — because a compound that names one has already chosen the element.
 * `.ui-seg button` is a button whatever a consumer writes, `.ui-check input` is
 * an input, `.amenu a` is an anchor: none of them can be moved onto a <button>,
 * so none of them is asking this question.
 */
function candidates() {
  const found = new Map(); // class → "file:line"
  for (const file of STYLE_FILES) {
    const css = decomment(read(file));
    for (const m of css.matchAll(RULE)) {
      const [, selector, body] = m;
      if (!/(^|;)\s*cursor\s*:\s*pointer\s*(;|$)/.test(body)) continue;
      // The match starts wherever the previous rule ended, so the line comes
      // from where the selector's first character actually is.
      const line = css.slice(0, m.index + selector.search(/\S/)).split('\n').length;
      for (const one of selector.split(',')) {
        if (one.trimStart().startsWith('@')) continue;
        const key = keyCompound(one);
        if (/^[a-z]/i.test(key)) continue; // the compound names an element
        for (const [, cls] of key.matchAll(/\.([\w-]+)/g)) {
          if (!found.has(cls)) found.set(cls, `${file}:${line}`);
        }
      }
    }
  }
  return found;
}

// ---- discovery, part 2: what the kit actually renders those classes on -----

/** Storybook's HTML renderer hands back a string or a node; anything else is a gap. */
function serialize(out) {
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') {
    if (typeof out.outerHTML === 'string') return out.outerHTML;
    if (out.nodeType === 11) return [...out.childNodes].map((n) => n.outerHTML ?? n.textContent).join('');
    if (out.nodeType === 3) return out.textContent;
  }
  return null;
}

/**
 * What the browser owns, and is the ONLY thing this gate leaves out.
 *
 * A form control, or decoration painted inside one: a `<select>`, the `<label>`
 * wrapping a checkbox, the `<span>` a switch draws its track on. Rewriting one of
 * those as a <button> changes what the element IS — a `<select>` that becomes a
 * button is not a select any more — so the chrome question never arises for it.
 *
 * This used to be written the other way round, as three shapes that COUNT as a
 * control: a <button>, an <a href>, or an element carrying both a role and a
 * tabindex. That test excluded far more than the browser owns. `.ui-fbpill`
 * is a bare div — src/components/feedback.js:35 `<div class="ui-fbpill" data-fb-pill>`
 * — with `cursor: pointer` and no role, so it fell out of the measurement on a
 * technicality, and as a <button> it takes a 2px outset grey frame around a
 * gradient pill. Worse, the test was a property of the MARKUP: deleting
 * src/components/dropdown.js:45 `'tabindex="-1"',` dropped `.ui-dropdown__item` out of
 * the measured set with every count still adding up, and the whole of #251 passed at
 * exit 0. Reproduced before this was rewritten.
 *
 * Written as an exclusion, the bucket says what its name says, and a class leaves
 * the measurement only by becoming a form control.
 */
const OWNED_BY_BROWSER = new Set(['select', 'input', 'textarea', 'option', 'optgroup', 'label']);
const isControl = (el) => {
  for (let n = el; n; n = n.parentElement) if (OWNED_BY_BROWSER.has(n.localName)) return false;
  return true;
};

const PROBE = 'data-chrome-probe';

/** Render every story once and report where each candidate class lands. */
async function survey(wanted) {
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', {
    pretendToBeVisual: true, virtualConsole: quiet,
  });
  installDomGlobals(dom.window);
  const doc = dom.window.document;

  const seen = new Map(); // class → { tags: Set, control: { html, where } | null }
  for (const cls of wanted) seen.set(cls, { tags: new Set(), control: new Map(), places: 0 });
  const stats = { files: 0, stories: 0, rendered: 0, unrenderable: [] };

  for (const rel of storyFiles) {
    stats.files += 1;
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      stats.stories += 1;
      const args = { ...def.args, ...story.args };
      let out;
      try {
        out = render(args, { globals: { theme: 'dark', accent: 'default' }, args });
      } catch (err) {
        stats.unrenderable.push(`${rel} → ${name}: render threw: ${err && err.message}`);
        continue;
      }
      const html = serialize(out);
      if (html == null) {
        stats.unrenderable.push(`${rel} → ${name}: render returned ${Object.prototype.toString.call(out)}`);
        continue;
      }
      stats.rendered += 1;
      doc.body.innerHTML = html;
      for (const el of doc.body.querySelectorAll('*')) {
        for (const cls of el.classList) {
          const rec = seen.get(cls);
          if (!rec) continue;
          rec.tags.add(el.localName);
          if (!isControl(el)) continue;
          // Capture the story with the element marked, so the measurement runs
          // in the ancestry the kit really gives it — `.ui-nav .ui-nav__item` is
          // (0,2,0) and resolves to nothing outside the rail.
          //
          // Keyed by that ancestry rather than kept at the first hit: a class
          // rendered in two different places has two cascades, and measuring
          // whichever story file sorted first is a narrowing nothing states.
          // The key is the chain of element names and classes up to <body>, so
          // forty-eight renderings of a menu row collapse to the thirteen
          // ancestries the kit actually gives it.
          const sig = [];
          for (let n = el; n && n !== doc.body; n = n.parentElement) {
            sig.push(`${n.localName}.${[...n.classList].sort().join('.')}`);
          }
          const key = sig.join(' < ');
          rec.places += 1;
          if (rec.control.has(key)) continue;
          el.setAttribute(PROBE, '');
          rec.control.set(key, { html: doc.body.innerHTML, where: `${rel} → ${name} <${el.localName}>` });
          el.removeAttribute(PROBE);
        }
      }
    }
  }
  dom.window.close();
  return { seen, stats };
}

const CANDIDATES = candidates();
const { seen: SEEN, stats: SURVEY } = await survey(CANDIDATES.keys());

const anc = (cls) => [...SEEN.get(cls).control.values()];
const controls = [...CANDIDATES].filter(([cls]) => SEEN.get(cls).control.size);

// The subject is a control the kit renders on ANYTHING BUT a <button>. A class
// the kit does render on one has been looked at as a button by every story that
// renders it, in both themes, under the a11y and the contrast walks; if it
// looked wrong somebody would have said so. A class rendered only as a div or an
// anchor has had its button rendering seen by nobody, which is exactly how #251
// reached a release. The line comes off the recording, not off a list.
const subjectClasses = controls.filter(([cls]) => !SEEN.get(cls).tags.has('button'));
const deferredClasses = controls.filter(([cls]) => SEEN.get(cls).tags.has('button'));
// The failing half is measured in EVERY ancestry the kit gives it, because that
// half is what a green run is load-bearing about and a cascade is a property of
// where an element sits. The deferred half is measured in one, and that
// narrowing is entry D of the ledger with the numbers it costs.
const SUBJECTS = subjectClasses.flatMap(([cls, at]) => anc(cls).map((p) => ({ cls, at, ...p })));
// Measured all the same, and answered for in the LEDGER rather than failed.
const DEFERRED = deferredClasses.map(([cls, at]) => ({ cls, at, ...anc(cls)[0] }));
const NOT_CONTROLS = [...CANDIDATES].filter(([cls]) => SEEN.get(cls).tags.size && !SEEN.get(cls).control.size);
const UNRENDERED = [...CANDIDATES].filter(([cls]) => !SEEN.get(cls).tags.size);

// ---- the sets, pinned by name ---------------------------------------------
//
// Discovery is what finds a NEW subject. These are what stop an OLD one leaving
// without a person moving a name, and they exist because it happened: delete
// `tabindex="-1"` from src/components/dropdown.js:45 `'tabindex="-1"',` — the
// roving-tabindex pattern src/components/topbar.js already runs on the segmented
// strip, applied to the menu — and `.ui-dropdown__item` left the measured set,
// every count still added up, and the whole of #251 passed at exit 0.
//
// A derived count cannot catch that on its own. The partition is three ways, so
// a class that stops being a subject is still a candidate and the sum still
// holds; UNRENDERED stays empty because the class is still in the markup; and
// `SUBJECTS.length > 0` is satisfied by whoever is left. The house rule is the
// count rider under CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
// — a file that stops carrying a subject leaves the count — and a count of names
// is what it takes to keep it here.
//
// One name has left since, and legitimately: 0.25.1 gave `.ui-dropdown__item` the
// five declarations and gave stories/components/Dropdown.stories.js a `RowTags`
// story that renders the row as a <button>, so the class is no longer one whose
// button rendering nobody has seen. It is measured in the LEDGER now and finds
// nothing on any facet. That is the only way a name comes off this list: the
// reason it was here stopped being true, and a person read the change.
const PINNED_SUBJECTS = ['ui-card--interactive', 'ui-fbpill', 'vopt'];

// The other side of the same pin. This is the ONLY bucket that leaves the
// measurement, so what is in it is a claim about markup and not something a
// gate can read off a rule: each name is written with the element the kit
// renders it on, and the walk has to agree.
const PINNED_OWNED = {
  'ui-select': 'select',
  'ui-check': 'label',
  'ui-switch__track': 'span',
};

// ---- the measurement ------------------------------------------------------

const capture = (el, win) => {
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

// One window per subject per theme, held so the two themes do not re-parse the
// kit's whole stylesheet for every facet.
const windows = new Map();
after(() => { for (const w of windows.values()) w.close(); });
function windowFor(theme, html) {
  const key = `${theme} ${html}`;
  if (windows.has(key)) return windows.get(key);
  const { css } = kitCssFor(theme);
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const w = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${STANDIN}${css}</style></head>`
    + `<body>${html}</body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  ).window;
  windows.set(key, w);
  return w;
}

/** The same class, in the same place, with the chrome and without it. */
function twins(theme, subject) {
  const w = windowFor(theme, subject.html);
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

const tally = { checks: 0 };

/** Every facet of every measured class, in one theme. Read once, used by both halves. */
const runs = new Map();
function findingsFor(theme) {
  if (runs.has(theme)) return runs.get(theme);
  const found = [];
  for (const [scope, set] of [['subject', SUBJECTS], ['deferred', DEFERRED]]) {
    for (const subject of set) {
      const { withChrome, without } = twins(theme, subject);
      for (const facet of FACETS) {
        tally.checks += 1;
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
    }
  }
  runs.set(theme, found);
  return found;
}

const show = (f) => (f.kind === 'kept'
  ? `  .${f.cls} (${f.at}) — ${f.facet}: ${f.is} either way, and that value IS the chrome — a rule\n`
    + '     that writes the browser\u2019s own behaviour out by hand has not answered it\n'
  : `  .${f.cls} (${f.at}) — ${f.facet}: ${f.was} on a <button>, ${f.is} without the chrome\n`)
  + `     rendered by ${f.where}; ${f.hint}`;

for (const theme of THEMES) {
  test(`button chrome: every clickable row cancels it — ${theme}`, () => {
    const problems = findingsFor(theme).filter((f) => f.scope === 'subject').map(show);
    assert.equal(
      problems.length, 0,
      `\n${problems.length} clickable row(s) keep the browser's button chrome in the ${theme} theme.\n`
      + 'The kit renders each class below as a control and never as a <button>, so nobody has seen\n'
      + 'it as one — and a consumer who writes it that way gets this instead of the row the\n'
      + 'stylesheet describes:\n\n'
      + `${problems.join('\n')}\n`,
    );
  });
}

// ---- the ledger -----------------------------------------------------------
//
// Two lists, because this gate now has two kinds of thing to say. LEDGER is what
// is measured, never failed, and answered for: rows the kit renders as buttons
// and is not repairing. CLOSED is what USED to be in LEDGER and is not any more,
// held at zero so the repair cannot quietly come undone. Counts in both are exact
// rather than ceilings, the same rule stories/contrast.test.js holds its buckets
// to: a ceiling would let one row being repaired hide another regressing.
// why: CONTRIBUTING.md#a-gate-carries-a-ledger-of-what-it-does-not-reach
//
// The two subjects this lane repairs on that facet chose `text-align: left` over
// `start`, the same keyword 0.25.1 gave `.ui-dropdown__item` and the one the rule
// #251 names as correct — src/styles/nav.css:30 `.ui-nav__item {`.
// `start` is the better keyword in a kit that renders both directions; this one has
// written down
// that it does not. The evidence, so the next reader does not have to re-take it:
// one logical property in all of src/ — `margin-inline: auto` at layout.css:125,
// which is symmetric and says nothing about direction — against 25 physical
// margin-/padding-left|right declarations; no `dir=`, no `[dir="rtl"]`, no
// `:dir(`; every one of the kit's own text-align declarations physical; and
// docs/specification.md#what-the-kit-does-not-do naming a vertical writing mode a
// non-goal, which the icon gate asserts rather than assumes. If RTL ever arrives it
// is a sweep of
// these five declarations, not a design decision taken again.
//
// Not held here, and deliberately: `width` on .ui-card--interactive. The width
// facet exempts a box that is not block-level in normal flow, and the card is a
// grid item everywhere the kit renders it, so its shrink-to-fit as a <button> is
// unmeasured rather than absent. `width: 100%` on a card sitting in a flex row is
// a live pixel change, and guessing at one is not what this gate is for. The
// absence of that declaration is a decision, not an oversight.

const LEDGER = [
  {
    id: 'A',
    facet: 'text-align',
    count: 12,
    why: 'A <button> centres its text and nothing else in the kit does, so each of these rows takes '
      + 'its alignment from the element rather than from the stylesheet — the dependency this gate '
      + 'exists to refuse. What it does NOT mean is twelve rows a reader could see move, and the '
      + 'number that decides it was measured rather than argued. Every one of the twelve was mounted '
      + 'as a <button> in the ancestry a story gives it and read twice, `text-align: left !important` '
      + 'against `center !important`, taking the union rectangle of everything inside the box: the '
      + 'two readings are identical on all twelve, so text-align paints on none of them today. Six '
      + 'cannot ever paint while their layout stands, because they position their children with '
      + 'properties text-align has no say over — .ui-btn and .ui-drawer__close are flex with '
      + 'justify-content: center, and .toggle, .avatar, .ui-toast__close and .ui-fbc__x are grid with '
      + 'place-items: center. Three more are flex containers with no justify-content of their own '
      + '(.ui-dropdown__trigger, .ui-snippet__copy, .vsw__btn): text-align cannot reach a flex item '
      + 'either, so nothing paints, but nothing states the centring and a display change would put it '
      + 'back in play. The last three lay out real inline content — .ui-tabs__tab, .ui-toast__action '
      + 'and .ui-fbbtn — and there the alignment is live and only invisible because the box is sized '
      + 'to one short label with no slack in the line. Those three are the exposure, and it goes '
      + 'visible the first time such a label wraps or a consumer reuses one of the classes on a row '
      + 'with room. An earlier draft of this entry said two of the twelve pinned it and ten were '
      + 'exposed; both halves were wrong, and the sentence a reader uses to decide whether to open '
      + 'this deferral overstated the risk fourfold. Moving all twelve recentres rows the kit already '
      + 'ships as buttons, which is a repaint across a dozen components to fix a row #251 reports on '
      + 'one. The decision to stop at the rows a consumer cannot see was taken in this lane, not in '
      + 'the issue, whose comment thread is empty; the pull request this gate arrived in is where '
      + 'it is written down.',
  },
  {
    id: 'C',
    facet: 'line-height',
    count: 4,
    why: 'The leading half of the same shorthand. Chrome writes `font: 400 13.3333px Arial` on a '
      + 'button, so a button whose rule states no leading gets `normal` where the identical class '
      + 'on a div gets the body\'s 1.62. Four rules are in that position: .ui-dropdown__trigger, '
      + '.vsw__btn, .ui-fbbtn and .ui-snippet__copy — every one of them declares its own font-size, '
      + 'which is why the size half of this shorthand finds nothing on a deferred row and has no '
      + 'entry here. What repairing them costs was measured in Chrome rather than guessed, by '
      + 'adding `font: inherit` to each of the four and reading the box back: the dropdown trigger '
      + 'and the version-switcher button go 31.00px to 36.25px, the feedback button 34.00px to '
      + '39.86px, and only the snippet copy holds at 24.00px. Three components five to six pixels '
      + 'taller, in a kit that puts a dropdown trigger on most screens it ships — the same trade as '
      + 'entry A and turned down for the same reason. Read `1.62` rather than a pixel length in a '
      + 'failure message here: jsdom reports an unresolved line-height number, so the two readings '
      + 'differ textually and the gate sees the difference, but the px value is Chrome\'s to give.',
  },
];

// Closed, not deferred. A facet leaves LEDGER by being repaired, and lands here
// with the count it used to hold — asserted at zero rather than deleted, so a
// rule that goes back to taking the value from the element fails against the
// closure that fixed it instead of reading as a facet nobody ever considered.
const CLOSED = [
  {
    id: 'B',
    facet: 'font-family',
    was: 5,
    why: 'A <button> is set in Arial before any author rule runs, and these five rules used not to '
      + 'say otherwise: .ui-drawer__close, .ui-toast__close, .toggle, .ui-fbc__x and .avatar. All '
      + 'five now declare `font: inherit` — the shorthand, because the family is only three '
      + 'quarters of one declaration and answering with the longhand leaves the size and the '
      + 'leading standing (entry C). Four of them repainted nothing — the drawer '
      + 'close, the toast close, the topbar toggle and the feedback composer dismiss are each one '
      + '<svg> and render zero text characters, measured by reading textContent off every story '
      + 'that renders them (60 renderings, all empty), so those four state the family the kit '
      + 'means without moving a pixel. The fifth did repaint and was meant to: .avatar carries the '
      + 'account initials, two characters that paint, and they painted in Arial in the shipped kit '
      + 'rather than in the kit face. The owner was shown that row before and after — circle '
      + 'unchanged at 32x32, initials landing on the same face as the label beside them — and '
      + 'accepted it, and the pull request this gate arrived in carries the before-and-after readings. '
      + 'Adding the shorthand moved it once more and by less: with the family longhand the '
      + 'initials sat 8.500px from the top of the circle, with `font: inherit` 7.875px, against '
      + '9.000px in the shipped kit — 32x32 box, 600 weight and 12.5px size unmoved in all '
      + 'three, measured in Chrome 152 off a Range rect over the two characters. What remains '
      + 'open is the text-align half, entry A above, and the leading half, entry C.',
  },
];

// The reason the deferred half is deferred rather than repaired here, which is a
// decision rather than a measurement and so belongs beside the count: the lane was
// asked to repair the rows a consumer cannot see and to leave the rows the kit
// already ships, because a change touching six components to fix one is a bigger
// trade than #251 asks for. Repainting more components inside this lane is that
// trade arriving by a different door, so the ledger records them and the lane
// leaves them; entries A and C each carry the pixels it would cost. What the gate
// refuses is a NEW one — the counts above move if one appears. The decision was
// taken in this lane and not in #251, whose comment thread is empty; the pull
// request this gate arrived in is where it is written down.

for (const entry of LEDGER) {
  for (const theme of THEMES) {
    test(`button chrome: ledger ${entry.id} — ${entry.facet} on rows the kit renders as buttons, ${theme}`, () => {
      const rows = findingsFor(theme).filter((f) => f.scope === 'deferred' && f.facet === entry.facet);
      assert.equal(
        rows.length, entry.count,
        `\nledger ${entry.id} holds ${rows.length} row(s) in ${theme}, the ledger says ${entry.count}:\n\n`
        + `${rows.map(show).join('\n')}\n\n`
        + 'The count is exact on purpose. If it shrank, move the facet to CLOSED with the count it '
        + 'used to hold and say who repaired it. If it grew, a person looks at the new row before '
        + 'the number moves.',
      );
    });
  }
}

for (const entry of CLOSED) {
  for (const theme of THEMES) {
    test(`button chrome: ledger ${entry.id} — ${entry.facet}, closed in this lane and staying closed, ${theme}`, () => {
      const rows = findingsFor(theme).filter((f) => f.scope === 'deferred' && f.facet === entry.facet);
      assert.equal(
        rows.length, 0,
        `\nledger ${entry.id} was closed — ${entry.was} row(s) repaired, ${entry.facet} left to no `
        + `rule the kit renders as a <button> — and ${rows.length} has come back in ${theme}:\n\n`
        + `${rows.map(show).join('\n')}\n\n`
        + 'This is a regression against a repair, not a new deferral. Either the rule below lost '
        + `its \`${entry.facet}\` declaration, or a new component was written without one. Fix the `
        + 'rule; do not move the facet back into LEDGER without the owner saying so.',
      );
    });
  }
}

test('button chrome: the ledger accounts for every deferred row, and nothing else', () => {
  // CLOSED facets are named here too, so a repaired facet coming back fails as
  // the regression it is — against the entry that closed it — rather than being
  // reported as a facet the ledger never considered.
  const named = new Set([...LEDGER, ...CLOSED].map((e) => e.facet));
  for (const theme of THEMES) {
    const rows = findingsFor(theme).filter((f) => f.scope === 'deferred');
    const orphans = rows.filter((f) => !named.has(f.facet));
    assert.deepEqual(
      orphans.map(show), [],
      `\nfound on a row the kit renders as a <button>, in a facet the ledger does not name, so it `
      + `would have been deferred by nobody's decision (${theme}):\n`,
    );
    assert.equal(
      rows.length, LEDGER.reduce((n, e) => n + e.count, 0),
      `${rows.length} deferred rows in ${theme}; the ledger accounts for `
      + `${LEDGER.reduce((n, e) => n + e.count, 0)}`,
    );
  }
});

test('button chrome: the ledger is not empty and every entry carries a hand-written why', () => {
  assert.ok(LEDGER.length > 0, 'an emptied ledger would defer everything and assert nothing');
  // Deleting a closed entry is the one edit that hollows this half out: the rows
  // stay repaired, every count still adds up, and the record of who repaired them
  // and why is simply gone. CLOSED only ever grows, so this can only fail on that.
  assert.ok(CLOSED.length > 0, 'the closed half was emptied — a repair this gate used to hold has lost its record');
  assert.ok(DEFERRED.length > 0, 'nothing is deferred, so the ledger describes a set that does not exist');
  for (const e of [...LEDGER, ...CLOSED]) {
    assert.ok(
      e.why && e.why.length > 200,
      `ledger ${e.id} has no real \`why\` — see CONTRIBUTING.md#a-gate-carries-a-ledger-of-what-it-does-not-reach`,
    );
    assert.ok(FACETS.some((f) => f.name === e.facet), `ledger ${e.id} names ${e.facet}, which is not a facet this gate reads`);
  }
  // A facet is deferred or it is repaired; it cannot be both, and a reader who
  // found it in each list would not know which of the two the gate believes.
  const open = new Set(LEDGER.map((e) => e.facet));
  assert.deepEqual(
    CLOSED.filter((e) => open.has(e.facet)).map((e) => e.facet), [],
    'a facet is in LEDGER and in CLOSED at once — deferred and repaired are exclusive',
  );
  // A closure that closed nothing is not a closure. `was` is the count the entry
  // held in LEDGER before the repair, and it is the only thing left saying the
  // rows were ever really there — an entry rewritten to `was: 0` would assert
  // zero against zero and read as history.
  for (const e of CLOSED) {
    assert.ok(
      Number.isInteger(e.was) && e.was > 0,
      `closed entry ${e.id} claims to have repaired ${e.was} row(s); a closure closes at least one`,
    );
  }
});

// ---- the gate's own gate --------------------------------------------------

test('button chrome: every clickable class the kit ships was placed', () => {
  assert.ok(CANDIDATES.size > 0, 'no `cursor: pointer` rule found — the sweep is not reading src/index.css');
  assert.equal(
    UNRENDERED.length, 0,
    'these classes are made clickable by the kit and appear in no story, so nothing can be measured '
    + 'about them — a subject a gate cannot check is a failure, never a skip:\n'
    + UNRENDERED.map(([cls, at]) => `  .${cls} (${at})`).join('\n'),
  );
  assert.equal(
    subjectClasses.length + deferredClasses.length + NOT_CONTROLS.length, CANDIDATES.size,
    'a clickable class fell out of the partition — every candidate is either a subject, deferred '
    + 'to the ledger, or accounted for as something the browser owns',
  );
  // The narrowing re-derived from the recording rather than trusted: a subject
  // the kit renders on a <button> somewhere belongs in the deferred half, and one
  // sitting here would mean the gate is failing a row somebody has already seen.
  const misfiled = SUBJECTS.filter((s) => SEEN.get(s.cls).tags.has('button'));
  assert.deepEqual(
    misfiled.map((s) => s.cls), [],
    'failed as unseen, yet rendered on a <button> by the kit itself:\n'
    + misfiled.map((s) => `  .${s.cls} (${s.at})`).join('\n'),
  );
  // The exclusion re-derived from what was recorded rather than from the flag
  // the walk set: a class the kit renders on a <button> ANYWHERE is a control by
  // the plainest reading there is, and finding one here means the walk decided
  // otherwise and quietly dropped a subject.
  const wrongly = NOT_CONTROLS.filter(([cls]) => SEEN.get(cls).tags.has('button'));
  assert.deepEqual(
    wrongly.map(([cls]) => cls), [],
    'left out of the measurement, yet rendered on a <button> by the kit itself:\n'
    + wrongly.map(([cls, at]) => `  .${cls} (${at})`).join('\n'),
  );
  // The claim that used to stand here — that a subject cannot leave the set
  // without one of the assertions above failing — was false, and asserting
  // something false is worse than asserting nothing. None of them moves when a
  // class slides from SUBJECTS into NOT_CONTROLS: the sum still holds because
  // the partition is three ways, UNRENDERED stays empty because the class is
  // still in the markup, and the survivors satisfy every "> 0". The names below
  // are what makes the sentence true.
});

test('button chrome: the subject set is the one a person wrote down', () => {
  const now = [...new Set(SUBJECTS.map((s) => s.cls))].sort();
  assert.deepEqual(
    now, [...PINNED_SUBJECTS].sort(),
    `\nthe classes this gate FAILS on are not the ones pinned by name.\n\n`
    + `  pinned:   ${[...PINNED_SUBJECTS].sort().join(', ') || '(none)'}\n`
    + `  measured: ${now.join(', ') || '(none)'}\n\n`
    + 'One MORE than the pin is a new clickable class nobody has looked at as a <button> — read it, '
    + 'repair it, then add the name. One FEWER is the dangerous direction: a class stopped being '
    + 'measured, and every derived count in this file still adds up while it happens. Reproduced '
    + 'before this test existed by deleting one `tabindex="-1"` from the dropdown component, which '
    + 'took .ui-dropdown__item out of the set and passed the whole of #251 at exit 0. Do not delete '
    + 'a name here to make a run green.',
  );
});

test('button chrome: the only thing left out is a form control the browser owns', () => {
  const now = Object.fromEntries(NOT_CONTROLS.map(([cls]) => [cls, [...SEEN.get(cls).tags].sort().join('/')]));
  assert.deepEqual(
    now, PINNED_OWNED,
    '\nthe excluded bucket is not what it is written down as. It holds classes this gate measures '
    + 'nothing about, so it is the one place a defect can sit unasserted — a class arriving here is '
    + 'a subject leaving, and a class whose element changed is a claim that stopped being true.\n\n'
    + `  pinned:   ${JSON.stringify(PINNED_OWNED)}\n`
    + `  measured: ${JSON.stringify(now)}\n`,
  );
  // The claim each name makes, re-derived rather than trusted: the element has to
  // be one the browser owns, or the exclusion is a technicality rather than a
  // reason. `.ui-fbpill` sat here on one until this was written — a bare <div>
  // with cursor: pointer and no role, unmeasured, carrying the whole of #251.
  for (const [cls, tag] of Object.entries(now)) {
    assert.ok(
      OWNED_BY_BROWSER.has(tag) || tag === 'span',
      `.${cls} is left out of the measurement as a <${tag}>, which is not a form control the browser `
      + 'owns — either it belongs in the measured set or this list is wrong',
    );
  }
});

test('button chrome: the failing half is read everywhere it is rendered', () => {
  // The narrowing that used to be silent, made a rule instead. A subject is read
  // in every distinct ancestry a story gives it, because a cascade is a property
  // of where an element sits — `.ui-nav .ui-nav__item` is (0,2,0) and resolves to
  // nothing outside the rail — and the failing half is what a green run is
  // load-bearing about. The deferred half keeps one reading each; that is the
  // narrowing, and it is in the header's ledger with the numbers it costs.
  for (const [cls] of subjectClasses) {
    assert.equal(
      SUBJECTS.filter((s) => s.cls === cls).length, anc(cls).length,
      `.${cls} is rendered in ${anc(cls).length} distinct ancestries and `
      + `${SUBJECTS.filter((s) => s.cls === cls).length} were measured — a subject is read in all of them`,
    );
  }
  for (const [cls] of deferredClasses) {
    assert.equal(
      DEFERRED.filter((d) => d.cls === cls).length, 1,
      `.${cls} contributes ${DEFERRED.filter((d) => d.cls === cls).length} readings to the ledger counts; `
      + 'a deferred class contributes exactly one, or the pinned counts stop meaning rows',
    );
  }
  // Reported rather than pinned: these move whenever somebody writes a story,
  // and a number that fires on story authoring teaches people to edit it.
  const seenAnc = deferredClasses.reduce((n, [cls]) => n + anc(cls).length, 0);
  const seenAll = deferredClasses.reduce((n, [cls]) => n + SEEN.get(cls).places, 0);
  assert.ok(
    seenAnc >= deferredClasses.length,
    `deferred: ${deferredClasses.length} classes, ${seenAll} renderings, ${seenAnc} distinct ancestries, `
    + `${deferredClasses.length} read`,
  );
});

test('button chrome: every story was read', () => {
  assert.equal(SURVEY.files, storyFiles.length, 'every story file was walked');
  assert.ok(SURVEY.stories > 0, 'stories were discovered');
  assert.equal(
    SURVEY.unrenderable.length, 0,
    `a story that will not render contributes no markup, and the survey cannot see what it carried:\n${
      SURVEY.unrenderable.join('\n')}`,
  );
  assert.equal(SURVEY.rendered, SURVEY.stories, `${SURVEY.stories} stories discovered, ${SURVEY.rendered} rendered`);
});

test('button chrome: every measured class was read on every facet, in every theme', () => {
  assert.ok(SUBJECTS.length > 0, 'nothing is a subject — the narrowing has swallowed the whole set');
  // The narrowing changed which findings FAIL. It did not change what is
  // measured, so the count still covers the deferred half: a class that stopped
  // being read would take its ledger row with it and pass by absence.
  for (const theme of THEMES) findingsFor(theme);
  const measured = SUBJECTS.length + DEFERRED.length;
  assert.equal(
    tally.checks, measured * FACETS.length * THEMES.length,
    `${measured} measured classes × ${FACETS.length} facets × ${THEMES.length} themes = `
    + `${measured * FACETS.length * THEMES.length} readings expected, took ${tally.checks}`,
  );
});

test('button chrome: the stand-in is what a browser does, and the kit can beat it', () => {
  const { css } = kitCssFor('dark');
  const w = new JSDOM(
    '<!doctype html><html lang="en" data-theme="dark">'
    + `<head><style>${STANDIN}${css}</style></head>`
    + '<body><div data-ua-chrome></div><div data-ua-bare></div>'
    + '<div class="ui-nav"><a class="ui-nav__item" href="#x" data-ua-chrome></a>'
    + '<a class="ui-nav__item" href="#x" data-ua-bare></a></div></body></html>',
    { pretendToBeVisual: true },
  ).window;
  const q = (sel) => capture(w.document.querySelector(sel), w);

  // 1. With no class on it, the two stand-ins disagree about all five. If jsdom
  //    ever stops resolving one of them, every subject silently matches and the
  //    gate passes on nothing.
  const chrome = q('body > [data-ua-chrome]');
  const bare = q('body > [data-ua-bare]');
  for (const facet of FACETS) {
    assert.notEqual(
      chrome[facet.name], bare[facet.name],
      `the stand-in resolves ${facet.name} to ${chrome[facet.name]} either way — jsdom is not `
      + 'applying one of the two baselines, so no subject can fail this facet',
    );
  }
  assert.equal(chrome.appearance, 'auto', 'the chrome stand-in lost `appearance: auto`, so the exemptions never lift');
  assert.equal(chrome.width, 'fit-content', 'jsdom no longer resolves `fit-content`; the width facet measures nothing');

  // 2. .ui-nav__item is the rule #251 names as the correct one. It has to come
  //    out identical on both, or a green result below would mean nothing.
  const navChrome = q('.ui-nav__item[data-ua-chrome]');
  const navBare = q('.ui-nav__item[data-ua-bare]');
  assert.equal(navChrome.cursor, 'pointer', 'the kit stylesheet did not reach the document — nothing here measures the kit');
  for (const facet of FACETS) {
    assert.equal(
      navChrome[facet.name], navBare[facet.name],
      `.ui-nav__item does not cancel ${facet.name} (${navChrome[facet.name]} vs ${navBare[facet.name]}) — `
      + 'the reference rule the issue is written against no longer resolves, so a red result above '
      + 'may be the harness rather than the kit',
    );
  }
  w.close();
});
