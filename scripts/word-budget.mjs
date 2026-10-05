#!/usr/bin/env node
/**
 * word-budget — fail a guideline page that carries more prose than its budget.
 *
 * why: docs/guidelines.md#show-less-tell
 *
 * Guideline pages drift past their length rules because only a reviewer reads
 * them: #514 was cut for verbosity after review, #566 took two rounds to lose
 * repeated text, and nothing measured the prose.
 *
 * The subject is every `guidelines/*.md` page, discovered from the directory, so
 * a new page joins the check by existing. The prose is read through the parser
 * the pages are rendered with, so what is counted is what a reader reads: any
 * introduction between the title and the first rule, then each rule's `##`
 * title and its Rule, Why, Except, Do, Don't and Gap fields. The page title is
 * a name, not prose, and is not counted.
 *
 * A page's budget is its rule count times WORDS_PER_RULE. A rate rather than a
 * flat page figure, because a page of ten rules is not a page of three that has
 * grown; and expressed per page, because that is what a reader opens.
 *
 * An introduction buys no allowance of its own: docs/guidelines.md gives a page
 * a title and rules and no introduction, so the words of one that appears anyway
 * come out of the rules' budget — and a page with no rules has none to spend.
 *
 * Deliberately NOT in CI (#576): the budget is a drafting aid with a number
 * chosen from how today's pages read, not a published guarantee. `npm test`
 * checks this tool, never the pages.
 *
 * Usage: npm run check:words — or `node scripts/word-budget.mjs <dir>` to measure
 * another collection against the budget alone.
 *
 * Exit 0 and the measurement when every page is within its budget and the
 * recorded figures match, exit 1 and a line per page when they are not.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { parseGuideline } from '../stories/guidelines/_markdown.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/* Read off today's shortest pages: the tightest third of the collection runs to
 * 59 words a rule, and the shortest page spends 42 of its 60. A page above this
 * is not over a rule anybody wrote down — it is wordier than every page that
 * has been through a length review. */
export const WORDS_PER_RULE = 60;

/* The pages already over that budget, at the size they were when it was set.
 *
 * One cause covers every line and is not worth repeating fifteen times: the
 * page was written before anything measured it. The limitation is the same for
 * all of them too, and it is the real cost of this file — a recorded page is
 * allowed to stay over budget indefinitely. What it may not do is grow: its cap
 * is the figure below until it comes under the budget, and then the line goes.
 *
 * Maintained by hand. Never regenerated: a figure that rises because a tool
 * wrote it is not a decision anybody made. */
export const RECORDED = {
  'accessibility-floor.md': 853,
  'account-and-settings.md': 360,
  'command-palette.md': 430,
  'component-choice.md': 510,
  'density-and-accents.md': 412,
  'drawer.md': 324,
  'empty-states.md': 91,
  'file-drop.md': 558,
  'going-back.md': 375,
  'hover-readouts.md': 333,
  'iconography.md': 321,
  'labels-and-titles.md': 384,
  'layout-and-density.md': 318,
  'state-set.md': 331,
  'stat-bands.md': 233,
};

/* A word is a whitespace-separated token holding a letter or a digit, so an em
 * dash standing alone is not one and `emptyState()` is one. Code in backticks
 * counts: the reader reads it. */
const WORD = /[\p{L}\p{N}]/u;
const words = (text) => (text ? text.split(/\s+/).filter((t) => WORD.test(t)).length : 0);

/** The prose one rule carries: its title and every field it fills. */
export const ruleWords = (rule) =>
  [rule.imperative, rule.instruction, rule.why, rule.except, rule.doCaption, rule.dontCaption, rule.unmet?.note]
    .reduce((total, field) => total + words(field), 0);

/**
 * One page's measurement. `words` is the whole page: its introduction, if it has
 * one, plus every rule. `intro` is carried separately so the table can show it —
 * an introduction inside a total and shown nowhere is what this check missed.
 *
 * @param {string} page      the file name, as the recorded figures key it
 * @param {string} text      the page's Markdown
 * @param {number} perRule
 * @returns {{page: string, rules: number, intro: number, words: number, budget: number, worst: number}}
 */
export function measure(page, text, perRule = WORDS_PER_RULE) {
  const { blurb, rules } = parseGuideline(text);
  const each = rules.map(ruleWords);
  const intro = words(blurb);
  return {
    page,
    rules: rules.length,
    intro,
    words: intro + each.reduce((a, b) => a + b, 0),
    budget: rules.length * perRule,
    worst: each.reduce((a, b) => Math.max(a, b), 0),
  };
}

/**
 * What is wrong with the collection, as lines a reader can act on without
 * opening this file. Every line names its page first.
 *
 * @param {Array<{page: string, rules: number, intro: number, words: number, budget: number}>} measured
 * @param {Record<string, number>} recorded
 * @returns {string[]}
 */
export function problemsIn(measured, recorded = RECORDED) {
  const problems = [];
  const seen = new Set();

  for (const m of measured) {
    const was = recorded[m.page];
    seen.add(m.page);

    if (m.words <= m.budget) {
      if (was != null) {
        problems.push(`${m.page}: ${m.words} words, within its budget of ${m.budget}`
          + ` — delete its line from RECORDED in scripts/word-budget.mjs`);
      }
      continue;
    }
    if (was == null) {
      problems.push(`${m.page}: ${m.words} words, ${m.words - m.budget} over its budget of ${m.budget}`
        + ` (${m.rules} rule${m.rules === 1 ? '' : 's'} at ${WORDS_PER_RULE}) — cut it`);
      continue;
    }
    if (m.words > was) {
      problems.push(`${m.page}: ${m.words} words, ${m.words - was} more than the ${was} recorded`
        + ` — a page over budget may not grow; cut it back`);
      continue;
    }
    if (m.words < was) {
      problems.push(`${m.page}: ${m.words} words, down from the ${was} recorded`
        + ` — record ${m.words} in scripts/word-budget.mjs so it cannot grow back`);
    }
  }

  for (const page of Object.keys(recorded)) {
    if (!seen.has(page)) {
      problems.push(`${page}: recorded at ${recorded[page]} words and no such page exists`
        + ` — delete its line from RECORDED in scripts/word-budget.mjs`);
    }
  }

  return problems;
}

/** Every guideline page, measured, worst rate first. */
export function measureCollection(dir = path.join(root, 'guidelines'), perRule = WORDS_PER_RULE) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => measure(f, readFileSync(path.join(dir, f), 'utf8'), perRule))
    .sort((a, b) => (b.words / (b.rules || 1)) - (a.words / (a.rules || 1)));
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  /* A directory argument measures another collection — a draft, or the fixture
   * that proves this check rejects what it claims to. The recorded figures are
   * this repository's pages at one moment, so they are applied to this
   * repository's directory and nowhere else. */
  const own = path.join(root, 'guidelines');
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : own;
  const measured = measureCollection(dir);
  const problems = problemsIn(measured, dir === own ? RECORDED : {});

  if (dir !== own) {
    const near = path.relative(process.cwd(), dir);
    console.log(`${!near || near.startsWith('..') ? dir : near}, measured against the budget alone:`
      + ` the recorded figures belong to this repository's pages.\n`);
  }
  console.log(`Guideline prose, against ${WORDS_PER_RULE} words a rule:\n`);
  console.log(['page'.padEnd(26), 'rules'.padStart(5), 'intro'.padStart(5), 'words'.padStart(6), 'budget'.padStart(7), 'worst rule'.padStart(11)].join(' '));
  for (const m of measured) {
    const over = m.words > m.budget ? ` over by ${m.words - m.budget}` : '';
    console.log([m.page.padEnd(26), String(m.rules).padStart(5), String(m.intro).padStart(5),
      String(m.words).padStart(6), String(m.budget).padStart(7), String(m.worst).padStart(11)].join(' ') + over);
  }

  if (problems.length === 0) {
    const frozen = measured.filter((m) => m.words > m.budget).length;
    console.log(`\nNo page has grown past what it is allowed.`
      + (frozen ? ` ${frozen} of ${measured.length} are over budget and held at the figure`
        + ` recorded for them: they may be cut, not added to.` : ''));
    process.exit(0);
  }
  console.log(`\n${problems.length} page${problems.length === 1 ? '' : 's'} to answer:`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
