/* What a SELECTED item looks like at rest, control by control.
 *
 * The companion to focus.mjs, and its opposite: focus.mjs puts a control under the
 * keyboard and shoots the band; this shoots a selected, current or active item with
 * nothing focused, so a reader sees the mark the kit uses to say "this one" on its
 * own. #578 round r34 separated the two — a selected item is a background highlight
 * and an outline means focus — and these are the captures that show it.
 *
 * One static server over one checkout, one Chrome, both themes, desk and phone
 * width, so between two checkouts only the code differs: the before side of a pair
 * is this rig pointed at a worktree of the other one.
 *
 * Playwright is deliberately not a dependency of this package. Point UI_PLAYWRIGHT
 * at an install and UI_CHROME at a Chrome binary. why: scripts/evidence/README.md
 *
 *   node scripts/evidence/selection.mjs <checkout> <outDir> <side> [nameFilter]
 *   node scripts/evidence/selection.mjs --sheet <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { settle } from './settle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THEMES = ['dark', 'light'];

/**
 * Each subject is a story, a crop, and the keys or clicks that put one of its items
 * into the state being shot. `clip` is the box to crop to — the LIST rather than the
 * item, because a mark is only readable beside the rows that do not carry it.
 */
const SUBJECTS = [
  {
    // The shell folds its rail below the desk step, so the OPEN rail is a desk subject
    // here and the side nav below carries the same row at phone width.
    id: 'rail-row', story: 'apps/ShellLayouts.stories.js', export: 'RailWide',
    sizes: [[1280, 820]], clip: '.ui-app__rail .ui-nav', clipLast: '.ui-app__rail .ui-nav__item',
    caption: 'the open rail\u2019s current row',
  },
  {
    id: 'nav-side', story: 'components/Navigation.stories.js', export: 'Sidebar',
    sizes: [[1280, 620], [390, 620]], clip: '.ui-nav--side', clipLast: '.ui-nav--side .ui-nav__item',
    caption: 'a side nav\u2019s current row',
  },
  {
    id: 'seg-pill', story: 'components/Segmented.stories.js', export: 'Examples',
    sizes: [[1280, 300], [390, 360]], clip: '.ui-seg',
    caption: 'the chosen pill in a segmented group',
  },
  {
    id: 'cmdk-row', story: 'components/CommandPalette.stories.js', export: 'Densities',
    sizes: [[1280, 900], [390, 1100]], clip: '.ui-cmdk__panel',
    caption: 'the row the command palette would run',
  },
  {
    id: 'menu-row', story: 'components/Dropdown.stories.js', export: 'SearchOpen',
    sizes: [[1280, 620], [390, 700]], clip: '.ui-dropdown__panel',
    keys: ['ArrowDown'], into: '.ui-dropdown__search-input',
    caption: 'the row a menu would pick',
  },
];

const viewports = (subject) => subject.sizes;
const PAD = 14;

async function shoot([checkout, outDir, side, only]) {
  const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  mkdirSync(outDir, { recursive: true });
  const root = path.resolve(checkout);
  const serve = () => new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), root, path.join(HERE, 'focus.html')]);
    proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
    proc.stderr.on('data', (d) => process.stderr.write(d));
    proc.once('error', reject);
  });
  const tree = await serve();
  const browser = await chromium.launch({
    executablePath: process.env.UI_CHROME,
    args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-partial-raster'],
  });
  const missing = [];
  try {
    for (const subject of SUBJECTS) {
      if (only && !subject.id.includes(only)) continue;
      for (const [width, height] of viewports(subject)) for (const theme of THEMES) {
        const ctx = await browser.newContext({
          viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce',
        });
        const page = await ctx.newPage();
        const query = new URLSearchParams({ story: subject.story, export: subject.export, theme });
        await page.goto(`http://127.0.0.1:${tree.port}/__shot?${query}`, { waitUntil: 'load' });
        await page.waitForFunction(() => window.__ready === true);
        await settle(page);
        if (subject.click) { await page.click(subject.click); await settle(page); }
        // The keys that put an item into the state, pressed INTO the control that
        // owns them, and then blurred: this rig shoots a selection at rest, so
        // nothing may be left holding the focus band.
        if (subject.keys) {
          const host = page.locator(subject.into).first();
          if (!await host.count()) { missing.push(`${subject.id}: no ${subject.into}`); await ctx.close(); continue; }
          await host.evaluate((el) => el.focus());
          for (const key of subject.keys) await page.keyboard.press(key);
          await settle(page);
          await page.evaluate(() => document.activeElement?.blur());
          await settle(page);
        }
        const box = await page.locator(subject.clip).first().boundingBox().catch(() => null);
        if (!box) { missing.push(`${subject.id}: no ${subject.clip}`); await ctx.close(); continue; }
        // A rail or a palette list is as tall as its container, and most of that is
        // empty. `clipLast` ends the crop at the bottom of the last row instead.
        let bottom = box.y + box.height;
        if (subject.clipLast) {
          const rows = page.locator(subject.clipLast);
          const last = await rows.nth(await rows.count() - 1).boundingBox().catch(() => null);
          if (!last) { missing.push(`${subject.id}: no ${subject.clipLast}`); await ctx.close(); continue; }
          bottom = last.y + last.height;
        }
        const frame = {
          x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD),
          width: Math.min(width, box.width + PAD * 2),
          height: Math.min(height, bottom - box.y + PAD * 2),
        };
        const file = `${side}-${subject.id}-${width}-${theme}.png`;
        await page.screenshot({ path: path.join(outDir, file), clip: frame });
        console.log(`  ${file}  ${subject.caption}`);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    tree.proc.kill();
  }
  if (missing.length) console.log(`\nnot found on this checkout:\n  ${missing.join('\n  ')}`);
}

/** Lay the two sides of every pair side by side, one sheet per subject and theme. */
async function sheet([outDir]) {
  const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const files = readdirSync(outDir).filter((f) => /^(before|after)-.*\.png$/.test(f));
  const pairs = new Map();
  for (const file of files) {
    const [, side, rest] = /^(before|after)-(.*)\.png$/.exec(file);
    if (!pairs.has(rest)) pairs.set(rest, {});
    pairs.get(rest)[side] = file;
  }
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });
  const data = (file) => `data:image/png;base64,${readFileSync(path.join(outDir, file)).toString('base64')}`;
  try {
    for (const subject of SUBJECTS) for (const theme of THEMES) {
      const rows = viewports(subject)
        .map(([width]) => ({ width, pair: pairs.get(`${subject.id}-${width}-${theme}`) }))
        .filter((r) => r.pair && (r.pair.before || r.pair.after));
      if (!rows.length) continue;
      const ctx = await browser.newContext({ viewport: { width: 1180, height: 600 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      // System faces only: this sheet is a contact print of the captures, and
      // nothing in it is a specimen of the kit's typography.
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>
        body{margin:0;background:${theme === 'dark' ? '#0c0c11' : '#f7f7fb'};
          color:${theme === 'dark' ? '#e6e6ef' : '#1b1b22'};
          font:13px/1.5 system-ui,sans-serif;padding:22px}
        h1{font:600 15px/1.4 system-ui,sans-serif;margin:0 0 4px}
        p.sub{margin:0 0 18px;opacity:.7}
        table{border-collapse:collapse;width:100%}
        th{font:600 11px/1 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;
          opacity:.6;text-align:left;padding:0 0 8px}
        td{padding:7px 10px 7px 0;vertical-align:top}
        td.cap{width:120px;opacity:.85}
        img{display:block;max-width:470px;height:auto;
          outline:1px solid ${theme === 'dark' ? '#2a2a36' : '#dcdce6'}}
        .none{opacity:.5;font-style:italic}
      </style>
      <h1>${subject.caption}, ${theme}</h1>
      <p class="sub">Nothing is focused. Left: the ring PR before round r34. Right: this branch.</p>
      <table><tr><th>Width</th><th>Before</th><th>After</th></tr>
      ${rows.map((r) => `<tr><td class="cap">${r.width}px</td>
        <td>${r.pair.before ? `<img src="${data(r.pair.before)}" alt="before">` : '<span class="none">not on that checkout</span>'}</td>
        <td>${r.pair.after ? `<img src="${data(r.pair.after)}" alt="after">` : '<span class="none">not on this checkout</span>'}</td></tr>`).join('')}
      </table>`);
      await page.waitForFunction(() => [...document.images].every((i) => i.complete));
      const file = `sheet-${subject.id}-${theme}.png`;
      await page.screenshot({ path: path.join(outDir, file), fullPage: true });
      console.log(`  ${file}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

const argv = process.argv.slice(2);
await (argv[0] === '--sheet' ? sheet(argv.slice(1)) : shoot(argv));
