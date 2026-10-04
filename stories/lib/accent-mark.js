/* The mark that says which accent swatch is selected, read out of segmented.css.
 *
 * READS: segmented.css alone, with the root tokens and the selected button's own
 * custom properties substituted in, because JSDOM resolves no var(). The mark is
 * a ::after, which JSDOM does not compute at all, so what is read is the winning
 * declaration — and the rule is required to be the only one in the picker's sheet
 * that draws a pseudo-element, which is what makes that a true statement about it
 * and what stops a :focus-visible rule erasing the mark.
 *
 * CANNOT READ: browser paint, antialiasing, subpixel placement of the turned
 * tick, the halo in var(--ring), and anything the rest of the cascade adds on a
 * real page. The two gradient stops are read as flat colours and the mark is
 * measured against each, so the fade between them is not sampled; the fit is
 * measured against the circle's inscribed square, which is sufficient and not
 * tightest. Browser captures cover all of it.
 *
 * THE CASE THAT MATTERS: the root is put on a DIFFERENT accent from the one
 * selected. A gate that sets the root to the accent it then selects cannot see a
 * mark painted in var(--accent) at all.
 * why: docs/specification.md#react-accent-picker. See issues #429 and #472.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { desugar, tokensFor, substitute, parseColour, ratio } from './contrast.js';

const CSS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/styles/segmented.css');

/** The non-text contrast floor in guidelines/accessibility-floor.md. */
export const MARK_FLOOR = 3;

const RULE = /([^{}]+)\{([^{}]*)\}/g;
/** Blank a comment out without moving any line, so file:line stays honest. A
 *  declaration list here is split on `;` and `:`, and both appear in prose. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const rulesOf = (css) => [...decomment(css).matchAll(RULE)].map(([, selector, body]) => ({ selector, body }));

/** The rule that draws the swatch circle itself — the ground the mark sits on. */
function circleRule(css) {
  const rules = rulesOf(css).filter(({ selector }) => /^\.ui-accent-picker button$/.test(selector.trim()));
  assert.equal(
    rules.length, 1,
    `segmented.css draws the swatch circle in ${rules.length} rules, not one. This gate reads the `
    + "mark's ground out of that rule, and several of them means the ground is a cascade question",
  );
  return rules[0].body;
}

/** A declaration's value, or a thrown explanation. Last wins, as in a browser. */
function declaration(body, prop) {
  const found = body.split(';')
    .map((decl) => [decl.slice(0, decl.indexOf(':')).trim(), decl.slice(decl.indexOf(':') + 1).trim()])
    .filter(([name]) => name === prop);
  assert.ok(found.length, `the rule declares no ${prop}`);
  return found.at(-1)[1];
}

/** A px length, including the `calc(50% - 2px)` the mark is centred with. */
function px(value, percentOf = null) {
  const s = String(value).trim();
  const inner = /^calc\((.*)\)$/s.exec(s);
  const term = (t) => {
    const asPx = /^(-?[\d.]+)px$/.exec(t);
    if (asPx) return Number.parseFloat(asPx[1]);
    const asPercent = /^(-?[\d.]+)%$/.exec(t);
    if (asPercent) {
      assert.ok(percentOf !== null, `a percentage needs a box to resolve against: ${s}`);
      return (Number.parseFloat(asPercent[1]) / 100) * percentOf;
    }
    const asZero = /^(-?0)$/.exec(t);
    assert.ok(asZero, `not a length this gate can read: ${t}`);
    return 0;
  };
  if (!inner) return term(s);
  // Only `a + b` and `a - b` appear in this sheet; anything else fails loudly.
  const parts = inner[1].split(/\s+(?=[-+]\s)/).map((p) => p.trim());
  return parts.reduce((sum, part, index) => {
    if (index === 0) return term(part);
    const sign = part.startsWith('-') ? -1 : 1;
    return sum + sign * term(part.replace(/^[-+]\s*/, ''));
  }, 0);
}

/**
 * The one rule in segmented.css that draws the selected swatch's mark.
 *
 * Exactly one, and it is the only rule in the picker's sheet that addresses a
 * pseudo-element at all. That is the whole reason focus cannot erase selection
 * any more: there is no second rule able to. A `:focus-visible::after` added
 * beside it fails here rather than silently winning on specificity.
 */
export function markRule(css) {
  const pseudo = rulesOf(css)
    .filter(({ selector }) => selector.includes('.ui-accent-picker'))
    .filter(({ selector }) => /::(?:after|before)/.test(selector));
  assert.equal(
    pseudo.length, 1,
    'the accent picker draws exactly one pseudo-element, and it is the selected swatch\'s mark. '
    + `Found ${pseudo.length}: ${pseudo.map((r) => r.selector.trim()).join(' | ')}. A second one is `
    + 'a second rule able to cancel the first — which is how focus used to erase the only thing '
    + 'saying which accent is on',
  );
  const { selector, body } = pseudo[0];
  // desugar() rewrites the state pseudo-classes, so a mark that only paints
  // under one of them would not reach this selector as `.is-active::after`.
  assert.match(
    selector.trim(), /^\.ui-accent-picker button\.is-active::after$/,
    'the mark belongs to the selected swatch and to no narrower state',
  );
  assert.equal(declaration(body, 'content'), '""', 'a pseudo-element with no content paints nothing');
  return { selector: selector.trim(), body };
}

/**
 * One declaration of the mark rule, exactly as the sheet writes it.
 *
 * The mutations in the gates rewrite the sheet text, and the text is hex where
 * the measurement is rgb(), so they need the written form to find. Reading it
 * through the same parser is what keeps a mutation that silently matched nothing
 * from passing as a rejection.
 */
export function markDeclaration(css, prop) {
  return declaration(markRule(css).body, prop);
}

/**
 * segmented.css with the root on `rootAccent` for `theme`, and `swatchStyle` —
 * the properties the selected button really carries — resolved as the element's
 * own values.
 */
export function accentPickerCss(theme, rootAccent, swatchStyle) {
  const css = readFileSync(CSS, 'utf8');
  const vars = tokensFor(theme, rootAccent);
  for (const [prop, value] of Object.entries(swatchStyle)) vars.set(prop, value);
  return desugar(substitute(css, vars));
}

/** The accent a theme paints for `accent`, as the token files declare it. */
export function accentColour(theme, accent) {
  const vars = tokensFor(theme, accent);
  const colour = parseColour(substitute(vars.get('--accent'), vars));
  assert.ok(colour, `${theme} ${accent} declares no --accent this gate can read`);
  return colour;
}

/** What a colour paints, as numbers, so notation differences are not drift. */
export const paints = (c) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;

/** The circle's diameter, as the rule that draws it declares it. */
function diameterOf(css) {
  const body = circleRule(css);
  const size = ['width', 'height'].map((prop) => px(declaration(body, prop)));
  assert.equal(size[0], size[1], `the swatch is a circle, so its width and height match: ${size.join(' x ')}`);
  return size[0];
}

/** The two flat stops of the gradient the swatch circle is painted in. */
function swatchStops(css) {
  const background = declaration(circleRule(css), 'background');
  const gradient = /^linear-gradient\(([^)]*)\)$/.exec(background.trim());
  assert.ok(gradient, `the swatch circle is painted ${background}, which this gate reads no stops out of. `
    + 'It reads the two bare stops src/logic/accents.js writes');
  const fields = gradient[1].split(',').map((f) => f.trim());
  assert.equal(fields.length, 3, `the swatch gradient is an angle and two stops, not ${fields.length} fields`);
  return fields.slice(1).map((field) => {
    const colour = parseColour(field);
    assert.ok(colour && colour[3] === 1, `a swatch stop this gate can read, opaque: ${field}`);
    return colour;
  });
}

/**
 * Measure the selected swatch's mark and return its contrast against the circle.
 *
 * `notAccents` is every accent colour this theme paints. The mark has to be none
 * of them: an accent-coloured mark is a second accent signal on a control whose
 * one accent signal is the kit's focus ring, which is the composition #472's
 * review rejected. Passing the list in is what makes this an assertion rather
 * than a reading.
 *
 * Throws unless the mark clears MARK_FLOOR against BOTH stops of the gradient
 * the circle wears, and unless its turned bounding box fits inside the circle.
 */
export function measureSelectionMark(css, notAccents) {
  const { body } = markRule(css);
  const ink = parseColour(declaration(body, 'border').replace(/^solid\s+/, ''));
  assert.ok(ink && ink[3] === 1, `the mark paints an opaque ink this gate can read: ${declaration(body, 'border')}`);
  const forbidden = notAccents.find((accent) => paints(accent) === paints(ink));
  assert.ok(
    !forbidden,
    `the mark paints ${paints(ink)}, which is an accent. Selection is the one mark on this control `
    + 'that is NOT an accent: the kit focus ring is the accent edge, and a second one beside it is '
    + 'two signals on one element — the composition #472 was sent back for',
  );

  const diameter = diameterOf(css);
  const stops = swatchStops(css);
  const ratios = stops.map((stop) => {
    const contrast = ratio(ink, stop);
    assert.ok(
      contrast >= MARK_FLOOR,
      `the mark reads ${contrast.toFixed(2)}:1 on the swatch stop ${paints(stop)}, under the `
      + `${MARK_FLOOR}:1 non-text floor. The circle wears the accent's dark ramp in both themes, so `
      + 'the ink that reads on it is the one for a saturated fill and not the one for the surface',
    );
    return contrast;
  });

  // The mark is turned 45deg, so what has to fit is its TURNED box. Measured
  // against the circle's inscribed square, which every point of that box being
  // inside the circle follows from.
  const size = ['width', 'height'].map((prop) => px(declaration(body, prop)));
  const centre = ['left', 'top'].map((prop) => px(declaration(body, prop), diameter));
  const turned = (size[0] + size[1]) / Math.SQRT2;
  const inscribed = diameter / Math.SQRT2;
  const slack = (diameter - inscribed) / 2;
  for (const [axis, at] of centre.entries()) {
    const [low, high] = [at - turned / 2, at + turned / 2];
    assert.ok(
      low >= slack && high <= diameter - slack,
      `turned, the ${size.join('x')} mark spans ${low.toFixed(2)}-${high.toFixed(2)}px on `
      + `${axis ? 'y' : 'x'} inside a ${diameter}px circle, past the ${slack.toFixed(2)}-`
      + `${(diameter - slack).toFixed(2)}px square it has to stay inside. A mark that reaches the `
      + 'rim is clipped by border-radius and stops reading as a tick',
    );
  }
  return { ink, ratios, stops, geometry: { size, centre, turned, diameter } };
}
