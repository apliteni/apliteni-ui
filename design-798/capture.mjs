// Set UI_PLAYWRIGHT to Playwright's index.mjs. Playwright is not a dependency of the kit.
const { chromium } = await import(process.env.UI_PLAYWRIGHT);
import { pathToFileURL } from 'node:url';
const dir = process.argv[2], out = process.argv[3], only = process.argv[4];
const desk = { width: 1440, height: 900 }, phone = { width: 390, height: 844 };
// name, scene, viewport, interaction
const menu = async p => { await p.getByRole('button', { name: /menu/i }).first().click(); await p.getByRole('dialog').waitFor(); };
const shots = [
  ['c-side', 'c-side', desk], ['c-band', 'c-band', desk], ['c-overview', 'c-overview', desk],
  ['c-zero', 'c-zero', desk], ['c-empty', 'c-empty', desk], ['c-error', 'c-error', desk],
  ['c-phone-bar', 'c-overview', phone], ['c-phone-menu', 'c-overview', phone, menu],
  ['c-phone-list', 'c-side', phone], ['c-phone-empty', 'c-empty', phone], ['c-phone-error', 'c-error', phone],
  ['d-nav', 'd-nav', desk], ['d-nav-zero', 'd-nav-zero', desk], ['d-phone-menu', 'd-nav', phone, menu],
  ['c-state-bell-hover', 'c-zero', desk, async p => { await p.getByRole('link', { name: 'Notifications' }).hover(); }],
  ['c-state-bell-focus', 'c-overview', desk, async p => { await tabTo(p, l => l.getAttribute('aria-label')?.startsWith('Notifications,')); }],
  ['c-state-row-hover', 'c-side', desk, async p => { await p.getByRole('link', { name: /Spring launch/ }).hover(); }],
  ['c-state-row-focus', 'c-side', desk, async p => { await tabTo(p, l => l.textContent?.includes('Spring launch')); }],
];
async function tabTo(p, test) {
  for (let i = 0; i < 60; i++) {
    await p.keyboard.press('Tab');
    const hit = await p.evaluate(`(${test.toString()})(document.activeElement)`);
    if (hit) return;
  }
  throw new Error('focus target not reached');
}
const browser = await chromium.launch();
for (const [name, scene, viewport, act] of shots) {
  if (only && !name.startsWith(only)) continue;
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, timezoneId: 'UTC', colorScheme: 'light' });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(pathToFileURL(`${dir}/index.html`).href + '#' + scene);
  await p.locator('.ui-react-app, .ui-app').first().waitFor();
  await p.evaluate(() => document.fonts.ready);
  if (act) await act(p);
  await p.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${name}.png` });
  console.log(name, errors.length ? 'ERRORS ' + errors.join(' | ') : 'ok');
  await ctx.close();
}
await browser.close();
