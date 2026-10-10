// Success / confirmation surface. One factory, three layouts, two check marks,
// optional confetti and an optional auto-redirect countdown, every motion path
// reduced-motion safe. Accent-aware, but the mark stays on the --green family.
//
//   container.innerHTML = success({ title, body, actions: [{ label, variant }] });
//
// The check animation is pure CSS, so string-rendered markup animates once
// mounted. A live countdown is opt-in via wireSuccess().
import { esc, button } from './index.js';

// 'line' is the bare Lucide `check`, 'circled' is Lucide circle-check-big. Which
// is the default, and why that departs from Guidelines / Iconography:
// why: docs/components.md#success-confirmations
// Each is written whole because the icon-sizing and glyph-stroke gates find their
// subjects by scanning source for a class on an `<svg …>`: a tag split across
// string pieces leaves both silent rather than failing.
const MARKS = {
  line: '<svg class="ui-sx__check ui-sx__check--line" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="ui-sx__tick" d="M20 6L9 17l-5-5"/></svg>',
  circled: '<svg class="ui-sx__check ui-sx__check--circled" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="ui-sx__circle" d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path class="ui-sx__tick" d="M22 4L12 14.01l-3-3"/></svg>',
};

export function successCheck(variant = 'line') {
  return Object.hasOwn(MARKS, variant) ? MARKS[variant] : MARKS.line;
}

// A deterministic confetti field (opt-in). Decorative + aria-hidden; each piece
// carries its own drift/rotation/colour via custom props so the CSS can scatter
// them without inline keyframes. Deterministic so string renders stay stable
// (and the a11y snapshot is reproducible).
const CONFETTI = [
  { x: 8,  d: 0.00, r: -24, t: 'a', s: 1.0 }, { x: 20, d: 0.14, r: 40,  t: 'g', s: 0.8 },
  { x: 31, d: 0.06, r: 12,  t: 'c', s: 1.1 }, { x: 42, d: 0.20, r: -52, t: 'p', s: 0.9 },
  { x: 50, d: 0.02, r: 28,  t: 'a', s: 1.0 }, { x: 58, d: 0.18, r: -16, t: 'k', s: 0.75 },
  { x: 67, d: 0.09, r: 60,  t: 'g', s: 1.05 },{ x: 76, d: 0.24, r: -36, t: 'c', s: 0.85 },
  { x: 85, d: 0.05, r: 20,  t: 'a', s: 1.0 }, { x: 92, d: 0.16, r: -48, t: 'p', s: 0.9 },
  { x: 14, d: 0.30, r: 44,  t: 'k', s: 0.8 }, { x: 37, d: 0.34, r: -28, t: 'g', s: 1.0 },
  { x: 62, d: 0.28, r: 52,  t: 'a', s: 0.9 }, { x: 80, d: 0.36, r: -20, t: 'c', s: 1.05 },
];
function confettiField() {
  const pieces = CONFETTI.map((p) =>
    `<i class="ui-sx__piece ui-sx__piece--${p.t}" style="left:${p.x}%;--sx-d:${p.d}s;--sx-r:${p.r}deg;--sx-s:${p.s}"></i>`,
  ).join('');
  return `<div class="ui-sx__confetti" aria-hidden="true">${pieces}</div>`;
}

// Optional auto-redirect countdown. Markup-only here (a conic ring sweeps and a
// static number shows); wireSuccess() turns it into a live ticking counter.
function countdownEl({ seconds = 5, label = 'Redirecting' } = {}) {
  return `<div class="ui-sx__count" data-sx-count style="--sx-secs:${esc(seconds)}s">
  <span class="ui-sx__count-ring" aria-hidden="true"></span>
  <span class="ui-sx__count-text">${esc(label)} in <b data-sx-num>${esc(seconds)}</b>s</span>
</div>`;
}

// The page-sized confirmation — what a flow lands on once it is over. It fills
// the space it is given, and carries the things a screen needs that a block does
// not: somewhere to go next, and optionally a countdown that takes the user
// there.
//
// For a confirmation that stays inside the page the user is already on, the kit
// publishes successPanel() from components/index.js — a check, a title and one
// line of sub, and nothing to configure. Pick by how much of the screen the
// confirmation owns. The two share the check, while their layout and content
// remain independent.
//
// Both carry one title and at most one short line under it. There is no eyebrow
// tier: a confirmation stacking a label, a headline and a paragraph reads as
// three competing voices for one outcome.
// why: docs/components.md#success-confirmations
export function success({
  layout = 'hero',          // 'hero' | 'split' | 'compact'
  level,                    // heading level of the title; see the note below
  check = 'line',           // 'line' | 'circled' — see successCheck() above
  title = 'All done',
  body = '',                // one short line, or nothing; see the note below
  actions = [],             // [{ label, variant, href, icon, iconRight, size }]
  confetti = false,         // opt-in particle burst (reduced-motion safe)
  countdown = null,         // { seconds, label } | null
  className = '',
} = {}) {
  const mark = check === 'circled' ? 'circled' : 'line';
  const cls = ['ui-sx', `ui-sx--${layout}`, `ui-sx--check-${mark}`, confetti && 'ui-sx--confetti', className]
    .filter(Boolean).join(' ');

  // The title's rank follows the layout, because the layout is the question
  // "how much of the screen does this own": hero and split ARE the page a flow
  // lands on, so their title is its h1; compact sits beside other content and
  // takes h2. It was an h3 either way, which left a page whose whole content is
  // a success() with no h1 at all — the fault Guidelines / The page names.
  // A caller who knows better passes `level`. The look is the class's.
  // why: guidelines/the-page.md#the-page
  const rank = [1, 2, 3, 4, 5, 6].includes(Number(level)) ? Number(level) : (layout === 'compact' ? 2 : 1);
  const h = `h${rank}`;

  const bodyEl = body ? `<p class="ui-sx__body">${esc(body)}</p>` : '';
  const actionsEl = actions.length
    ? `<div class="ui-sx__actions">${actions.map((a) => button({ size: 'md', ...a })).join('')}</div>`
    : '';
  const countEl = countdown ? countdownEl(countdown) : '';

  return `<div class="${esc(cls)}" role="status" aria-live="polite">
  ${confetti ? confettiField() : ''}
  <div class="ui-sx__inner">
    <div class="ui-sx__visual">${successCheck(mark)}</div>
    <div class="ui-sx__content">
      <${h} class="ui-sx__title">${esc(title)}</${h}>
      ${bodyEl}
      ${actionsEl}
      ${countEl}
    </div>
  </div>
</div>`;
}

// Live countdown wiring (opt-in). Ticks the number down once a second and calls
// onDone() at zero — e.g. to navigate. Respects reduced-motion only for the
// visual sweep (owned by CSS); the counter itself is content, so it still runs.
// Returns a stop() to cancel (unmount / user interaction).
//   const stop = wireSuccess(el, { onDone: () => location.assign('/strategy') });
export function wireSuccess(root, { onDone } = {}) {
  const box = root && root.querySelector('[data-sx-count]');
  if (!box) return () => {};
  const numEl = box.querySelector('[data-sx-num]');
  let n = parseInt(box.style.getPropertyValue('--sx-secs'), 10) || parseInt(numEl?.textContent, 10) || 5;
  const id = setInterval(() => {
    n -= 1;
    if (numEl) numEl.textContent = String(Math.max(0, n));
    if (n <= 0) { clearInterval(id); if (typeof onDone === 'function') onDone(); }
  }, 1000);
  return () => clearInterval(id);
}
