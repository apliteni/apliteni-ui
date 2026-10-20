// Captures the #591 spacing specimen: four subjects × two themes × 390/834/1280, and one
// annotated frame per subject at 1280 and 390 with each gap drawn as a labelled bracket.
//
// Serve the repository root first, for example `python3 -m http.server 6591`, then:
//   AGENT_BROWSER_NAMESPACE=… AB_PROFILE=… node scripts/evidence/spacing-591/capture.mjs <out-dir>
// Needs agent-browser and Node 22 (global WebSocket). The 390 frames are taken with touch
// emulation held on over CDP, so (pointer: coarse) matches and the kit's tap floor applies,
// as on a phone. agent-browser has no flag for that, so this script holds the session itself.
// Limits: one Chromium build; the 834 frames are fine-pointer, as an iPad with a trackpad.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
const out = path.resolve(process.argv[2] || 'spacing-captures');
mkdirSync(out, { recursive: true });
// The annotation pages are scaffolding, so they go to a temporary folder, not beside the frames.
const tmp = mkdtempSync(path.join(os.tmpdir(), 'spacing-591-'));
const base = process.env.SPEC_BASE || 'http://127.0.0.1:6591/scripts/evidence/spacing-591/';
const profile = process.env.AB_PROFILE;
const ab = async (...args) => (await run('agent-browser', [...(profile ? ['--profile', profile] : []), '--session', process.env.AB_SESSION || 'aui591', ...args], { maxBuffer: 1 << 24 })).stdout.trim();
const evalJson = async js => JSON.parse(await ab('eval', js));

const SUBJECTS = { today: 'today', 'option-a': 'a', 'option-b': 'b', 'option-c': 'c' };
const THEMES = ['light', 'dark'];
const WIDTHS = [1280, 834, 390];

// -- touch emulation, held while the 390 frames are taken -----------------------------
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
  return ws;
}

// Where every gap the options set starts and ends, in page px, read from the render.
const MEASURE = `(() => {
  const q = s => document.querySelector(s), r = el => el.getBoundingClientRect();
  // A line starts where a child begins below every child before it, so a shorter control
  // centred on a line (the clear button beside the chips) is not taken for a line of its own.
  const rows = el => { const kids = [...el.children].filter(k => r(k).height > 0 && getComputedStyle(k).position !== 'absolute').sort((a, b) => r(a).top - r(b).top);
    const lines = []; for (const k of kids) { const b = r(k); const cur = lines.at(-1); if (!cur || b.top >= cur.bottom - 0.5) lines.push({ top: b.top, bottom: b.bottom }); else cur.bottom = Math.max(cur.bottom, b.bottom); }
    return lines.slice(1).map((l, i) => ({ top: lines[i].bottom, bottom: l.top })); };
  const h1 = q('.ui-app__main h1'), sub = q('.ui-app__sub'), bar = q('.ui-filter-bar'), seg = q('.ui-seg--underline'),
    tbl = q('.ui-table-scroll'), card = q('.ui-card'), ct = q('.ui-card__title'), main = q('.ui-app__main');
  const g = (label, top, bottom) => ({ label, top, bottom, px: Math.round((bottom - top) * 10) / 10 });
  const gaps = [g('title to introduction', r(h1).bottom, r(sub).top), g('page head to first block', r(sub).bottom, r(bar).top)];
  rows(bar).forEach(x => gaps.push(g('wrapped filter rows', x.top, x.bottom)));
  gaps.push(g('filter row to view strip', r(bar).bottom, r(seg).top));
  rows(seg).forEach(x => gaps.push(g('wrapped strip rows', x.top, x.bottom)));
  gaps.push(g('view strip to table', r(seg).bottom, r(tbl).top), g('section to section', r(tbl).bottom, r(card).top), g('card title to text', r(ct).bottom, r(ct.nextElementSibling).top));
  const col = r(main).left + parseFloat(getComputedStyle(main).paddingLeft);
  const strip = seg.querySelector('button'), range = document.createRange(); range.selectNodeContents(strip);
  return { coarse: matchMedia('(pointer: coarse)').matches, bottom: Math.ceil(r(card).bottom + 40), right: Math.round(r(card).right), col,
    edges: { title: Math.round(r(h1).left - col), chipText: (() => { const s = bar.querySelector('.ui-dropdown__value'); const k = document.createRange(); k.selectNodeContents(s); return Math.round(k.getBoundingClientRect().left - col); })(), stripText: Math.round(range.getBoundingClientRect().left - col), tableText: (() => { const th = tbl.querySelector('th'); const k = document.createRange(); k.selectNodeContents(th); return Math.round(k.getBoundingClientRect().left - col); })() },
    gaps };
})()`;

async function frame(subject, theme, width) {
  await ab('set', 'viewport', String(width), '1600', '2');
  await ab('open', `${base}specimen.html?option=${SUBJECTS[subject]}&theme=${theme}`);
  await ab('wait', '--load', 'load');
  await ab('wait', '--fn', "document.documentElement.dataset.ready === '1' && document.fonts.status === 'loaded'");
  await ab('wait', '300');
  const m = await evalJson(MEASURE);
  if (width === 390 && !m.coarse) throw new Error('390 frame without a coarse pointer');
  await ab('set', 'viewport', String(width), String(m.bottom), '2');
  await ab('wait', '200');
  const file = path.join(out, `${subject}-${theme}-${width}.png`);
  await ab('screenshot', file);
  return { file, m };
}

// The annotated frame: the plain capture at its CSS size, and a strip beside it with one
// bracket per gap. The page pixels are the plain capture's, so nothing is re-laid-out.
function annotatedPage(png, m, width, subject) {
  const strip = 190;
  const lines = m.gaps.map(({ label, top, bottom, px }) => {
    const mid = (top + bottom) / 2;
    return `<path d="M8 ${top} H18 V${bottom} H8" fill="none" stroke="#c2185b" stroke-width="1"/>`
      + `<text x="24" y="${mid + 4}" font-size="12" font-family="IBM Plex Sans, sans-serif" fill="#111">${px}px ${label}</text>`;
  });
  // Stack labels that would overlap: nudge each one below the previous.
  let last = -Infinity;
  const placed = lines.map((l, i) => { const want = (m.gaps[i].top + m.gaps[i].bottom) / 2 + 4; const y = Math.max(want, last + 14); last = y; return l.replace(/y="[^"]+" font-size/, `y="${y}" font-size`); });
  return `<!doctype html><meta charset="utf-8"><title>${subject} annotated</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400&display=swap">
<body style="margin:0;background:#fff;display:flex"><img src="file://${png}" style="display:block;width:${width}px;height:${m.bottom}px">
<svg width="${strip}" height="${m.bottom}" style="display:block;border-left:1px solid #ddd">${placed.join('')}</svg></body>`;
}

const results = {};
for (const theme of THEMES) for (const subject of Object.keys(SUBJECTS)) for (const width of WIDTHS.filter(w => w !== 390)) {
  const { file, m } = await frame(subject, theme, width);
  results[path.basename(file)] = m;
}
const held = await touch(true);
for (const theme of THEMES) for (const subject of Object.keys(SUBJECTS)) {
  const { file, m } = await frame(subject, theme, 390);
  results[path.basename(file)] = m;
}
await touch(false).then(ws => ws.close());
held.close();
writeFileSync(path.join(out, 'measurements.json'), JSON.stringify(results, null, 2));

for (const subject of Object.keys(SUBJECTS)) for (const width of [1280, 390]) {
  const png = path.join(out, `${subject}-light-${width}.png`), m = results[path.basename(png)];
  const html = path.join(tmp, `annotate-${subject}-${width}.html`);
  writeFileSync(html, annotatedPage(png, m, width, subject));
  await ab('set', 'viewport', String(width + 191), String(m.bottom), '2');
  await ab('open', `file://${html}`);
  await ab('wait', '--fn', "document.images[0].complete && document.fonts.status === 'loaded'");
  await ab('screenshot', path.join(out, `${subject}-annotated-light-${width}.png`));
}
rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { coarse: v.coarse, edges: v.edges, gaps: v.gaps.map(g => `${g.px} ${g.label}`) }])), null, 1));
