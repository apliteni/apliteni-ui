import { success } from '../../src/components/success.js';
import { pad, stack, specimen } from '../_gallery.js';

export default {
  title: 'Components/Success',
  parameters: { layout: 'fullscreen' },
};

const wrap = (html, w = 620) => `<div style="max-width:${w}px;margin:0 auto">${html}</div>`;

// 1 — Hero (upgraded default): self-drawing check on an aurora backdrop with
// follow-up actions. This is the flat successPanel(), re-imagined with craft.
export const Hero = {
  render: () => pad(wrap(success({
    layout: 'hero',
    backdrop: 'aurora',
    eyebrow: 'Feedback sent',
    title: 'Thanks — it goes straight to the strategy owner',
    body: 'We read every note against the current cycle. You can keep browsing or send another passage.',
    actions: [
      { label: 'Back to strategy', variant: 'primary', icon: 'compass' },
      { label: 'Send another', variant: 'ghost', icon: 'chat' },
    ],
  }))),
};

// 2 — Split: a big check on a tinted panel beside the copy + actions. Reads
// well in a wider card or a two-pane confirmation screen.
export const Split = {
  render: () => pad(wrap(success({
    layout: 'split',
    backdrop: 'glow',
    eyebrow: 'Payment received',
    title: 'Your plan is active',
    body: 'The Team plan is live for everyone in your workspace. A receipt is on its way to your inbox.',
    actions: [
      { label: 'Go to dashboard', variant: 'primary', iconRight: 'arrowRight' },
      { label: 'View receipt', variant: 'ghost' },
    ],
  }), 720)),
};

// 3 — Compact inline: a small check, one line, one action — for panels and
// spots that sit next to a toast rather than taking over the screen.
export const Compact = {
  render: () => pad(stack(
    specimen('Single action', wrap(success({
      layout: 'compact',
      backdrop: 'flat',
      title: 'Note saved',
      body: 'Autosaved just now.',
      actions: [{ label: 'Undo', variant: 'ghost', size: 'sm' }],
    }), 520)),
    specimen('No action', wrap(success({
      layout: 'compact',
      backdrop: 'flat',
      title: 'Copied to clipboard',
    }), 520)),
  )),
};

// 4 — Celebrate: opt-in confetti + an auto-redirect countdown, for the big
// moments. Confetti, the burst and the sweep all fall back to nothing under
// prefers-reduced-motion; the check shows static.
export const Celebrate = {
  render: () => pad(wrap(success({
    layout: 'hero',
    backdrop: 'aurora',
    confetti: true,
    eyebrow: 'Welcome aboard',
    title: 'Your workspace is ready',
    body: "You're all set. We'll take you to your new dashboard in a moment.",
    actions: [
      { label: 'Enter workspace', variant: 'primary', icon: 'sparkle' },
    ],
    countdown: { seconds: 5, label: 'Redirecting' },
  }))),
};

// The three backdrops side by side, so the aurora / glow / flat choice is easy
// to compare and each re-themes with the accent.
export const Backdrops = {
  render: () => pad(stack(
    specimen('Aurora', wrap(success({ backdrop: 'aurora', title: 'Aurora backdrop', body: 'Two soft blobs — a green wash plus an accent glow.' }))),
    specimen('Glow', wrap(success({ backdrop: 'glow', title: 'Glow backdrop', body: 'A single green ambient glow behind the check.' }))),
    specimen('Flat', wrap(success({ backdrop: 'flat', title: 'Flat backdrop', body: 'No backdrop — just the elevated surface.' }))),
  )),
};
