# Changelog: Components, Breaking Flags & Contributors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `ui.apli.tech/changelog`, show per-change component deeplinks into Storybook, a breaking-change tag + release-header badge, and a per-release contributor row derived automatically from git tags.

**Architecture:** Extend the hand-authored `site/changelog.mjs` (data + string renderers) with small pure helpers (`componentChips`, `parseContributors`, `contributorChips`, `isBreakingRelease`). `site/build.mjs` runs `git log` between version tags (guarded by try/catch) and feeds the derived contributors into `changelogMain(contributorsByVersion)`. New CSS goes into `site/changelog.html`'s inline `<style>`.

**Tech Stack:** Vanilla ESM (Node ≥20, `"type": "module"`), `node --test` + `node:assert/strict`, no new dependencies.

## Global Constraints

- Node ≥ 20; package is `"type": "module"` — all files are ESM (`.js`/`.mjs` both ESM).
- **No new npm dependencies.** Git access via `node:child_process` only.
- All user-visible strings pass through the existing `fmt()` HTML-escaper in `changelog.mjs`.
- Component chip href format: `/storybook/?path=/story/<storyId>`.
- Contributor avatar URL: `https://github.com/<handle>.png?size=48`; profile URL: `https://github.com/<handle>`.
- Bot filter: drop any author whose name or email contains `[bot]` (case-insensitive).
- The build must **never fail** because git/tags are unavailable — every git call is wrapped so a missing tag yields no contributors for that release.
- Reuse existing design tokens only (`--purple-mid`, `--glow-purple`, `--pink`, `--glow-pink`, `--surface-2`, `--surface-3`, `--border`, `--border-strong`, `--accent-strong`, `--muted`, `--dim`, `--strong`, `--font-sans`). No new color literals except: the initials-avatar gradient `linear-gradient(135deg,#6a2dcc,#3b9dff)`, and `#fff` for text sitting on a solid accent fill (the `.tag--breaking` white-on-pink pill approved in the mock — there is no on-accent token in the design system).
- Test files match the repo convention `*.test.js` (see `src/components/feedback.test.js`).

---

## File Structure

- `site/changelog.mjs` — data (`RELEASES`) + all render helpers + pure `parseContributors`. Modified.
- `site/build.mjs` — orchestration: derive contributors from git, pass to renderer. Modified.
- `site/changelog.html` — page shell + inline CSS. Modified (CSS only).
- `site/changelog.test.js` — unit tests. Created.

---

### Task 1: Component deeplink chips

**Files:**
- Modify: `site/changelog.mjs` (add `COMPONENTS`, `STORYBOOK`, `componentChips`; annotate `RELEASES`; wire into `release()`)
- Modify: `site/changelog.html` (add `.chips` / `.comp` CSS)
- Create: `site/changelog.test.js`

**Interfaces:**
- Produces: `export const componentChips = (names?: string[]) => string` — returns `''` for empty/undefined; otherwise `<span class="chips">…</span>` with one `<a class="comp" href="/storybook/?path=/story/ID">Name</a>` per known name and `<span class="comp plain">Name</span>` per unknown name. Names are HTML-escaped via `fmt`.

- [ ] **Step 1: Write the failing test**

Create `site/changelog.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { componentChips } from './changelog.mjs';

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test site/changelog.test.js`
Expected: FAIL — `componentChips` is not exported (`SyntaxError` / `undefined`).

- [ ] **Step 3: Add the registry + helper to `site/changelog.mjs`**

Immediately after the `RELEASES` array (before the `TAG` const), add:

```js
// Component display name → Storybook story id (title kebab + first export).
// A name absent here renders as a plain, unlinked chip.
const COMPONENTS = {
  Table:     'components-table--finance-data',
  Badge:     'components-badge-status--badges',
  Button:    'components-button--playground',
  Card:      'components-card--variants',
  Callout:   'components-callout-toast--callouts',
  Inputs:    'components-inputs--textfields',
  Segmented: 'components-segmented-control--playground',
  Snippet:   'components-code-snippet--shell',
  Switch:    'components-switch-checkbox--switches',
  Topbar:    'components-topbar--full',
  Feedback:  'components-feedback--default',
};

const STORYBOOK = (id) => `/storybook/?path=/story/${id}`;
```

Then, after the `fmt` definition (it depends on `fmt`), add:

```js
// Per-change component chips: known → Storybook deeplink, unknown → plain pill.
export const componentChips = (names) => {
  if (!names || !names.length) return '';
  const chip = (n) => COMPONENTS[n]
    ? `<a class="comp" href="${STORYBOOK(COMPONENTS[n])}">${fmt(n)}</a>`
    : `<span class="comp plain">${fmt(n)}</span>`;
  return `<span class="chips">${names.map(chip).join('')}</span>`;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test site/changelog.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire chips into the release renderer**

In `site/changelog.mjs`, the `release()` function's change-line map currently reads:

```js
        ${r.changes.map(([t, text]) => `<li><span class="tag tag--${TAG[t].cls}">${TAG[t].label}</span><span>${fmt(text)}</span></li>`).join('')}
```

Replace it with (adds the optional 3rd tuple element + chips):

```js
        ${r.changes.map(([t, text, comps]) => `<li><span class="tag tag--${TAG[t].cls}">${TAG[t].label}</span><span>${fmt(text)}${componentChips(comps)}</span></li>`).join('')}
```

- [ ] **Step 6: Annotate real releases with their components**

In `site/changelog.mjs`, add the 3rd tuple element to changes that map to a real component story (leave others as 2-tuples). Apply exactly these:

```js
// v0.2.4
['fixed', 'Active segmented pill now sits inside its track — the heavy card shadow was spilling past the edge and reading as overflow. New tight `--shadow-seg` token.', ['Segmented']],
// v0.2.3
['added', 'Gradient-bars busy loader on buttons — the button is disabled while it works.', ['Button']],
// v0.2.2
['added', '`--accent-strong` token — primary buttons now clear WCAG AA contrast.', ['Button']],
['added', '`--seg-active-bg` token — the active segmented pill reads clearly in dark.', ['Segmented']],
['fixed', 'Card grids no longer misalign — spacing moved to `.ui-card-stack` (the child margin leaked into rows).', ['Card']],
```

Leave all other change entries unchanged.

- [ ] **Step 7: Add chip CSS to `site/changelog.html`**

Inside the `<style>` block, immediately before the closing `@media (max-width: 560px)` rule, add:

```css
  .chips { display: inline-flex; flex-wrap: wrap; gap: 6px; margin-left: 2px; vertical-align: baseline; }
  .comp { display: inline-flex; align-items: center; font: 600 12px/1 var(--font-sans); color: var(--purple-mid); background: var(--glow-purple); border: 1px solid transparent; padding: 5px 10px; border-radius: 7px; text-decoration: none; transition: .14s; }
  .comp:hover { border-color: var(--accent-strong); color: var(--strong); }
  .comp.plain { color: var(--muted); background: var(--surface-3); cursor: default; }
```

- [ ] **Step 8: Build and verify a chip appears in the output**

Run: `node site/build.mjs && grep -o 'class="comp" href="/storybook/?path=/story/components-segmented-control--playground"' site/public/changelog/index.html | head -1`
Expected: prints the matched string (a Segmented chip rendered into the page). Build log prints `site: wrote index.html + changelog/ + kit.css`.

- [ ] **Step 9: Commit**

```bash
git add site/changelog.mjs site/changelog.html site/changelog.test.js
git commit -m "feat(changelog): per-change component deeplink chips"
```

---

### Task 2: Breaking change tag + release-header badge

**Files:**
- Modify: `site/changelog.mjs` (add `TAG.breaking`, `isBreakingRelease`, `BREAKING_BADGE`; `export` `release`; render badge)
- Modify: `site/changelog.html` (add `.tag--breaking` + `.ui-badge--breaking` CSS)
- Modify: `site/changelog.test.js` (append tests)

**Interfaces:**
- Consumes: `componentChips` (Task 1).
- Produces:
  - `export const isBreakingRelease = (r) => boolean` — true when any change tuple's type is `'breaking'`.
  - `export const release = (r, contributors?) => string` — the per-release `<section>` markup. (The `contributors` param is unused until Task 4; safe to omit.)

- [ ] **Step 1: Write the failing tests**

Append to `site/changelog.test.js`:

```js
import { isBreakingRelease, release } from './changelog.mjs';

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test site/changelog.test.js`
Expected: FAIL — `isBreakingRelease` / `release` not exported.

- [ ] **Step 3: Add the breaking tag type**

In `site/changelog.mjs`, in the `TAG` object, add a `breaking` entry:

```js
const TAG = {
  added: { label: 'Added', cls: 'added' },
  fixed: { label: 'Fixed', cls: 'fixed' },
  changed: { label: 'Changed', cls: 'changed' },
  removed: { label: 'Removed', cls: 'removed' },
  breaking: { label: 'Breaking', cls: 'breaking' },
};
```

- [ ] **Step 4: Add the badge constant + predicate, and render them**

In `site/changelog.mjs`, just above the `release` definition, add:

```js
export const isBreakingRelease = (r) => r.changes.some(([t]) => t === 'breaking');

const BREAKING_BADGE = `<span class="ui-badge ui-badge--breaking">` +
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>` +
  `Breaking</span>`;
```

Change the `release` declaration from `const release = (r) => `` to:

```js
export const release = (r, contributors) => `
```

Then in the header, after the `first` badge line, add the breaking badge line. The header block becomes:

```js
        ${r.tag === 'latest' ? '<span class="ui-badge ui-badge--live">Latest</span>' : ''}
        ${r.tag === 'first' ? '<span class="ui-badge ui-badge--soon">First</span>' : ''}
        ${isBreakingRelease(r) ? BREAKING_BADGE : ''}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test site/changelog.test.js`
Expected: PASS (7 tests total).

- [ ] **Step 6: Add breaking CSS to `site/changelog.html`**

In the `<style>` block, right after the `.tag--removed` rule, add:

```css
  .tag--breaking { color: #fff; background: var(--pink); }
  .ui-badge--breaking { color: var(--pink); background: var(--glow-pink); display: inline-flex; align-items: center; gap: 5px; }
  .ui-badge--breaking svg { width: 11px; height: 11px; }
```

- [ ] **Step 7: Commit**

```bash
git add site/changelog.mjs site/changelog.html site/changelog.test.js
git commit -m "feat(changelog): breaking-change tag + release-header badge"
```

---

### Task 3: Contributor parser (pure, git-log → people)

**Files:**
- Modify: `site/changelog.mjs` (add `AUTHORS`, `initialsOf`, `parseContributors`)
- Modify: `site/changelog.test.js` (append tests)

**Interfaces:**
- Produces: `export const parseContributors = (logText: string, authors = AUTHORS) => Array<{ name, handle: string|null, url: string|null, avatar: string|null, initials: string }>`. Input `logText` is `git log --format=%an%x09%ae` output (tab-separated `name\temail` per line). Dedupes by lowercased email, drops `[bot]` accounts, orders by commit count desc then name.

- [ ] **Step 1: Write the failing tests**

Append to `site/changelog.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test site/changelog.test.js`
Expected: FAIL — `parseContributors` not exported.

- [ ] **Step 3: Implement the parser**

In `site/changelog.mjs`, add near the top (after the `RELEASES`/`COMPONENTS` block, anywhere before `changelogMain`):

```js
// GitHub handle map — resolves a commit email to an avatar + profile.
// Unknown authors fall back to an initials chip and plain name.
const AUTHORS = {
  'artur.sabirov@apliteni.com': { handle: 'asabirov', name: 'Artur Sabirov' },
};

const initialsOf = (name) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

// Parse `git log --format=%an%x09%ae` output into deduped, bot-filtered contributors.
export const parseContributors = (logText, authors = AUTHORS) => {
  const seen = new Map(); // email → { name, count }
  for (const line of logText.split('\n')) {
    if (!line.trim()) continue;
    const [name, email] = line.split('\t');
    if (!name || !email) continue;
    if (/\[bot\]/i.test(name) || /\[bot\]/i.test(email)) continue;
    const key = email.toLowerCase();
    const cur = seen.get(key) || { name, count: 0 };
    cur.count += 1;
    seen.set(key, cur);
  }
  return [...seen.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
    .map(([email, { name }]) => {
      const a = authors[email];
      if (a) return {
        name: a.name, handle: a.handle,
        url: `https://github.com/${a.handle}`,
        avatar: `https://github.com/${a.handle}.png?size=48`,
        initials: initialsOf(a.name),
      };
      return { name, handle: null, url: null, avatar: null, initials: initialsOf(name) };
    });
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test site/changelog.test.js`
Expected: PASS (12 tests total).

- [ ] **Step 5: Commit**

```bash
git add site/changelog.mjs site/changelog.test.js
git commit -m "feat(changelog): parse contributors from git log (pure)"
```

---

### Task 4: Contributor chips + wire into renderer

**Files:**
- Modify: `site/changelog.mjs` (add `contributorChips`; render in `release`; `changelogMain(contributorsByVersion)`)
- Modify: `site/changelog.html` (add `.contrib` / `.who` / `.av` CSS)
- Modify: `site/changelog.test.js` (append tests)

**Interfaces:**
- Consumes: `parseContributors` output shape (Task 3), `release` (Task 2).
- Produces:
  - `export const contributorChips = (people?) => string` — `''` when empty; otherwise `<div class="contrib"><span class="people">…</span></div>` with one chip per person (avatar `<img>` if `avatar`, else `.av.ini` initials; `<a class="who">` if `url`, else `<span class="who">`).
  - `export const changelogMain = (contributorsByVersion = {}) => string` — maps `RELEASES`, passing `contributorsByVersion[r.v]` into `release`.

- [ ] **Step 1: Write the failing tests**

Append to `site/changelog.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test site/changelog.test.js`
Expected: FAIL — `contributorChips` not exported; `release` renders no `.contrib`.

- [ ] **Step 3: Implement `contributorChips`**

In `site/changelog.mjs`, add after `parseContributors`:

```js
// Per-release contributor row: avatar (photo or initials) + handle/name chip.
export const contributorChips = (people) => {
  if (!people || !people.length) return '';
  const who = (p) => {
    const av = p.avatar
      ? `<img class="av" src="${p.avatar}" alt="" width="22" height="22">`
      : `<span class="av ini">${fmt(p.initials)}</span>`;
    const label = p.handle ? `@${fmt(p.handle)}` : fmt(p.name);
    return p.url
      ? `<a class="who" href="${p.url}">${av}${label}</a>`
      : `<span class="who">${av}${label}</span>`;
  };
  return `<div class="contrib"><span class="people">${people.map(who).join('')}</span></div>`;
};
```

- [ ] **Step 4: Render the row inside `release` and thread contributors through `changelogMain`**

In `release`, immediately after the closing `</ul>` of `rel__list` and before the closing `</div>` of `rel__body`, add:

```js
      ${contributorChips(contributors)}
```

Change the final export from:

```js
export const changelogMain = () => RELEASES.map(release).join('');
```

to:

```js
export const changelogMain = (contributorsByVersion = {}) =>
  RELEASES.map((r) => release(r, contributorsByVersion[r.v])).join('');
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test site/changelog.test.js`
Expected: PASS (16 tests total).

- [ ] **Step 6: Add contributor CSS to `site/changelog.html`**

In the `<style>` block, before the `@media (max-width: 560px)` rule (after the `.comp` rules from Task 1), add:

```css
  .contrib { display: flex; align-items: center; gap: 10px; margin-top: 18px; padding-top: 16px; border-top: 1px dashed var(--border); }
  .contrib .people { display: flex; flex-wrap: wrap; gap: 8px; }
  .who { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-2); border: 1px solid var(--border); padding: 3px 10px 3px 3px; border-radius: 999px; font-size: 13px; color: var(--dim); text-decoration: none; }
  .who:hover { border-color: var(--border-strong); color: var(--strong); }
  .av { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; background: var(--surface-3); }
  .av.ini { display: grid; place-items: center; font: 700 9px/1 var(--font-sans); color: #fff; background: linear-gradient(135deg,#6a2dcc,#3b9dff); }
```

- [ ] **Step 7: Commit**

```bash
git add site/changelog.mjs site/changelog.html site/changelog.test.js
git commit -m "feat(changelog): contributor avatar chips per release"
```

---

### Task 5: Derive contributors from git at build time

**Files:**
- Modify: `site/build.mjs` (compute `contributorsByVersion`, pass to `changelogMain`)

**Interfaces:**
- Consumes: `RELEASES`, `parseContributors`, `changelogMain(contributorsByVersion)` from `site/changelog.mjs`.
- Produces: no new exports — wires git-derived contributors into the emitted `site/public/changelog/index.html`.

- [ ] **Step 1: Extend the changelog import**

In `site/build.mjs`, change:

```js
import { changelogMain } from './changelog.mjs';
```

to:

```js
import { changelogMain } from './changelog.mjs';
import { RELEASES, parseContributors } from './changelog.mjs';
import { execFileSync } from 'node:child_process';
```

- [ ] **Step 2: Derive contributors between version tags (guarded)**

In `site/build.mjs`, add immediately before the `const changelog = …` line:

```js
// Contributors per release, derived from git between version tags. RELEASES is
// newest-first, so a release's predecessor tag sits at a HIGHER index. Every git
// call is guarded: a missing tag or absent git leaves that release without a
// contributor row and never fails the build.
const hasTag = (t) => {
  try { execFileSync('git', ['rev-parse', '--verify', `refs/tags/${t}`], { stdio: 'ignore' }); return true; }
  catch { return false; }
};
const contributorsByVersion = {};
RELEASES.forEach((r, i) => {
  try {
    const tag = `v${r.v}`;
    if (!hasTag(tag)) return;
    let prevTag = null;
    for (let j = i + 1; j < RELEASES.length; j++) {
      const t = `v${RELEASES[j].v}`;
      if (hasTag(t)) { prevTag = t; break; }
    }
    const range = prevTag ? `${prevTag}..${tag}` : tag;
    const out = execFileSync('git', ['log', '--format=%an%x09%ae', range], { encoding: 'utf8' });
    const people = parseContributors(out);
    if (people.length) contributorsByVersion[r.v] = people;
  } catch { /* no contributors for this release */ }
});
```

- [ ] **Step 3: Pass contributors into the renderer**

In `site/build.mjs`, change:

```js
  .replace('{{MAIN}}', () => changelogMain()));
```

to:

```js
  .replace('{{MAIN}}', () => changelogMain(contributorsByVersion)));
```

- [ ] **Step 4: Build and verify contributors + chips render**

Run: `node site/build.mjs && grep -c 'class="who"' site/public/changelog/index.html && grep -c 'class="comp"' site/public/changelog/index.html`
Expected: build log prints `site: wrote …`; both greps print a count `>= 1` (contributor chips and component chips present in the generated page).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all `node --test` files (existing `feedback.test.js` + new `changelog.test.js`, 16 changelog tests).

- [ ] **Step 6: Visually confirm in the browser (optional but recommended)**

Run: `open site/public/changelog/index.html`
Expected: newest release shows component chips inline on change lines; any breaking release shows the header `Breaking` badge + red tag; each release with derived commits shows an avatar-chip contributor row.

- [ ] **Step 7: Commit**

```bash
git add site/build.mjs
git commit -m "build(changelog): derive contributors from git tags"
```

---

## Self-Review

**Spec coverage:**
- Breaking type + tag + header badge → Task 2. ✓
- Per-change component deeplink chips (known → link, unknown → plain) → Task 1. ✓
- `COMPONENTS` registry → Task 1. ✓
- `parseContributors` (dedupe, bot filter, handle map, initials fallback, ordering) → Task 3. ✓
- Contributor row render (avatar/initials, no label) → Task 4. ✓
- Git-derived contributors at build time, guarded → Task 5. ✓
- `changelogMain(contributorsByVersion)` signature → Task 4 (defined), Task 5 (consumed). ✓
- Tests (parser, chips, breaking-header) + build smoke → Tasks 1–5. ✓
- HTML escaping via `fmt` → used in `componentChips` (T1) and `contributorChips` (T4). ✓
- Out of scope: stale-data backfill — correctly omitted; guarded git handles the missing `v0.2.4` tag. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows full code. ✓

**Type consistency:** `parseContributors` returns `{ name, handle, url, avatar, initials }`; `contributorChips` and its tests consume exactly those fields. `componentChips(names?)`, `isBreakingRelease(r)`, `release(r, contributors?)`, `changelogMain(contributorsByVersion={})` names match across tasks and tests. Chip href `/storybook/?path=/story/<id>` consistent between spec, registry, and Task 1 test. ✓
