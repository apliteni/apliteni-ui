/* Rule: a foreground/background pair the kit renders as text must clear WCAG AA,
 * or be named in the ledger below by a person who decided it is acceptable.
 *
 * There is no hand-maintained list of pairs. Every story in stories/ is rendered
 * in both themes, its real markup mounted in JSDOM against the kit's real
 * stylesheets with the token files substituted per theme, and every text-owning
 * element is measured against the background chain composited above it. Adding a
 * component adds its pairs with no human step. The resolver lives in
 * stories/lib/contrast.js and is unit-tested against hand-computed values in
 * stories/lib/contrast.test.js.
 *
 * WHAT THIS GATE ACTUALLY CHECKS, stated weakly on purpose. Not "the pairs the
 * kit renders" — "the pairs a story renders, resolved without layout, for text
 * only, in two themes at one accent". A gate that overstates itself is how
 * contrast came to be "verified visually" in the first place.
 *
 * WHAT IT WILL NOT CATCH:
 *
 *  - Anything layout decides. JSDOM has no layout. The gate uses DOM ancestry as
 *    a proxy for visual stacking, and the proxy is wrong wherever an element is
 *    painted over something that is not its ancestor: a toast over the page, a
 *    dropdown panel over a card, a sticky topbar over scrolled content, the
 *    drawer over its scrim. This is the largest gap and only a real browser
 *    closes it. Playwright is the honest upgrade path; it is a new dependency
 *    plus a browser download in CI, which is why it is not here.
 *  - Pseudo-elements. ::before / ::after are not computed. Most of the kit's are
 *    markers and bars, which carry no text — but the gate does not judge them.
 *  - Gradients and images. --ui-fb-pill-grad (src/styles/feedback.css), the
 *    brand gradient stops, the ambient glows (src/styles/base.css), the story
 *    avatars and the motion chips. Reported as unjudgeable, which is the honest
 *    answer rather than a fix or a silent pass.
 *  - filter, mix-blend-mode, backdrop-filter. .ui-btn--primary:hover uses
 *    filter: brightness(1.1) (src/styles/button.css); the gate reads the
 *    pre-filter colour.
 *  - Inactive components. Skipped on purpose per WCAG 1.4.3. A disabled control
 *    is exempt from the contrast requirement; it is not exempt from being
 *    readable, and nothing here checks that.
 *  - Anything with no story. The gate sees what the catalogue renders.
 *  - Non-text contrast (WCAG 1.4.11) — borders, focus rings, icon strokes. The
 *    3:1 rule is against ADJACENT colours, which needs geometry. Say so, because
 *    "the contrast gate is green" will otherwise be read as covering it.
 *  - Whether the colour is readable. The AA floor is a floor, not a verdict.
 *
 * JSDOM AND THE CASCADE. JSDOM applies AUTHOR rules by specificity and source
 * order faithfully, and that is the whole of the guarantee — it does not rank by
 * origin. There is one known exception, at the user-agent boundary: the UA
 * sheet's `a:link` out-ranks a same-specificity author `a` rule, so a linked
 * anchor reads back as the UA's rgb(0, 0, 238). The resolver rewrites the kit's
 * single bare `a` rule to carry :link/:visited, and a self-check below asserts
 * that colour appears nowhere in the walk. Do not repeat the unqualified claim
 * in stories/nav-cascade.test.js:11-16 that JSDOM's cascade matches a browser's;
 * it holds among author rules only.
 *
 * A custom property re-declared per component variant (--toast-accent, once per
 * toast status) would flatten to whichever status came first, repainting every
 * toast one colour. The resolver emits a variant-scoped copy of each consuming
 * declaration instead, immediately after the rule it specialises so a later
 * override of equal weight still wins. That relies on a base rule preceding its
 * variants, which is the kit's convention throughout; the five-toast self-check
 * below pins it.
 *
 * COST, HONESTLY. The walk is the most expensive thing in `npm test` and it runs
 * on every invocation. It is also the suite's critical path: `node --test` runs
 * files as parallel child processes, and this one outlasts all the others put
 * together. Measured on a 10-core laptop: the suite went from ~8s to ~25s when
 * this file landed, roughly a 3x increase, accepted knowingly.
 *
 * Cost grows with theme×accent cells, close to linearly but not quite — measured
 * 22.2s for the default 2 cells (~11.1s each) and 116.5s for all 8 (~14.6s each,
 * the difference being the larger heap). The eight-cell accent matrix is behind
 * CONTRAST_ACCENTS=1 and is OFF by default; turning it on finds 794 distinct
 * failing pairs against 214 here, because the accent families carry different
 * literals under Phoenix, Ocean and Emerald and would each need their own ledger
 * entries. Whether it ever runs in CI is undecided. stories/a11y.test.js made
 * the same trade explicitly, so the precedent is to say so rather than drop it
 * quietly. Anyone adding a cell should know they are buying ~12-15s of every
 * `npm test`, forever.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LEDGER IS WRITTEN BY HAND ON PURPOSE. DO NOT BUILD A SCRIPT THAT
 * REGENERATES IT.
 *
 * The mandatory `why` on every entry is the anti-automation device. A
 * regenerator would have to invent the sentence explaining why twenty-five dark
 * accent rows are acceptable debt, and it cannot, so the entries stay attached to
 * a person who decided. Contrast this with stories/danger-colour.test.js, whose
 * AT_REST_EXEMPT keys on a CSS SELECTOR PARSED OUT OF THE SOURCE and whose test
 * at :141 fails when an exemption stops naming a live rule. That ledger cannot
 * rot, because a rename breaks it. This one keys on a MEASUREMENT, which changes
 * whenever a token moves — so it needs a human, and the `why` is where the human
 * is.
 *
 * Counts are asserted with ===, never as a ceiling. A ceiling would let a fix in
 * one row mask a regression in another inside the same bucket. An exact count
 * costs a one-line edit whenever a story is added that renders an
 * already-failing component, and that edit is the point: a human then looks at
 * the new row. A total ceiling over everything means a finding that matches no
 * bucket has nowhere to hide.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import {
  AA_TEXT,
  composite,
  groupFindings,
  kitCssFor,
  parseColour,
  ratio,
  rgbOf,
  substitute,
  tokensFor,
  walkStories,
} from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const THEMES = ['dark', 'light'];
const ACCENT = 'default';
const ACCENTS = ['default', 'phoenix', 'ocean', 'emerald'];

// Two stories whose SUBJECT is colour itself. They render raw brand primitives
// and superseded token values on purpose, so they are cited by story rather than
// by token — the failing pairs are the documentation, not a defect in it.
const DOC_STORIES = {
  PALETTE: 'foundations/BrandPrimitives.stories.js:Palette',
  SIGNAL: 'foundations/SignalContrast.stories.js:Diagnosis',
};

/**
 * One entry per CAUSE, not per row.
 *
 * `fg` names a TOKEN, resolved per theme at run time, so moving a token's value
 * does not silently re-point a bucket at a different colour — it changes the
 * count, and the count is asserted exactly.
 */
const LEDGER = [
  {
    id: 'A',
    fg: '--pink',
    themes: ['dark'],
    bg: 'the hovered danger row of a table, tinted by --glow-pink',
    example: 'span.ui-badge.ui-badge--danger',
    count: 1,
    worst: 4.24,
    why: 'The danger signal painted on its own tint is the kit\'s only danger cue at rest, '
      + 'and #156 moved --pink in both themes so it clears the surfaces it is drawn on. What '
      + 'survives is the hover state of a danger badge inside an already-tinted table row: two '
      + 'washes of the same hue stacked, which the token move was never going to reach. It is a '
      + 'badge beside legible text, not the only carrier of the meaning, so it is debt rather '
      + 'than a defect. Fixing it means deciding whether a tinted row may tint its badges again.',
  },
  {
    id: 'B',
    fg: '--accent',
    themes: ['dark'],
    bg: 'tinted, hovered and selected accent surfaces in the dark theme',
    example: 'span.ui-nav__badge.is-accent',
    count: 25,
    worst: 3.20,
    why: 'The largest bucket in the ledger and the one with no owner. In the dark theme the '
      + 'brand accent is used both as the ink and, at low alpha, as the surface underneath it — '
      + 'a selected dropdown row, a nav badge, an inline code chip, the replay control in the '
      + 'motion playground. Ink and surface are the same hue, so the wash lifts the background '
      + 'toward the text and the pair closes. This is not in #131 or #149; it needs its own '
      + 'issue and its own decision, because the fix is either a darker accent ink for text on '
      + 'accent washes or dropping the wash. This ledger records it as debt; it does not decide it.',
  },
  {
    id: 'C',
    fg: '--green',
    themes: ['light'],
    bg: 'the success wash and plain white in the light theme',
    example: 'div.ui-sx__eyebrow',
    count: 6,
    worst: 3.34,
    why: 'Light --green has to stay recognisably green while carrying text, and green is the '
      + 'hue that darkens worst without turning into a colour nobody reads as success. #155 '
      + 'took the live pill and the badge over the line; what is left is the eyebrow on the '
      + 'success screen, the shell glyphs in a revealed snippet, and the toast action on its own '
      + 'soft wash. Each of these repeats a meaning that is already carried by an icon or by '
      + 'wording next to it, which is why they were allowed to lag the components that carry '
      + 'meaning alone. Closing them is #149\'s lane.',
  },
  {
    id: 'D',
    fg: '--signal-solid-ink',
    themes: ['light'],
    bg: 'the solid danger toast\'s fill, darkened under the hover wash',
    example: 'div.ui-toast.ui-toast--danger.ui-toast--solid > button.ui-toast__action',
    count: 1,
    worst: 4.40,
    why: 'A solid toast paints white ink on a saturated status fill, and its action button adds '
      + 'a further wash of that same ink on hover. #156 fixed the resting pairs by giving the '
      + 'solid statuses their own fill tokens; the hover wash is the one surface that was not '
      + 'part of that change, because it is generated by a color-mix rather than named by a '
      + 'token. It falls a hair short and only while the pointer is down on it. The fix is a '
      + 'hover treatment that darkens the fill instead of lightening the ink.',
  },
  {
    id: 'E',
    fg: '--cyan',
    themes: ['light'],
    bg: 'the info wash and plain white in the light theme',
    example: 'div.ui-toast.ui-toast--info.ui-toast--outline > button.ui-toast__action',
    count: 4,
    worst: 3.22,
    why: 'Cyan in the light theme is the same problem as green and for the same reason: the hue '
      + 'runs out of room before it runs out of contrast. #155 moved the info badge; the '
      + 'remainder are the outline toast\'s action, its hovered state, and the flag and URL '
      + 'fragments the snippet colours inside a shell command. The snippet fragments are syntax '
      + 'highlighting, where the colour is a second signal on top of text that is already '
      + 'readable in its own right. Closing them is #149\'s lane.',
  },
  {
    id: 'F',
    fg: '--purple-mid',
    themes: ['dark', 'light'],
    bg: '--glow-purple, under the "soon" badge and pill',
    example: 'span.ui-badge.ui-badge--soon',
    count: 4,
    worst: 3.94,
    why: 'The "soon" status is deliberately the quietest thing the kit can render — it marks '
      + 'something that does not exist yet and must not compete with what does. It is set in '
      + 'the mid purple on a purple wash, which is the same ink-on-its-own-hue problem as the '
      + 'accent bucket, chosen here on purpose. Nobody owns this: the decision to make is '
      + 'whether a status that means "not yet" is allowed to sit below the floor, and if not, '
      + 'whether it stops being purple or stops being washed.',
  },
  {
    id: 'H',
    fg: '--muted',
    themes: ['dark'],
    bg: 'the snippet\'s shell bar, which is lighter than the card it sits in',
    example: 'button.ui-snippet__copy',
    count: 1,
    worst: 4.00,
    why: 'The copy control on a snippet\'s title bar is muted so the command itself reads first, '
      + 'and the bar it sits on is lifted off the card for the same reason. The two moves are '
      + 'individually right and together they close the gap. It is a single control with a '
      + 'permanent visible label, so nothing is lost to a reader who does not resolve the ink — '
      + 'but it is one step from the floor and would be cheap to fix by darkening the bar '
      + 'rather than the ink. Unfiled.',
  },
  {
    id: 'P',
    story: DOC_STORIES.PALETTE,
    count: 130,
    worst: 1.06,
    why: 'The brand primitives page draws every raw ramp swatch with its hex printed on top of '
      + 'itself, in a fixed low-alpha black that stays put while the swatch behind it runs from '
      + 'near-black to white. Most of that run cannot clear the floor and is not supposed to: '
      + 'the label is documentation OF a colour, positioned on the colour it names so the reader '
      + 'can see them together. Making each label legible would mean flipping its ink partway '
      + 'down the ramp, which is a different page. This bucket exists so the other buckets are '
      + 'not buried under it.',
  },
  {
    id: 'S',
    story: DOC_STORIES.SIGNAL,
    count: 42,
    worst: 2.66,
    why: 'The signal-contrast page is the written record of why the signal tokens hold the '
      + 'values they hold, and it works by painting the values they USED to hold beside the ones '
      + 'they hold now. The failures it reports are the exhibits — pairs that were replaced '
      + 'precisely because they failed, kept on the page so the comparison is visible rather '
      + 'than asserted. A gate that demanded this page pass would delete the evidence. It is '
      + 'cited by story rather than by token for that reason: the tokens on it are historical, '
      + 'and matching them by name would tie this entry to values nobody ships.',
  },
];

// ---- the walk, once -------------------------------------------------------

const walk = { findings: [], stats: {}, problems: [], elapsed: 0, storyIds: new Set() };

before(async () => {
  const started = Date.now();
  const records = [];
  for (const theme of THEMES) {
    const r = await walkStories({ theme, accent: ACCENT, states: true });
    records.push(...r.records);
    walk.problems.push(...r.problems);
    for (const id of r.stats.storyIds) walk.storyIds.add(id);
    for (const [k, v] of Object.entries(r.stats)) {
      if (typeof v === 'number') walk.stats[k] = (walk.stats[k] || 0) + v;
    }
    walk.stats.uaBlue = (walk.stats.uaBlue || []).concat(r.stats.uaBlue);
  }
  walk.elapsed = Date.now() - started;
  walk.records = records;
  walk.findings = groupFindings(records);
});

/** The buckets a finding belongs to. Doc buckets and token buckets are disjoint
 *  by construction: a finding produced only by a documentation story can match
 *  nothing but that story's entry. */
function bucketsFor(finding) {
  const docOnly = [...finding.stories].every((s) => Object.values(DOC_STORIES).includes(s));
  return LEDGER.filter((e) => {
    if (e.story) return docOnly && [...finding.stories].every((s) => s === e.story);
    if (docOnly) return false;
    if (!e.themes.includes(finding.theme)) return false;
    const token = tokensFor(finding.theme, ACCENT).get(e.fg);
    return token != null && finding.fg === rgbOf(token);
  });
}

const show = (f) => `${f.ratio.toFixed(2)} (needs ${f.need}) ${f.key}\n      ${[...f.paths][0]}\n      in ${[...f.stories].join(', ')}`;

// ---- the gate -------------------------------------------------------------

test('every story renders — a story the walk cannot mount is not covered', () => {
  assert.equal(
    walk.problems.length, 0,
    `\n${walk.problems.join('\n')}\n\nA story that will not render silently drops out of the `
    + 'gate. Fix the story or the harness; do not skip it.',
  );
});

test('every finding falls in exactly one ledger bucket', () => {
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

for (const entry of LEDGER) {
  test(`ledger ${entry.id}: ${entry.story || `${entry.fg} on ${entry.bg}`}`, () => {
    const rows = walk.findings.filter((f) => bucketsFor(f).some((e) => e.id === entry.id));
    assert.equal(
      rows.length, entry.count,
      `\nbucket ${entry.id} holds ${rows.length} finding(s), the ledger says ${entry.count}.\n\n`
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

test('the ledger totals exactly what the walk found', () => {
  const total = LEDGER.reduce((n, e) => n + e.count, 0);
  assert.equal(
    walk.findings.length, total,
    `the walk found ${walk.findings.length} distinct failing pairs; the ledger accounts for `
    + `${total}. A finding that matches no bucket has nowhere to hide.`,
  );
});

// ---- anti-vacuity: a scan that matches nothing passes everything ----------

test('the ledger is not empty and every entry carries a hand-written why', () => {
  assert.ok(LEDGER.length >= 5, 'an emptied ledger would make every assertion above vacuous');
  for (const e of LEDGER) {
    assert.ok(e.why && e.why.length > 200, `ledger ${e.id} has no real \`why\` — see this file's header`);
    assert.ok(
      !/\d+(\.\d+)?\s*:\s*1|\b\d\.\d{2}\b/.test(e.why),
      `ledger ${e.id}'s \`why\` quotes a ratio. Numbers live in \`count\` and \`worst\`, which `
      + 'the assertions read; the prose is about the cause and must survive a token moving.',
    );
  }
});

test('every ledger entry still names something the kit renders', () => {
  for (const e of LEDGER) {
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
    assert.ok(tokensFor(e.themes[0], ACCENT).has(e.fg), `ledger ${e.id} names token ${e.fg}, which is gone`);
  }
});

test('the walk actually walked — a scan that finds nothing must not pass', () => {
  assert.ok(walk.stats.judged > 5000, `only ${walk.stats.judged} pairs were judged; the walk is not reaching the kit`);
  assert.ok(walk.stats.stories > 150, `only ${walk.stats.stories} story renders across both themes`);
  assert.ok(walk.findings.length > 0, 'the walk found nothing at all, which means it is measuring nothing');
  assert.ok(
    walk.stats.unjudgeable > 0,
    'no element reported an image or gradient background — the unjudgeable path is dead code, '
    + 'which means gradients are being silently composited instead',
  );
});

// ---- self-checks: does the resolver reach the real cascade? ---------------

test("the dark theme's body text resolves to its known ratio", () => {
  const vars = tokensFor('dark', ACCENT);
  assert.equal(vars.get('--text'), '#e9e7f0');
  assert.equal(vars.get('--bg'), '#16151f');
  const r = ratio(parseColour(vars.get('--text')), parseColour(vars.get('--bg')));
  assert.ok(Math.abs(r - 14.7725) < 0.005, `--text on --bg resolved to ${r}, not the known 14.77`);
});

test('no computed colour anywhere in the walk is the user-agent link blue', () => {
  // Guards the A2 rewrite. Before it, three table links reported rgb(0, 0, 238)
  // and produced false failures at the bottom of the list.
  assert.deepEqual(
    walk.stats.uaBlue, [],
    'an anchor resolved to JSDOM\'s UA blue instead of the kit\'s colour — expandAnchors is no '
    + 'longer reaching the bare `a` rule in src/styles/base.css',
  );
});

test('a color-mix background resolves to a translucent colour, not to transparent', () => {
  assert.ok(
    walk.stats.colorMixTranslucent > 0,
    'nothing in the walk composited a translucent layer. Every tinted surface in the kit is a '
    + 'color-mix; if none resolved, the backgrounds being measured are not the real ones',
  );
});

test('the five toast statuses resolve to five different accents', () => {
  // Guards the A1 rewrite. Before it, --toast-accent flattened first-wins and
  // all five statuses reported the success green.
  const expected = {
    success: '--green', danger: '--pink', warn: '--amber', info: '--cyan', neutral: '--muted',
  };
  for (const theme of THEMES) {
    const { vars, css } = kitCssFor(theme, ACCENT);
    const html = Object.keys(expected)
      .map((s) => `<div class="ui-toast ui-toast--${s}" id="t-${s}"><button class="ui-toast__action">Go</button></div>`)
      .join('');
    const win = new JSDOM(
      `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
      + `<body>${html}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    const seen = new Set();
    for (const [status, token] of Object.entries(expected)) {
      const el = win.document.querySelector(`#t-${status} .ui-toast__action`);
      const got = win.getComputedStyle(el).color;
      assert.equal(
        got, rgbOf(vars.get(token)),
        `in ${theme}, the ${status} toast's action resolved to ${got}, not ${token}. `
        + 'A contextual custom property has flattened — every toast is reporting one status\'s colour.',
      );
      seen.add(got);
    }
    assert.equal(seen.size, 5, `the five toast statuses collapsed to ${seen.size} colour(s) in ${theme}`);
    win.close();
  }
});

test('the walk stays inside its wall-clock budget', () => {
  // Measured ~24s for the two default cells run alone on a 10-core laptop, and
  // ~30s inside `npm test`, where it shares those cores with 21 other files.
  // 60s is headroom for a slower CI box without hiding a doubling.
  console.log(
    `contrast walk: ${(walk.elapsed / 1000).toFixed(1)}s for ${THEMES.length} theme×accent cell(s), `
    + `${walk.stats.judged} pairs judged, ${walk.findings.length} distinct failures`,
  );
  assert.ok(
    walk.elapsed < 60000,
    `the contrast walk took ${(walk.elapsed / 1000).toFixed(1)}s. It is the critical path in `
    + '`npm test` and sets the whole suite\'s wall clock. '
    + '`npm test`; something has made it much more expensive, or a cell was added without '
    + 'anyone costing it.',
  );
});

// ---- the walker's structural blind spot ----------------------------------

test('every chip ink/fill token pair clears AA, whether or not a story renders it', () => {
  // The walk sees what the catalogue renders. A token pair that no story puts on
  // screen is invisible to it — and the chip pairs exist precisely so a status
  // badge can be built without reaching for a raw signal token, which means a
  // new consumer can appear long after the pair was last looked at. Derived from
  // token NAMES so a family added to tokens.css is judged with no edit here.
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
    // Mounted rather than parsed: a dark chip fill is a color-mix(), and JSDOM
    // is what resolves that into a colour with an alpha channel.
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

// ---- the accent matrix, off by default -----------------------------------

test('every theme × accent cell, behind CONTRAST_ACCENTS=1', { skip: !process.env.CONTRAST_ACCENTS }, async () => {
  const records = [];
  for (const theme of THEMES) {
    for (const accent of ACCENTS) {
      const r = await walkStories({ theme, accent, states: true });
      records.push(...r.records);
    }
  }
  const found = groupFindings(records);
  // The accent families carry different literals under Phoenix, Ocean and
  // Emerald, so the default ledger cannot account for these. This asserts only
  // that the matrix runs and still measures something — per-accent entries are
  // an undecided question, recorded in the plan, not smuggled in here.
  assert.ok(found.length >= walk.findings.length, 'the matrix found fewer pairs than the two default cells');
  console.log(`CONTRAST_ACCENTS: ${THEMES.length * ACCENTS.length} cells, ${found.length} distinct failing pairs`);
});
