/* The scroll containers' keyboard focus, captured container by container. #531.
 *
 * Same rule as focus.mjs, whose shape this follows: every subject is FOCUSED FROM
 * THE KEYBOARD — the rig presses a bare modifier so the browser is in keyboard
 * modality, moves focus, and asserts the box matches `:focus-visible` before it
 * shoots. A capture of a box that was only clicked proves nothing about the ring.
 *
 * Three things focus.mjs does not do, which #531 needs:
 *
 *  - Two widths per subject, 1280 and 390, because a box that scrolls at one may
 *    not at the other. The width is in the filename.
 *  - Each subject is MEASURED before it is shot, and the measurements are printed
 *    and written as JSON: whether the box overflows, how many of its own children
 *    are in the tab order, and where Tab actually lands. That measurement is what
 *    decides whether a box needs the ring at all — a scroller whose own children
 *    are keyboard-focusable is given no stop by the browser.
 *  - Two subjects are expected NOT to take focus (`stop: false`). For those the
 *    rig Tabs into the region and shoots wherever focus lands, which is the row
 *    inside — the evidence that the container is not the stop.
 *
 * The subjects are built from the kit's own factories by scroll.html, over HTTP
 * from the checkout being served, so the before side of a pair is this same page
 * pointed at a worktree of `main`. The React modal's body is shot off the React
 * Storybook build, for react.mjs's reason: a React component needs a bundler.
 *
 * Playwright is deliberately not a dependency. Point UI_PLAYWRIGHT at an install
 * and UI_CHROME at a Chrome binary. why: scripts/evidence/README.md
 *
 *   node scripts/evidence/scroll.mjs <checkout> <outDir> <side> [nameFilter]
 *   node scripts/evidence/scroll.mjs --sheet <outDir>
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { settle } from './settle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THEMES = ['dark', 'light'];
const PAD = 18;

/**
 * The boxes the kit makes scrollable, as stories/focus-ring.test.js triages them.
 * `box` is the scroller and `stop` is whether the browser is expected to make it a
 * keyboard stop. `paintedOn` is the box the ring lands on when it is not the
 * scroller itself — four of them are painted on the container around them, so that
 * is the box the frame has to hold or the capture shows a ring it cut off.
 */
const SUBJECTS = [
  {
    id: 'table-card', box: '.ui-card:has(> .ui-table)', stop: true,
    caption: 'a card scrolling its table', sizes: [[1280, 440], [390, 560]],
  },
  {
    id: 'dropdown-list', box: '.ui-dropdown__list', stop: true, paintedOn: '.ui-dropdown__panel',
    caption: "a dropdown's search list", sizes: [[1280, 520], [390, 560]],
  },
  {
    id: 'drawer-body', box: '.ui-drawer__body', stop: true,
    caption: "a drawer's body", sizes: [[1280, 420], [390, 520]],
  },
  {
    id: 'confirm-body', box: '.ui-confirm__body', stop: true,
    caption: "a confirm's consequence", sizes: [[1280, 380], [390, 480]],
  },
  {
    id: 'cmdk-list', box: '.ui-cmdk__list', stop: true, paintedOn: '.ui-cmdk__panel',
    caption: "the command palette's list", sizes: [[1280, 460], [390, 520]],
  },
  {
    id: 'seg-underline', box: '.ui-seg--underline', stop: false,
    caption: 'an underline tab strip — the tab takes the ring, not the strip',
    sizes: [[1280, 200], [390, 200]],
  },
  {
    id: 'app-rail', box: '.ui-app__rail', stop: false,
    caption: 'the application rail — a nav row takes the ring, not the rail',
    sizes: [[1280, 560], [390, 560]],
  },
];

/** The React workspace's own scroll container, off its Storybook build. */
const REACT = {
  id: 'rx-modal-body', box: '.rx-modal__body', stop: true, paintedOn: '.rx-modal',
  story: 'react-modal--long-notice', caption: "the React modal's body",
  sizes: [[1280, 420], [390, 520]],
};

const serve = (serverRoot, shotPage) => new Promise((resolve, reject) => {
  const proc = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), serverRoot, shotPage]);
  proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
  proc.stderr.on('data', (d) => process.stderr.write(d));
  proc.once('error', reject);
});

/** What the browser does with this box, asked of the browser rather than assumed. */
const measure = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const tabbable = [...el.querySelectorAll(
    'a[href],area[href],button,input,select,textarea,summary,iframe,[contenteditable=""],[contenteditable="true"],[tabindex]',
  )].filter((n) => {
    if (n.hasAttribute('disabled') || n.getAttribute('aria-disabled') === 'true') return false;
    const i = n.getAttribute('tabindex');
    return i === null || Number(i) >= 0;
  });
  return {
    overflows: [el.scrollWidth > el.clientWidth ? 'x' : '', el.scrollHeight > el.clientHeight ? 'y' : ''].join('') || 'none',
    tabbableChildren: tabbable.length,
  };
}, selector);

/** Where Tab lands, walked from the top of the document. */
async function tabWalk(page, selector, steps = 14) {
  const order = [];
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press('Tab');
    const where = await page.evaluate((sel) => {
      const el = document.activeElement;
      if (!el || el === document.body) return 'body';
      const classes = (typeof el.className === 'string' ? el.className : '').trim()
        .split(/\s+/).filter(Boolean).join('.');
      return (el.matches(sel) ? 'THE BOX → ' : '') + el.tagName.toLowerCase() + (classes ? `.${classes}` : '');
    }, selector);
    order.push(where);
    if (where === 'body' || order.filter((o) => o === where).length > 1) break;
  }
  return order;
}

async function shoot([checkout, outDir, side, only]) {
  const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  mkdirSync(outDir, { recursive: true });
  const root = path.resolve(checkout);
  const tree = await serve(root, path.join(HERE, 'scroll.html'));
  const built = path.join(root, 'react/storybook-static');
  const reactUp = existsSync(path.join(built, 'iframe.html'));
  const rx = reactUp ? await serve(built, path.join(HERE, 'scroll.html')) : null;
  if (!reactUp) {
    console.log('no React Storybook build on this checkout — run: npm run build-storybook -w react');
  }
  const browser = await chromium.launch({
    executablePath: process.env.UI_CHROME,
    args: ['--font-render-hinting=none', '--disable-lcd-text', '--deterministic-mode', '--disable-partial-raster'],
  });
  const ledger = [];
  const missing = [];
  try {
    for (const subject of [...SUBJECTS, ...(reactUp ? [REACT] : [])]) {
      if (only && !subject.id.includes(only)) continue;
      for (const [width, height] of subject.sizes) {
        for (const theme of THEMES) {
          const ctx = await browser.newContext({
            viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce',
          });
          const page = await ctx.newPage();
          if (subject.story) {
            await page.goto(`http://127.0.0.1:${rx.port}/iframe.html?id=${subject.story}&viewMode=story`,
              { waitUntil: 'load' });
            await page.waitForSelector('#storybook-root > *');
            await page.addStyleTag({
              url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700'
                + '&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap',
            });
            await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
          } else {
            const query = new URLSearchParams({ subject: subject.id, theme });
            await page.goto(`http://127.0.0.1:${tree.port}/__shot?${query}`, { waitUntil: 'load' });
            await page.waitForFunction(() => window.__ready === true);
          }
          await settle(page);

          const reading = await measure(page, subject.box);
          if (!reading) {
            // Reported rather than thrown: a subject that is not on the other
            // checkout must not take the whole before side down with it.
            missing.push(`${subject.id} @${width}/${theme}: no ${subject.box}`);
            await ctx.close();
            continue;
          }
          const order = await tabWalk(page, subject.box);
          const reached = order.some((o) => o.startsWith('THE BOX'));
          ledger.push({ ...reading, id: subject.id, width, theme, tabReaches: reached, tabOrder: order });

          const target = page.locator(subject.box).first();
          if (subject.stop) {
            // Keyboard modality first, then the move. The key is a bare modifier,
            // because Tab is a key the kit's dropdown and every overlay trap handle.
            await page.keyboard.press('Shift');
            await target.evaluate((el) => el.focus());
            await settle(page);
            const visible = await target.evaluate((el) => el.matches(':focus-visible'));
            if (!visible) throw new Error(`${subject.id}: ${subject.box} did not reach :focus-visible`);
          } else {
            // Not a stop, so there is nothing to focus. Tab into the region and
            // shoot wherever focus landed: the row inside, which is the point.
            const inside = order.find((o) => o !== 'body');
            if (!inside || inside.startsWith('THE BOX')) {
              throw new Error(`${subject.id}: expected Tab to land inside ${subject.box}, got ${inside}`);
            }
          }
          // The frame holds the box the RING is on, which for a delegated one is the
          // container around the scroller.
          const framed = subject.paintedOn ? page.locator(subject.paintedOn).first() : target;
          const box = await framed.boundingBox();
          const clip = {
            x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD),
            width: Math.min(width - Math.max(0, box.x - PAD), box.width + PAD * 2),
            height: Math.min(height - Math.max(0, box.y - PAD), box.height + PAD * 2),
          };
          const file = `${side}-${subject.id}-${width}-${theme}.png`;
          await page.screenshot({ path: path.join(outDir, file), clip });
          console.log(`  ${file}  ${subject.caption}`
            + `  [overflows ${reading.overflows}, ${reading.tabbableChildren} tabbable children,`
            + ` Tab reaches it: ${reached}]`);
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
    tree.proc.kill();
    rx?.proc.kill();
  }
  if (missing.length) console.log(`\nnot found on this checkout:\n  ${missing.join('\n  ')}`);
  const where = path.join(outDir, `${side}-scroll-measurements.json`);
  writeFileSync(where, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`\n  ${path.basename(where)}  (${ledger.length} readings)`);
}

/** Lay the two sides of one subject side by side, one sheet per subject: four rows
 *  — 1280 and 390, each light and dark — so a reader compares pictures rather than
 *  filenames. Needs the captures and no checkout of its own. */
async function sheet([outDir]) {
  const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const have = (file) => existsSync(path.join(outDir, file));
  const data = (file) => `data:image/png;base64,${readFileSync(path.join(outDir, file)).toString('base64')}`;
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });
  try {
    for (const subject of [...SUBJECTS, REACT]) {
      const rows = subject.sizes.flatMap(([width]) => THEMES.map((theme) => ({
        label: `${width}px · ${theme}`,
        before: `before-${subject.id}-${width}-${theme}.png`,
        after: `after-${subject.id}-${width}-${theme}.png`,
      }))).filter((row) => have(row.before) || have(row.after));
      if (!rows.length) continue;
      const ctx = await browser.newContext({ viewport: { width: 1320, height: 600 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      // System faces only: this sheet is a contact print of the captures, and
      // nothing in it is a specimen of the kit's typography.
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>
        body{margin:0;background:#15151c;color:#e6e6ef;font:13px/1.5 system-ui,sans-serif;padding:22px}
        h1{font:600 15px/1.4 system-ui,sans-serif;margin:0 0 4px}
        p.sub{margin:0 0 18px;opacity:.75;max-width:92ch}
        table{border-collapse:collapse;width:100%}
        th{font:600 11px/1 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;
          opacity:.6;text-align:left;padding:0 0 8px}
        td{padding:8px 10px 8px 0;vertical-align:middle}
        td.cap{width:110px;opacity:.85;white-space:nowrap}
        img{display:block;max-width:560px;max-height:320px;width:auto;height:auto;outline:1px solid #2a2a36}
        .none{opacity:.5;font-style:italic}
      </style>
      <h1>#531 — ${subject.caption}, <code>${subject.box}</code></h1>
      <p class="sub">Focused from the keyboard and asserted to match <code>:focus-visible</code>
        before the shot${subject.stop ? '' : ' — except here, where the box is not a keyboard stop at all, so the frame shows where Tab actually lands'}.
        Left: <code>main</code>. Right: this branch.</p>
      <table><tr><th></th><th>before</th><th>after</th></tr>
      ${rows.map((r) => `<tr><td class="cap">${r.label}</td>
        <td>${have(r.before) ? `<img src="${data(r.before)}" alt="">` : '<span class="none">not on main</span>'}</td>
        <td>${have(r.after) ? `<img src="${data(r.after)}" alt="">` : '<span class="none">not on this branch</span>'}</td></tr>`).join('')}
      </table>`);
      const file = `sheet-${subject.id}.png`;
      await page.locator('body').screenshot({ path: path.join(outDir, file) });
      console.log(`  ${file}  (${rows.length} pairs)`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

const argv = process.argv.slice(2);
if (argv[0] === '--sheet') await sheet(argv.slice(1));
else {
  if (argv.length < 3) throw new Error('usage: scroll.mjs <checkout> <outDir> <side> [nameFilter]');
  if (!existsSync(path.join(path.resolve(argv[0]), 'site/build.mjs'))) {
    throw new Error(`${argv[0]} is not a checkout of this repository`);
  }
  await shoot(argv);
}
