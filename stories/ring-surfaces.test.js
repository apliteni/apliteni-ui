// Discover surfaces from their backgrounds, including local aliases, in both workspaces.
// This checks propagation declarations; Chromium evidence checks paint and native focus heuristics.
// why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { customPropertiesIn } from '../scripts/lib/box-shadow.js';

const files = ['src', 'react/src'].flatMap((base) => readdirSync(base, { recursive: true })
  .filter((file) => String(file).endsWith('.css')).map((file) => `${base}/${file}`));
const sheets = files.map((file) => ({ file, css: readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') }));
const declarations = sheets.flatMap(({ file, css }) => customPropertiesIn(css).map((d) => ({ file, ...d })));
const references = (value) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
const raised = (value, seen = new Set()) => references(value).some((name) => {
  if (name === '--bg-elevated') return true;
  if (seen.has(name)) return false;
  const next = new Set([...seen, name]);
  return declarations.filter((d) => d.name === name).some((d) => raised(d.value, next));
});
const surfaces = sheets.flatMap(({ file, css }) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .flatMap(([, selector, body]) => {
    if (selector.trim().startsWith('@')) return [];
    const background = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(body)?.[1].trim();
    if (!background || (!raised(background) && !/(?:^|;)\s*--ring-gap\s*:/.test(body))) return [];
    return [{ file, selector: selector.trim(), body, background }];
  }));

test('every raised surface re-points the gap and recomposes the ring, including the React modal', () => {
  assert.equal(surfaces.length, 16, 'surface discovery changed; inspect every addition or removal');
  const canonical = declarations.find((d) => d.name === '--ring' && d.file === 'src/tokens/tokens.css').value;
  for (const { file, selector, body, background } of surfaces) {
    const own = new Map(customPropertiesIn(`${selector}{${body}}`).map((d) => [d.name, d.value]));
    assert.equal(own.get('--ring-gap'), background, `${file}: ${selector} gap differs from its background`);
    assert.equal(own.get('--ring'), canonical, `${file}: ${selector} does not recompose the shared ring`);
  }
});

test('form focus rules use focus-visible and invalid fields cannot replace the band with a wash', () => {
  const form = sheets.find((s) => s.file === 'src/styles/input.css').css;
  assert.doesNotMatch(form, /:focus(?!-visible)/);
  assert.doesNotMatch(form, /\.is-invalid[^{}]*\{[^}]*box-shadow/);
});
