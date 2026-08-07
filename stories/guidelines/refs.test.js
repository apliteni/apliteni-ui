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
}

// A page whose references all resolve is only meaningful if there were some.
test('the guidelines pages cite at least one line of kit code', async () => {
  let refs = 0;
  for (const page of pages) {
    const mod = await import(path.join(here, page));
    for (const rule of mod.RULES || []) refs += (rule.kit || []).length;
  }
  assert.ok(refs > 0, 'no guideline page cites any kit code — the resolver is checking nothing');
});
