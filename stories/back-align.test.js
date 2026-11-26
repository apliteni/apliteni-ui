/* Rule: a back link's arrow starts on the left edge of the title under it, within
 * 0.5px, and its hover ground and focus ring stay inside every box that clips them
 * and inside the screen. Before #869 the arrow started 13.2px right of the title:
 * the link's left padding and the chevron's empty space.
 *
 * Off unless BACK_ALIGN=1: Playwright is not a dependency of this package, CI does
 * not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals.iife.js BACK_ALIGN=1 node --test stories/back-align.test.js
 *
 * The second test, the walk, has its own note below.
 *
 * The subjects are found, not listed: each story of a source file that draws a back
 * link, as `BackLink`, the `back` prop of AppShell or a ThreeColumnPage, opened at 390
 * and 1280. A story that shows a link at either width is a subject. Each subject is
 * measured at the 10 sizes, in light and dark. The arrow's ink is the glyph's shape
 * less half its stroke, which is where a round join paints. The title is the first
 * heading or `.gb-title` after the link in document order that shows.
 *
 * Its limits: one engine. The link is read at rest, and the ring is its width and gap
 * outside the link's box, not a painted ring. A link that stands in no flow with a
 * title, or a title that is not a heading or `.gb-title`, is not measured.
 * The source half, which runs in CI, is in src/styles/back.test.js.
 * why: docs/components.md#back-link
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678],
  [984, 1016], [1536, 864], [2560, 1440]];
const THEMES = ['light', 'dark'];
const SLACK = 0.5;
// The subjects that the build had when #869 shipped. Fewer means discovery lost some.
const FLOOR = 18;
// A source file draws a back link when it names one of these.
const DRAWS = /\bBackLink\b|\bback(?:=\{|:\s*\{)|\bThreeColumnPage\b/;

/* Each visible link on the page: where its arrow's ink starts, where its title starts,
   and each edge where a box that clips, or the screen, cuts its ground or its ring. */
const READ = `() => [...document.querySelectorAll('.ui-back')].filter((a) => a.checkVisibility()).map((a) => {
  const line = a.querySelector('svg polyline, svg path');
  const svg = line.ownerSVGElement;
  const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
  const ink = line.getBoundingClientRect().left - parseFloat(getComputedStyle(line).strokeWidth) * scale / 2;
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  walk.currentNode = a;
  let title = null;
  while (walk.nextNode()) {
    const el = walk.currentNode;
    if (a.contains(el) || !el.matches('h1, h2, h3, .gb-title') || !el.checkVisibility()) continue;
    title = el;
    break;
  }
  const style = getComputedStyle(a);
  const ring = parseFloat(style.getPropertyValue('--ring-width')) + parseFloat(style.getPropertyValue('--ring-gap-width'));
  const box = a.getBoundingClientRect();
  const out = { left: box.left - ring, right: box.right + ring, top: box.top - ring, bottom: box.bottom + ring };
  const cuts = [];
  if (out.left < -0.01) cuts.push('the screen at ' + out.left.toFixed(2));
  if (out.right > innerWidth + 0.01) cuts.push('the screen at ' + out.right.toFixed(2));
  for (let el = a.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const name = el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName;
    const l = r.left + parseFloat(s.borderLeftWidth), rt = r.right - parseFloat(s.borderRightWidth);
    const t = r.top + parseFloat(s.borderTopWidth), b = r.bottom - parseFloat(s.borderBottomWidth);
    if (s.overflowX !== 'visible' && (out.left < l - 0.01 || out.right > rt + 0.01)) cuts.push(name + ' sideways');
    if (s.overflowY !== 'visible' && (out.top < t - 0.01 || out.bottom > b + 0.01)) cuts.push(name + ' at its top or foot');
  }
  const head = title && title.getBoundingClientRect();
  return { label: a.textContent.trim(), ink, cuts,
    title: title ? { text: title.textContent.trim().slice(0, 40), left: head.left + parseFloat(getComputedStyle(title).paddingLeft) } : null };
})`;

/** The stories of the files that draw a back link, from the build's own index. */
function candidates(build) {
  const entries = Object.values(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries)
    .filter((e) => e.type === 'story');
  const draws = new Map();
  return entries.filter((e) => {
    if (!draws.has(e.importPath)) draws.set(e.importPath, DRAWS.test(readFileSync(path.join(root, e.importPath), 'utf8')));
    return draws.get(e.importPath);
  }).map((e) => ({ id: e.id, label: `${e.title} > ${e.name}` }));
}

test('a back link starts its arrow on the title edge, and its ground and ring stay whole', {
  skip: process.env.BACK_ALIGN !== '1' && 'set BACK_ALIGN=1',
}, async (t) => {
  const { serve, openStory, playwright, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'BACK_ALIGN=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const page = await browser.newPage();
    const open = async (story, theme, [w, h], mutation) => {
      await page.setViewportSize({ width: w, height: h });
      const done = await openStory(page, story, { port: server.port, theme });
      assert.equal(done.phase, STORY_DONE, `${story.label} did not render at ${w}x${h}: ${done.phase}`);
      if (mutation) await page.addStyleTag({ content: mutation });
      await page.evaluate(() => document.fonts.ready);
      return page.evaluate(`new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok((${READ})()))))`);
    };

    const found = candidates(build);
    assert.ok(found.length >= FLOOR, `only ${found.length} stories come from files that draw a back link`);
    const subjects = [];
    for (const story of found) {
      if ((await open(story, 'light', [1280, 800])).length || (await open(story, 'light', [390, 844])).length) subjects.push(story);
    }
    assert.ok(subjects.length >= FLOOR, `${subjects.length} stories show a back link, under the floor of ${FLOOR}: `
      + subjects.map((s) => s.id).join(', '));

    const misses = [];
    let measured = 0;
    for (const story of subjects) {
      let seen = 0;
      for (const theme of THEMES) {
        for (const size of SIZES) {
          for (const link of await open(story, theme, size)) {
            const at = `${story.label} at ${size.join('x')} in ${theme}, “${link.label}”`;
            if (!link.title) { misses.push(`${at}: no title after the link`); continue; }
            seen += 1;
            const off = link.ink - link.title.left;
            if (Math.abs(off) > SLACK) misses.push(`${at}: the arrow starts ${off.toFixed(2)}px from “${link.title.text}”`);
            for (const cut of link.cuts) misses.push(`${at}: the ground or the ring is cut by ${cut}`);
          }
        }
      }
      if (!seen) misses.push(`${story.label}: no back link was measured at any size`);
      measured += seen;
    }
    t.diagnostic(`${subjects.length} stories, ${measured} links measured`);
    assert.deepEqual(misses, []);
    assert.ok(measured >= subjects.length * SIZES.length, `only ${measured} links were measured`);

    // The gate catches what it guards. The link as it was before #869, and the alignment
    // with the old 8px padding, whose ring runs off a 390px screen.
    const wide = subjects.find((s) => s.id === 'react-appshell--wide');
    assert.ok(wide, 'React/AppShell > Wide, the mutation subject, shows no back link');
    const before = await open(wide, 'light', [1280, 800], '.ui-back { margin-inline-start: 0; padding-left: var(--space-2); }');
    assert.ok(before.some((l) => Math.abs(l.ink - l.title.left) > SLACK), 'the link before #869 passes the alignment check');
    const padded = await open(wide, 'light', [390, 844],
      '.ui-back { padding-left: var(--space-2); margin-inline-start: calc(-1 * var(--space-2) - 16px * 7.8 / 24); }');
    assert.ok(padded.some((l) => l.cuts.length), 'an 8px padding passes the ring check at 390px');
  } finally {
    server.proc.kill();
    await browser.close();
  }
});

/* The walk: in the page shell, Tab to the back link, put the pointer on it, and press
   Escape. After each step the focus stays on the link, which shows, no fixed or sticky
   element moves by more than 1px, web-vitals' layout shift stays under 0.1 and the page
   does not scroll sideways. At the 10 sizes, on the Galaxy Z Fold 7 and Flip 7 and their
   cover screens, and on a two-screen phone of 466x678 and 890x626 at scale 3 with touch.
   Its limits: one story (React/AppShell > Wide), light only, and no click, because the
   link leaves the story. onCLS does not count a shift within 500ms of an input. */
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];
const STATE = `() => {
  const el = document.activeElement;
  const doc = document.scrollingElement;
  return { focus: Boolean(el?.matches('.ui-back') && el.checkVisibility()), cls: window.__cls, over: doc.scrollWidth - doc.clientWidth,
    chrome: [...document.querySelectorAll('body *')].filter((e) => ['fixed', 'sticky'].includes(getComputedStyle(e).position))
      .map((e) => { const r = e.getBoundingClientRect(); return [e.tagName.toLowerCase() + '.' + [...e.classList].join('.'), r.left, r.top]; }) };
}`;

test('in the shell, a key, a pointer and Escape on the back link move nothing', {
  skip: process.env.BACK_ALIGN !== '1' && 'set BACK_ALIGN=1',
}, async (t) => {
  const { serve, openStory, playwright, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'BACK_ALIGN=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const subjects = [
    ...SIZES.map(([width, height]) => [`${width}x${height}`, { viewport: { width, height } }]),
    ...DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...DUO.map(([width, height]) => [`two-screen ${width}x${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ];
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  const story = { id: 'react-appshell--wide', label: 'React/AppShell > Wide' };
  try {
    const misses = [];
    let steps = 0;
    for (const [label, context] of subjects) {
      const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
      await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
      const page = await ctx.newPage();
      const done = await openStory(page, story, { port: server.port, theme: 'light' });
      assert.equal(done.phase, STORY_DONE, `${story.label} did not render on ${label}: ${done.phase}`);
      await page.evaluate(() => document.fonts.ready);
      const read = () => page.evaluate(`new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok((${STATE})()))))`);
      const start = await read();
      const link = page.locator('.ui-app__main > .ui-back');
      const walk = [
        ['Tab', async () => {
          for (let i = 0; i < 60 && !await link.evaluate((a) => a === document.activeElement); i += 1) await page.keyboard.press('Tab');
        }],
        ['pointer', () => link.hover()],
        ['Escape', () => page.keyboard.press('Escape')],
      ];
      for (const [name, act] of walk) {
        await act();
        const now = await read();
        steps += 1;
        const at = `${label}, after ${name}`;
        if (!now.focus) misses.push(`${at}: the focus left the back link`);
        if (now.cls >= 0.1) misses.push(`${at}: layout shift ${now.cls}`);
        if (now.over > 0) misses.push(`${at}: the page scrolls ${now.over}px sideways`);
        const was = new Map(start.chrome.map(([n, x, y]) => [n, [x, y]]));
        for (const [n, x, y] of now.chrome) {
          const [x0, y0] = was.get(n) ?? [x, y];
          if (Math.abs(x - x0) > 1 || Math.abs(y - y0) > 1) misses.push(`${at}: ${n} moved ${(x - x0).toFixed(1)}, ${(y - y0).toFixed(1)}`);
        }
      }
      await ctx.close();
    }
    t.diagnostic(`${subjects.length} sizes and devices, ${steps} steps`);
    assert.equal(steps, subjects.length * 3, 'a size or a device was not walked');
    assert.deepEqual(misses, []);

    // The walk catches what it guards: a focused link that runs past the screen.
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    assert.equal((await openStory(page, story, { port: server.port, theme: 'light' })).phase, STORY_DONE);
    await page.addStyleTag({ content: '.ui-back:focus-visible { min-width: 150vw; }' });
    const link = page.locator('.ui-app__main > .ui-back');
    for (let i = 0; i < 60 && !await link.evaluate((a) => a === document.activeElement); i += 1) await page.keyboard.press('Tab');
    const wide = await page.evaluate(`new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok((${STATE})()))))`);
    assert.ok(wide.over > 0, 'a focused link 150vw wide passes the sideways scroll check');
    await page.close();
  } finally {
    server.proc.kill();
    await browser.close();
  }
});
