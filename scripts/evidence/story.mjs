/* A built Storybook story, shot. One static server over a `storybook-static`
 * directory, one Chrome, one viewport — so between two builds only the code
 * differs, and the before side of a pair is this rig pointed at the other
 * build. Unlike shot.html's rig, the subject is a story rather than a page
 * that imports the factories: a showcase's own story is what a reader is
 * shown, and re-staging it by hand would shoot something else.
 *
 * argv: <storybook-static> <outDir> <prefix> <story[:theme[:WxH[:open]]]>...
 *   theme defaults to `light`, size to 1280x800. `open` is a selector the rig
 *   clicks once the page has settled, for a subject that has to open itself —
 *   a real click, so the state in the frame is the one a reader reaches.
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
if (!subjects.length) throw new Error('no subjects: <static> <out> <prefix> <story[:theme[:WxH]]>...');
mkdirSync(outDir, { recursive: true });

// serve.mjs wants a shot page as well as a root; the built Storybook is its own,
// so the second argument is only there to satisfy the signature.
const port = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), staticDir, path.join(staticDir, 'iframe.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

const browser = await chromium.launch({
  executablePath: process.env.UI_CHROME,
  // The pixel-test switches shoot.mjs uses, for the same reason. why: README
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--deterministic-mode', '--disable-partial-raster'],
});

try {
  for (const subject of subjects) {
    const [story, theme = 'light', size = '1280x800', open] = subject.split(':');
    const [width, height] = size.split('x').map(Number);
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port.port}/iframe.html?id=${story}&globals=theme:${theme}`, { waitUntil: 'load' });
    // The canvas paints before the story mounts; the root holding a child is
    // what says the subject is there to wait on.
    await page.waitForFunction(() => document.getElementById('storybook-root')?.childElementCount > 0);
    await settle(page);
    if (open) {
      await page.click(open);
      await settle(page);
    }
    const name = [prefix, story, theme].join('-');
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`  ${name}.png`);
    await ctx.close();
  }
} finally {
  await browser.close();
  port.proc.kill();
}
