// codeTokens is the single source the vanilla highlighters and React Snippet both
// read, so this holds the two properties that make sharing safe, for every
// language: hlShell's HTML does not change, and the tokens rebuild the caller's
// own string exactly.
//
// Languages are discovered from `codeLanguages`, so a new one joins this gate the
// moment it exists rather than when somebody remembers to list it here.
//
// Limits: this measures strings, not rendering. It says nothing about the colours
// the classes resolve to (stories/contrast.test.js, react/src/contrast.test.tsx)
// or how the spans lay out (browser captures).
import test from 'node:test';
import assert from 'node:assert/strict';
import { hlShell, hlCode, codeTokens, codeLanguages, esc } from './index.js';

// The implementation hlShell had before #474 moved the pattern into the shared
// tokenizer. Kept verbatim so the refactor is compared against the behaviour it
// replaced, not against a restatement of the new code.
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
// shared tokenizer could break: it tokenises escaped text and hands back
// unescaped text, which is only safe while no slice splits an entity.
const CASES = {
  shell: [
    ['empty', ''],
    ['plain text with no token', 'nothing to highlight'],
    ['the kit install line', 'npm install @apliteni/apliteni-ui'],
    ['command, flag, URL and string', 'curl -s https://example.com/api/version \\\n  -H "Accept: application/json"'],
    ['a leading comment', '# read the current version\ncurl -s https://example.com/api/version'],
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
  ],
  json: [
    ['empty', ''],
    ['an object with keys, values and scalars', '{\n  "url": "https://example.com/mcp",\n  "port": 443,\n  "tls": true\n}'],
    ['a null and a negative exponent', '{ "a": null, "b": -1.5e-3 }'],
    ['an array of strings', '["one", "two"]'],
    ['a key with spaces before its colon', '{ "spaced"   : 1 }'],
    ['escaped characters in a value', '{ "html": "<a href=\\"#\\">&amp;</a>" }'],
    ['an entity written out by hand', '{ "k": "&quot;v&quot;" }'],
    ['a colon inside a string value, which is not a key', '{ "u": "a: b" }'],
  ],
  ts: [
    ['empty', ''],
    ['an import and a const', 'import { Snippet } from "@apliteni/apliteni-ui/react";\nconst retries = 3;'],
    ['a line comment', '// derive the spans from the string you copy\nconst code = "npm i";'],
    ['a block comment', '/* two\n   lines */\nexport const n = 1;'],
    ['a URL inside a string, which is not a comment', 'const u = "https://example.com/a//b";'],
    ['a template literal', 'const greet = `hello ${name}`;'],
    ['single quotes', "import x from './x';"],
    ['angle brackets in a generic', 'const rows: Array<string> = [];'],
    ['an ampersand in an intersection type', 'type Both = A & B;'],
    ['an entity written out by hand', 'const s = "&quot;q&quot;";'],
    ['keywords that are substrings of other words', 'const constant = important;'],
  ],
};

test('every language the kit ships is in this gate', () => {
  assert.deepEqual([...codeLanguages].sort(), Object.keys(CASES).sort());
});

for (const lang of codeLanguages) {
  for (const [name, raw] of CASES[lang]) {
    test(`${lang}: tokens rebuild the source — ${name}`, () => {
      assert.equal(codeTokens(raw, lang).map(({ text }) => text).join(''), raw);
    });

    test(`${lang}: token classes match the rendered spans — ${name}`, () => {
      const spans = codeTokens(raw, lang).filter(({ cls }) => cls).map(({ cls }) => cls);
      const rendered = [...hlCode(raw, lang).matchAll(/<span class="(\w)">/g)].map(([, cls]) => cls);
      assert.deepEqual(spans, rendered);
    });

    test(`${lang}: every class is one the stylesheet paints — ${name}`, () => {
      for (const { cls } of codeTokens(raw, lang)) {
        assert.ok(cls === null || 'cfksu'.includes(cls), `${cls} is not a styles/code.css class`);
      }
    });
  }
}

for (const [name, raw] of CASES.shell) {
  test(`hlShell is unchanged: ${name}`, () => {
    assert.equal(hlShell(raw), hlShellBefore(raw));
    assert.equal(hlCode(raw, 'shell'), hlShellBefore(raw));
  });
}

test('each language reaches the classes it is meant to colour', () => {
  const found = (lang) => new Set(CASES[lang].flatMap(([, raw]) => codeTokens(raw, lang).map(({ cls }) => cls).filter(Boolean)));
  assert.deepEqual([...found('shell')].sort(), ['c', 'f', 'k', 's', 'u'], 'shell covers all five');
  assert.deepEqual([...found('json')].sort(), ['f', 'k', 's'], 'json colours keys, strings and scalars differently');
  assert.deepEqual([...found('ts')].sort(), ['c', 'f', 'k', 's'], 'ts colours comments, strings, keywords and scalars');
});

test('the cases cover every escaped character, in every language', () => {
  for (const lang of codeLanguages) {
    for (const character of ['&', '<', '>', '"']) {
      assert.ok(CASES[lang].some(([, raw]) => raw.includes(character)), `a ${lang} case contains ${character}`);
    }
  }
});

test('an unknown language is read as shell, not dropped on the floor', () => {
  const raw = 'curl -s https://example.com';
  assert.deepEqual(codeTokens(raw, 'klingon'), codeTokens(raw, 'shell'));
  assert.deepEqual(codeTokens(raw), codeTokens(raw, 'shell'));
});

test('a shared pattern is not left holding its last index', () => {
  // The patterns are module-level and /g, so a second call has to start at 0.
  const raw = '{ "a": 1, "b": 2 }';
  assert.deepEqual(codeTokens(raw, 'json'), codeTokens(raw, 'json'));
});

test('rejects a token that drops its escaping', () => {
  // The guarantee under test: a token's text is the unescaped source, and hlCode
  // escapes it again. Re-escaping a token that was never unescaped would double
  // it, which this proves the comparison above would catch.
  const raw = 'echo "a & b"';
  const doubled = codeTokens(raw, 'shell').map(({ cls, text }) => {
    const html = esc(esc(text));
    return cls ? `<span class="${cls}">${html}</span>` : html;
  }).join('');
  assert.notEqual(doubled, hlShellBefore(raw));
});
