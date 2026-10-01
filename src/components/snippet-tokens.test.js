// shellTokens is the single source the vanilla highlighter and React Snippet both
// read, so this holds the two properties that make sharing safe: hlShell's HTML
// does not change, and the tokens rebuild the caller's own string exactly.
//
// Limits: this measures strings, not rendering. It says nothing about the colours
// the classes resolve to (stories/contrast.test.js) or how the spans lay out
// (react/src/Snippet.stories.tsx captures).
import test from 'node:test';
import assert from 'node:assert/strict';
import { hlShell, shellTokens, esc } from './index.js';

// The implementation hlShell had before #474 moved the pattern into shellTokens.
// Kept verbatim so the refactor is compared against the behaviour it replaced,
// not against a restatement of the new code.
const hlShellBefore = (raw) =>
  esc(raw).replace(
    /(#[^\n]*)|(&quot;(?:[^&]|&(?!quot;))*&quot;|'[^']*')|(https?:\/\/[^\s"'&]+)|(\B--?[A-Za-z][\w-]*)|(^[a-z][\w.-]*)/gm,
    (m, c, s, u, f, cmd) =>
      c ? `<span class="c">${c}</span>`
        : s ? `<span class="s">${s}</span>`
        : u ? `<span class="u">${u}</span>`
        : f ? `<span class="f">${f}</span>`
        : cmd ? `<span class="k">${cmd}</span>`
        : m,
  );

// Each case names what it is there to catch. The entity cases are the ones the
// move could have broken: tokenising escaped text and handing back unescaped
// text is only safe while no slice splits an entity.
const CASES = [
  ['empty', ''],
  ['plain text with no token', 'nothing to highlight'],
  ['the kit install line', 'npm install @apliteni/apliteni-ui'],
  ['command, flag, URL and string', 'curl -s https://example.com/api/version \\\n  -H "Accept: application/json"'],
  ['a leading comment', '# read the current version\ncurl -s https://example.com/api/version'],
  ['JSON with quoted keys and values', '{\n  "url": "https://example.com/mcp",\n  "transport": "http"\n}'],
  ['single-quoted string', "grep -n 'pattern' file.txt"],
  ['ampersand beside a URL', 'open https://example.com/a?x=1&y=2 && echo done'],
  ['angle brackets in a redirect', 'cat <input.txt >output.txt'],
  ['angle brackets inside a URL', 'open https://example.com/<id>/edit'],
  ['a quote inside a double-quoted string', 'echo "a & b < c > d"'],
  ['an entity written out by hand', 'echo "&quot;already escaped&quot;"'],
  ['a flag after a quote', 'run "value"--flag'],
  ['every escaped character at once', '& < > " &amp; &lt;'],
  ['a long flag with dashes', 'git log --no-merges --pretty=oneline'],
  ['trailing newline', 'echo done\n'],
];

for (const [name, raw] of CASES) {
  test(`hlShell is unchanged: ${name}`, () => {
    assert.equal(hlShell(raw), hlShellBefore(raw));
  });

  test(`tokens rebuild the source: ${name}`, () => {
    assert.equal(shellTokens(raw).map(({ text }) => text).join(''), raw);
  });

  test(`token classes match the rendered spans: ${name}`, () => {
    const spans = shellTokens(raw).filter(({ cls }) => cls);
    const rendered = [...hlShell(raw).matchAll(/<span class="(\w)">/g)].map(([, cls]) => cls);
    assert.deepEqual(spans.map(({ cls }) => cls), rendered);
  });
}

test('every token class the stylesheet paints is reachable', () => {
  const found = new Set(CASES.flatMap(([, raw]) => shellTokens(raw).map(({ cls }) => cls).filter(Boolean)));
  assert.deepEqual([...found].sort(), ['c', 'f', 'k', 's', 'u'], 'the cases cover all five classes');
});

test('the cases cover every escaped character', () => {
  for (const character of ['&', '<', '>', '"']) {
    assert.ok(CASES.some(([, raw]) => raw.includes(character)), `a case contains ${character}`);
  }
});

test('rejects a token that drops its escaping', () => {
  // The guarantee under test: a token's text is the unescaped source, and
  // hlShell escapes it again. Re-escaping a token that was never unescaped
  // would double it, which this proves the comparison above would catch.
  const raw = 'echo "a & b"';
  const doubled = shellTokens(raw).map(({ cls, text }) => {
    const html = esc(esc(text));
    return cls ? `<span class="${cls}">${html}</span>` : html;
  }).join('');
  assert.notEqual(doubled, hlShellBefore(raw));
});
