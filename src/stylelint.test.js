import test from 'node:test';
import assert from 'node:assert/strict';
import stylelint from 'stylelint';
import config from './stylelint.js';

const lint = (code) => stylelint.lint({ code, config });

const rules = async (code) => {
  const result = await lint(code);
  return result.results[0].warnings.map((warning) => warning.rule);
};

test('refuses a raw hex colour', async () => {
  assert.ok((await rules('a { color: #e11d48; }')).includes('color-no-hex'));
});

test('refuses a raw rgb() colour', async () => {
  assert.ok((await rules('a { color: rgb(225, 29, 72); }')).includes('function-disallowed-list'));
});

test('refuses a named colour', async () => {
  assert.ok((await rules('a { color: red; }')).includes('color-named'));
});

test('refuses a raw px spacing value', async () => {
  assert.ok((await rules('a { padding: 12px; }')).includes('declaration-property-unit-disallowed-list'));
});

test('refuses an override of a kit class', async () => {
  assert.ok((await rules('.ui-button { color: var(--text); }')).includes('selector-disallowed-list'));
});

test('allows a colour token', async () => {
  const result = await lint('a { color: var(--fg); }');
  assert.equal(result.errored, false);
});

test('allows a spacing token', async () => {
  const result = await lint('a { padding: var(--space-12); }');
  assert.equal(result.errored, false);
});

test('allows a disable comment that names a reason', async () => {
  const code = '/* stylelint-disable color-no-hex -- approved exception on #772 */\na { color: #e11d48; }';
  const result = await lint(code);
  assert.equal(result.errored, false);
});

test('refuses a disable comment with no reason', async () => {
  const code = '/* stylelint-disable color-no-hex */\na { color: #e11d48; }';
  assert.ok((await rules(code)).includes('--report-descriptionless-disables'));
});
