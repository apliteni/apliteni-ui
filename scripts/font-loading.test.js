/* Rule: every place that loads a font loads every family the tokens name.
 *
 * The kit ships CSS and no fonts, so a family only exists on a page because
 * something on that page asked for it. A token whose family never loads does not
 * fail — it resolves to the next entry in the stack and renders in system-ui,
 * which reads as a rendering bug and sends the next person into the cascade. #253
 * doubled the number of ways to make that mistake by adding a second family, and
 * four separate files load fonts today, none of which knows about the others.
 *
 * The families are READ OUT of src/tokens/tokens.css rather than written here: a
 * role whose first family is quoted is a webfont and has to be loaded, and one
 * that starts with a system keyword (--font-mono) is not. Add a third role
 * tomorrow and this gate has an opinion about it without being edited.
 *
 * why: docs/specification.md#typefaces */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

/* Built output is not a subject: CI runs this before `build-storybook` and never
 * runs site/build.mjs, so a gate reading them would fail in CI — and one that
 * skipped when they were absent would drop coverage in silence. */
const SKIP = new Set(['node_modules', '.git', 'site/public', 'storybook-static', 'react/dist']);

const filesUnder = (dir = '.') => {
  const out = [];
  for (const name of readdirSync(path.join(root, dir)).sort()) {
    const rel = dir === '.' ? name : `${dir}/${name}`;
    if (SKIP.has(rel) || name.startsWith('.git')) continue;
    if (statSync(path.join(root, rel)).isDirectory()) out.push(...filesUnder(rel));
    else out.push(rel);
  }
  return out;
};

/** The webfonts the kit's roles name: a quoted first family in a `--font-*`. */
const webfonts = () => {
  const tokens = read('src/tokens/tokens.css');
  const roles = [...tokens.matchAll(/^\s*(--font-[\w-]+)\s*:\s*([^;]+);/gm)];
  assert.ok(
    roles.length >= 2,
    `read ${roles.length} --font-* roles out of src/tokens/tokens.css — the parser is broken, not `
    + 'the kit. A gate that found no families would pass over every page that loads none.',
  );
  return roles
    .map(([, role, stack]) => [role, stack.split(',')[0].trim()])
    .filter(([, first]) => /^['"]/.test(first))
    .map(([role, first]) => [role, first.replace(/^['"]|['"]$/g, '')]);
};

/** Every Google Fonts stylesheet URL in the tree, wherever it was written. */
const loaders = () => {
  const found = [];
  for (const rel of filesUnder()) {
    let text;
    try { text = read(rel); } catch { continue; }
    if (!text.includes('fonts.googleapis.com/css2')) continue;
    for (const m of text.matchAll(/fonts\.googleapis\.com\/css2\?([^"'\s`)]*)/g)) {
      // A URL split across source lines is concatenated back: preview.js builds
      // its href out of two string literals, and half a URL parses as half a
      // font list — which is exactly the state this gate exists to refuse.
      const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 200);
      const glued = /^\s*['"`]?\s*\+?\s*['"`]([^'"`]*)/.exec(tail);
      const query = m[1] + (glued && glued[1].startsWith('&') ? glued[1] : '');
      found.push({ where: `${rel}:${text.slice(0, m.index).split('\n').length}`, query });
    }
  }
  return found;
};

/** `family=IBM+Plex+Sans:wght@300;400` → `['IBM Plex Sans', '300;400']`. */
const familiesIn = (query) => [...query.matchAll(/family=([^&:]+)(?::wght@([^&]*))?/g)]
  .map((m) => [decodeURIComponent(m[1]).replace(/\+/g, ' '), m[2] ?? '']);

/* Ten files load fonts today: the Storybook preview iframe, the Storybook
 * manager chrome, the two site pages, the snippet in README.md that tells a
 * consumer what to put in their own <head>, the two review prototypes —
 * docs/reviews/270-back-control/variants.html (#270) and
 * docs/reviews/275-page-limits.html (#275), which draw their screenshots in the
 * kit's own faces — and the three evidence pages, scripts/evidence/shot.html (#286,
 * the rail), scripts/evidence/float.html (#309, the floating step) and
 * scripts/evidence/guideline.html (#310, the guideline pages): a shot taken in
 * the fallback faces is a shot of a different kit, so each loads them and waits
 * on document.fonts.ready. The readme is a subject on purpose —
 * it is the copy of this list that lives outside the repository, in every app
 * that installed the package, and it was the one nothing watched. The count is
 * asserted because a loader that stops being found stops being checked, and an
 * empty sweep passes as loudly as a full one. */
const EXPECTED_LOADERS = 10;

test('every page that loads a font loads every family the tokens name', () => {
  const want = webfonts();
  const sites = loaders();

  assert.equal(
    sites.length, EXPECTED_LOADERS,
    `found ${sites.length} Google Fonts URLs, expected ${EXPECTED_LOADERS}:\n`
    + sites.map((s) => `  ${s.where}`).join('\n')
    + '\nA page that stopped loading fonts, or one that started and is not counted. Update the '
    + 'number in the same commit, and say which page moved.',
  );

  for (const site of sites) {
    const loaded = familiesIn(site.query).map(([family]) => family);
    for (const [role, family] of want) {
      assert.ok(
        loaded.includes(family),
        `${site.where} does not load "${family}", which src/tokens/tokens.css names as ${role}. `
        + `It loads ${loaded.join(', ') || 'nothing this gate could parse'}. The kit bundles no `
        + 'fonts, so on that page the role silently resolves to the system fallback — which looks '
        + 'like a rendering bug rather than a missing link tag.',
      );
    }
  }
});

test('a loader asks for the same weights of every family it loads', () => {
  for (const site of loaders()) {
    const asked = familiesIn(site.query);
    const [, first] = asked[0] ?? [];
    for (const [family, weights] of asked) {
      assert.equal(
        weights, first,
        `${site.where} loads "${family}" at weights ${weights || '(default)'} but its first family `
        + `at ${first || '(default)'}. The roles are interchangeable in the sense that matters `
        + 'here — every weight the kit uses, it may use in either — so a face loaded at fewer '
        + 'weights gets synthesised by the browser at the rest, which is a fake bold nobody drew.',
      );
    }
  }
});

/* Storybook's manager is a JS theme object and an SVG data URI, neither of which
 * can read a CSS custom property — so the two places it names a family are the
 * two copies of the token that live outside the cascade, and a count cannot see
 * them at all. This is the test that says the surface was read: the chrome takes
 * the text face because a sidebar of story names is dense UI text, and the
 * wordmark keeps the display face because a wordmark is a mark.
 * why: CONTRIBUTING.md#a-gate-carries-a-ledger-of-what-it-does-not-reach */
test('the Storybook manager names the same two families the tokens do', () => {
  const manager = read('.storybook/manager.js');
  const roles = Object.fromEntries(webfonts());

  const chrome = /const fontBase\s*=\s*'"([^"]+)"/.exec(manager);
  assert.ok(
    chrome,
    "'.storybook/manager.js' no longer opens fontBase with a quoted family, so this gate reads "
    + 'nothing. Storybook cannot resolve a var() in its theme object — the family is written out '
    + 'there, and something has to hold it against the token it copies.',
  );
  assert.equal(
    chrome[1], roles['--font-sans'],
    `the Storybook sidebar and panels are set in "${chrome[1]}" while the kit's text role is `
    + `"${roles['--font-sans']}". The workbench then reads as a different design system from the `
    + 'one it is a workbench for.',
  );

  const wordmark = /font-family="([^",]+)/.exec(manager);
  assert.ok(wordmark, "'.storybook/manager.js' logo no longer carries a font-family attribute");
  assert.equal(
    wordmark[1], roles['--font-display'],
    `the sidebar wordmark is drawn in "${wordmark[1]}" while the kit's display role is `
    + `"${roles['--font-display']}". A wordmark is a mark and follows the display role wherever `
    + 'it goes — see docs/specification.md#typefaces.',
  );
});
