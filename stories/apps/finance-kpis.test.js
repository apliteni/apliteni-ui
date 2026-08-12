/* Rule: a screen's own content lays out from the space it has, not from the
 * width of the window.
 *
 * The finance report's three cashflow numbers need about 450px between them —
 * the story says so itself. It asked for that in a viewport media query keyed to
 * the shell's 720px fold, and the two are not the same question: the rail folds
 * at 720 but is still 249px wide above it, so between 721 and 1023 the column is
 * roughly 460–760px and every number orphaned its € onto a second line. The
 * strip was 57px tall where it is 29px from 1024 up.
 *
 * The shell's fold is not the place to fix that — it was chosen from a measured
 * touch target and it belongs to every screen. A container query asks about the
 * column the strip is actually in, which is the thing that varies.
 *
 * JSDOM resolves no @container (it resolves no @media either), so this gate is
 * structural: it reads the style block the story ships and checks what that
 * block is keyed to. The widths are measured in a browser, in the lane report.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { Default } from './FinanceReport.stories.js';

const source = readFileSync(fileURLToPath(new URL('./FinanceReport.stories.js', import.meta.url)), 'utf8');
const html = Default.render();
const style = (/<style>([\s\S]*?)<\/style>/.exec(html) || [])[1];
const doc = new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;

test('the story still ships a style block for its statistic strip', () => {
  assert.ok(style, 'the fixture stopped carrying the rule under test');
  assert.ok(doc.querySelector('.fr-kpis'), 'the screen no longer draws a statistic strip');
});

test('the strip stacks from the width of its column, not the width of the window', () => {
  assert.doesNotMatch(
    style, /@media/,
    'the strip is keyed to a viewport width again. The rail folds at 720px and is still '
    + '249px wide above it, so the column and the window disagree by a quarter of the screen '
    + 'across the whole tablet band — which is exactly where the numbers broke.',
  );
  assert.match(
    style, /@container[^{]*\(\s*max-width:/,
    'nothing asks how much room the strip has',
  );
});

test('something the strip sits inside is declared as that container', () => {
  assert.match(
    style, /container-type:\s*inline-size/,
    'a @container query with no container to resolve against never matches, so the strip '
    + 'would simply never stack',
  );
  const named = /container-type:\s*inline-size/.exec(style);
  assert.ok(named);
  const holder = doc.querySelector('.fr-kpis').parentElement;
  assert.ok(
    holder && holder !== doc.body,
    'the strip has no element of its own to be measured against',
  );
});

// The premise the story states in its own comment. If someone edits the number,
// the sentence above it has to move too — that is what this pins.
test('the width it stacks at is the width the story says three numbers need', () => {
  const at = /@container[^{]*\(\s*max-width:\s*(\d+)px/.exec(style);
  assert.ok(at, 'the container query carries no width');
  const stated = /about (\d+)px between them/.exec(source);
  assert.ok(stated, 'the story stopped saying how much room three numbers need');
  assert.equal(
    at[1], stated[1],
    `the strip stacks below ${at[1]}px while the story says three numbers need ${stated[1]}px`,
  );
});
