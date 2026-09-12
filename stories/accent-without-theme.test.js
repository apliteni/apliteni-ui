// why: CONTRIBUTING.md#accent-default-measurements
import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

/* The token files in the order src/index.css imports them — the cascade a
 * consumer of `apliteni-ui/css` actually gets. */
const TOKENS = [
  'src/tokens/brand.generated.css',
  'src/tokens/tokens.css',
  'src/tokens/accents.css',
].map(read).join('\n');

/** Every accent name accents.css declares, in file order. */
const ACCENTS = [...new Set(
  [...read('src/tokens/accents.css').matchAll(/data-accent="([\w-]+)"/g)].map((m) => m[1]),
)];

/** Resolve a custom property on <html> carrying exactly these attributes. */
function resolve(attrs, name) {
  const dom = new JSDOM(
    `<!doctype html><html lang="en" ${attrs}>`
    + `<head><style>${TOKENS}</style></head><body></body></html>`,
  );
  const { window } = dom;
  const value = window.getComputedStyle(window.document.documentElement)
    .getPropertyValue(name).trim();
  window.close();
  return value;
}

/* The semantic tokens a page cannot render without: the ground, the ink, and
 * the line between two surfaces. */
const ESSENTIAL = ['--bg', '--surface', '--text', '--border', '--accent'];

test('an unstamped :root is fully painted — the default theme needs no attribute', () => {
  const missing = ESSENTIAL.filter((name) => !resolve('', name));
  assert.deepEqual(
    missing, [],
    `${missing.join(', ')} resolve to nothing on an <html> with no data-theme, so a host that `
    + 'renders the kit without stamping the attribute gets browser defaults — black ink on a '
    + 'transparent ground. The dark palette is declared on a two-line selector list in '
    + 'src/tokens/tokens.css whose FIRST line is a bare `:root,`; deleting that line, or moving '
    + 'the colours under [data-theme] only, is what breaks this.',
  );
});

test('the unstamped :root is the dark theme, not a third palette', () => {
  for (const name of ESSENTIAL) {
    assert.equal(
      resolve('', name), resolve('data-theme="dark"', name),
      `${name} differs between an unstamped <html> and data-theme="dark". The two are one `
      + 'selector list in src/tokens/tokens.css and must stay one: a value that resolves only '
      + 'when the attribute is absent is a palette nobody can toggle back to.',
    );
  }
});

/* accents.css as [selector, body] pairs, comments blanked — a comment there
 * quotes token names, and a quoted name is not a declaration. */
const RULES = [...read('src/tokens/accents.css')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .matchAll(/([^{}]+)\{([^{}]*)\}/g)];

/** The custom properties declared by the cell whose selector list holds `form`. */
function cellProps(form) {
  const props = new Set();
  for (const [, selector, body] of RULES) {
    const parts = selector.split(',').map((s) => s.trim().replace(/\s+/g, ' '));
    if (!parts.includes(form)) continue;
    for (const [, name] of body.matchAll(/(--[\w-]+)\s*:/g)) props.add(name);
  }
  return props;
}

for (const accent of ACCENTS) {
  /* The bare cell ties on specificity with :root[data-theme="light"] and sits in
   * the later file, so it beats the light THEME block. Only the light cell's third
   * attribute out-specifies it — and only for the properties that cell actually
   * declares. One the dark half declares and the light half forgets is a dark ramp
   * value painting a light page, which no contrast gate would see: they resolve
   * light through tokensFor, and tokensFor never applies the bare cell. */
  test(`light ${accent} covers every property its dark twin declares`, () => {
    const dark = cellProps(`:root[data-accent="${accent}"]`);
    const light = cellProps(`:root[data-theme="light"][data-accent="${accent}"]`);
    assert.ok(dark.size, `no bare cell for "${accent}" in src/tokens/accents.css`);
    const leaking = [...dark].filter((name) => !light.has(name));
    assert.deepEqual(
      leaking, [],
      `light ${accent} does not declare ${leaking.join(', ')}, which its dark cell does. The `
      + `dark cell's bare selector — :root[data-accent="${accent}"] — matches a light document `
      + 'too and out-ranks :root[data-theme="light"] on import order, so those properties would '
      + `paint a light page with ${accent}'s DARK ramp. Declare them in the light cell, or drop `
      + 'them from the dark one.',
    );
  });

  test(`data-accent="${accent}" paints with no data-theme`, () => {
    const stamped = resolve(`data-theme="dark" data-accent="${accent}"`, '--accent');
    const bare = resolve(`data-accent="${accent}"`, '--accent');
    assert.ok(stamped, `no dark cell for "${accent}" in src/tokens/accents.css`);
    assert.equal(
      bare, stamped,
      `data-accent="${accent}" does nothing unless data-theme is also set: --accent resolves to `
      + `${bare} without it and ${stamped} with it. Its cell in src/tokens/accents.css needs both `
      + 'attributes to match, so in the "follow the system" state — where hosts express the '
      + 'system theme by leaving data-theme OFF — the accent silently falls through to the '
      + 'default purple. The theme is reachable without the attribute; the accent has to be too. '
      + 'See issue #250.',
    );
  });
}
