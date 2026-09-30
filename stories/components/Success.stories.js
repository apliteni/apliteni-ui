import { success } from '../../src/components/success.js';
import { pad, stack, specimen } from '../_gallery.js';

export default {
  title: 'Components/Success',
  parameters: { layout: 'fullscreen' },
};

const wrap = (html, w = 620) => `<div style="max-width:${w}px;margin:0 auto">${html}</div>`;

// 1 — Hero (upgraded default): the check draws itself on a plain elevated card,
// with follow-up actions. It shares its check with the block-sized successPanel().
export const Hero = {
  render: () => pad(wrap(success({
    layout: 'hero',
    eyebrow: 'Feedback sent',
    title: 'Thanks — it goes straight to the strategy owner',
    body: 'We read every note against the current cycle. You can keep browsing or send another passage.',
    actions: [
      { label: 'Back to strategy', variant: 'primary', icon: 'compass' },
      { label: 'Send another', variant: 'ghost', icon: 'chat' },
    ],
  }))),
};

// 2 — Split: the check on a tinted panel beside the copy + actions. Reads
// well in a wider card or a two-pane confirmation screen.
export const Split = {
  render: () => pad(wrap(success({
    layout: 'split',
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
      title: 'Note saved',
      body: 'Autosaved just now.',
      actions: [{ label: 'Undo', variant: 'ghost', size: 'sm' }],
    }), 520)),
    specimen('No action', wrap(success({
      layout: 'compact',
      title: 'Copied to clipboard',
    }), 520)),
  )),
};

// 4 — Celebrate: opt-in confetti + an auto-redirect countdown, for the big
// moments. Confetti and the sweep both fall back to nothing under
// prefers-reduced-motion; the check shows static.
export const Celebrate = {
  render: () => pad(wrap(success({
    layout: 'hero',
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

// The two check marks side by side. `line` is the default; `circled` is the
// smaller status mark Guidelines / Iconography asks a reported state to use.
// No eyebrow here: light --green on white is 4.45:1 against a 4.5:1 floor —
// ledger C — and a comparison of two marks is no reason to add rows to it.
export const CheckMark = {
  render: () => pad(stack(
    specimen('Line — the default', wrap(success({
      title: 'Your plan is active',
      body: 'A receipt is on its way to your inbox.',
    }))),
    specimen('Circled', wrap(success({
      check: 'circled',
      title: 'Your plan is active',
      body: 'A receipt is on its way to your inbox.',
    }))),
    specimen('Circled, beside the copy', wrap(success({
      check: 'circled', layout: 'split',
      title: 'Your plan is active',
      body: 'A receipt is on its way to your inbox.',
    }), 720)),
  )),
};
