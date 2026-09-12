// The stat band's markup contract.
// why: docs/specification.md#stat-bands
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { statBand, STAT_VARIANTS } from './stat.js';
import { icon } from '../assets/icons.js';

const dom = (html) => new JSDOM(`<!doctype html><body>${html}</body></html>`).window.document;
// One figure, in the band layout: these tests read a figure's own markup, and
// the default's tile card would put its classes on the same element.
const one = (fig) => dom(statBand({ stats: [fig], variant: 'band' }));
const FOUR = [
  { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%' } },
  { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'good' } },
];

test('a band is a description list, one group per figure, label as the term', () => {
  const doc = dom(statBand({ stats: FOUR }));
  const dl = doc.querySelector('.ui-stats > dl.ui-stats__list');
  assert.ok(dl, 'the figures are not a <dl>');
  const groups = [...dl.children];
  assert.equal(groups.length, 4);
  for (const g of groups) {
    assert.equal(g.tagName, 'DIV', 'a <dl> may group its terms only in a <div>');
    assert.equal(g.firstElementChild.tagName, 'DT');
    assert.ok([...g.children].slice(1).every((c) => c.tagName === 'DD'), 'everything after the label is a value of it');
  }
  assert.deepEqual([...dl.querySelectorAll('dt')].map((d) => d.textContent), FOUR.map((f) => f.label));
});

test('label, value, change and caption are text, never markup', () => {
  const doc = dom(statBand({
    basis: '<s>c</s>',
    label: '"><em>g</em>',
    id: '"><q>i</q>',
    stats: [{ label: '<b>x</b>', value: '<img src=x>', delta: { value: '+<i>1</i>%', basis: '<u>y</u>' } }],
  }));
  assert.equal(doc.querySelectorAll('b, img, i, u, s, em, q').length, 0);
  assert.equal(doc.querySelector('.ui-stat__value').textContent, '<img src=x>');
});

// The glyph drawn, compared against the three the kit ships, so swapping two
// of them in the lookup fails here rather than passing on "they differ".
test('the arrow follows the sign the caller printed', () => {
  const glyph = (value, direction) => one({ label: 'a', value: '1', delta: { value, direction } })
    .querySelector('.ui-stat__delta svg').outerHTML;
  const [UP, DOWN, FLAT] = ['arrowUp', 'arrowDown', 'minus'].map((n) => dom(icon(n)).querySelector('svg').outerHTML);
  assert.equal(glyph('+4%'), UP);
  for (const v of ['−4%', '-4%', '–4%', ' −4.0%', '(4.0%)']) assert.equal(glyph(v), DOWN, `${v} drew the wrong arrow`);
  for (const v of ['0.0%', '±0.0%']) assert.equal(glyph(v), FLAT, `${v} drew an arrow`);
  assert.equal(glyph('4%', 'down'), DOWN, 'an explicit direction is not honoured');
});

// Every verdict against both signs, so nothing here can pass by reading the
// sign: the same rise is good, bad and neither, and so is the same fall.
test('the tone the caller declares is the colour, and the sign never is', () => {
  const cls = (delta) => one({ label: 'a', value: '1', delta }).querySelector('.ui-stat').className;
  for (const [sign, value] of [['a rise', '+12%'], ['a fall', '−61%']]) {
    assert.equal(cls({ value, tone: 'good' }), 'ui-stat ui-stat--good', `${sign} the caller called good news was not painted good`);
    assert.equal(cls({ value, tone: 'bad' }), 'ui-stat ui-stat--bad', `${sign} the caller called bad news was not painted bad`);
    assert.equal(cls({ value }), 'ui-stat', `${sign} nobody declared a tone for was painted`);
    assert.equal(cls({ value, tone: 'neutral' }), 'ui-stat', `${sign} the caller called neutral was painted`);
  }
  assert.equal(cls({ value: '+1%', tone: 'great' }), 'ui-stat', 'an unknown tone reached the class list');
  assert.equal(cls({ value: null, tone: 'bad' }), 'ui-stat', 'a figure with no change was painted as news');
});

test('the band says once what every change is measured against, and each change points at it', () => {
  const doc = dom(statBand({ stats: FOUR, basis: 'Change against the previous 12 months', id: 'kpi' }));
  const caption = doc.querySelectorAll('.ui-stats__basis');
  assert.equal(caption.length, 1);
  assert.equal(caption[0].id, 'kpi-basis');
  const deltas = [...doc.querySelectorAll('.ui-stat__delta')];
  assert.equal(deltas.length, 4);
  for (const d of deltas) assert.equal(d.getAttribute('aria-describedby'), 'kpi-basis');
});

// One statement about every figure is read before them and belongs to none of
// them. Held in every layout, because the caption does not move with the
// surface: under a row of tiles it would read as a note on the last card.
test('the caption leads the band in every layout, and sits in no figure', () => {
  for (const variant of STAT_VARIANTS) {
    const band = dom(statBand({ stats: FOUR, variant, basis: 'Against last year', id: variant }))
      .querySelector('.ui-stats');
    const caption = band.querySelector('.ui-stats__basis');
    assert.equal(band.firstElementChild, caption, `${variant}: the caption is not the first thing in the band`);
    assert.equal(caption.nextElementSibling, band.querySelector('.ui-stats__list'),
      `${variant}: the figures do not follow the caption`);
    assert.equal(caption.closest('.ui-stat'), null, `${variant}: the caption is inside a figure`);
  }
});

test('a figure measured against something else says so beside its change, and does not point at the band', () => {
  const doc = dom(statBand({
    basis: 'Change against the previous 12 months',
    stats: [FOUR[0], { label: 'Margin', value: '36%', delta: { value: '−3.9 pts', basis: 'against the 40% target' } }],
  }));
  const [shared, own] = doc.querySelectorAll('.ui-stat__delta');
  assert.ok(shared.hasAttribute('aria-describedby'));
  assert.ok(!own.hasAttribute('aria-describedby'), 'a figure with its own comparison is described by the band\'s too');
  assert.equal(own.querySelector('.ui-stat__basis').textContent, 'against the 40% target');
});

test('two bands on one page never share a caption id', () => {
  const ids = [statBand({ stats: FOUR, basis: 'x' }), statBand({ stats: FOUR, basis: 'x' })]
    .map((h) => dom(h).querySelector('.ui-stats__basis').id);
  assert.notEqual(ids[0], ids[1]);
});

test('a change against nothing says so, with no arrow and no percentage', () => {
  const none = one({ label: 'New', value: '€ 1', delta: { value: null } }).querySelector('.ui-stat__delta');
  assert.ok(none.classList.contains('ui-stat__delta--none'));
  assert.equal(none.textContent, 'No earlier figure');
  assert.equal(none.querySelector('svg'), null);
  const worded = one({ label: 'New', value: '€ 1', delta: { value: '', none: 'New this year' } });
  assert.equal(worded.querySelector('.ui-stat__delta').textContent, 'New this year');
});

test('a figure with no change and no trend is a label and a value', () => {
  assert.equal(one({ label: 'Money in', value: '759,988 €' }).querySelectorAll('dd').length, 1);
});

test('the trend is a slot: rendered as given, and only when given', () => {
  const svg = '<svg width="200" height="32" role="img" aria-label="t"></svg>';
  assert.equal(one({ label: 'a', value: '1', trend: svg }).querySelector('.ui-stat__trend svg').getAttribute('aria-label'), 't');
  assert.equal(one({ label: 'a', value: '1' }).querySelector('.ui-stat__trend'), null);
});

test('each layout puts its surface where it says', () => {
  assert.deepEqual(STAT_VARIANTS, ['band', 'tiles', 'open']);
  const band = dom(statBand({ stats: FOUR, variant: 'band' }));
  assert.ok(band.querySelector('.ui-stats').classList.contains('ui-card'), 'the band is not one card');
  assert.equal(band.querySelectorAll('.ui-card').length, 1);
  const tiles = dom(statBand({ stats: FOUR, variant: 'tiles' }));
  assert.ok(!tiles.querySelector('.ui-stats').classList.contains('ui-card'));
  assert.equal(tiles.querySelectorAll('.ui-stat.ui-card.ui-card--pad-sm').length, 4, 'a tile is not a card');
  const open = dom(statBand({ stats: FOUR, variant: 'open' }));
  assert.equal(open.querySelectorAll('.ui-card').length, 0, 'the open band drew a surface');
  const unknown = dom(statBand({ stats: FOUR, variant: 'grid' }));
  assert.ok(unknown.querySelector('.ui-stats--tiles'), 'an unknown layout did not fall back to the default');
});

// Tiles, chosen by Artur on 2026-09-12 from the three rendered layouts.
// why: docs/specification.md#stat-bands
test('a caller who names no layout gets tiles', () => {
  const doc = dom(statBand({ stats: FOUR }));
  assert.ok(doc.querySelector('.ui-stats--tiles'), 'the default layout is not tiles');
  assert.equal(doc.querySelectorAll('.ui-stat.ui-card.ui-card--pad-sm').length, 4);
  assert.ok(!doc.querySelector('.ui-stats').classList.contains('ui-card'), 'the default drew a card around the row too');
});

test('a named band is a group with that name', () => {
  const g = dom(statBand({ stats: FOUR, label: 'Cashflow' })).querySelector('.ui-stats');
  assert.equal(g.getAttribute('role'), 'group');
  assert.equal(g.getAttribute('aria-label'), 'Cashflow');
  assert.equal(dom(statBand({ stats: FOUR })).querySelector('.ui-stats').getAttribute('role'), null);
});
