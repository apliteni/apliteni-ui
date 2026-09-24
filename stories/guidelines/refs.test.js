// Test-side mapping from guideline rules to their implementation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { guidelinePage } from './_layout.js';
import { ThePage } from './ThePage.stories.js';
import * as thePage from './_the-page.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const references = JSON.parse(readFileSync(path.join(here, 'references.json'), 'utf8'));

// Every content module beside this test that publishes RULES.
const pages = readdirSync(here)
  .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
  .sort();

const parseRef = (ref) => {
  const m = /^(.+):(\d+)$/.exec(String(ref));
  return m ? { file: m[1], line: Number(m[2]) } : null;
};

// One failure line a reader can act on without opening this file.
const fail = (page, rule, ref, said) =>
  `${page} → rule "${rule}" → reference ${ref}\n     ${said}`;

// A missing field used to reach the page as the word "undefined" — "Except
// undefined" under a rule with no boundary. Two page authors hit it and both
// invented a boundary to get rid of it, which is the opposite of what the form
// is for. `except` and the pair are optional now and the renderer omits what a
// rule does not have; what is checked here is that a field which IS there says
// something, and that a rule without a pair still says why.
const shapeProblems = (page, rule) => {
  const said = (s) => `${page} → rule "${rule.id}" → ${s}`;
  const filled = (v) => typeof v === 'string' && v.trim() !== '';
  const problems = [];

  if (!filled(rule.imperative)) problems.push(said('`imperative` is the rule — it cannot be empty'));

  if (rule.except !== undefined && !filled(rule.except)) {
    problems.push(said('`except` is present but empty — leave it out instead'));
  }

  if (rule.doHtml || rule.dontHtml) {
    for (const [html, caption] of [['doHtml', 'doCaption'], ['dontHtml', 'dontCaption']]) {
      if (!rule[html]) {
        problems.push(said(`has a ${html === 'doHtml' ? "don't" : 'do'} but no \`${html}\``
          + ' — a specimen pair is both halves or neither'));
      } else if (!filled(rule[caption])) {
        problems.push(said(`\`${caption}\` is what the picture cannot say — it cannot be empty`));
      }
    }
    if (rule.why !== undefined && !filled(rule.why)) {
      problems.push(said('`why` is present but empty — leave it out instead'));
    }
  } else if (!filled(rule.why)) {
    problems.push(said('has no specimen pair, so it needs a `why` to stand on'));
  }

  return problems;
};

// `unmet` is how a rule admits the kit does not do this yet — an issue number
// and one sentence. It is optional; a broken one points a reader at a gap they
// cannot look up, so the shape is checked here rather than seen on the page.
const unmetProblems = (page, rule) => {
  const said = (s) => `${page} → rule "${rule.id}" → unmet\n     ${s}`;
  const u = rule.unmet;

  if (u === undefined) return [];
  if (typeof u !== 'object' || u === null || Array.isArray(u)) {
    return [said(`\`unmet\` must be an object like { issue: 128, note: '…' } — got ${JSON.stringify(u)}`)];
  }

  const problems = [];
  if (!Number.isInteger(u.issue) || u.issue < 1) {
    problems.push(said(`\`issue\` must be a positive integer — got ${JSON.stringify(u.issue)}`));
  }
  if (typeof u.note !== 'string' || u.note.trim() === '') {
    problems.push(said('`note` must be a non-empty string naming what the kit does not do yet'
      + ` — got ${JSON.stringify(u.note)}`));
  }
  return problems;
};

// The page guideline keeps its mapping in the specification. Check what a
// reader sees as well as the data, so moving a citation into prose still fails.
const codeFreeProblems = (mod, html = guidelinePage({ title: mod.TITLE, rules: mod.RULES, css: mod.SPEC_CSS })) => {
  const problems = [];
  if (mod.RULES.some((rule) => rule.kit !== undefined)) problems.push('a rule declares `kit`');
  const doc = JSDOM.fragment(html);
  if (doc.querySelector('.gc-refs, code')) problems.push('the page renders a citation or code');
  doc.querySelectorAll('style').forEach((el) => el.remove());
  if (/(?:[\w.-]+\/)+[\w.-]+|(?<!\w)\.[A-Za-z][\w-]*|--[a-z][\w-]*|\b[a-z][\w]*\(\)|\bui-[\w-]+|\b\w+(?:-\w+)+[\s`'"]+gate\b/.test(doc.textContent)) {
    problems.push('the page text contains a path, selector, token, function call or gate name');
  }
  return problems;
};

const specificationOnly = [];

for (const page of pages) {
  const mod = await import(path.join(here, page));
  if (!Array.isArray(mod.RULES)) continue;
  if (mod.REFERENCE_POLICY === 'specification-only') specificationOnly.push(page);

  test(`guideline references resolve: stories/guidelines/${page}`, () => {
    assert.ok(mod.REFERENCE_POLICY === undefined || mod.REFERENCE_POLICY === 'specification-only',
      `${page}: unknown reference policy`);
    if (mod.REFERENCE_POLICY === 'specification-only') {
      assert.deepEqual(codeFreeProblems(mod), [], `${page}: code references belong only in the specification`);
      return;
    }
    assert.ok(mod.RULES.some((rule) => references[page]?.[rule.id]?.length), `${page}: no kit citations to resolve`);
    const problems = [];

    for (const rule of mod.RULES) {
      for (const entry of references[page]?.[rule.id] || []) {
        const { ref, pattern } = entry;
        const at = parseRef(ref);

        if (!at) {
          problems.push(fail(page, rule.id, ref, 'not a file:line reference'));
          continue;
        }
        if (!pattern) {
          problems.push(fail(page, rule.id, ref, 'has no `pattern` to check the line against'));
          continue;
        }

        const abs = path.join(root, at.file);
        if (!existsSync(abs)) {
          problems.push(fail(page, rule.id, ref, `no such file: ${at.file}`));
          continue;
        }

        const lines = readFileSync(abs, 'utf8').split('\n');
        if (at.line < 1 || at.line > lines.length) {
          problems.push(fail(
            page, rule.id, ref,
            `line ${at.line} is past the end of ${at.file} (${lines.length} lines)`,
          ));
          continue;
        }

        const text = lines[at.line - 1];
        if (!text.includes(pattern)) {
          const found = lines.findIndex((l) => l.includes(pattern)) + 1;
          problems.push(fail(
            page, rule.id, ref,
            `expected line ${at.line} to contain ${JSON.stringify(pattern)}\n`
            + `     line ${at.line} is: ${text.trim() || '(blank)'}\n`
            + `     ${found ? `that text is on line ${found} — update the reference` : 'that text is nowhere in the file'}`,
          ));
        }
      }
    }

    assert.deepStrictEqual(
      problems,
      [],
      `guideline references no longer match the code they cite:\n  ${problems.join('\n  ')}`,
    );
  });

  test(`guideline rules are well formed: stories/guidelines/${page}`, () => {
    const problems = mod.RULES.flatMap((rule) => [
      ...shapeProblems(page, rule),
      ...unmetProblems(page, rule),
    ]);
    assert.deepStrictEqual(
      problems,
      [],
      `a rule declares an \`unmet\` the page cannot render:\n  ${problems.join('\n  ')}`,
    );
  });
}

test('only The page declares specification-only references', () => {
  assert.deepEqual(specificationOnly, ['_the-page.js']);
});

test('The page story renders no code references', () => {
  assert.deepEqual(codeFreeProblems(thePage, ThePage.render()), []);
});

test('specification-only pages reject citations moved into visible text', () => {
  const mod = { TITLE: 'Example', RULES: [{ id: 'r', imperative: 'Keep it clear.', why: 'Help readers.' }] };
  assert.deepEqual(codeFreeProblems(mod), []);
  for (const extra of [
    { kit: [{ ref: ['fixture/card.css', 7].join(':') }] },
    { imperative: 'Copy fixture/shell.js:182.' },
    { why: 'Use .ui-card.' },
    { why: 'Read refs.test.js.' },
    { why: 'Use appShell().' },
    { why: 'Use sidebarNav().' },
    { why: 'Use breadcrumbs().' },
    { imperative: 'Use card().' },
    { why: 'Use ui-app__sub.' },
    { why: 'Read the the-page gate.' },
    { doHtml: () => '<div>Example</div>', dontHtml: () => '<div>Example</div>',
      doCaption: 'Use appShell().', dontCaption: 'Avoid extra content.' },
    { why: 'Read docs/specification.md.' },
    { doHtml: () => '<div>Example</div>', dontHtml: () => '<div>Example</div>',
      doCaption: 'Use --space-2.', dontCaption: 'Avoid custom spacing.' },
  ]) {
    assert.ok(codeFreeProblems({ ...mod, RULES: [{ ...mod.RULES[0], ...extra }] }).length,
      `accepted code references: ${JSON.stringify(extra)}`);
  }
});

// The checker above only ever sees rules that are already well formed, so the
// shape rules for `unmet` are exercised here against ones that are not.
test('a malformed `unmet` fails with a line a reader can act on', () => {
  const problems = (unmet) => unmetProblems('Page.js', { id: 'r', unmet });
  const only = (unmet) => {
    const found = problems(unmet);
    assert.equal(found.length, 1, `expected one problem, got ${found.length}: ${found.join(' | ')}`);
    return found[0];
  };

  assert.deepStrictEqual(unmetProblems('Page.js', { id: 'r' }), [], 'no `unmet` is not a problem');
  assert.deepStrictEqual(
    problems({ issue: 128, note: 'the kit has no such control yet' }), [],
    'a well-formed `unmet` is not a problem',
  );

  for (const bad of ['#128', 128, null, ['x'], true]) {
    assert.match(only(bad), /`unmet` must be an object/, `${JSON.stringify(bad)} should not be accepted`);
  }
  for (const issue of [0, -1, 1.5, '128', undefined]) {
    assert.match(only({ issue, note: 'n' }), /`issue` must be a positive integer/);
  }
  for (const note of ['', '   ', 42, undefined]) {
    assert.match(only({ issue: 128, note }), /`note` must be a non-empty string/);
  }

  assert.match(only({ issue: 128, note: '' }), /^Page\.js → rule "r" → unmet\n {5}/);
});

// Same reason as above: the pages are well formed, so the shape rules are
// exercised here against rules that are not.
test('a rule missing what the page renders fails with a line a reader can act on', () => {
  const of = (rule) => shapeProblems('Page.js', { id: 'r', ...rule });
  const pair = { doHtml: () => '', dontHtml: () => '', doCaption: 'a', dontCaption: 'b' };

  assert.deepStrictEqual(of({ imperative: 'Do the thing', why: 'because' }), [],
    'an imperative and a why is a whole rule');
  assert.deepStrictEqual(of({ imperative: 'Do the thing', ...pair }), [],
    'an imperative and a pair is a whole rule');
  assert.deepStrictEqual(of({ imperative: 'Do the thing', why: 'because', except: 'here' }), [],
    'a boundary is allowed, not required');

  assert.match(of({ why: 'because' })[0], /`imperative` is the rule/);
  assert.match(of({ imperative: 'i' })[0], /needs a `why` to stand on/);
  assert.match(of({ imperative: 'i', why: '  ' })[0], /needs a `why` to stand on/);
  assert.match(of({ imperative: 'i', why: 'w', except: '  ' })[0],
    /`except` is present but empty — leave it out instead/);
  assert.match(of({ imperative: 'i', ...pair, doCaption: '' })[0],
    /`doCaption` is what the picture cannot say/);
  assert.match(of({ imperative: 'i', dontHtml: () => '', dontCaption: 'b' })[0],
    /has a don't but no `doHtml`/);
  assert.match(of({ imperative: 'i', doHtml: () => '', doCaption: 'a' })[0],
    /has a do but no `dontHtml`/);

  assert.match(of({ imperative: 'i' })[0], /^Page\.js → rule "r" → /);
});

// A page whose references all resolve is only meaningful if there were some.
test('the guidelines pages cite at least one line of kit code', async () => {
  let refs = 0;
  for (const page of pages) {
    const mod = await import(path.join(here, page));
    for (const rule of mod.RULES || []) refs += (references[page]?.[rule.id] || []).length;
  }
  assert.ok(refs > 0, 'no guideline page cites any kit code — the resolver is checking nothing');
});

// The shipping documents and rendered prose must stay together as the catalogue grows.
import { parseGuideline, withSpecimens } from './_markdown.js';
import { mono } from './_layout.js';
const markdownDir = path.join(root, 'guidelines');
const sourceReference = /(?:\b(?:src|stories|react|docs)\/|\b[\w-]+\.(?:css|[cm]?js|tsx?|md)(?::\d+)?\b)/;
const plain = (text) => JSDOM.fragment(mono(text)).textContent;

test('every guideline has packaged Markdown and renders its rule text from it', async () => {
  const docs = readdirSync(markdownDir).filter(file => file.endsWith('.md')).sort();
  const content = pages.filter(file => file.startsWith('_') && !['_layout.js', '_markdown.js', '_overview.js'].includes(file));
  assert.equal(content.length, 17, 'update the collection count when adding a page');
  assert.deepEqual(docs, [...content.map(file => `${file.slice(1, -3)}.md`), 'overview.md'].sort());
  assert.ok(JSON.parse(readFileSync(path.join(root, 'package.json'))).files.includes('guidelines'));
  let count = 0;
  for (const file of content) {
    const mod = await import(path.join(here, file));
    const document = readFileSync(path.join(markdownDir, `${file.slice(1, -3)}.md`), 'utf8');
    assert.doesNotMatch(document.replace(/\]\([^)]*\.md\)/g, ']'), sourceReference, file);
    const parsed = parseGuideline(document);
    assert.equal(mod.TITLE, parsed.title);
    assert.equal(mod.BLURB, parsed.blurb);
    const fragment = JSDOM.fragment(guidelinePage({ title: mod.TITLE, rules: mod.RULES }));
    const rendered = [...fragment.querySelectorAll('.gc-rule')];
    assert.equal(rendered.length, parsed.rules.length);
    parsed.rules.forEach((rule, index) => {
      for (const key of ['instruction', 'why', 'doCaption', 'dontCaption']) {
        assert.ok(rule[key]?.trim(), `${file}: ${rule.id} needs ${key}`);
      }
      assert.notEqual(rule.doCaption, rule.dontCaption, `${file}: examples must differ`);

      for (const key of ['id', 'imperative', 'instruction', 'why', 'except', 'doCaption', 'dontCaption', 'unmet']) {
        assert.deepEqual(mod.RULES[index][key], rule[key], `${file}: ${rule.id} ${key}`);
      }
      for (const key of ['imperative', 'instruction', 'why', 'except', 'doCaption', 'dontCaption']) {
        if (rule[key]) assert.ok(rendered[index].textContent.includes(plain(rule[key])), `${file}: missing ${rule.id} ${key}`);
      }
      count++;
    });
    assert.equal(fragment.querySelector('.gc-refs'), null);
  }
  assert.equal(count, 86, 'update the rule count when adding or removing a rule');
});

test('all Storybook guideline prose is free of source references, including appendices', async () => {
  for (const file of pages.filter(file => file.endsWith('.stories.js'))) {
    const mod = await import(path.join(here, file));
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default') continue;
      const fragment = JSDOM.fragment(story.render());
      fragment.querySelectorAll('style').forEach(el => el.remove());
      assert.doesNotMatch(fragment.textContent, sourceReference, file);
    }
  }
});

test('Markdown changes reach the renderer, and mismatched specimen ids fail', () => {
  const source = '# Example\n\nA summary.\n\n## Keep <words> readable.\n\n<!-- rule: text -->\n\n**Why:** Use `--text`.\n';
  const render = source => guidelinePage({ title: 'Example', rules: withSpecimens(parseGuideline(source).rules, [{ id: 'text' }]) });
  assert.ok(JSDOM.fragment(render(source)).textContent.includes('Keep <words> readable.'));
  assert.ok(JSDOM.fragment(render(source.replace('readable', 'clear'))).textContent.includes('Keep <words> clear.'));
  assert.throws(() => withSpecimens(parseGuideline(source).rules, [{ id: 'other' }]), /ids must match/);
  assert.throws(() => parseGuideline(source + '\n**Typo:** Missing field\n'), /Unsupported/);
  for (const bad of ['Read src/example.js:12.', 'See example.css.', 'Open ' + ['docs', 'example.md'].join('/') + '.']) assert.match(bad, sourceReference);
});

test('Storybook renders each Markdown page title', async () => {
  for (const file of pages.filter(file => file.endsWith('.stories.js') && file !== 'Overview.stories.js')) {
    const mod = await import(path.join(here, file));
    const story = Object.entries(mod).find(([name]) => name !== 'default')[1];
    const fragment = JSDOM.fragment(story.render());
    const title = fragment.querySelector('h1').textContent;
    const document = readdirSync(markdownDir).filter(file => file.endsWith('.md'))
      .map(file => parseGuideline(readFileSync(path.join(markdownDir, file), 'utf8')))
      .find(document => document.title === title);
    assert.ok(document, `no Markdown for ${title}`);


  }
});


test('packaged guideline subpaths resolve and contain the shared document', () => {
  for (const file of readdirSync(markdownDir).filter(file => file.endsWith('.md'))) {
    const resolved = import.meta.resolve(`@apliteni/apliteni-ui/guidelines/${file}`);
    assert.equal(readFileSync(new URL(resolved), 'utf8'), readFileSync(path.join(markdownDir, file), 'utf8'));
  }
});

test('inline issue links render as links while code and HTML remain escaped', () => {
  const html = mono('[#329](https://github.com/apliteni/apliteni-ui/issues/329) <unsafe> `--text`');
  const doc = JSDOM.fragment(html);
  assert.equal(doc.querySelector('a').href, 'https://github.com/apliteni/apliteni-ui/issues/329');
  assert.equal(doc.querySelector('a').textContent, '#329');
  assert.equal(doc.querySelector('unsafe'), null);
  assert.equal(doc.querySelector('code').textContent, '--text');
  assert.equal(JSDOM.fragment(mono('[bad](javascript:alert(1))')).querySelector('a'), null);
});
