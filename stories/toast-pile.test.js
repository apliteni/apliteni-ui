/* The collapsed toast pile: what the script measures, what the sheet draws, and
 * the seam between them.
 *
 * The pile is deliberately split in two. A script measures — it is the only
 * thing that knows how tall a notice ended up once its text wrapped — and the
 * stylesheet switches, so hover and focus never wait on a listener and the
 * reduced-motion net reaches the fan-out like any other transition. That split
 * only holds while both halves name the same custom properties, which is what
 * the first half of this file walks: the properties are DISCOVERED from each
 * side and compared, rather than listed here where they would rot.
 *
 * Coverage limits:
 * - JSDOM lays nothing out, so every height below is stubbed. Whether the
 *   published offsets land where they are meant to on screen is a browser
 *   question, answered by the captures on the pull request.
 * - JSDOM evaluates no media query and no :hover, so the sheet's switch is read
 *   as text here, never applied.
 * - The arithmetic itself belongs to src/logic/toast-stack.test.js.
 */
import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { CollapsedStack } from './components/CalloutToast.stories.js';

const SHEET = 'src/styles/callout.css';
const SCRIPT = 'src/components/toasts.js';
const css = readFileSync(SHEET, 'utf8');
const script = readFileSync(SCRIPT, 'utf8');

/* -- The seam: the script publishes exactly what the sheet reads -------------- */

/** Every `--toast-*` custom property the script writes through setProperty. */
const published = new Set(
  [...script.matchAll(/setProperty\(\s*'(--toast-[\w-]+)'/g)].map(([, name]) => name),
);
/** Every `--toast-*` the script takes back through removeProperty. */
const withdrawn = new Set(
  [...script.matchAll(/removeProperty\(\s*'(--toast-[\w-]+)'/g)].map(([, name]) => name),
);

/** Every rule in the sheet, as selector and body. Comments are blanked first,
 *  because a comma inside one would otherwise split a selector list. */
const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, ' ').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));

/** The sheet's rules for the collapsed stack, selector and body. */
const pileRules = [...css.matchAll(/(\.ui-toast-stack--collapsed[^{}]*)\{([^}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));

test('the sheet has a collapsed stack to check at all', () => {
  assert.ok(pileRules.length >= 4,
    `${SHEET} has ${pileRules.length} \`.ui-toast-stack--collapsed\` rules. The pile needs at least `
    + 'the stack, the resting card, the fanned stack and the fanned card.');
  assert.ok(published.size > 0, `${SCRIPT} publishes no --toast-* property, so there is no pile to draw.`);
});

test('every property the script publishes is read by the sheet', () => {
  const read = pileRules.map((rule) => rule.body).join('\n');
  const unread = [...published].filter((name) => !new RegExp(`var\\(\\s*${name}[,)]`).test(read));
  assert.deepEqual(unread, [],
    `${SCRIPT} measures and publishes ${unread.join(', ')}, and no collapsed-stack rule in ${SHEET} `
    + 'reads it. A published property nothing draws is measurement thrown away.');
});

test('every property the sheet reads is published by the script', () => {
  const wanted = new Set(
    pileRules.flatMap((rule) => [...rule.body.matchAll(/var\(\s*(--toast-(?:card|pile|fan)[\w-]*)/g)])
      .map(([, name]) => name),
  );
  assert.ok(wanted.size > 0, `${SHEET}: the collapsed rules read no measured property.`);
  const missing = [...wanted].filter((name) => !published.has(name));
  assert.deepEqual(missing, [],
    `${SHEET} draws the pile from ${missing.join(', ')}, which ${SCRIPT} never sets. Each one falls `
    + 'back to its default, so those cards stay stacked on top of each other.');
});

test('clearing a pile takes back every property applying one wrote', () => {
  assert.deepEqual([...published].sort(), [...withdrawn].sort(),
    `${SCRIPT}: applyToastPile() and clearToastPile() no longer name the same properties. Whatever `
    + 'is left behind keeps pinning a card after the stack has gone back to a plain column.');
});

test('the fan-out is keyed on both the pointer and focus', () => {
  for (const state of [':hover', ':focus-within']) {
    const fanning = pileRules.filter((rule) => rule.selector.includes(state));
    assert.ok(fanning.length >= 2,
      `${SHEET} has ${fanning.length} collapsed-stack rules on \`${state}\`. The stack's own height and `
      + 'its cards both have to move, so a pile that opens needs at least two.');
  }
});

test('a collapsed stack pauses every timer line in the pile', () => {
  const paused = rules.filter((rule) => rule.body.includes('animation-play-state: paused'));
  const selector = paused.map((rule) => rule.selector).join('\n');
  for (const state of [':hover', ':focus-within']) {
    assert.ok(selector.includes(`.ui-toast-stack--collapsed${state} > .ui-toast > .ui-toast__timer.is-running`),
      `${SHEET}: a collapsed stack on \`${state}\` does not pause every timer line it contains.`);
  }
});

test('a collapsed stack is keyboard focusable and clips tall back cards', () => {
  const stack = pileRules.find((rule) => rule.selector === '.ui-toast-stack--collapsed');
  assert.ok(stack?.body.includes('overflow: hidden'),
    `${SHEET}: the collapsed stack does not clip a taller back card that would protrude below the front card.`);
  assert.ok(rules.some((rule) => rule.selector === '.ui-toast-stack--collapsed:focus-visible'),
    `${SHEET}: the keyboard entry point for a collapsed stack has no visible focus style.`);
  assert.ok(script.includes("setAttribute('tabindex', '0')"),
    `${SCRIPT}: a collapsed stack with no action or close button has no keyboard entry point.`);
});

test('a resting card is placed with translate and scale, never transform', () => {
  const card = pileRules.find((rule) => /^\.ui-toast-stack--collapsed\s*>\s*\.ui-toast$/.test(rule.selector));
  assert.ok(card, `${SHEET} no longer has a plain \`.ui-toast-stack--collapsed > .ui-toast\` rule.`);
  for (const property of ['translate:', 'scale:']) {
    assert.ok(card.body.includes(property), `${SHEET}: the resting card sets no \`${property}\``);
  }
  assert.ok(!/(?:^|[;{\s])transform:/.test(card.body),
    `${SHEET}: the resting card sets \`transform\`. \`ui-toast-in\` animates transform with `
    + '`animation-fill-mode: both`, which holds its last keyframe after it ends and overwrites any '
    + 'transform written here — the pile would look right until the entrance finished, then flatten.');
});

test('the React stack keeps its corner when it collapses', () => {
  // The collapsed stack asks for `position: relative`, which ties with a plain
  // `.rx-toast-stack { position: fixed }` on specificity. A tie is settled by
  // load order, and nothing here decides which sheet a consumer loads first.
  const react = readFileSync('react/src/Toast.css', 'utf8');
  const rule = /([^{}]*\.rx-toast-stack[^{},]*)\{([^}]*position:\s*fixed[^}]*)\}/.exec(react);
  assert.ok(rule, 'react/src/Toast.css no longer fixes the toast stack to its corner.');
  assert.match(rule[1], /\.ui-toast-stack\.rx-toast-stack/,
    'react/src/Toast.css: the fixed corner is claimed by `.rx-toast-stack` alone, which carries the '
    + `same weight as \`.ui-toast-stack--collapsed\` in ${SHEET}. Whichever sheet loads second wins, `
    + 'and if that is the kit\'s, a collapsing React stack drops out of its corner and into the page.');
});

test('a reader with no hover is not shown a pile they cannot open', () => {
  // The cards behind the front one are not focusable, so where there is no
  // hover a pile would simply hide notices. The question is hover, not pointer
  // precision: `(pointer: coarse)` belongs to the field-sizing net, and
  // stories/field-zoom.test.js keeps that question to one sheet.
  const at = css.indexOf('@media (hover: none)');
  assert.notEqual(at, -1, `${SHEET} no longer answers for a reader with no hover, who cannot open a pile.`);
  const block = /@media\s*\(hover:\s*none\)\s*\{([\s\S]*?)\n\}/.exec(css.slice(at))[1];

  const column = /([^{}]*)\{([^}]*height:\s*auto[^}]*)\}/.exec(block);
  assert.ok(column, `${SHEET}: a hoverless stack keeps the pile's measured height, so it still hides its notices.`);
  assert.ok(block.includes('.ui-toast-stack--collapsed.ui-toast-stack--newest-first')
    && block.includes('flex-direction: column-reverse'),
    `${SHEET}: a hoverless stack fed newest-first changes reading order instead of keeping the front notice at the bottom.`);
  const cards = /([^{}]*)\{([^}]*translate:\s*none[^}]*)\}/.exec(block);
  assert.ok(cards, `${SHEET}: a hoverless card keeps the offset it only has while absolute.`);
  for (const property of ['position: static', 'scale: 1']) {
    assert.ok(cards[2].includes(property), `${SHEET}: the hoverless card rule is missing \`${property}\``);
  }

  // A tap lands focus inside the stack, so :focus-within is reachable without a
  // hover. Both fanned states have to be named again here, or the shorter
  // selector loses to them and a static card is handed an absolute offset.
  for (const state of [':hover', ':focus-within']) {
    for (const [what, rule] of [['stack', column], ['card', cards]]) {
      assert.ok(rule[1].includes(state),
        `${SHEET}: the hoverless ${what} rule does not name \`${state}\`, so the fan-out rule above `
        + 'outweighs it and wins on source order.');
    }
  }
  assert.ok(at > css.indexOf('.ui-toast-stack--collapsed:focus-within > .ui-toast'),
    `${SHEET}: the hoverless block sits above the fan-out rules it answers for. It carries the same `
    + 'weight as them, so it only wins while it stays below.');
});

test('the pile carries no count chip', () => {
  // Artur struck the chip off the pile on #479: the cards behind the front one
  // already say there is more, and a second thing saying so was a tier of text
  // the block did not need. The pile is the notices and nothing else.
  assert.ok(!css.includes('ui-toast-stack__count'),
    `${SHEET} draws a \`.ui-toast-stack__count\` chip again. The pile says how much is waiting by `
    + 'showing the cards behind the front one; a counted chip above it was rejected on #479.');
  assert.ok(!script.includes('ui-toast-stack__count'),
    `${SCRIPT} builds a \`.ui-toast-stack__count\` chip again; see #479.`);
});

test('every control inside a notice wears the kit ring, never the browser outline', () => {
  // Discovered from both faces, so a control added to one and not the other is
  // still measured. Artur rejected the native outline on #457; these two are
  // bare buttons, outside `.ui-btn` and `.ui-focusable`, so the sheet has to
  // name them itself or the browser draws its own.
  const faces = [script, readFileSync('react/src/Toast.tsx', 'utf8')];
  const controls = new Set(faces
    .flatMap((source) => [...source.matchAll(/["'`](ui-toast__(?:action|close))["'`]/g)].map((m) => m[1])));
  assert.equal(controls.size, 2,
    `expected the action and the close button; found ${[...controls].join(', ') || 'none'}. A new `
    + 'control inside a notice needs the ring too — add it here and to the sheet.');

  for (const control of controls) {
    const rule = rules.find((r) => r.selector.split(',').some((s) => s.trim() === `.${control}:focus-visible`));
    assert.ok(rule, `${SHEET}: \`.${control}\` has no \`:focus-visible\` rule, so it falls back to the `
      + "browser's own outline. The kit uses `--ring` (#457).");
    assert.match(rule.body, /outline:\s*var\(--ring\)/,
      `${SHEET}: \`.${control}:focus-visible\` does not draw the current kit ring.`);
    assert.match(rule.body, /outline-offset:\s*var\(--ring-offset\)/,
      `${SHEET}: \`.${control}:focus-visible\` does not keep the current kit ring offset.`);
  }
});

/* -- The timer line pauses for both readers ----------------------------------- */

test('the timer line pauses under the pointer and under focus', () => {
  const paused = [...css.matchAll(/([^{}]*\.ui-toast__timer[^{}]*)\{([^}]*animation-play-state:\s*paused[^}]*)\}/g)];
  assert.equal(paused.length, 1,
    `${SHEET} has ${paused.length} rules pausing \`.ui-toast__timer\`; the line's pause is one rule.`);
  for (const state of [':hover', ':focus-within']) {
    assert.ok(paused[0][1].includes(state),
      `${SHEET}: the line keeps running on \`${state}\`. A reader who holds a notice open that way `
      + 'watches a bar claim the time is still being spent.');
  }
});

test('a reader who asked for less motion is not shown a line that cannot move', () => {
  const block = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(css);
  assert.ok(block, `${SHEET} no longer has a reduced-motion block.`);
  assert.match(block[1], /\.ui-toast__timer\s*\{[^}]*display:\s*none/,
    `${SHEET}: under reduced motion the timer line is still drawn. Its animation is capped to nothing, `
    + 'so it would sit full for the whole five seconds and read as "no time spent yet".');
});

/* -- The pile in a document --------------------------------------------------- */

const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event', 'MouseEvent', 'FocusEvent', 'getComputedStyle']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
// JSDOM lays nothing out, so each notice carries the height it would have had.
Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get() { return Number(this.dataset.height || 0); },
});

const { applyToastPile, clearToastPile, collapseToastStack, wireToastStack } = await import('../src/components/toasts.js');
const { toast } = await import('../src/components/index.js');
const { TOAST_PEEK, TOAST_PILE_MIN } = await import('../src/logic/toast-stack.js');

/** A stack of notices, oldest first, at the given heights. */
function stackOf(...heights) {
  const stack = document.createElement('div');
  stack.className = 'ui-toast-stack';
  for (const height of heights) {
    const card = document.createElement('div');
    card.className = 'ui-toast ui-toast--success ui-toast--soft';
    card.dataset.height = String(height);
    stack.append(card);
  }
  document.body.append(stack);
  return stack;
}
const cardsOf = (stack) => [...stack.children].filter((el) => el.classList.contains('ui-toast'));
const lift = (card) => card.style.getPropertyValue('--toast-card-lift');

test('the newest notice is the front of the pile and the oldest sits furthest back', () => {
  const stack = stackOf(80, 80, 80);
  applyToastPile(stack);
  const cards = cardsOf(stack);
  assert.equal(lift(cards.at(-1)), '0px', 'the last child is the newest, and the front card does not move');
  assert.equal(cards.at(-1).style.getPropertyValue('--toast-card-scale'), '1');
  const lifts = cards.map((card) => parseFloat(lift(card)));
  assert.deepEqual([...lifts].sort((a, b) => a - b), lifts,
    `the pile is not ordered: lifts are ${lifts.join(', ')}. Oldest first in the DOM has to mean `
    + 'furthest back in the pile, or the newest notice is the one hidden.');
  // The lift also owes back what scaling about the bottom edge took off the top,
  // so what one peek buys is read off the top edge rather than the raw offset.
  const above = (card) => Number(card.dataset.height) * parseFloat(card.style.getPropertyValue('--toast-card-scale'))
    - parseFloat(lift(card)) - Number(cards.at(-1).dataset.height);
  assert.equal(Math.round(above(cards[1])), TOAST_PEEK, 'one notice back shows exactly one peek');
  assert.equal(Math.round(above(cards[0])), 2 * TOAST_PEEK, 'two notices back show two');
  stack.remove();
});

test('a stack fed by pushToast keeps its newest notice in front', () => {
  // pushToast() prepends, so the newest notice is the FIRST child here. Told
  // that, the pile has to front it and paint it above the rest.
  const stack = stackOf(80, 80, 80);
  applyToastPile(stack, { newestFirst: true });
  const cards = cardsOf(stack);
  assert.equal(lift(cards[0]), '0px', 'the first child is the newest, and the front card does not move');
  const depths = cards.map((card) => Number(card.style.getPropertyValue('--toast-card-depth')));
  assert.equal(Math.max(...depths), depths[0],
    'the newest notice paints below the older ones, so the pile shows the one the reader has already seen');
  assert.deepEqual([...depths].sort((a, b) => b - a), depths);
  stack.remove();
});

test('a stack fed by pushToast keeps the same reading order without hover', () => {
  const stack = stackOf(80, 80, 80);
  const pile = collapseToastStack(stack, { newestFirst: true });
  assert.ok(stack.classList.contains('ui-toast-stack--newest-first'),
    'a newest-first stack has no class for the hoverless stylesheet to keep its reading order');
  pile.stop();
  assert.ok(!stack.classList.contains('ui-toast-stack--newest-first'));
  stack.remove();
});

test('fanning out leaves the front card where it already was', () => {
  // The pile grows away from the corner it is anchored to. The card the reader
  // is looking at is the one that must not move when the pile opens, whichever
  // end of the DOM it sits at.
  for (const newestFirst of [false, true]) {
    const stack = stackOf(80, 90, 70);
    applyToastPile(stack, { newestFirst });
    const cards = cardsOf(stack);
    const front = newestFirst ? cards[0] : cards[cards.length - 1];
    assert.equal(front.style.getPropertyValue('--toast-card-fan'), '0px',
      `newestFirst: ${newestFirst} — the front card is asked to travel when the pile fans out`);
    for (const card of cards) {
      if (card === front) continue;
      assert.ok(parseFloat(card.style.getPropertyValue('--toast-card-fan')) < 0,
        `newestFirst: ${newestFirst} — a card behind the front one fans towards the corner, not away from it`);
    }
    stack.remove();
  }
});

test('the front card paints above the rest whichever end of the DOM it is at', () => {
  const stack = stackOf(80, 80, 80);
  applyToastPile(stack);
  const depths = cardsOf(stack).map((card) => Number(card.style.getPropertyValue('--toast-card-depth')));
  assert.deepEqual([...depths].sort((a, b) => a - b), depths);
  stack.remove();
});

test('the pile publishes both heights, and the fanned one is the taller', () => {
  const stack = stackOf(60, 90);
  applyToastPile(stack);
  assert.equal(stack.style.getPropertyValue('--toast-pile-height'), `${90 + TOAST_PEEK}px`);
  assert.equal(stack.style.getPropertyValue('--toast-fan-height'), `${60 + 90 + 12}px`);
  stack.remove();
});

test('clearing a pile leaves the stack exactly as it was found', () => {
  const stack = stackOf(80, 80);
  applyToastPile(stack);
  clearToastPile(stack);
  assert.equal(stack.getAttribute('style'), '');
  for (const card of cardsOf(stack)) assert.equal(card.getAttribute('style'), '');
  stack.remove();
});

test('a collapsed stack re-measures as notices come and go, and adds nothing to the DOM', async () => {
  const stack = stackOf(80, 80, 80);
  const pile = collapseToastStack(stack);
  assert.ok(stack.classList.contains('ui-toast-stack--collapsed'));
  assert.equal(stack.children.length, 3,
    'collapsing put something in the stack that is not a notice; the pile is the notices alone (#479)');

  const fresh = document.createElement('div');
  fresh.className = 'ui-toast';
  fresh.dataset.height = '80';
  stack.append(fresh);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(lift(fresh), '0px', 'the notice that just arrived did not take the front of the pile');
  assert.equal(cardsOf(stack).length, 4, 'the arriving notice was not counted as a card');

  pile.stop();
  assert.ok(!stack.classList.contains('ui-toast-stack--collapsed'));
  assert.equal(stack.getAttribute('style'), '');
  stack.remove();
});

test('a collapsed stack holds every countdown while the pile is held', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const stack = document.createElement('div');
    stack.className = 'ui-toast-stack';
    stack.innerHTML = [
      toast({ variant: 'info', title: 'One', timer: 5 }),
      toast({ variant: 'info', title: 'Two', timer: 5 }),
      toast({ variant: 'info', title: 'Three', timer: 5 }),
    ].join('');
    document.body.append(stack);
    wireToastStack(stack);
    const pile = collapseToastStack(stack);
    stack.dispatchEvent(new dom.window.Event('mouseenter'));
    mock.timers.tick(30000);
    assert.equal(cardsOf(stack).length, 3, 'a notice expired while the pile was held');
    stack.dispatchEvent(new dom.window.Event('mouseleave'));
    mock.timers.tick(5000);
    assert.ok(cardsOf(stack).every(leaving), 'the held countdowns did not resume when the pile was released');
    pile.stop();
    stack.remove();
  } finally { mock.timers.reset(); }
});

test('the shipped vanilla pile ignores card leave events while the stack is held', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const root = CollapsedStack.render();
    document.body.append(root);
    mock.timers.tick(0);
    await Promise.resolve();
    const stack = root.querySelector('[data-stack]');
    const cards = cardsOf(stack);
    assert.equal(cards.length, 3, 'the shipped CollapsedStack story did not seed three notices');
    assert.ok(stack.classList.contains('ui-toast-stack--collapsed'),
      'the shipped CollapsedStack story is not exercising the collapsed pile');

    stack.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: true }));
    for (const card of cards) {
      card.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: true }));
      card.dispatchEvent(new dom.window.MouseEvent('mouseleave', { bubbles: true, relatedTarget: stack }));
    }
    mock.timers.tick(5000);
    assert.ok(cardsOf(stack).every((card) => !leaving(card)),
      'a card-level mouseleave released a countdown while the pointer still held the pile');

    stack.dispatchEvent(new dom.window.MouseEvent('mouseleave', { bubbles: true }));
    mock.timers.tick(5000);
    assert.ok(cardsOf(stack).every(leaving), 'the shipped pile did not resume after the pointer left it');
    root.remove();
  } finally { mock.timers.reset(); }
});

test('one notice is not a pile', () => {
  const stack = stackOf(80);
  const pile = collapseToastStack(stack);
  assert.ok(!stack.classList.contains('ui-toast-stack--collapsed'),
    `a single notice collapsed into a pile would only hide behind itself; ${TOAST_PILE_MIN} is the floor`);
  pile.stop();
  stack.remove();
});

/* -- The countdown stops with the line ---------------------------------------- */

/** A wired, running notice with a timer line and a control inside it. */
function running() {
  const stack = document.createElement('div');
  stack.className = 'ui-toast-stack';
  stack.innerHTML = toast({ variant: 'info', title: 'Uploading report.csv', body: 'This dismisses on its own.', timer: 5, action: 'Cancel' });
  document.body.append(stack);
  wireToastStack(stack);
  const notice = stack.querySelector('.ui-toast');
  return { stack, notice, close: notice.querySelector('.ui-toast__close'), action: notice.querySelector('.ui-toast__action') };
}
const leaving = (notice) => notice.classList.contains('is-leaving');

test('focus holds the countdown, and letting go spends what is left', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { stack, notice } = running();
    assert.ok(notice.querySelector('.ui-toast__timer').classList.contains('is-running'),
      'the line is not running, so there is no countdown to hold');
    mock.timers.tick(2000);
    notice.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
    mock.timers.tick(30000);
    assert.equal(leaving(notice), false,
      'the notice expired while a reader had focus inside it — the reprieve a pointer gets, a keyboard does not');
    notice.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    mock.timers.tick(4999);
    assert.equal(leaving(notice), false);
    mock.timers.tick(1);
    assert.equal(leaving(notice), true, 'the countdown never resumed after focus left');
    stack.remove();
  } finally { mock.timers.reset(); }
});

test('moving focus between a notice\'s own controls does not restart its countdown', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { stack, notice, close, action } = running();
    notice.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
    // Tab from the action to the close button: the old target has already
    // blurred, so only relatedTarget knows focus is still inside.
    action.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true, relatedTarget: close }));
    mock.timers.tick(30000);
    assert.equal(leaving(notice), false,
      'a Tab within the notice released the hold, so the notice expired under the reader\'s hands');
    stack.remove();
  } finally { mock.timers.reset(); }
});

test('the pointer still holds the countdown it always held', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { stack, notice } = running();
    mock.timers.tick(2000);
    notice.dispatchEvent(new dom.window.MouseEvent('mouseenter'));
    mock.timers.tick(30000);
    assert.equal(leaving(notice), false);
    notice.dispatchEvent(new dom.window.MouseEvent('mouseleave'));
    mock.timers.tick(5000);
    assert.equal(leaving(notice), true);
    stack.remove();
  } finally { mock.timers.reset(); }
});
