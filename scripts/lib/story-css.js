/**
 * What CSS a story writes for itself, and whether the kit should have written it.
 *
 * why: AGENTS.md#changes — "Showcases and stories use kit classes; local CSS may only
 * place kit parts (layout glue), never restyle or re-implement them (#601)."
 *
 * A showcase is the kit on a page. CSS a story writes for itself is therefore one of
 * two things: it puts a kit part somewhere, or it does a kit part's job again. The
 * second kind is what #601 calls a shadow kit, and it is a defect twice over — the
 * showcase stops demonstrating the kit, and the gap it papers over never reaches an
 * issue.
 *
 * Every declaration a story carries gets exactly one verdict:
 *
 *   glue       the story's own selector, placing something: display, grid, gap,
 *              margin, width, position… It is free, up to a count.
 *   placement  the same placement, but written onto a kit class. Allowed only from an
 *              allow-list, because naming `.ui-card` in a story is the one case where
 *              a reviewer has to agree the kit offers no other way.
 *   shadow     paint, type or motion — background, border, colour, font, shadow,
 *              transition — wherever it is written, and a kit token re-declared.
 *              There is no allow-list: the kit owns how its parts look.
 *   unknown    something this file cannot sort: a property that is in neither
 *              vocabulary, or a style block it cannot read. Reported as a failure,
 *              never passed over — a gate that passes what it cannot classify is a
 *              gate with a hole in it, and so is a gate that measures an unreadable
 *              style block as zero declarations.
 *
 * Both vocabularies are closed lists of property names. A property in neither is
 * `unknown` wherever it is written, kit selector or not: a pattern wide enough to guess
 * at a name it has never seen guesses wrong, and `column-rule: 8px solid red` is the
 * proof — a paint declaration that a `column-*` pattern called placement.
 *
 * Both workspaces read with this module and keep their own subjects, allow-list and
 * recorded figures, which is what AGENTS.md#verification asks for.
 *
 * LIMITS, so a pass is not read as more than it is:
 *  - Source, not paint. This reads the text of a `<style>` block, a story-only
 *    stylesheet and a `style=` attribute. A declaration assembled at run time out of
 *    string pieces, or set through `element.style.x = …`, is not seen.
 *  - A `style=` attribute's subject is the `class` its own tag spells out literally,
 *    wherever in the tag it is written. A className built by an expression reads as no
 *    class at all, so a placement onto a kit class written that way lands in `glue`
 *    rather than in the allow-list.
 *  - `style={name}` and `style={name.key}` are read through to the `const name = {…}`
 *    object literal in the same file. Any other expression is reported as unreadable.
 *  - A `...spread` inside a style object is not followed. The object it spreads is
 *    measured where that object's own declarations are written, not again at the tag.
 *  - One property, one verdict, by name. `border: 0` reads as paint because `border`
 *    paints; a story that clears one is still deciding how a part looks.
 *  - Specificity is not resolved. A story rule that loses the cascade still counts: it
 *    was written to win, and a reader reads it as the story's intent.
 *  - `@media` bodies are read, their conditions are not. A glue declaration inside a
 *    breakpoint costs the same as one outside it.
 */

/* Placement: where a box sits, how big it is, and how its children are dealt. Nothing
 * here decides how anything looks. `pointer-events` and `touch-action` are in because
 * they place a hit area; `border-collapse` and `border-spacing` are in because they are
 * table geometry rather than the border's paint; the `scroll-*` entries are the ones
 * that measure or snap, not the one that animates.
 *
 * Spelled out, every one of them. No `column-[\w-]+`: that pattern also answered for
 * `column-rule-color`, which paints. */
const GLUE = new RegExp(`^(?:${[
  'display',
  'flex', 'flex-(?:basis|direction|flow|grow|shrink|wrap)',
  'grid', 'grid-area', 'grid-template(?:-(?:areas|columns|rows))?',
  'grid-auto-(?:columns|flow|rows)',
  'grid-(?:row|column)(?:-(?:start|end))?',
  'gap', 'row-gap', 'column-gap',
  'columns', 'column-(?:count|fill|span|width)',
  'align-(?:content|items|self)', 'justify-(?:content|items|self)', 'place-(?:content|items|self)',
  'order', 'margin(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  'padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  '(?:min-|max-)?(?:width|height)', '(?:inline|block)-size', '(?:min|max)-(?:inline|block)-size',
  'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'inset', 'inset-(?:block|inline)(?:-(?:start|end))?',
  'overflow(?:-[xy]|-wrap)?', 'box-sizing', 'aspect-ratio', 'float', 'clear',
  'white-space', 'text-wrap(?:-(?:mode|style))?', 'word-break', 'hyphens',
  'text-align(?:-last)?', 'vertical-align',
  'scroll-margin(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  'scroll-padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  'scroll-snap-(?:align|stop|type)',
  'overscroll-behavior(?:-[xy])?', 'writing-mode', 'isolation',
  'contain', 'container-type', 'container-name', 'touch-action', 'pointer-events',
  'resize', 'table-layout', 'border-collapse', 'border-spacing', 'caption-side',
  'list-style-position', 'counter-(?:reset|increment|set)',
].join('|')})$`);

/* Paint, type and motion: how a thing looks and how it moves. A story writing any of
 * these is deciding something the kit decides. `column-rule*` is here because a rule
 * drawn between columns is a border by another name; `scroll-behavior` and
 * `scroll-timeline*` are here because smooth scrolling is motion. */
const PAINT = new RegExp(`^(?:${[
  'background(?:-[\\w-]+)?', '-webkit-background-clip',
  'border(?!-collapse|-spacing)(?:-[\\w-]+)?', 'border-radius', 'box-shadow',
  'column-rule(?:-(?:color|style|width))?',
  'color', '-webkit-text-fill-color', 'caret-color', 'accent-color',
  'outline(?:-[\\w-]+)?', 'font(?:-[\\w-]+)?', 'letter-spacing', 'word-spacing',
  'line-height', 'text-(?:decoration|transform|shadow|indent|emphasis)(?:-[\\w-]+)?',
  'text-underline-offset', 'opacity', 'filter', 'backdrop-filter', 'mix-blend-mode',
  'transition(?:-[\\w-]+)?', 'animation(?:-[\\w-]+)?', 'transform(?:-[\\w-]+)?',
  'scroll-behavior', 'scroll-timeline(?:-(?:axis|name))?',
  'rotate', 'scale', 'translate', 'perspective', 'zoom', 'will-change',
  'cursor', 'appearance', '-webkit-appearance', 'user-select', '-webkit-user-select',
  'visibility', 'content', 'quotes', 'list-style(?:-(?:type|image))?',
  'stroke(?:-[\\w-]+)?', 'fill(?:-[\\w-]+)?', 'paint-order', 'vector-effect',
  'clip-path', 'mask(?:-[\\w-]+)?', 'object-(?:fit|position)', 'tab-size',
].join('|')})$`);

/** A kit class, the only naming the kit publishes. */
export const KIT_CLASS = /\.ui-[A-Za-z0-9_-]+/;

/* The custom properties the kit asks a consumer to set. `--ring-gap` and `--ring` are
 * docs/foundations.md#the-focus-ring: a surface of its own has to say what colour its
 * gap sits on. `--ui-table-height` is the `var(--ui-table-height, 70vh)` fallback in
 * src/styles/table.css, which exists to be answered. Setting one of these is using the
 * kit, not overriding it. */
export const KNOBS = new Set(['--ring', '--ring-gap', '--ring-gap-width', '--ui-table-height']);

/** Every `--name` the kit's token sheets declare, read from their text. */
export function kitTokenNames(...sheets) {
  const names = new Set();
  for (const css of sheets) for (const [, name] of css.matchAll(/(--[\w-]+)\s*:/g)) names.add(name);
  return names;
}

/** A value that ends up as a colour, a gradient or a cast. */
const COLOURISH = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(|gradient\(|\bcurrentcolor\b/i;

/**
 * The one verdict for one declaration.
 *
 * The vocabularies are consulted before the selector is: a property neither list knows
 * is `unknown` even on a kit class, because "glue onto a kit part" is a claim about the
 * property, and the allow-list grants a placement, not an exemption.
 *
 * @param {{selector: string, property: string, value: string}} decl
 * @param {Set<string>} kitTokens  every token name the kit declares
 * @returns {'glue'|'placement'|'shadow'|'unknown'}
 */
export function classify({ selector, property, value }, kitTokens) {
  if (property.startsWith('--')) {
    if (KNOBS.has(property)) return 'glue';
    if (kitTokens.has(property)) return 'shadow';
    // A story's own name. It is a shadow token when it holds a colour, and glue when
    // it holds a length: `--lx-hue: #7c5cff` is paint waiting for a var() to spend it.
    return COLOURISH.test(value) ? 'shadow' : 'glue';
  }
  if (PAINT.test(property)) return 'shadow';
  if (!GLUE.test(property)) return 'unknown';
  // Each comma-separated subject is its own selector; one naming a kit class is enough.
  return selector.split(',').some((one) => KIT_CLASS.test(one)) ? 'placement' : 'glue';
}

/* ---- reading the source ------------------------------------------------- */

const lineAt = (src, index) => src.slice(0, index).split('\n').length;

/** Blank `/* … *\/` comments, keeping every newline so a line number stays true. */
const blankCssComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** The same for a JS object literal, where `//` also starts one — and a string does not. */
function blankJsComments(text) {
  let out = '';
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      out += ch;
      if (ch === '\\') { out += text[i + 1] ?? ''; i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; out += ch; continue; }
    if (ch === '/' && (text[i + 1] === '*' || text[i + 1] === '/')) {
      const end = text[i + 1] === '*' ? text.indexOf('*/', i + 2) : text.indexOf('\n', i);
      const stop = end < 0 ? text.length : end + (text[i + 1] === '*' ? 2 : 0);
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop - 1;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Split a declaration list into its top-level chunks, skipping over quoted text and
 * anything bracketed — a `;` inside `url(a;b)` and a `,` inside `rgb(0, 0, 0)` are not
 * separators.
 */
function chunks(text, separator) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let buffer = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      buffer += ch;
      if (ch === '\\') { buffer += text[i + 1] ?? ''; i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; buffer += ch; continue; }
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth = Math.max(0, depth - 1);
    else if (ch === separator && depth === 0) { parts.push(buffer); buffer = ''; continue; }
    buffer += ch;
  }
  parts.push(buffer);
  return parts;
}

/** One CSS declaration list: comments blanked, then split on `;`. */
const cssDeclarations = (text) => chunks(blankCssComments(text), ';').map(named).filter(Boolean);

/** One JS object literal's body: comments blanked, split on `,`, a spread skipped. */
const jsxDeclarations = (text) => chunks(blankJsComments(text), ',')
  .filter((p) => !p.trim().startsWith('...')).map(named).filter(Boolean);

/**
 * `prop: value` → `{property, value}`, with a JSX `maxWidth` spelled as CSS.
 *
 * A blank chunk is nothing. Anything else that does not read as a declaration comes
 * back as `{unreadable}` rather than as nothing, so the gate reports it: a chunk
 * dropped in silence is a declaration nobody measured.
 */
function named(text) {
  if (!text.trim()) return null;
  const at = text.indexOf(':');
  const property = at < 0 ? '' : text.slice(0, at).trim()
    .replace(/^(['"])([\s\S]*)\1$/, '$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  if (!property || /[\s(){}[\]:;'"]/.test(property)) return { unreadable: brief(text) };
  return { property, value: text.slice(at + 1).trim() };
}

/** One line of source, short enough to sit in a problem report. */
const brief = (text) => {
  const one = text.trim().replace(/\s+/g, ' ');
  return one.length > 72 ? `${one.slice(0, 71)}…` : one;
};

/**
 * Every stylesheet a story source carries: each `<style>` block, and the template
 * literal behind a `<style>{CSS}</style>` reference.
 *
 * @returns {Array<{css: string, line: number}>}
 */
export function styleSheets(src) {
  const found = [];
  const references = new Set();
  for (const m of src.matchAll(/<style[^>]*>\s*\{\s*([A-Za-z_$][\w$]*)\s*\}\s*<\/style>/g)) references.add(m[1]);
  for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    const body = m[1];
    if (/^\s*\{\s*[A-Za-z_$][\w$]*\s*\}\s*$/.test(body)) continue;
    const css = body.replace(/^\s*\{\s*(['"`])/, '').replace(/(['"`])\s*\}\s*$/, '');
    found.push({ css, line: lineAt(src, m.index + m[0].indexOf(body)) });
  }
  for (const name of references) {
    const m = new RegExp(`\\b${name}\\s*=\\s*\`([\\s\\S]*?)\`\\s*;`).exec(src);
    if (m) found.push({ css: m[1], line: lineAt(src, m.index + m[0].indexOf(m[1])) });
  }
  return found;
}

/** The text inside the balanced `{…}` that opens at `at`, or null when it never closes. */
function braced(src, at) {
  let depth = 0;
  let quote = null;
  for (let i = at; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') { depth -= 1; if (depth === 0) return src.slice(at + 1, i); }
  }
  return null;
}

/**
 * The opening tag a `style=` sits in: from its `<` to the `>` that closes it, skipping
 * quoted text and bracketed expressions so a `>` inside one does not end it early.
 * The whole tag, because `class` is as often written after `style` as before it.
 */
function openTag(src, at) {
  const open = src.lastIndexOf('<', at);
  if (open < 0) return '';
  let depth = 0;
  let quote = null;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth -= 1;
    else if (ch === '>' && depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

/** The subject of an inline style: the classes its own tag spells out, or `(element)`. */
function classesIn(tag) {
  const m = /(?<![\w-])class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*'([^']*)'\s*\}|\{\s*"([^"]*)"\s*\}|\{\s*`([^`$]*)`\s*\})/.exec(tag);
  const names = (m ? (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]) : '').split(/\s+/).filter(Boolean);
  return names.length ? names.map((c) => `.${c}`).join('') : '(element)';
}

/**
 * The object literals a story binds by name: `const row = {…}`. A `style={row}` is an
 * ordinary list of source declarations that happens to be written a few lines up, so it
 * is read there rather than counted as nothing.
 *
 * @returns {Map<string, string>} the name → the text inside its braces
 */
function objectBindings(src) {
  const bound = new Map();
  for (const m of src.matchAll(/(?<![\w$])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;{]*)?=\s*\{/g)) {
    const body = braced(src, m.index + m[0].length - 1);
    if (body != null && !bound.has(m[1])) bound.set(m[1], body);
  }
  return bound;
}

/** One `key: {…}` member of a bound object, by key, or null. */
function memberBody(body, key) {
  for (const chunk of chunks(blankJsComments(body), ',')) {
    const at = chunk.indexOf(':');
    if (at < 0) continue;
    const name = chunk.slice(0, at).trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    const value = chunk.slice(at + 1).trim();
    if (name === key && value.startsWith('{')) return braced(value, 0);
  }
  return null;
}

/**
 * Every `style=` attribute and `style={…}` prop in a story source, with the kit classes
 * of the tag it sits on. Both quote forms, either attribute order, comments, and a JSX
 * object with brackets of its own. A block this cannot read is reported as unreadable
 * and never as empty — see LIMITS.
 *
 * @returns {Array<{selector: string, decls: Array<{property?: string, value?: string, unreadable?: string}>, line: number}>}
 */
export function inlineStyles(src) {
  const bound = objectBindings(src);
  const found = [];
  for (const m of src.matchAll(/(?<![\w$-])style\s*=\s*/g)) {
    const at = m.index + m[0].length;
    const selector = classesIn(openTag(src, m.index));
    const line = lineAt(src, m.index);
    const unreadable = (text) => found.push({ selector, line, decls: [{ unreadable: brief(text) }] });
    const opener = src[at];

    if (opener === '"' || opener === "'") {
      const end = src.indexOf(opener, at + 1);
      if (end < 0) unreadable(src.slice(at, at + 80));
      else found.push({ selector, line, decls: cssDeclarations(src.slice(at + 1, end)) });
      continue;
    }

    if (opener !== '{') { unreadable(src.slice(at, at + 80)); continue; }

    const inner = braced(src, at);
    if (inner == null) { unreadable(src.slice(at, at + 80)); continue; }
    const expression = inner.trim();
    const member = /^([A-Za-z_$][\w$]*)\.([\w$]+)$/.exec(expression);
    const object = expression.startsWith('{') ? braced(expression, 0)
      : /^[A-Za-z_$][\w$]*$/.test(expression) ? bound.get(expression) ?? null
        : member ? memberBody(bound.get(member[1]) ?? '', member[2])
          : null;
    if (object == null) unreadable(expression);
    else found.push({ selector, line, decls: jsxDeclarations(object) });
  }
  return found;
}

/**
 * A stylesheet flattened to rules. One level of `@media` nesting is unwrapped, which is
 * all these sheets use.
 *
 * @returns {Array<{selector: string, decls: object[], line: number, media: string|null}>}
 */
export function rulesIn(css, firstLine = 1) {
  // Blank the comments but keep every newline, so the line numbers stay true.
  const clean = blankCssComments(css);
  const line = (index) => firstLine + clean.slice(0, index).split('\n').length - 1;
  const rules = [];
  const blocks = [];
  const flat = clean.replace(/@media([^{]+)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g, (m, condition, body, index) => {
    blocks.push({ condition: condition.trim(), body, at: index + m.indexOf(body) });
    return m.replace(/[^\n]/g, ' ');
  });
  const collect = (text, offset, media) => {
    for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1].trim();
      if (!selector || selector.startsWith('@')) continue;
      const at = offset + m.index + (m[1].length - m[1].trimStart().length);
      rules.push({ selector, decls: cssDeclarations(m[2]), line: line(at), media });
    }
  };
  collect(flat, 0, null);
  for (const block of blocks) collect(block.body, block.at, block.condition);
  return rules;
}

/* ---- one story's measurement -------------------------------------------- */

/**
 * Every declaration one story file writes, sorted.
 *
 * @param {string} file       the path, as the allow-list and the recorded figures key it
 * @param {string} src        its source, or the stylesheet's text when `file` is a `.css`
 * @param {Set<string>} kitTokens
 * @returns {{file: string, glue: number, placements: object[], shadows: object[], unknowns: object[], total: number}}
 */
export function measureStory(file, src, kitTokens) {
  const decls = [];
  if (file.endsWith('.css')) {
    for (const rule of rulesIn(src, 1)) {
      for (const d of rule.decls) decls.push({ ...d, selector: rule.selector, line: rule.line, media: rule.media });
    }
  } else {
    for (const sheet of styleSheets(src)) {
      for (const rule of rulesIn(sheet.css, sheet.line)) {
        for (const d of rule.decls) decls.push({ ...d, selector: rule.selector, line: rule.line, media: rule.media });
      }
    }
    for (const inline of inlineStyles(src)) {
      for (const d of inline.decls) decls.push({ ...d, selector: inline.selector, line: inline.line, media: null });
    }
  }
  const sorted = decls.map((d) => ({
    ...d, file, verdict: d.unreadable ? 'unknown' : classify(d, kitTokens),
  }));
  return {
    file,
    total: sorted.length,
    glue: sorted.filter((d) => d.verdict === 'glue').length,
    placements: sorted.filter((d) => d.verdict === 'placement'),
    shadows: sorted.filter((d) => d.verdict === 'shadow'),
    unknowns: sorted.filter((d) => d.verdict === 'unknown'),
  };
}

/** `file:line  .sel { prop: value }`, the one line a reader needs to find it. */
export const show = (d) => `${d.file}:${d.line}  ${d.selector} `
  + `{ ${d.unreadable ?? `${d.property}: ${d.value}`} }${d.media ? ` @media ${d.media}` : ''}`;

/* ---- the judgement ------------------------------------------------------ */

/**
 * What is wrong with a collection of stories, as lines a reader can act on without
 * opening this file.
 *
 * `allowed` is the layout-glue allow-list: `{'file|selector': 'the reason'}`. Only a
 * placement can be allowed, and only onto the selector written down — a reason covers
 * one kit class in one story, not a habit.
 *
 * `recorded` is what each story carries today: `{file: {shadow, glue}}`, either figure
 * optional. A recorded story may stay as it is; it may not grow, and a story that comes
 * under its figure has to record the smaller one so it cannot grow back. Same contract
 * as scripts/word-budget.mjs.
 *
 * @param {object[]} measured  from measureStory()
 * @param {{allowed: Record<string,string>, recorded: Record<string,{shadow?: number, glue?: number}>, ceiling: number, where: string}} against
 * @returns {string[]}
 */
export function problemsIn(measured, { allowed, recorded, ceiling, where }) {
  const problems = [];
  const usedKeys = new Set();
  const seen = new Set();

  for (const story of measured) {
    seen.add(story.file);

    for (const d of story.unknowns) {
      problems.push(d.unreadable
        ? `${show(d)}\n    is a style block ${where} cannot read, so none of it was measured. `
          + 'Spell the declarations out — `style="a: b"`, `style={{ a: b }}`, a `const` object '
          + 'literal in this file, or a `<style>` rule — because a block a gate reads as empty '
          + 'is a block it does not gate.'
        : `${show(d)}\n    \`${d.property}\` is a property ${where} does not sort. Put it `
          + 'in GLUE or PAINT in scripts/lib/story-css.js and say which it is; a gate that passes '
          + 'what it cannot classify is a gate with a hole in it.');
    }

    for (const d of story.placements) {
      const key = `${d.file}|${d.selector}`;
      usedKeys.add(key);
      if (allowed[key]) continue;
      problems.push(`${show(d)}\n    places a kit part by naming its own class, with no reason on `
        + `record. Either let the kit place it — a factory argument, a modifier, a wrapper of your `
        + `own — or add\n      '${key}': 'why the kit offers no other way',\n    to the allow-list `
        + `beside this gate.`);
    }

    const carried = story.shadows.length;
    const figure = recorded[story.file]?.shadow;
    if (carried === 0) {
      if (figure != null) {
        problems.push(`${story.file}: writes no paint, type or motion of its own — delete its `
          + `\`shadow\` figure from RECORDED beside this gate.`);
      }
    } else if (figure == null) {
      problems.push(`${story.file}: ${carried} declaration(s) paint, type or animate what the kit `
        + `owns:\n      ${story.shadows.map(show).join('\n      ')}\n    A showcase shows the kit. `
        + `Use the kit class, or open an issue for the part that is missing — there is no `
        + `allow-list for this one.`);
    } else if (carried > figure) {
      problems.push(`${story.file}: ${carried} shadow declaration(s), ${carried - figure} more than `
        + `the ${figure} recorded. A story already over may not grow:\n      `
        + `${story.shadows.map(show).join('\n      ')}`);
    } else if (carried < figure) {
      problems.push(`${story.file}: ${carried} shadow declaration(s), down from the ${figure} `
        + `recorded — record ${carried} beside this gate so it cannot grow back.`);
    }

    if (story.glue > ceiling) {
      const glued = recorded[story.file]?.glue;
      if (glued == null) {
        problems.push(`${story.file}: ${story.glue} layout-glue declarations, over the ceiling of `
          + `${ceiling}. Past that a story is laying out a page rather than placing kit parts — `
          + `compose it from kit parts, or record the figure with the reason it stands.`);
      } else if (story.glue > glued) {
        problems.push(`${story.file}: ${story.glue} layout-glue declarations, ${story.glue - glued} `
          + `more than the ${glued} recorded. A story over the ceiling may not grow.`);
      } else if (story.glue < glued) {
        problems.push(`${story.file}: ${story.glue} layout-glue declarations, down from the ${glued} `
          + `recorded — record ${story.glue} beside this gate so it cannot grow back.`);
      }
    } else if (recorded[story.file]?.glue != null) {
      problems.push(`${story.file}: ${story.glue} layout-glue declarations, within the ceiling of `
        + `${ceiling} — delete its \`glue\` figure from RECORDED beside this gate.`);
    }
  }

  for (const key of Object.keys(allowed)) {
    if (!usedKeys.has(key)) {
      problems.push(`'${key}' is allow-listed and nothing matches it any more — delete the entry. `
        + 'A dead reason reads as a rule somebody still relies on.');
    }
  }
  for (const file of Object.keys(recorded)) {
    if (!seen.has(file)) {
      problems.push(`${file} is recorded and is not among the subjects — delete its line from `
        + 'RECORDED beside this gate.');
    }
  }

  return problems;
}
