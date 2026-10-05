/* One shard of the contrast walk, in a thread of its own. The parent deals the catalogue
 * out and adds the answers up. why: stories/lib/contrast.js
 *
 * This thread's hand of files is walked for every cell the parent asked for, so the cold
 * start — importing jsdom, resolving the token map, parsing the kit's stylesheet — is paid
 * once here rather than once a cell.
 *
 * A fault travels back as a message rather than as an uncaught error, so the parent reports
 * the story that broke instead of "worker exited with code 1".
 */
import { parentPort, workerData } from 'node:worker_threads';
import { walkStories, mergeWalks } from './contrast.js';

const { cells, states, files } = workerData;

try {
  const parts = [];
  for (const cell of cells) parts.push(await walkStories({ ...cell, states, files }));
  parentPort.postMessage({ walk: mergeWalks(parts) });
} catch (error) {
  parentPort.postMessage({ error: String((error && error.stack) || error) });
}
