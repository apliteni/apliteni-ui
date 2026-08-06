// Tabs — an accessible tablist + panels, as a framework-agnostic HTML string.
// Render with tabs(), then wire behaviour once after mount with initTabs().
//
//   root.innerHTML = tabs({
//     name: 'account', active: 0, ariaLabel: 'Account sections',
//     items: [
//       { label: 'Overview',  panel: '<p>…</p>' },
//       { label: 'Activity',  panel: '<p>…</p>' },
//       { label: 'Settings',  panel: '<p>…</p>' },
//     ],
//   });
//   initTabs(root);
//
// Follows the WAI-ARIA tabs pattern: roving tabindex, ArrowLeft/Right + Home/End,
// aria-selected, and aria-controls / aria-labelledby wiring. `name` must be unique
// per tabs instance on a page (it seeds the tab/panel ids).

export function tabs({ items = [], active = 0, name = 'tabs', ariaLabel = 'Tabs', className = '' } = {}) {
  const cls = ['ui-tabs', className].filter(Boolean).join(' ');
  const list = items
    .map((it, i) => {
      const on = i === active;
      return `<button type="button" class="ui-tabs__tab${on ? ' is-active' : ''}" role="tab"`
        + ` id="${name}-tab-${i}" aria-controls="${name}-panel-${i}"`
        + ` aria-selected="${on ? 'true' : 'false'}" tabindex="${on ? '0' : '-1'}">${it.label}</button>`;
    })
    .join('');
  const panels = items
    .map((it, i) => {
      const on = i === active;
      return `<div class="ui-tabs__panel" role="tabpanel" id="${name}-panel-${i}"`
        + ` aria-labelledby="${name}-tab-${i}"${on ? '' : ' hidden'}>${it.panel || ''}</div>`;
    })
    .join('');
  return `<div class="${cls}" data-tabs>`
    + `<div class="ui-tabs__list" role="tablist" aria-label="${ariaLabel}">${list}</div>`
    + `<div class="ui-tabs__panels">${panels}</div>`
    + `</div>`;
}

// Wire click + keyboard for every [data-tabs] under `root`. Idempotent-safe to
// call once after the markup mounts. No-op off-DOM (SSR / node --test).
export function initTabs(root) {
  if (typeof document === 'undefined') return;
  const scope = root || document;
  scope.querySelectorAll('[data-tabs]').forEach((el) => {
    const tabEls = Array.prototype.slice.call(el.querySelectorAll('[role="tab"]'));
    const panelFor = (t) => el.querySelector('[id="' + t.getAttribute('aria-controls') + '"]');
    const select = (i, focus) => {
      tabEls.forEach((t, j) => {
        const on = j === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        const p = panelFor(t);
        if (p) p.hidden = !on;
      });
      if (focus && tabEls[i]) tabEls[i].focus();
    };
    tabEls.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabEls.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabEls.length) % tabEls.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabEls.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
  });
}
