/* The React components' evidence, shot off the React Storybook's own build.
 *
 * Same rig as shoot.mjs — one static server over one checkout, one Chrome, one
 * viewport — pointed at `react/storybook-static` instead of a hand-written page,
 * because a React component needs a bundler and the shot page has none. Build it
 * first: `npm run build-storybook -w react`.
 *
 * argv: <checkout> <outDir> [only]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
// Playwright is not a dependency of this package — the kit ships no browser and
// nothing in `npm test` drives one. Point UI_PLAYWRIGHT at an install of it and
// UI_CHROME at the Chrome binary. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CHROME = process.env.UI_CHROME;
const [checkout, outDir, only] = process.argv.slice(2);
const built = path.join(path.resolve(checkout), 'react/storybook-static');
if (!existsSync(path.join(built, 'iframe.html'))) {
  throw new Error(`no React Storybook build at ${built} — run: npm run build-storybook -w react`);
}
mkdirSync(outDir, { recursive: true });

const port = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), built, path.join(HERE, 'shot.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

const browser = await chromium.launch({ executablePath: CHROME });

/** One story at the shot viewport, in the theme asked for, with both faces resolved. */
async function open(story, theme, { width = 560, height = 380 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port.port}/iframe.html?id=${story}&viewMode=story`,
    { waitUntil: 'load' });
  await page.waitForSelector('#storybook-root > *');
  // The two faces the kit names, loaded the way a page loads them — the React
  // Storybook's preview imports the kit's stylesheet and nothing else, so without
  // this the shot is of whatever the box falls back to rather than of the kit.
  // Same pair, same weights, as scripts/evidence/shot.html.
  await page.addStyleTag({
    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700'
      + '&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap',
  });
  // The preview stamps dark on arrival; the toolbar is not in the iframe, so the
  // theme is set the way a reader's own choice sets it — on the root element.
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.evaluate(() => document.fonts.ready);
  // Nothing is mid-travel: the panel's own fade is --dur-med.
  await page.waitForTimeout(400);
  return { ctx, page };
}

const want = (name) => !only || name.includes(only);
const save = async (page, name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log(`  ${name}.png`);
};

// Each story renders its dropdown already open, which is the state worth looking at.
const SHOTS = [
  ['react-dropdown-menu', 'react-dropdown--menu'],
  ['react-dropdown-select', 'react-dropdown--select'],
  ['react-back-short', 'react-backlink--short', { height: 160 }],
  ['react-back-long', 'react-backlink--long', { height: 160 }],
];

for (const theme of ['dark', 'light']) {
  for (const [name, story, box] of SHOTS) {
    if (!want(`${name}-${theme}`)) continue;
    const { ctx, page } = await open(story, theme, box);
    await save(page, `${name}-${theme}`);
    await ctx.close();
  }

  // The row a router <Link> draws, under the keyboard. Two real presses: Tab to the
  // trigger, then ArrowDown, which is what puts the ring on the first row — so the
  // ring is the browser's own and not a class forced on.
  if (want(`react-dropdown-link-row-${theme}`)) {
    const { ctx, page } = await open('react-dropdown--rows-are-links', theme);
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    const on = await page.evaluate(() => document.activeElement?.className || '');
    if (!on.includes('ui-dropdown__item')) throw new Error(`the ring did not land on a row: ${on}`);
    await save(page, `react-dropdown-link-row-${theme}`);
    await ctx.close();
  }
}

await browser.close();
port.proc.kill();
