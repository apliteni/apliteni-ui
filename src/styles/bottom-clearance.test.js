import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* --ui-app-bottom-clearance is a published guarantee living only in CSS, which jsdom
 * does not render and no mounted test reads. This gate holds who declares it, under
 * which media and selector, who reads it, and what a phone page is left with at either
 * answer. It is written as discovery because the review of #434 broke the version that
 * counted four handwritten regexes: an inverted breakpoint and a new bare reader each
 * kept it green.
 *
 * Limits: sheets, not a layout — the browser half at the end of this file lays it out,
 * and is off unless BOTTOM_CLEARANCE=1. The cascade is weighed crudely, one point per
 * class, pseudo-class, attribute or id, at 390px. A declaration nested inside another
 * rule is read as its parent's. Consumers reading the token in their own CSS are
 * outside this repository. why: docs/specification.md#react-appshell
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '../..');
const TOKEN = '--ui-app-bottom-clearance';
/** The width every measurement below is taken at: the phone step the kit draws for. */
const PHONE = 390;

/** Every sheet the two workspaces ship, discovered rather than listed. */
const sheets = () => {
  const found = new Map();
  for (const dir of ['src', 'src/styles', 'src/tokens', 'react/src']) {
    for (const name of readdirSync(path.join(root, dir)).sort()) {
      if (name.endsWith('.css')) found.set(`${dir}/${name}`, readFileSync(path.join(root, dir, name), 'utf8'));
    }
  }
  return found;
};

/** One sheet's rules, each carrying the at-rules it sits inside. */
function rulesOf(css) {
  const walk = (text, context) => {
    const out = [];
    let head = '';
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] !== '{') { head += text[i]; continue; }
      let depth = 1;
      let j = i + 1;
      for (; j < text.length && depth > 0; j += 1) {
        if (text[j] === '{') depth += 1;
        else if (text[j] === '}') depth -= 1;
      }
      const selector = head.trim().replace(/\s+/g, ' ');
      head = '';
      const body = text.slice(i + 1, j - 1);
      i = j - 1;
      if (selector.startsWith('@')) out.push(...walk(body, [...context, selector]));
      else out.push({ context, selector, body });
    }
    return out;
  };
  return walk(css.replace(/\/\*[\s\S]*?\*\//g, ''), []);
}

/** A rule body's own declarations; a nested rule's braces are not one. */
const declsOf = (body) => body.split(';')
  .map((part) => part.trim())
  .filter((part) => part && !part.includes('{') && !part.includes('}'))
  .map((part) => ({ prop: part.slice(0, part.indexOf(':')).trim(), value: part.slice(part.indexOf(':') + 1).trim().replace(/\s+/g, ' ') }))
  .filter((decl) => decl.prop);

/** Every rule in every sheet, flattened once per call so a mutated sheet is read fresh. */
const allRules = (map) => [...map].flatMap(([file, css]) => rulesOf(css).map((rule) => ({ file, ...rule })));

/** Does this at-rule context admit a 390px phone? `@supports` is the engine's to answer. */
const atPhone = (context) => context.every((at) => {
  if (!at.startsWith('@media')) return true;
  const terms = [...at.matchAll(/\((max|min)-width:\s*(\d+)px\)/g)];
  return terms.every(([, kind, px]) => (kind === 'max' ? PHONE <= Number(px) : PHONE >= Number(px)));
});

/** Splitting a value on top-level spaces, so `calc(a + b)` stays one part. */
function parts(value) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of value) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ' ' && depth === 0) { if (buf) out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

/** A length in px, following one `var()` into the token sheet. Anything else is null. */
function pxOf(value, tokens) {
  const direct = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  if (direct) return Number(direct[1]);
  const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
  if (!ref) return null;
  const declared = new RegExp(`${ref[1]}:\\s*([^;]+);`).exec(tokens);
  return declared ? pxOf(declared[1], tokens) : null;
}

/** What a `padding` shorthand or a `padding-bottom` says about the bottom edge. */
const bottomOf = (decl) => {
  if (decl.prop === 'padding-bottom') return decl.value;
  const sides = parts(decl.value);
  return sides.length >= 3 ? sides[2] : sides[0];
};

const weight = (selector) => (selector.match(/[.:#[]/g) || []).length;

/**
 * The declaration that wins `prop` on a phone page, by weight and then by order.
 *
 * `bar` is the one thing about the markup that matters here: a selector naming
 * `.ui-react-app__bottom` reaches a page only while the shell draws its bottom bar.
 */
function winner(map, { prop, subject, bar }) {
  const shorthand = prop === 'padding-bottom' ? 'padding' : null;
  const found = allRules(map)
    .filter((rule) => atPhone(rule.context))
    .filter((rule) => bar || !rule.selector.includes('.ui-react-app__bottom'))
    .filter((rule) => subject.test(rule.selector))
    .flatMap((rule, order) => declsOf(rule.body)
      .filter((decl) => decl.prop === prop || decl.prop === shorthand)
      .map((decl) => ({ ...rule, ...decl, order, bottom: shorthand ? bottomOf(decl) : decl.value })));
  return found.sort((a, b) => weight(a.selector) - weight(b.selector) || a.order - b.order).pop() || null;
}

/** The ring's reach past a control's border box: its gap, its band, and the halo past them. */
function ringReach(tokens) {
  const halo = /0 0 (\d+)px (\d+)px color-mix/.exec(tokens);
  assert.ok(halo, 'the halo is no longer the last shadow in --ring; this gate reads it to size the room below a focused action');
  return pxOf('var(--ring-gap-width)', tokens) + pxOf('var(--ring-width)', tokens) + Number(halo[1]) + Number(halo[2]);
}

/* Every use of the token, and nothing else, with the context it is written under. The
 * value is compared as text: this is the published contract, and `calc(96px + …)`
 * rewritten as `96px` is a different promise even where it computes the same. */
const CONTRACT = [
  {
    what: 'the bar — not the shell — declares the clearance',
    file: 'react/src/AppShell.css', media: '@media (max-width: 560px)',
    selector: ':root:has(.ui-react-app__bottom)',
    prop: TOKEN, value: 'calc(96px + env(safe-area-inset-bottom))',
  },
  {
    what: 'root scroll padding is the shell\'s, and adds the ring\'s room to the clearance',
    file: 'react/src/AppShell.css', media: '@media (max-width: 560px)',
    selector: ':root:has(.ui-react-app)',
    prop: 'scroll-padding-bottom', value: 'calc(var(--space-5) + var(--ui-app-bottom-clearance, 0px))',
  },
  {
    what: 'the page\'s bottom padding is overridden only where the bar is drawn',
    file: 'react/src/AppShell.css', media: '@media (max-width: 560px)',
    selector: ':root:has(.ui-react-app__bottom) .ui-react-app .ui-app__main',
    prop: 'padding-bottom', value: 'var(--ui-app-bottom-clearance, 0px)',
  },
  {
    what: 'the toast stack adds the clearance to its offset',
    file: 'react/src/Toast.css', media: '',
    selector: '.rx-toast-stack',
    prop: 'bottom', value: 'calc(var(--space-4) + var(--ui-app-bottom-clearance, 0px))',
  },
];

/** Every mention of the token in every shipped sheet, as the contract above describes one. */
const uses = (map) => allRules(map).flatMap((rule) => declsOf(rule.body)
  .filter((decl) => decl.prop.includes(TOKEN) || decl.value.includes(TOKEN))
  .map((decl) => ({
    file: rule.file, media: rule.context.join(' '), selector: rule.selector,
    prop: decl.prop, value: decl.value,
  })));

/**
 * Every reason the sheets handed in do not hold the contract — the whole gate as one
 * function, so a mutation is judged by the checks that run for real and not by a
 * second set written to agree with them.
 */
function problems(map) {
  const found = [];
  const tokens = map.get('src/tokens/tokens.css');
  const key = ({ file, media, selector, prop, value }) => [file, media, selector, prop, value].join(' | ');
  const discovered = uses(map);
  const written = new Set(discovered.map(key));

  if (discovered.length !== CONTRACT.length) {
    found.push(`${discovered.length} uses of ${TOKEN} are in the sheets and the contract names ${CONTRACT.length}`);
  }
  for (const entry of CONTRACT) {
    if (!written.has(key(entry))) found.push(`missing: ${entry.what}`);
  }
  const promised = new Set(CONTRACT.map(key));
  for (const use of discovered) {
    if (!promised.has(key(use))) {
      found.push(`unmeasured: ${use.prop} on ${use.selector} in ${use.file} ${use.media}`.trim());
    }
    // A bare var() on an undeclared property throws the whole declaration away, so
    // every reader names the fallback — including one written where the token is sure.
    if (use.prop !== TOKEN && !use.value.includes(`var(${TOKEN}, 0px)`)) {
      found.push(`${use.prop} in ${use.file} reads the token without its 0px fallback`);
    }
  }

  // The regression this gate exists for, measured rather than matched: a phone page
  // whose shell draws no bar keeps the end space layout.css gives it, and that space
  // is wide enough for the ring of an action sitting at the end of it.
  const reach = ringReach(tokens);
  const bare = winner(map, { prop: 'padding-bottom', subject: /\.ui-app__main$/, bar: false });
  const bareEnd = bare && pxOf(bare.bottom, tokens);
  if (!(bareEnd >= reach)) {
    found.push(`a phone page with no bottom bar ends ${bareEnd}px below its last row, and the ring of an action there reaches ${reach}px`);
  }
  const barred = winner(map, { prop: 'padding-bottom', subject: /\.ui-app__main$/, bar: true });
  if (!barred || !barred.bottom.includes(TOKEN)) {
    found.push('a phone page that draws the bottom bar does not pad for the clearance');
  }

  // Scrolling an action into view puts its border box on the viewport edge, so the
  // room the ring needs is the root's to hold, bar or no bar.
  for (const bar of [false, true]) {
    const scroll = winner(map, { prop: 'scroll-padding-bottom', subject: /:root/, bar });
    const room = scroll && /^calc\((.+) \+ var\(--ui-app-bottom-clearance, 0px\)\)$/.exec(scroll.value);
    const px = room && pxOf(room[1], tokens);
    if (!(px >= reach)) {
      found.push(`with bar=${bar}, root scroll padding holds ${px}px for a ring that reaches ${reach}px`);
    }
  }
  return found;
}

test('the shipped sheets carry the bottom-clearance contract', () => {
  const map = sheets();
  assert.ok(map.size >= 46, `${map.size} sheets were read; discovery has collapsed`);
  assert.deepEqual(problems(map), []);
});

/* One mutation per part of the contract: the two contexts, the two scopes, the
 * fallback, the ring's room, the kit's end space, the toast offset, and a reader
 * nothing names. A declaration no mutation rejects is a declaration nothing holds. */
const MUTATIONS = [
  ['the clearance declared at the opposite widths',
    ['react/src/AppShell.css', '@media (max-width: 560px) {', '@media (min-width: 560px) {']],
  ['the clearance declared at every width',
    ['react/src/AppShell.css', '@media (max-width: 560px) {', '@media screen {']],
  ['the clearance keyed on the shell, so a one-section page pads for a bar it never draws',
    ['react/src/AppShell.css', ':root:has(.ui-react-app__bottom) { --ui-app-bottom-clearance',
      ':root:has(.ui-react-app) { --ui-app-bottom-clearance']],
  ['the page padding unscoped from the bar, which is the #434 defect itself',
    ['react/src/AppShell.css', ':root:has(.ui-react-app__bottom) .ui-react-app .ui-app__main',
      '.ui-react-app .ui-app__main']],
  ['the 0px fallback dropped from root scroll padding',
    ['react/src/AppShell.css', 'calc(var(--space-5) + var(--ui-app-bottom-clearance, 0px))',
      'calc(var(--space-5) + var(--ui-app-bottom-clearance))']],
  ['the ring\'s room taken out of root scroll padding',
    ['react/src/AppShell.css', 'calc(var(--space-5) + var(--ui-app-bottom-clearance, 0px))',
      'var(--ui-app-bottom-clearance, 0px)']],
  ['the ring\'s room shrunk under the ring',
    ['react/src/AppShell.css', 'calc(var(--space-5) + var(--ui-app-bottom-clearance, 0px))',
      'calc(var(--space-1) + var(--ui-app-bottom-clearance, 0px))']],
  ['the kit\'s phone end space spent, leaving a no-bar page nothing below its last row',
    ['src/styles/layout.css', '.ui-app__main { padding: 28px var(--space-4) 56px; }',
      '.ui-app__main { padding: 28px var(--space-4) 0; }']],
  ['the toast stack sitting on the bar',
    ['react/src/Toast.css', 'calc(var(--space-4) + var(--ui-app-bottom-clearance, 0px))', 'var(--space-4)']],
  ['a reader the contract does not name',
    ['react/src/DataTable.css', '.rx-sortable { user-select: none; }',
      '.rx-sortable { user-select: none; }\n.rx-table-foot { margin-bottom: var(--ui-app-bottom-clearance, 0px); }']],
];

test('the check rejects each part of the contract when it is broken', () => {
  for (const [what, [file, from, to]] of MUTATIONS) {
    const map = sheets();
    const mutated = map.get(file).replace(from, to);
    assert.notEqual(mutated, map.get(file), `the mutation for "${what}" must change ${file}`);
    map.set(file, mutated);
    assert.notEqual(problems(map).length, 0, `${what} must be rejected`);
  }
});

// The spec is the only place a consumer reads the condition from, so it may not drift
// back to the unconditional sentence the token never kept, nor to the bare reservation
// that cost a no-bar page its end space.
test('the specification states the condition the token is declared under', () => {
  const spec = readFileSync(path.join(root, 'docs/specification.md'), 'utf8');
  assert.match(spec, /While the bottom bar is drawn — below 560px, for a list with somewhere to go — the\s+shell sets `--ui-app-bottom-clearance`/);
  assert.match(spec, /`var\(--ui-app-bottom-clearance, 0px\)`/);
  assert.match(spec, /overridden only where the bar is drawn: a shell that draws none keeps the 56px end space/);
  assert.match(spec, /Root scroll padding is set for every phone shell, and adds the ring's own\s+room/);
});

test('every part of the contract has a mutation aimed at it', () => {
  for (const entry of CONTRACT) {
    const aimed = MUTATIONS.filter(([, [file, from]]) => file === entry.file
      && [entry.selector, entry.value].some((text) => text.includes(from) || from.includes(text)));
    assert.notEqual(aimed.length, 0, `no mutation aims at "${entry.what}"`);
  }
});

/* -- The browser half ------------------------------------------------------- *
 *
 * What #434 shipped read correctly and measured wrong: the phone shell's bottom padding
 * was 0, the root's scroll padding `auto`, and a focused Undo ended at 843.953px of an
 * 844px viewport with its band and halo off the screen. No sheet reading finds that.
 *
 * Off unless BOTTOM_CLEARANCE=1, because Playwright is not a dependency and CI drives
 * no browser. Build the React Storybook, then run it by hand and report it in the PR:
 *
 *   npm run build-storybook -w react
 *   UI_PLAYWRIGHT=… UI_CHROME=… BOTTOM_CLEARANCE=1 node --test src/styles/bottom-clearance.test.js
 *
 * Limits: one engine, one width, light only — this is geometry, and the paint is in the
 * captures. `env(safe-area-inset-bottom)` is 0 on a desktop Chromium, so the inset is
 * held by the sheet reading above and not here.
 */
const RUN_BROWSER = process.env.BOTTOM_CLEARANCE === '1';

/** The phone the measurement is taken on: the step the kit draws for, and its height. */
const VIEWPORT = { width: PHONE, height: 844 };

/* The gate's own page, because only one with something to scroll can clip anything.
 * The review of #434 caught this measured on a showcase instead: a block trimmed from
 * that page left it exactly one viewport tall, the mutation kept 242px below the action,
 * and the proof passed under the defect. Both halves below assert the overflow they
 * measure, so a fixture that stops scrolling fails loudly rather than proving nothing. */
const FIXTURE = 'react-appshell--long-page';

/** What one page says about its own end, read where a reader meets it. */
const PROBE = () => {
  const el = document.activeElement;
  const rect = el.getBoundingClientRect();
  const main = document.querySelector('.ui-app__main');
  return {
    focused: (el.textContent || '').trim(),
    gapBelow: innerHeight - rect.bottom,
    bar: Boolean(document.querySelector('.ui-react-app__bottom')),
    endSpace: parseFloat(getComputedStyle(main).paddingBottom),
    scrollPadding: getComputedStyle(document.documentElement).scrollPaddingBottom,
    overflow: document.documentElement.scrollHeight - innerHeight,
    atEnd: Math.abs(document.documentElement.scrollHeight - innerHeight - scrollY) <= 1,
  };
};

/* The two declarations this PR replaced, as a consumer's page carried them before it.
 * Only the first bites at a document's end: `:root { scroll-padding-bottom: auto }` is
 * outranked there by the shipped `:root:has(.ui-react-app)` rule, and scroll padding
 * does not reach a page already scrolled to its last pixel. The clip measured below is
 * the missing end space, which is the half the sheets above cannot see. */
const DEFECT = '@media (max-width: 560px) {'
  + '.ui-react-app .ui-app__main { padding-bottom: var(--ui-app-bottom-clearance, 0px); }'
  + ':root { scroll-padding-bottom: auto; } }';

test('measured in a browser: a phone page ends below the action a reader is on', { skip: !RUN_BROWSER && 'set BOTTOM_CLEARANCE=1' }, async (t) => {
  const { playwright } = await import('../../stories/lib/tap-zone.js');
  const pw = await playwright();
  assert.ok(pw, 'BOTTOM_CLEARANCE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at '
    + 'one — scripts/evidence/README.md has the recipe — or leave the variable unset. A browser gate '
    + 'that quietly skipped would report the same green as one that measured.');
  const built = path.join(root, 'react/storybook-static');
  assert.ok(existsSync(path.join(built, 'iframe.html')),
    `no React Storybook build at ${built} — run: npm run build-storybook -w react`);

  const server = spawn(process.execPath,
    [path.join(root, 'scripts/evidence/serve.mjs'), built, path.join(root, 'scripts/evidence/shot.html')]);
  const port = await new Promise((resolve, reject) => {
    server.stdout.once('data', (chunk) => resolve(Number(String(chunk).trim())));
    server.once('error', reject);
  });
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME || undefined, args: ['--no-sandbox'] });
  t.after(async () => { await browser.close(); server.kill(); });

  const open = async (id) => {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'load' });
    await page.waitForSelector('#storybook-root > *');
    return { ctx, page };
  };

  /* A sheet the page has been handed is not yet the end space the next line measures:
   * the mutation below read the kit's 56px twice off a page that had already taken its
   * 0px, because `addStyleTag` resolves before the page recomputes, and reduced motion
   * is not a settled style. Every read waits for the end space it is taken at, and
   * names the one it found instead. why: the review of #434 */
  const endSpaceSettles = async (page, px) => {
    const endSpace = () => page.evaluate(() =>
      getComputedStyle(document.querySelector('.ui-app__main')).paddingBottom);
    await page.waitForFunction((want) =>
      getComputedStyle(document.querySelector('.ui-app__main')).paddingBottom === want,
    `${px}px`, { timeout: 5000 }).catch(async () => {
      throw new Error(`the page settled on ${await endSpace()} of end space, not the ${px}px `
        + 'this measurement is taken at');
    });
  };

  /** Read the fixture the way a reader meets its end: scrolled there, on the action. */
  const atFixtureEnd = async (page, endSpace) => {
    const action = page.getByRole('button', { name: 'Export activity' });
    await action.waitFor();
    await endSpaceSettles(page, endSpace);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await action.focus();
    return page.evaluate(PROBE);
  };

  const reach = ringReach(sheets().get('src/tokens/tokens.css'));

  // The guarantee, on a page long enough for the end to be somewhere a reader arrives.
  await t.test('a shell with no bottom bar keeps the end space the kit gives it', async () => {
    const { ctx, page } = await open(FIXTURE);
    try {
      const read = await atFixtureEnd(page, 56);
      assert.equal(read.bar, false, 'this story is the no-bar case; it drew a bottom bar');
      assert.equal(read.focused, 'Export activity');
      assert.ok(read.overflow > 0, `the fixture must overflow its ${VIEWPORT.height}px viewport to be scrolled to an end`);
      assert.equal(read.atEnd, true, 'the page was not scrolled to its end');
      assert.equal(read.endSpace, 56, 'the page lost the kit\'s phone end space');
      assert.equal(read.scrollPadding, '20px', 'the root holds no room for the ring');
      assert.ok(read.gapBelow >= reach,
        `the focused action has ${read.gapBelow}px below it and its ring reaches ${reach}px`);
    } finally { await ctx.close(); }
  });

  // The rejection, on the same fixture: the two declarations this PR replaced, put back
  // over the built sheet. The mutation also shortens the page by the end space it takes,
  // so the overflow is asserted again under it — a probe on a page with nothing to
  // scroll measures nothing, which is how this proof passed under the defect. #434
  await t.test('the measurement rejects the padding that clipped the ring', async () => {
    const { ctx, page } = await open(FIXTURE);
    try {
      await page.addStyleTag({ content: DEFECT });
      const read = await atFixtureEnd(page, 0);
      assert.equal(read.endSpace, 0, 'the mutation must take the end space off the page');
      assert.ok(read.overflow > 0, 'the mutation left the fixture with nothing to scroll, so this probe proves nothing');
      assert.equal(read.atEnd, true, 'the page was not scrolled to its end');
      assert.ok(read.gapBelow < reach,
        `the mutation left ${read.gapBelow}px below the focused action, so this probe proves nothing`);
    } finally { await ctx.close(); }
  });

  // The page the finding was filed on, after the keyboard flow that found it. Its length
  // is a showcase's to change, so only the length-free half of the guarantee is read
  // here: no bar, the kit's end space, and the room the root reserves when it scrolls.
  await t.test('the showcase the finding was filed on carries the same clearance', async () => {
    const { ctx, page } = await open('showcases-diff-preview--playground');
    try {
      await page.getByRole('button', { name: 'Apply changes' }).focus();
      await page.keyboard.press('Enter');
      const undo = page.getByRole('button', { name: 'Undo changes' });
      await undo.waitFor();
      await undo.focus();
      const read = await page.evaluate(PROBE);
      assert.equal(read.bar, false, 'this story is the no-bar case; it drew a bottom bar');
      assert.equal(read.focused, 'Undo changes');
      assert.equal(read.endSpace, 56, 'the page lost the kit\'s phone end space');
      assert.equal(read.scrollPadding, '20px', 'the root holds no room for the ring');
      assert.ok(read.gapBelow >= reach,
        `the focused action has ${read.gapBelow}px below it and its ring reaches ${reach}px`);
    } finally { await ctx.close(); }
  });

  // The other answer, on a five-section page: the bar is drawn, and the clearance is
  // what the page pads for.
  await t.test('a shell that draws the bar pads for it', async () => {
    const { ctx, page } = await open('react-appshell--centered');
    try {
      await page.getByRole('button', { name: /^Search or run a command/ }).focus();
      const read = await page.evaluate(PROBE);
      assert.equal(read.bar, true, 'five sections at 390px must draw the bottom bar');
      assert.equal(read.endSpace, 96, 'the page does not pad for the bar it draws');
      assert.equal(read.scrollPadding, '116px', 'root scroll padding is not the clearance plus the ring\'s room');
    } finally { await ctx.close(); }
  });
});
