/* Rule: a foreground/background pair the kit renders as text must clear WCAG AA,
 * or be named in stories/lib/contrast-ledger.js by a person who decided it is acceptable.
 *
 * The first part of the dark half of the walk. #562 split stories/contrast.test.js by theme
 * because the combined walk landed on one file's budget, and then dealt each theme's stories over
 * several files for the same reason: stories/lib/contrast-part.js holds the checks every part
 * runs, and stories/lib/contrast-parts.js the deal. This file is part 0 and owns the ledger.
 * See stories/contrast-light.test.js for the other theme, the ledger entries that are light-only,
 * and the tests that do not depend on the walk at all and so needed no second copy.
 *
 * Both files check against the one ledger in stories/lib/contrast-ledger.js, so a bucket's
 * prose and its `worst` floor live in one place, not two drifting copies. A bucket cited by
 * TOKEN only applies to the theme(s) it names; a bucket cited by STORY applies to both, and
 * STORY_BUCKET_COUNTS there records how its rows split between them, measured directly.
 *
 * Every .stories.js file under stories/ is mounted in JSDOM against the kit's stylesheets.
 * Every text-owning element is measured against the background chain composited above it.
 * The resolver is stories/lib/contrast.js; its two rewrites are pinned by the self-checks
 * below. Resolve the winning declarations before measuring the result.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseColour, ratio, tokensFor } from './lib/contrast.js';
import { walkPart } from './lib/contrast-part.js';

const ACCENT = 'default';

// What the walk never puts in front of the resolver, so the gate cannot see it:
//  - anything not visible at rest. display:none, visibility:hidden and opacity:0 are dropped
//    first, so the dropdown panel, confirm scrim, drawer and feedback overlay are measured only
//    where a story ships them open.
//  - states past four. hover, focus-visible, focus and active are FORCED and nothing else is —
//    not :focus-within, ::placeholder, ::selection, nor any class-driven state.
//  - inactive components and their whole subtree — by closest(), per WCAG 1.4.3, so a disabled
//    CONTAINER drops everything in it. #220's floor covers that; it is still a hole here.
//  - anything a script would do: the body is a static string, so no preview.js wiring runs.
//  - custom properties a story pins INLINE. Every var() is flattened against one theme-wide map,
//    so every sub-theme panel is measured using the current cell's accent.
await walkPart('dark', 0);

test(`the dark theme's body text resolves to its known ratio`, () => {
  const vars = tokensFor('dark', ACCENT);
  assert.equal(vars.get('--text'), '#e9e7f0');
  assert.equal(vars.get('--bg'), '#0e0d14');
  const r = ratio(parseColour(vars.get('--text')), parseColour(vars.get('--bg')));
  assert.ok(Math.abs(r - 15.7900) < 0.005, `--text on --bg resolved to ${r}, not the known 15.79`);
});
