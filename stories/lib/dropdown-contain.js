/* The rig behind stories/dropdown-contain.test.js: every dropdown the kit draws,
 * put in front of a real browser at four widths and both themes, and asked where
 * its panel's two inline edges land — shut, and again with each trigger open.
 * Nothing is asserted here; the gate next door does the asserting.
 * why: docs/components.md#the-dropdown-panel
 */
import path from 'node:path';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// The same discovery the tap-zone and contrast walks use, asked rather than
// copied: a component that gains a story is measured here the day it does.
import { storySubjects, playwright } from './tap-zone.js';

export { storySubjects, playwright };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* The widths #572 names, plus 320. 1280 is not a passenger: a 240px panel does not
 * shrink with the view, so a trigger at the end of a wide row has as little room to
 * its right as one on a phone. */
export const WIDTHS = [320, 375, 390, 1280];
export const THEMES = ['dark', 'light'];

/** How far outside the view a measurement is allowed to read: the fit works in
 *  fractional CSS pixels, and a rect's own rounding is below this. */
export const SLACK = 0.5;

/* The page the vanilla subjects are injected into, served out of the checkout so
 * `/src/index.js` resolves to the working tree. Storybook's own build is not needed
 * for this half: a vanilla story IS its markup. */
export const VANILLA_PAGE = path.join(root, 'stories/lib/dropdown-contain.html');

/** A static server over one root, with our page at /__shot. Mirrors the evidence
 *  scripts' own helper. */
export const serve = (serveRoot, page) => new Promise((resolve, reject) => {
  const proc = spawn(process.execPath, [path.join(root, 'scripts/evidence/serve.mjs'), serveRoot, page]);
  proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
  proc.stderr.on('data', (d) => process.stderr.write(d));
  proc.once('error', reject);
});

/* The mutations, each of which has to be caught by the measurement. `translate` is
 * where the in-place fit writes its answer, so refusing it is the state #572
 * reported: `left: 0` and `.is-end`'s `right: 0`, mirrored and unmeasured. */
export const TRANSLATE_OFF = '[data-dropdown-panel] { translate: none !important; }';
/* And the portal's half, which is arithmetic rather than a rule: the panel is
 * placed in viewport coordinates by positionPortalPanel(). This puts the
 * unclamped placement back — the trigger's own edge, mirrored for `.is-end` —
 * after every open, which is exactly what the branch replaced. */
export const PORTAL_MIRROR = `(() => {
  const mirror = () => {
    for (const p of document.querySelectorAll('[data-dropdown-panel][data-dropdown-portal]')) {
      const dd = p.__ddOwner;
      const t = dd && dd.querySelector('[data-dropdown-trigger]');
      if (!t || !dd.classList.contains('open')) continue;
      const box = t.getBoundingClientRect();
      if (p.classList.contains('is-end')) {
        p.style.left = 'auto';
        p.style.right = (window.innerWidth - box.right) + 'px';
      } else {
        p.style.right = 'auto';
        p.style.left = box.left + 'px';
      }
    }
  };
  window.__ddMirror = mirror;
})()`;

/**
 * The measurement, as it runs in the page: one call per subject, with the opens
 * driven from inside it rather than from the test, which would cost a round trip
 * per trigger and measure the same numbers.
 *
 * `added` is the panels' OWN contribution to the page's scrollable width, taken by
 * measuring with them and then without them. The page's total says nothing: a
 * story may put a wide table on a phone screen, and that overflow is not a panel's.
 */
export const MEASURE = `async (subject) => {
  // One painted frame. React flushes a click's own update at the end of the task
  // the click was dispatched in, so a rect read in that same task is the rect from
  // before it — every React trigger read as a trigger that opened nothing.
  const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  const el = document.documentElement;
  const sweep = () => [...document.querySelectorAll('[data-dropdown-panel]')]
    // A filter row bounds its own panels to the row, which is already inside the
    // view: not this gate's subject, and #549's gate measures them.
    .filter((p) => {
      const dd = p.__ddOwner || p.closest('.ui-dropdown');
      return !p.closest('.ui-filter-bar') && !(dd && dd.closest('.ui-filter-bar'));
    });
  const read = (p) => {
    const dd = p.__ddOwner || p.closest('.ui-dropdown');
    const box = p.getBoundingClientRect();
    return {
      left: Math.round(box.left * 10) / 10,
      right: Math.round(box.right * 10) / 10,
      width: Math.round(box.width * 10) / 10,
      shift: p.style.translate || '',
      end: p.classList.contains('is-end'),
      portal: p.classList.contains('ui-dropdown__panel--portal'),
      open: !!(dd && dd.classList.contains('open')) || p.classList.contains('is-open'),
      name: (p.getAttribute('aria-label') || p.getAttribute('role') || 'panel')
        + ' · ' + (dd && dd.querySelector('[data-dropdown-trigger]')
          ? dd.querySelector('[data-dropdown-trigger]').textContent.trim().slice(0, 24) : '?'),
    };
  };
  // What the panels add to the page's scrollable width, and nothing else's doing.
  const overflow = () => {
    const panels = sweep();
    const withThem = el.scrollWidth;
    const was = panels.map((p) => p.style.display);
    panels.forEach((p) => { p.style.display = 'none'; });
    const without = el.scrollWidth;
    panels.forEach((p, i) => { p.style.display = was[i]; });
    return { view: el.clientWidth, withThem, without, added: withThem - without };
  };

  const out = { subject, view: el.clientWidth, shut: sweep().map(read), opens: [], flow: overflow() };
  const triggers = [...document.querySelectorAll('[data-dropdown-trigger]')]
    .filter((t) => !t.closest('.ui-filter-bar') && !t.disabled);
  for (const t of triggers) {
    const dd = t.closest('[data-dropdown], .ui-dropdown');
    // A story may render its panel already open — several do, which is the state
    // worth looking at — and a click on that trigger is a close. Start from shut.
    if (dd && dd.classList.contains('open')) { t.click(); await frame(); }
    t.click();
    await frame();
    if (window.__ddMirror) window.__ddMirror();
    const open = sweep().map(read).filter((p) => p.open);
    /* Whether THIS trigger's panel opened, not how many are open: opening one
       closes every other, so counting them would read a swap as a silence. A
       trigger whose click opens nothing is reported rather than skipped — a panel
       nobody opened is inside the view the way an empty page is. */
    out.opens.push({
      opened: dd && dd.classList.contains('open') ? 1 : 0,
      trigger: t.textContent.trim().slice(0, 24),
      panels: open,
    });
    document.body.click();
    await frame();
  }
  return out;
}`;

/** The kit's own stylesheet list, for the page to load one <link> per sheet. */
export const sheets = () => {
  const index = readFileSync(path.join(root, 'src/index.css'), 'utf8');
  return [...index.matchAll(/@import\s+["']\.\/([^"']+)["']/g)].map((m) => m[1]);
};

/** Every vanilla story's markup, measured in one live page per width and theme: the
 *  markup is injected and the kit's own `wireDropdown()` is called on it, which is
 *  where an in-place panel is fitted. Returns `{ rows, problems }`, the shape the
 *  React half returns: a subject whose markup holds a panel and whose measurement
 *  finds none is named rather than dropped, so a pass that comes back a row short
 *  says which story it was. */
export async function vanillaPass(browser, port, { width, theme, subjects, mutation = null, script = null }) {
  const ctx = await browser.newContext({ viewport: { width, height: 760 } });
  const page = await ctx.newPage();
  if (script) await page.addInitScript(script);
  await page.goto(`http://127.0.0.1:${port}/__shot`);
  await page.waitForFunction('window.kit && window.kit.wireDropdown');
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  if (mutation) await page.addStyleTag({ content: mutation });
  const rows = [];
  const problems = [];
  for (const s of subjects) {
    const has = await page.evaluate((html) => {
      // A fresh page per subject, portalled leftovers included: a panel moved onto
      // the body outlives the markup that owned it.
      document.body.innerHTML = '';
      document.querySelectorAll('body > [data-dropdown-panel]').forEach((p) => p.remove());
      const host = document.createElement('div');
      host.innerHTML = html;
      document.body.appendChild(host);
      return !!document.querySelector('[data-dropdown-panel]:not(.ui-filter-bar *)');
    }, s.html);
    if (!has) continue;
    await page.evaluate(() => {
      window.kit.wireDropdown(document);
      // The topbar's switcher and account menu are the same wiring in bespoke
      // clothes, and they carry the same hooks. why: docs/components.md#the-dropdown-panel
      if (window.kit.wireTopbar) document.querySelectorAll('.ui-topbar').forEach((el) => window.kit.wireTopbar(el));
    });
    const row = await page.evaluate(`(${MEASURE})(${JSON.stringify(s.id)})`);
    if (row.shut.length) rows.push({ ...row, half: 'vanilla', width, theme });
    else problems.push(`${s.id} at ${width}/${theme} → a panel in the markup and none to measure`);
  }
  await ctx.close();
  return { rows, problems };
}

/** Every story in a built Storybook index, as { id, label }. */
export const indexed = (dir) => Object.values(
  JSON.parse(readFileSync(path.join(dir, 'index.json'), 'utf8')).entries,
)
  .filter((entry) => entry.type === 'story')
  .map((entry) => ({ id: entry.id, label: `${entry.title} > ${entry.name}` }));

/* Storybook's own report that a story has arrived, which is NOT what the body class
 * says: `sb-show-main` is added while `sb-show-preparing-story` is still on the
 * body, the phase is still `rendering` and the story root is still empty, so a
 * panel looked for then is looked for in a page the story has not reached. Waiting
 * on a panel instead is what this cannot do — most of this index has no dropdown,
 * and a whole timeout each is twenty minutes over 168 stories — and nor on the
 * root's children, which `React/Toast > Tones` leaves empty by rendering into a
 * portal. The phases this preview reports, in order: preparing, rendering,
 * completing, afterEach, finished, with errored and aborted terminal too.
 * why: #572 */
export const STORY_DONE = 'finished';
export const STORY_FAILED = ['errored', 'aborted'];

/** How long one story is given to reach a terminal phase, and how many times one
 *  that does not is navigated to again. A retry costs about a second; accepting a
 *  story that never rendered costs that subject out of every pass, silently. */
export const STORY_MS = 20000;
export const STORY_TRIES = 3;

/** Opens one story and waits for its render to reach a terminal phase, navigating
 *  again if it does not. Returns what the preview finally reported: the phase, and
 *  the id it says it rendered — which the caller compares with the id it asked
 *  for, so a page left showing the story before it cannot pass for this one. */
export async function openStory(page, story, {
  port, theme, tries = STORY_TRIES, ms = STORY_MS,
}) {
  let last = { phase: 'the preview reported no render at all', id: null, tries: 0 };
  for (let i = 1; i <= tries; i += 1) {
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);
    try {
      await page.waitForFunction(
        (ends) => {
          const r = window.__STORYBOOK_PREVIEW__ && window.__STORYBOOK_PREVIEW__.currentRender;
          return !!r && ends.includes(r.phase);
        },
        [STORY_DONE, ...STORY_FAILED],
        { timeout: ms },
      );
      last = {
        ...await page.evaluate(() => ({
          phase: window.__STORYBOOK_PREVIEW__.currentRender.phase,
          id: window.__STORYBOOK_PREVIEW__.currentRender.id,
        })),
        tries: i,
      };
    } catch {
      last = { phase: `no terminal phase inside ${ms}ms`, id: null, tries: i };
    }
    if (last.phase === STORY_DONE && last.id === story.id) return last;
  }
  return last;
}

/** The React half, which has to be a built Storybook rather than injected markup:
 *  React's fit is an effect, so it only exists where React is running.
 *
 *  Discovery and measurement are the same walk under different expectations. While
 *  `discovering`, a story with no panel in it is the answer — most of this index
 *  has no dropdown — and only a story that never rendered is a problem. Afterwards
 *  every id is a subject discovery already found, so one that comes back without a
 *  panel is a subject this walk LOST, and it is named here rather than left to
 *  surface as a count short of its floor. */
export async function reactPass(browser, port, {
  width, theme, ids, mutation = null, discovering = false,
}) {
  const ctx = await browser.newContext({ viewport: { width, height: 760 } });
  const page = await ctx.newPage();
  const rows = [];
  const problems = [];
  const at = `${width}/${theme}`;
  for (const story of ids) {
    const got = await openStory(page, story, { port, theme });
    if (got.phase !== STORY_DONE || got.id !== story.id) {
      problems.push(`${story.label} (${story.id}) at ${at} → ${got.phase}`
        + (got.id && got.id !== story.id ? `, with ${got.id} on the page` : '')
        + `, after ${got.tries} ${got.tries === 1 ? 'try' : 'tries'}`);
      continue;
    }
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((done) => {
      requestAnimationFrame(() => requestAnimationFrame(done));
    }));
    if (!await page.evaluate(() => !!document.querySelector('[data-dropdown-panel]'))) {
      if (!discovering) problems.push(`${story.label} at ${at} → rendered, and no panel on the page`);
      continue;
    }
    if (mutation) await page.addStyleTag({ content: mutation });
    const row = await page.evaluate(`(${MEASURE})(${JSON.stringify(story.label)})`);
    if (row.shut.length) rows.push({ ...row, half: 'react', width, theme });
    else if (!discovering) {
      problems.push(`${story.label} at ${at} → a panel on the page and none of it to measure`);
    }
  }
  await ctx.close();
  return { rows, problems };
}

/** Every panel in a pass, flattened, with the case it came from. */
export const panels = (rows) => rows.flatMap((r) => [
  ...r.shut.map((p) => ({ ...p, state: 'shut', subject: r.subject, half: r.half, width: r.width, theme: r.theme, view: r.view })),
  ...r.opens.flatMap((o) => o.panels.map((p) => ({ ...p, state: 'open', subject: r.subject, half: r.half, width: r.width, theme: r.theme, view: r.view }))),
]);

/** The panels that are not inside the view they are laid out in. */
export const outside = (list) => list.filter((p) => p.left < -SLACK || p.right > p.view + SLACK);

/** A line a reader can act on. */
export const where = (p) => `${p.half} ${p.width}/${p.theme} ${p.state} “${p.subject}” ${p.name}`
  + ` → left ${p.left}, right ${p.right} of ${p.view}`;

/* -- The moves no size reports ------------------------------------------------
 * Five cases the sweep above cannot reach, because it reads a settled page: a
 * trigger moved by its row, one carried by an ancestor's sideways scroll, a row
 * longer than the screen, a sibling text node that grows, and a trigger slid by a
 * transition. Fixtures rather than discovered subjects — the sweep owns discovery,
 * and a flex row cannot be asked to reorder itself — but the React half moves a
 * SHIPPED story, so a rename fails this gate rather than shrinking it.
 * why: docs/components.md#the-dropdown-panel */

/** A fabricated filename, long enough that no placement can hold the panel its row
 *  asks for: 508px in the vanilla layer and 548px in React, on a 390px screen. */
export const LONG_LABEL = 'Invoice_2026_September_Consolidated_International_Operations_Export.csv';

/* The width bound's two declarations, refused separately: each answers for one
 * placement and neither covers the other. The bound holds a portalled panel, whose
 * room is the whole view; the wrap holds an in-place one, whose room is its
 * trigger's block, and keeps the token inside the panel's own box. Refused, the
 * first takes the full 390px of a 390px screen and the second widens the page to
 * 497px. why: docs/components.md#the-dropdown-panel */
export const CEILING_OFF = '[data-dropdown-panel] { max-width: none !important; }';
export const WRAP_OFF = '[data-dropdown-panel] { overflow-wrap: normal !important; }';

/** The mutation observer taken away: then nothing reports a move that resizes
 *  nothing, and the row-reorder case has to fail. */
export const NO_MUTATION_OBSERVER = `window.MutationObserver = class {
  observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
};`;

/** And scroll taken away, for the case a scroll is the only thing that moved. */
export const NO_SCROLL_LISTENER = `(() => {
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, ...rest) {
    if (type === 'scroll') return undefined;
    return add.call(this, type, ...rest);
  };
})()`;

/** The observation of TEXT changes dropped, and nothing else: then a sibling text
 *  node that grows moves the trigger with no record either layer reads. Dropped
 *  only from an observation that asks for something else as well, because an
 *  observation left asking for nothing throws. */
export const NO_CHARACTER_DATA = `(() => {
  const observe = MutationObserver.prototype.observe;
  MutationObserver.prototype.observe = function (target, options) {
    const opts = options && (options.childList || options.attributes)
      ? { ...options, characterData: false, characterDataOldValue: false }
      : options;
    return observe.call(this, target, opts);
  };
})()`;

/** The motion end events refused, which is the only report of where a transition
 *  left the trigger. The settle fallback is still armed, so the arm that uses this
 *  gives the motion longer than that timer waits: then neither mechanism reads the
 *  final position, which is the state the review measured. */
export const NO_MOTION_END = `(() => {
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, ...rest) {
    if (type === 'transitionend' || type === 'animationend') return undefined;
    return add.call(this, type, ...rest);
  };
})()`;

/** The sibling text node's grown length, in characters of 10px monospace: enough
 *  to carry a 240px panel off a 390px screen while every observed box keeps its
 *  size. The review's own number. */
export const GROWN_TEXT = 39;

/** How long the slid trigger's motion lasts, and how long a reading waits for it.
 *  The wait is the motion and then some, because this case is about where the
 *  motion STOPS: a reading taken mid-transition would measure a frame the rule
 *  does not claim. */
export const MOTION_MS = 200;
export const motionWait = (ms) => ms + 500;

/** One reading of the panel under test, in the page. Called as source, the way
 *  MEASURE is: a string handed to page.evaluate() is an EXPRESSION, so passing the
 *  function alone returns the function and every number reads `undefined`. */
export const READ = `() => {
  const p = document.querySelector('[data-dropdown-panel]');
  const box = p.getBoundingClientRect();
  const r = (n) => Math.round(n * 10) / 10;
  return {
    left: r(box.left), right: r(box.right), width: r(box.width),
    view: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    /* The bound the SHEET declares, computed from the view and the keep-out rather
       than read off max-width: a mutation that takes max-width away would otherwise
       raise the bar it is being measured against and pass. */
    bound: r(document.documentElement.clientWidth
      - 2 * (parseFloat(getComputedStyle(p).getPropertyValue('--ui-dropdown-edge')) || 0)),
    portal: p.classList.contains('ui-dropdown__panel--portal'),
  };
}`;

const settle = (page) => page.evaluate(() => new Promise((done) => {
  requestAnimationFrame(() => requestAnimationFrame(done));
}));

/** The kit's settle timer, read out of the kit so there is one number rather than a
 *  copy of it here: a transition starting anywhere in the page arms it, and a fired
 *  one re-fits every panel. */
export const settleMs = () => {
  const src = readFileSync(path.join(root, 'src/components/dropdown.js'), 'utf8');
  const found = src.match(/DD_SETTLE_MS\s*=\s*(\d+)/);
  if (!found) {
    throw new Error('no DD_SETTLE_MS in src/components/dropdown.js. The fixtures below wait that '
      + 'timer out before they move anything, and a wait taken from a stale copy of the number '
      + 'would put the race back.');
  }
  return Number(found[1]);
};

/** Opens a trigger with no pointer in the page. `locator.click()` moves the mouse
 *  onto the trigger and LEAVES it there, and every case below then moves that
 *  trigger out from under it: the trigger loses `:hover`, its `border-color`
 *  transition runs, and the kit re-fits every panel when that transition ends. That
 *  re-fit is a second answer to the move, arriving 60–100ms after it, so a reading
 *  taken before it measures the move and one taken after measures the re-fit —
 *  which is why the arm refusing the text-change observation caught nothing on a
 *  loaded host and caught it on an idle one. A synthetic click never gives the page
 *  a pointer to lose, which is what the discovery sweep next door has always done.
 *  why: AGENTS.md */
const openTrigger = (page, which = 0) => page.evaluate(
  (i) => { document.querySelectorAll('[data-dropdown-trigger]')[i].click(); },
  which,
);

/** Waits until the page has finished answering whatever happened last: nothing
 *  animating, and the kit's settle timer fired and cleared. Each case below changes
 *  one thing and reads the panel, and the kit answers a move through several
 *  mechanisms — a transition still running or a timer still pending is a second
 *  answer arriving after the change, which makes the reading a race rather than a
 *  measurement. Its cost is one settle per move, which is what a repeatable arm is
 *  worth here. */
const quiet = async (page) => {
  await page.waitForFunction(
    () => document.getAnimations().every((a) => a.playState === 'finished'),
    null,
    { timeout: 5000 },
  );
  await page.waitForTimeout(motionWait(settleMs()));
};

/** The five cases in the vanilla layer, each injected into /__shot and wired by
 *  the kit itself. Returns one row per reading. */
export async function vanillaEdgeCases(browser, port, {
  width = 390, theme = 'light', mutation = null, script = null, motionMs = MOTION_MS,
} = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 600 } });
  const page = await ctx.newPage();
  if (script) await page.addInitScript(script);
  await page.goto(`http://127.0.0.1:${port}/__shot`);
  await page.waitForFunction('window.kit && window.kit.wireDropdown');
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  if (mutation) await page.addStyleTag({ content: mutation });
  const rows = [];
  const reading = async (name, state) => {
    rows.push({ case: name, state, half: 'vanilla', ...await page.evaluate(`(${READ})()`) });
  };

  // 1. A row that reorders itself under an open panel, and is left that way.
  await page.evaluate((long) => {
    document.body.innerHTML = `<div id="row" style="display:flex;justify-content:flex-start;`
      + `align-items:center;width:100%">${window.kit.dropdown({
        value: 'Period', variant: 'menu', ariaLabel: 'Period', align: 'end',
        items: [{ label: 'Settings' }, { label: 'Billing' }],
      })}</div>`;
    window.kit.wireDropdown(document);
    window.__long = long;
  }, LONG_LABEL);
  await openTrigger(page);
  await settle(page);
  await quiet(page);
  await reading('a row that reorders', 'open');
  await page.evaluate(() => { document.querySelector('#row').style.justifyContent = 'flex-end'; });
  await settle(page);
  await reading('a row that reorders', 'open, moved');
  await page.keyboard.press('Escape');
  await settle(page);
  await reading('a row that reorders', 'shut after the move');

  // 2. An ancestor scrolled sideways, carrying the trigger with it.
  await page.evaluate(() => {
    document.body.innerHTML = `<div id="scroller" style="width:100%;height:300px;overflow:auto">`
      + `<div style="width:800px;padding-left:260px">${window.kit.dropdown({
        value: 'Period', variant: 'menu', ariaLabel: 'Period',
        items: [{ label: 'Settings' }, { label: 'Billing' }],
      })}</div></div>`;
    window.kit.wireDropdown(document);
  });
  await openTrigger(page);
  await settle(page);
  await quiet(page);
  await reading('an ancestor scrolled sideways', 'open');
  await page.evaluate(() => { document.querySelector('#scroller').scrollLeft = 250; });
  await settle(page);
  await reading('an ancestor scrolled sideways', 'open, scrolled');
  /* And shut, with the scroll put back where it started. The close fitted the
     panel where the trigger then was, and scrolling back moves it again with
     nothing open: a shut panel is laid out, so that is the page's width. The
     vanilla half answered only the open panel on a scroll and left this one at
     258…498 of 390; React has always answered both. */
  await page.keyboard.press('Escape');
  await settle(page);
  await quiet(page);
  await page.evaluate(() => { document.querySelector('#scroller').scrollLeft = 0; });
  await settle(page);
  await reading('an ancestor scrolled sideways', 'shut, scrolled back');

  /* 3. A row whose own label is longer than the screen, in both placements: an
        in-place panel is bounded by the room beside its offsets and a portalled one
        has the whole view for that, so the two are bounded by different halves of
        the rule and each needs measuring. */
  for (const portal of [false, true]) {
    await page.evaluate((isPortal) => {
      document.querySelectorAll('body > [data-dropdown-panel]').forEach((p) => p.remove());
      document.body.innerHTML = window.kit.dropdown({
        value: 'Export', variant: 'menu', ariaLabel: 'Export', portal: isPortal,
        items: [{ label: window.__long }, { label: 'Billing' }],
      });
      window.kit.wireDropdown(document);
    }, portal);
    await settle(page);
    const where = portal ? 'portalled' : 'in place';
    await reading('a label longer than the screen', `${where}, shut`);
    await openTrigger(page);
    await settle(page);
    await reading('a label longer than the screen', `${where}, open`);
  }

  /* 4. A sibling TEXT NODE that grows under an open panel. Nothing the fit reads
        changes size — not the trigger, not the panel — and no child list and no
        attribute changes either: the row re-lays itself out around a longer text
        run, and the only record of it is the text node's own. */
  await page.evaluate(() => {
    document.querySelectorAll('body > [data-dropdown-panel]').forEach((p) => p.remove());
    document.body.innerHTML = '<div id="row" style="display:flex;align-items:center;width:100%">'
      + '<span id="grow" style="white-space:pre;font-family:monospace;font-size:10px">a</span>'
      + window.kit.dropdown({
        value: 'Period', variant: 'menu', ariaLabel: 'Period',
        items: [{ label: 'Settings' }, { label: 'Billing' }],
      })
      + '</div>';
    window.kit.wireDropdown(document);
  });
  await openTrigger(page);
  await settle(page);
  await quiet(page);
  await reading('a sibling text node that grows', 'open');
  await page.evaluate((n) => { document.querySelector('#grow').firstChild.data = 'a'.repeat(n); }, GROWN_TEXT);
  await settle(page);
  await reading('a sibling text node that grows', 'open, text grown');

  /* 5. A trigger slid by a transition, read where the motion STOPS. The style
        write that starts it is a mutation measured in the frame it lands, when the
        trigger has not moved yet, so the first reading is already correct and the
        second is the one that can be stale — for good, not for the length of the
        transition. */
  await page.evaluate((ms) => {
    document.body.innerHTML = '<div id="row" style="display:block;width:100%">'
      + window.kit.dropdown({
        value: 'Period', variant: 'menu', ariaLabel: 'Period',
        items: [{ label: 'Settings' }, { label: 'Billing' }],
      })
      + '</div>';
    window.kit.wireDropdown(document);
    document.querySelector('.ui-dropdown').style.transition = `transform ${ms}ms linear`;
  }, motionMs);
  await openTrigger(page);
  await settle(page);
  await quiet(page);
  await reading('a trigger slid by a transition', 'open');
  await page.evaluate(() => {
    document.querySelector('.ui-dropdown').style.transform = 'translateX(220px)';
  });
  await page.waitForTimeout(motionWait(motionMs));
  await reading('a trigger slid by a transition', 'open, motion settled');

  await ctx.close();
  return rows;
}

/** The same five in React, against a shipped story. The row is the story's own
 *  `Ends`; the scroller is wrapped around the Storybook root, which React does not
 *  own; the long label replaces the text of a rendered row, which is how the review
 *  isolated intrinsic sizing from any width rule; and the last two leave the first
 *  menu alone in that row and then move it. */
export async function reactEdgeCases(browser, port, {
  story, width = 390, theme = 'light', mutation = null, script = null, motionMs = MOTION_MS,
} = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 600 } });
  const page = await ctx.newPage();
  if (script) await page.addInitScript(script);
  const rows = [];
  const reading = async (name, state) => {
    rows.push({ case: name, state, half: 'react', ...await page.evaluate(`(${READ})()`) });
  };
  // The same readiness the sweep waits on, and for the same reason: `sb-show-main`
  // is on the body before the story has committed, so a fixture that started work
  // there would start it in an empty page. A story that will not render is named
  // here rather than left to surface as a reading short of its count.
  const open = async () => {
    const got = await openStory(page, { id: story }, { port, theme });
    if (got.phase !== STORY_DONE || got.id !== story) {
      throw new Error(`the React fixture story ${story} did not render: ${got.phase}`
        + (got.id && got.id !== story ? `, with ${got.id} on the page` : '')
        + `, after ${got.tries} ${got.tries === 1 ? 'try' : 'tries'}`);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-dropdown-panel]').first().waitFor({ state: 'attached' });
    if (mutation) await page.addStyleTag({ content: mutation });
    await settle(page);
  };

  // 1. The story's own flex row, told to hold its children at the other end.
  await open();
  await openTrigger(page);
  await settle(page);
  await quiet(page);
  await reading('a row that reorders', 'open');
  await page.evaluate(() => {
    const dd = document.querySelector('.ui-dropdown');
    dd.parentElement.style.justifyContent = 'flex-end';
  });
  await settle(page);
  await reading('a row that reorders', 'open, moved');
  await page.keyboard.press('Escape');
  await settle(page);
  await reading('a row that reorders', 'shut after the move');

  // 2. A scroller around the root React renders into, rather than inside it.
  await open();
  await page.evaluate(() => {
    const root = document.querySelector('#storybook-root') || document.body.firstElementChild;
    const scroller = document.createElement('div');
    scroller.id = 'scroller';
    scroller.setAttribute('style', 'width:100%;height:300px;overflow:auto');
    root.parentElement.insertBefore(scroller, root);
    scroller.appendChild(root);
    root.setAttribute('style', 'width:800px;padding-left:260px');
  });
  await openTrigger(page);
  await settle(page);
  await quiet(page);
  await reading('an ancestor scrolled sideways', 'open');
  await page.evaluate(() => { document.querySelector('#scroller').scrollLeft = 250; });
  await settle(page);
  await reading('an ancestor scrolled sideways', 'open, scrolled');
  // And shut, scrolled back to where it started: the state only a shut panel's own
  // refit answers, and the one the two layers used to answer differently.
  await page.keyboard.press('Escape');
  await settle(page);
  await quiet(page);
  await page.evaluate(() => { document.querySelector('#scroller').scrollLeft = 0; });
  await settle(page);
  await reading('an ancestor scrolled sideways', 'shut, scrolled back');

  // 3. One rendered row's text, replaced.
  await open();
  await page.evaluate((long) => {
    document.querySelector('[data-dropdown-panel] [data-dd-item]').textContent = long;
  }, LONG_LABEL);
  await settle(page);
  await reading('a label longer than the screen', 'shut');
  await openTrigger(page);
  await settle(page);
  await reading('a label longer than the screen', 'open');

  /* 4. A sibling TEXT NODE that grows in the story's own row. The span goes in
        before the panel opens, so the only change under the open panel is the text
        node's own data: no child list, no attribute, and not one box the fit reads
        changes size. */
  await open();
  await page.evaluate(() => {
    const dd = document.querySelector('.ui-dropdown');
    const row = dd.parentElement;
    [...row.children].filter((el) => el !== dd).forEach((el) => el.remove());
    row.setAttribute('style', 'display:flex;align-items:center;width:100%');
    const span = document.createElement('span');
    span.setAttribute('style', 'white-space:pre;font-family:monospace;font-size:10px');
    span.append(document.createTextNode('a'));
    row.insertBefore(span, dd);
    window.__grow = span.firstChild;
  });
  await openTrigger(page);
  await settle(page);
  await quiet(page);
  await reading('a sibling text node that grows', 'open');
  await page.evaluate((n) => { window.__grow.data = 'a'.repeat(n); }, GROWN_TEXT);
  await settle(page);
  await reading('a sibling text node that grows', 'open, text grown');

  /* 5. A menu slid by a transition, read where the motion stops. Alone in its row,
        so the slide is the only thing that moves it, and the row's SECOND menu
        rather than its first: that one hangs from its trigger's start, so a shift
        left over from any earlier reading walks it off the end of the view, where
        an end-aligned panel would have walked back towards the middle. */
  await open();
  await page.evaluate((ms) => {
    const menus = document.querySelectorAll('.ui-dropdown');
    const dd = menus[1] || menus[0];
    const row = dd.parentElement;
    [...row.children].filter((el) => el !== dd).forEach((el) => el.remove());
    row.setAttribute('style', 'display:block;width:100%');
    dd.style.transition = `transform ${ms}ms linear`;
  }, motionMs);
  await openTrigger(page);
  await settle(page);
  await quiet(page);
  await reading('a trigger slid by a transition', 'open');
  await page.evaluate(() => {
    document.querySelector('.ui-dropdown').style.transform = 'translateX(220px)';
  });
  await page.waitForTimeout(motionWait(motionMs));
  await reading('a trigger slid by a transition', 'open, motion settled');

  await ctx.close();
  return rows;
}

/** A reading that broke the rule: outside the view, wider than the bound the sheet
 *  declares, or widening the page. A SHUT portalled panel is not held to the bound's
 *  position — it has not been placed yet, and `position: fixed` keeps it out of
 *  every page's scrollable width — but it is still held to the width. */
export const broken = (list) => list.filter((r) => r.left < -SLACK
  || r.right > r.view + SLACK
  || r.width > r.bound + SLACK
  || r.scrollWidth > r.view + SLACK);

/** A line a reader can act on. */
export const whereCase = (r) => `${r.half} “${r.case}” ${r.state}`
  + ` → ${r.left}…${r.right} of ${r.view}, width ${r.width} of ${r.bound}, page ${r.scrollWidth}`;
