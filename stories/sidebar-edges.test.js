/* Rule: the open sidebar has two columns, and the phone menu keeps them (#869). The logo
 * box, each row glyph box, a group label, the note and the avatar start one --space-2
 * inside the row fill. The product name, each label and the account name start one
 * --space-2 after a symbol box as wide as the avatar. The current row's fill starts on
 * the row fill edge. A folded sidebar puts each row glyph and the avatar on the strip's
 * centre line, and hides the note.
 * Before #869 the glyphs stood at 28px, the labels at 56px, the logo at 22.75px and the
 * avatar at 11.5px, and the folded avatar's centre was 10px off the glyphs' centre line.
 *
 * Off unless SIDEBAR_EDGES=1: Playwright is not a dependency of this package, CI does
 * not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… SIDEBAR_EDGES=1 node --test stories/sidebar-edges.test.js
 *
 * It discovers every React/AppShell story. At 1280 it measures each one that draws a
 * sidebar, open or folded. At 390 it opens the menu of each one that has a menu button.
 * It counts the open sidebars, the folded ones, the menus, the notes, the group labels
 * and the rail layout. The CI half is the edge arithmetic in react/src/AppShell.test.tsx.
 *
 * Its limits: one engine, the light theme, the default accent, and two widths. A text
 * edge is the left of a range over its words. A glyph edge is its box, not its painted
 * path. The logo edge is its box: the mark paints 0.75px inside it. An edge is off when
 * it is more than half a pixel from its column. A sub-item keeps the indent of its list
 * and is not measured. A custom `brand` is not measured.
 * why: docs/components.md#page-shell
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The symbol column is one --space-2 inside the row fill. The name column is a 30px
// symbol box and one more --space-2 after it. The folded strip is 41px.
const SYMBOL = 8;
const NAME = 8 + 30 + 8;
const STRIP = 41;

// The edges of the sidebar or the open menu that the page shows now. It is async, so a
// missing element fails the test: a throw inside a frame callback would hang it.
const MEASURE = async () => {
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  // A missing element reads NaN, which is off every column, so it becomes a finding.
  const left = (el) => (el ? el.getBoundingClientRect().left : NaN);
  const centre = (el) => { if (!el) return NaN; const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
  const words = (el) => {
    if (!el) return NaN;
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().left;
  };
  const shown = (el) => el && el.checkVisibility({ visibilityProperty: true });
  const rows = (scope) => [...scope.querySelectorAll('.ui-nav__item:not(.ui-nav__item--sub)')]
    .filter((row) => !row.closest('.ui-app__head') && shown(row));
  const note = (scope) => scope.querySelector('.ui-app__note');
  const ink = (el) => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--text)';
    el.append(probe);
    const text = getComputedStyle(probe).color;
    probe.remove();
    const s = getComputedStyle(el);
    return { size: s.fontSize, weight: s.fontWeight, color: s.color, text };
  };
  const dialog = document.querySelector('.ui-drawer.is-open .ui-drawer__panel');
  if (dialog) {
    const body = dialog.querySelector('.ui-drawer__body');
    const fill = left(body) + parseFloat(getComputedStyle(body).paddingLeft);
    const n = note(dialog);
    const av = dialog.querySelector('.ui-drawer__footer .ui-app__av');
    return ({
      where: 'menu', fill,
      symbols: [
        ['logo', left(dialog.querySelector('.ui-drawer__mark'))],
        ...rows(body).filter((r) => r.querySelector('.ui-nav__ic')).map((r) => [r.textContent.trim(), left(r.querySelector('.ui-nav__ic'))]),
        ...[...body.querySelectorAll('.ui-nav__cap')].filter(shown).map((c) => [`group ${c.textContent}`, words(c)]),
        ...(n ? [['note', words(n)]] : []),
        ['avatar', left(av)],
      ],
      names: [
        ['product name', words(dialog.querySelector('.ui-drawer__title'))],
        ...rows(body).filter((r) => r.querySelector('.ui-nav__ic')).map((r) => [r.textContent.trim(), words(r.querySelector('.ui-nav__label'))]),
        ['account name', words(dialog.querySelector('.ui-drawer__footer .ui-app__who b'))],
      ],
      fills: rows(body).filter((r) => r.classList.contains('is-active')).map((r) => [r.textContent.trim(), left(r)]),
      note: n && { ...ink(n), last: !n.nextElementSibling, shown: shown(n) },
      groups: body.querySelectorAll('.ui-nav__cap').length,
    });
  }
  const rail = document.querySelector('.ui-app__rail');
  if (!shown(rail) || rail.getBoundingClientRect().width === 0) return (null);
  const app = rail.closest('.ui-app');
  const fill = left(rail) + parseFloat(getComputedStyle(rail).paddingLeft);
  const n = note(rail);
  const av = rail.querySelector('.ui-app__user .ui-avatar');
  const rail_ = app.classList.contains('ui-app--topbar') ? 'topbar' : 'rail';
  if (app.classList.contains('is-collapsed')) {
    return ({
      where: 'folded', layout: rail_, fill,
      centres: [
        ...rows(rail).map((r) => [r.textContent.trim(), centre(r.querySelector('.ui-nav__ic svg') ?? r)]),
        ['avatar', centre(av)],
      ],
      note: n && { shown: shown(n) },
    });
  }
  const brand = rail.querySelector('.ui-app__head .ui-app__brand');
  const mark = brand?.querySelector('.ui-react-app__mark');
  return ({
    where: 'open', layout: rail_, fill,
    symbols: [
      ...(mark ? [['logo', left(mark)]] : []),
      ...rows(rail).filter((r) => r.querySelector('.ui-nav__ic')).map((r) => [r.textContent.trim(), left(r.querySelector('.ui-nav__ic'))]),
      ...[...rail.querySelectorAll('.ui-nav__cap')].filter(shown).map((c) => [`group ${c.textContent}`, words(c)]),
      ...(n ? [['note', words(n)]] : []),
      ['avatar', left(av)],
    ],
    names: [
      ...(mark ? [['product name', words(brand.querySelector('span'))]] : []),
      ...rows(rail).filter((r) => r.querySelector('.ui-nav__ic')).map((r) => [r.textContent.trim(), words(r.querySelector('.ui-nav__label'))]),
      ['account name', words(rail.querySelector('.ui-app__who b'))],
    ],
    fills: rows(rail).filter((r) => r.classList.contains('is-active')).map((r) => [r.textContent.trim(), left(r)]),
    note: n && { ...ink(n), last: n.nextElementSibling?.classList.contains('ui-app__user'), shown: shown(n) },
    groups: rail.querySelectorAll('.ui-nav__cap').length,
  });
};

const off = (a, b) => !(Math.abs(a - b) <= 0.5);

/** Every finding for one measurement. */
function judge(id, m) {
  const found = [];
  const at = `${id} (${m.where})`;
  if (m.where === 'folded') {
    const line = m.fill + STRIP / 2;
    for (const [name, x] of m.centres) if (off(x, line)) found.push(`${at}: ${name}'s centre is ${x}px, not on the ${line}px centre line`);
    if (m.note?.shown) found.push(`${at}: the note shows in a folded sidebar`);
    return found;
  }
  for (const [name, x] of m.symbols) if (off(x, m.fill + SYMBOL)) found.push(`${at}: ${name} starts at ${x}px, not on the ${m.fill + SYMBOL}px symbol column`);
  for (const [name, x] of m.names) if (off(x, m.fill + NAME)) found.push(`${at}: ${name} starts at ${x}px, not on the ${m.fill + NAME}px name column`);
  for (const [name, x] of m.fills) if (off(x, m.fill)) found.push(`${at}: the fill of ${name} starts at ${x}px, not at ${m.fill}px`);
  if (m.note) {
    if (!m.note.shown) found.push(`${at}: the note does not show`);
    if (!m.note.last) found.push(`${at}: the note is not the last line above the account`);
    if (m.note.size !== '13px' || m.note.weight !== '400') found.push(`${at}: the note is ${m.note.size} ${m.note.weight}, not the 13px caption rank`);
    if (m.note.color !== m.note.text) found.push(`${at}: the note is ${m.note.color}, not body ink ${m.note.text}`);
  }
  return found;
}

/** The sidebar at 1280, and the menu at 390 when the story has a menu button. */
async function measure(page, story, port, openStory) {
  await page.setViewportSize({ width: 1280, height: 800 });
  const read = (at) => page.evaluate(MEASURE).catch((e) => { throw new Error(`${story.id} at ${at}: ${e.message}`); });
  await openStory(page, story, { port, theme: 'light' });
  const wide = await read(1280);
  await page.setViewportSize({ width: 390, height: 844 });
  await openStory(page, story, { port, theme: 'light' });
  const menu = page.locator('.ui-app__menu:visible');
  let phone = null;
  if (await menu.count()) {
    if (!(await page.locator('.ui-drawer.is-open').count())) await menu.click();
    await page.locator('.ui-drawer.is-open .ui-drawer__panel').waitFor();
    phone = await read(390);
  }
  return [wide, phone].filter(Boolean);
}

test('the sidebar and the phone menu keep one symbol column and one name column', {
  skip: process.env.SIDEBAR_EDGES !== '1' && 'set SIDEBAR_EDGES=1',
}, async () => {
  const { serve, openStory, playwright, indexed } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'SIDEBAR_EDGES=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build}. Run: npm run build-storybook`);
  const stories = indexed(build).filter((s) => s.id.startsWith('react-appshell--'));
  assert.ok(stories.length >= 40, `${stories.length} AppShell stories found. A sweep that lost them measures nothing.`);

  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const findings = [];
    const drawn = { open: 0, folded: 0, menu: 0, notes: 0, groups: 0, rail: 0 };
    for (const story of stories) {
      for (const m of await measure(page, story, server.port, openStory)) {
        drawn[m.where] += 1;
        if (m.note) drawn.notes += 1;
        if (m.groups) drawn.groups += 1;
        if (m.layout === 'rail') drawn.rail += 1;
        findings.push(...judge(story.id, m));
      }
    }
    console.log(`measured: ${JSON.stringify(drawn)}`);
    assert.ok(drawn.open >= 25, `${drawn.open} open sidebars measured`);
    assert.ok(drawn.folded >= 3, `${drawn.folded} folded sidebars measured: Folded, Note Folded and Rail Folded`);
    assert.ok(drawn.menu >= 25, `${drawn.menu} phone menus measured`);
    assert.ok(drawn.notes >= 3, `${drawn.notes} notes measured: the open note, the folded note and the menu note`);
    assert.ok(drawn.groups >= 2, `${drawn.groups} sidebars with group labels measured`);
    assert.ok(drawn.rail >= 3, `${drawn.rail} rail layout sidebars measured`);
    assert.deepEqual(findings, []);

    // The mutation: the rows and the avatar as they were before #869. The walk must see
    // the glyphs, the labels and the avatar leave their columns, and a note that stays.
    const note = stories.find((s) => s.id === 'react-appshell--note');
    const folded = stories.find((s) => s.id === 'react-appshell--note-folded');
    assert.ok(note && folded, 'the mutation needs react-appshell--note and react-appshell--note-folded');
    const OLD = '.ui-app__rail .ui-nav--side .ui-nav__item, .ui-react-app__menu .ui-nav__item { padding-inline: 12px !important; gap: 11px !important; }'
      + ' .ui-nav__ic { width: auto !important; } .ui-app__av { margin-inline-start: 5.5px !important; }'
      + ' .ui-app__user-trigger .ui-avatar { margin-inline-start: -10px !important; }'
      + ' .ui-app__note { visibility: visible !important; color: var(--muted) !important; }';
    const mutated = [];
    for (const story of [note, folded]) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await openStory(page, story, { port: server.port, theme: 'light' });
      await page.addStyleTag({ content: OLD });
      mutated.push(...judge(story.id, await page.evaluate(MEASURE)));
    }
    for (const says of ['Overview starts at', 'avatar starts at', "avatar's centre", 'note shows in a folded', 'not body ink']) {
      assert.ok(mutated.some((f) => f.includes(says)), `the old rules passed: this walk cannot see "${says}"`);
    }
  } finally {
    server.proc.kill();
    await browser.close();
  }
});
