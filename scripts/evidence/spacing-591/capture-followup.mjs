// Captures the #591 follow-up: the option B page in three wordings, the filters on the view
// strip's row, and the grid frames for the text-edge rule.
//
// Copy storybook/_spacing.js and storybook/Spacing.stories.js into stories/guidelines/, the three
// wording-*/spacing.md files into guidelines/ as spacing.md, spacing-tokens.md and spacing-words.md,
// run `npm run build-storybook`, serve the repository root, then:
//   SPEC_ORIGIN=http://127.0.0.1:6592 AGENT_BROWSER_NAMESPACE=… AB_PROFILE=… node capture-followup.mjs <out-dir>
// Needs agent-browser and Node 22. The 390 specimen frames hold touch emulation on over CDP, so
// (pointer: coarse) matches and the tap floor applies. Every specimen frame is saved with a strip
// beside it that brackets each vertical gap measured in the render; the grid frames draw one guide
// on the column's text edge instead. Limits: one Chromium build; 834 is a fine pointer.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
const out = path.resolve(process.argv[2] || 'spacing-followup');
mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(path.join(os.tmpdir(), 'spacing-591-'));
const origin = process.env.SPEC_ORIGIN || 'http://127.0.0.1:6592';
const profile = process.env.AB_PROFILE;
const ab = async (...args) => (await run('agent-browser', [...(profile ? ['--profile', profile] : []), '--session', process.env.AB_SESSION || 'aui591b', ...args], { maxBuffer: 1 << 24 })).stdout.trim();
const evalJson = async js => JSON.parse(await ab('eval', js));

async function touch(enabled) {
  const ws = new WebSocket(await ab('get', 'cdp-url'));
  let id = 0; const pend = new Map();
  const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  await new Promise(r => { ws.onopen = r; });
  const { result } = await send('Target.getTargets');
  for (const t of result.targetInfos.filter(t => t.type === 'page')) {
    const { result: { sessionId } } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled, maxTouchPoints: enabled ? 5 : 0 }, sessionId);
  }
  // The emulation lasts while this connection is open, so the caller closes it.
  return ws;
}

// -- 1. The wordings, as the real Storybook guideline page --------------------------------
const WORDINGS = [['px', 'pixels', 'light', 1280], ['tokens', 'tokens', 'light', 1280], ['words', 'words', 'light', 1280],
  ['words', 'words', 'dark', 1280], ['words', 'words', 'light', 390]];
for (const [name, story, theme, width] of process.env.SKIP_WORDING ? [] : WORDINGS) {
  await ab('set', 'viewport', String(width), '1000', '2');
  await ab('open', `${origin}/storybook-static/iframe.html?id=guidelines-spacing-draft--${story}&viewMode=story&globals=theme:${theme}`);
  await ab('wait', '--fn', "document.querySelector('.gc') && document.fonts.status === 'loaded'");
  await ab('wait', '800');
  const h = await evalJson('document.documentElement.scrollHeight');
  await ab('set', 'viewport', String(width), String(h), '2');
  await ab('wait', '300');
  // The page's own ground, cropped to the reading column and its padding.
  await ab('screenshot', '.gl-page', path.join(tmp, 'w.png'));
  const box = await evalJson("(() => { const p = document.querySelector('.gl-page').getBoundingClientRect(), c = document.querySelector('.gc').getBoundingClientRect(); return { w: Math.ceil(c.right - p.left + 40), h: Math.ceil(p.height) }; })()");
  await crop(path.join(tmp, 'w.png'), box, path.join(out, `wording-${name}-${theme}-${width}.png`));
}

// Crops a PNG to its top-left w×h CSS px (at scale 2) by drawing it on a page of that size.
async function crop(src, { w, h }, dest) {
  const html = path.join(tmp, 'crop.html');
  writeFileSync(html, `<!doctype html><body style="margin:0;overflow:hidden"><img src="file://${src}" style="display:block;width:auto;zoom:.5">`);
  await ab('set', 'viewport', String(w), String(h), '2');
  await ab('open', `file://${html}`);
  await ab('wait', '--fn', 'document.images[0].complete');
  await ab('screenshot', dest);
}

if (process.env.ONLY_WORDING) { rmSync(tmp, { recursive: true, force: true }); process.exit(0); }

// -- 2 and 3. The specimen: filters on the strip's row, and the grid ----------------------
const MEASURE = `(() => {
  const q = s => document.querySelector(s), r = el => el.getBoundingClientRect();
  const lines = el => { const kids = [...el.children].filter(k => r(k).height > 0 && getComputedStyle(k).position !== 'absolute').sort((a, b) => r(a).top - r(b).top);
    const ls = []; for (const k of kids) { const b = r(k); const cur = ls.find(l => b.top < l.bottom - 0.5 && b.bottom > l.top + 0.5); if (!cur) ls.push({ top: b.top, bottom: b.bottom, kids: [k] }); else { cur.top = Math.min(cur.top, b.top); cur.bottom = Math.max(cur.bottom, b.bottom); cur.kids.push(k); } }
    return ls.sort((a, b) => a.top - b.top); };
  const between = ls => ls.slice(1).map((l, i) => ({ top: ls[i].bottom, bottom: l.top }));
  const g = (label, top, bottom) => ({ label, top, bottom, px: Math.round((bottom - top) * 10) / 10 });
  const h1 = q('.ui-app__main h1'), sub = q('.ui-app__sub'), bar = q('.ui-filter-bar'), seg = q('.ui-seg--underline'),
    row = q('.spec-row'), tbl = q('.ui-table-scroll'), card = q('.ui-card'), ct = q('.ui-card__title'), main = q('.ui-app__main');
  const first = row || (r(bar).top < r(seg).top ? bar : seg);
  const gaps = [g('title to introduction', r(h1).bottom, r(sub).top), g('page head to first block', r(sub).bottom, r(first).top)];
  let side = null;
  if (row) {
    const ls = lines(row);
    if (ls.length > 1) between(ls).forEach(x => gaps.push(g('strip line to filter line', x.top, x.bottom)));
    else side = Math.round((r(bar).left - r(seg).right) * 10) / 10;
  } else gaps.push(g(r(bar).top < r(seg).top ? 'filter row to view strip' : 'view strip to filter row', Math.min(r(bar).bottom, r(seg).bottom), Math.max(r(bar).top, r(seg).top)));
  between(lines(bar)).forEach(x => gaps.push(g('wrapped filter rows', x.top, x.bottom)));
  between(lines(seg)).forEach(x => gaps.push(g('wrapped strip rows', x.top, x.bottom)));
  const above = row ? row : (r(bar).bottom > r(seg).bottom ? bar : seg);
  gaps.push(g('controls to table', r(above).bottom, r(tbl).top), g('section to section', r(tbl).bottom, r(card).top), g('card title to text', r(ct).bottom, r(ct.nextElementSibling).top));
  gaps.sort((a, b) => a.top - b.top);
  const col = r(main).left + parseFloat(getComputedStyle(main).paddingLeft);
  const text = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() && n.parentElement.closest('legend') === null && r(n.parentElement).width > 1 ? 1 : 3 }); const n = w.nextNode(); const k = document.createRange(); k.selectNodeContents(n); const b = k.getBoundingClientRect(); return { x: Math.round((b.left - col) * 10) / 10, y: (b.top + b.bottom) / 2 }; };
  const box = el => ({ x: Math.round((r(el).left - col) * 10) / 10, y: r(el).top + 2 });
  const edges = [
    ['title', text(h1)], ['introduction', text(sub)], ['strip label', text(seg.querySelector('button'))],
    ['chip label', text(bar.querySelector('.ui-dropdown__value'))], ['chip box', box(bar.querySelector('.ui-filter-bar__chip'))],
    ['table first cell', text(tbl.querySelector('th'))], ['table box', box(tbl)], ['card title', text(ct)], ['card box', box(card)],
  ].map(([label, v]) => ({ label, ...v }));
  return { coarse: matchMedia('(pointer: coarse)').matches, bottom: Math.ceil(r(card).bottom + 32), col, side, edges, gaps,
    focus: [...document.querySelectorAll('.spec-list button, .spec-list [tabindex="0"]')].slice(0, 3).map(b => b.textContent.trim() || b.getAttribute('aria-label')) };
})()`;

const FRAMES = [];
for (const theme of ['light', 'dark']) for (const width of [1280, 834]) FRAMES.push({ file: `filters-row-${theme}-${width}`, layout: 'row', theme, width });
for (const theme of ['light', 'dark']) FRAMES.push({ file: `filters-wrap-under-${theme}-390`, layout: 'row', theme, width: 390 }, { file: `filters-wrap-above-${theme}-390`, layout: 'row-above', theme, width: 390 });
for (const width of [1280, 390]) FRAMES.push({ file: `stacked-b-light-${width}`, layout: 'stacked', theme: 'light', width });
for (const width of [1280, 390]) FRAMES.push({ file: `grid-edge-light-${width}`, layout: 'stacked', theme: 'light', width, grid: true }, { file: `grid-row-light-${width}`, layout: 'row', theme: 'light', width, grid: true });

const results = {};
let touching = null;
for (const f of FRAMES.sort((a, b) => (a.width === 390) - (b.width === 390))) {
  if (f.width === 390 && !touching) touching = await touch(true);
  await ab('set', 'viewport', String(f.width), '1600', '2');
  await ab('open', `${origin}/scripts/evidence/spacing-591/specimen.html?option=b&layout=${f.layout}&theme=${f.theme}`);
  await ab('wait', '--fn', "document.documentElement.dataset.ready === '1' && document.fonts.status === 'loaded'");
  await ab('wait', '400');
  const m = await evalJson(MEASURE);
  if ((f.width === 390) !== m.coarse) throw new Error(`${f.file}: pointer is ${m.coarse ? 'coarse' : 'fine'}`);
  await ab('set', 'viewport', String(f.width), String(m.bottom), '2');
  await ab('wait', '200');
  const png = path.join(tmp, `${f.file}.png`);
  await ab('screenshot', png);
  results[f.file] = m;
  f.png = png; f.m = m;
}
if (touching) { (await touch(false)).close(); touching.close(); }

// The page pixels are the plain capture's; the strip and the guide are drawn beside and over it.
function annotated(f) {
  const { m, width, theme } = f, strip = 230, ink = theme === 'dark' ? '#e8e8ee' : '#111', mark = theme === 'dark' ? '#ff6fa8' : '#c2185b';
  const items = f.grid ? m.edges.map(e => ({ y: e.y, text: `${e.x >= 0 ? '+' : ''}${e.x}px ${e.label}`, x: e.x }))
    : m.gaps.map(x => ({ top: x.top, bottom: x.bottom, y: (x.top + x.bottom) / 2, text: `${x.px}px ${x.label}` }));
  items.sort((a, b) => a.y - b.y);
  let last = -Infinity;
  const svg = items.map(it => { const y = Math.max(it.y + 4, last + 15); last = y;
    const mk = f.grid ? '' : `<path d="M8 ${it.top} H18 V${it.bottom} H8" fill="none" stroke="${mark}"/>`;
    return `${mk}<text x="${f.grid ? 10 : 24}" y="${y}" font-size="12" font-family="IBM Plex Sans, sans-serif" fill="${ink}">${it.text}</text>`; }).join('');
  const head = f.grid || m.side === null ? '' : `<text x="10" y="16" font-size="12" font-family="IBM Plex Sans, sans-serif" fill="${ink}">${m.side}px strip to filters, across</text>`;
  const guide = f.grid ? `<svg width="${width}" height="${m.bottom}" style="position:absolute;left:0;top:0"><line x1="${m.col}" x2="${m.col}" y1="0" y2="${m.bottom}" stroke="${mark}"/>${m.edges.map(e => `<line x1="${m.col}" x2="${m.col + e.x}" y1="${e.y}" y2="${e.y}" stroke="${mark}" stroke-dasharray="0"/>`).join('')}</svg>` : '';
  return `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400&display=swap">
<body style="margin:0;background:${theme === 'dark' ? '#16161c' : '#fff'};display:flex"><div style="position:relative"><img src="file://${f.png}" style="display:block;width:${width}px;height:${m.bottom}px">${guide}</div>
<svg width="${strip}" height="${m.bottom}" style="display:block;border-left:1px solid ${theme === 'dark' ? '#333' : '#ddd'}">${head}${svg}</svg></body>`;
}
for (const f of FRAMES) {
  const html = path.join(tmp, `${f.file}.html`);
  writeFileSync(html, annotated(f));
  await ab('set', 'viewport', String(f.width + 231), String(f.m.bottom), '2');
  await ab('open', `file://${html}`);
  await ab('wait', '--fn', "document.images[0].complete && document.fonts.status === 'loaded'");
  await ab('screenshot', path.join(out, `${f.file}.png`));
}
writeFileSync(path.join(out, 'followup-measurements.json'), JSON.stringify(results, null, 2));
rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { side: v.side, gaps: v.gaps.map(g => `${g.px} ${g.label}`), edges: v.edges.map(e => `${e.x} ${e.label}`), focus: v.focus }])), null, 1));
