import { success } from '../../src/components/success.js';
import { pad, stack, specimen } from '../_gallery.js';

export default {
  title: 'Components/Success',
  parameters: { layout: 'fullscreen' },
};

const wrap = (html, w = 620) => `<div style="max-width:${w}px;margin:0 auto">${html}</div>`;

// 1 — Hero (upgraded default): the check draws itself on a plain elevated card,
// with follow-up actions. It shares its check with the block-sized successPanel().
// The outcome is the title and the detail is one short line — the block carries
// no third text tier. why: docs/specification.md#success-confirmations
export const Hero = {
  render: () => pad(wrap(success({
    layout: 'hero',
    title: 'Feedback sent',
    body: 'It goes straight to the strategy owner.',
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
    title: 'Your plan is active',
    body: 'A receipt is on its way to your inbox.',
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
    title: 'Your workspace is ready',
    body: 'Taking you to your new dashboard.',
    actions: [
      { label: 'Enter workspace', variant: 'primary', icon: 'sparkle' },
    ],
    countdown: { seconds: 5, label: 'Redirecting' },
  }))),
};

// The two check marks side by side. `line` is the default; `circled` is the
// smaller status mark Guidelines / Iconography asks a reported state to use.
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
