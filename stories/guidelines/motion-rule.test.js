// The Motion page carries the #900 rule: every visible change of state is a
// smooth transition, a count or a status line that changes in place cross-fades
// in 150ms, and only the focus ring and text a reader is typing stay one-step.
// A page missing it renders a rule that no code honours, so this gate reads the
// page itself and fails on a page that lost the rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseGuideline } from './_markdown.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const md = readFileSync(path.join(here, '../../guidelines/motion.md'), 'utf8');

test('the Motion page rules that every visible change is a smooth transition', () => {
  const rules = parseGuideline(md).rules;
  const rule = rules.find((r) => r.id === 'every-change');
  assert.ok(rule, 'no every-change rule — the Motion page is missing the #900 rule');
  assert.match(rule.imperative, /smooth transition/i);
  assert.match(rule.instruction, /smooth transition/i);
  assert.match(rule.doCaption, /150\s*ms/);
  assert.match(rule.except, /focus ring/);
  assert.match(rule.except, /typed/);
});

test('the Motion page no longer excepts counts and status lines as immediate', () => {
  const afterLoad = parseGuideline(md).rules.find((r) => r.id === 'after-load');
  assert.ok(afterLoad, 'no after-load rule — the Motion page lost its first rule');
  assert.ok(!/count|status/i.test(afterLoad.except ?? ''), 'counts and status lines still read as immediate exceptions');
});
