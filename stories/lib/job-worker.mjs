/* One thread of the job pool. why: stories/lib/job-pool.js
 *
 * A fault travels back as a message, so the parent reports the walk that broke instead of
 * "worker exited with code 1". */
import { parentPort, workerData } from 'node:worker_threads';

const mod = await import(workerData.module);

parentPort.on('message', async ({ index, fn, args }) => {
  try {
    parentPort.postMessage({ index, result: await mod[fn](...args) });
  } catch (error) {
    parentPort.postMessage({ index, error: String((error && error.stack) || error) });
  }
});
