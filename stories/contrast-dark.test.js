/* Rule: a foreground/background pair the kit renders as text must clear WCAG AA,
 * or be named in stories/lib/contrast-ledger.js by a person who decided it is acceptable.
 *
 * The dark half of the walk. #562 split stories/contrast.test.js by theme because the
 * combined walk's cold-start-shared `before()` landed on one file's budget: isolated, the
 * two-theme walk measured ~42-48s against a 60s file budget, but under full-suite CPU
 * contention it measured 68.62s — over budget — while this file's own walk is one theme's
 * worth of work and comfortably inside it. See stories/contrast-light.test.js for the other
 * theme, the ledger entries that are light-only, and the tests that do not depend on `walk`
 * at all and so needed no second copy.
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
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupFindings, parseColour, ratio, tokensFor, walkCells,
} from './lib/contrast.js';
import { bucketsFor, LEDGER, show, STORY_BUCKET_COUNTS } from './lib/contrast-ledger.js';

const THEME = 'dark';
const ACCENT = 'default';

const walk = {
  findings: [], stats: {}, problems: [], elapsed: 0, storyIds: new Set(),
  cache: { queries: 0, lookups: 0, routedWrites: 0 },
};

/** This theme's own entries: cited by token and naming this theme, or cited by story
 *  (which applies to both themes, at the count STORY_BUCKET_COUNTS records for one). */
const entriesHere = LEDGER.filter((e) => (e.story ? true : e.themes.includes(THEME)));
const countFor = (entry) => (entry.story ? STORY_BUCKET_COUNTS[entry.id] : entry.count);

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
before(async () => {
  const started = Date.now();
  const r = await walkCells({ cells: [{ theme: THEME, accent: ACCENT }], states: true });
  walk.problems.push(...r.problems);
  for (const id of r.stats.storyIds) walk.storyIds.add(id);
  for (const [k, v] of Object.entries(r.stats)) {
    if (typeof v === 'number') walk.stats[k] = v;
  }
  for (const k of Object.keys(walk.cache)) walk.cache[k] += r.cache[k];
  walk.stats.uaBlue = r.stats.uaBlue;
  walk.elapsed = Date.now() - started;
  walk.records = r.records;
  walk.findings = groupFindings(r.records);
});

test(`every story renders in ${THEME} — a story the walk cannot mount is not covered`, () => {
  assert.equal(
    walk.problems.length, 0,
    `\n${walk.problems.join('\n')}\n\nA story that will not render silently drops out of the `
    + 'gate. Fix the story or the harness; do not skip it.',
  );
});

test(`every ${THEME} finding falls in exactly one ledger bucket`, () => {
  const homeless = [];
  const ambiguous = [];
  for (const f of walk.findings) {
    const hits = bucketsFor(f);
    if (hits.length === 0) homeless.push(show(f));
    if (hits.length > 1) ambiguous.push(`${show(f)}\n      matches ${hits.map((h) => h.id).join(', ')}`);
  }
  assert.equal(
    homeless.length, 0,
    `\n${homeless.length} contrast failure(s) match no ledger entry:\n\n${homeless.join('\n\n')}\n\n`
    + 'Either fix the pair, or add an entry naming the CAUSE with a hand-written `why` saying '
    + 'why it is acceptable debt and who owns it.',
  );
  assert.equal(
    ambiguous.length, 0,
    `\nA finding matched more than one bucket, so the counts double-count:\n\n${ambiguous.join('\n\n')}`,
  );
});

for (const entry of entriesHere) {
  test(`${THEME} ledger ${entry.id}: ${entry.story || `${entry.fg} on ${entry.bg}`}`, () => {
    const rows = walk.findings.filter((f) => bucketsFor(f).some((e) => e.id === entry.id));
    const expected = countFor(entry);
    assert.equal(
      rows.length, expected,
      `\nbucket ${entry.id} holds ${rows.length} finding(s) in ${THEME}, expected ${expected}.\n\n`
      + `${rows.map(show).join('\n\n')}\n\n`
      + 'The count is exact on purpose — a ceiling would let a fix in one row hide a regression '
      + 'in another. If this shrank, delete the rows from the count and say so. If it grew, a '
      + 'human looks at the new row before the number moves.',
    );
    const worst = Math.min(...rows.map((r) => r.ratio));
    assert.ok(
      worst >= entry.worst - 0.005,
      `\nbucket ${entry.id}'s worst pair fell to ${worst.toFixed(2)}; the ledger floor is `
      + `${entry.worst}. A regression can deepen a bucket without changing its size.`,
    );
  });
}

test(`the ${THEME} ledger totals exactly what the ${THEME} walk found`, () => {
  const total = entriesHere.reduce((n, e) => n + countFor(e), 0);
  assert.equal(
    walk.findings.length, total,
    `the ${THEME} walk found ${walk.findings.length} distinct failing pairs; the ledger accounts `
    + `for ${total}. A finding that matches no bucket has nowhere to hide.`,
  );
});

test(`every ${THEME} ledger entry still names something the kit renders`, () => {
  for (const e of entriesHere) {
    if (e.story) {
      assert.ok(
        walk.storyIds.has(e.story),
        `ledger ${e.id} cites ${e.story}, which no longer renders — the bucket would match `
        + 'nothing and pass by default',
      );
      continue;
    }
    const rows = walk.findings.filter((f) => bucketsFor(f).some((x) => x.id === e.id));
    assert.ok(
      rows.some((r) => [...r.paths].some((p) => p.includes(e.example))),
      `ledger ${e.id}'s example selector \`${e.example}\` matches none of its own findings — `
      + 'the entry is citing a rule that no longer exists',
    );
    assert.ok(tokensFor(THEME, ACCENT).has(e.fg), `ledger ${e.id} names token ${e.fg}, which is gone`);
  }
});

test(`the ${THEME} walk actually walked — a scan that finds nothing must not pass`, () => {
  assert.ok(walk.stats.judged > 2500, `only ${walk.stats.judged} pairs were judged; the walk is not reaching the kit`);
  assert.ok(walk.stats.stories > 150, `only ${walk.stats.stories} story renders in ${THEME}`);
  assert.ok(walk.findings.length > 0, 'the walk found nothing at all, which means it is measuring nothing');
  assert.ok(
    walk.stats.unjudgeable > 0,
    'no element reported an image or gradient background — the unjudgeable path is dead code, '
    + 'which means gradients are being silently composited instead',
  );
});

test(`the ${THEME} style cache watched the real walk, so its guard is not dead code`, () => {
  const { queries, lookups } = walk.cache;
  console.log(
    `${THEME} contrast walk: ${lookups} style lookups served from ${queries} reads `
    + `(miss rate ${(lookups / queries).toFixed(4)}), ${walk.cache.routedWrites} DOM writes`,
  );
  assert.ok(
    walk.cache.routedWrites > 500,
    `the style cache's watcher saw only ${walk.cache.routedWrites} DOM mutation record(s) across `
    + `the ${THEME} walk. It should see thousands — one per data-ui-state toggle plus the body `
    + 'replacement per story. A watcher that sees nothing can never fire, so the `mutate` '
    + 'invariant would be enforced by comment again.',
  );
});

test(`the dark theme's body text resolves to its known ratio`, () => {
  const vars = tokensFor('dark', ACCENT);
  assert.equal(vars.get('--text'), '#e9e7f0');
  assert.equal(vars.get('--bg'), '#0e0d14');
  const r = ratio(parseColour(vars.get('--text')), parseColour(vars.get('--bg')));
  assert.ok(Math.abs(r - 15.7900) < 0.005, `--text on --bg resolved to ${r}, not the known 15.79`);
});

test(`no computed colour anywhere in the ${THEME} walk is the user-agent link blue`, () => {
  // Guards the A2 rewrite. Before it, three table links reported rgb(0, 0, 238)
  // and produced false failures at the bottom of the list.
  assert.deepEqual(
    walk.stats.uaBlue, [],
    'an anchor resolved to JSDOM\'s UA blue instead of the kit\'s colour — expandAnchors is no '
    + 'longer reaching the bare `a` rule in src/styles/base.css',
  );
});

test(`a color-mix background resolves to a translucent colour in ${THEME}, not to transparent`, () => {
  assert.ok(
    walk.stats.colorMixTranslucent > 0,
    'nothing in the walk composited a translucent layer. Every tinted surface in the kit is a '
    + 'color-mix; if none resolved, the backgrounds being measured are not the real ones',
  );
});

test(`the ${THEME} style cache is still serving four reads in five from memory`, () => {
  const { queries, lookups } = walk.cache;
  assert.ok(
    queries > 25000,
    `only ${queries} style reads were made; the ratio below would be measuring almost nothing`,
  );
  const missRate = lookups / queries;
  assert.ok(
    missRate < 0.30,
    `the style cache's miss rate rose to ${missRate.toFixed(4)} (${lookups} lookups from ${queries} `
    + 'reads), against a ceiling of 0.30. Unlike the wall clock this is deterministic, so this is a '
    + 'real regression and not a busy machine: either the memo stopped being kept, or something '
    + 'started writing to the DOM inside the walk\'s per-element loop and is dropping the memo on '
    + 'every element.',
  );
});

test(`the ${THEME} contrast walk stays within its style-read budget`, () => {
  console.log(
    `${THEME} contrast walk: ${(walk.elapsed / 1000).toFixed(1)}s, `
    + `${walk.stats.judged} pairs judged, ${walk.findings.length} distinct failures`,
  );
  // One theme's worth of the two-theme 800,000 budget in stories/contrast.test.js before #562.
  assert.ok(
    walk.cache.queries < 500000,
    `the ${THEME} contrast walk made ${walk.cache.queries} style reads. `
    + 'Check for repeated work or profile catalogue growth before raising the limit.',
  );
});

test(`the ${THEME} contrast walk stays within the CI time budget`, { skip: !process.env.CI }, () => {
  assert.ok(
    walk.elapsed < 150000,
    `the ${THEME} contrast walk took ${(walk.elapsed / 1000).toFixed(1)}s. `
    + 'Check runner load and style reads before blaming the code.',
  );
});

test(`every ${THEME} ledger entry is not empty and carries a hand-written why`, () => {
  assert.ok(entriesHere.length >= 1, 'an emptied ledger would make every assertion above vacuous');
  for (const e of entriesHere) {
    assert.ok(typeof e.why === 'string' && e.why.trim().length > 0, `ledger ${e.id}: explain the cause and accepted limitation in why; review measurements by hand`);
    assert.ok(
      !/\d+(\.\d+)?\s*:\s*1|\b\d\.\d{2}\b/.test(e.why),
      `ledger ${e.id}'s \`why\` quotes a ratio. Numbers live in \`count\` and \`worst\`, which `
      + 'the assertions read; the prose is about the cause and must survive a token moving.',
    );
  }
});
