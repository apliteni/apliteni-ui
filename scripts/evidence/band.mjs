/* The page shell's band, shot on its own. One static server over one built
 * Storybook, one Chrome, one viewport — so between two builds only the code
 * differs, and the before side of a pair is this rig pointed at the other
 * build. The frame is the band's own box rather than the viewport: the subject
 * is 52px tall and a whole shell is mostly page.
 *
 * argv: <storybook-static> <outDir> <prefix> <story:theme:WxH[:zones]>...
 *   `zones` tints each band control's 44x44 tap square, so a layer the kit
 *   draws transparent can be seen in a still. It is a drawing ON TOP of the
 *   real thing — the squares are read back off `elementFromPoint`, the same
 *   question stories/tap-zone.test.js asks — and never a mock-up of it.
 *
 * why: scripts/evidence/README.md
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [staticDir, outDir, prefix, ...subjects] = process.argv.slice(2);
if (!subjects.length) throw new Error('no subjects: <static> <out> <prefix> <story:theme:WxH[:zones]>...');
mkdirSync(outDir, { recursive: true });

/** Each band control's own 44x44 square, asked of the page's hit test. */
const PAINT_ZONES = (size) => {
  const bar = document.querySelector('.ui-app__bar');
  const own = (el, x, y) => {
    let n = document.elementFromPoint(x, y);
    while (n && n !== el && n !== document.body) n = n.parentElement;
    return n === el;
  };
  for (const el of bar.querySelectorAll('button, a[href], [role="button"]')) {
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    if (el.closest('button:not(:scope), a[href]:not(:scope)') && el.parentElement.closest('button, a[href]')) continue;
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2, half = size / 2;
    let miss = 0, n = 0;
    for (let dy = -half + 0.5; dy < half; dy += 2) {
      for (let dx = -half + 0.5; dx < half; dx += 2) {
        n++;
        if (!own(el, cx + dx, cy + dy)) miss++;
      }
    }
    const box = document.createElement('i');
    box.style.cssText = `position:fixed;left:${cx - half}px;top:${cy - half}px;width:${size}px;`
      + `height:${size}px;box-sizing:border-box;z-index:2147483647;pointer-events:none;`
      + `border:1px dashed ${miss ? '#ff4d4d' : '#39d98a'};`
      + `background:${miss ? 'rgba(255,77,77,.16)' : 'rgba(57,217,138,.16)'}`;
    document.body.append(box);
  }
};

const port = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), staticDir, path.join(staticDir, 'iframe.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

const browser = await chromium.launch({
  executablePath: process.env.UI_CHROME,
  // shoot.mjs's pixel-test switches, less --deterministic-mode, which hangs a
  // React Storybook story.
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-partial-raster'],
});

try {
  for (const subject of subjects) {
    const [story, theme = 'light', size = '1280x800', zones] = subject.split(':');
    const [width, height] = size.split('x').map(Number);
    // A finger, because the tap layer is gated on a coarse pointer; the drawn
    // band is the same either way, which the pair at 1280 is there to show.
    const ctx = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce', hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port.port}/iframe.html?id=${story}&globals=theme:${theme}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('storybook-root')?.childElementCount > 0);
    await page.waitForSelector('.ui-app__bar');
    await settle(page);
    if (zones === 'zones') await page.evaluate(PAINT_ZONES, 44);
    const name = [prefix, story.replace(/^(apps|react)-/, ''), width, theme].concat(zones || []).join('-');
    await page.locator('.ui-app__bar').screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`  ${name}.png`);
    await ctx.close();
  }
} finally {
  await browser.close();
  port.proc.kill();
}
