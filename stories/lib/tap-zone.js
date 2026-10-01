/* The rig behind stories/tap-zone.test.js: every story's markup, put in front of
 * a real browser at one viewport, and asked where each tap lands.
 *
 * It is here rather than in the gate because the gate is an argument about three
 * numbers and this file is the apparatus that produces them. The apparatus is
 * worth reading on its own: a hit zone is a claim about geometry that no
 * stylesheet reading can settle, and JSDOM — which every other gate in this tree
 * runs on — lays nothing out, so `getBoundingClientRect` there is four zeroes.
 *
 * Nothing is asserted here. The gate next door does the asserting.
 *
 * why: docs/specification.md#a-tap-reaches-the-floor-below-the-phone-step
 */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { installDomGlobals, storyFiles } from './contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The kit's full stylesheet, @imports resolved, because setContent has no server. */
export function kitStylesheet({ without = [] } = {}) {
  const index = readFileSync(path.join(root, 'src/index.css'), 'utf8');
  const parts = [...index.matchAll(/@import\s+["']\.\/([^"']+)["']/g)].map((m) => m[1]);
  return parts
    .filter((rel) => !without.includes(rel))
    .map((rel) => readFileSync(path.join(root, 'src', rel), 'utf8'))
    .join('\n');
}

/**
 * Every story in the tree, rendered to markup.
 *
 * Subjects are discovered, never listed: the same sweep stories/contrast.test.js
 * walks, so a component that gains a story is measured here the day it does. A
 * story that will not render is returned as a problem rather than dropped, which
 * is the rule the a11y and contrast walks already hold — an unmeasured subject is
 * a failure, not a silence.
 */
export async function storySubjects({ theme = 'dark' } = {}) {
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head></head><body></body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  // Several stories build their markup with document.createElement rather than
  // returning a string, so they need a DOM to build in. Same device as the
  // contrast walk.
  installDomGlobals(dom.window);

  const subjects = [];
  const problems = [];
  for (const rel of storyFiles) {
    let mod;
    try {
      mod = await import(path.join(root, 'stories', rel));
    } catch (err) {
      problems.push(`${rel} → import threw: ${err && err.message}`);
      continue;
    }
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      let out;
      try {
        out = render(args, { globals: { theme, accent: 'default' }, args });
      } catch (err) {
        problems.push(`${rel}:${name} → render threw: ${err && err.message}`);
        continue;
      }
      const html = typeof out === 'string' ? out : (out && out.outerHTML) || null;
      if (html == null) {
        problems.push(`${rel}:${name} → render returned ${Object.prototype.toString.call(out)}`);
        continue;
      }
      subjects.push({ id: `${rel}:${name}`, html });
    }
  }
  return { subjects, problems };
}


/**
 * Rows of controls the kit ships that NO story renders on screen — a confirm's
 * two answers, a drawer's footer, an empty state's actions — plus two rows a
 * consumer would write with kit buttons and no help from this sheet.
 *
 * The sweep above is the coverage for everything a story shows. These are the
 * gap in it, and the gap had a defect in it: #488's review measured the
 * confirm's `Keep the workspace` losing a pixel of its own box to
 * `Delete it permanently`, because the dialog is closed in every story and
 * nothing ever looked at it. Each one is built from the kit's own factories at
 * a width where it wraps, so the fixture is the component and not a drawing of
 * it; the two consumer rows are deliberately packed at --space-2, which is
 * where an optimistic default clearance does its damage.
 */
export async function rowFixtures() {
  const kit = await import(path.join(root, 'src/index.js'));
  const { button, confirm, emptyState, snippet, switchToggle, drawer } = kit;
  const row = (id, inner, style = '') =>
    ({ id: `fixture:${id}`, html: `<div style="padding:16px;${style}">${inner}</div>` });
  const two = (a, b) => button({ label: a, variant: 'secondary', size: 'sm' })
    + button({ label: b, variant: 'primary', size: 'sm' });

  return [
    // The kit's own rows, each one opened by this sheet at the phone step.
    // Labels long enough that the two answers wrap onto separate lines at 390,
    // which is the state the review of #488 measured colliding. A confirm with
    // two short answers fits on one line and never showed it.
    row('confirm', confirm({
      id: 'fx-confirm',
      title: 'Delete this workspace?',
      body: 'Everything in it goes with it, and nothing comes back.',
      confirmLabel: 'Delete it permanently',
      cancelLabel: 'Keep the workspace',
      open: true,
    })),
    row('empty-actions', emptyState({
      art: 'inbox',
      title: 'Nothing here yet',
      actions: two('Import a file', 'Add the first one'),
    })),
    row('toolbar', `<div class="ui-toolbar">${two('Filter', 'New report')}`
      + `${button({ label: 'Export', variant: 'secondary', size: 'sm' })}`
      + `${kit.dropdown({ id: 'fx-dd', pre: 'Period', value: 'Last 30 days', items: [{ label: 'Last 30 days' }, { label: 'This quarter' }] })}</div>`),
    row('snippet', snippet({ code: 'npm i @apliteni/apliteni-ui', label: 'Install' })),
    row('drawer', drawer({
      id: 'fx-drawer',
      title: 'Edit the record',
      body: '<p>One record.</p>',
      footer: two('Discard', 'Save the record'),
      open: true,
    })),
    row('card-row', `<div class="ui-card"><div class="ui-card__row">`
      + `<span>Notify on first use</span>${switchToggle({ checked: true, label: 'Notify' })}</div></div>`),

    // And two a consumer would write. Nothing opens these, so nothing may grow
    // into them: the zones have to stay inside the drawn boxes.
    row('packed-row', two('Cancel', 'Continue'), 'display:flex;gap:8px;flex-wrap:wrap'),
    row('packed-stack', two('Cancel', 'Continue'),
      'display:flex;flex-direction:column;align-items:flex-start;gap:8px'),
  ];
}

/**
 * The measurement, run inside the page by page.evaluate, so it closes over
 * nothing and every number it needs arrives as an argument.
 *
 * Three questions per target, all asked of `elementFromPoint` rather than read
 * off the CSS, so overlap, stacking, clipping, `pointer-events` and a scroll
 * container answer for themselves: the control's drawn box, whether the whole
 * `size`x`size` square centred on it is this control's, and which points ON its
 * drawn box belong to somebody else. The third is kept as points rather than a
 * count so the gate can ask whether a control LOST one it used to own.
 *
 * why: docs/specification.md#a-tap-reaches-the-floor-below-the-phone-step
 */
export const PROBE = ({ html, size, interior, families }) => {
  document.body.innerHTML = html;
  // A story's own <script> does not run from innerHTML; nothing here needs one.

  const SELECTOR = [
    'a[href]', 'button', 'input', 'select', 'textarea', 'summary',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]', '[role="tab"]', '[role="menuitem"]', '[role="menuitemradio"]',
    '[role="option"]', '[role="switch"]', '[role="checkbox"]', '[role="radio"]',
    '[role="link"]',
    // The switch's own input is 0x0 and visually hidden; the label is the target.
    '.ui-switch',
  ].join(',');

  const visible = (el) => {
    const c = getComputedStyle(el);
    if (c.display === 'none' || c.visibility === 'hidden') return false;
    if (Number.parseFloat(c.opacity || '1') === 0) return false;
    if (c.pointerEvents === 'none') return false;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    if (el.closest('[hidden], [aria-hidden="true"]')) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  };

  const els = [...document.body.querySelectorAll(SELECTOR)].filter(visible);
  const index = new Map(els.map((el, i) => [el, i]));
  const boxes = els.map((el) => el.getBoundingClientRect());

  /** Which target owns a point — the control a tap there would run. */
  const owner = (x, y) => {
    let el = document.elementFromPoint(x, y);
    while (el && !index.has(el)) el = el.parentElement;
    return el ? index.get(el) : -1;
  };

  // A control inside a control (a button in a menu row, an input in its label)
  // is not a neighbour: activating either runs the outer one, so the outer
  // taking the inner's pixels is the markup working, not a zone misfiring.
  const related = (a, b) => els[a].contains(els[b]) || els[b].contains(els[a]);

  const out = [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    const b = boxes[i];

    // -- floor: the square the rule asks for, centred on the drawn box --------
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const half = size / 2;
    let reachX = Math.min(b.width, size);
    let reachY = Math.min(b.height, size);
    const missing = [];
    const blockers = new Map();
    for (let dy = -half + 0.5; dy < half; dy += 2) {
      for (let dx = -half + 0.5; dx < half; dx += 2) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= window.innerWidth) continue;
        const o = owner(x, y);
        if (o === i) continue;
        missing.push([Math.round(dx), Math.round(dy)]);
        // Which side the square is short on, and who holds it there. Diagnostic
        // only; the gate asserts on the count.
        const side = Math.abs(dx) / (b.width / 2) > Math.abs(dy) / (b.height / 2)
          ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'top' : 'bottom');
        const key = `${side}:${o === -1 ? 'nothing' : (typeof els[o].className === 'string' && els[o].className ? els[o].className.trim().split(/\s+/)[0] : els[o].tagName.toLowerCase())}`;
        blockers.set(key, (blockers.get(key) || 0) + 1);
      }
    }
    // How far the control actually wins outside its own edge, on the two centre
    // lines. Not the pass/fail number — `floorMiss` above is — but the one a
    // reader of the report wants beside a miss.
    const walk = (dx, dy) => {
      let n = 0;
      for (; n < size; n++) {
        const x = dx === 0 ? cx : (dx < 0 ? b.x - 0.5 - n : b.right - 0.5 + n);
        const y = dy === 0 ? cy : (dy < 0 ? b.y - 0.5 - n : b.bottom - 0.5 + n);
        if (x < 0 || y < 0 || x >= window.innerWidth) break;
        if (owner(x, y) !== i) break;
      }
      return n;
    };
    reachX = b.width + walk(-1, 0) + walk(1, 0);
    reachY = b.height + walk(0, -1) + walk(0, 1);

    // -- lost: somebody else on this control's own drawn pixels ---------------
    // Targets whose own drawn box already overlaps this one. Two controls drawn
    // on top of each other is a layout defect that predates any of this — a
    // showcase grid at 390 where a nowrap label overflows its column, a rail
    // that has not folded — and between two controls that already overlap,
    // which one wins a given pixel is undetermined before anybody adds a layer.
    // Losses to such a control are left out rather than counted as damage this
    // sheet did; the limit is stated beside the gate.
    const overlapping = new Set();
    for (let j = 0; j < boxes.length; j++) {
      if (j === i || related(i, j)) continue;
      const o = boxes[j];
      if (o.right > b.left && o.left < b.right && o.bottom > b.top && o.top < b.bottom) overlapping.add(j);
    }

    // Points are packed into one integer each, and never capped: a truncated
    // list of lost points compares two different windows and reports a
    // difference that is the truncation. Who took each one is kept for the
    // first few only, which is all a failure message can use.
    const lost = [];
    const lostTo = [];
    const describe = (j) => (j === -1 ? 'nothing'
      : els[j].tagName.toLowerCase()
        + (typeof els[j].className === 'string' && els[j].className
          ? `.${els[j].className.trim().split(/\s+/).join('.')}` : '')
        + ((els[j].textContent || '').trim()
          ? ` “${(els[j].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32)}”` : ''));
    const ask = (x, y) => {
      if (x < 0 || y < 0 || x >= window.innerWidth) return;
      const o = owner(x, y);
      // -1 — no target at all there — counts as lost. The question this answers
      // is "did the control keep the point", and a point that was already some
      // card's or some track's is not one the control had to give away.
      if (o === i || (o !== -1 && related(i, o))) return;
      if (overlapping.has(o)) return;
      const key = Math.round(x) * 100000 + Math.round(y);
      lost.push(key);
      if (lostTo.length < 8) lostTo.push([key, describe(o)]);
    };
    // Pixel CENTRES on the integer grid, never offsets from the box's own edge:
    // a tap lands on a pixel, and a box whose edge falls at 249.56 would
    // otherwise be sampled at 249.06 — half inside a pixel the browser's own
    // hit test resolves at 1/64 of one, which flaps between runs that differ
    // nowhere else.
    const x0 = Math.floor(b.x) + 0.5 < b.x ? Math.ceil(b.x) + 0.5 : Math.floor(b.x) + 0.5;
    const y0 = Math.floor(b.y) + 0.5 < b.y ? Math.ceil(b.y) + 0.5 : Math.floor(b.y) + 0.5;
    const x1 = Math.ceil(b.right) - 0.5 > b.right ? Math.floor(b.right) - 0.5 : Math.ceil(b.right) - 0.5;
    const y1 = Math.ceil(b.bottom) - 0.5 > b.bottom ? Math.floor(b.bottom) - 0.5 : Math.ceil(b.bottom) - 0.5;
    for (let x = x0; x <= x1; x += 1) { ask(x, y0); ask(x, y1); }
    for (let y = y0; y <= y1; y += 1) { ask(x0, y); ask(x1, y); }
    for (let y = y0; y <= y1; y += interior) {
      for (let x = x0; x <= x1; x += interior) ask(x, y);
    }

    out.push({
      tag: el.tagName.toLowerCase(),
      cls: typeof el.className === 'string' ? el.className : '',
      // Which of the sheet's carrier selectors this target is, asked of the
      // element rather than guessed from its class text — `.ui-seg button`
      // names a control that carries no class of its own.
      fam: (families || []).filter((sel) => { try { return el.matches(sel); } catch { return false; } }),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32),
      drawn: [Math.round(b.width * 100) / 100, Math.round(b.height * 100) / 100],
      reach: [Math.round(reachX * 100) / 100, Math.round(reachY * 100) / 100],
      floorMiss: missing.length,
      blockers: [...blockers].sort((a, b2) => b2[1] - a[1]).slice(0, 4),
      box: [Math.round(b.x), Math.round(b.y)],
      lost,
      lostTo,
    });
  }
  return out;
};

/**
 * One pass: one browser context at one viewport and one pointer kind, every
 * subject measured in it.
 *
 * `coarse` is Playwright's `hasTouch`, which is what moves Chromium's
 * `(pointer: coarse)` and `(hover: none)` — checked by the gate before it
 * believes a pass, because a rig that quietly ran as a mouse would report the
 * kit untouched and call that a green.
 */
export async function pass(browser, { subjects, css, width, coarse, size, interior = 8, families = [] }) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    hasTouch: coarse,
    reducedMotion: 'reduce',
  });
  try {
    const page = await ctx.newPage();
    await page.setContent(
      '<!doctype html><html lang="en" data-theme="dark"><head><style>'
      + 'html,body{margin:0;padding:0}' + css
      + '</style></head><body></body></html>',
    );
    const media = await page.evaluate(() => ({
      coarse: matchMedia('(pointer: coarse)').matches,
      hover: matchMedia('(hover: hover)').matches,
      width: window.innerWidth,
    }));
    const rows = [];
    for (const s of subjects) {
      // The viewport has to hold the whole story before anything is asked of
      // it: elementFromPoint answers about the VIEWPORT, and returns null below
      // the fold. Measured with a fixed 900px box, every control on the lower
      // half of a long story reported a reach of exactly its drawn size and no
      // owner at all — a rig artefact that reads identically to a layer that
      // was never applied.
      const height = await page.evaluate((html) => {
        document.body.innerHTML = html;
        return Math.min(Math.max(document.documentElement.scrollHeight, 900), 6000);
      }, s.html);
      if (height !== page.viewportSize().height) {
        await page.setViewportSize({ width, height });
      }
      const targets = await page.evaluate(PROBE, { html: s.html, size, interior, families });
      if (targets.length) rows.push({ story: s.id, targets, height });
    }
    return { media, rows };
  } finally {
    await ctx.close();
  }
}

/** Playwright, or null when this host has none. Never a dependency; see AGENTS.md. */
export async function playwright() {
  try {
    return await import(process.env.UI_PLAYWRIGHT || 'playwright');
  } catch {
    return null;
  }
}

/** Every target in a pass, flattened, with the story it came from. */
export const flatten = (rows) =>
  rows.flatMap((r) => r.targets.map((t) => ({ ...t, story: r.story })));

/** A one-line name for a target, for a failure message somebody has to act on. */
export const name = (t) =>
  `${t.tag}${t.cls ? `.${t.cls.trim().split(/\s+/).join('.')}` : ''}`
  + `${t.text ? ` “${t.text}”` : ''}`;
