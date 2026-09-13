/* The fold, frame by frame. Frames come off the compositor with
 * Page.startScreencast, so each caption is the time the browser painted it and
 * not the latency of a screenshot call. Six frames, laid out three across at
 * natural size and clipped to the rail and the head of the reading column.
 *
 * argv: <checkout> <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
// Playwright is not a dependency of this package — the kit ships no browser and
// nothing in `npm test` drives one. Point UI_PLAYWRIGHT at an install of it and
// UI_CHROME at the Chrome binary. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CHROME = '/home/orca/opt/chrome/opt/google/chrome/google-chrome';
const [checkout, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const srv = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'shot.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});
const base = `http://127.0.0.1:${srv.port}`;
const browser = await chromium.launch({ executablePath: CHROME });

for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}/__shot?theme=${theme}&collapsed=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* stopped */ }
  });
  // The pointer is on the control before the press and stays there, which is why
  // the chip is up in every frame: it is the name the toggle wears at both widths.
  await page.hover('.ui-app__fold');
  await page.waitForTimeout(400);
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await page.waitForTimeout(150);
  const press = await page.evaluate(() => {
    document.querySelector('.ui-app__fold').click();
    return Date.now() / 1000;
  });
  await page.waitForTimeout(450);
  await cdp.send('Page.stopScreencast');

  // The travel is 250ms, so the strip is sampled across it rather than at the
  // compositor's own ~15ms cadence — six frames at roughly 50ms apart, each one
  // a frame the browser really painted and captioned with when it painted it.
  const after = frames.filter((f) => f.t >= press - 0.004);
  if (after.length < 6) throw new Error(`${theme}: only ${after.length} frames after the press`);
  const t0 = after[0].t;
  const six = [];
  for (const target of [0, 50, 100, 150, 200, 250]) {
    const want = t0 + target / 1000;
    const pick = after.reduce((a, b) => (Math.abs(b.t - want) < Math.abs(a.t - want) ? b : a));
    if (!six.includes(pick)) six.push(pick);
  }
  if (six.length < 6) throw new Error(`${theme}: the compositor delivered only ${six.length} distinct frames across the travel`);
  const shots = six.map((f) => ({ src: `data:image/png;base64,${f.data}`, ms: Math.round((f.t - t0) * 1000) }));
  console.log(`  ${theme}: ${shots.map((s) => `${s.ms}ms`).join(', ')}`);

  // The sheet the composite is set in is the kit's own, so the page behind the
  // frames is the theme's --bg and the caption its --dim.
  const board = await ctx.newPage();
  await board.setViewportSize({ width: 1499, height: 1701 });
  await board.goto(`${base}/__shot?theme=${theme}`, { waitUntil: 'load' });
  await board.evaluate(({ shots, theme }) => {
    document.documentElement.dataset.theme = theme;
    const t = theme === 'dark' ? 'dark' : 'light';
    document.body.innerHTML = `
      <div id="film">
        <h1>The rail folding, ${t}: frames off the compositor, at the times they were painted</h1>
        ${shots.map((s, i) => {
    const col = i % 3; const row = (i / 3) | 0;
    const x = 24 + col * 489; const y = 75 + row * 811;
    return `<div class="cell" style="left:${x}px;top:${y}px"><img src="${s.src}"></div>`
             + `<div class="cap" style="left:${x}px;top:${y + 771}px">${s.ms} ms</div>`;
  }).join('')}
      </div>`;
    const css = document.createElement('style');
    css.textContent = `
      html,body { margin:0; padding:0; background: var(--bg); }
      #film { position:relative; width:1499px; height:1701px; background: var(--bg);
              font-family: var(--font-sans); }
      #film h1 { position:absolute; left:24px; top:26px; margin:0;
                 font-family: var(--font-display); font-size:18px; line-height:1;
                 font-weight: var(--weight-bold); letter-spacing: var(--tracking-tight);
                 color: var(--strong); }
      .cell { position:absolute; width:473px; height:761px; overflow:hidden; }
      .cell img { display:block; width:1280px; height:760px; }
      .cap { position:absolute; font-size:13px; line-height:1; color: var(--dim); }`;
    document.head.append(css);
  }, { shots, theme });
  await board.evaluate(() => document.fonts.ready);
  await board.waitForTimeout(300);
  await board.locator('#film').screenshot({ path: path.join(outDir, `rail-fold-frames-${theme}.png`) });
  console.log(`  rail-fold-frames-${theme}.png`);
  await ctx.close();
}

await browser.close();
srv.proc.kill();
