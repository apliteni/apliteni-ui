/* Independent JSDOM walks, dealt to worker threads and handed back in the order they were asked.
 *
 * A walk mounts every story and is CPU-bound, so a gate that runs several one after another
 * spends their sum on one core. `runJobs` names an exported async function of a module and its
 * arguments for each job; a pool of threads pulls jobs from one queue and each thread imports the
 * module once. A result must survive structured clone, so a walk returns plain data.
 * why: AGENTS.md#verification
 */
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

const WORKER = new URL('./job-worker.mjs', import.meta.url);
/* Half the cores, as the contrast walk deals them, so the other test files keep the rest. */
const MAX_THREADS = 8;

export const poolThreads = (jobs) =>
  Math.max(1, Math.min(Math.floor(availableParallelism() / 2), MAX_THREADS, jobs));

/**
 * Run `jobs` — `{ fn, args }`, `fn` being an export of `moduleUrl` — and resolve their results in
 * order. The first fault rejects with the thread's own stack and stops the rest.
 */
export function runJobs(moduleUrl, jobs, threads = poolThreads(jobs.length)) {
  if (!jobs.length) return Promise.resolve([]);
  const results = new Array(jobs.length);
  let next = 0;
  let pending = jobs.length;
  const workers = [];
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      Promise.allSettled(workers.map((w) => w.terminate())).then(() => fn(value));
    };
    const feed = (worker) => {
      if (next >= jobs.length) return;
      const index = next++;
      worker.postMessage({ index, fn: jobs[index].fn, args: jobs[index].args ?? [] });
    };
    for (let i = 0; i < Math.min(threads, jobs.length); i++) {
      const worker = new Worker(WORKER, { workerData: { module: String(moduleUrl) } });
      workers.push(worker);
      worker.on('message', (m) => {
        if (m.error) { finish(reject, new Error(`${jobs[m.index].fn}(${(jobs[m.index].args ?? []).join(', ')}): ${m.error}`)); return; }
        results[m.index] = m.result;
        if (--pending === 0) finish(resolve, results);
        else feed(worker);
      });
      worker.on('error', (error) => finish(reject, error));
      worker.on('exit', (code) => finish(reject, new Error(`a job thread exited ${code} before its jobs were done`)));
      feed(worker);
    }
  });
}
