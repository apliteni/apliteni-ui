/* Rule: colour comes from a semantic token, never a literal.
 *
 * Scanned by PROPERTY, never by a file/line allowlist. That is what keeps the
 * mask stencils out on their own merit: in `mask`, `mask-image` and
 * `-webkit-mask-image` the #000 is an alpha channel, not a colour, and none of
 * those are colour-valued properties. If this ever needs an exception list,
 * the rule below is wrong — fix the rule.
 *
 * Literals belong in src/tokens/*.css, which is the ramp and is not scanned.
 * color-mix(in srgb, var(--x) N%, transparent) is fine: it takes a token.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STYLES = fileURLToPath(new URL('../src/styles/', import.meta.url));

const NAMED = new Set([
  'color', 'background', 'background-color', 'background-image',
  'fill', 'stroke', 'box-shadow', 'text-shadow', 'outline',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
]);
// Custom properties can feed any of the above, and every `*-color` longhand
// (border-color, outline-color, caret-color …) is colour-valued by definition.
const isColourProp = (p) => p.startsWith('--') || p.endsWith('-color') || NAMED.has(p);

const LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/;
const DECL = /(?:^|[;{}])\s*(--[\w-]+|-?[a-zA-Z][\w-]*)\s*:\s*([^;{}]*)/g;

/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

test('no raw colour in a colour-valued property across src/styles', () => {
  const offences = [];

  for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css'))) {
    const css = decomment(readFileSync(STYLES + file, 'utf8'));
    for (const m of css.matchAll(DECL)) {
      const [, prop, value] = m;
      if (!isColourProp(prop) || !LITERAL.test(value)) continue;
      const line = css.slice(0, m.index + m[0].indexOf(prop)).split('\n').length;
      offences.push(`${file}:${line}  ${prop}: ${value.trim()}`);
    }
  }

  assert.deepStrictEqual(
    offences,
    [],
    `raw colour found — move it into src/tokens/tokens.css and name its job:\n  ${offences.join('\n  ')}`,
  );
});
