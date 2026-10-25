// What a stat band owes its reader: every change says what it is measured against,
// in reachable text, and a caption leads the figures it captions. Shared by the
// vanilla gate (stories/stat-basis.test.js) and the React one
// (react/src/stat-basis.test.tsx), which walk their own stories.
// why: docs/components.md#stat-bands

// Allowed shared descriptions are a band caption or a direct `data-period-basis`
// child beside a pressed segment. The attribute is the author's period claim.
// The gate does not infer a period from a segment label or `data-seg` name.
export const allowedBases = (root) => {
  const found = new Map();
  for (const caption of root.querySelectorAll('.ui-stats__basis[id]')) {
    found.set(caption.id, "the band's caption");
  }
  for (const control of root.querySelectorAll('.ui-seg')) {
    // An unpressed strip selects nothing, so it states no window.
    if (!control.querySelector('button[aria-pressed="true"]')) continue;
    const row = control.parentElement;
    if (!row) continue;
    for (const line of row.children) {
      if (!line.id || !line.hasAttribute('data-period-basis')) continue;
      found.set(line.id, "the period control's basis");
    }
  }
  return found;
};

/** The changes under `root` whose comparison a reader cannot reach. */
export const unexplained = (root) => {
  const allowed = allowedBases(root);
  return [...root.querySelectorAll('.ui-stat__delta')].filter((d) => {
    if (d.querySelector('.ui-stat__basis')?.textContent.trim()) return false;
    const ids = (d.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    return !ids.some((id) => allowed.has(id) && root.querySelector(`[id="${id}"]`)?.textContent.trim());
  });
};

/** The captions under `root` that do not lead the figures they caption. */
export const misplaced = (root) => [...root.querySelectorAll('.ui-stats__basis')]
  .filter((p) => {
    const band = p.closest('.ui-stats');
    if (!band) return true;
    const list = band.querySelector('.ui-stats__list');
    return p.closest('.ui-stat') !== null || !list || !(p.compareDocumentPosition(list) & 4);
  });

/** The figures under `root` that stack more than one row under their value. */
export const overloaded = (root) => [...root.querySelectorAll('.ui-stat')]
  .filter((f) => [...f.children]
    .filter((c) => c.tagName === 'DD'
      && !c.classList.contains('ui-stat__value')
      && !c.classList.contains('ui-stat__trend')).length > 1);
