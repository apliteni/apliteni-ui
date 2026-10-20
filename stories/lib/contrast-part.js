/* One part of the contrast walk, for one theme. stories/contrast-light.test.js, contrast-dark.test.js
 * and their numbered siblings each call walkPart once.
 *
 * The catalogue's stories are dealt over PARTS files (stories/lib/contrast-parts.js). Part 0 holds
 * the stories that carry every ledger entry, so it owns the ledger: each bucket's count, the
 * totals and the checks that the ledger still names something. Every other part owns the
 * opposite claim, that the stories it walks produce no failure at all. Together they check what
 * one walk of the whole catalogue checked, because a failure group never spans two parts.
 * The whole walk's limits (stories, pairs judged, style reads) are split by share, so passing
 * every part passes the whole.
 *
 * why: #562. One walk of a theme took longer than the file budget when the suite competes for cores.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogueIds, groupFindings, tokensFor, walkCells, walkShards,
} from './contrast.js';
import { bucketsFor, LEDGER, show, STORY_BUCKET_COUNTS } from './contrast-ledger.js';
import {
  dealProblems, dealStories, LIMITS, PART_THREADS, PARTS, shareOf,
} from './contrast-parts.js';

const ACCENT = 'default';

/** Walk this part's stories and register its checks. Awaited at the top of a test file. */
export async function walkPart(theme, part) {
  const ids = await catalogueIds();
  const dealt = dealStories(ids);
  const mine = dealt[part];
  const owner = part === 0;
  const share = shareOf(part);
  const label = `${theme} part ${part + 1}/${PARTS}`;

  const walk = {
    findings: [], stats: {}, problems: [], elapsed: 0, storyIds: new Set(),
    cache: { queries: 0, lookups: 0, routedWrites: 0 },
  };
  const entriesHere = LEDGER.filter((e) => (e.story ? true : e.themes.includes(theme)));
  const countFor = (entry) => (entry.story ? STORY_BUCKET_COUNTS[entry.id] : entry.count);

  // A walk at module load is charged to the file, not to the first test that happens to run.
  if (dealProblems(ids, dealt).length === 0) {
    const started = Date.now();
    const shards = process.env.CONTRAST_SHARDS ? undefined : Math.min(PART_THREADS, walkShards(mine));
    const r = await walkCells({ cells: [{ theme, accent: ACCENT }], states: true, stories: mine, shards });
    walk.problems.push(...r.problems);
    for (const id of r.stats.storyIds) walk.storyIds.add(id);
    for (const [k, v] of Object.entries(r.stats)) {
      if (typeof v === 'number') walk.stats[k] = v;
    }
    for (const k of Object.keys(walk.cache)) walk.cache[k] += r.cache[k];
    walk.stats.uaBlue = r.stats.uaBlue;
    walk.elapsed = Date.now() - started;
    walk.findings = groupFindings(r.records);
  }

  test(`the stories are dealt over the parts exactly once each [${label}]`, () => {
    assert.deepEqual(dealProblems(ids, dealt), [], 'a story in no part is never walked; a story in two is walked twice');
  });

  test(`this part walked exactly the stories dealt to it [${label}]`, () => {
    assert.deepEqual([...walk.storyIds].sort(), mine);
  });

  test(`every story renders in ${theme} — a story the walk cannot mount is not covered [${label}]`, () => {
    assert.equal(
      walk.problems.length, 0,
      `\n${walk.problems.join('\n')}\n\nA story that will not render silently drops out of the `
      + 'gate. Fix the story or the harness; do not skip it.',
    );
  });

  test(`every ${theme} finding falls in exactly one ledger bucket [${label}]`, () => {
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

  if (!owner) {
    test(`no story outside the ledger's own story files fails in ${theme} [${label}]`, () => {
      assert.deepEqual(
        walk.findings.map(show), [],
        'A failure in a story that is not in HOME_FILES (stories/lib/contrast-parts.js) cannot be '
        + 'counted against the ledger from here, because a finding groups across stories. Fix the '
        + 'pair, or move the file to HOME_FILES and change the ledger by hand.',
      );
    });
  }

  if (owner) {
    for (const entry of entriesHere) {
      test(`${theme} ledger ${entry.id}: ${entry.story || `${entry.fg} on ${entry.bg}`}`, () => {
        const rows = walk.findings.filter((f) => bucketsFor(f).some((e) => e.id === entry.id));
        const expected = countFor(entry);
        assert.equal(
          rows.length, expected,
          `\nbucket ${entry.id} holds ${rows.length} finding(s) in ${theme}, expected ${expected}.\n\n`
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

    test(`the ${theme} ledger totals exactly what the ${theme} walk found`, () => {
      const total = entriesHere.reduce((n, e) => n + countFor(e), 0);
      assert.equal(
        walk.findings.length, total,
        `the ${theme} walk found ${walk.findings.length} distinct failing pairs; the ledger accounts `
        + `for ${total}. A finding that matches no bucket has nowhere to hide.`,
      );
    });

    test(`every ${theme} ledger entry still names something the kit renders`, () => {
      for (const e of entriesHere) {
        if (e.story) {
          assert.ok(
            walk.storyIds.has(e.story),
            `ledger ${e.id} cites ${e.story}, which no longer renders in part 0 — the bucket would `
            + 'match nothing and pass by default',
          );
          continue;
        }
        const rows = walk.findings.filter((f) => bucketsFor(f).some((x) => x.id === e.id));
        assert.ok(
          rows.some((r) => [...r.paths].some((p) => p.includes(e.example))),
          `ledger ${e.id}'s example selector \`${e.example}\` matches none of its own findings — `
          + 'the entry is citing a rule that no longer exists',
        );
        assert.ok(tokensFor(theme, ACCENT).has(e.fg), `ledger ${e.id} names token ${e.fg}, which is gone`);
      }
    });

    test(`every ${theme} ledger entry is not empty and carries a hand-written why`, () => {
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
  }

  test(`the ${theme} walk actually walked — a scan that finds nothing must not pass [${label}]`, () => {
    assert.ok(walk.stats.judged > LIMITS.judged * share, `only ${walk.stats.judged} pairs were judged; the walk is not reaching the kit`);
    assert.ok(walk.stats.stories > LIMITS.stories * (mine.length / ids.length), `only ${walk.stats.stories} story renders in ${theme}`);
    if (owner) {
      assert.ok(walk.findings.length > 0, 'the walk found nothing at all, which means it is measuring nothing');
      assert.ok(
        walk.stats.unjudgeable > 0,
        'no element reported an image or gradient background — the unjudgeable path is dead code, '
        + 'which means gradients are being silently composited instead',
      );
    }
  });

  test(`the ${theme} style cache watched the real walk, so its guard is not dead code [${label}]`, () => {
    const { queries, lookups } = walk.cache;
    console.log(
      `${label}: ${lookups} style lookups served from ${queries} reads `
      + `(miss rate ${(lookups / queries).toFixed(4)}), ${walk.cache.routedWrites} DOM writes`,
    );
    assert.ok(
      walk.cache.routedWrites > LIMITS.writes * share,
      `the style cache's watcher saw only ${walk.cache.routedWrites} DOM mutation record(s) across `
      + `the ${label} walk. It should see thousands — one per data-ui-state toggle plus the body `
      + 'replacement per story. A watcher that sees nothing can never fire, so the `mutate` '
      + 'invariant would be enforced by comment again.',
    );
  });

  test(`no computed colour anywhere in the ${theme} walk is the user-agent link blue [${label}]`, () => {
    // Guards the A2 rewrite. Before it, three table links reported rgb(0, 0, 238)
    // and produced false failures at the bottom of the list.
    assert.deepEqual(
      walk.stats.uaBlue, [],
      'an anchor resolved to JSDOM\'s UA blue instead of the kit\'s colour — expandAnchors is no '
      + 'longer reaching the bare `a` rule in src/styles/base.css',
    );
  });

  if (owner) {
    test(`a color-mix background resolves to a translucent colour in ${theme}, not to transparent`, () => {
      assert.ok(
        walk.stats.colorMixTranslucent > 0,
        'nothing in the walk composited a translucent layer. Every tinted surface in the kit is a '
        + 'color-mix; if none resolved, the backgrounds being measured are not the real ones',
      );
    });
  }

  test(`the ${theme} style cache is still serving four reads in five from memory [${label}]`, () => {
    const { queries, lookups } = walk.cache;
    assert.ok(
      queries > LIMITS.queries * share,
      `only ${queries} style reads were made; the ratio below would be measuring almost nothing`,
    );
    const missRate = lookups / queries;
    assert.ok(
      missRate < LIMITS.missMax,
      `the style cache's miss rate rose to ${missRate.toFixed(4)} (${lookups} lookups from ${queries} `
      + `reads), against a ceiling of ${LIMITS.missMax.toFixed(2)}. Unlike the wall clock this is deterministic, so this is a `
      + 'real regression and not a busy machine: either the memo stopped being kept, or something '
      + 'started writing to the DOM inside the walk\'s per-element loop and is dropping the memo on '
      + 'every element.',
    );
  });

  test(`the ${theme} contrast walk stays within its style-read budget [${label}]`, () => {
    console.log(
      `${label}: ${(walk.elapsed / 1000).toFixed(1)}s, `
      + `${walk.stats.judged} pairs judged, ${walk.findings.length} distinct failures`,
    );
    assert.ok(
      walk.cache.queries < LIMITS.queriesMax * share,
      `this part of the ${theme} contrast walk made ${walk.cache.queries} style reads. `
      + 'Check for repeated work or profile catalogue growth before raising the limit.',
    );
  });

  test(`the ${theme} contrast walk stays within the CI time budget [${label}]`, { skip: !process.env.CI }, () => {
    assert.ok(
      walk.elapsed < 150000,
      `the ${label} contrast walk took ${(walk.elapsed / 1000).toFixed(1)}s. `
      + 'Check runner load and style reads before blaming the code.',
    );
  });

  return { ids };
}
