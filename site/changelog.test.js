import { test } from 'node:test';
import assert from 'node:assert/strict';
import { componentChips, isBreakingRelease, release } from './changelog.mjs';

test('componentChips links a known component to its Storybook story', () => {
  const html = componentChips(['Table']);
  assert.match(html, /class="comp" href="\/storybook\/\?path=\/story\/components-table--finance-data"/);
  assert.match(html, />Table<\/a>/);
});

test('componentChips renders an unknown component as a plain, unlinked pill', () => {
  const html = componentChips(['Shell']);
  assert.match(html, /<span class="comp plain">Shell<\/span>/);
  assert.doesNotMatch(html, /<a /);
});

test('componentChips returns empty string when there are no components', () => {
  assert.equal(componentChips(), '');
  assert.equal(componentChips([]), '');
});

test('componentChips escapes HTML in component names', () => {
  const html = componentChips(['<x>']);
  assert.match(html, /&lt;x&gt;/);
  assert.doesNotMatch(html, /<x>/);
});

test('isBreakingRelease detects a breaking change', () => {
  assert.equal(isBreakingRelease({ changes: [['fixed', 'x'], ['breaking', 'y']] }), true);
  assert.equal(isBreakingRelease({ changes: [['fixed', 'x']] }), false);
});

test('release shows a Breaking header badge and tag when any change is breaking', () => {
  const html = release({ v: '9.9.9', date: '2026-01-01', changes: [['breaking', 'Renamed a prop.', ['Table']]] });
  assert.match(html, /ui-badge--breaking/);
  assert.match(html, /tag tag--breaking/);
  assert.match(html, />Breaking<\/span>/);
});

test('release omits the Breaking badge when nothing is breaking', () => {
  const html = release({ v: '9.9.9', date: '2026-01-01', changes: [['fixed', 'x']] });
  assert.doesNotMatch(html, /ui-badge--breaking/);
});

import { parseContributors } from './changelog.mjs';

const AUTHORS_FIXTURE = { 'artur.sabirov@apliteni.com': { handle: 'asabirov', name: 'Artur Sabirov' } };

test('parseContributors dedupes by email and resolves a known handle', () => {
  const log = 'Artur Sabirov\tartur.sabirov@apliteni.com\nArtur Sabirov\tartur.sabirov@apliteni.com';
  const people = parseContributors(log, AUTHORS_FIXTURE);
  assert.equal(people.length, 1);
  assert.equal(people[0].handle, 'asabirov');
  assert.equal(people[0].url, 'https://github.com/asabirov');
  assert.equal(people[0].avatar, 'https://github.com/asabirov.png?size=48');
});

test('parseContributors drops bot accounts', () => {
  const log = 'dependabot[bot]\t49699333+dependabot[bot]@users.noreply.github.com';
  assert.deepEqual(parseContributors(log, AUTHORS_FIXTURE), []);
});

test('parseContributors falls back to initials for unknown authors', () => {
  const [p] = parseContributors('Jane Doe\tjane@example.com', AUTHORS_FIXTURE);
  assert.equal(p.handle, null);
  assert.equal(p.url, null);
  assert.equal(p.avatar, null);
  assert.equal(p.initials, 'JD');
  assert.equal(p.name, 'Jane Doe');
});

test('parseContributors orders by commit count desc', () => {
  const log = ['Jane Doe\tjane@example.com',
               'Artur Sabirov\tartur.sabirov@apliteni.com',
               'Artur Sabirov\tartur.sabirov@apliteni.com'].join('\n');
  const people = parseContributors(log, AUTHORS_FIXTURE);
  assert.equal(people[0].handle, 'asabirov');
  assert.equal(people[1].name, 'Jane Doe');
});

test('parseContributors returns empty array for empty input', () => {
  assert.deepEqual(parseContributors('', AUTHORS_FIXTURE), []);
});

test('parseContributors tiebreak orders by the displayed (canonical) name', () => {
  const authors = { 'z@example.com': { handle: 'zh', name: 'Zach Zimmerman' } };
  const log = 'Aaron Xray\tz@example.com\nBob Yankee\tbob@example.com';
  const people = parseContributors(log, authors);
  assert.equal(people[0].name, 'Bob Yankee');   // tie at 1 commit; B before Z by displayed name
  assert.equal(people[1].name, 'Zach Zimmerman');
});

import { contributorChips } from './changelog.mjs';

test('contributorChips renders an avatar image + handle link for a known author', () => {
  const html = contributorChips([{ name: 'Artur Sabirov', handle: 'asabirov',
    url: 'https://github.com/asabirov', avatar: 'https://github.com/asabirov.png?size=48', initials: 'AS' }]);
  assert.match(html, /<img class="av" src="https:\/\/github.com\/asabirov.png\?size=48"/);
  assert.match(html, /@asabirov/);
  assert.match(html, /class="who" href="https:\/\/github.com\/asabirov"/);
});

test('contributorChips renders an initials chip for an unknown author', () => {
  const html = contributorChips([{ name: 'Jane Doe', handle: null, url: null, avatar: null, initials: 'JD' }]);
  assert.match(html, /<span class="av ini">JD<\/span>/);
  assert.match(html, /Jane Doe/);
  assert.doesNotMatch(html, /<a /);
});

test('contributorChips returns empty string when there are no contributors', () => {
  assert.equal(contributorChips([]), '');
  assert.equal(contributorChips(), '');
});

test('release renders a contributor row when contributors are supplied', () => {
  const html = release({ v: '9.9.9', date: '2026-01-01', changes: [['fixed', 'x']] },
    [{ name: 'Artur Sabirov', handle: 'asabirov', url: 'https://github.com/asabirov',
       avatar: 'https://github.com/asabirov.png?size=48', initials: 'AS' }]);
  assert.match(html, /class="contrib"/);
  assert.match(html, /@asabirov/);
});

test('contributorChips escapes a quote in the avatar URL attribute', () => {
  const html = contributorChips([{ name: 'X', handle: 'x', url: 'https://github.com/x', avatar: 'https://a/"x', initials: 'X' }]);
  assert.match(html, /src="https:\/\/a\/&quot;x"/);
});

// ── #246: the page is scannable, and stays that way ─────────────────────────
//
// 41 releases carrying 143 changes reached the page as unbroken paragraphs —
// 7,837 words with no level between a version number and a 44-word median
// paragraph — over two defects underneath: 50 `**bold**` markers arriving as
// literal asterisks, and eleven releases badged Latest at once.
//
// Subjects are every change in RELEASES and the whole rendered page, swept
// rather than listed: a release joins the sweep by being written.
// why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
//
// These read the data and the emitted HTML, never a rendered box. jsdom
// resolves no layout and all three defects have an exact source form, so the
// source is what this reads. Not reached, therefore: whether the fold is
// legible, whether <details> is styled, and how any of it wraps.
import { RELEASES, marksOf, cmpVersion, splitChange, HEADLINE_MAX, changelogMain,
  parseIssues, issueChips } from './changelog.mjs';

const CHANGES = RELEASES.flatMap((r) => r.changes.map(([type, text]) => ({ v: r.v, type, text })));
const PAGE = changelogMain();
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const at = (c) => `v${c.v} ${c.type}`;

// Every gate below reads CHANGES or PAGE, and an empty one passes all of them.
// The count is what stops coverage shrinking to zero and staying green.
test('#246 the sweep reaches every change on the page', () => {
  assert.ok(RELEASES.length >= 41, `only ${RELEASES.length} releases swept — releases were removed, or this sweep stopped seeing them.`);
  assert.ok(CHANGES.length >= 143, `only ${CHANGES.length} changes swept — a change with no subject cannot fail a check.`);
  assert.equal((PAGE.match(/<section class="rel">/g) || []).length, RELEASES.length,
    'the page renders a different number of releases than RELEASES holds.');
});

// ── The badge is derived ────────────────────────────────────────────────────

test('#246 exactly one release is badged Latest, and it is the newest', () => {
  assert.equal((PAGE.match(/ui-badge--live/g) || []).length, 1,
    'Latest names a superlative, so exactly one release may carry it. Eleven did.');
  const { newest } = marksOf();
  const section = PAGE.split('<section class="rel">').find((s) => s.includes(`>v${newest}<`));
  assert.ok(section && section.includes('ui-badge--live'),
    `the single Latest badge is not on v${newest}, which is the newest release.`);
  assert.equal((PAGE.match(/is-latest/g) || []).length, 1,
    'the timeline dot marks a different set of releases than the badge does.');
});

test('#246 no release asserts a badge that can be derived', () => {
  const asserted = RELEASES.filter((r) => 'tag' in r).map((r) => r.v);
  assert.deepEqual(asserted, [],
    'a `tag` on an entry is a second copy of the ordering, and nothing clears the old one — '
    + 'which is how eleven releases came to claim Latest at once. Derive it in marksOf().');
});

test('#246 marksOf reads the versions, never the positions', () => {
  // A positional implementation — first element wins — passes every assertion
  // above, because RELEASES happens to be sorted. This is what kills it.
  assert.deepEqual(marksOf([{ v: '1.0.0' }, { v: '9.9.9' }, { v: '0.1.0' }]),
    { newest: '9.9.9', oldest: '0.1.0' });
  assert.deepEqual(marksOf([{ v: '0.9.0' }, { v: '0.10.0' }]).newest, '0.10.0',
    'versions compare numerically per part — 0.10.0 is newer than 0.9.0, though it sorts before it.');
});

test('#246 RELEASES is written newest-first, as the rail and the page copy both claim', () => {
  const outOfOrder = RELEASES.map((r) => r.v)
    .filter((v, i, a) => i > 0 && cmpVersion(a[i - 1], v) < 0)
    .map((v) => `v${v}`);
  assert.deepEqual(outOfOrder, [], 'these sit below a release older than themselves.');
});

// ── No literal markup reaches the reader ────────────────────────────────────

test('#246 no change carries markup the renderer does not format', () => {
  const marked = CHANGES.filter((c) => c.text.includes('**')).map(at);
  assert.deepEqual(marked, [],
    'fmt() formats `code` and nothing else, so ** reaches the reader as two asterisks. '
    + 'Fifty shipped that way. Write the emphasis out, or teach fmt() the syntax.');
  assert.ok(!PAGE.includes('**'), 'literal ** reached the rendered page.');
});

test('#246 the markup sweep can see a marker', () => {
  // The check above passes on an empty page too. This is what proves it reads.
  const page = release({ v: '9.9.9', date: '2026-01-01', changes: [['fixed', 'A **bold** claim.']] });
  assert.ok(page.includes('**'), 'the sweep reads emitted HTML, so a marker must survive the renderer to be caught there.');
});

// ── Summaries stay summaries ────────────────────────────────────────────────

test('#246 every summary stays inside the scanning ceiling', () => {
  const long = CHANGES
    .map((c) => ({ where: at(c), w: words(splitChange(c.text).headline) }))
    .filter((c) => c.w > HEADLINE_MAX)
    .map((c) => `${c.where} — ${c.w} words`);
  assert.deepEqual(long, [],
    `a change's first line is what the page is scanned by, and ${HEADLINE_MAX} words is the `
    + 'longest one written so far. Put the rest after a full stop, a colon or an em dash and '
    + 'it folds itself.');
});

test('#246 the ceiling is a number a summary can exceed', () => {
  // Nothing in RELEASES is over the ceiling, so the check above passes whether
  // or not it can measure. A summary built to breach it must be seen.
  const essay = `${'word '.repeat(HEADLINE_MAX + 5)}ends here.`;
  assert.ok(words(splitChange(essay).headline) > HEADLINE_MAX);
});

test('#246 the summary is a slice of the prose, never a rewrite', () => {
  const rewritten = CHANGES.filter((c) => {
    const text = c.text.trimEnd();
    const { headline, why } = splitChange(c.text);
    if (!text.startsWith(headline)) return true;
    if (why && !text.endsWith(why)) return true;
    // Only the separator that joined them may go missing between the halves.
    return !/^[\s:;—]*$/.test(text.slice(headline.length, text.length - why.length));
  }).map(at);
  assert.deepEqual(rewritten, [],
    'the summary is a slice of the authored string and the remainder is the rest of it. '
    + 'This page compresses by choosing what to show, never by writing something the release '
    + 'did not say.');
});

test('#246 the page shows the summary and nothing behind it', () => {
  assert.ok(!PAGE.includes('<details'),
    'the reasoning after the first sentence is not rendered — a consumer reading a changelog '
    + 'wants what changed, and the argument belongs in the issue that settled it.');
  const carried = CHANGES.filter((c) => splitChange(c.text).why).length;
  assert.ok(carried > 0,
    'no change carries reasoning past its first sentence, so this check has no subject — '
    + 'the prose was cut from RELEASES rather than left whole and unshown.');
  // The prose stays in RELEASES: the page chooses what to show, and the slice
  // check below is what proves the summary was never rewritten to compensate.
});

test('#246 issue refs are read out of git, never written beside an entry', () => {
  assert.deepEqual(parseIssues('feat: a (#12)\nfix: b (#3)\nchore: c (#12)'), [3, 12],
    'refs are deduped and ordered, so the row does not depend on commit order.');
  assert.deepEqual(parseIssues('no refs here at all'), [],
    'a release that closed nothing named gets no row rather than an empty one.');
  assert.deepEqual(parseIssues(''), []);
  assert.equal(issueChips([]), '');
  assert.equal(issueChips(), '');
  const row = issueChips([7, 41]);
  assert.match(row, /href="https:\/\/github\.com\/apliteni\/apliteni-ui\/issues\/7">#7</);
  assert.match(row, />#41</);
  // Sized past any cap somebody might reach for: v0.5.0 really did close 24.
  const many = Array.from({ length: 24 }, (_, i) => i + 1);
  assert.equal((issueChips(many).match(/class="iss"/g) || []).length, many.length,
    'refs were truncated. Nothing here is capped — a release that closed 24 issues says so, '
    + 'and a silent cap reads as coverage it does not have.');
});

test('#246 a summary is never empty, and never the whole essay', () => {
  const empty = CHANGES.filter((c) => !splitChange(c.text).headline.trim()).map(at);
  assert.deepEqual(empty, [], 'these render a change with no visible line at all.');
});
