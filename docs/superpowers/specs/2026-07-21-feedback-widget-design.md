# Inline feedback widget — design

**Date:** 2026-07-21
**Goal:** Port strategy's inline feedback feature into `@apliteni/apliteni-ui` as a
reusable, accent-aware component so any product (operating-model, handbook, …) gets
"select a passage → give feedback" out of the box, supplying only its own submit.

## Scope

Owned by the kit (**full inline widget**):
- The floating **"Give feedback" pill** shown on text selection in a content area.
- The **composer** modal: quoted excerpt + note textarea + Send/Cancel, spinner,
  success-checkmark animation, error state, reduced-motion + mobile handling.
- The **behaviour**: selection detection, nearest-heading section detection,
  open/close lifecycle, calling the app's submit and rendering its result.

NOT owned by the kit (stays in each app):
- The backend that turns a note into storage (strategy: a `feedback`-labelled
  GitHub issue via `createFeedbackIssue`) — passed in via `onSend`.
- The exact issue title/body shaping (`buildInlineIssue`) and deep-link base.
- Strategy's `§`-section numbering (a generic heading detector replaces it; apps
  can override formatting with an optional `section()` hook).

## Public API

```js
import { feedbackWidget, wireFeedback } from '@apliteni/apliteni-ui';
import '@apliteni/apliteni-ui/css';

document.body.insertAdjacentHTML('beforeend', feedbackWidget());   // once

wireFeedback({
  container: 'main',                       // selector or element; default 'main'
  onSend: async (payload) => ({ ok: true }),   // required; returns { ok, error? }
  // optional: minChars=3, placeholder, doneTitle, doneBody,
  //           section(headingEl) => { label, title, anchor }
});
// payload = { note, excerpt, anchor, sectionLabel, sectionTitle }
```

- `feedbackWidget()` → HTML string (pill + scrim + composer with form/done/error).
- `wireFeedback(opts)` → attaches selection + composer behaviour; returns nothing
  (or a teardown fn). Idempotent-safe: no-op if the widget markup isn't present.
- `onSend` result drives the UI: `{ ok:true }` → success view; `{ ok:false, error }`
  → error banner, re-enable Send.

## Token remap (accent-aware)

Strategy hardcoded a blue (`#3b6ef5`). In the kit it re-themes with the accent:
`--panel`→`--bg-elevated`, `--raise`→`--surface-2`, `--faint`→`--muted`,
`--ink`→`--text`, pill/primary blue→`--accent-strong`, pill gradient→
`linear-gradient(135deg,var(--accent),var(--accent-strong))`, selection tint→
`color-mix(in srgb,var(--accent) 22%,transparent)`, drop-shadow→`--shadow-lg`.
Success keeps `--green`/`--glow-green`; error keeps `--pink`. All classes
namespaced `.ui-fb*`.

## Files

- `src/components/feedback.js` — `feedbackWidget()` + `wireFeedback()` (+ pure
  `nearestSection(el, root)` helper).
- `src/styles/feedback.css` — remapped CSS, imported from `src/index.css`.
- `src/index.js` — `export * from './components/feedback.js'`.
- `stories/components/Feedback.stories.js` — live demo: an article; select text →
  pill → composer; mock `onSend` (a Success story + a "server error" story). Added
  to the Components storySort order.
- `src/components/feedback.test.js` — unit test for `nearestSection` (repo's
  `node --test` currently has 0 tests).

## Follow-up (separate, in the strategy repo)

Strategy's `viz/inline-feedback.mjs` shrinks to: keep `buildInlineIssue` + the
`POST /text/feedback`, drop the CSS/HTML/JS, and call
`wireFeedback({ container:'main', onSend })`. Out of scope for this change.

## Testing / verification

- Unit: `nearestSection` returns the closest ancestor/preceding `h2|h3[id]`.
- Manual (Storybook): select text → pill appears at the selection → click →
  composer opens with the quote → type → Send → success view; error story shows
  the error banner. Verify dark + light and an accent (pill/primary re-tint).
