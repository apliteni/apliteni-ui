/* Rule: the React workspace's code size, complexity, repeats and imports stay within the
 * limits in .smells.json, so DataTable cannot grow back past them (Part of #888).
 *
 * Two halves. The SOURCE half runs in CI and reads .smells.json. The CHECK half runs the
 * code-smells skill's scanner, which needs the skill, Go and Bun. They are not
 * dependencies of this package, so CI does not run it. It is OFF unless SMELLS=1, and
 * with SMELLS=1 a missing tool is a failure, not a skip:
 *
 *   SMELLS=1 node --test scripts/smell-check.test.js
 *
 * Limits: the check half measures a scratch copy of the workspace's TypeScript files,
 * so it sees uncommitted files. The copy's origin/main holds origin/main's limits, so the
 * scanner compares the workspace's caps with main's. It reads the skill from SMELLS_SKILL
 * or the user's skill folders. The proof mutates DataTable and one cap only.
 * why: AGENTS.md#check-the-code-smell-limits-locally
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(readFileSync(path.join(root, '.smells.json'), 'utf8'));
const DATA_TABLE = ['react/src/DataTable.tsx', 'react/src/data-table/'];

// The skill's defaults. A budget above one of them lets new code grow past it.
const DEFAULTS = { complexity: 15, cycles: 0, duplicate_groups: 0, duplicate_lines: 0, fan_out: 8, file_lines: 500, function_lines: 80 };

/** The caps that name a DataTable file. A cap lets its item stay over the budget. */
const dataTableCaps = (b) => Object.values(b.caps ?? {}).flatMap((metrics) => Object.values(metrics))
  .flatMap((caps) => Object.keys(caps)).filter((id) => DATA_TABLE.some((f) => id.includes(f)));

test('.smells.json measures the React workspace at the default budgets', () => {
  assert.deepEqual(baseline.languages, ['typescript']);
  assert.deepEqual(baseline.files.include, ['react/*.ts', 'react/*.tsx']);
  for (const [metric, limit] of Object.entries(DEFAULTS)) {
    assert.ok(baseline.budgets.production[metric] <= limit, `production ${metric} is over the default of ${limit}.`);
  }
});

test('no DataTable file has a cap, so the budgets are its limits', () => {
  assert.deepEqual(dataTableCaps(baseline), []);
  const capped = structuredClone(baseline);
  capped.caps.production.function_lines['react/src/DataTable.tsx:DataTable'] = 208;
  assert.equal(dataTableCaps(capped).length, 1, 'The check passed a cap that lets DataTable grow back.');
});

/* -- The check half ---------------------------------------------------------- */

const RUN = env.SMELLS === '1';

const skillDir = () => [env.SMELLS_SKILL, path.join(homedir(), '.agents/skills/code-smells'),
  path.join(homedir(), '.claude/skills/code-smells')].find((d) => d && existsSync(path.join(d, 'bin/smells')));

const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8' });

/** origin/main's .smells.json, or null when main has none. */
function mainLimits() {
  assert.equal(run('git', ['rev-parse', '--verify', '--quiet', 'origin/main^{commit}'], root).status, 0,
    'origin/main is unknown here. Run git fetch origin main.');
  const shown = run('git', ['show', 'origin/main:.smells.json'], root);
  return shown.status === 0 ? shown.stdout : null;
}

/**
 * A git repository with the workspace's TypeScript files. Its origin/main holds
 * origin/main's limits, and its own commit adds the workspace's .smells.json on top,
 * so the scanner compares the workspace's caps with main's.
 */
function scratchCopy(dir) {
  const listed = run('git', ['ls-files', '-co', '--exclude-standard', 'react'], root);
  assert.equal(listed.status, 0, listed.stderr);
  const files = listed.stdout.split('\n').filter((f) => /\.tsx?$/.test(f));
  assert.ok(files.length > 200, `${files.length} files copied. A copy this small measures almost nothing.`);
  const work = path.join(dir, 'work');
  for (const f of files) {
    mkdirSync(path.dirname(path.join(work, f)), { recursive: true });
    writeFileSync(path.join(work, f), readFileSync(path.join(root, f)));
  }
  const limits = path.join(work, '.smells.json');
  const onMain = mainLimits();
  if (onMain !== null) writeFileSync(limits, onMain);
  git(work, ['init', '-q', '-b', 'main'], ['add', '-A'], ['commit', '-q', '-m', 'main']);
  git(dir, ['clone', '-q', '--bare', 'work', 'origin.git']);
  git(work, ['remote', 'add', 'origin', '../origin.git'], ['fetch', '-q', 'origin'], ['remote', 'set-head', 'origin', 'main']);
  writeFileSync(limits, readFileSync(path.join(root, '.smells.json')));
  git(work, ['add', '-A'], ['commit', '-q', '--allow-empty', '-m', 'limits']);
  return work;
}

/** Runs each git command in cwd, and fails on the first that fails. */
function git(cwd, ...commands) {
  for (const args of commands) {
    const r = run('git', ['-c', 'user.name=smells', '-c', 'user.email=smells', ...args], cwd);
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  }
}

// Each mutation grows DataTable past one limit or raises a cap, and the line names the
// limit that rejects it.
const [raised] = Object.keys(baseline.caps.production.complexity);
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const pad = (n, line) => Array.from({ length: n }, (_, i) => line(i)).join('\n');
const MUTATIONS = [
  ['function lines', /production function_lines: react\/src\/DataTable\.tsx:DataTable is \d+, over the limit of 80/,
    (s) => s.replace('  const sized =', `${pad(40, (i) => `  const grown${i} = rows.length + ${i};`)}\n  const sized =`)],
  ['complexity', /production complexity: react\/src\/DataTable\.tsx:DataTable is 16, over the limit of 15/,
    (s) => s.replace('  const sized =', `${pad(4, (i) => `  if (rows.length > ${i}) void 0;`)}\n  const sized =`)],
  ['file lines', /production file_lines: react\/src\/DataTable\.tsx is \d+, over the limit of 500/,
    (s) => `${s}\n${pad(400, () => '// grown')}\n`],
  ['local imports', /production fan_out: react\/src\/DataTable\.tsx is 9, over the limit of 8/,
    (s) => `import { Tooltip } from './Tooltip';\nimport { Badge } from './primitives/Badge';\nexport const grown = [Tooltip, Badge];\n${s}`],
  ['repeats', /production duplicate_lines: react\/src\/DataTable\.tsx is \d+, over the limit of 0/,
    (s, work) => `${s}\n${readFileSync(path.join(work, 'react/src/data-table/Pager.tsx'), 'utf8')
      .replace(/^import .*$/gm, '').replace('function TablePager', 'function TablePagerCopy')}`],
  ['import cycles', /production cycles: react\/src\/DataTable\.tsx \+ [^\n]*react\/src\/data-table\/columns\.ts[^\n]* is 1, over the limit of 0/,
    null, (work) => {
      const file = path.join(work, 'react/src/data-table/columns.ts');
      writeFileSync(file, `import { DataTable } from '../DataTable';\nexport const grown = DataTable;\n${readFileSync(file, 'utf8')}`);
    }],
  ['raised cap', new RegExp(`caps/production/complexity/${escape(raised)} is looser than on origin/main`),
    null, (work) => {
      const file = path.join(work, '.smells.json');
      const limits = JSON.parse(readFileSync(file, 'utf8'));
      limits.caps.production.complexity[raised] += 1;
      writeFileSync(file, `${JSON.stringify(limits, null, 2)}\n`);
    }],
];

test('each limit rejects a DataTable that grows past it, and main rejects a raised cap', { skip: !RUN && 'set SMELLS=1' }, () => {
  const skill = skillDir();
  assert.ok(skill, 'SMELLS=1 was set and no code-smells skill was found. Set SMELLS_SKILL to its folder.');
  for (const tool of ['go', 'bun']) {
    assert.equal(run(tool, ['--version'], root).error, undefined, `SMELLS=1 was set and ${tool} is not on PATH.`);
  }
  const dir = mkdtempSync(path.join(tmpdir(), 'smell-check-'));
  try {
    const work = scratchCopy(dir);
    const smells = () => run(path.join(skill, 'bin/smells'), ['check'], work);
    const clean = smells();
    assert.equal(clean.status, 0, `The unchanged workspace fails its limits or is looser than main:\n${clean.stdout}${clean.stderr}`);

    // The workspace's limits merge into main, so a later raise of one of its caps is looser than main.
    git(work, ['push', '-q', 'origin', 'HEAD:main'], ['fetch', '-q', 'origin']);

    const file = path.join(work, 'react/src/DataTable.tsx');
    const source = readFileSync(file, 'utf8');
    for (const [, , edit, other] of MUTATIONS) {
      if (edit) {
        const grown = edit(readFileSync(file, 'utf8'), work);
        assert.notEqual(grown, readFileSync(file, 'utf8'), 'A mutation did not apply, so it proves nothing.');
        writeFileSync(file, grown);
      }
      other?.(work);
    }
    assert.notEqual(readFileSync(file, 'utf8'), source);
    const grown = smells();
    assert.equal(grown.status, 1, `${grown.stdout}${grown.stderr}`);
    for (const [name, line] of MUTATIONS) {
      assert.match(grown.stdout + grown.stderr, line, `The ${name} limit passed a DataTable that grew past it.`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
