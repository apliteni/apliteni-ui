import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const story = readFileSync(path.join(here, 'SessionExpired.stories.tsx'), 'utf8');

test('the session-ended picture keeps the dialog over a page-only view', () => {
  assert.doesNotMatch(story, /FinanceShell/);
  assert.match(story, /className="se-page__scrim"/);
  assert.match(story, /className="se-page__dialog"/);
});
