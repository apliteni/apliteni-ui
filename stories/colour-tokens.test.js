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

/* The same rule, for a colour the scan above cannot see.
 *
 * A data URI encodes `#` as `%23`, so a hex inside one is invisible to the LITERAL
 * pattern — which is how the select's chevron kept dark --muted's pre-#295 value
 * and reached 2.49:1 on the light field. A stencil in a data URI cannot read a
 * token (`var()` does not substitute inside url(), and `currentColor` does not
 * cross into the image's document), so the literal is unavoidable; what is not
 * unavoidable is a literal the ramp no longer declares.
 *
 * What this does NOT reach: whether the value is the RIGHT token for the ground
 * the image is drawn on. It catches a ramp that moved and left a stencil behind,
 * which is the failure that happened.
 */
const TOKEN_DIR = fileURLToPath(new URL('../src/tokens/', import.meta.url));
const ENCODED = /%23([0-9a-fA-F]{3,8})\b/g;

test('an encoded colour in a data URI is still a value the ramp declares', () => {
  const ramp = new Set();
  for (const file of readdirSync(TOKEN_DIR).filter((f) => f.endsWith('.css'))) {
    const css = decomment(readFileSync(TOKEN_DIR + file, 'utf8'));
    for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) ramp.add(m[0].toLowerCase());
  }

  const orphans = [];
  let swept = 0;
  for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css'))) {
    const css = decomment(readFileSync(STYLES + file, 'utf8'));
    for (const m of css.matchAll(ENCODED)) {
      swept += 1;
      const hex = `#${m[1].toLowerCase()}`;
      if (ramp.has(hex)) continue;
      const line = css.slice(0, m.index).split('\n').length;
      orphans.push(`${file}:${line}  ${hex} (encoded ${m[0]})`);
    }
  }

  assert.ok(swept > 0, 'no encoded colour was found at all — the sweep is reading nothing');
  assert.deepStrictEqual(
    orphans,
    [],
    'an encoded colour in a data URI is not a value src/tokens declares any more, so the '
      + 'stencil is painting a hex the kit has moved on from:\n  '
      + `${orphans.join('\n  ')}\n`
      + 'Re-encode it from the token it stands for, per theme where the token differs by theme.',
  );
});
