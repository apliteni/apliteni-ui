/* Rule: every file:line a guideline page cites still says what the page claims.
 *
 * A guideline card ends with "Copy from" — file, line, and a sentence about
 * what that line does. Those references rot silently: a refactor moves a rule
 * three lines down and the page starts pointing a reader at the wrong code.
 *
 * So every `kit` entry carries a `pattern`: a literal substring that has to be
 * on the cited line. This test resolves all of them — file exists, line exists,
 * line contains the pattern — for every guideline page in stories/guidelines/.
 *
 * It lives under stories/ on purpose: `npm test` only walks src, stories, site
 * and scripts, so a test outside those four trees is never executed and passes
 * by never running.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

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

for (const page of pages) {
  const mod = await import(path.join(here, page));
  if (!Array.isArray(mod.RULES)) continue;

  test(`guideline references resolve: stories/guidelines/${page}`, () => {
    const problems = [];

    for (const rule of mod.RULES) {
      for (const entry of rule.kit || []) {
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
    for (const rule of mod.RULES || []) refs += (rule.kit || []).length;
  }
  assert.ok(refs > 0, 'no guideline page cites any kit code — the resolver is checking nothing');
});
