/* Rule: the finance report's figures are the kit's stat band, and so is the
 * skeleton that holds their place.
 *
 * This screen used to carry its own strip: inline type, a local style block and
 * a container query keyed to a width the story argued for in a comment. The band
 * now owns the fold, measured and pinned in src/styles/stat.test.js, so what is
 * left to hold here is that the screen uses it and brings no layout of its own.
 * why: docs/specification.md#stat-bands
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Default, Loading } from './FinanceReport.stories.js';

const docOf = (story) => new JSDOM(`<!doctype html><html lang="en"><body>${story.render()}</body></html>`).window.document;

test('the figures are a stat band, one figure per term', () => {
  const doc = docOf(Default);
  const band = doc.querySelector('.ui-stats');
  assert.ok(band, 'the screen no longer draws its figures with the kit\'s band');
  assert.deepEqual([...band.querySelectorAll('dt')].map((d) => d.textContent), ['Money in', 'Money out', 'Net result']);
});

test('the screen brings no layout of its own for the figures', () => {
  for (const story of [Default, Loading]) {
    const html = story.render();
    assert.doesNotMatch(html, /<style/, 'a style block is back beside the band');
    assert.doesNotMatch(html, /@container|@media/, 'the screen is folding the figures itself again');
  }
});

test('the skeleton sits in the band it stands in for', () => {
  const doc = docOf(Loading);
  const band = doc.querySelector('.ui-stats');
  assert.ok(band, 'the loading figures are not in a band, so they fold differently from what replaces them');
  const figures = band.querySelectorAll('.ui-stats__list > .ui-stat');
  assert.equal(figures.length, docOf(Default).querySelectorAll('.ui-stat').length,
    'the skeleton reserves a different number of figures than arrive');
});
