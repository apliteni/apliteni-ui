/* Rule: the viewport scrollbar's colour follows the theme across repeated switches. The
 * ThemeToggle cross-fades the scrollbar in 250ms, and the finished animation must release
 * its fill. Before the #900 fix a retained fill was read as the next theme's own colour,
 * so after dark, light, then dark the scrollbar stayed light.
 *
 * Off unless THEME_SCROLLBAR=1: Playwright is not a dependency of this package, CI does
 * not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… THEME_SCROLLBAR=1 node --test stories/theme-toggle-scrollbar.test.js
 *
 * Its limits: one engine, one story (React/ThemeToggle > Dark), one cycle dark → light →
 * dark through the toggle's three-step cycle. It reads the computed scrollbar colour, not
 * a painted pixel.
 * why: docs/foundations.md#elevation
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORY = { id: 'react-themetoggle--dark' };

test('the scrollbar keeps the last theme after dark, light, then dark', {
  skip: process.env.THEME_SCROLLBAR !== '1' && 'set THEME_SCROLLBAR=1',
}, async () => {
  const { serve, openStory, playwright, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'THEME_SCROLLBAR=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
    const done = await openStory(page, STORY, { port: server.port, theme: 'dark' });
    assert.equal(done.phase, STORY_DONE, `${STORY.id} did not render: ${done.phase}`);
    const color = () => page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor);
    const dark = await color();
    assert.notEqual(dark, 'auto', 'the story root has no themed scrollbar colour to read');
    const toggle = page.getByRole('button', { name: /^Theme: / });
    // dark → light, then light → auto (dark on this OS), each cross-fading in 250ms.
    await toggle.click();
    await page.waitForTimeout(400);
    await toggle.click();
    await page.waitForTimeout(400);
    assert.equal(await color(), dark, 'after dark, light, then dark the scrollbar kept the first theme\'s fill');
  } finally {
    server.proc.kill();
    await browser.close();
  }
});
