import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { initReveal, replay } from '../../src/motion.js';

const meta: Meta = { title: 'Foundations/Motion', parameters: { layout: 'fullscreen' } };
export default meta;

// The motion vocabulary. Durations and easings are the brand primitives synced
// from design-system (brand.generated.css); the kit's --dur-*/--ease alias onto
// them. Delays are the kit's own. Each row animates at its own value so the
// tempo and the curve are legible, not just a number.
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
// Replay control (entrances) or a hover/loop hint.
type Effect = { cls: string; label: string; kind: 'enter' | 'hover' | 'press' | 'loop' | 'skeleton'; hint?: string };
const EFFECTS: Effect[] = [
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
    .mz { --mz-gap: 22px; padding: 40px; min-height: 100vh; }
    .mz h1 { font: 700 30px/1.1 var(--font-display); color: var(--strong); letter-spacing: -.02em; margin-bottom: 6px; }
    .mz .lead { color: var(--dim); max-width: 62ch; }
    .mz h3 { font: 600 13px/1 var(--font-display); color: var(--muted); margin: 52px 0 20px; }
    .mz code { font-family: var(--font-mono); font-size: 11.5px; color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent); border-radius: 6px; padding: 3px 7px; }

    /* Token rows */
    .mz-tok { display: grid; grid-template-columns: 190px 1fr 120px; align-items: center;
      gap: 18px; padding: 13px 0; border-bottom: 1px solid var(--border); }
    .mz-tok:last-child { border-bottom: 0; }
    .mz-tok__name { display: flex; flex-direction: column; gap: 5px; }
    .mz-tok__use { font: 400 12px/1.4 var(--font-sans); color: var(--muted); }
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
      font: 600 13px/1 var(--font-sans); color: #fff;
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 30%, transparent); }
    .mz-skel { width: 100%; height: 54px; }
    .mz-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .mz-hint { font: 500 11px/1 var(--font-sans); color: var(--muted); }
    .mz-replay { font: 600 12px/1 var(--font-sans); color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent);
      border: 0; border-radius: 8px; padding: 7px 12px; cursor: pointer;
      transition: background var(--dur-fast) var(--ease); }
    .mz-replay:hover { background: color-mix(in srgb, var(--accent) 20%, transparent); }
    .mz-replay:focus-visible { outline: var(--ring); outline-offset: var(--ring-offset); }

    /* Reveal demo */
    .mz-reveal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
    .mz-reveal-card { background: var(--surface); border-radius: 14px; padding: 18px;
      box-shadow: inset 0 0 0 1px var(--border); font: 600 14px/1.2 var(--font-sans); color: var(--strong); }
    .mz-reveal-card small { display: block; font: 400 12px/1.4 var(--font-sans); color: var(--muted); margin-top: 5px; }

    .mz-note { margin-top: 46px; padding: 16px 18px; border-radius: 12px;
      background: color-mix(in srgb, var(--accent) 8%, var(--surface));
      box-shadow: inset 0 0 0 1px var(--border); color: var(--dim); font: 400 13px/1.6 var(--font-sans); max-width: 72ch; }
  `;

const TokenRow = ({ token, val, use, dot }: { token: string; val: string; use: string; dot: CSSProperties }) => <div className="mz-tok">
  <div className="mz-tok__name"><code>{token}</code><span className="mz-tok__use">{use}</span></div>
  <div className="mz-track"><span className="mz-dot" style={dot} /></div>
  <div className="mz-val">{val}</div>
</div>;

const DelayRamp = () => <>
  <div className="mz-ramp">
    {DELAYS.map((t, i) => <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <i style={{ height: 28 + i * 16 }} /><span>{t.replace('--delay-', 't')}</span>
    </div>)}
  </div>
  <p className="mz-tok__use" style={{ marginTop: 12 }}>A 60ms step ramp (<code>--delay-1</code> … <code>--delay-5</code>) for staggering a group. Set <code>--reveal-i</code> or <code>--m-delay</code> to lean on it.</p>
</>;

/** One effect specimen. With `withReplay`, an entrance gets a real Replay button. */
function Specimen({ effect: { cls, label, kind, hint }, withReplay }: { effect: Effect; withReplay: boolean }) {
  const fx = useRef<HTMLElement>(null);
  const canReplay = withReplay && kind === 'enter';
  return <div className="mz-cell">
    <div className="mz-stage">{kind === 'skeleton'
      ? <div ref={fx as RefObject<HTMLDivElement>} className="m-skeleton mz-skel" data-fx />
      : <span ref={fx as RefObject<HTMLSpanElement>} className={`${cls} mz-chip`} data-fx>{label}</span>}</div>
    <div className="mz-foot">{canReplay
      ? <><span className="mz-hint">{cls}</span><button className="mz-replay" type="button" data-replay onClick={() => replay(fx.current)}>Replay</button></>
      : <><span className="mz-hint">{hint || 'On load'}</span><code>{`.${cls}`}</code></>}</div>
  </div>;
}

const Tokens = () => <>
  <h3>Durations</h3>
  <div>{DURATIONS.map(([token, val, use]) => <TokenRow key={token} token={token} val={val} use={use}
    dot={{ animationDuration: `var(${token})`, animationTimingFunction: 'linear' }} />)}</div>
  <h3>Easings</h3>
  <div>{EASINGS.map(([token, val, use]) => <TokenRow key={token} token={token} val={val === 'linear' ? 'linear' : 'bezier'} use={use}
    dot={{ animationDuration: '1.4s', animationTimingFunction: `var(${token})` }} />)}</div>
  <h3>Delays</h3>
  <DelayRamp />
</>;

// Default: every effect animates on mount, and the token rows loop so tempo and
// curve are legible. It has no controls.
export const Default: StoryObj = {
  name: 'Motion',
  render: () => <><style>{CSS}</style><div className="mz">
    <h1>Motion</h1>
    <p className="lead">A small, token-driven motion system: reusable entrance, micro-interaction, attention, and scroll-reveal effects as plain classes. Timings read the brand vocabulary (<code>--duration-*</code> / <code>--easing-*</code>), so motion re-themes and stays consistent. One global <code>prefers-reduced-motion</code> rule neutralises all of it — flip your OS setting to see the whole page fall still.</p>
    <Tokens />
    <h3>Effects</h3>
    <div className="mz-grid">{EFFECTS.map(e => <Specimen key={e.cls} effect={e} withReplay={false} />)}</div>
    <div className="mz-note"><b>Reduced motion.</b> A single global block neutralises every animation and transition in the kit — the effects above, component motion (button loader, live pulse, feedback check), smooth scroll — while letting one-shots settle on their final frame. See <b>Playground</b> for the Replay controls and the scroll-reveal stagger.</div>
  </div></>,
};

// Playground: Replay controls per entrance, plus a live scroll-reveal stagger
// driven by initReveal().
function MotionPlayground() {
  const root = useRef<HTMLDivElement>(null);
  const arm = () => { if (root.current) initReveal(root.current); };
  useEffect(() => { const id = requestAnimationFrame(arm); return () => cancelAnimationFrame(id); }, []);
  return <div ref={root}><style>{CSS}</style><div className="mz">
    <h1>Motion playground</h1>
    <p className="lead">Replay any entrance, and scroll the reveal group to watch a staggered enter fire as it crosses into view. Everything here respects <code>prefers-reduced-motion</code>.</p>

    <h3>Entrances &amp; attention</h3>
    <div className="mz-grid">{EFFECTS.map(e => <Specimen key={e.cls} effect={e} withReplay />)}</div>

    <div className="mz-foot" style={{ margin: '28px 0 0', justifyContent: 'flex-start', gap: 12 }}>
      <button className="mz-replay" type="button" data-replay-all onClick={() => root.current?.querySelectorAll<HTMLElement>('.mz-grid [data-fx]').forEach(el => replay(el))}>Replay all entrances</button>
    </div>

    <h3>Scroll reveal (staggered)</h3>
    <p className="lead" style={{ marginBottom: 18 }}>Each card carries <code>data-reveal</code> and a <code>--reveal-i</code> index; <code>initReveal()</code> adds <code>.is-revealed</code> as they enter the viewport. Without JS they simply render visible.</p>
    <div className="mz-foot" style={{ margin: '0 0 18px', justifyContent: 'flex-start' }}>
      <button className="mz-replay" type="button" data-reveal-replay onClick={() => {
        root.current?.querySelectorAll('[data-reveal]').forEach(el => el.classList.remove('is-revealed'));
        arm();
      }}>Replay reveal</button>
    </div>
    <div className="mz-reveal-grid">
      {Array.from({ length: 8 }, (_, i) => <div key={i} className="mz-reveal-card" data-reveal style={{ ['--reveal-i' as string]: i }}>
        {`Card ${i + 1}`}<small>{`enters at ${i * 120}ms`}</small>
      </div>)}
    </div>
  </div></div>;
}

export const Playground: StoryObj = { name: 'Playground', render: () => <MotionPlayground /> };
