/* Jobs for job-pool.test.js. why: stories/lib/job-pool.test.js */
import { threadId } from 'node:worker_threads';

export const double = async (n) => n * 2;
export const slowThenFast = async (n, ms) => { await new Promise((r) => setTimeout(r, ms)); return n; };
export const thread = async () => threadId;
export const boom = async (what) => { throw new Error(`boom ${what}`); };
