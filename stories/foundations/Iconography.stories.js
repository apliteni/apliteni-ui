import { icon, iconCategories, iconNames } from '../../src/assets/icons.js';
import { segmented } from '../../src/components/index.js';

export default {
  title: 'Foundations/Iconography',
  parameters: { layout: 'fullscreen' },
};

const STYLE = `
  .ic-wrap { padding: 40px 44px 90px; max-width: 1000px; margin: 0 auto; --ic-size: 24px; }
  .ic-head h1 { font: 700 30px/1.1 Poppins; color: var(--strong); letter-spacing: -.02em; margin-bottom: 6px; }
  .ic-head p { color: var(--dim); margin-bottom: 20px; max-width: 60ch; line-height: 1.55; }
  .ic-head code { font-family: var(--font-mono); font-size: .9em; color: var(--text); }
  .ic-controls { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  .ic-search { flex: 1; min-width: 220px; height: 40px; padding: 0 15px; border-radius: 12px;
    border: 1px solid var(--surface-2); background: var(--surface); color: var(--text); font: inherit; font-size: 14px; }
  .ic-search:focus { outline: none; border-color: var(--accent); }
  .ic-cat { margin-top: 34px; }
  .ic-cat__h { font: 600 12px/1 Poppins; letter-spacing: .12em; text-transform: uppercase; color: var(--muted);
    margin-bottom: 14px; display: flex; align-items: center; gap: 9px; }
  .ic-cat__n { color: var(--dim); font-weight: 500; }
  .ic-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 12px; }
  .ic-tile { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 8px 13px;
    background: var(--surface); border: 1px solid transparent; border-radius: 14px; cursor: pointer; font: inherit;
    position: relative; transition: border-color .15s, background .15s, transform .1s; }
  .ic-tile:hover { border-color: var(--accent); background: var(--surface-2); }
  .ic-tile:active { transform: translateY(1px); }
  .ic-tile:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .ic-glyph { color: var(--accent); display: grid; place-items: center; height: 28px; }
  .ic-glyph svg { width: var(--ic-size); height: var(--ic-size); }
  .ic-name { font-family: var(--font-mono); font-size: 11.5px; color: var(--muted); text-align: center; word-break: break-word; }
  .ic-copied { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 14px;
    background: var(--surface-2); color: var(--green); font-size: 12px; font-weight: 600; opacity: 0; pointer-events: none; transition: opacity .12s; }
  .ic-tile.is-copied .ic-copied { opacity: 1; }
  .ic-empty { color: var(--dim); padding: 34px 2px; }
`;

const tile = (n) => `<button class="ic-tile" type="button" data-ic-name="${n}" title="Copy icon('${n}')">
  <span class="ic-glyph">${icon(n)}</span>
  <code class="ic-name">${n}</code>
  <span class="ic-copied">Copied ✓</span>
</button>`;

const section = (c) => `<section class="ic-cat" data-ic-cat>
  <h2 class="ic-cat__h">${c.name} <span class="ic-cat__n">${c.names.length}</span></h2>
  <div class="ic-grid">${c.names.map(tile).join('')}</div>
</section>`;

function wire(root) {
  const wrap = root.querySelector('.ic-wrap');
  const search = root.querySelector('.ic-search');
  const cats = [...root.querySelectorAll('[data-ic-cat]')];
  const empty = root.querySelector('.ic-empty');

  // Live size control (16 / 20 / 24) — dogfoods segmented(). The pressed state,
  // the active class and the roving tabindex belong to wireTopbar(); this only
  // owns the side effect, so the story can't drift from the kit's own wiring.
  root.querySelectorAll('[data-seg="icsize"] button').forEach((b) => b.addEventListener('click', () => {
    wrap.style.setProperty('--ic-size', `${b.dataset.value}px`);
  }));

  // Search filter — hides non-matching tiles and empty categories.
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let anyShown = false;
    cats.forEach((cat) => {
      let shown = 0;
      cat.querySelectorAll('.ic-tile').forEach((t) => {
        const hit = !q || t.dataset.icName.toLowerCase().includes(q);
        t.hidden = !hit;
        if (hit) shown += 1;
      });
      cat.hidden = shown === 0;
      if (shown) anyShown = true;
    });
    empty.hidden = anyShown;
    empty.querySelector('b').textContent = q;
  });

  // Click a tile to copy its call. Clipboard may be blocked inside the preview
  // iframe — flash "Copied" either way so the interaction always reads.
  root.querySelectorAll('.ic-tile').forEach((t) => t.addEventListener('click', () => {
    const snippet = `icon('${t.dataset.icName}')`;
    if (navigator.clipboard) navigator.clipboard.writeText(snippet).catch(() => {});
    t.classList.add('is-copied');
    clearTimeout(t._copyTimer);
    t._copyTimer = setTimeout(() => t.classList.remove('is-copied'), 900);
  }));
}

export const Set = {
  render: () => {
    const root = document.createElement('div');
    root.innerHTML = `<style>${STYLE}</style>
      <div class="ic-wrap">
        <div class="ic-head">
          <h1>Iconography</h1>
          <p>One line set — 24×24, 1.7 stroke, <code>currentColor</code>. Feather / Lucide house style,
             shipped as inline SVG. Call <code>icon('name')</code>; click any glyph to copy that call.</p>
          <div class="ic-controls">
            <input class="ic-search" type="search" placeholder="Search ${iconNames.length} icons…" aria-label="Search icons">
            ${segmented({ name: 'icsize', options: ['16', '20', '24'], active: 2, size: 'sm', ariaLabel: 'Icon size' })}
          </div>
        </div>
        <div class="ic-empty" hidden>No icons match “<b></b>”.</div>
        ${iconCategories.map(section).join('')}
      </div>`;
    requestAnimationFrame(() => wire(root));
    return root;
  },
};
