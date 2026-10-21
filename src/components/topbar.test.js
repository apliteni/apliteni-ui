// Rule: the theme toggle reports the theme you are IN, to eyes and to a screen
// reader alike, and both readings move when the theme moves.
//
// These tests resolve the **computed accessible name** with axe-core's accname
// implementation rather than matching an `aria-label=` substring. The two are
// not the same check: a name can be spelled correctly in the attribute and still
// be overridden by aria-labelledby, shadowed by inner text, or — the failure this
// file exists for — never updated after the first paint. Only the resolved name
// says what a screen reader announces.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { themeToggle, applyTheme, wireTopbar, versionSwitcher } from './topbar.js';

const require = createRequire(import.meta.url);
const axeSrc = readFileSync(path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js'), 'utf8');

// One window for the file — axe is ~1MB and evaluating it per test is the
// expensive part. The <html> element is the theme root the kit writes to.
const dom = new JSDOM('<!doctype html><html lang="en"><head><title>kit</title></head><body></body></html>', {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
});
dom.window.eval(axeSrc);
after(() => dom.window.close());

const { document: doc, axe } = dom.window;

/** The name a screen reader announces for `el`, per the accname spec. */
const nameOf = (el) => {
  axe.setup(el.ownerDocument.documentElement);
  try {
    return axe.commons.text.accessibleText(el);
  } finally {
    axe.teardown();
  }
};

/** Which glyph is on screen. The sun carries a circle; the moon is one path. */
const glyphOf = (btn) => {
  const ic = btn.querySelector('[data-theme-icon]');
  if (!ic || !ic.querySelector('svg')) return 'none';
  return ic.querySelector('circle') ? 'sun' : 'moon';
};

/** Mount markup on the theme root and hand back the toggle button. */
const mount = (html, theme) => {
  doc.documentElement.setAttribute('data-theme', theme);
  doc.body.innerHTML = html;
  return doc.querySelector('[data-theme-toggle]');
};

const DARK_NAME = 'Theme: Dark. Switch to light.';
const LIGHT_NAME = 'Theme: Light. Switch to auto.';

test('the toggle announces the theme it is in, not the one a click would bring', () => {
  assert.equal(nameOf(mount(themeToggle('dark'), 'dark')), DARK_NAME);
  assert.equal(nameOf(mount(themeToggle('light'), 'light')), LIGHT_NAME);
});

// The convention the rest of the kit's stateful controls already use: the
// control shows the state it is in. Moon while dark, sun while light.
test('the icon shows the current theme: moon in dark, sun in light', () => {
  assert.equal(glyphOf(mount(themeToggle('dark'), 'dark')), 'moon');
  assert.equal(glyphOf(mount(themeToggle('light'), 'light')), 'sun');
});

// The defect this file was written for: a name that is correct once and never
// again. Both readings have to follow applyTheme, not just the first paint.
test('applyTheme rewrites the announced name and the glyph on every flip', () => {
  const btn = mount(themeToggle('dark'), 'dark');
  const root = doc.documentElement;

  applyTheme('light', root);
  assert.equal(nameOf(btn), LIGHT_NAME, 'name after flipping to light');
  assert.equal(glyphOf(btn), 'sun', 'glyph after flipping to light');

  applyTheme('dark', root);
  assert.equal(nameOf(btn), DARK_NAME, 'name after flipping back to dark');
  assert.equal(glyphOf(btn), 'moon', 'glyph after flipping back to dark');
});

// A name that never changes is a name that tells you nothing about the state.
test('the two names differ — the control is not announcing one static string', () => {
  const btn = mount(themeToggle('dark'), 'dark');
  const root = doc.documentElement;
  applyTheme('dark', root);
  const inDark = nameOf(btn);
  applyTheme('light', root);
  const inLight = nameOf(btn);
  assert.notEqual(inDark, inLight, `the name stayed ${JSON.stringify(inDark)} across a theme flip`);
});

// The tooltip is the sighted reading of the same fact. If it disagreed with the
// announced name, WCAG 2.5.3 would have something to say about it.
test('the tooltip says the same thing as the announced name', () => {
  const btn = mount(themeToggle('dark'), 'dark');
  applyTheme('light', doc.documentElement);
  assert.equal(btn.getAttribute('title'), nameOf(btn));
});

// Structural: applyTheme may only reach for hooks themeToggle() actually
// renders. `[data-theme-label]` was queried and set for a span the kit never
// emitted — a branch that could not run, kept alive by a stale build artifact.
test('applyTheme queries no hook that themeToggle() does not render', () => {
  const src = readFileSync(new URL('./topbar.js', import.meta.url), 'utf8');
  const start = src.indexOf('export function applyTheme');
  const end = src.indexOf('const ACCENT_KEY');
  assert.ok(start > -1 && end > start, 'could not locate applyTheme in topbar.js');

  const hooks = [...new Set([...src.slice(start, end).matchAll(/\[(data-[\w-]+)\]/g)].map((m) => m[1]))];
  assert.ok(hooks.length > 0, 'applyTheme queries no data hooks at all — did the shape change?');

  const html = themeToggle();
  for (const hook of hooks) {
    assert.ok(html.includes(hook), `applyTheme queries [${hook}], which themeToggle() never renders`);
  }
});

// The stylesheet used to uppercase the tone key itself; now the kit writes the
// word, and anything else the caller passes is shown as passed.
// why: docs/foundations.md#labels-and-titles
test('a version badge shows the word for its tone, not the key', () => {
  const html = versionSwitcher([
    { label: 'v3', badge: 'live' }, { label: 'v2', badge: 'archive' }, { label: 'v1' },
    { label: 'v0', badge: 'LIVE' }, { label: 'rc', badge: 'Preview' }, { label: 'x', badge: 'constructor' },
  ]);
  const badges = [...html.matchAll(/<span class="vbadge (\w+)">([^<]*)<\/span>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(badges, [
    ['live', 'Live'], ['arch', 'Archive'], ['arch', 'Archive'],
    ['live', 'Live'], ['arch', 'Preview'], ['arch', 'constructor'],
  ]);
});

test('a version row shows its name, badge and tick without a description line', () => {
  const html = versionSwitcher([{ label: 'v3', meta: 'Old description', badge: 'live' }]);
  mount(html, 'light');
  const row = doc.querySelector('.vopt');
  assert.equal(row.querySelector('.vname').textContent, 'v3');
  assert.equal(row.querySelector('.vbadge').textContent, 'Live');
  assert.ok(row.querySelector('.vtick'));
  assert.equal(row.querySelector('.vmeta'), null);
  assert.ok(!row.textContent.includes('Old description'));
});

// Synthetic OS events verify state and persistence, not native OS settings UI.
test('auto stays saved while OS changes and the vanilla button cycles all choices', () => {
  const view = dom.window;
  const media = Object.assign(new view.EventTarget(), { matches: true });
  view.matchMedia = () => media;
  const previousDocument = globalThis.document;
  const previousStorage = globalThis.localStorage;
  const values = new Map([["apliteni-strategy-theme", "auto"]]);
  globalThis.document = doc;
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  try {
    const btn = mount(themeToggle('auto'), 'dark');
    wireTopbar(doc);
    assert.equal(nameOf(btn), 'Theme: Auto. Switch to dark.');
    assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');
    assert.ok(btn.querySelector('rect'), 'auto uses the monitor glyph');
    media.matches = false;
    media.dispatchEvent(new view.Event('change'));
    assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');
    assert.equal(values.get('apliteni-strategy-theme'), 'auto');
    btn.click();
    assert.equal(values.get('apliteni-strategy-theme'), 'dark');
    media.matches = true;
    media.dispatchEvent(new view.Event('change'));
    assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');
    btn.click();
    assert.equal(values.get('apliteni-strategy-theme'), 'light');
    btn.click();
    assert.equal(values.get('apliteni-strategy-theme'), 'auto');
    assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');
  } finally {
    globalThis.document = previousDocument;
    globalThis.localStorage = previousStorage;
  }
});

// Source CSS only: JSDOM does not measure antialiased pixels or host overrides.
for (const theme of ['dark', 'light']) {
  test(`theme glyph contrast: all vanilla choices in ${theme}`, async () => {
    const { kitCssFor, effectiveBackground, parseColour, composite, ratio } = await import('../../stories/lib/contrast.js');
    const view = new JSDOM(`<style>${kitCssFor(theme).css}</style><body>${['dark', 'light', 'auto'].map(themeToggle).join('')}</body>`).window;
    try {
      const buttons = [...view.document.querySelectorAll('[data-theme-toggle]')];
      assert.equal(buttons.length, 3, 'every theme choice rendered');
      let measured = 0;
      for (const button of buttons) {
        const svg = button.querySelector('svg');
        assert.ok(svg, 'each choice contains a glyph');
        assert.equal(svg.getAttribute('stroke'), 'currentColor');
        for (const state of ['', 'hover', 'focus-visible', 'active']) {
          button.setAttribute('data-ui-state', state);
          const cs = view.getComputedStyle(svg);
          const ink = parseColour(cs.color);
          assert.ok(ink, 'glyph ink resolves');
          const bg = effectiveBackground(svg, view);
          assert.notEqual(bg, 'IMAGE', 'solid background resolves');
          let opacity = 1;
          for (let el = svg; el; el = el.parentElement) opacity *= Number.parseFloat(view.getComputedStyle(el).opacity || '1');
          const contrast = ratio(composite([ink[0], ink[1], ink[2], ink[3] * opacity], bg), bg);
          assert.ok(contrast >= 3, `${button.title}/${state || 'rest'}: ${contrast.toFixed(2)}:1`);
          assert.equal(cs.color, view.getComputedStyle(button).color, 'glyph uses the control ink');
          measured++;
        }
      }
      assert.equal(measured, 12, 'all choices × interaction states measured');
    } finally { view.close(); }
  });
}

// Chromium checks the shipped stylesheet and factory at phone widths. This does
// not measure other consumers or custom fonts. CI skips this optional browser run.
test('phone topbars keep every control inside two rows', { skip: process.env.TOPBAR_ROWS !== '1' }, async () => {
  const { kitStylesheet, playwright } = await import('../../stories/lib/tap-zone.js');
  const stories = await import('../../stories/components/Topbar.stories.js');
  const subjects = Object.entries(stories).filter(([, story]) => typeof story?.render === 'function')
    .map(([name, story]) => ({ name, html: story.render() }))
    .filter(({ html }) => JSDOM.fragment(html).querySelector('.topbar'));
  assert.ok(subjects.length >= 3, 'Full, SignedOut and InShell must be measured');
  // A consumer's version label can be far longer than the story's 16 characters.
  const long = 'phoenix.2026.002.release-candidate';
  const full = subjects.find(({ html }) => html.includes('class="vsw"') && html.includes('phoenix.2026.002'));
  assert.ok(full, 'a subject with a version switch must be measured');
  subjects.push({ name: `${full.name} (long label)`, html: full.html.replaceAll('phoenix.2026.002', long), long: true });
  const pw = await playwright();
  assert.ok(pw, 'TOPBAR_ROWS requires UI_PLAYWRIGHT');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME || undefined });
  const css = kitStylesheet();
  let measured = 0;
  let drifted = 0;
  let longMutated = 0;
  try {
    for (const subject of subjects) for (const width of [320, 390]) for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 600 }, hasTouch: true });
      await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body>${subject.html}</body></html>`);
      const measure = () => page.evaluate(() => {
        const box = (selector) => {
          const element = document.querySelector(`.topbar ${selector}`);
          if (!element) return null;
          const { left, right, top, bottom } = element.getBoundingClientRect();
          return { name: selector.slice(1), left, right, top, bottom };
        };
        const page = document.querySelector('.ui-app-page');
        const band = document.querySelector('.topbar').getBoundingClientRect();
        const rail = document.querySelector('.ui-app__rail');
        return { width: innerWidth, scroll: document.documentElement.scrollWidth,
          band: band.height, offset: page ? Number.parseFloat(getComputedStyle(page).getPropertyValue('--ui-app-top')) : null,
          rail: rail && rail.getClientRects().length ? rail.getBoundingClientRect().top : null,
          first: ['.brand', '.toggle', '.acct'].map(box).filter(Boolean), second: ['.dtsw', '.vsw'].map(box).filter(Boolean) };
      });
      const fits = (m) => m.scroll === m.width
        && [...m.first, ...m.second].every(r => r.left >= 0 && r.right <= m.width)
        && Math.min(...m.second.map(r => r.top)) >= Math.max(...m.first.map(r => r.bottom));
      // Row one ends at the 12px inset: the account (when drawn) is on it, and the theme
      // switch is 8px before the account, or on the inset when no account is drawn.
      const grouped = (m) => {
        const [toggle, account] = ['toggle', 'acct'].map(n => m.first.find(r => r.name === n));
        if (!toggle) return false;
        const end = account ? account.right : toggle.right;
        const gap = account ? account.left - toggle.right : 0;
        return Math.abs(end - (m.width - 12)) < 0.5 && Math.abs(gap - (account ? 8 : 0)) < 0.5;
      };
      // The two switches on row two keep 8px between them, whatever the version label says.
      const apart = (m) => m.second.length < 2 || m.second[1].left - m.second[0].right >= 8 - 0.5;
      // A shell that owns the offset draws exactly the band it reserves. Below 720px its rail is a drawer, undrawn until opened.
      const reserved = (m) => m.offset === null || (Math.abs(m.band - m.offset) < 0.5 && (m.rail === null || Math.abs(m.rail - m.offset) < 0.5));
      const all = (m) => fits(m) && grouped(m) && apart(m) && reserved(m);
      assert.ok(all(await measure()), `${subject.name} ${width}px ${theme}: both rows must fit, row one must end at the inset and the offset must be true`);
      measured++;
      if (subject.long) {
        const clipped = await page.evaluate(() => { const c = document.querySelector('.topbar .vsw__btn .cur'); return c.scrollWidth > c.clientWidth; });
        assert.ok(clipped, 'the long label must end in an ellipsis');
        // Letting the label keep its full width brings the overlap back.
        await page.addStyleTag({ content: '.topbar__in > .vsw, .vsw__btn { max-width: none !important; } .vsw__btn .cur { min-width: auto !important; overflow: visible !important; }' });
        assert.equal(apart(await measure()), false, 'the unshrunk label mutation must fail');
        longMutated++;
        await page.reload();
        await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body>${subject.html}</body></html>`);
      }
      // Removing the phone layout must restore the failure this check detects.
      await page.addStyleTag({ content: '.topbar__in { display: flex !important; flex-wrap: nowrap !important; }' });
      assert.equal(fits(await measure()), false, 'the one-row mutation must fail');
      await page.reload();
      await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body>${subject.html}</body></html>`);
      // Letting the version switch span the two auto columns brings the drift back.
      await page.addStyleTag({ content: '.topbar__in > .vsw { grid-area: 2 / 3 / 3 / 5 !important; }' });
      if (!grouped(await measure())) drifted++;
      await page.close();
    }
    // A shell whose band holds one row of controls reserves the same 52px as a wide screen.
    const shell = subjects.find(({ html }) => html.includes('ui-app-page'));
    assert.ok(shell, 'a shell subject must be measured');
    for (const width of [320, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 600 }, hasTouch: true });
      await page.setContent(`<html><head><style>${css}</style></head><body>${shell.html}</body></html>`);
      await page.evaluate(() => document.querySelectorAll('.topbar .dtsw, .topbar .vsw').forEach(e => e.remove()));
      const one = await page.evaluate(() => ({ band: document.querySelector('.topbar').getBoundingClientRect().height,
        offset: Number.parseFloat(getComputedStyle(document.querySelector('.ui-app-page')).getPropertyValue('--ui-app-top')),
        rail: document.querySelector('.ui-app__rail').getClientRects().length ? document.querySelector('.ui-app__rail').getBoundingClientRect().top : 52 }));
      assert.deepEqual([one.band, one.offset, one.rail], [52, 52, 52], `one-row band at ${width}px`);
      await page.close();
    }
    assert.equal(longMutated, 4, 'the long label was measured at both widths and themes');
    assert.ok(drifted >= 2, 'the spanning mutation must break row one in Full and Signed out');
    assert.equal(measured, subjects.length * 4, 'every subject, phone width and theme was measured');
  } finally { await browser.close(); }
});
