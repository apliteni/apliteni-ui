// The hover readout: an overlay in every state, placed against its mark.
//
// The guarantee is that showing a readout moves nothing on the page. JSDOM has
// no layout, so it is held from two sides: the stylesheet is read as text, where
// the defect would be a declaration putting the readout back into flow, and the
// wiring is watched with a MutationObserver, where the defect would be a node
// inserted on hover. Placement is arithmetic, fed measured rects by hand.
//
// why: docs/specification.md#the-hover-readout

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { tooltip, wireTooltip, showTooltip, hideTooltip } from './tooltip.js';

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});

const CSS = readFileSync(new URL('../styles/tooltip.css', import.meta.url), 'utf8');
const JS = readFileSync(new URL('./tooltip.js', import.meta.url), 'utf8');

/** Every leaf rule in a sheet as { selector, body }, comments stripped. */
function rules(css) {
  const out = [];
  const open = [];
  let buf = '';
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '{') { open.push(buf.trim()); buf = ''; } else if (ch === '}') {
      const selector = open.pop() ?? '';
      if (buf.trim()) out.push({ selector, body: buf.trim() });
      buf = '';
    } else buf += ch;
  }
  return out;
}

const RULES = rules(CSS);
const decl = (rule, prop) => {
  const m = [...rule.body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`, 'g'))];
  return m.length ? m[m.length - 1][1].trim() : null;
};
// A rule about the readout box itself — not its host, not its parts.
const isReadout = (selector) => selector.split(',').some((s) => /\.ui-tip(?![\w-])/.test(s));
const base = RULES.find((r) => r.selector.trim() === '.ui-tip');

// ---- The stylesheet ------------------------------------------------------
// The subjects are discovered from the sheet, so a new state joins the sweep by
// being written.
// why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them

test('the readout is out of flow in every state the sheet gives it', () => {
  const subjects = RULES.filter((r) => isReadout(r.selector));
  assert.ok(subjects.length >= 3, `found ${subjects.length} readout rules — the sweep is broken, not the sheet`);
  assert.equal(decl(base, 'position'), 'absolute', 'the base readout is absolutely placed');
  for (const rule of subjects) {
    const position = decl(rule, 'position');
    if (position === null) continue;
    assert.match(
      position, /^(absolute|fixed)$/,
      `${rule.selector} puts the readout in flow (position: ${position}), and a readout in flow `
      + 'pushes the page when it opens — the fault this component exists to prevent',
    );
  }
});

test('opening the readout changes paint, never a box', () => {
  const open = RULES.find((r) => r.selector.trim() === '.ui-tip.is-open');
  assert.ok(open, 'the sheet has no open state');
  const props = [...open.body.matchAll(/(?:^|;)\s*([\w-]+)\s*:/g)].map((m) => m[1]);
  assert.deepEqual(props.sort(), ['opacity', 'visibility'],
    'the open state may only change opacity and visibility — a size, a display or a margin in it '
    + 'is a readout that takes up room the moment it appears');
});

test('the readout never takes the pointer', () => {
  assert.equal(decl(base, 'pointer-events'), 'none');
});

test('both placements read one gap, so neither can drift from the other', () => {
  const gap = decl(base, '--ui-tip-gap');
  assert.match(gap, /^\d+(\.\d+)?px$/, '--ui-tip-gap is declared on the readout as a length');
  const offsets = RULES.filter((r) => isReadout(r.selector)).map((r) => decl(r, 'translate')).filter(Boolean);
  assert.ok(offsets.length >= 2, 'an above offset and a below one');
  for (const value of offsets) {
    assert.match(value, /var\(--ui-tip-gap\)/, `${value} writes its own offset instead of reading --ui-tip-gap`);
  }
});

test('the wiring falls back to the number the sheet declares', () => {
  const css = parseFloat(decl(base, '--ui-tip-gap'));
  const js = parseFloat(/const TIP_GAP = ([\d.]+)/.exec(JS)?.[1]);
  assert.equal(js, css, 'TIP_GAP in tooltip.js is the fallback for a document without the sheet');
});

// ---- The markup ----------------------------------------------------------

test('the readout is a tooltip, closed and above by default', () => {
  const html = tooltip({ label: 'Mar 2026', value: '€48,210' });
  assert.match(html, /^<div class="ui-tip" role="tooltip" data-tip>/);
  assert.doesNotMatch(html, /is-open|is-below|style=/);
});

test('an empty readout claims no role until it has something to name it', () => {
  assert.doesNotMatch(tooltip(), /role=/, 'a tooltip with no text has no accessible name');
  assert.match(tooltip({ value: 0 }), /role="tooltip"/, 'zero is a value');
  const window = mount(MARKS + tooltip());
  const doc = window.document;
  const tip = measure(window);
  wireTooltip(doc);
  pointer(window, doc.getElementById('m1'), 'pointerover');
  assert.equal(tip.getAttribute('role'), 'tooltip');
});

test('an empty part is hidden rather than left as a blank line', () => {
  const html = tooltip({ value: '€48,210' });
  assert.match(html, /<span class="ui-tip__label" hidden><\/span>/);
  assert.match(html, /<span class="ui-tip__value">€48,210<\/span>/);
  assert.match(html, /<span class="ui-tip__detail" hidden><\/span>/);
});

test('text is escaped, never read as markup', () => {
  const html = tooltip({ label: '<b>Q1</b>', value: '"1 & 2"' });
  assert.match(html, /&lt;b&gt;Q1&lt;\/b&gt;/);
  assert.match(html, /&quot;1 &amp; 2&quot;/);
});

test('rendered open, it carries its own place and side', () => {
  const html = tooltip({ value: '1', open: true, x: 120, y: 18, placement: 'bottom', id: 'spark-tip' });
  assert.match(html, /class="ui-tip is-below is-open"/);
  assert.match(html, /id="spark-tip"/);
  assert.match(html, /style="--ui-tip-x:120px;--ui-tip-y:18px"/);
  assert.doesNotMatch(tooltip({ x: '120; color: red' }), /style=/, 'only a number becomes a position');
});

// ---- The wiring ----------------------------------------------------------
// JSDOM lays nothing out, so every rect below is supplied. The arithmetic under
// test is the wiring's, not the browser's.

const VIEW = { w: 1280, h: 800 };

const MARKS = `<svg width="300" height="100">
  <rect id="m1" data-tip-label="Jan" data-tip-value="€41,000" width="20" height="60"></rect>
  <rect id="m2" data-tip-label="Feb" data-tip-value="€46,210" data-tip-detail="+12.7% on January" width="20" height="80"></rect>
</svg>`;

function mount(inner, { hostStyle = '', outer = '', gutter = 0 } = {}) {
  const html = `<main id="page"><div id="clip" style="${outer}">`
    + `<div class="ui-tip-host" data-tip-host id="host" style="${hostStyle}">${inner}</div>`
    + '</div><p id="below">Next section</p></main>';
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    pretendToBeVisual: true, virtualConsole: quiet,
  });
  const { window } = dom;
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { value: window[key] ?? window, configurable: true, writable: true });
  }
  // The window reaches under its scrollbars; the viewport a readout can be seen in stops at them.
  Object.defineProperty(window, 'innerHeight', { value: VIEW.h + gutter, configurable: true });
  Object.defineProperty(window, 'innerWidth', { value: VIEW.w + gutter, configurable: true });
  Object.defineProperty(window.document.documentElement, 'clientHeight', { value: VIEW.h, configurable: true });
  Object.defineProperty(window.document.documentElement, 'clientWidth', { value: VIEW.w, configurable: true });
  return window;
}

const rect = (left, top, width, height) => () => ({
  left, top, width, height, right: left + width, bottom: top + height, x: left, y: top,
});

/** Give the host, the marks, the clip box and the readout the boxes a browser would. */
function measure(window, { host = [100, 300, 300, 100], m1 = [110, 340, 20, 60], m2 = [150, 320, 20, 80], clip, tip = [140, 52] } = {}) {
  const doc = window.document;
  doc.getElementById('host').getBoundingClientRect = rect(...host);
  doc.getElementById('m1').getBoundingClientRect = rect(...m1);
  doc.getElementById('m2').getBoundingClientRect = rect(...m2);
  if (clip) doc.getElementById('clip').getBoundingClientRect = rect(...clip);
  const readout = doc.querySelector('[data-tip]');
  Object.defineProperty(readout, 'offsetWidth', { value: tip[0], configurable: true });
  Object.defineProperty(readout, 'offsetHeight', { value: tip[1], configurable: true });
  return readout;
}

const pointer = (window, el, type) =>
  el.dispatchEvent(new window.MouseEvent(type, { bubbles: type !== 'pointerleave', cancelable: true }));
const var_ = (el, name) => el.style.getPropertyValue(name);

test('hovering marks adds no node to the page, and leaving removes none', () => {
  const window = mount(MARKS + tooltip());
  const doc = window.document;
  measure(window);
  wireTooltip(doc);

  const changes = [];
  new window.MutationObserver((list) => changes.push(...list))
    .observe(doc.getElementById('page'), { childList: true, subtree: true, attributes: true, characterData: true });

  pointer(window, doc.getElementById('m1'), 'pointerover');
  pointer(window, doc.getElementById('m2'), 'pointerover');
  pointer(window, doc.getElementById('host'), 'pointerleave');

  return new Promise((resolve) => setTimeout(() => {
    const tip = doc.querySelector('[data-tip]');
    const tree = changes.filter((c) => c.type === 'childList' && c.target.closest?.('[data-tip]') !== tip && c.target !== tip);
    assert.deepEqual(tree, [], 'the only children that change are the readout\'s own text');
    const touched = new Set(changes.map((c) => (c.target.nodeType === 1 ? c.target : c.target.parentElement)));
    for (const el of touched) {
      assert.ok(
        el === tip || tip.contains(el) || el.hasAttribute('data-tip-value'),
        `hovering changed ${el.outerHTML.slice(0, 60)}, which is neither the readout nor a mark`,
      );
    }
    assert.equal(doc.getElementById('page').lastElementChild.id, 'below');
    resolve();
  }, 0));
});

test('a host with no readout is given one when wired, never on hover', () => {
  const window = mount(MARKS);
  const doc = window.document;
  wireTooltip(doc);
  assert.equal(doc.querySelectorAll('[data-tip]').length, 1);
  wireTooltip(doc);
  assert.equal(doc.querySelectorAll('[data-tip]').length, 1, 'wiring twice adds nothing');
});

test('a mark fills the readout as text, and an empty part is hidden', () => {
  const window = mount(MARKS.replace('€41,000', '&lt;b&gt;41&lt;/b&gt;') + tooltip());
  const doc = window.document;
  const tip = measure(window);
  wireTooltip(doc);

  pointer(window, doc.getElementById('m1'), 'pointerover');
  assert.ok(tip.classList.contains('is-open'));
  assert.equal(tip.querySelector('.ui-tip__label').textContent, 'Jan');
  assert.equal(tip.querySelector('.ui-tip__value').textContent, '<b>41</b>');
  assert.equal(tip.querySelector('.ui-tip__value').children.length, 0, 'no element was parsed out of a value');
  assert.equal(tip.querySelector('.ui-tip__detail').hidden, true);

  pointer(window, doc.getElementById('m2'), 'pointerover');
  assert.equal(tip.querySelector('.ui-tip__detail').textContent, '+12.7% on January');
  assert.equal(tip.querySelector('.ui-tip__detail').hidden, false);
});

test('the readout opens above the mark, centred on it, inside the host', () => {
  const window = mount(MARKS + tooltip());
  const tip = measure(window);
  wireTooltip(window.document);
  pointer(window, window.document.getElementById('m2'), 'pointerover');
  assert.equal(tip.classList.contains('is-below'), false);
  assert.equal(var_(tip, '--ui-tip-x'), '60px', 'mark centre 160 - host left 100');
  assert.equal(var_(tip, '--ui-tip-y'), '20px', 'mark top 320 - host top 300');
  assert.equal(var_(tip, '--ui-tip-shift'), '0px');
});

test('clipped at the top of the viewport, it flips below the mark', () => {
  const window = mount(MARKS + tooltip());
  const tip = measure(window, { host: [100, 10, 300, 100], m2: [150, 30, 20, 80] });
  wireTooltip(window.document);
  pointer(window, window.document.getElementById('m2'), 'pointerover');
  assert.ok(tip.classList.contains('is-below'), '30px above, 52 + 8 needed, 690 below');
  assert.equal(var_(tip, '--ui-tip-y'), '100px', 'mark bottom 110 - host top 10');
});

test('clipped by an ancestor that hides its overflow, it flips too', () => {
  const window = mount(MARKS + tooltip(), { outer: 'overflow: hidden' });
  const tip = measure(window, { clip: [80, 290, 340, 400] });
  wireTooltip(window.document);
  pointer(window, window.document.getElementById('m2'), 'pointerover');
  assert.ok(tip.classList.contains('is-below'), 'the card edge at 290 leaves 30px above the mark');
});

test('it stays above when below is no roomier', () => {
  const window = mount(MARKS + tooltip());
  const tip = measure(window, { host: [100, 10, 300, 780], m2: [150, 30, 20, 760] });
  wireTooltip(window.document);
  pointer(window, window.document.getElementById('m2'), 'pointerover');
  assert.equal(tip.classList.contains('is-below'), false, '30px above beats 10px below');
});

test('an author\'s below flips up only when below is the side clipped', () => {
  const window = mount(MARKS + tooltip({ placement: 'bottom' }));
  const tip = measure(window, { host: [100, 690, 300, 100], m2: [150, 700, 20, 80] });
  wireTooltip(window.document);
  pointer(window, window.document.getElementById('m2'), 'pointerover');
  assert.equal(tip.classList.contains('is-below'), false, '20px below, 700 above');

  const roomy = mount(MARKS + tooltip({ placement: 'bottom' }));
  const roomyTip = measure(roomy);
  wireTooltip(roomy.document);
  pointer(roomy, roomy.document.getElementById('m2'), 'pointerover');
  assert.ok(roomyTip.classList.contains('is-below'), 'room below, so it stays where it was put');
});

test('at an edge it slides inward, no further than it has to', () => {
  const window = mount(MARKS + tooltip());
  const tip = measure(window, { host: [0, 300, 300, 100], m1: [4, 340, 20, 60] });
  wireTooltip(window.document);
  pointer(window, window.document.getElementById('m1'), 'pointerover');
  assert.equal(var_(tip, '--ui-tip-x'), '14px', 'still anchored on the mark');
  assert.equal(var_(tip, '--ui-tip-shift'), '56px', 'ideal left -56 slid to the viewport edge at 0');

  const right = mount(MARKS + tooltip());
  const rightTip = measure(right, { host: [1000, 300, 280, 100], m2: [1250, 320, 20, 80] });
  wireTooltip(right.document);
  pointer(right, right.document.getElementById('m2'), 'pointerover');
  assert.equal(var_(rightTip, '--ui-tip-shift'), '-50px', 'ideal right 1330 slid back to 1280');
});

test('the viewport it stays inside ends where the scrollbars begin', () => {
  const window = mount(MARKS + tooltip(), { gutter: 15 });
  const tip = measure(window, { host: [1000, 300, 280, 100], m2: [1250, 320, 20, 80] });
  wireTooltip(window.document);
  pointer(window, window.document.getElementById('m2'), 'pointerover');
  assert.equal(var_(tip, '--ui-tip-shift'), '-50px', 'slid back to 1280, not under the scrollbar to 1295');

  const low = mount(MARKS + tooltip({ placement: 'bottom' }), { gutter: 15 });
  const lowTip = measure(low, { host: [100, 600, 300, 145], m2: [150, 665, 20, 80] });
  wireTooltip(low.document);
  pointer(low, low.document.getElementById('m2'), 'pointerover');
  assert.equal(lowTip.classList.contains('is-below'), false,
    '55px below the mark before the scrollbar, 60 needed: it flips up rather than open under the bar');
});

test('a mark\'s anchor places the readout; the mark is still what is hovered', () => {
  const window = mount(MARKS.replace('<rect id="m2"', '<g id="m2"').replace(
    'height="80"></rect>', 'height="80"><circle id="dot" data-tip-anchor r="3"></circle></g>',
  ) + tooltip());
  const tip = measure(window);
  window.document.getElementById('dot').getBoundingClientRect = rect(157, 350, 6, 6);
  wireTooltip(window.document);
  pointer(window, window.document.getElementById('m2'), 'pointerover');
  assert.equal(var_(tip, '--ui-tip-x'), '60px', 'dot centre 160 - host left 100');
  assert.equal(var_(tip, '--ui-tip-y'), '50px', 'dot top 350 - host top 300');
});

test('leaving the marks hides it; leaving the host hides it', () => {
  const window = mount(MARKS + tooltip());
  const doc = window.document;
  const tip = measure(window);
  wireTooltip(doc);
  pointer(window, doc.getElementById('m1'), 'pointerover');
  pointer(window, doc.querySelector('svg'), 'pointerover');
  assert.equal(tip.classList.contains('is-open'), false, 'the gap between two bars is not a mark');
  pointer(window, doc.getElementById('m1'), 'pointerover');
  pointer(window, doc.getElementById('host'), 'pointerleave');
  assert.equal(tip.classList.contains('is-open'), false);
});

test('focus on a mark shows it, and describes the mark while it does', () => {
  const window = mount(MARKS.replace('id="m1"', 'id="m1" tabindex="0"') + tooltip());
  const doc = window.document;
  const tip = measure(window);
  wireTooltip(doc);
  const m1 = doc.getElementById('m1');
  m1.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
  assert.ok(tip.classList.contains('is-open'));
  assert.equal(m1.getAttribute('aria-describedby'), tip.id);
  m1.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: doc.getElementById('below') }));
  assert.equal(tip.classList.contains('is-open'), false);
  assert.equal(m1.hasAttribute('aria-describedby'), false, 'the description goes with the readout');
});

test('a mark\'s own description is left alone', () => {
  const window = mount(MARKS.replace('id="m1"', 'id="m1" aria-describedby="note"') + tooltip());
  const doc = window.document;
  measure(window);
  showTooltip(doc.getElementById('host'), doc.getElementById('m1'));
  hideTooltip(doc.getElementById('host'));
  assert.equal(doc.getElementById('m1').getAttribute('aria-describedby'), 'note');
});

test('Escape dismisses it, and it returns on the next mark, not the same one', () => {
  const window = mount(MARKS + tooltip());
  const doc = window.document;
  const tip = measure(window);
  wireTooltip(doc);
  pointer(window, doc.getElementById('m1'), 'pointerover');
  doc.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(tip.classList.contains('is-open'), false);
  pointer(window, doc.getElementById('m1'), 'pointerover');
  assert.equal(tip.classList.contains('is-open'), false, 'dismissed from this mark, it stays dismissed');
  pointer(window, doc.getElementById('m2'), 'pointerover');
  assert.ok(tip.classList.contains('is-open'));
});

test('Escape takes the mark\'s description with the readout', () => {
  const window = mount(MARKS + tooltip());
  const doc = window.document;
  const tip = measure(window);
  wireTooltip(doc);
  const m1 = doc.getElementById('m1');
  pointer(window, m1, 'pointerover');
  assert.equal(m1.getAttribute('aria-describedby'), tip.id);
  doc.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(m1.hasAttribute('aria-describedby'), false,
    'a hidden readout still describes the mark that points at it');
});

test('Escape dismisses a readout showTooltip opened on a host nobody wired', () => {
  const window = mount(MARKS + tooltip());
  const doc = window.document;
  const tip = measure(window);
  showTooltip(doc.getElementById('host'), doc.getElementById('m2'));
  assert.ok(tip.classList.contains('is-open'));
  doc.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(tip.classList.contains('is-open'), false);
  assert.equal(doc.getElementById('m2').hasAttribute('aria-describedby'), false);
});

test('Escape leaves alone a readout rendered open that the kit never showed', () => {
  const window = mount(MARKS + tooltip());
  const doc = window.document;
  measure(window);
  doc.getElementById('below').insertAdjacentHTML('afterend',
    `<div class="ui-tip-host" id="picture">${tooltip({ value: '€48,210', open: true })}</div>`);
  wireTooltip(doc);
  pointer(window, doc.getElementById('m1'), 'pointerover');
  doc.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(doc.querySelector('#host [data-tip]').classList.contains('is-open'), false,
    'the live readout closes, so the test is not vacuous');
  assert.ok(doc.querySelector('#picture [data-tip]').classList.contains('is-open'), 'the picture stays open');
});

test('wiring makes a host that places nothing the box its readout is placed in', () => {
  const window = mount(MARKS + tooltip());
  const host = window.document.getElementById('host');
  host.className = '';
  wireTooltip(window.document);
  assert.equal(getComputedStyle(host).position, 'relative',
    'a static host leaves the readout placed against some ancestor, px away from its mark');

  const placed = mount(MARKS + tooltip(), { hostStyle: 'position: absolute' });
  wireTooltip(placed.document);
  assert.equal(placed.document.getElementById('host').style.position, 'absolute',
    'a host already positioned keeps its own position');
});

test('hosts nest: a mark answers to its nearest host, with that host\'s own readout', () => {
  const window = mount(`<div class="ui-tip-host" data-tip-host id="inner">${MARKS}${tooltip()}</div>`
    + '<span id="own" data-tip-label="Year" data-tip-value="€560,000"></span>');
  const doc = window.document;
  wireTooltip(doc);
  const tips = [...doc.querySelectorAll('[data-tip]')];
  assert.equal(tips.length, 2, 'the outer host is given a readout of its own, not handed the inner one');
  const [innerTip, outerTip] = tips;
  assert.ok(doc.getElementById('inner').contains(innerTip));

  pointer(window, doc.getElementById('m1'), 'pointerover');
  assert.ok(innerTip.classList.contains('is-open'));
  assert.equal(outerTip.classList.contains('is-open'), false, 'one mark opens one readout, its nearest host\'s');

  pointer(window, doc.getElementById('own'), 'pointerover');
  assert.ok(outerTip.classList.contains('is-open'));
  assert.equal(outerTip.querySelector('.ui-tip__value').textContent, '€560,000');
  assert.equal(innerTip.querySelector('.ui-tip__value').textContent, '€41,000', 'the inner readout was not re-filled');
});

test('a host wired before it is in the document is made the box once it is in one', () => {
  const window = mount('');
  const doc = window.document;
  doc.head.insertAdjacentHTML('beforeend', '<style>.overlay { position: absolute; }</style>');
  // A browser resolves no style outside the document and reads position as ''; JSDOM
  // resolves one anyway, so it is made to answer the way a browser does.
  const real = globalThis.getComputedStyle;
  globalThis.getComputedStyle = (el, ...rest) =>
    (el.isConnected ? real(el, ...rest) : { position: '', getPropertyValue: () => '' });
  try {
    const plain = doc.createElement('div');
    const placed = doc.createElement('div');
    placed.className = 'overlay';
    for (const host of [plain, placed]) {
      host.setAttribute('data-tip-host', '');
      host.innerHTML = MARKS;
      wireTooltip(host);
      doc.getElementById('page').append(host);
      pointer(window, host.querySelector('[data-tip-value]'), 'pointerover');
    }
    assert.equal(getComputedStyle(plain).position, 'relative',
      'wired while detached and never positioned, its readout is placed against some ancestor');
    assert.equal(getComputedStyle(placed).position, 'absolute',
      'a host its own stylesheet positions keeps that position, which reading \'\' as static would override');
  } finally {
    globalThis.getComputedStyle = real;
  }
});
