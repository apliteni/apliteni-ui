// A fresh worker's first job may render a DOM-based story, so the window must exist before the
// story file is imported. Each case runs in a new process, as a pool worker's first job does.
// Limit: this proves the startup order, not axe's verdicts, which stories/a11y.test.js holds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('a11yFile: a DOM-based story file as the first job checks every cell', () => {
  const out = execFileSync(process.execPath, ['--input-type=module', '-e',
    "import { a11yFile } from './stories/lib/a11y-walk.js';"
    + "console.log(JSON.stringify(await a11yFile('components/Feedback.stories.js')));"],
  { encoding: 'utf8' });
  const r = JSON.parse(out.trim().split('\n').pop());
  assert.equal(r.discovered, 2, 'Feedback stories discovered');
  assert.equal(r.checked, 4, 'Feedback stories × 2 themes checked');
  assert.deepEqual(r.problems, []);
});
