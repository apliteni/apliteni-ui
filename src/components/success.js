// Success / confirmation surface. One factory, three layouts and three
// backdrops, an SVG check that draws itself in, optional confetti and an
// optional auto-redirect countdown. Every motion path is reduced-motion safe.
// Accent-aware, but the success mark stays on the --green family.
//
//   container.innerHTML = success({ title, body, actions: [{ label, variant }] });
//
// The check animation is pure CSS, so string-rendered markup animates on its own
// once mounted. A live countdown is opt-in via wireSuccess(); the markup alone
// shows the ring sweep and a static number.
import { esc, button } from './index.js';

// Self-drawing check: a faint track disc, a filled accent disc that springs in,
// the tick that strokes on via dash-offset, and a burst ring that expands and
// fades. viewBox 0 0 52 52; the tick path length is ~34 (dasharray tuned to it).
export function successCheck() {
  // width/height attributes keep the base svg:where(:not([width]):not([height]))
  // fallback from sizing us; the real size is set per-layout in success.css.
  return `<svg class="ui-sx__check" width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" focusable="false">
  <circle class="ui-sx__ring" cx="26" cy="26" r="24"/>
  <circle class="ui-sx__disc" cx="26" cy="26" r="24"/>
  <path class="ui-sx__tick" d="M15 27l7.5 7.5L37 18"/>
</svg>`;
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
  return `<div class="ui-sx__count" data-sx-count style="--sx-secs:${seconds}s">
  <span class="ui-sx__count-ring" aria-hidden="true"></span>
  <span class="ui-sx__count-text">${esc(label)} in <b data-sx-num>${seconds}</b>s</span>
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
// confirmation owns. The two share no CSS (.ui-sx here, .ui-success there), so
// changing one never moves the other.
export function success({
  layout = 'hero',          // 'hero' | 'split' | 'compact'
  backdrop = 'aurora',      // 'aurora' | 'glow' | 'flat'
  eyebrow = '',
  title = 'All done',
  body = '',
  actions = [],             // [{ label, variant, href, icon, iconRight, size }]
  confetti = false,         // opt-in particle burst (reduced-motion safe)
  countdown = null,         // { seconds, label } | null
  className = '',
} = {}) {
  const cls = ['ui-sx', `ui-sx--${layout}`, `ui-sx--bd-${backdrop}`, confetti && 'ui-sx--confetti', className]
    .filter(Boolean).join(' ');

  const bd = backdrop === 'aurora'
    ? `<div class="ui-sx__aurora" aria-hidden="true">
        <span class="ui-sx__glow ui-sx__glow--a"></span>
        <span class="ui-sx__glow ui-sx__glow--b"></span>
      </div>`
    : backdrop === 'glow'
      ? `<span class="ui-glow ui-glow--green ui-sx__bg-glow" aria-hidden="true"></span>`
      : '';

  const eyebrowEl = eyebrow ? `<div class="ui-sx__eyebrow">${esc(eyebrow)}</div>` : '';
  const bodyEl = body ? `<p class="ui-sx__body">${esc(body)}</p>` : '';
  const actionsEl = actions.length
    ? `<div class="ui-sx__actions">${actions.map((a) => button({ size: 'md', ...a })).join('')}</div>`
    : '';
  const countEl = countdown ? countdownEl(countdown) : '';

  return `<div class="${cls}" role="status" aria-live="polite">
  ${bd}
  ${confetti ? confettiField() : ''}
  <div class="ui-sx__inner">
    <div class="ui-sx__visual">${successCheck()}</div>
    <div class="ui-sx__content">
      ${eyebrowEl}
      <h3 class="ui-sx__title">${esc(title)}</h3>
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
