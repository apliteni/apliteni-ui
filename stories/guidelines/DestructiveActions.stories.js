// ---------------------------------------------------------------------------
// Guidelines — Destructive actions.
//
// The rule is the picture. A reader who can see the difference between the do
// and the don't has already learned the rule, so the page spends its height on
// specimens and almost nothing on talking about them: no deck, no page-level
// why, no sentence attached to the citations. What remains per rule is an
// imperative, the pair, one line under each half, the boundary, and the bare
// file:line addresses of code that already does it.
//
// Two places where the picture can't carry the load:
//
// * The boundary. "Except" is where the rule stops applying, and a specimen of
//   a rule not applying is not a picture anyone can read. It stays as a hanging
//   amber rule on the text — the marker without the panel, which costs an
//   eighth of what a bordered, padded block costs across three rules.
// * A rule with no specimen. A rule can land before the kit has anything to
//   photograph, and until it does it stands on its one sentence in place of
//   the pair.
// ---------------------------------------------------------------------------
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_destructive-actions.js';

export default {
  title: 'Guidelines/Destructive actions',
  parameters: { layout: 'fullscreen' },
};

export const DestructiveActions = {
  name: 'Destructive actions',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
