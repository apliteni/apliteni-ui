/* Keyboard focus, captured control by control. The producer for #482's evidence.
 *
 * Every subject is FOCUSED FROM THE KEYBOARD, not with a script alone: the rig
 * presses Tab so the browser is in keyboard modality, moves focus to the control,
 * and then asserts the control matches `:focus-visible` before it shoots. A
 * capture of a control that was not keyboard-focused would show whatever the
 * mouse state draws and prove nothing about the ring.
 *
 * One static server over one checkout, one Chrome, one viewport, both themes — so
 * between two checkouts only the code differs, and the before side of a pair is
 * this rig pointed at a worktree of `main`.
 *
 * Playwright is deliberately not a dependency of this package. Point UI_PLAYWRIGHT
 * at an install and UI_CHROME at a Chrome binary. why: scripts/evidence/README.md
 *
 *   scripts/check-lock node scripts/evidence/focus.mjs <checkout> <outDir> <side> [nameFilter]
 *   scripts/check-lock node scripts/evidence/focus.mjs --sheet <outDir>
 *
 * `side` is a prefix — `after` off this checkout, `before` off the other one. The
 * --sheet pass needs no browser of its own beyond composing: it lays the two
 * sides of every pair it finds side by side, one sheet per subject and theme, so
 * a reader compares images instead of filenames.
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { settle } from './settle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THEMES = ['dark', 'light'];

/**
 * The subjects: every control #482 gave a ring to, on a surface that renders it.
 * `page` is the landing site; `story` is a story of the checkout being shot.
 * `click` opens a surface that has to be opened before its rows can take focus.
 */
const SUBJECTS = [
  {
    id: 'landing', kind: 'page', size: [1280, 900],
    controls: [
      ['brand', '.site-topbar .brand', 'the topbar brand link'],
      ['nav-link', '.site-topbar .lk', 'a topbar nav link'],
      ['theme-toggle', '.site-topbar .toggle', 'the theme toggle'],
      ['accent-swatch', '.play-accents button', 'a playground accent swatch'],
      // The SELECTED swatch is a separate subject: it is the one #487's review
      // found painting nothing when focused, because `.on` tied the chrome's
      // focus rule on specificity and won on source order.
      ['accent-swatch-on', '.play-accents button.on', 'the selected playground accent swatch'],
      ['path-card', '.path-card', 'an adoption-path tab'],
      ['tab-panel', '#paths-panel-humans', 'the adoption-path panel'],
      ['copy', '.term__copy', 'a snippet copy button'],
      ['footer-dot', '.site-footer .accents button', 'a footer accent dot'],
      ['footer-link', '.site-footer a', 'a footer link'],
    ],
  },
  {
    // A scroll container is a keyboard stop Chrome makes on its own, so the panel
    // is the subject, not a control inside it. #487's review measured the native
    // outline here.
    id: 'dropdown-scroll', kind: 'story', story: 'components/Dropdown.stories.js', export: 'Scrollable',
    size: [1280, 700],
    controls: [['panel', '.ui-dropdown__panel.is-scroll', 'a scrolling dropdown panel']],
  },
  {
    id: 'shell', kind: 'story', story: 'apps/ShellLayouts.stories.js', export: 'TopbarWide',
    size: [1280, 800],
    controls: [['app-brand', '.ui-app__brand', "the shell's brand link"]],
  },
  {
    id: 'footer', kind: 'story', story: 'components/Footer.stories.js', export: 'Full',
    size: [1280, 900],
    controls: [
      ['brand', '.ui-footer__brand .brand', "the footer's brand lockup"],
      ['social', '.ui-footer__social', 'a social mark'],
      ['column-link', '.ui-footer__links a', 'a column link'],
      ['legal-link', '.ui-footer__legal-links a', 'a legal link'],
      ['accent-swatch', '.ui-accent-picker button', 'an accent swatch'],
      ['theme-toggle', '.toggle', 'the theme toggle'],
    ],
  },
  {
    id: 'topbar', kind: 'story', story: 'apps/AccountPreset.stories.js', export: 'WithVersionSwitcher',
    size: [1280, 700],
    controls: [
      ['deck-text', '.dtsw a', 'the deck / text switcher'],
      ['version', '.vsw__btn', 'the version switcher'],
      ['avatar', '.avatar', 'the account avatar'],
    ],
  },
  {
    // The version menu's rows, which #487's re-review found still taking the
    // browser's outline. `click` opens the switcher; the row is role="option"
    // with tabindex="-1", so the kit's arrow keys are what focus it in use.
    id: 'version-menu', kind: 'story', story: 'apps/AccountPreset.stories.js', export: 'WithVersionSwitcher',
    size: [1280, 700], click: '.vsw__btn',
    controls: [['row', '.vopt', "a version menu row"]],
  },
  {
    id: 'account-menu', kind: 'story', story: 'apps/AccountPreset.stories.js', export: 'WithVersionSwitcher',
    size: [1280, 700], click: '.avatar',
    controls: [['menu-row', '.amenu a', 'an account menu row']],
  },
  {
    id: 'snippet', kind: 'story', story: 'components/Snippet.stories.js', export: 'Shell',
    size: [900, 420],
    controls: [['copy', '.ui-snippet__copy', "the snippet's copy button"]],
  },
  {
    id: 'card', kind: 'story', story: 'components/Card.stories.js', export: 'Interactive',
    size: [1000, 520],
    controls: [['interactive', '.ui-card--interactive', 'an interactive card']],
  },
  {
    id: 'toast', kind: 'story', story: 'components/CalloutToast.stories.js', export: 'Affordances',
    size: [1000, 620],
    controls: [
      ['action', '.ui-toast__action', "a toast's action"],
      ['close', '.ui-toast__close', "a toast's close"],
    ],
  },
  {
    id: 'feedback', kind: 'story', story: 'components/Feedback.stories.js', export: 'Default',
    size: [1100, 760],
    controls: [
      ['button', '.ui-fbbtn', "a feedback composer button"],
      ['dismiss', '.ui-fbc__x', "the composer's dismiss"],
    ],
  },
];

const PAD = 16;

async function shoot([checkout, outDir, side, only]) {
  const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  mkdirSync(outDir, { recursive: true });
  const root = path.resolve(checkout);
  // The landing page is shot as it is BUILT, not as it is composed here: site/
  // build.mjs is what turns the template and the shared chrome into the page a
  // reader gets, and it needs nothing installed.
  execFileSync(process.execPath, [path.join(root, 'site/build.mjs')], { cwd: root, stdio: 'inherit' });

  const serve = (serverRoot, shotPage) => new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), serverRoot, shotPage]);
    proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
    proc.stderr.on('data', (d) => process.stderr.write(d));
    proc.once('error', reject);
  });
  const site = await serve(path.join(root, 'site/public'), path.join(HERE, 'focus.html'));
  const tree = await serve(root, path.join(HERE, 'focus.html'));
  const browser = await chromium.launch({
    executablePath: process.env.UI_CHROME,
    args: ['--font-render-hinting=none', '--disable-lcd-text', '--deterministic-mode', '--disable-partial-raster'],
  });
  const missing = [];
  try {
    for (const subject of SUBJECTS) {
      if (only && !subject.id.includes(only)) continue;
      for (const theme of THEMES) {
        const [width, height] = subject.size;
        const ctx = await browser.newContext({
          viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce',
        });
        const page = await ctx.newPage();
        if (subject.kind === 'page') {
          // The page's own script reads the saved choice, so the theme is set the
          // way a returning reader sets it rather than by overwriting the attribute.
          await ctx.addInitScript(`try{localStorage.setItem('apliteni-ui-theme','${theme}')}catch(e){}`);
          await page.goto(`http://127.0.0.1:${site.port}/index.html`, { waitUntil: 'load' });
        } else {
          const query = new URLSearchParams({ story: subject.story, export: subject.export, theme });
          await page.goto(`http://127.0.0.1:${tree.port}/__shot?${query}`, { waitUntil: 'load' });
          await page.waitForFunction(() => window.__ready === true);
        }
        await settle(page);
        if (subject.click) {
          await page.click(subject.click);
          await settle(page);
        }
        for (const [name, selector, caption] of subject.controls) {
          const target = page.locator(selector).first();
          if (!await target.count()) { missing.push(`${subject.id}/${name}: no ${selector}`); continue; }
          // Keyboard modality first, then the move: Chrome matches
          // :focus-visible on a scripted focus only when the last interaction was
          // a key, and the assertion below is what proves it did. The key pressed
          // is a bare modifier, because Tab is a key the kit's own dropdown
          // handles — it closes an open panel, taking the subject with it.
          await page.keyboard.press('Shift');
          await target.evaluate((el) => el.focus());
          await settle(page);
          const visible = await target.evaluate((el) => el.matches(':focus-visible'));
          if (!visible) throw new Error(`${subject.id}/${name}: ${selector} did not reach :focus-visible`);
          const box = await target.boundingBox();
          const clip = {
            x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD),
            width: Math.min(width, box.width + PAD * 2), height: Math.min(height, box.height + PAD * 2),
          };
          const file = `${side}-${subject.id}-${name}-${theme}.png`;
          await page.screenshot({ path: path.join(outDir, file), clip });
          console.log(`  ${file}  ${caption}`);
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    site.proc.kill();
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
  const order = SUBJECTS.flatMap((s) => s.controls.map(([name, , caption]) => ({
    subject: s.id, key: `${s.id}-${name}`, caption,
  })));
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });
  const data = (file) => `data:image/png;base64,${readFileSync(path.join(outDir, file)).toString('base64')}`;
  try {
    for (const subject of SUBJECTS) {
      for (const theme of THEMES) {
        const rows = order.filter((o) => o.subject === subject.id)
          .map((o) => ({ ...o, pair: pairs.get(`${o.key}-${theme}`) }))
          .filter((o) => o.pair && (o.pair.before || o.pair.after));
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
          td{padding:7px 10px 7px 0;vertical-align:middle}
          td.cap{width:210px;opacity:.85}
          img{display:block;max-width:420px;height:auto;
            outline:1px solid ${theme === 'dark' ? '#2a2a36' : '#dcdce6'}}
          .none{opacity:.5;font-style:italic}
        </style>
        <h1>#482 — keyboard focus on the ${subject.id} surface, ${theme}</h1>
        <p class="sub">Each control focused from the keyboard and asserted to match
          <code>:focus-visible</code> before the shot. Left: <code>main</code>. Right: this branch.</p>
        <table><tr><th></th><th>before</th><th>after</th></tr>
        ${rows.map((r) => `<tr><td class="cap">${r.caption}</td>
          <td>${r.pair.before ? `<img src="${data(r.pair.before)}" alt="">` : '<span class="none">not on main</span>'}</td>
          <td>${r.pair.after ? `<img src="${data(r.pair.after)}" alt="">` : '<span class="none">not on this branch</span>'}</td></tr>`).join('')}
        </table>`);
        const file = `sheet-${subject.id}-${theme}.png`;
        await page.locator('body').screenshot({ path: path.join(outDir, file) });
        console.log(`  ${file}  (${rows.length} controls)`);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
}

const argv = process.argv.slice(2);
if (argv[0] === '--sheet') await sheet(argv.slice(1));
else {
  if (argv.length < 3) throw new Error('usage: focus.mjs <checkout> <outDir> <side> [nameFilter]');
  if (!existsSync(path.join(path.resolve(argv[0]), 'site/build.mjs'))) {
    throw new Error(`${argv[0]} is not a checkout of this repository`);
  }
  await shoot(argv);
}
