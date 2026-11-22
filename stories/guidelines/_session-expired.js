import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('session-expired.md', new URL('../../guidelines/session-expired.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

export const SPEC_CSS = `<style>
  /* The inner kit gap gives the provider button room in a phone cell. */
  .gl-stage:has(.se-page), .gl-stage--confirm { padding: var(--space-2); }
  .se-page { position: relative; min-height: 420px; overflow: hidden; }
  .se-page--dialog-tall { min-height: calc(var(--panel-md) + var(--space-16) * 4); }
  .se-page--dialog-tall .se-page__body { min-height: inherit; }
  .se-page--dialog-tall .ui-card { margin-top: auto; }
  .se-page__body { display: flex; flex-direction: column; gap: var(--space-3); }
  .se-page__title { margin: 0; font: var(--weight-semibold) var(--text-lg)/var(--leading-snug) var(--font-sans); color: var(--strong); }
  .se-page__scrim { position: absolute; inset: 0; background: var(--scrim); }
  .se-page__dialog { position: absolute; inset: 0; display: grid; place-items: center; }
  .se-page__dialog .rx-modal { position: static; transform: none; width: min(100%, 360px); max-height: none; }
  .gl-stage.gl-stage--confirm .rx-modal--sm { width: min(100%, 360px); }
</style>`;
