// Guards the deal of the Accessibility minimums walks over their entry files (#562).
// It lives outside the files it guards, so removing any of them, the target walk's file included,
// leaves this test running to report it. The entry files are found on disk by what they call, not
// by a list of names, so a wrapper that repeats a part is seen.
// Limit: it reads the files that exist, so a runner that filters a file out of the run is not seen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CELLS } from './accessibility-walks.js';
import { FLOOR_ENTRIES, cellProblems, floorProblems, partCalls } from './floor-parts.js';

const stories = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Every test file outside lib/ that runs a floor part, keyed by its path under stories/. */
const found = () => Object.fromEntries(readdirSync(stories, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.test.js') && !f.startsWith('lib/'))
  .map((f) => [f, readFileSync(path.join(stories, f), 'utf8')])
  .filter(([, text]) => partCalls(text).length > 0));

test('every walk has one owner: each part has one entry file and each cell one ring part', () => {
  const real = found();
  assert.deepEqual(Object.keys(real).sort(), Object.keys(FLOOR_ENTRIES).sort(), 'the entry files on disk');
  assert.deepEqual(floorProblems(real), [], 'a part that no file runs is never measured');
  assert.deepEqual(cellProblems(), []);
  assert.equal(CELLS.length, 8, 'the cells moved — re-check the deal');
});

test('the removal of any one entry file, the target walk included, is rejected', () => {
  const real = found();
  for (const file of Object.keys(FLOOR_ENTRIES)) {
    const { [file]: _gone, ...rest } = real;
    const problems = floorProblems(rest);
    assert.ok(problems.includes(`part entry point ${file} is missing`), `${file}: ${problems}`);
    assert.ok(problems.includes(`no entry point runs ${FLOOR_ENTRIES[file]}`), `${file}: ${problems}`);
  }
});

test('a wrapper that repeats a part, under any name, is rejected', () => {
  const real = found();
  for (const [file, part] of Object.entries(FLOOR_ENTRIES)) {
    const extra = floorProblems({ ...real, 'guidelines/floor-extra.test.js': real[file] });
    assert.ok(extra.includes('guidelines/floor-extra.test.js runs a part but is not an entry point'), extra.join('\n'));
    const swapped = floorProblems({ ...real, 'guidelines/floor-disabled.test.js': real[file] });
    if (part !== 'disabled') {
      assert.ok(swapped.includes(`guidelines/floor-disabled.test.js runs ${part}, not disabled`), swapped.join('\n'));
      assert.ok(swapped.includes('no entry point runs disabled'), swapped.join('\n'));
    }
  }
});

test('a foreign, empty or commented-out entry file is rejected', () => {
  const real = found();
  assert.ok(floorProblems({ ...real, 'guidelines/floor-ring-dark.test.js': '' })
    .includes('guidelines/floor-ring-dark.test.js must run one part, and runs 0'));
  assert.ok(floorProblems({ ...real, 'guidelines/floor-disabled.test.js': '// await disabledPart();' })
    .includes('guidelines/floor-disabled.test.js must run one part, and runs 0'));
  assert.ok(floorProblems({ ...real, 'guidelines/floor-disabled.test.js': 'await disabledPart();\nawait disabledPart();' })
    .includes('guidelines/floor-disabled.test.js must run one part, and runs 2'));
});

test('a cell no ring part walks, or two walk, is rejected', () => {
  assert.deepEqual(cellProblems(CELLS, ['dark']).filter((p) => p.endsWith('has no ring part')).length, CELLS.filter((c) => c.theme === 'light').length);
  assert.ok(cellProblems(CELLS, ['dark', 'dark', 'light']).some((p) => p.includes('is walked 2 times')));
  assert.deepEqual(cellProblems([...CELLS, CELLS[0]]).filter((p) => p.includes('listed twice')).length, 1);
});
