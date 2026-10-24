/* The collapsed toast pile: what the script measures, what the sheet draws, and
 * the seam between them.
 *
 * A script measures, because only it knows how tall a notice is once its text
 * wraps. The sheet switches, so hover and focus never wait on a listener. That
 * split holds only while both halves name the same custom properties, so the
 * properties are discovered from each side and compared here.
 *
 * Limits: this reads the sheet and the script as text. JSDOM lays nothing out
 * and evaluates no :hover or media query, so where the cards land on screen is
 * answered by the captures on the pull request.
 */
import { expect, test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SHEET = 'react/src/Toast.css';
const SCRIPT = 'react/src/lib/toast-stack.ts';
const repo = (rel: string) => readFileSync(join(dirname(expect.getState().testPath!), '../../..', rel), 'utf8');
const css = () => repo(SHEET);
const script = () => repo(SCRIPT);

const names = (source: string, call: string) => new Set(
  [...source.matchAll(new RegExp(`${call}\\(\\s*'(--toast-[\\w-]+)'`, 'g'))].map(([, name]) => name));
const listed = (source: string) => new Set([...source.matchAll(/'(--toast-[\w-]+)'/g)].map(([, name]) => name));
const rules = (source: string) => [...source.replace(/\/\*[\s\S]*?\*\//g, ' ').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));
const pileRules = (source: string) => rules(source).filter(rule => rule.selector.includes('.ui-toast-stack--collapsed'));

test('the sheet has a collapsed stack to check at all', () => {
  assert.ok(pileRules(css()).length >= 4,
    `${SHEET}: the pile needs the stack, the resting card, the fanned stack and the fanned card.`);
  assert.ok(names(script(), 'setProperty').size > 0, `${SCRIPT} publishes no --toast-* property.`);
});

test('every property the script publishes is read by the sheet', () => {
  const read = pileRules(css()).map(rule => rule.body).join('\n');
  const unread = [...names(script(), 'setProperty')].filter(name => !new RegExp(`var\\(\\s*${name}[,)]`).test(read));
  assert.deepEqual(unread, [], `${SCRIPT} publishes ${unread.join(', ')}, and no collapsed-stack rule reads it.`);
});

test('every property the sheet reads is published by the script', () => {
  const published = names(script(), 'setProperty');
  const wanted = new Set(pileRules(css())
    .flatMap(rule => [...rule.body.matchAll(/var\(\s*(--toast-(?:card|pile|fan)[\w-]*)/g)]).map(([, name]) => name));
  assert.ok(wanted.size > 0, `${SHEET}: the collapsed rules read no measured property.`);
  const missing = [...wanted].filter(name => !published.has(name));
  assert.deepEqual(missing, [], `${SHEET} draws the pile from ${missing.join(', ')}, which ${SCRIPT} never sets.`);
});

test('clearing a pile takes back every property applying one wrote', () => {
  const lists = [...script().matchAll(/const (?:PILE|CARD)_PROPERTIES = \[([^\]]*)\]/g)].map(([, body]) => body).join(',');
  assert.ok(lists, `${SCRIPT} no longer names the properties clearToastPile() removes.`);
  assert.deepEqual([...names(script(), 'setProperty')].sort(), [...listed(lists)].sort(),
    `${SCRIPT}: applyToastPile() and clearToastPile() no longer name the same properties.`);
});

test('the fan-out is keyed on both the pointer and focus', () => {
  for (const state of [':hover', ':focus-within']) {
    assert.ok(pileRules(css()).filter(rule => rule.selector.includes(state)).length >= 2,
      `${SHEET}: the stack and its cards both move on \`${state}\`, so the pile needs two rules there.`);
  }
});

test('a held pile pauses every timer line in it', () => {
  const selector = rules(css()).filter(rule => rule.body.includes('animation-play-state: paused'))
    .map(rule => rule.selector).join('\n');
  for (const state of [':hover', ':focus-within']) {
    assert.ok(selector.includes(`.ui-toast-stack--collapsed${state} > .ui-toast > .ui-toast__timer.is-running`),
      `${SHEET}: a collapsed stack on \`${state}\` does not pause every timer line it contains.`);
  }
});

test('each back card is clipped and held in a box, and the pile itself is not clipped', () => {
  const all = pileRules(css());
  const stack = all.find(rule => rule.selector === '.ui-toast-stack--collapsed');
  assert.ok(stack, `${SHEET} has no plain \`.ui-toast-stack--collapsed\` rule.`);
  assert.doesNotMatch(stack.body, /overflow/, `${SHEET}: the pile clips itself and cuts the front card's shadow.`);
  const card = all.find(rule => /^\.ui-toast-stack--collapsed\s*>\s*\.ui-toast$/.test(rule.selector));
  assert.ok(card, `${SHEET} has no plain \`.ui-toast-stack--collapsed > .ui-toast\` rule.`);
  assert.match(card.body, /clip-path:\s*inset\([^;]*var\(--toast-card-clip,/);
  assert.match(card.body, /(?:^|[;\s])max-height:\s*var\(--toast-card-box,\s*none\)/);
  assert.ok(card.body.includes('translate:') && card.body.includes('scale:'));
  assert.ok(!/(?:^|[;{\s])transform:/.test(card.body),
    `${SHEET}: the entrance animation holds \`transform\`, so the resting card must use translate and scale.`);
  assert.doesNotMatch(/transition:([^;]*);/.exec(card.body)?.[1] ?? '', /\bmax-height\b|\bclip-path\b/,
    `${SHEET}: the box or the cut eases, so a late paint shows a back card below the front one.`);
  const fanned = all.filter(rule => rule.selector.includes(':hover') && /\btranslate:\s*0 var\(--toast-card-fan/.test(rule.body));
  assert.ok(fanned.length > 0 && fanned.every(rule => /clip-path:\s*inset\([^;]*var\(--toast-card-fan-clip,/.test(rule.body)
    && /max-height:\s*var\(--toast-card-natural,\s*none\)/.test(rule.body)));
  assert.ok(all.some(rule => rule.selector === '.ui-toast-stack--collapsed:focus-visible'),
    `${SHEET}: the keyboard entry point for a collapsed stack has no visible focus style.`);
});

test('the React stack keeps its corner and its pointer when it collapses', () => {
  const fixed = rules(css()).find(rule => /position:\s*fixed/.test(rule.body));
  assert.ok(fixed && fixed.selector.includes('.ui-toast-stack.rx-toast-stack'),
    `${SHEET}: the corner must outrank \`.ui-toast-stack--collapsed\`, which asks for \`position: relative\`.`);
  const held = rules(css()).find(rule => rule.selector === '.ui-toast-stack.rx-toast-stack.ui-toast-stack--collapsed');
  assert.match(held?.body ?? '', /pointer-events:\s*auto/,
    `${SHEET}: a pointer stopped between fanned notices loses the pile hold.`);
});

test('a reader with no hover gets the plain column', () => {
  const source = css();
  const at = source.indexOf('@media (hover: none)');
  assert.notEqual(at, -1, `${SHEET} no longer answers for a reader with no hover, who cannot open a pile.`);
  const block = /@media\s*\(hover:\s*none\)\s*\{([\s\S]*?)\n\}/.exec(source.slice(at))![1];
  assert.match(block, /height:\s*auto/);
  assert.match(block, /position:\s*static/);
  assert.match(block, /max-height:\s*none/);
  for (const state of [':hover', ':focus-within']) assert.ok(block.includes(state),
    `${SHEET}: the hoverless rules must name \`${state}\` again, or the fan-out rule above outweighs them.`);
  assert.ok(at > source.indexOf('.ui-toast-stack--collapsed:focus-within > .ui-toast'),
    `${SHEET}: the hoverless block must stay below the fan-out rules it answers for.`);
});

test('the pile carries no count chip', () => {
  // The owner struck the chip off the pile on #479: the cards behind the front one already say there is more.
  assert.ok(!css().includes('ui-toast-stack__count') && !script().includes('ui-toast-stack__count'));
});
