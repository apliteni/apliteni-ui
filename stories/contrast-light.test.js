/* Rule: a foreground/background pair the kit renders as text must clear WCAG AA,
 * or be named in stories/lib/contrast-ledger.js by a person who decided it is acceptable.
 *
 * The light half of the walk, plus every self-check in the old stories/contrast.test.js that
 * does not depend on the shared `walk` and so needed no second copy: the toast/success-panel/
 * chip self-checks, the alternate-accent ledger (CONTRAST_ACCENTS=1), and the accent discovery
 * check. See stories/contrast-dark.test.js for why the file is split by theme and for the dark
 * walk and its ledger entries.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { card, successPanel } from '../src/components/index.js';
import { success } from '../src/components/success.js';
import {
  AA_TEXT,
  composite,
  effectiveBackground,
  groupFindings,
  kitCssFor,
  parseColour,
  ratio,
  rgbOf,
  substitute,
  tokensFor,
  walkCells,
  walkStoriesParallel,
} from './lib/contrast.js';
import {
  ACCENT_LEDGER, ALTERNATE_CAUSES, bucketsFor, LEDGER, show, STORY_BUCKET_COUNTS,
} from './lib/contrast-ledger.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const THEME = 'light';
const THEMES = ['dark', 'light'];
const ACCENT = 'default';
const accentCss = readFileSync(path.join(root, 'src/tokens/accents.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const ACCENTS = ['default', ...new Set([...accentCss.matchAll(/\[data-accent="([^"]+)"\]/g)]
  .map((match) => match[1]))];

const walk = {
  findings: [], stats: {}, problems: [], elapsed: 0, storyIds: new Set(),
  cache: { queries: 0, lookups: 0, routedWrites: 0 },
};

/** This theme's own entries: cited by token and naming this theme, or cited by story
 *  (which applies to both themes, at the count STORY_BUCKET_COUNTS records for one). */
const entriesHere = LEDGER.filter((e) => (e.story ? true : e.themes.includes(THEME)));
const countFor = (entry) => (entry.story ? STORY_BUCKET_COUNTS[entry.id] : entry.count);

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

// ---- the light walk's own ledger, mirroring contrast-dark.test.js --------

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

test(`no computed colour anywhere in the ${THEME} walk is the user-agent link blue`, () => {
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

// ---- self-checks that do not depend on `walk`, so one copy covers both themes ----

test('the five toast statuses resolve to five different accents and five different action inks', () => {
  // Guards the A1 rewrite. Before it, --toast-accent flattened first-wins and
  // all five statuses reported the success green.
  const accents = {
    success: '--green', danger: '--pink', warn: '--amber', info: '--cyan', neutral: '--muted',
  };
  const inks = {
    success: '--chip-success-ink',
    danger: '--chip-danger-ink',
    warn: '--chip-warn-ink',
    info: '--chip-info-ink',
    neutral: '--text',
  };
  for (const theme of THEMES) {
    const { vars, css } = kitCssFor(theme, ACCENT);
    const html = Object.keys(accents)
      .map((s) => `<div class="ui-toast ui-toast--${s}" id="t-${s}">`
        + '<div class="ui-toast__timer"></div><button class="ui-toast__action">Go</button></div>')
      .join('');
    const win = new JSDOM(
      `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
      + `<body>${html}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    const probes = [
      ['accent', '.ui-toast__timer', 'backgroundColor', accents],
      ['action ink', '.ui-toast__action', 'color', inks],
    ];
    for (const [what, sel, prop, tokens] of probes) {
      const seen = new Set();
      for (const [status, token] of Object.entries(tokens)) {
        const el = win.document.querySelector(`#t-${status} ${sel}`);
        const got = win.getComputedStyle(el)[prop];
        assert.equal(
          got, rgbOf(substitute(vars.get(token), vars)),
          `in ${theme}, the ${status} toast's ${what} resolved to ${got}, not ${token}. `
          + 'A contextual custom property has flattened — every toast is reporting one status\'s colour.',
        );
        seen.add(got);
      }
      assert.equal(
        seen.size, 5,
        `the five toast ${what}s collapsed to ${seen.size} colour(s) in ${theme}`,
      );
    }
    win.close();
  }
});

// #429 took the tinted disc out from behind the tick, so the mark now paints straight
// onto the panel wash and there is one ground to measure rather than two.
// This measures solid paint; browser pixel evidence covers the mark's size and animation.
test('the success-panel tick clears 3:1 against the panel wash in both themes', () => {
  for (const theme of THEMES) {
    const { css } = kitCssFor(theme, ACCENT);
    const win = new JSDOM(
      `<!doctype html><html data-theme="${theme}"><head><style>${css}</style></head>`
      + `<body>${card({ body: successPanel() })}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    try {
      const tick = win.document.querySelector('.ui-success__check .ui-sx__tick');
      assert.ok(tick, `${theme}: the panel must render its tick`);
      assert.equal(
        win.document.querySelector('.ui-success__check .ui-sx__disc'), null,
        `${theme}: a tinted disc is back behind the tick — the ground this measures is the wash alone`,
      );
      const ink = parseColour(win.getComputedStyle(tick).stroke);
      const wash = effectiveBackground(tick, win);
      assert.ok(ink && Array.isArray(wash), `${theme}: check paint must resolve`);
      assert.ok(ink[3] === 1, `${theme}: tick is opaque`);
      const measured = ratio(ink, wash);
      assert.ok(measured >= 3, `${theme}: success-panel tick on the panel wash is ${measured.toFixed(2)}:1`);
    } finally {
      win.close();
    }
  }
});

/* The page-sized mark, on every ground it actually reaches.
 *
 * why: docs/components.md#success-confirmations
 */
test('the page confirmation\'s mark clears 3:1 on every ground and mark it has', () => {
  const LAYOUTS = ['hero', 'split', 'compact'];
  const MARKS = ['line', 'circled'];
  let measured = 0;
  for (const theme of THEMES) {
    const { css } = kitCssFor(theme, ACCENT);
    const bodies = LAYOUTS.flatMap((layout) => MARKS.map((check) =>
      success({ layout, check, title: 'Saved', body: 'A receipt is on its way.' })));
    const win = new JSDOM(
      `<!doctype html><html data-theme="${theme}"><head><style>${css}</style></head>`
      + `<body>${bodies.join('')}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    try {
      const roots = [...win.document.querySelectorAll('.ui-sx')];
      assert.equal(roots.length, LAYOUTS.length * MARKS.length,
        `${theme}: expected one card per layout and mark, found ${roots.length}`);
      for (const root2 of roots) {
        const where = [...root2.classList].filter((c) => c.startsWith('ui-sx--')).join(' ');
        const strokes = [...root2.querySelectorAll('.ui-sx__tick, .ui-sx__circle')];
        assert.ok(strokes.length >= 1, `${theme} ${where}: the card drew no mark to measure`);
        assert.equal(root2.querySelector('.ui-sx__disc'), null,
          `${theme} ${where}: a tinted disc is back — the ground measured here is the surface alone`);
        for (const stroke of strokes) {
          const ink = parseColour(win.getComputedStyle(stroke).stroke);
          const ground = effectiveBackground(stroke, win);
          assert.ok(ink && Array.isArray(ground), `${theme} ${where}: mark paint must resolve`);
          assert.equal(ink[3], 1, `${theme} ${where}: the mark is opaque`);
          const r = ratio(ink, ground);
          assert.ok(r >= 3, `${theme} ${where}: the mark is ${r.toFixed(2)}:1 against its ground`);
          measured += 1;
        }
      }
    } finally {
      win.close();
    }
  }
  // 2 themes x 3 layouts x (1 line stroke + 2 circled strokes).
  assert.equal(measured, 2 * 3 * 3,
    `${measured} strokes measured, expected 18 — a layout or a mark stopped being covered`);
});

test('every chip ink/fill token pair clears AA, whether or not a story renders it', () => {
  const src = readFileSync(path.join(root, 'src/tokens/tokens.css'), 'utf8');
  const families = [...new Set([...src.matchAll(/--chip-([a-z]+)-ink\s*:/g)].map((m) => m[1]))];

  assert.ok(
    families.length >= 3,
    `only ${families.length} chip families were derived from src/tokens/tokens.css. A rename `
    + 'would make this test pass by matching nothing, which is the failure mode it exists to avoid.',
  );

  const problems = [];
  for (const theme of THEMES) {
    const { vars, css } = kitCssFor(theme, ACCENT);
    const probes = families
      .map((f) => `#chip-${f}{color:var(--chip-${f}-ink);background:var(--chip-${f}-fill)}`)
      .join('');
    const win = new JSDOM(
      `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style>`
      + `<style>${substitute(probes, vars)}</style></head><body>`
      + `${families.map((f) => `<span id="chip-${f}">x</span>`).join('')}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    const page = parseColour(substitute(vars.get('--bg'), vars));
    for (const family of families) {
      const cs = win.getComputedStyle(win.document.getElementById(`chip-${family}`));
      const ink = parseColour(cs.color);
      const fill = parseColour(cs.backgroundColor);
      if (!ink || !fill) {
        problems.push(`${theme} ${family}: ink or fill did not resolve (${cs.color} / ${cs.backgroundColor})`);
        continue;
      }
      const r = ratio(ink, composite(fill, page));
      if (r < AA_TEXT) problems.push(`${theme} --chip-${family}-ink on --chip-${family}-fill is ${r.toFixed(2)}`);
    }
    win.close();
  }
  assert.deepEqual(
    problems, [],
    `\n${problems.join('\n')}\n\nA chip pair is the ink and fill of a status badge. Both halves `
    + 'move together or neither does; fix the pair in src/tokens/tokens.css.',
  );
});

// ---- alternate accents: the same ledger causes, separately pinned cells ---
// Run locally: CONTRAST_ACCENTS=1 node --test --test-name-pattern='contrast ledger:' stories/contrast-light.test.js

test('the accent gate discovers every shipped accent', () => {
  assert.ok(ACCENTS.length >= 4, 'accent discovery lost a shipped accent');
  assert.deepEqual(Object.keys(ACCENT_LEDGER).sort(), ACCENTS.filter((a) => a !== ACCENT)
    .flatMap((accent) => THEMES.map((theme) => `${theme}/${accent}`)).sort(),
  'each shipped alternate cell needs a live ledger');
  for (const entry of ALTERNATE_CAUSES) {
    assert.ok(entry.why.length > 200, `ledger ${entry.id} needs a hand-written cause and owner`);
  }
});

for (const accent of ACCENTS.filter((a) => a !== ACCENT)) {
  for (const theme of THEMES) {
    test(`contrast ledger: ${theme}/${accent}`, {
      skip: process.env.CONTRAST_ACCENTS !== '1',
      // Allow for the shared setup and a full cell on busy local hosts.
      timeout: 600_000,
    }, async () => {
      const started = Date.now();
      const result = await walkStoriesParallel({ theme, accent, states: true });
      const findings = groupFindings(result.records);
      if (process.env.CONTRAST_LEDGER_REPORT === '1') {
        const measured = Object.fromEntries(ALTERNATE_CAUSES.flatMap((entry) => {
          const rows = findings.filter((f) => bucketsFor(f, ALTERNATE_CAUSES).includes(entry));
          return rows.length ? [[entry.id, [rows.length,
            Number(Math.min(...rows.map((f) => f.ratio)).toFixed(2))]]] : [];
        }));
        console.log(`CONTRAST_LEDGER ${JSON.stringify({
          cell: `${theme}/${accent}`, measured,
          unassigned: findings.filter((f) => bucketsFor(f, ALTERNATE_CAUSES).length !== 1).map(show),
        })}`);
      }
      console.log(`contrast alternate: ${theme}/${accent}, ${((Date.now() - started) / 1000).toFixed(2)} added seconds, ${result.stats.judged} pairs, ${findings.length} findings`);
      assert.deepEqual(result.problems, [], 'every alternate-accent story must render');
      // storyIds does not vary by theme — every story mounts regardless of which theme's CSS
      // it is read against — so the light walk's own catalogue is the right baseline for a
      // dark-accent cell too; probed directly, both themes' walks reach the same 197 stories.
      assert.deepEqual(result.stats.storyIds, walk.storyIds, 'each cell must reach the default catalogue');
      assert.ok(result.stats.judged > 2500, 'each cell must judge real pairs');
      assert.deepEqual(result.stats.uaBlue, [], 'alternate styles must resolve link colours');
      const expected = ACCENT_LEDGER[`${theme}/${accent}`] || {};
      for (const finding of findings) {
        const hits = bucketsFor(finding, ALTERNATE_CAUSES);
        assert.equal(hits.length, 1, `unledgered or ambiguous ${show(finding)}`);
        assert.ok(expected[hits[0].id], `new cause in ${theme}/${accent}: ${show(finding)}`);
      }
      for (const [id, [count, worst]] of Object.entries(expected)) {
        const rows = findings.filter((f) => bucketsFor(f, ALTERNATE_CAUSES).some((e) => e.id === id));
        assert.equal(rows.length, count, `${theme}/${accent} bucket ${id}:\n${rows.map(show).join('\n')}`);
        assert.ok(Math.min(...rows.map((f) => f.ratio)) >= worst - 0.005,
          `${theme}/${accent} bucket ${id} deepened below ${worst}:\n${rows.map(show).join('\n')}`);
      }
      assert.equal(findings.length, Object.values(expected).reduce((n, [count]) => n + count, 0));
    });
  }
}
