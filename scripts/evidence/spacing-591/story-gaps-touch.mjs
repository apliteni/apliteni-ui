// Reads story-gaps.js in each named story at 390 with a touch pointer, as on a phone. Serve storybook-static on 6591 first.
// UI_PLAYWRIGHT=…/playwright/index.mjs UI_CHROME=… OUT=<dir> node story-gaps-touch.mjs <story-id>…
const { chromium } = await import(process.env.UI_PLAYWRIGHT);
import { readFileSync, writeFileSync } from 'node:fs';
const js = readFileSync(new URL('story-gaps.js', import.meta.url), 'utf8');
const b = await chromium.launch({ executablePath: process.env.UI_CHROME });
const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
for (const id of process.argv.slice(2)) {
  await p.goto(`http://127.0.0.1:6591/storybook-static/iframe.html?id=${id}&viewMode=story&globals=theme:light`);
  await p.waitForTimeout(1500);
  const coarse = await p.evaluate(() => matchMedia('(pointer: coarse)').matches);
  const r = await p.evaluate(js); r.coarse = coarse;
  writeFileSync(`${process.env.OUT || '.'}/${id}-390touch.json`, JSON.stringify(r));
}
await b.close();
