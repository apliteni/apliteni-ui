import { pad } from '../_gallery.js';
import { initReveal, replay } from '../../src/motion.js';

export default {
  title: 'Foundations/Motion',
  parameters: { layout: 'fullscreen' },
};

// ---------------------------------------------------------------------------
// The motion vocabulary. Durations + easings are the brand primitives synced
// from design-system (brand.generated.css); the kit's --dur-*/--ease alias
// onto them. Delays are the kit's own. Each row animates at its own value so
// the tempo/curve is legible, not just a number.
// ---------------------------------------------------------------------------
const DURATIONS = [
  ['--duration-instant', '80ms', 'Checkbox tick, ripple'],
  ['--duration-fast', '150ms', 'Hover, button press'],
  ['--duration-normal', '250ms', 'Panels, dropdowns, tooltips'],
  ['--duration-slow', '400ms', 'Enters, reveals, modals'],
  ['--duration-slower', '600ms', 'Layout shifts, onboarding'],
  ['--duration-crawl', '1000ms', 'Skeletons, ambient loops'],
];

const EASINGS = [
  ['--easing-linear', 'linear', 'Progress, continuous loops'],
  ['--easing-ease-in', 'cubic-bezier(0.4, 0, 1, 1)', 'Leaving the screen'],
  ['--easing-ease-out', 'cubic-bezier(0, 0, 0.2, 1)', 'Entering the screen'],
  ['--easing-ease-in-out', 'cubic-bezier(0.4, 0, 0.2, 1)', 'Symmetrical transitions'],
  ['--easing-spring', 'cubic-bezier(0.34, 1.56, 0.64, 1)', 'Playful overshoot'],
  ['--easing-sharp', 'cubic-bezier(0.4, 0, 0.6, 1)', 'Snappy dismiss/collapse'],
];

const DELAYS = ['--delay-1', '--delay-2', '--delay-3', '--delay-4', '--delay-5'];

// Effects grid. `kind` drives how each specimen behaves and whether it earns a
// Replay control (entrances/one-shots) or a hover/loop hint.
const EFFECTS = [
  { cls: 'm-fade-in', label: 'Fade in', kind: 'enter' },
  { cls: 'm-slide-up', label: 'Slide up', kind: 'enter' },
  { cls: 'm-slide-down', label: 'Slide down', kind: 'enter' },
  { cls: 'm-slide-left', label: 'Slide left', kind: 'enter' },
  { cls: 'm-slide-right', label: 'Slide right', kind: 'enter' },
  { cls: 'm-scale-in', label: 'Scale in', kind: 'enter' },
  { cls: 'm-blur-in', label: 'Blur in', kind: 'enter' },
  { cls: 'm-shake', label: 'Shake (error)', kind: 'enter' },
  { cls: 'm-lift', label: 'Hover lift', kind: 'hover', hint: 'Hover' },
  { cls: 'm-press', label: 'Press', kind: 'press', hint: 'Click' },
  { cls: 'm-pulse', label: 'Pulse', kind: 'loop', hint: 'Loops' },
  { cls: 'm-skeleton', label: 'Skeleton', kind: 'skeleton', hint: 'Loops' },
];

const CSS = `
  <style>
    .mz { --mz-gap: 22px; padding: 40px; min-height: 100vh; }
    .mz h1 { font: 700 30px/1.1 Poppins; color: var(--strong); letter-spacing: -.02em; margin-bottom: 6px; }
    .mz .lead { color: var(--dim); max-width: 62ch; }
    .mz h3 { font: 600 13px/1 Poppins; letter-spacing: .1em; text-transform: uppercase;
      color: var(--muted); margin: 52px 0 20px; }
    .mz code { font-family: var(--font-mono); font-size: 11.5px; color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent); border-radius: 6px; padding: 3px 7px; }

    /* Token rows */
    .mz-tok { display: grid; grid-template-columns: 190px 1fr 120px; align-items: center;
      gap: 18px; padding: 13px 0; border-bottom: 1px solid var(--border); }
    .mz-tok:last-child { border-bottom: 0; }
    .mz-tok__name { display: flex; flex-direction: column; gap: 5px; }
    .mz-tok__use { font: 400 12px/1.4 Poppins; color: var(--muted); }
    .mz-track { position: relative; height: 30px; border-radius: 8px;
      background: var(--surface-2); box-shadow: inset 0 0 0 1px var(--border); overflow: hidden; }
    .mz-dot { position: absolute; top: 50%; margin-top: -7px; width: 14px; height: 14px; border-radius: 50%;
      background: linear-gradient(145deg, var(--accent), var(--accent-strong));
      animation-name: mz-run; animation-iteration-count: infinite; animation-direction: alternate; }
    @keyframes mz-run { from { left: 3px; } to { left: calc(100% - 17px); } }
    .mz-val { font: 500 12px/1 var(--font-mono); color: var(--dim); text-align: right; }

    /* Delay ramp */
    .mz-ramp { display: flex; align-items: flex-end; gap: 10px; }
    .mz-ramp i { display: block; width: 46px; border-radius: 8px 8px 3px 3px;
      background: color-mix(in srgb, var(--accent) 22%, var(--surface));
      box-shadow: inset 0 0 0 1px var(--border); }
    .mz-ramp span { display: block; text-align: center; font: 500 10.5px/1.6 var(--font-mono); color: var(--muted); }

    /* Effect specimens */
    .mz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 18px; }
    .mz-cell { position: relative; background: var(--surface); border-radius: 16px; padding: 18px;
      box-shadow: inset 0 0 0 1px var(--border); display: flex; flex-direction: column; gap: 14px; min-height: 168px; }
    .mz-stage { flex: 1; display: grid; place-items: center; }
    .mz-chip { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
      font: 600 13px/1 Poppins; color: #fff;
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 30%, transparent); }
    .mz-skel { width: 100%; height: 54px; }
    .mz-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .mz-hint { font: 500 11px/1 Poppins; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
    .mz-replay { font: 600 12px/1 Poppins; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent);
      border: 0; border-radius: 8px; padding: 7px 12px; cursor: pointer;
      transition: background var(--dur-fast) var(--ease); }
    .mz-replay:hover { background: color-mix(in srgb, var(--accent) 20%, transparent); }
    .mz-replay:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    /* Reveal demo */
    .mz-reveal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
    .mz-reveal-card { background: var(--surface); border-radius: 14px; padding: 18px;
      box-shadow: inset 0 0 0 1px var(--border); font: 600 14px/1.2 Poppins; color: var(--strong); }
    .mz-reveal-card small { display: block; font: 400 12px/1.4 Poppins; color: var(--muted); margin-top: 5px; }

    .mz-note { margin-top: 46px; padding: 16px 18px; border-radius: 12px;
      background: color-mix(in srgb, var(--accent) 8%, var(--surface));
      box-shadow: inset 0 0 0 1px var(--border); color: var(--dim); font: 400 13px/1.6 Poppins; max-width: 72ch; }
  </style>`;

const durationRow = ([token, val, use]) => `
  <div class="mz-tok">
    <div class="mz-tok__name"><code>${token}</code><span class="mz-tok__use">${use}</span></div>
    <div class="mz-track"><span class="mz-dot" style="animation-duration:var(${token});animation-timing-function:linear"></span></div>
    <div class="mz-val">${val}</div>
  </div>`;

const easingRow = ([token, val, use]) => `
  <div class="mz-tok">
    <div class="mz-tok__name"><code>${token}</code><span class="mz-tok__use">${use}</span></div>
    <div class="mz-track"><span class="mz-dot" style="animation-duration:1.4s;animation-timing-function:var(${token})"></span></div>
    <div class="mz-val">${val === 'linear' ? 'linear' : 'bezier'}</div>
  </div>`;

const delayRamp = () => `
  <div class="mz-ramp">
    ${DELAYS.map((t, i) => `
      <div style="display:flex;flex-direction:column;gap:8px;align-items:center">
        <i style="height:${28 + i * 16}px"></i><span>${t.replace('--delay-', 't')}</span>
      </div>`).join('')}
  </div>
  <p class="mz-tok__use" style="margin-top:12px">A 60ms step ramp (<code>--delay-1</code> … <code>--delay-5</code>) for staggering a group. Set <code>--reveal-i</code> or <code>--m-delay</code> to lean on it.</p>`;

// A single effect specimen. `withReplay` swaps the hint for a real Replay
// button (only meaningful in the interactive Playground story).
const specimen = ({ cls, label, kind, hint }, withReplay) => {
  const stage =
    kind === 'skeleton'
      ? `<div class="m-skeleton mz-skel" data-fx></div>`
      : `<span class="${cls} mz-chip" data-fx>${label}</span>`;
  const canReplay = withReplay && (kind === 'enter');
  const foot = canReplay
    ? `<span class="mz-hint">${cls}</span><button class="mz-replay" type="button" data-replay>Replay</button>`
    : `<span class="mz-hint">${hint || 'On load'}</span><code>.${cls}</code>`;
  return `<div class="mz-cell"><div class="mz-stage">${stage}</div><div class="mz-foot">${foot}</div></div>`;
};

const INTRO = `
  <h1>Motion</h1>
  <p class="lead">A small, token-driven motion system: reusable entrance, micro-interaction, attention, and
  scroll-reveal effects as plain classes. Timings read the brand vocabulary (<code>--duration-*</code> /
  <code>--easing-*</code>), so motion re-themes and stays consistent. One global
  <code>prefers-reduced-motion</code> rule neutralises all of it — flip your OS setting to see the whole page fall still.</p>`;

const TOKENS_SECTION = `
  <h3>Durations</h3>
  <div>${DURATIONS.map(durationRow).join('')}</div>
  <h3>Easings</h3>
  <div>${EASINGS.map(easingRow).join('')}</div>
  <h3>Delays</h3>
  ${delayRamp()}`;

// ---------------------------------------------------------------------------
// Default — string-returning reference. Every effect animates on mount; the
// token rows loop so tempo + curve are legible. Fully axe-gated (no controls).
// ---------------------------------------------------------------------------
export const Default = {
  name: 'Motion',
  render: () =>
    `${CSS}<div class="mz">
      ${INTRO}
      ${TOKENS_SECTION}
      <h3>Effects</h3>
      <div class="mz-grid">${EFFECTS.map((e) => specimen(e, false)).join('')}</div>
      <div class="mz-note"><b>Reduced motion.</b> A single global block neutralises every animation and
      transition in the kit — the effects above, component motion (button loader, live pulse, feedback check),
      smooth scroll — while letting one-shots settle on their final frame. See <b>Playground</b> for the Replay
      controls and the scroll-reveal stagger.</div>
    </div>`,
};

// ---------------------------------------------------------------------------
// Playground — element-returning + wired. Replay controls per entrance, plus a
// live scroll-reveal stagger driven by initReveal(). Skipped by the axe pass
// (returns a node), same as the other interactive stories in the kit.
// ---------------------------------------------------------------------------
export const Playground = {
  name: 'Playground',
  render: () => {
    const root = document.createElement('div');
    root.innerHTML = `${CSS}<div class="mz">
      <h1>Motion playground</h1>
      <p class="lead">Replay any entrance, and scroll the reveal group to watch a staggered enter fire as it
      crosses into view. Everything here respects <code>prefers-reduced-motion</code>.</p>

      <h3>Entrances &amp; attention</h3>
      <div class="mz-grid">${EFFECTS.map((e) => specimen(e, true)).join('')}</div>

      <div class="mz-foot" style="margin:28px 0 0;justify-content:flex-start;gap:12px">
        <button class="mz-replay" type="button" data-replay-all>Replay all entrances</button>
      </div>

      <h3>Scroll reveal (staggered)</h3>
      <p class="lead" style="margin-bottom:18px">Each card carries <code>data-reveal</code> and a
      <code>--reveal-i</code> index; <code>initReveal()</code> adds <code>.is-revealed</code> as they enter the
      viewport. Without JS they simply render visible.</p>
      <div class="mz-foot" style="margin:0 0 18px;justify-content:flex-start">
        <button class="mz-replay" type="button" data-reveal-replay>Replay reveal</button>
      </div>
      <div class="mz-reveal-grid">
        ${Array.from({ length: 8 }, (_, i) => `
          <div class="mz-reveal-card" data-reveal style="--reveal-i:${i}">
            Card ${i + 1}<small>enters at ${i * 120}ms</small>
          </div>`).join('')}
      </div>
    </div>`;

    // Per-cell Replay: restart the animation on that cell's animated node.
    root.querySelectorAll('[data-replay]').forEach((btn) => {
      const fx = btn.closest('.mz-cell')?.querySelector('[data-fx]');
      btn.addEventListener('click', () => replay(fx));
    });
    // Replay every entrance at once.
    root.querySelector('[data-replay-all]')?.addEventListener('click', () => {
      root.querySelectorAll('.mz-grid [data-fx]').forEach(replay);
    });
    // Reveal: (re)arm the observer. Deferred so the node is attached first.
    const arm = () => initReveal(root);
    root.querySelector('[data-reveal-replay]')?.addEventListener('click', () => {
      root.querySelectorAll('[data-reveal]').forEach((el) => el.classList.remove('is-revealed'));
      arm();
    });
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(arm);
    else arm();

    return root;
  },
};
