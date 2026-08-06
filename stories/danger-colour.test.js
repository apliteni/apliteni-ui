/* Rule: a destructive control is --pink, in every state.
 *
 * A rule that names itself destructive must never paint with the brand accent.
 * Under Phoenix the accent is ember and under Nebula it is purple; either way
 * "delete" would light up in the colour the kit uses for "go". The reference
 * implementations are button.css (.ui-btn--danger) and nav.css (.ui-nav__item
 * .is-danger).
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STYLES = fileURLToPath(new URL('../src/styles/', import.meta.url));

const DANGER_SELECTOR = /is-danger|--danger|--pink/;
const ACCENT_VALUE = /var\(\s*--accent[\w-]*/;
const RULE = /([^{}]+)\{([^{}]*)\}/g;

const decomment = (css) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

test('a danger rule never resolves to var(--accent)', () => {
  const offences = [];

  for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css'))) {
    const css = decomment(readFileSync(STYLES + file, 'utf8'));
    for (const m of css.matchAll(RULE)) {
      const [, selector, body] = m;
      if (selector.trimStart().startsWith('@')) continue;
      if (!DANGER_SELECTOR.test(selector) || !ACCENT_VALUE.test(body)) continue;
      const start = m.index + selector.length - selector.trimStart().length;
      const line = css.slice(0, start).split('\n').length;
      offences.push(`${file}:${line}  ${selector.trim()} { ${body.trim()} }`);
    }
  }

  assert.deepStrictEqual(
    offences,
    [],
    `destructive rule painting with the accent — use --pink:\n  ${offences.join('\n  ')}`,
  );
});
