/* The pile's geometry, and the one number it shares with the stylesheet.
 *
 * Limits: this file measures the arithmetic, not the paint. Whether the
 * published offsets land where they are meant to on screen is a browser
 * question, answered by the captures on the pull request; whether the sheet
 * reads the properties this module names is checked by
 * stories/toast-pile.test.js, which walks the CSS.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  toastPileGeometry, toastPileLabel,
  TOAST_PEEK, TOAST_SCALE_STEP, TOAST_TIERS, TOAST_PILE_MIN, TOAST_GAP,
} from './toast-stack.js';

const SHEET = 'src/styles/callout.css';

test('an empty stack has no cards and no height', () => {
  assert.deepEqual(toastPileGeometry([]), { cards: [], collapsedHeight: 0, fannedHeight: 0 });
});

test('the newest notice is the front card, unlifted and unscaled', () => {
  const { cards } = toastPileGeometry([80, 80, 80]);
  const front = cards.at(-1);
  assert.equal(front.depth, 0);
  assert.equal(front.tier, 0);
  assert.equal(front.scale, 1);
  assert.equal(front.lift, 0);
  assert.equal(front.fan, 0, 'the front card is already where the fanned column puts it');
});

test('depth counts back from the newest, so DOM order stays oldest first', () => {
  const { cards } = toastPileGeometry([60, 70, 80, 90]);
  assert.deepEqual(cards.map((card) => card.depth), [3, 2, 1, 0]);
});

test('each tier shows exactly TOAST_PEEK more of itself, whatever it measures', () => {
  // Cards of three different heights: a one-line notice behind a two-line one
  // behind a compact one. A flat lift would leave the tall ones sticking out by
  // the difference, so the top edges are what this checks.
  const heights = [140, 96, 52];
  const { cards } = toastPileGeometry(heights);
  // Top edge of a card, with the stack's shared bottom edge at y = 0 and y
  // growing upwards: its scaled height plus the lift it was given.
  const top = (index) => heights[index] * cards[index].scale - cards[index].lift - heights.at(-1);
  assert.equal(Math.round(top(2)), 0, 'the front card sets the line the others rise from');
  assert.equal(Math.round(top(1)), TOAST_PEEK);
  assert.equal(Math.round(top(0)), 2 * TOAST_PEEK);
});

test('a pile no deeper than its tiers keeps every card apart', () => {
  const { cards } = toastPileGeometry([80, 80, 80]);
  assert.deepEqual(cards.map((card) => card.tier), [2, 1, 0]);
  assert.deepEqual(cards.map((card) => card.scale), [1 - 2 * TOAST_SCALE_STEP, 1 - TOAST_SCALE_STEP, 1]);
});

test('notices past the last tier rest on it, so the pile stops growing', () => {
  const { cards, collapsedHeight } = toastPileGeometry(Array(9).fill(80));
  const back = cards.slice(0, -TOAST_TIERS - 1);
  assert.ok(back.length > 1, 'this case needs more notices than there are tiers');
  for (const card of back) {
    assert.equal(card.tier, TOAST_TIERS);
    assert.equal(card.lift, cards[0].lift, 'every buried card sits exactly where the last tier does');
  }
  assert.equal(collapsedHeight, toastPileGeometry(Array(3).fill(80)).collapsedHeight,
    'a ninth notice makes the pile no taller than a third one does');
});

test('fanning lifts each card clear of everything newer than it', () => {
  const heights = [140, 96, 52];
  const { cards, fannedHeight } = toastPileGeometry(heights, TOAST_GAP);
  assert.equal(cards[2].fan, 0);
  assert.equal(cards[1].fan, -(52 + TOAST_GAP));
  assert.equal(cards[0].fan, -(52 + TOAST_GAP + 96 + TOAST_GAP));
  assert.equal(fannedHeight, 140 + 96 + 52 + 2 * TOAST_GAP);
  assert.equal(-cards[0].fan + heights[0], fannedHeight,
    'the oldest card, lifted, reaches exactly the top of the fanned column');
});

test('the collapsed pile is the front card plus one peek per tier behind it', () => {
  assert.equal(toastPileGeometry([80]).collapsedHeight, 80);
  assert.equal(toastPileGeometry([90, 80]).collapsedHeight, 80 + TOAST_PEEK);
  assert.equal(toastPileGeometry([90, 90, 80]).collapsedHeight, 80 + 2 * TOAST_PEEK);
  assert.equal(toastPileGeometry([90, 90, 90, 80]).collapsedHeight, 80 + TOAST_TIERS * TOAST_PEEK);
});

test('the gap is the caller\'s, so a stack spaced differently still fans correctly', () => {
  const { cards, fannedHeight } = toastPileGeometry([80, 80], 30);
  assert.equal(cards[0].fan, -(80 + 30));
  assert.equal(fannedHeight, 80 + 80 + 30);
});

test('TOAST_GAP is the gap the stylesheet actually sets, not a copy of it', () => {
  const css = readFileSync(SHEET, 'utf8');
  const rule = /\.ui-toast-stack\s*\{([^}]*)\}/.exec(css);
  assert.ok(rule, `${SHEET} no longer has a \`.ui-toast-stack\` rule to read the gap from`);
  const gap = /(?:^|;)\s*gap:\s*(\d+)px/.exec(rule[1]);
  assert.ok(gap, `${SHEET}: \`.ui-toast-stack\` sets no pixel gap, and the fan-out is measured from it`);
  assert.equal(Number(gap[1]), TOAST_GAP,
    'the fanned column is measured in JS and drawn in CSS. If these two disagree, every card lands '
    + `${Math.abs(Number(gap[1]) - TOAST_GAP)}px out of place, once per notice below it.`);
});

test('the count reads as a sentence, and one notice is not a pile', () => {
  assert.equal(toastPileLabel(1), '1 notice');
  assert.equal(toastPileLabel(2), '2 notices');
  assert.equal(toastPileLabel(12), '12 notices');
  assert.equal(TOAST_PILE_MIN, 2);
});
