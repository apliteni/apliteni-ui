/* Rule: the band's actions never stand on search, and with no sidebar they never cut its
 * words. The actions are one size. A count stands above its bell's top edge and clear of
 * the next control. The phone band's title keeps its words on one line from 561px to
 * 720px, and the band causes no sideways scroll on a phone.
 * Before the fix the bell drew over search from 721px to 783px, because the actions'
 * column shrank below them (#847). Before fix round 2, a Button action drew 36px beside a
 * 40px bell, a 99+ count stood on the glyph's corner and reached the next glyph, and with
 * no sidebar search cut its words at 561px.
 *
 * Off unless BAND_ACTIONS=1: Playwright is not a dependency of this package, CI does
 * not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… BAND_ACTIONS=1 node --test stories/band-actions.test.js
 *
 * It discovers every React/AppShell story whose name starts with Band Actions. It counts
 * the ones with two actions, with a bell that shows no count and with a 99+ count. The tap
 * zone of each action is measured by stories/tap-zone.test.js, which sweeps these stories at 390.
 *
 * Its limits: one engine, the dark theme, and widths from 721px to 800px in 1px steps,
 * plus 1280, 561, 640, 720, 390 and 320. An overlap is two drawn boxes that cross by
 * more than half a pixel. A count stands above the bell when its top is 2px or more over
 * the bell's top edge: the band leaves 6px over the bell, and the corner rule of fix round
 * 1 left the count's top under 1px over it. Two actions are one size when their boxes
 * differ by half a pixel or less. The next control is the next action, or else the band's next child. The title
 * check reads one title, "Overview" or "Payouts". Search's words are read only in a band
 * with no sidebar: with one, search shrinks first by design, and below 560px it is a glyph.
 * why: docs/components.md#page-shell
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIDE = [...Array.from({ length: 80 }, (_, i) => 721 + i), 1280];
const TITLED = [561, 640, 720];
const PHONE = [390, 320];

// What one story draws at the current width: the search and action boxes, the title's
// fit and the page's sideways overflow.
const MEASURE = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
  const ends = document.querySelector('.ui-react-app__band-actions');
  const controls = ends ? [...ends.querySelectorAll(':scope > .ui-btn, :scope > .ui-dropdown > .ui-dropdown__trigger')] : [];
  const counts = controls.flatMap((el, i) => {
    const badge = el.querySelector('.ui-badge');
    const next = controls[i + 1] ?? ends.nextElementSibling;
    return badge ? [{ text: badge.textContent, badge: box(badge), bell: box(el), next: next && box(next) }] : [];
  });
  const search = document.querySelector('.ui-app__bar > .ui-app__search');
  const title = document.querySelector('.ui-react-app__title');
  const words = search && search.querySelector('.ui-app__search-txt');
  const shown = title && title.checkVisibility();
  ok({
    search: search && box(search),
    actions: controls.map(box),
    counts,
    title: shown ? { text: title.textContent, cut: title.scrollWidth > title.clientWidth } : null,
    words: words && words.checkVisibility() && !document.querySelector('.ui-app__bar > .ui-app__menu')
      ? { text: words.textContent, cut: words.scrollWidth > words.clientWidth } : null,
    overflow: document.scrollingElement.scrollWidth - window.innerWidth,
  });
})));

const crosses = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5
  && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

/** Every finding for one story at the given widths. */
async function walk(page, id, widths) {
  const found = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    const m = await page.evaluate(MEASURE);
    if (m.search && m.actions.some((a) => crosses(a, m.search))) found.push(`${id} at ${width}px: an action stands on search`);
    const size = (a) => [a.right - a.left, a.bottom - a.top];
    if (m.actions.some((a) => size(a).some((v, k) => Math.abs(v - size(m.actions[0])[k]) > 0.5))) found.push(`${id} at ${width}px: the actions are not one size`);
    for (const c of m.counts) {
      if (c.bell.top - c.badge.top < 2) found.push(`${id} at ${width}px: the count ${c.text} does not stand 2px above the bell's top edge`);
      if (c.next && crosses(c.badge, c.next)) found.push(`${id} at ${width}px: the count ${c.text} reaches the next control`);
    }
    if (m.title?.cut) found.push(`${id} at ${width}px: the title "${m.title.text}" is cut`);
    if (width > 560 && m.words?.cut) found.push(`${id} at ${width}px: search cuts "${m.words.text}"`);
    if (m.overflow > 0) found.push(`${id} at ${width}px: the page scrolls ${m.overflow}px sideways`);
  }
  return found;
}

test('the band actions stand clear of search, keep the title and cause no sideways scroll', {
  skip: process.env.BAND_ACTIONS !== '1' && 'set BAND_ACTIONS=1',
}, async () => {
  const { serve, openStory, playwright, indexed, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'BAND_ACTIONS=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const stories = indexed(build).filter((s) => s.id.startsWith('react-appshell--band-actions'));
  assert.ok(stories.length >= 13, `${stories.length} Band Actions stories found. A sweep that lost them measures nothing.`);

  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const findings = [];
    const drawn = { pair: 0, quiet: 0, many: 0, measured: 0 };
    for (const story of stories) {
      const done = await openStory(page, story, { port: server.port, theme: 'dark' });
      assert.equal(done.phase, STORY_DONE, `${story.id} did not render: ${done.phase}`);
      await page.setViewportSize({ width: 390, height: 800 });
      const at = await page.evaluate(MEASURE);
      assert.ok(at.actions.length > 0, `${story.id} draws no band actions`);
      if (at.actions.length === 2) drawn.pair += 1;
      if (at.counts.length === 0) drawn.quiet += 1;
      if (at.counts.some((c) => c.text === '99+')) drawn.many += 1;
      findings.push(...await walk(page, story.id, [...WIDE, ...TITLED, ...PHONE]));
      drawn.measured += 1;
    }
    assert.equal(drawn.measured, stories.length, 'a story was not measured');
    assert.ok(drawn.pair >= 2, `${drawn.pair} stories draw two actions. The pair needs a wide and a phone case.`);
    assert.ok(drawn.quiet >= 1, `${drawn.quiet} stories draw a bell with no count.`);
    assert.ok(drawn.many >= 2, `${drawn.many} stories draw a 99+ count. It needs a wide and a phone case.`);
    assert.deepEqual(findings, []);

    // The mutation: the actions' column as it was before the fix lets the bell stand on
    // search, and this walk must say so.
    const pair = stories.find((s) => s.id === 'react-appshell--band-actions-pair');
    assert.ok(pair, 'the mutation needs react-appshell--band-actions-pair');
    await openStory(page, pair, { port: server.port, theme: 'dark' });
    await page.addStyleTag({ content: '.ui-app__bar { grid-template-columns: minmax(0, 1fr) minmax(0, var(--panel-sm)) minmax(0, 1fr) !important; }' });
    const mutated = await walk(page, pair.id, WIDE);
    assert.ok(mutated.some((f) => f.includes('stands on search')), 'the old column passed: this walk cannot see an overlap');

    // The mutations of fix round 2: the count back on the glyph's corner, and a Button
    // back at its own 36px. The walk must see each one.
    const many = stories.find((s) => s.id === 'react-appshell--band-actions-many');
    assert.ok(many, 'the mutations need react-appshell--band-actions-many');
    await openStory(page, many, { port: server.port, theme: 'dark' });
    await page.addStyleTag({ content: '.ui-react-app__band-actions .ui-badge { inset: auto auto 50% 50% !important; }'
      + ' .ui-react-app__band-actions > .ui-btn { min-width: 0 !important; min-height: 0 !important; }' });
    const old = await walk(page, many.id, [1280, 721]);
    // The empty gap back in the band with no sidebar: search must cut its words at 561px.
    const alone = stories.find((s) => s.id === 'react-appshell--band-actions-alone');
    assert.ok(alone, 'the mutations need react-appshell--band-actions-alone');
    await openStory(page, alone, { port: server.port, theme: 'dark' });
    await page.addStyleTag({ content: '.ui-app__bar > .ui-app__bar-gap { display: block !important; } .ui-app__bar > .ui-app__search { margin-inline-end: 0 !important; }' });
    old.push(...await walk(page, alone.id, [561]));
    for (const says of ["above the bell's top edge", 'reaches the next control', 'not one size', 'search cuts']) {
      assert.ok(old.some((f) => f.includes(says)), `the old rule passed: this walk cannot see "${says}"`);
    }
  } finally {
    server.proc.kill();
    await browser.close();
  }
});
