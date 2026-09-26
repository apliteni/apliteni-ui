// Discover painted surfaces and ring consumers in both workspaces.
// Local inherit annotations explain controls, transparent washes and noninteractive paint.
// Discover subjects from source and check the coverage count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { customPropertiesIn } from '../scripts/lib/box-shadow.js';

const files = ['src', 'react/src'].flatMap((base) => readdirSync(base, { recursive: true })
  .filter((file) => String(file).endsWith('.css')).map((file) => `${base}/${file}`));
const sheets = files.map((file) => {
  const raw = readFileSync(file, 'utf8');
  return { file, raw, css: raw.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' ')) };
});
const declarations = sheets.flatMap(({ file, css }) => customPropertiesIn(css).map((d) => ({ file, ...d })));
const references = (value) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
const surface = (value, seen = new Set()) => references(value).some((name) => {
  if (/^--(?:bg(?:-elevated)?|surface(?:-[23])?|glow-[\w-]+|signal-solid-[\w-]+)$/.test(name)) return true;
  if (seen.has(name)) return false;
  return declarations.filter((d) => d.name === name).some((d) => surface(d.value, new Set([...seen, name])));
});
const rules = sheets.flatMap(({ file, css, raw }) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map((m) => ({ file, selector: m[1].trim(), body: m[2], raw: raw.slice(m.index, m.index + m[0].length) })));
const surfaces = rules.filter(({ body }) => {
  const background = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(body)?.[1].trim();
  return background && (surface(background) || background.startsWith('color-mix('));
});
const own = (rule) => new Map(customPropertiesIn(`${rule.selector}{${rule.body}}`).map((d) => [d.name, d.value]));
const compositions = rules.filter((r) => own(r).has('--ring'));
const consumers = rules.filter(({ body }) => /(?:^|;)\s*box-shadow\s*:[^;]*var\(--ring\)/.test(body));

test('every painted surface sets a matching gap or explains why the containing gap is correct', () => {
  assert.equal(surfaces.length, 137, 'surface discovery changed; includes file field, glyph tile and disabled field');
  const shared = compositions.find((r) => !r.selector.includes(':root'));
  const covered = (rule) => rule.selector.split(',').every((selector) => shared.selector.split(',').map((s) => s.trim()).includes(selector.trim()));
  for (const rule of surfaces) {
    const gap = own(rule).get('--ring-gap');
    const background = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(rule.body)[1].trim();
    if (/\/\* ring-gap: inherit — .+\. \*\//.test(rule.raw)) {
      assert.ok(gap === undefined || gap === 'inherit', `${rule.selector} must inherit the containing gap`);
      continue;
    }
    assert.equal(gap, background, `${rule.file}: ${rule.selector} gap differs from its background`);
    assert.ok(covered(rule), `${rule.selector} does not compose the shared ring`);
  }
  // Alias-setting variants can paint through a background declared on their base.
  // They still need their own composition (for example an opaque footer variant).
  for (const rule of rules.filter((r) => !r.selector.includes(':root') && own(r).has('--ring-gap') && own(r).get('--ring-gap') !== 'inherit')) {
    assert.ok(covered(rule), `${rule.selector} changes the gap without composing the ring`);
  }
  assert.doesNotMatch(rules.find((r) => r.selector === '.ui-app').body, /--ring(?:-gap)?\s*:/, 'the page shell must preserve root overrides');
});

test('every ring consumer keeps a real outline for forced colors', () => {
  assert.equal(consumers.length, 27, 'ring consumer discovery changed');
  for (const { file, selector, body } of consumers) {
    assert.match(body, /(?:^|;)\s*outline:\s*2px solid transparent\s*;/, `${file}: ${selector} loses focus when forced colors removes box-shadow`);
  }
});

test('form focus rules use focus-visible and invalid fields cannot replace the band with a wash', () => {
  const form = sheets.find((s) => s.file === 'src/styles/input.css').css;
  assert.doesNotMatch(form, /:focus(?!-visible)/);
  assert.doesNotMatch(form, /\.is-invalid[^{}]*\{[^}]*box-shadow/);
});
