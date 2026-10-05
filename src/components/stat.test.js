// The stat band's markup contract.
// why: docs/components.md#stat-bands
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
    stats: [{ label: '<b>x</b>', value: '<img src=x>', caption: '<s>of <em>r</em></s>', delta: { value: '+<i>1</i>%', basis: '<u>y</u>' } }],
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

// A figure with nothing to compare shows its value and stops. The band used to
// say "No earlier figure" under it; beside the figures that do carry a change,
// that sentence is noise, and Artur struck it on 2026-10-02.
// why: docs/components.md#stat-bands
test('a figure with nothing to compare shows its value, and says nothing about it', () => {
  for (const [name, delta] of [['null', { value: null }], ['empty', { value: '' }], ['worded', { value: null, none: 'New this year' }]]) {
    const fig = one({ label: 'New entity', value: '€ 12,040', delta });
    assert.equal(fig.querySelector('.ui-stat__delta'), null, `${name}: a change with nothing in it drew a row`);
    assert.deepEqual([...fig.querySelectorAll('.ui-stat > dd')].map((d) => d.className), ['ui-stat__value'],
      `${name}: the figure is not its value alone`);
    assert.doesNotMatch(fig.querySelector('.ui-stat').textContent, /earlier|New this year/,
      `${name}: words about the missing comparison reached the page`);
  }
  // A caption is the caller's words, so it stays — and nothing is added after it.
  const captioned = one({ label: 'Refunds', value: '€ 0', caption: 'of income', delta: { value: null } });
  assert.deepEqual([...captioned.querySelectorAll('.ui-stat > dd')].map((d) => d.className),
    ['ui-stat__value', 'ui-stat__caption']);
  assert.equal(captioned.querySelector('.ui-stat__caption').textContent, 'of income');
});

// A ratio that is not a change fits neither slot the band had: as a change it
// gets an arrow it has no direction for, as a trend it lands where a sparkline
// goes. It is the row a change would have taken — a figure says at most one
// thing there — so no figure stacks four text lines around its number, and a
// band whose figures differ does not drop half its changes a line lower.
// why: docs/components.md#stat-bands
test("a figure's caption is the row a change would take, with no arrow and no tone", () => {
  const rows = (fig) => [...one(fig).querySelectorAll('.ui-stat > dd')].map((d) => d.className.split(' ')[0]);
  const own = one({ label: 'Margin', value: '36.1%', caption: 'of income' });
  assert.deepEqual(rows({ label: 'Margin', value: '36.1%', caption: 'of income' }),
    ['ui-stat__value', 'ui-stat__caption'], 'a caption alone is not the one row under the value');
  const cap = own.querySelector('.ui-stat__caption');
  assert.equal(cap.tagName, 'DD', 'a caption alone is not a value of the figure');
  assert.equal(cap.textContent, 'of income');
  assert.equal(cap.querySelector('svg'), null, 'the caption drew an arrow, and it is not a change');
  assert.equal(own.querySelector('.ui-stat').className, 'ui-stat', 'the caption painted the figure');
  assert.equal(one({ label: 'a', value: '1' }).querySelector('.ui-stat__caption'), null, 'a caption nobody gave was drawn');
  assert.equal(one({ label: 'a', value: '1', caption: '' }).querySelector('.ui-stat__caption'), null, 'an empty caption drew an empty line');
});

// The rule the band rests on: whatever a figure has to say under its value, it
// says in one row. Every combination, because the defect this replaces was a
// second row that only appeared when a caption met a change.
test('a figure draws exactly one row between its value and its trend, whatever it carries', () => {
  const cases = [
    ['a caption', { caption: 'of income' }],
    ['a change', { delta: { value: '+1%' } }],
    ['a change with its own basis', { delta: { value: '+1%', basis: 'against plan' } }],
    ['a caption and a change', { caption: 'of income', delta: { value: '+1%' } }],
    ['a caption and a change with a basis', { caption: 'of income', delta: { value: '+1%', basis: 'against plan' } }],
    ['a caption and nothing to compare', { caption: 'of income', delta: { value: null } }],
    ['a caption, a change and a trend', { caption: 'of income', delta: { value: '+1%' }, trend: '<svg></svg>' }],
  ];
  for (const [name, extra] of cases) {
    const fig = one({ label: 'Margin', value: '36.1%', ...extra });
    const between = [...fig.querySelectorAll('.ui-stat > dd')]
      .filter((d) => !d.classList.contains('ui-stat__value') && !d.classList.contains('ui-stat__trend'));
    assert.equal(between.length, 1, `${name}: ${between.length} rows under the value, and a figure says one thing there`);
  }
  assert.equal(one({ label: 'a', value: '1' }).querySelectorAll('.ui-stat > dd').length, 1,
    'a figure with nothing to add drew a row anyway');
});

// Beside a change the caption leads the row, because it belongs to the value
// above it: "of income, up 1.2 points", never "up 1.2 points of income". What
// the change is measured against follows it, so the row reads in that order.
test('a caption leads the row and what the change is measured against follows it', () => {
  const row = (opts) => dom(statBand({ variant: 'band', ...opts })).querySelector('.ui-stat__delta');
  const figure = { label: 'Operating margin', value: '12.4%', caption: 'of income', delta: { value: '+1.2 pts', tone: 'good', basis: 'against the 40% target' } };
  const own = row({ stats: [figure], basis: 'Change against the previous 12 months', id: 'kpi' });
  assert.deepEqual([...own.querySelectorAll('[class^="ui-stat__"]')].map((e) => e.className),
    ['ui-stat__caption', 'ui-stat__change', 'ui-stat__basis'], 'the row does not read caption, change, basis');
  assert.equal(own.textContent.replace(/\s+/g, ' ').trim(), 'of income +1.2 pts against the 40% target');
  assert.ok(own.querySelector('svg'), 'the change lost its arrow');
  assert.equal(own.getAttribute('aria-describedby'), null,
    'a figure measured against its own thing was pointed at the band\'s as well');
});

// The defect this replaces: a caption used to take the basis's place, so a band
// with no caption of its own printed neither and the change compared against
// nothing. A basis is passed precisely when a figure is measured against
// something the band's caption does not cover, so it is never the kit's to drop.
test('a caption never costs the caller the basis they passed', () => {
  const figure = { label: 'Operating margin', value: '12.4%', caption: 'of income', delta: { value: '+1.2 pts', basis: 'against the 40% target' } };
  for (const [name, opts] of [
    ['with a band caption', { stats: [figure], basis: 'Change against the previous 12 months', id: 'kpi' }],
    ['with no band caption', { stats: [figure] }],
  ]) {
    const doc = dom(statBand({ variant: 'band', ...opts }));
    assert.equal(doc.querySelector('.ui-stat__basis')?.textContent, 'against the 40% target',
      `${name}: the basis the caller passed is not on the page`);
  }
  // With no caption and no basis of its own, the band's caption is still what a
  // change points at — the rule a caption no longer changes.
  const shared = dom(statBand({ variant: 'band', basis: 'Against last year', id: 'b', stats: [{ label: 'Income', value: '€ 1', caption: 'of the group', delta: { value: '+4%' } }] }));
  assert.equal(shared.querySelector('.ui-stat__delta').getAttribute('aria-describedby'), 'b-basis');
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
// why: docs/components.md#stat-bands
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
