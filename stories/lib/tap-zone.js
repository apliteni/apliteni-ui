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
 * why: docs/foundations.md#a-tap-reaches-the-floor-below-the-phone-step
 */
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { markup, liveMarkup } from './react-markup.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The kit's full stylesheet, @imports resolved, because setContent has no server. */
export function kitStylesheet({ without = [] } = {}) {
  const index = readFileSync(path.join(root, 'src/index.css'), 'utf8');
  const parts = [...index.matchAll(/@import\s+["']\.\/([^"']+)["']/g)].map((m) => m[1]);
  const kit = parts
    .filter((rel) => !without.includes(rel))
    .map((rel) => readFileSync(path.join(root, 'src', rel), 'utf8'))
    .join('\n');
  // The React bundle's own component sheets (Modal, DatePicker, …) — the rx-*
  // geometry the kit's index.css never had. Its re-emitted copies of the kit's
  // src/styles sheets are dropped: the kit read each already, and a second copy
  // would defeat the `without` strip and the mutation tests that edit one copy.
  const react = readFileSync(path.join(root, 'react/dist/index.css'), 'utf8');
  const kept = react
    .split(/^(?=\/\* (?:\.\.\/src\/styles|src)\/[^/]+\.css \*\/$)/m)
    .filter((part) => /^\/\* src\/[^/]+\.css \*\/$/.test(part.trimStart().split('\n')[0]))
    .join('');
  return `${kit}\n${kept}`;
}

export async function storySubjects({ theme = 'dark' } = {}) {
  const built = path.join(root, 'storybook-static');
  const iframe = path.join(built, 'iframe.html');
  const problems = [];
  if (!existsSync(iframe)) {
    problems.push('storybook-static/iframe.html is not built: run `npm run build-storybook` first');
    return { subjects: [], problems };
  }
  const pw = await playwright();
  if (!pw) {
    problems.push('no Playwright could be resolved — point UI_PLAYWRIGHT at one');
    return { subjects: [], problems };
  }
  const index = JSON.parse(readFileSync(path.join(built, 'index.json'), 'utf8'));
  // Every served story. The Foundations and Guidelines reading pages draw kit
  // parts too — and the Drawers and Accessibility minimums pages hold the tap-zone
  // specimens the gate must measure — so they are subjects, not documentation to
  // skip. The React components, the Components pages and the apps-* showcases are
  // the rest of it.
  const ids = Object.entries(index.entries)
    .map(([id]) => id)
    .sort();

  const serve = spawn(process.execPath, [
    path.join(root, 'scripts/evidence/serve.mjs'), built, iframe,
  ], { stdio: ['ignore', 'pipe', 'inherit'] });
  const port = await new Promise((resolve, reject) => {
    serve.stdout.once('data', (d) => resolve(Number(String(d).trim())));
    serve.once('error', reject);
  });

  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const subjects = [];
  try {
    for (const id of ids) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      try {
        await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`, { waitUntil: 'load' });
        // A story draws into #storybook-root, or — a Toast, a Modal, a Drawer — a
        // portal lands in <body> and the root stays empty. Wait for either, so a
        // portal story is not read as one that rendered nothing. Storybook's own
        // chrome carries `sb-` classes or a `storybook*` id and is never the story.
        await page.waitForFunction(() => {
          const chrome = (el) => (el.id || '').startsWith('storybook')
            || /(^|\s)sb-/.test(typeof el.className === 'string' ? el.className : '');
          const root = document.getElementById('storybook-root');
          if (root && root.childElementCount > 0) return true;
          for (const el of document.body.children) {
            if (el === root || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
            if (!chrome(el)) return true;
          }
          return false;
        }, { timeout: 10000 });
        // Effects that push content into a portal run after the first paint; wait one
        // frame so the capture holds what the reader sees, not the pre-effect DOM.
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        const html = await page.evaluate(() => {
          const chrome = (el) => (el.id || '').startsWith('storybook')
            || /(^|\s)sb-/.test(typeof el.className === 'string' ? el.className : '');
          const root = document.getElementById('storybook-root');
          const parts = [root ? root.innerHTML : ''];
          for (const el of document.body.children) {
            if (el === root || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
            if (chrome(el)) continue;
            parts.push(el.outerHTML);
          }
          return parts.join('');
        });
        if (html.trim()) subjects.push({ id, html });
        else problems.push(`${id} → rendered nothing`);
      } catch (err) {
        problems.push(`${id} → render threw: ${err && err.message}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    serve.kill();
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
  const row = (id, html, style = '') =>
    ({ id: `fixture:${id}`, html: `<div style="padding:16px;${style}">${html}</div>` });
  const btn = (label, variant, size, more = {}) =>
    `<button type="button" class="ui-btn ui-btn--${variant} ui-btn--${size}"${more.iconOnly ? ' aria-label="' + label + '"' : ''}>${more.iconOnly ? '' : '<span class="ui-btn__label-slot"><span class="ui-btn__label">' + label + '</span></span>'}</button>`;

  // The kit's own rows, each one opened by this sheet at the phone step. The
  // React components render them, mounted where a portal lands in <body>.
  const confirm = await liveMarkup(({ h, kit }) => h(kit.Confirm, {
    open: true, title: 'Delete this workspace?', body: 'Everything in it goes with it, and nothing comes back.',
    confirmLabel: 'Delete it permanently', cancelLabel: 'Keep the workspace', onConfirm() {}, onCancel() {},
  }));
  const empty = await markup(({ h, kit }) => h(kit.EmptyState, {
    title: 'Nothing here yet',
    actions: [
      h(kit.Button, { key: 'import', variant: 'secondary', size: 'sm', children: 'Import a file' }),
      h(kit.Button, { key: 'add', variant: 'primary', size: 'sm', children: 'Add the first one' }),
    ],
  }));
  const toolbar = await markup(({ h, kit }) => h('div', { className: 'ui-toolbar' },
    h(kit.Button, { variant: 'secondary', size: 'sm', children: 'Filter' }),
    h(kit.Button, { variant: 'primary', size: 'sm', children: 'New report' }),
    h(kit.Button, { variant: 'secondary', size: 'sm', children: 'Export' }),
    h(kit.Dropdown, { pre: 'Period', value: 'Last 30 days', items: [{ label: 'Last 30 days' }, { label: 'This quarter' }] })));
  const snippet = await markup(({ h, kit }) => h(kit.Snippet, { code: 'npm i @apliteni/apliteni-ui', label: 'Install' }));
  const drawer = await liveMarkup(({ h, kit }) => h(kit.Drawer, { open: true, title: 'Edit the record', onClose() {},
    footer: [
      h(kit.Button, { key: 'discard', variant: 'secondary', size: 'sm', children: 'Discard' }),
      h(kit.Button, { key: 'save', variant: 'primary', size: 'sm', children: 'Save the record' }),
    ],
  }, h('p', null, 'One record.')));
  const cardRow = await markup(({ h, kit }) => h('div', { className: 'ui-card' },
    h('div', { className: 'ui-card__row' },
      h('span', null, 'Notify on first use'),
      h(kit.Switch, { checked: true, label: 'Notify' }))));
  // Two icon-only tools in one Card title row: 4px apart, two 44px layers met
  // inside the first button's box (#736).
  const cardTools = await markup(({ h, kit }) => h(kit.Card, { title: 'Cash in and out', tools: [
    h(kit.Button, { key: 'export', variant: 'ghost', size: 'sm', iconOnly: true, icon: 'download', 'aria-label': 'Export' }),
    h(kit.Button, { key: 'more', variant: 'ghost', size: 'sm', iconOnly: true, icon: 'moreHorizontal', 'aria-label': 'More actions' }),
  ] }));

  return [
    row('confirm', confirm),
    row('empty-actions', empty),
    row('toolbar', toolbar),
    row('snippet', snippet),
    row('drawer', drawer),
    row('card-row', cardRow),
    row('card-tools', cardTools),

    // The pair #488 names: a dense table's row actions, a labelled button
    // against an icon-only one in the same cell. Written out, because no story
    // puts both in one cell.
    row('table-actions', `<table class="ui-table"><tbody>`
      + [1, 2].map((n) => `<tr><td>Row ${n}</td><td class="ui-table__act">`
        + `${btn('Revoke', 'danger', 'sm')}`
        + `${btn('More actions', 'ghost', 'xs', { iconOnly: true })}`
        + `</td></tr>`).join('')
      + `</tbody></table>`),

    // A selectable table in each density (#619).
    ...['', ' ui-table--dense', ' ui-table--compact'].map((density) => row(
      `selectable${density.replace(' ui-table--', '-') || '-default'}`,
      `<table class="ui-table ui-table--hover${density}"><thead><tr>`
      + `<th scope="col" class="ui-table__selection"><input type="checkbox" aria-label="Select all"></th>`
      + `<th scope="col">Name</th><th scope="col" class="ui-table__num">Amount</th></tr></thead><tbody>`
      + ['Aster Systems', 'Birch Energy', 'Cedar Foods', 'Dune Retail'].map((n, i) => `<tr>`
        + `<td class="ui-table__selection"><input type="checkbox" aria-label="Select ${n}"></td>`
        + `<td>${n}</td><td class="ui-table__num">${(i + 1) * 120}</td></tr>`).join('')
      + `</tbody></table>`)),

    // Two a consumer would write. Nothing opens these, so nothing may grow
    // into them: the zones have to stay inside the drawn boxes.
    row('packed-row', `${btn('Cancel', 'secondary', 'sm')}${btn('Continue', 'primary', 'sm')}`,
      'display:flex;gap:8px;flex-wrap:wrap'),
    row('packed-stack', `${btn('Cancel', 'secondary', 'sm')}${btn('Continue', 'primary', 'sm')}`,
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
 * why: docs/foundations.md#a-tap-reaches-the-floor-below-the-phone-step
 */
export const PROBE = ({ html, size, interior, families, within }) => {
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
    // A side the viewport edge stopped is marked: its reach is a lower bound,
    // and the shrink check reads it as one.
    const edges = [];
    const walk = (dx, dy) => {
      let n = 0;
      for (; n < size; n++) {
        const x = dx === 0 ? cx : (dx < 0 ? b.x - 0.5 - n : b.right - 0.5 + n);
        const y = dy === 0 ? cy : (dy < 0 ? b.y - 0.5 - n : b.bottom - 0.5 + n);
        if (x < 0 || y < 0 || x >= window.innerWidth) { edges.push(true); return n; }
        if (owner(x, y) !== i) break;
      }
      edges.push(false);
      return n;
    };
    const sides = [walk(-1, 0), walk(1, 0), walk(0, -1), walk(0, 1)];
    reachX = b.width + sides[0] + sides[1];
    reachY = b.height + sides[2] + sides[3];

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
    // The one pixel two boxes' own edges meet inside. Chromium awards it to one side by
    // rounding, which answers the same with this sheet off and flips with the sub-pixel
    // offset a panel happens to land on — so a neighbour whose own DRAWN box reaches into
    // that same pixel is not read as having overreached there. A layer reaching from a box
    // that does not share the pixel is, however small the reach: that is the fractional-edge
    // collision a whole-pixel sampling hid. #496, #518
    const cuts = (lo, hi, p) => (lo > p && lo < p + 1) || (hi > p && hi < p + 1);
    const over = (lo, hi, p) => hi > p && lo < p + 1;
    const shared = (j, x, y) => {
      if (j < 0) return false;
      const px = Math.floor(x);
      const py = Math.floor(y);
      // Only a pixel this control itself does not wholly cover can be a shared one.
      if (!cuts(b.x, b.right, px) && !cuts(b.y, b.bottom, py)) return false;
      const o = boxes[j];
      return over(o.left, o.right, px) && over(o.top, o.bottom, py);
    };
    const ask = (x, y) => {
      if (x < 0 || y < 0 || x >= window.innerWidth) return;
      const o = owner(x, y);
      // -1 — no target at all there — counts as lost. The question this answers
      // is "did the control keep the point", and a point that was already some
      // card's or some track's is not one the control had to give away.
      if (o === i || (o !== -1 && related(i, o))) return;
      if (overlapping.has(o)) return;
      if (shared(o, x, y)) return;
      const key = Math.round(x) * 100000 + Math.round(y);
      lost.push(key);
      // One entry per DISTINCT thief, and never a slot spent on `nothing`.
      // Capping by first-seen point instead hid a real collision behind eight
      // points of empty card: the gate reads this list, not `lost`.
      if (o === -1) return;
      const who = describe(o);
      if (lostTo.length < 8 && !lostTo.some(([, w]) => w === who)) lostTo.push([key, who]);
    };
    // Pixel CENTRES on the integer grid, never offsets from the box's own edge:
    // a tap lands on a pixel, and a box whose edge falls at 249.56 would
    // otherwise be sampled at 249.06 — half inside a pixel the browser's own
    // hit test resolves at 1/64 of one, which flaps between runs that differ
    // nowhere else.
    //
    // Every pixel centre the box holds, including one in a pixel it only partly
    // covers: a point 0.3px inside a fractional edge is a point a tap lands on,
    // and ownership of it changing is the defect this reads. Reading only the
    // wholly covered pixels hid a layer reaching 8.2px into the box next door.
    // The one pixel two abutting boxes share is answered by shared() below
    // instead, which asks WHO took the point rather than dropping the point.
    // #496, #518
    const centres = (lo, hi) => {
      const first = Math.floor(lo) + 0.5 < lo ? Math.ceil(lo) + 0.5 : Math.floor(lo) + 0.5;
      const last = Math.ceil(hi) - 0.5 > hi ? Math.floor(hi) - 0.5 : Math.ceil(hi) - 0.5;
      // A box covering no whole pixel is sampled at its centre: an unsampled
      // target reads exactly like a clean one.
      return first <= last ? [first, last] : [(lo + hi) / 2, (lo + hi) / 2];
    };
    const [x0, x1] = centres(b.x, b.right);
    const [y0, y1] = centres(b.y, b.bottom);
    for (let x = x0; x <= x1; x += 1) { ask(x, y0); ask(x, y1); }
    for (let y = y0; y <= y1; y += 1) { ask(x0, y); ask(x1, y); }
    for (let y = y0; y <= y1; y += interior) {
      for (let x = x0; x <= x1; x += interior) ask(x, y);
    }

    // -- stolen: a point nearer this control than the one that took it ---------
    // The drawn pixels above ask whether a control kept its own box. This asks the other
    // half of "an overlay must not reach its neighbours": walking out from each edge along
    // the centre lines, a point closer to this control's box than to the box of the control
    // that owns it was this control's to keep. Two layers that overlap each give the other
    // the pixels nearest its box, and a tap there runs the wrong row. A point on a box
    // drawn against this one is distance zero from it, so abutting rows never read here.
    const gapTo = (r, x, y) => Math.hypot(
      Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
    const stolen = [];
    for (const side of ['top', 'bottom', 'left', 'right']) {
      for (let n = 0.5; n < size; n += 1) {
        const x = side === 'left' ? b.x - n : side === 'right' ? b.right + n : cx;
        const y = side === 'top' ? b.y - n : side === 'bottom' ? b.bottom + n : cy;
        if (x < 0 || y < 0 || x >= window.innerWidth) break;
        const o = owner(x, y);
        if (o === i || o === -1 || related(i, o) || overlapping.has(o)) continue;
        if (n < gapTo(boxes[o], x, y) - 0.5) {
          stolen.push(`${side} ${n}px: ${describe(o)}`);
          break;
        }
      }
    }

    out.push({
      tag: el.tagName.toLowerCase(),
      cls: typeof el.className === 'string' ? el.className : '',
      // Which of the sheet's carrier selectors this target is, asked of the
      // element rather than guessed from its class text — `.ui-seg button`
      // names a control that carries no class of its own.
      fam: (families || []).filter((sel) => { try { return el.matches(sel); } catch { return false; } }),
      // Which opened containers this target sits inside, so the gate can ask
      // whether an opening bought anything at all.
      within: (within || []).filter((sel) => { try { return el.closest(sel); } catch { return false; } }),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32),
      drawn: [Math.round(b.width * 100) / 100, Math.round(b.height * 100) / 100],
      reach: [Math.round(reachX * 100) / 100, Math.round(reachY * 100) / 100],
      sides,
      edges,
      floorMiss: missing.length,
      blockers: [...blockers].sort((a, b2) => b2[1] - a[1]).slice(0, 4),
      box: [Math.round(b.x), Math.round(b.y)],
      lost,
      lostTo,
      stolen,
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
export async function pass(browser, { subjects, css, width, coarse, size, interior = 8, families = [], within = [] }) {
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
      const targets = await page.evaluate(PROBE, { html: s.html, size, interior, families, within });
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

/**
 * Whether target `b` reaches less than `a`, the same target without the sheet,
 * with half a pixel of slack. An edge-stopped side measures a lower bound. So
 * where the viewport edge stopped `b`, that side loses nothing to `a`. Where it
 * stopped only `a`, `b` must still reach what `a` measured. Limit: a loss past
 * the edge of `a` is not seen.
 */
export const shrinks = (b, a, size) => {
  const side = (k) => (b.edges[k] ? Math.max(b.sides[k], a.sides[k]) : b.sides[k]);
  const axis = (k) => b.drawn[k / 2] + side(k) + side(k + 1) - (a.drawn[k / 2] + a.sides[k] + a.sides[k + 1]);
  return [0, 2].some((k) => axis(k) < -0.5);
};

/** A one-line name for a target, for a failure message somebody has to act on. */
export const name = (t) =>
  `${t.tag}${t.cls ? `.${t.cls.trim().split(/\s+/).join('.')}` : ''}`
  + `${t.text ? ` “${t.text}”` : ''}`;
