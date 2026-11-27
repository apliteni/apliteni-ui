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
 * It discovers every React/AppShell story and plans one case for each story, size and
 * theme: the sidebar at 1280 and the phone menu at 390. A case with no measurement
 * fails, unless ABSENT names it with its reason, and a listed case that measures fails
 * too. A case's rendered theme must equal the planned theme, or it fails. A story in
 * FOLDED must measure folded, and every other one open. The measured count must equal
 * the planned count. A mutation hides one sidebar and one menu, and the coverage check
 * must name both. A mutation renders the wrong theme, and the coverage check must name
 * it. It also measures the do-and-don't pair on the page guideline at both sizes and in
 * both themes: the Do rail keeps both columns, and the Don't rail breaks only the note's.
 * The CI half is the edge arithmetic in react/src/AppShell.test.tsx.
 *
 * Its limits: one engine, the default accent, and two widths. A text
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
const SIZES = [{ width: 1280, height: 800 }, { width: 390, height: 844 }];
const THEMES = ['light', 'dark'];
// The stories that draw a folded sidebar at 1280. Every other sidebar is open.
const FOLDED = new Set(['react-appshell--folded', 'react-appshell--note-folded', 'react-appshell--rail-folded']);
// The cases that measure nothing, each with its reason. Every other case must measure.
// A shell with one section draws no sidebar and no menu: react/src/AppShell.tsx `navigable`.
const ALONE = 'one section, so the shell draws no sidebar and no menu';
// A story that forces light in its globals draws no dark case: the URL theme cannot
// override a story-level global.
const FORCED_LIGHT = 'the story forces light theme, so it draws no dark case';
const ABSENT = Object.fromEntries([
  ...['react-appshell--band-actions-alone', 'react-appshell--band-actions-alone-phone']
    .flatMap((id) => SIZES.flatMap(({ width }) => THEMES.map((theme) => [`${id} at ${width} ${theme}`, ALONE]))),
  ...['react-appshell--band-actions-light', 'react-appshell--band-actions-phone-light']
    .flatMap((id) => SIZES.map(({ width }) => [`${id} at ${width} dark`, FORCED_LIGHT])),
]);
// The guideline pair: Guidelines/The page, rule "Align the sidebar on one column".
const PAIR = '.tp-rail .ui-app__rail';

// The edges of the sidebar or the open menu that the page shows now, or of the rail at
// `pick` in a page with more than one. It is async, so a missing element fails the
// test: a throw inside a frame callback would hang it.
const MEASURE = async (pick) => {
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
  const dialog = pick ? null : document.querySelector('.ui-drawer.is-open .ui-drawer__panel');
  if (dialog) {
    const body = dialog.querySelector('.ui-drawer__body');
    const fill = left(body) + parseFloat(getComputedStyle(body).paddingLeft);
    const n = note(dialog);
    const av = dialog.querySelector('.ui-drawer__footer .ui-app__av');
    return ({
      where: 'menu', fill, theme: document.documentElement.getAttribute('data-theme'),
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
  const rail = pick ? document.querySelectorAll(pick.selector)[pick.index] : document.querySelector('.ui-app__rail');
  if (!shown(rail) || rail.getBoundingClientRect().width === 0) return (null);
  const app = rail.closest('.ui-app');
  const fill = left(rail) + parseFloat(getComputedStyle(rail).paddingLeft);
  const n = note(rail);
  const av = rail.querySelector('.ui-app__user .ui-avatar');
  const rail_ = app.classList.contains('ui-app--topbar') ? 'topbar' : 'rail';
  if (app.classList.contains('is-collapsed')) {
    return ({
      where: 'folded', layout: rail_, fill, theme: document.documentElement.getAttribute('data-theme'),
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
    where: 'open', layout: rail_, fill, theme: document.documentElement.getAttribute('data-theme'),
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

const key = (id, width, theme) => `${id} at ${width} ${theme}`;

/** One case: the sidebar at 1280, or the menu at 390 when the story has a menu button.
 *  `extra` is a style that a mutation adds. A story that does not render measures nothing. */
async function measure(page, story, { port, size, theme, extra, forceTheme }, openStory) {
  await page.setViewportSize(size);
  const got = await openStory(page, story, { port, theme });
  if (got.phase !== 'finished' || got.id !== story.id) return null;
  if (extra) await page.addStyleTag({ content: extra });
  if (forceTheme) await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), forceTheme);
  const read = () => page.evaluate(MEASURE).catch((e) => { throw new Error(`${key(story.id, size.width, theme)}: ${e.message}`); });
  if (size.width > 720) return read();
  const menu = page.locator('.ui-app__menu:visible');
  if (!(await menu.count())) return null;
  if (!(await page.locator('.ui-drawer.is-open').count())) await menu.click();
  await page.locator('.ui-drawer.is-open .ui-drawer__panel').waitFor();
  return read();
}

/** Every case the plan expects and did not get, every listed absence that measured, and
 *  every sidebar in the wrong state. `cases` maps each planned key to its measurement. */
function coverage(cases) {
  const found = [];
  for (const [at, m] of cases) {
    const id = at.split(' ')[0];
    if (ABSENT[at]) { if (m) found.push(`${at}: ABSENT says "${ABSENT[at]}", but it measured ${m.where}`); continue; }
    if (!m) { found.push(`${at}: no sidebar or menu was measured`); continue; }
    const theme = at.split(' ').at(-1);
    if (m.theme !== theme) found.push(`${at}: rendered theme ${m.theme}, not the planned ${theme}`);
    const want = at.includes(' at 390 ') ? 'menu' : FOLDED.has(id) ? 'folded' : 'open';
    if (m.where !== want) found.push(`${at}: measured ${m.where}, not ${want}`);
  }
  for (const at of Object.keys(ABSENT)) if (!cases.has(at)) found.push(`ABSENT names ${at}, which the plan does not hold`);
  return found;
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
    const page = await browser.newPage({ viewport: SIZES[0] });
    const port = server.port;
    const findings = [];
    const cases = new Map();
    const drawn = { open: 0, folded: 0, menu: 0, notes: 0, groups: 0, rail: 0 };
    for (const story of stories) {
      for (const size of SIZES) {
        for (const theme of THEMES) {
          const at = key(story.id, size.width, theme);
          const m = ABSENT[at] ? null : await measure(page, story, { port, size, theme }, openStory);
          cases.set(at, m);
          if (!m) continue;
          drawn[m.where] += 1;
          if (m.note) drawn.notes += 1;
          if (m.groups) drawn.groups += 1;
          if (m.layout === 'rail') drawn.rail += 1;
          findings.push(...judge(`${story.id} ${theme}`, m));
        }
      }
    }
    const planned = stories.length * SIZES.length * THEMES.length;
    const measured = [...cases.values()].filter(Boolean).length;
    console.log(`planned ${planned}, measured ${measured}, absent ${Object.keys(ABSENT).length}: ${JSON.stringify(drawn)}`);
    assert.equal(cases.size, planned, 'a story, a size or a theme left the plan');
    assert.deepEqual(coverage(cases), []);
    assert.equal(measured, planned - Object.keys(ABSENT).length, 'the measured cases are not the planned cases less ABSENT');
    assert.ok(drawn.folded >= FOLDED.size * THEMES.length, `${drawn.folded} folded sidebars measured`);
    assert.ok(drawn.notes >= 3 * THEMES.length, `${drawn.notes} notes measured: the open note, the folded note and the menu note`);
    assert.ok(drawn.groups >= 2, `${drawn.groups} sidebars with group labels measured`);
    assert.ok(drawn.rail >= 3, `${drawn.rail} rail layout sidebars measured`);
    assert.deepEqual(findings, []);

    // The pair on the page guideline: two rails at each size, in each theme. The Do rail
    // keeps every column, and the Don't rail moves only the note off the symbol column.
    const guide = indexed(build).filter((s) => s.id.startsWith('guidelines-the-page--'));
    assert.equal(guide.length, 1, `${guide.length} page guideline stories found`);
    const pair = [];
    for (const size of SIZES) {
      for (const theme of THEMES) {
        const at = `${guide[0].id} at ${size.width} ${theme}`;
        await page.setViewportSize(size);
        const got = await openStory(page, guide[0], { port, theme });
        assert.equal(got.phase, 'finished', `${at} did not render`);
        const [yes, no] = [await page.evaluate(MEASURE, { selector: PAIR, index: 0 }), await page.evaluate(MEASURE, { selector: PAIR, index: 1 })];
        if (!yes || !no) { pair.push(`${at}: the pair shows ${[yes, no].filter(Boolean).length} of its 2 rails`); continue; }
        pair.push(...judge(`${at} Do`, yes));
        const wrong = judge(`${at} Don't`, no);
        if (wrong.length !== 1 || !wrong[0].includes('note starts at')) pair.push(`${at} Don't: ${wrong.length} findings, not the note's one: ${wrong.join('; ')}`);
      }
    }
    assert.deepEqual(pair, []);

    // The coverage mutation: one sidebar and one menu that draw nothing. The check must
    // name both cases, or a lost case would pass as it did before.
    const centred = stories.find((s) => s.id === 'react-appshell--centered');
    assert.ok(centred, 'the coverage mutation needs react-appshell--centered');
    const HIDE = '.ui-app__rail, .ui-app__menu { display: none !important; }';
    const lost = new Map(cases);
    for (const size of SIZES) lost.set(key(centred.id, size.width, 'light'), await measure(page, centred, { port, size, theme: 'light', extra: HIDE }, openStory));
    const named = coverage(lost);
    for (const size of SIZES) {
      const at = key(centred.id, size.width, 'light');
      assert.ok(named.some((f) => f.startsWith(`${at}:`)), `a hidden case passed: the coverage check cannot see ${at}`);
    }

    // The theme mutation: a case that renders a theme other than the one the plan
    // asked for. The check must name it, or a light case would pass as dark coverage.
    const band = stories.find((s) => s.id === 'react-appshell--band-actions');
    assert.ok(band, 'the theme mutation needs react-appshell--band-actions');
    const themed = new Map(cases);
    const at = key(band.id, 1280, 'light');
    themed.set(at, await measure(page, band, { port, size: SIZES[0], theme: 'light', forceTheme: 'dark' }, openStory));
    const namedTheme = coverage(themed);
    assert.ok(namedTheme.some((f) => f === `${at}: rendered theme dark, not the planned light`),
      `a wrong-theme case passed: the coverage check cannot see ${at}`);

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
      mutated.push(...judge(story.id, await measure(page, story, { port, size: SIZES[0], theme: 'light', extra: OLD }, openStory)));
    }
    for (const says of ['Overview starts at', 'avatar starts at', "avatar's centre", 'note shows in a folded', 'not body ink']) {
      assert.ok(mutated.some((f) => f.includes(says)), `the old rules passed: this walk cannot see "${says}"`);
    }
  } finally {
    server.proc.kill();
    await browser.close();
  }
});
