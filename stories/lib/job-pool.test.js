/* The job pool hands results back in the order the jobs were asked, on real threads, and a fault
 * names its job. Limit: it proves the pool, not the walks that use it. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { poolThreads, runJobs } from './job-pool.js';

const FIXTURE = new URL('./job-pool.fixture.mjs', import.meta.url);

test('results come back in job order, not finishing order', async () => {
  const jobs = [300, 0, 150, 0].map((ms, n) => ({ fn: 'slowThenFast', args: [n, ms] }));
  assert.deepEqual(await runJobs(FIXTURE, jobs, 4), [0, 1, 2, 3]);
});

test('more jobs than threads still all run', async () => {
  const jobs = Array.from({ length: 9 }, (_, n) => ({ fn: 'double', args: [n] }));
  assert.deepEqual(await runJobs(FIXTURE, jobs, 2), jobs.map((_, n) => n * 2));
});

test('jobs run off the main thread', async () => {
  const ids = await runJobs(FIXTURE, [{ fn: 'thread' }, { fn: 'thread' }], 2);
  assert.ok(ids.every((id) => id > 0), 'a job ran on the main thread');
});

test('a fault rejects with the job it came from', async () => {
  await assert.rejects(
    runJobs(FIXTURE, [{ fn: 'double', args: [1] }, { fn: 'boom', args: ['two'] }], 2),
    /boom\(two\): .*boom two/s,
  );
});

test('no jobs resolve to nothing, and the thread count is at least one', async () => {
  assert.deepEqual(await runJobs(FIXTURE, []), []);
  assert.ok(poolThreads(0) >= 1 && poolThreads(100) <= 8);
});
