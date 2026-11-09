/* Rule: at 560px and below the account window floats with a --space-4 gap on each side, or
 * the safe-area inset where that is wider. It is as tall as its content, up to the screen
 * height, and only the section's body scrolls under the reader and the tabs. End on the tab
 * row reveals the last tab with its whole ring and moves no box sideways (#795).
 *
 * The source half runs in CI. It reads the 560px block of AccountWindow.css and checks that
 * the window keeps all four clearances, a dvh cap and the modal radius. It proves rejection
 * against the full-screen block #795 replaced.
 *
 * The browser half is off unless ACCOUNT_PHONE=1: Playwright is not a dependency of this
 * package, CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… ACCOUNT_PHONE=1 node --test stories/account-window-phone.test.js
 *
 * Its limits: one engine, light only, the two AccountWindow stories, at 390x844 and
 * 320x640, with the kit's text sizes and with each --text-* token doubled. Headless
 * Chromium reports no safe-area inset, so the browser half measures the --space-4 gap and
 * the env() half is the source half's. The ring check compares the outline's box with the
 * boxes of the clipping ancestors, and does not read paint.
 * why: docs/components.md#the-account-window
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = path.join(root, 'react/src/AccountWindow.css');
const SIDES = ['top', 'right', 'bottom', 'left'];

/** The window rule inside the 560px block, as one string, or null. */
const phoneRule = (css) => {
  const at = css.indexOf('@media (max-width: 560px)');
  if (at < 0) return null;
  const rule = css.slice(at).match(/\.rx-modal\.rx-account\s*\{([^}]*)\}/);
  return rule ? rule[1] : null;
};

/** What the 560px window rule is missing, in words. */
const phoneFaults = (css) => {
  const rule = phoneRule(css);
  if (rule === null) return ['no .rx-modal.rx-account rule at 560px'];
  const faults = [];
  const margin = rule.match(/margin:([^;]*);/)?.[1] ?? '';
  for (const side of SIDES) {
    if (!margin.includes(`max(var(--space-4), env(safe-area-inset-${side}))`)) faults.push(`no ${side} clearance in the margin`);
  }
  if (!/max-height:\s*calc\(100dvh\s*-[^;]*safe-area-inset-top[^;]*safe-area-inset-bottom/.test(rule)) faults.push('no dvh cap less both clearances');
  if (!/width:\s*calc\(100vw\s*-[^;]*safe-area-inset-left[^;]*safe-area-inset-right/.test(rule)) faults.push('no width less both clearances');
  if (!/(^|[;\s])height:\s*auto/.test(rule)) faults.push('the height does not follow the content');
  if (/border-radius/.test(rule)) faults.push('the window drops the modal radius');
  return faults;
};

test('the 560px window keeps its four clearances, a dvh cap and the modal radius', () => {
  assert.deepEqual(phoneFaults(readFileSync(SHEET, 'utf8')), []);
});

test('the source check rejects the full-screen window #795 replaced', () => {
  const before = `@media (max-width: 560px) {
  .rx-modal.rx-account { width: 100vw; height: 100vh; height: 100dvh; border-radius: 0;
    flex-direction: column; } }`;
  const faults = phoneFaults(before);
  assert.ok(faults.length >= 6, `the old block passed: ${faults.join(', ')}`);
  assert.ok(faults.includes('the window drops the modal radius'));
});

const STORIES = [
  { id: 'react-accountwindow--playground', section: 'Profile' },
  { id: 'react-accountwindow--long-section', section: 'Notifications', long: true },
];
const VIEWS = [{ width: 390, height: 844 }, { width: 320, height: 640 }];
const GAP = 16;
const SLACK = 0.5;

// Doubles every --text-* token on the root, so the kit's text is at 200% and its spacing is not.
const DOUBLE_TEXT = () => {
  const rootStyle = document.documentElement.style;
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      if (!rule.style) continue;
      for (const name of rule.style) {
        if (!name.startsWith('--text-')) continue;
        const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
        if (px) rootStyle.setProperty(name, `${px * 2}px`);
      }
    }
  }
  return [...rootStyle].filter((n) => n.startsWith('--text-')).length;
};

// The window's boxes and scroll state, after two painted frames.
const MEASURE = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => {
  const q = (sel) => document.querySelector(sel);
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, height: r.height }; };
  const dialog = q('.rx-account');
  const body = q('.rx-account__body');
  const scrolled = ['.rx-account', '.rx-account__pane', '.rx-account__rail', '.rx-account__head']
    .filter((sel) => { const el = q(sel); return el.scrollHeight > el.clientHeight + 1 || el.scrollTop || el.scrollLeft; });
  if (document.scrollingElement.scrollLeft) scrolled.push('the page');
  ok({
    view: { width: innerWidth, height: innerHeight },
    dialog: box(dialog), rail: box(q('.rx-account__rail')), head: box(q('.rx-account__head')),
    title: q('.rx-account__title').textContent,
    body: { box: box(body), scroll: body.scrollHeight, client: body.clientHeight, top: body.scrollTop },
    scrolled,
  });
})));

// The focused element's outline box, and each clipping ancestor that cuts it.
const RING = () => {
  const el = document.activeElement;
  const cs = getComputedStyle(el);
  const out = cs.outlineStyle === 'none' ? 0 : parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset);
  const r = el.getBoundingClientRect();
  const ring = { top: r.top - out, right: r.right + out, bottom: r.bottom + out, left: r.left - out };
  const cuts = [];
  for (let a = el.parentElement; a; a = a.parentElement) {
    const s = getComputedStyle(a);
    if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
    const c = a.getBoundingClientRect();
    if (ring.left < c.left - 0.5 || ring.right > c.right + 0.5 || ring.top < c.top - 0.5 || ring.bottom > c.bottom + 0.5) {
      cuts.push(a.className || a.tagName);
    }
  }
  return { tab: el.textContent, role: el.getAttribute('role'), out, cuts,
    sideways: ['.rx-account', '.rx-account__rail', '.rx-account__pane'].filter((sel) => document.querySelector(sel).scrollLeft)
      .concat(document.scrollingElement.scrollLeft ? ['the page'] : []) };
};

test('the phone window floats with a gap, and only the section body scrolls', {
  skip: process.env.ACCOUNT_PHONE !== '1' && 'set ACCOUNT_PHONE=1',
}, async () => {
  const { serve, openStory, playwright, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'ACCOUNT_PHONE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const ids = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  for (const { id } of STORIES) assert.ok(ids.includes(id), `${id} is not in the Storybook build`);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  let measured = 0;
  try {
    for (const view of VIEWS) for (const doubled of [false, true]) for (const story of STORIES) {
      const where = `${story.id} ${view.width}x${view.height}${doubled ? ' text 200%' : ''}`;
      const page = await browser.newPage({ viewport: view });
      try {
        const done = await openStory(page, story, { port: server.port, theme: 'light' });
        assert.equal(done.phase, STORY_DONE, `${where} did not render: ${done.phase}`);
        await page.waitForSelector('.rx-scrim.is-open');
        if (doubled) assert.ok(await page.evaluate(DOUBLE_TEXT) > 0, `${where}: no --text-* token to double`);
        await page.evaluate(() => document.fonts.ready);
        const m = await page.evaluate(MEASURE);
        assert.equal(m.title, story.section, `${where} opened another section`);
        const { dialog } = m;
        assert.ok(Math.abs(dialog.left - GAP) <= SLACK && Math.abs(view.width - dialog.right - GAP) <= SLACK,
          `${where}: the window is not ${GAP}px from each side: ${dialog.left} .. ${dialog.right}`);
        assert.ok(dialog.top >= GAP - SLACK && dialog.bottom <= view.height - GAP + SLACK,
          `${where}: the window leaves the ${GAP}px clearance: ${dialog.top} .. ${dialog.bottom}`);
        assert.deepEqual(m.scrolled, [], `${where}: these scroll as well as the body`);
        const overflows = m.body.scroll > m.body.client + 1;
        // A section that fits leaves the window shorter than the screen; one that does not
        // fills the screen to the clearance and scrolls its body.
        if (overflows) assert.ok(Math.abs(view.height - GAP * 2 - dialog.height) <= SLACK, `${where}: the body scrolls in a short window`);
        else assert.ok(dialog.height < view.height - GAP * 2, `${where}: a short section fills the screen`);
        if (story.long) assert.ok(overflows, `${where}: the long section does not scroll`);
        if (!doubled && view.width === 390 && !story.long) assert.ok(!overflows, `${where}: Profile does not fit at 390x844`);
        if (overflows) {
          await page.evaluate(() => { const b = document.querySelector('.rx-account__body'); b.scrollTop = b.scrollHeight; });
          const end = await page.evaluate(MEASURE);
          assert.ok(end.body.top > 0, `${where}: the body did not scroll`);
          assert.deepEqual([end.rail.top, end.head.top], [m.rail.top, m.head.top], `${where}: the reader or the title moved with the body`);
        }
        // Reach the tab row with Tab, so :focus-visible is on, then End.
        let role = null;
        for (let i = 0; i < 40 && role !== 'tab'; i += 1) {
          await page.keyboard.press('Tab');
          role = await page.evaluate(() => document.activeElement.getAttribute('role'));
        }
        assert.equal(role, 'tab', `${where}: Tab never reached the tab row`);
        await page.keyboard.press('End');
        await page.waitForFunction(() => document.activeElement.textContent === 'Billing');
        const ring = await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(null)))))
          .then(() => page.evaluate(RING));
        assert.ok(ring.out > 0, `${where}: the last tab shows no outline`);
        assert.deepEqual(ring.cuts, [], `${where}: the last tab's ring is clipped`);
        assert.deepEqual(ring.sideways, [], `${where}: End scrolled these sideways`);
        measured += 1;
      } finally {
        await page.close();
      }
    }
  } finally {
    server.proc.kill();
    await browser.close();
  }
  assert.equal(measured, VIEWS.length * 2 * STORIES.length, 'every case was measured');
});
