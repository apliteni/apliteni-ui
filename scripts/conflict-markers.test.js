/* Rule: no tracked file ships a merge-conflict marker.
 *
 * A committed conflict is invisible to everything that normally catches a bad
 * merge: git sees ordinary content, so GitHub reports the branch MERGEABLE and
 * every check passes. #481 shipped six markers in react/README.md through a
 * rebase resolved with `git add -A`, and the full suite stayed green on a head
 * whose React API documentation had two components' sections replaced by a diff
 * that named neither.
 *
 * why: AGENTS.md#verification */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* The three shapes, built from fragments so this gate is not its own subject.
 * `ours` and `theirs` carry a label after the marker; `split` stands alone, and
 * `base` is the diff3 middle. */
const M = { lt: '<'.repeat(7), eq: '='.repeat(7), gt: '>'.repeat(7), pipe: '|'.repeat(7) };
const MARKERS = [
  { name: 'ours', re: new RegExp(`^${M.lt}(\\s|$)`) },
  { name: 'base', re: new RegExp(`^\\${M.pipe[0]}{7}(\\s|$)`) },
  { name: 'split', re: new RegExp(`^${M.eq}\\s*$`) },
  { name: 'theirs', re: new RegExp(`^${M.gt}(\\s|$)`) },
];

/** Every marker line in `text`, as `{ line, name }`. */
export function conflictsIn(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    const hit = MARKERS.find((m) => m.re.test(line));
    if (hit) out.push({ line: i + 1, name: hit.name });
  });
  return out;
}

/* A file that legitimately holds a marker at the start of a line. Empty today.
 * Add one only when the content cannot be indented or quoted instead, and say
 * why beside it — the test below fails if an entry stops existing, so a stale
 * exclusion cannot sit here quietly widening the hole. */
const ALLOWED = [];

/* Subjects come from `git ls-files`, so a new file is in the gate the moment it
   is tracked. Limit: this reads the working tree, not history — a marker already
   behind an earlier commit is caught only while it is still in the files. */
const tracked = () => execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 64 << 20 })
  .toString('utf8').split('\0').filter(Boolean);

/* A NUL byte in the first 8 KiB is how git itself decides a blob is binary. By
   content, not extension, so an unknown text extension is still scanned. */
const isText = (abs) => {
  const buf = readFileSync(abs);
  return !buf.subarray(0, 8192).includes(0);
};

test('no tracked file ships a merge-conflict marker', () => {
  const files = tracked();
  const problems = [];
  const unreadable = [];
  let scanned = 0;
  for (const rel of files) {
    if (ALLOWED.includes(rel)) continue;
    const abs = path.join(root, rel);
    let text;
    try {
      if (!isText(abs)) continue;
      text = readFileSync(abs, 'utf8');
    } catch (err) {
      // A submodule's gitlink or a path the checkout does not hold reads as a
      // directory or as missing; neither is a subject this gate can scan. Any
      // other failure — most of all a permission error — is not a cleared
      // file, so it is reported rather than silently dropped from the sweep.
      if (err.code === 'ENOENT' || err.code === 'EISDIR') continue;
      unreadable.push(`  ${rel} — cannot read (${err.code}): ${err.message}`);
      continue;
    }
    scanned += 1;
    for (const { line, name } of conflictsIn(text)) {
      problems.push(`  ${rel}:${line} — ${name} marker. Resolve the merge; do not commit the markers.`);
    }
  }
  assert.ok(files.length > 300, `git ls-files returned ${files.length} paths — the sweep is broken, not the tree`);
  assert.deepEqual(unreadable, [], `\nA tracked file could not be read, so it was not cleared:\n${unreadable.join('\n')}\n`);
  assert.ok(scanned > 200, `only ${scanned} text files were scanned out of ${files.length} tracked — the sweep is broken`);
  assert.deepEqual(problems, [], `\nA merge-conflict marker is committed:\n${problems.join('\n')}\n`);
});

test('every allowed file still exists, so a stale exclusion cannot widen the hole', () => {
  const files = new Set(tracked());
  for (const rel of ALLOWED) {
    assert.ok(files.has(rel), `${rel} is allowed to hold a marker but is no longer tracked — drop the exclusion`);
  }
});

test('the check rejects each marker git writes, and only at the start of a line', () => {
  const found = (text) => conflictsIn(text).map((c) => c.name);
  assert.deepEqual(found(`a\n${M.lt} HEAD\nb\n${M.eq}\nc\n${M.gt} topic\nd`), ['ours', 'split', 'theirs']);
  assert.deepEqual(found(`${M.lt}\n${M.gt}`), ['ours', 'theirs'], 'a bare marker with no label still counts');
  assert.deepEqual(found(`${M.pipe} merged common ancestors`), ['base'], 'diff3 leaves a third marker');
  // What documentation about conflicts looks like, and must stay legal.
  assert.deepEqual(found(`    ${M.lt} HEAD\n  ${M.eq}\nsee ${M.gt} topic\n${M.eq}=`), []);
  assert.deepEqual(found('===\n=========x\n<<<<<< six'), [], 'six is not seven, and a trailing word is not a split');
});
