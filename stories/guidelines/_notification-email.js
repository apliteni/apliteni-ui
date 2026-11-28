import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('notification-email.md', new URL('../../guidelines/notification-email.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// A mail is read as its text, so each picture shows the subject and the plain text form.
export const SPEC_CSS = `
  <style>
    .gl-mail { display: flex; flex-direction: column; gap: var(--space-3); }
    .gl-mail__text { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  </style>`;
