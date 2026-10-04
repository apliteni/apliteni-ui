/* The slow-test report's one promise: it reports, and it never fails the run.
 *
 * Both halves are checked here against synthetic events, because the thing to pin is what the
 * reporter does with a stream it did not expect — and a real run only ever gives it a good one.
 *
 * Limits: the event shapes below are the ones `node --test` and vitest emit today, copied by
 * hand. A runner that changes its event shape leaves these green and the report empty; that is
 * why the shapes are written out in full rather than built by a helper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import slowTests, { SlowTests } from './slow-tests.mjs';

const file = path.resolve('stories/contrast.test.js');

/** The three events a passing file produces: the file's own, a test's, and a describe block's. */
const events = (name = file) => [
  { type: 'test:pass', data: { name: 'a test', file, details: { duration_ms: 7000, type: 'test' } } },
  { type: 'test:pass', data: { name: 'a describe', file, details: { duration_ms: 9000, type: 'suite' } } },
  { type: 'test:complete', data: { name, file, details: { duration_ms: 90000, type: 'test' } } },
];

const drain = async (source) => {
  let out = '';
  for await (const chunk of slowTests(source)) out += chunk;
  return out;
};

const stream = (items) => (async function* () { yield* items; })();

test('the report names the slowest tests, the slowest files and what is over budget', async () => {
  const out = await drain(stream(events()));
  assert.match(out, /1 tests in 1 files/, 'the counts');
  assert.match(out, /7\.00s {2}stories\/contrast\.test\.js > a test/, 'the test, by its own name');
  assert.match(out, /90\.00s {2}stories\/contrast\.test\.js\n/, 'the file, by its path');
  assert.doesNotMatch(out, /a describe/, 'a describe block reports its children’s time, so it is not a test');
  assert.match(out, /over budget\n\s+90\.00s {2}stories\/contrast\.test\.js/, 'the file is over its 60s budget');
  assert.match(out, /This report never fails the run\./);
});

test('a file given by absolute path still gets its row, and its file budget', async () => {
  // The file event is named by the path `node --test` was GIVEN. Matched as a string, an absolute
  // path matched nothing, the file row vanished and the 60s budget was never checked.
  const out = await drain(stream(events(file)));
  assert.match(out, /1 tests in 1 files/, 'the file was recognised');
  assert.match(out, /90\.00s {2}stories\/contrast\.test\.js\n/, 'and is listed by its relative path');
});

test('a browser gate gets the browser budget, not the 5s one', async () => {
  const browser = path.resolve('stories/field-ground.test.js');
  const out = await drain(stream([
    { type: 'test:pass', data: { name: 'a paint', file: browser, details: { duration_ms: 7000, type: 'test' } } },
  ]));
  assert.doesNotMatch(out, /over budget\n\s+7\.00s/, '7s is inside the 10s browser budget');
  assert.match(out, /over budget: none/);
});

test('a stream that rejects ends in a sentence, not in a thrown reporter', async () => {
  // The promise. Node treats a reporter that throws as a failed run, so a report that cannot
  // hold its own faults is worse than no report.
  const broken = (async function* () {
    yield events()[0];
    throw new Error('the event stream broke');
  })();
  const out = await drain(broken);
  assert.match(out, /no report this run \(Error: the event stream broke\)/);
  assert.match(out, /the run itself is unaffected/);
});

test('an event the reporter cannot read is survived, and the rest still reported', async () => {
  const poisoned = { type: 'test:pass', get data() { throw new Error('unreadable event'); } };
  const out = await drain(stream([...events(), poisoned]));
  assert.match(out, /no report this run \(Error: unreadable event\)/);
});

test('the vitest half reports, and survives a module it cannot read', () => {
  const written = [];
  const out = { write: (s) => written.push(s) };
  const real = process.stdout.write;
  process.stdout.write = out.write;
  try {
    const module = {
      relativeModuleId: 'src/contrast.test.tsx',
      diagnostic: () => ({ duration: 71000 }),
      children: { allTests: () => [
        { fullName: 'a cell', diagnostic: () => ({ duration: 6000 }) },
        { fullName: 'a skipped cell', diagnostic: () => undefined },
      ] },
    };
    new SlowTests().onTestRunEnd([module]);
    new SlowTests().onTestRunEnd([{
      relativeModuleId: 'src/broken.test.tsx',
      diagnostic: () => { throw new Error('unreadable module'); },
    }]);
  } finally {
    process.stdout.write = real;
  }
  assert.match(written[0], /1 tests in 1 files/, 'the skipped test has no duration, so it is not timed');
  assert.match(written[0], /71\.00s {2}src\/contrast\.test\.tsx\n/);
  assert.match(written[0], /6\.00s {2}src\/contrast\.test\.tsx > a cell/);
  assert.match(written[1], /no report this run \(Error: unreadable module\)/);
});
