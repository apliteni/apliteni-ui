// The stat band's markup contract.
// why: docs/specification.md#stat-bands
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { stat, statBand, STAT_VARIANTS } from './stat.js';

const dom = (html) => new JSDOM(`<!doctype html><body>${html}</body>`).window.document;
const FOUR = [
  { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' } },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%', tone: 'good' } },
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

test('label, value and change are text, never markup', () => {
  const doc = dom(stat({ label: '<b>x</b>', value: '<img src=x>', delta: { value: '+<i>1</i>%', basis: '<u>y</u>' } }));
  assert.equal(doc.querySelectorAll('b, img, i, u').length, 0);
  assert.equal(doc.querySelector('.ui-stat__value').textContent, '<img src=x>');
});

test('the arrow follows the sign the caller printed', () => {
  const arrow = (value, direction) => stat({ label: 'a', value: '1', delta: { value, direction } });
  const up = arrow('+4%');
  const down = ['−4%', '-4%', '–4%'].map((v) => arrow(v));
  const flat = arrow('0.0%');
  // Each glyph's first path differs, so compare against the three the kit draws.
  assert.notEqual(up, flat);
  for (const d of down) {
    assert.notEqual(d, up, `${d} drew the up arrow for a negative change`);
    assert.equal(d.replace(/[−–-]4%/, ''), down[0].replace(/[−–-]4%/, ''), 'the three minus signs draw different arrows');
  }
  assert.equal(arrow('4%', 'down').replace('4%', ''), down[0].replace('−4%', ''), 'an explicit direction is not honoured');
});

test('tone is the caller\'s, and a rise is not good news by default', () => {
  const rise = dom(stat({ label: 'Cost', value: '1', delta: { value: '+12%' } })).querySelector('.ui-stat');
  assert.ok(!rise.className.includes('good') && !rise.className.includes('bad'), `a rise was painted: ${rise.className}`);
  const fall = dom(stat({ label: 'Unclassified', value: '1', delta: { value: '−61%', tone: 'good' } })).querySelector('.ui-stat');
  assert.ok(fall.classList.contains('ui-stat--good'), 'a fall the caller called good was not painted good');
  const odd = dom(stat({ label: 'a', value: '1', delta: { value: '+1%', tone: 'great' } })).querySelector('.ui-stat');
  assert.equal(odd.className, 'ui-stat', 'an unknown tone reached the class list');
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
  const none = dom(stat({ label: 'New', value: '€ 1', delta: { value: null } })).querySelector('.ui-stat__delta');
  assert.ok(none.classList.contains('ui-stat__delta--none'));
  assert.equal(none.textContent, 'No earlier figure');
  assert.equal(none.querySelector('svg'), null);
  const worded = dom(stat({ label: 'New', value: '€ 1', delta: { value: '', none: 'New this year' } }));
  assert.equal(worded.querySelector('.ui-stat__delta').textContent, 'New this year');
});

test('a figure with no change and no trend is a label and a value', () => {
  const doc = dom(stat({ label: 'Money in', value: '759,988 €' }));
  assert.equal(doc.querySelectorAll('dd').length, 1);
});

test('the trend is a slot: rendered as given, and only when given', () => {
  const svg = '<svg width="200" height="32" role="img" aria-label="t"></svg>';
  assert.equal(dom(stat({ label: 'a', value: '1', trend: svg })).querySelector('.ui-stat__trend svg').getAttribute('aria-label'), 't');
  assert.equal(dom(stat({ label: 'a', value: '1' })).querySelector('.ui-stat__trend'), null);
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
  assert.ok(unknown.querySelector('.ui-stats--band'), 'an unknown layout did not fall back to the band');
});

test('a named band is a group with that name', () => {
  const g = dom(statBand({ stats: FOUR, label: 'Cashflow' })).querySelector('.ui-stats');
  assert.equal(g.getAttribute('role'), 'group');
  assert.equal(g.getAttribute('aria-label'), 'Cashflow');
  assert.equal(dom(statBand({ stats: FOUR })).querySelector('.ui-stats').getAttribute('role'), null);
});
