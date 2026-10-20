// Today's gaps in a kit story, read in the browser: every stacked sibling pair under the page column, every wrapped flex row, and each control's inset from the column edge. Paste into a page's console or pass to agent-browser eval. Used for the #591 measured table.
(() => {
  const main = document.querySelector('.ui-app__main');
  if (!main) return {error: 'no main'};
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.position !== 'absolute' && cs.position !== 'fixed'; };
  const name = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,3).join('.') : '') + (el.getAttribute('role') ? `[${el.getAttribute('role')}]` : '');
  const mr = main.getBoundingClientRect(), mcs = getComputedStyle(main);
  const colLeft = mr.left + parseFloat(mcs.paddingLeft);
  const out = { width: innerWidth, colLeft: +colLeft.toFixed(1), mainPad: mcs.padding, gaps: [], rows: [], insets: [] };
  const walk = (el, depth) => {
    if (depth > 6) return;
    const kids = [...el.children].filter(vis);
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i-1].getBoundingClientRect(), b = kids[i].getBoundingClientRect();
      if (b.top >= a.bottom - 0.5) out.gaps.push({ parent: name(el), a: name(kids[i-1]), b: name(kids[i]), gap: +(b.top - a.bottom).toFixed(1), depth });
    }
    const cs = getComputedStyle(el);
    if (cs.flexWrap === 'wrap' && kids.length > 1) {
      const tops = [...new Set(kids.map(k => Math.round(k.getBoundingClientRect().top)))].sort((x,y)=>x-y);
      if (tops.length > 1) {
        const rowsB = tops.map(t => Math.max(...kids.filter(k => Math.round(k.getBoundingClientRect().top) === t).map(k => k.getBoundingClientRect().bottom)));
        out.rows.push({ el: name(el), rows: tops.length, rowGap: cs.rowGap, measured: tops.slice(1).map((t,i)=> +(t - rowsB[i]).toFixed(1)) });
      }
    }
    kids.filter(k => !/^(TABLE|SVG)$/i.test(k.tagName)).forEach(k => walk(k, depth + 1));
  };
  walk(main, 0);
  // horizontal inset of controls from column edge
  main.querySelectorAll('.ui-seg, .ui-filter-bar, .ui-toolbar, .ui-table-scroll, .ui-card, h1, h2, .ui-app__sub').forEach(el => {
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    let text = null;
    const first = el.querySelector('button, th, .ui-dropdown__trigger') ;
    if (first) { const range = document.createRange(); const tn = [...first.querySelectorAll('*'), first].flatMap(n => [...n.childNodes]).find(n => n.nodeType === 3 && n.textContent.trim()); if (tn) { range.selectNodeContents(tn); text = +(range.getBoundingClientRect().left - colLeft).toFixed(1); } }
    out.insets.push({ el: name(el), boxLeft: +(r.left - colLeft).toFixed(1), firstText: text, top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1) });
  });
  return out;
})()
