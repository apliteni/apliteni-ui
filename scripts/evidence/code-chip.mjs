/* The inline code chip's evidence (#537). The same rig as shoot.mjs — one static
 * server over the checkout under test, the kit's own factories imported as
 * modules in the page, one Chrome, one viewport — so between two checkouts only
 * the code differs, and the before side of a pair is this rig pointed at `main`.
 *
 * Thirteen grounds in one frame: a sentence on the page, the same sentence inside
 * a card, the kit's own case — `deniedState()`'s `need` — and the five washes that
 * take caller markup, each on the page and inside a card. Both widths, both
 * themes, plus a 1x crop of the card and of a callout in a card.
 *
 * It also SAMPLES REAL PIXELS. The chip's ground is read off the rendered frame
 * rather than computed, because a translucent wash is composited by the browser
 * and #540's review found the gate's static reading of it wrong. Each probe is
 * screenshotted on its own and two pixels are read: one inside the chip's left
 * padding, one inside its ground's padding, both clear of any glyph. The ratios
 * go to `<side>-pixels.json` beside the frames, and `stories/code-chip.test.js`
 * is checked against them.
 *
 * argv: <checkout> <outDir> [side]
 *
 * why: scripts/evidence/README.md
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';
import { decode } from './diff.mjs';
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkout, outDir, side = 'after'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const WIDTHS = [[1280, 1400], [390, 2000]];

/** WCAG 2.x relative luminance and contrast, on bytes read out of a PNG. */
const luminance = ([r, g, b]) => {
  const f = (x) => (x / 255 <= 0.03928 ? x / 255 / 12.92 : ((x / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (c) => `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;

/** One pixel out of a decoded PNG, as [r, g, b]. */
const pixel = ({ data, width, channels }, x, y) => {
  const at = (y * width + x) * channels;
  return [data[at], data[at + 1], data[at + 2]];
};

const server = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'code-chip.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

const browser = await chromium.launch({
  executablePath: process.env.UI_CHROME,
  // The pixel-test switches shoot.mjs uses, for the same reason. why: README
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--deterministic-mode', '--disable-partial-raster'],
});

const scratch = path.join(outDir, '.probe.png');
const samples = [];

// The server is a child process: a throw between here and the kill would leave
// it holding its port after this script exits.
try {
  for (const theme of ['dark', 'light']) {
    for (const [width, height] of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const tab = await ctx.newPage();
      await tab.goto(`http://127.0.0.1:${server.port}/__shot?theme=${theme}`, { waitUntil: 'load' });
      await tab.waitForFunction(() => window.__ready === true);
      await settle(tab);

      const name = `${side}-${theme}-${width}`;
      await tab.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
      console.log(`  ${name}.png`);

      if (width === 1280) {
        for (const [id, file] of [['cc-card', 'card'], ['cc-info-in a card', 'callout-in-card']]) {
          await tab.locator(`[data-probe="${id}"]`).screenshot({ path: path.join(outDir, `${side}-crop-${file}-${theme}.png`) });
          console.log(`  ${side}-crop-${file}-${theme}.png`);
        }

        // Per-probe pixels. Each element is shot on its own, so nothing is mapped
        // between coordinate systems: the chip's own frame and its ground's own
        // frame, each sampled inside the padding the kit gives it.
        for (const probe of await tab.locator('[data-probe]').all()) {
          const id = await probe.getAttribute('data-probe');
          const groundSelector = await probe.getAttribute('data-ground');
          const chip = probe.locator('.ui-code').first();
          if (!await chip.count()) continue;

          await chip.screenshot({ path: scratch });
          const chipShot = decode(scratch);
          // x=2 sits inside the chip's 6px left padding, y at its middle: paint only.
          const chipPixel = pixel(chipShot, 2, Math.floor(chipShot.height / 2));

          const ground = groundSelector === 'body' ? tab.locator('body') : probe.locator(groundSelector).first();
          await ground.screenshot({ path: scratch });
          const groundShot = decode(scratch);
          // Mid-width, 4px down: inside the ground's own top padding and above its first
          // line of text. NOT the corner — every one of these surfaces is rounded, and a
          // corner pixel is whatever is BEHIND the ground rather than the ground.
          const groundPixel = pixel(groundShot, Math.floor(groundShot.width / 2), 4);

          samples.push({
            probe: id,
            theme,
            chip: hex(chipPixel),
            ground: hex(groundPixel),
            step: Number(ratio(chipPixel, groundPixel).toFixed(3)),
          });
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.proc.kill();
  rmSync(scratch, { force: true });
}

samples.sort((a, b) => a.step - b.step);
writeFileSync(path.join(outDir, `${side}-pixels.json`), `${JSON.stringify(samples, null, 2)}\n`);
console.log(`  ${side}-pixels.json — ${samples.length} probes, floor ${samples[0].step}, ceiling ${samples.at(-1).step}`);
