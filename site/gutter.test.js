// The page gutter survives whatever a section writes over it.
//
// `padding` is a shorthand: it sets all four axes, including the ones it does
// not mention. So `style="padding:70px 0"` on an element whose class supplies
// the page gutter deletes that gutter, and the section sits flush against the
// viewport edge at every width below the container. Three sections of
// site/index.html shipped that way.
//
// Not measured through a layout engine on purpose. jsdom resolves no layout,
// and its CSSOM drops rules it cannot parse — the gutter reads as absent on
// elements that have one, which is a gate that fails on healthy pages. The
// defect has an exact source form, so the source is what this reads.
//
// why: CONTRIBUTING.md#a-shorthand-resets-the-axis-it-does-not-mention
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PAGES = readdirSync(new URL('.', import.meta.url)).filter((f) => f.endsWith('.html'));

/** Split a shorthand value on top-level whitespace, so `clamp(18px, 4vw, 34px)`
 *  counts as one value rather than three. */
const parts = (v) => v.trim().split(/\s+(?![^(]*\))/);

/** Classes the page's own <style> gives inline-axis padding to. Read by
 *  property rather than by one spelling: a gutter is written as a shorthand
 *  with two or more values, as padding-inline, or as padding-left/right. */
function gutterClasses(css) {
  const out = new Set();
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = body.toLowerCase();
    const inline = /padding-(inline|left|right)\s*:/.test(decls)
      || [...decls.matchAll(/(?:^|;)\s*padding\s*:\s*([^;]+)/g)]
        .some(([, v]) => parts(v).length > 1 && parts(v)[1] !== '0');
    if (!inline) continue;
    for (const [, cls] of sel.matchAll(/\.([A-Za-z_][\w-]*)/g)) out.add(cls);
  }
  return out;
}

/** The inline-axis value a `padding` shorthand resolves to, or null when the
 *  declaration is not a shorthand and so leaves the axis alone. */
function inlineAxisOf(styleAttr) {
  const m = [...(styleAttr || '').matchAll(/(?:^|;)\s*padding\s*:\s*([^;]+)/gi)].pop();
  if (!m) return null;
  const p = parts(m[1]);
  return p.length === 1 ? p[0] : p[1];
}

const isZero = (v) => v !== null && /^0[a-z%]*$/i.test(v);

for (const page of PAGES) {
  const html = readFileSync(new URL(page, import.meta.url), 'utf8');
  const { window } = new JSDOM(html);
  const css = [...window.document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
  const classes = gutterClasses(css);

  // The page container is discovered by the token it bounds with, not by its
  // name: whatever holds `max-width: var(--container)` is what the sections sit
  // in. Pinning it here is what makes the check below able to fail — a gutter
  // deleted from the stylesheet would otherwise drop its class out of the
  // discovered set, and the element checks would go quietly silent.
  // A container is a token max-width plus the centring margin. Both marks are
  // needed: index.html bounds with --container and changelog.html with
  // --measure, so the token cannot be named; and a bounded paragraph carries a
  // max-width without ever being a container, so the centring is what tells
  // them apart.
  const containers = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /max-width\s*:\s*var\(\s*--[\w-]+\s*\)/i.test(body)
      && /margin\s*:\s*[^;]*\bauto\b|margin-inline\s*:\s*[^;]*\bauto\b/i.test(body))
    .flatMap(([, sel]) => [...sel.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(([, c]) => c));

  test(`${page}: the page container still carries a gutter`, () => {
    assert.ok(containers.length > 0,
      `${page} centres nothing under a token max-width — the container moved, or this `
      + 'scan stopped seeing it, and a scan with no subject cannot fail.');
    const bare = containers.filter((c) => !classes.has(c));
    assert.deepEqual(bare, [],
      'the container class sets no inline-axis padding, so every section it holds runs '
      + 'edge to edge below the container width.');
  });

  const subjects = [...classes].flatMap((c) =>
    [...window.document.querySelectorAll(`.${c}`)].map((el) => ({ el, c })));

  test(`${page}: the scan reaches real elements`, () => {
    assert.ok(subjects.length > 0, `${page} declares gutter classes that nothing uses.`);
  });

  test(`${page}: no inline shorthand deletes the gutter its class supplies`, () => {
    const flush = subjects
      .filter(({ el }) => isZero(inlineAxisOf(el.getAttribute('style'))))
      .map(({ el, c }) => `${el.id ? `#${el.id}` : el.tagName.toLowerCase()}.${c}`
        + ` — style="${el.getAttribute('style')}"`);
    assert.deepEqual(flush, [],
      'these sit flush against the viewport edge below the container width. A `padding` '
      + 'shorthand resets the axes it does not name, so `padding:70px 0` over a gutter '
      + 'class deletes the gutter. Write `padding-block` when only the vertical axis is meant.');
  });
}
