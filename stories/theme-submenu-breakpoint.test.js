/* Rule: an account menu open in the sidebar closes when the view crosses to the phone
 * breakpoint and the sidebar goes, Theme submenu and all, and focus moves to the band's
 * Menu button. Before #736's fix the submenu stayed over the page, and Escape sent
 * focus to body, because the Theme row it returns to was hidden with the sidebar.
 *
 * Off unless THEME_SUBMENU=1: Playwright is not a dependency of this package, CI does
 * not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… THEME_SUBMENU=1 node --test stories/theme-submenu-breakpoint.test.js
 *
 * At 1280 it also checks that the account menu and the Theme submenu show their right
 * edges, which the rail's clip cut before the panel was lifted out of it.
 *
 * Its limits: one engine, one story (React/AppShell > Theme submenu), one crossing,
 * 1280 to 390, in light. The edge check probes one point on each right edge. The
 * drawer's submenu, which does not leave with the view, is not measured here.
 * why: docs/components.md#the-rest-of-the-react-surface
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORY = { id: 'react-appshell--theme-submenu' };

test('the sidebar account menu closes at the phone breakpoint and focus stays visible', {
  skip: process.env.THEME_SUBMENU !== '1' && 'set THEME_SUBMENU=1',
}, async () => {
  const { serve, openStory, playwright, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'THEME_SUBMENU=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const done = await openStory(page, STORY, { port: server.port, theme: 'light' });
    assert.equal(done.phase, STORY_DONE, `${STORY.id} did not render: ${done.phase}`);
    // Two painted frames, so React has flushed what the last event asked for.
    const state = () => page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => {
      const sub = document.querySelector('[role="menu"][aria-label="Theme"]');
      const el = document.activeElement;
      ok({ sub: Boolean(sub?.checkVisibility()), focus: el === document.body ? 'body' : el?.getAttribute('aria-label') || el?.textContent.trim(),
        shown: Boolean(el && el !== document.body && el.checkVisibility()) });
    }))));
    assert.equal((await state()).sub, true, 'the story opens the Theme submenu at 1280');
    // The account menu and the submenu show in full: the topmost element 2px inside each
    // right edge is the box itself. Before the fix the rail's clip cut the menu's right edge.
    const edges = await page.evaluate(() => ['.ui-app__user-panel', '.ui-dropdown__panel--sub'].map((sel) => {
      const box = document.querySelector(sel).getBoundingClientRect();
      return [sel, box.top + box.height / 2, box.right - 2];
    }).filter(([sel, y, x]) => !document.querySelector(sel).contains(document.elementFromPoint(x, y))).map(([sel]) => sel));
    assert.deepEqual(edges, [], 'at 1280 the right edge of these is hidden');
    await page.setViewportSize({ width: 390, height: 800 });
    const crossed = await state();
    assert.equal(crossed.sub, false, 'at 390 the Theme submenu still stands over the page');
    assert.deepEqual([crossed.focus, crossed.shown], ['Menu', true], 'focus goes to the visible Menu button');
    await page.keyboard.press('Escape');
    const escaped = await state();
    assert.notEqual(escaped.focus, 'body', 'Escape sent focus to body');
    assert.equal(escaped.shown, true, `Escape left focus on a hidden element: ${escaped.focus}`);
  } finally {
    server.proc.kill();
    await browser.close();
  }
});
