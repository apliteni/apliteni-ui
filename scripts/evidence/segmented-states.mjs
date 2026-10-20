// Build both Storybooks first. Run with UI_PLAYWRIGHT and UI_CHROME as needed:
// node scripts/evidence/segmented-states.mjs
// Default accent only. Reads computed paint after transitions, not screenshot pixels.
// Selection remains in the DOM when disabled, as it does in React's disabled toolbar.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { parseColour, ratio } from '../../stories/lib/contrast.js';

const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
const server = spawn(process.execPath, [new URL('./serve.mjs', import.meta.url).pathname, '.', '.']);
const port = await new Promise((resolve, reject) => {
  server.stdout.once('data', data => resolve(Number(String(data).trim())));
  server.once('error', reject);
});
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.UI_CHROME });
  const page = await browser.newPage({ viewport: { width: 834, height: 1112 } });
  let count = 0;
  for (const [implementation, prefix, id] of [
    ['vanilla', '', 'components-segmented-control--examples'],
    ['react', 'react/', 'react-segmented--playground'],
  ]) for (const theme of ['light', 'dark']) {
    await page.goto(`http://127.0.0.1:${port}/${prefix}storybook-static/iframe.html?id=${id}&globals=theme:${theme}`);
    const button = page.locator('.ui-seg button[aria-pressed="true"]').first();
    await button.waitFor();
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    const measure = async (target) => {
      await page.waitForTimeout(250);
      return target.evaluate(element => {
        const style = getComputedStyle(element);
        const probe = document.createElement('span');
        probe.style.color = 'var(--disabled-ink)';
        probe.style.backgroundColor = 'var(--surface-3)';
        element.parentElement.append(probe);
        const expected = getComputedStyle(probe);
        const result = {
          color: style.color, background: style.backgroundColor,
          outline: style.outlineStyle, border: style.borderTopWidth,
          disabledInk: expected.color, quietFill: expected.backgroundColor,
        };
        probe.remove();
        return result;
      });
    };
    const normal = await measure(button);
    assert.equal(normal.outline, 'none');
    assert.equal(normal.border, '0px');
    await button.hover();
    const hover = await measure(button);
    assert.equal(hover.color, normal.color);
    assert.equal(hover.background, normal.background);
    await page.keyboard.press('Tab');
    await button.focus();
    assert.equal((await measure(button)).outline, 'solid');
    const unselected = page.locator('.ui-seg button[aria-pressed="false"]').first();
    await unselected.evaluate(element => { element.disabled = true; });
    const off = await measure(unselected);
    assert.equal(off.color, off.disabledInk);
    await button.evaluate(element => { element.blur(); element.disabled = true; });
    const disabled = await measure(button);
    assert.equal(disabled.color, disabled.disabledInk);
    assert.equal(disabled.background, disabled.quietFill);
    const contrast = ratio(parseColour(disabled.color), parseColour(disabled.background));
    assert.ok(contrast >= 5, `${implementation}/${theme}: disabled selected ink ${contrast}:1`);
    console.log(`${implementation}/${theme}: disabled selected ink ${contrast.toFixed(2)}:1`);
    count += 1;
  }
  assert.equal(count, 4);
} finally {
  await browser?.close();
  server.kill();
}
