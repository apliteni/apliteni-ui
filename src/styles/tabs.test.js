import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./tap-zone.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('Tabs tools get the phone tap clearance that their row opens', () => {
  const phone = /@media \(max-width: 560px\) and \(pointer: coarse\) \{([\s\S]*)\n\}/.exec(css)?.[1] ?? '';
  const row = /\.ui-tabs__row\s*\{([^{}]*)\}/.exec(phone)?.[1] ?? '';
  const tools = /\.ui-tabs__tools\s*\{([^{}]*)\}/.exec(phone)?.[1] ?? '';

  assert.match(row, /row-gap\s*:\s*var\(--tap-gap\)/,
    'The tab row must open enough space for a wrapped page control.');
  assert.match(tools, /--tap-clear-y\s*:\s*var\(--tap-gap\)/,
    'The page control must use the vertical clearance that its row opens.');
});
